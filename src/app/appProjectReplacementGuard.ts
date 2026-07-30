import {
  commandFailed,
  commandSucceeded,
  type ApplicationCommandOperationToken,
  type ApplicationCommandResult,
} from '../lifecycle/applicationCommandTypes.ts'
import type {
  ApplicationLifecycleCommandContext,
} from '../lifecycle/applicationLifecycleCommandPorts.ts'
import type { ApplicationLifecycleState } from '../lifecycle/projectSession.ts'
import { isProjectSessionDirty } from '../lifecycle/projectSession.ts'
import type { SaveProjectWithinOperation } from './appProjectSaveCommand.ts'

export type ProjectReplacementDecision = 'save' | 'discard' | 'cancel'

export type ProjectReplacementAuthorization =
  | Readonly<{ sessionId: null; revision: null }>
  | Readonly<{ sessionId: string; revision: number }>

export type ProjectReplacementPrompt = () =>
  Promise<ProjectReplacementDecision>

export type ApplicationProjectReplacementRuntimeDependencies = Readonly<{
  promptForReplacementDecision: ProjectReplacementPrompt
}>

type GetRuntimeDependencies =
  () => ApplicationProjectReplacementRuntimeDependencies | null

export type ProjectReplacementGuard = (
  context: ApplicationLifecycleCommandContext,
  operation: ApplicationCommandOperationToken,
) => Promise<ApplicationCommandResult<ProjectReplacementAuthorization>>

function authorizationFor(
  state: ApplicationLifecycleState,
): ProjectReplacementAuthorization {
  const session = state.activeSession
  return session
    ? Object.freeze({ sessionId: session.id, revision: session.revision })
    : Object.freeze({ sessionId: null, revision: null })
}

export function isProjectReplacementAuthorizationCurrent(
  state: ApplicationLifecycleState,
  authorization: ProjectReplacementAuthorization,
): boolean {
  const session = state.activeSession
  if (authorization.sessionId === null) return session === null
  return session?.id === authorization.sessionId &&
    session.revision === authorization.revision
}

function failure(
  code: string,
  userMessage: string,
  diagnosticMessage: string,
  cause?: unknown,
): ApplicationCommandResult<never> {
  return commandFailed({
    code,
    userMessage,
    diagnosticMessage,
    cause,
    recoverable: true,
  }, {
    kind: 'error',
    message: userMessage,
    deduplicationKey: `project.replacement:${code}`,
  })
}

function declined(): ApplicationCommandResult<never> {
  return Object.freeze({
    status: 'declined',
    reason: 'replacement-not-authorized',
  })
}

export function createProjectReplacementGuard(
  getRuntimeDependencies: GetRuntimeDependencies,
  saveProjectWithinOperation: SaveProjectWithinOperation,
): ProjectReplacementGuard {
  return async (context, operation) => {
    while (true) {
      const inspected = context.getCurrentStateSnapshot()
      const session = inspected.state.activeSession

      if (!session || !isProjectSessionDirty(session)) {
        return commandSucceeded(authorizationFor(inspected.state))
      }

      const dependencies = getRuntimeDependencies()
      if (!dependencies) {
        return failure(
          'project.replacement-dialog-unavailable',
          'Unsaved-change protection is not available yet.',
          'The React application boundary has not supplied replacement-dialog dependencies.',
        )
      }

      let decision: ProjectReplacementDecision
      try {
        decision = await operation.withScopes(
          ['dialog.project-replacement'],
          dependencies.promptForReplacementDecision,
        )
      } catch (error) {
        return failure(
          'project.replacement-dialog-failed',
          'The unsaved-changes dialog could not be opened.',
          error instanceof Error ? error.message : String(error),
          error,
        )
      }

      if (decision === 'cancel') return declined()

      if (decision === 'discard') {
        const latest = context.getCurrentStateSnapshot()
        if (
          latest.state.activeSession?.id !== session.id ||
          latest.state.activeSession.revision !== session.revision
        ) {
          continue
        }
        return commandSucceeded(authorizationFor(latest.state))
      }

      const saved = await saveProjectWithinOperation(context, operation)
      if (saved.status !== 'success') return saved

      const latest = context.getCurrentStateSnapshot()
      if (latest.state.activeSession?.id !== session.id) {
        return failure(
          'project.replacement-stale-session',
          'The active project changed while unsaved changes were being handled.',
          'The lifecycle session identity changed during the replacement guard.',
        )
      }
      if (!isProjectSessionDirty(latest.state.activeSession)) {
        return commandSucceeded(authorizationFor(latest.state))
      }

      // R was saved, but the authoritative session advanced to R+1. Loop back
      // through the same guard instead of treating those newer edits as saved.
    }
  }
}
