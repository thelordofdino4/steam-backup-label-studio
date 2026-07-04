import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getDiscNumberBadgeImageSize,
  getEditorBuiltInImageAssets,
  getArtworkFrameTextureImageSize,
  getMediaMarkPlaceholderImageSize,
  getPlatformMarkPlaceholderImageSize,
  getRatingBadgePlaceholderImageSize,
  getRatingBadgePlaceholderImageUrl,
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

  assert.equal(ids.has('rating:ESRB:E10+'), true)
  assert.equal(ids.has('rating:PEGI:16'), true)
  assert.equal(ids.has('rating:USK:12'), true)
})

test('built-in mark metadata includes active-pixel bounds and contours where needed', () => {
  const dataDisc = getMediaMarkPlaceholderImageSize('dataDisc', 'light')
  const windows11 = getPlatformMarkPlaceholderImageSize('windows', 'windows11')
  const discNumber = getDiscNumberBadgeImageSize('starterRing')
  const rockyFrameTexture = getArtworkFrameTextureImageSize('rocky')
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
  assert.deepEqual(rockyFrameTexture, {
    width: 1254,
    height: 1254,
  })
  assert.deepEqual(pegi16.imageSize, {
    width: 181,
    height: 220,
  })
})

test('rating badge placeholder asset resolution keeps URL size and labels aligned', () => {
  const builtInMetadata = {
    ratingSystem: 'ESRB' as const,
    ratingValue: 'E10+',
  }
  const builtInModel = getRatingBadgePlaceholderRenderModel(builtInMetadata)

  assert.equal(
    builtInModel.imageUrl,
    getRatingBadgePlaceholderImageUrl(builtInMetadata),
  )
  assert.deepEqual(
    builtInModel.imageSize,
    getRatingBadgePlaceholderImageSize(builtInMetadata),
  )
  assert.equal(builtInModel.overlayLabel, null)
  assert.equal(builtInModel.altLabel, 'ESRB E10+ rating badge')

  const customModel = getRatingBadgePlaceholderRenderModel({
    ratingSystem: 'custom',
    ratingValue: 'GRAC 15',
  })

  assert.equal(customModel.overlayLabel, 'GRAC 15')
  assert.equal(customModel.altLabel, 'GRAC 15 rating badge')

  const noneModel = getRatingBadgePlaceholderRenderModel({
    ratingSystem: 'none',
    ratingValue: '',
  })

  assert.equal(noneModel.overlayLabel, '')
  assert.equal(noneModel.altLabel, 'Rating badge')
})
