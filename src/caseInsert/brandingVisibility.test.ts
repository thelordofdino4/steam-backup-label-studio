import assert from 'node:assert/strict'
import test from 'node:test'
import type { CaseInsertBrandingSourceCatalog } from './brandingSlotSources.ts'
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
  type CaseInsertBrandingMarkTarget,
  setProjectJewelCaseBrandingMarkTargetKindEnabled,
  setProjectJewelCaseBrandingMarkTargetSourcePrefixEnabled,
  syncProjectJewelCaseBrandingMarkSlots,
  syncProjectJewelCaseBrandingMarkSlotsForTarget,
} from './brandingMarkSlots.ts'
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
  setMediaMarkCustomImage,
  updateMediaMarkLayoutField,
  updateMediaMarkValue,
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
  updateSupplementalUskRatingBadgeEnabledState,
} from '../project/projectRatingBadge.ts'
import {
  addTechnicalMarkAsset,
  createDefaultProjectTechnicalMarks,
  setTechnicalMarkCustomImage,
  updateTechnicalMarkToggle,
} from '../project/projectTechnicalMarks.ts'
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
) {
  return target.type === 'template'
    ? state.templates[target.paneId].markSlots
    : state.spine[target.side].markSlots
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
    createDefaultProjectJewelCaseState('Portal 2'),
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

test('case insert target source toggles do not create marks on other faces', () => {
  const brandingSources = createBrandingSources({
    projectPlatformMarks: updatePlatformMarkToggle(
      createDefaultProjectPlatformMarks(),
      'windows',
      true,
    ),
  })
  const state = setProjectJewelCaseBrandingMarkTargetSourcePrefixEnabled(
    createDefaultProjectJewelCaseState('Portal 2'),
    { type: 'template', paneId: 'tray' },
    'case-platform:windows:',
    true,
    brandingSources,
  )

  assert.deepEqual(
    state.templates.tray.markSlots.map((slot) => slot.imageSource?.sourceId),
    ['case-platform:windows:windows11'],
  )
  assert.equal(state.templates.tray.markSlots[0]?.enabled, true)
  assert.equal(state.templates.cover.markSlots.length, 0)
  assert.equal(state.spine.left.markSlots.length, 0)
  assert.equal(state.spine.right.markSlots.length, 0)
})

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

test('case insert platform mark targets can disable and re-enable preserved slots', () => {
  const brandingSources = createBrandingSources({
    projectPlatformMarks: updatePlatformMarkToggle(
      createDefaultProjectPlatformMarks(),
      'windows',
      true,
    ),
  })
  const targets: CaseInsertBrandingMarkTarget[] = [
    { type: 'template', paneId: 'cover' },
    { type: 'template', paneId: 'tray' },
    { type: 'spine', side: 'left' },
    { type: 'spine', side: 'right' },
  ]

  targets.forEach((target) => {
    const enabledState = setProjectJewelCaseBrandingMarkTargetSourcePrefixEnabled(
      createDefaultProjectJewelCaseState('Portal 2'),
      target,
      'case-platform:windows:',
      true,
      brandingSources,
    )
    const enabledSlot = getTargetMarkSlots(enabledState, target)[0]!
    const disabledState = setProjectJewelCaseBrandingMarkTargetSourcePrefixEnabled(
      enabledState,
      target,
      'case-platform:windows:',
      false,
      brandingSources,
    )
    const disabledSlot = getTargetMarkSlots(disabledState, target)[0]!
    const reenabledState = setProjectJewelCaseBrandingMarkTargetSourcePrefixEnabled(
      disabledState,
      target,
      'case-platform:windows:',
      true,
      brandingSources,
    )
    const reenabledSlot = getTargetMarkSlots(reenabledState, target)[0]!

    assert.equal(enabledSlot.imageSource?.sourceId, 'case-platform:windows:windows11')
    assert.equal(enabledSlot.enabled, true)
    assert.equal(disabledSlot.id, enabledSlot.id)
    assert.equal(disabledSlot.enabled, false)
    assert.equal(
      isCaseInsertMarkSlotVisible(disabledSlot, 'platform', brandingSources),
      false,
    )
    assert.equal(reenabledSlot.id, enabledSlot.id)
    assert.equal(reenabledSlot.enabled, true)
    assert.equal(
      isCaseInsertMarkSlotVisible(reenabledSlot, 'platform', brandingSources),
      true,
    )
  })
})

test('case insert rating mark targets replace bundled artwork with uploaded custom images', () => {
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

test('case insert media mark targets replace bundled artwork with uploaded custom images', () => {
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

test('case insert platform mark targets replace bundled artwork with uploaded custom images', () => {
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

test('case insert rating media and platform targets restore bundled artwork after custom images are cleared', () => {
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

test('case insert technical mark targets replace built-in artwork with uploaded custom images', () => {
  const placeholderTechnicalMarks = updateTechnicalMarkToggle(
    createDefaultProjectTechnicalMarks(),
    'audio',
    true,
  )
  const customTechnicalMarks = setTechnicalMarkCustomImage(
    placeholderTechnicalMarks,
    'audio',
    'data:image/png;base64,custom-audio-mark',
    { width: 321, height: 123 },
  )
  const placeholderSources = createBrandingSources({
    projectTechnicalMarks: placeholderTechnicalMarks,
  })
  const customSources = createBrandingSources({
    projectTechnicalMarks: customTechnicalMarks,
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
      'case-technical:audio',
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
    assert.equal(customSlot.imageDataUrl, 'data:image/png;base64,custom-audio-mark')
    assert.equal(customSlot.imageSource?.source, 'custom')
    assert.equal(customSlot.imageSource?.sourceId, 'case-technical:audio:primary')
    assert.deepEqual(customSlot.imageSize, { width: 321, height: 123 })
    assert.equal(
      isCaseInsertMarkSlotVisible(customSlot, 'technical', customSources),
      true,
    )
  })
})

test('case insert technical mark targets sync added mark slots separately from primary marks', () => {
  const baseTechnicalMarks = updateTechnicalMarkToggle(
    createDefaultProjectTechnicalMarks(),
    'audio',
    true,
  )
  const technicalMarksWithExtra = addTechnicalMarkAsset(
    baseTechnicalMarks,
    'audio',
  )
  const extraAudioMarkId =
    technicalMarksWithExtra.additionalAssets?.audio?.[0]?.id

  assert.ok(extraAudioMarkId)

  const customTechnicalMarks = setTechnicalMarkCustomImage(
    technicalMarksWithExtra,
    'audio',
    'data:image/png;base64,custom-extra-audio-mark',
    { width: 222, height: 111 },
    undefined,
    extraAudioMarkId,
  )
  const customSources = createBrandingSources({
    projectTechnicalMarks: customTechnicalMarks,
  })
  const targets: CaseInsertBrandingMarkTarget[] = [
    { type: 'template', paneId: 'cover' },
    { type: 'template', paneId: 'tray' },
    { type: 'spine', side: 'left' },
    { type: 'spine', side: 'right' },
  ]
  const extraSourceId = `case-technical:audio:${extraAudioMarkId}`

  targets.forEach((target) => {
    const syncedState = setProjectJewelCaseBrandingMarkTargetSourcePrefixEnabled(
      createDefaultProjectJewelCaseState('Portal 2'),
      target,
      extraSourceId,
      true,
      customSources,
    )
    const extraSlot = getTargetMarkSlots(syncedState, target).find((slot) =>
      slot.imageSource?.sourceId === extraSourceId)

    assert.ok(extraSlot)
    assert.equal(extraSlot.imageDataUrl, 'data:image/png;base64,custom-extra-audio-mark')
    assert.equal(extraSlot.imageSource?.source, 'custom')
    assert.equal(extraSlot.imageSource?.sourceId, extraSourceId)
    assert.deepEqual(extraSlot.imageSize, { width: 222, height: 111 })
    assert.equal(
      isCaseInsertMarkSlotVisible(extraSlot, 'technical', customSources),
      true,
    )
  })
})

test('case insert mark sync preserves uploaded slot images while updating shared identity', () => {
  const enabledSources = createEnabledMarkBrandingSources()
  const state = syncProjectJewelCaseBrandingMarkSlots(
    createDefaultProjectJewelCaseState('Portal 2'),
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
})
