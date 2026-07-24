import assert from 'node:assert/strict'
import test from 'node:test'

import {
  CLASSIC_TOP_TITLE_DISC_PRESET,
  CLASSIC_TOP_TITLE_DISC_PRESET_ID,
} from '../presets/builtins/classicTopTitleDiscPreset.ts'
import type {
  DiscBackgroundPresetOwnerState,
} from '../presets/discPresetOwnerPlacement.ts'
import {
  createDiscPresetTemplateResolutionInput,
  resolveDiscPresetDefinition,
} from '../presets/discPresetResolution.ts'
import { discTemplates } from '../templates/discTemplates.ts'
import {
  applyActiveDiscPresetToBackgroundState,
  isActiveDiscPresetBackgroundFitImpossible,
} from './appActiveDiscPresetBackground.ts'

const template = discTemplates.standardPrintableDisc

function createActivePresetState() {
  const resolution = resolveDiscPresetDefinition({
    definition: CLASSIC_TOP_TITLE_DISC_PRESET,
    template: createDiscPresetTemplateResolutionInput(template),
  })

  if (resolution.status === 'rejected') {
    throw new Error('Classic fixture must resolve.')
  }

  return Object.freeze({
    ref: Object.freeze({
      id: CLASSIC_TOP_TITLE_DISC_PRESET_ID,
      revision: CLASSIC_TOP_TITLE_DISC_PRESET.revision,
    }),
    resolvedDefinition: resolution.preset,
  })
}

function createBackground(
  imageSize: DiscBackgroundPresetOwnerState['imageSize'] = {
    width: 1920,
    height: 1080,
  },
): DiscBackgroundPresetOwnerState {
  return {
    enabled: true,
    imageDataUrl: 'data:image/png;base64,background',
    imageSource: {
      source: 'uploaded',
      sourceId: 'background-id',
      sourceLabel: 'background.png',
    },
    imageSize,
    scale: 1.7,
    offset: { x: 23, y: -17 },
  }
}

test('active Classic refits a replacement Background to the limiting box axis', () => {
  const background = createBackground()
  const before = structuredClone(background)
  const result = applyActiveDiscPresetToBackgroundState({
    presetState: createActivePresetState(),
    selectedDiscTemplate: template,
    background,
  })

  assert.equal(result.application?.status, 'applied')
  assert.equal(result.application?.target, 'background.primary')
  assert.deepEqual(result.application?.updates.map(({ target }) => target), [
    'background.primary',
  ])
  assert.equal(result.background.scale, 92 / ((1920 / 1080) * 100))
  assert.deepEqual(result.background.offset, { x: 0, y: 0 })
  assert.equal(result.background.enabled, background.enabled)
  assert.equal(result.background.imageDataUrl, background.imageDataUrl)
  assert.equal(result.background.imageSource, background.imageSource)
  assert.equal(result.background.imageSize, background.imageSize)
  assert.equal(isActiveDiscPresetBackgroundFitImpossible(result.application), false)
  assert.deepEqual(background, before)
})

test('dimensionless active Background centers without inventing a scale', () => {
  const background: DiscBackgroundPresetOwnerState = {
    ...createBackground(null),
    imageDataUrl: null,
    scale: 1.35,
  }
  const result = applyActiveDiscPresetToBackgroundState({
    presetState: createActivePresetState(),
    selectedDiscTemplate: template,
    background,
  })

  assert.equal(result.background.scale, 1.35)
  assert.deepEqual(result.background.offset, { x: 0, y: 0 })
  assert.equal(result.application?.warnings.some((warning) =>
    warning.kind === 'placement-skipped' &&
    warning.reason === 'canonical-bounds-unavailable'), true)
})

test('inactive preset leaves Background semantic and manual layout state untouched', () => {
  const background = createBackground({ width: 1000, height: 1000 })
  const result = applyActiveDiscPresetToBackgroundState({
    presetState: null,
    selectedDiscTemplate: template,
    background,
  })

  assert.equal(result.application, null)
  assert.equal(result.background, background)
})
