import assert from 'node:assert/strict'
import test from 'node:test'

import {
  DISC_PRESET_PLACEMENT_TARGETS,
  type DiscPresetPlacementIntentV1,
  type DiscPresetPlacementTarget,
} from './discPresetDefinition.ts'
import {
  createDiscPresetPlacementAdapterRegistry,
  type DiscPresetPlacementAdapter,
} from './discPresetPlacementAdapters.ts'

function createAdapter(
  target: DiscPresetPlacementTarget,
  supportedIntentKinds: readonly DiscPresetPlacementIntentV1['kind'][] = [
    'point',
    'text',
    'background',
    'group',
  ],
): DiscPresetPlacementAdapter {
  return {
    target,
    supportedIntentKinds,
    buildUpdate({ slot }) {
      return {
        status: 'skipped',
        updates: [],
        warnings: [{
          kind: 'placement-skipped',
          slotId: slot.id,
          target,
          reason: 'placement-not-applicable',
        }],
      }
    },
  }
}

test('registers adapters and returns the exact adapter by semantic target', () => {
  const adapter = createAdapter('rating.primary', ['point'])
  const result = createDiscPresetPlacementAdapterRegistry([adapter])

  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.equal(result.registry.has('rating.primary'), true)
  assert.equal(result.registry.get('rating.primary')?.target, 'rating.primary')
  assert.deepEqual(result.registry.listTargets(), ['rating.primary'])
  assert.deepEqual(
    result.registry.listMissingTargets(),
    DISC_PRESET_PLACEMENT_TARGETS.filter(
      (target) => target !== 'rating.primary',
    ),
  )
})

test('rejects duplicate target registration without replacement', () => {
  const result = createDiscPresetPlacementAdapterRegistry([
    createAdapter('game-title.artwork'),
    createAdapter('game-title.artwork'),
  ])

  assert.deepEqual(result, {
    ok: false,
    error: {
      code: 'duplicate-target',
      target: 'game-title.artwork',
    },
  })
})

test('returns null for an unknown runtime target', () => {
  const result = createDiscPresetPlacementAdapterRegistry([])
  assert.equal(result.ok, true)
  if (!result.ok) return

  assert.equal(
    result.registry.get('unknown.target' as DiscPresetPlacementTarget),
    null,
  )
})

test('preserves stable registration order and immutable public lists', () => {
  const supportedKinds: DiscPresetPlacementIntentV1['kind'][] = ['point']
  const result = createDiscPresetPlacementAdapterRegistry([
    createAdapter('publisher-logo.primary', supportedKinds),
    createAdapter('rating.primary', supportedKinds),
  ])
  assert.equal(result.ok, true)
  if (!result.ok) return

  supportedKinds.push('text')
  assert.deepEqual(result.registry.listTargets(), [
    'publisher-logo.primary',
    'rating.primary',
  ])
  assert.deepEqual(
    result.registry.get('publisher-logo.primary')?.supportedIntentKinds,
    ['point'],
  )
  assert.ok(Object.isFrozen(result.registry))
  assert.ok(Object.isFrozen(result.registry.listTargets()))
  assert.ok(Object.isFrozen(result.registry.listMissingTargets()))
  assert.ok(Object.isFrozen(result.registry.get('publisher-logo.primary')))
  assert.throws(() => {
    ;(result.registry.listTargets() as DiscPresetPlacementTarget[]).push(
      'media-format.primary',
    )
  }, TypeError)
})

test('can prove exhaustive target coverage independently of production wiring', () => {
  const result = createDiscPresetPlacementAdapterRegistry(
    DISC_PRESET_PLACEMENT_TARGETS.map((target) => createAdapter(target)),
  )
  assert.equal(result.ok, true)
  if (!result.ok) return

  assert.deepEqual(result.registry.listTargets(), DISC_PRESET_PLACEMENT_TARGETS)
  assert.deepEqual(result.registry.listMissingTargets(), [])
})
