import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import {
  evaluateCaseInsertPresetCompatibility,
  type CaseInsertPresetCompatibilityContext,
} from './caseInsertPresetCompatibility.ts'
import {
  CASE_INSERT_PRESET_CONCRETE_REGION_IDS,
  CASE_INSERT_PRESET_COORDINATE_BASES_BY_REGION,
  CASE_INSERT_PRESET_OWNER_IDS,
} from './caseInsertPresetDefinition.ts'
import {
  cloneFixture,
  createCoordinatedCaseInsertPresetDefinition,
  createMinimalCaseInsertPresetDefinition,
} from './caseInsertPresetTestFixtures.ts'
import {
  JEWEL_CASE_ESSENTIALS_CASE_PRESET_V2,
} from './builtins/jewelCaseEssentialsCasePresetV2.ts'

type MutableRecord = Record<string, unknown>

function createCompatibilityContext(
  overrides: Partial<CaseInsertPresetCompatibilityContext> = {},
): CaseInsertPresetCompatibilityContext {
  return {
    projectKind: 'caseInsert',
    templateId: 'jewelCase',
    templateCapabilities: CASE_INSERT_PRESET_CONCRETE_REGION_IDS.map(
      (region) => ({
        region,
        coordinateBases: CASE_INSERT_PRESET_COORDINATE_BASES_BY_REGION[region],
      }),
    ),
    ownerCapabilities: CASE_INSERT_PRESET_OWNER_IDS.map((ownerId) => ({
      ownerId,
      repeatedObjectIds: [],
    })),
    requestedScope: { kind: 'region', region: 'front-cover' },
    ...overrides,
  }
}

function slotsOf(definition: MutableRecord) {
  return definition.slots as MutableRecord[]
}

function assignmentsOf(slot: MutableRecord) {
  return slot.assignments as MutableRecord[]
}

function reasonCodes(
  result: ReturnType<typeof evaluateCaseInsertPresetCompatibility>,
) {
  return result.reasons.map(({ code }) => code)
}

test('returns one immutable compatible result without mutating definition or context', () => {
  const definition = createMinimalCaseInsertPresetDefinition()
  const context = createCompatibilityContext()
  const beforeDefinition = cloneFixture(definition)
  const beforeContext = cloneFixture(context)

  const result = evaluateCaseInsertPresetCompatibility(definition, context)

  assert.equal(result.status, 'compatible')
  assert.deepEqual(result.reasons, [])
  assert.equal(result.definition?.id, 'builtin:case-preset:minimal-cover')
  assert.deepEqual(result.requestedScope, {
    kind: 'region',
    region: 'front-cover',
  })
  assert.deepEqual(definition, beforeDefinition)
  assert.deepEqual(context, beforeContext)
  assert.ok(Object.isFrozen(result))
  assert.ok(Object.isFrozen(result.reasons))
  assert.ok(Object.isFrozen(result.definition))
  assert.ok(Object.isFrozen(result.requestedScope))
})

test('checks project kind and specific template identity', () => {
  const definition = createCoordinatedCaseInsertPresetDefinition()
  const compatible = evaluateCaseInsertPresetCompatibility(
    definition,
    createCompatibilityContext({ requestedScope: { kind: 'complete' } }),
  )
  assert.equal(compatible.status, 'compatible')

  const wrongKind = evaluateCaseInsertPresetCompatibility(
    definition,
    createCompatibilityContext({
      projectKind: 'disc',
      requestedScope: { kind: 'complete' },
    }),
  )
  assert.deepEqual(reasonCodes(wrongKind), ['project-kind-incompatible'])

  const wrongTemplate = evaluateCaseInsertPresetCompatibility(
    definition,
    createCompatibilityContext({
      templateId: 'future-case-template',
      requestedScope: { kind: 'complete' },
    }),
  )
  assert.deepEqual(reasonCodes(wrongTemplate), ['template-id-incompatible'])
})

test('requires a valid explicitly declared application scope', () => {
  const definition = createMinimalCaseInsertPresetDefinition()
  const invalid = evaluateCaseInsertPresetCompatibility(
    definition,
    createCompatibilityContext({
      requestedScope: { kind: 'region', region: 'spine' },
    }),
  )
  assert.deepEqual(reasonCodes(invalid), ['scope-invalid'])
  assert.equal(invalid.requestedScope, null)

  const undeclared = evaluateCaseInsertPresetCompatibility(
    definition,
    createCompatibilityContext({
      requestedScope: { kind: 'section', section: 'front' },
    }),
  )
  assert.deepEqual(reasonCodes(undeclared), ['scope-unsupported'])
})

test('checks every used concrete region and coordinate basis against the template', () => {
  const definition = createMinimalCaseInsertPresetDefinition()
  const missingRegion = evaluateCaseInsertPresetCompatibility(
    definition,
    createCompatibilityContext({ templateCapabilities: [] }),
  )
  assert.deepEqual(reasonCodes(missingRegion), ['region-unavailable'])

  const missingBasis = evaluateCaseInsertPresetCompatibility(
    definition,
    createCompatibilityContext({
      templateCapabilities: [{
        region: 'front-cover',
        coordinateBases: ['front'],
      }],
    }),
  )
  assert.deepEqual(
    reasonCodes(missingBasis),
    ['coordinate-basis-unavailable'],
  )
})

test('checks trusted owner and repeated-object availability by stable ID', () => {
  const definition = createMinimalCaseInsertPresetDefinition()
  const missingOwner = evaluateCaseInsertPresetCompatibility(
    definition,
    createCompatibilityContext({ ownerCapabilities: [] }),
  )
  assert.deepEqual(reasonCodes(missingOwner), ['owner-unavailable'])

  const repeated = createMinimalCaseInsertPresetDefinition()
  const slot = slotsOf(repeated)[0]!
  slot.roleId = 'additional-artwork'
  const assignment = assignmentsOf(slot)[0]!
  assignment.ownerId = 'case.cover.artwork-slots'
  assignment.object = { kind: 'repeated', id: 'cover-artwork-1' }

  const unavailable = evaluateCaseInsertPresetCompatibility(
    repeated,
    createCompatibilityContext(),
  )
  assert.deepEqual(reasonCodes(unavailable), ['repeated-object-unavailable'])
  assert.equal(unavailable.status, 'compatible-with-warnings')
  assert.equal(unavailable.reasons[0]?.severity, 'warning')

  const available = evaluateCaseInsertPresetCompatibility(
    repeated,
    createCompatibilityContext({
      ownerCapabilities: CASE_INSERT_PRESET_OWNER_IDS.map((ownerId) => ({
        ownerId,
        repeatedObjectIds: ownerId === 'case.cover.artwork-slots'
          ? ['cover-artwork-1']
          : [],
      })),
    }),
  )
  assert.equal(available.status, 'compatible')
})

test('treats only reviewed revision-2 create-empty targets as provisionable', () => {
  const context = createCompatibilityContext({
    requestedScope: { kind: 'complete' },
  })
  const result = evaluateCaseInsertPresetCompatibility(
    JEWEL_CASE_ESSENTIALS_CASE_PRESET_V2,
    context,
  )

  assert.equal(result.status, 'compatible')
  assert.deepEqual(result.reasons, [])
})

test('malformed definitions fail before compatibility can reach any owner', () => {
  const malformed = createMinimalCaseInsertPresetDefinition()
  malformed.formatVersion = 3
  const result = evaluateCaseInsertPresetCompatibility(
    malformed,
    createCompatibilityContext(),
  )
  assert.equal(result.status, 'incompatible')
  assert.deepEqual(reasonCodes(result), ['definition-invalid'])
  assert.equal(result.definition, null)
  assert.equal(result.requestedScope, null)
})

test('mirrored editing state cannot change identity or compatibility', () => {
  const definition = createCoordinatedCaseInsertPresetDefinition()
  const baseContext = createCompatibilityContext({
    requestedScope: { kind: 'section', section: 'spine' },
  })
  const mirroredContext = {
    ...baseContext,
    mirrored: true,
  }

  const base = evaluateCaseInsertPresetCompatibility(definition, baseContext)
  const mirrored = evaluateCaseInsertPresetCompatibility(
    definition,
    mirroredContext,
  )
  assert.deepEqual(mirrored, base)
  assert.deepEqual(
    mirrored.definition?.slots
      .flatMap(({ assignments }) => assignments)
      .filter(({ region }) => region.endsWith('-spine'))
      .map(({ region }) => region)
      .sort(),
    ['left-spine', 'right-spine'],
  )
})

test('incompatibility reasons are deterministic and deeply immutable', () => {
  const definition = createMinimalCaseInsertPresetDefinition()
  const context = createCompatibilityContext({
    projectKind: 'disc',
    templateCapabilities: [],
    ownerCapabilities: [],
    requestedScope: { kind: 'complete' },
  })
  const first = evaluateCaseInsertPresetCompatibility(definition, context)
  const second = evaluateCaseInsertPresetCompatibility(definition, context)
  assert.deepEqual(second, first)
  assert.equal(first.status, 'incompatible')
  assert.deepEqual(reasonCodes(first), [
    'region-unavailable',
    'owner-unavailable',
    'project-kind-incompatible',
    'scope-unsupported',
  ])
  assert.ok(Object.isFrozen(first.reasons))
  for (const reason of first.reasons) assert.ok(Object.isFrozen(reason))
})

test('compatibility source is a pure read-only evaluator with no project owners', () => {
  const source = readFileSync(
    new URL('./caseInsertPresetCompatibility.ts', import.meta.url),
    'utf8',
  )
  assert.doesNotMatch(
    source,
    /React|App\.tsx|components|ProjectJewelCaseState|caseInsert\/|setState|dispatch|updateProject|restoreProject|renderer|exportCaseInsert|fetch\(|localStorage|sessionStorage|@tauri-apps|node:fs/i,
  )
})
