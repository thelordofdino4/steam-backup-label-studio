import assert from 'node:assert/strict'
import test from 'node:test'
import {
  addCaseInsertAdditionalLogoSlot,
  getCaseInsertAdditionalLogoSlotsForKey,
} from '../caseInsert/brandingLogoSlots.ts'
import {
  addCaseInsertTemplateImageSlot,
  createCaseInsertProjectSnapshot,
  createDefaultCaseInsertImageSlot,
  createDefaultProjectJewelCaseState,
  setCaseInsertImageSlotImage,
  updateCaseInsertTemplateImageSlot,
  updateCaseInsertTemplateImageSlotInGroup,
  updateProjectCaseInsertTemplate,
  updateProjectJewelCaseSpineSide,
  restoreCaseInsertProjectState,
} from './projectCaseInsert.ts'
import { createProjectImageAssetProvenance } from './projectAssetStatus.ts'

const steamGame = {
  appId: 620,
  title: 'Portal 2',
  developer: ['Valve'],
  publisher: ['Valve'],
  releaseDate: '2011',
  genres: ['Puzzle'],
  categories: ['Single-player'],
  storeUrl: 'https://store.steampowered.com/app/620/Portal_2/',
  artwork: [],
}

test('case insert source provenance survives save/load for tray slots', () => {
  let state = createDefaultProjectJewelCaseState('Portal 2')

  state = addCaseInsertTemplateImageSlot(state, 'tray', 'artworkSlots')
  state = updateCaseInsertTemplateImageSlot(
    state,
    'tray',
    'background',
    (slot) => setCaseInsertImageSlotImage(slot, {
      imageDataUrl: 'data:image/png;base64,web',
      imageSize: { width: 1920, height: 1080 },
      imageSource: createProjectImageAssetProvenance({
        source: 'web-artwork',
        sourceId: 'official-hero',
        sourceLabel: 'Official hero artwork',
        sourceUrl: 'https://example.test/portal-2/hero.jpg',
      }),
    }),
  )
  state = updateCaseInsertTemplateImageSlotInGroup(
    state,
    'tray',
    'artworkSlots',
    'tray-artwork-1',
    (slot) => setCaseInsertImageSlotImage(slot, {
      imageDataUrl: 'data:image/png;base64,shot',
      imageSize: { width: 1280, height: 720 },
      imageSource: createProjectImageAssetProvenance({
        source: 'local-steam-screenshot',
        sourceId: '620-shot-1',
        sourceLabel: 'Screenshot 1',
      }),
    }),
  )

  const saved = createCaseInsertProjectSnapshot({
    manualGameTitle: 'Portal 2 Case',
    selectedSteamGame: steamGame,
    caseInsert: state,
  })
  const restored = restoreCaseInsertProjectState(saved).caseInsert
  const tray = restored.templates.tray

  assert.equal(tray.background.imageSource?.source, 'web-artwork')
  assert.equal(tray.background.imageSource?.sourceId, 'official-hero')
  assert.equal(tray.background.imageSource?.sourceLabel, 'Official hero artwork')
  assert.equal(
    tray.background.imageSource?.sourceUrl,
    'https://example.test/portal-2/hero.jpg',
  )
  assert.deepEqual(tray.background.imageSize, { width: 1920, height: 1080 })
  assert.equal(
    tray.artworkSlots[0]?.imageSource?.source,
    'local-steam-screenshot',
  )
  assert.equal(tray.artworkSlots[0]?.imageSource?.sourceId, '620-shot-1')
  assert.equal(tray.artworkSlots[0]?.imageSource?.sourceLabel, 'Screenshot 1')
  assert.deepEqual(tray.artworkSlots[0]?.imageSize, { width: 1280, height: 720 })
})

test('case insert branding state survives save/load for cover, tray, and spines', () => {
  const createMarkSlot = (
    id: string,
    label: string,
    sourceId: string,
  ) => ({
    ...createDefaultCaseInsertImageSlot(id, label, { enabled: true }),
    imageDataUrl: `data:image/png;base64,${id}`,
    imageSize: { width: 256, height: 128 },
    imageSource: createProjectImageAssetProvenance({
      source: 'placeholder',
      sourceId,
      sourceLabel: label,
    }),
  })

  let state = createDefaultProjectJewelCaseState('Portal 2')

  state = updateProjectCaseInsertTemplate(state, 'cover', (cover) => {
    const nextCover = addCaseInsertAdditionalLogoSlot(
      cover,
      'cover',
      'developer',
    )

    return {
      ...nextCover,
      steamBanner: {
        ...nextCover.steamBanner,
        colors: {
          ...nextCover.steamBanner.colors,
          gradientStart: '#123456',
        },
      },
      markSlots: [
        ...nextCover.markSlots,
        createMarkSlot('cover-rating', 'ESRB M', 'case-rating:ESRB:M'),
      ],
    }
  })
  state = updateProjectCaseInsertTemplate(state, 'tray', (tray) => {
    const nextTray = addCaseInsertAdditionalLogoSlot(
      tray,
      'tray',
      'publisher',
    )

    return {
      ...nextTray,
      markSlots: [
        ...nextTray.markSlots,
        createMarkSlot('tray-media', 'DVD', 'case-media:dvd:light'),
      ],
    }
  })
  state = updateProjectJewelCaseSpineSide(state, 'left', (spineSide) => {
    const nextSpine = addCaseInsertAdditionalLogoSlot(
      spineSide,
      'spine',
      'developer',
      'left-spine',
    )

    return {
      ...nextSpine,
      steamBanner: {
        ...nextSpine.steamBanner,
        lockupLayout: {
          ...nextSpine.steamBanner.lockupLayout,
          y: 12,
        },
      },
      markSlots: [
        ...nextSpine.markSlots,
        createMarkSlot(
          'left-platform',
          'Windows',
          'case-platform:windows:windows11',
        ),
      ],
    }
  })
  state = updateProjectJewelCaseSpineSide(state, 'right', (spineSide) => {
    const nextSpine = addCaseInsertAdditionalLogoSlot(
      spineSide,
      'spine',
      'publisher',
      'right-spine',
    )

    return {
      ...nextSpine,
      markSlots: [
        ...nextSpine.markSlots,
        createMarkSlot(
          'right-technical',
          'Audio',
          'case-technical:audio:primary',
        ),
      ],
    }
  })

  const saved = createCaseInsertProjectSnapshot({
    manualGameTitle: 'Portal 2 Case',
    selectedSteamGame: steamGame,
    caseInsert: state,
  })
  const restored = restoreCaseInsertProjectState(saved).caseInsert

  assert.equal(
    getCaseInsertAdditionalLogoSlotsForKey(
      restored.templates.cover,
      'developer',
    ).length,
    1,
  )
  assert.equal(
    getCaseInsertAdditionalLogoSlotsForKey(
      restored.templates.tray,
      'publisher',
    ).length,
    1,
  )
  assert.equal(
    getCaseInsertAdditionalLogoSlotsForKey(
      restored.spine.left,
      'developer',
    ).length,
    1,
  )
  assert.equal(
    getCaseInsertAdditionalLogoSlotsForKey(
      restored.spine.right,
      'publisher',
    ).length,
    1,
  )
  assert.equal(restored.templates.cover.steamBanner.colors.gradientStart, '#123456')
  assert.equal(restored.spine.left.steamBanner.lockupLayout.y, 12)
  assert.equal(
    restored.templates.cover.markSlots[0]?.imageSource?.sourceId,
    'case-rating:ESRB:M',
  )
  assert.equal(
    restored.templates.tray.markSlots[0]?.imageSource?.sourceId,
    'case-media:dvd:light',
  )
  assert.equal(
    restored.spine.left.markSlots[0]?.imageSource?.sourceId,
    'case-platform:windows:windows11',
  )
  assert.equal(
    restored.spine.right.markSlots[0]?.imageSource?.sourceId,
    'case-technical:audio:primary',
  )
  assert.deepEqual(restored.spine.right.markSlots[0]?.imageSize, {
    width: 256,
    height: 128,
  })
})
