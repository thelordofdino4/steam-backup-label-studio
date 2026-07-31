import {
  commandFailed,
  type ApplicationCommandCapability,
  type ApplicationCommandDefinition,
  type ApplicationCommandFeedbackPolicy,
  type ApplicationCommandOperationToken,
  type ApplicationCommandResult,
  type CommandBusyScope,
} from './applicationCommandTypes.ts'
import type {
  ApplicationLifecycleDefinitionContext,
} from './applicationLifecycleCommandDefinitions.ts'
import type {
  ApplicationLifecycleStateSnapshot,
} from './applicationLifecycleStateStore.ts'
import type { CommandBusyState } from './commandBusyScopes.ts'

const RETURN_ONLY_FEEDBACK = Object.freeze({
  success: 'return-only',
  cancelled: 'return-only',
  declined: 'return-only',
  failure: 'return-only',
} as const satisfies ApplicationCommandFeedbackPolicy)

const EXPORT_SCOPE = Object.freeze([
  'export.execution',
] as const satisfies readonly CommandBusyScope[])

type InactiveExportOwner = Readonly<{
  availability: 'unavailable' | 'unimplemented'
}>

export type ApplicationPngExportCapabilityContext = Readonly<{
  stateSnapshot: ApplicationLifecycleStateSnapshot
  busy: CommandBusyState
}>

export type ApplicationPngExportCommandOwner = InactiveExportOwner | Readonly<{
  availability: 'implemented'
  getCapability(
    context: ApplicationPngExportCapabilityContext,
  ): ApplicationCommandCapability
  executeExportPng(
    context: ApplicationLifecycleDefinitionContext,
    operation: ApplicationCommandOperationToken,
  ): Promise<ApplicationCommandResult<unknown>> | ApplicationCommandResult<unknown>
}>

function ownerUnavailableCapability(
  owner: ApplicationPngExportCommandOwner | undefined,
): ApplicationCommandCapability {
  return Object.freeze({
    canExecute: false,
    reasonCode: owner?.availability === 'unavailable'
      ? 'application.command-owner-unavailable'
      : 'application.command-owner-unimplemented',
  })
}

export function getApplicationPngExportCapability(
  owner: ApplicationPngExportCommandOwner | undefined,
  context: ApplicationPngExportCapabilityContext,
): ApplicationCommandCapability {
  if (owner?.availability !== 'implemented') {
    return ownerUnavailableCapability(owner)
  }
  try {
    return owner.getCapability(context)
  } catch {
    return Object.freeze({
      canExecute: false,
      reasonCode: 'export.capability-unavailable',
      userMessage: 'Export PNG is currently unavailable.',
    })
  }
}

export function createApplicationPngExportCommandDefinition(
  owner: ApplicationPngExportCommandOwner | undefined,
): ApplicationCommandDefinition<
  ApplicationLifecycleDefinitionContext,
  undefined,
  unknown
> {
  return Object.freeze({
    id: 'export.png',
    canExecute: (context) => context.capabilities['export.png'],
    acquireScopes: () => EXPORT_SCOPE,
    repeatPolicy: 'reject-while-busy',
    execute: (context, _input, operation) =>
      owner?.availability === 'implemented'
        ? owner.executeExportPng(context, operation)
        : commandFailed({
            code: 'application.command-owner-not-executable',
            userMessage: 'Export PNG is not available.',
            diagnosticMessage: 'No executable owner is available for export.png.',
            recoverable: true,
          }),
    feedbackPolicy: RETURN_ONLY_FEEDBACK,
  })
}
