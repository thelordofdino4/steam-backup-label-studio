import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getCaseInsertMarkLayerKind,
  type CaseInsertBrandingSourceCatalog,
  type CaseInsertMarkLayerKind,
} from './brandingSlotSources.ts'
import {
  isCaseInsertMarkSlotVisible,
} from './brandingVisibility.ts'
import {
  createDefaultProjectJewelCaseState,
} from './defaults.ts'
import {
  CASE_INSERT_SPINE_MARK_LAYOUTS,
  CASE_INSERT_TRAY_MARK_LAYOUTS,
} from './defaultBrandingLayouts.ts'
import {
  type CaseInsertBrandingMarkTarget,
  setProjectJewelCaseBrandingMarkTargetKindEnabled,
  setProjectJewelCaseBrandingMarkTargetSourcePrefixEnabled,
} from './brandingMarkSlots.ts'
import { createDefaultProjectLogoAssets } from '../project/projectLogoAssets.ts'
import {
  createDefaultProjectMediaMark,
  updateMediaMarkLayoutField,
} from '../project/projectMediaMark.ts'
import { createDefaultProjectMetadata } from '../project/projectMetadata.ts'
import {
  createDefaultProjectPlatformMarks,
  updatePlatformMarkToggle,
} from '../project/projectPlatformMarks.ts'
import {
  createDefaultProjectRatingBadge,
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
) {
  return target.type === 'template'
    ? state.templates[target.paneId].markSlots
    : state.spine[target.side].markSlots
}

function getMarkLayoutsByKind(slots: ProjectCaseInsertImageSlot[]) {
  const layoutsByKind = new Map<
    CaseInsertMarkLayerKind,
    ProjectCaseInsertImageSlot['layout']
  >()

  slots.forEach((slot) => {
    layoutsByKind.set(
      getCaseInsertMarkLayerKind(slot.imageSource?.sourceId),
      slot.layout,
    )
  })

  return layoutsByKind
}

function enableAllSharedMarkKinds(
  target: CaseInsertBrandingMarkTarget,
  brandingSources: CaseInsertBrandingSourceCatalog,
) {
  let state = createDefaultProjectJewelCaseState('Portal 2')

  ;(['rating', 'media', 'platform', 'technical'] as const).forEach((kind) => {
    state = setProjectJewelCaseBrandingMarkTargetKindEnabled(
      state,
      target,
      kind,
      true,
      brandingSources,
    )
  })

  return state
}

test('mirrored spine mark enable creates visible slots for both spines', () => {
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
  assert.deepEqual(
    state.spine.right.markSlots.map((slot) => slot.imageSource?.sourceId),
    ['case-rating:ESRB:M'],
  )
  assert.equal(state.spine.left.markSlots[0]?.id, 'left-spine-auto-rating-primary')
  assert.equal(state.spine.right.markSlots[0]?.id, 'right-spine-auto-rating-primary')
  assert.equal(state.spine.left.markSlots[0]?.enabled, true)
  assert.equal(state.spine.right.markSlots[0]?.enabled, true)
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

test('generated tray and spine mark slots use structured defaults by kind', () => {
  const brandingSources = createEnabledMarkBrandingSources()
  const trayTarget: CaseInsertBrandingMarkTarget = {
    type: 'template',
    paneId: 'tray',
  }
  const spineTarget: CaseInsertBrandingMarkTarget = {
    type: 'spine',
    side: 'left',
  }
  const trayState = enableAllSharedMarkKinds(trayTarget, brandingSources)
  const spineState = enableAllSharedMarkKinds(spineTarget, brandingSources)
  const trayLayouts = getMarkLayoutsByKind(
    getTargetMarkSlots(trayState, trayTarget),
  )
  const spineLayouts = getMarkLayoutsByKind(
    getTargetMarkSlots(spineState, spineTarget),
  )

  assert.deepEqual(trayLayouts.get('rating'), CASE_INSERT_TRAY_MARK_LAYOUTS.rating)
  assert.deepEqual(trayLayouts.get('media'), CASE_INSERT_TRAY_MARK_LAYOUTS.media)
  assert.deepEqual(trayLayouts.get('platform'), CASE_INSERT_TRAY_MARK_LAYOUTS.platform)
  assert.deepEqual(
    trayLayouts.get('technical'),
    CASE_INSERT_TRAY_MARK_LAYOUTS.technical,
  )

  assert.deepEqual(spineLayouts.get('rating'), CASE_INSERT_SPINE_MARK_LAYOUTS.rating)
  assert.deepEqual(spineLayouts.get('media'), CASE_INSERT_SPINE_MARK_LAYOUTS.media)
  assert.deepEqual(
    spineLayouts.get('platform'),
    CASE_INSERT_SPINE_MARK_LAYOUTS.platform,
  )
  assert.deepEqual(
    spineLayouts.get('technical'),
    CASE_INSERT_SPINE_MARK_LAYOUTS.technical,
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
