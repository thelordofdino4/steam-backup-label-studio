import assert from 'node:assert/strict'
import test from 'node:test'
import { createCaseInsertProjectSnapshot } from '../project/caseInsertProjectAdapters.ts'
import type { SavedDiscProject } from '../project/projectTypes.ts'
import { createCanonicalProjectComparisonValue } from './canonicalProject.ts'
import {
  adoptSavedProjectBaseline,
  captureApplicationLifecycleState,
  closeProjectSession,
  createEmptyApplicationLifecycleState,
  createLoadedProjectSession,
  createNewProjectSession,
  replaceActiveProjectContent,
  resumeProjectSession,
  returnProjectSessionHome,
  selectIsActiveProjectDirty,
  synchronizeActiveProjectContent,
  updateLastEditorRoute,
} from './projectSession.ts'

function createDiscProject(
  title = 'Session Disc',
  savedAt = '2026-07-26T12:00:00.000Z',
): SavedDiscProject {
  return {
    schemaVersion: '0.2.0',
    projectType: 'disc',
    title,
    savedAt,
    game: { manualTitle: title, selectedSteamGame: null },
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
      note: 'session fixture',
    },
  }
}

test('empty, new, and loaded lifecycle states establish one-session invariants', () => {
  const empty = createEmptyApplicationLifecycleState()
  assert.deepEqual(empty, { activeSession: null, visibleWorkspace: 'home' })
  assert.equal(selectIsActiveProjectDirty(empty), false)

  const fresh = createNewProjectSession({
    sessionId: 'session-new',
    project: createDiscProject(),
  })
  assert.equal(fresh.activeSession?.id, 'session-new')
  assert.equal(fresh.activeSession?.currentPath, null)
  assert.equal(fresh.activeSession?.persistenceFormat, null)
  assert.equal(fresh.activeSession?.cleanBaseline, null)
  assert.equal(fresh.activeSession?.revision, 0)
  assert.equal(fresh.visibleWorkspace, 'disc')
  assert.equal(selectIsActiveProjectDirty(fresh), true)

  const freshCase = createNewProjectSession({
    sessionId: 'session-new-case',
    project: createCaseInsertProjectSnapshot({ manualGameTitle: 'New Case' }),
  })
  assert.equal(freshCase.activeSession?.currentPath, null)
  assert.equal(freshCase.activeSession?.persistenceFormat, null)
  assert.equal(freshCase.activeSession?.cleanBaseline, null)
  assert.equal(freshCase.visibleWorkspace, 'caseInsert')
  assert.equal(selectIsActiveProjectDirty(freshCase), true)

  const loaded = createLoadedProjectSession({
    sessionId: 'session-loaded',
    currentPath: 'C:\\projects\\loaded.sbls.json',
    persistenceFormat: 'legacy-json',
    project: createDiscProject(),
  })
  assert.equal(loaded.activeSession?.id, 'session-loaded')
  assert.equal(loaded.activeSession?.persistenceFormat, 'legacy-json')
  assert.equal(loaded.activeSession?.cleanBaseline?.exactSnapshot.savedAt,
    '2026-07-26T12:00:00.000Z')
  assert.equal(selectIsActiveProjectDirty(loaded), false)
})

test('project replacement advances revision while navigation preserves session identity', () => {
  const loaded = createLoadedProjectSession({
    sessionId: 'stable-session',
    currentPath: 'loaded.sbls.json',
    persistenceFormat: 'legacy-json',
    project: createDiscProject(),
  })
  const changed = replaceActiveProjectContent(
    loaded,
    createDiscProject('Changed Disc'),
  )
  const home = returnProjectSessionHome(changed)
  const resumed = resumeProjectSession(home)

  assert.equal(changed.activeSession?.revision, 1)
  assert.equal(changed.activeSession?.id, 'stable-session')
  assert.equal(changed.activeSession?.currentPath, 'loaded.sbls.json')
  assert.equal(selectIsActiveProjectDirty(changed), true)
  assert.equal(home.visibleWorkspace, 'home')
  assert.equal(home.activeSession?.revision, 1)
  assert.equal(resumed.visibleWorkspace, 'disc')
  assert.equal(resumed.activeSession?.id, 'stable-session')
})

test('baseline adoption records the exact accepted snapshot and derives dirty state', () => {
  const original = createDiscProject()
  const loaded = createLoadedProjectSession({
    sessionId: 'save-session',
    currentPath: 'old.sbls.json',
    persistenceFormat: 'legacy-json',
    project: original,
  })
  const changedProject = createDiscProject('Changed Disc', '2026-07-26T12:01:00.000Z')
  const changed = replaceActiveProjectContent(loaded, changedProject)
  const staleBaseline = adoptSavedProjectBaseline(changed, {
    acceptedSnapshot: original,
    currentPath: 'new.sbls',
    persistenceFormat: 'sbls-package-v1',
  })
  const currentBaseline = adoptSavedProjectBaseline(changed, {
    acceptedSnapshot: changedProject,
    currentPath: 'new.sbls',
    persistenceFormat: 'sbls-package-v1',
  })

  assert.equal(staleBaseline.activeSession?.revision, 1)
  assert.equal(staleBaseline.activeSession?.currentPath, 'new.sbls')
  assert.equal(
    staleBaseline.activeSession?.persistenceFormat,
    'sbls-package-v1',
  )
  assert.equal(selectIsActiveProjectDirty(staleBaseline), true)
  assert.equal(selectIsActiveProjectDirty(currentBaseline), false)
  assert.deepEqual(
    currentBaseline.activeSession?.cleanBaseline?.exactSnapshot,
    changed.activeSession?.project,
  )
})

test('canonical no-op synchronization ignores save timestamps and Case pane navigation', () => {
  const disc = createDiscProject()
  const loadedDisc = createLoadedProjectSession({
    sessionId: 'disc-time',
    currentPath: 'disc.sbls.json',
    persistenceFormat: 'legacy-json',
    project: disc,
  })
  const timeChanged = replaceActiveProjectContent(
    loadedDisc,
    { ...disc, savedAt: '2030-01-01T00:00:00.000Z' },
  )
  assert.equal(timeChanged, loadedDisc)
  assert.equal(timeChanged.activeSession?.revision, 0)
  assert.equal(selectIsActiveProjectDirty(timeChanged), false)

  const caseFront = createCaseInsertProjectSnapshot({
    activeCaseInsertTemplatePane: 'front',
    savedAt: '2026-07-26T12:00:00.000Z',
  })
  const loadedCase = createLoadedProjectSession({
    sessionId: 'case-pane',
    currentPath: 'case.sbls.json',
    persistenceFormat: 'legacy-json',
    project: caseFront,
  })
  const paneChanged = replaceActiveProjectContent(
    loadedCase,
    createCaseInsertProjectSnapshot({
      activeCaseInsertTemplatePane: 'tray',
      savedAt: '2030-01-01T00:00:00.000Z',
    }),
  )
  assert.equal(paneChanged, loadedCase)
  assert.equal(paneChanged.activeSession?.revision, 0)
  assert.equal(selectIsActiveProjectDirty(paneChanged), false)
})

test('complete Disc and Case synchronization preserves identity and rejects stale or wrong-kind input', () => {
  const loadedDisc = createLoadedProjectSession({
    sessionId: 'sync-disc',
    currentPath: 'disc.sbls',
    persistenceFormat: 'sbls-package-v1',
    project: createDiscProject('Baseline Disc'),
  })
  const changedDisc = synchronizeActiveProjectContent(loadedDisc, {
    sessionId: 'sync-disc',
    kind: 'disc',
    project: createDiscProject('Edited Disc'),
  })
  assert.equal(changedDisc.activeSession?.project.title, 'Edited Disc')
  assert.equal(changedDisc.activeSession?.revision, 1)
  assert.equal(changedDisc.activeSession?.id, 'sync-disc')
  assert.equal(changedDisc.activeSession?.currentPath, 'disc.sbls')
  assert.equal(changedDisc.activeSession?.persistenceFormat, 'sbls-package-v1')
  assert.deepEqual(
    changedDisc.activeSession?.cleanBaseline,
    loadedDisc.activeSession?.cleanBaseline,
  )
  assert.deepEqual(
    changedDisc.activeSession?.lastEditorRoute,
    loadedDisc.activeSession?.lastEditorRoute,
  )
  assert.equal(selectIsActiveProjectDirty(changedDisc), true)

  const restoredDisc = synchronizeActiveProjectContent(changedDisc, {
    sessionId: 'sync-disc',
    kind: 'disc',
    project: createDiscProject('Baseline Disc'),
  })
  assert.equal(restoredDisc.activeSession?.revision, 2)
  assert.equal(selectIsActiveProjectDirty(restoredDisc), false)

  const caseProject = createCaseInsertProjectSnapshot({
    manualGameTitle: 'Baseline Case',
    savedAt: '2026-07-26T12:00:00.000Z',
  })
  const loadedCase = createLoadedProjectSession({
    sessionId: 'sync-case',
    currentPath: 'case.sbls',
    persistenceFormat: 'sbls-package-v1',
    project: caseProject,
  })
  const changedCase = synchronizeActiveProjectContent(loadedCase, {
    sessionId: 'sync-case',
    kind: 'caseInsert',
    project: createCaseInsertProjectSnapshot({
      manualGameTitle: 'Edited Case',
      savedAt: '2026-07-26T12:01:00.000Z',
    }),
  })
  assert.equal(changedCase.activeSession?.project.title, 'Edited Case')
  assert.equal(changedCase.activeSession?.revision, 1)
  assert.equal(selectIsActiveProjectDirty(changedCase), true)

  assert.equal(synchronizeActiveProjectContent(changedCase, {
    sessionId: 'retired-session',
    kind: 'caseInsert',
    project: caseProject,
  }), changedCase)
  assert.equal(synchronizeActiveProjectContent(changedCase, {
    sessionId: 'sync-case',
    kind: 'disc',
    project: createDiscProject('Wrong kind'),
  }), changedCase)
})

test('session-only state cannot affect project comparison or serialized project content', () => {
  const loaded = createLoadedProjectSession({
    sessionId: 'metadata-session',
    currentPath: 'before.sbls.json',
    persistenceFormat: 'legacy-json',
    displayName: 'Before',
    project: createDiscProject(),
  })
  const home = returnProjectSessionHome(loaded)
  const renamed = adoptSavedProjectBaseline(home, {
    acceptedSnapshot: createDiscProject(),
    currentPath: 'after.sbls.json',
    displayName: 'After',
  })
  const routed = updateLastEditorRoute(renamed, { workspace: 'disc' })
  const beforeProject = loaded.activeSession?.project
  const afterProject = routed.activeSession?.project

  assert.ok(beforeProject)
  assert.ok(afterProject)
  assert.equal(
    createCanonicalProjectComparisonValue(beforeProject),
    createCanonicalProjectComparisonValue(afterProject),
  )
  const serializedProject = JSON.stringify(afterProject)
  for (const sessionOnlyName of [
    'metadata-session',
    'after.sbls.json',
    'revision',
    'visibleWorkspace',
    'feedback',
    'busy',
    'focus',
    'legacy-json',
    'sbls-package-v1',
  ]) {
    assert.equal(serializedProject.includes(sessionOnlyName), false)
  }
})

test('lifecycle capture freezes truthful format identity without project serialization', () => {
  const loaded = createLoadedProjectSession({
    sessionId: 'captured-package',
    currentPath: 'C:\\projects\\captured.SBLS',
    persistenceFormat: 'sbls-package-v1',
    project: createDiscProject('Captured Package'),
  })
  const captured = captureApplicationLifecycleState(loaded)

  assert.notEqual(captured, loaded)
  assert.equal(Object.isFrozen(captured), true)
  assert.equal(Object.isFrozen(captured.activeSession), true)
  assert.equal(captured.activeSession?.persistenceFormat, 'sbls-package-v1')
  assert.equal(
    JSON.stringify(captured.activeSession?.project).includes('sbls-package-v1'),
    false,
  )
})

test('close retires the session and project-kind mismatches are rejected', () => {
  const disc = createLoadedProjectSession({
    sessionId: 'old-session',
    currentPath: 'disc.sbls.json',
    persistenceFormat: 'legacy-json',
    project: createDiscProject(),
  })
  assert.deepEqual(closeProjectSession(disc), createEmptyApplicationLifecycleState())

  assert.throws(
    () => replaceActiveProjectContent(
      disc,
      createCaseInsertProjectSnapshot({ manualGameTitle: 'Wrong kind' }),
    ),
    /cannot replace active disc content/,
  )

  const replacement = createNewProjectSession({
    sessionId: 'new-session',
    project: createDiscProject('Replacement'),
  })
  assert.notEqual(replacement.activeSession?.id, disc.activeSession?.id)
})
