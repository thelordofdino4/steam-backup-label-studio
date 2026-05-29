import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildSteamMetadataCandidatesFromImportedGame,
  getAutoApplyLegalTextCandidate,
  getAutoApplyRatingCandidate,
  parseSteamMetadataCandidatesFromHtml,
  parseSteamRatingCandidatesFromHtml,
} from './steamMetadataCandidates.ts'
import type { SteamImportedGame } from './steamApi.ts'

function createSteamGame(overrides: Partial<SteamImportedGame> = {}): SteamImportedGame {
  return {
    appId: 123,
    title: 'Example Game',
    developer: ['Example Studio'],
    publisher: ['Example Publisher'],
    releaseDate: 'Jan 1, 2026',
    shortDescription: 'Example short description.',
    detailedDescription: 'Example detailed description.',
    genres: ['Action'],
    categories: ['Single-player'],
    minimumRequirements: '',
    recommendedRequirements: '',
    storeUrl: 'https://store.steampowered.com/app/123/Example_Game/',
    artwork: [],
    ...overrides,
  }
}

test('builds high-confidence ESRB, PEGI, and legal candidates from Steam appdetails', () => {
  const result = buildSteamMetadataCandidatesFromImportedGame(
    createSteamGame({
      ratings: {
        esrb: {
          rating: 'm',
          descriptors: 'Blood and Gore\r\nStrong Language',
        },
        pegi: {
          rating: '18',
          descriptors: 'Violence\r\nBad language',
        },
      },
      legalNotice:
        'Example Game © Example Studio. Example Game is a trademark of Example Studio. All rights reserved.',
    }),
  )

  const esrbCandidate = result.ratingCandidates.find(
    (candidate) => candidate.ratingSystem === 'ESRB',
  )
  const pegiCandidate = result.ratingCandidates.find(
    (candidate) => candidate.ratingSystem === 'PEGI',
  )

  assert.equal(esrbCandidate?.ratingValue, 'M')
  assert.equal(esrbCandidate?.confidence, 'high')
  assert.deepEqual(esrbCandidate?.descriptors, ['Blood and Gore', 'Strong Language'])
  assert.equal(pegiCandidate?.ratingValue, '18')
  assert.equal(result.legalCandidates.length, 1)
  assert.equal(result.legalCandidates[0].confidence, 'high')
  assert.match(result.legalCandidates[0].text, /All rights reserved/)
})

test('represents other regional ratings as custom candidates without inventing ESRB or PEGI', () => {
  const result = buildSteamMetadataCandidatesFromImportedGame(
    createSteamGame({
      ratings: {
        usk: {
          rating: '12',
        },
        dejus: {
          rating: '10',
          descriptors: 'Violência',
        },
      },
    }),
  )

  assert.equal(
    result.ratingCandidates.some(
      (candidate) => candidate.ratingSystem === 'ESRB' || candidate.ratingSystem === 'PEGI',
    ),
    false,
  )
  assert.ok(
    result.ratingCandidates.some(
      (candidate) =>
        candidate.boardLabel === 'USK' &&
        candidate.ratingSystem === 'custom' &&
        candidate.ratingValue === 'USK 12',
    ),
  )
})

test('represents unrated board data as a no-rating candidate', () => {
  const result = buildSteamMetadataCandidatesFromImportedGame(
    createSteamGame({
      ratings: {
        esrb: {
          rating: 'Unrated',
        },
      },
    }),
  )

  assert.equal(result.ratingCandidates.length, 1)
  assert.equal(result.ratingCandidates[0].boardLabel, 'ESRB')
  assert.equal(result.ratingCandidates[0].ratingSystem, 'none')
  assert.equal(result.ratingCandidates[0].ratingValue, '')
  assert.equal(result.ratingCandidates[0].applyKind, 'none')
})

test('auto-applies only ESRB rating candidates for the current US default', () => {
  const pegiOnly = buildSteamMetadataCandidatesFromImportedGame(
    createSteamGame({
      ratings: {
        pegi: {
          rating: '16',
        },
      },
    }),
  )
  const esrbAndPegi = buildSteamMetadataCandidatesFromImportedGame(
    createSteamGame({
      ratings: {
        esrb: {
          rating: 't',
        },
        pegi: {
          rating: '16',
        },
      },
    }),
  )

  assert.equal(getAutoApplyRatingCandidate(pegiOnly.ratingCandidates), null)
  assert.equal(
    getAutoApplyRatingCandidate(esrbAndPegi.ratingCandidates)?.ratingValue,
    'T',
  )
})

test('auto-applies the best legal text candidate when one is available', () => {
  const result = buildSteamMetadataCandidatesFromImportedGame(
    createSteamGame({
      legalNotice:
        'Example Game © Example Studio. Example Game is a trademark of Example Studio. All rights reserved.',
    }),
  )

  assert.equal(
    getAutoApplyLegalTextCandidate(result.legalCandidates)?.text,
    'Example Game © Example Studio. Example Game is a trademark of Example Studio. All rights reserved.',
  )
})

test('does not auto-apply verbose service or account requirement notices', () => {
  const verboseNotice = [
    'Internet connection; EA Account; Steam Account; acceptance of the EA User Agreement and download of client software required to play.',
    'EA Privacy & Cookie Policy applies to your use of EA services and online features may be retired after notice.',
    'This game includes optional in-game purchases of virtual currency that can be used to acquire virtual in-game items.',
    'The Sims and EA are trademarks of Electronic Arts Inc. © Electronic Arts Inc. All rights reserved.',
  ].join(' ')
  const result = buildSteamMetadataCandidatesFromImportedGame(
    createSteamGame({
      legalNotice: verboseNotice,
    }),
  )

  assert.equal(result.legalCandidates.length, 1)
  assert.equal(getAutoApplyLegalTextCandidate(result.legalCandidates), null)
})

test('parses rating and legal snippets from Steam page HTML', () => {
  const result = parseSteamMetadataCandidatesFromHtml(
    `
      <div class="game_page_autocollapse_ctn">
        <img class="rating_icon" alt="ESRB Rating: Mature 17+" src="https://store.akamai.steamstatic.com/public/images/ratings/esrb_m.png">
      </div>
      <div class="game_area_legal">
        Example Game © Example Studio. Example Game and Example Studio are trademarks of Example Studio. All rights reserved.
      </div>
    `,
    'https://store.steampowered.com/app/123/Example_Game/',
  )

  assert.equal(result.ratingCandidates.length, 1)
  assert.equal(result.ratingCandidates[0].ratingSystem, 'ESRB')
  assert.equal(result.ratingCandidates[0].ratingValue, 'M')
  assert.equal(result.legalCandidates.length, 1)
  assert.match(result.legalCandidates[0].text, /Example Studio/)
  assert.equal(getAutoApplyRatingCandidate(result.ratingCandidates), null)
  assert.equal(getAutoApplyLegalTextCandidate(result.legalCandidates), null)
})

test('does not invent ratings from Steam content descriptor blocks', () => {
  const candidates = parseSteamRatingCandidatesFromHtml(
    `
      <div class="shared_game_rating">
        <div class="game_rating_title">Content</div>
        <div class="game_rating_descriptors">
          <div class="block_title">Includes Interactive Elements</div>
          <p class="descriptorText">Online interactivity</p>
        </div>
      </div>
    `,
    'https://store.steampowered.com/app/620/Portal_2/',
  )

  assert.equal(candidates.length, 0)
})
