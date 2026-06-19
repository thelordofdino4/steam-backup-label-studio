import assert from 'node:assert/strict'
import test from 'node:test'
import { shouldRenderCaseInsertTitleArtwork } from '../caseInsert/titleArtwork.ts'
import { buildCaseInsertExportPreflightSummary } from '../export/caseInsertExportPreflight.ts'
import { createDefaultProjectLogoAssets } from '../project/projectLogoAssets.ts'
import { createDefaultProjectMediaMark } from '../project/projectMediaMark.ts'
import { createDefaultProjectMetadata } from '../project/projectMetadata.ts'
import { createDefaultProjectPlatformMarks } from '../project/projectPlatformMarks.ts'
import { createDefaultProjectRatingBadge } from '../project/projectRatingBadge.ts'
import {
  createCaseInsertProjectSnapshot,
  createDefaultProjectJewelCaseState,
  restoreCaseInsertProjectState,
  setCaseInsertImageSlotEnabled,
  setCaseInsertImageSlotImage,
} from '../project/projectCaseInsert.ts'
import { createDefaultProjectTechnicalMarks } from '../project/projectTechnicalMarks.ts'
import {
  createDefaultProjectTitleArtwork,
  createTitleArtworkRenderItem,
  normalizeProjectTitleArtwork,
  setCustomTitleArtworkImage,
  updateTitleArtworkLayoutField,
} from '../project/projectTitleArtwork.ts'
import { discTemplates } from '../templates/discTemplates.ts'
import type { CaseInsertBrandingSourceCatalog } from '../caseInsert/brandingSlotSources.ts'
import type {
  ProjectCaseInsertImageSlot,
  ProjectJewelCaseState,
} from '../project/projectTypes.ts'
import {
  isOptionalLayoutFeatureEnabled,
  setOptionalLayoutFeatureEnabled,
  setOptionalVisualFeatureEnabled,
  shouldRenderOptionalLayoutFeature,
  shouldRenderOptionalVisualFeature,
} from './optionalVisualFeature.ts'

function createBrandingSources(): CaseInsertBrandingSourceCatalog {
  return {
    projectMetadata: createDefaultProjectMetadata(),
    projectLogoAssets: createDefaultProjectLogoAssets(),
    projectRatingBadge: createDefaultProjectRatingBadge(),
    projectMediaMark: createDefaultProjectMediaMark(),
    projectPlatformMarks: createDefaultProjectPlatformMarks(),
    projectTechnicalMarks: createDefaultProjectTechnicalMarks(),
  }
}

function createCaseInsertWithCoverTitleArtwork(
  slot: ProjectCaseInsertImageSlot,
): ProjectJewelCaseState {
  const state = createDefaultProjectJewelCaseState('Portal 2')
  const cover = state.templates.cover

  return {
    ...state,
    templates: {
      ...state.templates,
      cover: {
        ...cover,
        steamBanner: {
          ...cover.steamBanner,
          enabled: false,
        },
        background: {
          ...cover.background,
          enabled: false,
        },
        titleArtwork: slot,
        textBlocks: cover.textBlocks.map((textBlock) => ({
          ...textBlock,
          enabled: false,
        })),
        textLists: cover.textLists.map((textList) => ({
          ...textList,
          enabled: false,
        })),
      },
    },
  }
}

function getVisibleElementStatus(summaryMessage: string) {
  return summaryMessage.match(/^Visible elements: (.+)$/m)?.[1] ?? ''
}

test('optional visual feature helpers preserve payload while disabling and re-enabling', () => {
  const feature = {
    enabled: true,
    source: 'custom',
    imageDataUrl: 'data:image/png;base64,visual',
    layout: {
      scale: 1.4,
      x: 32,
      y: 44,
    },
  }

  const disabled = setOptionalVisualFeatureEnabled(feature, false)
  const reenabled = setOptionalVisualFeatureEnabled(disabled, true)

  assert.equal(disabled.enabled, false)
  assert.equal(disabled.source, 'custom')
  assert.equal(disabled.imageDataUrl, feature.imageDataUrl)
  assert.deepEqual(disabled.layout, feature.layout)
  assert.equal(shouldRenderOptionalVisualFeature(disabled), false)
  assert.equal(shouldRenderOptionalVisualFeature(reenabled), true)
  assert.deepEqual(reenabled.layout, feature.layout)
})

test('optional layout feature helpers preserve layout state while hiding render output', () => {
  const feature = {
    source: 'custom',
    imageDataUrl: 'data:image/png;base64,layout',
    layout: {
      enabled: true,
      scale: 1.7,
      x: 12,
      y: 88,
    },
  }

  const disabled = setOptionalLayoutFeatureEnabled(feature, false)
  const reenabled = setOptionalLayoutFeatureEnabled(disabled, true)

  assert.equal(isOptionalLayoutFeatureEnabled(disabled), false)
  assert.equal(disabled.imageDataUrl, feature.imageDataUrl)
  assert.equal(disabled.layout.scale, 1.7)
  assert.equal(shouldRenderOptionalLayoutFeature(disabled), false)
  assert.equal(shouldRenderOptionalLayoutFeature(reenabled), true)
  assert.deepEqual(reenabled.layout, feature.layout)
})

test('disc title artwork omits disabled render items and restores saved image state', () => {
  const template = discTemplates.standardPrintableDisc
  const image = {
    imageDataUrl: 'data:image/png;base64,disc-title',
    imageSize: { width: 900, height: 360 },
  }
  const enabledTitleArtwork = setCustomTitleArtworkImage(
    createDefaultProjectTitleArtwork(template, 'top'),
    image,
    template,
    'top',
  )
  const configuredTitleArtwork = {
    ...enabledTitleArtwork,
    layout: {
      ...enabledTitleArtwork.layout,
      scale: 1.42,
      x: 58,
      y: 34,
    },
  }
  const disabledTitleArtwork = updateTitleArtworkLayoutField(
    configuredTitleArtwork,
    'enabled',
    false,
  )
  const restored = normalizeProjectTitleArtwork(
    disabledTitleArtwork,
    template,
    'top',
  )
  const reenabled = updateTitleArtworkLayoutField(restored, 'enabled', true)

  assert.equal(createTitleArtworkRenderItem(disabledTitleArtwork), null)
  assert.equal(restored.layout.enabled, false)
  assert.equal(restored.layout.scale, 1.42)
  assert.equal(restored.layout.x, 58)
  assert.equal(restored.layout.y, 34)
  assert.equal(restored.imageDataUrl, image.imageDataUrl)
  assert.deepEqual(restored.imageSize, image.imageSize)
  assert.deepEqual(reenabled.layout, configuredTitleArtwork.layout)
  assert.notEqual(createTitleArtworkRenderItem(reenabled), null)
})

test('case insert image slots omit disabled export content and restore saved image state', () => {
  const image = {
    imageDataUrl: 'data:image/png;base64,case-title',
    imageSize: { width: 900, height: 360 },
  }
  const baseTitleArtwork =
    createDefaultProjectJewelCaseState('Portal 2').templates.cover.titleArtwork
  const enabledTitleArtwork = setCaseInsertImageSlotImage(
    baseTitleArtwork,
    image,
  )
  const disabledTitleArtwork = setCaseInsertImageSlotEnabled(
    enabledTitleArtwork,
    false,
  )
  const disabledCaseInsert =
    createCaseInsertWithCoverTitleArtwork(disabledTitleArtwork)
  const disabledSummary = buildCaseInsertExportPreflightSummary({
    caseInsert: disabledCaseInsert,
    activeTemplatePane: 'cover',
    brandingSources: createBrandingSources(),
  })
  const saved = createCaseInsertProjectSnapshot({
    manualGameTitle: 'Portal 2',
    caseInsert: disabledCaseInsert,
  })
  const restoredCaseInsert = restoreCaseInsertProjectState(saved).caseInsert
  const restoredSlot = restoredCaseInsert.templates.cover.titleArtwork
  const reenabledCaseInsert = createCaseInsertWithCoverTitleArtwork(
    setCaseInsertImageSlotEnabled(restoredSlot, true),
  )
  const reenabledSummary = buildCaseInsertExportPreflightSummary({
    caseInsert: reenabledCaseInsert,
    activeTemplatePane: 'cover',
    brandingSources: createBrandingSources(),
  })

  assert.equal(shouldRenderCaseInsertTitleArtwork(restoredSlot), false)
  assert.equal(getVisibleElementStatus(disabledSummary.message), 'None')
  assert.equal(restoredSlot.enabled, false)
  assert.equal(restoredSlot.imageDataUrl, image.imageDataUrl)
  assert.deepEqual(restoredSlot.imageSize, image.imageSize)
  assert.equal(
    shouldRenderCaseInsertTitleArtwork(
      reenabledCaseInsert.templates.cover.titleArtwork,
    ),
    true,
  )
  assert.equal(getVisibleElementStatus(reenabledSummary.message), '1')
})
