import assert from 'node:assert/strict'
import test from 'node:test'
import { getContextualRibbonInnerGroupWidths as allocate, ribbonInnerGroupProfile as profile, getRibbonRangeValueCapacityCh as capacity } from './contextualTextRibbonInnerGroups.ts'

test('smaller groups catch up before larger groups grow', () => {
  const groups = [profile(100, 250), profile(150, 300)]
  assert.deepEqual(allocate(groups, 280), [130, 150])
  assert.deepEqual(allocate(groups, 300), [150, 150])
  assert.deepEqual(allocate(groups, 360), [180, 180])
})

test('capped and intrinsic groups leave growth while remaining equals continue', () => {
  const groups = [profile(100, 140), profile(150, 250), profile(50)]
  assert.deepEqual(allocate(groups, 390), [140, 200, 50])
  assert.deepEqual(allocate(groups, 1000), [140, 250, 50])
})

test('gaps, fractional space, repeated calls and insufficient width preserve the contract', () => {
  const groups = [profile(100, 200), profile(100, 200)]
  assert.deepEqual(allocate(groups, 250.5, 3), [123.75, 123.75])
  assert.deepEqual(allocate(groups, 250.5, 3), [123.75, 123.75])
  assert.deepEqual(allocate(groups, 90, 3), [100, 100])
  assert.deepEqual(allocate(groups, Number.NaN), [100, 100])
  assert.deepEqual(allocate([], 100), [])
  assert.deepEqual(groups.map(group => group.min), [100, 100])
})

test('number capacity reserves sign and supported precision independent of current values', () => {
  assert.equal(capacity([{ min: -100, max: 100, step: 0.01 }]), 8)
  assert.equal(capacity([{ min: 0, max: 360, step: 1 }]), 4)
  assert.equal(capacity([{ min: -9999.25, max: 0, step: 0.25 }]), 9)
  assert.equal(capacity([{ min: 0, max: 10000000, step: 1 }]), 9)
  assert.equal(capacity([{ min: 0, max: 999.999, step: 0.01 }]), 8)
  assert.equal(capacity([undefined]), 4)
})
