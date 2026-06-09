import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getDiscNumberBadgeImageSize,
  getEditorBuiltInImageAssets,
  getMediaMarkPlaceholderImageSize,
  getPlatformMarkPlaceholderImageSize,
  getRatingBadgePlaceholderRenderModel,
} from './assetManifest.ts'

test('editor built-in image manifest exposes positive image metadata for every asset', () => {
  const assets = getEditorBuiltInImageAssets()
  const ids = new Set<string>()

  assert.ok(assets.length > 0)

  for (const asset of assets) {
    assert.equal(ids.has(asset.id), false, `duplicate built-in asset id: ${asset.id}`)
    ids.add(asset.id)
    assert.equal(typeof asset.imageUrl, 'string')
    assert.ok(asset.imageUrl.length > 0, asset.id)
    assert.ok(asset.imageSize.width > 0, asset.id)
    assert.ok(asset.imageSize.height > 0, asset.id)
  }
})

test('built-in mark metadata includes active-pixel bounds and contours where needed', () => {
  const dataDisc = getMediaMarkPlaceholderImageSize('dataDisc', 'light')
  const windows11 = getPlatformMarkPlaceholderImageSize('windows', 'windows11')
  const discNumber = getDiscNumberBadgeImageSize('starterRing')
  const pegi16 = getRatingBadgePlaceholderRenderModel({
    ratingSystem: 'PEGI',
    ratingValue: '16',
  })

  assert.deepEqual(dataDisc.contentBounds, {
    x: 24,
    y: 24,
    width: 464,
    height: 464,
  })
  assert.ok(windows11.contentShape?.path.length)
  assert.equal(windows11.contentShape?.safetyOutset, 0)
  assert.deepEqual(discNumber.contentBounds, {
    x: 0,
    y: 4,
    width: 240,
    height: 124,
  })
  assert.deepEqual(pegi16.imageSize, {
    width: 181,
    height: 220,
  })
})
