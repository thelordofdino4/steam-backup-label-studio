import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createFallbackInkMetrics,
  getCaseInsertTextFontString,
  getCaseInsertTextPaddingPx,
  getCaseInsertTextRunFontString,
} from './caseInsertTextMeasurement.ts'

test('case insert text measurement helpers build canvas font strings', () => {
  assert.equal(
    getCaseInsertTextFontString(700, 12, 'Georgia, serif', 'italic'),
    'italic 700 12px Georgia, serif',
  )
  assert.equal(
    getCaseInsertTextFontString(600, 10),
    '600 10px "Segoe UI", Arial, sans-serif',
  )
})

test('case insert text measurement helpers resolve rich-run font overrides', () => {
  assert.equal(
    getCaseInsertTextRunFontString({
      baseFontStyle: 'normal',
      baseFontWeight: 600,
      baseFontSizePt: 12,
      fontFamily: 'Arial, sans-serif',
      fontSizePx: 16,
      run: {
        bold: true,
        fontFamily: 'Georgia, serif',
        fontSizePt: 9,
        italic: true,
        text: 'A',
      },
    }),
    'italic 700 37.5px Georgia, serif',
  )
})

test('case insert text measurement helpers keep padding and ink fallback stable', () => {
  assert.equal(getCaseInsertTextPaddingPx(10, 0), 0)
  assert.equal(getCaseInsertTextPaddingPx(10, 0.55), 6)

  assert.deepEqual(
    createFallbackInkMetrics('AB', '20px test', 12),
    {
      actualBoundingBoxAscent: 0,
      actualBoundingBoxDescent: 20,
      actualBoundingBoxLeft: 1.6,
      actualBoundingBoxRight: 13.6,
      width: 12,
    },
  )
})
