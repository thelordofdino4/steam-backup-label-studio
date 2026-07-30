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
})
