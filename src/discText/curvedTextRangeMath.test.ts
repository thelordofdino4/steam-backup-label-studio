import assert from 'node:assert/strict'
import test from 'node:test'
import {
  clampCurvedTextArcDegrees,
  clampCurvedTextRangeValue,
} from './curvedTextRangeMath.ts'

test('curved text range math clamps values inside inclusive bounds', () => {
  assert.equal(clampCurvedTextRangeValue(-2, 0, 10), 0)
  assert.equal(clampCurvedTextRangeValue(4, 0, 10), 4)
  assert.equal(clampCurvedTextRangeValue(12, 0, 10), 10)
})

test('curved text range math preserves collapsed invalid ranges as the lower bound', () => {
  assert.equal(clampCurvedTextRangeValue(12, 8, 3), 8)
})

test('curved text range math normalizes arc degrees to the supported span', () => {
  assert.equal(clampCurvedTextArcDegrees(Number.NaN), 0)
  assert.equal(clampCurvedTextArcDegrees(-12), 0)
  assert.equal(clampCurvedTextArcDegrees(220), 220)
  assert.equal(clampCurvedTextArcDegrees(420), 360)
})
