import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import {
  getNextDiscGuidedWorkflowForPresetApplication,
} from './useDiscGuidedPlaceholderPreview.ts'
import {
  INITIAL_DISC_GUIDED_WORKFLOW_STATE,
  omitDiscGuidedSlot,
} from '../guidedPresets/discGuidedWorkflow.ts'

const CLASSIC_LAYOUT_ID = 'disc:guided-layout:classic-top-title'

test('successful Classic Top Title application activates its guided layout', () => {
  const next = getNextDiscGuidedWorkflowForPresetApplication({
    currentWorkflow: INITIAL_DISC_GUIDED_WORKFLOW_STATE,
    presetId: 'classic-top-title',
    applied: true,
  })
  assert.deepEqual(next.activeLayout, { id: CLASSIC_LAYOUT_ID, version: 1 })
  assert.deepEqual(next.omittedSlotIds, [])
})

test('reapplication preserves omissions while an unmapped preset clears guidance', () => {
  const active = getNextDiscGuidedWorkflowForPresetApplication({
    currentWorkflow: INITIAL_DISC_GUIDED_WORKFLOW_STATE,
    presetId: 'classic-top-title',
    applied: true,
  })
  const omitted = omitDiscGuidedSlot(
    active,
    'disc:guided:publisher-logo:primary',
  ).state
  const reapplied = getNextDiscGuidedWorkflowForPresetApplication({
    currentWorkflow: omitted,
    presetId: 'classic-top-title',
    applied: true,
  })
  assert.deepEqual(reapplied.omittedSlotIds, ['disc:guided:publisher-logo:primary'])

  assert.deepEqual(getNextDiscGuidedWorkflowForPresetApplication({
    currentWorkflow: reapplied,
    presetId: 'centered-logo-archive',
    applied: true,
  }), INITIAL_DISC_GUIDED_WORKFLOW_STATE)
})

test('failed or rejected application does not activate or clear guidance', () => {
  assert.equal(getNextDiscGuidedWorkflowForPresetApplication({
    currentWorkflow: INITIAL_DISC_GUIDED_WORKFLOW_STATE,
    presetId: 'classic-top-title',
    applied: false,
  }), INITIAL_DISC_GUIDED_WORKFLOW_STATE)
  const active = getNextDiscGuidedWorkflowForPresetApplication({
    currentWorkflow: INITIAL_DISC_GUIDED_WORKFLOW_STATE,
    presetId: 'classic-top-title',
    applied: true,
  })
  assert.equal(getNextDiscGuidedWorkflowForPresetApplication({
    currentWorkflow: active,
    presetId: 'missing-preset',
    applied: false,
  }), active)
})

test('activation is preset-result driven and omission remains in the focused hook', () => {
  const hookSource = readFileSync(
    new URL('./useDiscGuidedPlaceholderPreview.ts', import.meta.url),
    'utf8',
  )
  const appSource = readFileSync(new URL('../app/App.tsx', import.meta.url), 'utf8')

  assert.match(appSource, /recordPresetApplication\(presetId, false\)/)
  assert.match(appSource, /recordPresetApplication\(\s*result\.preset\.id,\s*true/)
  assert.match(hookSource, /omitDiscGuidedSlot\(currentWorkflow, slotId\)\.state/)
  assert.doesNotMatch(appSource, /omitDiscGuidedSlot/)
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

test('App owns one workflow value without implementing lifecycle transitions', () => {
  const source = readFileSync(new URL('../app/App.tsx', import.meta.url), 'utf8')

  assert.match(source, /workflow: discGuidedWorkflow/)
  assert.match(source, /updateWorkflow: setDiscGuidedWorkflow/)
  assert.match(source, /onOmitGuidedSlot: discGuidedPlaceholderPreview\.omitSlot/)
  assert.doesNotMatch(source, /omitDiscGuidedSlot|restoreDiscGuidedSlot/)
  assert.doesNotMatch(source, /clearActiveLayout/)
})
