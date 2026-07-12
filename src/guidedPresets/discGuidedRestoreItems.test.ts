import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import {
  INITIAL_DISC_GUIDED_WORKFLOW_STATE,
  applyDiscGuidedLayout,
  omitDiscGuidedSlot,
  type DiscGuidedWorkflowState,
} from './discGuidedWorkflow.ts'
import { createDiscGuidedRestoreItems } from './discGuidedRestoreItems.ts'

const CLASSIC_ID = 'disc:guided-layout:classic-top-title'
const TITLE_ID = 'disc:guided:game-title:primary'
const RATING_ID = 'disc:guided:rating-badge:primary'
const PUBLISHER_ID = 'disc:guided:publisher-logo:primary'
const CLASSIC_SLOT_IDS = [
  TITLE_ID,
  'disc:guided:background-image:primary',
  RATING_ID,
  'disc:guided:media-format-mark:primary',
  'disc:guided:operating-system-marks:group',
  'disc:guided:developer-logo:primary',
  PUBLISHER_ID,
  'disc:guided:legal-text:copyright',
] as const

function createWorkflow() {
  return applyDiscGuidedLayout(INITIAL_DISC_GUIDED_WORKFLOW_STATE, {
    id: CLASSIC_ID,
    version: 1,
  }).state
}

test('inactive and complete workflows expose no restore items', () => {
  assert.deepEqual(
    createDiscGuidedRestoreItems(INITIAL_DISC_GUIDED_WORKFLOW_STATE),
    [],
  )
  assert.deepEqual(createDiscGuidedRestoreItems(createWorkflow()), [])
})

test('restore items use exact semantic labels in canonical layout order', () => {
  let workflow = createWorkflow()
  workflow = omitDiscGuidedSlot(workflow, PUBLISHER_ID).state
  workflow = omitDiscGuidedSlot(workflow, TITLE_ID).state
  workflow = omitDiscGuidedSlot(workflow, RATING_ID).state

  const items = createDiscGuidedRestoreItems(workflow)

  assert.deepEqual(items, [
    { slotId: TITLE_ID, label: 'Game Title' },
    { slotId: RATING_ID, label: 'Rating Badge' },
    { slotId: PUBLISHER_ID, label: 'Publisher Logo' },
  ])
  assert.equal(Object.isFrozen(items), true)
  assert.ok(items.every(Object.isFrozen))
})

test('Classic exposes all eight exact restore labels without role names', () => {
  const workflow = CLASSIC_SLOT_IDS.reduce(
    (current, slotId) => omitDiscGuidedSlot(current, slotId).state,
    createWorkflow(),
  )

  assert.deepEqual(
    createDiscGuidedRestoreItems(workflow).map(({ label }) => label),
    [
      'Game Title',
      'Background Image',
      'Rating Badge',
      'Media Format Mark',
      'Operating System Marks',
      'Developer Logo',
      'Publisher Logo',
      'Copyright / Legal Text',
    ],
  )
})

test('unsupported workflow identity safely exposes no restore items', () => {
  const unsupported = {
    activeLayout: { id: 'disc:guided-layout:unknown', version: 1 },
    omittedSlotIds: [TITLE_ID],
  } as unknown as DiscGuidedWorkflowState

  assert.deepEqual(createDiscGuidedRestoreItems(unsupported), [])
})

test('restore item projection remains pure and presentation independent', () => {
  const source = readFileSync(
    new URL('./discGuidedRestoreItems.ts', import.meta.url),
    'utf8',
  )

  for (const forbidden of [
    'querySelector',
    'setTimeout',
    'MutationObserver',
    'projectSchema',
    'restoreSavedDiscGuidedWorkflow',
    'components/',
    'render/',
    'export/',
    'caseInsert',
  ]) {
    assert.equal(source.includes(forbidden), false, forbidden)
  }
})
