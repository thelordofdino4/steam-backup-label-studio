import assert from 'node:assert/strict'
import test from 'node:test'
import {
  isInlinePreviewTextSelectAllShortcut,
} from './inlinePreviewTextEditorInput.ts'

test('inline preview text editor recognizes platform select-all shortcuts', () => {
  assert.equal(
    isInlinePreviewTextSelectAllShortcut({
      altKey: false,
      ctrlKey: true,
      key: 'a',
      metaKey: false,
    }),
    true,
  )
  assert.equal(
    isInlinePreviewTextSelectAllShortcut({
      altKey: false,
      ctrlKey: false,
      key: 'A',
      metaKey: true,
    }),
    true,
  )
})

test('inline preview text editor leaves ordinary typing keys native', () => {
  assert.equal(
    isInlinePreviewTextSelectAllShortcut({
      altKey: false,
      ctrlKey: false,
      key: 'a',
      metaKey: false,
    }),
    false,
  )
  assert.equal(
    isInlinePreviewTextSelectAllShortcut({
      altKey: false,
      ctrlKey: false,
      key: ' ',
      metaKey: false,
    }),
    false,
  )
  assert.equal(
    isInlinePreviewTextSelectAllShortcut({
      altKey: false,
      ctrlKey: false,
      key: 'Backspace',
      metaKey: false,
    }),
    false,
  )
  assert.equal(
    isInlinePreviewTextSelectAllShortcut({
      altKey: false,
      ctrlKey: false,
      key: 'Delete',
      metaKey: false,
    }),
    false,
  )
  assert.equal(
    isInlinePreviewTextSelectAllShortcut({
      altKey: true,
      ctrlKey: true,
      key: 'a',
      metaKey: false,
    }),
    false,
  )
})
