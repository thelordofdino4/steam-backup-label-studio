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

function readContextualTextRibbonCss() {
  const manifestPath = 'src/styles/app-contextual-text-ribbon.css'
  const manifest = readRepoFile(manifestPath)
  const imports = [...manifest.matchAll(/@import\s+['"](.+)['"];/g)]

  if (imports.length === 0) return manifest

  const manifestDir = dirname(join(repoRoot, manifestPath))
  return imports
    .map(([, importPath]) => readFileSync(join(manifestDir, importPath), 'utf8'))
    .join('\n')
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
  const ribbonCss = readContextualTextRibbonCss()

  assert.match(
    baseCss,
    /--editor-control-target-min:\s*24px/,
  )
  assert.match(
    baseCss,
    /button,[\s\S]*summary,[\s\S]*\.logo-upload-button,[\s\S]*input\[type="checkbox"\],[\s\S]*input\[type="radio"\],[\s\S]*input\[type="range"\],[\s\S]*input\[type="color"\]\s*\{[\s\S]*min-width:\s*var\(--editor-control-target-min\);[\s\S]*min-height:\s*var\(--editor-control-target-min\);/,
  )
  assert.match(
    baseCss,
    /button:focus-visible,[\s\S]*input:not\(\[type="checkbox"\]\):not\(\[type="radio"\]\):focus-visible,[\s\S]*select:focus-visible,[\s\S]*textarea:focus-visible,[\s\S]*summary:focus-visible/,
  )
  assert.match(
    baseCss,
    /\.checkbox-row:has\(input:focus-visible\),[\s\S]*\.field-label:has\(> input\[type="checkbox"\]:focus-visible\)\s*\{[\s\S]*outline:\s*2px solid var\(--editor-focus-outline\);[\s\S]*box-shadow:\s*0 0 0 4px var\(--editor-focus-shadow\);/,
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
    ribbonCss,
    /\.contextual-text-ribbon-toggle-check:has\(input:focus-visible\)\s*\{[\s\S]*outline:\s*2px solid var\(--editor-focus-outline\);[\s\S]*box-shadow:\s*0 0 0 4px var\(--editor-focus-shadow\);/,
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
