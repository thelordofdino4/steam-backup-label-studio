import type {
  CaseInsertPresetSessionEditorApplyPort,
} from '../lifecycle/caseInsertPresetSessionApplicationCommand.ts'
import type { ProjectJewelCaseState } from '../project/projectTypes.ts'

export type ApplicationCaseInsertPresetEditorApplyDependencies = Readonly<{
  batchReactUpdates: (apply: () => void) => void
  setProjectJewelCase: (project: ProjectJewelCaseState) => void
}>

/**
 * Projects an exact committed Case lifecycle aggregate into the React editor
 * in the same synchronous batch as the lifecycle installation. It owns no
 * preset, assignment, transition, or lifecycle authorization policy.
 */
export function createApplicationCaseInsertPresetEditorApplyPort(
  dependencies: ApplicationCaseInsertPresetEditorApplyDependencies,
): CaseInsertPresetSessionEditorApplyPort {
  return Object.freeze({
    commitLifecycleAndApply(commitLifecycle) {
      let commitResult: ReturnType<typeof commitLifecycle> | undefined
      dependencies.batchReactUpdates(() => {
        commitResult = commitLifecycle()
        if (commitResult.status !== 'committed') return

        const session = commitResult.snapshot.state.activeSession
        if (!session || session.kind !== 'caseInsert') {
          throw new Error(
            'A committed Case preset installation did not produce a Case session.',
          )
        }
        // Lifecycle snapshots are already deeply frozen. React editor updates
        // are immutable, so retaining this exact aggregate is safe and avoids
        // a fallible allocation after the lifecycle CAS succeeds.
        dependencies.setProjectJewelCase(
          session.project.caseInsert as unknown as ProjectJewelCaseState,
        )
      })

      if (!commitResult) {
        throw new Error('The lifecycle/editor batch did not run synchronously.')
      }
      return commitResult
    },
  })
}
