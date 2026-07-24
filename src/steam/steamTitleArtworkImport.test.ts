import assert from 'node:assert/strict'
import test from 'node:test'
import { discTemplates } from '../templates/discTemplates.ts'
import {
  canRestoreTitleArtworkDefaultSteamLogo,
  createDefaultProjectTitleArtwork,
  setCustomTitleArtworkImage,
  setTitleArtworkImage,
  setTitleArtworkLayout,
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
  assert.equal(result.placementRefitRequired, true)
  assert.equal(downloadedUrl, logoUrl)
  assert.equal(result.titleArtwork.steamArtworkAssetId, 'cdn-logo')
  assert.equal(result.titleArtwork.sourceLabel, 'Steam CDN logo')
  assert.equal(result.titleArtwork.imageDataUrl, imageDataUrl)
  assert.deepEqual(result.titleArtwork.imageSize, { width: 800, height: 300 })
  assert.equal(result.titleArtwork.defaultSteamLogo?.steamArtworkAssetId, 'cdn-logo')
  assert.equal(result.titleArtwork.defaultSteamLogo?.imageDataUrl, imageDataUrl)
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

test('current hashed Steam library logo is preferred over the legacy CDN logo', () => {
  const hashedLibraryLogo: SteamArtworkAsset = {
    id: 'store-library-logo',
    label: 'Steam library logo',
    url: 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/12345/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/logo.png',
    kind: 'logo',
  }
  const legacyCdnLogo: SteamArtworkAsset = {
    id: 'cdn-logo',
    label: 'Steam CDN logo',
    url: 'https://cdn.akamai.steamstatic.com/steam/apps/12345/logo.png',
    kind: 'logo',
  }

  assert.equal(
    findSteamTitleArtworkAsset(createSteamGame([legacyCdnLogo, hashedLibraryLogo])),
    hashedLibraryLogo,
  )
})

test('missing Steam title artwork clears stale artwork and leaves rendered text available', async () => {
  const previousLogo: SteamArtworkAsset = {
    id: 'cdn-logo',
    label: 'Steam CDN logo',
    url: 'https://cdn.akamai.steamstatic.com/steam/apps/12345/logo.png',
    kind: 'logo',
  }
  const seededTitleArtwork = setTitleArtworkImage(
    createDefaultProjectTitleArtwork(standardDiscTemplate, 'top'),
    createImportedImage('data:image/png;base64,old-logo'),
    previousLogo,
    standardDiscTemplate,
    'top',
  )
  const currentTitleArtwork = setTitleArtworkLayout(seededTitleArtwork, {
    ...seededTitleArtwork.layout,
    scale: 2.25,
  })

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
  assert.equal(result.placementRefitRequired, true)
  assert.equal(result.titleArtwork.imageDataUrl, null)
  assert.equal(result.titleArtwork.steamArtworkAssetId, null)
  assert.equal(result.titleArtwork.layout.enabled, false)
  assert.equal(result.titleArtwork.layout.scale, 2.25)
})

test('missing Steam title artwork preserves custom title artwork upload', async () => {
  const previousLogo: SteamArtworkAsset = {
    id: 'cdn-logo',
    label: 'Steam CDN logo',
    url: 'https://cdn.akamai.steamstatic.com/steam/apps/12345/logo.png',
    kind: 'logo',
  }
  const currentTitleArtwork = setCustomTitleArtworkImage(
    setTitleArtworkImage(
      createDefaultProjectTitleArtwork(standardDiscTemplate, 'top'),
      createImportedImage('data:image/png;base64,old-default'),
      previousLogo,
      standardDiscTemplate,
      'top',
      { rememberAsDefault: true },
    ),
    createImportedImage('data:image/png;base64,custom-logo'),
    standardDiscTemplate,
    'top',
  )
  const manuallyPlacedTitleArtwork = setTitleArtworkLayout(
    currentTitleArtwork,
    {
      ...currentTitleArtwork.layout,
      scale: 2.25,
      x: 68,
      y: 44,
    },
  )

  const result = await createSteamTitleArtworkImport(
    createSteamGame([]),
    manuallyPlacedTitleArtwork,
    standardDiscTemplate,
    'top',
  )

  assert.equal(result.status, 'unavailable')
  assert.equal(result.placementRefitRequired, false)
  assert.equal(result.titleArtwork.source, 'custom')
  assert.equal(result.titleArtwork.imageDataUrl, 'data:image/png;base64,custom-logo')
  assert.equal(result.titleArtwork.defaultSteamLogo, null)
  assert.equal(canRestoreTitleArtworkDefaultSteamLogo(result.titleArtwork), false)
  assert.equal(result.titleArtwork.layout.enabled, true)
  assert.deepEqual(
    result.titleArtwork.layout,
    manuallyPlacedTitleArtwork.layout,
  )
})

test('failed Steam logo download preserves dormant scale or retained custom placement', async () => {
  const logoAsset: SteamArtworkAsset = {
    id: 'cdn-logo',
    label: 'Steam CDN logo',
    url: 'https://cdn.akamai.steamstatic.com/steam/apps/12345/logo.png',
    kind: 'logo',
  }
  const seeded = setTitleArtworkImage(
    createDefaultProjectTitleArtwork(standardDiscTemplate, 'top'),
    createImportedImage('data:image/png;base64,old-logo'),
    logoAsset,
    standardDiscTemplate,
    'top',
  )
  const dormantScale = setTitleArtworkLayout(seeded, {
    ...seeded.layout,
    scale: 2.25,
  })
  const custom = setCustomTitleArtworkImage(
    seeded,
    createImportedImage('data:image/png;base64,custom-logo'),
    standardDiscTemplate,
    'top',
  )
  const customPlacement = setTitleArtworkLayout(custom, {
    ...custom.layout,
    scale: 1.8,
    x: 67,
    y: 43,
  })
  const failingOptions = {
    downloadArtworkAsDataUrl: async () => {
      throw new Error('offline')
    },
  }

  const cleared = await createSteamTitleArtworkImport(
    createSteamGame([logoAsset]),
    dormantScale,
    standardDiscTemplate,
    'top',
    failingOptions,
  )
  const retained = await createSteamTitleArtworkImport(
    createSteamGame([logoAsset]),
    customPlacement,
    standardDiscTemplate,
    'top',
    failingOptions,
  )

  assert.equal(cleared.status, 'failed')
  assert.equal(cleared.placementRefitRequired, true)
  assert.equal(cleared.titleArtwork.imageDataUrl, null)
  assert.equal(cleared.titleArtwork.layout.scale, 2.25)
  assert.equal(retained.status, 'failed')
  assert.equal(retained.placementRefitRequired, false)
  assert.equal(retained.titleArtwork.imageDataUrl, custom.imageDataUrl)
  assert.deepEqual(retained.titleArtwork.layout, customPlacement.layout)
})
