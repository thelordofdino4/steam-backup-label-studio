import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getInlinePreviewTextCaretIndexForLineOffset,
  getInlinePreviewTextCaretLineOffset,
} from './inlinePreviewTextEditorCaret.ts'

test('inline preview caret maps repeated visible text to the correct later index', () => {
  const caretValue = 'hello hello'
  const lines = [{ text: 'hello' }, { text: 'hello' }]

  assert.deepEqual(
    getInlinePreviewTextCaretLineOffset({
      caretIndex: caretValue.length,
      caretValue,
      lines,
    }),
    {
      lineIndex: 1,
      offset: 5,
    },
  )
  assert.equal(
    getInlinePreviewTextCaretIndexForLineOffset({
      caretValue,
      lineIndex: 1,
      lines,
      offset: 5,
    }),
    caretValue.length,
  )
})

test('inline preview caret skips wrapped whitespace between visible lines', () => {
  const caretValue = 'hello  hello'
  const lines = [{ text: 'hello' }, { text: 'hello' }]

  assert.equal(
    getInlinePreviewTextCaretIndexForLineOffset({
      caretValue,
      lineIndex: 1,
      lines,
      offset: 0,
    }),
    7,
  )
  assert.deepEqual(
    getInlinePreviewTextCaretLineOffset({
      caretIndex: 5,
      caretValue,
      lines,
    }),
    {
      lineIndex: 0,
      offset: 5,
    },
  )
  assert.deepEqual(
    getInlinePreviewTextCaretLineOffset({
      caretIndex: 6,
      caretValue,
      lines,
    }),
    {
      lineIndex: 0,
      offset: 5,
    },
  )
})

test('inline preview caret clamps out-of-range line offsets', () => {
  const caretValue = 'title'
  const lines = [{ text: 'title' }]

  assert.equal(
    getInlinePreviewTextCaretIndexForLineOffset({
      caretValue,
      lineIndex: 0,
      lines,
      offset: 500,
    }),
    5,
  )
  assert.deepEqual(
    getInlinePreviewTextCaretLineOffset({
      caretIndex: -20,
      caretValue,
      lines,
    }),
    {
      lineIndex: 0,
      offset: 0,
    },
  )
})
