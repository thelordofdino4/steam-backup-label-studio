import assert from 'node:assert/strict'
import test from 'node:test'
import { discTemplates } from '../templates/discTemplates.ts'
import type { SteamArtworkAsset } from '../steam/steamApi.ts'
import type { ImportedImageAsset } from '../utils/importedImageAsset.ts'
import {
  canRestoreTitleArtworkDefaultSteamLogo,
  createDefaultProjectTitleArtwork,
  createTitleArtworkRenderItem,
  getTitleArtworkCanonicalVisualBounds,
  normalizeProjectTitleArtwork,
  restoreTitleArtworkDefaultSteamLogo,
  setCustomTitleArtworkImage,
  setTitleArtworkImage,
} from './projectTitleArtwork.ts'

const standardDiscTemplate = discTemplates.standardPrintableDisc

const steamLogoAsset: SteamArtworkAsset = {
  id: 'cdn-logo',
  label: 'Steam CDN logo',
  url: 'https://cdn.akamai.steamstatic.com/steam/apps/12345/logo.png',
  kind: 'logo',
}

function createImportedImage(
  imageDataUrl: string,
  width = 800,
  height = 300,
): ImportedImageAsset {
  return {
    imageDataUrl,
    imageSize: {
      width,
      height,
    },
  }
}

test('title artwork defaults do not expose a restore target for manual projects', () => {
  const titleArtwork = createDefaultProjectTitleArtwork(standardDiscTemplate, 'top')

  assert.equal(titleArtwork.defaultSteamLogo, null)
  assert.equal(canRestoreTitleArtworkDefaultSteamLogo(titleArtwork), false)
})

test('title artwork canonical bounds require an image and match the fallback render size after sparse restore', () => {
  const defaults = createDefaultProjectTitleArtwork(standardDiscTemplate, 'top')

  assert.equal(getTitleArtworkCanonicalVisualBounds(defaults), null)

  for (const savedImageSize of [
    undefined,
    { width: 0, height: 360 },
  ]) {
    const restored = normalizeProjectTitleArtwork({
      ...defaults,
      imageDataUrl: 'data:image/png;base64,title',
      imageSize: savedImageSize,
      layout: {
        ...defaults.layout,
        enabled: true,
      },
    }, standardDiscTemplate, 'top')
    const renderItem = createTitleArtworkRenderItem(restored)

    assert.equal(restored.imageSize, null)
    assert.ok(renderItem)
    assert.deepEqual(
      getTitleArtworkCanonicalVisualBounds(restored),
      renderItem.unscaledBounds,
    )
    assert.deepEqual(renderItem.unscaledBounds, {
      halfWidth: 19,
      halfHeight: 7.6,
    })
  }

  assert.equal(
    getTitleArtworkCanonicalVisualBounds({
      ...defaults,
      imageDataUrl: 'data:image/png;base64,title',
      imageSize: {
        width: 1000,
        height: 500,
        contentBounds: { x: 0, y: 0, width: 0, height: 0 },
      },
    }),
    null,
  )
})

test('title artwork canonical bounds preserve wide, tall, and square transparent content across sources', () => {
  const variants = [
    {
      source: 'custom' as const,
      contentBounds: { x: 100, y: 100, width: 800, height: 200 },
      expected: { halfWidth: 19, halfHeight: 4.75 },
    },
    {
      source: 'steam' as const,
      contentBounds: { x: 400, y: 50, width: 200, height: 800 },
      expected: { halfWidth: 2, halfHeight: 8 },
    },
    {
      source: 'custom' as const,
      contentBounds: { x: 250, y: 250, width: 500, height: 500 },
      expected: { halfWidth: 8, halfHeight: 8 },
    },
  ]

  for (const variant of variants) {
    const titleArtwork = {
      ...createDefaultProjectTitleArtwork(standardDiscTemplate, 'top'),
      source: variant.source,
      imageDataUrl: `data:image/png;base64,${variant.source}`,
      imageSize: {
        width: 1000,
        height: 1000,
        contentBounds: variant.contentBounds,
      },
      layout: {
        enabled: false,
        scale: 2,
        x: 25,
        y: 30,
      },
    }

    const bounds = getTitleArtworkCanonicalVisualBounds(titleArtwork)

    assert.deepEqual(bounds, variant.expected)
    assert.equal(
      bounds && bounds.halfWidth / bounds.halfHeight,
      variant.contentBounds.width / variant.contentBounds.height,
    )
  }
})

test('Steam title artwork default can be restored after custom replacement without resetting layout', () => {
  const steamDefault = setTitleArtworkImage(
    createDefaultProjectTitleArtwork(standardDiscTemplate, 'top'),
    createImportedImage('data:image/png;base64,steam-default', 900, 360),
    steamLogoAsset,
    standardDiscTemplate,
    'top',
    { rememberAsDefault: true },
  )
  const customReplacement = setCustomTitleArtworkImage(
    steamDefault,
    createImportedImage('data:image/png;base64,custom-logo', 640, 240),
    standardDiscTemplate,
    'top',
  )
  const movedReplacement = {
    ...customReplacement,
    layout: {
      enabled: true,
      scale: 1.35,
      x: 56,
      y: 28,
    },
  }

  assert.equal(canRestoreTitleArtworkDefaultSteamLogo(movedReplacement), true)

  const restored = restoreTitleArtworkDefaultSteamLogo(movedReplacement)

  assert.equal(restored.source, 'steam')
  assert.equal(restored.steamArtworkAssetId, 'cdn-logo')
  assert.equal(restored.sourceLabel, 'Steam CDN logo')
  assert.equal(restored.imageDataUrl, 'data:image/png;base64,steam-default')
  assert.deepEqual(restored.imageSize, { width: 900, height: 360 })
  assert.deepEqual(restored.layout, {
    enabled: true,
    scale: 1.35,
    x: 56,
    y: 28,
  })
  assert.equal(canRestoreTitleArtworkDefaultSteamLogo(restored), false)
  assert.deepEqual(
    getTitleArtworkCanonicalVisualBounds(customReplacement),
    { halfWidth: 19, halfHeight: 7.125 },
  )
  assert.deepEqual(
    getTitleArtworkCanonicalVisualBounds(restored),
    { halfWidth: 19, halfHeight: 7.6 },
  )
})

test('title artwork normalization restores saved defaults and backfills legacy Steam logo projects', () => {
  const savedDefault = normalizeProjectTitleArtwork(
    {
      source: 'custom',
      sourceLabel: 'Custom game logo artwork',
      imageDataUrl: 'data:image/png;base64,current-custom',
      imageSize: { width: 500, height: 200 },
      defaultSteamLogo: {
        steamArtworkAssetId: 'cdn-logo',
        sourceLabel: 'Steam CDN logo',
        imageDataUrl: 'data:image/png;base64,steam-default',
        imageSize: { width: 900, height: 360 },
      },
    },
    standardDiscTemplate,
    'top',
  )
  const legacySteamLogo = normalizeProjectTitleArtwork(
    {
      source: 'steam',
      steamArtworkAssetId: 'cdn-logo',
      sourceLabel: 'Steam CDN logo',
      imageDataUrl: 'data:image/png;base64,legacy-default',
      imageSize: { width: 900, height: 360 },
    },
    standardDiscTemplate,
    'top',
  )

  assert.equal(savedDefault.defaultSteamLogo?.imageDataUrl, 'data:image/png;base64,steam-default')
  assert.equal(canRestoreTitleArtworkDefaultSteamLogo(savedDefault), true)
  assert.equal(legacySteamLogo.defaultSteamLogo?.imageDataUrl, 'data:image/png;base64,legacy-default')
  assert.equal(canRestoreTitleArtworkDefaultSteamLogo(legacySteamLogo), false)
})
