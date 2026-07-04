import assert from 'node:assert/strict'
import test from 'node:test'
import { discTemplates } from '../templates/discTemplates.ts'
import {
  normalizeProjectAdditionalArtwork,
} from './projectAdditionalArtwork.ts'
import type { ImportedImageAsset } from '../utils/importedImageAsset.ts'
import type { ProjectAdditionalArtworkInput } from './projectTypes.ts'

const importedImage: ImportedImageAsset = {
  imageDataUrl: 'data:image/png;base64,additional',
  imageSize: { width: 1024, height: 512 },
  fileName: 'additional.png',
}

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
