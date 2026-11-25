import type { CapturedLifecycleProject } from './canonicalProject.ts'
import type { ProjectSessionId } from './projectSession.ts'

/** Document-only history; entries pin already captured immutable project references.
 * Session paths, baselines, revisions, routes and transient editor state are not entries. */
export type DocumentHistory = Readonly<{
  sessionId: ProjectSessionId
  limit: number
  past: readonly CapturedLifecycleProject[]
  current: CapturedLifecycleProject
  future: readonly CapturedLifecycleProject[]
}>

export function createDocumentHistory(
  sessionId: ProjectSessionId,
  current: CapturedLifecycleProject,
  limit: number,
): DocumentHistory {
  if (!Number.isSafeInteger(limit) || limit < 1) throw new RangeError('History limit must be a positive safe integer.')
  return Object.freeze({ sessionId, limit, past: Object.freeze([]), current, future: Object.freeze([]) })
}

/** Only call after the document owner has accepted an actual content transaction. */
export function recordDocumentTransition(
  history: DocumentHistory,
  sessionId: ProjectSessionId,
  previous: CapturedLifecycleProject,
  current: CapturedLifecycleProject,
): DocumentHistory {
  if (sessionId !== history.sessionId || previous !== history.current || current === previous ||
      current.projectType !== previous.projectType) return history
  const past = Object.freeze([...history.past, previous].slice(-history.limit))
  return Object.freeze({ ...history, past, current, future: Object.freeze([]) })
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
    }) : history
  }
  const forward = history.future[0]
  return forward ? Object.freeze({
    ...history, current: forward, past: Object.freeze([...history.past, current]),
    future: Object.freeze(history.future.slice(1)),
  }) : history
}
