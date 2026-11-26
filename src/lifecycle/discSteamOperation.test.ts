import assert from 'node:assert/strict'
import test from 'node:test'
import { createApplicationLifecycleRuntime } from '../app/applicationLifecycleRuntime.ts'
import { makeDiscSteamPngFixtures } from '../app/testing/discSteamPngFixtures.mjs'
import { createBlankDiscSavedProject } from '../project/blankDiscProject.ts'
import { createDefaultProjectPlatformMarks, setProjectPlatformMarkValues } from '../project/projectPlatformMarks.ts'
import { discTemplates } from '../templates/discTemplates.ts'
import { createApplicationLifecycleCompositionRoot } from './applicationLifecycleCompositionRoot.ts'
import { materializeDiscProject } from './canonicalProject.ts'
import { createNewProjectSession, pinDiscSaveRevision, projectPinnedDiscSave, selectIsActiveProjectDirty } from './projectSession.ts'
import type { DiscSteamImportAfterState } from './discSteamOperation.ts'
import { prepareDiscHistoryProjection } from '../app/appDiscHistoryProjection.ts'

const title = 'Synthetic game'
function harness() {
  const blank = createBlankDiscSavedProject()
  assert.ok(blank.metadata && blank.discText?.values && blank.discText?.settings)
  blank.metadata.subtitle = 'Existing authored subtitle'
  blank.discText.values.subtitle = 'Existing authored local text'
  blank.editor = {
    guidedLayout: { id: 'disc:guided-layout:classic-top-title', version: 1,
      omittedSlotIds: ['disc:guided:legal-text:copyright'], completedSlotIds: [] },
  }
  const runtime = createApplicationLifecycleRuntime({
    createRoot: options => createApplicationLifecycleCompositionRoot({
      ...options, discHistoryLimit: 4, initialState: createNewProjectSession({ sessionId: 'disc', project: blank }),
    }),
  })
  const { root, projectAsyncWork: work } = runtime
  const session = root.getLifecycleState().activeSession
  assert.ok(session?.kind === 'disc')

  const { newer } = makeDiscSteamPngFixtures(1, 2)
  const source = {
    imageDataUrl: newer.dataUrl,
    imageSize: { width: newer.width, height: newer.height, contentBounds: newer.bounds },
    sourceLabel: 'Fixture title logo',
  }
  const platformMarks = setProjectPlatformMarkValues(createDefaultProjectPlatformMarks(),
    ['windows', 'linux'], discTemplates.standardPrintableDisc)
  const after: DiscSteamImportAfterState = {
    title,
    game: { manualTitle: title, selectedSteamGame: {
      title, appId: 2, publisher: ['Publisher'], developer: ['Developer'],
      genres: [], categories: [], artwork: [], storeUrl: 'https://example.invalid/fixture',
    } },
    metadata: { title, steamAppId: '2', developer: 'Developer', publisher: 'Publisher',
      releaseDate: '2020', ratingSystem: 'ESRB', ratingValue: 'M', copyrightText: 'Fixture legal' },
    titleArtwork: {
      ...source, source: 'steam', steamArtworkAssetId: 'cdn-logo',
      layout: { enabled: true, scale: 1, x: 0, y: 20 },
      defaultSteamLogo: { ...source, steamArtworkAssetId: 'cdn-logo' },
    },
    ratingLayout: { enabled: true, scale: 0.75, x: 11, y: 12 },
    platformMarks,
    text: { appId: '2', copyright: '', copyrightSource: 'metadata', copyrightEnabled: true },
    completedGuidedSlots: ['disc:guided:game-title:primary',
      'disc:guided:legal-text:copyright', 'disc:guided:rating-badge:primary'],
  }
  const edit = { kind: 'steam-import' as const, sessionId: session.id, expectedRevision: session.revision, after }
  return { root, work, runtime, session, edit, newer }
}

test('admitted Steam import after Save As records one revision and restores exact saved content', async () => {
  const { root, work, runtime, session, edit, newer } = harness()
  const late = work.begin('steam-game')
  const incoming = work.begin('steam-game')
  const path = 'fixture-import-undo.sbls'
  const basis = { sessionId: session.id, expectedGeneration: incoming.stateGeneration }
  runtime.updateProjectSaveDependencies({
    saveDialog: async () => path,
    packageWrite: { async encodeAndWrite() { return { status: 'success' } } },
  })
  const saved = await root.dispatch('project.save-as')
  assert.ok(saved.disposition === 'executed' && saved.result.status === 'success')
  const current = () => {
    const active = root.getLifecycleState().activeSession
    assert.ok(active?.kind === 'disc')
    return active
  }
  const savedSession = current()
  const fresh = () => ({ sessionId: current().id, expectedGeneration: root.getStateSnapshot().generation })
  const acknowledge = () => {
    const { background, ...projection } = materializeDiscProject(current().project)
    void background
    assert.equal(root.acknowledgeDiscHistoryProjection({ ...fresh(), projection }), 'committed')
  }
  assert.equal(savedSession.currentPath, path)
  assert.equal(savedSession.revision, incoming.contentRevision)
  assert.equal(selectIsActiveProjectDirty(root.getLifecycleState()), false)
  assert.equal(root.commitDiscEditorDocumentEdit({ ...edit, ...basis }), 'stale')
  assert.equal(work.commit(late, () => assert.fail('superseded Steam import')), false)
  const priorPortable = materializeDiscProject(savedSession.project)
  const { background: priorBackground, ...priorLegacy } = priorPortable
  void priorBackground
  const echoes: string[] = []
  const stop = root.subscribe(({ lifecycle }) => {
    if (!root.getStateSnapshot().discHistoryProjectionPending || echoes.length) return
    assert.equal(lifecycle.activeSession?.revision, savedSession.revision + 1)
    echoes.push(root.synchronizeDiscLegacyProject({ sessionId: session.id, legacy: priorLegacy }))
    echoes.push(root.synchronizeCurrentProject({ sessionId: session.id, kind: 'disc', project: priorPortable }))
  })
  assert.equal(work.commit(incoming, () => {
    assert.equal(root.commitDiscEditorDocumentEdit({ ...edit, ...fresh() }), 'committed')
    return undefined
  }), true)
  stop()
  assert.deepEqual(echoes, ['stale-session', 'stale-session'])
  const imported = current()
  assert.equal(imported.revision, savedSession.revision + 1)
  assert.equal(root.getStateSnapshot().discHistory?.past.length, 1)
  const portable = projectPinnedDiscSave(pinDiscSaveRevision(imported))
  assert.equal(portable.game.selectedSteamGame?.appId, 2)
  assert.equal(portable.metadata?.subtitle, 'Existing authored subtitle')
  assert.equal(portable.titleArtwork?.imageDataUrl, newer.dataUrl)
  assert.equal(portable.titleArtwork?.defaultSteamLogo?.imageDataUrl, newer.dataUrl)
  assert.deepEqual(portable.platformMarks?.values, ['windows', 'linux'])
  assert.equal(portable.discText?.values?.appId, '2')
  assert.equal(portable.discText?.values?.subtitle, 'Existing authored local text')
  assert.ok(portable.editor?.guidedLayout?.completedSlotIds.includes('disc:guided:game-title:primary'))
  assert.equal(imported.project.background, savedSession.project.background)
  assert.equal(imported.currentPath, path)
  assert.equal(selectIsActiveProjectDirty(root.getLifecycleState()), true)
  const undo = prepareDiscHistoryProjection(imported, savedSession.project)
  const redo = prepareDiscHistoryProjection(savedSession, imported.project)
  assert.ok(undo?.game && undo.titleArtwork && undo.metadata && undo.discTextValues && undo.guidedWorkflow)
  assert.equal(undo.game.selectedSteamGame, null)
  assert.equal(undo.discTextValues.appId, '')
  assert.equal(redo?.game?.selectedSteamGame?.appId, 2)
  assert.equal(redo?.titleArtwork?.defaultSteamLogo?.imageDataUrl, newer.dataUrl)
  acknowledge()
  assert.equal(root.stepDiscDocumentHistory({ ...fresh(), direction: 'undo' }), 'committed')
  assert.equal(current().project, savedSession.project)
  assert.equal(current().currentPath, path)
  assert.equal(selectIsActiveProjectDirty(root.getLifecycleState()), false)
  acknowledge()
  assert.equal(root.stepDiscDocumentHistory({ ...fresh(), direction: 'redo' }), 'committed')
  assert.equal(current().project, imported.project)
  assert.equal(current().currentPath, path)
  assert.equal(selectIsActiveProjectDirty(root.getLifecycleState()), true)
  assert.equal(work.commit(late, () => assert.fail('retired work cannot commit after redo')), false)
  assert.equal(work.commit(incoming, () => assert.fail('accepted work cannot replay after redo')), false)
  acknowledge()
})

test('wrong request revision or a Steam after-state with an unowned field cannot publish', () => {
  const { root, edit } = harness()
  const snapshot = root.getStateSnapshot()
  assert.equal(root.commitDiscEditorDocumentEdit({ ...edit, expectedGeneration: snapshot.generation,
    expectedRevision: edit.expectedRevision + 1 }), 'stale')
  assert.equal(root.commitDiscEditorDocumentEdit({ ...edit, expectedGeneration: snapshot.generation,
    after: { ...edit.after, metadata: { ...edit.after.metadata, subtitle: 'must not change' } } as DiscSteamImportAfterState }), 'invalid')
  assert.equal(root.getStateSnapshot(), snapshot)
})
