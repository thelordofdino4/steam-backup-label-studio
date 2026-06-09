import assert from 'node:assert/strict'
import test from 'node:test'
import {
  findImageDataContentBounds,
  getImageContentSize,
  getImageContentSourceRect,
  imageSizesWithContentBoundsMatch,
  withDetectedImageContentBounds,
  withDetectedImageContentMetadata,
} from './imageContentBounds.ts'

function createImageData(width: number, height: number, alphas: number[]) {
  const data = new Uint8ClampedArray(width * height * 4)

  alphas.forEach((alpha, index) => {
    data[index * 4 + 3] = alpha
  })

  return { data, width, height }
}

test('finds the active alpha bounds inside transparent image padding', () => {
  const imageData = createImageData(5, 4, [
    0, 0, 0, 0, 0,
    0, 8, 9, 0, 0,
    0, 0, 7, 0, 0,
    0, 0, 0, 0, 0,
  ])

  assert.deepEqual(findImageDataContentBounds(imageData), {
    x: 1,
    y: 1,
    width: 2,
    height: 2,
  })
})

test('ignores alpha values at or below the threshold', () => {
  const imageData = createImageData(3, 2, [
    0, 4, 0,
    0, 5, 0,
  ])

  assert.deepEqual(findImageDataContentBounds(imageData, 4), {
    x: 1,
    y: 1,
    width: 1,
    height: 1,
  })
})

test('stores an empty content bounds marker for all-transparent images', () => {
  const imageSize = withDetectedImageContentBounds(
    { width: 10, height: 10 },
    null,
  )

  assert.deepEqual(imageSize.contentBounds, {
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  })
  assert.equal(getImageContentSize(imageSize), null)
  assert.equal(getImageContentSourceRect(imageSize), null)
})

test('drops full-image bounds while preserving partial content bounds', () => {
  assert.deepEqual(
    withDetectedImageContentBounds(
      { width: 10, height: 6 },
      { x: 0, y: 0, width: 10, height: 6 },
    ),
    { width: 10, height: 6 },
  )

  const partial = withDetectedImageContentBounds(
    { width: 10, height: 6 },
    { x: 2, y: 1, width: 5, height: 3 },
  )

  assert.deepEqual(getImageContentSize(partial), { width: 5, height: 3 })
  assert.deepEqual(getImageContentSourceRect(partial), {
    x: 2,
    y: 1,
    width: 5,
    height: 3,
  })
})

test('image size comparison includes active content bounds', () => {
  const base = {
    width: 100,
    height: 100,
    contentBounds: { x: 10, y: 10, width: 50, height: 40 },
  }

  assert.equal(imageSizesWithContentBoundsMatch(base, { ...base }), true)
  assert.equal(
    imageSizesWithContentBoundsMatch(base, {
      ...base,
      contentBounds: { x: 10, y: 12, width: 50, height: 40 },
    }),
    false,
  )
})

test('detected image content metadata preserves active bounds and contour shape', () => {
  const imageSize = withDetectedImageContentMetadata(
    { width: 10, height: 8 },
    { x: 2, y: 1, width: 5, height: 4 },
    {
      width: 5,
      height: 4,
      path: 'M0 0 L5 0 L4 4 Z',
      fillRule: 'evenodd',
    },
  )

  assert.deepEqual(imageSize, {
    width: 10,
    height: 8,
    contentBounds: { x: 2, y: 1, width: 5, height: 4 },
    contentShape: {
      width: 5,
      height: 4,
      path: 'M0 0 L5 0 L4 4 Z',
      fillRule: 'evenodd',
    },
  })
})

test('image size comparison includes contour safety outset', () => {
  const base = {
    width: 10,
    height: 8,
    contentBounds: { x: 2, y: 1, width: 5, height: 4 },
    contentShape: {
      width: 5,
      height: 4,
      path: 'M0 0 L5 0 L4 4 Z',
      fillRule: 'evenodd' as const,
      safetyOutset: 1,
    },
  }

  assert.equal(imageSizesWithContentBoundsMatch(base, { ...base }), true)
  assert.equal(
    imageSizesWithContentBoundsMatch(base, {
      ...base,
      contentShape: {
        ...base.contentShape,
        safetyOutset: 2,
      },
    }),
    false,
  )
})
