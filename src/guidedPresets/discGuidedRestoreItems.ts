import {
  getDiscGuidedLayoutDefinition,
} from './discGuidedLayouts.ts'
import type { DiscGuidedSlotId } from './discGuidedSlots.ts'
import type { DiscGuidedWorkflowState } from './discGuidedWorkflow.ts'

export type DiscGuidedRestoreItem = Readonly<{
  slotId: DiscGuidedSlotId
  label: string
}>

const NO_RESTORE_ITEMS = Object.freeze([]) as readonly DiscGuidedRestoreItem[]

export function createDiscGuidedRestoreItems(
  workflow: DiscGuidedWorkflowState,
): readonly DiscGuidedRestoreItem[] {
  if (!workflow.activeLayout || workflow.omittedSlotIds.length === 0) {
    return NO_RESTORE_ITEMS
  }

  const layout = getDiscGuidedLayoutDefinition(
    workflow.activeLayout.id,
    workflow.activeLayout.version,
  )

  if (!layout) return NO_RESTORE_ITEMS

  const omittedSlotIds = new Set(workflow.omittedSlotIds)

  return Object.freeze(layout.slotOrder.flatMap((slotId) => {
    const slot = layout.slots[slotId]

    return omittedSlotIds.has(slotId) && slot
      ? [Object.freeze({ slotId, label: slot.label })]
      : []
  }))
}
