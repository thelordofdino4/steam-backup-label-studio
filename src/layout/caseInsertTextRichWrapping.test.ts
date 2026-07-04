import assert from 'node:assert/strict'
import test from 'node:test'
import {
  wrapRichTextDocumentLines,
  wrapRichTextDocumentLinesBySegments,
} from './caseInsertTextRichWrapping.ts'
import type { RichTextDocument } from '../text/htmlText.ts'

function measureAsCharacters(text: string) {
  return Array.from(text).length
}

const measureOptions = {
  baseFontStyle: 'normal' as const,
  baseFontWeight: 600,
  fontFamily: 'Arial, sans-serif',
  fontSizePx: 10,
  measureText: measureAsCharacters,
}

const document: RichTextDocument = {
  plainText: 'Alpha beta gamma',
  source: '<p><strong>Alpha</strong> <em>beta</em> gamma</p>',
  lines: [{
    text: 'Alpha beta gamma',
    runs: [
      { bold: true, text: 'Alpha' },
      { text: ' ' },
      { italic: true, text: 'beta' },
      { text: ' gamma' },
    ],
  }],
}

test('case insert rich wrapping preserves run styling across measured lines', () => {
  const lines = wrapRichTextDocumentLines(
    document,
    10,
    4,
    measureOptions,
  )

  assert.deepEqual(lines.map((line) => line.text), ['Alpha beta', 'gamma'])
  assert.equal(lines[0].runs[0].bold, true)
  assert.equal(lines[0].runs[2].italic, true)
  assert.equal(lines[1].runs[0].text, 'gamma')
})

test('case insert rich wrapping uses per-line avoidance segment widths', () => {
  const lines = wrapRichTextDocumentLinesBySegments(
    document,
    [
      { left: 0, right: 6, y: 0 },
      { left: 0, right: 20, y: 10 },
    ],
    4,
    measureOptions,
  )

  assert.deepEqual(lines.map((line) => line.text), [
    'Alpha',
    'beta',
    'gamma',
  ])
})
