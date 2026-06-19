import assert from 'node:assert/strict'
import test from 'node:test'
import {
  applyRichTextBulletedListCommand,
  applyRichTextInlineColorCommand,
  applyRichTextInlineToggleCommand,
  getRichTextBulletedListState,
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

test('selected multiline text toggles into canonical bulleted list HTML', () => {
  const result = applyRichTextBulletedListCommand({
    active: true,
    fallbackText: 'Alpha\nBeta',
    selection: { start: 0, end: 'Alpha\nBeta'.length },
  })

  assert.equal(result?.plainText, '• Alpha\n• Beta')
  assert.equal(result?.htmlSource, '<ul><li>Alpha</li><li>Beta</li></ul>')
  assert.deepEqual(result?.selection, { start: 2, end: 14 })
  assert.equal(
    getRichTextBulletedListState({
      fallbackText: result?.plainText ?? '',
      htmlSource: result?.htmlSource,
      selection: result?.selection,
    }),
    'active',
  )
})

test('collapsed caret toggles the current paragraph into a bullet item', () => {
  const result = applyRichTextBulletedListCommand({
    active: true,
    fallbackText: 'Alpha\nBeta',
    selection: { start: 7, end: 7 },
  })

  assert.equal(result?.plainText, 'Alpha\n• Beta')
  assert.equal(result?.htmlSource, '<p>Alpha</p><ul><li>Beta</li></ul>')
  assert.deepEqual(result?.selection, { start: 9, end: 9 })
})

test('bulleted list toggle removes bullets and preserves inline formatting', () => {
  const result = applyRichTextBulletedListCommand({
    active: false,
    fallbackText: '• Alpha\n• Beta',
    htmlSource:
      '<ul><li><strong>Alpha</strong></li><li><span style="color:#ff0000">Beta</span></li></ul>',
    selection: { start: 0, end: '• Alpha\n• Beta'.length },
  })

  assert.equal(result?.plainText, 'Alpha\nBeta')
  assert.equal(
    result?.htmlSource,
    '<p><strong>Alpha</strong></p><p><span style="color:#ff0000">Beta</span></p>',
  )
  assert.deepEqual(result?.selection, { start: 0, end: 10 })
})

test('bulleted list state reports mixed selected paragraphs', () => {
  assert.equal(
    getRichTextBulletedListState({
      fallbackText: 'Intro\n• Item',
      htmlSource: '<p>Intro</p><ul><li>Item</li></ul>',
      selection: { start: 0, end: 'Intro\n• Item'.length },
    }),
    'mixed',
  )
})

test('empty text toggles into a safe empty list item', () => {
  const result = applyRichTextBulletedListCommand({
    active: true,
    fallbackText: '',
    selection: { start: 0, end: 0 },
  })

  assert.equal(result?.plainText, '• ')
  assert.equal(result?.htmlSource, '<ul><li></li></ul>')
  assert.deepEqual(result?.selection, { start: 2, end: 2 })
})
