import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getCenteredRectLayoutSliderRanges,
  getImageFitOffsetLayoutSliderRanges,
} from './caseInsertElementSafeZone.ts'

test('case insert centered slider ranges preserve safe-bound fixture values', () => {
  assert.deepEqual(
    getCenteredRectLayoutSliderRanges(
      { x: 0, y: 0, width: 100, height: 80 },
      { width: 20, height: 16 },
    ),
    {
      x: { min: 10, max: 90 },
      y: { min: 10, max: 90 },
    },
  )
})

test('case insert image fit offset ranges preserve crop-travel fixture values', () => {
  assert.deepEqual(
    getImageFitOffsetLayoutSliderRanges({
      hasEmptySpace: false,
      imageRect: { x: -50, y: 0, width: 200, height: 100 },
      region: { x: 0, y: 0, width: 100, height: 100 },
    }),
    {
      x: { min: -33.3, max: 33.3 },
      y: { min: 0, max: 0 },
    },
  )
})
