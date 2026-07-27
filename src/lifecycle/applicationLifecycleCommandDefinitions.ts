import {
  APPLICATION_LIFECYCLE_COMMAND_IDS,
  commandFailed,
  type ApplicationCommandCapability,
  type ApplicationCommandDefinition,
  type ApplicationCommandFeedbackPolicy,
  type ApplicationCommandId,
  type ApplicationCommandResult,
  type CommandBusyScope,
} from './applicationCommandTypes.ts'
import type {
  ApplicationLifecycleCommandContext,
  ApplicationLifecycleCommandPorts,
} from './applicationLifecycleCommandPorts.ts'

const RETURN_ONLY_FEEDBACK = Object.freeze({
  success: 'return-only',
  cancelled: 'return-only',
  declined: 'return-only',
  failure: 'return-only',
} as const satisfies ApplicationCommandFeedbackPolicy)

const LIFECYCLE_SCOPE = Object.freeze([
  'lifecycle.transition',
] as const satisfies readonly CommandBusyScope[])

const OPEN_SCOPES = Object.freeze([
  'lifecycle.transition',
  'dialog.project-file',
  'persistence.read',
] as const satisfies readonly CommandBusyScope[])

const SAVE_SCOPES = Object.freeze([
  'lifecycle.transition',
  'persistence.write',
] as const satisfies readonly CommandBusyScope[])

const PATHLESS_SAVE_SCOPES = Object.freeze([
  'lifecycle.transition',
  'dialog.project-file',
  'persistence.write',
] as const satisfies readonly CommandBusyScope[])

const WORKSPACE_SCOPES = Object.freeze([
  'workspace.navigation',
] as const satisfies readonly CommandBusyScope[])

const TERMINATION_SCOPES = Object.freeze([
  'lifecycle.transition',
  'application.termination',
] as const satisfies readonly CommandBusyScope[])

function unavailableOwnerResult(
  commandId: ApplicationCommandId,
): ApplicationCommandResult<never> {
  return commandFailed({
    code: 'application.command-owner-not-executable',
    userMessage: 'The command is not available.',
    diagnosticMessage: `No executable owner is available for ${commandId}.`,
    recoverable: true,
  })
}

type DefinitionContext = ApplicationLifecycleCommandContext & Readonly<{
  capabilities: Readonly<Record<ApplicationCommandId, ApplicationCommandCapability>>
}>

export type ApplicationLifecycleDefinitionContext = DefinitionContext

type RootLifecycleCommandDefinition = ApplicationCommandDefinition<
  DefinitionContext,
  undefined,
  void
>

function rootDefinition(
  id: ApplicationCommandId,
  acquireScopes: RootLifecycleCommandDefinition['acquireScopes'],
  execute: RootLifecycleCommandDefinition['execute'],
): RootLifecycleCommandDefinition {
  return Object.freeze({
    id,
    canExecute: (context) => context.capabilities[id],
    acquireScopes,
    repeatPolicy: 'reject-while-busy',
    execute,
    feedbackPolicy: RETURN_ONLY_FEEDBACK,
  })
}

function executeUnavailable(
  commandId: ApplicationCommandId,
) {
  return unavailableOwnerResult(commandId)
}

export function createApplicationLifecycleCommandDefinitions(
  ports: ApplicationLifecycleCommandPorts,
): readonly RootLifecycleCommandDefinition[] {
  const definitionsById: Readonly<Record<
    ApplicationCommandId,
    RootLifecycleCommandDefinition
  >> = Object.freeze({
    'project.new-disc': rootDefinition(
      'project.new-disc',
      () => LIFECYCLE_SCOPE,
      (context, _input, operation) =>
        ports.newDisc?.availability === 'implemented'
          ? ports.newDisc.executeNewDisc(context, undefined, operation)
          : executeUnavailable('project.new-disc'),
    ),
    'project.new-case': rootDefinition(
      'project.new-case',
      () => LIFECYCLE_SCOPE,
      (context, _input, operation) =>
        ports.newCase?.availability === 'implemented'
          ? ports.newCase.executeNewCase(context, undefined, operation)
          : executeUnavailable('project.new-case'),
    ),
    'project.open': rootDefinition(
      'project.open',
      () => OPEN_SCOPES,
      (context, _input, operation) =>
        ports.openProject?.availability === 'implemented'
          ? ports.openProject.executeOpenProject(context, undefined, operation)
          : executeUnavailable('project.open'),
    ),
    'project.save': rootDefinition(
      'project.save',
      (context) => context.stateSnapshot.state.activeSession?.currentPath
        ? SAVE_SCOPES
        : PATHLESS_SAVE_SCOPES,
      (context, _input, operation) =>
        ports.saveProject?.availability === 'implemented'
          ? ports.saveProject.executeSaveProject(context, undefined, operation)
          : executeUnavailable('project.save'),
    ),
    'project.save-as': rootDefinition(
      'project.save-as',
      () => PATHLESS_SAVE_SCOPES,
      (context, _input, operation) =>
        ports.saveProjectAs?.availability === 'implemented'
          ? ports.saveProjectAs.executeSaveProjectAs(
              context,
              undefined,
              operation,
            )
          : executeUnavailable('project.save-as'),
    ),
    'workspace.return-home': rootDefinition(
      'workspace.return-home',
      () => WORKSPACE_SCOPES,
      (context, _input, operation) =>
        ports.returnHome?.availability === 'implemented'
          ? ports.returnHome.executeReturnHome(context, undefined, operation)
          : executeUnavailable('workspace.return-home'),
    ),
    'project.resume': rootDefinition(
      'project.resume',
      () => WORKSPACE_SCOPES,
      (context, _input, operation) =>
        ports.resumeProject?.availability === 'implemented'
          ? ports.resumeProject.executeResumeProject(context, undefined, operation)
          : executeUnavailable('project.resume'),
    ),
    'project.close': rootDefinition(
      'project.close',
      () => LIFECYCLE_SCOPE,
      (context, _input, operation) =>
        ports.closeProject?.availability === 'implemented'
          ? ports.closeProject.executeCloseProject(context, undefined, operation)
          : executeUnavailable('project.close'),
    ),
    'application.close-window': rootDefinition(
      'application.close-window',
      () => TERMINATION_SCOPES,
      (context, _input, operation) =>
        ports.closeWindow?.availability === 'implemented'
          ? ports.closeWindow.executeCloseWindow(context, undefined, operation)
          : executeUnavailable('application.close-window'),
    ),
    'application.quit': rootDefinition(
      'application.quit',
      () => TERMINATION_SCOPES,
      (context, _input, operation) =>
        ports.quitApplication?.availability === 'implemented'
          ? ports.quitApplication.executeQuitApplication(
              context,
              undefined,
              operation,
            )
          : executeUnavailable('application.quit'),
    ),
  })

  return Object.freeze(
    APPLICATION_LIFECYCLE_COMMAND_IDS.map((id) => definitionsById[id]),
  )
}
