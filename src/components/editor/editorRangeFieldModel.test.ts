import assert from 'node:assert/strict'
import { test } from 'node:test'
import { getEditorRangeFieldValue } from './editorRangeFieldModel.ts'

test('getEditorRangeFieldValue parses slider values without changing scale', () => {
  assert.equal(getEditorRangeFieldValue('1.25'), 1.25)
  assert.equal(getEditorRangeFieldValue('-42'), -42)
  assert.equal(getEditorRangeFieldValue('0'), 0)
})
