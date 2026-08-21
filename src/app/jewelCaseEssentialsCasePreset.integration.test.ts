import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createDefaultCaseInsertImageSlot,
} from '../caseInsert/defaults.ts'
import { createBrandingSources } from '../caseInsert/brandingMarkTargetSourcesFixtures.ts'
import {
  createApplicationLifecycleCompositionRoot,
} from '../lifecycle/applicationLifecycleCompositionRoot.ts'
import {
  createLoadedProjectSession,
  createNewProjectSession,
  type ApplicationLifecycleState,
  type CaseInsertProjectSession,
} from '../lifecycle/projectSession.ts'
import {
  createBlankDiscSavedProject,
} from '../project/blankDiscProject.ts'
import {
  createBlankJewelCaseSavedProject,
} from '../project/caseInsertProjectAdapters.ts'
import {
  createCaseInsertProjectSaveSnapshot,
  createUnattachedCaseInsertLayoutPresetProjectState,
} from '../project/caseInsertPresetProjectPersistence.ts'
import {
  createEmbeddedProjectImageAssetProvenance,
} from '../project/projectAssetStatus.ts'
import { CURRENT_PROJECT_SCHEMA_VERSION } from '../project/projectSchema.ts'
import {
  CASE_INSERT_PRESET_CATALOG,
  createCaseInsertPresetCatalog,
} from '../presets/caseInsertPresetCatalog.ts'
import {
  JEWEL_CASE_ESSENTIALS_CASE_PRESET,
  JEWEL_CASE_ESSENTIALS_CASE_PRESET_ID,
} from '../presets/builtins/jewelCaseEssentialsCasePreset.ts'
import {
  createAppCaseInsertPresetWorkflowOwner,
  type AppCaseInsertPresetWorkflowDecision,
  type AppCaseInsertPresetWorkflowReview,
} from './appCaseInsertPresetWorkflow.ts'
import { stageProjectOpenContents } from './appProjectLoad.ts'
import {
  createCaseInsertPresetPresentationController,
} from './caseInsertPresetPresentationController.ts'

const PRESET = Object.freeze({
  id: JEWEL_CASE_ESSENTIALS_CASE_PRESET_ID,
  revision: 1,
})

const SAMPLE_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+XMRdAAAAAElFTkSuQmCC'

function requireCaseSession(
  state: ApplicationLifecycleState,
): CaseInsertProjectSession {
  assert.ok(state.activeSession)
  assert.equal(state.activeSession.kind, 'caseInsert')
  if (!state.activeSession || state.activeSession.kind !== 'caseInsert') {
    throw new Error('Expected a Case project session.')
  }
  return state.activeSession
}

function requireReview<Review extends AppCaseInsertPresetWorkflowReview>(
  result: Readonly<{
    ok: true
    status: 'review-required'
    review: Review
  }> | Readonly<{ ok: false; code: string }>,
): Review {
  assert.equal(result.ok, true, JSON.stringify(result))
  if (!result.ok) throw new Error(result.code)
  return result.review
}

function confirm(
  review: AppCaseInsertPresetWorkflowReview,
): Extract<AppCaseInsertPresetWorkflowDecision, { decision: 'confirm' }> {
  return {
    decision: 'confirm',
    operation: review.operation,
    reviewIdentity: review.reviewIdentity,
    selectedPreset: review.selectedPreset,
    reviewedWarningIds: [...review.warningIds],
    acceptedMaterialConsentRequirementIds: [
      ...review.materialConsentRequirementIds,
    ],
  }
}

function withoutLayouts<T>(value: T): unknown {
  if (Array.isArray(value)) return value.map(withoutLayouts)
  if (!value || typeof value !== 'object') return value
  return Object.fromEntries(Object.entries(value).flatMap(([key, nested]) =>
    key === 'layout' ? [] : [[key, withoutLayouts(nested)]]))
}

function createRepresentativeProject() {
  const project = createBlankJewelCaseSavedProject('Workflow Essentials')
  const cover = project.caseInsert.templates.cover
  const tray = project.caseInsert.templates.tray
  cover.background.imageDataUrl = SAMPLE_PNG
  cover.background.imageSource =
    createEmbeddedProjectImageAssetProvenance('Front background')
  cover.background.imageSize = { width: 1, height: 1 }
  cover.background.fit = 'contain'
  cover.titleArtwork.imageDataUrl = SAMPLE_PNG
  cover.titleArtwork.imageSource =
    createEmbeddedProjectImageAssetProvenance('Title artwork')
  cover.titleArtwork.imageSize = { width: 1, height: 1 }
  cover.titleArtwork.enabled = false

  const description = tray.textBlocks.find(
    ({ id }) => id === 'tray-description',
  )!
  description.enabled = true
  description.value = 'Rich description'
  description.contentMode = 'html'
  description.htmlSource = '<p><strong>Rich description</strong></p>'
  description.source = 'steam'
  description.align = 'right'
  description.style.color = '#123456'

  tray.additionalArtworkEnabled = true
  tray.artworkSlots = [3, 1, 2].map((slotNumber) => {
    const slot = createDefaultCaseInsertImageSlot(
      `tray-artwork-${slotNumber}`,
      `Renamed screenshot ${4 - slotNumber}`,
      {
        enabled: slotNumber !== 2,
        fit: slotNumber === 1 ? 'cover' : 'contain',
        layout: { x: slotNumber * 9, y: slotNumber * 11, scale: 0.7 },
      },
    )
    slot.imageDataUrl = SAMPLE_PNG
    slot.imageSource = createEmbeddedProjectImageAssetProvenance(slot.label)
    slot.imageSize = { width: 1, height: 1 }
    return slot
  })
  tray.artworkSlots.splice(1, 0, createDefaultCaseInsertImageSlot(
    'tray-artwork-custom',
    'Untargeted user artwork',
    { enabled: true, layout: { x: 91, y: 9, scale: 0.42 } },
  ))
  return project
}

function workflowSetup() {
  const root = createApplicationLifecycleCompositionRoot({
    initialState: createNewProjectSession({
      sessionId: 'jewel-case-essentials-apply',
      project: createRepresentativeProject(),
    }),
  })
  const commandIds: string[] = []
  const owner = createAppCaseInsertPresetWorkflowOwner({
    lifecycle: {
      getLifecycleState: () => root.getLifecycleState(),
      dispatch: async <Value = void>(commandId: string, input?: unknown) => {
        commandIds.push(commandId)
        return root.dispatch<Value>(commandId, input)
      },
    },
    catalog: CASE_INSERT_PRESET_CATALOG,
  })
  return { root, owner, commandIds }
}

test('presentation controller requires explicit selection and completes one production Apply', async () => {
  const { root, owner, commandIds } = workflowSetup()
  const feedback: string[] = []
  const controller = createCaseInsertPresetPresentationController({
    workflow: owner,
    catalog: CASE_INSERT_PRESET_CATALOG,
    publishDispatchFeedback: (dispatch) => feedback.push(dispatch.commandId),
  })
  const initial = controller.getSnapshot()
  assert.equal(initial.inspection.ok, true)
  assert.equal(initial.selectedOptionValue, '')
  assert.equal(initial.options.length, 1)
  assert.equal(controller.beginApplyReview().ok, false)
  assert.deepEqual(commandIds, [])

  assert.equal(controller.selectOption(initial.options[0]!.value).ok, true)
  assert.equal(controller.beginApplyReview().ok, true)
  const reviewed = controller.getSnapshot()
  assert.equal(reviewed.review?.operation, 'apply')
  assert.deepEqual(reviewed.review?.selectedPreset, PRESET)
  assert.deepEqual(commandIds, [])
  const incomplete = await controller.confirmReview()
  assert.equal(incomplete.ok, false)
  assert.equal(incomplete.code, 'case.layoutPreset.decision-incomplete')
  assert.deepEqual(commandIds, [])
  assert.equal(
    controller.setWarningAcknowledged('unknown-warning', true).ok,
    false,
  )
  for (const id of reviewed.review!.warningIds) {
    assert.equal(controller.setWarningAcknowledged(id, true).ok, true)
  }
  for (const id of reviewed.review!.materialConsentRequirementIds) {
    assert.equal(controller.setMaterialConsentAccepted(id, true).ok, true)
  }

  const first = controller.confirmReview()
  const duplicate = await controller.confirmReview()
  assert.equal(duplicate.ok, false)
  assert.equal(duplicate.code, 'case.layoutPreset.confirmation-pending')
  assert.equal((await first).ok, true)
  assert.deepEqual(commandIds, ['case.layoutPreset.apply'])
  assert.deepEqual(feedback, ['case.layoutPreset.apply'])
  const completed = controller.getSnapshot()
  assert.equal(completed.review, null)
  assert.equal(completed.inspection.ok, true)
  if (completed.inspection.ok) {
    assert.equal(completed.inspection.status, 'attached')
    if (completed.inspection.status === 'attached') {
      assert.equal(completed.inspection.configuration.preset.revision, 1)
    }
  }
  assert.equal(
    requireCaseSession(root.getLifecycleState())
      .caseInsertPresetApplication.attachment.status,
    'attached',
  )
})

test('explicit production Apply preserves content and dispatches one atomic lifecycle command', async () => {
  const { root, owner, commandIds } = workflowSetup()
  const source = requireCaseSession(root.getLifecycleState())
  const sourceProject = structuredClone(source.project)
  const stateBeforePlanning = root.getLifecycleState()
  const invalid = owner.beginApply({
    selectedPreset: {
      id: JEWEL_CASE_ESSENTIALS_CASE_PRESET_ID,
    } as typeof PRESET,
    requestedScope: { kind: 'complete' },
  })
  assert.equal(invalid.ok, false)
  if (!invalid.ok) assert.equal(
    invalid.code,
    'case.layoutPreset.selection-invalid',
  )

  const first = owner.beginApply({
    selectedPreset: PRESET,
    requestedScope: { kind: 'complete' },
  })
  const second = owner.beginApply({
    selectedPreset: PRESET,
    requestedScope: { kind: 'complete' },
  })
  assert.deepEqual(second, first)
  assert.strictEqual(root.getLifecycleState(), stateBeforePlanning)
  assert.deepEqual(commandIds, [])
  const review = requireReview(first)
  assert.ok(Object.isFrozen(review))
  assert.deepEqual(review.selectedPreset, PRESET)
  assert.deepEqual(
    review.plan.skips.filter(
      ({ kind }) => kind === 'missing-optional-target',
    ),
    [],
  )
  assert.deepEqual(
    review.plan.assignments
      .filter(({ roleId }) => roleId === 'screenshots')
      .map(({ object }) => ({
        bindingId: object.bindingId,
        runtimeId: object.runtimeId,
      })),
    [
      { bindingId: 'tray-artwork-1', runtimeId: 'tray-artwork-1' },
      { bindingId: 'tray-artwork-3', runtimeId: 'tray-artwork-3' },
      { bindingId: 'tray-artwork-2', runtimeId: 'tray-artwork-2' },
    ],
  )

  const completed = await owner.complete(review, confirm(review))
  assert.equal(completed.ok, true, JSON.stringify(completed))
  assert.deepEqual(commandIds, ['case.layoutPreset.apply'])
  const installed = requireCaseSession(root.getLifecycleState())
  assert.equal(installed.id, source.id)
  assert.equal(installed.revision, source.revision + 1)
  assert.equal(installed.caseInsertPresetApplication.attachment.status, 'attached')
  if (installed.caseInsertPresetApplication.attachment.status === 'attached') {
    assert.deepEqual(
      installed.caseInsertPresetApplication.attachment.configuration.preset,
      {
        id: JEWEL_CASE_ESSENTIALS_CASE_PRESET_ID,
        revision: 1,
        source: 'builtin',
      },
    )
  }
  assert.deepEqual(withoutLayouts(installed.project), withoutLayouts(sourceProject))
  assert.deepEqual(
    installed.project.caseInsert.templates.tray.artworkSlots.find(
      ({ id }) => id === 'tray-artwork-custom',
    ),
    sourceProject.caseInsert.templates.tray.artworkSlots.find(
      ({ id }) => id === 'tray-artwork-custom',
    ),
  )
  assert.deepEqual(
    installed.project.caseInsert.templates.tray.titleArtwork,
    sourceProject.caseInsert.templates.tray.titleArtwork,
  )
  assert.deepEqual(
    installed.project.caseInsert.templates.cover.textBlocks.find(
      ({ id }) => id === 'cover-title-text',
    ),
    sourceProject.caseInsert.templates.cover.textBlocks.find(
      ({ id }) => id === 'cover-title-text',
    ),
  )
  assert.deepEqual(
    installed.project.caseInsert.templates.tray.artworkSlots
      .filter(({ id }) => /^tray-artwork-[123]$/.test(id))
      .map(({ id, layout }) => ({ id, x: layout.x, y: layout.y, scale: layout.scale })),
    [
      { id: 'tray-artwork-3', x: 83, y: 78, scale: 0.16 },
      { id: 'tray-artwork-1', x: 17, y: 78, scale: 0.16 },
      { id: 'tray-artwork-2', x: 50, y: 78, scale: 0.16 },
    ],
  )
})

test('missing optional screenshots skip without creation and stale Apply cannot mutate', async () => {
  const { root, owner, commandIds } = workflowSetup()
  const source = requireCaseSession(root.getLifecycleState())
  const noScreenshots = structuredClone(source.project)
  noScreenshots.caseInsert.templates.tray.artworkSlots =
    noScreenshots.caseInsert.templates.tray.artworkSlots.filter(
      ({ id }) => !/^tray-artwork-[123]$/.test(id),
    )
  assert.equal(root.synchronizeCurrentProject({
    sessionId: source.id,
    kind: 'caseInsert',
    project: noScreenshots,
  }), 'synchronized')
  const review = requireReview(owner.beginApply({
    selectedPreset: PRESET,
    requestedScope: { kind: 'complete' },
  }))
  assert.deepEqual(
    review.plan.skips
      .filter(({ kind }) => kind === 'missing-optional-target')
      .map((skip) => skip.kind === 'missing-optional-target'
        ? skip.objectId
        : null),
    ['tray-artwork-1', 'tray-artwork-3', 'tray-artwork-2'],
  )
  const edited = structuredClone(requireCaseSession(
    root.getLifecycleState(),
  ).project)
  edited.title = 'Edited after review'
  assert.equal(root.synchronizeCurrentProject({
    sessionId: source.id,
    kind: 'caseInsert',
    project: edited,
  }), 'synchronized')
  const beforeStaleCompletion = root.getLifecycleState()
  const stale = await owner.complete(review, confirm(review))
  assert.equal(stale.ok, false)
  if (!stale.ok) assert.equal(stale.status, 'stale-review')
  assert.strictEqual(root.getLifecycleState(), beforeStaleCompletion)
  assert.deepEqual(commandIds, [])
  assert.deepEqual(
    requireCaseSession(root.getLifecycleState())
      .project.caseInsert.templates.tray.artworkSlots.map(({ id }) => id),
    ['tray-artwork-custom'],
  )
})

test('Disc projects reject the production selection without lifecycle mutation', () => {
  const root = createApplicationLifecycleCompositionRoot({
    initialState: createNewProjectSession({
      sessionId: 'disc-incompatible-production-case-preset',
      project: createBlankDiscSavedProject(),
    }),
  })
  const owner = createAppCaseInsertPresetWorkflowOwner({
    lifecycle: root,
    catalog: CASE_INSERT_PRESET_CATALOG,
  })
  const before = root.getLifecycleState()
  const result = owner.beginApply({
    selectedPreset: PRESET,
    requestedScope: { kind: 'complete' },
  })
  assert.equal(result.ok, false)
  if (!result.ok) assert.equal(result.status, 'incompatible-project-kind')
  assert.strictEqual(root.getLifecycleState(), before)
})

test('Save/Open recovers exact production identity, Reapply stays exact, and catalog-free Detach preserves values', async () => {
  const applied = workflowSetup()
  const applyReview = requireReview(applied.owner.beginApply({
    selectedPreset: PRESET,
    requestedScope: { kind: 'complete' },
  }))
  assert.equal((await applied.owner.complete(
    applyReview,
    confirm(applyReview),
  )).ok, true)
  const appliedSession = requireCaseSession(applied.root.getLifecycleState())
  const saved = createCaseInsertProjectSaveSnapshot(
    appliedSession.project,
    appliedSession.caseInsertPresetApplication,
  )
  assert.equal(saved.schemaVersion, CURRENT_PROJECT_SCHEMA_VERSION)

  const staged = await stageProjectOpenContents({
    selectedPath: 'C:\\projects\\jewel-case-essentials.sbls',
    contents: JSON.stringify(saved),
    persistenceFormat: 'sbls-package-v1',
    caseInsertBrandingSources: createBrandingSources(),
    caseInsertPresetCatalog: CASE_INSERT_PRESET_CATALOG,
  })
  assert.equal(staged.status, 'success', JSON.stringify(staged))
  if (staged.status !== 'success' || staged.value.projectType !== 'caseInsert') {
    return
  }
  assert.deepEqual(staged.value.caseInsertPresetRecovery.recoveryStatus, {
    status: 'current',
    customization: 'clean',
  })
  const recoveredSession = createLoadedProjectSession({
    sessionId: 'jewel-case-essentials-recovered',
    project: staged.value.normalizedProject,
    currentPath: staged.value.selectedPath,
    persistenceFormat: staged.value.persistenceFormat,
    lastEditorRoute: staged.value.editorRoute,
    caseInsertPresetRecovery: staged.value.caseInsertPresetRecovery,
  })
  const root = createApplicationLifecycleCompositionRoot({
    initialState: recoveredSession,
  })
  const commandIds: string[] = []
  const lifecycle = {
    getLifecycleState: () => root.getLifecycleState(),
    dispatch: async <Value = void>(commandId: string, input?: unknown) => {
      commandIds.push(commandId)
      return root.dispatch<Value>(commandId, input)
    },
  }

  const revisionTwo = structuredClone(JEWEL_CASE_ESSENTIALS_CASE_PRESET)
  ;(revisionTwo as { revision: number }).revision = 2
  const futureCatalog = createCaseInsertPresetCatalog({
    builtins: [JEWEL_CASE_ESSENTIALS_CASE_PRESET, revisionTwo],
  })
  assert.equal(futureCatalog.ok, true)
  if (!futureCatalog.ok) return
  const owner = createAppCaseInsertPresetWorkflowOwner({
    lifecycle,
    catalog: futureCatalog.catalog,
  })
  const inspection = owner.inspectCurrent()
  assert.equal(inspection.ok, true)
  if (inspection.ok) {
    assert.equal(inspection.status, 'attached')
    assert.deepEqual(inspection.recoveryStatus, {
      status: 'current',
      customization: 'clean',
    })
    if (inspection.status === 'attached') {
      assert.equal(
        inspection.configuration.preset.id,
        JEWEL_CASE_ESSENTIALS_CASE_PRESET_ID,
      )
      assert.equal(inspection.configuration.preset.revision, 1)
    }
  }
  assert.deepEqual(commandIds, [])

  assert.equal(
    futureCatalog.catalog.getLatest(
      JEWEL_CASE_ESSENTIALS_CASE_PRESET_ID,
    )?.revision,
    2,
  )
  assert.deepEqual(commandIds, [])
  const reapplyFeedback: string[] = []
  const reapplyController = createCaseInsertPresetPresentationController({
    workflow: owner,
    catalog: futureCatalog.catalog,
    publishDispatchFeedback: (dispatch) =>
      reapplyFeedback.push(dispatch.commandId),
  })
  assert.equal(reapplyController.beginReapplyReview().ok, true)
  const exactReview = reapplyController.getSnapshot().review
  assert.ok(exactReview)
  assert.equal(exactReview.operation, 'reapply')
  if (exactReview.operation !== 'reapply') return
  assert.equal(exactReview.selectedPreset.revision, 1)
  assert.equal(exactReview.plan.preset.selectedRevision, 1)
  for (const id of exactReview.warningIds) {
    reapplyController.setWarningAcknowledged(id, true)
  }
  for (const id of exactReview.materialConsentRequirementIds) {
    reapplyController.setMaterialConsentAccepted(id, true)
  }
  const reapplied = await reapplyController.confirmReview()
  assert.equal(reapplied.ok, true, JSON.stringify(reapplied))
  assert.deepEqual(commandIds, ['case.layoutPreset.reapply'])
  assert.deepEqual(reapplyFeedback, ['case.layoutPreset.reapply'])

  const detachRoot = createApplicationLifecycleCompositionRoot({
    initialState: createLoadedProjectSession({
      sessionId: 'jewel-case-essentials-detach-recovered',
      project: staged.value.normalizedProject,
      currentPath: staged.value.selectedPath,
      persistenceFormat: staged.value.persistenceFormat,
      lastEditorRoute: staged.value.editorRoute,
      caseInsertPresetRecovery: staged.value.caseInsertPresetRecovery,
    }),
  })
  const detachCommandIds: string[] = []
  const detachLifecycle = {
    getLifecycleState: () => detachRoot.getLifecycleState(),
    dispatch: async <Value = void>(commandId: string, input?: unknown) => {
      detachCommandIds.push(commandId)
      return detachRoot.dispatch<Value>(commandId, input)
    },
  }
  const beforeDetach = structuredClone(requireCaseSession(
    detachRoot.getLifecycleState(),
  ).project)
  const emptyCatalog = createCaseInsertPresetCatalog()
  assert.equal(emptyCatalog.ok, true)
  if (!emptyCatalog.ok) return
  const catalogFreeOwner = createAppCaseInsertPresetWorkflowOwner({
    lifecycle: detachLifecycle,
    catalog: emptyCatalog.catalog,
  })
  const stillAttached = catalogFreeOwner.inspectCurrent()
  assert.equal(stillAttached.ok, true)
  if (stillAttached.ok) assert.equal(stillAttached.status, 'attached')
  const detachFeedback: string[] = []
  const detachController = createCaseInsertPresetPresentationController({
    workflow: catalogFreeOwner,
    catalog: emptyCatalog.catalog,
    publishDispatchFeedback: (dispatch) =>
      detachFeedback.push(dispatch.commandId),
  })
  assert.equal(detachController.beginDetachReview().ok, true)
  const detachReview = detachController.getSnapshot().review
  assert.ok(detachReview)
  for (const id of detachReview.warningIds) {
    detachController.setWarningAcknowledged(id, true)
  }
  for (const id of detachReview.materialConsentRequirementIds) {
    detachController.setMaterialConsentAccepted(id, true)
  }
  const detached = await detachController.confirmReview()
  assert.equal(detached.ok, true)
  assert.deepEqual(commandIds, ['case.layoutPreset.reapply'])
  assert.deepEqual(detachCommandIds, ['case.layoutPreset.detach'])
  assert.deepEqual(detachFeedback, ['case.layoutPreset.detach'])
  const detachedSession = requireCaseSession(detachRoot.getLifecycleState())
  assert.equal(
    detachedSession.caseInsertPresetApplication.attachment.status,
    'unattached',
  )
  assert.deepEqual(detachedSession.project, beforeDetach)
})

test('visually matching explicit detached persistence remains detached after Open', async () => {
  const applied = workflowSetup()
  const review = requireReview(applied.owner.beginApply({
    selectedPreset: PRESET,
    requestedScope: { kind: 'complete' },
  }))
  assert.equal((await applied.owner.complete(review, confirm(review))).ok, true)
  const session = requireCaseSession(applied.root.getLifecycleState())
  const saved = createCaseInsertProjectSaveSnapshot(
    session.project,
    session.caseInsertPresetApplication,
  )
  saved.caseInsertLayoutPreset =
    createUnattachedCaseInsertLayoutPresetProjectState(
      session.caseInsertPresetApplication.applicationRevision,
    )

  const staged = await stageProjectOpenContents({
    selectedPath: 'C:\\projects\\visually-matching-detached.sbls',
    contents: JSON.stringify(saved),
    persistenceFormat: 'sbls-package-v1',
    caseInsertBrandingSources: createBrandingSources(),
    caseInsertPresetCatalog: CASE_INSERT_PRESET_CATALOG,
  })
  assert.equal(staged.status, 'success', JSON.stringify(staged))
  if (staged.status !== 'success' || staged.value.projectType !== 'caseInsert') {
    return
  }
  const root = createApplicationLifecycleCompositionRoot({
    initialState: createLoadedProjectSession({
      sessionId: 'visually-matching-detached-recovered',
      project: staged.value.normalizedProject,
      currentPath: staged.value.selectedPath,
      persistenceFormat: staged.value.persistenceFormat,
      lastEditorRoute: staged.value.editorRoute,
      caseInsertPresetRecovery: staged.value.caseInsertPresetRecovery,
    }),
  })
  const owner = createAppCaseInsertPresetWorkflowOwner({
    lifecycle: root,
    catalog: CASE_INSERT_PRESET_CATALOG,
  })
  const inspection = owner.inspectCurrent()
  assert.equal(inspection.ok, true)
  if (inspection.ok) assert.equal(inspection.status, 'detached')
})
