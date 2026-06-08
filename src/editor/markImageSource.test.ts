import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getMarkImageSourceStatus,
  hasCustomMarkImage,
  resolveMarkImageSource,
} from './markImageSource.ts'

test('mark image source resolves uploaded custom images over built-in fallbacks', () => {
  const resolved = resolveMarkImageSource({
    source: 'custom',
    customImageDataUrl: 'data:image/png;base64,custom-mark',
    customImageSize: { width: 320, height: 120 },
    builtInImageDataUrl: 'data:image/svg+xml;base64,builtin-mark',
  })

  assert.equal(resolved.imageDataUrl, 'data:image/png;base64,custom-mark')
  assert.deepEqual(resolved.imageSize, { width: 320, height: 120 })
  assert.equal(resolved.isCustomImage, true)
  assert.equal(resolved.isBuiltInFallback, false)
  assert.equal(resolved.provenanceSource, 'custom')
})

test('mark image source falls back to built-in artwork when custom source has no image', () => {
  const resolved = resolveMarkImageSource({
    source: 'custom',
    customImageDataUrl: null,
    customImageSize: null,
    builtInImageDataUrl: 'data:image/svg+xml;base64,builtin-mark',
    builtInImageSize: { width: 100, height: 80 },
  })
  const status = getMarkImageSourceStatus({
    source: 'custom',
    customImageDataUrl: null,
  })

  assert.equal(hasCustomMarkImage('custom', null), false)
  assert.equal(status.isCustomSource, true)
  assert.equal(status.usesBuiltInFallback, true)
  assert.equal(resolved.imageDataUrl, 'data:image/svg+xml;base64,builtin-mark')
  assert.deepEqual(resolved.imageSize, { width: 100, height: 80 })
  assert.equal(resolved.isCustomImage, false)
  assert.equal(resolved.isBuiltInFallback, true)
  assert.equal(resolved.provenanceSource, 'placeholder')
})

test('mark image source ignores stale custom data while built-in mode is selected', () => {
  const resolved = resolveMarkImageSource({
    source: 'placeholder',
    customImageDataUrl: 'data:image/png;base64,stale-custom-mark',
    customImageSize: { width: 320, height: 120 },
    builtInImageDataUrl: 'data:image/svg+xml;base64,builtin-mark',
  })

  assert.equal(resolved.imageDataUrl, 'data:image/svg+xml;base64,builtin-mark')
  assert.equal(resolved.imageSize, null)
  assert.equal(resolved.isCustomImage, false)
  assert.equal(resolved.isBuiltInFallback, true)
  assert.equal(resolved.provenanceSource, 'placeholder')
})
