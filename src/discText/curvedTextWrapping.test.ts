import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getCurvedRichLineBoundaryProgresses,
  getCurvedRichLines,
  wrapCurvedTextBlock,
} from './curvedTextWrapping.ts'
import { getResolvedDiscTextRenderStyle } from './styles.ts'
import type { RichTextDocument } from '../text/htmlText.ts'

function measureAsCharacters(text: string) {
  return Array.from(text).length
}

const renderStyle = getResolvedDiscTextRenderStyle('copyright')

test('curved text wrapping uses measured arc length and splits long tokens', () => {
  const result = wrapCurvedTextBlock(
    'alpha beta superlongtoken',
    4,
    1,
    90,
    '1px Arial',
    1,
    0,
    true,
    measureAsCharacters,
  )

  assert.ok(result.lines.length > 3)
  assert.ok(result.lines.every((line) => line.length > 0))
  assert.ok(result.blockWindowDegrees > 0)
})

test('curved rich line mapping slices fallback lines back to their source runs', () => {
  const document: RichTextDocument = {
    plainText: 'Alpha beta',
    source: '<p><strong>Alpha</strong> <em>beta</em></p>',
    lines: [{
      text: 'Alpha beta',
      runs: [
        { bold: true, text: 'Alpha' },
        { text: ' ' },
        { italic: true, text: 'beta' },
      ],
    }],
  }
  const richLines = getCurvedRichLines({
    baseFontSize: 1,
    document,
    fallbackLines: ['Alpha', 'beta'],
    letterSpacing: 0,
    measureText: measureAsCharacters,
    renderStyle,
  })

  assert.equal(richLines[0].text, 'Alpha')
  assert.equal(richLines[0].runs[0].text, 'Alpha')
  assert.equal(richLines[0].runs[0].bold, true)
  assert.equal(richLines[1].text, 'beta')
  assert.equal(richLines[1].runs[0].text, 'beta')
  assert.equal(richLines[1].runs[0].italic, true)
})

test('curved rich boundary progress keeps UTF-16 offsets at grapheme edges', () => {
  const boundaries = getCurvedRichLineBoundaryProgresses({
    baseFontSize: 1,
    letterSpacing: 0.5,
    line: {
      text: 'A🙂B',
      width: 4,
      runs: [
        { text: 'A🙂', width: 2 },
        { text: 'B', width: 1 },
      ],
    },
    linePathLength: 10,
    measureText: measureAsCharacters,
    renderStyle,
  })

  assert.deepEqual(
    boundaries.map((boundary) => boundary.offset),
    [0, 1, 3, 4],
  )
  assert.ok(boundaries.every((boundary, index) =>
    index === 0 || boundary.progress >= boundaries[index - 1].progress))
  assert.ok(boundaries.every((boundary) =>
    boundary.progress >= 0 && boundary.progress <= 1))
})
