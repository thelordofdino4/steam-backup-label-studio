import {
  EDITOR_WORKFLOW_IDS,
  validateEditorNavigationDestination,
  type EditorNavigationIntent,
  type EditorWorkflowId,
} from '../editor/editorNavigationRouter.ts'
import {
  APPLICATION_MENU_DESCRIPTOR_REGISTRY,
  resolveApplicationMenuWorkflowDestination,
} from './applicationMenuRegistry.ts'
import {
  APPLICATION_MENU_RESERVED_ITEM_IDS,
  type ApplicationMenuDescriptorRegistry,
  type ApplicationMenuItemId,
  type ApplicationMenuPhysicalProjectTarget,
} from './applicationMenuTypes.ts'

const workflowIds = new Set<string>(EDITOR_WORKFLOW_IDS)
const reservedItemIds = new Set<string>(APPLICATION_MENU_RESERVED_ITEM_IDS)

export type ApplicationMenuWorkflowResolution =
  | Readonly<{
      status: 'resolved'
      itemId: ApplicationMenuItemId
      intent: EditorNavigationIntent
    }>
  | Readonly<{
      status: 'rejected'
      reason:
        | 'invalid-item-id'
        | 'reserved-item'
        | 'unknown-item'
        | 'not-first-release'
        | 'non-tools-item'
        | 'wrong-routing-owner'
        | 'non-workflow-target'
        | 'unknown-workflow'
        | 'destination-unavailable'
        | 'invalid-destination'
    }>

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Resolves a Tools presentation item through the authoritative descriptor.
 * No item-to-workflow map exists here; descriptors remain the sole mapping.
 */
export function resolveApplicationMenuWorkflow(
  itemId: unknown,
  physicalTarget: ApplicationMenuPhysicalProjectTarget | null,
  registry: ApplicationMenuDescriptorRegistry =
    APPLICATION_MENU_DESCRIPTOR_REGISTRY,
): ApplicationMenuWorkflowResolution {
  if (typeof itemId !== 'string' || itemId.length === 0) {
    return Object.freeze({ status: 'rejected', reason: 'invalid-item-id' })
  }
  if (reservedItemIds.has(itemId)) {
    return Object.freeze({ status: 'rejected', reason: 'reserved-item' })
  }

  const descriptor = registry.items.find((item) => item.id === itemId)
  if (!descriptor) {
    return Object.freeze({ status: 'rejected', reason: 'unknown-item' })
  }
  if (descriptor.release !== 'first-release') {
    return Object.freeze({ status: 'rejected', reason: 'not-first-release' })
  }
  if (descriptor.parentMenuId !== 'menu.tools') {
    return Object.freeze({ status: 'rejected', reason: 'non-tools-item' })
  }
  if (!isRecord(descriptor.semanticTarget)) {
    return Object.freeze({ status: 'rejected', reason: 'non-workflow-target' })
  }
  if (descriptor.semanticTarget.kind !== 'workflow-navigation') {
    return Object.freeze({ status: 'rejected', reason: 'non-workflow-target' })
  }
  if (
    descriptor.semanticClass !== 'workflow-launcher' ||
    descriptor.eventRoutingOwner !== 'editor-navigation-router'
  ) {
    return Object.freeze({ status: 'rejected', reason: 'wrong-routing-owner' })
  }

  const workflowId = descriptor.semanticTarget.workflowId
  if (typeof workflowId !== 'string' || !workflowIds.has(workflowId)) {
    return Object.freeze({ status: 'rejected', reason: 'unknown-workflow' })
  }
  const destination = resolveApplicationMenuWorkflowDestination(
    descriptor.semanticTarget,
    physicalTarget,
  )
  if (!destination) {
    return Object.freeze({
      status: 'rejected',
      reason: 'destination-unavailable',
    })
  }

  const intent = Object.freeze({
    workflowId: workflowId as EditorWorkflowId,
    behavior: descriptor.semanticTarget.behavior,
    destination,
  }) satisfies EditorNavigationIntent
  if (validateEditorNavigationDestination(intent).status !== 'ready') {
    return Object.freeze({ status: 'rejected', reason: 'invalid-destination' })
  }

  return Object.freeze({ status: 'resolved', itemId: descriptor.id, intent })
}
