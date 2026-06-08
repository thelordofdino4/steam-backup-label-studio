import assert from 'node:assert/strict'
import test from 'node:test'
import {
  DEFAULT_STEAM_BANNER_COLORS,
  getCustomSteamBannerLockupSourceLabel,
  getDefaultSteamBannerLockupSourceLabel,
  isCustomSteamBannerLockupSource,
  updateSteamBannerColor,
} from './steamBannerDefaults.ts'

test('Steam banner source labels are shared across banner lockup targets', () => {
  assert.equal(
    getDefaultSteamBannerLockupSourceLabel('banner-lockup'),
    'Default Steam banner lockup',
  )
  assert.equal(
    getDefaultSteamBannerLockupSourceLabel('spine-icon'),
    'Default Steam spine icon',
  )
  assert.equal(
    getCustomSteamBannerLockupSourceLabel('banner-lockup'),
    'Custom Steam banner lockup',
  )
  assert.equal(
    getCustomSteamBannerLockupSourceLabel('spine-icon'),
    'Custom Steam spine icon',
  )
})

test('Steam banner helpers keep color updates and custom-source detection neutral', () => {
  const colors = updateSteamBannerColor(
    DEFAULT_STEAM_BANNER_COLORS,
    'accent',
    '#ffffff',
  )

  assert.equal(colors.accent, '#ffffff')
  assert.equal(colors.gradientStart, DEFAULT_STEAM_BANNER_COLORS.gradientStart)
  assert.equal(
    isCustomSteamBannerLockupSource({ source: 'built-in' }),
    false,
  )
  assert.equal(
    isCustomSteamBannerLockupSource({ source: 'uploaded' }),
    true,
  )
  assert.equal(isCustomSteamBannerLockupSource(null), true)
})
