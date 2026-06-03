import assert from 'node:assert/strict'
import test from 'node:test'
import { DEFAULT_DISC_TEXT_SETTINGS, createDefaultDiscTextLayout, createDefaultDiscTextValues } from './index.ts'
import {
  createDefaultProjectDiscNumberArtwork,
  createDiscNumberBadgeRenderModel,
  getEffectiveDiscTextSettingsForDiscNumberArtwork,
  normalizeProjectDiscNumberArtwork,
  updateDiscNumberArtworkMode,
} from './discNumberArtwork.ts'

test('disc number artwork defaults to the plain text path', () => {
  const artwork = createDefaultProjectDiscNumberArtwork()
  const settings = {
    ...DEFAULT_DISC_TEXT_SETTINGS,
    discNumber: true,
  }

  assert.equal(artwork.mode, 'text')
  assert.equal(
    getEffectiveDiscTextSettingsForDiscNumberArtwork(settings, artwork).discNumber,
    true,
  )
  assert.equal(
    createDiscNumberBadgeRenderModel(
      artwork,
      settings,
      createDefaultDiscTextValues(),
      createDefaultDiscTextLayout('top'),
    ),
    null,
  )
})

test('disc number badge mode renders from existing disc number value and layout', () => {
  const artwork = updateDiscNumberArtworkMode(
    createDefaultProjectDiscNumberArtwork(),
    'badge',
  )
  const settings = {
    ...DEFAULT_DISC_TEXT_SETTINGS,
    discNumber: true,
  }
  const layout = createDefaultDiscTextLayout('top')
  const values = {
    ...createDefaultDiscTextValues(),
    discNumber: 'Disc 2 / 3',
  }
  const renderModel = createDiscNumberBadgeRenderModel(
    artwork,
    settings,
    values,
    layout,
  )

  assert.equal(
    getEffectiveDiscTextSettingsForDiscNumberArtwork(settings, artwork).discNumber,
    false,
  )
  assert.equal(renderModel?.text, 'Disc 2 / 3')
  assert.equal(renderModel?.layout, layout.discNumber)
  assert.ok(renderModel?.imageDataUrl.includes('starter-ring.svg'))
})

test('normalizes saved disc number artwork safely', () => {
  assert.deepEqual(
    normalizeProjectDiscNumberArtwork({
      mode: 'badge',
      badgeSet: 'starterRing',
    }),
    {
      mode: 'badge',
      badgeSet: 'starterRing',
    },
  )
  assert.deepEqual(
    normalizeProjectDiscNumberArtwork({
      mode: 'animated' as never,
      badgeSet: 'unknown' as never,
    }),
    createDefaultProjectDiscNumberArtwork(),
  )
})
