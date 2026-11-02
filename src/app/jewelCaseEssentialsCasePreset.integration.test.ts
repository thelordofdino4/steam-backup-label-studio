import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createDefaultCaseInsertImageSlot,
} from '../caseInsert/defaults.ts'
import {
  clearCaseInsertImageSlotSource,
  setCaseInsertImageSlotSource,
} from '../caseInsert/imageSlotTransitions.ts'
import {
  transitionCaseInsertArtworkFraming,
} from '../caseInsert/artworkViewportFraming.ts'
import {
  setCustomCaseInsertTitleArtworkImage,
} from '../caseInsert/titleArtwork.ts'
import {
  updateCaseInsertTemplateImageSlot,
  updateCaseInsertTemplateImageSlotInGroup,
} from '../caseInsert/templateSurfaceTransitions.ts'
import {
  clearCaseInsertTemplatePrimaryImageSlot,
} from '../caseInsert/templateSurfaceImageSlotActions.ts'
import { createBrandingSources } from '../caseInsert/brandingMarkTargetSourcesFixtures.ts'
import {
  createApplicationLifecycleCompositionRoot,
} from '../lifecycle/applicationLifecycleCompositionRoot.ts'
import {
  createJewelCasePreviewLayout,
} from '../layout/caseInsertPreviewLayout.ts'
import {
  getJewelCaseFrontImageSlotPreviewRect,
} from '../layout/jewelCaseFrontLayout.ts'
import {
  createLoadedProjectSession,
  createNewProjectSession,
  isProjectSessionDirty,
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
import type {
  ProjectCaseInsertReservedArtworkViewport,
} from '../project/projectTypes.ts'
import {
  resolveCaseInsertArtworkViewportRenderArtifact,
} from '../render/caseInsertArtworkViewportRenderArtifact.ts'
import {
  CASE_INSERT_PRESET_CATALOG,
  createCaseInsertPresetCatalog,
  type CaseInsertPresetCatalog,
} from '../presets/caseInsertPresetCatalog.ts'
import {
  JEWEL_CASE_ESSENTIALS_CASE_PRESET_ID,
} from '../presets/builtins/jewelCaseEssentialsCasePreset.ts'
import {
  JEWEL_CASE_ESSENTIALS_CASE_PRESET_V2,
} from '../presets/builtins/jewelCaseEssentialsCasePresetV2.ts'
import {
  createCaseInsertPresetReapplyWarningIdentity,
} from '../presets/caseInsertPresetReapplyIdentity.ts'
import {
  createAppCaseInsertPresetWorkflowOwner,
  type AppCaseInsertPresetWorkflowDecision,
  type AppCaseInsertPresetWorkflowReview,
} from './appCaseInsertPresetWorkflow.ts'
import {
  createApplicationCaseInsertPresetEditorApplyPort,
} from './appCaseInsertPresetEditorApply.ts'
import { runCaseInsertPngExport } from './appPngExport.ts'
import { stageProjectOpenContents } from './appProjectLoad.ts'
import {
  createCaseInsertPresetPresentationController,
} from './caseInsertPresetPresentationController.ts'

const PRESET = Object.freeze({
  id: JEWEL_CASE_ESSENTIALS_CASE_PRESET_ID,
  revision: 1,
})

const LATEST_PRESET = Object.freeze({
  id: JEWEL_CASE_ESSENTIALS_CASE_PRESET_ID,
  revision: 2,
})

const SAMPLE_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+XMRdAAAAAElFTkSuQmCC'

const CUSTOM_ARTWORK_VIEWPORT: ProjectCaseInsertReservedArtworkViewport = {
  kind: 'sbls/case-insert-artwork-viewport',
  formatVersion: 1,
  templateId: 'jewelCase',
  templateRevision: null,
  coordinateBasis: 'backPanelSafe',
  widthPercent: 24,
  heightPercent: 16,
  focalPosition: { xPercent: 43, yPercent: 57 },
  zoom: 1.3,
}

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
  cover.titleArtwork.enabled = true

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
  const customArtwork = createDefaultCaseInsertImageSlot(
    'tray-artwork-custom',
    'Untargeted user artwork',
    { enabled: true, layout: { x: 91, y: 9, scale: 0.42 } },
  )
  customArtwork.reservedArtworkViewport =
    structuredClone(CUSTOM_ARTWORK_VIEWPORT)
  tray.artworkSlots.splice(1, 0, customArtwork)
  return project
}

function workflowSetup() {
  const initialState = createNewProjectSession({
    sessionId: 'jewel-case-essentials-apply',
    project: createRepresentativeProject(),
  })
  if (initialState.activeSession?.kind !== 'caseInsert') {
    throw new Error('Expected a Case project session.')
  }
  let editorProject = initialState.activeSession.project.caseInsert
  let editorApplyCount = 0
  const root = createApplicationLifecycleCompositionRoot({
    initialState,
    caseInsertPresetEditorApply:
      createApplicationCaseInsertPresetEditorApplyPort({
        batchReactUpdates: (apply) => apply(),
        setProjectJewelCase(project) {
          editorApplyCount += 1
          editorProject = project
        },
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
  return {
    root,
    owner,
    commandIds,
    getEditorProject: () => editorProject,
    getEditorApplyCount: () => editorApplyCount,
  }
}

test('presentation controller requires explicit selection and completes one production one-shot Apply', async () => {
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
  assert.equal((await controller.applySelectedPreset()).ok, false)
  assert.deepEqual(commandIds, [])

  assert.equal(controller.selectOption(initial.options[0]!.value).ok, true)
  const first = controller.applySelectedPreset()
  const duplicate = await controller.applySelectedPreset()
  assert.equal(duplicate.ok, false)
  assert.equal(duplicate.code, 'case.layoutPreset.apply-pending')
  const firstResult = await first
  assert.equal(firstResult.ok, true, JSON.stringify(firstResult))
  assert.deepEqual(commandIds, ['case.layoutPreset.apply'])
  assert.deepEqual(feedback, ['case.layoutPreset.apply'])
  const completed = controller.getSnapshot()
  assert.equal(completed.selectedOptionValue, '')
  assert.equal(completed.inspection.ok, true)
  if (completed.inspection.ok) {
    assert.equal(completed.inspection.status, 'attached')
    if (completed.inspection.status === 'attached') {
      assert.equal(completed.inspection.configuration.preset.revision, 2)
    }
  }
  assert.equal(
    requireCaseSession(root.getLifecycleState())
      .caseInsertPresetApplication.attachment.status,
    'attached',
  )
})

test('latest selection and clearing remain transient and leave a clean blank Case session unchanged', () => {
  const root = createApplicationLifecycleCompositionRoot({
    initialState: createLoadedProjectSession({
      sessionId: 'jewel-case-essentials-nonmutating-review',
      currentPath: 'C:\\projects\\clean-case.sbls',
      persistenceFormat: 'sbls-package-v1',
      project: createBlankJewelCaseSavedProject('Clean Case'),
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
  const controller = createCaseInsertPresetPresentationController({
    workflow: owner,
    catalog: CASE_INSERT_PRESET_CATALOG,
    publishDispatchFeedback: () => {
      throw new Error('Selection-only interaction must not publish feedback.')
    },
  })
  const before = root.getLifecycleState()
  const source = requireCaseSession(before)
  assert.equal(isProjectSessionDirty(source), false)
  assert.deepEqual(
    source.project.caseInsert.templates.tray.artworkSlots,
    [],
  )

  const option = controller.getSnapshot().options[0]
  assert.ok(option)
  assert.equal(option.revision, 2)
  assert.equal(controller.selectOption(option.value).ok, true)
  assert.strictEqual(root.getLifecycleState(), before)
  assert.equal(controller.selectOption('').ok, true)
  assert.equal(controller.getSnapshot().selectedOptionValue, '')
  assert.strictEqual(root.getLifecycleState(), before)
  const after = requireCaseSession(root.getLifecycleState())
  assert.equal(isProjectSessionDirty(after), false)
  assert.deepEqual(after.project.caseInsert.templates.tray.artworkSlots, [])
  assert.deepEqual(commandIds, [])
  root.dispose()
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

  const completed = await owner.applySelected({
    selectedPreset: PRESET,
    requestedScope: { kind: 'complete' },
  })
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
  const customArtwork = installed.project.caseInsert.templates.tray
    .artworkSlots.find(({ id }) => id === 'tray-artwork-custom')
  assert.deepEqual(
    customArtwork?.reservedArtworkViewport,
    CUSTOM_ARTWORK_VIEWPORT,
  )
  if (installed.caseInsertPresetApplication.attachment.status === 'attached') {
    assert.equal(
      installed.caseInsertPresetApplication.attachment.configuration.ownedFields
        .some(({ address }) =>
          address.bindingId === 'tray-artwork-custom' ||
          address.runtimeObjectId === 'tray-artwork-custom'),
      false,
    )
  }
  const inspection = owner.inspectCurrent()
  assert.equal(inspection.ok, true)
  if (inspection.ok && inspection.status === 'attached') {
    assert.equal(inspection.customization.ok, true)
    if (inspection.customization.ok) {
      assert.equal(inspection.customization.status, 'clean')
    }
  }
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

test('revision-2 Apply installs the exact Game Logo and screenshot successors into the editor aggregate', async () => {
  const {
    root,
    owner,
    commandIds,
    getEditorProject,
    getEditorApplyCount,
  } = workflowSetup()
  const source = requireCaseSession(root.getLifecycleState())
  const sourceTitle = structuredClone(
    source.project.caseInsert.templates.cover.titleArtwork,
  )
  const sourceScreenshots = new Map(
    source.project.caseInsert.templates.tray.artworkSlots.map((slot) => [
      slot.id,
      structuredClone(slot),
    ]),
  )
  const sourceOrder = source.project.caseInsert.templates.tray.artworkSlots
    .map(({ id }) => id)

  const result = await owner.applySelected({
    selectedPreset: LATEST_PRESET,
    requestedScope: { kind: 'complete' },
  })
  assert.equal(result.ok, true, JSON.stringify(result))
  assert.deepEqual(commandIds, ['case.layoutPreset.apply'])
  assert.equal(getEditorApplyCount(), 1)

  const installed = requireCaseSession(root.getLifecycleState())
  const editorProject = getEditorProject()
  assert.deepEqual(editorProject, installed.project.caseInsert)
  assert.equal(installed.caseInsertPresetApplication.attachment.status, 'attached')
  if (installed.caseInsertPresetApplication.attachment.status === 'attached') {
    assert.deepEqual(
      installed.caseInsertPresetApplication.attachment.configuration.preset,
      {
        id: JEWEL_CASE_ESSENTIALS_CASE_PRESET_ID,
        revision: 2,
        source: 'builtin',
      },
    )
  }

  const title = editorProject.templates.cover.titleArtwork
  assert.equal(title.id, 'cover-title-artwork')
  assert.deepEqual(title.layout, {
    x: 50,
    y: 18,
    scale: 0.24,
    rotation: sourceTitle.layout.rotation,
  })
  assert.equal(title.imageDataUrl, sourceTitle.imageDataUrl)
  assert.deepEqual(title.imageSource, sourceTitle.imageSource)
  assert.deepEqual(title.imageSize, sourceTitle.imageSize)
  assert.equal(title.enabled, sourceTitle.enabled)
  assert.equal(title.label, sourceTitle.label)
  assert.equal(title.fit, sourceTitle.fit)
  const frontLayout = createJewelCasePreviewLayout('jewelCase', 'front')
  const sourceTitlePreviewRect = getJewelCaseFrontImageSlotPreviewRect(
    sourceTitle,
    frontLayout,
    'titleArtwork',
  )
  const installedTitlePreviewRect = getJewelCaseFrontImageSlotPreviewRect(
    title,
    frontLayout,
    'titleArtwork',
  )
  assert.notDeepEqual(sourceTitlePreviewRect, installedTitlePreviewRect)
  let exportedTitlePreviewRect = null as typeof installedTitlePreviewRect
  const exportResult = await runCaseInsertPngExport({
    activeTemplatePane: 'cover',
    brandingSources: createBrandingSources(),
    buildPreflightSummary: () => ({
      message: 'clean',
      hasWarnings: false,
      warnings: [],
    }),
    caseInsert: editorProject,
    confirmDialog: async () => true,
    exportPngBytes: async (input) => {
      assert.equal(input.caseInsert, editorProject)
      assert.equal(
        input.caseInsert.templates.cover.titleArtwork,
        title,
      )
      exportedTitlePreviewRect = getJewelCaseFrontImageSlotPreviewRect(
        input.caseInsert.templates.cover.titleArtwork,
        frontLayout,
        'titleArtwork',
      )
      return { bytes: [1], width: 1414, height: 1414, dpi: 300 }
    },
    saveDialog: async () => 'cover.png',
    writeBinaryFileCommand: async () => {},
  })
  assert.equal(exportResult.status, 'success')
  assert.deepEqual(exportedTitlePreviewRect, installedTitlePreviewRect)

  const screenshots = editorProject.templates.tray.artworkSlots
  assert.deepEqual(screenshots.map(({ id }) => id), sourceOrder)
  const expectedX = new Map([
    ['tray-artwork-1', 17],
    ['tray-artwork-2', 50],
    ['tray-artwork-3', 83],
  ])
  const resolvedCenters: number[] = []
  const backLayout = createJewelCasePreviewLayout('jewelCase', 'back')
  for (const id of expectedX.keys()) {
    const before = sourceScreenshots.get(id)
    const slot = screenshots.find((candidate) => candidate.id === id)
    assert.ok(before)
    assert.ok(slot)
    if (!before || !slot) continue
    assert.equal(screenshots.filter((candidate) => candidate.id === id).length, 1)
    assert.deepEqual(slot.layout, {
      x: expectedX.get(id),
      y: 78,
      scale: 1,
      rotation: before.layout.rotation,
    })
    assert.deepEqual(slot.reservedArtworkViewport, {
      kind: 'sbls/case-insert-artwork-viewport',
      formatVersion: 1,
      templateId: 'jewelCase',
      templateRevision: null,
      coordinateBasis: 'backPanelSafe',
      widthPercent: 26,
      heightPercent: 16,
      focalPosition: { xPercent: 50, yPercent: 50 },
      zoom: 1,
    })
    assert.equal(slot.fit, 'cover')
    assert.equal(slot.imageDataUrl, before.imageDataUrl)
    assert.deepEqual(slot.imageSource, before.imageSource)
    assert.deepEqual(slot.imageSize, before.imageSize)
    assert.equal(slot.enabled, before.enabled)
    assert.equal(slot.label, before.label)
    assert.deepEqual(slot.frame, before.frame)
    const render = resolveCaseInsertArtworkViewportRenderArtifact({
      owner: 'tray',
      slot: { ...slot, enabled: true },
      layout: backLayout,
    })
    assert.equal(render.status, 'resolved')
    if (render.status === 'resolved') {
      resolvedCenters.push(render.artifact.box.center.x)
      assert.ok(render.artifact.outerRect.x >= render.artifact.basisRect.x)
      assert.ok(
        render.artifact.outerRect.x + render.artifact.outerRect.width <=
          render.artifact.basisRect.x + render.artifact.basisRect.width,
      )
      assert.ok(
        Math.abs(render.artifact.outerRect.width * 25.4 / 300 - 33.76845) <
          0.00001,
      )
      assert.ok(
        Math.abs(render.artifact.outerRect.height * 25.4 / 300 - 17.52939) <
          0.00001,
      )
    }
  }
  assert.equal(new Set(resolvedCenters).size, 3)

  assert.equal(root.synchronizeCurrentProject({
    sessionId: installed.id,
    kind: 'caseInsert',
    project: {
      ...installed.project,
      caseInsert: editorProject,
    },
  }), 'no-op')
  root.dispose()
})

test('post-Apply Game Logo and exact screenshot source changes preserve preset geometry through Save/Open', async () => {
  const { root, owner, getEditorProject } = workflowSetup()
  assert.equal((await owner.applySelected({
    selectedPreset: LATEST_PRESET,
    requestedScope: { kind: 'complete' },
  })).ok, true)
  const applied = requireCaseSession(root.getLifecycleState())
  let editorProject = getEditorProject()
  const titleLayout = structuredClone(
    editorProject.templates.cover.titleArtwork.layout,
  )
  const titleInvariants = {
    id: editorProject.templates.cover.titleArtwork.id,
    label: editorProject.templates.cover.titleArtwork.label,
    fit: editorProject.templates.cover.titleArtwork.fit,
    layout: titleLayout,
    frame: structuredClone(editorProject.templates.cover.titleArtwork.frame),
    defaultSteamLogo: structuredClone(
      editorProject.templates.cover.titleArtwork.defaultSteamLogo,
    ),
  }
  const screenshotIds = [
    'tray-artwork-1',
    'tray-artwork-2',
    'tray-artwork-3',
  ] as const
  const screenshotInvariants = new Map(screenshotIds.map((id) => {
    const slot = editorProject.templates.tray.artworkSlots.find(
      (candidate) => candidate.id === id,
    )!
    return [id, {
      id: slot.id,
      label: slot.label,
      enabled: slot.enabled,
      fit: slot.fit,
      layout: structuredClone(slot.layout),
      frame: structuredClone(slot.frame),
      viewport: structuredClone(slot.reservedArtworkViewport),
    }] as const
  }))
  const additionalArtworkEnabled =
    editorProject.templates.tray.additionalArtworkEnabled
  const originalOrder = editorProject.templates.tray.artworkSlots
    .map(({ id }) => id)
  const titleReplacement = {
    imageDataUrl: SAMPLE_PNG,
    imageSize: { width: 1200, height: 400 },
    imageSource: createEmbeddedProjectImageAssetProvenance(
      'Replacement Game Logo',
    ),
  }

  editorProject = updateCaseInsertTemplateImageSlot(
    editorProject,
    'cover',
    'titleArtwork',
    (slot) => setCustomCaseInsertTitleArtworkImage(slot, titleReplacement),
  )
  assert.deepEqual(
    editorProject.templates.cover.titleArtwork.layout,
    titleLayout,
  )
  editorProject = clearCaseInsertTemplatePrimaryImageSlot(
    editorProject,
    'cover',
    'titleArtwork',
  )
  const clearedTitle = editorProject.templates.cover.titleArtwork
  assert.equal(clearedTitle.imageDataUrl, null)
  assert.equal(clearedTitle.imageSource, null)
  assert.equal(clearedTitle.imageSize, null)
  assert.deepEqual({
    id: clearedTitle.id,
    label: clearedTitle.label,
    fit: clearedTitle.fit,
    layout: clearedTitle.layout,
    frame: clearedTitle.frame,
    defaultSteamLogo: clearedTitle.defaultSteamLogo,
  }, titleInvariants)
  editorProject = updateCaseInsertTemplateImageSlot(
    editorProject,
    'cover',
    'titleArtwork',
    (slot) => setCustomCaseInsertTitleArtworkImage(slot, titleReplacement),
  )
  assert.deepEqual(
    editorProject.templates.cover.titleArtwork.layout,
    titleLayout,
  )

  const replaceScreenshot = (
    project: typeof editorProject,
    slotId: typeof screenshotIds[number],
    sourceLabel: string,
    imageSize: Readonly<{ width: number; height: number }>,
  ) => updateCaseInsertTemplateImageSlotInGroup(
    project,
    'tray',
    'artworkSlots',
    slotId,
    (slot) => setCaseInsertImageSlotSource(slot, {
      imageDataUrl: SAMPLE_PNG,
      imageSize,
      imageSource: createEmbeddedProjectImageAssetProvenance(sourceLabel),
    }),
  )
  const assertScreenshotInvariant = (
    project: typeof editorProject,
    slotId: typeof screenshotIds[number],
  ) => {
    const slot = project.templates.tray.artworkSlots.find(
      (candidate) => candidate.id === slotId,
    )!
    assert.deepEqual(
      project.templates.tray.artworkSlots.map(({ id }) => id),
      originalOrder,
    )
    assert.equal(
      project.templates.tray.artworkSlots.filter(({ id }) => id === slotId).length,
      1,
    )
    assert.equal(
      project.templates.tray.additionalArtworkEnabled,
      additionalArtworkEnabled,
    )
    assert.deepEqual({
      id: slot.id,
      label: slot.label,
      enabled: slot.enabled,
      fit: slot.fit,
      layout: slot.layout,
      frame: slot.frame,
      viewport: slot.reservedArtworkViewport,
    }, screenshotInvariants.get(slotId))
    return slot
  }

  for (const [index, slotId] of screenshotIds.entries()) {
    editorProject = replaceScreenshot(
      editorProject,
      slotId,
      `Selected 16:9 screenshot ${index + 1}`,
      { width: 1600, height: 900 },
    )
    assertScreenshotInvariant(editorProject, slotId)
    editorProject = replaceScreenshot(
      editorProject,
      slotId,
      `Replacement 4:3 screenshot ${index + 1}`,
      { width: 1200, height: 900 },
    )
    assertScreenshotInvariant(editorProject, slotId)
    editorProject = updateCaseInsertTemplateImageSlotInGroup(
      editorProject,
      'tray',
      'artworkSlots',
      slotId,
      clearCaseInsertImageSlotSource,
    )
    const cleared = assertScreenshotInvariant(editorProject, slotId)
    assert.equal(cleared.imageDataUrl, null)
    assert.equal(cleared.imageSource, null)
    assert.equal(cleared.imageSize, null)
    editorProject = replaceScreenshot(
      editorProject,
      slotId,
      `Restored screenshot ${index + 1}`,
      { width: 1024, height: 768 },
    )
    const restored = assertScreenshotInvariant(editorProject, slotId)
    assert.equal(
      restored.imageSource?.sourceLabel,
      `Restored screenshot ${index + 1}`,
    )
    assert.deepEqual(restored.imageSize, { width: 1024, height: 768 })
  }

  assert.equal(root.synchronizeCurrentProject({
    sessionId: applied.id,
    kind: 'caseInsert',
    project: { ...applied.project, caseInsert: editorProject },
  }), 'synchronized')
  const edited = requireCaseSession(root.getLifecycleState())
  const inspection = owner.inspectCurrent()
  assert.equal(inspection.ok, true)
  if (inspection.ok && inspection.status === 'attached') {
    assert.equal(inspection.customization.ok, true)
    if (inspection.customization.ok) {
      assert.equal(inspection.customization.status, 'clean')
    }
  }

  const saved = createCaseInsertProjectSaveSnapshot(
    edited.project,
    edited.caseInsertPresetApplication,
  )
  const staged = await stageProjectOpenContents({
    selectedPath: 'C:\\projects\\jewel-case-source-preservation.sbls',
    contents: JSON.stringify(saved),
    persistenceFormat: 'sbls-package-v1',
    caseInsertBrandingSources: createBrandingSources(),
    caseInsertPresetCatalog: CASE_INSERT_PRESET_CATALOG,
  })
  assert.equal(staged.status, 'success', JSON.stringify(staged))
  if (staged.status !== 'success' || staged.value.projectType !== 'caseInsert') {
    return
  }
  assert.deepEqual(
    staged.value.restoredProject.caseInsert,
    edited.project.caseInsert,
  )
  assert.equal(
    staged.value.restoredProject.caseInsert.templates.cover.titleArtwork.id,
    'cover-title-artwork',
  )
  assert.deepEqual(
    staged.value.restoredProject.caseInsert.templates.cover.titleArtwork.layout,
    titleLayout,
  )
  assert.deepEqual(
    staged.value.restoredProject.caseInsert.templates.tray.artworkSlots
      .map(({ id }) => id),
    originalOrder,
  )
  const recoveredRoot = createApplicationLifecycleCompositionRoot({
    initialState: createLoadedProjectSession({
      sessionId: 'jewel-case-source-ownership-recovered',
      project: staged.value.normalizedProject,
      currentPath: staged.value.selectedPath,
      persistenceFormat: staged.value.persistenceFormat,
      lastEditorRoute: staged.value.editorRoute,
      caseInsertPresetRecovery: staged.value.caseInsertPresetRecovery,
    }),
  })
  const recoveredOwner = createAppCaseInsertPresetWorkflowOwner({
    lifecycle: recoveredRoot,
    catalog: CASE_INSERT_PRESET_CATALOG,
  })
  const clean = requireCaseSession(recoveredRoot.getLifecycleState())
  assert.equal(isProjectSessionDirty(clean), false)
  const sourceChangedCase = updateCaseInsertTemplateImageSlotInGroup(
    clean.project.caseInsert,
    'tray',
    'artworkSlots',
    'tray-artwork-1',
    (slot) => setCaseInsertImageSlotSource(slot, {
      imageDataUrl: SAMPLE_PNG,
      imageSize: { width: 800, height: 600 },
      imageSource: createEmbeddedProjectImageAssetProvenance(
        'Dirty user source',
      ),
    }),
  )
  assert.equal(recoveredRoot.synchronizeCurrentProject({
    sessionId: clean.id,
    kind: 'caseInsert',
    project: { ...clean.project, caseInsert: sourceChangedCase },
  }), 'synchronized')
  const sourceChanged = requireCaseSession(recoveredRoot.getLifecycleState())
  assert.equal(isProjectSessionDirty(sourceChanged), true)
  assert.equal(sourceChanged.revision, clean.revision + 1)
  assert.equal(
    sourceChanged.caseInsertPresetApplication.applicationRevision,
    clean.caseInsertPresetApplication.applicationRevision + 1,
  )
  const sourceInspection = recoveredOwner.inspectCurrent()
  assert.equal(sourceInspection.ok, true)
  if (sourceInspection.ok && sourceInspection.status === 'attached') {
    assert.equal(sourceInspection.customization.ok, true)
    if (sourceInspection.customization.ok) {
      assert.equal(sourceInspection.customization.status, 'clean')
    }
  }

  const framed = transitionCaseInsertArtworkFraming(
    sourceChanged.project.caseInsert,
    'tray',
    'tray-artwork-1',
    { field: 'zoom', value: 2.5 },
  )
  assert.equal(framed.ok, true)
  if (!framed.ok) return
  assert.equal(recoveredRoot.synchronizeCurrentProject({
    sessionId: sourceChanged.id,
    kind: 'caseInsert',
    project: { ...sourceChanged.project, caseInsert: framed.project },
  }), 'synchronized')
  const framedInspection = recoveredOwner.inspectCurrent()
  assert.equal(framedInspection.ok, true)
  if (framedInspection.ok && framedInspection.status === 'attached') {
    assert.equal(framedInspection.customization.ok, true)
    if (framedInspection.customization.ok) {
      assert.equal(framedInspection.customization.status, 'customized')
    }
  }
  recoveredRoot.dispose()
  root.dispose()
})

test('the same one-shot Apply resets only definition-owned layout and preserves content', async () => {
  const { root, owner, commandIds } = workflowSetup()
  assert.equal((await owner.applySelected({
    selectedPreset: PRESET,
    requestedScope: { kind: 'complete' },
  })).ok, true)
  const first = requireCaseSession(root.getLifecycleState())
  const expectedBackgroundLayout = structuredClone(
    first.project.caseInsert.templates.cover.background.layout,
  )
  const editedProject = structuredClone(first.project)
  editedProject.caseInsert.templates.cover.background.layout.x += 19
  editedProject.caseInsert.templates.cover.background.layout.scale = 0.43
  editedProject.caseInsert.templates.cover.background.label =
    'Preserve this user label'
  assert.equal(root.synchronizeCurrentProject({
    sessionId: first.id,
    kind: 'caseInsert',
    project: editedProject,
  }), 'synchronized')
  const beforeRepeat = requireCaseSession(root.getLifecycleState())

  assert.equal((await owner.applySelected({
    selectedPreset: PRESET,
    requestedScope: { kind: 'complete' },
  })).ok, true)
  const repeated = requireCaseSession(root.getLifecycleState())
  assert.deepEqual(commandIds, [
    'case.layoutPreset.apply',
    'case.layoutPreset.apply',
  ])
  assert.deepEqual(
    repeated.project.caseInsert.templates.cover.background.layout,
    expectedBackgroundLayout,
  )
  assert.equal(
    repeated.project.caseInsert.templates.cover.background.label,
    'Preserve this user label',
  )
  assert.deepEqual(
    withoutLayouts(repeated.project),
    withoutLayouts(beforeRepeat.project),
  )

  const beforeNoOp = requireCaseSession(root.getLifecycleState())
  assert.equal((await owner.applySelected({
    selectedPreset: PRESET,
    requestedScope: { kind: 'complete' },
  })).ok, true)
  const noOp = requireCaseSession(root.getLifecycleState())
  assert.equal(noOp.revision, beforeNoOp.revision)
  assert.deepEqual(noOp.project, beforeNoOp.project)
  assert.deepEqual(commandIds, [
    'case.layoutPreset.apply',
    'case.layoutPreset.apply',
    'case.layoutPreset.apply',
  ])
  root.dispose()
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
  assert.equal(
    appliedSession.caseInsertPresetApplication.attachment.status,
    'attached',
  )
  if (appliedSession.caseInsertPresetApplication.attachment.status !==
      'attached') return
  const saved = createCaseInsertProjectSaveSnapshot(
    appliedSession.project,
    appliedSession.caseInsertPresetApplication,
  )
  assert.equal(saved.schemaVersion, CURRENT_PROJECT_SCHEMA_VERSION)

  const catalogUnavailableStaged = await stageProjectOpenContents({
    selectedPath: 'C:\\projects\\jewel-case-essentials-no-catalog.sbls',
    contents: JSON.stringify(saved),
    persistenceFormat: 'sbls-package-v1',
    caseInsertBrandingSources: createBrandingSources(),
    caseInsertPresetCatalog: {
      getExact: () => { throw new Error('Catalog unavailable.') },
      getLatest: () => { throw new Error('Catalog unavailable.') },
      resolve: () => { throw new Error('Catalog unavailable.') },
      list: () => { throw new Error('Catalog unavailable.') },
    } satisfies CaseInsertPresetCatalog,
  })
  assert.equal(
    catalogUnavailableStaged.status,
    'success',
    JSON.stringify(catalogUnavailableStaged),
  )
  if (catalogUnavailableStaged.status !== 'success' ||
      catalogUnavailableStaged.value.projectType !== 'caseInsert') return
  assert.deepEqual(
    catalogUnavailableStaged.value.caseInsertPresetRecovery.recoveryStatus,
    { status: 'unavailable', code: 'catalog-unavailable' },
  )
  assert.deepEqual(
    catalogUnavailableStaged.value.normalizedProject.caseInsert.templates.tray
      .artworkSlots.find(({ id }) => id === 'tray-artwork-custom')
      ?.reservedArtworkViewport,
    CUSTOM_ARTWORK_VIEWPORT,
  )
  const catalogUnavailableSession = createLoadedProjectSession({
    sessionId: 'jewel-case-essentials-no-catalog-recovered',
    project: catalogUnavailableStaged.value.normalizedProject,
    currentPath: catalogUnavailableStaged.value.selectedPath,
    persistenceFormat: catalogUnavailableStaged.value.persistenceFormat,
    lastEditorRoute: catalogUnavailableStaged.value.editorRoute,
    caseInsertPresetRecovery:
      catalogUnavailableStaged.value.caseInsertPresetRecovery,
  })
  const catalogUnavailableCaseSession = requireCaseSession(
    catalogUnavailableSession,
  )
  assert.deepEqual(
    catalogUnavailableCaseSession.project.caseInsert.templates.tray
      .artworkSlots.find(({ id }) => id === 'tray-artwork-custom')
      ?.reservedArtworkViewport,
    CUSTOM_ARTWORK_VIEWPORT,
  )
  assert.equal(
    catalogUnavailableCaseSession.caseInsertPresetApplication.attachment.status,
    'attached',
  )
  if (catalogUnavailableCaseSession.caseInsertPresetApplication.attachment
    .status === 'attached') {
    assert.deepEqual(
      catalogUnavailableCaseSession.caseInsertPresetApplication.attachment
        .configuration.ownedFields,
      appliedSession.caseInsertPresetApplication.attachment.configuration
        .ownedFields,
    )
    assert.deepEqual(
      catalogUnavailableCaseSession.caseInsertPresetApplication.attachment
        .configuration.preset,
      appliedSession.caseInsertPresetApplication.attachment.configuration
        .preset,
    )
  }
  assert.deepEqual(
    createCaseInsertProjectSaveSnapshot(
      catalogUnavailableCaseSession.project,
      catalogUnavailableCaseSession.caseInsertPresetApplication,
    ).caseInsertLayoutPreset,
    saved.caseInsertLayoutPreset,
  )

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
    status: 'stale',
    savedRevision: 1,
    latestAvailableRevision: 2,
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

  const owner = createAppCaseInsertPresetWorkflowOwner({
    lifecycle,
    catalog: CASE_INSERT_PRESET_CATALOG,
  })
  const inspection = owner.inspectCurrent()
  assert.equal(inspection.ok, true)
  if (inspection.ok) {
    assert.equal(inspection.status, 'attached')
    assert.deepEqual(inspection.recoveryStatus, {
      status: 'stale',
      savedRevision: 1,
      latestAvailableRevision: 2,
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
    CASE_INSERT_PRESET_CATALOG.getLatest(
      JEWEL_CASE_ESSENTIALS_CASE_PRESET_ID,
    )?.revision,
    2,
  )
  assert.deepEqual(commandIds, [])
  const exactReview = requireReview(owner.beginReapply({
    selectedPreset: PRESET,
    customizedFieldPolicies: [],
  }))
  assert.equal(exactReview.operation, 'reapply')
  if (exactReview.operation !== 'reapply') return
  assert.equal(exactReview.selectedPreset.revision, 1)
  assert.equal(exactReview.plan.preset.selectedRevision, 1)
  const reapplied = await owner.complete(exactReview, confirm(exactReview))
  assert.equal(reapplied.ok, true, JSON.stringify(reapplied))
  assert.deepEqual(commandIds, ['case.layoutPreset.reapply'])
  const afterExactReapply = owner.inspectCurrent()
  assert.equal(afterExactReapply.ok, true)
  if (afterExactReapply.ok) {
    assert.deepEqual(afterExactReapply.recoveryStatus, {
      status: 'stale',
      savedRevision: 1,
      latestAvailableRevision: 2,
      customization: 'clean',
    })
    if (afterExactReapply.status === 'attached') {
      assert.equal(afterExactReapply.configuration.preset.revision, 1)
    }
  }

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
  const detachReview = requireReview(catalogFreeOwner.beginDetach())
  const detached = await catalogFreeOwner.complete(
    detachReview,
    confirm(detachReview),
  )
  assert.equal(detached.ok, true)
  assert.deepEqual(commandIds, ['case.layoutPreset.reapply'])
  assert.deepEqual(detachCommandIds, ['case.layoutPreset.detach'])
  const detachedSession = requireCaseSession(detachRoot.getLifecycleState())
  assert.equal(
    detachedSession.caseInsertPresetApplication.attachment.status,
    'unattached',
  )
  assert.deepEqual(detachedSession.project, beforeDetach)
  assert.deepEqual(
    detachedSession.project.caseInsert.templates.tray.artworkSlots.find(
      ({ id }) => id === 'tray-artwork-custom',
    )?.reservedArtworkViewport,
    CUSTOM_ARTWORK_VIEWPORT,
  )
})

test('revision-1 exact Reapply stays stale without creating slots, viewports, or upgrading', async () => {
  const root = createApplicationLifecycleCompositionRoot({
    initialState: createNewProjectSession({
      sessionId: 'jewel-case-essentials-v1-exact-reapply',
      project: createBlankJewelCaseSavedProject('Exact revision 1'),
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
  const applyReview = requireReview(owner.beginApply({
    selectedPreset: PRESET,
    requestedScope: { kind: 'complete' },
  }))
  assert.equal((await owner.complete(
    applyReview,
    confirm(applyReview),
  )).ok, true)
  const applied = requireCaseSession(root.getLifecycleState())
  assert.deepEqual(
    applied.caseInsertPresetApplication.recoveryStatus,
    {
      status: 'stale',
      savedRevision: 1,
      latestAvailableRevision: 2,
      customization: 'clean',
    },
  )
  assert.deepEqual(
    applied.project.caseInsert.templates.tray.artworkSlots,
    [],
  )

  const inspection = owner.inspectCurrent()
  assert.equal(inspection.ok, true)
  if (!inspection.ok || inspection.status !== 'attached') return
  assert.equal(inspection.configuration.preset.revision, 1)
  assert.deepEqual(inspection.recoveryStatus, {
    status: 'stale',
    savedRevision: 1,
    latestAvailableRevision: 2,
    customization: 'clean',
  })

  const reapplyReview = requireReview(owner.beginReapply({
    selectedPreset: PRESET,
    customizedFieldPolicies: [],
  }))
  assert.equal(reapplyReview.operation, 'reapply')
  if (reapplyReview.operation !== 'reapply') return
  assert.equal(reapplyReview.plan.preset.selectedRevision, 1)
  assert.equal('objectCreationActions' in reapplyReview.plan, false)
  assert.equal('artworkViewportActions' in reapplyReview.plan, false)
  assert.equal((await owner.complete(
    reapplyReview,
    confirm(reapplyReview),
  )).ok, true)

  const reapplied = requireCaseSession(root.getLifecycleState())
  assert.deepEqual(commandIds, [
    'case.layoutPreset.apply',
    'case.layoutPreset.reapply',
  ])
  assert.deepEqual(reapplied.project.caseInsert.templates.tray.artworkSlots, [])
  assert.equal(reapplied.caseInsertPresetApplication.attachment.status,
    'attached')
  if (reapplied.caseInsertPresetApplication.attachment.status === 'attached') {
    assert.equal(
      reapplied.caseInsertPresetApplication.attachment.configuration.preset
        .revision,
      1,
    )
  }
  assert.deepEqual(
    reapplied.caseInsertPresetApplication.recoveryStatus,
    {
      status: 'stale',
      savedRevision: 1,
      latestAvailableRevision: 2,
      customization: 'clean',
    },
  )
  root.dispose()
})

test('one-shot Apply replaces historical revision-1 metadata with selected revision 2 while preserving content', async () => {
  const project = createBlankJewelCaseSavedProject('One-shot revision upgrade')
  const root = createApplicationLifecycleCompositionRoot({
    initialState: createNewProjectSession({
      sessionId: 'jewel-case-essentials-one-shot-upgrade',
      project,
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

  const first = await owner.applySelected({
    selectedPreset: PRESET,
    requestedScope: { kind: 'complete' },
  })
  assert.equal(first.ok, true, JSON.stringify(first))
  const revisionOne = requireCaseSession(root.getLifecycleState())
  assert.equal(revisionOne.caseInsertPresetApplication.attachment.status,
    'attached')
  if (revisionOne.caseInsertPresetApplication.attachment.status !== 'attached') {
    return
  }
  assert.equal(
    revisionOne.caseInsertPresetApplication.attachment.configuration.preset
      .revision,
    1,
  )

  const edited = structuredClone(revisionOne.project)
  const description = edited.caseInsert.templates.tray.textBlocks.find(
    ({ id }) => id === 'tray-description',
  )!
  description.enabled = true
  description.value = 'Keep this user-authored description'
  description.contentMode = 'html'
  description.htmlSource = '<p><em>Keep this user-authored description</em></p>'
  description.source = 'manual'
  const custom = createDefaultCaseInsertImageSlot(
    'tray-artwork-user-owned',
    'Keep this user artwork',
    { enabled: true, layout: { x: 91, y: 9, scale: 0.42 } },
  )
  custom.imageDataUrl = SAMPLE_PNG
  custom.imageSource = createEmbeddedProjectImageAssetProvenance(custom.label)
  custom.imageSize = { width: 1, height: 1 }
  edited.caseInsert.templates.tray.artworkSlots.push(custom)
  assert.equal(root.synchronizeCurrentProject({
    sessionId: revisionOne.id,
    kind: 'caseInsert',
    project: edited,
  }), 'synchronized')

  const beforeUpgrade = requireCaseSession(root.getLifecycleState())
  const second = await owner.applySelected({
    selectedPreset: LATEST_PRESET,
    requestedScope: { kind: 'complete' },
  })
  assert.equal(second.ok, true, JSON.stringify(second))
  assert.deepEqual(commandIds, [
    'case.layoutPreset.apply',
    'case.layoutPreset.apply',
  ])
  const upgraded = requireCaseSession(root.getLifecycleState())
  assert.equal(upgraded.id, beforeUpgrade.id)
  assert.equal(
    upgraded.caseInsertPresetApplication.applicationRevision,
    beforeUpgrade.caseInsertPresetApplication.applicationRevision + 1,
  )
  assert.equal(upgraded.caseInsertPresetApplication.attachment.status,
    'attached')
  if (upgraded.caseInsertPresetApplication.attachment.status !== 'attached') {
    return
  }
  assert.equal(
    upgraded.caseInsertPresetApplication.attachment.configuration.preset
      .revision,
    2,
  )
  const upgradedDescription = upgraded.project.caseInsert.templates.tray
    .textBlocks.find(({ id }) => id === 'tray-description')!
  assert.equal(upgradedDescription.value, description.value)
  assert.equal(upgradedDescription.htmlSource, description.htmlSource)
  assert.equal(upgradedDescription.source, description.source)
  const userArtwork = upgraded.project.caseInsert.templates.tray.artworkSlots
    .find(({ id }) => id === custom.id)!
  assert.equal(userArtwork.imageDataUrl, custom.imageDataUrl)
  assert.deepEqual(userArtwork.imageSource, custom.imageSource)
  assert.deepEqual(userArtwork.imageSize, custom.imageSize)
  assert.equal(userArtwork.label, custom.label)
  assert.equal(userArtwork.enabled, custom.enabled)
  for (const id of ['tray-artwork-1', 'tray-artwork-2', 'tray-artwork-3']) {
    const slot = upgraded.project.caseInsert.templates.tray.artworkSlots.find(
      (candidate) => candidate.id === id,
    )
    assert.ok(slot)
    assert.equal(slot.imageDataUrl, null)
    assert.equal(slot.enabled, false)
    assert.ok(slot.reservedArtworkViewport)
  }
  root.dispose()
})

test('revision-2 review plans three exact empty screenshot slots and one atomic Apply creates their Cover viewports', async () => {
  assert.deepEqual(
    CASE_INSERT_PRESET_CATALOG.getExact(
      JEWEL_CASE_ESSENTIALS_CASE_PRESET_ID,
      2,
    ),
    JEWEL_CASE_ESSENTIALS_CASE_PRESET_V2,
  )
  const project = createBlankJewelCaseSavedProject('Viewport-aware preset')
  assert.deepEqual(project.caseInsert.templates.tray.artworkSlots, [])
  const sourceAdditionalArtworkEnabled =
    project.caseInsert.templates.tray.additionalArtworkEnabled
  const root = createApplicationLifecycleCompositionRoot({
    initialState: createNewProjectSession({
      sessionId: 'jewel-case-essentials-v2-missing-screenshots',
      project,
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
  const beforeReview = root.getLifecycleState()
  const review = requireReview(owner.beginApply({
    selectedPreset: LATEST_PRESET,
    requestedScope: { kind: 'complete' },
  }))

  assert.strictEqual(root.getLifecycleState(), beforeReview)
  assert.deepEqual(commandIds, [])
  assert.deepEqual(
    review.plan.objectCreationActions.map((action) => ({
      objectId: action.target.runtimeObjectId,
      label: action.canonicalInitialObject.label,
      review: action.review.actionLabel,
      initialState: action.review.initialStateLabel,
    })).sort((left, right) => left.objectId.localeCompare(right.objectId)),
    [1, 2, 3].map((number) => ({
      objectId: `tray-artwork-${number}`,
      label: `Artwork ${number}`,
      review: `Create empty Screenshot ${number} slot`,
      initialState: 'Empty and disabled',
    })),
  )
  assert.deepEqual(
    review.plan.artworkViewportActions.map(({ target, targetOrigin, review }) => ({
      objectId: target.runtimeObjectId,
      targetOrigin,
      fitting: review.fittingLabel,
      sourceState: review.sourceStateLabel,
    })).sort((left, right) => left.objectId.localeCompare(right.objectId)),
    [1, 2, 3].map((number) => ({
      objectId: `tray-artwork-${number}`,
      targetOrigin: 'planned-creation',
      fitting: 'Cover',
      sourceState:
        'Future artwork fitting is deferred until an image is selected',
    })),
  )
  assert.equal(
    review.plan.warnings.filter(({ kind }) =>
      kind === 'artwork-cover-fitting-deferred').length,
    3,
  )
  assert.equal(
    review.plan.materialConsentRequirements.some(({ kind }) =>
      kind === 'material-visible-clipping'),
    false,
  )

  const completed = await owner.applySelected({
    selectedPreset: LATEST_PRESET,
    requestedScope: { kind: 'complete' },
  })
  assert.equal(completed.ok, true, JSON.stringify(completed))
  assert.deepEqual(commandIds, ['case.layoutPreset.apply'])
  const installed = requireCaseSession(root.getLifecycleState())
  const tray = installed.project.caseInsert.templates.tray
  assert.deepEqual(
    tray.artworkSlots.map(({ id }) => id),
    ['tray-artwork-1', 'tray-artwork-2', 'tray-artwork-3'],
  )
  assert.equal(
    tray.additionalArtworkEnabled,
    sourceAdditionalArtworkEnabled,
  )
  const screenshotSlots = tray.artworkSlots
    .filter(({ id }) => /^tray-artwork-[123]$/.test(id))
    .sort((left, right) => left.id.localeCompare(right.id))
  assert.equal(screenshotSlots.length, 3)
  for (const [index, slot] of screenshotSlots.entries()) {
    const number = index + 1
    assert.equal(slot.id, `tray-artwork-${number}`)
    assert.equal(slot.label, `Artwork ${number}`)
    assert.equal(slot.enabled, false)
    assert.equal(slot.imageDataUrl, null)
    assert.equal(slot.imageSource, null)
    assert.equal(slot.imageSize, null)
    assert.equal(slot.defaultSteamLogo, null)
    assert.equal(slot.fit, 'cover')
    assert.deepEqual(slot.layout, {
      x: [17, 50, 83][index],
      y: 78,
      scale: 1,
      rotation: 0,
    })
    assert.deepEqual(slot.reservedArtworkViewport, {
      kind: 'sbls/case-insert-artwork-viewport',
      formatVersion: 1,
      templateId: 'jewelCase',
      templateRevision: null,
      coordinateBasis: 'backPanelSafe',
      widthPercent: 26,
      heightPercent: 16,
      focalPosition: { xPercent: 50, yPercent: 50 },
      zoom: 1,
    })
  }
  const attachment = installed.caseInsertPresetApplication.attachment
  assert.equal(attachment.status, 'attached')
  if (attachment.status !== 'attached') return
  assert.equal(attachment.configuration.preset.revision, 2)
  assert.equal(attachment.configuration.formatVersion, 3)
  const screenshotOwnedFields = attachment.configuration.ownedFields
    .filter(({ address }) => /^tray-artwork-[123]$/.test(address.bindingId))
  for (const number of [1, 2, 3]) {
    const ownedFieldIds = screenshotOwnedFields
      .filter(({ address }) => address.bindingId === `tray-artwork-${number}`)
      .map(({ address }) => address.fieldId)
      .sort()
    assert.deepEqual(ownedFieldIds, [
      'image-fit',
      'layout-scale',
      'layout-x',
      'layout-y',
      'object-presence',
      'reserved-artwork-viewport',
    ])
  }
})

test('production revision-2 Reapply recomputes current Cover clipping and installs once after exact review consent', async () => {
  const project = createBlankJewelCaseSavedProject('Viewport Reapply')
  const root = createApplicationLifecycleCompositionRoot({
    initialState: createNewProjectSession({
      sessionId: 'jewel-case-essentials-v2-reapply',
      project,
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
  const applyReview = requireReview(owner.beginApply({
    selectedPreset: LATEST_PRESET,
    requestedScope: { kind: 'complete' },
  }))
  assert.equal((await owner.complete(
    applyReview,
    confirm(applyReview),
  )).ok, true)
  assert.deepEqual(commandIds, ['case.layoutPreset.apply'])

  const applied = requireCaseSession(root.getLifecycleState())
  const withCurrentArtwork = structuredClone(applied.project)
  const screenshot = withCurrentArtwork.caseInsert.templates.tray.artworkSlots
    .find(({ id }) => id === 'tray-artwork-1')
  assert.ok(screenshot)
  if (!screenshot) throw new Error('Expected the first screenshot slot.')
  screenshot.imageDataUrl = SAMPLE_PNG
  screenshot.imageSource = createEmbeddedProjectImageAssetProvenance(
    'Current square screenshot',
  )
  screenshot.imageSize = { width: 1, height: 1 }
  assert.equal(root.synchronizeCurrentProject({
    sessionId: applied.id,
    kind: 'caseInsert',
    project: withCurrentArtwork,
  }), 'synchronized')
  commandIds.length = 0

  const sourceBeforeReapply = requireCaseSession(root.getLifecycleState())
  const imageBeforeReapply = structuredClone(
    sourceBeforeReapply.project.caseInsert.templates.tray.artworkSlots.find(
      ({ id }) => id === 'tray-artwork-1',
    ),
  )
  const reapplyReview = requireReview(owner.beginReapply({
    selectedPreset: LATEST_PRESET,
    customizedFieldPolicies: [],
  }))
  assert.equal(reapplyReview.operation, 'reapply')
  if (reapplyReview.operation !== 'reapply') return
  assert.equal(reapplyReview.plan.formatVersion, 3)
  assert.deepEqual(reapplyReview.selectedPreset, LATEST_PRESET)
  const clippingWarnings = reapplyReview.plan.warnings.filter(
    ({ kind }) => kind === 'material-visible-clipping',
  )
  const clippingRequirements =
    reapplyReview.plan.materialConsentRequirements.filter(
      ({ kind }) => kind === 'material-visible-clipping',
    )
  assert.equal(clippingWarnings.length, 1)
  assert.equal(clippingRequirements.length, 1)
  assert.deepEqual(
    reapplyReview.warningIds,
    reapplyReview.plan.warnings.map(
      createCaseInsertPresetReapplyWarningIdentity,
    ),
  )
  assert.deepEqual(
    reapplyReview.materialConsentRequirementIds,
    reapplyReview.plan.materialConsentRequirements.map(({ id }) => id),
  )
  assert.equal(
    clippingRequirements[0]?.evidence.warningId,
    clippingWarnings[0]?.id,
  )
  assert.match(
    clippingWarnings[0]!.id,
    /^case:preset-warning:v1:artwork-visible-clipping:/,
  )
  assert.match(
    clippingRequirements[0]!.id,
    /^case:preset-consent:v1:artwork-visible-clipping:/,
  )
  assert.deepEqual(commandIds, [])

  const completed = await owner.complete(
    reapplyReview,
    confirm(reapplyReview),
  )
  assert.equal(completed.ok, true, JSON.stringify(completed))
  assert.deepEqual(commandIds, ['case.layoutPreset.reapply'])
  const installed = requireCaseSession(root.getLifecycleState())
  assert.equal(installed.id, sourceBeforeReapply.id)
  assert.notStrictEqual(installed, sourceBeforeReapply)
  assert.equal(installed.caseInsertPresetApplication.attachment.status, 'attached')
  if (installed.caseInsertPresetApplication.attachment.status === 'attached') {
    assert.equal(
      installed.caseInsertPresetApplication.attachment.configuration.preset
        .revision,
      2,
    )
  }
  assert.deepEqual(
    installed.project.caseInsert.templates.tray.artworkSlots.find(
      ({ id }) => id === 'tray-artwork-1',
    ),
    imageBeforeReapply,
  )
  root.dispose()
})

test('production revision-2 Detach is catalog-independent and preserves every created slot value', async () => {
  const root = createApplicationLifecycleCompositionRoot({
    initialState: createNewProjectSession({
      sessionId: 'jewel-case-essentials-v2-detach',
      project: createBlankJewelCaseSavedProject('Viewport Detach'),
    }),
  })
  const applyOwner = createAppCaseInsertPresetWorkflowOwner({
    lifecycle: root,
    catalog: CASE_INSERT_PRESET_CATALOG,
  })
  const applyReview = requireReview(applyOwner.beginApply({
    selectedPreset: LATEST_PRESET,
    requestedScope: { kind: 'complete' },
  }))
  assert.equal((await applyOwner.complete(
    applyReview,
    confirm(applyReview),
  )).ok, true)

  const applied = requireCaseSession(root.getLifecycleState())
  const customized = structuredClone(applied.project)
  const screenshot = customized.caseInsert.templates.tray.artworkSlots.find(
    ({ id }) => id === 'tray-artwork-2',
  )
  assert.ok(screenshot)
  if (!screenshot) throw new Error('Expected the second screenshot slot.')
  screenshot.label = 'User screenshot label'
  screenshot.enabled = true
  screenshot.imageDataUrl = SAMPLE_PNG
  screenshot.imageSource = createEmbeddedProjectImageAssetProvenance(
    'User screenshot source',
  )
  screenshot.imageSize = { width: 1, height: 1 }
  screenshot.frame = {
    ...screenshot.frame,
    enabled: true,
    color: '#123456',
  }
  screenshot.fit = 'contain'
  screenshot.layout = {
    ...screenshot.layout,
    x: 41,
    y: 67,
    scale: 0.82,
    rotation: 13,
  }
  screenshot.reservedArtworkViewport = structuredClone(CUSTOM_ARTWORK_VIEWPORT)
  assert.equal(root.synchronizeCurrentProject({
    sessionId: applied.id,
    kind: 'caseInsert',
    project: customized,
  }), 'synchronized')

  const emptyCatalog = createCaseInsertPresetCatalog()
  assert.equal(emptyCatalog.ok, true)
  if (!emptyCatalog.ok) return
  const commandIds: string[] = []
  const owner = createAppCaseInsertPresetWorkflowOwner({
    lifecycle: {
      getLifecycleState: () => root.getLifecycleState(),
      dispatch: async <Value = void>(commandId: string, input?: unknown) => {
        commandIds.push(commandId)
        return root.dispatch<Value>(commandId, input)
      },
    },
    catalog: emptyCatalog.catalog,
  })
  const beforeDetach = requireCaseSession(root.getLifecycleState())
  const expectedProject = structuredClone(beforeDetach.project)
  const review = requireReview(owner.beginDetach())
  assert.equal(review.operation, 'detach')
  assert.deepEqual(commandIds, [])

  const completed = await owner.complete(review, confirm(review))
  assert.equal(completed.ok, true, JSON.stringify(completed))
  assert.deepEqual(commandIds, ['case.layoutPreset.detach'])
  const detached = requireCaseSession(root.getLifecycleState())
  assert.equal(detached.caseInsertPresetApplication.attachment.status,
    'unattached')
  assert.deepEqual(detached.project, expectedProject)
  assert.deepEqual(
    detached.project.caseInsert.templates.tray.artworkSlots.map(({ id }) => id),
    ['tray-artwork-1', 'tray-artwork-2', 'tray-artwork-3'],
  )
  assert.deepEqual(
    detached.project.caseInsert.templates.tray.artworkSlots.find(
      ({ id }) => id === 'tray-artwork-2',
    ),
    screenshot,
  )
  root.dispose()
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
