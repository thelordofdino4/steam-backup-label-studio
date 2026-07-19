import assert from 'node:assert/strict'
import test from 'node:test'

import { discTemplates } from '../../templates/discTemplates.ts'
import { CLASSIC_TOP_TITLE_DISC_PRESET } from '../builtins/classicTopTitleDiscPreset.ts'
import type {
  DiscPresetOwnerPlacementContext,
} from '../discPresetPlacementAdapters.ts'
import {
  createDiscPresetTemplateResolutionInput,
  resolveDiscPresetDefinition,
} from '../discPresetResolution.ts'
import {
  DISC_BACKGROUND_PRESET_ADAPTER,
} from './discBackgroundPresetAdapter.ts'

const template = createDiscPresetTemplateResolutionInput(
  discTemplates.standardPrintableDisc,
)
const resolution = resolveDiscPresetDefinition({
  definition: CLASSIC_TOP_TITLE_DISC_PRESET,
  template,
})

if (resolution.status === 'rejected') {
  throw new Error('Classic fixture must resolve.')
}

function getContext(): DiscPresetOwnerPlacementContext<'background.primary'> {
  const slot = resolution.preset.slots.find((candidate) =>
    candidate.id === 'disc:guided:background-image:primary')
  const placement = slot?.placements.find(
    (candidate) => candidate.target === 'background.primary',
  )
  if (!slot || !placement) throw new Error('Missing Background fixture.')

  return {
    slot,
    placement: placement as
      DiscPresetOwnerPlacementContext<'background.primary'>['placement'],
    ownerState: {
      enabled: false,
      imageDataUrl: null,
      imageSource: null,
      imageSize: null,
      scale: 1.6,
      offset: { x: 19, y: -7 },
    },
    template,
  }
}

test('centers Classic cover with scale and zero offset while dormant', () => {
  const context = getContext()
  const before = JSON.stringify(context.ownerState)
  const result = DISC_BACKGROUND_PRESET_ADAPTER.buildUpdate(context)

  assert.equal(result.status, 'applied')
  assert.deepEqual(result.updates, [{
    kind: 'background-layout',
    slotId: 'disc:guided:background-image:primary',
    target: 'background.primary',
    layout: {
      scale: 1,
      offset: { x: 0, y: 0 },
    },
  }])
  assert.equal('enabled' in (result.updates[0]?.layout ?? {}), false)
  assert.equal(JSON.stringify(context.ownerState), before)
  assert.ok(Object.isFrozen(result.updates[0]?.layout))
  assert.ok(Object.isFrozen(
    result.updates[0]?.kind === 'background-layout'
      ? result.updates[0].layout.offset
      : null,
  ))
})

test('populated Background content and provenance remain outside the update', () => {
  const context = getContext()
  const ownerState = {
    ...context.ownerState!,
    enabled: true,
    imageDataUrl: 'data:image/png;base64,background',
    imageSource: {
      source: 'uploaded' as const,
      sourceId: 'file-1',
      sourceLabel: 'Uploaded background',
    },
    imageSize: { width: 1920, height: 1080 },
  }
  const before = JSON.stringify(ownerState)
  const result = DISC_BACKGROUND_PRESET_ADAPTER.buildUpdate({
    ...context,
    ownerState,
  })

  assert.equal(result.status, 'applied')
  assert.deepEqual(Object.keys(result.updates[0]?.layout ?? {}).sort(), [
    'offset',
    'scale',
  ])
  assert.equal(JSON.stringify(ownerState), before)
})

test('rejects non-centered regions instead of claiming arbitrary crop support', () => {
  const context = getContext()
  const result = DISC_BACKGROUND_PRESET_ADAPTER.buildUpdate({
    ...context,
    slot: {
      ...context.slot,
      resolvedContentRegion: {
        ...context.slot.resolvedContentRegion,
        centerXPercent: 45,
      },
    },
  })

  assert.equal(result.status, 'unsupported')
  assert.deepEqual(result.updates, [])
  assert.equal(
    'reason' in result.warnings[0]! && result.warnings[0].reason,
    'non-centered-background-region',
  )
})

test('rejects missing owner state and invalid scale structurally', () => {
  const context = getContext()
  const missing = DISC_BACKGROUND_PRESET_ADAPTER.buildUpdate({
    ...context,
    ownerState: undefined,
  })
  const invalidScale = DISC_BACKGROUND_PRESET_ADAPTER.buildUpdate({
    ...context,
    placement: { ...context.placement, scale: Number.NaN },
  })

  assert.equal(missing.status, 'unsupported')
  assert.equal(
    'reason' in missing.warnings[0]! && missing.warnings[0].reason,
    'owner-state-unavailable',
  )
  assert.equal(
    'reason' in invalidScale.warnings[0]! && invalidScale.warnings[0].reason,
    'invalid-scale',
  )
})
