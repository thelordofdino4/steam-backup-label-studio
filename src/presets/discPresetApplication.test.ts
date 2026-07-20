import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { discTemplates } from '../templates/discTemplates.ts'
import { CLASSIC_TOP_TITLE_DISC_PRESET } from './builtins/classicTopTitleDiscPreset.ts'
import {
  buildDiscPresetApplicationPlan,
} from './discPresetApplication.ts'
import {
  DISC_PRESET_INTENT_KIND_BY_TARGET,
  DISC_PRESET_PLACEMENT_TARGETS,
  parseDiscPresetDefinition,
  type DiscPresetDefinitionV1,
  type DiscPresetPlacementIntentV1,
  type DiscPresetPlacementTarget,
} from './discPresetDefinition.ts'
import {
  createDiscPresetPlacementAdapterRegistry,
  DISC_PRESET_OWNER_FAMILY_BY_TARGET,
  type DiscPresetAdapterWarning,
  type DiscPresetOwnerPlacementContext,
  type DiscPresetPlacementAdapter,
} from './discPresetPlacementAdapters.ts'
import {
  createDiscPresetTemplateResolutionInput,
  resolveDiscPresetDefinition,
  type DiscPresetResolvedSlotPatch,
  type DiscPresetResolutionResult,
} from './discPresetResolution.ts'

const standardTemplate = createDiscPresetTemplateResolutionInput(
  discTemplates.standardPrintableDisc,
)

type AdapterCall = Readonly<{
  target: DiscPresetPlacementTarget
  kind: DiscPresetPlacementIntentV1['kind']
  ownerState: unknown
}>

function createAdapter(
  target: DiscPresetPlacementTarget,
  calls: AdapterCall[],
  options: Readonly<{
    supportedIntentKinds?: readonly DiscPresetPlacementIntentV1['kind'][]
    resultStatus?: 'applied' | 'partial' | 'skipped' | 'unsupported'
    resolvedSlotPatch?: DiscPresetResolvedSlotPatch
    warning?: DiscPresetAdapterWarning
  }> = {},
): DiscPresetPlacementAdapter {
  const supportedIntentKinds = options.supportedIntentKinds ?? [
    'point',
    'text',
    'background',
    'group',
  ]

  return {
    target,
    supportedIntentKinds,
    buildUpdate(context: DiscPresetOwnerPlacementContext) {
      calls.push({
        target,
        kind: context.placement.kind,
        ownerState: context.ownerState,
      })

      if (
        options.resultStatus === 'skipped' ||
        options.resultStatus === 'unsupported'
      ) {
        return {
          status: options.resultStatus,
          updates: [],
          warnings: [options.warning ?? {
            kind: options.resultStatus === 'skipped'
              ? 'placement-skipped'
              : 'placement-unsupported',
            slotId: context.slot.id,
            target,
            reason: options.resultStatus === 'skipped'
              ? 'placement-not-applicable'
              : 'placement-impossible',
          }],
        }
      }

      return {
        status: options.resultStatus ?? 'applied',
        updates: [{
          kind: 'semantic-placement',
          owner: DISC_PRESET_OWNER_FAMILY_BY_TARGET[target],
          slotId: context.slot.id,
          target,
        }],
        resolvedSlotPatch: options.resolvedSlotPatch,
        warnings: options.warning ? [options.warning] : [],
      }
    },
  }
}

function createRegistry(
  targets: readonly DiscPresetPlacementTarget[],
  calls: AdapterCall[],
) {
  const result = createDiscPresetPlacementAdapterRegistry(
    targets.map((target) => createAdapter(
      target,
      calls,
      {
        supportedIntentKinds: [
          DISC_PRESET_INTENT_KIND_BY_TARGET[target],
        ],
      },
    )),
  )
  assert.equal(result.ok, true)
  if (!result.ok) throw new Error(result.error.code)
  return result.registry
}

function resolveClassic(): DiscPresetResolutionResult {
  return resolveDiscPresetDefinition({
    definition: CLASSIC_TOP_TITLE_DISC_PRESET,
    template: standardTemplate,
  })
}

function createSingleRatingDefinition(): DiscPresetDefinitionV1 {
  const value = JSON.parse(
    JSON.stringify(CLASSIC_TOP_TITLE_DISC_PRESET),
  ) as Record<string, unknown>
  value.id = 'user:disc-preset:123e4567-e89b-42d3-a456-426614174000'
  value.name = 'Arbitrary rating-only definition'
  const slots = value.slots as unknown[]
  value.slots = [slots[2]]
  const parsed = parseDiscPresetDefinition(value)
  assert.equal(parsed.ok, true)
  if (!parsed.ok) throw new Error(parsed.error.code)
  return parsed.value
}

test('invokes exact semantic adapters in deterministic slot and intent order', () => {
  const calls: AdapterCall[] = []
  const registry = createRegistry(DISC_PRESET_PLACEMENT_TARGETS, calls)
  const result = buildDiscPresetApplicationPlan({
    resolution: resolveClassic(),
    adapterRegistry: registry,
    template: standardTemplate,
  })
  const expectedTargets = CLASSIC_TOP_TITLE_DISC_PRESET.slots.flatMap(
    ({ placements }) => placements.map(({ target }) => target),
  )

  assert.equal(result.status, 'applied')
  assert.deepEqual(calls.map(({ target }) => target), expectedTargets)
  assert.ok(calls.every(({ target, kind }) =>
    kind === DISC_PRESET_INTENT_KIND_BY_TARGET[target]))
  assert.deepEqual(result.updates.map(({ target }) => target), expectedTargets)
  assert.ok(result.updates.every((update) =>
    update.owner === DISC_PRESET_OWNER_FAMILY_BY_TARGET[update.target]))
})

test('passes only the focused semantic owner-state slice to an adapter', () => {
  const calls: AdapterCall[] = []
  const ratingState = Object.freeze({ fixture: 'rating-owner' })
  const registry = createRegistry(['rating.primary'], calls)
  const resolution = resolveDiscPresetDefinition({
    definition: createSingleRatingDefinition(),
    template: standardTemplate,
  })
  buildDiscPresetApplicationPlan({
    resolution,
    adapterRegistry: registry,
    ownerState: {
      'rating.primary': ratingState,
      'media-format.primary': { fixture: 'unrelated-owner' },
    },
    template: standardTemplate,
  })

  assert.equal(calls.length, 1)
  assert.equal(calls[0]?.ownerState, ratingState)
})

test('missing adapters make the result partial while valid adapters still run', () => {
  const calls: AdapterCall[] = []
  const registry = createRegistry(['rating.primary'], calls)
  const result = buildDiscPresetApplicationPlan({
    resolution: resolveClassic(),
    adapterRegistry: registry,
    template: standardTemplate,
  })

  assert.equal(result.status, 'partial')
  assert.deepEqual(calls.map(({ target }) => target), ['rating.primary'])
  assert.deepEqual(result.updates.map(({ target }) => target), ['rating.primary'])
  assert.ok(result.warnings.some((warning) =>
    warning.kind === 'missing-placement-adapter' &&
    warning.target === 'game-title.artwork'))
})

test('intent incompatibility warns and prevents adapter invocation', () => {
  const calls: AdapterCall[] = []
  const registryResult = createDiscPresetPlacementAdapterRegistry([
    createAdapter('rating.primary', calls, {
      supportedIntentKinds: ['text'],
    }),
  ])
  assert.equal(registryResult.ok, true)
  if (!registryResult.ok) return
  const resolution = resolveDiscPresetDefinition({
    definition: createSingleRatingDefinition(),
    template: standardTemplate,
  })
  const result = buildDiscPresetApplicationPlan({
    resolution,
    adapterRegistry: registryResult.registry,
    template: standardTemplate,
  })

  assert.equal(result.status, 'partial')
  assert.deepEqual(calls, [])
  assert.deepEqual(result.updates, [])
  assert.deepEqual(result.warnings, [{
    kind: 'intent-target-mismatch',
    slotId: 'disc:guided:rating-badge:primary',
    target: 'rating.primary',
    intentKind: 'point',
  }])
})

test('unsupported resolved slots never invoke their adapters', () => {
  const value = JSON.parse(
    JSON.stringify(createSingleRatingDefinition()),
  ) as Record<string, unknown>
  const slots = value.slots as Array<Record<string, unknown>>
  slots[0]!.contentRegion = {
    centerXPercent: 50,
    centerYPercent: 50,
    widthPercent: 2,
    heightPercent: 2,
  }
  const parsed = parseDiscPresetDefinition(value)
  assert.equal(parsed.ok, true)
  if (!parsed.ok) return
  const resolution = resolveDiscPresetDefinition({
    definition: parsed.value,
    template: standardTemplate,
  })
  const calls: AdapterCall[] = []
  const registry = createRegistry(['rating.primary'], calls)
  const result = buildDiscPresetApplicationPlan({
    resolution,
    adapterRegistry: registry,
    template: standardTemplate,
  })

  assert.equal(result.status, 'partial')
  assert.deepEqual(calls, [])
  assert.deepEqual(result.updates, [])
  assert.ok(result.warnings.some((warning) =>
    warning.kind === 'slot-unsupported'))
})

test('rejected resolution produces no updates or adapter calls', () => {
  const value = JSON.parse(
    JSON.stringify(createSingleRatingDefinition()),
  ) as Record<string, unknown>
  value.compatibility = {
    mode: 'specific-template',
    templateId: 'stickyLabelDisc',
    onConflict: 'reject',
  }
  const parsed = parseDiscPresetDefinition(value)
  assert.equal(parsed.ok, true)
  if (!parsed.ok) return
  const resolution = resolveDiscPresetDefinition({
    definition: parsed.value,
    template: standardTemplate,
  })
  const calls: AdapterCall[] = []
  const registry = createRegistry(['rating.primary'], calls)
  const result = buildDiscPresetApplicationPlan({
    resolution,
    adapterRegistry: registry,
    template: standardTemplate,
  })

  assert.equal(result.status, 'rejected')
  assert.equal(result.resolvedPreset, null)
  assert.deepEqual(result.updates, [])
  assert.deepEqual(calls, [])
})

test('adapter warnings aggregate and unsupported results become partial', () => {
  const calls: AdapterCall[] = []
  const warning: DiscPresetAdapterWarning = {
    kind: 'placement-unsupported',
    slotId: 'disc:guided:rating-badge:primary',
    target: 'rating.primary',
    reason: 'owner-state-unsupported',
  }
  const registryResult = createDiscPresetPlacementAdapterRegistry([
    createAdapter('rating.primary', calls, {
      resultStatus: 'unsupported',
      warning,
    }),
  ])
  assert.equal(registryResult.ok, true)
  if (!registryResult.ok) return
  const result = buildDiscPresetApplicationPlan({
    resolution: resolveDiscPresetDefinition({
      definition: createSingleRatingDefinition(),
      template: standardTemplate,
    }),
    adapterRegistry: registryResult.registry,
    template: standardTemplate,
  })

  assert.equal(result.status, 'partial')
  assert.deepEqual(result.updates, [])
  assert.deepEqual(result.warnings, [warning])
})

test('supports a second arbitrary validated definition without alias lookup', () => {
  const calls: AdapterCall[] = []
  const registry = createRegistry(['rating.primary'], calls)
  const definition = createSingleRatingDefinition()
  const result = buildDiscPresetApplicationPlan({
    resolution: resolveDiscPresetDefinition({
      definition,
      template: standardTemplate,
    }),
    adapterRegistry: registry,
    template: standardTemplate,
  })

  assert.equal(result.status, 'applied')
  assert.equal(result.resolvedPreset?.sourcePresetId, definition.id)
  assert.deepEqual(result.updates.map(({ target }) => target), ['rating.primary'])
})

test('an adapter can refine only its exact resolved slot while retaining nominal geometry', () => {
  const calls: AdapterCall[] = []
  const patch: DiscPresetResolvedSlotPatch = {
    slotId: 'disc:guided:rating-badge:primary',
    resolvedContentRegion: {
      centerXPercent: 78,
      centerYPercent: 61,
      widthPercent: 18,
      heightPercent: 12,
    },
  }
  const registryResult = createDiscPresetPlacementAdapterRegistry([
    createAdapter('rating.primary', calls, {
      supportedIntentKinds: ['point'],
      resolvedSlotPatch: patch,
    }),
  ])
  assert.equal(registryResult.ok, true)
  if (!registryResult.ok) return
  const result = buildDiscPresetApplicationPlan({
    resolution: resolveDiscPresetDefinition({
      definition: createSingleRatingDefinition(),
      template: standardTemplate,
    }),
    adapterRegistry: registryResult.registry,
    template: standardTemplate,
  })
  const slot = result.resolvedPreset?.slots[0]

  assert.equal(result.status, 'applied')
  assert.deepEqual(slot?.resolvedContentRegion, patch.resolvedContentRegion)
  assert.deepEqual(slot?.nominalContentRegion, {
    centerXPercent: 79,
    centerYPercent: 62,
    widthPercent: 20,
    heightPercent: 14,
  })
})

test('mismatched and multiple resolved-slot patches are rejected structurally', () => {
  const calls: AdapterCall[] = []
  const titleSlotId = 'disc:guided:game-title:primary' as const
  const mismatchedRegistry = createDiscPresetPlacementAdapterRegistry([
    createAdapter('rating.primary', calls, {
      supportedIntentKinds: ['point'],
      resolvedSlotPatch: {
        slotId: titleSlotId,
        status: 'adjusted',
      },
    }),
  ])
  assert.equal(mismatchedRegistry.ok, true)
  if (!mismatchedRegistry.ok) return
  const mismatchResult = buildDiscPresetApplicationPlan({
    resolution: resolveDiscPresetDefinition({
      definition: createSingleRatingDefinition(),
      template: standardTemplate,
    }),
    adapterRegistry: mismatchedRegistry.registry,
    template: standardTemplate,
  })

  assert.equal(mismatchResult.status, 'partial')
  assert.ok(mismatchResult.warnings.some((warning) =>
    warning.kind === 'resolved-slot-patch-rejected' &&
    warning.reason === 'slot-id-mismatch'))

  const multipleRegistry = createDiscPresetPlacementAdapterRegistry([
    createAdapter('game-title.artwork', calls, {
      supportedIntentKinds: ['point'],
      resolvedSlotPatch: {
        slotId: titleSlotId,
        status: 'adjusted',
      },
    }),
    createAdapter('game-title.text', calls, {
      supportedIntentKinds: ['text'],
      resolvedSlotPatch: {
        slotId: titleSlotId,
        status: 'adjusted',
      },
    }),
  ])
  assert.equal(multipleRegistry.ok, true)
  if (!multipleRegistry.ok) return
  const multipleResult = buildDiscPresetApplicationPlan({
    resolution: resolveClassic(),
    adapterRegistry: multipleRegistry.registry,
    template: standardTemplate,
  })
  const titleSlot = multipleResult.resolvedPreset?.slots.find(
    ({ id }) => id === titleSlotId,
  )

  assert.equal(multipleResult.status, 'partial')
  assert.equal(titleSlot?.status, 'resolved')
  assert.ok(multipleResult.warnings.some((warning) =>
    warning.kind === 'resolved-slot-patch-rejected' &&
    warning.reason === 'multiple-slot-patches'))
})

test('planning is deterministic immutable and does not mutate inputs', () => {
  const calls: AdapterCall[] = []
  const registry = createRegistry(DISC_PRESET_PLACEMENT_TARGETS, calls)
  const resolution = resolveClassic()
  const resolutionBefore = JSON.stringify(resolution)
  const first = buildDiscPresetApplicationPlan({
    resolution,
    adapterRegistry: registry,
    template: standardTemplate,
  })
  calls.length = 0
  const second = buildDiscPresetApplicationPlan({
    resolution,
    adapterRegistry: registry,
    template: standardTemplate,
  })

  assert.deepEqual(first, second)
  assert.equal(JSON.stringify(resolution), resolutionBefore)
  assert.ok(Object.isFrozen(first))
  assert.ok(Object.isFrozen(first.updates))
  assert.ok(Object.isFrozen(first.warnings))
  assert.ok(first.updates.every(Object.isFrozen))
  assert.ok(first.warnings.every(Object.isFrozen))
})

test('pure engine source excludes runtime side effects and Classic branching', () => {
  const sources = [
    './discPresetResolution.ts',
    './discPresetPlacementAdapters.ts',
    './discPresetApplication.ts',
  ].map((path) => readFileSync(new URL(path, import.meta.url), 'utf8')).join('\n')

  assert.doesNotMatch(
    sources,
    /from ['"]react|App\.tsx|components\/|document\.|window\.|projectSchema|createProjectSnapshot|restoreProject|renderer|exportPng|caseInsert|fetch\(|localStorage|sessionStorage|eval\(|Function\(/i,
  )
  assert.doesNotMatch(
    sources,
    /node:fs|@tauri-apps|https?:\/\/|classic-top-title|discPresetRegistry|compatibilityAliases/i,
  )
  assert.doesNotMatch(
    sources,
    /statePath|project\.owner|lodash\.set|setIn\(/i,
  )
})
