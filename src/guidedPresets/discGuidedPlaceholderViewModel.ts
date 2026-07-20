import {
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
} from './discGuidedSlots.ts'

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
  lifecycle: 'unfilled' | 'suggested' | 'filled' | 'skipped'
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
  resolvedPreset,
  state,
  suggestions,
  skippedSlotIds,
}: {
  resolvedPreset: ResolvedDiscPresetDefinition | null
  state: DiscGuidedSlotState
  suggestions: readonly DiscGuidedSlotSuggestion[]
  skippedSlotIds: ReadonlySet<DiscGuidedSlotId>
}): readonly DiscGuidedPlaceholderViewModel[] {
  if (!resolvedPreset) {
    return NO_PLACEHOLDERS
  }

  const layout = createDiscGuidedLayoutDefinitionFromResolvedPreset(
    resolvedPreset,
  )

  if (!layout) {
    return NO_PLACEHOLDERS
  }

  return Object.freeze(layout.slotOrder.flatMap((slotId) => {
    const layoutSlot = layout.slots[slotId] ?? null

    if (!layoutSlot) return []

    const resolution = resolveDiscGuidedSlot({
      slotId,
      state,
      suggestions,
      skippedSlotIds,
    })
    const viewModel = projectDiscGuidedPlaceholderViewModel({
      layoutSlot,
      lifecycle: resolution.lifecycle,
    })

    return viewModel ? [viewModel] : []
  }))
}
