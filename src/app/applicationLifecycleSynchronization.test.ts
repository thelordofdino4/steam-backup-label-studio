import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createApplicationLifecycleCompositionRoot,
} from '../lifecycle/applicationLifecycleCompositionRoot.ts'
import {
  createLoadedProjectSession,
  selectIsActiveProjectDirty,
} from '../lifecycle/projectSession.ts'
import { createBlankDiscSavedProject } from '../project/blankDiscProject.ts'
import {
  createBlankJewelCaseSavedProject,
} from '../project/caseInsertProjectAdapters.ts'

test('root synchronization publishes one complete canonical change and no identical content', () => {
  const baseline = createBlankDiscSavedProject()
  const root = createApplicationLifecycleCompositionRoot({
    initialState: createLoadedProjectSession({
      sessionId: 'sync-root',
      project: baseline,
      currentPath: 'C:\\projects\\sync.sbls',
      persistenceFormat: 'sbls-package-v1',
    }),
  })
  let publications = 0
  root.subscribe(() => publications += 1)
  const before = root.getSnapshot()

  const identical = root.synchronizeCurrentProject({
    sessionId: 'sync-root',
    kind: 'disc',
    project: { ...baseline, savedAt: '2030-01-01T00:00:00.000Z' },
  })
  assert.equal(identical, 'no-op')
  assert.equal(root.getSnapshot(), before)
  assert.equal(publications, 0)

  const edited = {
    ...baseline,
    title: 'Synchronized edit',
    game: { ...baseline.game, manualTitle: 'Synchronized edit' },
  }
  const synchronized = root.synchronizeCurrentProject({
    sessionId: 'sync-root',
    kind: 'disc',
    project: edited,
  })
  assert.equal(synchronized, 'synchronized')
  assert.equal(publications, 1)
  const session = root.getLifecycleState().activeSession!
  assert.equal(session.project.title, 'Synchronized edit')
  assert.equal(session.revision, 1)
  assert.equal(session.id, 'sync-root')
  assert.equal(session.currentPath, 'C:\\projects\\sync.sbls')
  assert.equal(session.persistenceFormat, 'sbls-package-v1')
  assert.deepEqual(session.cleanBaseline?.exactSnapshot, baseline)
  assert.deepEqual(session.lastEditorRoute, { workspace: 'disc' })
  assert.equal(selectIsActiveProjectDirty(root.getLifecycleState()), true)

  assert.equal(root.synchronizeCurrentProject({
    sessionId: 'retired-root',
    kind: 'disc',
    project: baseline,
  }), 'stale-session')
  assert.equal(root.synchronizeCurrentProject({
    sessionId: 'sync-root',
    kind: 'caseInsert',
    project: createBlankJewelCaseSavedProject(),
  }), 'wrong-kind')
  assert.equal(publications, 1)

  const routed = root.synchronizeCurrentEditorRoute({
    sessionId: 'sync-root',
    kind: 'disc',
    route: { workspace: 'disc' },
  })
  assert.equal(routed, 'no-op')
  assert.equal(publications, 1)
  assert.equal(root.synchronizeCurrentEditorRoute({
    sessionId: 'retired-root',
    kind: 'disc',
    route: { workspace: 'disc' },
  }), 'stale-session')
  assert.equal(root.synchronizeCurrentEditorRoute({
    sessionId: 'sync-root',
    kind: 'caseInsert',
    route: { workspace: 'caseInsert', surface: 'back' },
  }), 'wrong-kind')
  assert.equal(publications, 1)
})

test('root synchronizes one exact Case route without project revision or dirty churn', () => {
  const project = createBlankJewelCaseSavedProject()
  const root = createApplicationLifecycleCompositionRoot({
    initialState: createLoadedProjectSession({
      sessionId: 'route-root',
      project,
      currentPath: 'C:\\projects\\route-root.sbls',
      persistenceFormat: 'sbls-package-v1',
      lastEditorRoute: { workspace: 'caseInsert', surface: 'front' },
    }),
  })
  let publications = 0
  root.subscribe(() => publications += 1)

  assert.equal(root.synchronizeCurrentEditorRoute({
    sessionId: 'route-root',
    kind: 'caseInsert',
    route: { workspace: 'caseInsert', surface: 'back' },
  }), 'synchronized')
  const routed = root.getLifecycleState()
  assert.deepEqual(routed.activeSession?.lastEditorRoute, {
    workspace: 'caseInsert',
    surface: 'back',
  })
  assert.equal(routed.activeSession?.revision, 0)
  assert.equal(selectIsActiveProjectDirty(routed), false)
  assert.equal(publications, 1)
  assert.equal(root.synchronizeCurrentEditorRoute({
    sessionId: 'route-root',
    kind: 'caseInsert',
    route: { workspace: 'caseInsert', surface: 'back' },
  }), 'no-op')
  assert.equal(publications, 1)
  root.dispose()
})
