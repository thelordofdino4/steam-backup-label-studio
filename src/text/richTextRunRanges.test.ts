import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createRichTextRun,
  getRichTextStyleAtLineOffset,
  normalizeRichTextLine,
  splitRichTextLineAtOffset,
  splitRichTextRunsAtOffset,
} from './richTextRunRanges.ts'
import type { RichTextLine } from './htmlText.ts'

function createLine(runs: RichTextLine['runs']): RichTextLine {
  return {
    runs,
    text: runs.map((run) => run.text).join(''),
  }
}

test('rich text run splitting preserves run styles on both sides of an offset', () => {
  const split = splitRichTextRunsAtOffset(
    [
      createRichTextRun('Alpha ', { color: '#ff0000' }),
      createRichTextRun('Beta', { bold: true, fontWeight: 700 }),
    ],
    'Alpha Be'.length,
  )

  assert.deepEqual(split.beforeRuns, [
    { color: '#ff0000', text: 'Alpha ' },
    { bold: true, fontWeight: 700, text: 'Be' },
  ])
  assert.deepEqual(split.afterRuns, [
    { bold: true, fontWeight: 700, text: 'ta' },
  ])
})

test('rich text line normalization merges adjacent runs with the same style', () => {
  const line = normalizeRichTextLine(
    createLine([]),
    [
      createRichTextRun('Merge ', { color: '#00ff00' }),
      createRichTextRun('me', { color: '#00ff00' }),
      createRichTextRun('!', { italic: true }),
    ],
  )

  assert.equal(line.text, 'Merge me!')
  assert.deepEqual(line.runs, [
    { color: '#00ff00', text: 'Merge me' },
    { italic: true, text: '!' },
  ])
})

test('rich text line splitting clamps offsets to the line text length', () => {
  const line = createLine([
    createRichTextRun('Alpha', { color: '#ff0000' }),
    createRichTextRun('Beta', { bold: true }),
  ])

  assert.deepEqual(
    splitRichTextLineAtOffset(line, -2),
    {
      afterRuns: [
        { color: '#ff0000', text: 'Alpha' },
        { bold: true, text: 'Beta' },
      ],
      beforeRuns: [],
    },
  )
  assert.deepEqual(
    splitRichTextLineAtOffset(line, 99),
    {
      afterRuns: [],
      beforeRuns: [
        { color: '#ff0000', text: 'Alpha' },
        { bold: true, text: 'Beta' },
      ],
    },
  )
})

test('rich text style lookup uses the preceding run at an insertion boundary', () => {
  const line = createLine([
    createRichTextRun('Alpha', { color: '#ff0000' }),
    createRichTextRun('Beta', { bold: true, fontWeight: 700 }),
  ])

  assert.deepEqual(
    getRichTextStyleAtLineOffset(line, 'Alpha'.length),
    { color: '#ff0000' },
  )
  assert.deepEqual(
    getRichTextStyleAtLineOffset(line, 'AlphaB'.length),
    { bold: true, fontWeight: 700 },
  )
})
