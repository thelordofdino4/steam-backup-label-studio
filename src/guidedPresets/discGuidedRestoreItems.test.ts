import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import {
  INITIAL_DISC_GUIDED_WORKFLOW_STATE,
  applyDiscGuidedLayout,
  completeDiscGuidedSlot,
  omitDiscGuidedSlot,
  type DiscGuidedWorkflowState,
} from './discGuidedWorkflow.ts'
import {
  createDiscGuidedProgressItems,
  createDiscGuidedRestoreItems,
} from './discGuidedRestoreItems.ts'

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

test('inactive and untouched workflows expose no guided progress items', () => {
  assert.deepEqual(
    createDiscGuidedProgressItems(INITIAL_DISC_GUIDED_WORKFLOW_STATE),
    { removedItems: [], completedItems: [] },
  )
  assert.deepEqual(
    createDiscGuidedRestoreItems(INITIAL_DISC_GUIDED_WORKFLOW_STATE),
    [],
  )
  assert.deepEqual(createDiscGuidedProgressItems(createWorkflow()), {
    removedItems: [],
    completedItems: [],
  })
})

test('removed and completed items use canonical labels and independent order', () => {
  let workflow = createWorkflow()
  workflow = omitDiscGuidedSlot(workflow, PUBLISHER_ID).state
  workflow = omitDiscGuidedSlot(workflow, TITLE_ID).state
  workflow = omitDiscGuidedSlot(workflow, RATING_ID).state
  workflow = completeDiscGuidedSlot(workflow, PUBLISHER_ID).state
  workflow = completeDiscGuidedSlot(workflow, RATING_ID).state
  workflow = completeDiscGuidedSlot(workflow, TITLE_ID).state

  const progress = createDiscGuidedProgressItems(workflow)

  assert.deepEqual(progress.removedItems, [
    { slotId: TITLE_ID, label: 'Game Title' },
    { slotId: RATING_ID, label: 'Rating Badge' },
    { slotId: PUBLISHER_ID, label: 'Publisher Logo' },
  ])
  assert.deepEqual(progress.completedItems, [
    { slotId: TITLE_ID, label: 'Game Title' },
    { slotId: RATING_ID, label: 'Rating Badge' },
    { slotId: PUBLISHER_ID, label: 'Publisher Logo' },
  ])
  assert.equal(Object.isFrozen(progress), true)
  assert.equal(Object.isFrozen(progress.removedItems), true)
  assert.equal(Object.isFrozen(progress.completedItems), true)
  assert.ok(progress.removedItems.every(Object.isFrozen))
  assert.ok(progress.completedItems.every(Object.isFrozen))
  assert.deepEqual(createDiscGuidedRestoreItems(workflow), progress.removedItems)
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

test('Classic exposes all eight exact completed labels without a second label map', () => {
  const workflow = CLASSIC_SLOT_IDS.reduce(
    (current, slotId) => completeDiscGuidedSlot(current, slotId).state,
    createWorkflow(),
  )

  assert.deepEqual(
    createDiscGuidedProgressItems(workflow).completedItems.map(({ label }) =>
      label),
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

test('overlapping omitted and completed flags project into both sections', () => {
  let workflow = createWorkflow()
  workflow = omitDiscGuidedSlot(workflow, TITLE_ID).state
  workflow = completeDiscGuidedSlot(workflow, TITLE_ID).state

  const progress = createDiscGuidedProgressItems(workflow)

  assert.deepEqual(progress.removedItems, [
    { slotId: TITLE_ID, label: 'Game Title' },
  ])
  assert.deepEqual(progress.completedItems, [
    { slotId: TITLE_ID, label: 'Game Title' },
  ])
})

test('unsupported workflow identity safely exposes no restore items', () => {
  const unsupported = {
    activeLayout: { id: 'disc:guided-layout:unknown', version: 1 },
    omittedSlotIds: [TITLE_ID],
    completedSlotIds: [TITLE_ID],
  } as unknown as DiscGuidedWorkflowState

  assert.deepEqual(createDiscGuidedRestoreItems(unsupported), [])
  assert.deepEqual(createDiscGuidedProgressItems(unsupported), {
    removedItems: [],
    completedItems: [],
  })
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
