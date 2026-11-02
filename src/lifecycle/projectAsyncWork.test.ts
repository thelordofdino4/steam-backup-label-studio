import assert from 'node:assert/strict'
import test from 'node:test'
import { CURRENT_PROJECT_SCHEMA_VERSION } from '../project/projectSchema.ts'
import type { SavedDiscProject } from '../project/projectTypes.ts'
import { createApplicationLifecycleStateStore } from './applicationLifecycleStateStore.ts'
import { createProjectAsyncWork } from './projectAsyncWork.ts'
import {
  createNewProjectSession,
  createLoadedProjectSession,
  returnProjectSessionHome,
  resumeProjectSession,
  synchronizeActiveProjectContent,
  adoptSavedProjectBaseline,
} from './projectSession.ts'

function fixture() {
  const project: SavedDiscProject = {
    schemaVersion: CURRENT_PROJECT_SCHEMA_VERSION,
    projectType: 'disc', title: 'A', savedAt: '2026-11-01T12:00:00Z',
    game: { manualTitle: 'A', selectedSteamGame: null },
    template: { type: 'disc', variant: 'standardPrintableDisc', customDimensions: null },
    steamBackupLogo: { placement: 'top' },
    background: { scale: 1, offset: { x: 0, y: 0 }, imageDataUrl: null, note: '' },
  }
  const state = createNewProjectSession({ sessionId: 'A', project })
  const store = createApplicationLifecycleStateStore({ initialState: state })
  const work = createProjectAsyncWork(store.getSnapshot)
  store.subscribe(() => work.observeLifecycle())
  return { project, store, work }
}

test('a current request commits exactly once and carries immutable typed identity', () => {
  const { work } = fixture()
  const request = work.begin('steam-game')
  assert.equal(request.sessionId, 'A')
  assert.equal(request.contentRevision, 0)
  assert.equal(Object.isFrozen(request), true)
  let commits = 0
  assert.equal(work.commit(request, () => { commits += 1 }), true)
  assert.equal(work.commit(request, () => { commits += 1 }), false)
  assert.equal(work.publish(request, () => { commits += 1 }), false)
  assert.equal(commits, 1)
})

test('new request supersedes old request even for the same semantic target', () => {
  const { work } = fixture()
  const first = work.begin('background-artwork')
  const second = work.begin('background-artwork')
  assert.notEqual(first.requestId, second.requestId)
  assert.equal(work.isCurrent(first), false)
  assert.equal(work.isCurrent(second), true)
  assert.equal(work.publish(first, () => { assert.fail('stale failure') }), false)
})

test('one accepted mutation revokes competing old-revision work before React synchronization', () => {
  const { work } = fixture()
  const image = work.begin('background-artwork')
  const game = work.begin('steam-game')
  const discovery = work.begin('steam-metadata')
  work.commit(game, () => { assert.equal(work.isCurrent(image), false) })
  assert.equal(work.commit(image, () => { assert.fail('stale image') }), false)
  assert.equal(work.publish(discovery, () => { assert.fail('stale candidates') }), false)
  assert.equal(work.isCurrent(work.begin('title-artwork')), true)
})

test('a current proposal completion does not invalidate unrelated document work', () => {
  const { work } = fixture()
  const image = work.begin('background-artwork')
  const discovery = work.begin('artwork-discovery')
  assert.equal(work.publish(discovery, () => {}), true)
  assert.equal(work.isCurrent(image), true)
  assert.equal(work.isCurrent(discovery), false)
})

for (const transition of ['new', 'open', 'edit', 'home', 'home-and-resume'] as const) {
  test(`${transition} retires previous mutation and feedback authority`, () => {
    const { project, store, work } = fixture()
    const request = work.begin('steam-game')
    const result = store.commitTransition(store.getSnapshot().generation, state => {
      if (transition === 'new') return createNewProjectSession({ sessionId: 'B', project })
      if (transition === 'open') return createLoadedProjectSession({
        sessionId: 'B', project, currentPath: 'C:\\test.sbls', persistenceFormat: 'sbls-package-v1',
      })
      if (transition === 'edit') return synchronizeActiveProjectContent(state, {
        sessionId: 'A', kind: 'disc', project: { ...project, title: 'User edit' },
      })
      return returnProjectSessionHome(state)
    })
    assert.equal(result.status, 'committed')
    if (transition === 'home-and-resume') {
      store.commitTransition(store.getSnapshot().generation, resumeProjectSession)
    }
    assert.equal(work.commit(request, () => { assert.fail('stale mutation') }), false)
    assert.equal(work.publish(request, () => { assert.fail('stale status') }), false)
  })
}

test('Reset invalidates even when document content is already the default', () => {
  const { work } = fixture()
  const request = work.begin('steam-game')
  work.invalidate('steam-game')
  assert.equal(work.isCurrent(request), false)
})

test('read-time state checks reject stale work without depending on notification ordering', () => {
  const { store, project } = fixture()
  const work = createProjectAsyncWork(store.getSnapshot)
  const request = work.begin('steam-game')
  store.commitTransition(0, () => createNewProjectSession({ sessionId: 'B', project }))
  assert.equal(work.isCurrent(request), false)
})

test('no-op lifecycle synchronization keeps valid requests live', () => {
  const { store, work } = fixture()
  const request = work.begin('steam-game')
  store.commitTransition(0, state => state)
  assert.equal(work.isCurrent(request), true)
})

test('Home cannot acquire project mutation authority', () => {
  const { store, work } = fixture()
  store.commitTransition(0, returnProjectSessionHome)
  assert.equal(work.isCurrent(work.begin('steam-game')), false)
})

test('forged or cross-runtime tickets cannot commit', () => {
  const { work } = fixture()
  const request = work.begin('steam-game')
  assert.equal(work.isCurrent({ ...request }), false)
  assert.equal(fixture().work.isCurrent(request), false)
})

test('runtime disposal revokes work and rejects new requests', () => {
  const { work } = fixture()
  const request = work.begin('steam-game')
  work.dispose()
  assert.equal(work.isCurrent(request), false)
  assert.throws(() => work.begin('steam-game'), /disposed/)
})

test('failed application cannot replay a consumed request or revive competing work', () => {
  const { work } = fixture()
  const request = work.begin('steam-game')
  const image = work.begin('background-artwork')
  assert.throws(() => work.commit(request, () => { throw new Error('apply failed') }), /apply failed/)
  assert.equal(work.isCurrent(request), false)
  assert.equal(work.isCurrent(image), false)
  let reports = 0
  assert.equal(work.publish(request, () => { reports += 1 }), true)
  assert.equal(work.publish(request, () => { reports += 1 }), false)
  assert.equal(reports, 1)
})

test('Save path and clean-baseline adoption preserve a pending same-content request', () => {
  const { project, store, work } = fixture()
  const request = work.begin('background-artwork')
  const result = store.commitTransition(0, state => adoptSavedProjectBaseline(state, {
    acceptedSnapshot: project, currentPath: 'C:\\saved.sbls', persistenceFormat: 'sbls-package-v1',
  }))
  assert.equal(result.status, 'committed')
  assert.equal(result.snapshot.state.activeSession?.revision, 0)
  assert.equal(work.isCurrent(request), true)
  assert.equal(work.commit(request, () => {}), true)
})

test('derived reconciliation survives its parent content commit but not Home/resume or Reset', () => {
  const { project, store, work } = fixture()
  const continuation = work.captureSessionContinuation()
  store.commitTransition(0, state => synchronizeActiveProjectContent(state, {
    sessionId: 'A', kind: 'disc', project: { ...project, title: 'Parent command' },
  }))
  assert.equal(work.isSessionContinuationCurrent(continuation), true)
  store.commitTransition(1, returnProjectSessionHome)
  store.commitTransition(2, resumeProjectSession)
  assert.equal(work.isSessionContinuationCurrent(continuation), false)
  const reset = work.captureSessionContinuation()
  work.invalidateAll()
  assert.equal(work.isSessionContinuationCurrent(reset), false)
})

test('new work retires a failed application feedback permission', () => {
  const { work } = fixture()
  const request = work.begin('background-artwork')
  assert.throws(() => work.commit(request, () => { throw new Error('failed') }))
  work.begin('background-artwork')
  assert.equal(work.publish(request, () => { assert.fail('old failure') }), false)
})
