import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

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

test('contextual text ribbon CSS keeps preview layout independent of activation', () => {
  const appCss = readRepoFile('src/styles/App.css')
  const ribbonCss = readContextualTextRibbonCss()
  const feedbackCss = readRepoFile('src/styles/app-preview-feedback.css')
  const previewCss = readRepoFile('src/styles/app-preview-shell.css')
  const layoutFixCss = readRepoFile('src/styles/layoutFix.css')

  assert.match(appCss, /@import '\.\/app-contextual-text-ribbon\.css';/)
  assert.match(ribbonCss, /\.preview-header\s*\{/)
  assert.match(ribbonCss, /--contextual-text-ribbon-control-row-count:\s*2/)
  assert.match(ribbonCss, /grid-template-columns:[\s\S]*fit-content\(220px\)[\s\S]*minmax\(0,\s*1fr\)/)
  assert.match(ribbonCss, /gap:\s*0/)
  assert.match(ribbonCss, /min-height: var\(--contextual-text-ribbon-reserved-height\)/)
  assert.match(ribbonCss, /\.contextual-text-ribbon-host/)
  assert.match(ribbonCss, /width:\s*min\(100%,\s*var\(--contextual-text-ribbon-active-width,\s*100%\)\)/)
  assert.match(ribbonCss, /justify-self:\s*end/)
  assert.match(ribbonCss, /max-width:\s*100%/)
  assert.match(ribbonCss, /container-type:\s*inline-size/)
  assert.match(ribbonCss, /height:\s*var\(--contextual-text-ribbon-reserved-height\)/)
  assert.match(ribbonCss, /border-radius:\s*0 0 0 8px/)
  assert.match(ribbonCss, /\.contextual-text-ribbon-tabs\s*\{[\s\S]*grid-row:\s*1/)
  assert.match(ribbonCss, /\.contextual-text-ribbon-tabs\s*\{[\s\S]*repeat\(5,\s*minmax\(0,\s*1fr\)\)/)
  assert.match(ribbonCss, /\.contextual-text-ribbon-tab\s*\{[\s\S]*white-space:\s*nowrap/)
  assert.match(ribbonCss, /\.contextual-text-ribbon-controls\s*\{[\s\S]*grid-row:\s*2/)
  assert.match(ribbonCss, /\.contextual-text-ribbon-controls\s*\{[\s\S]*overflow:\s*hidden/)
  assert.match(ribbonCss, /\.contextual-text-ribbon-control-row\s*\{[\s\S]*display:\s*grid/)
  assert.match(ribbonCss, /\.contextual-text-ribbon-control-row\s*\{[\s\S]*grid-auto-flow:\s*column/)
  assert.match(ribbonCss, /\.contextual-text-ribbon-control-row\s*\{[\s\S]*grid-template-rows:\s*repeat\(/)
  assert.match(ribbonCss, /\.contextual-text-ribbon-control-row\s*\{[\s\S]*overflow-x:\s*auto/)
  assert.match(ribbonCss, /\.contextual-text-ribbon-control-row\s*\{[\s\S]*overflow-y:\s*hidden/)
  assert.match(ribbonCss, /\.contextual-text-ribbon-control-row\s*\{[\s\S]*height:\s*100%/)
  assert.match(ribbonCss, /\.contextual-text-ribbon-control-row\s*\{[\s\S]*max-height:\s*100%/)
  assert.match(ribbonCss, /\.contextual-text-ribbon-control-row\s*\{[\s\S]*padding-bottom:\s*var\(--contextual-text-ribbon-bottom-row-gap\)/)
  assert.doesNotMatch(ribbonCss, /scrollbar-gutter:\s*stable/)
  assert.match(ribbonCss, /\.contextual-text-ribbon-control-row::-webkit-scrollbar\s*\{[\s\S]*width:\s*0[\s\S]*height:\s*var\(--contextual-text-ribbon-horizontal-scrollbar-height\)/)
  assert.match(ribbonCss, /\.contextual-text-ribbon-group\s*\{[\s\S]*display:\s*flex/)
  assert.match(ribbonCss, /\.contextual-text-ribbon-group\s*\{[\s\S]*border:\s*1px solid/)
  assert.match(ribbonCss, /\.contextual-text-ribbon-group-label\s*\{/)
  assert.match(ribbonCss, /\.contextual-text-ribbon-group-body\s*\{/)
  assert.match(ribbonCss, /\.contextual-text-ribbon-html-panel\s*\{[\s\S]*grid-row:\s*span 2/)
  assert.match(ribbonCss, /\.contextual-text-ribbon-html-panel\s*\{[\s\S]*height:\s*100%/)
  assert.match(ribbonCss, /\.contextual-text-ribbon-source-field textarea\s*\{[\s\S]*white-space:\s*pre/)
  assert.match(ribbonCss, /\.contextual-text-ribbon-source-field textarea\s*\{[\s\S]*font-family:[\s\S]*monospace/)
  assert.match(ribbonCss, /\.contextual-text-ribbon-source-field textarea\s*\{[\s\S]*min-height:\s*44px/)
  assert.doesNotMatch(ribbonCss, /\.contextual-text-ribbon-group--source-expanded/)
  assert.doesNotMatch(ribbonCss, /scroll-snap-type/)
  assert.doesNotMatch(ribbonCss, /scroll-snap-align/)
  assert.doesNotMatch(ribbonCss, /data-ribbon-overflow-state/)
  assert.match(ribbonCss, /\.contextual-text-ribbon-actions\s*\{[\s\S]*grid-column:\s*2/)
  assert.match(ribbonCss, /\.contextual-text-ribbon-actions\s*\{[\s\S]*display:\s*flex/)
  assert.match(ribbonCss, /\.contextual-text-ribbon-actions\s+\.inline-preview-text-delete-button\s*\{[\s\S]*flex:\s*0 0 auto/)
  assert.match(ribbonCss, /\.contextual-text-ribbon-actions\s+\.inline-preview-text-done-button\s*\{[\s\S]*flex:\s*1 1 auto/)
  assert.match(ribbonCss, /\.contextual-text-ribbon-metadata-action\s*\{[\s\S]*width:\s*max-content[\s\S]*white-space:\s*nowrap/)
  assert.doesNotMatch(ribbonCss, /--contextual-text-ribbon-label-column/)
  assert.doesNotMatch(ribbonCss, /\.contextual-text-ribbon-portal-slot/)
  assert.doesNotMatch(ribbonCss, /\.contextual-text-ribbon-controls--inline-menu/)
  assert.doesNotMatch(ribbonCss, /\.inline-preview-text-control-grid/)
  assert.doesNotMatch(ribbonCss, /width:\s*min\(100%,\s*820px\)/)
  assert.doesNotMatch(ribbonCss, /--contextual-text-ribbon-max-width/)
  assert.doesNotMatch(ribbonCss, /280px/)
  assert.doesNotMatch(ribbonCss, /position:\s*fixed/)
  assert.doesNotMatch(
    ribbonCss,
    /\.contextual-text-ribbon-(?:host|shell|tabs|controls|control-row|group)\s*\{[^}]*position:\s*absolute/,
  )
  assert.match(ribbonCss, /\.preview-header\s*\{[\s\S]*grid-row:\s*1/)
  assert.match(ribbonCss, /\.preview-header\s*\{[\s\S]*grid-column:\s*1/)
  assert.match(previewCss, /grid-template-rows:\s*auto minmax\(0,\s*1fr\)/)
  assert.match(previewCss, /--preview-area-padding:\s*clamp/)
  assert.match(previewCss, /--preview-area-top-padding:\s*0px/)
  assert.match(previewCss, /--preview-area-right-padding:\s*0px/)
  assert.match(previewCss, /padding:[\s\S]*var\(--preview-area-top-padding\)[\s\S]*var\(--preview-area-right-padding\)[\s\S]*var\(--preview-area-bottom-padding\)[\s\S]*var\(--preview-area-left-padding\)/)
  assert.match(previewCss, /\.preview-workspace\s*\{[\s\S]*container-type:\s*size/)
  assert.match(previewCss, /\.preview-workspace\s*\{[\s\S]*grid-row:\s*1 \/ -1/)
  assert.match(previewCss, /--preview-viewport-stage-top-inset:[\s\S]*var\(--contextual-text-ribbon-reserved-height,\s*158px\)/)
  assert.match(previewCss, /\.disc-preview\s*\{[\s\S]*100cqh/)
  assert.match(previewCss, /\.case-insert-preview\s*\{[\s\S]*100cqh/)
  assert.match(layoutFixCss, /--preview-chrome-space:\s*calc\(/)
  assert.match(layoutFixCss, /var\(--contextual-text-ribbon-reserved-height,\s*158px\)/)
  assert.match(layoutFixCss, /var\(--preview-area-top-padding,\s*0px\)/)
  assert.match(layoutFixCss, /var\(--preview-area-bottom-padding,\s*0px\)/)
  assert.doesNotMatch(layoutFixCss, /clamp\(136px,\s*16vh,\s*172px\)/)
  assert.match(
    feedbackCss,
    /\.preview-area\.has-contextual-text-ribbon-active \.preview-toast-stack/,
  )
  assert.match(
    feedbackCss,
    /var\(--contextual-text-ribbon-reserved-height\)/,
  )
  assert.match(feedbackCss, /var\(--preview-area-top-padding,\s*0px\)/)
  assert.doesNotMatch(feedbackCss, /\+\s*8px/)
  assert.doesNotMatch(feedbackCss, /280px/)
})
