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
  assert.equal(candidates[0].targetWorkflow, 'branding-logo')
  assert.equal(candidates[0].contentKind, 'logo')
  assert.ok(candidates[0].reasons.includes('Steam curator avatar'))
})

test('extracts Steam page metadata image candidates and filters social-logo trash', () => {
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

  assert.equal(candidates.length, 2)
  assert.ok(candidates.every((candidate) => candidate.sourceKind === 'steam-meta-image'))
  assert.ok(candidates.every((candidate) => candidate.targetWorkflow === 'branding-logo'))
  assert.ok(candidates.some((candidate) => candidate.fileType === 'svg'))
  assert.ok(candidates.every((candidate) => !candidate.url.includes('twitter-logo')))
  assert.ok(candidates.some((candidate) => candidate.reasons.includes('Unknown dimensions')))
})

test('filters social and tiny icon candidates before logo lists', () => {
  const html = `
    <img class="brand logo" src="https://shared.akamai.steamstatic.com/store_item_assets/developer/valve/valve-logo.png" width="360" height="120" alt="Valve logo">
    <img class="social twitter icon" src="https://shared.akamai.steamstatic.com/store_item_assets/developer/valve/twitter-icon.png" width="24" height="24" alt="Twitter">
  `
  const candidates = parseSteamLogoCandidatesFromHtml(
    html,
    'https://store.steampowered.com/developer/valve',
    ['Valve'],
  )

  assert.equal(candidates.length, 1)
  assert.equal(candidates[0].url, 'https://shared.akamai.steamstatic.com/store_item_assets/developer/valve/valve-logo.png')
  assert.equal(candidates[0].targetWorkflow, 'branding-logo')
})

test('rejects generic Steam platform branding and non-matching Valve branding', () => {
  const html = `
    <img class="brand logo" src="https://shared.akamai.steamstatic.com/public/images/v6/steam-logo.svg" width="320" height="80" alt="Steam logo">
    <img class="brand logo" src="https://shared.akamai.steamstatic.com/public/images/v6/home-logo.png" width="320" height="80" alt="Steam homepage">
    <img class="brand logo" src="https://shared.akamai.steamstatic.com/store_item_assets/developer/valve/valve-logo.png" width="360" height="120" alt="Valve logo">
  `
  const unrelatedCandidates = parseSteamLogoCandidatesFromHtml(
    html,
    'https://store.steampowered.com/app/1234',
    ['Some Studio'],
  )
  const valveCandidates = parseSteamLogoCandidatesFromHtml(
    html,
    'https://store.steampowered.com/developer/valve',
    ['Valve'],
  )

  assert.equal(unrelatedCandidates.length, 0)
  assert.equal(valveCandidates.length, 1)
  assert.equal(valveCandidates[0].url, 'https://shared.akamai.steamstatic.com/store_item_assets/developer/valve/valve-logo.png')
  assert.ok(valveCandidates.every((candidate) => !candidate.url.includes('steam-logo')))
  assert.ok(valveCandidates.every((candidate) => !candidate.url.includes('home-logo')))
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

test('extracts official-site images and routes logo-like versus artwork-like candidates', () => {
  const html = `
    <meta property="og:image" content="/assets/cd-projekt-red-social.jpg">
    <link rel="icon" sizes="32x32" href="/favicon.png">
    <img class="site-logo brand" src="/assets/cd-projekt-red-logo.svg" alt="CD PROJEKT RED logo" width="480" height="120">
    <img class="hero" src="/assets/the-witcher-key-art.jpg" alt="The Witcher key art" width="1200" height="630">
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
  assert.ok(candidates.some((candidate) => candidate.selector === 'a.logo-video'))
  assert.equal(candidates[0].url, 'https://www.cdprojektred.com/assets/cd-projekt-red-logo.svg')
  assert.ok(candidates[0].reasons.includes('Logo-like filename or metadata'))
  assert.ok(candidates[0].reasons.includes('Header, nav, or logo selector'))
  assert.equal(candidates[0].targetWorkflow, 'branding-logo')

  const socialShareCandidate = candidates.find((candidate) => candidate.url.endsWith('/assets/cd-projekt-red-social.jpg'))
  const keyArtCandidate = candidates.find((candidate) => candidate.url.endsWith('/assets/the-witcher-key-art.jpg'))
  const faviconCandidate = candidates.find((candidate) => candidate.sourceKind === 'favicon')

  assert.ok(socialShareCandidate)
  assert.equal(socialShareCandidate.targetWorkflow, 'artwork')
  assert.ok(socialShareCandidate.routingReasons.includes('Artwork-like image routed to Artwork'))
  assert.ok(keyArtCandidate)
  assert.equal(keyArtCandidate.targetWorkflow, 'artwork')
  assert.equal(faviconCandidate, undefined)
})

test('extracts CSS-backed official logo candidates with selector context', () => {
  const css = `
    .logo-video { background-image: url("../images/cdprojektred-logo.svg"); }
    .social-twitter { background-image: url("../images/twitter.svg"); }
    .nav-brand { background: url("../images/brand-wordmark.png"); }
  `
  const candidates = parseOfficialLogoCandidatesFromCss(
    css,
    'https://www.cdprojektred.com/styles/main.css',
    ['CD PROJEKT RED'],
  )
  const logoCandidate = candidates.find((candidate) => candidate.selector === '.logo-video')
  const socialCandidate = candidates.find((candidate) => candidate.selector === '.social-twitter')
  const navBrandCandidate = candidates.find((candidate) => candidate.selector === '.nav-brand')

  assert.ok(logoCandidate)
  assert.equal(logoCandidate.sourceKind, 'official-css-background')
  assert.equal(logoCandidate.fileType, 'svg')
  assert.ok(logoCandidate.reasons.includes('Header, nav, or logo selector'))
  assert.equal(logoCandidate.targetWorkflow, 'branding-logo')
  assert.equal(socialCandidate, undefined)
  assert.ok(navBrandCandidate)
  assert.equal(navBrandCandidate.targetWorkflow, 'branding-logo')
})

test('rejects tracker pixel, analytics, and sprite candidates from official sites', () => {
  const html = `
    <img class="site-logo" src="/assets/example-logo.svg" alt="Example logo" width="360" height="100">
    <img src="/analytics/tracking-pixel.gif" width="1" height="1" alt="">
    <img class="sprite" src="/assets/ui-sprite.png" width="512" height="512" alt="Sprite sheet">
    <span style="background-image: url('/beacon/analytics-pixel.png')"></span>
  `
  const candidates = parseOfficialLogoCandidatesFromHtml(
    html,
    'https://www.example.com',
    ['Example'],
  )

  assert.equal(candidates.length, 1)
  assert.equal(candidates[0].url, 'https://www.example.com/assets/example-logo.svg')
  assert.equal(candidates[0].targetWorkflow, 'branding-logo')
})
