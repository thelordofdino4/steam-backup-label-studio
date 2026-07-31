import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import {
  getDiscGuidedLayoutIdForRolePreset,
} from '../guidedPresets/discGuidedLayouts.ts'
import {
  INITIAL_DISC_GUIDED_WORKFLOW_STATE,
  completeDiscGuidedSlot,
  omitDiscGuidedSlot,
} from '../guidedPresets/discGuidedWorkflow.ts'
import {
  CLASSIC_TOP_TITLE_DISC_PRESET_ID,
  CLASSIC_TOP_TITLE_DISC_PRESET,
} from '../presets/builtins/classicTopTitleDiscPreset.ts'
import {
  createDiscPresetTemplateResolutionInput,
  resolveDiscPresetDefinition,
} from '../presets/discPresetResolution.ts'
import { discTemplates } from '../templates/discTemplates.ts'
import {
  getNextActiveDiscPresetRef,
  getNextActiveDiscPresetState,
  getNextActiveDiscPresetStateForTargetedApplication,
} from './useActiveDiscPreset.ts'
import {
  getNextDiscGuidedWorkflowForPresetApplication,
} from './useDiscGuidedPlaceholderPreview.ts'

const CLASSIC_LAYOUT_ID = 'disc:guided-layout:classic-top-title'
const CLASSIC_PRESET_REF = Object.freeze({
  id: CLASSIC_TOP_TITLE_DISC_PRESET_ID,
  revision: 1,
})
const CLASSIC_RESOLUTION = resolveDiscPresetDefinition({
  definition: CLASSIC_TOP_TITLE_DISC_PRESET,
  template: createDiscPresetTemplateResolutionInput(
    discTemplates.standardPrintableDisc,
  ),
})
assert.notEqual(CLASSIC_RESOLUTION.status, 'rejected')
const CLASSIC_RESOLVED_PRESET = CLASSIC_RESOLUTION.preset!
const CLASSIC_PRESET_STATE = Object.freeze({
  ref: CLASSIC_PRESET_REF,
  resolvedDefinition: CLASSIC_RESOLVED_PRESET,
})

test('successful Classic application activates its versioned guided workflow', () => {
  for (const presetId of ['classic-top-title', CLASSIC_TOP_TITLE_DISC_PRESET_ID]) {
    const next = getNextDiscGuidedWorkflowForPresetApplication({
      currentWorkflow: INITIAL_DISC_GUIDED_WORKFLOW_STATE,
      presetId,
      applied: true,
    })
    assert.deepEqual(next.activeLayout, { id: CLASSIC_LAYOUT_ID, version: 1 })
    assert.deepEqual(next.omittedSlotIds, [])
    assert.deepEqual(next.completedSlotIds, [])
  }
})

test('reapplication preserves omissions while an unmapped preset clears guidance', () => {
  const active = getNextDiscGuidedWorkflowForPresetApplication({
    currentWorkflow: INITIAL_DISC_GUIDED_WORKFLOW_STATE,
    presetId: CLASSIC_TOP_TITLE_DISC_PRESET_ID,
    applied: true,
  })
  const completed = completeDiscGuidedSlot(
    active,
    'disc:guided:game-title:primary',
  ).state
  const omitted = omitDiscGuidedSlot(
    completed,
    'disc:guided:publisher-logo:primary',
  ).state
  const reapplied = getNextDiscGuidedWorkflowForPresetApplication({
    currentWorkflow: omitted,
    presetId: 'classic-top-title',
    applied: true,
  })
  assert.deepEqual(reapplied.omittedSlotIds, [
    'disc:guided:publisher-logo:primary',
  ])
  assert.deepEqual(reapplied.completedSlotIds, [
    'disc:guided:game-title:primary',
  ])

  assert.deepEqual(getNextDiscGuidedWorkflowForPresetApplication({
    currentWorkflow: reapplied,
    presetId: 'centered-logo-archive',
    applied: true,
  }), INITIAL_DISC_GUIDED_WORKFLOW_STATE)
})

test('successful Classic application records the canonical ref used by guidance', () => {
  const activePresetRef = getNextActiveDiscPresetRef({
    currentPresetRef: null,
    appliedPresetRef: CLASSIC_PRESET_REF,
    applied: true,
  })

  assert.deepEqual(activePresetRef, CLASSIC_PRESET_REF)
  assert.equal(
    getDiscGuidedLayoutIdForRolePreset(activePresetRef!.id),
    CLASSIC_LAYOUT_ID,
  )
})

test('successful Classic application retains its transient resolved definition', () => {
  const activePresetState = getNextActiveDiscPresetState({
    currentPresetState: null,
    appliedPresetState: CLASSIC_PRESET_STATE,
    applied: true,
  })

  assert.equal(activePresetState, CLASSIC_PRESET_STATE)
  assert.equal(
    activePresetState?.resolvedDefinition.sourcePresetId,
    CLASSIC_PRESET_REF.id,
  )
})

test('targeted resolution replaces only a matching active resolved definition', () => {
  const nextResolvedDefinition = Object.freeze({
    ...CLASSIC_RESOLVED_PRESET,
    slots: Object.freeze([...CLASSIC_RESOLVED_PRESET.slots]),
  })
  const nextState = getNextActiveDiscPresetStateForTargetedApplication({
    currentPresetState: CLASSIC_PRESET_STATE,
    application: {
      status: 'applied',
      presetRef: CLASSIC_PRESET_REF,
      resolvedPreset: nextResolvedDefinition,
      slotId: 'disc:guided:legal-text:copyright',
      target: 'legal.copyright',
      updates: [],
      warnings: [],
    },
  })

  assert.equal(nextState?.ref, CLASSIC_PRESET_REF)
  assert.equal(nextState?.resolvedDefinition, nextResolvedDefinition)
})

test('successful legacy preset replaces the active canonical ref with null', () => {
  assert.equal(getNextActiveDiscPresetRef({
    currentPresetRef: CLASSIC_PRESET_REF,
    appliedPresetRef: null,
    applied: true,
  }), null)
})

test('failed or rejected application preserves guided and generic activation', () => {
  assert.equal(getNextDiscGuidedWorkflowForPresetApplication({
    currentWorkflow: INITIAL_DISC_GUIDED_WORKFLOW_STATE,
    presetId: 'classic-top-title',
    applied: false,
  }), INITIAL_DISC_GUIDED_WORKFLOW_STATE)

  const activeWorkflow = getNextDiscGuidedWorkflowForPresetApplication({
    currentWorkflow: INITIAL_DISC_GUIDED_WORKFLOW_STATE,
    presetId: 'classic-top-title',
    applied: true,
  })
  assert.equal(getNextDiscGuidedWorkflowForPresetApplication({
    currentWorkflow: activeWorkflow,
    presetId: 'missing-preset',
    applied: false,
  }), activeWorkflow)

  assert.equal(getNextActiveDiscPresetRef({
    currentPresetRef: null,
    appliedPresetRef: CLASSIC_PRESET_REF,
    applied: false,
  }), null)
  assert.deepEqual(getNextActiveDiscPresetRef({
    currentPresetRef: CLASSIC_PRESET_REF,
    appliedPresetRef: null,
    applied: false,
  }), CLASSIC_PRESET_REF)
})

test('App clears transient activation on project resets and restores staged Disc activation atomically', () => {
  const source = readFileSync(new URL('../app/App.tsx', import.meta.url), 'utf8')
  const stagingSource = readFileSync(
    new URL('../app/appProjectLoad.ts', import.meta.url),
    'utf8',
  )
  const aggregateSource = readFileSync(
    new URL('../app/appProjectRestore.ts', import.meta.url),
    'utf8',
  )

  assert.match(source, /function resetDiscProjectState\([^)]*\)[\s\S]*?clearActivePreset\(\)/)
  assert.match(source, /function resetCaseInsertProjectState\([^)]*\)[\s\S]*?clearActivePreset\(\)/)
  assert.match(
    source,
    /async function handleReturnToHome\(\)\s*{\s*await dispatchApplicationCommand\('workspace\.return-home'\)\s*}/,
  )
  assert.doesNotMatch(
    source,
    /async function handleReturnToHome\(\)\s*{[^}]*?(?:clearActivePreset|setActiveWorkspace)/,
  )
  assert.match(
    source,
    /restoreActiveDiscPresetState:\s*activeDiscPreset\.restoreActivePresetState/,
  )
  assert.match(
    stagingSource,
    /activeDiscPresetState = reconstructActiveDiscPresetState\(/,
  )
  assert.match(
    aggregateSource,
    /restoreActiveDiscPresetState\([\s\S]*?candidate\.activeDiscPresetState[\s\S]*?setActiveWorkspace\('disc'\)/,
  )
  assert.doesNotMatch(stagingSource, /setActiveWorkspace|setHomeStatusMessage/)
})

test('focused hooks compose persisted workflow with transient resolved geometry', () => {
  const activeHookSource = readFileSync(
    new URL('./useActiveDiscPreset.ts', import.meta.url),
    'utf8',
  )
  const previewHookSource = readFileSync(
    new URL('./useDiscGuidedPlaceholderPreview.ts', import.meta.url),
    'utf8',
  )
  const appSource = readFileSync(new URL('../app/App.tsx', import.meta.url), 'utf8')

  assert.match(
    appSource,
    /recordPresetApplication\(\s*result\.activePresetRef,\s*result\.activeResolvedPreset,\s*true/,
  )
  assert.match(
    appSource,
    /discGuidedPlaceholderPreview\.recordPresetApplication\(/,
  )
  assert.match(
    appSource,
    /presetState:\s*activeDiscPreset\.getActivePresetState\(\)/,
  )
  assert.match(previewHookSource, /resolvedPreset:\s*activePresetState/)
  assert.match(previewHookSource, /omitDiscGuidedSlot\(currentWorkflow, slotId\)\.state/)
  assert.match(previewHookSource, /restoreDiscGuidedSlot\(currentWorkflow, slotId\)\.state/)
  assert.match(previewHookSource, /restoreCompletedDiscGuidedSlot\(currentWorkflow, slotId\)\.state/)
  assert.match(previewHookSource, /resetDiscGuidedProgress\(currentWorkflow\)\.state/)
  assert.match(previewHookSource, /createDiscGuidedProgressItems\(workflow\)/)
  assert.doesNotMatch(appSource, /omitDiscGuidedSlot|restoreDiscGuidedSlot/)
  assert.doesNotMatch(previewHookSource, /useState|coordinate|offset|layout\.x|layout\.y/i)
  assert.doesNotMatch(activeHookSource, /coordinate|offset|layout\.x|layout\.y/i)

  for (const forbidden of [
    'projectSchema',
    'savedProject',
    'snapshot',
    'restoreProject',
    'localStorage',
    'sessionStorage',
  ]) {
    assert.equal(
      activeHookSource.includes(forbidden),
      false,
      `unexpected source: ${forbidden}`,
    )
  }
})

test('App owns one workflow value without implementing lifecycle transitions', () => {
  const source = readFileSync(new URL('../app/App.tsx', import.meta.url), 'utf8')

  assert.match(source, /workflow: discGuidedWorkflow/)
  assert.match(source, /updateWorkflow: setDiscGuidedWorkflow/)
  assert.match(source, /activePresetState: activeDiscPreset\.activePresetState/)
  assert.match(source, /onOmitGuidedSlot: discGuidedPlaceholderPreview\.omitSlot/)
  assert.match(source, /guidedProgress=\{discGuidedPlaceholderPreview\.progressItems\}/)
  assert.match(source, /onIncludeGuidedSlot=\{discGuidedPlaceholderPreview\.includeSlot\}/)
  assert.match(source, /onShowGuidedSlotAgain=\{discGuidedPlaceholderPreview\.showSlotAgain\}/)
  assert.match(source, /onResetGuidedProgress=\{discGuidedPlaceholderPreview\.resetProgress\}/)
  assert.doesNotMatch(source, /omitDiscGuidedSlot|restoreDiscGuidedSlot/)
  assert.doesNotMatch(source, /clearActiveLayout/)
})
