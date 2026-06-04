import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getMediaMarkPlaceholderImageUrl,
  getPlatformMarkPlaceholderImageUrl,
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
import {
  PLATFORM_MARK_OPTIONS,
  PLATFORM_MARK_THEME_OPTIONS,
  createDefaultProjectPlatformMarkAsset,
  createDefaultProjectPlatformMarks,
  getDefaultPlatformMarkTheme,
  getPlatformMarkLabel,
  getPlatformMarkThemeOptions,
  getProjectPlatformMarkAsset,
  getProjectPlatformMarkInference,
  normalizeProjectPlatformMarks,
  platformMarkSupportsTheme,
  setPlatformMarkCustomImage,
  updatePlatformMarkTheme,
} from './projectPlatformMarks.ts'
import type { ProjectPlatformMarks } from './projectTypes.ts'

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

test('platform mark saved value keeps compatibility while showing SteamOS wording', () => {
  assert.ok(PLATFORM_MARK_OPTIONS.some((option) => option.value === 'steamDeck' && option.label === 'SteamOS'))
  assert.equal(getPlatformMarkLabel('steamDeck'), 'SteamOS')
})

test('SteamOS platform mark supports persisted built-in styles', () => {
  assert.deepEqual(getPlatformMarkThemeOptions('steamDeck').map((option) => option.value), ['color', 'light', 'dark'])
  assert.equal(platformMarkSupportsTheme('steamDeck'), true)
  assert.equal(getDefaultPlatformMarkTheme('steamDeck'), 'color')
  assert.equal(createDefaultProjectPlatformMarkAsset('steamDeck').theme, 'color')

  const themedMarks = updatePlatformMarkTheme(
    createDefaultProjectPlatformMarks(),
    'steamDeck',
    'dark',
  )
  const themedAsset = getProjectPlatformMarkAsset(themedMarks, 'steamDeck')

  assert.equal(themedAsset.theme, 'dark')

  const normalized = normalizeProjectPlatformMarks({
    values: ['steamDeck'],
    assets: {
      steamDeck: {
        ...createDefaultProjectPlatformMarkAsset('steamDeck'),
        theme: 'light',
      },
    },
  })
  const normalizedAsset = getProjectPlatformMarkAsset(normalized, 'steamDeck')

  assert.equal(normalizedAsset.theme, 'light')
  assert.match(
    getPlatformMarkPlaceholderImageUrl('steamDeck', 'color'),
    /platform-mark-steamos-color\.svg$/,
  )
  assert.match(
    getPlatformMarkPlaceholderImageUrl('steamDeck', 'light'),
    /platform-mark-steamos-light\.svg$/,
  )
  assert.match(
    getPlatformMarkPlaceholderImageUrl('steamDeck', 'dark'),
    /platform-mark-steamos-dark\.svg$/,
  )
})

test('selected platform marks materialize default assets when assets are missing', () => {
  const platformMarks: ProjectPlatformMarks = {
    values: ['pc'],
    assets: {},
  }

  const asset = getProjectPlatformMarkAsset(platformMarks, 'pc')

  assert.equal(asset.source, 'placeholder')
  assert.equal(asset.theme, 'pcPlatform')
  assert.equal(asset.layout.enabled, true)
  assert.equal(asset.layout.x, 24)
  assert.equal(asset.layout.y, 70)
})

test('PC platform mark supports persisted built-in styles', () => {
  assert.deepEqual(
    getPlatformMarkThemeOptions('pc').map((option) => option.value),
    ['pcPlatform', 'pcSimplified', 'pcSimplifiedDark'],
  )
  assert.equal(platformMarkSupportsTheme('pc'), true)
  assert.equal(getDefaultPlatformMarkTheme('pc'), 'pcPlatform')

  const themedMarks = updatePlatformMarkTheme(
    createDefaultProjectPlatformMarks(),
    'pc',
    'pcSimplified',
  )
  const themedAsset = getProjectPlatformMarkAsset(themedMarks, 'pc')

  assert.equal(themedAsset.theme, 'pcSimplified')

  const normalized = normalizeProjectPlatformMarks({
    values: ['pc'],
    assets: {
      pc: {
        ...createDefaultProjectPlatformMarkAsset('pc'),
        theme: 'color',
      },
    },
  })
  const normalizedAsset = getProjectPlatformMarkAsset(normalized, 'pc')

  assert.equal(normalizedAsset.theme, 'pcPlatform')
  assert.match(
    getPlatformMarkPlaceholderImageUrl('pc', 'pcPlatform'),
    /platform-mark-pc-platform\.png$/,
  )
  assert.match(
    getPlatformMarkPlaceholderImageUrl('pc', 'pcSimplified'),
    /platform-mark-pc-simplified\.png$/,
  )
  assert.match(
    getPlatformMarkPlaceholderImageUrl('pc', 'pcSimplifiedDark'),
    /platform-mark-pc-simplified-dark\.png$/,
  )
  assert.match(
    getPlatformMarkPlaceholderImageUrl('pc', 'color'),
    /platform-mark-pc-platform\.png$/,
  )
})

test('Linux platform mark supports persisted built-in styles', () => {
  assert.deepEqual(getPlatformMarkThemeOptions('linux').map((option) => option.value), ['color', 'light', 'dark'])
  assert.equal(platformMarkSupportsTheme('linux'), true)
  assert.equal(getDefaultPlatformMarkTheme('linux'), 'color')

  const themedMarks = updatePlatformMarkTheme(
    createDefaultProjectPlatformMarks(),
    'linux',
    'dark',
  )
  const themedAsset = getProjectPlatformMarkAsset(themedMarks, 'linux')

  assert.equal(themedAsset.theme, 'dark')

  const normalized = normalizeProjectPlatformMarks({
    values: ['linux'],
    assets: {
      linux: {
        ...createDefaultProjectPlatformMarkAsset('linux'),
        theme: 'light',
      },
    },
  })
  const normalizedAsset = getProjectPlatformMarkAsset(normalized, 'linux')

  assert.equal(normalizedAsset.theme, 'light')
  assert.match(
    getPlatformMarkPlaceholderImageUrl('linux', 'color'),
    /platform-mark-linux-color\.svg$/,
  )
  assert.match(
    getPlatformMarkPlaceholderImageUrl('linux', 'light'),
    /platform-mark-linux-light\.svg$/,
  )
  assert.match(
    getPlatformMarkPlaceholderImageUrl('linux', 'dark'),
    /platform-mark-linux-dark\.svg$/,
  )
})

test('macOS platform mark supports persisted built-in styles', () => {
  assert.deepEqual(
    getPlatformMarkThemeOptions('macos').map((option) => option.value),
    ['macos1988', 'macos1995', 'macos2001', 'macos2003', 'macos2012', 'macos2016', 'macos2017'],
  )
  assert.ok(PLATFORM_MARK_THEME_OPTIONS.some((option) => option.value === 'macos2017'))
  assert.equal(platformMarkSupportsTheme('macos'), true)
  assert.equal(getDefaultPlatformMarkTheme('macos'), 'macos1988')
  assert.equal(createDefaultProjectPlatformMarkAsset('macos').theme, 'macos1988')

  const themedMarks = updatePlatformMarkTheme(
    createDefaultProjectPlatformMarks(),
    'macos',
    'macos2017',
  )
  const themedAsset = getProjectPlatformMarkAsset(themedMarks, 'macos')

  assert.equal(themedAsset.theme, 'macos2017')

  const normalized = normalizeProjectPlatformMarks({
    values: ['macos'],
    assets: {
      macos: {
        ...createDefaultProjectPlatformMarkAsset('macos'),
        theme: 'color',
      },
    },
  })
  const normalizedAsset = getProjectPlatformMarkAsset(normalized, 'macos')

  assert.equal(normalizedAsset.theme, 'macos1988')
  assert.match(
    getPlatformMarkPlaceholderImageUrl('macos', 'macos1988'),
    /platform-mark-macos-1988\.png$/,
  )
  assert.match(
    getPlatformMarkPlaceholderImageUrl('macos', 'macos1995'),
    /platform-mark-macos-1995\.png$/,
  )
  assert.match(
    getPlatformMarkPlaceholderImageUrl('macos', 'macos2001'),
    /platform-mark-macos-2001\.png$/,
  )
  assert.match(
    getPlatformMarkPlaceholderImageUrl('macos', 'macos2003'),
    /platform-mark-macos-2003\.png$/,
  )
  assert.match(
    getPlatformMarkPlaceholderImageUrl('macos', 'macos2012'),
    /platform-mark-macos-2012\.png$/,
  )
  assert.match(
    getPlatformMarkPlaceholderImageUrl('macos', 'macos2016'),
    /platform-mark-macos-2016\.png$/,
  )
  assert.match(
    getPlatformMarkPlaceholderImageUrl('macos', 'macos2017'),
    /platform-mark-macos-2017\.jpg$/,
  )
  assert.match(
    getPlatformMarkPlaceholderImageUrl('macos', 'color'),
    /platform-mark-macos-1988\.png$/,
  )
})

test('Windows platform mark supports persisted built-in styles', () => {
  assert.deepEqual(
    getPlatformMarkThemeOptions('windows').map((option) => option.value),
    ['retro', 'xp', 'vista', 'windows7', 'windows10', 'windows11'],
  )
  assert.ok(PLATFORM_MARK_THEME_OPTIONS.some((option) => option.value === 'windows11'))
  assert.equal(platformMarkSupportsTheme('windows'), true)
  assert.equal(getDefaultPlatformMarkTheme('windows'), 'windows11')
  assert.equal(createDefaultProjectPlatformMarkAsset('windows').theme, 'windows11')

  const themedMarks = updatePlatformMarkTheme(
    createDefaultProjectPlatformMarks(),
    'windows',
    'windows11',
  )
  const themedAsset = getProjectPlatformMarkAsset(themedMarks, 'windows')

  assert.equal(themedAsset.theme, 'windows11')

  const normalized = normalizeProjectPlatformMarks({
    values: ['windows'],
    assets: {
      windows: {
        ...createDefaultProjectPlatformMarkAsset('windows'),
        theme: 'color',
      },
    },
  })
  const normalizedAsset = getProjectPlatformMarkAsset(normalized, 'windows')

  assert.equal(normalizedAsset.theme, 'windows11')
  assert.match(
    getPlatformMarkPlaceholderImageUrl('windows', 'retro'),
    /platform-mark-windows-retro\.svg$/,
  )
  assert.match(
    getPlatformMarkPlaceholderImageUrl('windows', 'xp'),
    /platform-mark-windows-xp\.png$/,
  )
  assert.match(
    getPlatformMarkPlaceholderImageUrl('windows', 'vista'),
    /platform-mark-windows-vista\.png$/,
  )
  assert.match(
    getPlatformMarkPlaceholderImageUrl('windows', 'windows7'),
    /platform-mark-windows-7\.png$/,
  )
  assert.match(
    getPlatformMarkPlaceholderImageUrl('windows', 'windows10'),
    /platform-mark-windows-10\.svg$/,
  )
  assert.match(
    getPlatformMarkPlaceholderImageUrl('windows', 'windows11'),
    /platform-mark-windows-11\.png$/,
  )
  assert.match(
    getPlatformMarkPlaceholderImageUrl('windows', 'color'),
    /platform-mark-windows-11\.png$/,
  )
})

test('custom platform mark upload state enables the target asset', () => {
  const imageDataUrl = 'data:image/png;base64,custom-platform-mark'
  const platformMarks = setPlatformMarkCustomImage(
    createDefaultProjectPlatformMarks(),
    'windows',
    imageDataUrl,
    { width: 512, height: 256 },
  )

  const asset = getProjectPlatformMarkAsset(platformMarks, 'windows')

  assert.deepEqual(platformMarks.values, ['windows'])
  assert.equal(asset.source, 'custom')
  assert.equal(asset.customImageDataUrl, imageDataUrl)
  assert.deepEqual(asset.customImageSize, { width: 512, height: 256 })
  assert.equal(asset.layout.enabled, true)
})

test('older saved platform marks without inference normalize as manual selections', () => {
  const normalized = normalizeProjectPlatformMarks(
    {
      values: ['windows', 'linux'],
      assets: {},
    },
    undefined,
    undefined,
    123,
  )
  const inference = getProjectPlatformMarkInference(normalized)

  assert.deepEqual(normalized.values, ['windows', 'linux'])
  assert.equal(inference.source, 'manual')
  assert.equal(inference.status, 'manual')
  assert.equal(inference.steamAppId, 123)
  assert.deepEqual(inference.values, ['windows', 'linux'])
})
