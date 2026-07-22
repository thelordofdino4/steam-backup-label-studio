import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import {
  CLASSIC_TOP_TITLE_DISC_PRESET,
  CLASSIC_TOP_TITLE_DISC_PRESET_ID,
} from './builtins/classicTopTitleDiscPreset.ts'
import { parseDiscPresetDefinition, type DiscPresetDefinitionV1 } from './discPresetDefinition.ts'
import {
  DISC_PRESET_REGISTRY,
  createDiscPresetRegistry,
  resolveDiscPresetCompatibilityId,
} from './discPresetRegistry.ts'

function createUserDefinition(
  id: string,
  name: string,
  revision = 1,
): DiscPresetDefinitionV1 {
  const value = JSON.parse(JSON.stringify(CLASSIC_TOP_TITLE_DISC_PRESET)) as Record<string, unknown>
  value.id = id
  value.name = name
  value.revision = revision
  const result = parseDiscPresetDefinition(value)
  assert.equal(result.ok, true)
  if (!result.ok) throw new Error('User fixture failed to parse.')
  return result.value
}

const USER_ALPHA_ID = 'user:disc-preset:123e4567-e89b-42d3-a456-426614174000'
const USER_ZETA_ID = 'user:disc-preset:123e4567-e89b-42d3-b456-426614174001'

test('default registry exposes immutable Classic summary and definition', () => {
  assert.equal(
    DISC_PRESET_REGISTRY.get(CLASSIC_TOP_TITLE_DISC_PRESET_ID),
    CLASSIC_TOP_TITLE_DISC_PRESET,
  )
  assert.equal(
    DISC_PRESET_REGISTRY.get(CLASSIC_TOP_TITLE_DISC_PRESET_ID, 1),
    CLASSIC_TOP_TITLE_DISC_PRESET,
  )
  assert.equal(DISC_PRESET_REGISTRY.get(CLASSIC_TOP_TITLE_DISC_PRESET_ID, 2), null)
  assert.deepEqual(DISC_PRESET_REGISTRY.list(), [{
    id: CLASSIC_TOP_TITLE_DISC_PRESET_ID,
    revision: 1,
    name: 'Classic Top Title',
    surface: 'disc',
    source: 'builtin',
  }])
  assert.ok(Object.isFrozen(DISC_PRESET_REGISTRY))
  assert.ok(Object.isFrozen(DISC_PRESET_REGISTRY.list()))
  assert.ok(Object.isFrozen(DISC_PRESET_REGISTRY.list()[0]))
})

test('central aliases resolve current menu and guided workflow identities', () => {
  for (const alias of [
    'classic-top-title',
    'disc:guided-layout:classic-top-title',
  ]) {
    assert.equal(resolveDiscPresetCompatibilityId(alias), CLASSIC_TOP_TITLE_DISC_PRESET_ID)
    assert.equal(DISC_PRESET_REGISTRY.get(alias), CLASSIC_TOP_TITLE_DISC_PRESET)
  }
  assert.equal(
    resolveDiscPresetCompatibilityId(CLASSIC_TOP_TITLE_DISC_PRESET_ID),
    CLASSIC_TOP_TITLE_DISC_PRESET_ID,
  )
})

test('registry rejects duplicate revisions and user built-in collisions', () => {
  const duplicate = createDiscPresetRegistry({
    builtins: [CLASSIC_TOP_TITLE_DISC_PRESET, CLASSIC_TOP_TITLE_DISC_PRESET],
  })
  assert.equal(duplicate.ok, false)
  if (!duplicate.ok) assert.equal(duplicate.error.code, 'duplicate-id-revision')

  const collision = createDiscPresetRegistry({
    users: [CLASSIC_TOP_TITLE_DISC_PRESET],
  })
  assert.equal(collision.ok, false)
  if (!collision.ok) assert.equal(collision.error.code, 'user-builtin-collision')
})

test('registry keeps built-ins first and users stably sorted by name', () => {
  const alpha = createUserDefinition(USER_ALPHA_ID, 'Alpha')
  const zeta = createUserDefinition(USER_ZETA_ID, 'Zeta')
  const result = createDiscPresetRegistry({ users: [zeta, alpha] })
  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.deepEqual(result.registry.list().map(({ name }) => name), [
    'Classic Top Title',
    'Alpha',
    'Zeta',
  ])
})

test('lookup selects latest user revision while preserving exact revisions', () => {
  const revisionOne = createUserDefinition(USER_ALPHA_ID, 'Alpha', 1)
  const revisionTwo = createUserDefinition(USER_ALPHA_ID, 'Renamed Alpha', 2)
  const result = createDiscPresetRegistry({ users: [revisionTwo, revisionOne] })
  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.equal(result.registry.get(USER_ALPHA_ID), revisionTwo)
  assert.equal(result.registry.get(USER_ALPHA_ID, 1), revisionOne)
  assert.equal(result.registry.list().length, 2)
  assert.equal(result.registry.list()[1]?.revision, 2)
})

test('registry source stays pure and storage agnostic', () => {
  const source = readFileSync(new URL('./discPresetRegistry.ts', import.meta.url), 'utf8')
  assert.doesNotMatch(
    source,
    /React|App\.tsx|components|document\.|window\.|projectSchema|createProjectSnapshot|restoreProject|renderer|exportPng|caseInsert|fetch\(|localStorage|sessionStorage|eval\(|Function\(|node:fs|@tauri-apps/i,
  )
})
