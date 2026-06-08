import assert from 'node:assert/strict'
import test from 'node:test'
import { createJewelCasePreviewLayout } from '../layout/caseInsertPreviewLayout.ts'
import { getJewelCaseSteamBannerVisualLayout } from '../layout/jewelCaseSteamBannerLayout.ts'
import {
  DEFAULT_CASE_INSERT_STEAM_BANNER_COLORS,
  createDefaultCaseInsertSteamBanner,
  normalizeCaseInsertSteamBanner,
  resetCaseInsertSteamBannerColors,
  resetCaseInsertSteamBannerLockupImage,
  setCaseInsertSteamBannerEnabled,
  setCustomCaseInsertSteamBannerLockupImage,
  updateCaseInsertSteamBannerColor,
  updateCaseInsertSteamBannerFallbackText,
  updateCaseInsertSteamBannerLockupLayoutField,
  setCaseInsertSteamBannerUseTextFallback,
} from './steamBanner.ts'

const TEST_LOCKUP_IMAGE = {
  imageDataUrl: 'data:image/png;base64,steam-lockup',
  imageSize: {
    width: 128,
    height: 64,
  },
}

test('case insert Steam banner resets colors without changing template defaults', () => {
  const banner = createDefaultCaseInsertSteamBanner('cover')
  const updated = updateCaseInsertSteamBannerColor(
    banner,
    'gradientStart',
    '#ffffff',
  )
  const reset = resetCaseInsertSteamBannerColors(updated)

  assert.equal(updated.colors.gradientStart, '#ffffff')
  assert.deepEqual(reset.colors, DEFAULT_CASE_INSERT_STEAM_BANNER_COLORS)
})

test('case insert Steam banner source switching keeps cover and spine labels distinct', () => {
  const coverBanner = createDefaultCaseInsertSteamBanner('cover')
  const coverCustom = setCustomCaseInsertSteamBannerLockupImage(
    coverBanner,
    TEST_LOCKUP_IMAGE,
    'cover',
  )
  const coverReset = resetCaseInsertSteamBannerLockupImage(coverCustom, 'cover')
  const spineBanner = createDefaultCaseInsertSteamBanner('spine')
  const spineCustom = setCustomCaseInsertSteamBannerLockupImage(
    spineBanner,
    TEST_LOCKUP_IMAGE,
    'spine',
  )
  const spineReset = resetCaseInsertSteamBannerLockupImage(spineCustom, 'spine')

  assert.equal(coverCustom.lockupImageSource?.source, 'embedded')
  assert.equal(
    coverCustom.lockupImageSource?.sourceLabel,
    'Custom Steam banner lockup',
  )
  assert.equal(coverReset.lockupImageSource?.source, 'built-in')
  assert.equal(
    coverReset.lockupImageSource?.sourceLabel,
    'Default Steam banner lockup',
  )
  assert.equal(spineCustom.lockupImageSource?.source, 'embedded')
  assert.equal(
    spineCustom.lockupImageSource?.sourceLabel,
    'Custom Steam spine icon',
  )
  assert.equal(spineReset.lockupImageSource?.source, 'built-in')
  assert.equal(
    spineReset.lockupImageSource?.sourceLabel,
    'Default Steam spine icon',
  )
})

test('case insert Steam banner disable preserves state and omits preview layout', () => {
  const layout = createJewelCasePreviewLayout('jewelCase', 'front')
  const customized = updateCaseInsertSteamBannerFallbackText(
    setCaseInsertSteamBannerUseTextFallback(
      updateCaseInsertSteamBannerLockupLayoutField(
        setCustomCaseInsertSteamBannerLockupImage(
          createDefaultCaseInsertSteamBanner('cover'),
          TEST_LOCKUP_IMAGE,
          'cover',
        ),
        'x',
        12,
      ),
      true,
    ),
    'Archive Build',
  )
  const disabled = setCaseInsertSteamBannerEnabled(customized, false)
  const restored = normalizeCaseInsertSteamBanner(disabled, 'cover')
  const reenabled = setCaseInsertSteamBannerEnabled(restored, true)

  assert.equal(disabled.enabled, false)
  assert.equal(disabled.lockupImageDataUrl, TEST_LOCKUP_IMAGE.imageDataUrl)
  assert.equal(disabled.lockupLayout.x, 12)
  assert.equal(disabled.fallbackText, 'Archive Build')
  assert.equal(
    getJewelCaseSteamBannerVisualLayout(disabled, { kind: 'cover' }, layout),
    null,
  )
  assert.equal(restored.enabled, false)
  assert.equal(restored.lockupImageDataUrl, TEST_LOCKUP_IMAGE.imageDataUrl)
  assert.equal(restored.lockupLayout.x, 12)
  assert.equal(restored.useTextFallback, true)
  assert.notEqual(
    getJewelCaseSteamBannerVisualLayout(reenabled, { kind: 'cover' }, layout),
    null,
  )
})
