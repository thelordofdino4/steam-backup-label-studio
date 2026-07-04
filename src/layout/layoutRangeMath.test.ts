import assert from 'node:assert/strict'
import test from 'node:test'
import {
  clampLayoutNumber,
  clampSteppedLayoutAxisRange,
  getFiniteLayoutNumber,
  getPositiveFiniteLayoutNumber,
  normalizeLayoutAxisRange,
  normalizeLayoutRangeValue,
  normalizePercentLayoutValue,
} from './layoutRangeMath.ts'

const percentBounds = { min: 0, max: 100 }
const step = 0.1

test('layout range math normalizes ordinary and reversed ranges', () => {
  assert.deepEqual(
    normalizeLayoutAxisRange({ min: 12, max: 88 }),
    { min: 12, max: 88 },
  )
  assert.deepEqual(
    normalizeLayoutAxisRange({ min: 88, max: 12 }),
    { min: 12, max: 88 },
  )
})

test('layout range math clamps values below, inside, and above bounds', () => {
  assert.equal(clampLayoutNumber(-12, 0, 100), 0)
  assert.equal(clampLayoutNumber(48, 0, 100), 48)
  assert.equal(clampLayoutNumber(128, 0, 100), 100)
})

test('layout range math normalizes percent values with fallback preservation', () => {
  assert.equal(normalizePercentLayoutValue(-12, 50), 0)
  assert.equal(normalizePercentLayoutValue(48, 50), 48)
  assert.equal(normalizePercentLayoutValue(128, 50), 100)
  assert.equal(normalizePercentLayoutValue(Number.NaN, 50), 50)
})

test('layout range math step-rounds range edges inward at boundaries', () => {
  assert.deepEqual(
    clampSteppedLayoutAxisRange(
      { min: 12.01, max: 87.99 },
      percentBounds,
      { step },
    ),
    { min: 12.1, max: 87.9 },
  )
  assert.deepEqual(
    clampSteppedLayoutAxisRange(
      { min: -1.04, max: 101.04 },
      percentBounds,
      { step },
    ),
    { min: 0, max: 100 },
  )
})

test('layout range math preserves the existing midpoint fallback for inverted stepped ranges', () => {
  assert.deepEqual(
    clampSteppedLayoutAxisRange(
      { min: 50.06, max: 50.04 },
      percentBounds,
      { step },
    ),
    { min: 50.05, max: 50.05 },
  )
})

test('layout range math normalizes fractional precision and negative zero', () => {
  assert.equal(normalizeLayoutRangeValue(12.345678), 12.3457)
  assert.equal(normalizeLayoutRangeValue(-0.00001), 0)
})

test('layout range math selects finite values over invalid fallback values', () => {
  assert.equal(getFiniteLayoutNumber(42, 12), 42)
  assert.equal(getFiniteLayoutNumber(Number.NaN, 12), 12)
  assert.equal(getFiniteLayoutNumber(Number.POSITIVE_INFINITY, 12), 12)
  assert.equal(getFiniteLayoutNumber(Number.NEGATIVE_INFINITY, 12), 12)
})

test('layout range math selects positive finite values over fallback values', () => {
  assert.equal(getPositiveFiniteLayoutNumber(42, 12), 42)
  assert.equal(getPositiveFiniteLayoutNumber(0, 12), 12)
  assert.equal(getPositiveFiniteLayoutNumber(-1, 12), 12)
  assert.equal(getPositiveFiniteLayoutNumber(Number.NaN, 12), 12)
  assert.equal(getPositiveFiniteLayoutNumber(undefined, 12), 12)
})
