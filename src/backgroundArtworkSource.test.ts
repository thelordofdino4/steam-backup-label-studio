import assert from 'node:assert/strict'
import test from 'node:test'
import {
  canTuneBackgroundArtworkSource,
  resolveActiveBackgroundArtworkSource,
} from './backgroundArtworkSource.ts'

test('resolves no active source when no background image is selected', () => {
  assert.equal(
    resolveActiveBackgroundArtworkSource({
      backgroundImageUrl: null,
      selectedArtworkId: 'steam-hero',
      steamArtwork: [{ id: 'steam-hero' }],
      webArtworkCandidates: [],
      localSteamScreenshots: [],
    }),
    'none',
  )
})

test('resolves local file source for uploaded or restored background images', () => {
  assert.equal(
    resolveActiveBackgroundArtworkSource({
      backgroundImageUrl: 'data:image/png;base64,background',
      selectedArtworkId: null,
      steamArtwork: [],
      webArtworkCandidates: [],
      localSteamScreenshots: [],
    }),
    'local-file',
  )
})

test('resolves selected Steam, web, and local screenshot background sources', () => {
  const sharedParams = {
    backgroundImageUrl: 'data:image/png;base64,background',
    steamArtwork: [{ id: 'steam-hero' }],
    webArtworkCandidates: [{ id: 'web-logo' }],
    localSteamScreenshots: [{ id: 'local-shot' }],
  }

  assert.equal(
    resolveActiveBackgroundArtworkSource({
      ...sharedParams,
      selectedArtworkId: 'steam-hero',
    }),
    'steam-artwork',
  )
  assert.equal(
    resolveActiveBackgroundArtworkSource({
      ...sharedParams,
      selectedArtworkId: 'web-logo',
    }),
    'web-artwork',
  )
  assert.equal(
    resolveActiveBackgroundArtworkSource({
      ...sharedParams,
      selectedArtworkId: 'local-shot',
    }),
    'local-steam-screenshot',
  )
})

test('enables tuning only for the active background source', () => {
  assert.equal(
    canTuneBackgroundArtworkSource('local-file', 'local-file', true),
    true,
  )
  assert.equal(
    canTuneBackgroundArtworkSource('local-file', 'web-artwork', true),
    false,
  )
  assert.equal(
    canTuneBackgroundArtworkSource('local-file', 'local-file', false),
    false,
  )
})
