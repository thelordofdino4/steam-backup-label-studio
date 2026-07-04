import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getMediaMarkPlaceholderImageUrl,
} from '../assets/assetManifest.ts'
import {
  MEDIA_MARK_OPTIONS,
  MEDIA_MARK_THEME_OPTIONS,
  createDefaultProjectMediaMark,
  getMediaMarkLabel,
  mediaMarkSupportsTheme,
  normalizeProjectMediaMark,
  updateMediaMarkTheme,
} from './projectMediaMark.ts'

test('media mark options include a Blu-ray built-in generic mark', () => {
  assert.ok(MEDIA_MARK_OPTIONS.some((option) => option.value === 'bluRay' && option.label === 'Blu-ray'))

  const normalized = normalizeProjectMediaMark({
    value: 'bluRay',
    source: 'placeholder',
  })

  assert.equal(normalized.value, 'bluRay')
  assert.equal(getMediaMarkLabel(normalized.value), 'Blu-ray')
})

test('themed media marks support a persisted built-in theme', () => {
  assert.deepEqual(MEDIA_MARK_THEME_OPTIONS.map((option) => option.value), ['light', 'dark'])
  assert.equal(mediaMarkSupportsTheme('cdRom'), true)
  assert.equal(mediaMarkSupportsTheme('dataDisc'), true)
  assert.equal(mediaMarkSupportsTheme('dvd'), true)
  assert.equal(mediaMarkSupportsTheme('dvdRom'), true)
  assert.equal(mediaMarkSupportsTheme('installDisc'), true)
  assert.equal(mediaMarkSupportsTheme('bluRay'), false)

  const themedMark = updateMediaMarkTheme(
    {
      ...createDefaultProjectMediaMark(),
      value: 'cdRom',
    },
    'dark',
  )

  assert.equal(themedMark.theme, 'dark')

  const normalized = normalizeProjectMediaMark({
    value: 'cdRom',
    source: 'placeholder',
    theme: 'dark',
  })

  assert.equal(normalized.theme, 'dark')
  assert.match(
    getMediaMarkPlaceholderImageUrl(normalized.value, normalized.theme),
    /media-mark-cd-rom-dark\.svg$/,
  )

  assert.match(
    getMediaMarkPlaceholderImageUrl('installDisc', 'light'),
    /media-mark-install-disc-light\.png$/,
  )
  assert.match(
    getMediaMarkPlaceholderImageUrl('installDisc', 'dark'),
    /media-mark-install-disc-dark\.png$/,
  )
  assert.match(
    getMediaMarkPlaceholderImageUrl('dataDisc', 'light'),
    /media-mark-data-disc-light\.png$/,
  )
  assert.match(
    getMediaMarkPlaceholderImageUrl('dataDisc', 'dark'),
    /media-mark-data-disc-dark\.png$/,
  )
  assert.match(
    getMediaMarkPlaceholderImageUrl('dvd', 'light'),
    /media-mark-dvd-light\.svg$/,
  )
  assert.match(
    getMediaMarkPlaceholderImageUrl('dvd', 'dark'),
    /media-mark-dvd-dark\.svg$/,
  )
  assert.match(
    getMediaMarkPlaceholderImageUrl('dvdRom', 'light'),
    /media-mark-dvd-rom-light\.png$/,
  )
  assert.match(
    getMediaMarkPlaceholderImageUrl('dvdRom', 'dark'),
    /media-mark-dvd-rom-dark\.png$/,
  )
})

test('legacy media marks default to the light built-in theme', () => {
  const normalized = normalizeProjectMediaMark({
    value: 'cdRom',
    source: 'placeholder',
  })

  assert.equal(normalized.theme, 'light')
})
