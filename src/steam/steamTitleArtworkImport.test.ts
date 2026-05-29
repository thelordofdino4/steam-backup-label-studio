import assert from 'node:assert/strict'
import test from 'node:test'
import { discTemplates } from '../templates/discTemplates.ts'
import {
  createDefaultProjectTitleArtwork,
  setCustomTitleArtworkImage,
  setTitleArtworkImage,
} from '../project/projectTitleArtwork.ts'
import type { ImportedImageAsset } from '../utils/importedImageAsset.ts'
import type { SteamArtworkAsset, SteamImportedGame } from './steamApi.ts'
import {
  createSteamTitleArtworkImport,
  findSteamTitleArtworkAsset,
} from './steamTitleArtworkImport.ts'

const standardDiscTemplate = discTemplates.standardPrintableDisc

function createSteamGame(artwork: SteamArtworkAsset[]): SteamImportedGame {
  return {
    appId: 12345,
    title: 'Test Game',
    developer: [],
    publisher: [],
    genres: [],
    categories: [],
    storeUrl: 'https://store.steampowered.com/app/12345',
    artwork,
  }
}

function createImportedImage(imageDataUrl = 'data:image/png;base64,title'): ImportedImageAsset {
  return {
    imageDataUrl,
    imageSize: {
      width: 800,
      height: 300,
    },
  }
}

test('selecting a Steam game with the Steam CDN logo seeds title artwork from that asset', async () => {
  const logoUrl = 'https://cdn.akamai.steamstatic.com/steam/apps/12345/logo.png'
  const imageDataUrl = 'data:image/png;base64,seeded-logo'
  const logoAsset: SteamArtworkAsset = {
    id: 'cdn-logo',
    label: 'Steam CDN logo',
    url: logoUrl,
    kind: 'logo',
  }
  let downloadedUrl = ''

  const result = await createSteamTitleArtworkImport(
    createSteamGame([
      {
        id: 'cdn-header',
        label: 'Steam CDN header image',
        url: 'https://cdn.akamai.steamstatic.com/steam/apps/12345/header.jpg',
        kind: 'header',
      },
      logoAsset,
    ]),
    createDefaultProjectTitleArtwork(standardDiscTemplate, 'top'),
    standardDiscTemplate,
    'top',
    {
      downloadArtworkAsDataUrl: async (url) => {
        downloadedUrl = url
        return imageDataUrl
      },
      createImportedImageAsset: async (dataUrl) => createImportedImage(dataUrl),
    },
  )

  assert.equal(result.status, 'seeded')
  assert.equal(downloadedUrl, logoUrl)
  assert.equal(result.titleArtwork.steamArtworkAssetId, 'cdn-logo')
  assert.equal(result.titleArtwork.sourceLabel, 'Steam CDN logo')
  assert.equal(result.titleArtwork.imageDataUrl, imageDataUrl)
  assert.deepEqual(result.titleArtwork.imageSize, { width: 800, height: 300 })
  assert.equal(result.titleArtwork.layout.enabled, true)
  assert.equal(result.titleArtwork.layout.x, 50)
  assert.equal(result.titleArtwork.layout.y, 19.5)
})

test('Steam CDN logo is preferred over other logo assets', () => {
  const cdnLogo: SteamArtworkAsset = {
    id: 'cdn-logo',
    label: 'Steam CDN logo',
    url: 'https://cdn.akamai.steamstatic.com/steam/apps/12345/logo.png',
    kind: 'logo',
  }
  const firstLogo: SteamArtworkAsset = {
    id: 'other-logo',
    label: 'Other logo',
    url: 'https://cdn.akamai.steamstatic.com/steam/apps/12345/other-logo.png',
    kind: 'logo',
  }

  assert.equal(findSteamTitleArtworkAsset(createSteamGame([firstLogo, cdnLogo])), cdnLogo)
})

test('missing Steam title artwork clears stale artwork and leaves rendered text available', async () => {
  const previousLogo: SteamArtworkAsset = {
    id: 'cdn-logo',
    label: 'Steam CDN logo',
    url: 'https://cdn.akamai.steamstatic.com/steam/apps/12345/logo.png',
    kind: 'logo',
  }
  const currentTitleArtwork = setTitleArtworkImage(
    createDefaultProjectTitleArtwork(standardDiscTemplate, 'top'),
    createImportedImage('data:image/png;base64,old-logo'),
    previousLogo,
    standardDiscTemplate,
    'top',
  )

  const result = await createSteamTitleArtworkImport(
    createSteamGame([
      {
        id: 'cdn-header',
        label: 'Steam CDN header image',
        url: 'https://cdn.akamai.steamstatic.com/steam/apps/12345/header.jpg',
        kind: 'header',
      },
    ]),
    currentTitleArtwork,
    standardDiscTemplate,
    'top',
  )

  assert.equal(result.status, 'unavailable')
  assert.equal(result.titleArtwork.imageDataUrl, null)
  assert.equal(result.titleArtwork.steamArtworkAssetId, null)
  assert.equal(result.titleArtwork.layout.enabled, false)
})

test('missing Steam title artwork preserves custom title artwork upload', async () => {
  const currentTitleArtwork = setCustomTitleArtworkImage(
    createDefaultProjectTitleArtwork(standardDiscTemplate, 'top'),
    createImportedImage('data:image/png;base64,custom-logo'),
    standardDiscTemplate,
    'top',
  )

  const result = await createSteamTitleArtworkImport(
    createSteamGame([]),
    currentTitleArtwork,
    standardDiscTemplate,
    'top',
  )

  assert.equal(result.status, 'unavailable')
  assert.equal(result.titleArtwork.source, 'custom')
  assert.equal(result.titleArtwork.imageDataUrl, 'data:image/png;base64,custom-logo')
  assert.equal(result.titleArtwork.layout.enabled, true)
})
