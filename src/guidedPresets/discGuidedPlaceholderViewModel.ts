import {
  getDiscGuidedLayoutDefinition,
  createDiscGuidedLayoutDefinitionFromResolvedPreset,
  type DiscGuidedLayoutSlotDefinition,
  type DiscGuidedPlaceholderLayer,
  type DiscGuidedRectGeometry,
  type DiscGuidedSetupKind,
} from './discGuidedLayouts.ts'
import type {
  ResolvedDiscPresetDefinition,
} from '../presets/discPresetResolution.ts'
import {
  resolveDiscGuidedSlot,
  type DiscGuidedSlotId,
  type DiscGuidedSlotState,
  type DiscGuidedSlotSuggestion,
  type GuidedSlotLifecycle,
} from './discGuidedSlots.ts'
import type { DiscGuidedWorkflowState } from './discGuidedWorkflow.ts'

export type DiscGuidedPlaceholderViewModel = Readonly<{
  slotId: DiscGuidedSlotId
  label: string
  visualGeometry: DiscGuidedRectGeometry
  actionGeometry: DiscGuidedRectGeometry
  visualLayer: DiscGuidedPlaceholderLayer
  lifecycle: 'unfilled' | 'suggested'
  setupKind: DiscGuidedSetupKind
  ownerContentLayering: 'guidance-behind-real-content'
  resolutionStatus: 'resolved' | 'adjusted'
}>

const NO_PLACEHOLDERS = Object.freeze([]) as readonly DiscGuidedPlaceholderViewModel[]

export function projectDiscGuidedPlaceholderViewModel({
  layoutSlot,
  lifecycle,
}: {
  layoutSlot: DiscGuidedLayoutSlotDefinition | null
  lifecycle: GuidedSlotLifecycle
}): DiscGuidedPlaceholderViewModel | null {
  if (
    !layoutSlot ||
    layoutSlot.resolutionStatus === 'unsupported' ||
    (lifecycle !== 'unfilled' && lifecycle !== 'suggested')
  ) {
    return null
  }

  return Object.freeze({
    slotId: layoutSlot.slotId,
    label: layoutSlot.label,
    visualGeometry: layoutSlot.visualGeometry,
    actionGeometry: layoutSlot.actionGeometry,
    visualLayer: layoutSlot.visualLayer,
    lifecycle,
    setupKind: layoutSlot.setupKind,
    ownerContentLayering: 'guidance-behind-real-content',
    resolutionStatus: layoutSlot.resolutionStatus,
  })
}

export function createDiscGuidedPlaceholderViewModels({
  workflow,
  resolvedPreset,
  state,
  suggestions,
}: {
  workflow: DiscGuidedWorkflowState
  resolvedPreset: ResolvedDiscPresetDefinition | null
  state: DiscGuidedSlotState
  suggestions: readonly DiscGuidedSlotSuggestion[]
}): readonly DiscGuidedPlaceholderViewModel[] {
  if (!workflow.activeLayout || !resolvedPreset) {
    return NO_PLACEHOLDERS
  }

  const activeLayout = getDiscGuidedLayoutDefinition(
    workflow.activeLayout.id,
    workflow.activeLayout.version,
  )

  if (!activeLayout) {
    return NO_PLACEHOLDERS
  }

  const layout = createDiscGuidedLayoutDefinitionFromResolvedPreset(
    resolvedPreset,
  )

  if (
    !layout ||
    layout.id !== activeLayout.id ||
    layout.version !== activeLayout.version
  ) {
    return NO_PLACEHOLDERS
  }

  const omittedSlotIds = new Set(workflow.omittedSlotIds)

  return Object.freeze(layout.slotOrder.flatMap((slotId) => {
    const layoutSlot = layout.slots[slotId] ?? null

    if (!layoutSlot) return []

    const resolution = resolveDiscGuidedSlot({
      slotId,
      state,
      suggestions,
      omittedSlotIds,
    })
    const viewModel = projectDiscGuidedPlaceholderViewModel({
      layoutSlot,
      lifecycle: resolution.lifecycle,
    })

    return viewModel ? [viewModel] : []
  }))
}
