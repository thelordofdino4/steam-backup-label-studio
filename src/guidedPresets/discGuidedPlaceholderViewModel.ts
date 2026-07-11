import {
  getDiscGuidedLayoutDefinition,
  getDiscGuidedLayoutSlotDefinition,
  type DiscGuidedLayoutId,
  type DiscGuidedLayoutSlotDefinition,
  type DiscGuidedPlaceholderLayer,
  type DiscGuidedRectGeometry,
  type DiscGuidedSetupKind,
} from './discGuidedLayouts.ts'
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
}>

const NO_PLACEHOLDERS = Object.freeze([]) as readonly DiscGuidedPlaceholderViewModel[]

export function projectDiscGuidedPlaceholderViewModel({
  layoutSlot,
  lifecycle,
}: {
  layoutSlot: DiscGuidedLayoutSlotDefinition | null
  lifecycle: 'unfilled' | 'suggested' | 'filled' | 'skipped'
}): DiscGuidedPlaceholderViewModel | null {
  if (!layoutSlot || (lifecycle !== 'unfilled' && lifecycle !== 'suggested')) {
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
  })
}

export function createDiscGuidedPlaceholderViewModels({
  activeLayoutId,
  state,
  suggestions,
  skippedSlotIds,
}: {
  activeLayoutId: DiscGuidedLayoutId | null
  state: DiscGuidedSlotState
  suggestions: readonly DiscGuidedSlotSuggestion[]
  skippedSlotIds: ReadonlySet<DiscGuidedSlotId>
}): readonly DiscGuidedPlaceholderViewModel[] {
  if (!activeLayoutId) {
    return NO_PLACEHOLDERS
  }

  const layout = getDiscGuidedLayoutDefinition(activeLayoutId)

  if (!layout) {
    return NO_PLACEHOLDERS
  }

  return Object.freeze(layout.slotOrder.flatMap((slotId) => {
    const layoutSlot = getDiscGuidedLayoutSlotDefinition(activeLayoutId, slotId)

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
