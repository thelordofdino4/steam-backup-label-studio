import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import {
  getDiscGuidedLayoutIdForRolePreset,
} from '../guidedPresets/discGuidedLayouts.ts'
import {
  CLASSIC_TOP_TITLE_DISC_PRESET_ID,
  CLASSIC_TOP_TITLE_DISC_PRESET,
} from '../presets/builtins/classicTopTitleDiscPreset.ts'
import {
  getNextActiveDiscPresetRef,
  getNextActiveDiscPresetState,
  getNextActiveDiscPresetStateForTargetedApplication,
} from './useActiveDiscPreset.ts'
import {
  createDiscPresetTemplateResolutionInput,
  resolveDiscPresetDefinition,
} from '../presets/discPresetResolution.ts'
import { discTemplates } from '../templates/discTemplates.ts'

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

test('failed or rejected application preserves the current active preset', () => {
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

test('App clears transient activation on resets, workspace exit, and successful restore', () => {
  const source = readFileSync(new URL('../app/App.tsx', import.meta.url), 'utf8')

  assert.match(source, /function resetDiscProjectState\(\)[\s\S]*?clearActivePreset\(\)/)
  assert.match(source, /function resetCaseInsertProjectState\(\)[\s\S]*?clearActivePreset\(\)/)
  assert.match(
    source,
    /function handleReturnToHome\(\)[\s\S]*?clearActivePreset\(\)[\s\S]*?setActiveWorkspace\('home'\)/,
  )
  assert.match(
    source,
    /const setLoadedActiveWorkspace[\s\S]*?clearActivePreset\(\)[\s\S]*?setActiveWorkspace\(workspace\)/,
  )
  assert.equal(
    (source.match(/setActiveWorkspace: setLoadedActiveWorkspace/g) ?? []).length,
    2,
  )
})

test('one transient canonical ref drives guidance and late placement without persistence', () => {
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
    /presetState:\s*activeDiscPreset\.getActivePresetState\(\)/,
  )
  assert.match(previewHookSource, /resolvedPreset:\s*activePresetState/)
  assert.doesNotMatch(previewHookSource, /useState|recordPresetApplication/)
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
