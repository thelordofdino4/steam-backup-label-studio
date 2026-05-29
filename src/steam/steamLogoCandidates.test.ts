import test from 'node:test'
import assert from 'node:assert/strict'
import {
  parseSteamLogoCandidatesFromHtml,
} from './steamLogoCandidates.ts'

test('extracts Steam curator avatar candidates', () => {
  const candidates = parseSteamLogoCandidatesFromHtml(
    '<img class="curator_avatar" src="https://shared.akamai.steamstatic.com/store_item_assets/developer/valve/avatar.png" width="184" height="184" alt="Valve">',
    'https://store.steampowered.com/developer/valve',
    ['Valve'],
  )

  assert.equal(candidates.length, 1)
  assert.equal(candidates[0].sourceKind, 'steam-avatar')
  assert.equal(candidates[0].selector, 'img.curator_avatar')
  assert.equal(candidates[0].fileType, 'png')
  assert.equal(candidates[0].transparencyHint, true)
  assert.ok(candidates[0].reasons.includes('Steam curator avatar'))
})

test('extracts Steam page metadata image candidates', () => {
  const html = `
    <link rel="image_src" href="https://shared.akamai.steamstatic.com/store_item_assets/developer/valve/logo.svg">
    <meta property="og:image" content="https://shared.akamai.steamstatic.com/store_item_assets/developer/valve/logo.png">
    <meta name="twitter:image" content="/store_item_assets/developer/valve/twitter-logo.webp">
  `
  const candidates = parseSteamLogoCandidatesFromHtml(
    html,
    'https://store.steampowered.com/developer/valve',
    ['Valve'],
  )

  assert.equal(candidates.length, 3)
  assert.ok(candidates.every((candidate) => candidate.sourceKind === 'steam-meta-image'))
  assert.ok(candidates.some((candidate) => candidate.fileType === 'svg'))
  assert.ok(candidates.some((candidate) => candidate.url === 'https://store.steampowered.com/store_item_assets/developer/valve/twitter-logo.webp'))
})

test('scores logo-like PNG candidates above social and tiny icon candidates', () => {
  const html = `
    <img class="brand logo" src="https://shared.akamai.steamstatic.com/store_item_assets/developer/valve/valve-logo.png" width="360" height="120" alt="Valve logo">
    <img class="social twitter icon" src="https://shared.akamai.steamstatic.com/store_item_assets/developer/valve/twitter-icon.png" width="24" height="24" alt="Twitter">
  `
  const candidates = parseSteamLogoCandidatesFromHtml(
    html,
    'https://store.steampowered.com/developer/valve',
    ['Valve'],
  )

  assert.equal(candidates[0].url, 'https://shared.akamai.steamstatic.com/store_item_assets/developer/valve/valve-logo.png')
  assert.ok(candidates[0].score > candidates[1].score)
  assert.ok(candidates[1].reasons.includes('Social icon signal'))
  assert.ok(candidates[1].reasons.includes('Very small image'))
})

test('deduplicates repeated candidate URLs and preserves reasons', () => {
  const html = `
    <meta property="og:image" content="https://shared.akamai.steamstatic.com/store_item_assets/developer/valve/logo.png">
    <img class="brand logo" src="https://shared.akamai.steamstatic.com/store_item_assets/developer/valve/logo.png" width="360" height="120" alt="Valve logo">
  `
  const candidates = parseSteamLogoCandidatesFromHtml(
    html,
    'https://store.steampowered.com/developer/valve',
    ['Valve'],
  )

  assert.equal(candidates.length, 1)
  assert.ok(candidates[0].reasons.includes('Steam page metadata image'))
  assert.ok(candidates[0].reasons.includes('Logo-like filename or metadata'))
  assert.equal(candidates[0].sourceKind, 'steam-meta-image')
})
