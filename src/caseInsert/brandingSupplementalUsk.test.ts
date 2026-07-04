import assert from 'node:assert/strict'
import test from 'node:test'
import type {
  CaseInsertBrandingSourceCatalog,
} from './brandingSlotSources.ts'
import {
  isCaseInsertMarkSlotVisible,
} from './brandingVisibility.ts'
import {
  createDefaultCaseInsertImageSlot,
  createDefaultProjectJewelCaseState,
} from './defaults.ts'
import {
  type CaseInsertBrandingMarkTarget,
  setProjectJewelCaseBrandingMarkTargetKindEnabled,
  syncProjectJewelCaseBrandingMarkSlotsForTarget,
} from './brandingMarkSlots.ts'
import { createDefaultProjectLogoAssets } from '../project/projectLogoAssets.ts'
import { createDefaultProjectMediaMark } from '../project/projectMediaMark.ts'
import { createDefaultProjectMetadata } from '../project/projectMetadata.ts'
import { createDefaultProjectPlatformMarks } from '../project/projectPlatformMarks.ts'
import {
  createDefaultProjectRatingBadge,
  updateSupplementalUskRatingBadgeEnabledState,
} from '../project/projectRatingBadge.ts'
import { createDefaultProjectTechnicalMarks } from '../project/projectTechnicalMarks.ts'
import { createProjectImageAssetProvenance } from '../project/projectAssetStatus.ts'
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

function createMarkSlot(sourceId: string): ProjectCaseInsertImageSlot {
  return {
    ...createDefaultCaseInsertImageSlot('mark-1', 'Test mark', {
      enabled: true,
    }),
    imageDataUrl: 'data:image/png;base64,test-mark',
    imageSize: { width: 256, height: 128 },
    imageSource: createProjectImageAssetProvenance({
      source: 'placeholder',
      sourceId,
      sourceLabel: 'Test mark',
    }),
  }
}

function getTargetMarkSlots(
  state: ProjectJewelCaseState,
  target: CaseInsertBrandingMarkTarget,
) {
  return target.type === 'template'
    ? state.templates[target.paneId].markSlots
    : state.spine[target.side].markSlots
}

test('case insert supplemental USK rating badge syncs as a separate rating slot', () => {
  const baseRatingBadge = createDefaultProjectRatingBadge()
  const supplementalRatingBadge =
    updateSupplementalUskRatingBadgeEnabledState(baseRatingBadge, true)
  const brandingSources = createBrandingSources({
    projectMetadata: {
      ...createDefaultProjectMetadata(),
      ratingSystem: 'PEGI',
      ratingValue: '16',
    },
    projectRatingBadge: {
      ...supplementalRatingBadge,
      layout: {
        ...supplementalRatingBadge.layout,
        enabled: true,
      },
      uskBadge: {
        ...supplementalRatingBadge.uskBadge,
        ratingValue: '12',
      },
    },
  })
  const state = setProjectJewelCaseBrandingMarkTargetKindEnabled(
    createDefaultProjectJewelCaseState('Portal 2'),
    { type: 'template', paneId: 'cover' },
    'rating',
    true,
    brandingSources,
  )
  const sourceIds = state.templates.cover.markSlots.map(
    (slot) => slot.imageSource?.sourceId,
  )

  assert.deepEqual(sourceIds, [
    'case-rating:PEGI:16',
    'case-rating:USK:12:supplemental',
  ])
  assert.equal(state.templates.cover.markSlots[0]?.enabled, true)
  assert.equal(state.templates.cover.markSlots[1]?.enabled, true)
  assert.equal(
    isCaseInsertMarkSlotVisible(
      state.templates.cover.markSlots[1]!,
      'rating',
      brandingSources,
    ),
    true,
  )
})

test('case insert supplemental USK visibility follows target slot enablement', () => {
  const baseRatingBadge = createDefaultProjectRatingBadge()
  const supplementalRatingBadge =
    updateSupplementalUskRatingBadgeEnabledState(baseRatingBadge, true)
  const brandingSources = createBrandingSources({
    projectMetadata: {
      ...createDefaultProjectMetadata(),
      ratingSystem: 'PEGI',
      ratingValue: '16',
    },
    projectRatingBadge: {
      ...supplementalRatingBadge,
      layout: {
        ...supplementalRatingBadge.layout,
        enabled: false,
      },
      uskBadge: {
        ...supplementalRatingBadge.uskBadge,
        ratingValue: '12',
      },
    },
  })

  assert.equal(
    isCaseInsertMarkSlotVisible(
      createMarkSlot('case-rating:USK:12:supplemental'),
      'rating',
      brandingSources,
    ),
    true,
  )
})

test('case insert supplemental USK rating badge defaults away from the primary rating badge', () => {
  const baseRatingBadge = createDefaultProjectRatingBadge()
  const supplementalRatingBadge =
    updateSupplementalUskRatingBadgeEnabledState(baseRatingBadge, true)
  const brandingSources = createBrandingSources({
    projectMetadata: {
      ...createDefaultProjectMetadata(),
      ratingSystem: 'PEGI',
      ratingValue: '16',
    },
    projectRatingBadge: {
      ...supplementalRatingBadge,
      layout: {
        ...supplementalRatingBadge.layout,
        enabled: true,
      },
      uskBadge: {
        ...supplementalRatingBadge.uskBadge,
        ratingValue: '12',
      },
    },
  })
  const targets: CaseInsertBrandingMarkTarget[] = [
    { type: 'template', paneId: 'cover' },
    { type: 'template', paneId: 'tray' },
    { type: 'spine', side: 'left' },
    { type: 'spine', side: 'right' },
  ]

  targets.forEach((target) => {
    const state = setProjectJewelCaseBrandingMarkTargetKindEnabled(
      createDefaultProjectJewelCaseState('Portal 2'),
      target,
      'rating',
      true,
      brandingSources,
    )
    const markSlots = getTargetMarkSlots(state, target)
    const primarySlot = markSlots.find((slot) =>
      slot.imageSource?.sourceId === 'case-rating:PEGI:16')
    const supplementalSlot = markSlots.find((slot) =>
      slot.imageSource?.sourceId === 'case-rating:USK:12:supplemental')

    assert.ok(primarySlot)
    assert.ok(supplementalSlot)
    assert.notDeepEqual(supplementalSlot.layout, primarySlot.layout)
    assert.equal(supplementalSlot.layout.scale > primarySlot.layout.scale, true)

    if (target.type === 'spine') {
      assert.equal(supplementalSlot.layout.x, primarySlot.layout.x)
      assert.equal(supplementalSlot.layout.y < primarySlot.layout.y, true)
    } else {
      assert.equal(supplementalSlot.layout.x > primarySlot.layout.x, true)
      assert.equal(supplementalSlot.layout.y, primarySlot.layout.y)
    }
  })
})

test('case insert supplemental USK sync migrates untouched overlapping auto layouts', () => {
  const baseRatingBadge = createDefaultProjectRatingBadge()
  const supplementalRatingBadge =
    updateSupplementalUskRatingBadgeEnabledState(baseRatingBadge, true)
  const brandingSources = createBrandingSources({
    projectMetadata: {
      ...createDefaultProjectMetadata(),
      ratingSystem: 'PEGI',
      ratingValue: '16',
    },
    projectRatingBadge: {
      ...supplementalRatingBadge,
      layout: {
        ...supplementalRatingBadge.layout,
        enabled: true,
      },
      uskBadge: {
        ...supplementalRatingBadge.uskBadge,
        ratingValue: '12',
      },
    },
  })
  const target: CaseInsertBrandingMarkTarget = {
    type: 'template',
    paneId: 'cover',
  }
  const state = setProjectJewelCaseBrandingMarkTargetKindEnabled(
    createDefaultProjectJewelCaseState('Portal 2'),
    target,
    'rating',
    true,
    brandingSources,
  )
  const primarySlot = state.templates.cover.markSlots.find((slot) =>
    slot.imageSource?.sourceId === 'case-rating:PEGI:16')
  const legacyState = {
    ...state,
    templates: {
      ...state.templates,
      cover: {
        ...state.templates.cover,
        markSlots: state.templates.cover.markSlots.map((slot) =>
          slot.imageSource?.sourceId === 'case-rating:USK:12:supplemental' &&
            primarySlot
            ? {
                ...slot,
                layout: { ...primarySlot.layout },
              }
            : slot),
      },
    },
  }
  const migratedState = syncProjectJewelCaseBrandingMarkSlotsForTarget(
    legacyState,
    target,
    brandingSources,
  )
  const migratedPrimarySlot = migratedState.templates.cover.markSlots.find(
    (slot) => slot.imageSource?.sourceId === 'case-rating:PEGI:16',
  )
  const migratedSupplementalSlot =
    migratedState.templates.cover.markSlots.find((slot) =>
      slot.imageSource?.sourceId === 'case-rating:USK:12:supplemental')

  assert.ok(migratedPrimarySlot)
  assert.ok(migratedSupplementalSlot)
  assert.notDeepEqual(
    migratedSupplementalSlot.layout,
    migratedPrimarySlot.layout,
  )
  assert.equal(
    migratedSupplementalSlot.layout.x > migratedPrimarySlot.layout.x,
    true,
  )
})
