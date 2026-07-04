import assert from 'node:assert/strict'
import test from 'node:test'
import {
  extractOfficialCssUrls,
  parseOfficialCssImageSeeds,
} from './steamOfficialSiteCss.ts'

test('official CSS URL extraction resolves relative URLs and keeps order', () => {
  const urls = extractOfficialCssUrls(
    `
      background-image: url("../images/studio-logo.svg");
      mask-image: url('/icons/brand-mark.webp?v=2#shape');
      background: url("data:image/svg+xml;base64,abc");
      cursor: url(javascript:alert(1));
      border-image: url("../images/studio-logo.svg");
    `,
    'https://www.example.com/assets/css/site.css',
  )

  assert.deepEqual(urls, [
    'https://www.example.com/assets/images/studio-logo.svg',
    'https://www.example.com/icons/brand-mark.webp?v=2#shape',
  ])
})

test('official CSS image seed parsing preserves selector context', () => {
  const seeds = parseOfficialCssImageSeeds(
    `
      .nav-brand,
      .site-logo { background-image: url("../images/logo.svg"); }
      .hero { background: url("../images/key-art.jpg") center / cover; }
    `,
    'https://www.example.com/styles/main.css',
  )

  assert.deepEqual(
    seeds.map(({ url, label, selector }) => ({ url, label, selector })),
    [
      {
        url: 'https://www.example.com/images/logo.svg',
        label: '.nav-brand, .site-logo CSS image',
        selector: '.nav-brand, .site-logo',
      },
      {
        url: 'https://www.example.com/images/key-art.jpg',
        label: '.hero CSS image',
        selector: '.hero',
      },
    ],
  )
  assert.ok(seeds[0].context.startsWith('.nav-brand, .site-logo {'))
})

test('official CSS image seed parsing falls back for loose URL references', () => {
  const seeds = parseOfficialCssImageSeeds(
    '@font-face src url("../fonts/font.woff2"); /* url("../images/logo.png") */',
    'https://www.example.com/styles/main.css',
  )

  assert.deepEqual(
    seeds.map(({ url, label, selector }) => ({ url, label, selector })),
    [
      {
        url: 'https://www.example.com/fonts/font.woff2',
        label: 'Official stylesheet image',
        selector: 'stylesheet',
      },
      {
        url: 'https://www.example.com/images/logo.png',
        label: 'Official stylesheet image',
        selector: 'stylesheet',
      },
    ],
  )
  assert.equal(seeds[0].sourceKind, 'official-css-background')
})
