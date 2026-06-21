import assert from 'node:assert/strict'
import test from 'node:test'
import {
  applyRichTextBulletedListCommand,
  applyRichTextInlineColorCommand,
  applyRichTextInlineFontFamilyCommand,
  applyRichTextInlineFontSizePtCommand,
  applyRichTextInlineToggleCommand,
  applyRichTextListKeyboardCommand,
  applyRichTextPlainTextMutation,
  getRichTextBulletedListState,
  getRichTextInlineToggleState,
  getRichTextSelectionColorState,
  getRichTextSelectionFontFamilyState,
  getRichTextSelectionFontSizePtState,
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

test('applies selected-range point size without changing surrounding text', () => {
  const result = applyRichTextInlineFontSizePtCommand({
    fallbackText: 'Untitled Steam Backup Label',
    fontSizePt: 36,
    selection: { start: 0, end: 8 },
  })

  assert.equal(
    result?.htmlSource,
    '<p><span style="font-size:36pt">Untitled</span> Steam Backup Label</p>',
  )
  assert.equal(result?.plainText, 'Untitled Steam Backup Label')
  assert.deepEqual(result?.selection, { start: 0, end: 8 })
})

test('applies selected-range font family without changing surrounding text', () => {
  const result = applyRichTextInlineFontFamilyCommand({
    fallbackText: 'Untitled Steam Backup Label',
    fontFamily: 'Georgia, serif',
    selection: { start: 0, end: 8 },
  })

  assert.equal(
    result?.htmlSource,
    '<p><span style="font-family:Georgia, serif">Untitled</span> Steam Backup Label</p>',
  )
  assert.equal(result?.plainText, 'Untitled Steam Backup Label')
  assert.deepEqual(result?.selection, { start: 0, end: 8 })
})

test('selected-range font family reports active and mixed state from ambient font', () => {
  const result = applyRichTextInlineFontFamilyCommand({
    ambientStyle: { fontFamily: 'Arial, sans-serif' },
    fallbackText: 'Untitled Steam Backup Label',
    fontFamily: 'Georgia, serif',
    selection: { start: 0, end: 8 },
  })

  assert.deepEqual(
    getRichTextSelectionFontFamilyState({
      ambientStyle: { fontFamily: 'Arial, sans-serif' },
      fallbackText: result?.plainText ?? '',
      htmlSource: result?.htmlSource,
      selection: { start: 0, end: 8 },
    }),
    { state: 'active', value: 'Georgia, serif' },
  )
  assert.deepEqual(
    getRichTextSelectionFontFamilyState({
      ambientStyle: { fontFamily: 'Arial, sans-serif' },
      fallbackText: result?.plainText ?? '',
      htmlSource: result?.htmlSource,
      selection: { start: 0, end: 14 },
    }),
    { state: 'mixed', value: 'Georgia, serif' },
  )
})

test('selected-range point size reports active and mixed state from ambient size', () => {
  const result = applyRichTextInlineFontSizePtCommand({
    ambientStyle: { fontSizePt: 18 },
    fallbackText: 'Untitled Steam Backup Label',
    fontSizePt: 36,
    selection: { start: 0, end: 8 },
  })

  assert.deepEqual(
    getRichTextSelectionFontSizePtState({
      ambientStyle: { fontSizePt: 18 },
      fallbackText: result?.plainText ?? '',
      htmlSource: result?.htmlSource,
      selection: { start: 0, end: 8 },
    }),
    { state: 'active', value: 36 },
  )
  assert.deepEqual(
    getRichTextSelectionFontSizePtState({
      ambientStyle: { fontSizePt: 18 },
      fallbackText: result?.plainText ?? '',
      htmlSource: result?.htmlSource,
      selection: { start: 0, end: 14 },
    }),
    { state: 'mixed', value: 36 },
  )
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
    boldFontWeight: 700,
    normalFontWeight: 400,
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
    '<p><span style="font-weight:400">Untitled</span> Steam Backup Label</p>',
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

test('plain text deletion preserves unrelated formatted runs', () => {
  const result = applyRichTextPlainTextMutation({
    fallbackText: 'Alpha Beta Gamma',
    htmlSource:
      '<p>Alpha <strong>Beta</strong> <span style="color:#ff0000">Gamma</span></p>',
    nextPlainText: 'Alpha Bta Gamma',
  })

  assert.equal(result.plainText, 'Alpha Bta Gamma')
  assert.equal(
    result.htmlSource,
    '<p>Alpha <strong>Bta</strong> <span style="color:#ff0000">Gamma</span></p>',
  )
})

test('plain text insertion inside formatted run keeps that run style', () => {
  const result = applyRichTextPlainTextMutation({
    fallbackText: 'Alpha Beta Gamma',
    htmlSource:
      '<p>Alpha <strong>Beta</strong> <span style="color:#ff0000">Gamma</span></p>',
    nextPlainText: 'Alpha BeXta Gamma',
  })

  assert.equal(
    result.htmlSource,
    '<p>Alpha <strong>BeXta</strong> <span style="color:#ff0000">Gamma</span></p>',
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

test('Enter inside a bullet creates the next list item', () => {
  const result = applyRichTextListKeyboardCommand({
    command: 'enter',
    fallbackText: '• Alpha',
    htmlSource: '<ul><li>Alpha</li></ul>',
    selection: { start: '• Alpha'.length, end: '• Alpha'.length },
  })

  assert.equal(result?.plainText, '• Alpha\n• ')
  assert.equal(result?.htmlSource, '<ul><li>Alpha</li><li></li></ul>')
  assert.deepEqual(result?.selection, { start: '• Alpha\n• '.length, end: '• Alpha\n• '.length })
})

test('Enter on an empty bullet exits the list', () => {
  const result = applyRichTextListKeyboardCommand({
    command: 'enter',
    fallbackText: '• Alpha\n• ',
    htmlSource: '<ul><li>Alpha</li><li></li></ul>',
    selection: { start: '• Alpha\n• '.length, end: '• Alpha\n• '.length },
  })

  assert.equal(result?.plainText, '• Alpha\n')
  assert.equal(result?.htmlSource, '<ul><li>Alpha</li></ul><p></p>')
  assert.deepEqual(result?.selection, { start: '• Alpha\n'.length, end: '• Alpha\n'.length })
})

test('Shift+Enter inserts a soft break inside a bullet item', () => {
  const result = applyRichTextListKeyboardCommand({
    command: 'shiftEnter',
    fallbackText: '• AlphaBeta',
    htmlSource: '<ul><li>AlphaBeta</li></ul>',
    selection: { start: '• Alpha'.length, end: '• Alpha'.length },
  })

  assert.equal(result?.plainText, '• Alpha\nBeta')
  assert.equal(result?.htmlSource, '<ul><li>Alpha<br>Beta</li></ul>')
  assert.deepEqual(result?.selection, { start: '• Alpha\n'.length, end: '• Alpha\n'.length })
})

test('Backspace on an empty bullet exits the list', () => {
  const result = applyRichTextListKeyboardCommand({
    command: 'backspace',
    fallbackText: '• Alpha\n• ',
    htmlSource: '<ul><li>Alpha</li><li></li></ul>',
    selection: { start: '• Alpha\n• '.length, end: '• Alpha\n• '.length },
  })

  assert.equal(result?.plainText, '• Alpha\n')
  assert.equal(result?.htmlSource, '<ul><li>Alpha</li></ul><p></p>')
})

test('list keyboard promotes visible bullet text to canonical HTML', () => {
  const result = applyRichTextListKeyboardCommand({
    command: 'enter',
    fallbackText: '• Alpha',
    selection: { start: '• Alpha'.length, end: '• Alpha'.length },
  })

  assert.equal(result?.htmlSource, '<ul><li>Alpha</li><li></li></ul>')
})
