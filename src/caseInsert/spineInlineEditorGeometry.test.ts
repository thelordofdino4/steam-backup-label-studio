import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getSpineInlineTextEditorGeometryLines,
} from './spineInlineEditorGeometry.ts'

function measureText(text: string) {
  return text.length
}

test('spine inline geometry maps multiline caret ratios into text bounds', () => {
  const geometryLines = getSpineInlineTextEditorGeometryLines({
    baseFontFamily: 'Arial, sans-serif',
    baseFontSizePx: 12,
    baseFontStyle: 'normal',
    baseFontWeight: 700,
    lineHeightPx: 10,
    lines: [
      { left: 10, right: 14, text: 'ABCD', width: 4, x: 12, y: 20 },
      { left: 12, right: 14, text: 'EF', width: 2, x: 13, y: 32 },
    ],
    measureText,
    textBounds: { height: 50, width: 20, x: 5, y: 10 },
  })

  assert.deepEqual(geometryLines, [
    {
      caretXRatios: [0.25, 0.3, 0.35, 0.4, 0.45],
      heightRatio: 0.2,
      text: 'ABCD',
      topRatio: 0.2,
    },
    {
      caretXRatios: [0.35, 0.4, 0.45],
      heightRatio: 0.2,
      text: 'EF',
      topRatio: 0.44,
    },
  ])
})

test('spine inline geometry preserves nested styled run boundaries', () => {
  const geometryLines = getSpineInlineTextEditorGeometryLines({
    baseFontFamily: 'Arial, sans-serif',
    baseFontSizePx: 12,
    baseFontStyle: 'normal',
    baseFontWeight: 700,
    lineHeightPx: 10,
    lines: [
      {
        left: 20,
        right: 28,
        runs: [
          { color: '#ff0000', left: 20, text: 'RED', width: 3 },
          { bold: true, left: 23, text: 'BLUE', width: 4 },
        ],
        text: 'REDBLUE',
        width: 7,
        x: 24,
        y: 10,
      },
    ],
    measureText,
    textBounds: { height: 20, width: 20, x: 20, y: 10 },
  })

  assert.deepEqual(
    geometryLines[0]?.caretXRatios,
    [0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35],
  )
})
