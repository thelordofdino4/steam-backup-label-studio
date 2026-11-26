import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  formatEditorRangeFieldValue,
  getEditorRangeFieldNumberInputCharacterCapacity,
  getEditorRangeFieldValue,
  getEditorRangeFieldPrecision,
  normalizeEditorRangeFieldValue,
} from './editorRangeFieldModel.ts'

test('getEditorRangeFieldValue parses slider values without changing scale', () => {
  assert.equal(getEditorRangeFieldValue('1.25'), 1.25)
  assert.equal(getEditorRangeFieldValue('-42'), -42)
  assert.equal(getEditorRangeFieldValue('0'), 0)
})

test('getEditorRangeFieldPrecision derives decimals from the step value', () => {
  assert.equal(getEditorRangeFieldPrecision(1), 0)
  assert.equal(getEditorRangeFieldPrecision(0.1), 1)
  assert.equal(getEditorRangeFieldPrecision('0.05'), 2)
})

test('formatEditorRangeFieldValue keeps compact numeric input text', () => {
  assert.equal(formatEditorRangeFieldValue(1.234, 0.01), '1.234')
  assert.equal(formatEditorRangeFieldValue(1.2, 0.01), '1.2')
  assert.equal(formatEditorRangeFieldValue(0.30000000000000004, 0.1), '0.3')
  assert.equal(formatEditorRangeFieldValue(4.6, 1), '4.6')
})

test('getEditorRangeFieldNumberInputCharacterCapacity fits range boundaries and current values', () => {
  assert.equal(
    getEditorRangeFieldNumberInputCharacterCapacity({
      min: -12.5,
      max: 1000,
      step: 0.1,
      value: 999.9,
    }),
    6,
  )
  assert.equal(
    getEditorRangeFieldNumberInputCharacterCapacity({
      min: 'not-a-number',
      max: 10,
      step: 1,
      value: -100,
    }),
    5,
  )
})

test('normalizeEditorRangeFieldValue clamps and snaps typed values', () => {
  assert.equal(
    normalizeEditorRangeFieldValue({
      min: 0,
      max: 10,
      step: 0.1,
      rawValue: '1.26',
    }),
    1.3,
  )
  assert.equal(
    normalizeEditorRangeFieldValue({
      min: -5,
      max: 5,
      step: 0.5,
      rawValue: '-12',
    }),
    -5,
  )
  assert.equal(
    normalizeEditorRangeFieldValue({
      min: 0,
      max: 10,
      step: 1,
      rawValue: 'not-a-number',
    }),
    null,
  )
})
