import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createDefaultCaseInsertImageSlot,
  createDefaultProjectJewelCaseState,
} from './defaults.ts'
import {
  applyCaseInsertBackCoverLegalText,
  applySteamBackCoverImportToCaseInsert,
  getSteamBackCoverImportStatus,
} from './steamBackCoverImport.ts'
import {
  applyCaseInsertSteamImportBrandingDefaults,
  getCaseInsertRatingBadgeForSteamImport,
} from './steamImportBrandingDefaults.ts'
import {
  applySteamImportDefaultsToCaseInsert,
  prepareCaseInsertSteamImport,
} from './steamImportDefaults.ts'
import {
  createCaseInsertProjectSnapshot,
  restoreCaseInsertProjectStateFromContents,
} from '../project/caseInsertProjectAdapters.ts'
import type {
  CaseInsertTitleArtworkImportSeed,
} from './titleArtwork.ts'
import {
  CASE_INSERT_TRAY_DEFAULT_STEAM_TEXT_BLOCK_LAYOUTS,
  CASE_INSERT_TRAY_DEFAULT_STEAM_TEXT_LIST_LAYOUTS,
} from './defaultImportLayouts.ts'
import {
  getEnabledCaseInsertMarkSlotForKind,
} from './brandingMarkPlacement.ts'
import {
  syncProjectJewelCaseBrandingMarkSlots,
} from './brandingMarkSlots.ts'
import { createDefaultProjectLogoAssets } from '../project/projectLogoAssets.ts'
import { createDefaultProjectMediaMark } from '../project/projectMediaMark.ts'
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
import type {
  CaseInsertBrandingSourceCatalog,
} from './brandingSlotSources.ts'
import type { SteamImportedGame } from '../steam/steamApi.ts'
import type { RatingBoardCandidate } from '../steam/steamMetadataCandidates.ts'

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

function createEsrbRatingCandidate(
  overrides: Partial<RatingBoardCandidate> = {},
): RatingBoardCandidate {
  return {
    id: 'rating-steam-appdetails-esrb-m',
    boardId: 'esrb',
    boardLabel: 'ESRB',
    rawRating: 'm',
    displayRating: 'M',
    ratingSystem: 'ESRB',
    ratingValue: 'M',
    applyKind: 'rating',
    canApply: true,
    confidence: 'high',
    source: 'steam-appdetails',
    sourceLabel: 'Steam appdetails',
    sourceUrl: null,
    descriptors: [],
    reasons: ['Steam appdetails includes ESRB rating data.'],
    ...overrides,
  }
}

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

function prepareImport(caseInsert = createDefaultProjectJewelCaseState(), game = createSteamGame()) {
  return prepareCaseInsertSteamImport({
    caseInsert, importedGame: game, legalText: game.legalNotice ?? '',
    replaceExisting: false, titleArtworkSeed: null, ratingCandidate: null,
    brandingSources: createBrandingSources(),
  })
}

for (const enabled of [false, true]) {
  test(`Case import preserves ${enabled ? 'enabled' : 'disabled'} text and describes the exact prepared after-state`, () => {
    const source = createDefaultProjectJewelCaseState()
    source.templates.tray.textBlocks.forEach((block) => { block.enabled = enabled })
    source.templates.tray.textLists.forEach((list) => { list.enabled = enabled })
    const before = structuredClone(source)
    const result = prepareImport(source)
    assert.deepEqual(source, before)
    assert.ok(result.caseInsert.templates.tray.textBlocks.every((block) => block.enabled === enabled))
    assert.ok(result.caseInsert.templates.tray.textLists.every((list) => list.enabled === enabled))
    assert.equal(result.statusMessage, getSteamBackCoverImportStatus(result.caseInsert))
    if (enabled) {
      assert.equal(result.statusMessage, 'Steam back-cover text: 5 enabled, 0 hidden. Existing visibility settings were preserved.')
    } else {
      assert.equal(result.statusMessage, 'Steam back-cover text: 0 enabled, 5 hidden. To show hidden text, open Back and enable it under Game Description Text, Feature Bullets / Callouts, System Requirements, Legal Info.')
    }
    const repeated = prepareImport(result.caseInsert)
    assert.deepEqual(repeated.caseInsert, result.caseInsert)
    assert.equal(repeated.statusMessage, result.statusMessage)
  })
}

test('fresh-default import truthfully reports hidden text without enabling unrelated content', () => {
  const result = prepareImport()
  assert.match(result.statusMessage, /0 enabled, 5 hidden/)
  assert.equal(getTrayTextBlock(result.caseInsert, 'tray-description').enabled, false)
  assert.equal(getTrayTextBlock(result.caseInsert, 'tray-description').source, 'steam')
})

test('mixed visibility guides only to sections with non-empty hidden Steam text', () => {
  const source = createDefaultProjectJewelCaseState()
  getTrayTextBlock(source, 'tray-description').enabled = true
  getTrayTextList(source, 'tray-feature-bullets').enabled = true
  const result = prepareImport(source)
  assert.equal(result.statusMessage, 'Steam back-cover text: 2 enabled, 3 hidden. To show hidden text, open Back and enable it under System Requirements, Legal Info.')
})

test('preserved manual overrides are not falsely reported as imported hidden content', () => {
  const source = createDefaultProjectJewelCaseState()
  const description = getTrayTextBlock(source, 'tray-description')
  description.source = 'manual'
  description.value = 'My own description.'
  description.enabled = true
  const result = prepareImport(source)
  assert.deepEqual(getTrayTextBlock(result.caseInsert, 'tray-description'), description)
  assert.match(result.statusMessage, /0 enabled, 4 hidden/)
  assert.doesNotMatch(result.statusMessage, /Game Description Text/)
})

test('empty import does not invent available or visible text', () => {
  const result = prepareImport(undefined, createSteamGame({
    shortDescription: '', detailedDescription: '', minimumRequirements: '',
    recommendedRequirements: '', legalNotice: '', categories: [], genres: [],
  }))
  assert.equal(result.statusMessage, 'No non-empty Steam back-cover text is available. Text visibility settings were preserved.')
})

test('Case save/load retains imported hidden copy, enabled copy, and manual override choices', () => {
  const source = createDefaultProjectJewelCaseState()
  const description = getTrayTextBlock(source, 'tray-description')
  description.value = 'Manual description'
  description.source = 'manual'
  description.enabled = false
  getTrayTextBlock(source, 'tray-minimum-requirements').enabled = true
  const result = prepareImport(source)
  const saved = createCaseInsertProjectSnapshot({ caseInsert: result.caseInsert, manualGameTitle: 'Portal 2' })
  const restored = restoreCaseInsertProjectStateFromContents(JSON.stringify(saved)).caseInsert
  assert.deepEqual(restored.templates.tray.textBlocks, result.caseInsert.templates.tray.textBlocks)
  assert.deepEqual(restored.templates.tray.textLists, result.caseInsert.templates.tray.textLists)
  assert.equal(getSteamBackCoverImportStatus(restored), result.statusMessage)
})

test('Steam Case defaults preserve Tray artwork and never provision preset screenshot slots', () => {
  const source = createDefaultProjectJewelCaseState('Portal 2')
  const customArtwork = createDefaultCaseInsertImageSlot(
    'tray-artwork-custom',
    'Custom supporting art',
    { enabled: true },
  )
  source.templates.tray.additionalArtworkEnabled = true
  source.templates.tray.artworkSlots = [customArtwork]
  const sourceSlots = source.templates.tray.artworkSlots
  const before = structuredClone(sourceSlots)

  const state = applySteamImportDefaultsToCaseInsert({
    caseInsert: source,
    importedGame: createSteamGame(),
    legalText: 'Copyright Valve Corporation.',
    replaceExisting: true,
    titleArtworkSeed: null,
    ratingCandidate: null,
    brandingSources: createBrandingSources(),
  })

  assert.strictEqual(state.templates.tray.artworkSlots, sourceSlots)
  assert.deepEqual(state.templates.tray.artworkSlots, before)
  assert.deepEqual(
    state.templates.tray.artworkSlots
      .filter(({ id }) => /^tray-artwork-[123]$/.test(id)),
    [],
  )
})

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
    'Puzzle',
    'Action',
    'Steam Achievements',
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

test('Steam import branding defaults enable the cover ESRB rating badge', () => {
  const ratingCandidate = createEsrbRatingCandidate()
  const projectMetadata = {
    ...createDefaultProjectMetadata(),
    ratingSystem: 'ESRB' as const,
    ratingValue: 'M',
  }
  const projectRatingBadge = getCaseInsertRatingBadgeForSteamImport({
    projectMetadata,
    projectRatingBadge: createDefaultProjectRatingBadge(),
    ratingCandidate,
  })
  const state = applyCaseInsertSteamImportBrandingDefaults({
    caseInsert: createDefaultProjectJewelCaseState('Portal 2'),
    ratingCandidate,
    brandingSources: createBrandingSources({
      projectMetadata,
      projectRatingBadge,
    }),
  })
  const coverRatingSlot = getEnabledCaseInsertMarkSlotForKind(
    state.templates.cover.markSlots,
    'rating',
  )

  assert.equal(projectRatingBadge.layout.enabled, true)
  assert.equal(coverRatingSlot?.enabled, true)
  assert.equal(coverRatingSlot?.imageSource?.sourceId, 'case-rating:ESRB:M')
  assert.match(coverRatingSlot?.imageDataUrl ?? '', /rating-badge-esrb-m\.svg/)
  assert.equal(state.templates.tray.markSlots.length, 0)
  assert.equal(state.spine.left.markSlots.length, 0)
  assert.equal(state.spine.right.markSlots.length, 0)
})

test('Steam import branding broad sync does not create tray or spine ESRB badges', () => {
  const ratingCandidate = createEsrbRatingCandidate()
  const projectMetadata = {
    ...createDefaultProjectMetadata(),
    ratingSystem: 'ESRB' as const,
    ratingValue: 'M',
  }
  const projectRatingBadge = getCaseInsertRatingBadgeForSteamImport({
    projectMetadata,
    projectRatingBadge: createDefaultProjectRatingBadge(),
    ratingCandidate,
  })
  const brandingSources = createBrandingSources({
    projectMetadata,
    projectRatingBadge,
  })
  const importDefaultState = applyCaseInsertSteamImportBrandingDefaults({
    caseInsert: createDefaultProjectJewelCaseState('Portal 2'),
    ratingCandidate,
    brandingSources,
  })
  const syncedState = syncProjectJewelCaseBrandingMarkSlots(
    importDefaultState,
    brandingSources,
  )

  assert.equal(
    getEnabledCaseInsertMarkSlotForKind(
      syncedState.templates.cover.markSlots,
      'rating',
    )?.imageSource?.sourceId,
    'case-rating:ESRB:M',
  )
  assert.equal(syncedState.templates.tray.markSlots.length, 0)
  assert.equal(syncedState.spine.left.markSlots.length, 0)
  assert.equal(syncedState.spine.right.markSlots.length, 0)
})

test('Steam import defaults apply tray copy, title artwork seed, and cover rating defaults together', () => {
  const ratingCandidate = createEsrbRatingCandidate()
  const projectMetadata = {
    ...createDefaultProjectMetadata(),
    ratingSystem: 'ESRB' as const,
    ratingValue: 'M',
    copyrightText: 'Copyright 2011 Valve Corporation.',
  }
  const projectRatingBadge = getCaseInsertRatingBadgeForSteamImport({
    projectMetadata,
    projectRatingBadge: createDefaultProjectRatingBadge(),
    ratingCandidate,
  })
  const titleArtworkSeed: CaseInsertTitleArtworkImportSeed = {
    status: 'seeded',
    statusMessage: 'Using Steam logo as the case insert game logo.',
    image: {
      imageDataUrl: 'data:image/png;base64,title-logo',
      imageSize: { width: 320, height: 120 },
    },
    steamArtworkAsset: {
      id: 'steam-logo',
      label: 'Steam logo',
      url: 'https://cdn.example.test/logo.png',
      kind: 'logo',
    },
  }
  const state = applySteamImportDefaultsToCaseInsert({
    caseInsert: createDefaultProjectJewelCaseState('Portal 2'),
    importedGame: createSteamGame(),
    legalText: projectMetadata.copyrightText,
    replaceExisting: true,
    titleArtworkSeed,
    ratingCandidate,
    brandingSources: createBrandingSources({
      projectMetadata,
      projectRatingBadge,
    }),
  })
  const coverRatingSlot = getEnabledCaseInsertMarkSlotForKind(
    state.templates.cover.markSlots,
    'rating',
  )

  assert.equal(getTrayTextBlock(state, 'tray-description').source, 'steam')
  assert.equal(
    getTrayTextBlock(state, 'tray-copyright-text').value,
    'Copyright 2011 Valve Corporation.',
  )
  assert.equal(
    state.templates.cover.titleArtwork.imageDataUrl,
    'data:image/png;base64,title-logo',
  )
  assert.equal(
    state.templates.tray.titleArtwork.imageSource?.sourceId,
    'steam-logo',
  )
  assert.equal(state.spine.left.title.enabled, false)
  assert.equal(state.spine.right.title.enabled, false)
  assert.equal(coverRatingSlot?.enabled, true)
  assert.equal(coverRatingSlot?.imageSource?.sourceId, 'case-rating:ESRB:M')
  assert.equal(state.templates.tray.markSlots.length, 0)
  assert.equal(state.spine.left.markSlots.length, 0)
  assert.equal(state.spine.right.markSlots.length, 0)
})
