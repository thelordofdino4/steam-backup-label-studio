import assert from 'node:assert/strict'
import test from 'node:test'
import {
  applyRichTextInlineColorCommand,
  applyRichTextInlineToggleCommand,
  getRichTextInlineToggleState,
  getRichTextSelectionColorState,
} from './richTextCommands.ts'

test('applies selected-range bold without changing surrounding text', () => {
  const result = applyRichTextInlineToggleCommand({
    active: true,
    command: 'bold',
    fallbackText: 'Untitled Steam Backup Label',
    selection: { start: 0, end: 8 },
  })

  assert.equal(
    result?.htmlSource,
    '<p><strong>Untitled</strong> Steam Backup Label</p>',
  )
  assert.equal(result?.plainText, 'Untitled Steam Backup Label')
})

test('applies selected-range italic and underline together', () => {
  const italic = applyRichTextInlineToggleCommand({
    active: true,
    command: 'italic',
    fallbackText: 'Steam Backup Label',
    selection: { start: 6, end: 12 },
  })
  const underline = applyRichTextInlineToggleCommand({
    active: true,
    command: 'underline',
    fallbackText: italic?.plainText ?? '',
    htmlSource: italic?.htmlSource,
    selection: { start: 6, end: 12 },
  })

  assert.equal(
    underline?.htmlSource,
    '<p>Steam <em><u>Backup</u></em> Label</p>',
  )
})

test('applies selected-range color and reports mixed selection state', () => {
  const result = applyRichTextInlineColorCommand({
    color: '#ff0000',
    fallbackText: 'Untitled Steam Backup Label',
    selection: { start: 0, end: 8 },
  })
  const colorState = getRichTextSelectionColorState({
    fallbackText: result?.plainText ?? '',
    htmlSource: result?.htmlSource,
    selection: { start: 0, end: 14 },
  })

  assert.equal(
    result?.htmlSource,
    '<p><span style="color:#ff0000">Untitled</span> Steam Backup Label</p>',
  )
  assert.deepEqual(colorState, { state: 'mixed', value: '#ff0000' })
})

test('Ctrl+A-style full selection formats all visible text', () => {
  const result = applyRichTextInlineToggleCommand({
    active: true,
    command: 'bold',
    fallbackText: 'Full selection',
    selection: { start: 0, end: 'Full selection'.length },
  })
  const state = getRichTextInlineToggleState({
    command: 'bold',
    fallbackText: result?.plainText ?? '',
    htmlSource: result?.htmlSource,
    selection: { start: 0, end: 'Full selection'.length },
  })

  assert.equal(result?.htmlSource, '<p><strong>Full selection</strong></p>')
  assert.equal(state, 'active')
})

test('plain text is promoted to canonical HTML and adjacent runs merge', () => {
  const first = applyRichTextInlineColorCommand({
    color: '#00ff00',
    fallbackText: 'Merge me',
    selection: { start: 0, end: 5 },
  })
  const second = applyRichTextInlineColorCommand({
    color: '#00ff00',
    fallbackText: first?.plainText ?? '',
    htmlSource: first?.htmlSource,
    selection: { start: 5, end: 8 },
  })

  assert.equal(
    second?.htmlSource,
    '<p><span style="color:#00ff00">Merge me</span></p>',
  )
})

test('ambient bold can be removed for a selected range', () => {
  const ambientStyle = {
    bold: true,
    boldFontWeight: 900,
    normalFontWeight: 800,
  }
  const state = getRichTextInlineToggleState({
    ambientStyle,
    command: 'bold',
    fallbackText: 'Untitled Steam Backup Label',
    selection: { start: 0, end: 8 },
  })

  assert.equal(state, 'active')

  const result = applyRichTextInlineToggleCommand({
    active: false,
    ambientStyle,
    command: 'bold',
    fallbackText: 'Untitled Steam Backup Label',
    selection: { start: 0, end: 8 },
  })

  assert.equal(
    result?.htmlSource,
    '<p><span style="font-weight:800">Untitled</span> Steam Backup Label</p>',
  )
  assert.equal(
    getRichTextInlineToggleState({
      ambientStyle,
      command: 'bold',
      fallbackText: result?.plainText ?? '',
      htmlSource: result?.htmlSource,
      selection: { start: 0, end: 8 },
    }),
    'inactive',
  )
})

test('ambient color contributes to selected range state', () => {
  assert.deepEqual(
    getRichTextSelectionColorState({
      ambientStyle: { color: '#ffffff' },
      fallbackText: 'Untitled Steam Backup Label',
      selection: { start: 0, end: 8 },
    }),
    { state: 'active', value: '#ffffff' },
  )
})
