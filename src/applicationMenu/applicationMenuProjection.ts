import type { ApplicationCommandCapability } from '../lifecycle/applicationCommandTypes.ts'
import {
  type ApplicationMenuCapabilityBoundaryId,
  type ApplicationMenuItemProjection,
  type ApplicationMenuOwnerCapabilities,
  type ApplicationMenuPlatformDescriptor,
  type ApplicationMenuPlatformItemDescriptor,
  type ApplicationMenuProjection,
  type ApplicationMenuProjectionContext,
} from './applicationMenuTypes.ts'
import { resolveApplicationMenuWorkflowDestination } from './applicationMenuRegistry.ts'

const ENABLED_CAPABILITY = Object.freeze({
  canExecute: true,
} as const satisfies ApplicationCommandCapability)

function disabledCapability(reasonCode: string): ApplicationCommandCapability {
  return Object.freeze({ canExecute: false, reasonCode })
}

function capabilityBoundary(
  item: ApplicationMenuPlatformItemDescriptor,
): ApplicationMenuCapabilityBoundaryId {
  switch (item.semanticTarget.kind) {
    case 'lifecycle-command':
      return 'lifecycle'
    case 'domain-command':
      return 'export'
    case 'workflow-navigation':
      return 'workflow-navigation'
    case 'focused-edit':
      return 'focused-edit'
    case 'native-window':
      return 'native-window'
    case 'informational':
      return 'informational'
  }
}

function injectedOwnerCapability(
  item: ApplicationMenuPlatformItemDescriptor,
  capabilities: ApplicationMenuOwnerCapabilities,
): ApplicationCommandCapability {
  switch (item.semanticTarget.kind) {
    case 'lifecycle-command':
      return capabilities.lifecycle[item.semanticTarget.commandId]
    case 'domain-command':
      return capabilities.exportPng
    case 'workflow-navigation':
      return capabilities.workflowNavigation[item.semanticTarget.workflowId]
    case 'focused-edit':
      return capabilities.focusedEdit[item.semanticTarget.operationId]
    case 'native-window':
      return capabilities.nativeWindow[item.semanticTarget.operationId]
    case 'informational':
      return capabilities.informational[item.semanticTarget.operationId]
  }
}

function workflowCompatibilityCapability(
  item: ApplicationMenuPlatformItemDescriptor,
  context: ApplicationMenuProjectionContext,
): ApplicationCommandCapability {
  if (item.semanticTarget.kind !== 'workflow-navigation') {
    return ENABLED_CAPABILITY
  }
  if (context.workspace === 'home') {
    return disabledCapability('workflow.no-active-editor')
  }
  if (!context.sessionId) {
    return disabledCapability('project.no-active-session')
  }

  const destination = resolveApplicationMenuWorkflowDestination(
    item.semanticTarget,
    context.physicalProjectTarget,
  )
  if (!destination) {
    return disabledCapability(
      context.workspace === 'case'
        ? 'editor-incompatible'
        : 'workflow.destination-unavailable',
    )
  }

  const destinationWorkspace = destination.workspaceId === 'workspace.disc'
    ? 'disc'
    : 'case'
  return destinationWorkspace === context.workspace
    ? ENABLED_CAPABILITY
    : disabledCapability('editor-incompatible')
}

function liveWindowCapability(
  item: ApplicationMenuPlatformItemDescriptor,
  context: ApplicationMenuProjectionContext,
): ApplicationCommandCapability {
  return item.semanticTarget.kind === 'native-window' && !context.window.live
    ? disabledCapability('native.window-unavailable')
    : ENABLED_CAPABILITY
}

function projectedCapability(
  item: ApplicationMenuPlatformItemDescriptor,
  context: ApplicationMenuProjectionContext,
): ApplicationCommandCapability {
  const ownerCapability = injectedOwnerCapability(item, context.capabilities)
  if (!ownerCapability.canExecute) return ownerCapability

  const workflowCapability = workflowCompatibilityCapability(item, context)
  if (!workflowCapability.canExecute) return workflowCapability

  const windowCapability = liveWindowCapability(item, context)
  if (!windowCapability.canExecute) return windowCapability

  return context.capabilities.exclusiveBoundaries?.[capabilityBoundary(item)] ??
    ENABLED_CAPABILITY
}

function dynamicLabel(
  item: ApplicationMenuPlatformItemDescriptor,
  context: ApplicationMenuProjectionContext,
): string | undefined {
  switch (item.dynamicLabelPolicy) {
    case 'static':
      return undefined
    case 'maximize-restore':
      if (context.platform === 'macos') return 'Zoom'
      return context.window.maximized ? 'Restore' : 'Maximize'
    case 'fullscreen':
      return context.window.fullscreen
        ? 'Exit Full Screen'
        : 'Enter Full Screen'
  }
}

function projectItem(
  item: ApplicationMenuPlatformItemDescriptor,
  context: ApplicationMenuProjectionContext,
): ApplicationMenuItemProjection {
  const capability = projectedCapability(item, context)
  const label = dynamicLabel(item, context)
  return Object.freeze({
    itemId: item.itemId,
    enabled: capability.canExecute,
    checked: false,
    visible: true,
    ...(label === undefined ? {} : { label }),
    ...(capability.canExecute
      ? {}
      : { unavailableReason: capability.reasonCode }),
  })
}

export function projectApplicationMenuCapabilities(
  descriptor: ApplicationMenuPlatformDescriptor,
  context: ApplicationMenuProjectionContext,
): ApplicationMenuProjection {
  if (descriptor.platform !== context.platform) {
    throw new Error(
      `Menu platform ${descriptor.platform} does not match projection ` +
      `platform ${context.platform}.`,
    )
  }
  if (!Number.isSafeInteger(context.generation) || context.generation < 0) {
    throw new Error('Application menu projection generation must be non-negative.')
  }
  if (context.window.windowLabel.length === 0) {
    throw new Error('Application menu projection requires a window label.')
  }

  return Object.freeze({
    generation: context.generation,
    platform: context.platform,
    windowLabel: context.window.windowLabel,
    ...(context.sessionId === undefined
      ? {}
      : { sessionId: context.sessionId }),
    workspace: context.workspace,
    items: Object.freeze(descriptor.items.map((item) =>
      projectItem(item, context))),
  })
}
