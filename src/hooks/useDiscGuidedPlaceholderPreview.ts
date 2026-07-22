import { useCallback } from 'react'

import {
  getCurrentDiscGuidedLayoutDefinition,
  getDiscGuidedLayoutIdForRolePreset,
} from '../guidedPresets/discGuidedLayouts.ts'
import {
  createDiscGuidedPlaceholderViewModels,
} from '../guidedPresets/discGuidedPlaceholderViewModel.ts'
import {
  createDiscGuidedRestoreItems,
} from '../guidedPresets/discGuidedRestoreItems.ts'
import type {
  ActiveDiscPresetState,
} from '../presets/discPresetTargetedApplication.ts'
import type {
  DiscGuidedSlotId,
  DiscGuidedSlotState,
  DiscGuidedSlotSuggestion,
} from '../guidedPresets/discGuidedSlots.ts'
import {
  applyDiscGuidedLayout,
  clearDiscGuidedWorkflow,
  omitDiscGuidedSlot,
  restoreAllDiscGuidedSlots,
  restoreDiscGuidedSlot,
  type DiscGuidedWorkflowState,
} from '../guidedPresets/discGuidedWorkflow.ts'

const NO_SUGGESTIONS = Object.freeze([]) as readonly DiscGuidedSlotSuggestion[]

type DiscGuidedWorkflowUpdater = (
  update: (current: DiscGuidedWorkflowState) => DiscGuidedWorkflowState,
) => void

export function getNextDiscGuidedWorkflowForPresetApplication({
  currentWorkflow,
  presetId,
  applied,
}: {
  currentWorkflow: DiscGuidedWorkflowState
  presetId: string
  applied: boolean
}): DiscGuidedWorkflowState {
  if (!applied) return currentWorkflow

  const layoutId = getDiscGuidedLayoutIdForRolePreset(presetId)
  const layout = layoutId
    ? getCurrentDiscGuidedLayoutDefinition(layoutId)
    : null

  return layout
    ? applyDiscGuidedLayout(currentWorkflow, {
        id: layout.id,
        version: layout.version,
      }).state
    : clearDiscGuidedWorkflow(currentWorkflow).state
}

export function useDiscGuidedPlaceholderPreview({
  state,
  workflow,
  updateWorkflow,
  activePresetState,
}: {
  state: DiscGuidedSlotState
  workflow: DiscGuidedWorkflowState
  updateWorkflow: DiscGuidedWorkflowUpdater
  activePresetState: ActiveDiscPresetState | null
}) {
  const recordPresetApplication = useCallback((
    presetId: string,
    applied: boolean,
  ) => {
    updateWorkflow((currentWorkflow) =>
      getNextDiscGuidedWorkflowForPresetApplication({
        currentWorkflow,
        presetId,
        applied,
      }),
    )
  }, [updateWorkflow])

  const omitSlot = useCallback((slotId: DiscGuidedSlotId) => {
    updateWorkflow((currentWorkflow) =>
      omitDiscGuidedSlot(currentWorkflow, slotId).state,
    )
  }, [updateWorkflow])

  const restoreSlot = useCallback((slotId: DiscGuidedSlotId) => {
    updateWorkflow((currentWorkflow) =>
      restoreDiscGuidedSlot(currentWorkflow, slotId).state,
    )
  }, [updateWorkflow])

  const restoreAllSlots = useCallback(() => {
    updateWorkflow((currentWorkflow) =>
      restoreAllDiscGuidedSlots(currentWorkflow).state,
    )
  }, [updateWorkflow])

  const activeLayoutId = activePresetState
    ? getDiscGuidedLayoutIdForRolePreset(activePresetState.ref.id)
    : null

  const placeholders = createDiscGuidedPlaceholderViewModels({
    workflow,
    resolvedPreset: activePresetState?.resolvedDefinition ?? null,
    state,
    suggestions: NO_SUGGESTIONS,
  })
  const restoreItems = createDiscGuidedRestoreItems(workflow)

  return {
    activeLayoutId,
    placeholders,
    recordPresetApplication,
    omitSlot,
    restoreItems,
    restoreSlot,
    restoreAllSlots,
  }
}
