import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createBackCoverDescriptionVariants,
  createBackCoverFeatureBullets,
  createFittedSteamBackCoverCopy,
  normalizeSteamBackCoverText,
} from './backCoverCopyFit.ts'
import type { SteamImportedGame } from '../steam/steamApi.ts'

function createSteamGame(
  overrides: Partial<SteamImportedGame> = {},
): SteamImportedGame {
  return {
    appId: 620,
    title: 'Portal 2',
    developer: ['Valve'],
    publisher: ['Valve'],
    genres: ['Puzzle', 'Action'],
    categories: ['Single-player', 'Steam Achievements', 'Co-op'],
    storeUrl: 'https://store.steampowered.com/app/620',
    artwork: [],
    ...overrides,
  }
}

test('normalizes Steam HTML and entities for back-cover text', () => {
  assert.equal(
    normalizeSteamBackCoverText(
      '<p><strong>Minimum:</strong><br>OS: Windows&nbsp;10 &amp; 11</p>',
    ),
    'Minimum:\nOS: Windows 10 & 11',
  )
})

test('creates short, medium, and full description variants', () => {
  const detailedDescription = [
    '<h2>About This Game</h2>',
    '<p>Portal 2 is a puzzle game about testing, portals, and unlikely allies.</p>',
    '<p>It includes a full single-player campaign and a separate co-op campaign with original test chambers.</p>',
    '<p>Community features and commentary round out the package for archive-friendly replay.</p>',
  ].join('')
  const variants = createBackCoverDescriptionVariants({
    detailedDescription,
    shortDescription: 'A compact first-person puzzle game with portals.',
  })

  assert.deepEqual(variants.map(({ id }) => id), ['short', 'medium', 'full'])
  assert.equal(
    variants.find(({ id }) => id === 'short')?.text,
    'A compact first-person puzzle game with portals.',
  )
  assert.match(
    variants.find(({ id }) => id === 'full')?.text ?? '',
    /^Portal 2 is a puzzle game/,
  )
  assert.ok((variants.find(({ id }) => id === 'full')?.text.length ?? 0) <= 720)
})

test('feature bullets prefer explicit feature lists and useful metadata', () => {
  const bullets = createBackCoverFeatureBullets(createSteamGame({
    detailedDescription:
      '<h2>Features</h2><ul><li>Mind-bending portal puzzles</li><li>Two-player cooperative testing</li></ul>',
  }))

  assert.deepEqual(bullets, [
    'Mind-bending portal puzzles',
    'Two-player cooperative testing',
    'Single-player',
    'Co-op',
    'Puzzle',
  ])
})

test('fitted Steam copy warns when lower-priority copy is too dense', () => {
  const copy = createFittedSteamBackCoverCopy(createSteamGame({
    minimumRequirements: Array.from(
      { length: 12 },
      (_, index) => `Requirement line ${index + 1}`,
    ).join('<br>'),
    legalNotice: Array.from(
      { length: 7 },
      (_, index) => `Legal notice ${index + 1}`,
    ).join('<br>'),
  }))

  assert.ok(copy.warnings.some((warning) =>
    /Steam requirements are long/.test(warning)))
  assert.ok(copy.warnings.some((warning) =>
    /Legal text is long/.test(warning)))
})
