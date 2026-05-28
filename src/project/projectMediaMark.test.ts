import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createDefaultProjectPlatformMarks,
  getProjectPlatformMarkAsset,
  setPlatformMarkCustomImage,
} from './projectMediaMark.ts'
import type { ProjectPlatformMarks } from './projectTypes.ts'

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
