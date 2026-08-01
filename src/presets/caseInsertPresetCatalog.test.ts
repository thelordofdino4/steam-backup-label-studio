import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import {
  CASE_INSERT_PRESET_CATALOG,
  createCaseInsertPresetCatalog,
} from './caseInsertPresetCatalog.ts'
import { parseCaseInsertPresetDefinition } from './caseInsertPresetDefinition.ts'
import {
  cloneFixture,
  createMinimalCaseInsertPresetDefinition,
} from './caseInsertPresetTestFixtures.ts'

const USER_ALPHA_ID =
  'user:case-preset:123e4567-e89b-42d3-a456-426614174000'
const USER_ZETA_ID =
  'user:case-preset:123e4567-e89b-42d3-b456-426614174001'

function createDefinition(
  id: string,
  name: string,
  revision = 1,
) {
  const definition = createMinimalCaseInsertPresetDefinition()
  definition.id = id
  definition.name = name
  definition.revision = revision
  return definition
}

test('the default catalog is immutable and intentionally has no starter presets', () => {
  assert.deepEqual(CASE_INSERT_PRESET_CATALOG.list(), [])
  assert.ok(Object.isFrozen(CASE_INSERT_PRESET_CATALOG))
  assert.ok(Object.isFrozen(CASE_INSERT_PRESET_CATALOG.list()))
})

test('resolves canonical latest and exact revision identities without substitution', () => {
  const revisionOne = createDefinition(USER_ALPHA_ID, 'Alpha', 1)
  const revisionThree = createDefinition(USER_ALPHA_ID, 'Alpha Current', 3)
  const result = createCaseInsertPresetCatalog({
    users: [revisionThree, revisionOne],
  })
  assert.equal(result.ok, true)
  if (!result.ok) return

  assert.equal(result.catalog.getLatest(USER_ALPHA_ID)?.revision, 3)
  assert.equal(result.catalog.getExact(USER_ALPHA_ID, 1)?.revision, 1)
  assert.equal(result.catalog.getExact(USER_ALPHA_ID, 2), null)

  const exact = result.catalog.resolve({ id: USER_ALPHA_ID, revision: 1 })
  assert.equal(exact.ok, true)
  if (exact.ok) {
    assert.deepEqual(exact.value.canonicalReference, {
      id: USER_ALPHA_ID,
      revision: 1,
    })
    assert.equal(exact.value.matchedAlias, null)
  }

  const missing = result.catalog.resolve({ id: USER_ALPHA_ID, revision: 2 })
  assert.equal(missing.ok, false)
  if (!missing.ok) assert.equal(missing.error.code, 'unknown-revision')
})

test('resolves aliases only at the catalog boundary and returns canonical identity', () => {
  const canonical = createMinimalCaseInsertPresetDefinition()
  const result = createCaseInsertPresetCatalog({
    builtins: [canonical],
    aliases: [{
      alias: 'legacy:case-layout:minimal-cover',
      canonicalId: 'builtin:case-preset:minimal-cover',
    }],
  })
  assert.equal(result.ok, true)
  if (!result.ok) return

  const resolved = result.catalog.resolve({
    id: 'legacy:case-layout:minimal-cover',
    revision: 1,
  })
  assert.equal(resolved.ok, true)
  if (!resolved.ok) return
  assert.equal(
    resolved.value.canonicalReference.id,
    'builtin:case-preset:minimal-cover',
  )
  assert.equal(resolved.value.definition.id, resolved.value.canonicalReference.id)
  assert.equal(resolved.value.matchedAlias, 'legacy:case-layout:minimal-cover')
  assert.ok(Object.isFrozen(resolved))
  assert.ok(Object.isFrozen(resolved.value))
  assert.ok(Object.isFrozen(resolved.value.canonicalReference))

  const parserInput = cloneFixture(canonical)
  parserInput.id = 'legacy:case-layout:minimal-cover'
  const parserResult = parseCaseInsertPresetDefinition(parserInput)
  assert.equal(parserResult.ok, false)
  if (!parserResult.ok) assert.equal(parserResult.error.code, 'invalid-id')
})

test('rejects duplicate preset revisions and catalog source collisions', () => {
  const builtin = createMinimalCaseInsertPresetDefinition()
  const duplicate = createCaseInsertPresetCatalog({
    builtins: [builtin, cloneFixture(builtin)],
  })
  assert.equal(duplicate.ok, false)
  if (!duplicate.ok) assert.equal(duplicate.error.code, 'duplicate-id-revision')

  const userCollision = createCaseInsertPresetCatalog({ users: [builtin] })
  assert.equal(userCollision.ok, false)
  if (!userCollision.ok) {
    assert.equal(userCollision.error.code, 'user-builtin-collision')
  }

  const builtinWrongNamespace = createCaseInsertPresetCatalog({
    builtins: [createDefinition(USER_ALPHA_ID, 'User in builtins')],
  })
  assert.equal(builtinWrongNamespace.ok, false)
  if (!builtinWrongNamespace.ok) {
    assert.equal(builtinWrongNamespace.error.code, 'invalid-builtin-id')
  }
})

test('rejects ambiguous, colliding, duplicate, and unknown aliases', () => {
  const builtin = createMinimalCaseInsertPresetDefinition()
  const input = { builtins: [builtin] } as const

  for (const alias of ['Visible Label', '0', '/case/preset', 'case[preset]']) {
    const result = createCaseInsertPresetCatalog({
      ...input,
      aliases: [{
        alias,
        canonicalId: 'builtin:case-preset:minimal-cover',
      }],
    })
    assert.equal(result.ok, false)
    if (!result.ok) assert.equal(result.error.code, 'invalid-alias')
  }

  const duplicate = createCaseInsertPresetCatalog({
    ...input,
    aliases: [
      {
        alias: 'legacy:minimal',
        canonicalId: 'builtin:case-preset:minimal-cover',
      },
      {
        alias: 'legacy:minimal',
        canonicalId: 'builtin:case-preset:minimal-cover',
      },
    ],
  })
  assert.equal(duplicate.ok, false)
  if (!duplicate.ok) assert.equal(duplicate.error.code, 'duplicate-alias')

  const collision = createCaseInsertPresetCatalog({
    ...input,
    aliases: [{
      alias: 'builtin:case-preset:minimal-cover',
      canonicalId: 'builtin:case-preset:minimal-cover',
    }],
  })
  assert.equal(collision.ok, false)
  if (!collision.ok) {
    assert.equal(collision.error.code, 'alias-canonical-collision')
  }

  const unknownTarget = createCaseInsertPresetCatalog({
    ...input,
    aliases: [{
      alias: 'legacy:missing',
      canonicalId: 'builtin:case-preset:missing',
    }],
  })
  assert.equal(unknownTarget.ok, false)
  if (!unknownTarget.ok) {
    assert.equal(unknownTarget.error.code, 'unknown-alias-target')
  }
})

test('catalog output is deterministic, source-aware, and deeply immutable', () => {
  const builtin = createMinimalCaseInsertPresetDefinition()
  const alpha = createDefinition(USER_ALPHA_ID, 'Alpha')
  const zeta = createDefinition(USER_ZETA_ID, 'Zeta')
  const result = createCaseInsertPresetCatalog({
    builtins: [builtin],
    users: [zeta, alpha],
  })
  assert.equal(result.ok, true)
  if (!result.ok) return

  assert.deepEqual(result.catalog.list(), [
    {
      id: 'builtin:case-preset:minimal-cover',
      revision: 1,
      name: 'Minimal Cover',
      surface: 'case-insert',
      source: 'builtin',
    },
    {
      id: USER_ALPHA_ID,
      revision: 1,
      name: 'Alpha',
      surface: 'case-insert',
      source: 'user',
    },
    {
      id: USER_ZETA_ID,
      revision: 1,
      name: 'Zeta',
      surface: 'case-insert',
      source: 'user',
    },
  ])
  assert.ok(Object.isFrozen(result))
  assert.ok(Object.isFrozen(result.catalog))
  assert.ok(Object.isFrozen(result.catalog.list()))
  assert.ok(Object.isFrozen(result.catalog.list()[0]))
  assert.ok(Object.isFrozen(result.catalog.getLatest(USER_ALPHA_ID)))
})

test('catalog reports malformed definitions without trusting their identity', () => {
  const malformed = createMinimalCaseInsertPresetDefinition()
  malformed.formatVersion = 2
  const result = createCaseInsertPresetCatalog({ builtins: [malformed] })
  assert.equal(result.ok, false)
  if (!result.ok) {
    assert.equal(result.error.code, 'invalid-definition')
    assert.equal(
      result.error.definitionError?.code,
      'unsupported-format-version',
    )
  }
})

test('catalog source stays pure, storage agnostic, and mutation free', () => {
  const source = readFileSync(
    new URL('./caseInsertPresetCatalog.ts', import.meta.url),
    'utf8',
  )
  assert.doesNotMatch(
    source,
    /React|App\.tsx|components|document\.|window\.|ProjectJewelCaseState|setState|dispatch|renderer|exportCaseInsert|fetch\(|localStorage|sessionStorage|@tauri-apps|node:fs/i,
  )
})
