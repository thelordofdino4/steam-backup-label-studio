import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const actionsSource = readFileSync(
  new URL('./DiscGuidedPlaceholderActions.tsx', import.meta.url),
  'utf8',
)
const previewSource = readFileSync(new URL('./DiscPreview.tsx', import.meta.url), 'utf8')
const cssSource = readFileSync(
  new URL('../../styles/app-guided-placeholders.css', import.meta.url),
  'utf8',
)
const previewCssSource = readFileSync(
  new URL('../../styles/app-preview-shell.css', import.meta.url),
  'utf8',
)

test('one native action button is rendered for every projected placeholder', () => {
  assert.match(
    actionsSource,
    /createDiscGuidedPlaceholderActionViewModels\(placeholders\)/,
  )
  assert.match(actionsSource, /\{actions\.map\(\(actionViewModel\) =>/)
  assert.match(actionsSource, /<button[\s\S]*?type="button"/)
  assert.match(actionsSource, /aria-label=\{actionViewModel\.label\}/)
  assert.match(actionsSource, /data-guided-slot-id=\{actionViewModel\.slotId\}/)
  assert.match(actionsSource, /draggable=\{false\}/)
  assert.doesNotMatch(actionsSource, /tabIndex=\{-1\}/)
})

test('action regions use normalized action geometry rather than visual geometry', () => {
  assert.match(
    actionsSource,
    /style=\{getActionRegionStyle\(actionViewModel\.actionGeometry\)\}/,
  )
  assert.match(actionsSource, /left: `\$\{geometry\.centerXPercent - geometry\.widthPercent \/ 2\}%`/)
  assert.match(actionsSource, /top: `\$\{geometry\.centerYPercent - geometry\.heightPercent \/ 2\}%`/)
  assert.equal(actionsSource.includes('visualGeometry'), false)
})

test('native buttons provide click, Enter, and Space activation without synthetic key handling', () => {
  assert.match(actionsSource, /onClick=\{\(\) => activatePlaceholder\(actionViewModel\)\}/)
  assert.doesNotMatch(actionsSource, /event\.key === 'Enter'|event\.key === ' '|\.click\(\)/)
  assert.doesNotMatch(actionsSource, /onPointer|onMouseDown|onDrag|onResize/)
})

test('choice popover uses native actions, Escape dismissal, and focus return', () => {
  assert.match(actionsSource, /role="dialog"/)
  assert.match(actionsSource, /openChoiceSetup\.actions\.map/)
  assert.match(actionsSource, /event\.key !== 'Escape'/)
  assert.match(actionsSource, /closeChoiceAndReturnFocus\(\)/)
  assert.match(actionsSource, /origin\?\.focus\(\{ preventScroll: true \}\)/)
  assert.match(actionsSource, /firstChoiceRef\.current\?\.focus/)
  assert.match(actionsSource, /onClick=\{\(\) => dispatchSetupAction\(action\)\}/)
})

test('typed setup dispatch closes first and sends exactly one request', () => {
  assert.match(
    actionsSource,
    /function dispatchSetupAction\(action:[\s\S]*?setOpenAction\(null\)[\s\S]*?requestRoleFocus\(action\.request\)/,
  )
  assert.equal(
    (actionsSource.match(/requestRoleFocus\(action\.request\)/g) ?? []).length,
    1,
  )
})

test('suggested actions remain labeled and do not accept automatically', () => {
  assert.match(actionsSource, /data-guided-lifecycle=\{actionViewModel\.lifecycle\}/)
  assert.match(actionsSource, /actionViewModel\.lifecycle === 'suggested'/)
  assert.match(actionsSource, /Suggested\. Opens setup without accepting automatically\./)
  assert.doesNotMatch(actionsSource, /acceptSuggestion|autoAccept|bindSuggestion/)
})

test('popover is invalidated when its exact projected action disappears', () => {
  assert.match(
    actionsSource,
    /openAction && actions\.includes\(openAction\)/,
  )
  assert.match(actionsSource, /useMemo\([\s\S]*?\[placeholders\]/)
  assert.doesNotMatch(actionsSource, /setOpenAction\([^)]*\)[\s\S]*?useLayoutEffect/)
})

test('actions, selection overlay, and popover retain the intended layer order', () => {
  const visualIndex = previewSource.indexOf('<DiscGuidedPlaceholderOverlay')
  const actionsIndex = previewSource.indexOf('<DiscGuidedPlaceholderActions')
  const selectionIndex = previewSource.indexOf('<PreviewElementOverlay')

  assert.ok(visualIndex >= 0 && visualIndex < actionsIndex)
  assert.ok(actionsIndex < selectionIndex)
  assert.match(
    cssSource,
    /\.disc-guided-placeholder-action-layer\s*\{[\s\S]*z-index:\s*9/,
  )
  assert.match(
    previewCssSource,
    /\.preview-element-overlay-layer\s*\{[\s\S]*z-index:\s*24/,
  )
  assert.match(
    cssSource,
    /\.disc-guided-placeholder-setup-popover\s*\{[\s\S]*z-index:\s*30/,
  )
})

test('buttons expose visible focus while visual SVGs remain pointer-inert', () => {
  assert.match(
    cssSource,
    /\.disc-guided-placeholder-action:focus-visible\s*\{[\s\S]*outline:/,
  )
  assert.match(
    cssSource,
    /\.disc-guided-placeholder-action-layer\s*\{[\s\S]*pointer-events:\s*none/,
  )
  assert.match(
    cssSource,
    /\.disc-guided-placeholder-action\s*\{[\s\S]*pointer-events:\s*auto/,
  )
  assert.match(
    cssSource,
    /\.disc-guided-placeholder-overlay\s*\{[\s\S]*pointer-events:\s*none/,
  )
})

test('guided actions remain isolated from mutation, selection, persistence, renderers, export, and Case Insert', () => {
  for (const forbidden of [
    'querySelector',
    'setTimeout',
    'setInterval',
    'PreviewEditable',
    'setSelected',
    'ContextualTextRibbon',
    'onEnabledChange',
    'setProject',
    'undo',
    'dirty',
    'projectSchema',
    'snapshot',
    'restoreProject',
    '../../render',
    '../../export',
    'caseInsert',
    '../../steam',
    'network',
  ]) {
    assert.equal(actionsSource.includes(forbidden), false, `unexpected source: ${forbidden}`)
  }
})
