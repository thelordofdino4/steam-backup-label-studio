import assert from 'node:assert/strict'
import test from 'node:test'
import type { SavedDiscProject } from '../project/projectTypes.ts'
import {
  createApplicationLifecycleStateStore,
} from './applicationLifecycleStateStore.ts'
import {
  createNewProjectSession,
  resumeProjectSession,
  returnProjectSessionHome,
} from './projectSession.ts'

function createDiscProject(): SavedDiscProject {
  return {
    schemaVersion: '0.2.0',
    projectType: 'disc',
    title: 'Lifecycle Store Disc',
    savedAt: '2026-07-26T12:00:00.000Z',
    game: { manualTitle: 'Lifecycle Store Disc', selectedSteamGame: null },
    template: {
      type: 'disc',
      variant: 'standardPrintableDisc',
      customDimensions: null,
    },
    steamBackupLogo: { placement: 'top' },
    background: {
      scale: 1,
      offset: { x: 0, y: 0 },
      imageDataUrl: null,
      note: 'state-store fixture',
    },
  }
}

function createDiscState() {
  return createNewProjectSession({
    sessionId: 'store-disc',
    project: createDiscProject(),
  })
}

test('state store defensively captures an immutable explicit seed', () => {
  const mutableSeed = structuredClone(createDiscState())
  const store = createApplicationLifecycleStateStore({
    initialState: mutableSeed,
  })
  const initial = store.getSnapshot()

  assert.equal(initial.generation, 0)
  assert.equal(initial.state.activeSession?.displayName, 'Lifecycle Store Disc')
  assert.equal(Object.isFrozen(initial), true)
  assert.equal(Object.isFrozen(initial.state), true)
  assert.equal(Object.isFrozen(initial.state.activeSession), true)
  assert.equal(Object.isFrozen(initial.state.activeSession?.project), true)
  assert.equal(
    Object.isFrozen(initial.state.activeSession?.project.background),
    true,
  )

  Object.assign(mutableSeed.activeSession!, { displayName: 'Mutated outside' })
  assert.equal(initial.state.activeSession?.displayName, 'Lifecycle Store Disc')
})

test('commits are monotonic while semantic no-ops and stale transitions are inert', () => {
  const store = createApplicationLifecycleStateStore({ initialState: createDiscState() })
  const observed: number[] = []
  store.subscribe((committed) => {
    assert.equal(store.getSnapshot(), committed)
    observed.push(committed.generation)
  })

  const committed = store.commitTransition(0, returnProjectSessionHome)
  assert.equal(committed.status, 'committed')
  assert.equal(committed.snapshot.generation, 1)
  assert.equal(committed.snapshot.state.visibleWorkspace, 'home')

  const noOp = store.commitTransition(1, (state) => ({ ...state }))
  assert.equal(noOp.status, 'no-op')
  assert.equal(noOp.snapshot.generation, 1)

  const stale = store.commitTransition(0, resumeProjectSession)
  assert.equal(stale.status, 'stale')
  assert.equal(stale.snapshot.generation, 1)
  assert.deepEqual(observed, [1])

  assert.throws(
    () => store.commitTransition(1, () => {
      throw new Error('transition failed')
    }),
    /transition failed/,
  )
  assert.equal(store.getSnapshot().generation, 1)
  assert.deepEqual(observed, [1])
})

test('notification uses a stable snapshot and isolates unsubscribe and errors', () => {
  const subscriberErrors: unknown[] = []
  const store = createApplicationLifecycleStateStore({
    initialState: createDiscState(),
    onSubscriberError: (error) => subscriberErrors.push(error),
  })
  const calls: string[] = []
  let unsubscribeSecond = () => {}

  store.subscribe(() => {
    calls.push('first')
    unsubscribeSecond()
  })
  unsubscribeSecond = store.subscribe(() => calls.push('second'))
  store.subscribe(() => {
    calls.push('throws')
    throw new Error('observer failed')
  })
  store.subscribe(() => calls.push('last'))

  store.commitTransition(0, returnProjectSessionHome)
  assert.deepEqual(calls, ['first', 'second', 'throws', 'last'])
  assert.equal(subscriberErrors.length, 1)

  store.commitTransition(1, resumeProjectSession)
  assert.deepEqual(calls, [
    'first',
    'second',
    'throws',
    'last',
    'first',
    'throws',
    'last',
  ])
  assert.equal(subscriberErrors.length, 2)

  store.dispose()
  assert.throws(() => store.subscribe(() => {}), /disposed/)
  assert.throws(
    () => store.commitTransition(2, returnProjectSessionHome),
    /disposed/,
  )
})
