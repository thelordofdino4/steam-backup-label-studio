import assert from 'node:assert/strict'
import test from 'node:test'

import {
  DISC_TEXT_STRAIGHT_ITALIC_OVERHANG_FACTOR,
  DISC_TEXT_STRAIGHT_SHADOW_SIGMA_EXTENT,
  DISC_TEXT_STRAIGHT_SHADOW_STRONG,
  DISC_TEXT_STRAIGHT_STROKE_WIDTH,
  getStraightDiscTextPaintInsets,
} from './straightTextPaintGeometry.ts'

const EPSILON = 1e-12

test('straight text paint insets include stroke and directional shadow paint', () => {
  const insets = getStraightDiscTextPaintInsets({
    fontSize: 4,
    italic: false,
    style: { contrast: 'strokeShadow' },
  })
  const shadowBlurExtent =
    DISC_TEXT_STRAIGHT_SHADOW_STRONG.standardDeviation *
      DISC_TEXT_STRAIGHT_SHADOW_SIGMA_EXTENT
  const strokeExtent = DISC_TEXT_STRAIGHT_STROKE_WIDTH / 2

  assert.ok(Math.abs(
    insets.top - (
      strokeExtent + shadowBlurExtent -
      DISC_TEXT_STRAIGHT_SHADOW_STRONG.offsetY
    ),
  ) <= EPSILON)
  assert.ok(Math.abs(
    insets.bottom - (
      strokeExtent + shadowBlurExtent +
      DISC_TEXT_STRAIGHT_SHADOW_STRONG.offsetY
    ),
  ) <= EPSILON)
  assert.equal(insets.left, strokeExtent + shadowBlurExtent)
  assert.equal(insets.right, strokeExtent + shadowBlurExtent)
  assert.ok(insets.bottom > insets.top)
  assert.ok(Object.isFrozen(insets))
})

test('italic paint reserves additional symmetric glyph overhang', () => {
  const fontSize = 5
  const upright = getStraightDiscTextPaintInsets({
    fontSize,
    italic: false,
    style: { contrast: 'none' },
  })
  const italic = getStraightDiscTextPaintInsets({
    fontSize,
    italic: true,
    style: { contrast: 'none' },
  })

  assert.ok(Math.abs(
    italic.left - upright.left -
      fontSize * DISC_TEXT_STRAIGHT_ITALIC_OVERHANG_FACTOR,
  ) <= EPSILON)
  assert.equal(italic.left, italic.right)
  assert.equal(italic.top, upright.top)
  assert.equal(italic.bottom, upright.bottom)
})

test('invalid font sizes cannot produce non-finite paint bounds', () => {
  for (const fontSize of [Number.NaN, Number.POSITIVE_INFINITY, -4]) {
    const insets = getStraightDiscTextPaintInsets({
      fontSize,
      italic: true,
      style: { contrast: 'strokeShadow' },
    })

    assert.ok(Object.values(insets).every(Number.isFinite))
    assert.ok(Object.values(insets).every((value) => value >= 0))
  }
})
