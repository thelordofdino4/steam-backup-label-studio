import assert from 'node:assert/strict'
import test from 'node:test'
import type {
  CaseInsertBrandingSourceCatalog,
} from './brandingSlotSources.ts'
import {
  isCaseInsertMarkSlotVisible,
} from './brandingVisibility.ts'
import {
  createDefaultProjectJewelCaseState,
} from './defaults.ts'
import {
  type CaseInsertBrandingMarkTarget,
  setProjectJewelCaseBrandingMarkTargetKindEnabled,
  setProjectJewelCaseBrandingMarkTargetSourcePrefixEnabled,
  syncProjectJewelCaseBrandingMarkSlots,
  syncProjectJewelCaseBrandingMarkSlotsForTarget,
} from './brandingMarkSlots.ts'
import { createProjectImageAssetProvenance } from '../project/projectAssetStatus.ts'
import { createDefaultProjectLogoAssets } from '../project/projectLogoAssets.ts'
import {
  createDefaultProjectMediaMark,
  setMediaMarkCustomImage,
  updateMediaMarkLayoutField,
} from '../project/projectMediaMark.ts'
import { createDefaultProjectMetadata } from '../project/projectMetadata.ts'
import {
  createDefaultProjectPlatformMarks,
  setPlatformMarkCustomImage,
  updatePlatformMarkToggle,
} from '../project/projectPlatformMarks.ts'
import {
  createDefaultProjectRatingBadge,
  setRatingBadgeCustomImage,
} from '../project/projectRatingBadge.ts'
import {
  createDefaultProjectTechnicalMarks,
  updateTechnicalMarkToggle,
} from '../project/projectTechnicalMarks.ts'
import type {
  ProjectCaseInsertImageSlot,
  ProjectJewelCaseState,
} from '../project/projectTypes.ts'

function createBrandingSources(
  overrides: Partial<CaseInsertBrandingSourceCatalog> = {},
): CaseInsertBrandingSourceCatalog {
  return {
    projectMetadata: createDefaultProjectMetadata(),
    projectLogoAssets: createDefaultProjectLogoAssets(),
    projectRatingBadge: createDefaultProjectRatingBadge(),
    projectMediaMark: createDefaultProjectMediaMark(),
    projectPlatformMarks: createDefaultProjectPlatformMarks(),
    projectTechnicalMarks: createDefaultProjectTechnicalMarks(),
    ...overrides,
  }
}

function createEnabledMarkBrandingSources(): CaseInsertBrandingSourceCatalog {
  const defaultRatingBadge = createDefaultProjectRatingBadge()
  const defaultMediaMark = createDefaultProjectMediaMark()

  return createBrandingSources({
    projectMetadata: {
      ...createDefaultProjectMetadata(),
      ratingSystem: 'ESRB',
      ratingValue: 'M',
    },
    projectRatingBadge: {
      ...defaultRatingBadge,
      layout: {
        ...defaultRatingBadge.layout,
        enabled: true,
      },
    },
    projectMediaMark: updateMediaMarkLayoutField(
      defaultMediaMark,
      'enabled',
      true,
    ),
    projectPlatformMarks: updatePlatformMarkToggle(
      createDefaultProjectPlatformMarks(),
      'windows',
      true,
    ),
    projectTechnicalMarks: updateTechnicalMarkToggle(
      createDefaultProjectTechnicalMarks(),
      'audio',
      true,
    ),
  })
}

function getTargetMarkSlots(
  state: ProjectJewelCaseState,
  target: CaseInsertBrandingMarkTarget,
): ProjectCaseInsertImageSlot[] {
  return target.type === 'template'
    ? state.templates[target.paneId].markSlots
    : state.spine[target.side].markSlots
}

test('case insert rating media and platform targets restore built-in artwork after custom images are cleared', () => {
  const enabledRatingBadge = {
    ...createDefaultProjectRatingBadge(),
    layout: {
      ...createDefaultProjectRatingBadge().layout,
      enabled: true,
    },
  }
  const customRatingBadge = setRatingBadgeCustomImage(
    enabledRatingBadge,
    'data:image/png;base64,custom-rating-mark',
    { width: 111, height: 222 },
  )
  const enabledMediaMark = updateMediaMarkLayoutField(
    createDefaultProjectMediaMark(),
    'enabled',
    true,
  )
  const customMediaMark = setMediaMarkCustomImage(
    enabledMediaMark,
    'data:image/png;base64,custom-media-mark',
    { width: 333, height: 144 },
  )
  const enabledPlatformMarks = updatePlatformMarkToggle(
    createDefaultProjectPlatformMarks(),
    'windows',
    true,
  )
  const customPlatformMarks = setPlatformMarkCustomImage(
    enabledPlatformMarks,
    'windows',
    'data:image/png;base64,custom-platform-mark',
    { width: 222, height: 111 },
  )
  const metadata = {
    ...createDefaultProjectMetadata(),
    ratingSystem: 'ESRB' as const,
    ratingValue: 'M',
  }
  const customSources = createBrandingSources({
    projectMetadata: metadata,
    projectRatingBadge: customRatingBadge,
    projectMediaMark: customMediaMark,
    projectPlatformMarks: customPlatformMarks,
  })
  const bundledSources = createBrandingSources({
    projectMetadata: metadata,
    projectRatingBadge: enabledRatingBadge,
    projectMediaMark: enabledMediaMark,
    projectPlatformMarks: enabledPlatformMarks,
  })
  const targets: CaseInsertBrandingMarkTarget[] = [
    { type: 'template', paneId: 'cover' },
    { type: 'template', paneId: 'tray' },
    { type: 'spine', side: 'left' },
    { type: 'spine', side: 'right' },
  ]

  targets.forEach((target) => {
    let state = setProjectJewelCaseBrandingMarkTargetKindEnabled(
      createDefaultProjectJewelCaseState('Portal 2'),
      target,
      'rating',
      true,
      customSources,
    )
    state = setProjectJewelCaseBrandingMarkTargetKindEnabled(
      state,
      target,
      'media',
      true,
      customSources,
    )
    state = setProjectJewelCaseBrandingMarkTargetSourcePrefixEnabled(
      state,
      target,
      'case-platform:windows:',
      true,
      customSources,
    )

    const restoredState = syncProjectJewelCaseBrandingMarkSlotsForTarget(
      state,
      target,
      bundledSources,
    )
    const restoredSlots = getTargetMarkSlots(restoredState, target)
    const restoredRatingSlot = restoredSlots.find((slot) =>
      slot.imageSource?.sourceId === 'case-rating:ESRB:M')
    const restoredMediaSlot = restoredSlots.find((slot) =>
      slot.imageSource?.sourceId === 'case-media:dataDisc:light')
    const restoredPlatformSlot = restoredSlots.find((slot) =>
      slot.imageSource?.sourceId === 'case-platform:windows:windows11')

    assert.equal(restoredRatingSlot?.imageSource?.source, 'placeholder')
    assert.notEqual(
      restoredRatingSlot?.imageDataUrl,
      'data:image/png;base64,custom-rating-mark',
    )
    assert.equal(restoredMediaSlot?.imageSource?.source, 'placeholder')
    assert.notEqual(
      restoredMediaSlot?.imageDataUrl,
      'data:image/png;base64,custom-media-mark',
    )
    assert.equal(restoredPlatformSlot?.imageSource?.source, 'placeholder')
    assert.notEqual(
      restoredPlatformSlot?.imageDataUrl,
      'data:image/png;base64,custom-platform-mark',
    )
  })
})

test('case insert mark sync preserves uploaded slot images while updating shared identity', () => {
  const enabledSources = createEnabledMarkBrandingSources()
  const state = setProjectJewelCaseBrandingMarkTargetKindEnabled(
    createDefaultProjectJewelCaseState('Portal 2'),
    { type: 'template', paneId: 'cover' },
    'rating',
    true,
    enabledSources,
  )
  const uploadedRatingSlot = {
    ...state.templates.cover.markSlots[0]!,
    imageDataUrl: 'data:image/png;base64,custom-rating',
    imageSize: { width: 320, height: 180 },
    imageSource: createProjectImageAssetProvenance({
      source: 'uploaded',
      sourceId: 'case-rating:ESRB:M',
      sourceLabel: 'custom-rating.png',
    }),
  }
  const nextBrandingSources = createBrandingSources({
    ...enabledSources,
    projectMetadata: {
      ...enabledSources.projectMetadata,
      ratingValue: 'T',
    },
  })
  const syncedState = syncProjectJewelCaseBrandingMarkSlots(
    {
      ...state,
      templates: {
        ...state.templates,
        cover: {
          ...state.templates.cover,
          markSlots: [
            uploadedRatingSlot,
            ...state.templates.cover.markSlots.slice(1),
          ],
        },
      },
    },
    nextBrandingSources,
  )
  const syncedRatingSlot = syncedState.templates.cover.markSlots[0]!

  assert.equal(syncedRatingSlot.imageDataUrl, 'data:image/png;base64,custom-rating')
  assert.equal(syncedRatingSlot.imageSize?.width, 320)
  assert.equal(syncedRatingSlot.imageSource?.source, 'uploaded')
  assert.equal(syncedRatingSlot.imageSource?.sourceId, 'case-rating:ESRB:T')
  assert.equal(
    isCaseInsertMarkSlotVisible(
      syncedRatingSlot,
      'rating',
      nextBrandingSources,
    ),
    true,
  )
  assert.equal(syncedState.templates.tray.markSlots.length, 0)
  assert.equal(syncedState.spine.left.markSlots.length, 0)
  assert.equal(syncedState.spine.right.markSlots.length, 0)
})
