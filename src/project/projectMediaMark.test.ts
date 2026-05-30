import assert from 'node:assert/strict'
import test from 'node:test'
import {
  MEDIA_MARK_OPTIONS,
  PLATFORM_MARK_OPTIONS,
  createDefaultProjectPlatformMarks,
  getMediaMarkLabel,
  getPlatformMarkLabel,
  getProjectPlatformMarkAsset,
  getProjectPlatformMarkInference,
  normalizeProjectMediaMark,
  normalizeProjectPlatformMarks,
  setPlatformMarkCustomImage,
} from './projectMediaMark.ts'
import type { ProjectPlatformMarks } from './projectTypes.ts'

test('media mark options include a Blu-ray built-in generic mark', () => {
  assert.ok(MEDIA_MARK_OPTIONS.some((option) => option.value === 'bluRay' && option.label === 'Blu-ray'))

  const normalized = normalizeProjectMediaMark({
    value: 'bluRay',
    source: 'placeholder',
  })

  assert.equal(normalized.value, 'bluRay')
  assert.equal(getMediaMarkLabel(normalized.value), 'Blu-ray')
})

test('platform mark saved value keeps compatibility while showing SteamOS wording', () => {
  assert.ok(PLATFORM_MARK_OPTIONS.some((option) => option.value === 'steamDeck' && option.label === 'SteamOS'))
  assert.equal(getPlatformMarkLabel('steamDeck'), 'SteamOS')
})

test('selected platform marks materialize default assets when assets are missing', () => {
  const platformMarks: ProjectPlatformMarks = {
    values: ['pc'],
    assets: {},
  }

  const asset = getProjectPlatformMarkAsset(platformMarks, 'pc')

  assert.equal(asset.source, 'placeholder')
  assert.equal(asset.layout.enabled, true)
  assert.equal(asset.layout.x, 24)
  assert.equal(asset.layout.y, 70)
})

test('custom platform mark upload state enables the target asset', () => {
  const imageDataUrl = 'data:image/png;base64,custom-platform-mark'
  const platformMarks = setPlatformMarkCustomImage(
    createDefaultProjectPlatformMarks(),
    'windows',
    imageDataUrl,
    { width: 512, height: 256 },
  )

  const asset = getProjectPlatformMarkAsset(platformMarks, 'windows')

  assert.deepEqual(platformMarks.values, ['windows'])
  assert.equal(asset.source, 'custom')
  assert.equal(asset.customImageDataUrl, imageDataUrl)
  assert.deepEqual(asset.customImageSize, { width: 512, height: 256 })
  assert.equal(asset.layout.enabled, true)
})

test('older saved platform marks without inference normalize as manual selections', () => {
  const normalized = normalizeProjectPlatformMarks(
    {
      values: ['windows', 'linux'],
      assets: {},
    },
    undefined,
    undefined,
    123,
  )
  const inference = getProjectPlatformMarkInference(normalized)

  assert.deepEqual(normalized.values, ['windows', 'linux'])
  assert.equal(inference.source, 'manual')
  assert.equal(inference.status, 'manual')
  assert.equal(inference.steamAppId, 123)
  assert.deepEqual(inference.values, ['windows', 'linux'])
})
