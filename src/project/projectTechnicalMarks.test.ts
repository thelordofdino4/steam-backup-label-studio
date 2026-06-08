import assert from 'node:assert/strict'
import test from 'node:test'
import {
  addTechnicalMarkAsset,
  createDefaultProjectTechnicalMarks,
  getProjectTechnicalMarkAssetEntries,
  getProjectTechnicalMarkAsset,
  normalizeProjectTechnicalMarks,
  removeTechnicalMarkAsset,
  setTechnicalMarkCustomImage,
  updateTechnicalMarkLabel,
  updateTechnicalMarkLayoutField,
} from './projectTechnicalMarks.ts'
import type { ProjectTechnicalMarks } from './projectTypes.ts'

test('selected technical marks materialize default assets when assets are missing', () => {
  const technicalMarks: ProjectTechnicalMarks = {
    values: ['audio'],
    assets: {},
  }

  const asset = getProjectTechnicalMarkAsset(technicalMarks, 'audio')

  assert.equal(asset.source, 'placeholder')
  assert.equal(asset.label, 'audio')
  assert.equal(asset.layout.enabled, true)
  assert.equal(asset.layout.x, 63)
  assert.equal(asset.layout.y, 70)
})

test('technical mark labels persist independently from the mark type', () => {
  const technicalMarks = updateTechnicalMarkLabel(
    setTechnicalMarkCustomImage(
      createDefaultProjectTechnicalMarks(),
      'audio',
      'data:image/png;base64,custom-audio-mark',
      { width: 320, height: 120 },
    ),
    'audio',
    'Dolby-style mark',
  )
  const asset = getProjectTechnicalMarkAsset(technicalMarks, 'audio')

  assert.equal(asset.label, 'Dolby-style mark')
})

test('custom technical mark upload state enables the target asset', () => {
  const imageDataUrl = 'data:image/png;base64,custom-technical-mark'
  const technicalMarks = setTechnicalMarkCustomImage(
    createDefaultProjectTechnicalMarks(),
    'codec',
    imageDataUrl,
    { width: 512, height: 256 },
  )

  const asset = getProjectTechnicalMarkAsset(technicalMarks, 'codec')

  assert.deepEqual(technicalMarks.values, ['codec'])
  assert.equal(asset.source, 'custom')
  assert.equal(asset.customImageDataUrl, imageDataUrl)
  assert.deepEqual(asset.customImageSize, { width: 512, height: 256 })
  assert.equal(asset.layout.enabled, true)
})

test('additional technical mark assets keep category checkboxes and separate entries', () => {
  const technicalMarks = addTechnicalMarkAsset(
    setTechnicalMarkCustomImage(
      createDefaultProjectTechnicalMarks(),
      'surround',
      'data:image/png;base64,primary-surround',
      { width: 200, height: 100 },
    ),
    'surround',
  )
  const extraAssetId = technicalMarks.additionalAssets?.surround?.[0]?.id

  assert.ok(extraAssetId)

  const updatedMarks = setTechnicalMarkCustomImage(
    technicalMarks,
    'surround',
    'data:image/png;base64,extra-surround',
    { width: 300, height: 120 },
    undefined,
    extraAssetId,
  )
  const entries = getProjectTechnicalMarkAssetEntries(updatedMarks, 'surround')

  assert.deepEqual(updatedMarks.values, ['surround'])
  assert.equal(entries.length, 2)
  assert.equal(entries[0].isPrimary, true)
  assert.equal(entries[0].asset.customImageDataUrl, 'data:image/png;base64,primary-surround')
  assert.equal(entries[1].assetId, extraAssetId)
  assert.equal(entries[1].asset.label, 'surround')
  assert.equal(entries[1].asset.customImageDataUrl, 'data:image/png;base64,extra-surround')
})

test('removing an additional technical mark preserves the primary mark asset', () => {
  const technicalMarks = addTechnicalMarkAsset(
    setTechnicalMarkCustomImage(
      createDefaultProjectTechnicalMarks(),
      'audio',
      'data:image/png;base64,primary-audio',
      { width: 200, height: 100 },
    ),
    'audio',
  )
  const extraAssetId = technicalMarks.additionalAssets?.audio?.[0]?.id

  assert.ok(extraAssetId)

  const updatedMarks = setTechnicalMarkCustomImage(
    technicalMarks,
    'audio',
    'data:image/png;base64,extra-audio',
    { width: 300, height: 120 },
    undefined,
    extraAssetId,
  )
  const removedMarks = removeTechnicalMarkAsset(
    updatedMarks,
    'audio',
    extraAssetId,
  )
  const entries = getProjectTechnicalMarkAssetEntries(removedMarks, 'audio')

  assert.deepEqual(removedMarks.values, ['audio'])
  assert.equal(entries.length, 1)
  assert.equal(entries[0].isPrimary, true)
  assert.equal(entries[0].asset.customImageDataUrl, 'data:image/png;base64,primary-audio')
  assert.deepEqual(removedMarks.additionalAssets?.audio, [])
})

test('disabling a technical mark preserves selected value and custom asset state', () => {
  const imageDataUrl = 'data:image/png;base64,custom-audio-mark'
  const technicalMarks = setTechnicalMarkCustomImage(
    createDefaultProjectTechnicalMarks(),
    'audio',
    imageDataUrl,
    { width: 320, height: 120 },
  )
  const disabledMarks = updateTechnicalMarkLayoutField(
    technicalMarks,
    'audio',
    'enabled',
    false,
  )
  const asset = getProjectTechnicalMarkAsset(disabledMarks, 'audio')

  assert.deepEqual(disabledMarks.values, ['audio'])
  assert.equal(asset.layout.enabled, false)
  assert.equal(asset.source, 'custom')
  assert.equal(asset.customImageDataUrl, imageDataUrl)
})

test('normalizes saved technical mark values and default assets', () => {
  const normalized = normalizeProjectTechnicalMarks({
    values: ['audio', 'not-a-mark', 'codec'],
  } as Partial<ProjectTechnicalMarks>)

  assert.deepEqual(normalized.values, ['audio', 'codec'])
  assert.equal(normalized.assets.audio?.label, 'audio')
  assert.equal(normalized.assets.audio?.source, 'placeholder')
  assert.equal(normalized.assets.codec?.layout.enabled, true)
})
