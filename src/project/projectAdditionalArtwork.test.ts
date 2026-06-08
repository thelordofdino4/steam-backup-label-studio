import assert from 'node:assert/strict'
import test from 'node:test'
import { discTemplates } from '../templates/discTemplates.ts'
import {
  addAdditionalArtworkElement,
  clearAdditionalArtworkElementImage,
  createAdditionalArtworkRenderItems,
  createDefaultProjectAdditionalArtwork,
  normalizeProjectAdditionalArtwork,
  removeAdditionalArtworkElement,
  resetAdditionalArtworkElementFrame,
  setAdditionalArtworkEnabled,
  setAdditionalArtworkElementImage,
  updateAdditionalArtworkElementLabel,
  updateAdditionalArtworkElementFrameField,
  updateAdditionalArtworkElementLayoutField,
} from './projectAdditionalArtwork.ts'
import type { ImportedImageAsset } from '../utils/importedImageAsset.ts'
import type { ProjectAdditionalArtworkInput } from './projectTypes.ts'

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

test('additional artwork elements default to editable frames that render with the item', () => {
  const withElement = addAdditionalArtworkElement(
    createDefaultProjectAdditionalArtwork(),
    discTemplates.standardPrintableDisc,
  )
  const elementId = withElement.elements[0]!.id
  const withFrame = updateAdditionalArtworkElementFrameField(
    updateAdditionalArtworkElementFrameField(
      updateAdditionalArtworkElementFrameField(
        updateAdditionalArtworkElementFrameField(
          withElement,
          elementId,
          'enabled',
          true,
        ),
        elementId,
        'color',
        '#ffcc00',
      ),
      elementId,
      'width',
      4,
    ),
    elementId,
    'shape',
    'circle',
  )
  const withImage = setAdditionalArtworkElementImage(
    withFrame,
    elementId,
    importedImage,
    {
      source: 'custom',
      sourceId: null,
      sourceLabel: importedImage.fileName,
    },
  )
  const renderItem = createAdditionalArtworkRenderItems(withImage)[0]!

  assert.equal(renderItem.label, 'Artwork 1')
  assert.equal(renderItem.frame.enabled, true)
  assert.equal(renderItem.frame.color, '#ffcc00')
  assert.equal(renderItem.frame.width, 4)
  assert.equal(renderItem.frame.shape, 'circle')

  const reset = resetAdditionalArtworkElementFrame(withImage, elementId)

  assert.equal(reset.elements[0]!.frame.enabled, false)
  assert.equal(reset.elements[0]!.imageDataUrl, importedImage.imageDataUrl)
})

test('additional artwork elements use shared numbering labels when added', () => {
  let additionalArtwork = createDefaultProjectAdditionalArtwork()

  additionalArtwork = addAdditionalArtworkElement(
    additionalArtwork,
    discTemplates.standardPrintableDisc,
  )
  additionalArtwork = addAdditionalArtworkElement(
    additionalArtwork,
    discTemplates.standardPrintableDisc,
  )

  assert.deepEqual(
    additionalArtwork.elements.map(({ label }) => label),
    ['Artwork 1', 'Artwork 2'],
  )

  additionalArtwork = removeAdditionalArtworkElement(
    additionalArtwork,
    additionalArtwork.elements[0]!.id,
  )
  additionalArtwork = addAdditionalArtworkElement(
    additionalArtwork,
    discTemplates.standardPrintableDisc,
  )

  assert.deepEqual(
    additionalArtwork.elements.map(({ label }) => label),
    ['Artwork 2', 'Artwork 3'],
  )
})

test('additional artwork labels persist through updates and render items', () => {
  const withElement = addAdditionalArtworkElement(
    createDefaultProjectAdditionalArtwork(),
    discTemplates.standardPrintableDisc,
  )
  const elementId = withElement.elements[0]!.id
  const withLabel = updateAdditionalArtworkElementLabel(
    withElement,
    elementId,
    'Character render',
  )
  const withImage = setAdditionalArtworkElementImage(
    withLabel,
    elementId,
    importedImage,
    {
      source: 'custom',
      sourceId: null,
      sourceLabel: importedImage.fileName,
    },
  )

  assert.equal(withImage.elements[0]!.label, 'Character render')
  assert.equal(createAdditionalArtworkRenderItems(withImage)[0]!.label, 'Character render')
})

test('additional artwork global visibility preserves state while omitting render items', () => {
  const withElement = addAdditionalArtworkElement(
    createDefaultProjectAdditionalArtwork(),
    discTemplates.standardPrintableDisc,
  )
  const elementId = withElement.elements[0]!.id
  const withImageAndFrame = updateAdditionalArtworkElementFrameField(
    updateAdditionalArtworkElementFrameField(
      setAdditionalArtworkElementImage(
        withElement,
        elementId,
        importedImage,
        {
          source: 'custom',
          sourceId: null,
          sourceLabel: importedImage.fileName,
        },
      ),
      elementId,
      'enabled',
      true,
    ),
    elementId,
    'width',
    3,
  )
  const hidden = setAdditionalArtworkEnabled(withImageAndFrame, false)
  const restored = normalizeProjectAdditionalArtwork(
    hidden,
    discTemplates.standardPrintableDisc,
  )

  assert.deepEqual(createAdditionalArtworkRenderItems(hidden), [])
  assert.equal(hidden.elements[0]!.imageDataUrl, importedImage.imageDataUrl)
  assert.equal(hidden.elements[0]!.frame.enabled, true)
  assert.equal(hidden.elements[0]!.frame.width, 3)
  assert.equal(restored.enabled, false)
  assert.equal(restored.elements[0]!.imageDataUrl, importedImage.imageDataUrl)
  assert.equal(restored.elements[0]!.frame.width, 3)
  assert.equal(
    createAdditionalArtworkRenderItems(
      setAdditionalArtworkEnabled(restored, true),
    ).length,
    1,
  )
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
          frame: {
            enabled: true,
            color: '#00ff88',
            width: 99,
            shape: 'circle',
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
  assert.equal(restored.elements[0]!.label, 'Artwork 1')
  assert.equal(restored.elements[0]!.source, 'steam-artwork')
  assert.equal(restored.elements[0]!.layout.scale, 1.5)
  assert.equal(restored.elements[0]!.frame.enabled, true)
  assert.equal(restored.elements[0]!.frame.color, '#00ff88')
  assert.equal(restored.elements[0]!.frame.width, 8)
  assert.equal(restored.elements[0]!.frame.shape, 'circle')
})

test('normalizes web artwork as a saved additional artwork source', () => {
  const restored = normalizeProjectAdditionalArtwork(
    {
      enabled: true,
      elements: [
        {
          source: 'web-artwork',
          sourceId: 'remote-key-art',
          sourceLabel: 'Remote key art',
          imageDataUrl: importedImage.imageDataUrl,
          imageSize: importedImage.imageSize,
        },
      ],
    },
    discTemplates.standardPrintableDisc,
  )

  assert.equal(restored.elements[0]!.source, 'web-artwork')
  assert.equal(restored.elements[0]!.sourceId, 'remote-key-art')
  assert.equal(restored.elements[0]!.sourceLabel, 'Remote key art')
})

test('disc additional artwork uses shared saved image field normalization', () => {
  const restored = normalizeProjectAdditionalArtwork(
    {
      enabled: 'yes',
      elements: [
        {
          id: 'invalid-image',
          sourceId: '   ',
          imageDataUrl: 42,
          imageSize: { width: 'wide', height: 600 },
          layout: {
            enabled: 'true',
            scale: Number.NaN,
            x: 'left',
            y: 75,
          },
        },
      ],
    } as unknown as ProjectAdditionalArtworkInput,
  )
  const element = restored.elements[0]!

  assert.equal(restored.enabled, true)
  assert.equal(element.sourceId, null)
  assert.equal(element.imageDataUrl, null)
  assert.equal(element.imageSize, null)
  assert.equal(element.layout.enabled, true)
  assert.equal(element.layout.scale, 1)
  assert.equal(element.layout.x, 68)
  assert.equal(element.layout.y, 75)
})
