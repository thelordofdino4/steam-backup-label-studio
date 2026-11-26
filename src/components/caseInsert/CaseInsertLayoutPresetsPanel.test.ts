import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const panelSource = await readFile(
  new URL('./CaseInsertLayoutPresetsPanel.tsx', import.meta.url),
  'utf8',
)
const shellSource = await readFile(
  new URL('./CaseInsertEditorShell.tsx', import.meta.url),
  'utf8',
)
const controllerSource = await readFile(
  new URL('../../app/caseInsertPresetPresentationController.ts', import.meta.url),
  'utf8',
)

test('one independent EditorPanel registers the exact Case workflow destination', () => {
  assert.equal((panelSource.match(/<EditorPanel/g) ?? []).length, 1)
  assert.match(panelSource, /title="Case Layout Presets"/)
  assert.match(panelSource, /workflowId: 'workflow\.case-layout-presets'/)
  assert.match(panelSource, /ownerId: 'owner\.case-layout-presets'/)
  assert.match(panelSource, /controlId: 'control\.case-layout-presets\.selector'/)
  assert.match(
    shellSource,
    /<WorkflowPresentationOutlet[\s\S]*workflowId="workflow\.case-layout-presets"[\s\S]*<CaseInsertLayoutPresetsPanel/,
  )
  assert.equal(
    (shellSource.match(/workflowId="workflow\.case-layout-presets"/g) ?? [])
      .length,
    1,
  )
})

test('native controls expose neutral selection, complete review, decisions, and focus refs', () => {
  assert.match(panelSource, /<option value="">Choose a preset<\/option>/)
  assert.match(panelSource, />\s*Review complete preset\s*</)
  assert.match(panelSource, />\s*Review Reapply\s*</)
  assert.match(panelSource, />\s*Review Detach\s*</)
  assert.match(panelSource, /<fieldset/)
  assert.match(panelSource, /Warnings to acknowledge/)
  assert.match(panelSource, /Required material-change consent/)
  assert.match(panelSource, /role="alert"/)
  assert.match(panelSource, /role="status"/)
  assert.match(panelSource, /reviewHeadingRef/)
  assert.match(panelSource, /errorRef/)
  assert.match(panelSource, /statusRef/)
  assert.doesNotMatch(
    panelSource,
    /querySelector|setTimeout|setInterval|MutationObserver|\.click\(/,
  )
})

test('presentation delegates all planning, transitions, and dispatch to one controller and workflow owner', () => {
  assert.doesNotMatch(
    panelSource,
    /planCaseInsertPreset|applyCaseInsertPreset|transitionCaseInsertPreset|resolveCaseInsertPresetAssignments|\.dispatch\(/,
  )
  assert.match(controllerSource, /workflow\.beginApply/)
  assert.match(controllerSource, /workflow\.beginReapply/)
  assert.match(controllerSource, /workflow\.beginDetach/)
  assert.match(controllerSource, /workflow\.complete/)
  assert.match(controllerSource, /requestedScope: Object\.freeze\(\{ kind: 'complete' \}\)/)
  assert.doesNotMatch(controllerSource, /catalog\.getLatest/)
  assert.doesNotMatch(controllerSource, /localStorage|sessionStorage|project\.caseInsert\s*=/)
})

test('Apply and typed Reapply review render immutable creation, physical viewport, fitting, clipping, and preservation evidence', () => {
  assert.match(panelSource, /review\.plan\.objectCreationActions/)
  assert.match(panelSource, /action\.review\.actionLabel/)
  assert.match(panelSource, /action\.review\.initialStateLabel/)
  assert.match(panelSource, /action\.review\.insertionLabel/)
  assert.match(panelSource, /action\.review\.preservationLabel/)
  assert.match(panelSource, /review\.plan\.artworkViewportActions/)
  assert.match(panelSource, /action\.evidence\.plan\.viewport/)
  assert.match(panelSource, /physicalWidthMm/)
  assert.match(panelSource, /physicalHeightMm/)
  assert.match(panelSource, /physicalAspectRatio/)
  assert.match(panelSource, /action\.review\.fittingLabel/)
  assert.match(panelSource, /action\.review\.sourceStateLabel/)
  assert.match(panelSource, /clippedSourceFractions/)
  assert.match(panelSource, /material-visible-clipping/)
  assert.match(panelSource, /artwork-cover-fitting-deferred/)
  assert.match(panelSource, /review\.plan\.formatVersion === 3/)
  assert.match(panelSource, /Reviewed empty slot recreation/)
  assert.doesNotMatch(
    panelSource,
    /createCaseInsertPresetEmptyArtworkSlot|adoptCaseInsertArtworkViewport|planCaseInsertPresetArtworkViewport|getTemplateRect/,
  )
})
