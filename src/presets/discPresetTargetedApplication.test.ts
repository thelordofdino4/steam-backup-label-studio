import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { discTemplates } from '../templates/discTemplates.ts'
import {
  resolveDiscPresetPlacementForTarget,
  type ActiveDiscPresetRef,
} from './discPresetTargetedApplication.ts'
import {
  CLASSIC_TOP_TITLE_DISC_PRESET,
} from './builtins/classicTopTitleDiscPreset.ts'
import type {
  DiscPresetDefinitionV1,
  DiscPresetPlacementTarget,
} from './discPresetDefinition.ts'
import {
  createDiscPresetPlacementAdapterRegistry,
  type DiscPresetAdapterWarning,
  type DiscPresetPlacementAdapter,
} from './discPresetPlacementAdapters.ts'
import {
  createDiscPresetRegistry,
} from './discPresetRegistry.ts'
import {
  createDiscPresetTemplateResolutionInput,
} from './discPresetResolution.ts'

const template = createDiscPresetTemplateResolutionInput(
  discTemplates.standardPrintableDisc,
)
const userPresetRef: ActiveDiscPresetRef = Object.freeze({
  id: 'user:disc-preset:123e4567-e89b-42d3-a456-426614174000',
  revision: 7,
})

function createDefinition(
  options: Readonly<{
    slots?: DiscPresetDefinitionV1['slots']
    compatibility?: DiscPresetDefinitionV1['compatibility']
  }> = {},
): DiscPresetDefinitionV1 {
  return Object.freeze({
    ...CLASSIC_TOP_TITLE_DISC_PRESET,
    id: userPresetRef.id,
    revision: userPresetRef.revision,
    name: 'Arbitrary targeted fixture',
    compatibility: options.compatibility ??
      CLASSIC_TOP_TITLE_DISC_PRESET.compatibility,
    slots: options.slots ?? Object.freeze([
      CLASSIC_TOP_TITLE_DISC_PRESET.slots[2],
    ]),
  })
}

function createPresetRegistry(definition = createDefinition()) {
  const result = createDiscPresetRegistry({ builtins: [], users: [definition] })
  assert.equal(result.ok, true)
  if (!result.ok) throw new Error(result.error.code)
  return result.registry
}

function createAdapter(
  target: DiscPresetPlacementTarget,
  calls: DiscPresetPlacementTarget[],
  warning?: DiscPresetAdapterWarning,
): DiscPresetPlacementAdapter {
  return {
    target,
    supportedIntentKinds: ['point'],
    buildUpdate(context) {
      calls.push(target)
      if (warning) {
        return {
          status: 'skipped',
          updates: [],
          warnings: [warning],
        }
      }
      return {
        status: 'applied',
        updates: [{
          kind: 'rating-layout',
          slotId: context.slot.id,
          target: 'rating.primary',
          layout: { x: 79, y: 62, scale: 0.75 },
        }],
        warnings: [],
      }
    },
  } as DiscPresetPlacementAdapter
}

function createAdapterRegistry(
  adapters: readonly DiscPresetPlacementAdapter[],
) {
  const result = createDiscPresetPlacementAdapterRegistry(adapters)
  assert.equal(result.ok, true)
  if (!result.ok) throw new Error(result.error.code)
  return result.registry
}

test('targeted application resolves an exact arbitrary preset revision and invokes only its adapter', () => {
  const calls: DiscPresetPlacementTarget[] = []
  const result = resolveDiscPresetPlacementForTarget({
    presetRef: userPresetRef,
    registry: createPresetRegistry(),
    template,
    target: 'rating.primary',
    ownerState: {
      'rating.primary': {
        layout: { enabled: true, x: 10, y: 20, scale: 1 },
      },
    },
    adapterRegistry: createAdapterRegistry([
      createAdapter('rating.primary', calls),
      createAdapter('media-format.primary', calls),
    ]),
  })

  assert.equal(result.status, 'applied')
  assert.equal(result.slotId, 'disc:guided:rating-badge:primary')
  assert.deepEqual(calls, ['rating.primary'])
  assert.deepEqual(result.updates.map(({ target }) => target), [
    'rating.primary',
  ])
})

test('missing preset, missing revision, and absent target fail closed', () => {
  const registry = createPresetRegistry()
  const adapters = createAdapterRegistry([])
  const missingPreset = resolveDiscPresetPlacementForTarget({
    presetRef: {
      id: 'user:disc-preset:223e4567-e89b-42d3-a456-426614174000',
      revision: 1,
    },
    registry,
    template,
    target: 'rating.primary',
    adapterRegistry: adapters,
  })
  const missingRevision = resolveDiscPresetPlacementForTarget({
    presetRef: { ...userPresetRef, revision: 99 },
    registry,
    template,
    target: 'rating.primary',
    adapterRegistry: adapters,
  })
  const absentTarget = resolveDiscPresetPlacementForTarget({
    presetRef: userPresetRef,
    registry,
    template,
    target: 'media-format.primary',
    adapterRegistry: adapters,
  })

  assert.equal(missingPreset.status, 'rejected')
  assert.equal(missingPreset.warnings[0]?.kind, 'preset-not-found')
  assert.equal(missingRevision.status, 'rejected')
  assert.equal(
    missingRevision.warnings[0]?.kind,
    'preset-revision-not-found',
  )
  assert.equal(absentTarget.status, 'skipped')
  assert.equal(absentTarget.warnings[0]?.kind, 'placement-target-absent')
  assert.deepEqual(missingPreset.updates, [])
  assert.deepEqual(missingRevision.updates, [])
  assert.deepEqual(absentTarget.updates, [])
})

test('ambiguous target claims are rejected without choosing a slot', () => {
  const ratingSlot = CLASSIC_TOP_TITLE_DISC_PRESET.slots[2]
  const ambiguousDefinition = createDefinition({
    slots: Object.freeze([ratingSlot, { ...ratingSlot }]),
  })
  const result = resolveDiscPresetPlacementForTarget({
    presetRef: userPresetRef,
    registry: createPresetRegistry(ambiguousDefinition),
    template,
    target: 'rating.primary',
    adapterRegistry: createAdapterRegistry([]),
  })

  assert.equal(result.status, 'rejected')
  assert.equal(result.warnings[0]?.kind, 'ambiguous-placement-target')
  assert.deepEqual(result.updates, [])
})

test('unsupported slots and missing adapters return no updates', () => {
  const incompatible = createDefinition({
    compatibility: {
      mode: 'specific-template',
      templateId: 'another-template',
      onConflict: 'resolve',
    },
  })
  const unsupported = resolveDiscPresetPlacementForTarget({
    presetRef: userPresetRef,
    registry: createPresetRegistry(incompatible),
    template,
    target: 'rating.primary',
    adapterRegistry: createAdapterRegistry([]),
  })
  const missingAdapter = resolveDiscPresetPlacementForTarget({
    presetRef: userPresetRef,
    registry: createPresetRegistry(),
    template,
    target: 'rating.primary',
    adapterRegistry: createAdapterRegistry([]),
  })

  assert.equal(unsupported.status, 'unsupported')
  assert.deepEqual(unsupported.updates, [])
  assert.equal(missingAdapter.status, 'unsupported')
  assert.equal(
    missingAdapter.warnings.at(-1)?.kind,
    'missing-placement-adapter',
  )
})

test('adapter warnings are preserved and inputs remain immutable', () => {
  const calls: DiscPresetPlacementTarget[] = []
  const warning = Object.freeze({
    kind: 'placement-skipped',
    slotId: 'disc:guided:rating-badge:primary',
    target: 'rating.primary',
    reason: 'placement-not-applicable',
  } as const)
  const definition = createDefinition()
  const snapshot = structuredClone(definition)
  const result = resolveDiscPresetPlacementForTarget({
    presetRef: userPresetRef,
    registry: createPresetRegistry(definition),
    template,
    target: 'rating.primary',
    adapterRegistry: createAdapterRegistry([
      createAdapter('rating.primary', calls, warning),
    ]),
  })

  assert.equal(result.status, 'skipped')
  assert.ok(result.warnings.some((candidate) =>
    candidate.kind === warning.kind))
  assert.deepEqual(definition, snapshot)
})

test('unrelated slot warnings are excluded from a successful target result', () => {
  const calls: DiscPresetPlacementTarget[] = []
  const mediaSlot = CLASSIC_TOP_TITLE_DISC_PRESET.slots[3]
  const definition = createDefinition({
    slots: Object.freeze([
      CLASSIC_TOP_TITLE_DISC_PRESET.slots[2],
      {
        ...mediaSlot,
        contentRegion: {
          centerXPercent: 0,
          centerYPercent: 0,
          widthPercent: 1,
          heightPercent: 1,
        },
      },
    ]),
  })
  const result = resolveDiscPresetPlacementForTarget({
    presetRef: userPresetRef,
    registry: createPresetRegistry(definition),
    template,
    target: 'rating.primary',
    adapterRegistry: createAdapterRegistry([
      createAdapter('rating.primary', calls),
    ]),
  })

  assert.equal(result.status, 'applied')
  assert.deepEqual(calls, ['rating.primary'])
  assert.equal(
    result.warnings.some((warning) =>
      'slotId' in warning &&
      warning.slotId === 'disc:guided:media-format-mark:primary'),
    false,
  )
})

test('targeted planner contains no Classic branch or runtime side effects', () => {
  const source = readFileSync(
    'src/presets/discPresetTargetedApplication.ts',
    'utf8',
  )
  const targetedSource = source.slice(
    source.indexOf('export function resolveDiscPresetPlacementForTarget'),
  )

  assert.doesNotMatch(targetedSource, /classic-top-title|50,\s*73|28,\s*10/i)
  assert.doesNotMatch(
    targetedSource,
    /useEffect|setTimeout|document\.|localStorage|schema|renderer|exportPng/,
  )
})
