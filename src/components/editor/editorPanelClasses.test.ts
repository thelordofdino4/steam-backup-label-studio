import assert from 'node:assert/strict'
import test from 'node:test'
import { getEditorPanelClassName } from './editorPanelClasses.ts'

test('workflow panel shell uses the top-level sidebar classes', () => {
  assert.equal(
    getEditorPanelClassName(),
    'panel collapsible-panel',
  )
})

test('feature panel shell keeps nested card classes and spacing', () => {
  assert.equal(
    getEditorPanelClassName({ kind: 'feature', spacingTop: true }),
    'feature-section-card metadata-details collapsible-panel spacing-top',
  )
})

test('branding panel shell keeps branding card classes and extra adapters', () => {
  assert.equal(
    getEditorPanelClassName({
      kind: 'branding',
      spacingTop: true,
      className: 'case-insert-workflow-section',
    }),
    'branding-feature-card metadata-details collapsible-panel spacing-top case-insert-workflow-section',
  )
})
