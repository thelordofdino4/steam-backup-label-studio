import assert from 'node:assert/strict'
import test from 'node:test'
import { discTemplates } from '../templates/discTemplates.ts'
import type { ImportedImageAsset } from '../utils/importedImageAsset.ts'
import { createDefaultProjectLogoAssets } from './projectLogoAssets.ts'
import { createDefaultProjectMediaMark, createDefaultProjectPlatformMarks } from './projectMediaMark.ts'
import { createDefaultProjectRatingBadge } from './projectRatingBadge.ts'
import {
  applyImportedLogoAsset,
  applyImportedMediaMark,
  applyImportedPlatformMark,
  applyImportedRatingBadge,
} from './projectVisualAssetImport.ts'

const importedImage: ImportedImageAsset = {
  imageDataUrl: 'data:image/png;base64,imported',
  imageSize: { width: 512, height: 256 },
  fileName: 'imported.png',
}

test('imported logo image enables and stores the selected logo asset', () => {
  const logoAssets = applyImportedLogoAsset(
    createDefaultProjectLogoAssets(),
    'developer',
    importedImage,
    discTemplates.standardPrintableDisc,
  )

  assert.equal(logoAssets.developerLogoDataUrl, importedImage.imageDataUrl)
  assert.deepEqual(logoAssets.developerLogoSize, importedImage.imageSize)
  assert.equal(logoAssets.developerLogoLayout.enabled, true)
  assert.equal(logoAssets.publisherLogoDataUrl, null)
})

test('imported rating badge image switches the badge to custom source', () => {
  const ratingBadge = applyImportedRatingBadge(
    createDefaultProjectRatingBadge(),
    importedImage,
    discTemplates.standardPrintableDisc,
  )

  assert.equal(ratingBadge.source, 'custom')
  assert.equal(ratingBadge.customImageDataUrl, importedImage.imageDataUrl)
  assert.deepEqual(ratingBadge.customImageSize, importedImage.imageSize)
  assert.equal(ratingBadge.layout.enabled, true)
})

test('imported media mark image switches the media mark to custom source', () => {
  const mediaMark = applyImportedMediaMark(
    createDefaultProjectMediaMark(),
    importedImage,
    discTemplates.standardPrintableDisc,
  )

  assert.equal(mediaMark.source, 'custom')
  assert.equal(mediaMark.customImageDataUrl, importedImage.imageDataUrl)
  assert.deepEqual(mediaMark.customImageSize, importedImage.imageSize)
  assert.equal(mediaMark.layout.enabled, true)
})

test('imported platform mark image enables the target platform mark', () => {
  const platformMarks = applyImportedPlatformMark(
    createDefaultProjectPlatformMarks(),
    'windows',
    importedImage,
    discTemplates.standardPrintableDisc,
  )
  const windowsMark = platformMarks.assets.windows

  assert.deepEqual(platformMarks.values, ['windows'])
  assert.equal(windowsMark?.source, 'custom')
  assert.equal(windowsMark?.customImageDataUrl, importedImage.imageDataUrl)
  assert.deepEqual(windowsMark?.customImageSize, importedImage.imageSize)
  assert.equal(windowsMark?.layout.enabled, true)
})
