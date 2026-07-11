import { useCallback, useState } from 'react'
import {
  getDiscGuidedLayoutIdForRolePreset,
  type DiscGuidedLayoutId,
} from '../guidedPresets/discGuidedLayouts.ts'
import {
  createDiscGuidedPlaceholderViewModels,
} from '../guidedPresets/discGuidedPlaceholderViewModel.ts'
import type {
  DiscGuidedSlotId,
  DiscGuidedSlotState,
  DiscGuidedSlotSuggestion,
} from '../guidedPresets/discGuidedSlots.ts'
import { getDiscRolePreset } from '../layout/discRolePresets.ts'

const NO_SUGGESTIONS = Object.freeze([]) as readonly DiscGuidedSlotSuggestion[]
const NO_SKIPPED_SLOT_IDS: ReadonlySet<DiscGuidedSlotId> = new Set()

export function getNextActiveDiscGuidedLayoutId({
  currentLayoutId,
  presetId,
  applied,
}: {
  currentLayoutId: DiscGuidedLayoutId | null
  presetId: string
  applied: boolean
}): DiscGuidedLayoutId | null {
  if (!applied) {
    return currentLayoutId
  }

  const preset = getDiscRolePreset(presetId)

  return preset
    ? getDiscGuidedLayoutIdForRolePreset(preset.id)
    : null
}

export function useDiscGuidedPlaceholderPreview(state: DiscGuidedSlotState) {
  const [activeLayoutId, setActiveLayoutId] =
    useState<DiscGuidedLayoutId | null>(null)

  const recordPresetApplication = useCallback((
    presetId: string,
    applied: boolean,
  ) => {
    setActiveLayoutId((currentLayoutId) =>
      getNextActiveDiscGuidedLayoutId({
        currentLayoutId,
        presetId,
        applied,
      }),
    )
  }, [])

  const clearActiveLayout = useCallback(() => {
    setActiveLayoutId(null)
  }, [])

  const placeholders = createDiscGuidedPlaceholderViewModels({
    activeLayoutId,
    state,
    suggestions: NO_SUGGESTIONS,
    skippedSlotIds: NO_SKIPPED_SLOT_IDS,
  })

  return {
    activeLayoutId,
    placeholders,
    recordPresetApplication,
    clearActiveLayout,
  }
}
