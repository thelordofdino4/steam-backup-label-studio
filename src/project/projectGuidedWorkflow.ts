import {
  INITIAL_DISC_GUIDED_WORKFLOW_STATE,
  normalizeDiscGuidedWorkflowState,
  type DiscGuidedWorkflowState,
} from '../guidedPresets/discGuidedWorkflow.ts'
import type { SavedDiscGuidedLayoutState } from './projectTypes.ts'

type UnknownRecord = Record<string, unknown>

function asRecord(value: unknown): UnknownRecord | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as UnknownRecord
    : null
}

export function createSavedDiscGuidedLayout(
  workflow: DiscGuidedWorkflowState,
): SavedDiscGuidedLayoutState | null {
  const normalized = normalizeDiscGuidedWorkflowState(workflow)

  if (!normalized.activeLayout) return null

  return {
    id: normalized.activeLayout.id,
    version: normalized.activeLayout.version,
    omittedSlotIds: [...normalized.omittedSlotIds],
    completedSlotIds: [...normalized.completedSlotIds],
  }
}

export function restoreSavedDiscGuidedWorkflow(
  editor: unknown,
): DiscGuidedWorkflowState {
  const guidedLayout = asRecord(asRecord(editor)?.guidedLayout)

  if (!guidedLayout) return INITIAL_DISC_GUIDED_WORKFLOW_STATE

  return normalizeDiscGuidedWorkflowState({
    activeLayout: {
      id: guidedLayout.id,
      version: guidedLayout.version,
    },
    omittedSlotIds: guidedLayout.omittedSlotIds,
    completedSlotIds: guidedLayout.completedSlotIds,
  })
}
