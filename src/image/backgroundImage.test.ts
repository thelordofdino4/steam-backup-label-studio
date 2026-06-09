import assert from 'node:assert/strict'
import test from 'node:test'
import {
  clampBackgroundOffsetToImageBounds,
  getBackgroundOffsetSliderRanges,
  updateBackgroundOffsetField,
} from './backgroundImage.ts'

test('background offset ranges allow moving until the final image edge reaches the opposite disc edge', () => {
  const ranges = getBackgroundOffsetSliderRanges(
    { width: 600, height: 900 },
    1,
    600,
  )

  assert.deepEqual(ranges.x, { min: -600, max: 600 })
  assert.deepEqual(ranges.y, { min: -750, max: 750 })
})

test('background offset ranges account for background scale', () => {
  const ranges = getBackgroundOffsetSliderRanges(
    { width: 1200, height: 600 },
    1.5,
    600,
  )

  assert.deepEqual(ranges.x, { min: -1200, max: 1200 })
  assert.deepEqual(ranges.y, { min: -750, max: 750 })
})

test('background offset updates clamp to image-edge bounds', () => {
  const imageSize = { width: 600, height: 600 }

  assert.deepEqual(
    clampBackgroundOffsetToImageBounds({ x: -1000, y: 1000 }, imageSize, 1, 600),
    { x: -600, y: 600 },
  )
  assert.deepEqual(
    updateBackgroundOffsetField({ x: 0, y: 0 }, 'x', 999, imageSize, 1, 600),
    { x: 600, y: 0 },
  )
})

test('background sizing uses active content bounds instead of transparent padding', () => {
  const ranges = getBackgroundOffsetSliderRanges(
    {
      width: 1000,
      height: 1000,
      contentBounds: { x: 100, y: 250, width: 800, height: 400 },
    },
    1,
    600,
  )

  assert.deepEqual(ranges.x, { min: -900, max: 900 })
  assert.deepEqual(ranges.y, { min: -600, max: 600 })
})
