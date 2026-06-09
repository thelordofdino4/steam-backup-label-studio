import assert from 'node:assert/strict'
import test from 'node:test'
import {
  findImageDataContentShape,
  getImageContentShape,
  normalizeStoredImageContentShape,
} from './imageContentShape.ts'

function createImageData(width: number, height: number, alphas: number[]) {
  const data = new Uint8ClampedArray(width * height * 4)

  alphas.forEach((alpha, index) => {
    data[index * 4 + 3] = alpha
  })

  return { data, width, height }
}

test('traces an alpha contour around a non-rectangular active shape', () => {
  const imageData = createImageData(2, 2, [
    255, 0,
    255, 255,
  ])
  const shape = findImageDataContentShape(
    imageData,
    { x: 0, y: 0, width: 2, height: 2 },
  )

  assert.equal(shape?.width, 2)
  assert.equal(shape?.height, 2)
  assert.equal(shape?.fillRule, 'evenodd')
  assert.ok((shape?.safetyOutset ?? 0) > 0)
  assert.match(shape?.path ?? '', /L1 1/)
})

test('keeps separated active islands as multiple contour paths', () => {
  const imageData = createImageData(3, 1, [255, 0, 255])
  const shape = findImageDataContentShape(
    imageData,
    { x: 0, y: 0, width: 3, height: 1 },
  )

  assert.equal(shape?.path.match(/M/g)?.length, 2)
})

test('omits contour metadata for a solid rectangular active region', () => {
  const imageData = createImageData(2, 2, [
    255, 255,
    255, 255,
  ])

  assert.equal(
    findImageDataContentShape(
      imageData,
      { x: 0, y: 0, width: 2, height: 2 },
    ),
    null,
  )
})

test('normalizes stored image content shapes against the active content size', () => {
  const shape = {
    width: 2,
    height: 2,
    path: 'M0 0 L1 0 L1 1 Z',
    fillRule: 'evenodd',
    safetyOutset: 0,
  }

  assert.deepEqual(
    normalizeStoredImageContentShape(shape, { width: 2, height: 2 }),
    shape,
  )
  assert.equal(
    normalizeStoredImageContentShape(shape, { width: 3, height: 2 }),
    null,
  )
  assert.equal(
    normalizeStoredImageContentShape(
      { ...shape, path: 'M0 0 L1 1 Z<script>' },
      { width: 2, height: 2 },
    ),
    null,
  )
  assert.deepEqual(
    normalizeStoredImageContentShape(
      { ...shape, safetyOutset: 0.5 },
      { width: 2, height: 2 },
    ),
    { ...shape, safetyOutset: 0.5 },
  )
  assert.deepEqual(
    normalizeStoredImageContentShape(
      { ...shape, safetyOutset: -1 },
      { width: 2, height: 2 },
    ),
    {
      width: 2,
      height: 2,
      path: 'M0 0 L1 0 L1 1 Z',
      fillRule: 'evenodd',
    },
  )
})

test('resolves full-image content shapes without requiring content bounds', () => {
  const shape = {
    width: 4,
    height: 3,
    path: 'M0 0 L4 0 L3 3 Z',
    fillRule: 'evenodd' as const,
    safetyOutset: 0,
  }

  assert.deepEqual(
    getImageContentShape({
      width: 4,
      height: 3,
      contentShape: shape,
    }),
    shape,
  )
})
