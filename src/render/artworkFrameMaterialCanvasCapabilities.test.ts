import assert from 'node:assert/strict'
import test from 'node:test'
import {
  detectArtworkFrameMaterialCanvasCapabilities,
  type ArtworkFrameMaterialCanvasCapabilityScope,
} from './artworkFrameMaterialCanvasCapabilities.ts'

class MockOffscreenCanvas2d {
  readonly height: number
  readonly width: number

  constructor(width: number, height: number) {
    this.height = height
    this.width = width
  }

  getContext(contextId: string) {
    return contextId === '2d' ? { contextId } : null
  }
}

class MockOffscreenCanvasWithout2d {
  readonly height: number
  readonly width: number

  constructor(width: number, height: number) {
    this.height = height
    this.width = width
  }

  getContext() {
    return null
  }
}

class MockBrokenOffscreenCanvas {
  constructor() {
    throw new Error('OffscreenCanvas blocked')
  }
}

function createDocumentScope({
  contextAvailable,
}: {
  contextAvailable: boolean
}) {
  return {
    createElement(tagName: string) {
      assert.equal(tagName, 'canvas')

      return {
        getContext(contextId: string) {
          return contextAvailable && contextId === '2d'
            ? { contextId }
            : null
        },
      }
    },
  }
}

test('canvas material capabilities prefer worker offscreen canvas when available', () => {
  const capabilities = detectArtworkFrameMaterialCanvasCapabilities({
    createImageBitmap: () => Promise.resolve({}),
    ImageBitmap: class MockImageBitmap {},
    OffscreenCanvas: MockOffscreenCanvas2d,
    Worker: class MockWorker {},
  })

  assert.equal(capabilities.offscreenCanvas, true)
  assert.equal(capabilities.offscreenCanvas2d, true)
  assert.equal(capabilities.worker, true)
  assert.equal(capabilities.canUseWorkerOffscreenCanvas2d, true)
  assert.equal(capabilities.mainThreadCanvas2d, false)
  assert.equal(capabilities.canFallbackToMainThreadCanvas2d, false)
  assert.equal(capabilities.imageBitmapConstructor, true)
  assert.equal(capabilities.createImageBitmap, true)
  assert.equal(capabilities.imageBitmap, true)
  assert.equal(
    capabilities.preferredExecutionTarget,
    'worker-offscreen-canvas-2d',
  )
})

test('canvas material capabilities fall back to main-thread canvas 2d', () => {
  const capabilities = detectArtworkFrameMaterialCanvasCapabilities({
    document: createDocumentScope({ contextAvailable: true }),
  })

  assert.equal(capabilities.offscreenCanvas, false)
  assert.equal(capabilities.offscreenCanvas2d, false)
  assert.equal(capabilities.worker, false)
  assert.equal(capabilities.canUseWorkerOffscreenCanvas2d, false)
  assert.equal(capabilities.mainThreadCanvas2d, true)
  assert.equal(capabilities.canFallbackToMainThreadCanvas2d, true)
  assert.equal(capabilities.imageBitmap, false)
  assert.equal(
    capabilities.preferredExecutionTarget,
    'main-thread-canvas-2d',
  )
})

test('canvas material capabilities use main-thread offscreen canvas without worker', () => {
  const capabilities = detectArtworkFrameMaterialCanvasCapabilities({
    createImageBitmap: () => Promise.resolve({}),
    OffscreenCanvas: MockOffscreenCanvas2d,
  })

  assert.equal(capabilities.offscreenCanvas, true)
  assert.equal(capabilities.offscreenCanvas2d, true)
  assert.equal(capabilities.worker, false)
  assert.equal(capabilities.canUseWorkerOffscreenCanvas2d, false)
  assert.equal(capabilities.imageBitmapConstructor, false)
  assert.equal(capabilities.createImageBitmap, true)
  assert.equal(capabilities.imageBitmap, true)
  assert.equal(
    capabilities.preferredExecutionTarget,
    'main-thread-offscreen-canvas-2d',
  )
})

test('canvas material capabilities tolerate unusable offscreen canvas and keep fallback', () => {
  for (const OffscreenCanvas of [
    MockOffscreenCanvasWithout2d,
    MockBrokenOffscreenCanvas,
  ]) {
    const capabilities = detectArtworkFrameMaterialCanvasCapabilities({
      document: createDocumentScope({ contextAvailable: true }),
      OffscreenCanvas,
      Worker: class MockWorker {},
    } as ArtworkFrameMaterialCanvasCapabilityScope)

    assert.equal(capabilities.offscreenCanvas, true)
    assert.equal(capabilities.offscreenCanvas2d, false)
    assert.equal(capabilities.worker, true)
    assert.equal(capabilities.canUseWorkerOffscreenCanvas2d, false)
    assert.equal(capabilities.mainThreadCanvas2d, true)
    assert.equal(capabilities.canFallbackToMainThreadCanvas2d, true)
    assert.equal(
      capabilities.preferredExecutionTarget,
      'main-thread-canvas-2d',
    )
  }
})

test('canvas material capabilities report unavailable when no canvas path exists', () => {
  const capabilities = detectArtworkFrameMaterialCanvasCapabilities({
    document: createDocumentScope({ contextAvailable: false }),
  })

  assert.equal(capabilities.offscreenCanvas, false)
  assert.equal(capabilities.offscreenCanvas2d, false)
  assert.equal(capabilities.worker, false)
  assert.equal(capabilities.mainThreadCanvas2d, false)
  assert.equal(capabilities.canFallbackToMainThreadCanvas2d, false)
  assert.equal(capabilities.preferredExecutionTarget, 'unavailable')
})
