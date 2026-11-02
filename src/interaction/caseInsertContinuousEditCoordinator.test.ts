import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createCaseInsertContinuousEditCoordinator,
  type CaseInsertContinuousEditFrameScheduler,
} from './caseInsertContinuousEditCoordinator.ts'

class ControlledFrameScheduler
implements CaseInsertContinuousEditFrameScheduler<number> {
  private nextHandle = 1
  readonly callbacks = new Map<number, () => void>()
  readonly canceled = new Set<number>()

  schedule(callback: () => void) {
    const handle = this.nextHandle
    this.nextHandle += 1
    this.callbacks.set(handle, callback)
    return handle
  }

  cancel(handle: number) {
    this.canceled.add(handle)
  }

  invoke(handle: number) {
    this.callbacks.get(handle)?.()
  }

  flushNext() {
    const handle = [...this.callbacks.keys()].find(
      (candidate) => !this.canceled.has(candidate),
    )
    assert.notEqual(handle, undefined)
    this.invoke(handle as number)
    this.callbacks.delete(handle as number)
    return handle as number
  }

  get activeCount() {
    return [...this.callbacks.keys()].filter(
      (handle) => !this.canceled.has(handle),
    ).length
  }
}

function createFixture() {
  const scheduler = new ControlledFrameScheduler()
  let sessionId: string | null = 'case-session-1'
  const coordinator = createCaseInsertContinuousEditCoordinator({
    frameScheduler: scheduler,
    getActiveCaseSessionId: () => sessionId,
  })

  return {
    coordinator,
    scheduler,
    setSessionId(nextSessionId: string | null) {
      sessionId = nextSessionId
    },
  }
}

test('a 100-value burst retains one frame and projects only the latest value', () => {
  const { coordinator, scheduler } = createFixture()
  const projected: number[] = []

  for (let value = 1; value <= 100; value += 1) {
    const result = coordinator.stage({
      sessionId: 'case-session-1',
      targetId: 'tray:screenshot-1:x',
      value,
      project: (latest) => projected.push(latest),
    })
    assert.equal(result.status, value === 1 ? 'scheduled' : 'coalesced')
    assert.equal(scheduler.activeCount, 1)
  }

  assert.deepEqual(projected, [])
  scheduler.flushNext()
  assert.deepEqual(projected, [100])
  assert.equal(coordinator.getStatus().frameQueued, false)
  assert.deepEqual(coordinator.finish(), {
    status: 'finished',
    projected: false,
    coordinator: {
      status: 'idle',
      active: false,
      frameQueued: false,
      sessionId: null,
      targetId: null,
    },
  })
})

test('the modeled App boundary turns 100 stages into one frame and one final lifecycle sync', () => {
  const { coordinator, scheduler } = createFixture()
  let currentValue = 0
  let visualProjectionCount = 0
  let authoritativeSynchronizationCount = 0

  const projectVisualValue = (value: number) => {
    currentValue = value
    visualProjectionCount += 1

    // Models the App layout-effect gate: intermediate React projections stay
    // live in the editor but cannot publish an authoritative lifecycle value
    // while the coordinator retains the active interaction.
    if (!coordinator.isActive()) authoritativeSynchronizationCount += 1
  }

  for (let value = 1; value <= 100; value += 1) {
    coordinator.stage({
      sessionId: 'case-session-1',
      targetId: 'tray:screenshot-1:scale',
      value,
      project: projectVisualValue,
    })
  }

  assert.equal(scheduler.activeCount, 1)
  assert.equal(visualProjectionCount, 0)
  assert.equal(authoritativeSynchronizationCount, 0)

  scheduler.flushNext()

  assert.equal(currentValue, 100)
  assert.equal(visualProjectionCount, 1)
  assert.equal(authoritativeSynchronizationCount, 0)
  assert.equal(coordinator.isActive(), true)

  const completion = coordinator.finish()
  assert.equal(completion.status, 'finished')
  assert.equal(completion.projected, false)

  // Models App's flushSync completion epoch. A finished edit forces exactly
  // one complete-project synchronization even when the final frame already
  // projected the latest exact value.
  authoritativeSynchronizationCount += 1

  assert.equal(authoritativeSynchronizationCount, 1)
  assert.equal(visualProjectionCount, 1)
  assert.equal(scheduler.activeCount, 0)
  assert.equal(coordinator.isActive(), false)
})

test('finish projects an exact post-frame value once and leaves no catch-up frame', () => {
  const { coordinator, scheduler } = createFixture()
  const projected: number[] = []
  const identity = {
    sessionId: 'case-session-1',
    targetId: 'tray:screenshot-1:x',
  }

  coordinator.stage({
    ...identity,
    value: 12.25,
    project: (value) => projected.push(value),
  })
  scheduler.flushNext()
  coordinator.stage({
    ...identity,
    value: 87.75,
    project: (value) => projected.push(value),
  })
  const supersededFrame = [...scheduler.callbacks.keys()].find(
    (handle) => !scheduler.canceled.has(handle),
  )

  assert.deepEqual(coordinator.finish(identity), {
    status: 'finished',
    projected: true,
    coordinator: {
      status: 'idle',
      active: false,
      frameQueued: false,
      sessionId: null,
      targetId: null,
    },
  })
  assert.deepEqual(projected, [12.25, 87.75])
  assert.equal(scheduler.activeCount, 0)

  if (supersededFrame !== undefined) scheduler.invoke(supersededFrame)
  assert.deepEqual(projected, [12.25, 87.75])
  assert.equal(coordinator.finish(identity).status, 'no-op')
})

test('a 100-point drag burst retains and projects the latest exact point', () => {
  const { coordinator, scheduler } = createFixture()
  const projected: Readonly<{ x: number; y: number }>[] = []

  for (let index = 0; index < 100; index += 1) {
    const value = Object.freeze({ x: index + 0.25, y: 100 - index + 0.75 })
    coordinator.stage({
      sessionId: 'case-session-1',
      targetId: 'tray:screenshot-1:point',
      value,
      project: (latest) => projected.push(latest),
    })
  }

  scheduler.flushNext()
  assert.deepEqual(projected, [{ x: 99.25, y: 1.75 }])
})

test('all continuous scalar target classes use the same opaque coordinator path', () => {
  const targetIds = [
    'tray:screenshot-1:x',
    'tray:screenshot-1:y',
    'tray:screenshot-1:scale',
    'tray:screenshot-1:focal-x',
    'tray:screenshot-1:focal-y',
    'tray:screenshot-1:zoom',
  ] as const

  for (const [index, targetId] of targetIds.entries()) {
    const { coordinator, scheduler } = createFixture()
    const projected: number[] = []
    coordinator.stage({
      sessionId: 'case-session-1',
      targetId,
      value: index + 0.125,
      project: (latest) => projected.push(latest),
    })
    scheduler.flushNext()
    assert.deepEqual(projected, [index + 0.125], targetId)
  }
})

test('switching exact targets finishes the old target before beginning the new one', () => {
  const { coordinator, scheduler } = createFixture()
  const projected: string[] = []
  const firstResult = coordinator.stage({
    sessionId: 'case-session-1',
    targetId: 'cover:game-logo:x',
    value: 42,
    project: (value) => projected.push(`x:${value}`),
  })
  const firstFrame = [...scheduler.callbacks.keys()][0]
  const secondResult = coordinator.stage({
    sessionId: 'case-session-1',
    targetId: 'cover:game-logo:y',
    value: 64,
    project: (value) => projected.push(`y:${value}`),
  })

  assert.equal(firstResult.status, 'scheduled')
  assert.equal(secondResult.status, 'switched')
  assert.deepEqual(projected, ['x:42'])
  assert.equal(scheduler.canceled.has(firstFrame), true)
  assert.equal(scheduler.activeCount, 1)
  scheduler.flushNext()
  assert.deepEqual(projected, ['x:42', 'y:64'])
})

test('a stale Case session retires pending work without projecting it', () => {
  const { coordinator, scheduler, setSessionId } = createFixture()
  const projected: number[] = []
  coordinator.stage({
    sessionId: 'case-session-1',
    targetId: 'left-spine:artwork-1:scale',
    value: 3,
    project: (value) => projected.push(value),
  })
  setSessionId('case-session-2')

  scheduler.flushNext()
  assert.equal(projected.length, 0)
  assert.equal(coordinator.isActive(), false)
  assert.equal(coordinator.stage({
    sessionId: 'case-session-1',
    targetId: 'left-spine:artwork-1:scale',
    value: 4,
    project: (value) => projected.push(value),
  }).status, 'session-stale')
})

test('hostile callbacks from canceled frames remain inert', () => {
  const { coordinator, scheduler } = createFixture()
  const projected: number[] = []
  coordinator.stage({
    sessionId: 'case-session-1',
    targetId: 'tray:screenshot-1:zoom',
    value: 1.75,
    project: (value) => projected.push(value),
  })
  const canceledHandle = [...scheduler.callbacks.keys()][0]
  assert.equal(coordinator.retire().status, 'retired')
  assert.equal(scheduler.canceled.has(canceledHandle), true)

  scheduler.invoke(canceledHandle)
  assert.deepEqual(projected, [])
  assert.equal(coordinator.isActive(), false)
})

test('finish, cancellation policies, target checks, and disposal are exact', () => {
  const { coordinator, scheduler } = createFixture()
  const projected: number[] = []
  const identity = {
    sessionId: 'case-session-1',
    targetId: 'tray:screenshot-1:focal-x',
  }
  coordinator.stage({
    ...identity,
    value: 77,
    project: (value) => projected.push(value),
  })

  assert.equal(coordinator.finish({
    ...identity,
    targetId: 'tray:screenshot-1:focal-y',
  }).status, 'target-stale')
  assert.equal(coordinator.cancel('finish-latest', identity).status, 'finished')
  assert.deepEqual(projected, [77])
  assert.equal(coordinator.finish().status, 'no-op')

  coordinator.stage({
    ...identity,
    value: 88,
    project: (value) => projected.push(value),
  })
  assert.equal(coordinator.cancel('discard', identity).status, 'retired')
  assert.deepEqual(projected, [77])
  assert.equal(scheduler.activeCount, 0)

  coordinator.stage({
    ...identity,
    value: 99,
    project: (value) => projected.push(value),
  })
  assert.deepEqual(coordinator.dispose(), {
    status: 'retired',
    coordinator: {
      status: 'disposed',
      active: false,
      frameQueued: false,
      sessionId: null,
      targetId: null,
    },
  })
  assert.equal(coordinator.dispose().status, 'disposed')
  assert.equal(coordinator.stage({
    ...identity,
    value: 100,
    project: (value) => projected.push(value),
  }).status, 'disposed')
  assert.deepEqual(projected, [77])
})
