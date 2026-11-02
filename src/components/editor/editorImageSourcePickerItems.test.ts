import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createEditorSteamArtworkPickerItems,
  createEditorLocalSteamScreenshotPickerItems,
  createEditorWebArtworkPickerItems,
} from './editorImageSourcePickerItems.ts'
import type { SteamArtworkAsset } from '../../steam/steamApi.ts'
import type { RemoteLogoCandidate } from '../../steam/steamLogoCandidates.ts'

function createSteamArtworkAsset(
  overrides: Partial<SteamArtworkAsset>,
): SteamArtworkAsset {
  return {
    id: 'asset',
    label: 'Asset',
    kind: 'background',
    url: 'https://example.test/asset.jpg',
    ...overrides,
  }
}

function createRemoteCandidate(
  overrides: Partial<RemoteLogoCandidate>,
): RemoteLogoCandidate {
  return {
    id: 'candidate',
    url: 'https://example.test/candidate.png',
    sourcePageUrl: 'https://example.test',
    label: 'Candidate',
    sourceKind: 'official-img',
    fileType: 'png',
    transparencyHint: false,
    score: 0,
    targetWorkflow: 'artwork',
    contentKind: 'artwork',
    routingReasons: [],
    reasons: ['Candidate reason'],
    ...overrides,
  }
}

test('Steam artwork picker items are ranked for background use', () => {
  const items = createEditorSteamArtworkPickerItems([
    createSteamArtworkAsset({
      id: 'logo',
      label: 'Steam logo',
      kind: 'logo',
      url: 'https://example.test/logo.png',
    }),
    createSteamArtworkAsset({
      id: 'background',
      label: 'Steam background 1920x1080',
      kind: 'background',
      url: 'https://example.test/background_1920x1080.jpg',
    }),
  ])

  assert.equal(items[0]?.id, 'background')
  assert.equal(items[0]?.qualityLabel, 'Best for background')
  assert.ok(items[0]?.details?.includes('Dimensions: 1920 x 1080px'))
})

test('web artwork picker items are ranked for logo use', () => {
  const items = createEditorWebArtworkPickerItems([
    createRemoteCandidate({
      id: 'small-art',
      label: 'Small art',
      width: 320,
      height: 240,
    }),
    createRemoteCandidate({
      id: 'vector-logo',
      label: 'Vector logo',
      contentKind: 'logo',
      fileType: 'svg',
      targetWorkflow: 'branding-logo',
      transparencyHint: true,
    }),
  ], null, 'logo')

  assert.equal(items[0]?.id, 'vector-logo')
  assert.equal(items[0]?.qualityLabel, 'Good for logo')
  assert.ok(items[0]?.details?.includes('Print quality: vector'))
})

test('local screenshot evidence stays neutral while thumbnail, selection and stable order are preserved', () => {
  const assets = [
    { id: 'a', label: 'A', path: 'a.png', folderPath: '.', fileName: 'a.png' },
    { id: 'b', label: 'B', path: 'b.png', folderPath: '.', fileName: 'b.png' },
  ]
  const items = createEditorLocalSteamScreenshotPickerItems(assets, { a: 'data:image/png;base64,AA==' }, 'b')
  assert.deepEqual(items.map(item => item.id), ['a','b'])
  assert.equal(items[0].qualityLabel, 'Resolution unknown')
  assert.equal(items[0].qualityTone, 'neutral')
  assert.equal(items[0].imageUrl, 'data:image/png;base64,AA==')
  assert.equal(items[1].isSelected, true)
})

test('unknown and corrupt remote image evidence does not imply print suitability or alter selected identity', () => {
  const items = createEditorWebArtworkPickerItems([
    createRemoteCandidate({ id: 'a', score: NaN, width: Infinity, height: 1000 }),
    createRemoteCandidate({ id: 'b' }),
  ], 'a', 'background')
  assert.deepEqual(items.map(item => item.id), ['a','b'])
  assert.equal(items[0].isSelected, true)
  assert.doesNotMatch(JSON.stringify(items), /Infinity|NaN/)
  assert.ok(items.every(item => item.qualityLabel === 'Resolution unknown' && item.qualityTone === 'neutral'))
})
