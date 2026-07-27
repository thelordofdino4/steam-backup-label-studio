import {
  captureApplicationLifecycleState,
  createEmptyApplicationLifecycleState,
  type ApplicationLifecycleState,
} from './projectSession.ts'

export type ApplicationLifecycleStateSnapshot = Readonly<{
  generation: number
  state: ApplicationLifecycleState
}>

export type ApplicationLifecycleStateTransition = (
  current: ApplicationLifecycleState,
) => ApplicationLifecycleState

export type ApplicationLifecycleStateCommitResult =
  | Readonly<{
      status: 'committed'
      snapshot: ApplicationLifecycleStateSnapshot
    }>
  | Readonly<{
      status: 'no-op' | 'stale'
      snapshot: ApplicationLifecycleStateSnapshot
    }>

export type ApplicationLifecycleStateSubscriber = (
  snapshot: ApplicationLifecycleStateSnapshot,
) => void

export type ApplicationLifecycleStateStoreOptions = Readonly<{
  initialState?: ApplicationLifecycleState
  onSubscriberError?: (error: unknown) => void
}>

export interface ApplicationLifecycleStateStore {
  getSnapshot(): ApplicationLifecycleStateSnapshot
  commitTransition(
    expectedGeneration: number,
    transition: ApplicationLifecycleStateTransition,
  ): ApplicationLifecycleStateCommitResult
  subscribe(subscriber: ApplicationLifecycleStateSubscriber): () => void
  dispose(): void
}

function captureSnapshot(
  generation: number,
  state: ApplicationLifecycleState,
): ApplicationLifecycleStateSnapshot {
  return Object.freeze({
    generation,
    state: captureApplicationLifecycleState(state),
  })
}

function statesAreSemanticallyEqual(
  first: ApplicationLifecycleState,
  second: ApplicationLifecycleState,
): boolean {
  return first === second || JSON.stringify(first) === JSON.stringify(second)
}

export function createApplicationLifecycleStateStore(
  options: ApplicationLifecycleStateStoreOptions = {},
): ApplicationLifecycleStateStore {
  let snapshot = captureSnapshot(
    0,
    options.initialState ?? createEmptyApplicationLifecycleState(),
  )
  let disposed = false
  const subscribers = new Set<ApplicationLifecycleStateSubscriber>()

  function reportSubscriberError(error: unknown) {
    try {
      options.onSubscriberError?.(error)
    } catch {
      // Subscriber diagnostics cannot interrupt committed-state notification.
    }
  }

  function notifySubscribers(committed: ApplicationLifecycleStateSnapshot) {
    for (const subscriber of [...subscribers]) {
      try {
        subscriber(committed)
      } catch (error) {
        reportSubscriberError(error)
      }
    }
  }

  return Object.freeze({
    getSnapshot: () => snapshot,
    commitTransition(
      expectedGeneration: number,
      transition: ApplicationLifecycleStateTransition,
    ) {
      if (disposed) {
        throw new Error('The application lifecycle state store is disposed.')
      }
      if (expectedGeneration !== snapshot.generation) {
        return Object.freeze({ status: 'stale', snapshot })
      }

      const nextState = captureApplicationLifecycleState(
        transition(snapshot.state),
      )
      if (statesAreSemanticallyEqual(snapshot.state, nextState)) {
        return Object.freeze({ status: 'no-op', snapshot })
      }

      snapshot = captureSnapshot(snapshot.generation + 1, nextState)
      notifySubscribers(snapshot)
      return Object.freeze({ status: 'committed', snapshot })
    },
    subscribe(subscriber: ApplicationLifecycleStateSubscriber) {
      if (disposed) {
        throw new Error('The application lifecycle state store is disposed.')
      }
      subscribers.add(subscriber)
      return () => subscribers.delete(subscriber)
    },
    dispose() {
      disposed = true
      subscribers.clear()
    },
  })
}
