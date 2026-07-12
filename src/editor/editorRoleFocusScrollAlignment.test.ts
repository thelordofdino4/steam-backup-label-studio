import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const controllerSource = readFileSync(
  new URL('./editorRoleFocusController.ts', import.meta.url),
  'utf8',
)
const rolePanelSource = readFileSync(
  new URL('../components/editor/DiscEditorNavigationRolePanel.tsx', import.meta.url),
  'utf8',
)
const baseCss = readFileSync(
  new URL('../styles/app-base.css', import.meta.url),
  'utf8',
)
const panelCss = readFileSync(
  new URL('../styles/app-panels.css', import.meta.url),
  'utf8',
)
const layoutFixCss = readFileSync(
  new URL('../styles/layoutFix.css', import.meta.url),
  'utf8',
)

test('sidebar padding and role scroll margin share a named inset contract', () => {
  assert.match(baseCss, /--editor-sidebar-content-inset:\s*24px/)
  assert.match(
    baseCss,
    /--editor-role-scroll-inset:\s*var\(--editor-sidebar-content-inset\)/,
  )
  assert.match(
    baseCss,
    /\.sidebar\s*\{[\s\S]*padding:\s*var\(--editor-sidebar-content-inset\)/,
  )
  assert.match(
    panelCss,
    /\.sidebar > \.collapsible-panel > \.panel-summary\s*\{[\s\S]*scroll-margin-block-start:\s*var\(--editor-role-scroll-inset\)/,
  )
})

test('desktop sidebar and narrow document retain their existing scroll ownership', () => {
  assert.match(
    layoutFixCss,
    /@media \(min-width: 621px\)[\s\S]*?\.sidebar\s*\{[\s\S]*?overflow-y:\s*auto !important/,
  )
  assert.match(
    layoutFixCss,
    /@media \(max-width: 620px\)[\s\S]*?body\s*\{[\s\S]*?overflow:\s*auto !important/,
  )
  assert.match(
    layoutFixCss,
    /@media \(max-width: 620px\)[\s\S]*?\.sidebar\s*\{[\s\S]*?overflow:\s*visible !important/,
  )
})

test('alignment uses registered role refs and element scrolling without container arithmetic', () => {
  assert.match(rolePanelSource, /detailsElement:\s*\(\) => detailsRef\.current/)
  assert.match(rolePanelSource, /summaryElement:\s*\(\) => summaryRef\.current/)
  assert.match(controllerSource, /element\.scrollIntoView\(\{ block, behavior: 'auto' \}\)/)
  assert.doesNotMatch(controllerSource, /24px|scrollTop|scrollTo\(|clientTop|offsetTop/)
})

test('alignment source has no selectors, retries, synthetic clicks, or app-domain coupling', () => {
  for (const forbidden of [
    'document.querySelector',
    'querySelectorAll',
    'getElementById',
    '.closest(',
    '.click(',
    'setTimeout',
    'setInterval',
    'MutationObserver',
    'requestAnimationFrame',
    'projectSchema',
    'createProjectSnapshot',
    'restoreProject',
    'render/',
    'export/',
    'caseInsert',
  ]) {
    assert.equal(controllerSource.includes(forbidden), false, forbidden)
  }
})
