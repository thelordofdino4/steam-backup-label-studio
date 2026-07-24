import assert from 'node:assert/strict'
import test from 'node:test'

import { discTemplates } from '../templates/discTemplates.ts'
import { CLASSIC_TOP_TITLE_DISC_PRESET } from './builtins/classicTopTitleDiscPreset.ts'
import {
  parseDiscPresetDefinition,
  type DiscPresetDefinitionV1,
} from './discPresetDefinition.ts'
import {
  createDiscPresetTemplateResolutionInput,
  resolveDiscPresetDefinition,
} from './discPresetResolution.ts'

function mutableClassic(): Record<string, unknown> {
  return JSON.parse(
    JSON.stringify(CLASSIC_TOP_TITLE_DISC_PRESET),
  ) as Record<string, unknown>
}

function parseDefinition(value: Record<string, unknown>) {
  const result = parseDiscPresetDefinition(value)
  assert.equal(result.ok, true)
  if (!result.ok) throw new Error(`Definition failed at ${result.error.path}`)
  return result.value
}

function withCompatibility(
  definition: Record<string, unknown>,
  compatibility: DiscPresetDefinitionV1['compatibility'],
) {
  definition.compatibility = compatibility
  return definition
}

const standardTemplate = createDiscPresetTemplateResolutionInput(
  discTemplates.standardPrintableDisc,
)

test('resolves Classic for a normal Disc template without changing slot order', () => {
  const result = resolveDiscPresetDefinition({
    definition: CLASSIC_TOP_TITLE_DISC_PRESET,
    template: standardTemplate,
  })

  assert.equal(result.status, 'resolved')
  if (result.status === 'rejected') return
  assert.deepEqual(
    result.preset.slots.map(({ id }) => id),
    CLASSIC_TOP_TITLE_DISC_PRESET.slots.map(({ id }) => id),
  )
  assert.equal(result.preset.sourcePresetId, CLASSIC_TOP_TITLE_DISC_PRESET.id)
  assert.equal(result.preset.sourceRevision, 1)
  assert.equal(result.preset.templateId, 'standardPrintableDisc')
  assert.deepEqual(
    result.preset.slots[0]?.nominalContentRegion,
    CLASSIC_TOP_TITLE_DISC_PRESET.slots[0]?.contentRegion,
  )
  assert.deepEqual(
    result.preset.slots[0]?.resolvedContentRegion,
    CLASSIC_TOP_TITLE_DISC_PRESET.slots[0]?.contentRegion,
  )
})

test('preserves distinct nominal and resolved action geometry', () => {
  const result = resolveDiscPresetDefinition({
    definition: CLASSIC_TOP_TITLE_DISC_PRESET,
    template: standardTemplate,
  })
  assert.notEqual(result.status, 'rejected')
  if (result.status === 'rejected') return

  const background = result.preset.slots[1]
  assert.deepEqual(
    background?.nominalActionRegion,
    CLASSIC_TOP_TITLE_DISC_PRESET.slots[1]?.actionRegion,
  )
  assert.deepEqual(
    background?.resolvedActionRegion,
    CLASSIC_TOP_TITLE_DISC_PRESET.slots[1]?.actionRegion,
  )
  assert.notDeepEqual(
    background?.resolvedActionRegion,
    background?.resolvedContentRegion,
  )
})

test('rejects an incompatible specific template under reject policy', () => {
  const definition = parseDefinition(withCompatibility(mutableClassic(), {
    mode: 'specific-template',
    templateId: 'stickyLabelDisc',
    onConflict: 'reject',
  }))
  const result = resolveDiscPresetDefinition({
    definition,
    template: standardTemplate,
  })

  assert.equal(result.status, 'rejected')
  assert.equal(result.preset, null)
  assert.deepEqual(result.warnings[0], {
    kind: 'template-incompatible',
    expectedTemplateId: 'stickyLabelDisc',
    actualTemplateId: 'standardPrintableDisc',
  })
})

test('rejects an impossible annulus slot under reject policy', () => {
  const raw = withCompatibility(mutableClassic(), {
    mode: 'any-disc-template',
    onConflict: 'reject',
  })
  const slots = raw.slots as Array<Record<string, unknown>>
  slots[2]!.contentRegion = {
    centerXPercent: 50,
    centerYPercent: 50,
    widthPercent: 2,
    heightPercent: 2,
  }
  const result = resolveDiscPresetDefinition({
    definition: parseDefinition(raw),
    template: standardTemplate,
  })

  assert.equal(result.status, 'rejected')
  assert.equal(result.preset, null)
  assert.ok(result.warnings.some((warning) =>
    warning.kind === 'slot-unsupported' &&
    warning.slotId === 'disc:guided:rating-badge:primary' &&
    warning.reason === 'outside-safe-annulus'))
})

test('template resolution uses the complete inner no-print diameter', () => {
  assert.equal(
    standardTemplate.innerNoPrintDiameterPercent,
    discTemplates.standardPrintableDisc.innerHoleDiameterMm /
      discTemplates.standardPrintableDisc.outerDiameterMm * 100,
  )
  assert.ok(
    standardTemplate.innerNoPrintDiameterPercent >
      standardTemplate.physicalCenterHolePercent,
  )

  const raw = mutableClassic()
  const slots = raw.slots as Array<Record<string, unknown>>
  slots[2]!.contentRegion = {
    centerXPercent: 58,
    centerYPercent: 50,
    widthPercent: 1,
    heightPercent: 1,
  }
  const result = resolveDiscPresetDefinition({
    definition: parseDefinition(raw),
    template: standardTemplate,
  })

  assert.equal(result.status, 'partial')
  if (result.status === 'rejected') return
  assert.equal(result.preset.slots[2]?.status, 'unsupported')
  assert.ok(result.preset.slots[2]?.warnings.some((warning) =>
    warning.kind === 'slot-unsupported' &&
    warning.reason === 'outside-safe-annulus'))
})

test('keeps valid slots when an impossible slot uses resolve policy', () => {
  const raw = mutableClassic()
  const slots = raw.slots as Array<Record<string, unknown>>
  slots[2]!.contentRegion = {
    centerXPercent: 50,
    centerYPercent: 50,
    widthPercent: 2,
    heightPercent: 2,
  }
  const result = resolveDiscPresetDefinition({
    definition: parseDefinition(raw),
    template: standardTemplate,
  })

  assert.equal(result.status, 'partial')
  if (result.status === 'rejected') return
  assert.equal(result.preset.slots[2]?.status, 'unsupported')
  assert.equal(result.preset.slots[0]?.status, 'resolved')
  assert.equal(result.preset.slots[7]?.status, 'resolved')
})

test('clips regions to outer Disc bounds with a structured adjustment', () => {
  const raw = mutableClassic()
  const slots = raw.slots as Array<Record<string, unknown>>
  slots[2]!.contentRegion = {
    centerXPercent: 98,
    centerYPercent: 50,
    widthPercent: 10,
    heightPercent: 10,
  }
  const result = resolveDiscPresetDefinition({
    definition: parseDefinition(raw),
    template: standardTemplate,
  })

  assert.equal(result.status, 'resolved')
  if (result.status === 'rejected') return
  const rating = result.preset.slots[2]
  assert.equal(rating?.status, 'adjusted')
  assert.deepEqual(rating?.resolvedContentRegion, {
    centerXPercent: 96.5,
    centerYPercent: 50,
    widthPercent: 7,
    heightPercent: 10,
  })
  assert.ok(rating?.warnings.some((warning) =>
    warning.kind === 'slot-adjusted' &&
    warning.reason === 'outer-disc-bounds'))
})

test('falls back to content geometry when an action region misses the annulus', () => {
  const raw = mutableClassic()
  const slots = raw.slots as Array<Record<string, unknown>>
  slots[1]!.actionRegion = {
    centerXPercent: 50,
    centerYPercent: 50,
    widthPercent: 2,
    heightPercent: 2,
  }
  const result = resolveDiscPresetDefinition({
    definition: parseDefinition(raw),
    template: standardTemplate,
  })

  assert.equal(result.status, 'resolved')
  if (result.status === 'rejected') return
  const background = result.preset.slots[1]
  assert.equal(background?.status, 'adjusted')
  assert.deepEqual(
    background?.resolvedActionRegion,
    background?.resolvedContentRegion,
  )
  assert.ok(background?.warnings.some((warning) =>
    warning.kind === 'slot-adjusted' &&
    warning.reason === 'action-region-outside-safe-annulus'))
})

test('rejects invalid template geometry without throwing', () => {
  const result = resolveDiscPresetDefinition({
    definition: CLASSIC_TOP_TITLE_DISC_PRESET,
    template: {
      ...standardTemplate,
      physicalCenterHolePercent: standardTemplate.safeDiameterPercent,
    },
  })

  assert.deepEqual(result, {
    status: 'rejected',
    preset: null,
    warnings: [{
      kind: 'invalid-template-geometry',
      templateId: 'standardPrintableDisc',
    }],
  })
})

test('resolution is deterministic immutable and leaves inputs untouched', () => {
  const definitionBefore = JSON.stringify(CLASSIC_TOP_TITLE_DISC_PRESET)
  const templateBefore = JSON.stringify(standardTemplate)
  const first = resolveDiscPresetDefinition({
    definition: CLASSIC_TOP_TITLE_DISC_PRESET,
    template: standardTemplate,
  })
  const second = resolveDiscPresetDefinition({
    definition: CLASSIC_TOP_TITLE_DISC_PRESET,
    template: standardTemplate,
  })

  assert.deepEqual(first, second)
  assert.equal(JSON.stringify(CLASSIC_TOP_TITLE_DISC_PRESET), definitionBefore)
  assert.equal(JSON.stringify(standardTemplate), templateBefore)
  assert.ok(Object.isFrozen(first))
  assert.ok(Object.isFrozen(first.warnings))
  if (first.status !== 'rejected') {
    assert.ok(Object.isFrozen(first.preset))
    assert.ok(Object.isFrozen(first.preset.slots))
    assert.ok(Object.isFrozen(first.preset.slots[0]))
    assert.ok(Object.isFrozen(first.preset.slots[0]?.resolvedContentRegion))
  }
  for (const warning of first.warnings) {
    assert.equal(Object.hasOwn(warning, 'message'), false)
  }
})
