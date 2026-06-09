import assert from 'node:assert/strict'
import test from 'node:test'
import {
  asArray,
  asRecord,
  normalizeBoolean,
  normalizeFiniteNumber,
  normalizeImageSize,
  normalizeNullableString,
  normalizePositiveNumber,
  normalizeString,
  normalizeTextValue,
} from './savedProjectNormalization.ts'

test('saved project primitive normalization accepts only the expected shapes', () => {
  assert.deepEqual(asRecord({ title: 'Portal 2' }), { title: 'Portal 2' })
  assert.equal(asRecord(null), null)
  assert.equal(asRecord([]), null)
  assert.deepEqual(asArray(['one']), ['one'])
  assert.equal(asArray({ 0: 'one' }), null)
  assert.equal(normalizeString('  Portal 2  ', 'Fallback'), '  Portal 2  ')
  assert.equal(normalizeString('   ', 'Fallback'), 'Fallback')
  assert.equal(normalizeTextValue('', 'Fallback'), '')
  assert.equal(normalizeTextValue(42, 'Fallback'), 'Fallback')
  assert.equal(normalizeNullableString('  saved.png  '), 'saved.png')
  assert.equal(normalizeNullableString('   '), null)
  assert.equal(normalizeBoolean(false, true), false)
  assert.equal(normalizeBoolean('false', true), true)
  assert.equal(normalizeFiniteNumber(Number.NaN, 12), 12)
  assert.equal(normalizeFiniteNumber(0, 12), 0)
  assert.equal(normalizePositiveNumber(0, 12), 12)
  assert.equal(normalizePositiveNumber(2.5, 12), 2.5)
})

test('saved project image size normalization rejects invalid dimensions', () => {
  assert.deepEqual(normalizeImageSize({ width: 640, height: 360 }), {
    width: 640,
    height: 360,
  })
  assert.equal(normalizeImageSize({ width: 0, height: 360 }), null)
  assert.equal(normalizeImageSize({ width: '640', height: 360 }), null)
  assert.equal(normalizeImageSize(null), null)
})

test('saved project image size normalization preserves valid content shapes', () => {
  assert.deepEqual(
    normalizeImageSize({
      width: 640,
      height: 360,
      contentBounds: { x: 10, y: 20, width: 120, height: 80 },
      contentShape: {
        width: 120,
        height: 80,
        path: 'M0 0 L120 0 L80 80 Z',
        fillRule: 'evenodd',
      },
    }),
    {
      width: 640,
      height: 360,
      contentBounds: { x: 10, y: 20, width: 120, height: 80 },
      contentShape: {
        width: 120,
        height: 80,
        path: 'M0 0 L120 0 L80 80 Z',
        fillRule: 'evenodd',
      },
    },
  )

  assert.deepEqual(
    normalizeImageSize({
      width: 640,
      height: 360,
      contentBounds: { x: 10, y: 20, width: 120, height: 80 },
      contentShape: {
        width: 640,
        height: 360,
        path: 'M0 0 L640 0 L640 360 Z',
      },
    }),
    {
      width: 640,
      height: 360,
      contentBounds: { x: 10, y: 20, width: 120, height: 80 },
    },
  )
})
