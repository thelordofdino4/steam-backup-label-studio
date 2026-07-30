import type { EditorProjectType } from '../editor/editorTypes.ts'
import {
  commandFailed,
  commandSucceeded,
  type ApplicationCommandOperationToken,
  type ApplicationCommandResult,
} from '../lifecycle/applicationCommandTypes.ts'
import type {
  ApplicationLifecycleCommandContext,
  NewCaseCommandOwner,
  NewDiscCommandOwner,
} from '../lifecycle/applicationLifecycleCommandPorts.ts'
import {
  captureNormalizedProjectSnapshot,
  getNormalizedProjectKind,
} from '../lifecycle/canonicalProject.ts'
import {
  createNewProjectSession,
} from '../lifecycle/projectSession.ts'
import type { SavedProject } from '../project/projectTypes.ts'
import type { ProjectReplacementGuard } from './appProjectReplacementGuard.ts'
import {
  isProjectReplacementAuthorizationCurrent,
} from './appProjectReplacementGuard.ts'
import type {
  PreparedNewProjectEditorApply,
} from './appProjectNewEditorApply.ts'

export type ApplicationProjectNewRuntimeDependencies = Readonly<{
  createBlankProject(kind: EditorProjectType): SavedProject
  prepareEditorApply(
    kind: EditorProjectType,
    project: SavedProject,
  ): PreparedNewProjectEditorApply
}>

type GetRuntimeDependencies =
  () => ApplicationProjectNewRuntimeDependencies | null

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
    deduplicationKey: `project.new:${code}`,
  })
}

function createNewProjectOwner(
  kind: EditorProjectType,
  getRuntimeDependencies: GetRuntimeDependencies,
  replacementGuard: ProjectReplacementGuard,
) {
  return async (
    context: Parameters<Extract<NewDiscCommandOwner, {
      availability: 'implemented'
    }>['executeNewDisc']>[0],
    operation: Parameters<Extract<NewDiscCommandOwner, {
      availability: 'implemented'
    }>['executeNewDisc']>[2],
  ): Promise<ApplicationCommandResult<void>> => {
    const dependencies = getRuntimeDependencies()
    if (!dependencies) {
      return failure(
        'project.new-runtime-unavailable',
        'New Project is not available yet.',
        'The React application boundary has not supplied New Project dependencies.',
      )
    }

    let project: ReturnType<typeof captureNormalizedProjectSnapshot>
    let prepared: PreparedNewProjectEditorApply
    try {
      project = captureNormalizedProjectSnapshot(
        dependencies.createBlankProject(kind),
      )
      if (getNormalizedProjectKind(project) !== kind) {
        return failure(
          'project.new-kind-mismatch',
          'The blank project could not be prepared.',
          `The blank project aggregate did not match ${kind}.`,
        )
      }
      prepared = dependencies.prepareEditorApply(
        kind,
        project as unknown as SavedProject,
      )
    } catch (error) {
      return failure(
        'project.new-preparation-failed',
        'The blank project could not be prepared.',
        error instanceof Error ? error.message : String(error),
        error,
      )
    }

    const guarded = await replacementGuard(context, operation)
    if (guarded.status !== 'success') return guarded

    const latest = context.getCurrentStateSnapshot()
    if (!isProjectReplacementAuthorizationCurrent(
      latest.state,
      guarded.value,
    )) {
      return failure(
        'project.new-stale-authorization',
        'The active project changed before it could be replaced.',
        'The final replacement authorization no longer matches the lifecycle session.',
      )
    }

    let commit
    try {
      commit = prepared.commitLifecycleAndApply(() =>
        context.commitState(latest.generation, (state) => {
          if (!isProjectReplacementAuthorizationCurrent(state, guarded.value)) {
            return state
          }
          return createNewProjectSession({
            sessionId: context.createSessionId(),
            project: project as unknown as SavedProject,
            lastEditorRoute: kind === 'disc'
              ? { workspace: 'disc' }
              : { workspace: 'caseInsert', surface: 'front' },
          })
        }))
    } catch (error) {
      return failure(
        'project.new-commit-failed',
        'The blank project could not be started.',
        error instanceof Error ? error.message : String(error),
        error,
      )
    }

    if (commit.status !== 'committed') {
      return failure(
        'project.new-stale-authorization',
        'The active project changed before it could be replaced.',
        `The lifecycle transition returned ${commit.status}.`,
      )
    }

    return commandSucceeded(undefined, {
      kind: 'success',
      message: kind === 'disc'
        ? 'Started a new blank disc project.'
        : 'Started a new blank case insert project.',
      deduplicationKey: `project.new:${commit.snapshot.state.activeSession?.id}`,
    })
  }
}

export function createApplicationProjectNewCommandOwners(
  getRuntimeDependencies: GetRuntimeDependencies,
  replacementGuard: ProjectReplacementGuard,
): Readonly<{
  newDisc: NewDiscCommandOwner
  newCase: NewCaseCommandOwner
}> {
  const executeDisc = createNewProjectOwner(
    'disc',
    getRuntimeDependencies,
    replacementGuard,
  )
  const executeCase = createNewProjectOwner(
    'caseInsert',
    getRuntimeDependencies,
    replacementGuard,
  )

  return Object.freeze({
    newDisc: Object.freeze({
      availability: 'implemented' as const,
      executeNewDisc(
        context: ApplicationLifecycleCommandContext,
        _input: undefined,
        operation: ApplicationCommandOperationToken,
      ) {
        return executeDisc(context, operation)
      },
    }),
    newCase: Object.freeze({
      availability: 'implemented' as const,
      executeNewCase(
        context: ApplicationLifecycleCommandContext,
        _input: undefined,
        operation: ApplicationCommandOperationToken,
      ) {
        return executeCase(context, operation)
      },
    }),
  })
}
