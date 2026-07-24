import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getMediaMarkPlaceholderImageUrl,
} from '../assets/assetManifest.ts'
import {
  createMediaMarkRenderModel,
  getMediaMarkCanonicalVisualBounds,
} from '../render/mediaMarkRenderModel.ts'
import {
  MEDIA_MARK_OPTIONS,
  MEDIA_MARK_THEME_OPTIONS,
  createDefaultProjectMediaMark,
  getMediaMarkLabel,
  mediaMarkSupportsTheme,
  normalizeProjectMediaMark,
  updateMediaMarkTheme,
} from './projectMediaMark.ts'

test('media mark canonical bounds resolve while disabled and match the render model', () => {
  const disabledMark = createDefaultProjectMediaMark()
  const canonicalBounds = getMediaMarkCanonicalVisualBounds(disabledMark)
  const renderModel = createMediaMarkRenderModel({
    ...disabledMark,
    layout: {
      ...disabledMark.layout,
      enabled: true,
    },
  })

  assert.deepEqual(canonicalBounds, { halfWidth: 4, halfHeight: 4 })
  assert.deepEqual(renderModel?.unscaledBounds, canonicalBounds)
})

test('media mark canonical bounds preserve wide, tall, and square custom content', () => {
  const variants = [
    {
      contentBounds: { x: 100, y: 100, width: 800, height: 200 },
      expected: { halfWidth: 6.5, halfHeight: 1.625 },
    },
    {
      contentBounds: { x: 400, y: 50, width: 200, height: 800 },
      expected: { halfWidth: 1, halfHeight: 4 },
    },
    {
      contentBounds: { x: 250, y: 250, width: 500, height: 500 },
      expected: { halfWidth: 4, halfHeight: 4 },
    },
  ]

  for (const [index, variant] of variants.entries()) {
    const mediaMark = {
      ...createDefaultProjectMediaMark(),
      source: 'custom' as const,
      customImageDataUrl: `data:image/png;base64,media-${index}`,
      customImageSize: {
        width: 1000,
        height: 1000,
        contentBounds: variant.contentBounds,
      },
    }
    const bounds = getMediaMarkCanonicalVisualBounds(mediaMark)

    assert.deepEqual(bounds, variant.expected)
    assert.equal(
      bounds && bounds.halfWidth / bounds.halfHeight,
      variant.contentBounds.width / variant.contentBounds.height,
    )
    assert.equal(
      getMediaMarkCanonicalVisualBounds({
        ...mediaMark,
        customImageSize: null,
      }),
      null,
    )
  }
})

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
