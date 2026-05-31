import assert from 'node:assert/strict'
import test from 'node:test'
import { drawMarkImage } from './drawMarkImage.ts'

type DrawImageCall = [
  image: CanvasImageSource,
  x: number,
  y: number,
  width: number,
  height: number,
]

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
