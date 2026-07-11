import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import {
  DEFAULT_DISC_TEXT_SETTINGS,
  createDefaultDiscTextValues,
} from '../discText/index.ts'
import { createDefaultDiscTextValueSources } from '../project/metadataDiscText.ts'
import { createDefaultProjectAdditionalArtwork } from '../project/projectAdditionalArtwork.ts'
import { createDefaultProjectLogoAssets } from '../project/projectLogoAssets.ts'
import { createDefaultProjectMediaMark } from '../project/projectMediaMark.ts'
import { createDefaultProjectMetadata } from '../project/projectMetadata.ts'
import { createDefaultProjectPlatformMarks } from '../project/projectPlatformMarks.ts'
import { createDefaultProjectRatingBadge } from '../project/projectRatingBadge.ts'
import { createDefaultProjectTitleArtwork } from '../project/projectTitleArtwork.ts'
import {
  DISC_GUIDED_LAYOUT_DEFINITIONS,
  getDiscGuidedCanonicalSlotOrder,
  getDiscGuidedLayoutDefinition,
  getDiscGuidedValidSlotIds,
  isSupportedDiscGuidedLayoutId,
  isSupportedDiscGuidedLayoutVersion,
  isValidDiscGuidedLayoutVersion,
  type DiscGuidedLayoutDefinition,
  type DiscGuidedLayoutId,
  type DiscGuidedLayoutRegistry,
  type DiscGuidedLayoutSlotDefinition,
} from './discGuidedLayouts.ts'
import {
  DISC_GUIDED_SLOT_DEFINITIONS,
  resolveDiscGuidedSlot,
  type DiscGuidedSlotId,
  type DiscGuidedSlotState,
  type DiscGuidedSlotSuggestion,
} from './discGuidedSlots.ts'
import {
  INITIAL_DISC_GUIDED_WORKFLOW_STATE,
  applyDiscGuidedLayout,
  clearDiscGuidedWorkflow,
  getDiscGuidedOmittedSlotIdSet,
  normalizeDiscGuidedWorkflowState,
  omitDiscGuidedSlot,
  restoreAllDiscGuidedSlots,
  restoreDiscGuidedSlot,
  type DiscGuidedWorkflowContext,
  type DiscGuidedWorkflowState,
} from './discGuidedWorkflow.ts'

const CLASSIC_ID = 'disc:guided-layout:classic-top-title'
const CLASSIC_VERSION = 1
const TITLE_ID = 'disc:guided:game-title:primary'
const BACKGROUND_ID = 'disc:guided:background-image:primary'
const RATING_ID = 'disc:guided:rating-badge:primary'
const LEGAL_ID = 'disc:guided:legal-text:copyright'
const ADDITIONAL_TEXT_ID = 'disc:guided:additional-text:custom-note'

function applyClassic(
  state: DiscGuidedWorkflowState = INITIAL_DISC_GUIDED_WORKFLOW_STATE,
  context?: DiscGuidedWorkflowContext,
) {
  return applyDiscGuidedLayout(
    state,
    { id: CLASSIC_ID, version: CLASSIC_VERSION },
    context,
  ).state
}

function omit(
  state: DiscGuidedWorkflowState,
  slotId: DiscGuidedSlotId,
  context?: DiscGuidedWorkflowContext,
) {
  return omitDiscGuidedSlot(state, slotId, context).state
}

function cloneSlot(
  slotId: DiscGuidedSlotId,
): DiscGuidedLayoutSlotDefinition {
  const classic = getDiscGuidedLayoutDefinition(CLASSIC_ID, CLASSIC_VERSION)
  const slot = classic?.slots[slotId]

  if (slot) return slot

  return {
    slotId,
    label: slotId,
    geometry: {
      kind: 'rect',
      centerXPercent: 50,
      centerYPercent: 50,
      widthPercent: 10,
      heightPercent: 10,
    },
    setupKind: 'legal-text',
  }
}

function createLayout(
  id: DiscGuidedLayoutId,
  version: number,
  slotOrder: readonly DiscGuidedSlotId[],
): DiscGuidedLayoutDefinition {
  return {
    id,
    version,
    baseRolePresetId: 'classic-top-title',
    slotOrder,
    slots: Object.fromEntries(
      slotOrder.map((slotId) => [slotId, cloneSlot(slotId)]),
    ),
  }
}

function createVersionedContext() {
  const alternateId = 'disc:guided-layout:test-alternate' as DiscGuidedLayoutId
  const layouts = [
    ...DISC_GUIDED_LAYOUT_DEFINITIONS,
    createLayout(CLASSIC_ID, 2, [
      LEGAL_ID,
      BACKGROUND_ID,
      ADDITIONAL_TEXT_ID,
    ]),
    createLayout(alternateId, 1, [TITLE_ID, LEGAL_ID]),
  ] satisfies DiscGuidedLayoutRegistry

  return {
    context: { layouts } satisfies DiscGuidedWorkflowContext,
    alternateId,
  }
}

function createSlotState(): DiscGuidedSlotState {
  return {
    background: {
      enabled: false,
      imageDataUrl: null,
      imageSize: null,
    },
    titleArtwork: createDefaultProjectTitleArtwork(),
    metadata: createDefaultProjectMetadata(),
    ratingBadge: createDefaultProjectRatingBadge(),
    mediaMark: createDefaultProjectMediaMark(),
    platformMarks: createDefaultProjectPlatformMarks(),
    logoAssets: createDefaultProjectLogoAssets(),
    additionalArtwork: createDefaultProjectAdditionalArtwork(),
    discText: {
      settings: { ...DEFAULT_DISC_TEXT_SETTINGS },
      values: createDefaultDiscTextValues(),
      valueSources: createDefaultDiscTextValueSources(),
      titleValue: '',
      htmlSources: {},
    },
  }
}

test('initial workflow is canonical, inactive, immutable, and serializable', () => {
  assert.deepEqual(INITIAL_DISC_GUIDED_WORKFLOW_STATE, {
    activeLayout: null,
    omittedSlotIds: [],
  })
  assert.equal(Object.isFrozen(INITIAL_DISC_GUIDED_WORKFLOW_STATE), true)
  assert.equal(
    Object.isFrozen(INITIAL_DISC_GUIDED_WORKFLOW_STATE.omittedSlotIds),
    true,
  )
  assert.equal(JSON.stringify(INITIAL_DISC_GUIDED_WORKFLOW_STATE),
    '{"activeLayout":null,"omittedSlotIds":[]}')
})

test('Classic Top Title exposes a supported positive version and canonical slots', () => {
  const layout = getDiscGuidedLayoutDefinition(CLASSIC_ID, CLASSIC_VERSION)
  assert.ok(layout)
  assert.equal(layout.version, 1)
  assert.equal(isSupportedDiscGuidedLayoutId(CLASSIC_ID), true)
  assert.equal(isSupportedDiscGuidedLayoutVersion(CLASSIC_ID, 1), true)
  assert.equal(isSupportedDiscGuidedLayoutVersion(CLASSIC_ID, 2), false)
  assert.equal(getDiscGuidedLayoutDefinition(CLASSIC_ID, 2), null)
  assert.deepEqual(getDiscGuidedCanonicalSlotOrder(CLASSIC_ID, 1), [
    TITLE_ID,
    BACKGROUND_ID,
    RATING_ID,
    'disc:guided:media-format-mark:primary',
    'disc:guided:operating-system-marks:group',
    'disc:guided:developer-logo:primary',
    'disc:guided:publisher-logo:primary',
    LEGAL_ID,
  ])
  assert.equal(getDiscGuidedValidSlotIds(CLASSIC_ID, 1).has(RATING_ID), true)

  for (const invalid of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1, NaN]) {
    assert.equal(isValidDiscGuidedLayoutVersion(invalid), false)
  }
})

test('first application activates Classic with no omissions', () => {
  const result = applyDiscGuidedLayout(INITIAL_DISC_GUIDED_WORKFLOW_STATE, {
    id: CLASSIC_ID,
    version: 1,
  })
  assert.equal(result.outcome, 'applied')
  assert.deepEqual(result.state, {
    activeLayout: { id: CLASSIC_ID, version: 1 },
    omittedSlotIds: [],
  })
  assert.equal(Object.isFrozen(result.state.activeLayout), true)
})

test('same layout reapplication preserves and canonicalizes omissions', () => {
  let state = applyClassic()
  state = omit(state, LEGAL_ID)
  state = omit(state, TITLE_ID)
  const input = {
    ...state,
    omittedSlotIds: [LEGAL_ID, TITLE_ID, LEGAL_ID],
  } satisfies DiscGuidedWorkflowState
  const result = applyDiscGuidedLayout(input, { id: CLASSIC_ID, version: 1 })

  assert.equal(result.outcome, 'reapplied')
  assert.deepEqual(result.state.omittedSlotIds, [TITLE_ID, LEGAL_ID])
})

test('different layout clears omissions without transferring slot identity', () => {
  const { context, alternateId } = createVersionedContext()
  const state = omit(applyClassic(undefined, context), LEGAL_ID, context)
  const result = applyDiscGuidedLayout(
    state,
    { id: alternateId, version: 1 },
    context,
  )

  assert.equal(result.outcome, 'layout-changed')
  assert.deepEqual(result.state, {
    activeLayout: { id: alternateId, version: 1 },
    omittedSlotIds: [],
  })
})

test('version change preserves surviving IDs and leaves new slots visible', () => {
  const { context } = createVersionedContext()
  let state = applyClassic(undefined, context)
  state = omit(state, BACKGROUND_ID, context)
  state = omit(state, RATING_ID, context)
  state = omit(state, LEGAL_ID, context)

  const result = applyDiscGuidedLayout(
    state,
    { id: CLASSIC_ID, version: 2 },
    context,
  )

  assert.equal(result.outcome, 'version-changed')
  assert.deepEqual(result.state.omittedSlotIds, [LEGAL_ID, BACKGROUND_ID])
  assert.equal(result.state.omittedSlotIds.includes(ADDITIONAL_TEXT_ID), false)
})

test('unsupported application preserves the prior valid state without throwing', () => {
  const state = omit(applyClassic(), TITLE_ID)
  const result = applyDiscGuidedLayout(state, {
    id: CLASSIC_ID,
    version: 99,
  })

  assert.equal(result.outcome, 'rejected-unsupported-layout')
  assert.equal(result.state, state)
})

test('omit validates active membership, omittable policy, order, and idempotence', () => {
  const inactive = omitDiscGuidedSlot(
    INITIAL_DISC_GUIDED_WORKFLOW_STATE,
    TITLE_ID,
  )
  assert.equal(inactive.outcome, 'rejected-no-active-layout')

  const active = applyClassic()
  const unknown = omitDiscGuidedSlot(active, 'disc:guided:unknown')
  assert.equal(unknown.outcome, 'rejected-unknown-slot')

  const first = omitDiscGuidedSlot(active, LEGAL_ID)
  const second = omitDiscGuidedSlot(first.state, TITLE_ID)
  assert.equal(first.outcome, 'omitted')
  assert.deepEqual(second.state.omittedSlotIds, [TITLE_ID, LEGAL_ID])
  assert.equal(omitDiscGuidedSlot(second.state, TITLE_ID).outcome,
    'already-omitted')

  const slots = DISC_GUIDED_SLOT_DEFINITIONS.map((definition) =>
    definition.id === TITLE_ID
      ? { ...definition, omittable: false }
      : definition) as readonly typeof DISC_GUIDED_SLOT_DEFINITIONS[number][]
  const notOmittable = omitDiscGuidedSlot(active, TITLE_ID, { slots })
  assert.equal(notOmittable.outcome, 'rejected-not-omittable')
  assert.deepEqual(active.omittedSlotIds, [])
})

test('restore one preserves other omissions and safely ignores absent entries', () => {
  let state = applyClassic()
  state = omit(state, TITLE_ID)
  state = omit(state, LEGAL_ID)
  const restored = restoreDiscGuidedSlot(state, TITLE_ID)

  assert.equal(restored.outcome, 'restored')
  assert.deepEqual(restored.state.omittedSlotIds, [LEGAL_ID])
  assert.deepEqual(restored.state.activeLayout, state.activeLayout)
  assert.equal(
    restoreDiscGuidedSlot(restored.state, TITLE_ID).outcome,
    'ignored-not-omitted',
  )
  assert.deepEqual(state.omittedSlotIds, [TITLE_ID, LEGAL_ID])
})

test('restore all and clear are idempotent and preserve the intended identity', () => {
  const active = omit(applyClassic(), TITLE_ID)
  const restored = restoreAllDiscGuidedSlots(active)
  assert.equal(restored.outcome, 'restored-all')
  assert.deepEqual(restored.state.activeLayout, active.activeLayout)
  assert.deepEqual(restored.state.omittedSlotIds, [])
  assert.equal(restoreAllDiscGuidedSlots(restored.state).outcome,
    'already-restored')

  const cleared = clearDiscGuidedWorkflow(active)
  assert.equal(cleared.outcome, 'cleared')
  assert.equal(cleared.state, INITIAL_DISC_GUIDED_WORKFLOW_STATE)
  assert.equal(clearDiscGuidedWorkflow(cleared.state).outcome,
    'already-cleared')
})

test('normalization deactivates unknown contracts and canonicalizes omission IDs', () => {
  for (const malformed of [undefined, null, true, [], {}, {
    activeLayout: null,
    omittedSlotIds: [TITLE_ID],
  }]) {
    assert.doesNotThrow(() => normalizeDiscGuidedWorkflowState(malformed))
    assert.equal(
      normalizeDiscGuidedWorkflowState(malformed),
      INITIAL_DISC_GUIDED_WORKFLOW_STATE,
    )
  }

  assert.equal(normalizeDiscGuidedWorkflowState({
    activeLayout: { id: 'disc:guided:unknown', version: 1 },
    omittedSlotIds: [TITLE_ID],
  }), INITIAL_DISC_GUIDED_WORKFLOW_STATE)
  assert.equal(normalizeDiscGuidedWorkflowState({
    activeLayout: { id: CLASSIC_ID, version: 99 },
    omittedSlotIds: [TITLE_ID],
  }), INITIAL_DISC_GUIDED_WORKFLOW_STATE)

  const normalized = normalizeDiscGuidedWorkflowState({
    activeLayout: { id: CLASSIC_ID, version: 1 },
    omittedSlotIds: [
      LEGAL_ID,
      'disc:guided:unknown',
      TITLE_ID,
      LEGAL_ID,
      ADDITIONAL_TEXT_ID,
      42,
    ],
    copiedGeometry: { x: 10 },
  })
  assert.deepEqual(normalized, {
    activeLayout: { id: CLASSIC_ID, version: 1 },
    omittedSlotIds: [TITLE_ID, LEGAL_ID],
  })
  assert.deepEqual([...getDiscGuidedOmittedSlotIdSet(normalized)], [
    TITLE_ID,
    LEGAL_ID,
  ])
})

test('normalization discards non-omittable IDs', () => {
  const slots = DISC_GUIDED_SLOT_DEFINITIONS.map((definition) =>
    definition.id === TITLE_ID
      ? { ...definition, omittable: false }
      : definition) as readonly typeof DISC_GUIDED_SLOT_DEFINITIONS[number][]
  const normalized = normalizeDiscGuidedWorkflowState({
    activeLayout: { id: CLASSIC_ID, version: 1 },
    omittedSlotIds: [TITLE_ID, LEGAL_ID],
  }, { slots })

  assert.deepEqual(normalized.omittedSlotIds, [LEGAL_ID])
})

test('omission overrides filled and suggested lifecycle without owner mutation', () => {
  const ownerState = createSlotState()
  ownerState.background = {
    enabled: true,
    imageDataUrl: 'data:image/png;base64,background',
    imageSize: { width: 1200, height: 1200 },
  }
  const ownerBefore = structuredClone(ownerState)
  const omitted = omit(applyClassic(), BACKGROUND_ID)
  const omittedIds = getDiscGuidedOmittedSlotIdSet(omitted)

  assert.equal(resolveDiscGuidedSlot({
    slotId: BACKGROUND_ID,
    state: ownerState,
    suggestions: [],
    omittedSlotIds: omittedIds,
  }).lifecycle, 'omitted')
  assert.deepEqual(ownerState, ownerBefore)

  const suggestion: DiscGuidedSlotSuggestion = {
    id: 'suggestion:title',
    slotId: TITLE_ID,
    contentKind: 'image',
    sourceKind: 'external',
  }
  const omittedTitle = omit(applyClassic(), TITLE_ID)
  assert.equal(resolveDiscGuidedSlot({
    slotId: TITLE_ID,
    state: ownerState,
    suggestions: [suggestion],
    omittedSlotIds: getDiscGuidedOmittedSlotIdSet(omittedTitle),
  }).lifecycle, 'omitted')
})

test('restored slots immediately derive filled, suggested, or unfilled state', () => {
  const ownerState = createSlotState()
  let workflow = omit(applyClassic(), BACKGROUND_ID)
  workflow = restoreDiscGuidedSlot(workflow, BACKGROUND_ID).state

  ownerState.background = {
    enabled: true,
    imageDataUrl: 'data:image/png;base64,background',
    imageSize: { width: 1200, height: 1200 },
  }
  assert.equal(resolveDiscGuidedSlot({
    slotId: BACKGROUND_ID,
    state: ownerState,
    suggestions: [],
    omittedSlotIds: getDiscGuidedOmittedSlotIdSet(workflow),
  }).lifecycle, 'filled')

  ownerState.background.imageDataUrl = null
  ownerState.background.imageSize = null
  const suggestion: DiscGuidedSlotSuggestion = {
    id: 'suggestion:background',
    slotId: BACKGROUND_ID,
    contentKind: 'image',
    sourceKind: 'external',
  }
  assert.equal(resolveDiscGuidedSlot({
    slotId: BACKGROUND_ID,
    state: ownerState,
    suggestions: [suggestion],
    omittedSlotIds: getDiscGuidedOmittedSlotIdSet(workflow),
  }).lifecycle, 'suggested')
  assert.equal(resolveDiscGuidedSlot({
    slotId: BACKGROUND_ID,
    state: ownerState,
    suggestions: [],
    omittedSlotIds: getDiscGuidedOmittedSlotIdSet(workflow),
  }).lifecycle, 'unfilled')
})

test('pure workflow has no UI, persistence, render, export, or Case Insert dependencies', () => {
  const workflowSource = readFileSync(
    new URL('./discGuidedWorkflow.ts', import.meta.url),
    'utf8',
  )
  const guidedSource = [
    workflowSource,
    readFileSync(new URL('./discGuidedSlots.ts', import.meta.url), 'utf8'),
    readFileSync(new URL('./discGuidedLayouts.ts', import.meta.url), 'utf8'),
  ].join('\n')

  for (const forbidden of [
    'react',
    'App.tsx',
    'components/',
    'document.',
    'window.',
    'projectSchema',
    'createProjectSnapshot',
    'restoreProject',
    'savedProject',
    'render/',
    'export/',
    'caseInsert',
    'fetch(',
    'setTimeout',
    'setInterval',
    'Math.random',
  ]) {
    assert.equal(workflowSource.includes(forbidden), false, forbidden)
  }
  assert.equal(guidedSource.includes("'skipped'"), false)
  assert.equal(guidedSource.includes('skippable'), false)
  assert.equal(guidedSource.includes('skippedSlotIds'), false)
})
