import assert from 'node:assert/strict'
import test from 'node:test'
import {
  DISC_LAYOUT_CENTER_PERCENT,
  doesRectAvoidDiscCenterCircle,
  getInnerNoPrintRadiusPercent,
  getLogoAssetBoundsPercent,
} from '../disc/geometry.ts'
import { discTemplates } from '../templates/discTemplates.ts'
import {
  constrainDiscAxisRangeToInnerNoPrintSide,
  getDiscSafeAxisHalfTravel,
  getRectSafeZoneLayoutSliderRanges,
} from './discSafeZoneRangeMath.ts'

function assertApproximatelyEqual(actual: number, expected: number) {
  assert.ok(
    Math.abs(actual - expected) < 0.000001,
    `Expected ${actual} to approximately equal ${expected}`,
  )
}

test('disc safe axis travel accounts for fixed and moving element extents', () => {
  assertApproximatelyEqual(
    getDiscSafeAxisHalfTravel(10, 0, 1, 2),
    Math.sqrt(99) - 2,
  )
  assert.equal(getDiscSafeAxisHalfTravel(10, 12, 1, 2), 0)
})

test('disc safe range trimming chooses the side of the current element position', () => {
  const template = discTemplates.standardPrintableDisc
  const bounds = { halfWidth: 5, halfHeight: 5 }
  const range = constrainDiscAxisRangeToInnerNoPrintSide(
    { min: 0, max: 100 },
    78,
    DISC_LAYOUT_CENTER_PERCENT,
    getInnerNoPrintRadiusPercent(template),
    bounds,
    (value) => ({ x: value, y: DISC_LAYOUT_CENTER_PERCENT }),
    (point) => point.x,
  )

  assert.ok(range.min > DISC_LAYOUT_CENTER_PERCENT)
  assert.equal(range.max, 100)
  assert.ok(
    doesRectAvoidDiscCenterCircle(
      { x: range.min, y: DISC_LAYOUT_CENTER_PERCENT },
      getInnerNoPrintRadiusPercent(template),
      bounds,
    ),
  )
})

test('disc rectangular safe-zone ranges preserve standard logo fixture values', () => {
  const ranges = getRectSafeZoneLayoutSliderRanges(
    { x: 50, y: 50 },
    discTemplates.standardPrintableDisc,
    getLogoAssetBoundsPercent(null, 1),
    {
      x: { min: 0, max: 100 },
      y: { min: 0, max: 100 },
    },
  )

  assert.deepEqual(ranges, {
    x: { min: 68.2, max: 87.2 },
    y: { min: 64.2, max: 90.7 },
  })
})
