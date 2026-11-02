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

test('one independent EditorPanel retains the exact Case workflow destination', () => {
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

test('native presentation has one neutral selector and one primary Apply action', () => {
  assert.match(panelSource, /<option value="">Choose a preset<\/option>/)
  assert.match(
    panelSource,
    /Applies the preset’s layout without replacing your content\./,
  )
  assert.equal((panelSource.match(/<button/g) ?? []).length, 1)
  assert.match(panelSource, /'Apply preset'/)
  assert.match(panelSource, /'Applying…'/)
  assert.match(
    panelSource,
    /disabled=\{snapshot\.selectedOptionValue === '' \|\| snapshot\.pending\}/,
  )
  assert.match(panelSource, /controller\.applySelectedPreset\(\)/)
  assert.doesNotMatch(panelSource, /secondary-button/)
})

test('presentation exposes compact pending, result, and exact focus targets', () => {
  assert.match(panelSource, /role="status"/)
  assert.match(panelSource, /role="alert"/)
  assert.match(panelSource, /aria-describedby=\{describedBy\}/)
  assert.match(panelSource, /aria-invalid=/)
  assert.match(panelSource, /aria-busy=/)
  assert.match(panelSource, /selectorRef/)
  assert.match(panelSource, /errorRef/)
  assert.match(panelSource, /statusRef/)
  assert.match(panelSource, /target === 'selector'/)
  assert.match(panelSource, /target === 'error-summary'/)
  assert.doesNotMatch(panelSource, /reviewHeadingRef/)
  assert.doesNotMatch(panelSource, /snapshot\.inspection\.code|<code>/)
  assert.doesNotMatch(
    panelSource,
    /querySelector|setTimeout|setInterval|MutationObserver|\.click\(/,
  )
})

test('one-shot presentation contains no review checklist or attachment management', () => {
  assert.doesNotMatch(
    panelSource,
    /Review complete preset|Review Reapply|Review Detach|Cancel review|Confirm Apply/,
  )
  assert.doesNotMatch(
    panelSource,
    /Warnings to acknowledge|Required material-change consent|<fieldset/,
  )
  assert.doesNotMatch(
    panelSource,
    /Preserve current customization|Overwrite with saved preset revision/,
  )
  assert.doesNotMatch(
    panelSource,
    /AttachmentStatus|No Case layout preset is attached|<strong>Attached<\/strong>|<strong>Detached<\/strong>/,
  )
  assert.doesNotMatch(
    controllerSource,
    /beginApplyReview|beginReapplyReview|beginDetachReview|confirmReview|cancelReview|setWarningAcknowledged|setMaterialConsentAccepted|setReapplyPolicy/,
  )
  assert.match(controllerSource, /workflow\.applySelected/)
  assert.doesNotMatch(
    `${panelSource}\n${controllerSource}`,
    /planCaseInsertPreset|applyCaseInsertPreset|transitionCaseInsertPreset|resolveCaseInsertPresetAssignments|\.dispatch\(/,
  )
})
