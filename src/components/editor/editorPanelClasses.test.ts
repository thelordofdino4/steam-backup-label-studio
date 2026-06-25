import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { getEditorPanelClassName } from './editorPanelClasses.ts'

const currentDir = dirname(fileURLToPath(import.meta.url))
const repoRoot = dirname(dirname(dirname(currentDir)))

function readRepoFile(path: string) {
  return readFileSync(join(repoRoot, path), 'utf8')
}

test('workflow panel shell uses the top-level sidebar classes', () => {
  assert.equal(
    getEditorPanelClassName(),
    'panel collapsible-panel',
  )
})

test('feature panel shell keeps nested card classes and spacing', () => {
  assert.equal(
    getEditorPanelClassName({ kind: 'feature', spacingTop: true }),
    'feature-section-card editor-nested-panel collapsible-panel spacing-top',
  )
})

test('branding panel shell keeps branding card classes and extra adapters', () => {
  assert.equal(
    getEditorPanelClassName({
      kind: 'branding',
      spacingTop: true,
      className: 'case-insert-workflow-section',
    }),
    'branding-feature-card editor-nested-panel collapsible-panel spacing-top case-insert-workflow-section',
  )
})

test('shared editor styles preserve keyboard focus and target floors', () => {
  const baseCss = readRepoFile('src/styles/app-base.css')
  const editorCss = readRepoFile('src/styles/app-editor-controls.css')
  const metadataCss = readRepoFile('src/styles/app-metadata-controls.css')
  const previewCss = readRepoFile('src/styles/app-preview-shell.css')
  const ribbonCss = readRepoFile('src/styles/app-contextual-text-ribbon.css')

  assert.match(
    baseCss,
    /button:focus-visible,[\s\S]*input:focus-visible,[\s\S]*select:focus-visible,[\s\S]*textarea:focus-visible,[\s\S]*summary:focus-visible/,
  )
  assert.match(
    baseCss,
    /\.field-label > input\[type="checkbox"\],[\s\S]*\.checkbox-row input\s*\{[\s\S]*width:\s*24px;[\s\S]*height:\s*24px;/,
  )
  assert.match(baseCss, /\.secondary-button\s*\{[\s\S]*min-height:\s*40px;/)
  assert.match(
    baseCss,
    /\.icon-button\s*\{[\s\S]*width:\s*36px;[\s\S]*height:\s*36px;/,
  )
  assert.match(
    metadataCss,
    /\.search-result-button\s*\{[\s\S]*min-height:\s*40px;/,
  )
  assert.match(
    editorCss,
    /\.inline-preview-text-checkbox-field input\s*\{[\s\S]*width:\s*24px;[\s\S]*height:\s*24px;/,
  )
  assert.match(
    ribbonCss,
    /\.contextual-text-ribbon-toggle-check input\s*\{[\s\S]*width:\s*24px;[\s\S]*height:\s*24px;/,
  )
  assert.match(
    previewCss,
    /\.preview-viewport-fit-button,\s*\.preview-viewport-icon-button\s*\{[\s\S]*min-width:\s*24px;[\s\S]*min-height:\s*24px;/,
  )
  assert.match(
    previewCss,
    /\.preview-viewport-fit-button:focus-visible,[\s\S]*\.preview-viewport-icon-button:focus-visible\s*\{[\s\S]*box-shadow:[\s\S]*inset 0 0 0 2px/,
  )
})
