import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createCaseInsertBrandingSourceSections,
  getCaseInsertMarkLayerKind,
} from '../caseInsert/brandingSlotSources.ts'
import {
  addCaseInsertTemplateImageSlot,
  addJewelCaseSpineImageSlot,
  createCaseInsertProjectSnapshot,
  createDefaultCaseInsertImageSlot,
  createDefaultJewelCaseSpineMarkSlot,
  createDefaultProjectJewelCaseState,
  removeCaseInsertTemplateImageSlot,
  renameCaseInsertTemplateImageSlot,
  setCaseInsertImageSlotEnabled,
  setCaseInsertImageSlotImage,
  updateCaseInsertTemplateImageSlotInGroup,
  updateProjectCaseInsertTemplate,
  restoreCaseInsertProjectState,
} from './projectCaseInsert.ts'
import { createProjectImageAssetProvenance } from './projectAssetStatus.ts'
import { createDefaultProjectLogoAssets } from './projectLogoAssets.ts'
import { createDefaultProjectMediaMark } from './projectMediaMark.ts'
import { createDefaultProjectMetadata } from './projectMetadata.ts'
import {
  createDefaultProjectPlatformMarks,
  updatePlatformMarkToggle,
} from './projectPlatformMarks.ts'
import { createDefaultProjectRatingBadge } from './projectRatingBadge.ts'
import {
  createDefaultProjectTechnicalMarks,
  updateTechnicalMarkToggle,
} from './projectTechnicalMarks.ts'

test('template helpers add, update, preserve, and remove logo and mark slots', () => {
  let state = createDefaultProjectJewelCaseState('Portal 2')

  state = addCaseInsertTemplateImageSlot(state, 'cover', 'logoSlots')
  state = addCaseInsertTemplateImageSlot(state, 'cover', 'markSlots')
  state = addCaseInsertTemplateImageSlot(state, 'tray', 'logoSlots')
  state = addCaseInsertTemplateImageSlot(state, 'tray', 'markSlots')

  assert.equal(state.templates.cover.logoSlots[0]?.id, 'cover-logo-1')
  assert.equal(state.templates.cover.markSlots[0]?.id, 'cover-mark-1')
  assert.equal(state.templates.tray.logoSlots[0]?.id, 'tray-logo-1')
  assert.equal(state.templates.tray.markSlots[0]?.id, 'tray-mark-1')
  assert.equal(state.templates.cover.logoSlots[0]?.layout.x, 50)
  assert.equal(state.templates.cover.logoSlots[0]?.layout.y, 92)
  assert.equal(state.templates.cover.markSlots[0]?.layout.x, 0)
  assert.equal(state.templates.cover.markSlots[0]?.layout.y, 100)
  assert.equal(state.templates.tray.markSlots[0]?.layout.x, 84)

  state = updateCaseInsertTemplateImageSlotInGroup(
    state,
    'cover',
    'logoSlots',
    'cover-logo-1',
    (slot) => setCaseInsertImageSlotEnabled(
      setCaseInsertImageSlotImage(slot, {
        imageDataUrl: 'data:image/png;base64,logo',
        imageSize: { width: 400, height: 120 },
        imageSource: {
          source: 'uploaded',
          sourceLabel: 'C:\\Users\\John\\Pictures\\dev-logo.png',
        },
      }),
      false,
    ),
  )
  state = updateProjectCaseInsertTemplate(state, 'cover', (cover) =>
    renameCaseInsertTemplateImageSlot(
      cover,
      'logoSlots',
      'cover-logo-1',
      'Developer logo',
    ),
  )

  assert.equal(state.templates.cover.logoSlots[0]?.enabled, false)
  assert.equal(state.templates.cover.logoSlots[0]?.label, 'Developer logo')
  assert.equal(
    state.templates.cover.logoSlots[0]?.imageDataUrl,
    'data:image/png;base64,logo',
  )
  assert.equal(
    state.templates.cover.logoSlots[0]?.imageSource?.sourceLabel,
    'dev-logo.png',
  )

  state = removeCaseInsertTemplateImageSlot(
    state,
    'cover',
    'logoSlots',
    'cover-logo-1',
  )

  assert.equal(state.templates.cover.logoSlots.length, 0)
  assert.equal(state.templates.cover.markSlots.length, 1)
  assert.equal(state.templates.tray.logoSlots.length, 1)
  assert.equal(state.templates.tray.markSlots.length, 1)
})

test('spine helpers add and persist mark slots independently from artwork slots', () => {
  let state = createDefaultProjectJewelCaseState('Portal 2')
  const markSlot = setCaseInsertImageSlotImage(
    {
      ...createDefaultJewelCaseSpineMarkSlot('left', 1),
      label: 'Windows mark',
    },
    {
      imageDataUrl: 'data:image/png;base64,windows-mark',
      imageSize: { width: 256, height: 128 },
      imageSource: createProjectImageAssetProvenance({
        source: 'placeholder',
        sourceId: 'case-platform:windows:windows11',
        sourceLabel: 'Windows operating-system mark',
      }),
    },
  )

  state = addJewelCaseSpineImageSlot(
    state,
    'left',
    'markSlots',
    markSlot,
  )
  state = addJewelCaseSpineImageSlot(
    state,
    'left',
    'artworkSlots',
    createDefaultCaseInsertImageSlot('left-spine-artwork-1', 'Artwork 1'),
  )

  const saved = createCaseInsertProjectSnapshot({
    manualGameTitle: 'Portal 2 Case',
    caseInsert: state,
  })
  const restored = restoreCaseInsertProjectState(saved).caseInsert
  const restoredMark = restored.spine.left.markSlots[0]

  assert.equal(state.spine.left.markSlots[0]?.id, 'left-spine-mark-1')
  assert.equal(state.spine.left.artworkSlots.length, 1)
  assert.equal(restoredMark?.label, 'Windows mark')
  assert.equal(restoredMark?.imageDataUrl, 'data:image/png;base64,windows-mark')
  assert.equal(restoredMark?.imageSource?.sourceId, 'case-platform:windows:windows11')
  assert.equal(restored.spine.right.markSlots.length, 0)
})

test('spine mark slots can use shared rating media platform and technical sources', () => {
  const defaultRatingBadge = createDefaultProjectRatingBadge()
  const defaultMediaMark = createDefaultProjectMediaMark()
  const projectRatingBadge = {
    ...defaultRatingBadge,
    layout: {
      ...defaultRatingBadge.layout,
      enabled: true,
    },
  }
  const projectMediaMark = {
    ...defaultMediaMark,
    layout: {
      ...defaultMediaMark.layout,
      enabled: true,
    },
  }
  const sections = createCaseInsertBrandingSourceSections({
    projectMetadata: {
      ...createDefaultProjectMetadata(),
      ratingSystem: 'ESRB',
      ratingValue: 'M',
    },
    projectLogoAssets: createDefaultProjectLogoAssets(),
    projectRatingBadge,
    projectMediaMark,
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
  const sourceIds = [
    'case-rating:ESRB:M',
    'case-media:dataDisc:light',
    'case-platform:windows:windows11',
    'case-technical:audio:primary',
  ]
  let state = createDefaultProjectJewelCaseState('Portal 2')

  sourceIds.forEach((sourceId, index) => {
    const source = sections
      .flatMap((section) => section.items)
      .find((item) => item.sourceId === sourceId)

    assert.ok(source)
    assert.equal(source.slotKey, 'markSlots')
    assert.equal(getCaseInsertMarkLayerKind(source.sourceId), (
      sourceId.startsWith('case-media:')
        ? 'media'
        : sourceId.startsWith('case-platform:')
          ? 'platform'
          : sourceId.startsWith('case-technical:')
            ? 'technical'
            : 'rating'
    ))

    state = addJewelCaseSpineImageSlot(
      state,
      'right',
      'markSlots',
      setCaseInsertImageSlotImage(
        {
          ...createDefaultJewelCaseSpineMarkSlot('right', index + 1),
          label: source.label,
        },
        {
          imageDataUrl: `data:image/png;base64,spine-mark-${index + 1}`,
          imageSize: { width: 256, height: 128 },
          imageSource: createProjectImageAssetProvenance({
            source: 'placeholder',
            sourceId: source.sourceId,
            sourceLabel: source.label,
          }),
        },
      ),
    )
  })

  const saved = createCaseInsertProjectSnapshot({
    manualGameTitle: 'Portal 2 Case',
    caseInsert: state,
  })
  const restored = restoreCaseInsertProjectState(saved).caseInsert

  assert.deepEqual(
    restored.spine.right.markSlots.map((slot) => slot.imageSource?.sourceId),
    sourceIds,
  )
  assert.deepEqual(
    restored.spine.right.markSlots.map((slot) =>
      getCaseInsertMarkLayerKind(slot.imageSource?.sourceId)),
    ['rating', 'media', 'platform', 'technical'],
  )
  assert.equal(restored.spine.left.markSlots.length, 0)
})

test('case branding source catalog only exposes saved logo sources', () => {
  const sections = createCaseInsertBrandingSourceSections({
    projectMetadata: createDefaultProjectMetadata(),
    projectLogoAssets: createDefaultProjectLogoAssets(),
    projectRatingBadge: createDefaultProjectRatingBadge(),
    projectMediaMark: createDefaultProjectMediaMark(),
    projectPlatformMarks: createDefaultProjectPlatformMarks(),
    projectTechnicalMarks: createDefaultProjectTechnicalMarks(),
  })
  const logos = sections.find((section) => section.id === 'logos')
  const rating = sections.find((section) => section.id === 'rating')
  const media = sections.find((section) => section.id === 'media')
  const platform = sections.find((section) => section.id === 'platform')
  const technical = sections.find((section) => section.id === 'technical')

  assert.equal(logos?.items.length, 0)
  assert.equal(rating?.items.length, 0)
  assert.equal(media?.items.length, 0)
  assert.equal(platform?.items.length, 0)
  assert.equal(technical?.items.length, 0)
})

test('case branding source catalog exposes shared mark and real logo sources', () => {
  const defaultRatingBadge = createDefaultProjectRatingBadge()
  const defaultMediaMark = createDefaultProjectMediaMark()
  const projectRatingBadge = {
    ...defaultRatingBadge,
    layout: {
      ...defaultRatingBadge.layout,
      enabled: true,
    },
  }
  const projectMediaMark = {
    ...defaultMediaMark,
    layout: {
      ...defaultMediaMark.layout,
      enabled: true,
    },
  }
  const projectLogoAssets = {
    ...createDefaultProjectLogoAssets(),
    developerLogoDataUrl: 'data:image/png;base64,developer-logo',
    developerLogoSize: { width: 512, height: 128 },
    developerLogoSource: createProjectImageAssetProvenance({
      source: 'steam-logo-candidate',
      sourceId: 'steam-dev-logo-candidate',
      sourceLabel: 'Steam developer logo candidate',
      sourceUrl: 'https://cdn.example.test/dev-logo.png',
    }),
    publisherLogoDataUrl: 'data:image/png;base64,publisher-logo',
    publisherLogoSize: { width: 512, height: 128 },
    publisherLogoSource: createProjectImageAssetProvenance({
      source: 'official-logo-candidate',
      sourceId: 'official-pub-logo-candidate',
      sourceLabel: 'Official publisher logo candidate',
      sourceUrl: 'https://example.test/pub-logo.png',
    }),
  }
  const projectPlatformMarks = updatePlatformMarkToggle(
    createDefaultProjectPlatformMarks(),
    'windows',
    true,
  )
  const projectTechnicalMarks = updateTechnicalMarkToggle(
    createDefaultProjectTechnicalMarks(),
    'audio',
    true,
  )
  const sections = createCaseInsertBrandingSourceSections({
    projectMetadata: {
      ...createDefaultProjectMetadata(),
      ratingSystem: 'ESRB',
      ratingValue: 'M',
    },
    projectLogoAssets,
    projectRatingBadge,
    projectMediaMark,
    projectPlatformMarks,
    projectTechnicalMarks,
  })
  const logos = sections.find((section) => section.id === 'logos')
  const rating = sections.find((section) => section.id === 'rating')
  const media = sections.find((section) => section.id === 'media')
  const platform = sections.find((section) => section.id === 'platform')
  const technical = sections.find((section) => section.id === 'technical')

  assert.ok(logos?.items.some((item) =>
    item.id === 'case-logo:developer' &&
    item.sourceId === 'steam-dev-logo-candidate'))
  assert.ok(logos?.items.some((item) =>
    item.id === 'case-logo:publisher' &&
    item.sourceId === 'official-pub-logo-candidate'))
  assert.equal(rating?.items[0]?.sourceId, 'case-rating:ESRB:M')
  assert.ok(media?.items.some((item) =>
    item.sourceId === 'case-media:dataDisc:light'))
  assert.ok(platform?.items.some((item) =>
    item.sourceId === 'case-platform:windows:windows11'))
  assert.ok(technical?.items.some((item) =>
    item.sourceId === 'case-technical:audio:primary'))

  assert.equal(getCaseInsertMarkLayerKind('case-rating:ESRB:M'), 'rating')
  assert.equal(getCaseInsertMarkLayerKind('case-media:dataDisc:light'), 'media')
  assert.equal(getCaseInsertMarkLayerKind('case-platform:windows:windows11'), 'platform')
  assert.equal(getCaseInsertMarkLayerKind('case-technical:audio'), 'technical')
  assert.equal(getCaseInsertMarkLayerKind(null), 'rating')
})
