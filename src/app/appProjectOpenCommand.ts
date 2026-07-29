import {
  commandFailed,
  commandSucceeded,
  type ApplicationCommandResult,
} from '../lifecycle/applicationCommandTypes.ts'
import type {
  OpenProjectCommandOwner,
} from '../lifecycle/applicationLifecycleCommandPorts.ts'
import { createLoadedProjectSession } from '../lifecycle/projectSession.ts'
import type {
  PreparedApplicationEditorAggregateApply,
} from './appProjectRestore.ts'
import type {
  StagedProjectOpenCandidate,
} from './appProjectLoad.ts'
import type { SavedProject } from '../project/projectTypes.ts'

export type ApplicationProjectOpenRuntimeDependencies = Readonly<{
  stageCandidate(): Promise<ApplicationCommandResult<StagedProjectOpenCandidate>>
  prepareEditorAggregateApply(
    candidate: StagedProjectOpenCandidate,
  ): ApplicationCommandResult<PreparedApplicationEditorAggregateApply>
}>

type GetRuntimeDependencies =
  () => ApplicationProjectOpenRuntimeDependencies | null

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
  })
}

export function createApplicationProjectOpenCommandOwner(
  getRuntimeDependencies: GetRuntimeDependencies,
): OpenProjectCommandOwner {
  return Object.freeze({
    availability: 'implemented',
    async executeOpenProject(context) {
      const dependencies = getRuntimeDependencies()
      if (!dependencies) {
        return failure(
          'project.open-runtime-unavailable',
          'Open Project is not available yet.',
          'The React application boundary has not supplied Open dependencies.',
        )
      }

      const staged = await dependencies.stageCandidate()
      if (staged.status !== 'success') return staged

      const candidate = staged.value
      const latestSnapshot = context.getCurrentStateSnapshot()

      if (latestSnapshot.state.activeSession) {
        return failure(
          'project.open-replacement-guard-unimplemented',
          'Opening another project is unavailable until unsaved-change protection is ready.',
          'A lifecycle-backed session exists, but the dirty-aware replacement guard is not implemented.',
        )
      }

      let prepared: ApplicationCommandResult<
        PreparedApplicationEditorAggregateApply
      >
      try {
        prepared = dependencies.prepareEditorAggregateApply(candidate)
      } catch (error) {
        return failure(
          'project.open-editor-apply-preparation-failed',
          'The opened project could not be prepared for the editor.',
          error instanceof Error ? error.message : String(error),
          error,
        )
      }
      if (prepared.status !== 'success') return prepared

      let commit
      try {
        commit = prepared.value.commitLifecycleAndApply(() =>
          context.commitState(
            latestSnapshot.generation,
            () => createLoadedProjectSession({
              sessionId: context.createSessionId(),
              // The canonical snapshot is schema-validated and cloned again by
              // createLoadedProjectSession; this cast only bridges mutable legacy
              // project typings to the immutable lifecycle representation.
              project: candidate.normalizedProject as unknown as SavedProject,
              currentPath: candidate.selectedPath,
              persistenceFormat: candidate.persistenceFormat,
              lastEditorRoute: candidate.editorRoute,
            }),
          ))
      } catch (error) {
        return failure(
          'project.open-commit-failed',
          'The project session could not be established.',
          error instanceof Error ? error.message : String(error),
          error,
        )
      }

      if (commit.status === 'stale') {
        return failure(
          'project.open-stale-state',
          'The active project changed while Open Project was in progress.',
          'The lifecycle compare-and-swap transition rejected a stale generation.',
        )
      }

      if (commit.status !== 'committed') {
        return failure(
          'project.open-commit-not-applied',
          'The project session could not be established.',
          `The lifecycle transition returned ${commit.status}.`,
        )
      }

      return commandSucceeded(undefined, {
        kind: 'success',
        message: candidate.successMessage,
        deduplicationKey: `project.open:${commit.snapshot.state.activeSession?.id}`,
      })
    },
  })
}
