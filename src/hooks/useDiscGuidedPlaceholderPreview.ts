import {
  getDiscGuidedLayoutIdForRolePreset,
} from '../guidedPresets/discGuidedLayouts.ts'
import {
  createDiscGuidedPlaceholderViewModels,
} from '../guidedPresets/discGuidedPlaceholderViewModel.ts'
import type {
  ActiveDiscPresetRef,
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
  activePresetRef: ActiveDiscPresetRef | null,
) {
  const activeLayoutId = activePresetRef
    ? getDiscGuidedLayoutIdForRolePreset(activePresetRef.id)
    : null

  const placeholders = createDiscGuidedPlaceholderViewModels({
    activeLayoutId,
    state,
    suggestions: NO_SUGGESTIONS,
    skippedSlotIds: NO_SKIPPED_SLOT_IDS,
  })

  return {
    activeLayoutId,
    placeholders,
  }
}
