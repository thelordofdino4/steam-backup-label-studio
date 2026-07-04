import assert from 'node:assert/strict'
import test from 'node:test'
import {
  clampTextNodeOffset,
  getInlinePreviewGeometryCaretXRatio,
  getLineTextLength,
} from './inlinePreviewTextEditorTextGeometry.ts'

test('inline preview text geometry clamps text-node offsets to text length', () => {
  const textNode = { textContent: 'Archive' } as Text

  assert.equal(clampTextNodeOffset(textNode, -3), 0)
  assert.equal(clampTextNodeOffset(textNode, 4), 4)
  assert.equal(clampTextNodeOffset(textNode, 99), 7)
})

test('inline preview text geometry counts missing text content as empty', () => {
  assert.equal(
    getLineTextLength([
      { textContent: 'Steam' } as Text,
      { textContent: null } as Text,
      { textContent: 'Deck' } as Text,
    ]),
    9,
  )
})

test('inline preview text geometry clamps caret x ratio lookups', () => {
  const ratios = [0, 0.25, 0.5, 0.75, 1]

  assert.equal(
    getInlinePreviewGeometryCaretXRatio({
      caretXRatios: ratios,
      offset: -2,
    }),
    0,
  )
  assert.equal(
    getInlinePreviewGeometryCaretXRatio({
      caretXRatios: ratios,
      offset: 3,
    }),
    0.75,
  )
  assert.equal(
    getInlinePreviewGeometryCaretXRatio({
      caretXRatios: ratios,
      offset: 99,
    }),
    1,
  )
})

test('inline preview text geometry uses fallback when no caret x ratio exists', () => {
  assert.equal(
    getInlinePreviewGeometryCaretXRatio({
      caretXRatios: [],
      fallback: 0.4,
      offset: 2,
    }),
    0.4,
  )
})
