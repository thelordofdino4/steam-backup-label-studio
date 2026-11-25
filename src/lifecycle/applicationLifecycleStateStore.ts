import {
  applicationLifecycleStatesAreSemanticallyEqual, captureApplicationLifecycleState,
  createEmptyApplicationLifecycleState, restoreHistoryDiscProject, type ApplicationLifecycleState,
} from './projectSession.ts'
import {
  createDocumentHistory, recordDocumentTransition, stepDocumentHistory, type DocumentHistory,
} from './documentHistory.ts'
import type { CommittedDiscProject } from './canonicalProject.ts'

export type ApplicationLifecycleStateSnapshot = Readonly<{
  generation: number
  state: ApplicationLifecycleState
  discHistory?: DocumentHistory
  discHistoryProjectionPending?: true
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
  onSubscriberError?: (error: unknown) => void
}>

export interface ApplicationLifecycleStateStore {
  getSnapshot(): ApplicationLifecycleStateSnapshot
  commitTransition(
    expectedGeneration: number, transition: ApplicationLifecycleStateTransition,
    historyPolicy?: 'record-disc-transaction' | 'record-disc-transaction-with-projection',
  ): ApplicationLifecycleStateCommitResult
  stepDiscHistory(expectedGeneration: number, direction: 'undo' | 'redo'): ApplicationLifecycleStateCommitResult
  acknowledgeDiscHistoryProjection(expectedGeneration: number): ApplicationLifecycleStateCommitResult
  subscribe(subscriber: ApplicationLifecycleStateSubscriber): () => void
  dispose(): void
}

function makeSnapshot(generation: number, state: ApplicationLifecycleState, discHistory?: DocumentHistory, pending = false) {
  return Object.freeze({
    generation, state, ...(discHistory ? { discHistory } : {}),
    ...(pending ? { discHistoryProjectionPending: true as const } : {}),
  })
}

export function createApplicationLifecycleStateStore(
  options: ApplicationLifecycleStateStoreOptions = {},
): ApplicationLifecycleStateStore {
  const initial = captureApplicationLifecycleState(options.initialState ?? createEmptyApplicationLifecycleState())
  const limit = options.discHistoryLimit
  if (limit !== undefined && (!Number.isSafeInteger(limit) || limit < 1)) {
    throw new RangeError('Disc history limit must be a positive safe integer.')
  }
  let snapshot: ApplicationLifecycleStateSnapshot = makeSnapshot(0, initial,
    initial.activeSession?.kind === 'disc' && limit !== undefined
      ? createDocumentHistory(initial.activeSession.id, initial.activeSession.project, limit) : undefined)
  let disposed = false
  const subscribers = new Set<ApplicationLifecycleStateSubscriber>()

  const result = (status: ApplicationLifecycleStateCommitResult['status'], at = snapshot) =>
    Object.freeze({ status, snapshot: at })

  function publish(
    basis: ApplicationLifecycleStateSnapshot, state: ApplicationLifecycleState, history?: DocumentHistory, pending = false,
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
      if (limit !== undefined && current?.kind === 'disc') {
        const old = basis.discHistory
        if (old && prior?.kind === 'disc' && prior.id === current.id) {
          if (prior.revision === current.revision && prior.project === current.project) history = old
          else if (historyPolicy !== undefined && current.revision === prior.revision + 1) {
            const recorded = recordDocumentTransition(old, current.id, prior.project, current.project)
            if (recorded !== old) history = recorded
          }
        }
        // New/Open and unclassified content edits cannot resurrect earlier content.
        history ??= createDocumentHistory(current.id, current.project, limit)
      }
      return publish(basis, next, history,
        (historyPolicy === 'record-disc-transaction-with-projection' && prior?.kind === 'disc' &&
          current?.kind === 'disc' && prior.id === current.id && current.revision === prior.revision + 1) ||
        (!!basis.discHistoryProjectionPending && prior?.id === current?.id &&
          prior?.revision === current?.revision && prior?.project === current?.project))
    },
    stepDiscHistory(expectedGeneration, direction) {
      if (disposed) throw new Error('The application lifecycle state store is disposed.')
      const basis = snapshot
      if (expectedGeneration !== basis.generation) return result('stale')
      const { state, discHistory } = basis
      const current = state.activeSession
      if (state.visibleWorkspace !== 'disc' || current?.kind !== 'disc' || !discHistory) return result('no-op')
      const history = stepDocumentHistory(discHistory, current.id, current.project, direction)
      if (history === discHistory) return result('no-op')
      // Only already captured projects of the current Disc session enter this history.
      const restored = restoreHistoryDiscProject(state, current, history.current as CommittedDiscProject)
      if (restored === state) return result('no-op')
      return publish(basis, captureApplicationLifecycleState(restored), history, true)
    },
    acknowledgeDiscHistoryProjection(expectedGeneration) {
      if (disposed) throw new Error('The application lifecycle state store is disposed.')
      const basis = snapshot
      if (expectedGeneration !== basis.generation) return result('stale')
      if (!basis.discHistoryProjectionPending) return result('no-op')
      return publish(basis, basis.state, basis.discHistory)
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
