export type CaseInsertContinuousEditTargetId = string

export type CaseInsertContinuousEditPoint = Readonly<{
  x: number
  y: number
}>

export type CaseInsertContinuousEditValue =
  | number
  | CaseInsertContinuousEditPoint

export type CaseInsertContinuousEditFrameScheduler<TFrameHandle> = Readonly<{
  schedule(callback: () => void): TFrameHandle
  cancel(frameHandle: TFrameHandle): void
}>

export type CaseInsertContinuousEditIdentity = Readonly<{
  sessionId: string
  targetId: CaseInsertContinuousEditTargetId
}>

export type CaseInsertContinuousEditProjection<
  TValue extends CaseInsertContinuousEditValue,
> =
  CaseInsertContinuousEditIdentity & Readonly<{
    value: TValue
    project(value: TValue): void
  }>

export type CaseInsertContinuousEditStatus =
  | Readonly<{
      status: 'idle' | 'disposed'
      active: false
      frameQueued: false
      sessionId: null
      targetId: null
    }>
  | Readonly<{
      status: 'active'
      active: true
      frameQueued: boolean
      sessionId: string
      targetId: CaseInsertContinuousEditTargetId
    }>

export type CaseInsertContinuousEditStageResult = Readonly<{
  status:
    | 'scheduled'
    | 'coalesced'
    | 'switched'
    | 'session-stale'
    | 'disposed'
  coordinator: CaseInsertContinuousEditStatus
}>

export type CaseInsertContinuousEditFinishResult = Readonly<{
  status: 'finished' | 'no-op' | 'session-stale' | 'target-stale' | 'disposed'
  projected: boolean
  coordinator: CaseInsertContinuousEditStatus
}>

export type CaseInsertContinuousEditRetireResult = Readonly<{
  status: 'retired' | 'no-op' | 'target-stale' | 'disposed'
  coordinator: CaseInsertContinuousEditStatus
}>

export type CaseInsertContinuousEditCancelPolicy =
  | 'finish-latest'
  | 'discard'

export type CaseInsertContinuousEditCoordinator = Readonly<{
  getStatus(): CaseInsertContinuousEditStatus
  isActive(): boolean
  stage<TValue extends CaseInsertContinuousEditValue>(
    projection: CaseInsertContinuousEditProjection<TValue>,
  ): CaseInsertContinuousEditStageResult
  finish(
    expected?: CaseInsertContinuousEditIdentity,
  ): CaseInsertContinuousEditFinishResult
  cancel(
    policy: CaseInsertContinuousEditCancelPolicy,
    expected?: CaseInsertContinuousEditIdentity,
  ): CaseInsertContinuousEditFinishResult | CaseInsertContinuousEditRetireResult
  retire(
    expected?: CaseInsertContinuousEditIdentity,
  ): CaseInsertContinuousEditRetireResult
  dispose(): CaseInsertContinuousEditRetireResult
}>

type PendingProjection = Readonly<{
  sequence: number
  invoke(): void
}>

type ActiveEdit = {
  readonly sessionId: string
  readonly targetId: CaseInsertContinuousEditTargetId
  latest: PendingProjection
  projectedSequence: number
}

type FrameToken = Readonly<{ sequence: number }>

type QueuedFrame<TFrameHandle> = {
  readonly token: FrameToken
  handle?: TFrameHandle
}

const IDLE_STATUS = Object.freeze({
  status: 'idle',
  active: false,
  frameQueued: false,
  sessionId: null,
  targetId: null,
}) satisfies CaseInsertContinuousEditStatus

const DISPOSED_STATUS = Object.freeze({
  status: 'disposed',
  active: false,
  frameQueued: false,
  sessionId: null,
  targetId: null,
}) satisfies CaseInsertContinuousEditStatus

function identityMatches(
  active: ActiveEdit,
  expected: CaseInsertContinuousEditIdentity,
) {
  return active.sessionId === expected.sessionId &&
    active.targetId === expected.targetId
}

/**
 * Coalesces one exact Case interaction target without owning project state.
 * Values are intentionally opaque: the caller validates them and the retained
 * callback owns their projection into the authoritative editor boundary.
 */
export function createCaseInsertContinuousEditCoordinator<TFrameHandle>({
  frameScheduler,
  getActiveCaseSessionId,
}: Readonly<{
  frameScheduler: CaseInsertContinuousEditFrameScheduler<TFrameHandle>
  getActiveCaseSessionId(): string | null
}>): CaseInsertContinuousEditCoordinator {
  let activeEdit: ActiveEdit | null = null
  let queuedFrame: QueuedFrame<TFrameHandle> | null = null
  let nextSequence = 1
  let disposed = false

  function getStatus(): CaseInsertContinuousEditStatus {
    if (disposed) return DISPOSED_STATUS
    if (!activeEdit) return IDLE_STATUS

    return Object.freeze({
      status: 'active',
      active: true,
      frameQueued: queuedFrame !== null,
      sessionId: activeEdit.sessionId,
      targetId: activeEdit.targetId,
    })
  }

  function cancelQueuedFrame() {
    const frame = queuedFrame
    queuedFrame = null
    if (frame?.handle !== undefined) frameScheduler.cancel(frame.handle)
  }

  function retireActive() {
    cancelQueuedFrame()
    activeEdit = null
  }

  function retireStaleActiveSession() {
    if (
      activeEdit &&
      getActiveCaseSessionId() !== activeEdit.sessionId
    ) {
      retireActive()
      return true
    }

    return false
  }

  function drainFrame(token: FrameToken) {
    if (disposed || queuedFrame?.token !== token) return
    queuedFrame = null

    const edit = activeEdit
    if (!edit) return
    if (getActiveCaseSessionId() !== edit.sessionId) {
      retireActive()
      return
    }

    const projection = edit.latest
    if (projection.sequence === edit.projectedSequence) return
    edit.projectedSequence = projection.sequence
    projection.invoke()
  }

  function scheduleFrame() {
    if (queuedFrame) return false

    const token = Object.freeze({ sequence: nextSequence })
    nextSequence += 1
    const frame: QueuedFrame<TFrameHandle> = { token }
    queuedFrame = frame
    const handle = frameScheduler.schedule(() => drainFrame(token))
    if (queuedFrame === frame) frame.handle = handle
    return true
  }

  function finish(
    expected?: CaseInsertContinuousEditIdentity,
  ): CaseInsertContinuousEditFinishResult {
    if (disposed) {
      return Object.freeze({
        status: 'disposed',
        projected: false,
        coordinator: getStatus(),
      })
    }
    if (!activeEdit) {
      return Object.freeze({
        status: 'no-op',
        projected: false,
        coordinator: getStatus(),
      })
    }
    if (expected && !identityMatches(activeEdit, expected)) {
      return Object.freeze({
        status: 'target-stale',
        projected: false,
        coordinator: getStatus(),
      })
    }
    if (getActiveCaseSessionId() !== activeEdit.sessionId) {
      retireActive()
      return Object.freeze({
        status: 'session-stale',
        projected: false,
        coordinator: getStatus(),
      })
    }

    const edit = activeEdit
    const projection = edit.latest
    const shouldProject = projection.sequence !== edit.projectedSequence
    retireActive()
    if (shouldProject) projection.invoke()

    return Object.freeze({
      status: 'finished',
      projected: shouldProject,
      coordinator: getStatus(),
    })
  }

  function retire(
    expected?: CaseInsertContinuousEditIdentity,
  ): CaseInsertContinuousEditRetireResult {
    if (disposed) {
      return Object.freeze({ status: 'disposed', coordinator: getStatus() })
    }
    if (!activeEdit) {
      return Object.freeze({ status: 'no-op', coordinator: getStatus() })
    }
    if (expected && !identityMatches(activeEdit, expected)) {
      return Object.freeze({
        status: 'target-stale',
        coordinator: getStatus(),
      })
    }

    retireActive()
    return Object.freeze({ status: 'retired', coordinator: getStatus() })
  }

  return Object.freeze({
    getStatus,
    isActive: () => getStatus().active,
    stage<TValue extends CaseInsertContinuousEditValue>({
      sessionId,
      targetId,
      value,
      project,
    }: CaseInsertContinuousEditProjection<TValue>) {
      if (disposed) {
        return Object.freeze({
          status: 'disposed',
          coordinator: getStatus(),
        })
      }

      retireStaleActiveSession()
      if (getActiveCaseSessionId() !== sessionId) {
        return Object.freeze({
          status: 'session-stale',
          coordinator: getStatus(),
        })
      }

      let status: CaseInsertContinuousEditStageResult['status']
      if (activeEdit && activeEdit.targetId !== targetId) {
        finish()
        if (getActiveCaseSessionId() !== sessionId) {
          return Object.freeze({
            status: 'session-stale',
            coordinator: getStatus(),
          })
        }
        status = 'switched'
      } else {
        status = activeEdit ? 'coalesced' : 'scheduled'
      }

      const projectionSequence = nextSequence
      nextSequence += 1
      const latest = Object.freeze({
        sequence: projectionSequence,
        invoke: () => project(value),
      })
      if (activeEdit) {
        activeEdit.latest = latest
      } else {
        activeEdit = {
          sessionId,
          targetId,
          latest,
          projectedSequence: 0,
        }
      }
      scheduleFrame()

      return Object.freeze({ status, coordinator: getStatus() })
    },
    finish,
    cancel(policy, expected) {
      return policy === 'finish-latest'
        ? finish(expected)
        : retire(expected)
    },
    retire,
    dispose() {
      if (disposed) {
        return Object.freeze({ status: 'disposed', coordinator: getStatus() })
      }
      retireActive()
      disposed = true
      return Object.freeze({ status: 'retired', coordinator: getStatus() })
    },
  })
}
