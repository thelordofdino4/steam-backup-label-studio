import assert from 'node:assert/strict'
import test from 'node:test'
import { createBlankDiscSavedProject } from '../project/blankDiscProject.ts'
import {
  adoptPinnedDiscSave, createLoadedProjectSession, editDiscBackground,
  pinDiscSaveRevision, restoreHistoryDiscProject, selectIsActiveProjectDirty,
} from './projectSession.ts'
import { createDocumentHistory, recordDocumentTransition, stepDocumentHistory } from './documentHistory.ts'

function fixture() {
  const blank = createBlankDiscSavedProject()
  const state = createLoadedProjectSession({
    sessionId: 'disc', currentPath: 'fixture.sbls', persistenceFormat: 'sbls-package-v1',
    project: { ...blank, background: {
      ...blank.background,
      imageDataUrl: 'data:image/png;base64,aW1tdXRhYmxlLWhpc3RvcnktZml4dHVyZQ==',
      imageSize: { width: 2000, height: 2000 },
      imageSource: { source: 'uploaded', sourceLabel: 'History fixture', sourceId: null },
    } },
  })
  const p = state.activeSession
  assert.equal(p?.kind, 'disc')
  const state1 = editDiscBackground(state, { sessionId: p.id, expectedRevision: 0,
    operation: { kind: 'transform', scale: 1.5, offset: { x: 2, y: 3 } } })
  const p1 = state1.activeSession
  assert.equal(p1?.kind, 'disc')
  const p2 = editDiscBackground(state1, { sessionId: p.id, expectedRevision: 1,
    operation: { kind: 'transform', scale: 1.8, offset: { x: 4, y: 7 } } }).activeSession
  assert.equal(p2?.kind, 'disc')
  return { a: p.project, b: p1.project, c: p2.project, id: p.id, state1, p1 }
}

test('bounded history retains the exact immutable content and shared asset', () => {
  const { a, b, c, id } = fixture()
  let h = createDocumentHistory(id, a, 1)
  h = recordDocumentTransition(h, id, a, b)
  h = recordDocumentTransition(h, id, b, c)
  assert.deepEqual(h.past, [b])
  assert.equal(h.current, c)
  assert.ok(b.background.asset)
  assert.equal(c.background.asset, b.background.asset)
  h = stepDocumentHistory(h, id, c, 'undo')
  assert.equal(h.current, b)
  assert.equal(h.future[0], c)
  assert.equal(stepDocumentHistory(h, id, b, 'undo'), h)
  h = stepDocumentHistory(h, id, b, 'redo')
  assert.equal(h.current, c)
})

test('stale caller and no-op preserve history; a new accepted edit clears redo', () => {
  const { a, b, c, id } = fixture()
  const h = recordDocumentTransition(createDocumentHistory(id, a, 4), id, a, b)
  assert.equal(stepDocumentHistory(h, 'replacement', b, 'undo'), h)
  const undone = stepDocumentHistory(h, id, b, 'undo')
  assert.equal(recordDocumentTransition(undone, id, a, a), undone)
  assert.equal(recordDocumentTransition(undone, id, b, c), undone)
  const next = recordDocumentTransition(undone, id, a, c)
  assert.equal(next.current, c)
  assert.deepEqual(next.future, [])
})

test('history restoration advances content revision without restoring the old Save As path or baseline', () => {
  const { a, b, id, state1, p1 } = fixture()
  const saved = adoptPinnedDiscSave(state1, pinDiscSaveRevision(p1), 'renamed.sbls')
  const session = saved.activeSession
  assert.equal(session?.kind, 'disc')
  assert.equal(selectIsActiveProjectDirty(saved), false)
  const h = recordDocumentTransition(createDocumentHistory(id, a, 4), id, a, b)
  const undoneHistory = stepDocumentHistory(h, id, b, 'undo')
  assert.equal(undoneHistory.current, a)
  const undone = restoreHistoryDiscProject(saved, session, a)
  const u = undone.activeSession
  assert.equal(u?.kind, 'disc')
  assert.equal(u.revision, 2)
  assert.equal(u.currentPath, 'renamed.sbls')
  assert.equal(u.cleanBaseline, session.cleanBaseline)
  assert.equal(u.lastEditorRoute, session.lastEditorRoute)
  assert.equal(selectIsActiveProjectDirty(undone), true)
  assert.equal(restoreHistoryDiscProject(undone, session, b), undone)
  const redone = restoreHistoryDiscProject(undone, u, b)
  assert.equal(redone.activeSession?.revision, 3)
  assert.equal(redone.activeSession?.project, b)
  assert.equal(selectIsActiveProjectDirty(redone), false)
})
