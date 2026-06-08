import assert from 'node:assert/strict'
import test from 'node:test'
import {
  clearCaseInsertTitleArtworkImage,
  restoreCaseInsertTitleArtworkDefaultSteamLogo,
  setCaseInsertTitleArtworkSteamImage,
  setCustomCaseInsertTitleArtworkImage,
} from '../caseInsert/titleArtwork.ts'
import { createProjectImageAssetProvenance } from '../project/projectAssetStatus.ts'
import {
  createCaseInsertProjectSnapshot,
  createDefaultProjectJewelCaseState,
  restoreCaseInsertProjectState,
} from '../project/projectCaseInsert.ts'
import {
  clearTitleArtworkImage,
  createDefaultProjectTitleArtwork,
  normalizeProjectTitleArtwork,
  restoreTitleArtworkDefaultSteamLogo,
  setCustomTitleArtworkImage,
  setTitleArtworkImage,
} from '../project/projectTitleArtwork.ts'
import { discTemplates } from '../templates/discTemplates.ts'
import type { SteamArtworkAsset } from '../steam/steamApi.ts'

const steamLogoAsset: SteamArtworkAsset = {
  id: 'steam-cdn-logo',
  label: 'Steam CDN logo',
  url: 'https://cdn.akamai.steamstatic.com/steam/apps/620/logo.png',
  kind: 'logo',
}

const discTemplate = discTemplates.standardPrintableDisc

test('disc title artwork preserves source switching, clear, restore, and save/load state', () => {
  const steamImage = {
    imageDataUrl: 'data:image/png;base64,disc-steam-logo',
    imageSize: { width: 900, height: 360 },
  }
  const customImage = {
    imageDataUrl: 'data:image/png;base64,disc-custom-logo',
    imageSize: { width: 640, height: 240 },
    fileName: 'custom-logo.png',
  }
  const steamDefault = setTitleArtworkImage(
    createDefaultProjectTitleArtwork(discTemplate, 'top'),
    steamImage,
    steamLogoAsset,
    discTemplate,
    'top',
    { rememberAsDefault: true },
  )
  const customArtwork = setCustomTitleArtworkImage(
    steamDefault,
    customImage,
    discTemplate,
    'top',
  )
  const clearedArtwork = clearTitleArtworkImage(
    customArtwork,
    discTemplate,
    'top',
  )
  const restoredArtwork = restoreTitleArtworkDefaultSteamLogo(clearedArtwork)
  const loadedArtwork = normalizeProjectTitleArtwork(
    restoredArtwork,
    discTemplate,
    'top',
  )

  assert.equal(steamDefault.source, 'steam')
  assert.equal(steamDefault.steamArtworkAssetId, steamLogoAsset.id)
  assert.equal(customArtwork.source, 'custom')
  assert.equal(customArtwork.imageDataUrl, customImage.imageDataUrl)
  assert.equal(clearedArtwork.imageDataUrl, null)
  assert.equal(clearedArtwork.layout.enabled, false)
  assert.equal(restoredArtwork.source, 'steam')
  assert.equal(restoredArtwork.layout.enabled, true)
  assert.equal(restoredArtwork.imageDataUrl, steamImage.imageDataUrl)
  assert.equal(loadedArtwork.source, 'steam')
  assert.equal(loadedArtwork.imageDataUrl, steamImage.imageDataUrl)
  assert.equal(loadedArtwork.defaultSteamLogo?.steamArtworkAssetId, steamLogoAsset.id)
})

test('case insert title artwork preserves source switching, clear, restore, and save/load state', () => {
  const steamImage = {
    imageDataUrl: 'data:image/png;base64,case-steam-logo',
    imageSize: { width: 900, height: 360 },
  }
  const customImage = {
    imageDataUrl: 'data:image/png;base64,case-custom-logo',
    imageSize: { width: 640, height: 240 },
    imageSource: createProjectImageAssetProvenance({
      source: 'uploaded',
      sourceLabel: 'C:\\Users\\John\\Pictures\\case-logo.png',
    }),
  }
  const defaultSlot =
    createDefaultProjectJewelCaseState('Portal 2').templates.cover.titleArtwork
  const steamDefault = setCaseInsertTitleArtworkSteamImage(
    defaultSlot,
    steamImage,
    steamLogoAsset,
    { rememberAsDefault: true },
  )
  const customArtwork = setCustomCaseInsertTitleArtworkImage(
    steamDefault,
    customImage,
  )
  const clearedArtwork = clearCaseInsertTitleArtworkImage(customArtwork)
  const restoredArtwork =
    restoreCaseInsertTitleArtworkDefaultSteamLogo(clearedArtwork)
  const caseInsert = createDefaultProjectJewelCaseState('Portal 2')
  const savedProject = createCaseInsertProjectSnapshot({
    manualGameTitle: 'Portal 2',
    caseInsert: {
      ...caseInsert,
      templates: {
        ...caseInsert.templates,
        cover: {
          ...caseInsert.templates.cover,
          titleArtwork: restoredArtwork,
        },
      },
    },
  })
  const loadedArtwork = restoreCaseInsertProjectState(
    savedProject,
  ).caseInsert.templates.cover.titleArtwork

  assert.equal(steamDefault.imageSource?.source, 'steam-artwork')
  assert.equal(steamDefault.imageSource?.sourceId, steamLogoAsset.id)
  assert.equal(customArtwork.imageSource?.source, 'uploaded')
  assert.equal(customArtwork.imageSource?.sourceLabel, 'case-logo.png')
  assert.equal(clearedArtwork.imageDataUrl, null)
  assert.equal(clearedArtwork.enabled, false)
  assert.equal(restoredArtwork.enabled, true)
  assert.equal(restoredArtwork.imageSource?.source, 'steam-artwork')
  assert.equal(restoredArtwork.imageDataUrl, steamImage.imageDataUrl)
  assert.equal(loadedArtwork.imageDataUrl, steamImage.imageDataUrl)
  assert.equal(loadedArtwork.imageSource?.sourceLabel, steamLogoAsset.label)
  assert.equal(loadedArtwork.defaultSteamLogo?.steamArtworkAssetId, steamLogoAsset.id)
})
