import type { ApplicationLifecycleCompositionRoot as Root } from '../lifecycle/applicationLifecycleCompositionRoot.ts'
import { captureNormalizedProjectSnapshot, projectContentsAreSemanticallyEqual } from '../lifecycle/canonicalProject.ts'
import type { CaseSteamImport } from '../lifecycle/caseSteamOperation.ts'
import type { SavedCaseInsertProject } from '../project/projectTypes.ts'

export function readCaseSteamDocumentBasis(root: Root, rendered: SavedCaseInsertProject) {
  const snapshot = root.getStateSnapshot()
  const current = snapshot.state.activeSession
  if (snapshot.state.visibleWorkspace !== 'caseInsert' || current?.kind !== 'caseInsert' ||
      snapshot.caseSteamProjectionPending) return null
  const project = captureNormalizedProjectSnapshot(rendered)
  return project.projectType === 'caseInsert' && projectContentsAreSemanticallyEqual(project, current.project)
    ? { current, expectedGeneration: snapshot.generation }
    : null
}

/** The prepared snapshot is not installed in the React owners until the
 * authoritative Case compare-and-swap accepts it. */
export function applyCaseSteamDocumentImport(
  root: Root,
  operation: CaseSteamImport & Readonly<{ expectedGeneration: number }>,
  batch: (run: () => void) => void,
  projected: (contentChanged: boolean) => void,
) {
  let applied = false
  batch(() => {
    const result = root.commitCaseSteamImport(operation)
    if (result !== 'committed' && result !== 'no-op') return
    const snapshot = root.getStateSnapshot()
    const current = snapshot.state.activeSession
    const changed = result === 'committed'
    if (current?.kind !== 'caseInsert' || current.id !== operation.sessionId ||
        current.revision !== operation.expectedRevision + (changed ? 1 : 0) ||
        (changed && !snapshot.caseSteamProjectionPending)) return
    projected(changed)
    applied = true
  })
  return applied
}
