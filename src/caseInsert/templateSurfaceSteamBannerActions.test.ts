import assert from 'node:assert/strict'
import test from 'node:test'
import {
  DEFAULT_STEAM_BANNER_LOCKUP_IMAGE_URL,
} from '../assets/assetManifest.ts'
import {
  createProjectImageAssetProvenance,
} from '../project/projectAssetStatus.ts'
import {
  createDefaultProjectJewelCaseState,
} from './defaults.ts'
import {
  DEFAULT_CASE_INSERT_COVER_STEAM_BANNER_LOCKUP_LAYOUT,
  DEFAULT_CASE_INSERT_STEAM_BANNER_COLORS,
} from './steamBanner.ts'
import {
  resetCaseInsertTemplateSteamBannerColors,
  resetCaseInsertTemplateSteamBannerLockupDefaultLayout,
  resetCaseInsertTemplateSteamBannerLockupImage,
  setCaseInsertTemplateSteamBannerEnabled,
  setCaseInsertTemplateSteamBannerUseTextFallback,
  setCustomCaseInsertTemplateSteamBannerLockupImage,
  updateCaseInsertTemplateSteamBannerColor,
  updateCaseInsertTemplateSteamBannerFallbackText,
  updateCaseInsertTemplateSteamBannerLockupLayoutValue,
} from './templateSurfaceSteamBannerActions.ts'

function createImportedLockupImage() {
  return {
    imageDataUrl: 'data:image/png;base64,custom-lockup',
    imageSize: { width: 320, height: 120 },
    imageSource: createProjectImageAssetProvenance({
      source: 'uploaded',
      sourceLabel: 'custom-lockup.png',
    }),
  }
}

test('template Steam banner actions update only the targeted cover or tray pane', () => {
  const state = createDefaultProjectJewelCaseState('Portal 2')
  const originalTrayBanner = state.templates.tray.steamBanner
  const updated = updateCaseInsertTemplateSteamBannerColor(
    setCaseInsertTemplateSteamBannerEnabled(state, 'cover', false),
    'cover',
    'accent',
    '#ffffff',
  )

  assert.equal(updated.templates.cover.steamBanner.enabled, false)
  assert.equal(updated.templates.cover.steamBanner.colors.accent, '#ffffff')
  assert.equal(updated.templates.tray.steamBanner, originalTrayBanner)
})

test('template Steam banner actions preserve cover-style lockup defaults for surfaces', () => {
  const state = createDefaultProjectJewelCaseState('Portal 2')
  const custom = setCustomCaseInsertTemplateSteamBannerLockupImage(
    state,
    'tray',
    createImportedLockupImage(),
  )
  const moved = updateCaseInsertTemplateSteamBannerLockupLayoutValue(
    custom,
    'tray',
    'x',
    24,
  )
  const resetLayout =
    resetCaseInsertTemplateSteamBannerLockupDefaultLayout(moved, 'tray')
  const resetImage = resetCaseInsertTemplateSteamBannerLockupImage(
    resetLayout,
    'tray',
  )

  assert.equal(
    custom.templates.tray.steamBanner.lockupImageSource?.sourceLabel,
    'custom-lockup.png',
  )
  assert.equal(moved.templates.tray.steamBanner.lockupLayout.x, 24)
  assert.deepEqual(
    resetLayout.templates.tray.steamBanner.lockupLayout,
    DEFAULT_CASE_INSERT_COVER_STEAM_BANNER_LOCKUP_LAYOUT,
  )
  assert.equal(
    resetImage.templates.tray.steamBanner.lockupImageDataUrl,
    DEFAULT_STEAM_BANNER_LOCKUP_IMAGE_URL,
  )
  assert.equal(
    resetImage.templates.tray.steamBanner.lockupImageSource?.sourceLabel,
    'Default Steam banner lockup',
  )
})

test('template Steam banner text and color actions preserve saved values until reset', () => {
  const state = createDefaultProjectJewelCaseState('Portal 2')
  const updated = updateCaseInsertTemplateSteamBannerFallbackText(
    setCaseInsertTemplateSteamBannerUseTextFallback(state, 'cover', true),
    'cover',
    'Steam Archive',
  )
  const recolored = updateCaseInsertTemplateSteamBannerColor(
    updated,
    'cover',
    'gradientStart',
    '#111111',
  )
  const reset = resetCaseInsertTemplateSteamBannerColors(recolored, 'cover')

  assert.equal(updated.templates.cover.steamBanner.useTextFallback, true)
  assert.equal(updated.templates.cover.steamBanner.fallbackText, 'Steam Archive')
  assert.equal(recolored.templates.cover.steamBanner.colors.gradientStart, '#111111')
  assert.deepEqual(
    reset.templates.cover.steamBanner.colors,
    DEFAULT_CASE_INSERT_STEAM_BANNER_COLORS,
  )
  assert.equal(reset.templates.cover.steamBanner.fallbackText, 'Steam Archive')
})
