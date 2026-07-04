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
  setProjectJewelCaseBrandingMarkTargetSourcePrefixEnabled,
  syncProjectJewelCaseBrandingMarkSlotsForTarget,
} from './brandingMarkSlots.ts'
import { createDefaultProjectLogoAssets } from '../project/projectLogoAssets.ts'
import { createDefaultProjectMediaMark } from '../project/projectMediaMark.ts'
import { createDefaultProjectMetadata } from '../project/projectMetadata.ts'
import { createDefaultProjectPlatformMarks } from '../project/projectPlatformMarks.ts'
import { createDefaultProjectRatingBadge } from '../project/projectRatingBadge.ts'
import {
  addTechnicalMarkAsset,
  createDefaultProjectTechnicalMarks,
  setTechnicalMarkCustomImage,
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

function getTargetMarkSlots(
  state: ProjectJewelCaseState,
  target: CaseInsertBrandingMarkTarget,
): ProjectCaseInsertImageSlot[] {
  return target.type === 'template'
    ? state.templates[target.paneId].markSlots
    : state.spine[target.side].markSlots
}

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
