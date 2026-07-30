import {
  commandFailed,
  commandSucceeded,
  type ApplicationCommandResult,
} from '../lifecycle/applicationCommandTypes.ts'
import type {
  ResumeProjectCommandOwner,
  ReturnHomeCommandOwner,
} from '../lifecycle/applicationLifecycleCommandPorts.ts'
import {
  resumeProjectSession,
  returnProjectSessionHome,
} from '../lifecycle/projectSession.ts'
import type {
  ApplicationWorkspaceDestination,
  PreparedApplicationWorkspaceNavigationApply,
} from './appWorkspaceNavigationApply.ts'

export type ApplicationWorkspaceNavigationRuntimeDependencies = Readonly<{
  prepareWorkspaceApply(
    destination: ApplicationWorkspaceDestination,
  ): PreparedApplicationWorkspaceNavigationApply
}>

type GetRuntimeDependencies =
  () => ApplicationWorkspaceNavigationRuntimeDependencies | null

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
    deduplicationKey: `workspace.navigation:${code}`,
  })
}

export function createApplicationWorkspaceNavigationCommandOwners(
  getRuntimeDependencies: GetRuntimeDependencies,
): Readonly<{
  returnHome: ReturnHomeCommandOwner
  resumeProject: ResumeProjectCommandOwner
}> {
  function getPreparedApply(
    destination: ApplicationWorkspaceDestination,
  ): ApplicationCommandResult<PreparedApplicationWorkspaceNavigationApply> {
    const dependencies = getRuntimeDependencies()
    if (!dependencies) {
      return failure(
        'workspace.navigation-runtime-unavailable',
        'Workspace navigation is not available yet.',
        'The React application boundary has not supplied workspace navigation dependencies.',
      )
    }

    try {
      return commandSucceeded(dependencies.prepareWorkspaceApply(destination))
    } catch (error) {
      return failure(
        'workspace.navigation-apply-preparation-failed',
        'The requested workspace could not be prepared.',
        error instanceof Error ? error.message : String(error),
        error,
      )
    }
  }

  const returnHome: ReturnHomeCommandOwner = Object.freeze({
    availability: 'implemented',
    executeReturnHome(context) {
      const latest = context.getCurrentStateSnapshot()
      const session = latest.state.activeSession
      if (!session || latest.state.visibleWorkspace === 'home') {
        return failure(
          'workspace.return-home-unavailable',
          'There is no visible project editor to return from.',
          'Return Home was invoked without an active visible editor session.',
        )
      }

      const prepared = getPreparedApply({ workspace: 'home' })
      if (prepared.status !== 'success') return prepared
      const commit = prepared.value.commitLifecycleAndApply(() =>
        context.commitState(latest.generation, returnProjectSessionHome))
      if (commit.status !== 'committed') {
        return failure(
          'workspace.return-home-stale-state',
          'The project workspace changed before Home could be shown.',
          `The lifecycle transition returned ${commit.status}.`,
        )
      }

      return commandSucceeded(undefined, {
        kind: 'status',
        message: 'Returned to Home. The current project is retained.',
        deduplicationKey:
          `workspace.return-home:${session.id}:${commit.snapshot.generation}`,
      })
    },
  })

  const resumeProject: ResumeProjectCommandOwner = Object.freeze({
    availability: 'implemented',
    executeResumeProject(context) {
      const latest = context.getCurrentStateSnapshot()
      const session = latest.state.activeSession
      if (!session || latest.state.visibleWorkspace !== 'home') {
        return failure(
          'project.resume-unavailable',
          'There is no retained Home project to resume.',
          'Resume was invoked without an active session retained on Home.',
        )
      }

      const destination = session.lastEditorRoute
      const prepared = getPreparedApply(destination)
      if (prepared.status !== 'success') return prepared
      const commit = prepared.value.commitLifecycleAndApply(() =>
        context.commitState(latest.generation, resumeProjectSession))
      if (commit.status !== 'committed') {
        return failure(
          'project.resume-stale-state',
          'The retained project changed before it could be resumed.',
          `The lifecycle transition returned ${commit.status}.`,
        )
      }

      return commandSucceeded(undefined, {
        kind: 'status',
        message: `Resumed ${session.displayName}.`,
        deduplicationKey:
          `project.resume:${session.id}:${commit.snapshot.generation}`,
      })
    },
  })

  return Object.freeze({ returnHome, resumeProject })
}
