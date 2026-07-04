import assert from 'node:assert/strict'
import test from 'node:test'
import type {
  CaseInsertBrandingSourceCatalog,
} from './brandingSlotSources.ts'
import {
  createDefaultProjectJewelCaseState,
} from './defaults.ts'
import {
  type CaseInsertBrandingMarkTarget,
  setProjectJewelCaseBrandingMarkTargetKindEnabled,
  setProjectJewelCaseBrandingMarkTargetSourcePrefixEnabled,
  syncProjectJewelCaseBrandingMarkSlotsForTarget,
} from './brandingMarkSlots.ts'
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

function getTargetMarkSlots(
  state: ProjectJewelCaseState,
  target: CaseInsertBrandingMarkTarget,
): ProjectCaseInsertImageSlot[] {
  return target.type === 'template'
    ? state.templates[target.paneId].markSlots
    : state.spine[target.side].markSlots
}

test('case insert rating mark targets replace built-in artwork with uploaded custom images', () => {
  const placeholderRatingBadge = createDefaultProjectRatingBadge()
  const enabledPlaceholderRatingBadge = {
    ...placeholderRatingBadge,
    layout: {
      ...placeholderRatingBadge.layout,
      enabled: true,
    },
  }
  const customRatingBadge = setRatingBadgeCustomImage(
    enabledPlaceholderRatingBadge,
    'data:image/png;base64,custom-rating-mark',
    { width: 111, height: 222 },
  )
  const metadata = {
    ...createDefaultProjectMetadata(),
    ratingSystem: 'ESRB' as const,
    ratingValue: 'M',
  }
  const placeholderSources = createBrandingSources({
    projectMetadata: metadata,
    projectRatingBadge: enabledPlaceholderRatingBadge,
  })
  const customSources = createBrandingSources({
    projectMetadata: metadata,
    projectRatingBadge: customRatingBadge,
  })
  const targets: CaseInsertBrandingMarkTarget[] = [
    { type: 'template', paneId: 'cover' },
    { type: 'template', paneId: 'tray' },
    { type: 'spine', side: 'left' },
    { type: 'spine', side: 'right' },
  ]

  targets.forEach((target) => {
    const initialState = setProjectJewelCaseBrandingMarkTargetKindEnabled(
      createDefaultProjectJewelCaseState('Portal 2'),
      target,
      'rating',
      true,
      placeholderSources,
    )
    const initialSlot = getTargetMarkSlots(initialState, target)[0]!
    const syncedState = syncProjectJewelCaseBrandingMarkSlotsForTarget(
      initialState,
      target,
      customSources,
    )
    const customSlot = getTargetMarkSlots(syncedState, target)[0]!

    assert.equal(initialSlot.imageSource?.source, 'placeholder')
    assert.equal(customSlot.id, initialSlot.id)
    assert.equal(customSlot.imageDataUrl, 'data:image/png;base64,custom-rating-mark')
    assert.equal(customSlot.imageSource?.source, 'custom')
    assert.equal(customSlot.imageSource?.sourceId, 'case-rating:ESRB:M')
    assert.deepEqual(customSlot.imageSize, { width: 111, height: 222 })
  })
})

test('case insert media mark targets replace built-in artwork with uploaded custom images', () => {
  const placeholderMediaMark = updateMediaMarkLayoutField(
    createDefaultProjectMediaMark(),
    'enabled',
    true,
  )
  const customMediaMark = setMediaMarkCustomImage(
    placeholderMediaMark,
    'data:image/png;base64,custom-media-mark',
    { width: 333, height: 144 },
  )
  const placeholderSources = createBrandingSources({
    projectMediaMark: placeholderMediaMark,
  })
  const customSources = createBrandingSources({
    projectMediaMark: customMediaMark,
  })
  const targets: CaseInsertBrandingMarkTarget[] = [
    { type: 'template', paneId: 'cover' },
    { type: 'template', paneId: 'tray' },
    { type: 'spine', side: 'left' },
    { type: 'spine', side: 'right' },
  ]

  targets.forEach((target) => {
    const initialState = setProjectJewelCaseBrandingMarkTargetKindEnabled(
      createDefaultProjectJewelCaseState('Portal 2'),
      target,
      'media',
      true,
      placeholderSources,
    )
    const initialSlot = getTargetMarkSlots(initialState, target)[0]!
    const syncedState = syncProjectJewelCaseBrandingMarkSlotsForTarget(
      initialState,
      target,
      customSources,
    )
    const customSlot = getTargetMarkSlots(syncedState, target)[0]!

    assert.equal(initialSlot.imageSource?.source, 'placeholder')
    assert.equal(customSlot.id, initialSlot.id)
    assert.equal(customSlot.imageDataUrl, 'data:image/png;base64,custom-media-mark')
    assert.equal(customSlot.imageSource?.source, 'custom')
    assert.equal(customSlot.imageSource?.sourceId, 'case-media:dataDisc:light')
    assert.deepEqual(customSlot.imageSize, { width: 333, height: 144 })
  })
})

test('case insert platform mark targets replace built-in artwork with uploaded custom images', () => {
  const placeholderPlatformMarks = updatePlatformMarkToggle(
    createDefaultProjectPlatformMarks(),
    'windows',
    true,
  )
  const customPlatformMarks = setPlatformMarkCustomImage(
    placeholderPlatformMarks,
    'windows',
    'data:image/png;base64,custom-platform-mark',
    { width: 222, height: 111 },
  )
  const placeholderSources = createBrandingSources({
    projectPlatformMarks: placeholderPlatformMarks,
  })
  const customSources = createBrandingSources({
    projectPlatformMarks: customPlatformMarks,
  })
  const targets: CaseInsertBrandingMarkTarget[] = [
    { type: 'template', paneId: 'cover' },
    { type: 'template', paneId: 'tray' },
    { type: 'spine', side: 'left' },
    { type: 'spine', side: 'right' },
  ]

  targets.forEach((target) => {
    const initialState = setProjectJewelCaseBrandingMarkTargetSourcePrefixEnabled(
      createDefaultProjectJewelCaseState('Portal 2'),
      target,
      'case-platform:windows:',
      true,
      placeholderSources,
    )
    const initialSlot = getTargetMarkSlots(initialState, target)[0]!
    const syncedState = syncProjectJewelCaseBrandingMarkSlotsForTarget(
      initialState,
      target,
      customSources,
    )
    const customSlot = getTargetMarkSlots(syncedState, target)[0]!

    assert.equal(initialSlot.imageSource?.source, 'placeholder')
    assert.equal(customSlot.id, initialSlot.id)
    assert.equal(customSlot.imageDataUrl, 'data:image/png;base64,custom-platform-mark')
    assert.equal(customSlot.imageSource?.source, 'custom')
    assert.equal(customSlot.imageSource?.sourceId, 'case-platform:windows:windows11')
    assert.deepEqual(customSlot.imageSize, { width: 222, height: 111 })
  })
})
