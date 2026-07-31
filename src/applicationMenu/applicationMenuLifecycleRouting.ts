import {
  APPLICATION_LIFECYCLE_COMMAND_IDS,
  type ApplicationCommandDispatchResult,
  type ApplicationCommandId,
  type ApplicationLifecycleCommandId,
} from '../lifecycle/applicationCommandTypes.ts'
import type {
  ApplicationLifecycleCompositionRoot,
} from '../lifecycle/applicationLifecycleCompositionRoot.ts'
import {
  APPLICATION_MENU_DESCRIPTOR_REGISTRY,
} from './applicationMenuRegistry.ts'
import {
  APPLICATION_MENU_RESERVED_ITEM_IDS,
  type ApplicationMenuDescriptorRegistry,
  type ApplicationMenuItemId,
} from './applicationMenuTypes.ts'

export const CONNECTED_FILE_LIFECYCLE_COMMAND_IDS = Object.freeze([
  'project.new-disc',
  'project.new-case',
  'project.open',
  'project.save',
  'project.save-as',
  'workspace.return-home',
  'project.resume',
] as const satisfies readonly ApplicationLifecycleCommandId[])

export const CONNECTED_FILE_APPLICATION_COMMAND_IDS = Object.freeze([
  ...CONNECTED_FILE_LIFECYCLE_COMMAND_IDS,
  'export.png',
] as const satisfies readonly ApplicationCommandId[])

type ConnectedFileApplicationCommandId =
  typeof CONNECTED_FILE_APPLICATION_COMMAND_IDS[number]

const connectedCommandIds = new Set<string>(
  CONNECTED_FILE_APPLICATION_COMMAND_IDS,
)
const lifecycleCommandIds = new Set<string>(APPLICATION_LIFECYCLE_COMMAND_IDS)
const reservedItemIds = new Set<string>(APPLICATION_MENU_RESERVED_ITEM_IDS)

export type ApplicationMenuCommandResolution =
  | Readonly<{
      status: 'resolved'
      itemId: ApplicationMenuItemId
      commandId: ConnectedFileApplicationCommandId
    }>
  | Readonly<{
      status: 'rejected'
      reason:
        | 'invalid-item-id'
        | 'reserved-item'
        | 'unknown-item'
        | 'not-first-release'
        | 'non-file-item'
        | 'wrong-routing-owner'
        | 'non-lifecycle-target'
        | 'unknown-lifecycle-command'
        | 'lifecycle-command-not-connected'
    }>

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Resolves presentation input through the authoritative descriptor. The
 * connected command list bounds this slice; it is not an item-to-command map.
 */
export function resolveApplicationMenuCommand(
  itemId: unknown,
  registry: ApplicationMenuDescriptorRegistry =
    APPLICATION_MENU_DESCRIPTOR_REGISTRY,
): ApplicationMenuCommandResolution {
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
  if (descriptor.parentMenuId !== 'menu.file') {
    return Object.freeze({ status: 'rejected', reason: 'non-file-item' })
  }
  if (!isRecord(descriptor.semanticTarget)) {
    return Object.freeze({ status: 'rejected', reason: 'non-lifecycle-target' })
  }
  if (
    descriptor.semanticTarget.kind !== 'lifecycle-command' &&
    descriptor.semanticTarget.kind !== 'domain-command'
  ) {
    return Object.freeze({ status: 'rejected', reason: 'non-lifecycle-target' })
  }

  const isLifecycle =
    descriptor.eventRoutingOwner === 'application-command-dispatcher' &&
    descriptor.semanticTarget.kind === 'lifecycle-command'
  const isExport =
    descriptor.eventRoutingOwner === 'domain-command-dispatcher' &&
    descriptor.semanticTarget.kind === 'domain-command' &&
    descriptor.semanticTarget.commandId === 'export.png'
  if (!isLifecycle && !isExport) {
    return Object.freeze({ status: 'rejected', reason: 'wrong-routing-owner' })
  }

  const commandId = descriptor.semanticTarget.commandId
  if (
    typeof commandId !== 'string' ||
    (commandId !== 'export.png' && !lifecycleCommandIds.has(commandId))
  ) {
    return Object.freeze({
      status: 'rejected',
      reason: 'unknown-lifecycle-command',
    })
  }
  if (!connectedCommandIds.has(commandId)) {
    return Object.freeze({
      status: 'rejected',
      reason: 'lifecycle-command-not-connected',
    })
  }

  return Object.freeze({
    status: 'resolved',
    itemId: descriptor.id,
    commandId: commandId as ConnectedFileApplicationCommandId,
  })
}

export type ApplicationMenuCommandDispatchResult =
  | Extract<ApplicationMenuCommandResolution, { status: 'rejected' }>
  | Readonly<{
      status: 'dispatched'
      itemId: ApplicationMenuItemId
      commandId: ConnectedFileApplicationCommandId
      dispatch: ApplicationCommandDispatchResult<unknown>
    }>

/** Dispatches exactly once through the supplied lifecycle root. */
export async function dispatchApplicationMenuCommand(
  itemId: unknown,
  lifecycle: Pick<ApplicationLifecycleCompositionRoot, 'dispatch'>,
): Promise<ApplicationMenuCommandDispatchResult> {
  const resolution = resolveApplicationMenuCommand(itemId)
  if (resolution.status === 'rejected') return resolution

  const dispatch = await lifecycle.dispatch<unknown>(resolution.commandId)
  return Object.freeze({
    status: 'dispatched',
    itemId: resolution.itemId,
    commandId: resolution.commandId,
    dispatch,
  })
}
