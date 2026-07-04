import assert from 'node:assert/strict'
import test from 'node:test'
import {
  clampCaseInsertTextVisualLayoutToBounds,
  getCaseInsertTextVisualLayout,
} from './caseInsertTextVisualLayout.ts'
import { parseHtmlText } from '../text/htmlText.ts'

function measureTextAsCharacters(text: string) {
  return Array.from(text).length
}

function isInside(value: number, min: number, max: number) {
  return value >= min && value <= max
}

const reservedBounds = {
  x: 10,
  y: 20,
  width: 120,
  height: 160,
}

test('case insert editable bounds hug visible text instead of the reserved box', () => {
  const layout = getCaseInsertTextVisualLayout(reservedBounds, {
    align: 'left',
    fontSizePx: 10,
    lineHeightPx: 12,
    measureText: measureTextAsCharacters,
    paddingRatio: 0,
    text: 'HELLO',
    verticalAlign: 'top',
  })

  assert.equal(layout.bounds.x, reservedBounds.x)
  assert.equal(layout.bounds.width, 5)
  assert.equal(layout.contentBounds.width, 5)
  assert.ok(layout.bounds.width < reservedBounds.width / 2)
})

test('case insert visual layout measures with the emphasized font string', () => {
  const measuredFonts: string[] = []
  const layout = getCaseInsertTextVisualLayout(reservedBounds, {
    align: 'left',
    fontFamily: 'Georgia, serif',
    fontSizePx: 10,
    fontStyle: 'italic',
    fontWeight: 820,
    lineHeightPx: 12,
    measureText: (_text, font) => {
      measuredFonts.push(font)

      return 5
    },
    paddingRatio: 0,
    text: 'HELLO',
    verticalAlign: 'top',
  })

  assert.equal(layout.font, 'italic 820 10px Georgia, serif')
  assert.ok(measuredFonts.every((font) => font === layout.font))
})

test('case insert visual layout carries HTML rich runs through measured lines', () => {
  const measuredFonts: string[] = []
  const layout = getCaseInsertTextVisualLayout(reservedBounds, {
    align: 'left',
    fontFamily: 'Georgia, serif',
    fontSizePx: 10,
    fontWeight: 600,
    lineHeightPx: 12,
    measureText: (text, font) => {
      measuredFonts.push(font)

      return Array.from(text).length
    },
    paddingRatio: 0,
    richText: parseHtmlText('<p>Alpha <strong>bold</strong> <em>italic</em></p>'),
    text: 'Alpha bold italic',
    verticalAlign: 'top',
  })

  assert.deepEqual(
    layout.lines[0]?.runs?.map(({ text, bold, italic }) => ({
      text,
      bold: Boolean(bold),
      italic: Boolean(italic),
    })),
    [
      { text: 'Alpha ', bold: false, italic: false },
      { text: 'bold', bold: true, italic: false },
      { text: ' ', bold: false, italic: false },
      { text: 'italic', bold: false, italic: true },
    ],
  )
  assert.ok(measuredFonts.includes('700 10px Georgia, serif'))
  assert.ok(measuredFonts.includes('italic 600 10px Georgia, serif'))
})

test('case insert visual bounds include paint-safe stroke and shadow slack', () => {
  const layout = getCaseInsertTextVisualLayout(reservedBounds, {
    align: 'left',
    clampVisualBounds: false,
    fontSizePx: 10,
    lineHeightPx: 12,
    measureText: measureTextAsCharacters,
    paddingRatio: 0,
    paintSlackPx: 3,
    text: 'HELLO',
    verticalAlign: 'top',
  })

  assert.equal(layout.contentBounds.x, reservedBounds.x)
  assert.equal(layout.contentBounds.width, 5)
  assert.equal(layout.bounds.x, reservedBounds.x - 3)
  assert.equal(layout.bounds.width, 11)
  assert.equal(layout.bounds.y, reservedBounds.y - 3)
  assert.equal(layout.bounds.height, 18)
})

test('case insert visual bounds use glyph ink overhang separately from wrapping width', () => {
  const layout = getCaseInsertTextVisualLayout(reservedBounds, {
    align: 'left',
    clampVisualBounds: false,
    fontSizePx: 10,
    lineHeightPx: 12,
    measureText: measureTextAsCharacters,
    measureTextInk: (text, font) => ({
      actualBoundingBoxAscent: 0,
      actualBoundingBoxDescent: 10,
      actualBoundingBoxLeft: font.includes('italic') ? 2 : 0,
      actualBoundingBoxRight: Array.from(text).length +
        (font.includes('italic') ? 3 : 0),
      width: Array.from(text).length,
    }),
    paddingRatio: 0,
    fontStyle: 'italic',
    text: 'ITALIC',
    verticalAlign: 'top',
  })

  assert.equal(layout.lines[0]?.width, 6)
  assert.equal(layout.contentBounds.x, reservedBounds.x - 2)
  assert.equal(layout.contentBounds.width, 11)
  assert.equal(layout.bounds.x, reservedBounds.x - 2)
  assert.equal(layout.bounds.width, 11)
})

test('case insert rich text ink bounds union mixed run overhangs', () => {
  const layout = getCaseInsertTextVisualLayout(reservedBounds, {
    align: 'left',
    clampVisualBounds: false,
    fontFamily: 'Georgia, serif',
    fontSizePx: 10,
    fontWeight: 600,
    lineHeightPx: 12,
    measureText: (text) => Array.from(text).length * 5,
    measureTextInk: (text, font) => {
      const width = Array.from(text).length * 5

      return {
        actualBoundingBoxAscent: 0,
        actualBoundingBoxDescent: 10,
        actualBoundingBoxLeft: font.includes('italic') ? 2 : 0,
        actualBoundingBoxRight: width + (font.includes('700') ? 4 : 0),
        width,
      }
    },
    paddingRatio: 0,
    richText: parseHtmlText('<p><em>A</em><strong>Z</strong></p>'),
    text: 'AZ',
    verticalAlign: 'top',
  })

  assert.deepEqual(
    layout.lines[0]?.runs?.map(({ text, bold, italic, left }) => ({
      text,
      bold: Boolean(bold),
      italic: Boolean(italic),
      left,
    })),
    [
      { text: 'A', bold: false, italic: true, left: 10 },
      { text: 'Z', bold: true, italic: false, left: 15 },
    ],
  )
  assert.equal(layout.contentBounds.x, 8)
  assert.equal(layout.contentBounds.width, 16)
})

test('case insert text clamping uses measured visual bounds without changing wrap width', () => {
  const safeBounds = {
    x: 10,
    y: 20,
    width: 30,
    height: 70,
  }
  const requestedBounds = {
    x: 28,
    y: 30,
    width: 18,
    height: 30,
  }
  const { reservedBounds: clampedReservedBounds, visualLayout } =
    clampCaseInsertTextVisualLayoutToBounds(requestedBounds, safeBounds, {
      align: 'right',
      fontSizePx: 10,
      lineHeightPx: 12,
      measureText: measureTextAsCharacters,
      paddingRatio: 0,
      paintSlackPx: 4,
      text: 'HELLO',
      verticalAlign: 'top',
    })

  assert.equal(clampedReservedBounds.width, requestedBounds.width)
  assert.ok(
    clampedReservedBounds.x < requestedBounds.x,
    'reserved box should shift left because painted glyph bounds reached the safe edge',
  )
  assert.equal(visualLayout.bounds.x + visualLayout.bounds.width, safeBounds.x + safeBounds.width)

  const noSlackLines = getCaseInsertTextVisualLayout(requestedBounds, {
    align: 'left',
    fontSizePx: 10,
    lineHeightPx: 12,
    measureText: measureTextAsCharacters,
    paddingRatio: 0,
    text: 'hello hello hello',
    verticalAlign: 'top',
  }).lines.map((line) => line.text)
  const slackLines = getCaseInsertTextVisualLayout(requestedBounds, {
    align: 'left',
    fontSizePx: 10,
    lineHeightPx: 12,
    measureText: measureTextAsCharacters,
    paddingRatio: 0,
    paintSlackPx: 12,
    text: 'hello hello hello',
    verticalAlign: 'top',
  }).lines.map((line) => line.text)

  assert.deepEqual(slackLines, noSlackLines)
})

test('case insert wrap width does not become the safe-zone collision hull', () => {
  const safeBounds = {
    x: 10,
    y: 20,
    width: 30,
    height: 70,
  }
  const requestedBounds = {
    x: -125,
    y: 30,
    width: 300,
    height: 30,
  }
  const { reservedBounds: clampedReservedBounds, visualLayout } =
    clampCaseInsertTextVisualLayoutToBounds(requestedBounds, safeBounds, {
      align: 'center',
      fontSizePx: 10,
      lineHeightPx: 12,
      measureText: measureTextAsCharacters,
      paddingRatio: 0,
      text: 'HELLO',
      verticalAlign: 'top',
    })

  assert.equal(clampedReservedBounds.x, requestedBounds.x)
  assert.equal(clampedReservedBounds.width, requestedBounds.width)
  assert.equal(isInside(visualLayout.bounds.x, safeBounds.x, safeBounds.x + safeBounds.width), true)
  assert.equal(
    isInside(
      visualLayout.bounds.x + visualLayout.bounds.width,
      safeBounds.x,
      safeBounds.x + safeBounds.width,
    ),
    true,
  )
})

test('case insert rich text layout renders bullet list glyphs and item styling', () => {
  const layout = getCaseInsertTextVisualLayout(reservedBounds, {
    align: 'left',
    fontFamily: 'Georgia, serif',
    fontSizePx: 10,
    fontWeight: 600,
    lineHeightPx: 12,
    measureText: measureTextAsCharacters,
    paddingRatio: 0,
    richText: parseHtmlText(
      '<ul><li><strong>Alpha</strong></li><li><span style="color:#00ff00">Beta</span></li></ul>',
    ),
    text: 'Alpha\nBeta',
    verticalAlign: 'top',
  })

  assert.deepEqual(
    layout.lines.map((line) => line.text),
    ['• Alpha', '• Beta'],
  )
  assert.deepEqual(
    layout.lines[0]?.runs?.map(({ text, bold, color }) => ({
      text,
      bold: Boolean(bold),
      color,
    })),
    [
      { text: '• ', bold: false, color: undefined },
      { text: 'Alpha', bold: true, color: undefined },
    ],
  )
  assert.deepEqual(
    layout.lines[1]?.runs?.map(({ text, color }) => ({ text, color })),
    [
      { text: '• ', color: undefined },
      { text: 'Beta', color: '#00ff00' },
    ],
  )
})

test('case insert editable bounds keep a visible minimum box for empty text', () => {
  const layout = getCaseInsertTextVisualLayout(reservedBounds, {
    align: 'left',
    fontSizePx: 10,
    lineHeightPx: 12,
    measureText: measureTextAsCharacters,
    paddingRatio: 0,
    text: '',
    verticalAlign: 'top',
  })

  assert.deepEqual(layout.lines.map((line) => line.text), [''])
  assert.equal(layout.bounds.width, 1)
  assert.equal(layout.bounds.height, 12)
})

test('case insert editable height grows after the second wrapped line', () => {
  const layout = getCaseInsertTextVisualLayout(
    { ...reservedBounds, width: 12, height: 160 },
    {
      align: 'left',
      fontSizePx: 10,
      lineHeightPx: 12,
      measureText: measureTextAsCharacters,
      paddingRatio: 0,
      text: 'alpha beta gamma delta epsilon zeta',
      verticalAlign: 'top',
    },
  )

  assert.ok(layout.lines.length > 2)
  assert.equal(layout.bounds.height, layout.lines.length * 12)
  assert.equal(
    layout.lines.map((line) => line.text).join(' '),
    'alpha beta gamma delta epsilon zeta',
  )
})
