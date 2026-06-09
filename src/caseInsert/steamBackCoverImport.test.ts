import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createDefaultProjectJewelCaseState,
} from './defaults.ts'
import {
  applyCaseInsertBackCoverLegalText,
  applySteamBackCoverImportToCaseInsert,
} from './steamBackCoverImport.ts'
import {
  CASE_INSERT_TRAY_DEFAULT_STEAM_TEXT_BLOCK_LAYOUTS,
  CASE_INSERT_TRAY_DEFAULT_STEAM_TEXT_LIST_LAYOUTS,
} from './defaultImportLayouts.ts'
import type { SteamImportedGame } from '../steam/steamApi.ts'

function createSteamGame(
  overrides: Partial<SteamImportedGame> = {},
): SteamImportedGame {
  return {
    appId: 620,
    title: 'Portal 2',
    developer: ['Valve'],
    publisher: ['Valve'],
    releaseDate: '2011',
    shortDescription: 'The sequel to the acclaimed puzzle game.',
    detailedDescription: '',
    genres: ['Puzzle', 'Action'],
    categories: ['Single-player', 'Co-op', 'Steam Achievements'],
    minimumRequirements: '<strong>Minimum:</strong><br>OS: Windows XP',
    recommendedRequirements:
      '<strong>Recommended:</strong><br>OS: Windows 7<br>Memory: 2 GB RAM',
    legalNotice: '&copy; Valve Corporation. All rights reserved.',
    ratings: undefined,
    platforms: { windows: true, mac: true, linux: true },
    website: undefined,
    storeUrl: 'https://store.steampowered.com/app/620',
    artwork: [],
    ...overrides,
  }
}

function getTrayTextBlock(
  caseInsert: ReturnType<typeof createDefaultProjectJewelCaseState>,
  id: string,
) {
  const textBlock = caseInsert.templates.tray.textBlocks.find(
    (candidate) => candidate.id === id,
  )

  assert.ok(textBlock)

  return textBlock
}

function getTrayTextList(
  caseInsert: ReturnType<typeof createDefaultProjectJewelCaseState>,
  id: string,
) {
  const textList = caseInsert.templates.tray.textLists.find(
    (candidate) => candidate.id === id,
  )

  assert.ok(textList)

  return textList
}

test('Steam import seeds tray card back-cover text fields', () => {
  const state = applySteamBackCoverImportToCaseInsert(
    createDefaultProjectJewelCaseState(),
    createSteamGame(),
  )
  const tray = state.templates.tray

  assert.equal(
    getTrayTextBlock(state, 'tray-description').value,
    'The sequel to the acclaimed puzzle game.',
  )
  assert.equal(getTrayTextBlock(state, 'tray-description').enabled, false)
  assert.equal(getTrayTextBlock(state, 'tray-description').source, 'steam')
  assert.equal(getTrayTextBlock(state, 'tray-description').align, 'left')
  assert.deepEqual(
    getTrayTextBlock(state, 'tray-description').layout,
    CASE_INSERT_TRAY_DEFAULT_STEAM_TEXT_BLOCK_LAYOUTS['tray-description'].layout,
  )
  assert.equal(
    getTrayTextBlock(state, 'tray-minimum-requirements').value,
    'Minimum:\nOS: Windows XP',
  )
  assert.deepEqual(
    getTrayTextBlock(state, 'tray-minimum-requirements').layout,
    CASE_INSERT_TRAY_DEFAULT_STEAM_TEXT_BLOCK_LAYOUTS[
      'tray-minimum-requirements'
    ].layout,
  )
  assert.equal(
    getTrayTextBlock(state, 'tray-recommended-requirements').value,
    'Recommended:\nOS: Windows 7\nMemory: 2 GB RAM',
  )
  assert.deepEqual(
    getTrayTextBlock(state, 'tray-recommended-requirements').layout,
    CASE_INSERT_TRAY_DEFAULT_STEAM_TEXT_BLOCK_LAYOUTS[
      'tray-recommended-requirements'
    ].layout,
  )
  assert.equal(
    getTrayTextBlock(state, 'tray-copyright-text').value,
    '(c) Valve Corporation. All rights reserved.',
  )
  assert.deepEqual(
    getTrayTextBlock(state, 'tray-copyright-text').layout,
    CASE_INSERT_TRAY_DEFAULT_STEAM_TEXT_BLOCK_LAYOUTS['tray-copyright-text'].layout,
  )
  assert.deepEqual(tray.textLists[0]?.items, [
    'Single-player',
    'Co-op',
    'Steam Achievements',
    'Puzzle',
    'Action',
  ])
  assert.equal(tray.textLists[0]?.enabled, false)
  assert.equal(tray.textLists[0]?.source, 'steam')
  assert.deepEqual(
    getTrayTextList(state, 'tray-feature-bullets').layout,
    CASE_INSERT_TRAY_DEFAULT_STEAM_TEXT_LIST_LAYOUTS['tray-feature-bullets'].layout,
  )
})

test('Steam import preserves enabled tray text fields while updating game text', () => {
  const state = createDefaultProjectJewelCaseState()
  const enabledDescription = state.templates.tray.textBlocks.map((textBlock) =>
    textBlock.id === 'tray-description'
      ? { ...textBlock, enabled: true, value: '', source: 'steam' as const }
      : textBlock,
  )
  const updated = applySteamBackCoverImportToCaseInsert(
    {
      ...state,
      templates: {
        ...state.templates,
        tray: {
          ...state.templates.tray,
          textBlocks: enabledDescription,
        },
      },
    },
    createSteamGame({ shortDescription: 'Updated Steam copy.' }),
  )

  assert.equal(getTrayTextBlock(updated, 'tray-description').enabled, true)
  assert.equal(
    getTrayTextBlock(updated, 'tray-description').value,
    'Updated Steam copy.',
  )
})

test('Steam import preserves user-edited tray card text by default', () => {
  const state = createDefaultProjectJewelCaseState()
  const customDescription = state.templates.tray.textBlocks.map((textBlock) =>
    textBlock.id === 'tray-description'
      ? {
          ...textBlock,
          enabled: true,
          value: 'Custom back-cover copy',
          source: 'manual' as const,
          layout: {
            ...textBlock.layout,
            scale: 1.2,
            x: 12,
            y: 88,
          },
        }
      : textBlock,
  )
  const updated = applySteamBackCoverImportToCaseInsert(
    {
      ...state,
      templates: {
        ...state.templates,
        tray: {
          ...state.templates.tray,
          textBlocks: customDescription,
        },
      },
    },
    createSteamGame({ shortDescription: 'Steam copy.' }),
  )

  assert.equal(
    getTrayTextBlock(updated, 'tray-description').value,
    'Custom back-cover copy',
  )
  assert.equal(getTrayTextBlock(updated, 'tray-description').source, 'manual')
  assert.equal(getTrayTextBlock(updated, 'tray-description').layout.scale, 1.2)
  assert.equal(getTrayTextBlock(updated, 'tray-description').layout.x, 12)
  assert.equal(getTrayTextBlock(updated, 'tray-description').layout.y, 88)
})

test('Steam import can replace game-scoped tray card text', () => {
  const state = createDefaultProjectJewelCaseState()
  const customDescription = state.templates.tray.textBlocks.map((textBlock) =>
    textBlock.id === 'tray-description'
      ? {
          ...textBlock,
          enabled: true,
          value: 'Previous game copy',
          source: 'manual' as const,
        }
      : textBlock,
  )
  const updated = applySteamBackCoverImportToCaseInsert(
    {
      ...state,
      templates: {
        ...state.templates,
        tray: {
          ...state.templates.tray,
          textBlocks: customDescription,
        },
      },
    },
    createSteamGame({ shortDescription: 'Next game copy.' }),
    { replaceExisting: true },
  )

  assert.equal(getTrayTextBlock(updated, 'tray-description').value, 'Next game copy.')
  assert.equal(getTrayTextBlock(updated, 'tray-description').source, 'steam')
  assert.deepEqual(
    getTrayTextBlock(updated, 'tray-description').layout,
    CASE_INSERT_TRAY_DEFAULT_STEAM_TEXT_BLOCK_LAYOUTS['tray-description'].layout,
  )
})

test('case insert legal candidate applies to the tray card legal text', () => {
  const state = applyCaseInsertBackCoverLegalText(
    createDefaultProjectJewelCaseState(),
    '<p>&copy; Example Studio. All rights reserved.</p>',
  )
  const legalText = getTrayTextBlock(state, 'tray-copyright-text')

  assert.equal(legalText.enabled, true)
  assert.equal(legalText.source, 'steam')
  assert.equal(legalText.value, '(c) Example Studio. All rights reserved.')
})
