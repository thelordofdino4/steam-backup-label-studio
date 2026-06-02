import assert from 'node:assert/strict'
import test from 'node:test'
import { loadCanvasSafeImage } from './canvasImage.ts'

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
