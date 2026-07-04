import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getContainedAssetBoundsPercent,
  getLogoAssetBoundsPercent,
  getRatingBadgePlaceholderBoundsPercent,
  getStraightDiscTextBoundsPercent,
} from './assetBounds.ts'
import {
  createDefaultDiscTextLayout,
} from '../discText/index.ts'

function assertApproximatelyEqual(actual: number, expected: number) {
  assert.ok(
    Math.abs(actual - expected) < 0.000001,
    `Expected ${actual} to approximately equal ${expected}`,
  )
}

test('disc asset bounds preserve fallback and contained aspect ratios', () => {
  assert.deepEqual(
    getContainedAssetBoundsPercent(null, 0.2, 0.1, 1.5),
    {
      halfWidth: 15,
      halfHeight: 7.5,
    },
  )
  assert.deepEqual(
    getContainedAssetBoundsPercent(
      { width: 1200, height: 300 },
      0.2,
      0.1,
      1,
    ),
    {
      halfWidth: 10,
      halfHeight: 2.5,
    },
  )
  assert.deepEqual(
    getContainedAssetBoundsPercent(
      { width: 300, height: 1200 },
      0.2,
      0.1,
      1,
    ),
    {
      halfWidth: 1.25,
      halfHeight: 5,
    },
  )
})

test('disc asset bounds keep logo and placeholder ratios stable', () => {
  assert.deepEqual(
    getLogoAssetBoundsPercent(null, 1),
    {
      halfWidth: 9,
      halfHeight: 5,
    },
  )
  assert.deepEqual(
    getRatingBadgePlaceholderBoundsPercent(2),
    {
      halfWidth: 9,
      halfHeight: 13,
    },
  )
})

test('disc asset bounds estimate straight text from width and point size', () => {
  const titleLayout = {
    ...createDefaultDiscTextLayout('top').title,
    fontSizePt: 18,
    width: 40,
  }
  const bounds = getStraightDiscTextBoundsPercent('title', titleLayout)

  assert.equal(bounds.halfWidth, 20)
  assertApproximatelyEqual(bounds.halfHeight, 6.244166666666667)
})
