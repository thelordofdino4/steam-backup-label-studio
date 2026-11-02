import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createEditorSteamArtworkPickerItems,
  createEditorLocalSteamScreenshotPickerItems,
  createEditorWebArtworkPickerItems,
} from './editorImageSourcePickerItems.ts'
import type { SteamArtworkAsset } from '../../steam/steamApi.ts'
import { parseOfficialLogoCandidatesFromHtml, type RemoteLogoCandidate } from '../../steam/steamLogoCandidates.ts'
import { createLogoCandidateAssetProvenance } from '../../steam/steamLogoCandidateImport.ts'

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
  assert.equal(items[0]?.qualityLabel, 'Resolution estimated')
  assert.ok(items[0]?.details?.includes('Estimated dimensions: 1920 x 1080px'))
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


test('Steam kind, label and URL guesses stay estimated rather than measured print evidence', () => {
  const assets = [
    createSteamArtworkAsset({ id: 'kind-only', label: 'Background' }),
    createSteamArtworkAsset({ id: 'label', kind: 'library', label: 'Library 2048x1024' }),
    createSteamArtworkAsset({ id: 'url', kind: 'library', url: 'https://example.test/2048x1024.jpg' }),
  ]
  const items = createEditorSteamArtworkPickerItems(assets, 'kind-only')
  for (const item of items) {
    assert.equal(item.qualityLabel, 'Resolution estimated')
    assert.equal(item.qualityTone, 'neutral')
    assert.ok(item.details?.some(detail => detail.startsWith('Estimated dimensions: ')))
    assert.ok(item.details?.includes('Print quality: unverified (estimated dimensions)'))
    assert.ok(!item.details?.some(detail => detail.startsWith('Measured dimensions: ')))
    const source = assets.find(asset => asset.id === item.id)!
    assert.equal(item.imageUrl, source.url)
    assert.equal(item.title, source.label)
    assert.equal(item.isSelected, item.id === 'kind-only')
  }
})


test('web metadata dimensions are estimated in both subtitle and details without changing selection or rank', () => {
  const candidates = [
    createRemoteCandidate({ id: 'first', width: 1920, height: 1080, score: 12 }),
    createRemoteCandidate({ id: 'second', width: 1920, height: 1080, score: 12 }),
    createRemoteCandidate({ id: 'small', width: 320, height: 240, score: 0 }),
  ]
  const items = createEditorWebArtworkPickerItems(candidates, 'second')
  assert.deepEqual(items.map(item => item.id), ['first', 'second', 'small'])
  assert.deepEqual(items.map(item => item.isSelected), [false, true, false])
  for (const item of items) {
    const candidate = candidates.find(candidate => candidate.id === item.id)!
    assert.match(item.subtitle, /Estimated \d+ x \d+px/)
    assert.equal(item.qualityLabel, 'Resolution estimated')
    assert.equal(item.qualityTone, 'neutral')
    assert.ok(item.details?.includes('Print quality: unverified (estimated dimensions)'))
    assert.ok(item.details?.includes('Candidate reason'))
    assert.equal(item.imageUrl, candidate.url)
  }
})


test('actual HTML discovery metadata reaches the picker as an estimate and retains import identity', () => {
  const candidates = parseOfficialLogoCandidatesFromHtml(
    '<img src="/studio-logo.png" alt="Studio logo" width="960" height="480">',
    'https://example.test/',
    ['Studio'],
  )
  assert.equal(candidates.length, 1)
  const candidate = candidates[0]
  assert.equal(candidate.width, 960)
  assert.equal(candidate.height, 480)
  assert.ok(candidate.reasons.includes('Logo-like estimated aspect ratio'))
  const before = structuredClone(candidate)
  const provenance = createLogoCandidateAssetProvenance(candidate)
  const [item] = createEditorWebArtworkPickerItems(candidates, candidate.id, 'logo')
  assert.equal(item.qualityLabel, 'Resolution estimated')
  assert.ok(item.details?.includes('Estimated dimensions: 960 x 480px'))
  assert.match(item.subtitle, /Estimated 960 x 480px/)
  assert.equal(item.id, provenance.sourceId)
  assert.equal(item.imageUrl, provenance.sourceUrl)
  assert.equal(item.isSelected, true)
  assert.deepEqual(candidate, before)
  assert.deepEqual(createLogoCandidateAssetProvenance(candidate), provenance)
})
