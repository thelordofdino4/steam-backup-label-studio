import assert from 'node:assert/strict'
import test from 'node:test'
import { normalizeCustomDiscTemplate } from '../disc/geometry.ts'
import { createApplicationLifecycleCompositionRoot } from '../lifecycle/applicationLifecycleCompositionRoot.ts'
import { materializeDiscProject } from '../lifecycle/canonicalProject.ts'
import { createLoadedProjectSession, pinDiscSaveRevision, projectPinnedDiscSave } from '../lifecycle/projectSession.ts'
import { createBlankDiscSavedProject } from '../project/blankDiscProject.ts'
import { createDefaultDiscTemplateState } from '../templates/discTemplateStateModel.ts'
import type { DiscTextLayoutSettings } from '../discText/types.ts'
import type {
  ProjectAdditionalArtwork, ProjectLogoAssets, ProjectTechnicalMarks, ProjectTitleArtwork,
} from '../project/projectTypes.ts'
import { readDiscEditorDocumentBasis, applyDiscEditorDocumentEdit } from './appDiscEditorDocumentCommand.ts'
import { prepareDiscHistoryProjection, readDiscHistoryTemplate } from './appDiscHistoryProjection.ts'
import { makeDiscSteamPngFixtures } from './testing/discSteamPngFixtures.mjs'
import { planDiscTemplateDocumentEdit } from './appDiscTemplateDocumentPlan.ts'

const guidedLayout = { id: 'disc:guided-layout:classic-top-title', version: 1,
  omittedSlotIds: [], completedSlotIds: [] }

function setup() {
  const saved = createBlankDiscSavedProject()
  saved.titleArtwork = { ...saved.titleArtwork, layout: { enabled: true, x: 50, y: 25, scale: 1 } }
  const root = createApplicationLifecycleCompositionRoot({
    initialState: createLoadedProjectSession({
      sessionId: 'disc', project: saved, currentPath: 'test.sbls', persistenceFormat: 'sbls-package-v1',
    }),
    discHistoryLimit: 6,
  })
  const snapshot = root.getStateSnapshot
  const read = () => {
    const session = snapshot().state.activeSession
    assert.equal(session?.kind, 'disc')
    return session
  }
  const basis = () => ({ sessionId: read().id, expectedGeneration: snapshot().generation })
  const legacy = () => {
    const { background, ...projection } = materializeDiscProject(read().project)
    void background
    return projection
  }
  const acknowledge = () => root.acknowledgeDiscHistoryProjection({ ...basis(), projection: legacy() })
  const before = read()
  assert.equal(root.commitDiscBackgroundCompound({
    sessionId: before.id, expectedRevision: before.revision,
    operation: { kind: 'visibility', enabled: false, scale: 1, offset: { x: 0, y: 0 } },
  }, { kind: 'preset', fields: {}, guidedLayout }), 'committed')
  const preset = read()
  return { root, snapshot, read, basis, acknowledge, legacy, before, preset }
}

test('template commits existing owner clamps in one recorded revision; exact undo restores prior history', () => {
  const { root, snapshot, read, basis, acknowledge, legacy, before, preset } = setup()
  const project = legacy()
  const defaults = createDefaultDiscTemplateState()
  const next = {
    selectedDiscTemplateId: 'custom' as const,
    customDiscTemplate: normalizeCustomDiscTemplate({ ...defaults.customDiscTemplate,
      innerHoleDiameterMm: 65, safeDiameterMm: 100 }),
  }
  const original = project.titleArtwork as ProjectTitleArtwork
  const { fields } = planDiscTemplateDocumentEdit(next, {
    titleArtwork: original, ratingBadge: project.ratingBadge!, mediaMark: project.mediaMark!,
    platformMarks: project.platformMarks!, technicalMarks: project.technicalMarks as ProjectTechnicalMarks,
    logoAssets: project.logoAssets as ProjectLogoAssets, additionalArtwork: project.additionalArtwork as ProjectAdditionalArtwork,
    metadata: project.metadata!, discTextLayout: project.discText?.layout as DiscTextLayoutSettings,
  }, layout => layout)
  assert.notDeepEqual(fields.titleArtwork.layout, original.layout)
  assert.equal(fields.titleArtwork.imageDataUrl, original.imageDataUrl)
  const capturedBasis = readDiscEditorDocumentBasis(root, project)
  assert.ok(capturedBasis)
  assert.equal(readDiscEditorDocumentBasis(root, { ...project, title: 'unrelated editor change' }), null)
  const pinned = pinDiscSaveRevision(preset)
  let mirror = 0
  assert.equal(applyDiscEditorDocumentEdit(root, capturedBasis, { kind: 'template', fields },
    run => run(), session => {
      mirror++
      assert.equal(root.synchronizeDiscLegacyProject({ sessionId: session.id, legacy: project }), 'stale-session')
      assert.equal(snapshot().discHistoryProjectionPending, true)
      assert.deepEqual(session.project.titleArtwork, fields.titleArtwork)
    }), true)
  assert.equal(mirror, 1)
  const switched = read()
  assert.equal(switched.revision, preset.revision + 1)
  assert.deepEqual(snapshot().discHistory?.past, [before.project, preset.project])
  assert.equal(projectPinnedDiscSave(pinned).template.variant, 'standardPrintableDisc')
  assert.equal(acknowledge(), 'committed')
  assert.equal(root.commitDiscEditorDocumentEdit({ ...basis(), expectedGeneration: capturedBasis.expectedGeneration,
    kind: 'template', fields }), 'stale')
  assert.equal(root.commitDiscEditorDocumentEdit({ ...basis(), kind: 'template', fields }), 'no-op')
  const undo = prepareDiscHistoryProjection(switched, preset.project)
  const redo = prepareDiscHistoryProjection(preset, switched.project)
  assert.equal(undo?.template?.selectedDiscTemplateId, 'standardPrintableDisc')
  assert.deepEqual(redo?.template && readDiscHistoryTemplate(redo.template), next.customDiscTemplate)
  assert.deepEqual(undo?.titleArtwork?.layout, original.layout)
  assert.equal(undo?.guidedWorkflow?.activeLayout?.id, guidedLayout.id)
  assert.equal(redo?.guidedWorkflow?.activeLayout?.id, guidedLayout.id)
  assert.equal(root.stepDiscDocumentHistory({ ...basis(), direction: 'undo' }), 'committed')
  assert.equal(read().project, preset.project)
  assert.equal(acknowledge(), 'committed')
  assert.equal(root.stepDiscDocumentHistory({ ...basis(), direction: 'undo' }), 'committed')
  assert.equal(read().project, before.project)
})

test('same-session omission and Reset Guided Progress keep the earlier Apply undoable', () => {
  const { root, snapshot, read, basis, acknowledge, before, preset } = setup()
  const omit = { kind: 'edit-guided-slot' as const, action: 'omit' as const, slotId: 'disc:guided:game-title:primary' as const }
  assert.equal(root.commitDiscEditorDocumentEdit({ ...basis(), ...omit }), 'committed')
  const omitted = read()
  assert.equal(acknowledge(), 'committed')
  assert.equal(root.commitDiscEditorDocumentEdit({ ...basis(), kind: 'reset-guided-progress' }), 'committed')
  const reset = read()
  assert.equal(reset.id, omitted.id)
  assert.equal(reset.revision, omitted.revision + 1)
  assert.deepEqual(reset.project.editor?.guidedLayout, guidedLayout)
  assert.equal(reset.project.background, omitted.project.background)
  assert.equal(acknowledge(), 'committed')
  const ready = snapshot()
  assert.equal(root.commitDiscEditorDocumentEdit({ ...basis(), kind: 'reset-guided-progress' }), 'no-op')
  assert.equal(snapshot(), ready)
  for (const expected of [omitted.project, preset.project, before.project]) {
    assert.equal(root.stepDiscDocumentHistory({ ...basis(), direction: 'undo' }), 'committed')
    assert.equal(read().project, expected)
    assert.equal(acknowledge(), 'committed')
  }
  for (const expected of [preset.project, omitted.project, reset.project]) {
    assert.equal(root.stepDiscDocumentHistory({ ...basis(), direction: 'redo' }), 'committed')
    assert.equal(read().project, expected)
    assert.equal(acknowledge(), 'committed')
  }
})

test('game logo layout reset retains artwork and earlier history, and refuses a hidden visibility change', () => {
  const saved = createBlankDiscSavedProject()
  const { newer } = makeDiscSteamPngFixtures(1, 2)
  const asset = { imageDataUrl: newer.dataUrl, sourceLabel: 'Fixture logo',
    steamArtworkAssetId: 'fixture-logo', imageSize: { width: newer.width, height: newer.height } }
  const previousLayout = { enabled: true, scale: 1.4, x: 52, y: 20 }
  saved.titleArtwork = { ...asset, source: 'steam', defaultSteamLogo: asset, layout: previousLayout }
  const root = createApplicationLifecycleCompositionRoot({
    initialState: createLoadedProjectSession({
      sessionId: 'disc', project: saved, currentPath: 'test.sbls', persistenceFormat: 'sbls-package-v1',
    }),
    discHistoryLimit: 4,
  })
  const read = () => {
    const session = root.getStateSnapshot().state.activeSession
    assert.equal(session?.kind, 'disc')
    return session
  }
  const fresh = () => ({ sessionId: read().id, expectedGeneration: root.getStateSnapshot().generation })
  const acknowledge = () => {
    const { background, ...projection } = materializeDiscProject(read().project)
    void background
    assert.equal(root.acknowledgeDiscHistoryProjection({ ...fresh(), projection }), 'committed')
  }
  const initial = read()
  assert.equal(root.commitDiscBackgroundCompound({ sessionId: initial.id, expectedRevision: initial.revision,
    operation: { kind: 'visibility', enabled: false, scale: 1, offset: { x: 0, y: 0 } },
  }, { kind: 'preset', fields: {}, guidedLayout }), 'committed')
  const applied = read()
  const layout = { enabled: true, scale: 1, x: 48, y: 25 }
  const reset = { kind: 'reset-title-artwork-layout' as const, layout }
  const beforeReset = root.getStateSnapshot()
  assert.equal(root.commitDiscEditorDocumentEdit({ ...fresh(), ...reset, layout: { ...layout, enabled: false } }), 'invalid')
  assert.equal(root.getStateSnapshot(), beforeReset)
  assert.equal(root.commitDiscEditorDocumentEdit({ ...fresh(), ...reset }), 'committed')
  const ready = read()
  assert.equal(ready.revision, applied.revision + 1)
  assert.deepEqual(ready.project.titleArtwork, { ...applied.project.titleArtwork, layout })
  assert.equal(materializeDiscProject(ready.project).titleArtwork?.imageDataUrl, newer.dataUrl)
  assert.equal(materializeDiscProject(ready.project).titleArtwork?.defaultSteamLogo?.imageDataUrl, newer.dataUrl)
  assert.equal(ready.project.background, applied.project.background)
  assert.deepEqual(root.getStateSnapshot().discHistory?.past, [initial.project, applied.project])
  acknowledge()
  assert.equal(root.commitDiscEditorDocumentEdit({ ...fresh(), ...reset }), 'no-op')
  assert.equal(root.stepDiscDocumentHistory({ ...fresh(), direction: 'undo' }), 'committed')
  assert.equal(read().project, applied.project)
  acknowledge()
  assert.equal(root.stepDiscDocumentHistory({ ...fresh(), direction: 'undo' }), 'committed')
  assert.equal(read().project, initial.project)
  acknowledge()
  assert.equal(root.stepDiscDocumentHistory({ ...fresh(), direction: 'redo' }), 'committed')
  assert.equal(read().project, applied.project)
  acknowledge()
  assert.equal(root.stepDiscDocumentHistory({ ...fresh(), direction: 'redo' }), 'committed')
  assert.equal(read().project, ready.project)
})
