import type {
  ApplicationLifecycleStateCommitResult,
} from '../lifecycle/applicationLifecycleStateStore.ts'
import type {
  ProjectSessionEditorRoute,
} from '../lifecycle/projectSession.ts'
import { getCaseInsertNavigationRoute } from '../editor/editorNavigationShell.ts'

export type ApplicationWorkspaceDestination =
  | Readonly<{ workspace: 'home' }>
  | ProjectSessionEditorRoute

export type PreparedApplicationWorkspaceNavigationApply = Readonly<{
  commitLifecycleAndApply(
    commitLifecycle: () => ApplicationLifecycleStateCommitResult,
  ): ApplicationLifecycleStateCommitResult
}>

export type ApplicationWorkspaceNavigationApplyDependencies = Readonly<{
  batchReactUpdates(apply: () => void): void
  cancelActivePointerGestures(): void
  setActiveWorkspace(workspace: 'home' | 'disc' | 'caseInsert'): void
  restoreCaseInsertRoute(
    pane: 'cover' | 'tray',
    surface: 'front' | 'back' | 'spine',
  ): void
  requestFocus(destination: ApplicationWorkspaceDestination): void
}>

/**
 * Adapts one lifecycle navigation transition to the existing React shell.
 * Project/editor content is never captured, restored, or mutated here.
 */
export function prepareApplicationWorkspaceNavigationApply(
  dependencies: ApplicationWorkspaceNavigationApplyDependencies,
  destination: ApplicationWorkspaceDestination,
): PreparedApplicationWorkspaceNavigationApply {
  return Object.freeze({
    commitLifecycleAndApply(commitLifecycle) {
      let commitResult: ApplicationLifecycleStateCommitResult | undefined
      dependencies.batchReactUpdates(() => {
        commitResult = commitLifecycle()
        if (commitResult.status !== 'committed') return

        dependencies.cancelActivePointerGestures()
        if (destination.workspace === 'caseInsert') {
          const route = getCaseInsertNavigationRoute(destination.surface)
          dependencies.restoreCaseInsertRoute(
            route.caseInsertPane,
            route.navigationSurfaceId,
          )
        }
        dependencies.setActiveWorkspace(destination.workspace)
        dependencies.requestFocus(destination)
      })

      if (!commitResult) {
        throw new Error('The lifecycle/workspace batch did not run synchronously.')
      }
      return commitResult
    },
  })
}
