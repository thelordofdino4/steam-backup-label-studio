import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getDiscInlineTextEditorGeometryLines,
} from './inlineEditorGeometry.ts'
import type {
  StraightDiscTextRenderLayout,
  StraightDiscTextVisualBounds,
} from './renderLayout.ts'

function measureText(text: string) {
  return text.length
}

function measureTextByFont(text: string, font: string) {
  if (/Verdana/i.test(font)) return text.length * 4
  return text.length
}

function createRenderLayout(
  overrides: Partial<StraightDiscTextRenderLayout> = {},
): StraightDiscTextRenderLayout {
  return {
    align: 'center',
    color: '#ffffff',
    font: '700 4px Arial',
    fontFamily: 'Arial, sans-serif',
    fontSize: 4,
    fontWeight: 700,
    lineHeight: 2,
    lines: [{ text: 'abcd', width: 4, x: 50, y: 50 }],
    maxWidth: 20,
    style: {
      backgroundColor: '#000000',
      backgroundEnabled: false,
      backgroundOpacity: 1,
      backgroundPadding: 0,
      borderColor: '#000000',
      borderEnabled: false,
      borderRadius: 0,
      color: '#ffffff',
      contrast: 'none',
      fontFamilyCanvas: 'Arial, sans-serif',
      fontFamilyCss: 'Arial, sans-serif',
      fontSizePercent: 4,
      fontWeight: 700,
    },
    textAnchor: 'middle',
    ...overrides,
  }
}

test('disc inline editor geometry maps centered SVG text into host ratios', () => {
  const bounds: StraightDiscTextVisualBounds = {
    centerX: 50,
    centerY: 50,
    halfHeight: 1,
    halfWidth: 10,
  }
  const geometryLines = getDiscInlineTextEditorGeometryLines({
    bounds,
    measureText,
    renderLayout: createRenderLayout(),
  })

  assert.deepEqual(geometryLines, [
    {
      caretXRatios: [0.4, 0.45, 0.5, 0.55, 0.6],
      heightRatio: 1,
      text: 'abcd',
      topRatio: 0,
    },
  ])
})

test('disc inline editor geometry respects start anchored SVG text', () => {
  const bounds: StraightDiscTextVisualBounds = {
    centerX: 42,
    centerY: 50,
    halfHeight: 1,
    halfWidth: 2,
  }
  const geometryLines = getDiscInlineTextEditorGeometryLines({
    bounds,
    measureText,
    renderLayout: createRenderLayout({
      lines: [{ text: 'abcd', x: 40, y: 50 }],
      textAnchor: 'start',
    }),
  })

  assert.deepEqual(geometryLines[0]?.caretXRatios, [0, 0.25, 0.5, 0.75, 1])
})

test('disc inline editor geometry uses rich-text run fonts for caret positions', () => {
  const bounds: StraightDiscTextVisualBounds = {
    centerX: 50,
    centerY: 50,
    halfHeight: 1,
    halfWidth: 5,
  }
  const geometryLines = getDiscInlineTextEditorGeometryLines({
    bounds,
    measureText: measureTextByFont,
    renderLayout: createRenderLayout({
      font: '400 4px Arial',
      lines: [
        {
          text: 'abcd',
          width: 10,
          x: 50,
          y: 50,
          runs: [
            {
              font: '400 4px Arial',
              text: 'ab',
              width: 2,
            },
            {
              font: '400 4px Verdana',
              text: 'cd',
              width: 8,
            },
          ],
        },
      ],
    }),
  })

  assert.deepEqual(geometryLines[0]?.caretXRatios, [0, 0.1, 0.2, 0.6, 1])
})
