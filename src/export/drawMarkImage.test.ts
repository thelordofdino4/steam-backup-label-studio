import assert from 'node:assert/strict'
import test from 'node:test'
import { getLogoAssetBoundsPercent } from '../disc/geometry.ts'
import { getImageContentSize } from '../image/imageContentBounds.ts'
import {
  createDefaultProjectLogoAssets,
  type LogoAssetKey,
} from '../project/projectLogoAssets.ts'
import type {
  BackgroundImageSize,
  LogoAssetLayout,
  ProjectLogoAssets,
} from '../project/projectTypes.ts'
import { drawLogoAssets } from './drawLogoAssets.ts'
import { drawMarkImage } from './drawMarkImage.ts'

type DrawImageCall = unknown[]

function createDrawImageContext() {
  const calls: DrawImageCall[] = []

  return {
    calls,
    context: {
      drawImage: (...args: DrawImageCall) => {
        calls.push(args)
      },
    } as unknown as CanvasRenderingContext2D,
  }
}

function createLoadedImage(width: number, height: number) {
  return {
    naturalWidth: width,
    naturalHeight: height,
    width,
    height,
  } as HTMLImageElement
}

function assertApproximatelyEqual(
  actual: number,
  expected: number,
  message: string,
) {
  assert.ok(
    Math.abs(actual - expected) < 0.000001,
    `${message}: expected ${actual} to approximately equal ${expected}`,
  )
}

function createPrimaryLogoFixture(
  logoKey: LogoAssetKey,
  imageSize: BackgroundImageSize,
  layout: LogoAssetLayout,
): ProjectLogoAssets {
  const logoAssets = createDefaultProjectLogoAssets()
  const imageDataUrl = `data:image/png;base64,${logoKey}`

  return logoKey === 'developer'
    ? {
        ...logoAssets,
        developerLogoDataUrl: imageDataUrl,
        developerLogoSize: imageSize,
        developerLogoLayout: layout,
      }
    : {
        ...logoAssets,
        publisherLogoDataUrl: imageDataUrl,
        publisherLogoSize: imageSize,
        publisherLogoLayout: layout,
      }
}

test('mark image export preserves square image aspect inside the preview bounds', async () => {
  const { context, calls } = createDrawImageContext()

  await drawMarkImage(
    context,
    1000,
    0,
    {
      imageDataUrl: 'data:image/png;base64,square',
      layout: { x: 50, y: 50 },
      scaledBounds: { halfWidth: 6, halfHeight: 4 },
    },
    async () => createLoadedImage(100, 100),
  )

  assert.equal(calls.length, 1)
  assert.deepEqual(calls[0].slice(1), [460, 460, 80, 80])
})

test('mark image export preserves wide image aspect inside the preview bounds', async () => {
  const { context, calls } = createDrawImageContext()

  await drawMarkImage(
    context,
    1000,
    0,
    {
      imageDataUrl: 'data:image/png;base64,wide',
      layout: { x: 50, y: 50 },
      scaledBounds: { halfWidth: 6, halfHeight: 4 },
    },
    async () => createLoadedImage(300, 100),
  )

  assert.equal(calls.length, 1)
  assert.deepEqual(calls[0].slice(1), [440, 480, 120, 40])
})

test('mark image export draws only active content bounds', async () => {
  const { context, calls } = createDrawImageContext()

  await drawMarkImage(
    context,
    1000,
    0,
    {
      imageDataUrl: 'data:image/png;base64,padded',
      imageSize: {
        width: 300,
        height: 300,
        contentBounds: { x: 50, y: 100, width: 200, height: 100 },
      },
      layout: { x: 50, y: 50 },
      scaledBounds: { halfWidth: 6, halfHeight: 4 },
    },
    async () => createLoadedImage(300, 300),
  )

  assert.equal(calls.length, 1)
  assert.deepEqual(calls[0].slice(1), [50, 100, 200, 100, 440, 470, 120, 60])
})

test('primary logo export matches canonical preview geometry across aspect ratios', async () => {
  const discContentSize = 1000
  const discOrigin = 37
  const ownerCases = [
    {
      logoKey: 'developer' as const,
      layout: { enabled: true, x: 21, y: 62, scale: 1.25 },
    },
    {
      logoKey: 'publisher' as const,
      layout: { enabled: true, x: 21, y: 74, scale: 0.8 },
    },
  ]
  const aspectCases: Array<{
    label: string
    imageSize: BackgroundImageSize
    expectedSourceRect: readonly [number, number, number, number]
  }> = [
    {
      label: 'landscape',
      imageSize: { width: 400, height: 100 },
      expectedSourceRect: [0, 0, 400, 100],
    },
    {
      label: 'portrait',
      imageSize: { width: 100, height: 400 },
      expectedSourceRect: [0, 0, 100, 400],
    },
    {
      label: 'square',
      imageSize: { width: 200, height: 200 },
      expectedSourceRect: [0, 0, 200, 200],
    },
    {
      label: 'transparent-padded',
      imageSize: {
        width: 400,
        height: 400,
        contentBounds: { x: 100, y: 150, width: 200, height: 100 },
      },
      expectedSourceRect: [100, 150, 200, 100],
    },
  ]

  for (const ownerCase of ownerCases) {
    for (const aspectCase of aspectCases) {
      const { context, calls } = createDrawImageContext()
      const logoAssets = createPrimaryLogoFixture(
        ownerCase.logoKey,
        aspectCase.imageSize,
        ownerCase.layout,
      )
      const loadedSources: string[] = []

      await drawLogoAssets(
        context,
        discContentSize,
        discOrigin,
        logoAssets,
        async (source) => {
          loadedSources.push(source)
          return createLoadedImage(
            aspectCase.imageSize.width,
            aspectCase.imageSize.height,
          )
        },
      )

      assert.equal(
        calls.length,
        1,
        `${ownerCase.logoKey} ${aspectCase.label} draw count`,
      )
      assert.deepEqual(loadedSources, [
        `data:image/png;base64,${ownerCase.logoKey}`,
      ])

      const drawCall = calls[0]
      const hasContentBounds = Boolean(aspectCase.imageSize.contentBounds)

      if (hasContentBounds) {
        assert.deepEqual(
          drawCall.slice(1, 5),
          aspectCase.expectedSourceRect,
          `${ownerCase.logoKey} ${aspectCase.label} source crop`,
        )
      } else {
        assert.equal(
          drawCall.length,
          5,
          `${ownerCase.logoKey} ${aspectCase.label} uses whole-image drawing`,
        )
      }

      const canonicalBounds = getLogoAssetBoundsPercent(
        aspectCase.imageSize,
        ownerCase.layout.scale,
      )
      const centerX = discOrigin +
        discContentSize * (ownerCase.layout.x / 100)
      const centerY = discOrigin +
        discContentSize * (ownerCase.layout.y / 100)
      const expectedWidth = discContentSize *
        (canonicalBounds.halfWidth * 2 / 100)
      const expectedHeight = discContentSize *
        (canonicalBounds.halfHeight * 2 / 100)
      const expectedDestination = [
        centerX - expectedWidth / 2,
        centerY - expectedHeight / 2,
        expectedWidth,
        expectedHeight,
      ]
      const actualDestination = drawCall.slice(-4) as number[]

      actualDestination.forEach((actual, index) => {
        assertApproximatelyEqual(
          actual,
          expectedDestination[index],
          `${ownerCase.logoKey} ${aspectCase.label} destination ${index}`,
        )
      })

      const contentSize = getImageContentSize(aspectCase.imageSize)
      assert.ok(contentSize)
      assertApproximatelyEqual(
        actualDestination[2] / actualDestination[3],
        contentSize.width / contentSize.height,
        `${ownerCase.logoKey} ${aspectCase.label} destination aspect ratio`,
      )
    }
  }
})
