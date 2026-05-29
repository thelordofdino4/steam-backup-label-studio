import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createDefaultProjectTechnicalMarks,
  getProjectTechnicalMarkAsset,
  normalizeProjectTechnicalMarks,
  setTechnicalMarkCustomImage,
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
  assert.equal(asset.layout.enabled, true)
  assert.equal(asset.layout.x, 63)
  assert.equal(asset.layout.y, 70)
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
  assert.equal(normalized.assets.audio?.source, 'placeholder')
  assert.equal(normalized.assets.codec?.layout.enabled, true)
})
