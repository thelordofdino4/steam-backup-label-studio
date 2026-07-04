import assert from 'node:assert/strict'
import test from 'node:test'
import {
  clampInlineTextSelectionState,
  getCollapsedSelectionState,
  getInlineTextSelectionRange,
  getInlineTextSelectionStateFromRange,
  getTextareaSelectionState,
  isInlineTextSelectionCollapsed,
  normalizeExternalCaretFrame,
  normalizeExternalSelectionFrames,
} from './inlinePreviewTextEditorSelection.ts'

test('inline preview selection helpers clamp and convert ranges', () => {
  assert.deepEqual(
    getInlineTextSelectionStateFromRange({ end: 50, start: -4 }, 12),
    { end: 12, focus: 12, start: 0 },
  )
  assert.deepEqual(
    clampInlineTextSelectionState({ end: 7, focus: -2, start: 3 }, 5),
    { end: 5, focus: 0, start: 3 },
  )
  assert.deepEqual(
    clampInlineTextSelectionState({ end: -3, focus: 12, start: 9 }, 8),
    { end: 0, focus: 8, start: 8 },
  )
  assert.deepEqual(
    getInlineTextSelectionRange({ end: 6, focus: 2, start: 1 }),
    { end: 6, start: 1 },
  )
})

test('inline preview selection helpers create collapsed caret states', () => {
  const collapsed = getCollapsedSelectionState(8)

  assert.deepEqual(collapsed, { end: 8, focus: 8, start: 8 })
  assert.equal(isInlineTextSelectionCollapsed(collapsed), true)
  assert.equal(isInlineTextSelectionCollapsed({ end: 9, start: 8 }), false)
})

test('inline preview selection helpers preserve textarea focus direction', () => {
  const forwardTextarea = {
    selectionDirection: 'forward',
    selectionEnd: 6,
    selectionStart: 2,
  } as HTMLTextAreaElement
  const backwardTextarea = {
    selectionDirection: 'backward',
    selectionEnd: 6,
    selectionStart: 2,
  } as HTMLTextAreaElement

  assert.deepEqual(
    getTextareaSelectionState(forwardTextarea),
    { end: 6, focus: 6, start: 2 },
  )
  assert.deepEqual(
    getTextareaSelectionState(backwardTextarea),
    { end: 6, focus: 2, start: 2 },
  )
})

test('inline preview selection helpers normalize external geometry defensively', () => {
  const caretFrame = {
    height: 20,
    left: 10,
    pathD: 'M 0 0 L 1 1',
    top: 5,
  }
  const selectionFrames = [
    { height: 12, left: 3, top: 4, width: 30 },
  ]
  const normalizedSelectionFrames =
    normalizeExternalSelectionFrames(selectionFrames)

  assert.equal(normalizeExternalCaretFrame(caretFrame), caretFrame)
  assert.deepEqual(normalizedSelectionFrames, selectionFrames)
  assert.notEqual(normalizedSelectionFrames[0], selectionFrames[0])
})
