import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getRenderablePlainText,
  isMarkdownTextEnabled,
  parseMarkdownText,
} from './markdownText.ts'

test('Markdown parser supports bold italic bullets and line breaks', () => {
  const document = parseMarkdownText('Intro **bold** and *italic*\n- First item\n* Second item')

  assert.equal(document.plainText, 'Intro bold and italic\n• First item\n• Second item')
  assert.deepEqual(
    document.lines[0]?.runs.map(({ text, bold, italic }) => ({
      text,
      bold: Boolean(bold),
      italic: Boolean(italic),
    })),
    [
      { text: 'Intro ', bold: false, italic: false },
      { text: 'bold', bold: true, italic: false },
      { text: ' and ', bold: false, italic: false },
      { text: 'italic', bold: false, italic: true },
    ],
  )
})

test('Markdown parser treats raw HTML and unsupported markers as literal text', () => {
  const source = '<script>alert(1)</script> **ok** __literal__ *'
  const document = parseMarkdownText(source)

  assert.equal(document.plainText, '<script>alert(1)</script> ok __literal__ *')
  assert.equal(document.source, source)
  assert.ok(
    document.lines[0]?.runs.some((run) =>
      run.text.includes('<script>alert(1)</script>')),
  )
})

test('Markdown helpers leave plain text objects unchanged', () => {
  assert.equal(
    getRenderablePlainText(
      { contentMode: 'plain', markdownSource: '**ignored**' },
      'visible text',
    ),
    'visible text',
  )
  assert.equal(isMarkdownTextEnabled({ contentMode: 'markdown' }), true)
  assert.equal(isMarkdownTextEnabled({ contentMode: 'plain' }), false)
})
