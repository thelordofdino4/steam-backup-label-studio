import assert from 'node:assert/strict'
import test from 'node:test'
import { getOptionalFeatureSectionModel } from './optionalFeatureSectionModel.ts'

test('optional feature section hides dependent controls and slots while disabled', () => {
  const model = getOptionalFeatureSectionModel({
    enabled: false,
    hasActions: true,
    hasChildren: true,
    hasStatus: true,
  })

  assert.equal(model.controlsHidden, true)
  assert.equal(model.contentVisible, false)
  assert.equal(model.actionSlotVisible, false)
  assert.equal(model.statusSlotVisible, false)
})

test('optional feature section reveals content and feature-owned actions while enabled', () => {
  const model = getOptionalFeatureSectionModel({
    enabled: true,
    hasActions: true,
    hasChildren: true,
    hasStatus: true,
  })

  assert.equal(model.controlsHidden, false)
  assert.equal(model.contentVisible, true)
  assert.equal(model.actionSlotVisible, true)
  assert.equal(model.statusSlotVisible, true)
})

test('optional feature section can render just an action slot when no body controls exist', () => {
  const model = getOptionalFeatureSectionModel({
    enabled: true,
    hasActions: true,
  })

  assert.equal(model.contentVisible, true)
  assert.equal(model.actionSlotVisible, true)
  assert.equal(model.statusSlotVisible, false)
})
