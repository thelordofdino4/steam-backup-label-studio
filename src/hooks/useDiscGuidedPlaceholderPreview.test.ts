import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import {
  getDiscGuidedLayoutIdForRolePreset,
} from '../guidedPresets/discGuidedLayouts.ts'
import {
  CLASSIC_TOP_TITLE_DISC_PRESET_ID,
} from '../presets/builtins/classicTopTitleDiscPreset.ts'
import {
  getNextActiveDiscPresetRef,
} from './useActiveDiscPreset.ts'

const CLASSIC_LAYOUT_ID = 'disc:guided-layout:classic-top-title'
const CLASSIC_PRESET_REF = Object.freeze({
  id: CLASSIC_TOP_TITLE_DISC_PRESET_ID,
  revision: 1,
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
    /recordPresetApplication\(\s*result\.activePresetRef,\s*true/,
  )
  assert.match(
    appSource,
    /presetRef:\s*activeDiscPreset\.getActivePresetRef\(\)/,
  )
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
