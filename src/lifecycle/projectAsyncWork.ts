import type { ApplicationLifecycleStateSnapshot } from './applicationLifecycleStateStore.ts'
import type { ProjectSessionId } from './projectSession.ts'

/** A lane names the semantic destination, not the transport or UI control. */
export type ProjectAsyncLane =
  | 'steam-game'
  | 'steam-metadata'
  | 'background-artwork'
  | 'title-artwork'
  | 'artwork-discovery'
  | 'screenshot-discovery'
  | `logo-discovery:${string}`
  | `image:${string}`

export type ProjectAsyncRequest = Readonly<{
  requestId: number
  lane: ProjectAsyncLane
  sessionId: ProjectSessionId | null
  contentRevision: number | null
  stateGeneration: number
  mutationGeneration: number
}>

/** Only for reconciliation of current committed owner values after a render. */
export type ProjectSessionContinuation = Readonly<{ sessionId: ProjectSessionId | null }>

export interface ProjectAsyncWork {
  getCurrentSessionId(): ProjectSessionId | null
  captureSessionContinuation(): ProjectSessionContinuation
  isSessionContinuationCurrent(continuation: ProjectSessionContinuation): boolean
  begin(lane: ProjectAsyncLane): ProjectAsyncRequest
  isCurrent(request: ProjectAsyncRequest): boolean
  invalidate(lane: ProjectAsyncLane): void
  invalidateAll(): void
  /** Consume authority before a synchronous, prepared application. */
  commit(request: ProjectAsyncRequest, apply: () => undefined): boolean
  /** Consume a proposal/feedback completion without changing document authority. */
  publish(request: ProjectAsyncRequest, apply: () => undefined): boolean
  getSnapshot(): number
  subscribe(listener: () => void): () => void
  observeLifecycle(): void
  dispose(): void
}

/**
 * Owns pending request authority only; it never stores editable project data.
 * The lifecycle session/revision remains authoritative until #366 replaces
 * the commit adapter. A synchronous commit retires competing old-revision
 * requests even before React's committed-render synchronization runs.
 */
export function createProjectAsyncWork(
  getState: () => ApplicationLifecycleStateSnapshot,
): ProjectAsyncWork {
  let sequence = 0
  let mutationGeneration = 0
  let version = 0
  let observedStateGeneration = getState().generation
  let disposed = false
  const latest = new Map<ProjectAsyncLane, ProjectAsyncRequest>()
  const requestSessions = new WeakMap<ProjectAsyncRequest, ProjectSessionContinuation>()
  const failedApplications = new WeakMap<ProjectAsyncRequest, Readonly<{
    mutationGeneration: number
    stateGeneration: number
  }>>()
  const listeners = new Set<() => void>()
  let sessionRoute = ''
  let continuation: ProjectSessionContinuation = Object.freeze({ sessionId: null })

  function observeSessionRoute() {
    const { activeSession, visibleWorkspace } = getState().state
    const key = JSON.stringify([activeSession?.id, visibleWorkspace, activeSession?.lastEditorRoute])
    if (key !== sessionRoute) {
      sessionRoute = key
      continuation = Object.freeze({ sessionId: activeSession?.id ?? null })
    }
  }

  function notify() {
    version += 1
    for (const listener of [...listeners]) {
      try { listener() } catch { /* Observers cannot restore mutation authority. */ }
    }
  }

  function isCurrent(request: ProjectAsyncRequest) {
    observeSessionRoute()
    const snapshot = getState()
    const session = snapshot.state.activeSession
    return !disposed && latest.get(request.lane) === request &&
      session !== null && snapshot.state.visibleWorkspace !== 'home' &&
      request.sessionId === session.id &&
      request.contentRevision === session.revision &&
      requestSessions.get(request) === continuation &&
      request.mutationGeneration === mutationGeneration
  }

  function complete(
    request: ProjectAsyncRequest,
    apply: () => undefined,
    mutates: boolean,
  ) {
    const current = isCurrent(request)
    const failed = failedApplications.get(request)
    // A synchronous owner failure may report once, but never regain mutation
    // authority. New requests, navigation, edits, or disposal retire it.
    const mayReportFailure = !mutates && !disposed && failed !== undefined &&
      !latest.has(request.lane) && requestSessions.get(request) === continuation &&
      failed.mutationGeneration === mutationGeneration &&
      failed.stateGeneration === getState().generation
    if (!current && !mayReportFailure) return false
    failedApplications.delete(request)
    latest.delete(request.lane)
    if (mutates) mutationGeneration += 1
    try {
      apply()
    } catch (error) {
      if (mutates) failedApplications.set(request, {
        mutationGeneration, stateGeneration: getState().generation,
      })
      throw error
    } finally {
      notify()
    }
    return true
  }

  return Object.freeze<ProjectAsyncWork>({
    getCurrentSessionId: () => getState().state.activeSession?.id ?? null,
    captureSessionContinuation() {
      observeSessionRoute()
      return continuation
    },
    isSessionContinuationCurrent(candidate) {
      observeSessionRoute()
      return !disposed && candidate === continuation && candidate.sessionId !== null &&
        getState().state.visibleWorkspace !== 'home'
    },
    begin(lane: ProjectAsyncLane) {
      if (disposed) throw new Error('Project async work is disposed.')
      if (!Number.isSafeInteger(sequence + 1)) {
        throw new RangeError('Project async request IDs are exhausted.')
      }
      observeSessionRoute()
      const snapshot = getState()
      const session = snapshot.state.activeSession
      const request = Object.freeze({
        requestId: ++sequence,
        lane,
        sessionId: session?.id ?? null,
        contentRevision: session?.revision ?? null,
        stateGeneration: snapshot.generation,
        mutationGeneration,
      })
      latest.set(lane, request)
      requestSessions.set(request, continuation)
      notify()
      return request
    },
    isCurrent,
    invalidate(lane: ProjectAsyncLane) {
      if (latest.delete(lane)) notify()
    },
    invalidateAll() {
      latest.clear()
      continuation = Object.freeze({ sessionId: getState().state.activeSession?.id ?? null })
      notify()
    },
    commit: (request, apply) => complete(request, apply, true),
    publish: (request, apply) => complete(request, apply, false),
    getSnapshot: () => version,
    subscribe(listener) {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    observeLifecycle() {
      observeSessionRoute()
      const generation = getState().generation
      if (generation === observedStateGeneration) return
      observedStateGeneration = generation
      for (const [lane, request] of latest) {
        if (!isCurrent(request)) latest.delete(lane)
      }
      notify()
    },
    dispose() {
      disposed = true
      latest.clear()
      notify()
      listeners.clear()
    },
  })
}

/** Preserve synchronous owner return values (for Case branding adapters). */
export function commitProjectAsyncValue<T>(
  work: ProjectAsyncWork,
  request: ProjectAsyncRequest,
  apply: () => T & (T extends PromiseLike<unknown> ? never : unknown),
): T | undefined {
  let value: T | undefined
  work.commit(request, () => { value = apply() })
  return value
}
