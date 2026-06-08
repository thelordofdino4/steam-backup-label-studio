import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createRepeatedArtworkLabel,
  createRepeatedArtworkLabelForIndex,
  createRepeatedArtworkSlotId,
  createRepeatedArtworkSummary,
  getFeatureVisibleRepeatedArtworkItems,
  getNextRepeatedArtworkLabelNumber,
  getNextRepeatedArtworkSlotNumber,
  normalizeRepeatedArtworkLabel,
  shouldRenderRepeatedArtworkItem,
} from './repeatedArtwork.ts'

test('repeated artwork labels use shared Artwork numbering', () => {
  assert.equal(createRepeatedArtworkLabel(1), 'Artwork 1')
  assert.equal(createRepeatedArtworkLabelForIndex(1), 'Artwork 2')
  assert.equal(createRepeatedArtworkLabel(0), 'Artwork 1')
  assert.equal(normalizeRepeatedArtworkLabel('', 3), 'Artwork 3')
  assert.equal(normalizeRepeatedArtworkLabel('Key art', 3), 'Key art')
})

test('repeated artwork numbering skips existing ids and labels', () => {
  assert.equal(
    getNextRepeatedArtworkSlotNumber(
      [{ id: 'tray-artwork-1' }, { id: 'tray-artwork-3' }],
      'tray-artwork',
    ),
    4,
  )
  assert.equal(createRepeatedArtworkSlotId('tray-artwork', 4), 'tray-artwork-4')
  assert.equal(
    getNextRepeatedArtworkLabelNumber([
      { label: 'Artwork 1' },
      { label: 'Custom crop' },
      { label: 'Artwork 3' },
    ]),
    4,
  )
})

test('repeated artwork visibility and summaries keep the shared contract narrow', () => {
  const slots = [{ id: 'artwork-1' }, { id: 'artwork-2' }]

  assert.deepEqual(
    getFeatureVisibleRepeatedArtworkItems({ enabled: false }, slots),
    [],
  )
  assert.deepEqual(
    getFeatureVisibleRepeatedArtworkItems({ enabled: true }, slots),
    slots,
  )
  assert.deepEqual(
    getFeatureVisibleRepeatedArtworkItems(
      { additionalArtworkEnabled: true },
      slots,
    ),
    slots,
  )
  assert.equal(
    shouldRenderRepeatedArtworkItem({
      featureEnabled: true,
      itemEnabled: true,
      hasRenderableContent: true,
    }),
    true,
  )
  assert.equal(
    shouldRenderRepeatedArtworkItem({
      featureEnabled: false,
      itemEnabled: true,
      hasRenderableContent: true,
    }),
    false,
  )
  assert.equal(
    createRepeatedArtworkSummary({
      enabled: true,
      imageSummary: 'Steam screenshot',
      frame: { enabled: true, shape: 'circle' },
      details: ['fit contain', 'scale 1.25'],
    }),
    'shown · Steam screenshot · circle frame · fit contain · scale 1.25',
  )
})
