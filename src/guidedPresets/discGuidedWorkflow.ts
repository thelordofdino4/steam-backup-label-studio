import {
  DISC_GUIDED_LAYOUT_DEFINITIONS,
  getDiscGuidedLayoutDefinition,
  type DiscGuidedLayoutId,
  type DiscGuidedLayoutRegistry,
  type DiscGuidedLayoutVersion,
} from './discGuidedLayouts.ts'
import {
  DISC_GUIDED_SLOT_DEFINITIONS,
  type DiscGuidedSlotDefinition,
  type DiscGuidedSlotId,
} from './discGuidedSlots.ts'

export type DiscGuidedWorkflowState = Readonly<{
  activeLayout: Readonly<{
    id: DiscGuidedLayoutId
    version: DiscGuidedLayoutVersion
  }> | null
  omittedSlotIds: readonly DiscGuidedSlotId[]
  completedSlotIds: readonly DiscGuidedSlotId[]
}>

export type DiscGuidedWorkflowContext = Readonly<{
  layouts?: DiscGuidedLayoutRegistry
  slots?: readonly DiscGuidedSlotDefinition[]
}>

export type ApplyDiscGuidedLayoutResult = Readonly<{
  outcome:
    | 'applied'
    | 'reapplied'
    | 'version-changed'
    | 'layout-changed'
    | 'rejected-unsupported-layout'
  state: DiscGuidedWorkflowState
}>

export type OmitDiscGuidedSlotResult = Readonly<{
  outcome:
    | 'omitted'
    | 'already-omitted'
    | 'rejected-no-active-layout'
    | 'rejected-unknown-slot'
    | 'rejected-not-omittable'
  state: DiscGuidedWorkflowState
}>

export type RestoreDiscGuidedSlotResult = Readonly<{
  outcome:
    | 'restored'
    | 'ignored-not-omitted'
    | 'rejected-no-active-layout'
    | 'rejected-unknown-slot'
  state: DiscGuidedWorkflowState
}>

export type RestoreAllDiscGuidedSlotsResult = Readonly<{
  outcome: 'restored-all' | 'already-restored'
  state: DiscGuidedWorkflowState
}>

export type CompleteDiscGuidedSlotResult = Readonly<{
  outcome:
    | 'completed'
    | 'already-completed'
    | 'rejected-no-active-layout'
    | 'rejected-unknown-slot'
  state: DiscGuidedWorkflowState
}>

export type RestoreCompletedDiscGuidedSlotResult = Readonly<{
  outcome:
    | 'restored'
    | 'ignored-not-completed'
    | 'rejected-no-active-layout'
    | 'rejected-unknown-slot'
  state: DiscGuidedWorkflowState
}>

export type ResetDiscGuidedProgressResult = Readonly<{
  outcome: 'reset' | 'already-reset'
  state: DiscGuidedWorkflowState
}>

export type ClearDiscGuidedWorkflowResult = Readonly<{
  outcome: 'cleared' | 'already-cleared'
  state: DiscGuidedWorkflowState
}>

const EMPTY_OMITTED_SLOT_IDS = Object.freeze([]) as readonly DiscGuidedSlotId[]
const EMPTY_COMPLETED_SLOT_IDS = Object.freeze([]) as readonly DiscGuidedSlotId[]

export const INITIAL_DISC_GUIDED_WORKFLOW_STATE = Object.freeze({
  activeLayout: null,
  omittedSlotIds: EMPTY_OMITTED_SLOT_IDS,
  completedSlotIds: EMPTY_COMPLETED_SLOT_IDS,
}) satisfies DiscGuidedWorkflowState

function getLayouts(context?: DiscGuidedWorkflowContext) {
  return context?.layouts ?? DISC_GUIDED_LAYOUT_DEFINITIONS
}

function getSlots(context?: DiscGuidedWorkflowContext) {
  return context?.slots ?? DISC_GUIDED_SLOT_DEFINITIONS
}

function getSlotDefinition(
  slotId: string,
  context?: DiscGuidedWorkflowContext,
) {
  return getSlots(context).find((definition) => definition.id === slotId)
}

function createWorkflowState(
  activeLayout: DiscGuidedWorkflowState['activeLayout'],
  omittedSlotIds: readonly DiscGuidedSlotId[],
  completedSlotIds: readonly DiscGuidedSlotId[],
): DiscGuidedWorkflowState {
  return Object.freeze({
    activeLayout: activeLayout
      ? Object.freeze({ ...activeLayout })
      : null,
    omittedSlotIds: omittedSlotIds.length === 0
      ? EMPTY_OMITTED_SLOT_IDS
      : Object.freeze([...omittedSlotIds]),
    completedSlotIds: completedSlotIds.length === 0
      ? EMPTY_COMPLETED_SLOT_IDS
      : Object.freeze([...completedSlotIds]),
  })
}

function canonicalizeOmittedSlotIds(
  layoutId: DiscGuidedLayoutId,
  version: DiscGuidedLayoutVersion,
  candidates: readonly unknown[],
  context?: DiscGuidedWorkflowContext,
) {
  const layout = getDiscGuidedLayoutDefinition(
    layoutId,
    version,
    getLayouts(context),
  )

  if (!layout) return EMPTY_OMITTED_SLOT_IDS

  const candidateIds = new Set(
    candidates.filter((candidate): candidate is string =>
      typeof candidate === 'string'),
  )

  return Object.freeze(layout.slotOrder.filter((slotId) =>
    candidateIds.has(slotId) && getSlotDefinition(slotId, context)?.omittable,
  ))
}

function canonicalizeCompletedSlotIds(
  layoutId: DiscGuidedLayoutId,
  version: DiscGuidedLayoutVersion,
  candidates: readonly unknown[],
  context?: DiscGuidedWorkflowContext,
) {
  const layout = getDiscGuidedLayoutDefinition(
    layoutId,
    version,
    getLayouts(context),
  )

  if (!layout) return EMPTY_COMPLETED_SLOT_IDS

  const candidateIds = new Set(
    candidates.filter((candidate): candidate is string =>
      typeof candidate === 'string'),
  )

  return Object.freeze(layout.slotOrder.filter((slotId) =>
    candidateIds.has(slotId),
  ))
}

function hasActiveSlot(
  state: DiscGuidedWorkflowState,
  slotId: string,
  context?: DiscGuidedWorkflowContext,
) {
  if (!state.activeLayout) return false

  const layout = getDiscGuidedLayoutDefinition(
    state.activeLayout.id,
    state.activeLayout.version,
    getLayouts(context),
  )

  return Boolean(layout?.slotOrder.includes(slotId as DiscGuidedSlotId))
}

export function normalizeDiscGuidedWorkflowState(
  value: unknown,
  context?: DiscGuidedWorkflowContext,
): DiscGuidedWorkflowState {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return INITIAL_DISC_GUIDED_WORKFLOW_STATE
  }

  const record = value as Record<string, unknown>
  const activeLayout = record.activeLayout

  if (!activeLayout || typeof activeLayout !== 'object' ||
    Array.isArray(activeLayout)) {
    return INITIAL_DISC_GUIDED_WORKFLOW_STATE
  }

  const activeRecord = activeLayout as Record<string, unknown>
  const layout = getDiscGuidedLayoutDefinition(
    activeRecord.id,
    activeRecord.version,
    getLayouts(context),
  )

  if (!layout) return INITIAL_DISC_GUIDED_WORKFLOW_STATE

  const omittedCandidates = Array.isArray(record.omittedSlotIds)
    ? record.omittedSlotIds
    : EMPTY_OMITTED_SLOT_IDS
  const completedCandidates = Array.isArray(record.completedSlotIds)
    ? record.completedSlotIds
    : EMPTY_COMPLETED_SLOT_IDS

  return createWorkflowState(
    { id: layout.id, version: layout.version },
    canonicalizeOmittedSlotIds(
      layout.id,
      layout.version,
      omittedCandidates,
      context,
    ),
    canonicalizeCompletedSlotIds(
      layout.id,
      layout.version,
      completedCandidates,
      context,
    ),
  )
}

export function applyDiscGuidedLayout(
  state: DiscGuidedWorkflowState,
  requestedLayout: Readonly<{
    id: unknown
    version: unknown
    activationCompletedSlotIds?: readonly unknown[]
  }>,
  context?: DiscGuidedWorkflowContext,
): ApplyDiscGuidedLayoutResult {
  const layout = getDiscGuidedLayoutDefinition(
    requestedLayout.id,
    requestedLayout.version,
    getLayouts(context),
  )

  if (!layout) {
    return Object.freeze({
      outcome: 'rejected-unsupported-layout',
      state,
    })
  }

  const activeLayout = Object.freeze({
    id: layout.id,
    version: layout.version,
  })

  if (!state.activeLayout) {
    return Object.freeze({
      outcome: 'applied',
      state: createWorkflowState(
        activeLayout,
        EMPTY_OMITTED_SLOT_IDS,
        canonicalizeCompletedSlotIds(
          layout.id,
          layout.version,
          requestedLayout.activationCompletedSlotIds ??
            EMPTY_COMPLETED_SLOT_IDS,
          context,
        ),
      ),
    })
  }

  if (state.activeLayout.id !== layout.id) {
    return Object.freeze({
      outcome: 'layout-changed',
      state: createWorkflowState(
        activeLayout,
        EMPTY_OMITTED_SLOT_IDS,
        canonicalizeCompletedSlotIds(
          layout.id,
          layout.version,
          requestedLayout.activationCompletedSlotIds ??
            EMPTY_COMPLETED_SLOT_IDS,
          context,
        ),
      ),
    })
  }

  const omittedSlotIds = canonicalizeOmittedSlotIds(
    layout.id,
    layout.version,
    state.omittedSlotIds,
    context,
  )
  const completedSlotIds = canonicalizeCompletedSlotIds(
    layout.id,
    layout.version,
    state.completedSlotIds,
    context,
  )

  return Object.freeze({
    outcome: state.activeLayout.version === layout.version
      ? 'reapplied'
      : 'version-changed',
    state: createWorkflowState(activeLayout, omittedSlotIds, completedSlotIds),
  })
}

export function omitDiscGuidedSlot(
  state: DiscGuidedWorkflowState,
  slotId: string,
  context?: DiscGuidedWorkflowContext,
): OmitDiscGuidedSlotResult {
  if (!state.activeLayout) {
    return Object.freeze({ outcome: 'rejected-no-active-layout', state })
  }

  if (!hasActiveSlot(state, slotId, context)) {
    return Object.freeze({ outcome: 'rejected-unknown-slot', state })
  }

  const definition = getSlotDefinition(slotId, context)

  if (!definition?.omittable) {
    return Object.freeze({ outcome: 'rejected-not-omittable', state })
  }

  if (state.omittedSlotIds.includes(definition.id)) {
    return Object.freeze({ outcome: 'already-omitted', state })
  }

  const omittedSlotIds = canonicalizeOmittedSlotIds(
    state.activeLayout.id,
    state.activeLayout.version,
    [...state.omittedSlotIds, definition.id],
    context,
  )

  return Object.freeze({
    outcome: 'omitted',
    state: createWorkflowState(
      state.activeLayout,
      omittedSlotIds,
      state.completedSlotIds,
    ),
  })
}

export function restoreDiscGuidedSlot(
  state: DiscGuidedWorkflowState,
  slotId: string,
  context?: DiscGuidedWorkflowContext,
): RestoreDiscGuidedSlotResult {
  if (!state.activeLayout) {
    return Object.freeze({ outcome: 'rejected-no-active-layout', state })
  }

  if (!hasActiveSlot(state, slotId, context)) {
    return Object.freeze({ outcome: 'rejected-unknown-slot', state })
  }

  const definition = getSlotDefinition(slotId, context)

  if (!definition || !state.omittedSlotIds.includes(definition.id)) {
    return Object.freeze({ outcome: 'ignored-not-omitted', state })
  }

  return Object.freeze({
    outcome: 'restored',
    state: createWorkflowState(
      state.activeLayout,
      state.omittedSlotIds.filter((candidate) => candidate !== definition.id),
      state.completedSlotIds,
    ),
  })
}

export function restoreAllDiscGuidedSlots(
  state: DiscGuidedWorkflowState,
): RestoreAllDiscGuidedSlotsResult {
  if (state.omittedSlotIds.length === 0) {
    return Object.freeze({ outcome: 'already-restored', state })
  }

  return Object.freeze({
    outcome: 'restored-all',
    state: createWorkflowState(
      state.activeLayout,
      EMPTY_OMITTED_SLOT_IDS,
      state.completedSlotIds,
    ),
  })
}

export function completeDiscGuidedSlot(
  state: DiscGuidedWorkflowState,
  slotId: string,
  context?: DiscGuidedWorkflowContext,
): CompleteDiscGuidedSlotResult {
  if (!state.activeLayout) {
    return Object.freeze({ outcome: 'rejected-no-active-layout', state })
  }

  if (!hasActiveSlot(state, slotId, context)) {
    return Object.freeze({ outcome: 'rejected-unknown-slot', state })
  }

  const definition = getSlotDefinition(slotId, context)
  const canonicalSlotId = definition?.id ?? slotId as DiscGuidedSlotId

  if (state.completedSlotIds.includes(canonicalSlotId)) {
    return Object.freeze({ outcome: 'already-completed', state })
  }

  const completedSlotIds = canonicalizeCompletedSlotIds(
    state.activeLayout.id,
    state.activeLayout.version,
    [...state.completedSlotIds, canonicalSlotId],
    context,
  )

  return Object.freeze({
    outcome: 'completed',
    state: createWorkflowState(
      state.activeLayout,
      state.omittedSlotIds,
      completedSlotIds,
    ),
  })
}

export function restoreCompletedDiscGuidedSlot(
  state: DiscGuidedWorkflowState,
  slotId: string,
  context?: DiscGuidedWorkflowContext,
): RestoreCompletedDiscGuidedSlotResult {
  if (!state.activeLayout) {
    return Object.freeze({ outcome: 'rejected-no-active-layout', state })
  }

  if (!hasActiveSlot(state, slotId, context)) {
    return Object.freeze({ outcome: 'rejected-unknown-slot', state })
  }

  const definition = getSlotDefinition(slotId, context)
  const canonicalSlotId = definition?.id ?? slotId as DiscGuidedSlotId

  if (!state.completedSlotIds.includes(canonicalSlotId)) {
    return Object.freeze({ outcome: 'ignored-not-completed', state })
  }

  return Object.freeze({
    outcome: 'restored',
    state: createWorkflowState(
      state.activeLayout,
      state.omittedSlotIds,
      state.completedSlotIds.filter(
        (candidate) => candidate !== canonicalSlotId,
      ),
    ),
  })
}

export function resetDiscGuidedProgress(
  state: DiscGuidedWorkflowState,
): ResetDiscGuidedProgressResult {
  if (
    state.omittedSlotIds.length === 0 &&
    state.completedSlotIds.length === 0
  ) {
    return Object.freeze({ outcome: 'already-reset', state })
  }

  return Object.freeze({
    outcome: 'reset',
    state: createWorkflowState(
      state.activeLayout,
      EMPTY_OMITTED_SLOT_IDS,
      EMPTY_COMPLETED_SLOT_IDS,
    ),
  })
}

export function clearDiscGuidedWorkflow(
  state: DiscGuidedWorkflowState,
): ClearDiscGuidedWorkflowResult {
  if (
    !state.activeLayout &&
    state.omittedSlotIds.length === 0 &&
    state.completedSlotIds.length === 0
  ) {
    return Object.freeze({ outcome: 'already-cleared', state })
  }

  return Object.freeze({
    outcome: 'cleared',
    state: INITIAL_DISC_GUIDED_WORKFLOW_STATE,
  })
}

export function getDiscGuidedOmittedSlotIdSet(
  state: DiscGuidedWorkflowState,
): ReadonlySet<DiscGuidedSlotId> {
  return new Set(state.omittedSlotIds)
}

export function getDiscGuidedCompletedSlotIdSet(
  state: DiscGuidedWorkflowState,
): ReadonlySet<DiscGuidedSlotId> {
  return new Set(state.completedSlotIds)
}
