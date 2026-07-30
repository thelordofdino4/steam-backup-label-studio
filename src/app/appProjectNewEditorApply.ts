import type { EditorProjectType } from '../editor/editorTypes.ts'
import type {
  ApplicationLifecycleStateCommitResult,
} from '../lifecycle/applicationLifecycleStateStore.ts'
import type { SavedProject } from '../project/projectTypes.ts'

export type PreparedNewProjectEditorApply = Readonly<{
  commitLifecycleAndApply(
    commitLifecycle: () => ApplicationLifecycleStateCommitResult,
  ): ApplicationLifecycleStateCommitResult
}>

export type ApplicationNewProjectEditorApplyDependencies = Readonly<{
  batchReactUpdates: (apply: () => void) => void
  resetDiscProject: (project: SavedProject) => void
  resetCaseProject: (project: SavedProject) => void
  setActiveWorkspace: (kind: EditorProjectType) => void
  setHomeStatusMessage: (message: string | null) => void
}>

/**
 * Adapts the existing complete editor reset owners to one synchronous
 * lifecycle/editor commit. It contains no replacement or lifecycle policy.
 */
export function prepareNewProjectEditorApply(
  dependencies: ApplicationNewProjectEditorApplyDependencies,
  kind: EditorProjectType,
  project: SavedProject,
): PreparedNewProjectEditorApply {
  return Object.freeze({
    commitLifecycleAndApply(commitLifecycle) {
      let commitResult: ApplicationLifecycleStateCommitResult | undefined
      dependencies.batchReactUpdates(() => {
        commitResult = commitLifecycle()
        if (commitResult.status !== 'committed') return

        if (kind === 'disc') dependencies.resetDiscProject(project)
        else dependencies.resetCaseProject(project)
        dependencies.setActiveWorkspace(kind)
        dependencies.setHomeStatusMessage(null)
      })

      if (!commitResult) {
        throw new Error('The lifecycle/editor batch did not run synchronously.')
      }
      return commitResult
    },
  })
}
