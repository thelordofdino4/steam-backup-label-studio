import {
  getDiscGuidedLayoutIdForRolePreset,
} from '../guidedPresets/discGuidedLayouts.ts'
import {
  createDiscGuidedPlaceholderViewModels,
} from '../guidedPresets/discGuidedPlaceholderViewModel.ts'
import type {
  ActiveDiscPresetState,
} from '../presets/discPresetTargetedApplication.ts'
import type {
  DiscGuidedSlotId,
  DiscGuidedSlotState,
  DiscGuidedSlotSuggestion,
} from '../guidedPresets/discGuidedSlots.ts'

const NO_SUGGESTIONS = Object.freeze([]) as readonly DiscGuidedSlotSuggestion[]
const NO_SKIPPED_SLOT_IDS: ReadonlySet<DiscGuidedSlotId> = new Set()

export function useDiscGuidedPlaceholderPreview(
  state: DiscGuidedSlotState,
  activePresetState: ActiveDiscPresetState | null,
) {
  const activeLayoutId = activePresetState
    ? getDiscGuidedLayoutIdForRolePreset(activePresetState.ref.id)
    : null

  const placeholders = createDiscGuidedPlaceholderViewModels({
    resolvedPreset: activePresetState?.resolvedDefinition ?? null,
    state,
    suggestions: NO_SUGGESTIONS,
    skippedSlotIds: NO_SKIPPED_SLOT_IDS,
  })

  return {
    activeLayoutId,
    placeholders,
  }
}
