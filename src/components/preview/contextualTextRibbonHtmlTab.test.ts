import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import {
  CONTEXTUAL_TEXT_RIBBON_GROUP_WIDTHS,
} from './contextualTextRibbonModel.ts'

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

test('html ribbon tab uses a dedicated source panel instead of a semantic card', () => {
  const menuSource = readRepoFile(
    'src/components/preview/inlinePreviewTextEditorMenuContent.tsx',
  )
  const helperSource = readRepoFile(
    'src/components/preview/inlinePreviewTextRibbonControls.tsx',
  )
  const ribbonHostSource = readRepoFile(
    'src/components/preview/ContextualTextRibbon.tsx',
  )
  const ribbonCss = readContextualTextRibbonCss()

  assert.deepEqual(CONTEXTUAL_TEXT_RIBBON_GROUP_WIDTHS.source, {
    min: 1,
    preferred: 960,
    max: 4096,
    grows: true,
  })
  assert.match(
    helperSource,
    /function renderInlinePreviewHtmlSourcePanel\(/,
  )
  assert.match(
    helperSource,
    /className="contextual-text-ribbon-html-panel"[\s\S]*data-ribbon-group="source"[\s\S]*data-ribbon-group-row-span="2"[\s\S]*data-ribbon-fill-row="true"[\s\S]*data-ribbon-html-panel/,
  )
  assert.match(
    menuSource,
    /activeTab === 'html'[\s\S]*className:\s*'contextual-text-ribbon-control-row--html'[\s\S]*children:\s*renderInlinePreviewHtmlSourcePanel/,
  )
  assert.doesNotMatch(
    menuSource,
    /activeTab === 'html'[\s\S]*renderContextualTextRibbonGroup\(\{[\s\S]*label:\s*'HTML'/,
  )
  assert.match(
    ribbonCss,
    /\.contextual-text-ribbon-html-panel\s*\{[\s\S]*display:\s*grid[\s\S]*grid-row:\s*span 2[\s\S]*width:\s*100%[\s\S]*max-width:\s*100%[\s\S]*overflow:\s*hidden/,
  )
  assert.match(
    ribbonHostSource,
    /dataset\.ribbonFillRow === 'true'[\s\S]*fillsRow \? '100%' : `\$\{Math\.ceil\(width\)\}px`[\s\S]*fillsRow \? '1 \/ -1'/,
  )
  assert.match(
    ribbonCss,
    /\.contextual-text-ribbon-control-row--html\s*\{[\s\S]*grid-auto-columns:\s*minmax\(0,\s*1fr\)[\s\S]*overflow-x:\s*hidden[\s\S]*padding-bottom:\s*0[\s\S]*scrollbar-width:\s*none/,
  )
  assert.match(
    ribbonCss,
    /\.contextual-text-ribbon-control-row--html::-webkit-scrollbar\s*\{[\s\S]*display:\s*none/,
  )
  assert.match(
    ribbonCss,
    /\.contextual-text-ribbon-html-panel\s*\{[\s\S]*grid-column:\s*1 \/ -1[\s\S]*justify-self:\s*stretch/,
  )
  assert.match(
    ribbonCss,
    /\.contextual-text-ribbon-source-control\s*\{[\s\S]*grid-template-rows:\s*auto minmax\(0,\s*1fr\)/,
  )
  assert.match(
    ribbonCss,
    /\.contextual-text-ribbon-source-status\s*\{[\s\S]*flex-wrap:\s*nowrap[\s\S]*overflow:\s*hidden/,
  )
  assert.match(
    helperSource,
    /contextual-text-ribbon-source-validation[\s\S]*\{status\.message\}/,
  )
  assert.doesNotMatch(
    menuSource,
    /inline-preview-text-source-message/,
  )
  assert.match(
    ribbonCss,
    /\.contextual-text-ribbon-source-field textarea\s*\{[\s\S]*height:\s*100%[\s\S]*min-height:\s*44px[\s\S]*overflow:\s*auto[\s\S]*white-space:\s*pre/,
  )
  assert.match(
    ribbonCss,
    /\.contextual-text-ribbon-html-panel \.contextual-text-ribbon-control-label\s*\{[\s\S]*clip-path:\s*inset\(50%\)/,
  )
})
