import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createDefaultProjectJewelCaseState,
} from './defaults.ts'
import {
  applyCaseInsertBackCoverLegalText,
  applySteamBackCoverImportToCaseInsert,
} from './steamBackCoverImport.ts'
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
  assert.equal(getTrayTextBlock(state, 'tray-description').enabled, true)
  assert.equal(getTrayTextBlock(state, 'tray-description').source, 'steam')
  assert.equal(
    getTrayTextBlock(state, 'tray-minimum-requirements').value,
    'Minimum:\nOS: Windows XP',
  )
  assert.equal(
    getTrayTextBlock(state, 'tray-recommended-requirements').value,
    'Recommended:\nOS: Windows 7\nMemory: 2 GB RAM',
  )
  assert.equal(
    getTrayTextBlock(state, 'tray-legal-text').value,
    '(c) Valve Corporation. All rights reserved.',
  )
  assert.deepEqual(tray.textLists[0]?.items, [
    'Single-player',
    'Co-op',
    'Steam Achievements',
    'Puzzle',
    'Action',
  ])
  assert.equal(tray.textLists[0]?.enabled, true)
  assert.equal(tray.textLists[0]?.source, 'steam')
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
})

test('case insert legal candidate applies to the tray card legal text', () => {
  const state = applyCaseInsertBackCoverLegalText(
    createDefaultProjectJewelCaseState(),
    '<p>&copy; Example Studio. All rights reserved.</p>',
  )
  const legalText = getTrayTextBlock(state, 'tray-legal-text')

  assert.equal(legalText.enabled, true)
  assert.equal(legalText.source, 'steam')
  assert.equal(legalText.value, '(c) Example Studio. All rights reserved.')
})
