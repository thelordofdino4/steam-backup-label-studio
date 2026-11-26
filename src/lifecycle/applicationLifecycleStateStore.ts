import {
  applicationLifecycleStatesAreSemanticallyEqual, captureApplicationLifecycleState,
  createEmptyApplicationLifecycleState, restoreHistoryCaseProject, restoreHistoryDiscProject, type ApplicationLifecycleState,
} from './projectSession.ts'
import {
  createDocumentHistory, recordDocumentTransition, stepDocumentHistory, type DocumentHistory,
} from './documentHistory.ts'
import type { CommittedDiscProject } from './canonicalProject.ts'

export type ApplicationLifecycleStateSnapshot = Readonly<{
  generation: number
  state: ApplicationLifecycleState
  discHistory?: DocumentHistory
  caseHistory?: DocumentHistory
  discHistoryProjectionPending?: true
  caseSteamProjectionPending?: true
}>
export type ApplicationLifecycleStateTransition = (current: ApplicationLifecycleState) => ApplicationLifecycleState
export type ApplicationLifecycleStateCommitResult = Readonly<{
  status: 'committed' | 'no-op' | 'stale'
  snapshot: ApplicationLifecycleStateSnapshot
}>
export type ApplicationLifecycleStateSubscriber = (snapshot: ApplicationLifecycleStateSnapshot) => void
export type ApplicationLifecycleStateStoreOptions = Readonly<{
  initialState?: ApplicationLifecycleState
  discHistoryLimit?: number
  caseHistoryLimit?: number
  onSubscriberError?: (error: unknown) => void
}>

type Projection = 'disc' | 'caseInsert'
type DocumentCommitPolicy = 'record-disc-transaction' | 'record-disc-transaction-with-projection' |
  'case-steam-transaction-with-projection'

export interface ApplicationLifecycleStateStore {
  getSnapshot(): ApplicationLifecycleStateSnapshot
  commitTransition(
    expectedGeneration: number, transition: ApplicationLifecycleStateTransition,
    historyPolicy?: DocumentCommitPolicy,
  ): ApplicationLifecycleStateCommitResult
  stepDiscHistory(expectedGeneration: number, direction: 'undo' | 'redo'): ApplicationLifecycleStateCommitResult
  stepCaseHistory(expectedGeneration: number, direction: 'undo' | 'redo'): ApplicationLifecycleStateCommitResult
  acknowledgeDocumentProjection(expectedGeneration: number, kind: Projection): ApplicationLifecycleStateCommitResult
  subscribe(subscriber: ApplicationLifecycleStateSubscriber): () => void
  dispose(): void
}

function makeSnapshot(generation: number, state: ApplicationLifecycleState, history?: DocumentHistory, pending?: Projection) {
  return Object.freeze({
    generation, state,
    ...(history ? state.activeSession?.kind === 'caseInsert' ? { caseHistory: history } : { discHistory: history } : {}),
    ...(pending === 'disc' ? { discHistoryProjectionPending: true as const } : {}),
    ...(pending === 'caseInsert' ? { caseSteamProjectionPending: true as const } : {}),
  })
}

export function createApplicationLifecycleStateStore(
  options: ApplicationLifecycleStateStoreOptions = {},
): ApplicationLifecycleStateStore {
  const initial = captureApplicationLifecycleState(options.initialState ?? createEmptyApplicationLifecycleState())
  const limits = { disc: options.discHistoryLimit, caseInsert: options.caseHistoryLimit }
  for (const [kind, limit] of Object.entries(limits)) {
    if (limit !== undefined && (!Number.isSafeInteger(limit) || limit < 1)) {
      throw new RangeError(`${kind} history limit must be a positive safe integer.`)
    }
  }
  const current = initial.activeSession
  const initialLimit = current ? limits[current.kind] : undefined
  let snapshot: ApplicationLifecycleStateSnapshot = makeSnapshot(0, initial,
    current && initialLimit !== undefined ? createDocumentHistory(current.id, current.project, initialLimit) : undefined)
  let disposed = false
  const subscribers = new Set<ApplicationLifecycleStateSubscriber>()

  const result = (status: ApplicationLifecycleStateCommitResult['status'], at = snapshot) =>
    Object.freeze({ status, snapshot: at })

  function publish(
    basis: ApplicationLifecycleStateSnapshot, state: ApplicationLifecycleState, history?: DocumentHistory, pending?: Projection,
  ): ApplicationLifecycleStateCommitResult {
    if (basis !== snapshot) return result('stale')
    const committed = makeSnapshot(basis.generation + 1, state, history, pending)
    // Install current document and matching history before a subscriber can reenter.
    snapshot = committed
    for (const subscriber of [...subscribers]) {
      try { subscriber(committed) }
      catch (error) {
        try { options.onSubscriberError?.(error) }
        catch { /* Subscriber diagnostics cannot interrupt publication. */ }
      }
    }
    return result('committed', committed)
  }

  function stepHistory(kind: Projection, expectedGeneration: number, direction: 'undo' | 'redo') {
    if (disposed) throw new Error('The application lifecycle state store is disposed.')
    const basis = snapshot
    if (expectedGeneration !== basis.generation) return result('stale')
    const { state } = basis
    const current = state.activeSession
    const priorHistory = kind === 'disc' ? basis.discHistory : basis.caseHistory
    if (state.visibleWorkspace !== kind || current?.kind !== kind || !priorHistory)
      return result('no-op')
    const history = stepDocumentHistory(priorHistory, current.id, current.project, direction)
    if (history === priorHistory) return result('no-op')
    const restored = current.kind === 'disc'
      ? restoreHistoryDiscProject(state, current, history.current as CommittedDiscProject)
      : restoreHistoryCaseProject(state, current, history.current)
    if (restored === state) return result('no-op')
    return publish(basis, captureApplicationLifecycleState(restored), history, kind)
  }

  const store: ApplicationLifecycleStateStore = {
    getSnapshot: () => snapshot,
    commitTransition(expectedGeneration, transition, historyPolicy) {
      if (disposed) throw new Error('The application lifecycle state store is disposed.')
      const basis = snapshot
      if (expectedGeneration !== basis.generation) return result('stale')
      const candidate = transition(basis.state)
      if (basis !== snapshot) return result('stale')
      if (candidate === basis.state) return result('no-op')
      const next = captureApplicationLifecycleState(candidate)
      if (basis !== snapshot) return result('stale')
      if (applicationLifecycleStatesAreSemanticallyEqual(basis.state, next)) return result('no-op')

      const prior = basis.state.activeSession
      const current = next.activeSession
      let history: DocumentHistory | undefined
      if (current) {
        const limit = limits[current.kind]
        if (limit !== undefined) {
          const old = current.kind === 'disc' ? basis.discHistory : basis.caseHistory
          if (old && prior?.kind === current.kind && prior.id === current.id) {
            if (prior.revision === current.revision && prior.project === current.project) history = old
            else if (current.revision === prior.revision + 1 &&
                (current.kind === 'disc'
                  ? historyPolicy === 'record-disc-transaction' || historyPolicy === 'record-disc-transaction-with-projection'
                  : historyPolicy === 'case-steam-transaction-with-projection')) {
              const recorded = recordDocumentTransition(old, current.id, prior.project, current.project)
              if (recorded !== old) history = recorded
            }
          }
          // New/Open and edits without a registered document history policy
          // cannot resurrect earlier content. Only the active session has history.
          history ??= createDocumentHistory(current.id, current.project, limit)
        }
      }
      let pending: Projection | undefined
      if (prior && current && prior.kind === current.kind && prior.id === current.id) {
        if (current.revision === prior.revision + 1 &&
            ((current.kind === 'disc' && historyPolicy === 'record-disc-transaction-with-projection') ||
             (current.kind === 'caseInsert' && historyPolicy === 'case-steam-transaction-with-projection'))) {
          pending = current.kind
        } else if (prior.revision === current.revision && prior.project === current.project &&
            (basis.discHistoryProjectionPending || basis.caseSteamProjectionPending)) {
          pending = current.kind
        }
      }
      return publish(basis, next, history, pending)
    },
    stepDiscHistory: (generation, direction) => stepHistory('disc', generation, direction),
    stepCaseHistory: (generation, direction) => stepHistory('caseInsert', generation, direction),
    acknowledgeDocumentProjection(expectedGeneration, kind) {
      if (disposed) throw new Error('The application lifecycle state store is disposed.')
      const basis = snapshot
      if (expectedGeneration !== basis.generation) return result('stale')
      if (!(kind === 'disc' ? basis.discHistoryProjectionPending : basis.caseSteamProjectionPending))
        return result('no-op')
      return publish(basis, basis.state, kind === 'disc' ? basis.discHistory : basis.caseHistory)
    },
    subscribe(subscriber) {
      if (disposed) throw new Error('The application lifecycle state store is disposed.')
      subscribers.add(subscriber)
      return () => { subscribers.delete(subscriber) }
    },
    dispose() {
      disposed = true
      subscribers.clear()
    },
  }
  return Object.freeze(store)
}
