import assert from 'node:assert/strict'
import test from 'node:test'
import {
  clampStraightDiscTextLayoutToSafeZone,
  getStraightDiscTextLayoutSliderRanges,
} from './discElementSafeZone.ts'
import { discTemplates } from '../templates/discTemplates.ts'
import type { DiscTextLayout } from '../discText.ts'

function assertApproximatelyEqual(actual: number, expected: number) {
  assert.ok(
    Math.abs(actual - expected) < 0.000001,
    `Expected ${actual} to approximately equal ${expected}`,
  )
}

function measureText(text: string, font: string) {
  const fontSizeMatch = font.match(/(\d+(?:\.\d+)?)px/)
  const fontSize = fontSizeMatch ? Number(fontSizeMatch[1]) : 1

  return text.length * fontSize * 0.55
}

function titleLayout(layout: Partial<DiscTextLayout> = {}): DiscTextLayout {
  return {
    x: 0,
    y: 50,
    width: 80,
    scale: 1,
    align: 'center',
    mode: 'straight',
    arcDegrees: 210,
    arcSide: 'bottom',
    ...layout,
  }
}

test('straight text slider ranges shrink as rendered scale grows', () => {
  const template = discTemplates.standardPrintableDisc
  const text = 'VERY WIDE TITLE TEXT'
  const small = getStraightDiscTextLayoutSliderRanges(
    'title',
    text,
    titleLayout({ scale: 0.75 }),
    template,
    measureText,
  )
  const large = getStraightDiscTextLayoutSliderRanges(
    'title',
    text,
    titleLayout({ scale: 1.8 }),
    template,
    measureText,
  )

  assert.ok(large.x.max < small.x.max)
  assert.ok(large.x.min > small.x.min)
  assert.ok(large.y.max < small.y.max)
  assert.ok(large.y.min > small.y.min)
})

test('straight text slider ranges narrow the free axis near the safe-zone edge', () => {
  const template = discTemplates.standardPrintableDisc
  const text = 'SAFE ZONE TITLE'
  const centered = getStraightDiscTextLayoutSliderRanges(
    'title',
    text,
    titleLayout({ x: 0 }),
    template,
    measureText,
  )
  const nearRightEdge = getStraightDiscTextLayoutSliderRanges(
    'title',
    text,
    titleLayout({ x: 30 }),
    template,
    measureText,
  )

  assert.ok(nearRightEdge.y.max - nearRightEdge.y.min < centered.y.max - centered.y.min)
})

test('straight text safe-zone clamp matches the computed slider edge', () => {
  const template = discTemplates.standardPrintableDisc
  const text = 'SAFE ZONE TITLE'
  const layout = titleLayout({ scale: 1.4 })
  const ranges = getStraightDiscTextLayoutSliderRanges(
    'title',
    text,
    layout,
    template,
    measureText,
  )
  const clamped = clampStraightDiscTextLayoutToSafeZone(
    'title',
    { ...layout, x: ranges.x.max },
    template,
    text,
    measureText,
  )

  assertApproximatelyEqual(clamped.x, ranges.x.max)
})

test('straight text slider ranges are aligned to the native slider step', () => {
  const template = discTemplates.standardPrintableDisc
  const ranges = getStraightDiscTextLayoutSliderRanges(
    'title',
    'SAFE ZONE TITLE',
    titleLayout({ y: 19.5 }),
    template,
    measureText,
  )

  for (const value of [ranges.x.min, ranges.x.max, ranges.y.min, ranges.y.max]) {
    assertApproximatelyEqual(value * 10, Math.round(value * 10))
  }
})
