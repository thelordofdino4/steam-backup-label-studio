import assert from 'node:assert/strict'
import test from 'node:test'
import {
  type CaseInsertBrandingSourceCatalog,
} from './brandingSlotSources.ts'
import {
  isCaseInsertMarkKindEnabled,
  isCaseInsertMarkSlotVisible,
} from './brandingVisibility.ts'
import {
  createDefaultCaseInsertImageSlot,
  createDefaultProjectJewelCaseState,
} from './defaults.ts'
import {
  CASE_INSERT_COVER_RATING_MARK_LAYOUT,
} from './defaultBrandingLayouts.ts'
import {
  setProjectJewelCaseBrandingMarkTargetKindEnabled,
} from './brandingMarkSlots.ts'
import {
  setJewelCaseSpineMirrored,
} from './jewelCaseTransitions.ts'
import {
  getEnabledCaseInsertMarkSlotForKind,
  getEnabledCaseInsertMarkSlotForSourcePrefix,
} from './brandingMarkPlacement.ts'
import {
  getCaseInsertSpineMarkPlacementFields,
  getCaseInsertTemplateMarkPlacementFields,
} from './brandingMarkPlacementFields.ts'
import { createDefaultProjectLogoAssets } from '../project/projectLogoAssets.ts'
import {
  createDefaultProjectMediaMark,
  updateMediaMarkLayoutField,
  updateMediaMarkValue,
} from '../project/projectMediaMark.ts'
import { createDefaultProjectMetadata } from '../project/projectMetadata.ts'
import {
  createDefaultProjectPlatformMarks,
} from '../project/projectPlatformMarks.ts'
import {
  createDefaultProjectRatingBadge,
} from '../project/projectRatingBadge.ts'
import {
  createDefaultProjectTechnicalMarks,
} from '../project/projectTechnicalMarks.ts'
import { createProjectImageAssetProvenance } from '../project/projectAssetStatus.ts'
import type {
  ProjectCaseInsertImageSlot,
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

test('case insert mark placement lookup finds enabled concrete mark slots only', () => {
  const sourceLessSlot = {
    ...createDefaultCaseInsertImageSlot('source-less', 'Source-less mark', {
      enabled: true,
    }),
    imageDataUrl: 'data:image/png;base64,source-less',
  }
  const disabledRatingSlot = {
    ...createMarkSlot('case-rating:ESRB:M'),
    enabled: false,
  }
  const ratingSlot = createMarkSlot('case-rating:ESRB:T')
  const platformSlot = createMarkSlot('case-platform:windows:windows11')

  const slots = [
    sourceLessSlot,
    disabledRatingSlot,
    platformSlot,
    ratingSlot,
  ]

  assert.equal(
    getEnabledCaseInsertMarkSlotForKind(slots, 'rating')?.imageSource
      ?.sourceId,
    'case-rating:ESRB:T',
  )
  assert.equal(
    getEnabledCaseInsertMarkSlotForSourcePrefix(
      slots,
      'platform',
      'case-platform:windows:',
    )?.imageSource?.sourceId,
    'case-platform:windows:windows11',
  )
  assert.equal(
    getEnabledCaseInsertMarkSlotForSourcePrefix(
      slots,
      'platform',
      'case-platform:linux:',
    ),
    null,
  )
})

test('case insert mark placement fields keep template and spine labels distinct', () => {
  const slot = createMarkSlot('case-platform:windows:windows11')

  ;(['cover', 'tray'] as const).forEach((paneId) => {
    const fields = getCaseInsertTemplateMarkPlacementFields(paneId, slot)

    assert.deepEqual(
      fields.map((field) => field.label),
      ['Scale', 'X position', 'Y position'],
    )
    assert.equal(
      fields.some((field) => field.field === 'rotation'),
      false,
    )
  })

  const spineFields = getCaseInsertSpineMarkPlacementFields('left', slot)

  assert.deepEqual(
    spineFields.map((field) => field.label),
    ['Scale', 'Cross position', 'Length position', 'Rotation'],
  )
})

test('case insert rating mark visibility follows shared rating badge setup', () => {
  const ratingSlot = createMarkSlot('case-rating:ESRB:E')
  const enabledRatingBadge = createDefaultProjectRatingBadge()
  const enabledSources = createBrandingSources({
    projectMetadata: {
      ...createDefaultProjectMetadata(),
      ratingSystem: 'ESRB',
      ratingValue: 'E',
    },
    projectRatingBadge: {
      ...enabledRatingBadge,
      layout: {
        ...enabledRatingBadge.layout,
        enabled: true,
      },
    },
  })

  assert.equal(
    isCaseInsertMarkKindEnabled('rating', createBrandingSources()),
    false,
  )
  assert.equal(
    isCaseInsertMarkSlotVisible(ratingSlot, 'rating', enabledSources),
    true,
  )
  assert.equal(
    isCaseInsertMarkSlotVisible(
      ratingSlot,
      'rating',
      createBrandingSources({
        ...enabledSources,
        projectMetadata: {
          ...enabledSources.projectMetadata,
          ratingValue: 'M',
        },
      }),
    ),
    false,
  )
})

test('case insert media mark visibility follows the selected enabled media mark', () => {
  const mediaSlot = createMarkSlot('case-media:dvd:light')
  const enabledDvdSources = createBrandingSources({
    projectMediaMark: updateMediaMarkValue(
      updateMediaMarkLayoutField(
        createDefaultProjectMediaMark(),
        'enabled',
        true,
      ),
      'dvd',
    ),
  })

  assert.equal(isCaseInsertMarkSlotVisible(
    mediaSlot,
    'media',
    createBrandingSources(),
  ), false)
  assert.equal(isCaseInsertMarkSlotVisible(
    mediaSlot,
    'media',
    enabledDvdSources,
  ), true)
  assert.equal(isCaseInsertMarkSlotVisible(
    mediaSlot,
    'media',
    createBrandingSources({
      projectMediaMark: updateMediaMarkValue(
        enabledDvdSources.projectMediaMark,
        'dataDisc',
      ),
    }),
  ), false)
})

test('case insert platform and technical marks render from enabled insert slots', () => {
  const platformSlot = createMarkSlot('case-platform:windows:windows11')
  const technicalSlot = createMarkSlot('case-technical:audio')
  const disabledPlatformSlot = {
    ...platformSlot,
    enabled: false,
  }
  const enabledSources = createBrandingSources()

  assert.equal(
    isCaseInsertMarkSlotVisible(platformSlot, 'platform', enabledSources),
    true,
  )
  assert.equal(
    isCaseInsertMarkSlotVisible(technicalSlot, 'technical', enabledSources),
    true,
  )
  assert.equal(
    isCaseInsertMarkSlotVisible(
      disabledPlatformSlot,
      'platform',
      enabledSources,
    ),
    false,
  )
  assert.equal(
    isCaseInsertMarkSlotVisible(
      createMarkSlot('case-technical:surround'),
      'technical',
      enabledSources,
    ),
    true,
  )
})

test('case insert target mark enable creates visible slots only for that target', () => {
  const defaultRatingBadge = createDefaultProjectRatingBadge()
  const brandingSources = createBrandingSources({
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
  })
  const state = setProjectJewelCaseBrandingMarkTargetKindEnabled(
    setJewelCaseSpineMirrored(
      createDefaultProjectJewelCaseState('Portal 2'),
      false,
    ),
    { type: 'spine', side: 'left' },
    'rating',
    true,
    brandingSources,
  )

  assert.deepEqual(
    state.spine.left.markSlots.map((slot) => slot.imageSource?.sourceId),
    ['case-rating:ESRB:M'],
  )
  assert.equal(state.spine.left.markSlots[0]?.enabled, true)
  assert.equal(
    isCaseInsertMarkSlotVisible(
      state.spine.left.markSlots[0]!,
      'rating',
      brandingSources,
    ),
    true,
  )
  assert.equal(state.templates.cover.markSlots.length, 0)
  assert.equal(state.templates.tray.markSlots.length, 0)
  assert.equal(state.spine.right.markSlots.length, 0)

  const coverState = setProjectJewelCaseBrandingMarkTargetKindEnabled(
    createDefaultProjectJewelCaseState('Portal 2'),
    { type: 'template', paneId: 'cover' },
    'rating',
    true,
    brandingSources,
  )
  const coverRatingSlot = coverState.templates.cover.markSlots[0]

  assert.equal(coverRatingSlot?.imageSource?.sourceId, 'case-rating:ESRB:M')
  assert.deepEqual(coverRatingSlot?.layout, CASE_INSERT_COVER_RATING_MARK_LAYOUT)
})
