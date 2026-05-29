import assert from 'node:assert/strict'
import test from 'node:test'
import { discTemplates } from '../templates/discTemplates.ts'
import {
  addAdditionalArtworkElement,
  clearAdditionalArtworkElementImage,
  createAdditionalArtworkRenderItems,
  createDefaultProjectAdditionalArtwork,
  normalizeProjectAdditionalArtwork,
  setAdditionalArtworkElementImage,
  updateAdditionalArtworkElementLayoutField,
} from './projectAdditionalArtwork.ts'
import type { ImportedImageAsset } from '../utils/importedImageAsset.ts'

const importedImage: ImportedImageAsset = {
  imageDataUrl: 'data:image/png;base64,additional',
  imageSize: { width: 1024, height: 512 },
  fileName: 'additional.png',
}

test('additional artwork defaults to a hidden empty optional system', () => {
  const additionalArtwork = createDefaultProjectAdditionalArtwork()

  assert.equal(additionalArtwork.enabled, false)
  assert.deepEqual(additionalArtwork.elements, [])
  assert.deepEqual(createAdditionalArtworkRenderItems(additionalArtwork), [])
})

test('additional artwork render items require feature, element, and image visibility', () => {
  const withElement = addAdditionalArtworkElement(
    createDefaultProjectAdditionalArtwork(),
    discTemplates.standardPrintableDisc,
  )
  const elementId = withElement.elements[0]!.id
  const withImage = setAdditionalArtworkElementImage(
    withElement,
    elementId,
    importedImage,
    {
      source: 'custom',
      sourceId: null,
      sourceLabel: importedImage.fileName,
    },
  )

  assert.equal(createAdditionalArtworkRenderItems(withImage).length, 1)

  const hiddenElement = updateAdditionalArtworkElementLayoutField(
    withImage,
    elementId,
    'enabled',
    false,
  )

  assert.deepEqual(createAdditionalArtworkRenderItems(hiddenElement), [])
  assert.equal(hiddenElement.elements[0]!.imageDataUrl, importedImage.imageDataUrl)

  const clearedElement = clearAdditionalArtworkElementImage(withImage, elementId)

  assert.deepEqual(createAdditionalArtworkRenderItems(clearedElement), [])
  assert.equal(clearedElement.elements[0]!.layout.enabled, true)
})

test('normalizes missing and saved additional artwork state safely', () => {
  const missing = normalizeProjectAdditionalArtwork(
    undefined,
    discTemplates.standardPrintableDisc,
  )
  const restored = normalizeProjectAdditionalArtwork(
    {
      enabled: false,
      elements: [
        {
          id: 'extra-art',
          source: 'steam-artwork',
          sourceId: 'steam-header',
          sourceLabel: 'Steam header',
          imageDataUrl: importedImage.imageDataUrl,
          imageSize: importedImage.imageSize,
          layout: {
            enabled: true,
            scale: 1.5,
            x: 99,
            y: 99,
          },
        },
      ],
    },
    discTemplates.standardPrintableDisc,
  )

  assert.equal(missing.enabled, false)
  assert.deepEqual(missing.elements, [])
  assert.equal(restored.enabled, false)
  assert.equal(restored.elements[0]!.id, 'extra-art')
  assert.equal(restored.elements[0]!.source, 'steam-artwork')
  assert.equal(restored.elements[0]!.layout.scale, 1.5)
})
