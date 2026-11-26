import { getEnabledCaseInsertMarkSlotForKind } from '../caseInsert/brandingMarkPlacement.ts'
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

/** Presentation-only restoration. The target and cursor stay owned by the
 * lifecycle store, which binds a new Case assignment identity when required. */
export function stepProjectedCaseHistory(
  root: Root,
  direction: 'undo' | 'redo',
  rendered: SavedCaseInsertProject,
  batch: (run: () => void) => void,
  mirror: (target: SavedCaseInsertProject) => void,
) {
  const basis = readCaseSteamDocumentBasis(root, rendered)
  if (!basis) return 'unavailable'
  const history = root.getStateSnapshot().caseHistory
  const target = direction === 'undo' ? history?.past.at(-1) : history?.future[0]
  if (!target) return 'no-op'
  if (target.projectType !== 'caseInsert' || !target.metadata) return 'invalid'
  // Clone only the live mirror; the bounded history retains accepted
  // immutable references rather than a second copy of the image assets.
  const projection = structuredClone(target) as unknown as SavedCaseInsertProject
  let status: ReturnType<Root['stepCaseDocumentHistory']> = 'unavailable'
  batch(() => {
    status = root.stepCaseDocumentHistory({
      direction, sessionId: basis.current.id, expectedGeneration: basis.expectedGeneration,
    })
    if (status !== 'committed') return
    const snapshot = root.getStateSnapshot()
    const accepted = snapshot.state.activeSession
    if (accepted?.kind !== 'caseInsert' || accepted.id !== basis.current.id ||
        accepted.revision !== basis.current.revision + 1 || accepted.project !== target ||
        !snapshot.caseSteamProjectionPending) {
      status = 'stale'
      return
    }
    mirror(projection)
  })
  return status
}

/** Case mark ownership, not any previous hidden Disc donor, controls the
 * restored primary rating toggle. */
export function shouldEnableCaseHistoryRating(project: SavedCaseInsertProject): boolean {
  const { templates, spine } = project.caseInsert
  return [templates.cover, templates.tray, spine.left, spine.right].some(
    surface => !!getEnabledCaseInsertMarkSlotForKind(surface.markSlots, 'rating'),
  )
}
