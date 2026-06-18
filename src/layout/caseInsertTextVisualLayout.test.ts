import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getCaseInsertTextVisualLayout,
  wrapCaseInsertTextLines,
} from './caseInsertTextVisualLayout.ts'
import { parseHtmlText } from '../text/htmlText.ts'

function measureTextAsCharacters(text: string) {
  return Array.from(text).length
}

const reservedBounds = {
  x: 10,
  y: 20,
  width: 120,
  height: 160,
}

test('case insert live text wrapping preserves typed whitespace and newlines', () => {
  assert.deepEqual(
    wrapCaseInsertTextLines(
      ' hello  world ',
      80,
      '10px test',
      measureTextAsCharacters,
    ),
    [' hello  world '],
  )
  assert.deepEqual(
    wrapCaseInsertTextLines(
      'alpha\n\n beta ',
      80,
      '10px test',
      measureTextAsCharacters,
    ),
    ['alpha', '', ' beta '],
  )
})

test('case insert live text wraps at the measured boundary without dropping words', () => {
  const lines = wrapCaseInsertTextLines(
    'hello hello hello hello',
    11,
    '10px test',
    measureTextAsCharacters,
  )

  assert.deepEqual(lines, ['hello hello', 'hello hello'])
})

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
  assert.ok(measuredFonts.includes('800 10px Georgia, serif'))
  assert.ok(measuredFonts.includes('italic 600 10px Georgia, serif'))
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
