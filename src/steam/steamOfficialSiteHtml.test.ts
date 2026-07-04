import assert from 'node:assert/strict'
import test from 'node:test'
import {
  extractOfficialStylesheetUrlsFromHtml,
  getOfficialHtmlDisplaySelector,
  getOfficialHtmlTagAttributes,
  parseOfficialHtmlImageSeeds,
  parseOfficialSrcsetEntries,
} from './steamOfficialSiteHtml.ts'

test('official-site HTML helpers parse attributes and display selectors', () => {
  const attrs = getOfficialHtmlTagAttributes(
    '<img id="brand logo" class="nav logo weird@value extra fifth" alt="CD &amp; Projekt">',
  )

  assert.equal(attrs.id, 'brand logo')
  assert.equal(attrs.class, 'nav logo weird@value extra fifth')
  assert.equal(attrs.alt, 'CD & Projekt')
  assert.equal(
    getOfficialHtmlDisplaySelector('IMG', attrs),
    'img#brand.nav.logo.weirdvalue.extra',
  )
})

test('official-site HTML helper parses srcset entries without dropping order', () => {
  const entries = parseOfficialSrcsetEntries(
    '/img/logo-320.png 320w, /img/logo-640.png 640w, javascript:alert(1) 960w',
    'https://www.example.com/assets/page.html',
  )

  assert.deepEqual(entries, [
    {
      url: 'https://www.example.com/img/logo-320.png',
      width: 320,
    },
    {
      url: 'https://www.example.com/img/logo-640.png',
      width: 640,
    },
  ])
})

test('official-site HTML helper extracts stylesheet URLs with HTTPS and dedupe guards', () => {
  const urls = extractOfficialStylesheetUrlsFromHtml(
    `
      <link rel="stylesheet" href="/assets/site.css#v1">
      <link type="text/css" href="/assets/site.css#v2">
      <link rel="preload" href="http://cdn.example.com/insecure.css">
      <link rel="preload" href="/assets/logo.svg">
    `,
    'https://www.example.com/games/',
  )

  assert.deepEqual(urls, ['https://www.example.com/assets/site.css'])
})

test('official-site HTML helper assembles ordered image seeds', () => {
  const seeds = parseOfficialHtmlImageSeeds(
    `
      <meta property="og:image" content="/assets/share.jpg">
      <link rel="icon" sizes="32x32" href="/favicon.png">
      <img id="brand" class="site-logo" src="/assets/logo.svg" srcset="/assets/logo-2x.png 640w" alt="Example logo" width="320" height="120">
      <picture><source srcset="/assets/wordmark.webp 480w" title="Wordmark"></picture>
      <span class="logo-video" style="background-image: url('/assets/brand-bg.png')"></span>
    `,
    'https://www.example.com/about/',
  )

  assert.deepEqual(
    seeds.map((seed) => seed.sourceKind),
    [
      'official-meta-image',
      'favicon',
      'official-img',
      'official-srcset',
      'official-srcset',
      'official-css-background',
    ],
  )
  assert.equal(seeds[0].label, 'Official Open Graph image')
  assert.equal(seeds[1].width, 32)
  assert.equal(seeds[2].selector, 'img#brand.site-logo')
  assert.equal(seeds[3].selector, 'img#brand.site-logo[srcset]')
  assert.equal(seeds[4].selector, 'source[srcset]')
  assert.equal(seeds[5].label, 'span.logo-video background image')
})
