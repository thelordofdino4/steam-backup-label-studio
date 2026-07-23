import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import test from 'node:test'

import {
  applyActiveDiscPresetToLegalTextState,
} from '../app/appActiveDiscPresetLegalText.ts'
import {
  applyActiveDiscPresetToPlatformMarkState,
} from '../app/appActiveDiscPresetPlatformMarks.ts'
import {
  reconstructActiveDiscPresetState,
  type RegisteredDiscPresetApplicationState,
} from '../app/appRegisteredDiscPresetApplication.ts'
import {
  DEFAULT_STEAM_BANNER_COLORS,
  DEFAULT_STEAM_BANNER_FALLBACK_TEXT,
  DEFAULT_STEAM_BANNER_LOCKUP_LAYOUT,
} from '../branding/steamBannerDefaults.ts'
import { createDefaultProjectDiscNumberArtwork } from '../discText/discNumberArtwork.ts'
import {
  DEFAULT_DISC_TEXT_SETTINGS,
  createDefaultDiscTextLayout,
  createDefaultDiscTextValues,
} from '../discText/index.ts'
import { createDefaultDiscTextStyles } from '../discText/styles.ts'
import { DEFAULT_EXPORT_GUIDES } from '../export/exportGuides.ts'
import {
  INITIAL_DISC_GUIDED_WORKFLOW_STATE,
  applyDiscGuidedLayout,
  completeDiscGuidedSlot,
  getDiscGuidedCompletedSlotIdSet,
  getDiscGuidedOmittedSlotIdSet,
  omitDiscGuidedSlot,
  resetDiscGuidedProgress,
  restoreAllDiscGuidedSlots,
  restoreCompletedDiscGuidedSlot,
  restoreDiscGuidedSlot,
} from '../guidedPresets/discGuidedWorkflow.ts'
import {
  resolveDiscGuidedSlot,
  type DiscGuidedSlotState,
} from '../guidedPresets/discGuidedSlots.ts'
import {
  discTemplates,
  getSelectedDiscTemplate,
} from '../templates/discTemplateStateModel.ts'
import { createProjectSnapshot } from './createProjectSnapshot.ts'
import { createDefaultDiscTextValueSources } from './metadataDiscText.ts'
import { createDefaultProjectAdditionalArtwork } from './projectAdditionalArtwork.ts'
import { createDefaultProjectLogoAssets } from './projectLogoAssets.ts'
import { createDefaultProjectMediaMark } from './projectMediaMark.ts'
import { createDefaultProjectMetadata } from './projectMetadata.ts'
import {
  createDefaultProjectPlatformMarks,
  updatePlatformMarkToggle,
} from './projectPlatformMarks.ts'
import { createDefaultProjectRatingBadge } from './projectRatingBadge.ts'
import {
  createSavedDiscGuidedLayout,
  restoreSavedDiscGuidedWorkflow,
} from './projectGuidedWorkflow.ts'
import { createDefaultProjectTechnicalMarks } from './projectTechnicalMarks.ts'
import { createDefaultProjectTitleArtwork } from './projectTitleArtwork.ts'
import { restoreProjectStateFromContents } from './restoreProjectState.ts'
import type { ProjectLogoAssets } from './projectTypes.ts'

const CLASSIC_ID = 'disc:guided-layout:classic-top-title'
const RATING_ID = 'disc:guided:rating-badge:primary'
const PUBLISHER_ID = 'disc:guided:publisher-logo:primary'

function createWorkflow() {
  return applyDiscGuidedLayout(INITIAL_DISC_GUIDED_WORKFLOW_STATE, {
    id: CLASSIC_ID,
    version: 1,
  }).state
}

function createSnapshot(
  workflow = INITIAL_DISC_GUIDED_WORKFLOW_STATE,
  projectLogoAssets?: ProjectLogoAssets,
  overrides: Readonly<{
    template?: typeof discTemplates.standardPrintableDisc
    selectedDiscTemplateId?: 'standardPrintableDisc' | 'stickyLabelDisc' | 'lightScribeDisc'
    platformMarks?: ReturnType<typeof createDefaultProjectPlatformMarks>
    discTextSettings?: typeof DEFAULT_DISC_TEXT_SETTINGS
    discTextValues?: ReturnType<typeof createDefaultDiscTextValues>
    discTextValueSources?: ReturnType<typeof createDefaultDiscTextValueSources>
    discTextLayout?: ReturnType<typeof createDefaultDiscTextLayout>
    discTextStyles?: ReturnType<typeof createDefaultDiscTextStyles>
  }> = {},
) {
  const template = overrides.template ?? discTemplates.standardPrintableDisc

  return createProjectSnapshot({
    discGuidedWorkflow: workflow,
    manualGameTitle: 'Guided persistence fixture',
    selectedSteamGame: null,
    projectMetadata: createDefaultProjectMetadata(),
    projectLogoAssets:
      projectLogoAssets ?? createDefaultProjectLogoAssets(template),
    projectTitleArtwork: createDefaultProjectTitleArtwork(template, 'top'),
    projectDiscNumberArtwork: createDefaultProjectDiscNumberArtwork(),
    projectAdditionalArtwork: createDefaultProjectAdditionalArtwork(),
    projectRatingBadge: createDefaultProjectRatingBadge(template),
    projectMediaMark: createDefaultProjectMediaMark(template),
    projectPlatformMarks:
      overrides.platformMarks ?? createDefaultProjectPlatformMarks(),
    projectTechnicalMarks: createDefaultProjectTechnicalMarks(),
    selectedDiscTemplateId:
      overrides.selectedDiscTemplateId ?? 'standardPrintableDisc',
    customDiscTemplate: template,
    steamLogoPlacement: 'top',
    steamBannerColors: DEFAULT_STEAM_BANNER_COLORS,
    steamBannerLockupImageUrl: null,
    steamBannerLockupImageSource: null,
    steamBannerLockupImageSize: null,
    steamBannerLockupLayout: DEFAULT_STEAM_BANNER_LOCKUP_LAYOUT,
    steamBannerUseTextFallback: false,
    steamBannerFallbackText: DEFAULT_STEAM_BANNER_FALLBACK_TEXT,
    exportGuides: DEFAULT_EXPORT_GUIDES,
    backgroundScale: 1,
    backgroundOffset: { x: 0, y: 0 },
    backgroundImageUrl: null,
    backgroundImageSource: null,
    backgroundImageSize: null,
    isBackgroundArtworkEnabled: true,
    discTextSettings:
      overrides.discTextSettings ?? DEFAULT_DISC_TEXT_SETTINGS,
    discTextValues:
      overrides.discTextValues ?? createDefaultDiscTextValues(),
    discTextValueSources:
      overrides.discTextValueSources ?? createDefaultDiscTextValueSources(),
    discTextTitleValue: '',
    discTextHtmlSources: {},
    discTextLayout:
      overrides.discTextLayout ?? createDefaultDiscTextLayout('top', template),
    discTextStyles:
      overrides.discTextStyles ?? createDefaultDiscTextStyles(),
  })
}

function createSlotState(
  restored: Awaited<ReturnType<typeof restoreProjectStateFromContents>>,
): DiscGuidedSlotState {
  return {
    background: {
      enabled: restored.isBackgroundArtworkEnabled,
      imageDataUrl: restored.backgroundImageUrl,
      imageSize: restored.backgroundImageSize,
    },
    titleArtwork: restored.projectTitleArtwork,
    metadata: restored.projectMetadata,
    ratingBadge: restored.projectRatingBadge,
    mediaMark: restored.projectMediaMark,
    platformMarks: restored.projectPlatformMarks,
    logoAssets: restored.projectLogoAssets,
    additionalArtwork: restored.projectAdditionalArtwork,
    discText: {
      settings: restored.discTextSettings,
      values: restored.discTextValues,
      valueSources: restored.discTextValueSources,
      titleValue: restored.discTextTitleValue,
      htmlSources: restored.discTextHtmlSources,
    },
  }
}

function createRegisteredState(
  restored: Awaited<ReturnType<typeof restoreProjectStateFromContents>>,
): RegisteredDiscPresetApplicationState {
  return {
    background: {
      enabled: restored.isBackgroundArtworkEnabled,
      scale: restored.backgroundScale,
      offset: restored.backgroundOffset,
      imageDataUrl: restored.backgroundImageUrl,
      imageSource: restored.backgroundImageSource,
      imageSize: restored.backgroundImageSize,
    },
    titleArtwork: restored.projectTitleArtwork,
    discTextSettings: restored.discTextSettings,
    discTextValues: restored.discTextValues,
    discTextValueSources: restored.discTextValueSources,
    discTextTitleValue: restored.discTextTitleValue,
    discTextHtmlSources: restored.discTextHtmlSources,
    discTextLayout: restored.discTextLayout,
    discTextStyles: restored.discTextStyles,
    logoAssets: restored.projectLogoAssets,
    ratingBadge: restored.projectRatingBadge,
    mediaMark: restored.projectMediaMark,
    platformMarks: restored.projectPlatformMarks,
    metadata: restored.projectMetadata,
  }
}

test('inactive guidance stays compact while active guidance persists canonically', () => {
  const inactive = createSnapshot()
  assert.equal(inactive.editor, undefined)
  assert.equal(
    createSavedDiscGuidedLayout(INITIAL_DISC_GUIDED_WORKFLOW_STATE),
    null,
  )

  let workflow = createWorkflow()
  workflow = omitDiscGuidedSlot(workflow, PUBLISHER_ID).state
  workflow = omitDiscGuidedSlot(workflow, RATING_ID).state
  workflow = completeDiscGuidedSlot(workflow, PUBLISHER_ID).state

  const active = createSnapshot(workflow)
  assert.deepEqual(active.editor?.guidedLayout, {
    id: CLASSIC_ID,
    version: 1,
    omittedSlotIds: [RATING_ID, PUBLISHER_ID],
    completedSlotIds: [PUBLISHER_ID],
  })
})

test('active workflows round trip with independent omission and completion progress', async () => {
  const active = createWorkflow()
  const one = omitDiscGuidedSlot(active, PUBLISHER_ID).state
  const several = omitDiscGuidedSlot(
    omitDiscGuidedSlot(active, PUBLISHER_ID).state,
    RATING_ID,
  ).state
  const completed = completeDiscGuidedSlot(active, PUBLISHER_ID).state
  const overlapped = completeDiscGuidedSlot(several, PUBLISHER_ID).state
  const restoredOne = restoreDiscGuidedSlot(several, RATING_ID).state
  const restoredAll = restoreAllDiscGuidedSlots(several).state
  const restoredCompletion = restoreCompletedDiscGuidedSlot(
    overlapped,
    PUBLISHER_ID,
  ).state
  const reset = resetDiscGuidedProgress(overlapped).state

  for (const workflow of [
    active,
    one,
    several,
    completed,
    overlapped,
    restoredOne,
    restoredAll,
    restoredCompletion,
    reset,
  ]) {
    const snapshot = createSnapshot(workflow)
    const restored = await restoreProjectStateFromContents(JSON.stringify(snapshot))

    assert.deepEqual(restored.discGuidedWorkflow, workflow)
    assert.deepEqual(
      createSavedDiscGuidedLayout(restored.discGuidedWorkflow),
      snapshot.editor?.guidedLayout,
    )
  }
})

test('post-load reconstruction restores nondefault guidance and targeted OS and Legal behavior without owner writes', async () => {
  const template = discTemplates.lightScribeDisc
  let workflow = omitDiscGuidedSlot(createWorkflow(), RATING_ID).state
  workflow = completeDiscGuidedSlot(workflow, PUBLISHER_ID).state
  const platformMarks = updatePlatformMarkToggle(
    createDefaultProjectPlatformMarks(),
    'windows',
    true,
  )
  const discTextSettings = {
    ...DEFAULT_DISC_TEXT_SETTINGS,
    copyright: true,
  }
  const discTextValues = createDefaultDiscTextValues()
  discTextValues.copyright = 'Copyright 2026 Restored Studio.'
  const discTextValueSources = createDefaultDiscTextValueSources()
  discTextValueSources.copyright = 'manual'
  const snapshot = createSnapshot(workflow, undefined, {
    template,
    selectedDiscTemplateId: 'lightScribeDisc',
    platformMarks,
    discTextSettings,
    discTextValues,
    discTextValueSources,
    discTextLayout: createDefaultDiscTextLayout('top', template),
    discTextStyles: createDefaultDiscTextStyles(),
  })
  const restored = await restoreProjectStateFromContents(JSON.stringify(snapshot))

  assert.deepEqual(restored.discGuidedWorkflow, workflow)
  assert.equal(restored.template.selectedDiscTemplateId, 'lightScribeDisc')
  assert.equal(
    Object.hasOwn(snapshot.editor?.guidedLayout ?? {}, 'resolvedDefinition'),
    false,
  )

  const selectedTemplate = getSelectedDiscTemplate(restored.template)
  const ownerState = createRegisteredState(restored)
  const ownerBeforeReconstruction = structuredClone(ownerState)
  const activePresetState = reconstructActiveDiscPresetState({
    workflow: restored.discGuidedWorkflow,
    currentState: ownerState,
    selectedDiscTemplate: selectedTemplate,
  })

  assert.ok(activePresetState)
  assert.deepEqual(activePresetState.ref, {
    id: 'builtin:disc-preset:classic-top-title',
    revision: 1,
  })
  assert.equal(
    activePresetState.resolvedDefinition.templateId,
    template.id,
  )
  const resolvedLegalSlot = activePresetState.resolvedDefinition.slots.find(
    ({ id }) => id === 'disc:guided:legal-text:copyright',
  )
  assert.ok(resolvedLegalSlot)
  assert.notEqual(resolvedLegalSlot.status, 'unsupported')
  assert.deepEqual(ownerState, ownerBeforeReconstruction)

  const slotState = createSlotState(restored)
  const omittedSlotIds = getDiscGuidedOmittedSlotIdSet(
    restored.discGuidedWorkflow,
  )
  const completedSlotIds = getDiscGuidedCompletedSlotIdSet(
    restored.discGuidedWorkflow,
  )
  assert.equal(
    resolveDiscGuidedSlot({
      slotId: RATING_ID,
      state: slotState,
      suggestions: [],
      omittedSlotIds,
      completedSlotIds,
    }).presentation,
    'omitted',
  )
  assert.equal(
    resolveDiscGuidedSlot({
      slotId: PUBLISHER_ID,
      state: slotState,
      suggestions: [],
      omittedSlotIds,
      completedSlotIds,
    }).presentation,
    'completed',
  )

  const latePlatformMarks = updatePlatformMarkToggle(
    restored.projectPlatformMarks,
    'linux',
    true,
  )
  const osResult = applyActiveDiscPresetToPlatformMarkState({
    presetState: activePresetState,
    selectedDiscTemplate: selectedTemplate,
    platformMarks: latePlatformMarks,
  })
  assert.equal(osResult.application?.status, 'applied')
  assert.ok(osResult.application?.updates.length)
  assert.deepEqual(
    osResult.application?.updates.map(({ target }) => target),
    osResult.application?.updates.map(() => 'operating-system-marks.enabled'),
  )

  const legalContent = Object.freeze({
    plainText: 'Copyright 2026 Restored Studio. All rights reserved.',
  })
  const legalStyle = Object.freeze({
    ...restored.discTextStyles.copyright,
    fontFamily: 'georgia' as const,
    bold: true,
  })
  const legalResult = applyActiveDiscPresetToLegalTextState({
    presetState: activePresetState,
    selectedDiscTemplate: selectedTemplate,
    legalText: Object.freeze({
      key: 'copyright' as const,
      enabled: true,
      content: legalContent,
      layout: Object.freeze({
        ...restored.discTextLayout.copyright,
        x: 27,
        y: 48,
      }),
      style: legalStyle,
      template: selectedTemplate,
    }),
  })
  assert.equal(legalResult.application?.status, 'applied')
  assert.deepEqual(
    legalResult.application?.updates.map(({ target }) => target),
    ['legal.copyright'],
  )
  assert.equal(legalResult.legalText.content, legalContent)
  assert.equal(legalResult.legalText.style, legalStyle)
  assert.notEqual(legalResult.legalText.layout.y, 48)
})

test('filled omitted owner content survives save/load and resolves after restore', async () => {
  const template = discTemplates.standardPrintableDisc
  const logoAssets = createDefaultProjectLogoAssets(template)
  logoAssets.publisherLogoDataUrl = 'data:image/png;base64,cHVibGlzaGVy'
  logoAssets.publisherLogoImageSize = { width: 640, height: 240 }
  logoAssets.publisherLogoLayout = {
    ...logoAssets.publisherLogoLayout,
    enabled: true,
  }
  const omittedWorkflow = omitDiscGuidedSlot(
    createWorkflow(),
    PUBLISHER_ID,
  ).state
  const restored = await restoreProjectStateFromContents(
    JSON.stringify(createSnapshot(omittedWorkflow, logoAssets)),
  )
  const slotState = createSlotState(restored)

  assert.equal(restored.projectLogoAssets.publisherLogoLayout.enabled, true)
  assert.equal(
    restored.projectLogoAssets.publisherLogoDataUrl,
    logoAssets.publisherLogoDataUrl,
  )
  assert.equal(
    resolveDiscGuidedSlot({
      slotId: PUBLISHER_ID,
      state: slotState,
      suggestions: [],
      omittedSlotIds: getDiscGuidedOmittedSlotIdSet(
        restored.discGuidedWorkflow,
      ),
    }).lifecycle,
    'omitted',
  )

  const visibleWorkflow = restoreDiscGuidedSlot(
    restored.discGuidedWorkflow,
    PUBLISHER_ID,
  ).state
  assert.equal(
    resolveDiscGuidedSlot({
      slotId: PUBLISHER_ID,
      state: slotState,
      suggestions: [],
      omittedSlotIds: getDiscGuidedOmittedSlotIdSet(visibleWorkflow),
    }).lifecycle,
    'filled',
  )
})

test('completed workflow round trips without duplicating or mutating owner state', async () => {
  const template = discTemplates.standardPrintableDisc
  const logoAssets = createDefaultProjectLogoAssets(template)
  logoAssets.publisherLogoDataUrl = 'data:image/png;base64,cHVibGlzaGVy'
  logoAssets.publisherLogoSize = { width: 640, height: 240 }
  logoAssets.publisherLogoLayout = {
    ...logoAssets.publisherLogoLayout,
    enabled: true,
  }
  const ownerBefore = structuredClone(logoAssets)
  const completedWorkflow = completeDiscGuidedSlot(
    createWorkflow(),
    PUBLISHER_ID,
  ).state
  const snapshot = createSnapshot(completedWorkflow, logoAssets)
  const restored = await restoreProjectStateFromContents(JSON.stringify(snapshot))

  assert.deepEqual(restored.discGuidedWorkflow.completedSlotIds, [PUBLISHER_ID])
  assert.deepEqual(snapshot.logoAssets, ownerBefore)
  assert.equal(
    restored.projectLogoAssets.publisherLogoDataUrl,
    ownerBefore.publisherLogoDataUrl,
  )
  assert.deepEqual(
    restored.projectLogoAssets.publisherLogoSize,
    ownerBefore.publisherLogoSize,
  )
  assert.deepEqual(
    restored.projectLogoAssets.publisherLogoLayout,
    ownerBefore.publisherLogoLayout,
  )
  assert.deepEqual(logoAssets, ownerBefore)
  assert.equal(
    Object.hasOwn(snapshot.editor?.guidedLayout ?? {}, 'resolvedDefinition'),
    false,
  )
})

test('malformed, unknown, and future guided metadata deactivates safely', async () => {
  const malformedValues = [
    undefined,
    'invalid-editor',
    { guidedLayout: null },
    { guidedLayout: { id: 'unknown', version: 1, omittedSlotIds: [] } },
    { guidedLayout: { id: CLASSIC_ID, version: 99, omittedSlotIds: [] } },
  ]

  for (const editor of malformedValues) {
    assert.deepEqual(
      restoreSavedDiscGuidedWorkflow(editor),
      INITIAL_DISC_GUIDED_WORKFLOW_STATE,
    )
  }

  const project = createSnapshot()
  const restored = await restoreProjectStateFromContents(JSON.stringify({
    ...project,
    editor: 'malformed-editor',
  }))
  assert.deepEqual(
    restored.discGuidedWorkflow,
    INITIAL_DISC_GUIDED_WORKFLOW_STATE,
  )
  assert.equal(restored.manualGameTitle, project.game.manualTitle)
})

test('saved omission IDs are filtered, deduplicated, and canonically ordered', () => {
  const restored = restoreSavedDiscGuidedWorkflow({
    guidedLayout: {
      id: CLASSIC_ID,
      version: 1,
      omittedSlotIds: [
        PUBLISHER_ID,
        'disc:guided:additional-text:custom-note',
        RATING_ID,
        PUBLISHER_ID,
        'disc:guided:unknown',
      ],
      completedSlotIds: [],
    },
  })

  assert.deepEqual(restored.omittedSlotIds, [RATING_ID, PUBLISHER_ID])
})

test('saved completion is optional, tolerant, canonical, and independent', () => {
  const missing = restoreSavedDiscGuidedWorkflow({
    guidedLayout: {
      id: CLASSIC_ID,
      version: 1,
      omittedSlotIds: [PUBLISHER_ID],
    },
  })
  assert.deepEqual(missing.completedSlotIds, [])
  assert.deepEqual(missing.omittedSlotIds, [PUBLISHER_ID])

  for (const completedSlotIds of [null, 'invalid', {}, 42]) {
    const malformed = restoreSavedDiscGuidedWorkflow({
      guidedLayout: {
        id: CLASSIC_ID,
        version: 1,
        omittedSlotIds: [],
        completedSlotIds,
      },
    })
    assert.deepEqual(malformed.completedSlotIds, [])
  }

  const normalized = restoreSavedDiscGuidedWorkflow({
    guidedLayout: {
      id: CLASSIC_ID,
      version: 1,
      omittedSlotIds: [PUBLISHER_ID],
      completedSlotIds: [
        PUBLISHER_ID,
        RATING_ID,
        PUBLISHER_ID,
        'disc:guided:unknown',
        42,
      ],
    },
  })

  assert.deepEqual(normalized.omittedSlotIds, [PUBLISHER_ID])
  assert.deepEqual(normalized.completedSlotIds, [RATING_ID, PUBLISHER_ID])
  assert.deepEqual([...getDiscGuidedCompletedSlotIdSet(normalized)], [
    RATING_ID,
    PUBLISHER_ID,
  ])
})

function listTypeScriptFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = `${directory}/${entry.name}`

    if (entry.isDirectory()) return listTypeScriptFiles(path)
    return /\.tsx?$/.test(entry.name) ? [path] : []
  })
}

test('guided workflow persistence stays isolated from renderers and export inputs', () => {
  const guardedFiles = [
    'src/app/appPngExportInputs.ts',
    ...listTypeScriptFiles('src/export'),
    ...listTypeScriptFiles('src/render'),
  ]

  for (const file of guardedFiles) {
    const source = readFileSync(file, 'utf8')
    assert.doesNotMatch(
      source,
      /guidedLayout|discGuidedWorkflow|omittedSlotIds|completedSlotIds/,
    )
  }

  for (const file of listTypeScriptFiles('src/components/preview')) {
    if (/\.test\.[cm]?tsx?$/.test(file) || file.includes('/testing/')) continue
    const source = readFileSync(file, 'utf8')
    assert.doesNotMatch(
      source,
      /projectGuidedWorkflow|projectSchema|createProjectSnapshot|restoreProject/,
    )
  }
})

test('App keeps guided persistence wiring to state pass-through and reset', () => {
  const source = readFileSync('src/app/App.tsx', 'utf8')

  assert.match(source, /discGuidedWorkflow,/)
  assert.match(source, /restoreDiscGuidedWorkflow: setDiscGuidedWorkflow/)
  assert.match(
    source,
    /setDiscGuidedWorkflow\(INITIAL_DISC_GUIDED_WORKFLOW_STATE\)/,
  )
  assert.doesNotMatch(
    source,
    /omitDiscGuidedSlot|restoreDiscGuidedSlot|normalizeDiscGuidedWorkflowState/,
  )
})
