import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createDefaultProjectTechnicalMarks,
  setTechnicalMarkCustomImage,
  updateTechnicalMarkLayoutField,
  updateTechnicalMarkSource,
  updateTechnicalMarkToggle,
} from '../project/projectTechnicalMarks.ts'
import { createTechnicalMarkRenderModels } from './technicalMarkRenderModel.ts'

test('disabled technical marks do not create render models', () => {
  const technicalMarks = createDefaultProjectTechnicalMarks()

  assert.deepEqual(createTechnicalMarkRenderModels(technicalMarks), [])
})

test('custom technical source without an image falls back to bundled generic rendering', () => {
  const technicalMarks = updateTechnicalMarkSource(
    updateTechnicalMarkToggle(createDefaultProjectTechnicalMarks(), 'audio', true),
    'audio',
    'custom',
  )
  const models = createTechnicalMarkRenderModels(technicalMarks)

  assert.equal(models.length, 1)
  assert.equal(models[0].isPlaceholderImage, true)
  assert.equal(models[0].label, 'audio')
  assert.equal(models[0].alt, 'audio generic technical mark')
})

test('custom technical image render model uses custom artwork bounds', () => {
  const technicalMarks = updateTechnicalMarkLayoutField(
    setTechnicalMarkCustomImage(
      createDefaultProjectTechnicalMarks(),
      'codec',
      'data:image/png;base64,codec',
      { width: 400, height: 100 },
    ),
    'codec',
    'scale',
    1.5,
  )
  const models = createTechnicalMarkRenderModels(technicalMarks)

  assert.equal(models.length, 1)
  assert.equal(models[0].isPlaceholderImage, false)
  assert.equal(models[0].imageDataUrl, 'data:image/png;base64,codec')
  assert.equal(models[0].scaledBounds.halfWidth > models[0].unscaledBounds.halfWidth, true)
  assert.equal(models[0].scaledBounds.halfHeight > models[0].unscaledBounds.halfHeight, true)
})
