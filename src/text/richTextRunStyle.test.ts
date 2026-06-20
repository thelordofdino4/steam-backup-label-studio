import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getRenderableRichTextRuns,
  getRichTextRunCanvasStyle,
  getRichTextRunDomStyle,
  getRichTextRunFontStyle,
  getRichTextRunFontWeight,
  getRichTextRunResolvedFont,
  getRichTextRunTextDecorationLine,
  richTextRunHasVisualStyle,
  richTextRunsHaveVisualStyles,
} from './richTextRunStyle.ts'
import type { RichTextRun } from './htmlText.ts'

test('rich text run style filters empty runs and detects visual overrides', () => {
  const runs: RichTextRun[] = [
    { text: '' },
    { text: 'plain' },
    { text: 'red', color: '#ff0000' },
  ]

  const renderableRuns = getRenderableRichTextRuns(runs)

  assert.deepEqual(renderableRuns.map((run) => run.text), ['plain', 'red'])
  assert.equal(richTextRunHasVisualStyle(renderableRuns[0]), false)
  assert.equal(richTextRunHasVisualStyle(renderableRuns[1]), true)
  assert.equal(richTextRunsHaveVisualStyles(renderableRuns), true)
})

test('rich text run style preserves preview/export parity for color and font overrides', () => {
  const run: RichTextRun = {
    text: 'Styled',
    color: '#67e8f9',
    backgroundColor: '#031b2d',
    fontFamily: 'Georgia, serif',
    fontSizePx: 18,
  }

  assert.deepEqual(getRichTextRunDomStyle(run, 12), {
    backgroundColor: '#031b2d',
    color: '#67e8f9',
    fontFamily: 'Georgia, serif',
    fontSize: '1.5em',
    fontStyle: undefined,
    fontWeight: undefined,
    textDecorationLine: undefined,
  })
  assert.deepEqual(
    getRichTextRunCanvasStyle(run, {
      baseColor: '#f8fafc',
      baseFontFamily: '"Segoe UI", Arial, sans-serif',
      baseFontSizePx: 12,
      baseFontStyle: 'normal',
      baseFontWeight: 600,
    }),
    {
      backgroundColor: '#031b2d',
      color: '#67e8f9',
      fontFamily: 'Georgia, serif',
      fontSizePx: 18,
      fontStyle: 'normal',
      fontWeight: 600,
      underline: false,
    },
  )
})

test('rich text run style preserves preview/export parity for BIU', () => {
  const run: RichTextRun = {
    text: 'BIU',
    bold: true,
    italic: true,
    underline: true,
  }

  assert.equal(getRichTextRunFontWeight(run, 500), 700)
  assert.equal(getRichTextRunFontStyle(run, 'normal'), 'italic')
  assert.equal(getRichTextRunTextDecorationLine(run), 'underline')
  assert.deepEqual(getRichTextRunDomStyle(run, 20), {
    backgroundColor: undefined,
    color: undefined,
    fontFamily: undefined,
    fontSize: undefined,
    fontStyle: 'italic',
    fontWeight: 700,
    textDecorationLine: 'underline',
  })
  assert.deepEqual(
    getRichTextRunCanvasStyle(run, {
      baseColor: '#ffffff',
      baseFontSizePx: 20,
      baseFontStyle: 'normal',
      baseFontWeight: 500,
    }),
    {
      backgroundColor: undefined,
      color: '#ffffff',
      fontFamily: undefined,
      fontSizePx: 20,
      fontStyle: 'italic',
      fontWeight: 700,
      underline: true,
    },
  )
})

test('rich text run style gives explicit run values priority over shorthand flags', () => {
  const run: RichTextRun = {
    text: 'Explicit',
    bold: true,
    italic: true,
    fontStyle: 'normal',
    fontWeight: 650,
    textDecoration: 'none',
  }

  assert.deepEqual(
    getRichTextRunResolvedFont(run, {
      baseFontFamily: 'Arial, sans-serif',
      baseFontSizePx: 14,
      baseFontStyle: 'italic',
      baseFontWeight: 900,
    }),
    {
      fontFamily: 'Arial, sans-serif',
      fontSizePx: 14,
      fontStyle: 'normal',
      fontWeight: 650,
    },
  )
  assert.equal(getRichTextRunTextDecorationLine(run), 'none')
})

test('rich text run style preserves fallback behavior for plain runs', () => {
  const run: RichTextRun = { text: 'Plain' }

  assert.deepEqual(
    getRichTextRunCanvasStyle(run, {
      baseColor: '#d1d5db',
      baseFontFamily: '"Segoe UI", Arial, sans-serif',
      baseFontSizePx: 11,
      baseFontStyle: 'normal',
      baseFontWeight: 600,
    }),
    {
      backgroundColor: undefined,
      color: '#d1d5db',
      fontFamily: '"Segoe UI", Arial, sans-serif',
      fontSizePx: 11,
      fontStyle: 'normal',
      fontWeight: 600,
      underline: false,
    },
  )
  assert.deepEqual(getRichTextRunDomStyle(run, 11), {
    backgroundColor: undefined,
    color: undefined,
    fontFamily: undefined,
    fontSize: undefined,
    fontStyle: undefined,
    fontWeight: undefined,
    textDecorationLine: undefined,
  })
})

test('rich text run style omits unsupported properties from adapter styles', () => {
  const run = {
    text: 'Safe',
    color: '#ffffff',
    className: 'ignored',
    id: 'ignored',
    onClick: 'ignored',
  } as RichTextRun & Record<string, unknown>

  assert.deepEqual(Object.keys(getRichTextRunDomStyle(run, 12)).sort(), [
    'backgroundColor',
    'color',
    'fontFamily',
    'fontSize',
    'fontStyle',
    'fontWeight',
    'textDecorationLine',
  ])
  assert.deepEqual(
    Object.keys(getRichTextRunCanvasStyle(run, {
      baseFontSizePx: 12,
    })).sort(),
    [
      'backgroundColor',
      'color',
      'fontFamily',
      'fontSizePx',
      'fontStyle',
      'fontWeight',
      'underline',
    ],
  )
})
