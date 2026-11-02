import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const baseCss = readFileSync('src/styles/app-base.css', 'utf8')
const caseCss = readFileSync('src/styles/app-case-insert.css', 'utf8')
const editorCss = readFileSync('src/styles/app-editor-controls.css', 'utf8')
const sidebarFeaturesCss = readFileSync(
  'src/styles/app-sidebar-features.css',
  'utf8',
)
const shellSource = readFileSync(
  'src/components/caseInsert/CaseInsertEditorShell.tsx',
  'utf8',
)
const navigationSource = readFileSync(
  'src/components/editor/EditorNavigationShell.tsx',
  'utf8',
)
const rangeSource = readFileSync(
  'src/components/editor/EditorRangeField.tsx',
  'utf8',
)
const rangeModelSource = readFileSync(
  'src/components/editor/editorRangeFieldModel.ts',
  'utf8',
)
const repeatedCardSource = readFileSync(
  'src/components/sidebar/RepeatedVisualElementCard.tsx',
  'utf8',
)
const templateSlotsSource = readFileSync(
  'src/components/caseInsert/CaseInsertTemplateImageSlotControls.tsx',
  'utf8',
)
const spineSlotsSource = readFileSync(
  'src/components/caseInsert/CaseInsertSpineImageSlotControls.tsx',
  'utf8',
)
const framingSource = readFileSync(
  'src/components/caseInsert/CaseInsertArtworkFramingControls.tsx',
  'utf8',
)
const frameSource = readFileSync(
  'src/components/editor/EditorArtworkFrameControls.tsx',
  'utf8',
)

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function declarationBlock(css: string, selector: string) {
  const match = css.match(new RegExp(`${escapeRegExp(selector)}\\s*\\{([^}]*)\\}`))
  assert.ok(match, `Expected CSS rule for ${selector}`)
  return match[1]
}

test('Case sidebar remains the sole vertical overflow owner with a reserved gutter', () => {
  assert.match(baseCss, /\.sidebar\s*\{[\s\S]*?overflow-y:\s*auto;/)
  assert.match(
    shellSource,
    /<aside[\s\S]*className="sidebar case-insert-sidebar"/,
  )

  const sidebarRule = declarationBlock(caseCss, '.case-insert-sidebar')
  assert.match(sidebarRule, /box-sizing:\s*border-box;/)
  assert.match(sidebarRule, /min-width:\s*0;/)
  assert.match(sidebarRule, /max-width:\s*100%;/)
  assert.match(sidebarRule, /scrollbar-gutter:\s*stable;/)
  assert.doesNotMatch(sidebarRule, /overflow(?:-x)?:\s*hidden/)
})

test('one shared Case containment contract bounds each nested panel layer', () => {
  const contractStart = caseCss.indexOf('.case-insert-workflow-section,')
  const contractEnd = caseCss.indexOf(
    '.case-insert-workflow-section .panel-summary,',
    contractStart,
  )
  assert.ok(contractStart >= 0)
  assert.ok(contractEnd > contractStart)
  const contract = caseCss.slice(contractStart, contractEnd)

  for (const selector of [
    '.editor-nested-panel',
    '.editor-nested-panel > .panel-content',
    '.feature-control-body',
    '.repeated-visual-card-content',
    '.background-source-layout-controls',
    '.editor-control-grid',
    '.editor-range-field-control',
    '.additional-artwork-frame-controls',
    '.editor-asset-status-card',
  ]) {
    assert.match(contract, new RegExp(escapeRegExp(selector)))
  }
  assert.match(contract, /box-sizing:\s*border-box;/)
  assert.match(contract, /width:\s*100%;/)
  assert.match(contract, /max-width:\s*100%;/)
  assert.match(contract, /min-width:\s*0;/)
  assert.doesNotMatch(contract, /overflow:\s*hidden|margin-(?:left|right):\s*-/)
})

test('surface tabs share stable available width and retain native tab semantics', () => {
  const tabListRule = declarationBlock(
    sidebarFeaturesCss,
    '.case-insert-surface-tabs',
  )
  const tabRule = declarationBlock(
    sidebarFeaturesCss,
    '.case-insert-surface-tab',
  )

  assert.match(tabListRule, /grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\);/)
  assert.match(tabListRule, /width:\s*100%;/)
  assert.match(tabListRule, /max-width:\s*100%;/)
  assert.match(tabListRule, /min-width:\s*0;/)
  assert.match(tabRule, /min-width:\s*0;/)
  assert.match(tabRule, /box-sizing:\s*border-box;/)
  assert.match(tabRule, /overflow-wrap:\s*anywhere;/)
  assert.match(navigationSource, /role="tablist"/)
  assert.match(navigationSource, /role="tab"/)
  assert.match(navigationSource, /aria-selected=\{surface\.active\}/)
  assert.match(navigationSource, /key=\{surface\.id\}/)
  assert.doesNotMatch(navigationSource, /style=\{|tabIndex=|onKeyDown=/)
})

test('screenshot, Cover/Tray, Spine, logo, and mark controls inherit containment', () => {
  assert.match(repeatedCardSource, /repeated-visual-card editor-nested-panel/)
  assert.match(templateSlotsSource, /<RepeatedVisualElementCard/)
  assert.match(spineSlotsSource, /<RepeatedVisualElementCard/)
  assert.match(templateSlotsSource, /slotKey === 'artworkSlots'/)
  assert.match(spineSlotsSource, /slotKey="artworkSlots"/)
  assert.match(framingSource, /case-insert-artwork-framing-controls/)
  assert.match(templateSlotsSource, /<EditorArtworkFrameControls/)
  assert.match(spineSlotsSource, /<EditorArtworkFrameControls/)
  assert.match(frameSource, /className="additional-artwork-frame-controls"/)
  assert.match(shellSource, /CaseInsertTemplateCompanyLogoControls/)
  assert.match(shellSource, /CaseInsertSpineCompanyLogoControls/)
  assert.match(shellSource, /CaseInsertTemplateGameInfoLogoControls/)
  assert.match(shellSource, /CaseInsertSpineGameInfoLogoControls/)
})

test('range rows use a stable label, flexible track, and fixed value field', () => {
  const rowRule = declarationBlock(editorCss, '.editor-range-field-control')
  const trackRule = declarationBlock(
    editorCss,
    '.editor-range-field-control > input[type="range"]',
  )
  const numberRule = declarationBlock(
    editorCss,
    '.editor-range-number-control > .editor-range-number-input',
  )

  assert.match(rowRule, /grid-template-columns:\s*minmax\(0, 1fr\) max-content;/)
  assert.match(rowRule, /width:\s*100%;/)
  assert.match(rowRule, /min-width:\s*0;/)
  assert.match(trackRule, /width:\s*100%;/)
  assert.match(trackRule, /min-width:\s*0;/)
  assert.match(numberRule, /box-sizing:\s*border-box;/)
  assert.match(numberRule, /width:\s*calc\(/)
  assert.match(numberRule, /min-width:\s*calc\(/)
  assert.match(numberRule, /max-width:\s*calc\(/)
  assert.match(numberRule, /editor-range-number-input-character-capacity/)
})

test('current X, Y, Scale, focal, and Zoom values cannot alter width styles', () => {
  assert.match(
    rangeSource,
    /getEditorRangeFieldNumberInputCharacterCapacity\(\{\s*max,\s*min,\s*step,\s*\}\),\s*\[max, min, step\],/,
  )
  const capacityModel = rangeModelSource.slice(
    rangeModelSource.indexOf(
      'export function getEditorRangeFieldNumberInputCharacterCapacity',
    ),
    rangeModelSource.indexOf(
      'export function normalizeEditorRangeFieldValue',
    ),
  )
  assert.doesNotMatch(
    capacityModel,
    /\bvalue\b/,
  )
  assert.doesNotMatch(
    rangeSource,
    /offsetWidth|scrollWidth|getBoundingClientRect|ResizeObserver|setTimeout/,
  )
  assert.match(framingSource, /model\.showFocalPosition/)
  assert.match(framingSource, /model\.showZoom/)
  assert.doesNotMatch(framingSource, /style=\{|className=\{.*model\.(?:zoom|focal)/)
})

test('validation wraps and Crop reveals rows without broad clipping', () => {
  const errorRule = declarationBlock(
    sidebarFeaturesCss,
    '.case-insert-artwork-framing-error',
  )
  assert.match(errorRule, /max-width:\s*100%;/)
  assert.match(errorRule, /overflow-wrap:\s*anywhere;/)
  assert.match(framingSource, /model\.showFocalPosition \? \(/)
  assert.match(framingSource, /model\.showZoom \? \(/)
  assert.doesNotMatch(errorRule, /overflow:\s*hidden/)
})

test('dependent controls remain conditionally absent and component identity is stable', () => {
  assert.match(repeatedCardSource, /\{enabled \? \(/)
  assert.match(templateSlotsSource, /key=\{slot\.id\}/)
  assert.match(spineSlotsSource, /key=\{slot\.id\}/)
  assert.doesNotMatch(
    repeatedCardSource,
    /offsetWidth|scrollWidth|getBoundingClientRect|ResizeObserver|setTimeout/,
  )
})
