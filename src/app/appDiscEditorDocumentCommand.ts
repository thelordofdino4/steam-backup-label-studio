import type { ApplicationLifecycleCompositionRoot as Root } from '../lifecycle/applicationLifecycleCompositionRoot.ts'
import { normalizedProjectValueMatches } from '../lifecycle/canonicalProject.ts'
import type { DiscProjectSession } from '../lifecycle/projectSession.ts'
import type { DiscLegacyProjectProjection } from '../project/createProjectSnapshot.ts'

/** Do not plan from a stale editor render or accidentally adopt an unrelated
 * editor mutation as part of a template edit. Ignore the capture timestamp. */
export function readDiscEditorDocumentBasis(root: Root, rendered: DiscLegacyProjectProjection) {
  if (!root.canCommitDiscBackground()) return null
  const snapshot = root.getStateSnapshot()
  const current = snapshot.state.activeSession
  if (current?.kind !== 'disc') return null
  const keys = new Set([...Object.keys(rendered), 'editor'])
  const synchronized = [...keys].every(key => key === 'background' || key === 'savedAt' ||
    normalizedProjectValueMatches(Reflect.get(rendered, key), Reflect.get(current.project, key)))
  return synchronized ? { current, expectedGeneration: snapshot.generation } : null
}

type Edit = Parameters<Root['commitDiscEditorDocumentEdit']>[0]
type Operation<T> = T extends unknown ? Omit<T, 'sessionId' | 'expectedGeneration'> : never
export type DiscEditorDocumentOperation = Operation<Edit>

/** Commit before updating React mirrors. Other legacy writes and PNG capture
 * remain fenced until the layout effect observes the full accepted projection. */
export function applyDiscEditorDocumentEdit(
  root: Root, basis: { current: DiscProjectSession; expectedGeneration: number },
  operation: DiscEditorDocumentOperation,
  batch: (apply: () => void) => void,
  project: (accepted: DiscProjectSession) => void,
): boolean {
  let applied = false
  batch(() => {
    const result = root.commitDiscEditorDocumentEdit({
      ...operation, sessionId: basis.current.id, expectedGeneration: basis.expectedGeneration,
    })
    if (result !== 'committed' && result !== 'no-op') return
    const snapshot = root.getStateSnapshot()
    const current = snapshot.state.activeSession
    if (current?.kind !== 'disc' || current.id !== basis.current.id ||
        current.revision !== basis.current.revision + (result === 'committed' ? 1 : 0) ||
        (result === 'committed' && !snapshot.discHistoryProjectionPending)) return
    project(current)
    applied = true
  })
  return applied
}
