import {
  getDiscGuidedLayoutDefinition,
} from './discGuidedLayouts.ts'
import type { DiscGuidedSlotId } from './discGuidedSlots.ts'
import type { DiscGuidedWorkflowState } from './discGuidedWorkflow.ts'

export type DiscGuidedProgressItem = Readonly<{
  slotId: DiscGuidedSlotId
  label: string
}>

export type DiscGuidedProgressItems = Readonly<{
  removedItems: readonly DiscGuidedProgressItem[]
  completedItems: readonly DiscGuidedProgressItem[]
}>

// Retain the original type name for callers that still consume only omission
// restoration. Both lists now share the same canonical projection contract.
export type DiscGuidedRestoreItem = DiscGuidedProgressItem

const NO_PROGRESS_ITEM_LIST = Object.freeze(
  [],
) as readonly DiscGuidedProgressItem[]
const NO_PROGRESS_ITEMS = Object.freeze({
  removedItems: NO_PROGRESS_ITEM_LIST,
  completedItems: NO_PROGRESS_ITEM_LIST,
}) satisfies DiscGuidedProgressItems

export function createDiscGuidedProgressItems(
  workflow: DiscGuidedWorkflowState,
): DiscGuidedProgressItems {
  if (!workflow.activeLayout) {
    return NO_PROGRESS_ITEMS
  }

  const layout = getDiscGuidedLayoutDefinition(
    workflow.activeLayout.id,
    workflow.activeLayout.version,
  )

  if (!layout) return NO_PROGRESS_ITEMS

  const omittedSlotIds = new Set(workflow.omittedSlotIds)
  const completedSlotIds = new Set(workflow.completedSlotIds)
  const removedItems: DiscGuidedProgressItem[] = []
  const completedItems: DiscGuidedProgressItem[] = []

  for (const slotId of layout.slotOrder) {
    const slot = layout.slots[slotId]

    if (!slot) continue

    const item = Object.freeze({ slotId, label: slot.label })

    if (omittedSlotIds.has(slotId)) {
      removedItems.push(item)
    }

    if (completedSlotIds.has(slotId)) {
      completedItems.push(item)
    }
  }

  if (removedItems.length === 0 && completedItems.length === 0) {
    return NO_PROGRESS_ITEMS
  }

  return Object.freeze({
    removedItems: removedItems.length === 0
      ? NO_PROGRESS_ITEM_LIST
      : Object.freeze(removedItems),
    completedItems: completedItems.length === 0
      ? NO_PROGRESS_ITEM_LIST
      : Object.freeze(completedItems),
  })
}

export function createDiscGuidedRestoreItems(
  workflow: DiscGuidedWorkflowState,
): readonly DiscGuidedRestoreItem[] {
  return createDiscGuidedProgressItems(workflow).removedItems
}
