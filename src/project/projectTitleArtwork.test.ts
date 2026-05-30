import assert from 'node:assert/strict'
import test from 'node:test'
import { discTemplates } from '../templates/discTemplates.ts'
import type { SteamArtworkAsset } from '../steam/steamApi.ts'
import type { ImportedImageAsset } from '../utils/importedImageAsset.ts'
import {
  canRestoreTitleArtworkDefaultSteamLogo,
  createDefaultProjectTitleArtwork,
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
