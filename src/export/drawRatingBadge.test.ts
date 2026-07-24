import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { createDefaultProjectMetadata } from '../project/projectMetadata.ts'
import {
  createDefaultProjectRatingBadge,
  updateRatingBadgeEnabledState,
} from '../project/projectRatingBadge.ts'
import { drawRatingBadge } from './drawRatingBadge.ts'

const previewSource = readFileSync(
  new URL('../components/preview/RatingBadgeLayer.tsx', import.meta.url),
  'utf8',
)
const exportSource = readFileSync(new URL('./drawRatingBadge.ts', import.meta.url), 'utf8')
const titleArtworkPreviewSource = readFileSync(
  new URL('../components/preview/TitleArtworkLayer.tsx', import.meta.url),
  'utf8',
)
const titleArtworkExportSource = readFileSync(
  new URL('./drawTitleArtwork.ts', import.meta.url),
  'utf8',
)
const titleArtworkOwnerSource = readFileSync(
  new URL('../project/projectTitleArtwork.ts', import.meta.url),
  'utf8',
)
const mediaMarkPreviewSource = readFileSync(
  new URL('../components/preview/MediaMarkLayer.tsx', import.meta.url),
  'utf8',
)
const mediaMarkExportSource = readFileSync(
  new URL('./drawMediaMark.ts', import.meta.url),
  'utf8',
)
const mediaMarkModelSource = readFileSync(
  new URL('../render/mediaMarkRenderModel.ts', import.meta.url),
  'utf8',
)
const logoAssetPreviewSource = readFileSync(
  new URL('../components/preview/LogoAssetLayer.tsx', import.meta.url),
  'utf8',
)
const logoAssetExportSource = readFileSync(
  new URL('./drawLogoAssets.ts', import.meta.url),
  'utf8',
)
const logoAssetOwnerSource = readFileSync(
  new URL('../project/projectLogoAssets.ts', import.meta.url),
  'utf8',
)

type DrawImageCall = unknown[]
type DrawingOperation = {
  args: unknown[]
  name: string
}

function createDrawImageContext() {
  const calls: DrawImageCall[] = []
  const operations: DrawingOperation[] = []

  const recordOperation = (name: string) => (...args: unknown[]) => {
    operations.push({ args, name })
  }

  return {
    calls,
    operations,
    context: {
      beginPath: recordOperation('beginPath'),
      clip: recordOperation('clip'),
      drawImage: (...args: DrawImageCall) => {
        calls.push(args)
        operations.push({ args, name: 'drawImage' })
      },
      fillText: recordOperation('fillText'),
      rect: recordOperation('rect'),
      restore: recordOperation('restore'),
      save: recordOperation('save'),
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

test('rating badge export uses the selected ESRB built-in artwork', async () => {
  const metadata = {
    ...createDefaultProjectMetadata(),
    ratingSystem: 'ESRB' as const,
    ratingValue: 'M',
  }
  const ratingBadge = updateRatingBadgeEnabledState(
    metadata,
    createDefaultProjectRatingBadge(),
    true,
  ).ratingBadge
  const loadedSources: string[] = []
  const { context, calls } = createDrawImageContext()

  await drawRatingBadge(
    context,
    1000,
    0,
    metadata,
    ratingBadge,
    async (source) => {
      loadedSources.push(source)
      return createLoadedImage(90, 130)
    },
  )

  assert.equal(calls.length, 1)
  assert.equal(loadedSources.length, 1)
  assert.match(loadedSources[0], /rating-badge-esrb-m\.svg$/)
  assert.doesNotMatch(loadedSources[0], /rating-badge-custom-placeholder/)
})

test('rating badge preview and export consume the shared primary render model', () => {
  assert.match(
    previewSource,
    /const primaryVisual = createPrimaryRatingBadgeRenderModel\(\s*projectMetadata,\s*projectRatingBadge,\s*\)/,
  )
  assert.match(
    previewSource,
    /<RatingBadgeLayerItem\s+ariaLabel="Rating badge layer"\s+visual=\{primaryVisual\}\s+badgeKey="primary"/,
  )
  assert.match(
    previewSource,
    /width: `\$\{visual\.unscaledBounds\.halfWidth \* 2\}%`[\s\S]*transform: `translate\(-50%, -50%\) scale\(\$\{visual\.layout\.scale\}\)`/,
  )

  assert.match(
    exportSource,
    /const primaryModel = createPrimaryRatingBadgeRenderModel\(\s*metadata,\s*ratingBadge,\s*\)/,
  )
  assert.match(
    exportSource,
    /drawResolvedRatingBadge\(\s*context,\s*discContentSize,\s*discOrigin,\s*primaryModel,\s*imageLoader,\s*\)/,
  )

  assert.match(
    previewSource,
    /const uskVisual = \{[\s\S]*layout: projectRatingBadge\.uskBadge\.layout[\s\S]*visual=\{uskVisual\}[\s\S]*badgeKey="usk"/,
  )
  assert.match(
    exportSource,
    /createSupplementalUskRatingBadgeRenderModel\(ratingBadge\)/,
  )
})

test('point-owner preview and export paths consume the same canonical render builders', () => {
  assert.match(
    titleArtworkPreviewSource,
    /const renderItem = createTitleArtworkRenderItem\(projectTitleArtwork\)/,
  )
  assert.match(
    titleArtworkExportSource,
    /const renderItem = createTitleArtworkRenderItem\(titleArtwork\)/,
  )

  assert.match(
    mediaMarkPreviewSource,
    /createMediaMarkRenderModel\(projectMediaMark\)/,
  )
  assert.match(
    mediaMarkExportSource,
    /const model = createMediaMarkRenderModel\(mediaMark\)/,
  )

  assert.match(
    logoAssetPreviewSource,
    /createLogoAssetRenderItems\(projectLogoAssets\)/,
  )
  assert.match(
    logoAssetExportSource,
    /for \(const logoAsset of createLogoAssetRenderItems\(logoAssets\)\)/,
  )
})

test('point-owner canonical bounds reuse scale-one preview geometry or render models', () => {
  assert.equal(
    titleArtworkOwnerSource.match(
      /getTitleArtworkBoundsPercent\(\s*(?:imageSize|titleArtwork\.imageSize),\s*1\s*\)/g,
    )?.length,
    2,
  )

  assert.match(mediaMarkModelSource, /unscaledBounds: getBounds\(1\)/)
  assert.match(
    mediaMarkModelSource,
    /const visual = resolveMediaMarkVisual\(mediaMark\)[\s\S]*return visual\.unscaledBounds/,
  )
  assert.match(
    mediaMarkModelSource,
    /const \{[\s\S]*unscaledBounds,[\s\S]*\} = resolveMediaMarkVisual\(mediaMark\)/,
  )

  assert.match(
    logoAssetOwnerSource,
    /const canonicalImageSize = imageDataUrl\?\.trim\(\)[\s\S]*\? getLogoAssetRenderSize\(imageSize\)[\s\S]*: getLogoPlaceholderImageSize\(logoKey\)/,
  )
  assert.match(
    logoAssetOwnerSource,
    /const bounds = getLogoAssetBoundsPercent\(canonicalImageSize, 1\)/,
  )
  assert.match(
    logoAssetPreviewSource,
    /const unscaledBounds = getLogoAssetBoundsPercent\(renderImageSize, 1\)/,
  )
})

test('rating badge export preserves custom content geometry independently from supplemental USK', async () => {
  const metadata = {
    ...createDefaultProjectMetadata(),
    ratingSystem: 'PEGI' as const,
    ratingValue: '16',
  }
  const ratingBadge = {
    ...createDefaultProjectRatingBadge(),
    source: 'custom' as const,
    customImageDataUrl: 'data:image/png;base64,custom-rating',
    customImageSize: {
      width: 1000,
      height: 500,
      contentBounds: { x: 100, y: 100, width: 800, height: 200 },
    },
    layout: {
      enabled: true,
      scale: 2,
      x: 40,
      y: 30,
    },
    uskBadge: {
      ratingValue: '18',
      layout: {
        enabled: true,
        scale: 1.5,
        x: 70,
        y: 70,
      },
    },
  }
  const loadedSources: string[] = []
  const { context, calls } = createDrawImageContext()

  await drawRatingBadge(
    context,
    1000,
    0,
    metadata,
    ratingBadge,
    async (source) => {
      loadedSources.push(source)
      return createLoadedImage(1000, 500)
    },
  )

  assert.equal(calls.length, 2)
  assert.equal(loadedSources[0], ratingBadge.customImageDataUrl)
  assert.match(loadedSources[1], /rating-badge-usk-18\.svg$/)

  assert.deepEqual(
    calls[0].slice(1),
    [100, 100, 800, 200, 310, 277.5, 180, 45],
  )
  assert.deepEqual(
    calls[1].slice(1),
    [0, 0, 1406, 1406, 632.5, 632.5, 135, 135],
  )
})

test('rating badge export clips long generated labels to the rendered badge bounds', async () => {
  const metadata = {
    ...createDefaultProjectMetadata(),
    ratingSystem: 'custom' as const,
    ratingValue: 'A deliberately long custom rating label that exceeds its badge',
  }
  const ratingBadge = updateRatingBadgeEnabledState(
    metadata,
    createDefaultProjectRatingBadge(),
    true,
  ).ratingBadge
  const { context, operations } = createDrawImageContext()

  await drawRatingBadge(
    context,
    1000,
    0,
    metadata,
    ratingBadge,
    async () => createLoadedImage(90, 130),
  )

  const rectIndex = operations.findIndex(({ name }) => name === 'rect')
  const clipIndex = operations.findIndex(({ name }) => name === 'clip')
  const fillTextIndex = operations.findIndex(({ name }) => name === 'fillText')

  assert.ok(rectIndex >= 0)
  assert.ok(clipIndex > rectIndex)
  assert.ok(fillTextIndex > clipIndex)
  assert.deepEqual(
    operations[rectIndex].args,
    operations.find(({ name }) => name === 'drawImage')?.args.slice(-4),
  )
  assert.equal(
    operations[fillTextIndex].args[0],
    metadata.ratingValue,
  )
})
