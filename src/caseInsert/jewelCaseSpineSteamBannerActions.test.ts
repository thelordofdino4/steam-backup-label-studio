import assert from 'node:assert/strict'
import test from 'node:test'
import {
  DEFAULT_STEAM_BANNER_SPINE_ICON_IMAGE_URL,
} from '../assets/assetManifest.ts'
import {
  createProjectImageAssetProvenance,
} from '../project/projectAssetStatus.ts'
import {
  createDefaultProjectJewelCaseState,
} from './defaults.ts'
import {
  setJewelCaseSpineMirrored,
} from './jewelCaseTransitions.ts'
import {
  DEFAULT_CASE_INSERT_SPINE_STEAM_BANNER_LOCKUP_LAYOUT,
  DEFAULT_CASE_INSERT_STEAM_BANNER_COLORS,
} from './steamBanner.ts'
import {
  resetJewelCaseSpineSteamBannerColors,
  resetJewelCaseSpineSteamBannerLockupDefaultLayout,
  resetJewelCaseSpineSteamBannerLockupImage,
  setCustomJewelCaseSpineSteamBannerLockupImage,
  setJewelCaseSpineSteamBannerEnabled,
  setJewelCaseSpineSteamBannerUseTextFallback,
  updateJewelCaseSpineSteamBannerColor,
  updateJewelCaseSpineSteamBannerFallbackText,
  updateJewelCaseSpineSteamBannerLockupLayoutValue,
} from './jewelCaseSpineSteamBannerActions.ts'

function createImportedSpineIcon() {
  return {
    imageDataUrl: 'data:image/png;base64,custom-spine-icon',
    imageSize: { width: 96, height: 96 },
    imageSource: createProjectImageAssetProvenance({
      source: 'uploaded',
      sourceLabel: 'custom-spine-icon.png',
    }),
  }
}

test('spine Steam banner actions apply mirrored edits to both sides', () => {
  const state = createDefaultProjectJewelCaseState('Portal 2')
  const updated = updateJewelCaseSpineSteamBannerColor(
    setJewelCaseSpineSteamBannerEnabled(state, 'left', false),
    'left',
    'accent',
    '#ffffff',
  )

  assert.equal(updated.spine.left.steamBanner.enabled, false)
  assert.equal(updated.spine.right.steamBanner.enabled, false)
  assert.equal(updated.spine.left.steamBanner.colors.accent, '#ffffff')
  assert.equal(updated.spine.right.steamBanner.colors.accent, '#ffffff')
  assert.equal(updated.templates, state.templates)
})

test('spine Steam banner actions preserve the opposite side when mirroring is off', () => {
  const state = setJewelCaseSpineMirrored(
    createDefaultProjectJewelCaseState('Portal 2'),
    false,
  )
  const updated = updateJewelCaseSpineSteamBannerFallbackText(
    setJewelCaseSpineSteamBannerUseTextFallback(state, 'left', true),
    'left',
    'Left Archive',
  )

  assert.equal(updated.spine.left.steamBanner.useTextFallback, true)
  assert.equal(updated.spine.left.steamBanner.fallbackText, 'Left Archive')
  assert.equal(updated.spine.right.steamBanner, state.spine.right.steamBanner)
})

test('spine Steam banner icon actions preserve spine defaults', () => {
  const state = createDefaultProjectJewelCaseState('Portal 2')
  const custom = setCustomJewelCaseSpineSteamBannerLockupImage(
    state,
    'right',
    createImportedSpineIcon(),
  )
  const moved = updateJewelCaseSpineSteamBannerLockupLayoutValue(
    custom,
    'right',
    'rotation',
    12,
  )
  const resetLayout =
    resetJewelCaseSpineSteamBannerLockupDefaultLayout(moved, 'right')
  const resetImage =
    resetJewelCaseSpineSteamBannerLockupImage(resetLayout, 'right')

  assert.equal(
    custom.spine.right.steamBanner.lockupImageSource?.sourceLabel,
    'custom-spine-icon.png',
  )
  assert.equal(moved.spine.right.steamBanner.lockupLayout.rotation, 12)
  assert.deepEqual(
    resetLayout.spine.right.steamBanner.lockupLayout,
    DEFAULT_CASE_INSERT_SPINE_STEAM_BANNER_LOCKUP_LAYOUT,
  )
  assert.equal(
    resetImage.spine.right.steamBanner.lockupImageDataUrl,
    DEFAULT_STEAM_BANNER_SPINE_ICON_IMAGE_URL,
  )
  assert.equal(
    resetImage.spine.right.steamBanner.lockupImageSource?.sourceLabel,
    'Default Steam spine icon',
  )
})

test('spine Steam banner color reset preserves fallback text state', () => {
  const state = createDefaultProjectJewelCaseState('Portal 2')
  const updated = updateJewelCaseSpineSteamBannerFallbackText(
    setJewelCaseSpineSteamBannerUseTextFallback(state, 'left', true),
    'left',
    'Steam Spine',
  )
  const recolored = updateJewelCaseSpineSteamBannerColor(
    updated,
    'left',
    'gradientEnd',
    '#111111',
  )
  const reset = resetJewelCaseSpineSteamBannerColors(recolored, 'left')

  assert.equal(recolored.spine.left.steamBanner.colors.gradientEnd, '#111111')
  assert.deepEqual(
    reset.spine.left.steamBanner.colors,
    DEFAULT_CASE_INSERT_STEAM_BANNER_COLORS,
  )
  assert.equal(reset.spine.left.steamBanner.fallbackText, 'Steam Spine')
})
