import assert from 'node:assert/strict'
import test from 'node:test'
import {
  clampPointToSafeCircle,
  clampRectToSafeAnnulus,
  getRectDistanceFromDiscCenter,
} from './geometry.ts'

test('disc geometry treats non-finite point axes as the disc center', () => {
  assert.equal(
    getRectDistanceFromDiscCenter(
      { x: Number.NaN, y: 65 },
      { halfWidth: 0, halfHeight: 0 },
    ),
    15,
  )
  assert.deepEqual(
    clampPointToSafeCircle(
      { x: Number.POSITIVE_INFINITY, y: Number.NEGATIVE_INFINITY },
      40,
    ),
    { x: 50, y: 50 },
  )
  assert.deepEqual(
    clampRectToSafeAnnulus(
      { x: Number.NaN, y: 65 },
      0,
      40,
      { halfWidth: 2, halfHeight: 2 },
    ),
    { x: 50, y: 65 },
  )
})
