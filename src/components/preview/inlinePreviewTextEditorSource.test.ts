import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createInlinePreviewHtmlSourceDraft,
  getInlinePreviewHtmlSourceDraftFallback,
  getInlinePreviewHtmlSourceDraftIdentity,
  getInlinePreviewHtmlSourceDraftStatus,
  getInlinePreviewHtmlSourceDraftValue,
  resolveInlinePreviewHtmlSourceDraft,
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

test('HTML source draft state uses source value before rendered value', () => {
  assert.equal(
    getInlinePreviewHtmlSourceDraftFallback({
      sourceValue: '<p>Raw source</p>',
      value: 'Rendered text',
    }),
    '<p>Raw source</p>',
  )

  assert.equal(
    getInlinePreviewHtmlSourceDraftFallback({
      value: 'Rendered text',
    }),
    'Rendered text',
  )
})

test('HTML source draft state resets stale target drafts without rewriting current draft', () => {
  const identity = getInlinePreviewHtmlSourceDraftIdentity('case-cover-title')
  const staleDraft = createInlinePreviewHtmlSourceDraft({
    fallbackValue: '<p>Old target</p>',
    initialized: true,
    identity: getInlinePreviewHtmlSourceDraftIdentity('case-tray-title'),
  })
  const currentDraft = createInlinePreviewHtmlSourceDraft({
    fallbackValue: '<p>Current target</p>',
    initialized: true,
    identity,
  })

  assert.deepEqual(
    resolveInlinePreviewHtmlSourceDraft({
      draft: staleDraft,
      fallbackValue: '<p>Fresh source</p>',
      initialized: false,
      identity,
    }),
    {
      identity,
      initialized: false,
      value: '<p>Fresh source</p>',
    },
  )
  assert.equal(
    resolveInlinePreviewHtmlSourceDraft({
      draft: currentDraft,
      fallbackValue: '<p>Fresh source</p>',
      initialized: false,
      identity,
    }),
    currentDraft,
  )
})

test('HTML source draft value falls back until the source textarea initializes', () => {
  const identity = getInlinePreviewHtmlSourceDraftIdentity('disc-title')

  assert.equal(
    getInlinePreviewHtmlSourceDraftValue({
      draft: {
        identity,
        initialized: false,
        value: '',
      },
      fallbackValue: '<p>Loaded source</p>',
    }),
    '<p>Loaded source</p>',
  )

  assert.equal(
    getInlinePreviewHtmlSourceDraftValue({
      draft: {
        identity,
        initialized: true,
        value: '<p>Edited draft</p>',
      },
      fallbackValue: '<p>Loaded source</p>',
    }),
    '<p>Edited draft</p>',
  )
})
