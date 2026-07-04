import assert from 'node:assert/strict'
import test from 'node:test'
import {
  adjustSelectionForPrefixChanges,
  clampPlainTextOffset,
  getRichTextLineRangeAtOffset,
  getRichTextLineRanges,
  getSelectedRichTextLineIndexes,
  normalizeSelection,
} from './richTextSelectionRanges.ts'
import { plainTextToRichTextDocument } from './htmlText.ts'

test('clamps plain-text offsets into the available text length', () => {
  assert.equal(clampPlainTextOffset(-4, 8), 0)
  assert.equal(clampPlainTextOffset(3, 8), 3)
  assert.equal(clampPlainTextOffset(12, 8), 8)
})

test('normalizes reversed and out-of-bounds selections', () => {
  assert.deepEqual(
    normalizeSelection({ start: 12, end: -3 }, 8),
    { end: 8, isCollapsed: false, start: 0 },
  )
  assert.deepEqual(
    normalizeSelection(undefined, 8),
    { end: 8, isCollapsed: true, start: 8 },
  )
})

test('maps rich text lines onto plain-text offsets including line breaks', () => {
  const document = plainTextToRichTextDocument('Alpha\nBeta\nC')
  const ranges = getRichTextLineRanges(document.lines)

  assert.deepEqual(ranges, [
    { end: 5, index: 0, start: 0 },
    { end: 10, index: 1, start: 6 },
    { end: 12, index: 2, start: 11 },
  ])
  assert.deepEqual(getRichTextLineRangeAtOffset(ranges, 6), ranges[1])
  assert.deepEqual(getRichTextLineRangeAtOffset(ranges, 99), ranges[2])
})

test('resolves collapsed and expanded selections to selected line indexes', () => {
  const document = plainTextToRichTextDocument('Alpha\nBeta\nGamma')

  assert.deepEqual(
    getSelectedRichTextLineIndexes(
      document,
      normalizeSelection({ start: 7, end: 7 }, document.plainText.length),
    ),
    [1],
  )
  assert.deepEqual(
    getSelectedRichTextLineIndexes(
      document,
      normalizeSelection({ start: 3, end: 12 }, document.plainText.length),
    ),
    [0, 1, 2],
  )
})

test('adjusts selection offsets when line prefixes are inserted or removed', () => {
  assert.deepEqual(
    adjustSelectionForPrefixChanges(
      { start: 6, end: 11 },
      [{ lineStart: 6, newPrefixLength: 2, oldPrefixLength: 0 }],
    ),
    { start: 8, end: 13 },
  )
  assert.deepEqual(
    adjustSelectionForPrefixChanges(
      { start: 7, end: 13 },
      [{ lineStart: 6, newPrefixLength: 0, oldPrefixLength: 2 }],
    ),
    { start: 6, end: 11 },
  )
})
