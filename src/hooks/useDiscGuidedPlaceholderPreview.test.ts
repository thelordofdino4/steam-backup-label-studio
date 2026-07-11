import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import {
  getNextActiveDiscGuidedLayoutId,
} from './useDiscGuidedPlaceholderPreview.ts'

const CLASSIC_LAYOUT_ID = 'disc:guided-layout:classic-top-title'

test('successful Classic Top Title application activates its guided layout', () => {
  assert.equal(getNextActiveDiscGuidedLayoutId({
    currentLayoutId: null,
    presetId: 'classic-top-title',
    applied: true,
  }), CLASSIC_LAYOUT_ID)
})

test('successful unmapped preset clears the guided layout', () => {
  assert.equal(getNextActiveDiscGuidedLayoutId({
    currentLayoutId: CLASSIC_LAYOUT_ID,
    presetId: 'centered-logo-archive',
    applied: true,
  }), null)
})

test('failed or rejected application does not activate or clear guidance', () => {
  assert.equal(getNextActiveDiscGuidedLayoutId({
    currentLayoutId: null,
    presetId: 'classic-top-title',
    applied: false,
  }), null)
  assert.equal(getNextActiveDiscGuidedLayoutId({
    currentLayoutId: CLASSIC_LAYOUT_ID,
    presetId: 'missing-preset',
    applied: false,
  }), CLASSIC_LAYOUT_ID)
})

test('App clears transient activation on resets, workspace exit, and successful restore', () => {
  const source = readFileSync(new URL('../app/App.tsx', import.meta.url), 'utf8')

  assert.match(source, /function resetDiscProjectState\(\)[\s\S]*?clearActiveLayout\(\)/)
  assert.match(source, /function resetCaseInsertProjectState\(\)[\s\S]*?clearActiveLayout\(\)/)
  assert.match(
    source,
    /function handleReturnToHome\(\)[\s\S]*?clearActiveLayout\(\)[\s\S]*?setActiveWorkspace\('home'\)/,
  )
  assert.match(
    source,
    /const setLoadedActiveWorkspace[\s\S]*?clearActiveLayout\(\)[\s\S]*?setActiveWorkspace\(workspace\)/,
  )
  assert.equal(
    (source.match(/setActiveWorkspace: setLoadedActiveWorkspace/g) ?? []).length,
    2,
  )
})

test('activation is preset-result driven and produces no persistence identity', () => {
  const hookSource = readFileSync(
    new URL('./useDiscGuidedPlaceholderPreview.ts', import.meta.url),
    'utf8',
  )
  const appSource = readFileSync(new URL('../app/App.tsx', import.meta.url), 'utf8')

  assert.match(appSource, /recordPresetApplication\(presetId, false\)/)
  assert.match(appSource, /recordPresetApplication\(\s*result\.preset\.id,\s*true/)
  assert.doesNotMatch(hookSource, /coordinate|offset|layout\.x|layout\.y/i)

  for (const forbidden of [
    'projectSchema',
    'savedProject',
    'snapshot',
    'restoreProject',
    'localStorage',
    'sessionStorage',
  ]) {
    assert.equal(hookSource.includes(forbidden), false, `unexpected source: ${forbidden}`)
  }
})
