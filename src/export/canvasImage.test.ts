import assert from 'node:assert/strict'
import test from 'node:test'
import {
  drawImageContent,
  getCanvasImageContentSourceRect,
  loadCanvasSafeImage,
} from './canvasImage.ts'

test('canvas source geometry uses the complete loaded SVG when manifest dimensions differ', () => {
  const image = {
    naturalWidth: 300,
    naturalHeight: 158,
    width: 300,
    height: 158,
  } as HTMLImageElement

  assert.deepEqual(
    getCanvasImageContentSourceRect(image, { width: 284, height: 150 }),
    { x: 0, y: 0, width: 300, height: 158 },
  )
})

test('canvas source geometry maps stored content bounds into loaded image pixels', () => {
  const image = {
    naturalWidth: 200,
    naturalHeight: 100,
    width: 200,
    height: 100,
  } as HTMLImageElement

  assert.deepEqual(
    getCanvasImageContentSourceRect(image, {
      width: 1000,
      height: 500,
      contentBounds: { x: 100, y: 50, width: 800, height: 400 },
    }),
    { x: 20, y: 10, width: 160, height: 80 },
  )
})

test('canvas drawing uses the complete loaded SVG when no content crop is stored', () => {
  const image = {
    naturalWidth: 300,
    naturalHeight: 158,
    width: 300,
    height: 158,
  } as HTMLImageElement
  const calls: unknown[][] = []
  const context = {
    drawImage: (...args: unknown[]) => calls.push(args),
  } as unknown as CanvasRenderingContext2D

  assert.equal(
    drawImageContent(
      context,
      image,
      { width: 284, height: 150 },
      { x: 10, y: 20, width: 30, height: 40 },
    ),
    true,
  )
  assert.deepEqual(calls, [[image, 10, 20, 30, 40]])
})

test('canvas-safe loader retries the original source when the normalized image fails', async () => {
  const originalFetch = globalThis.fetch
  const originalFileReader = globalThis.FileReader
  const originalImage = globalThis.Image
  const requestedSources: string[] = []

  class FakeFileReader {
    result: string | ArrayBuffer | null = null
    onload: (() => void) | null = null
    onerror: (() => void) | null = null

    readAsDataURL() {
      this.result = 'data:image/svg+xml;base64,converted'
      queueMicrotask(() => this.onload?.())
    }
  }

  class FakeImage {
    naturalWidth = 90
    naturalHeight = 130
    width = 90
    height = 130
    onload: (() => void) | null = null
    onerror: (() => void) | null = null

    set src(source: string) {
      requestedSources.push(source)
      queueMicrotask(() => {
        if (source.startsWith('data:')) {
          this.onerror?.()
          return
        }

        this.onload?.()
      })
    }
  }

  Object.defineProperty(globalThis, 'fetch', {
    configurable: true,
    value: async () => new Response(
      new Blob(['<svg xmlns="http://www.w3.org/2000/svg" />'], {
        type: 'image/svg+xml',
      }),
    ),
  })
  Object.defineProperty(globalThis, 'FileReader', {
    configurable: true,
    value: FakeFileReader,
  })
  Object.defineProperty(globalThis, 'Image', {
    configurable: true,
    value: FakeImage,
  })

  try {
    const image = await loadCanvasSafeImage(
      'https://example.test/rating-badge.svg',
      'rating badge image',
    )

    assert.equal(image.width, 90)
    assert.deepEqual(requestedSources, [
      'data:image/svg+xml;base64,converted',
      'https://example.test/rating-badge.svg',
    ])
  } finally {
    Object.defineProperty(globalThis, 'fetch', {
      configurable: true,
      value: originalFetch,
    })
    Object.defineProperty(globalThis, 'FileReader', {
      configurable: true,
      value: originalFileReader,
    })
    Object.defineProperty(globalThis, 'Image', {
      configurable: true,
      value: originalImage,
    })
  }
})
