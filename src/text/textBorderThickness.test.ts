import assert from 'node:assert/strict'
import test from 'node:test'
import { getExplicitTextBorderThicknessRatio, normalizeTextBorderThicknessPercent } from './textBorderThickness.ts'
import { normalizeDiscTextStyle } from '../discText/styles.ts'

test('missing and automatic values use legacy paint, while explicit values are normalized', () => {
  for (const invalid of [undefined, 0, -1, NaN, Infinity, '12']) {
    assert.equal(normalizeTextBorderThicknessPercent(invalid), undefined)
  }
  assert.equal(normalizeTextBorderThicknessPercent(35), 25)
  assert.equal(getExplicitTextBorderThicknessRatio(12), 0.12)
  assert.equal(Object.hasOwn(normalizeDiscTextStyle('title', { borderThicknessPercent: 0 }), 'borderThicknessPercent'), false)
})
