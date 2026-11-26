import type { CapturedLifecycleProject } from './canonicalProject.ts'
import type { CaseInsertPresetSessionApplication } from './caseInsertPresetSessionApplication.ts'
import type { ProjectSessionId } from './projectSession.ts'

export type CasePresetHistorySemantics = Pick<CaseInsertPresetSessionApplication, 'attachment' | 'recoveryStatus'>
export type CasePresetHistoryEdge = Readonly<{
  before: CasePresetHistorySemantics
  after: CasePresetHistorySemantics
}>

/** Document-only history; entries pin already captured immutable project references.
 * Session paths, baselines, revisions, routes and transient editor state are not entries. */
export type DocumentHistory = Readonly<{
  sessionId: ProjectSessionId
  limit: number
  past: readonly CapturedLifecycleProject[]
  current: CapturedLifecycleProject
  future: readonly CapturedLifecycleProject[]
  pastCaseEdges: readonly (CasePresetHistoryEdge | undefined)[]
  futureCaseEdges: readonly (CasePresetHistoryEdge | undefined)[]
}>

export function createDocumentHistory(
  sessionId: ProjectSessionId,
  current: CapturedLifecycleProject,
  limit: number,
): DocumentHistory {
  if (!Number.isSafeInteger(limit) || limit < 1) throw new RangeError('History limit must be a positive safe integer.')
  return Object.freeze({ sessionId, limit, past: Object.freeze([]), current, future: Object.freeze([]),
    pastCaseEdges: Object.freeze([]), futureCaseEdges: Object.freeze([]) })
}

/** Only call after the document owner has accepted an actual content transaction. */
export function recordDocumentTransition(
  history: DocumentHistory,
  sessionId: ProjectSessionId,
  previous: CapturedLifecycleProject,
  current: CapturedLifecycleProject,
  caseEdge?: CasePresetHistoryEdge,
): DocumentHistory {
  if (sessionId !== history.sessionId || previous !== history.current ||
      current.projectType !== previous.projectType ||
      (caseEdge && current.projectType !== 'caseInsert') || (!caseEdge && current === previous)) return history
  const past = Object.freeze([...history.past, previous].slice(-history.limit))
  const pastCaseEdges = Object.freeze([...history.pastCaseEdges, caseEdge].slice(-history.limit))
  return Object.freeze({ ...history, past, current, pastCaseEdges,
    future: Object.freeze([]), futureCaseEdges: Object.freeze([]) })
}

export function stepDocumentHistory(
  history: DocumentHistory,
  sessionId: ProjectSessionId,
  current: CapturedLifecycleProject,
  direction: 'undo' | 'redo',
): DocumentHistory {
  if (sessionId !== history.sessionId || current !== history.current) return history
  if (direction === 'undo') {
    const prior = history.past.at(-1)
    return prior ? Object.freeze({
      ...history, current: prior, past: Object.freeze(history.past.slice(0, -1)),
      future: Object.freeze([current, ...history.future]),
      pastCaseEdges: Object.freeze(history.pastCaseEdges.slice(0, -1)),
      futureCaseEdges: Object.freeze([history.pastCaseEdges.at(-1), ...history.futureCaseEdges]),
    }) : history
  }
  const forward = history.future[0]
  return forward ? Object.freeze({
    ...history, current: forward, past: Object.freeze([...history.past, current]),
    future: Object.freeze(history.future.slice(1)),
    pastCaseEdges: Object.freeze([...history.pastCaseEdges, history.futureCaseEdges[0]]),
    futureCaseEdges: Object.freeze(history.futureCaseEdges.slice(1)),
  }) : history
}
