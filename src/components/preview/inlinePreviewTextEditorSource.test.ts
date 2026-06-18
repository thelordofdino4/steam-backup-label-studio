import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getInlinePreviewHtmlSourceDraftStatus,
} from './inlinePreviewTextEditorSource.ts'

test('HTML source draft status returns canonical source without rewriting raw draft', () => {
  const status = getInlinePreviewHtmlSourceDraftStatus(
    '<p><span style="color: red">Hello</span></p>',
  )

  assert.equal(status.canonicalSource, '<p><span style="color:red">Hello</span></p>')
  assert.equal(status.message, 'HTML will be normalized on Done.')
})

test('HTML source draft status warns about unsupported markup while preserving safe text', () => {
  const status = getInlinePreviewHtmlSourceDraftStatus(
    '<p onclick="alert(1)">Safe</p><script>bad()</script><a href="https://example.test">link</a>',
  )

  assert.equal(status.canonicalSource, '<p>Safe</p><p>link</p>')
  assert.equal(
    status.message,
    'Unsupported HTML is ignored in the preview and cleaned on Done.',
  )
})

test('HTML source draft status accepts already canonical HTML without a message', () => {
  const status = getInlinePreviewHtmlSourceDraftStatus(
    '<p><strong>Hello</strong></p>',
  )

  assert.equal(status.canonicalSource, '<p><strong>Hello</strong></p>')
  assert.equal(status.message, null)
})
