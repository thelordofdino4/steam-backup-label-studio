import test from 'node:test'
import assert from 'node:assert/strict'
import {
  extractOfficialSiteUrlsFromSteamHtml,
  parseOfficialLogoCandidatesFromCss,
  parseOfficialLogoCandidatesFromHtml,
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

test('extracts official website URLs from Steam linkfilter links', () => {
  const html = `
    <a class="btnv6_blue_hoverfade" href="https://steamcommunity.com/linkfilter/?u=https%3A%2F%2Fwww.cdprojektred.com%2Fen">Official website</a>
    <a href="https://steamcommunity.com/linkfilter/?url=https%3A%2F%2Fwww.youtube.com%2Fcdprojektred">YouTube</a>
    <a href="https://store.steampowered.com/developer/cdprojektred">Steam page</a>
  `
  const urls = extractOfficialSiteUrlsFromSteamHtml(
    html,
    'https://store.steampowered.com/developer/cdprojektred',
  )

  assert.deepEqual(urls, ['https://www.cdprojektred.com/en'])
})

test('extracts official-site images, srcsets, metadata, icons, and inline backgrounds', () => {
  const html = `
    <meta property="og:image" content="/assets/cd-projekt-red-social.jpg">
    <link rel="icon" sizes="32x32" href="/favicon.png">
    <img class="site-logo brand" src="/assets/cd-projekt-red-logo.svg" alt="CD PROJEKT RED logo" width="480" height="120">
    <img srcset="/assets/cdprojektred-wordmark-320.png 320w, /assets/cdprojektred-wordmark-640.png 640w" alt="CD PROJEKT RED wordmark">
    <picture><source srcset="/assets/cdprojektred-mark.webp 2x"></picture>
    <a class="logo-video" style="background-image: url('/assets/cdprojektred-logo-video.png')"></a>
  `
  const candidates = parseOfficialLogoCandidatesFromHtml(
    html,
    'https://www.cdprojektred.com/en',
    ['CD PROJEKT RED'],
  )

  assert.ok(candidates.some((candidate) => candidate.sourceKind === 'official-img'))
  assert.ok(candidates.some((candidate) => candidate.sourceKind === 'official-srcset'))
  assert.ok(candidates.some((candidate) => candidate.sourceKind === 'official-meta-image'))
  assert.ok(candidates.some((candidate) => candidate.sourceKind === 'favicon'))
  assert.ok(candidates.some((candidate) => candidate.selector === 'a.logo-video'))
  assert.equal(candidates[0].url, 'https://www.cdprojektred.com/assets/cd-projekt-red-logo.svg')
  assert.ok(candidates[0].reasons.includes('Logo-like filename or metadata'))
  assert.ok(candidates[0].reasons.includes('Header, nav, or logo selector'))
})

test('extracts CSS-backed official logo candidates with selector context', () => {
  const css = `
    .logo-video { background-image: url("../images/cdprojektred-logo.svg"); }
    .social-twitter { background-image: url("../images/twitter.svg"); }
    @media (min-width: 800px) { .nav-brand { background: url("../images/brand-wordmark.png"); } }
  `
  const candidates = parseOfficialLogoCandidatesFromCss(
    css,
    'https://www.cdprojektred.com/styles/main.css',
    ['CD PROJEKT RED'],
  )
  const logoCandidate = candidates.find((candidate) => candidate.selector === '.logo-video')
  const socialCandidate = candidates.find((candidate) => candidate.selector === '.social-twitter')

  assert.ok(logoCandidate)
  assert.equal(logoCandidate.sourceKind, 'official-css-background')
  assert.equal(logoCandidate.fileType, 'svg')
  assert.ok(logoCandidate.reasons.includes('Header, nav, or logo selector'))
  assert.ok(socialCandidate)
  assert.ok(logoCandidate.score > socialCandidate.score)
  assert.ok(socialCandidate.reasons.includes('Social icon signal'))
})
