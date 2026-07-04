import assert from 'node:assert/strict'
import test from 'node:test'
import {
  clampCaseInsertSlotPercent,
} from './slotLayoutMath.ts'

test('case insert slot percent clamp keeps placement inside percentage bounds', () => {
  assert.equal(clampCaseInsertSlotPercent(-12), 0)
  assert.equal(clampCaseInsertSlotPercent(37.5), 37.5)
  assert.equal(clampCaseInsertSlotPercent(112), 100)
})
