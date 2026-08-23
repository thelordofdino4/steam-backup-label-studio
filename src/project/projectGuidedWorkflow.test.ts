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
  applyActiveDiscPresetToDeveloperLogoState,
  applyActiveDiscPresetToMediaMarkState,
  applyActiveDiscPresetToPublisherLogoState,
  applyActiveDiscPresetToRatingBadgeState,
} from '../app/appActiveDiscPresetPointOwners.ts'
import {
  applyRegisteredDiscPresetToState,
  reconstructActiveDiscPresetState,
  type RegisteredDiscPresetApplicationState,
} from '../app/appRegisteredDiscPresetApplication.ts'
import { createDiscPngExportInput } from '../app/appPngExportInputs.ts'
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
import { CLASSIC_TOP_TITLE_DISC_PRESET } from '../presets/builtins/classicTopTitleDiscPreset.ts'
import { DISC_PRESET_PLACEMENT_TARGETS } from '../presets/discPresetDefinition.ts'
import type { DiscPresetRegistry } from '../presets/discPresetRegistry.ts'
import { getMediaMarkCanonicalVisualBounds } from '../render/mediaMarkRenderModel.ts'
import {
  discTemplates,
  getSelectedDiscTemplate,
} from '../templates/discTemplateStateModel.ts'
import { createProjectSnapshot } from './createProjectSnapshot.ts'
import { CURRENT_PROJECT_SCHEMA_VERSION } from './projectSchema.ts'
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
import {
  resolveDiscGuidedRestoreLayoutPolicy,
} from './projectGuidedRestoreLayout.ts'
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
    background?: RegisteredDiscPresetApplicationState['background']
    platformMarks?: ReturnType<typeof createDefaultProjectPlatformMarks>
    projectMetadata?: ReturnType<typeof createDefaultProjectMetadata>
    projectTitleArtwork?: ReturnType<typeof createDefaultProjectTitleArtwork>
    projectRatingBadge?: ReturnType<typeof createDefaultProjectRatingBadge>
    projectMediaMark?: ReturnType<typeof createDefaultProjectMediaMark>
    discTextSettings?: typeof DEFAULT_DISC_TEXT_SETTINGS
    discTextValues?: ReturnType<typeof createDefaultDiscTextValues>
    discTextValueSources?: ReturnType<typeof createDefaultDiscTextValueSources>
    discTextTitleValue?: string
    discTextHtmlSources?: RegisteredDiscPresetApplicationState['discTextHtmlSources']
    discTextLayout?: ReturnType<typeof createDefaultDiscTextLayout>
    discTextStyles?: ReturnType<typeof createDefaultDiscTextStyles>
  }> = {},
) {
  const template = overrides.template ?? discTemplates.standardPrintableDisc

  return createProjectSnapshot({
    discGuidedWorkflow: workflow,
    manualGameTitle: 'Guided persistence fixture',
    selectedSteamGame: null,
    projectMetadata:
      overrides.projectMetadata ?? createDefaultProjectMetadata(),
    projectLogoAssets:
      projectLogoAssets ?? createDefaultProjectLogoAssets(template),
    projectTitleArtwork:
      overrides.projectTitleArtwork ??
      createDefaultProjectTitleArtwork(template, 'top'),
    projectDiscNumberArtwork: createDefaultProjectDiscNumberArtwork(),
    projectAdditionalArtwork: createDefaultProjectAdditionalArtwork(),
    projectRatingBadge:
      overrides.projectRatingBadge ?? createDefaultProjectRatingBadge(template),
    projectMediaMark:
      overrides.projectMediaMark ?? createDefaultProjectMediaMark(template),
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
    backgroundScale: overrides.background?.scale ?? 1,
    backgroundOffset: overrides.background?.offset ?? { x: 0, y: 0 },
    backgroundImageUrl: overrides.background?.imageDataUrl ?? null,
    backgroundImageSource: overrides.background?.imageSource ?? null,
    backgroundImageSize: overrides.background?.imageSize ?? null,
    isBackgroundArtworkEnabled: overrides.background?.enabled ?? true,
    discTextSettings:
      overrides.discTextSettings ?? DEFAULT_DISC_TEXT_SETTINGS,
    discTextValues:
      overrides.discTextValues ?? createDefaultDiscTextValues(),
    discTextValueSources:
      overrides.discTextValueSources ?? createDefaultDiscTextValueSources(),
    discTextTitleValue: overrides.discTextTitleValue ?? '',
    discTextHtmlSources: overrides.discTextHtmlSources ?? {},
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

test('guided restore layout policy covers every resolved Classic target regardless of progress', () => {
  let workflow = omitDiscGuidedSlot(createWorkflow(), PUBLISHER_ID).state
  workflow = completeDiscGuidedSlot(workflow, PUBLISHER_ID).state

  const policy = resolveDiscGuidedRestoreLayoutPolicy({
    workflow,
    selectedDiscTemplate: discTemplates.standardPrintableDisc,
  })

  assert.deepEqual(policy.workflow, workflow)
  assert.deepEqual(policy.preservedTargets, [
    'game-title.artwork',
    'game-title.text',
    'background.primary',
    'rating.primary',
    'media-format.primary',
    'operating-system-marks.enabled',
    'developer-logo.primary',
    'publisher-logo.primary',
    'legal.copyright',
  ])
})

test('guided restore layout policy fails closed per unsupported slot and rejected preset', () => {
  const workflow = createWorkflow()
  const partialDefinition = structuredClone(
    CLASSIC_TOP_TITLE_DISC_PRESET,
  ) as unknown as {
    slots: Array<{
      contentRegion: {
        centerXPercent: number
        centerYPercent: number
        widthPercent: number
        heightPercent: number
      }
    }>
  }
  partialDefinition.slots[2]!.contentRegion = {
    centerXPercent: 50,
    centerYPercent: 50,
    widthPercent: 2,
    heightPercent: 2,
  }
  const partialRegistry = {
    get: () => partialDefinition as unknown as typeof CLASSIC_TOP_TITLE_DISC_PRESET,
    list: () => [],
  } satisfies DiscPresetRegistry
  const partialPolicy = resolveDiscGuidedRestoreLayoutPolicy({
    workflow,
    selectedDiscTemplate: discTemplates.standardPrintableDisc,
    registry: partialRegistry,
  })

  assert.equal(partialPolicy.preservesTarget('rating.primary'), false)
  assert.equal(partialPolicy.preservesTarget('media-format.primary'), true)
  assert.deepEqual(partialPolicy.workflow, workflow)

  const rejectedDefinition = {
    ...CLASSIC_TOP_TITLE_DISC_PRESET,
    compatibility: {
      mode: 'specific-template',
      templateId: 'stickyLabelDisc',
      onConflict: 'reject',
    } as const,
  }
  const rejectedRegistry = {
    get: () => rejectedDefinition,
    list: () => [],
  } satisfies DiscPresetRegistry
  const rejectedPolicy = resolveDiscGuidedRestoreLayoutPolicy({
    workflow,
    selectedDiscTemplate: discTemplates.standardPrintableDisc,
    registry: rejectedRegistry,
  })

  assert.deepEqual(
    rejectedPolicy.workflow,
    INITIAL_DISC_GUIDED_WORKFLOW_STATE,
  )
  assert.deepEqual(rejectedPolicy.preservedTargets, [])
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

test('schema-0.2 restore keeps guided progress isolated from late point-owner refits and export input', async () => {
  const template = discTemplates.standardPrintableDisc
  let workflow = omitDiscGuidedSlot(createWorkflow(), RATING_ID).state
  workflow = completeDiscGuidedSlot(workflow, PUBLISHER_ID).state
  const projectMetadata = {
    ...createDefaultProjectMetadata(),
    ratingSystem: 'PEGI' as const,
    ratingValue: '16',
  }
  const projectRatingBadge = {
    ...createDefaultProjectRatingBadge(template),
    source: 'custom' as const,
    customImageDataUrl: 'data:image/png;base64,initial-rating',
    customImageSize: { width: 300, height: 210 },
    layout: { enabled: true, x: 13, y: 14, scale: 1.7 },
  }
  const projectMediaMark = {
    ...createDefaultProjectMediaMark(template),
    value: 'dvdRom' as const,
    source: 'custom' as const,
    theme: 'dark' as const,
    customImageDataUrl: 'data:image/png;base64,initial-media',
    customImageSize: { width: 120, height: 420 },
    layout: { enabled: true, x: 15, y: 16, scale: 0.6 },
  }
  const projectLogoAssets = {
    ...createDefaultProjectLogoAssets(template),
    developerLogoDataUrl: 'data:image/png;base64,initial-developer',
    developerLogoSource: {
      source: 'uploaded' as const,
      sourceId: 'initial-developer-id',
      sourceLabel: 'initial-developer.png',
    },
    developerLogoSize: { width: 100, height: 500 },
    developerLogoLayout: { enabled: true, x: 88, y: 11, scale: 1.9 },
    publisherLogoDataUrl: 'data:image/png;base64,initial-publisher',
    publisherLogoSource: {
      source: 'official-logo-candidate' as const,
      sourceId: 'initial-publisher-id',
      sourceLabel: 'initial-publisher.png',
    },
    publisherLogoSize: { width: 360, height: 180 },
    publisherLogoLayout: { enabled: true, x: 87, y: 12, scale: 1.8 },
    additionalDeveloperLogos: [{
      id: 'additional-developer',
      label: 'Additional developer',
      imageDataUrl: 'data:image/png;base64,additional-developer',
      imageSize: { width: 200, height: 100 },
      layout: { enabled: true, x: 10, y: 80, scale: 0.7 },
    }],
    additionalPublisherLogos: [{
      id: 'additional-publisher',
      label: 'Additional publisher',
      imageDataUrl: 'data:image/png;base64,additional-publisher',
      imageSize: { width: 200, height: 100 },
      layout: { enabled: true, x: 90, y: 80, scale: 0.7 },
    }],
  }
  const snapshot = createSnapshot(workflow, projectLogoAssets, {
    projectMediaMark,
    projectMetadata,
    projectRatingBadge,
  })

  assert.equal(snapshot.schemaVersion, CURRENT_PROJECT_SCHEMA_VERSION)
  assert.deepEqual(snapshot.editor?.guidedLayout, {
    id: CLASSIC_ID,
    version: 1,
    omittedSlotIds: [RATING_ID],
    completedSlotIds: [PUBLISHER_ID],
  })

  const restored = await restoreProjectStateFromContents(JSON.stringify(snapshot))
  const restoredWorkflow = structuredClone(restored.discGuidedWorkflow)
  const restoredOwners = createRegisteredState(restored)
  const restoredOwnersBeforeRefit = structuredClone(restoredOwners)
  const activePresetState = reconstructActiveDiscPresetState({
    workflow: restored.discGuidedWorkflow,
    currentState: restoredOwners,
    selectedDiscTemplate: template,
  })

  assert.ok(activePresetState)
  assert.deepEqual(restoredOwners, restoredOwnersBeforeRefit)

  const semanticRatingBadge = {
    ...restored.projectRatingBadge,
    customImageDataUrl: 'data:image/png;base64,replacement-rating',
    customImageSize: { width: 210, height: 300 },
  }
  const semanticMediaMark = {
    ...restored.projectMediaMark,
    customImageDataUrl: 'data:image/png;base64,replacement-media',
    customImageSize: { width: 420, height: 120 },
  }
  const semanticLogoAssets = {
    ...restored.projectLogoAssets,
    developerLogoDataUrl: 'data:image/png;base64,replacement-developer',
    developerLogoSource: {
      source: 'uploaded' as const,
      sourceId: 'replacement-developer-id',
      sourceLabel: 'replacement-developer.png',
    },
    developerLogoSize: { width: 500, height: 100 },
    publisherLogoDataUrl: 'data:image/png;base64,replacement-publisher',
    publisherLogoSource: {
      source: 'uploaded' as const,
      sourceId: 'replacement-publisher-id',
      sourceLabel: 'replacement-publisher.png',
    },
    publisherLogoSize: { width: 180, height: 360 },
  }
  const semanticOwnersBeforeRefit = structuredClone({
    ratingBadge: semanticRatingBadge,
    mediaMark: semanticMediaMark,
    logoAssets: semanticLogoAssets,
  })
  const rating = applyActiveDiscPresetToRatingBadgeState({
    presetState: activePresetState,
    selectedDiscTemplate: template,
    ratingBadge: semanticRatingBadge,
    metadata: restored.projectMetadata,
  })
  const media = applyActiveDiscPresetToMediaMarkState({
    presetState: activePresetState,
    selectedDiscTemplate: template,
    mediaMark: semanticMediaMark,
  })
  const developer = applyActiveDiscPresetToDeveloperLogoState({
    presetState: activePresetState,
    selectedDiscTemplate: template,
    logoAssets: semanticLogoAssets,
  })
  const publisher = applyActiveDiscPresetToPublisherLogoState({
    presetState: activePresetState,
    selectedDiscTemplate: template,
    logoAssets: developer.logoAssets,
  })

  const expectedApplications = [
    [rating.application, 'rating.primary'],
    [media.application, 'media-format.primary'],
    [developer.application, 'developer-logo.primary'],
    [publisher.application, 'publisher-logo.primary'],
  ] as const

  for (const [application, target] of expectedApplications) {
    assert.equal(application?.status, 'applied')
    assert.equal(application?.target, target)
    assert.equal(application?.updates.length, 1)
    assert.deepEqual(application?.updates.map((update) => update.target), [target])
  }

  assert.deepEqual(
    {
      x: rating.ratingBadge.layout.x,
      y: rating.ratingBadge.layout.y,
      scale: rating.ratingBadge.layout.scale,
    },
    { x: 79, y: 62, scale: 1.0888888888888888 },
  )
  assert.equal(media.mediaMark.layout.x, 80)
  assert.equal(media.mediaMark.layout.y, 76)
  const mediaBounds = getMediaMarkCanonicalVisualBounds(media.mediaMark)
  assert.ok(mediaBounds)
  const fittedMediaWidth =
    mediaBounds.halfWidth * 2 * media.mediaMark.layout.scale
  const fittedMediaHeight =
    mediaBounds.halfHeight * 2 * media.mediaMark.layout.scale
  assert.ok(fittedMediaWidth <= 22 + 0.000001)
  assert.ok(fittedMediaHeight <= 9 + 0.000001)
  assert.ok(
    Math.abs(fittedMediaWidth - 22) <= 0.000001 ||
      Math.abs(fittedMediaHeight - 9) <= 0.000001,
  )
  assert.deepEqual(
    {
      x: publisher.logoAssets.developerLogoLayout.x,
      y: publisher.logoAssets.developerLogoLayout.y,
      scale: publisher.logoAssets.developerLogoLayout.scale,
    },
    { x: 21, y: 62, scale: 1.4444444444444444 },
  )
  assert.deepEqual(
    {
      x: publisher.logoAssets.publisherLogoLayout.x,
      y: publisher.logoAssets.publisherLogoLayout.y,
      scale: publisher.logoAssets.publisherLogoLayout.scale,
    },
    { x: 21, y: 74, scale: 0.9 },
  )

  assert.deepEqual(
    {
      ...rating.ratingBadge,
      layout: semanticRatingBadge.layout,
    },
    semanticRatingBadge,
  )
  assert.deepEqual(
    {
      ...media.mediaMark,
      layout: semanticMediaMark.layout,
    },
    semanticMediaMark,
  )
  assert.deepEqual(
    {
      ...publisher.logoAssets,
      developerLogoLayout: semanticLogoAssets.developerLogoLayout,
      publisherLogoLayout: semanticLogoAssets.publisherLogoLayout,
    },
    semanticLogoAssets,
  )
  assert.deepEqual(
    {
      ratingBadge: semanticRatingBadge,
      mediaMark: semanticMediaMark,
      logoAssets: semanticLogoAssets,
    },
    semanticOwnersBeforeRefit,
  )
  assert.deepEqual(restoredOwners, restoredOwnersBeforeRefit)
  assert.deepEqual(restored.discGuidedWorkflow, restoredWorkflow)
  assert.deepEqual(restored.discGuidedWorkflow.omittedSlotIds, [RATING_ID])
  assert.deepEqual(restored.discGuidedWorkflow.completedSlotIds, [PUBLISHER_ID])

  const exportModel = createDiscPngExportInput({
    selectedDiscTemplateId: restored.template.selectedDiscTemplateId,
    selectedDiscTemplate: template,
    backgroundImageUrl: restored.backgroundImageUrl,
    backgroundImageSize: restored.backgroundImageSize,
    selectedSteamGame: restored.selectedSteamGame,
    manualGameTitle: restored.manualGameTitle,
    resolvedDiscTextTitle:
      restored.discTextTitleValue || restored.manualGameTitle,
    steamLogoPlacement: restored.steamLogoPlacement,
    steamBannerColors: restored.steamBannerColors,
    steamBannerUseTextFallback: restored.steamBannerUseTextFallback,
    steamBannerFallbackText: restored.steamBannerFallbackText,
    steamBannerLockupImageUrl: restored.steamBannerLockupImageUrl,
    steamBannerLockupImageSize: restored.steamBannerLockupImageSize,
    steamBannerLockupLayout: restored.steamBannerLockupLayout,
    backgroundScale: restored.backgroundScale,
    backgroundOffset: restored.backgroundOffset,
    discTextSettings: restored.discTextSettings,
    discTextValues: restored.discTextValues,
    discTextValueSources: restored.discTextValueSources,
    discTextHtmlSources: restored.discTextHtmlSources,
    discTextStyles: restored.discTextStyles,
    discTextLayout: restored.discTextLayout,
    projectLogoAssets: publisher.logoAssets,
    projectTitleArtwork: restored.projectTitleArtwork,
    projectDiscNumberArtwork: restored.projectDiscNumberArtwork,
    projectAdditionalArtwork: restored.projectAdditionalArtwork,
    projectMetadata: restored.projectMetadata,
    projectRatingBadge: rating.ratingBadge,
    projectMediaMark: media.mediaMark,
    projectPlatformMarks: restored.projectPlatformMarks,
    projectTechnicalMarks: restored.projectTechnicalMarks,
    exportGuides: restored.exportGuides,
  })
  const serializedExportModel = JSON.stringify(exportModel)

  assert.doesNotMatch(
    serializedExportModel,
    /guidedLayout|discGuidedWorkflow|omittedSlotIds|completedSlotIds|disc:guided:/,
  )
  assert.equal(
    exportModel.exportInput.projectRatingBadge,
    rating.ratingBadge,
  )
  assert.equal(exportModel.exportInput.projectMediaMark, media.mediaMark)
  assert.equal(exportModel.exportInput.projectLogoAssets, publisher.logoAssets)
})

test('restore preserves actual Classic-fitted guided placements while clamping adjacent state', async () => {
  const template = discTemplates.standardPrintableDisc
  const initial = await restoreProjectStateFromContents(
    JSON.stringify(createSnapshot()),
  )
  const platformMarks = updatePlatformMarkToggle(
    updatePlatformMarkToggle(
      createDefaultProjectPlatformMarks(),
      'windows',
      true,
    ),
    'linux',
    true,
  )
  const currentState: RegisteredDiscPresetApplicationState = {
    ...createRegisteredState(initial),
    logoAssets: {
      ...initial.projectLogoAssets,
      publisherLogoLayout: {
        ...initial.projectLogoAssets.publisherLogoLayout,
        enabled: true,
      },
      additionalPublisherLogos: [{
        id: 'unsafe-additional-publisher',
        label: 'Additional publisher',
        imageDataUrl: 'data:image/png;base64,additional-publisher',
        imageSize: { width: 200, height: 100 },
        layout: { enabled: true, x: 99, y: 99, scale: 1 },
      }],
    },
    ratingBadge: {
      ...initial.projectRatingBadge,
      uskBadge: {
        ...initial.projectRatingBadge.uskBadge,
        layout: {
          ...initial.projectRatingBadge.uskBadge.layout,
          enabled: true,
          x: 99,
          y: 99,
        },
      },
    },
    mediaMark: {
      ...initial.projectMediaMark,
      value: 'dvdRom',
      source: 'custom',
      customImageDataUrl: 'data:image/png;base64,custom-media',
      customImageSize: { width: 220, height: 120 },
      layout: {
        ...initial.projectMediaMark.layout,
        enabled: true,
      },
    },
    platformMarks,
  }
  const fitted = applyRegisteredDiscPresetToState({
    presetId: CLASSIC_ID,
    currentState,
    selectedDiscTemplate: template,
  })

  assert.ok(fitted)
  assert.equal(fitted.status, 'applied')
  assert.deepEqual(fitted.state.logoAssets.publisherLogoLayout, {
    enabled: true,
    x: 21,
    y: 74,
    scale: 4 / 3,
  })
  assert.deepEqual(fitted.state.mediaMark.layout, {
    enabled: true,
    x: 80,
    y: 76,
    scale: 9 / (13 / (220 / 120)),
  })

  let workflow = omitDiscGuidedSlot(createWorkflow(), PUBLISHER_ID).state
  workflow = completeDiscGuidedSlot(workflow, PUBLISHER_ID).state
  const snapshot = createSnapshot(workflow, fitted.state.logoAssets, {
    platformMarks: fitted.state.platformMarks,
    projectMediaMark: fitted.state.mediaMark,
    projectRatingBadge: fitted.state.ratingBadge,
  })
  const restored = await restoreProjectStateFromContents(
    JSON.stringify(snapshot),
  )

  assert.deepEqual(
    restored.projectLogoAssets.publisherLogoLayout,
    fitted.state.logoAssets.publisherLogoLayout,
  )
  assert.deepEqual(
    restored.projectMediaMark.layout,
    fitted.state.mediaMark.layout,
  )
  for (const value of fitted.state.platformMarks.values) {
    assert.deepEqual(
      restored.projectPlatformMarks.assets[value]?.layout,
      fitted.state.platformMarks.assets[value]?.layout,
    )
  }
  assert.deepEqual(restored.discGuidedWorkflow, workflow)
  assert.equal(
    restored.projectLogoAssets.additionalPublisherLogos[0]?.layout.x < 99,
    true,
  )
  assert.equal(restored.projectRatingBadge.uskBadge.layout.x < 99, true)
})

test('all Classic guided target geometry round trips exactly without changing workflow progress', async () => {
  const template = discTemplates.standardPrintableDisc
  const initial = await restoreProjectStateFromContents(
    JSON.stringify(createSnapshot()),
  )
  const base = createRegisteredState(initial)
  const discTextValues = {
    ...base.discTextValues,
    copyright:
      'Copyright 2026 Exact Geometry Studio. All rights reserved.',
  }
  const discTextValueSources = {
    ...base.discTextValueSources,
    title: 'manual' as const,
    copyright: 'manual' as const,
  }
  const platformMarks = updatePlatformMarkToggle(
    updatePlatformMarkToggle(
      createDefaultProjectPlatformMarks(),
      'windows',
      true,
    ),
    'linux',
    true,
  )
  const currentState: RegisteredDiscPresetApplicationState = {
    ...base,
    background: {
      enabled: true,
      imageDataUrl: 'data:image/png;base64,roundtrip-background',
      imageSource: null,
      imageSize: { width: 1920, height: 1080 },
      scale: 1.73,
      offset: { x: 19, y: -11 },
    },
    titleArtwork: {
      ...base.titleArtwork,
      source: 'custom',
      sourceLabel: 'roundtrip-title.png',
      imageDataUrl: 'data:image/png;base64,roundtrip-title',
      imageSize: {
        width: 1000,
        height: 1000,
        contentBounds: { x: 250, y: 250, width: 500, height: 500 },
      },
      layout: { enabled: true, x: 7, y: 93, scale: 0.41 },
    },
    metadata: {
      ...base.metadata,
      title: 'The Exact Geometry Round Trip',
      ratingSystem: 'ESRB',
      ratingValue: 'M',
    },
    ratingBadge: {
      ...base.ratingBadge,
      source: 'placeholder',
      customImageDataUrl: null,
      customImageSize: null,
      layout: { enabled: true, x: 12, y: 13, scale: 0.52 },
    },
    mediaMark: {
      ...base.mediaMark,
      value: 'dvdRom',
      source: 'custom',
      theme: 'dark',
      customImageDataUrl: 'data:image/png;base64,roundtrip-media',
      customImageSize: {
        width: 1000,
        height: 1000,
        contentBounds: { x: 100, y: 400, width: 800, height: 200 },
      },
      layout: { enabled: true, x: 14, y: 15, scale: 0.63 },
    },
    logoAssets: {
      ...base.logoAssets,
      developerLogoDataUrl: 'data:image/png;base64,roundtrip-developer',
      developerLogoSource: null,
      developerLogoSize: { width: 800, height: 200 },
      developerLogoLayout: { enabled: true, x: 91, y: 9, scale: 0.72 },
      publisherLogoDataUrl: 'data:image/png;base64,roundtrip-publisher',
      publisherLogoSource: null,
      publisherLogoSize: { width: 200, height: 800 },
      publisherLogoLayout: { enabled: true, x: 89, y: 8, scale: 1.61 },
    },
    platformMarks,
    discTextSettings: {
      ...base.discTextSettings,
      title: true,
      copyright: true,
    },
    discTextValues,
    discTextValueSources,
    discTextTitleValue: 'The Exact Geometry Round Trip',
    discTextHtmlSources: {},
    discTextLayout: {
      ...base.discTextLayout,
      title: {
        ...base.discTextLayout.title,
        x: -37,
        y: 44,
        width: 19,
        fontSizePt: 11,
      },
      copyright: {
        ...base.discTextLayout.copyright,
        x: 33,
        y: 41,
        width: 17,
        fontSizePt: 4.5,
      },
    },
  }
  const fitted = applyRegisteredDiscPresetToState({
    presetId: CLASSIC_ID,
    currentState,
    selectedDiscTemplate: template,
    services: {
      textMeasurement: {
        measureText(text, font) {
          const fontSize = Number(
            font.match(/(\d+(?:\.\d+)?)px/)?.[1] ?? 1,
          )
          return Array.from(text).length * fontSize * 0.55
        },
      },
    },
  })

  assert.ok(fitted)
  assert.equal(fitted.status, 'applied')
  assert.deepEqual(
    [...new Set(fitted.updates.map(({ target }) => target))].sort(),
    [...DISC_PRESET_PLACEMENT_TARGETS].sort(),
  )

  let workflow = omitDiscGuidedSlot(createWorkflow(), RATING_ID).state
  workflow = omitDiscGuidedSlot(workflow, PUBLISHER_ID).state
  workflow = completeDiscGuidedSlot(
    workflow,
    'disc:guided:game-title:primary',
  ).state
  workflow = completeDiscGuidedSlot(workflow, PUBLISHER_ID).state
  const workflowBeforeSave = structuredClone(workflow)
  const snapshot = createSnapshot(workflow, fitted.state.logoAssets, {
    background: fitted.state.background,
    platformMarks: fitted.state.platformMarks,
    projectMetadata: fitted.state.metadata,
    projectTitleArtwork: fitted.state.titleArtwork,
    projectRatingBadge: fitted.state.ratingBadge,
    projectMediaMark: fitted.state.mediaMark,
    discTextSettings: fitted.state.discTextSettings,
    discTextValues: fitted.state.discTextValues,
    discTextValueSources: fitted.state.discTextValueSources,
    discTextTitleValue: fitted.state.discTextTitleValue,
    discTextHtmlSources: fitted.state.discTextHtmlSources,
    discTextLayout: fitted.state.discTextLayout,
    discTextStyles: fitted.state.discTextStyles,
  })
  const restored = await restoreProjectStateFromContents(
    JSON.stringify(snapshot),
  )
  const fittedOsLayouts = Object.fromEntries(
    fitted.state.platformMarks.values.map((value) => [
      value,
      fitted.state.platformMarks.assets[value]?.layout,
    ]),
  )
  const restoredOsLayouts = Object.fromEntries(
    restored.projectPlatformMarks.values.map((value) => [
      value,
      restored.projectPlatformMarks.assets[value]?.layout,
    ]),
  )

  assert.deepEqual(
    {
      background: {
        enabled: restored.isBackgroundArtworkEnabled,
        scale: restored.backgroundScale,
        offset: restored.backgroundOffset,
      },
      titleArtwork: restored.projectTitleArtwork.layout,
      rating: restored.projectRatingBadge.layout,
      media: restored.projectMediaMark.layout,
      developer: restored.projectLogoAssets.developerLogoLayout,
      publisher: restored.projectLogoAssets.publisherLogoLayout,
      operatingSystems: restoredOsLayouts,
      titleText: restored.discTextLayout.title,
      legalText: restored.discTextLayout.copyright,
    },
    {
      background: {
        enabled: fitted.state.background.enabled,
        scale: fitted.state.background.scale,
        offset: fitted.state.background.offset,
      },
      titleArtwork: fitted.state.titleArtwork.layout,
      rating: fitted.state.ratingBadge.layout,
      media: fitted.state.mediaMark.layout,
      developer: fitted.state.logoAssets.developerLogoLayout,
      publisher: fitted.state.logoAssets.publisherLogoLayout,
      operatingSystems: fittedOsLayouts,
      titleText: fitted.state.discTextLayout.title,
      legalText: fitted.state.discTextLayout.copyright,
    },
  )
  assert.deepEqual(restored.discGuidedWorkflow, workflowBeforeSave)
  assert.deepEqual(snapshot.editor?.guidedLayout?.omittedSlotIds, [
    RATING_ID,
    PUBLISHER_ID,
  ])
  assert.deepEqual(snapshot.editor?.guidedLayout?.completedSlotIds, [
    'disc:guided:game-title:primary',
    PUBLISHER_ID,
  ])
  assert.deepEqual(
    restored.discGuidedWorkflow.omittedSlotIds,
    workflowBeforeSave.omittedSlotIds,
  )
  assert.deepEqual(
    restored.discGuidedWorkflow.completedSlotIds,
    workflowBeforeSave.completedSlotIds,
  )
})

test('filled omitted owner content survives save/load and resolves after restore', async () => {
  const template = discTemplates.standardPrintableDisc
  const logoAssets = createDefaultProjectLogoAssets(template)
  logoAssets.publisherLogoDataUrl = 'data:image/png;base64,cHVibGlzaGVy'
  logoAssets.publisherLogoSize = { width: 640, height: 240 }
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
  assert.deepEqual(
    restored.projectLogoAssets.publisherLogoSize,
    logoAssets.publisherLogoSize,
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
