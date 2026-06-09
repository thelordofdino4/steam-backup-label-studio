import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createDefaultProjectPlatformMarks,
  updatePlatformMarkToggle,
} from '../project/projectPlatformMarks.ts'
import { createPlatformMarkRenderModels } from './platformMarkRenderModel.ts'

test('built-in Windows platform mark render model carries contour metadata', () => {
  const platformMarks = updatePlatformMarkToggle(
    createDefaultProjectPlatformMarks(),
    'windows',
    true,
  )
  const models = createPlatformMarkRenderModels(platformMarks)

  assert.equal(models.length, 1)
  assert.equal(models[0].isPlaceholderImage, true)
  assert.equal(models[0].imageSize?.width, 482)
  assert.equal(models[0].imageSize?.height, 482)
  assert.ok(models[0].contentShape)
  assert.ok(models[0].unscaledBounds.halfWidth < 6)
  assert.ok(models[0].unscaledBounds.halfHeight < 6)
})
