import assert from 'node:assert/strict'
import test from 'node:test'
import { createDefaultProjectMetadata } from '../project/projectMetadata.ts'
import type { ProjectMetadata } from '../project/projectTypes.ts'
import type { SteamImportedGame } from '../steam/steamApi.ts'
import type {
  LegalTextCandidate,
  RatingBoardCandidate,
  SteamMetadataCandidateDiscoveryResult,
} from '../steam/steamMetadataCandidates.ts'
import {
  createSteamImportMetadataPlan,
  createSteamMetadataAutoApplyPlan,
  createSteamMetadataCandidateFields,
  getAutoAppliedMetadataCandidateStatusMessage,
} from './appSteamImportPlan.ts'

function createImportedGame(overrides: Partial<SteamImportedGame> = {}): SteamImportedGame {
  return {
    appId: 620,
    title: 'Portal 2',
    developer: ['Valve'],
    publisher: ['Valve'],
    releaseDate: '2011-04-18',
    genres: [],
    categories: [],
    storeUrl: 'https://store.steampowered.com/app/620/Portal_2/',
    artwork: [],
    ...overrides,
  }
}

function createRatingCandidate(
  overrides: Partial<RatingBoardCandidate> = {},
): RatingBoardCandidate {
  return {
    id: 'esrb-e10',
    boardId: 'esrb',
    boardLabel: 'ESRB',
    rawRating: 'E10+',
    displayRating: 'E10+',
    ratingSystem: 'ESRB',
    ratingValue: 'E10+',
    applyKind: 'rating',
    canApply: true,
    confidence: 'high',
    source: 'steam-appdetails',
    sourceLabel: 'Steam app details',
    sourceUrl: null,
    descriptors: [],
    reasons: [],
    ...overrides,
  }
}

function createLegalCandidate(
  overrides: Partial<LegalTextCandidate> = {},
): LegalTextCandidate {
  return {
    id: 'legal',
    text: 'Copyright 2011 Valve Corporation. All rights reserved.',
    confidence: 'high',
    source: 'steam-appdetails',
    sourceLabel: 'Steam app details',
    sourceUrl: null,
    reasons: [],
    ...overrides,
  }
}

function createCandidateResult(
  overrides: Partial<SteamMetadataCandidateDiscoveryResult> = {},
): SteamMetadataCandidateDiscoveryResult {
  return {
    ratingCandidates: [],
    legalCandidates: [],
    sourceStatuses: [],
    ...overrides,
  }
}

function createMetadata(overrides: Partial<ProjectMetadata> = {}): ProjectMetadata {
  return {
    ...createDefaultProjectMetadata(),
    ...overrides,
  }
}

test('Steam import metadata plan preserves existing scoped fields for the same selected game without candidates', () => {
  const selectedSteamGame = createImportedGame()
  const plan = createSteamImportMetadataPlan({
    importedGame: selectedSteamGame,
    selectedSteamGame,
    projectMetadata: createMetadata({
      ratingSystem: 'PEGI',
      ratingValue: '12',
      copyrightText: 'Existing legal text.',
    }),
    metadataCandidateResult: createCandidateResult(),
  })

  assert.equal(plan.isDifferentSelectedSteamGame, false)
  assert.equal(plan.autoRatingCandidate, null)
  assert.equal(plan.autoLegalCandidate, null)
  assert.equal(plan.shouldResetGameScopedRating, false)
  assert.equal(plan.shouldResetGameScopedLegal, false)
  assert.equal(plan.shouldUpdateCopyrightDiscTextSource, false)
  assert.equal(plan.nextProjectMetadata.title, 'Portal 2')
  assert.equal(plan.nextProjectMetadata.steamAppId, '620')
  assert.equal(plan.nextProjectMetadata.ratingSystem, 'PEGI')
  assert.equal(plan.nextProjectMetadata.ratingValue, '12')
  assert.equal(plan.nextProjectMetadata.copyrightText, 'Existing legal text.')
})

test('Steam import metadata plan resets game-scoped fields when changing games without candidates', () => {
  const plan = createSteamImportMetadataPlan({
    importedGame: createImportedGame({ appId: 400, title: 'Portal' }),
    selectedSteamGame: createImportedGame({ appId: 620, title: 'Portal 2' }),
    projectMetadata: createMetadata({
      ratingSystem: 'ESRB',
      ratingValue: 'E10+',
      copyrightText: 'Old game legal text.',
    }),
    metadataCandidateResult: createCandidateResult(),
  })

  assert.equal(plan.isDifferentSelectedSteamGame, true)
  assert.equal(plan.shouldResetGameScopedRating, true)
  assert.equal(plan.shouldResetGameScopedLegal, true)
  assert.equal(plan.shouldUpdateCopyrightDiscTextSource, true)
  assert.equal(plan.nextProjectMetadata.title, 'Portal')
  assert.equal(plan.nextProjectMetadata.steamAppId, '400')
  assert.equal(plan.nextProjectMetadata.ratingSystem, 'none')
  assert.equal(plan.nextProjectMetadata.ratingValue, '')
  assert.equal(plan.nextProjectMetadata.copyrightText, '')
})

test('Steam import metadata plan applies candidate values over different-game reset defaults', () => {
  const ratingCandidate = createRatingCandidate()
  const legalCandidate = createLegalCandidate()
  const plan = createSteamImportMetadataPlan({
    importedGame: createImportedGame({ appId: 730, title: 'Counter-Strike 2' }),
    selectedSteamGame: createImportedGame({ appId: 620, title: 'Portal 2' }),
    projectMetadata: createMetadata({
      ratingSystem: 'PEGI',
      ratingValue: '12',
      copyrightText: 'Old game legal text.',
    }),
    metadataCandidateResult: createCandidateResult({
      ratingCandidates: [ratingCandidate],
      legalCandidates: [legalCandidate],
    }),
  })

  assert.equal(plan.autoRatingCandidate, ratingCandidate)
  assert.equal(plan.autoLegalCandidate, legalCandidate)
  assert.equal(plan.shouldUpdateCopyrightDiscTextSource, true)
  assert.equal(plan.nextProjectMetadata.ratingSystem, 'ESRB')
  assert.equal(plan.nextProjectMetadata.ratingValue, 'E10+')
  assert.equal(
    plan.nextProjectMetadata.copyrightText,
    'Copyright 2011 Valve Corporation. All rights reserved.',
  )
})

test('Steam metadata auto-apply plan returns candidate fields without side effects', () => {
  const ratingCandidate = createRatingCandidate()
  const legalCandidate = createLegalCandidate()
  const plan = createSteamMetadataAutoApplyPlan({
    metadataCandidateResult: createCandidateResult({
      ratingCandidates: [ratingCandidate],
      legalCandidates: [legalCandidate],
    }),
    projectMetadata: createMetadata(),
  })

  assert.equal(plan.ratingCandidate, ratingCandidate)
  assert.equal(plan.legalCandidate, legalCandidate)
  assert.deepEqual(plan.metadataFields, {
    ratingSystem: 'ESRB',
    ratingValue: 'E10+',
    copyrightText: 'Copyright 2011 Valve Corporation. All rights reserved.',
  })
})

test('Steam metadata candidate fields omit unavailable auto-apply candidates', () => {
  assert.deepEqual(
    createSteamMetadataCandidateFields({
      ratingCandidate: null,
      legalCandidate: createLegalCandidate(),
    }),
    {
      copyrightText: 'Copyright 2011 Valve Corporation. All rights reserved.',
    },
  )

  assert.deepEqual(
    createSteamMetadataCandidateFields({
      ratingCandidate: createRatingCandidate(),
      legalCandidate: null,
    }),
    {
      ratingSystem: 'ESRB',
      ratingValue: 'E10+',
    },
  )

  assert.deepEqual(
    createSteamMetadataCandidateFields({
      ratingCandidate: null,
      legalCandidate: null,
    }),
    {},
  )
})

test('Steam metadata auto-apply status message preserves disc and metadata wording', () => {
  const ratingCandidate = createRatingCandidate()
  const legalCandidate = createLegalCandidate()

  assert.equal(
    getAutoAppliedMetadataCandidateStatusMessage(ratingCandidate, legalCandidate),
    'Auto-applied ESRB E10+ rating badge and curved copyright/legal text.',
  )
  assert.equal(
    getAutoAppliedMetadataCandidateStatusMessage(ratingCandidate, legalCandidate, {
      applyDiscVisualDefaults: false,
    }),
    'Auto-applied ESRB E10+ rating metadata and copyright/legal metadata.',
  )
  assert.equal(
    getAutoAppliedMetadataCandidateStatusMessage(null, null),
    null,
  )
})
