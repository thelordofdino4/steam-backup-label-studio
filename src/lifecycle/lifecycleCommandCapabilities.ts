import type { ApplicationLifecycleState } from './projectSession.ts'
import {
  type ApplicationCommandCapability,
  type ApplicationCommandId,
  type CommandBusyScope,
} from './applicationCommandTypes.ts'
import {
  hasBusyScopeConflict,
  type CommandBusyState,
} from './commandBusyScopes.ts'

export type NativeTerminationHandoffState =
  | 'available'
  | 'unavailable'
  | 'unimplemented'

export type ApplicationTerminationCapabilities = Readonly<{
  closeWindow: NativeTerminationHandoffState
  quit: NativeTerminationHandoffState
}>

export type LifecycleCommandCapabilityContext = Readonly<{
  lifecycle: ApplicationLifecycleState
  busy: CommandBusyState
  termination: ApplicationTerminationCapabilities
}>

const LIFECYCLE_SCOPE = Object.freeze([
  'lifecycle.transition',
] as const satisfies readonly CommandBusyScope[])

const WORKSPACE_SCOPE = Object.freeze([
  'workspace.navigation',
] as const satisfies readonly CommandBusyScope[])

const TERMINATION_SCOPES = Object.freeze([
  'lifecycle.transition',
  'application.termination',
] as const satisfies readonly CommandBusyScope[])

function enabled(): ApplicationCommandCapability {
  return Object.freeze({ canExecute: true })
}

function disabled(
  reason: string,
  userMessage?: string,
): ApplicationCommandCapability {
  return Object.freeze({ canExecute: false, reasonCode: reason, userMessage })
}

function requireAvailableScopes(
  scopes: readonly CommandBusyScope[],
  busy: CommandBusyState,
): ApplicationCommandCapability | null {
  return hasBusyScopeConflict(scopes, busy)
    ? disabled('application.command-busy')
    : null
}

function requireActiveSession(
  context: LifecycleCommandCapabilityContext,
): ApplicationCommandCapability | null {
  return context.lifecycle.activeSession
    ? null
    : disabled('project.no-active-session')
}

function terminationCapability(
  handoff: NativeTerminationHandoffState,
  busy: CommandBusyState,
): ApplicationCommandCapability {
  const busyCapability = requireAvailableScopes(TERMINATION_SCOPES, busy)
  if (busyCapability) return busyCapability

  if (handoff === 'unimplemented') {
    return disabled('application.termination-not-implemented')
  }
  if (handoff === 'unavailable') {
    return disabled('application.termination-unavailable')
  }
  return enabled()
}

export function getLifecycleCommandCapability(
  context: LifecycleCommandCapabilityContext,
  commandId: ApplicationCommandId,
): ApplicationCommandCapability {
  switch (commandId) {
    case 'project.new-disc':
    case 'project.new-case':
    case 'project.open':
      return requireAvailableScopes(LIFECYCLE_SCOPE, context.busy) ?? enabled()

    case 'project.save':
    case 'project.save-as':
    case 'project.close':
      return requireActiveSession(context) ??
        requireAvailableScopes(LIFECYCLE_SCOPE, context.busy) ??
        enabled()

    case 'workspace.return-home':
      return requireActiveSession(context) ??
        (context.lifecycle.visibleWorkspace === 'home'
          ? disabled('workspace.already-home')
          : requireAvailableScopes(WORKSPACE_SCOPE, context.busy) ?? enabled())

    case 'project.resume':
      return requireActiveSession(context) ??
        (context.lifecycle.visibleWorkspace !== 'home'
          ? disabled('workspace.editor-already-visible')
          : requireAvailableScopes(WORKSPACE_SCOPE, context.busy) ?? enabled())

    case 'application.close-window':
      return terminationCapability(context.termination.closeWindow, context.busy)

    case 'application.quit':
      return terminationCapability(context.termination.quit, context.busy)
  }
}

export function projectLifecycleCommandCapabilities(
  context: LifecycleCommandCapabilityContext,
): Readonly<Record<ApplicationCommandId, ApplicationCommandCapability>> {
  return Object.freeze({
    'project.new-disc': getLifecycleCommandCapability(context, 'project.new-disc'),
    'project.new-case': getLifecycleCommandCapability(context, 'project.new-case'),
    'project.open': getLifecycleCommandCapability(context, 'project.open'),
    'project.save': getLifecycleCommandCapability(context, 'project.save'),
    'project.save-as': getLifecycleCommandCapability(context, 'project.save-as'),
    'workspace.return-home': getLifecycleCommandCapability(
      context,
      'workspace.return-home',
    ),
    'project.resume': getLifecycleCommandCapability(context, 'project.resume'),
    'project.close': getLifecycleCommandCapability(context, 'project.close'),
    'application.close-window': getLifecycleCommandCapability(
      context,
      'application.close-window',
    ),
    'application.quit': getLifecycleCommandCapability(context, 'application.quit'),
  })
}
