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
  let withFrame = updateAdditionalArtworkElementFrameField(
    withElement,
    elementId,
    'enabled',
    true,
  )

  withFrame = updateAdditionalArtworkElementFrameField(
    withFrame,
    elementId,
    'color',
    '#ffcc00',
  )
  withFrame = updateAdditionalArtworkElementFrameField(
    withFrame,
    elementId,
    'width',
    4,
  )
  withFrame = updateAdditionalArtworkElementFrameField(
    withFrame,
    elementId,
    'shape',
    'circle',
  )
  withFrame = updateAdditionalArtworkElementFrameField(
    withFrame,
    elementId,
    'style',
    'rocky',
  )
  withFrame = updateAdditionalArtworkElementFrameField(
    withFrame,
    elementId,
    'lumpiness',
    72,
  )
  withFrame = updateAdditionalArtworkElementFrameField(
    withFrame,
    elementId,
    'jaggedness',
    64,
  )
  withFrame = updateAdditionalArtworkElementFrameField(
    withFrame,
    elementId,
    'roughnessOffset',
    28,
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
  assert.equal(renderItem.frame.style, 'rocky')
  assert.equal(renderItem.frame.lumpiness, 72)
  assert.equal(renderItem.frame.jaggedness, 64)
  assert.equal(renderItem.frame.roughnessOffset, 28)

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

test('additional artwork global visibility preserves multiple elements and settings', () => {
  let additionalArtwork = createDefaultProjectAdditionalArtwork()

  additionalArtwork = addAdditionalArtworkElement(
    additionalArtwork,
    discTemplates.standardPrintableDisc,
  )
  additionalArtwork = addAdditionalArtworkElement(
    additionalArtwork,
    discTemplates.standardPrintableDisc,
  )

  const [firstId, secondId] = additionalArtwork.elements.map(({ id }) => id)

  additionalArtwork = setAdditionalArtworkElementImage(
    additionalArtwork,
    firstId!,
    importedImage,
    {
      source: 'custom',
      sourceId: null,
      sourceLabel: importedImage.fileName,
    },
  )
  additionalArtwork = setAdditionalArtworkElementImage(
    additionalArtwork,
    secondId!,
    {
      imageDataUrl: 'data:image/png;base64,second-additional',
      imageSize: { width: 720, height: 720 },
      fileName: 'second.png',
    },
    {
      source: 'custom',
      sourceId: null,
      sourceLabel: 'second.png',
    },
  )
  additionalArtwork = updateAdditionalArtworkElementLayoutField(
    additionalArtwork,
    secondId!,
    'scale',
    0.72,
  )
  additionalArtwork = updateAdditionalArtworkElementFrameField(
    updateAdditionalArtworkElementFrameField(
      updateAdditionalArtworkElementFrameField(
        additionalArtwork,
        secondId!,
        'enabled',
        true,
      ),
      secondId!,
      'style',
      'rocky',
    ),
    secondId!,
    'width',
    6,
  )

  const hidden = setAdditionalArtworkEnabled(additionalArtwork, false)

  assert.deepEqual(createAdditionalArtworkRenderItems(hidden), [])
  assert.equal(hidden.elements.length, 2)
  assert.equal(hidden.elements[0]!.imageDataUrl, importedImage.imageDataUrl)
  assert.equal(hidden.elements[1]!.imageDataUrl, 'data:image/png;base64,second-additional')
  assert.equal(hidden.elements[1]!.sourceLabel, 'second.png')
  assert.equal(hidden.elements[1]!.layout.scale, 0.72)
  assert.equal(hidden.elements[1]!.frame.enabled, true)
  assert.equal(hidden.elements[1]!.frame.style, 'rocky')
  assert.equal(hidden.elements[1]!.frame.width, 6)

  const restored = setAdditionalArtworkEnabled(hidden, true)
  const renderItems = createAdditionalArtworkRenderItems(restored)

  assert.equal(renderItems.length, 2)
  assert.equal(renderItems[1]!.imageDataUrl, 'data:image/png;base64,second-additional')
  assert.equal(renderItems[1]!.frame.style, 'rocky')
  assert.equal(renderItems[1]!.frame.width, 6)
})

test('additional artwork frame visibility preserves styling while omitting the frame', () => {
  const withElement = addAdditionalArtworkElement(
    createDefaultProjectAdditionalArtwork(),
    discTemplates.standardPrintableDisc,
  )
  const elementId = withElement.elements[0]!.id
  const withFrame = updateAdditionalArtworkElementFrameField(
    updateAdditionalArtworkElementFrameField(
      updateAdditionalArtworkElementFrameField(
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
        'style',
        'rocky',
      ),
      elementId,
      'color',
      '#0088ff',
    ),
    elementId,
    'width',
    9,
  )
  const hiddenFrame = updateAdditionalArtworkElementFrameField(
    withFrame,
    elementId,
    'enabled',
    false,
  )
  const visibleFrame = updateAdditionalArtworkElementFrameField(
    hiddenFrame,
    elementId,
    'enabled',
    true,
  )

  assert.equal(createAdditionalArtworkRenderItems(hiddenFrame)[0]!.frame.enabled, false)
  assert.equal(hiddenFrame.elements[0]!.frame.style, 'rocky')
  assert.equal(hiddenFrame.elements[0]!.frame.color, '#0088ff')
  assert.equal(hiddenFrame.elements[0]!.frame.width, 9)
  assert.equal(createAdditionalArtworkRenderItems(visibleFrame)[0]!.frame.enabled, true)
  assert.equal(createAdditionalArtworkRenderItems(visibleFrame)[0]!.frame.style, 'rocky')
  assert.equal(createAdditionalArtworkRenderItems(visibleFrame)[0]!.frame.width, 9)
})

test('additional artwork metal frame settings persist through render and normalization', () => {
  const withElement = addAdditionalArtworkElement(
    createDefaultProjectAdditionalArtwork(),
    discTemplates.standardPrintableDisc,
  )
  const elementId = withElement.elements[0]!.id
  let withMetalFrame = setAdditionalArtworkElementImage(
    withElement,
    elementId,
    importedImage,
    {
      source: 'custom',
      sourceId: null,
      sourceLabel: importedImage.fileName,
    },
  )

  withMetalFrame = updateAdditionalArtworkElementFrameField(
    withMetalFrame,
    elementId,
    'enabled',
    true,
  )
  withMetalFrame = updateAdditionalArtworkElementFrameField(
    withMetalFrame,
    elementId,
    'style',
    'metal',
  )
  withMetalFrame = updateAdditionalArtworkElementFrameField(
    withMetalFrame,
    elementId,
    'metalType',
    'copper',
  )
  withMetalFrame = updateAdditionalArtworkElementFrameField(
    withMetalFrame,
    elementId,
    'metalProfile',
    'double',
  )
  withMetalFrame = updateAdditionalArtworkElementFrameField(
    withMetalFrame,
    elementId,
    'metalPattern',
    'rivets',
  )
  withMetalFrame = updateAdditionalArtworkElementFrameField(
    withMetalFrame,
    elementId,
    'metalDepth',
    88,
  )
  withMetalFrame = updateAdditionalArtworkElementFrameField(
    withMetalFrame,
    elementId,
    'metalBevelWidth',
    34,
  )
  withMetalFrame = updateAdditionalArtworkElementFrameField(
    withMetalFrame,
    elementId,
    'metalLightAngle',
    225,
  )
  withMetalFrame = updateAdditionalArtworkElementFrameField(
    withMetalFrame,
    elementId,
    'metalBrushAngle',
    47,
  )
  withMetalFrame = updateAdditionalArtworkElementFrameField(
    withMetalFrame,
    elementId,
    'metalPolish',
    72,
  )
  withMetalFrame = updateAdditionalArtworkElementFrameField(
    withMetalFrame,
    elementId,
    'metalTarnish',
    41,
  )
  withMetalFrame = updateAdditionalArtworkElementFrameField(
    withMetalFrame,
    elementId,
    'metalPatternScale',
    132,
  )
  withMetalFrame = updateAdditionalArtworkElementFrameField(
    withMetalFrame,
    elementId,
    'metalPatternStrength',
    64,
  )

  const renderFrame = createAdditionalArtworkRenderItems(withMetalFrame)[0]!.frame

  assert.equal(renderFrame.style, 'metal')
  assert.equal(renderFrame.metalType, 'copper')
  assert.equal(renderFrame.metalProfile, 'double')
  assert.equal(renderFrame.metalPattern, 'rivets')
  assert.equal(renderFrame.metalDepth, 88)
  assert.equal(renderFrame.metalBevelWidth, 34)
  assert.equal('metalLightAngle' in renderFrame, false)
  assert.equal(renderFrame.metalBrushAngle, 47)
  assert.equal(renderFrame.metalPolish, 72)
  assert.equal(renderFrame.metalTarnish, 41)
  assert.equal(renderFrame.metalPatternScale, 132)
  assert.equal(renderFrame.metalPatternStrength, 64)

  const restored = normalizeProjectAdditionalArtwork(
    {
      enabled: true,
      elements: [
        {
          imageDataUrl: importedImage.imageDataUrl,
          imageSize: importedImage.imageSize,
          frame: {
            enabled: true,
            color: '#f9fafb',
            width: 2,
            shape: 'rectangle',
            style: 'metal',
            lumpiness: 50,
            jaggedness: 50,
            roughnessOffset: 0,
            metalType: 'gold',
            metalProfile: 'stepped',
            metalPattern: 'hammered',
            metalDepth: 150,
            metalBevelWidth: -12,
            metalLightAngle: 999,
            metalBrushAngle: 240,
            metalPolish: 25,
            metalTarnish: 150,
            metalPatternScale: 5,
            metalPatternStrength: 200,
          },
        },
      ],
    },
    discTemplates.standardPrintableDisc,
  )
  const restoredFrame = restored.elements[0]!.frame

  assert.equal(restoredFrame.style, 'metal')
  assert.equal(restoredFrame.metalType, 'gold')
  assert.equal(restoredFrame.metalProfile, 'stepped')
  assert.equal(restoredFrame.metalPattern, 'hammered')
  assert.equal(restoredFrame.metalDepth, 100)
  assert.equal(restoredFrame.metalBevelWidth, 0)
  assert.equal('metalLightAngle' in restoredFrame, false)
  assert.equal(restoredFrame.metalBrushAngle, 180)
  assert.equal(restoredFrame.metalPolish, 25)
  assert.equal(restoredFrame.metalTarnish, 100)
  assert.equal(restoredFrame.metalPatternScale, 20)
  assert.equal(restoredFrame.metalPatternStrength, 100)
})

test('additional artwork frame normalization keeps light editor vector state transient', () => {
  const restored = normalizeProjectAdditionalArtwork(
    {
      enabled: true,
      elements: [
        {
          imageDataUrl: importedImage.imageDataUrl,
          imageSize: importedImage.imageSize,
          frame: {
            enabled: true,
            style: 'metal',
            metalLightAngle: 90,
            lightVector: { x: 0, y: 0, z: 1 },
            materialLightVector: { x: 1, y: 0, z: 0 },
            materialLightSource: {
              mode: 'hemisphere-editor',
              version: 'future',
            },
          },
        },
      ],
    } as unknown as ProjectAdditionalArtworkInput,
    discTemplates.standardPrintableDisc,
  )
  const restoredFrame = restored.elements[0]!.frame as Record<string, unknown>

  assert.equal('metalLightAngle' in restoredFrame, false)
  assert.equal('lightVector' in restoredFrame, false)
  assert.equal('materialLightVector' in restoredFrame, false)
  assert.equal('materialLightSource' in restoredFrame, false)
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
            style: 'rocky',
            lumpiness: 150,
            jaggedness: -10,
            roughnessOffset: 25,
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
  assert.equal(restored.elements[0]!.frame.style, 'rocky')
  assert.equal(restored.elements[0]!.frame.lumpiness, 100)
  assert.equal(restored.elements[0]!.frame.jaggedness, 0)
  assert.equal(restored.elements[0]!.frame.roughnessOffset, 25)
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
