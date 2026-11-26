import assert from 'node:assert/strict'
import test from 'node:test'
import { materializeDiscProject } from './canonicalProject.ts'
import { createBlankDiscSavedProject } from '../project/blankDiscProject.ts'
import { createApplicationLifecycleStateStore } from './applicationLifecycleStateStore.ts'
import { createProjectAsyncWork } from './projectAsyncWork.ts'
import { commandSucceeded } from './applicationCommandTypes.ts'
import { createApplicationLifecycleCompositionRoot } from './applicationLifecycleCompositionRoot.ts'
import { adoptPinnedDiscSave, createLoadedProjectSession, editDiscBackground, pinDiscSaveRevision,
  resumeProjectSession, returnProjectSessionHome, selectIsActiveProjectDirty } from './projectSession.ts'

function loaded(id: string) {
  return createLoadedProjectSession({ sessionId: id, currentPath: id + '.sbls',
    persistenceFormat: 'sbls-package-v1', project: createBlankDiscSavedProject() })
}

function fixture() {
  const store = createApplicationLifecycleStateStore({ initialState: loaded('first'), discHistoryLimit: 2 })
  const disc = () => {
    const session = store.getSnapshot().state.activeSession
    assert.equal(session?.kind, 'disc')
    return session
  }
  const edit = (scale: number, track = true) => {
    const { id, revision } = disc()
    return store.commitTransition(store.getSnapshot().generation,
      state => editDiscBackground(state, { sessionId: id, expectedRevision: revision,
        operation: { kind: 'transform', scale, offset: { x: 0, y: 0 } },
      }), track ? 'record-disc-transaction' : undefined)
  }
  return { store, edit, disc }
}

test('document and its new history are published together; a reentrant Undo returns exact snapshots', () => {
  const { store, edit, disc } = fixture()
  const original = disc()
  const events: number[] = []
  store.subscribe(snapshot => {
    const session = snapshot.state.activeSession!
    events.push(session.revision)
    assert.equal(snapshot.discHistory?.current, session.project)
    if (session.revision === 1) {
      assert.equal(snapshot.discHistory?.past[0], original.project)
      assert.equal(store.stepDiscHistory(snapshot.generation, 'undo').status, 'committed')
    }
  })
  const written = edit(1.5)
  assert.equal(written.snapshot.state.activeSession?.revision, 1)
  assert.equal(written.snapshot.discHistory?.past[0], original.project)
  assert.deepEqual(events, [1, 2])
  assert.equal(disc().project, original.project)
  assert.equal(store.stepDiscHistory(written.snapshot.generation, 'redo').status, 'stale')
  assert.equal(store.stepDiscHistory(store.getSnapshot().generation, 'redo').status, 'committed')
  assert.equal(disc().revision, 3)
  assert.equal(disc().project.background.scale, 1.5)
})

test('Save As and Home/Resume preserve history; opening a different file resets it', () => {
  const { store, edit, disc } = fixture()
  edit(1.5)
  const pinned = pinDiscSaveRevision(disc())
  const history = store.getSnapshot().discHistory
  assert.equal(store.commitTransition(store.getSnapshot().generation,
    state => adoptPinnedDiscSave(state, pinned, 'renamed.sbls')).status, 'committed')
  assert.equal(store.getSnapshot().discHistory, history)
  store.commitTransition(store.getSnapshot().generation, returnProjectSessionHome)
  assert.equal(store.stepDiscHistory(store.getSnapshot().generation, 'undo').status, 'no-op')
  store.commitTransition(store.getSnapshot().generation, resumeProjectSession)
  assert.equal(store.getSnapshot().discHistory, history)
  assert.equal(store.stepDiscHistory(store.getSnapshot().generation, 'undo').status, 'committed')
  assert.equal(disc().currentPath, 'renamed.sbls')
  assert.equal(selectIsActiveProjectDirty(store.getSnapshot().state), true)
  assert.equal(store.commitTransition(store.getSnapshot().generation, () => loaded('second')).status, 'committed')
  assert.equal(store.getSnapshot().discHistory?.sessionId, 'second')
  assert.equal(store.stepDiscHistory(store.getSnapshot().generation, 'undo').status, 'no-op')
  assert.equal(store.stepDiscHistory(store.getSnapshot().generation, 'redo').status, 'no-op')
})

test('an unclassified edit invalidates old history instead of undoing through a legacy edit', () => {
  const { store, edit, disc } = fixture()
  edit(1.5)
  edit(1.75, false)
  assert.equal(store.getSnapshot().discHistory?.past.length, 0)
  assert.equal(store.stepDiscHistory(store.getSnapshot().generation, 'undo').status, 'no-op')
  assert.equal(disc().project.background.scale, 1.75)
})

test('lifecycle root restores a complete compound preset and USK edit, not disjoint partial fields', async () => {
  const root = createApplicationLifecycleCompositionRoot({ initialState: loaded('disc'), discHistoryLimit: 2 })
  const read = () => {
    const session = root.getLifecycleState().activeSession
    assert.equal(session?.kind, 'disc')
    return session
  }
  const basis = () => ({ sessionId: read().id, expectedGeneration: root.getStateSnapshot().generation })
  const projectProjection = () => {
    const { background, ...projection } = materializeDiscProject(read().project)
    void background
    return projection
  }
  const ack = () => root.acknowledgeDiscHistoryProjection({ ...basis(), projection: projectProjection() })
  const original = read()
  const badge = original.project.ratingBadge!
  const ratingLayout = { ...badge.layout, enabled: true, x: 19 }
  const uskLayout = { ...badge.uskBadge.layout, enabled: true, x: 28 }
  assert.equal(root.commitDiscSupplementalUsk({
    ...basis(), ratingValue: '16', placement: { layout: ratingLayout, uskLayout },
  }), 'committed')
  const rated = read()
  assert.equal(root.commitDiscBackgroundCompound({
    sessionId: rated.id, expectedRevision: rated.revision, operation: {
      kind: 'visibility', enabled: false, scale: 1.25, offset: { x: 1, y: 2 },
    },
  }, { kind: 'preset', fields: {
    ratingBadge: { layout: { x: 29, y: 30, scale: 1 }, uskLayout: { x: 45, y: 46, scale: 1 } },
  } }), 'committed')
  const compound = read()
  assert.equal(compound.project.ratingBadge?.uskBadge.layout.x, 45)
  const stale = projectProjection()
  const intercepted: string[] = []
  root.subscribe(() => {
    if (intercepted.length || read().revision !== compound.revision + 1) return
    const materialized = materializeDiscProject(read().project)
    intercepted.push(root.synchronizeDiscLegacyProject({ sessionId: read().id, legacy: stale }))
    intercepted.push(root.synchronizeCurrentProject({ sessionId: read().id, kind: 'disc',
      project: { ...stale, background: materialized.background } }))
    intercepted.push(root.acknowledgeDiscHistoryProjection({ ...basis(), projection: stale }))
  })
  assert.equal(root.stepDiscDocumentHistory({ ...basis(), direction: 'undo' }), 'committed')
  assert.equal(read().project, rated.project)
  assert.equal(ack(), 'committed')
  assert.equal(root.stepDiscDocumentHistory({ ...basis(), direction: 'undo' }), 'committed')
  assert.equal(read().project, original.project)
  assert.equal(ack(), 'committed')
  assert.equal(root.stepDiscDocumentHistory({ ...basis(), direction: 'redo' }), 'committed')
  assert.equal(read().project, rated.project)
  assert.equal(ack(), 'committed')
  assert.equal(root.stepDiscDocumentHistory({ ...basis(), direction: 'redo' }), 'committed')
  assert.equal(read().project, compound.project)
  assert.equal(ack(), 'committed')
  assert.deepEqual(intercepted, ['stale-session', 'stale-session', 'invalid'])
})

test('Undo returns to clean content without reviving async Steam import authority', async () => {
  const { store, edit, disc } = fixture()
  // Deliberately omit pruning subscriptions: admission at completion must be safe
  // even when lifecycle observation is delayed by the editor.
  const work = createProjectAsyncWork(store.getSnapshot)
  const original = disc()
  assert.equal(selectIsActiveProjectDirty(store.getSnapshot().state), false)
  const request = work.begin('steam-game')
  assert.equal(request.contentRevision, original.revision)
  assert.equal(work.isCurrent(request), true)
  let releaseLogo!: () => void
  const logoReady = new Promise<void>(resolve => { releaseLogo = resolve })
  const returned = logoReady.then(() => ({
    committed: work.commit(request, () => { assert.fail('Retired logo or metadata applied') }),
    published: work.publish(request, () => { assert.fail('Retired import published feedback') }),
  }))

  const edited = edit(1.25)
  assert.equal(edited.status, 'committed')
  assert.equal(selectIsActiveProjectDirty(edited.snapshot.state), true)
  assert.equal(store.stepDiscHistory(edited.snapshot.generation, 'undo').status, 'committed')
  assert.equal(disc().project, original.project)
  assert.equal(disc().id, request.sessionId)
  assert.equal(disc().revision, original.revision + 2)
  assert.equal(selectIsActiveProjectDirty(store.getSnapshot().state), false)
  assert.equal(store.acknowledgeDocumentProjection(store.getSnapshot().generation, 'disc').status, 'committed')

  releaseLogo()
  assert.deepEqual(await returned, { committed: false, published: false })
  assert.equal(disc().project, original.project)
  assert.equal(store.stepDiscHistory(store.getSnapshot().generation, 'redo').status, 'committed')
  assert.equal(disc().revision, original.revision + 3)
  assert.equal(selectIsActiveProjectDirty(store.getSnapshot().state), true)
  assert.equal(store.acknowledgeDocumentProjection(store.getSnapshot().generation, 'disc').status, 'committed')
  const fresh = work.begin('steam-game')
  assert.equal(fresh.contentRevision, disc().revision)
  let freshCommits = 0
  assert.equal(work.commit(fresh, () => { freshCommits += 1 }), true)
  assert.equal(freshCommits, 1)
})

test('real PNG command cannot capture the editor between restored revision and mirror acknowledgement', async () => {
  const root = createApplicationLifecycleCompositionRoot({
    initialState: loaded('disc'),
    discHistoryLimit: 2,
    exportPng: {
      availability: 'implemented',
      getCapability: () => ({ canExecute: true }),
      executeExportPng: () => {
        exports += 1
        return commandSucceeded(undefined)
      },
    },
  })
  let exports = 0
  const read = () => {
    const session = root.getLifecycleState().activeSession
    assert.equal(session?.kind, 'disc')
    return session
  }
  const basis = () => ({ sessionId: read().id, expectedGeneration: root.getStateSnapshot().generation })
  assert.equal(root.commitDiscSupplementalUsk({ ...basis(), ratingValue: '16' }), 'committed')
  const blocked: Promise<unknown>[] = []
  const stop = root.subscribe(() => {
    if (root.getStateSnapshot().discHistoryProjectionPending && blocked.length === 0) {
      blocked.push(root.dispatch('export.png'))
    }
  })
  assert.equal(root.stepDiscDocumentHistory({ ...basis(), direction: 'undo' }), 'committed')
  assert.equal(root.getApplicationCommandCapabilities()['export.png'].canExecute, false)
  assert.equal(blocked.length, 1)
  await blocked[0]
  assert.equal(exports, 0)
  const { background, ...projection } = materializeDiscProject(read().project)
  void background
  assert.equal(root.acknowledgeDiscHistoryProjection({ ...basis(), projection }), 'committed')
  assert.equal(root.getApplicationCommandCapabilities()['export.png'].canExecute, true)
  await root.dispatch('export.png')
  assert.equal(exports, 1)
  stop()
})
