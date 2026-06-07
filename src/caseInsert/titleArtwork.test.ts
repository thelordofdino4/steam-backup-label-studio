import assert from 'node:assert/strict'
import test from 'node:test'
import { createProjectImageAssetProvenance } from '../project/projectAssetStatus.ts'
import {
  createCaseInsertProjectSnapshot,
  createDefaultProjectJewelCaseState,
  restoreCaseInsertProjectState,
} from '../project/projectCaseInsert.ts'
import type { SteamArtworkAsset, SteamImportedGame } from '../steam/steamApi.ts'
import type { CaseInsertImageSlotImageInput } from './types.ts'
import {
  applySteamCaseInsertTitleArtworkSeedToProject,
  applySteamCaseInsertTitleArtworkSeedToSlot,
  canRestoreCaseInsertTitleArtworkDefaultSteamLogo,
  createSteamCaseInsertTitleArtworkSeed,
  restoreCaseInsertTitleArtworkDefaultSteamLogo,
  setCaseInsertTitleArtworkSteamImage,
  setCustomCaseInsertTitleArtworkImage,
} from './titleArtwork.ts'

const steamLogoAsset: SteamArtworkAsset = {
  id: 'cdn-logo',
  label: 'Steam CDN logo',
  url: 'https://cdn.akamai.steamstatic.com/steam/apps/620/logo.png',
  kind: 'logo',
}

function createSteamGame(artwork: SteamArtworkAsset[]): SteamImportedGame {
  return {
    appId: 620,
    title: 'Portal 2',
    developer: ['Valve'],
    publisher: ['Valve'],
    genres: ['Puzzle'],
    categories: ['Single-player'],
    storeUrl: 'https://store.steampowered.com/app/620/Portal_2/',
    artwork,
  }
}

function createImage(
  imageDataUrl = 'data:image/png;base64,steam-logo',
): CaseInsertImageSlotImageInput {
  return {
    imageDataUrl,
    imageSize: {
      width: 900,
      height: 360,
    },
  }
}

test('Steam case insert title artwork seed uses the same Steam CDN logo preference as the disc editor', async () => {
  const downloadedAssetIds: string[] = []

  const seed = await createSteamCaseInsertTitleArtworkSeed(
    createSteamGame([
      {
        id: 'cdn-header',
        label: 'Steam CDN header image',
        url: 'https://cdn.akamai.steamstatic.com/steam/apps/620/header.jpg',
        kind: 'header',
      },
      steamLogoAsset,
    ]),
    {
      createSteamArtworkImage: async (asset) => {
        downloadedAssetIds.push(asset.id)
        return createImage()
      },
    },
  )

  assert.equal(seed.status, 'seeded')
  assert.deepEqual(downloadedAssetIds, ['cdn-logo'])
})

test('Steam case insert title artwork seed applies to cover, tray, and both spines', async () => {
  const seed = await createSteamCaseInsertTitleArtworkSeed(
    createSteamGame([steamLogoAsset]),
    { createSteamArtworkImage: async () => createImage() },
  )
  const state = applySteamCaseInsertTitleArtworkSeedToProject(
    createDefaultProjectJewelCaseState('Portal 2'),
    seed,
  )
  const slots = [
    state.templates.cover.titleArtwork,
    state.templates.tray.titleArtwork,
    state.spine.left.titleArtwork,
    state.spine.right.titleArtwork,
  ]

  for (const slot of slots) {
    assert.equal(slot.enabled, true)
    assert.equal(slot.imageDataUrl, 'data:image/png;base64,steam-logo')
    assert.equal(slot.imageSource?.source, 'steam-artwork')
    assert.equal(slot.imageSource?.sourceId, 'cdn-logo')
    assert.equal(slot.imageSource?.sourceLabel, 'Steam CDN logo')
    assert.equal(slot.defaultSteamLogo?.steamArtworkAssetId, 'cdn-logo')
    assert.equal(
      slot.defaultSteamLogo?.imageDataUrl,
      'data:image/png;base64,steam-logo',
    )
  }
})

test('case insert game logo can restore the remembered Steam default after custom replacement', () => {
  const steamDefault = setCaseInsertTitleArtworkSteamImage(
    createDefaultProjectJewelCaseState('Portal 2').templates.tray.titleArtwork,
    createImage('data:image/png;base64,steam-default'),
    steamLogoAsset,
    { rememberAsDefault: true },
  )
  const customReplacement = setCustomCaseInsertTitleArtworkImage(
    {
      ...steamDefault,
      layout: {
        ...steamDefault.layout,
        scale: 1.45,
        x: 42,
        y: 33,
      },
    },
    {
      imageDataUrl: 'data:image/png;base64,custom-logo',
      imageSize: { width: 640, height: 240 },
      imageSource: createProjectImageAssetProvenance({
        source: 'uploaded',
        sourceLabel: 'custom-logo.png',
      }),
    },
  )

  assert.equal(canRestoreCaseInsertTitleArtworkDefaultSteamLogo(customReplacement), true)

  const restored = restoreCaseInsertTitleArtworkDefaultSteamLogo(customReplacement)

  assert.equal(restored.imageDataUrl, 'data:image/png;base64,steam-default')
  assert.equal(restored.imageSource?.source, 'steam-artwork')
  assert.equal(restored.imageSource?.sourceId, 'cdn-logo')
  assert.deepEqual(restored.layout, customReplacement.layout)
  assert.equal(canRestoreCaseInsertTitleArtworkDefaultSteamLogo(restored), false)
})

test('missing Steam case insert title artwork clears stale Steam logos but preserves custom upload', () => {
  const staleSteamLogo = setCaseInsertTitleArtworkSteamImage(
    createDefaultProjectJewelCaseState('Portal 2').templates.tray.titleArtwork,
    createImage('data:image/png;base64,stale-logo'),
    steamLogoAsset,
    { rememberAsDefault: true },
  )
  const customLogo = setCustomCaseInsertTitleArtworkImage(
    staleSteamLogo,
    {
      imageDataUrl: 'data:image/png;base64,custom-logo',
      imageSize: { width: 640, height: 240 },
      imageSource: createProjectImageAssetProvenance({
        source: 'uploaded',
        sourceLabel: 'custom-logo.png',
      }),
    },
  )
  const unavailableSeed = {
    status: 'unavailable' as const,
    statusMessage: 'No Steam title/logo artwork was found.',
  }

  const cleared = applySteamCaseInsertTitleArtworkSeedToSlot(
    staleSteamLogo,
    unavailableSeed,
  )
  const preserved = applySteamCaseInsertTitleArtworkSeedToSlot(
    customLogo,
    unavailableSeed,
  )

  assert.equal(cleared.imageDataUrl, null)
  assert.equal(cleared.defaultSteamLogo, null)
  assert.equal(cleared.enabled, false)
  assert.equal(preserved.imageDataUrl, 'data:image/png;base64,custom-logo')
  assert.equal(preserved.imageSource?.source, 'uploaded')
  assert.equal(preserved.defaultSteamLogo, null)
})

test('case insert game logo Steam default survives save and load', async () => {
  const seed = await createSteamCaseInsertTitleArtworkSeed(
    createSteamGame([steamLogoAsset]),
    { createSteamArtworkImage: async () => createImage() },
  )
  const state = applySteamCaseInsertTitleArtworkSeedToProject(
    createDefaultProjectJewelCaseState('Portal 2'),
    seed,
  )
  const saved = createCaseInsertProjectSnapshot({
    manualGameTitle: 'Portal 2 Case',
    selectedSteamGame: createSteamGame([steamLogoAsset]),
    caseInsert: state,
  })
  const restored = restoreCaseInsertProjectState(saved).caseInsert

  assert.equal(
    restored.templates.tray.titleArtwork.defaultSteamLogo?.steamArtworkAssetId,
    'cdn-logo',
  )
  assert.equal(
    restored.spine.left.titleArtwork.defaultSteamLogo?.sourceLabel,
    'Steam CDN logo',
  )
})
