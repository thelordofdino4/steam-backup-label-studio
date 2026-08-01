import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import {
  CASE_INSERT_PRESET_CONCRETE_REGION_IDS,
  CASE_INSERT_PRESET_COORDINATE_BASES,
  CASE_INSERT_PRESET_COORDINATE_BASES_BY_REGION,
  getCaseInsertPresetApplicationScopeKey,
  isBuiltInCaseInsertPresetId,
  isCaseInsertPresetCoordinateBasisAllowed,
  isUserCaseInsertPresetId,
  parseCaseInsertPresetDefinition,
  type CaseInsertPresetConcreteRegionId,
  type CaseInsertPresetCoordinateBasis,
  type CaseInsertPresetDefinitionParseErrorCode,
} from './caseInsertPresetDefinition.ts'
import {
  cloneFixture,
  createCoordinatedCaseInsertPresetDefinition,
  createMinimalCaseInsertPresetDefinition,
} from './caseInsertPresetTestFixtures.ts'

type MutableRecord = Record<string, unknown>

function expectFailure(
  value: unknown,
  code: CaseInsertPresetDefinitionParseErrorCode,
) {
  const result = parseCaseInsertPresetDefinition(value)
  assert.equal(result.ok, false)
  if (!result.ok) assert.equal(result.error.code, code)
}

function slotsOf(definition: MutableRecord) {
  return definition.slots as MutableRecord[]
}

function assignmentsOf(slot: MutableRecord) {
  return slot.assignments as MutableRecord[]
}

function singleRegionDefinition(
  region: CaseInsertPresetConcreteRegionId,
  coordinateBasis: CaseInsertPresetCoordinateBasis,
) {
  const definition = createCoordinatedCaseInsertPresetDefinition()
  const slot = slotsOf(definition).find(({ id }) =>
    id === `case:preset-slot:${region}`)
  assert.ok(slot)
  const assignment = assignmentsOf(slot)[0]
  assert.ok(assignment)
  assignment.coordinateBasis = coordinateBasis
  definition.applicationScopes = [{ kind: 'region', region }]
  definition.slots = [slot]
  return definition
}

test('parses a minimal definition into canonical deeply immutable data', () => {
  const input = createMinimalCaseInsertPresetDefinition()
  const before = cloneFixture(input)
  const result = parseCaseInsertPresetDefinition(input)

  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.deepEqual(input, before)
  assert.notEqual(result.value, input)
  assert.equal(result.value.id, 'builtin:case-preset:minimal-cover')
  assert.equal(result.value.revision, 1)
  assert.equal(result.value.slots[0]?.assignments[0]?.region, 'front-cover')
  assert.ok(Object.isFrozen(result))
  assert.ok(Object.isFrozen(result.value))
  assert.ok(Object.isFrozen(result.value.compatibility))
  assert.ok(Object.isFrozen(result.value.applicationScopes))
  assert.ok(Object.isFrozen(result.value.applicationScopes[0]))
  assert.ok(Object.isFrozen(result.value.slots))
  assert.ok(Object.isFrozen(result.value.slots[0]))
  assert.ok(Object.isFrozen(result.value.slots[0]?.assignments))
  assert.ok(Object.isFrozen(result.value.slots[0]?.assignments[0]))
  assert.ok(Object.isFrozen(result.value.slots[0]?.assignments[0]?.object))
  assert.ok(Object.isFrozen(
    result.value.slots[0]?.assignments[0]?.contentRegion,
  ))
})

test('canonicalizes coordinated definitions deterministically', () => {
  const first = parseCaseInsertPresetDefinition(
    createCoordinatedCaseInsertPresetDefinition(),
  )
  assert.equal(first.ok, true)
  if (!first.ok) return

  const shuffled = createCoordinatedCaseInsertPresetDefinition()
  shuffled.slots = [...slotsOf(shuffled)].reverse()
  shuffled.applicationScopes = [
    ...(shuffled.applicationScopes as unknown[]),
  ].reverse()
  const second = parseCaseInsertPresetDefinition(shuffled)
  assert.equal(second.ok, true)
  if (!second.ok) return

  assert.deepEqual(second.value, first.value)
  assert.deepEqual(first.value.slots.map(({ id }) => id), [
    'case:preset-slot:back-panel',
    'case:preset-slot:front-cover',
    'case:preset-slot:left-spine',
    'case:preset-slot:right-spine',
    'case:preset-slot:tray-card',
  ])
  assert.deepEqual(
    first.value.applicationScopes.map(getCaseInsertPresetApplicationScopeKey),
    [
      'region:front-cover',
      'region:tray-card',
      'region:back-panel',
      'region:left-spine',
      'region:right-spine',
      'section:front',
      'section:back',
      'section:spine',
      'complete',
    ],
  )
})

test('accepts only canonical Case namespaces and positive exact revisions', () => {
  assert.equal(
    isBuiltInCaseInsertPresetId('builtin:case-preset:front-and-back'),
    true,
  )
  assert.equal(
    isUserCaseInsertPresetId(
      'user:case-preset:123e4567-e89b-42d3-a456-426614174000',
    ),
    true,
  )

  const user = createMinimalCaseInsertPresetDefinition()
  user.id = 'user:case-preset:123e4567-e89b-42d3-a456-426614174000'
  assert.equal(parseCaseInsertPresetDefinition(user).ok, true)

  for (const id of [
    'minimal-cover',
    'builtin:disc-preset:minimal-cover',
    'builtin:case-preset:Visible Label',
    'user:case-preset:not-a-uuid',
    'file:C:/preset.json',
  ]) {
    const definition = createMinimalCaseInsertPresetDefinition()
    definition.id = id
    expectFailure(definition, 'invalid-id')
  }

  for (const revision of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1, '1']) {
    const definition = createMinimalCaseInsertPresetDefinition()
    definition.revision = revision
    expectFailure(definition, 'invalid-revision')
  }
})

test('accepts every permitted region/basis pair and rejects every cross-pair', () => {
  for (const region of CASE_INSERT_PRESET_CONCRETE_REGION_IDS) {
    const allowed = CASE_INSERT_PRESET_COORDINATE_BASES_BY_REGION[region]
    for (const basis of CASE_INSERT_PRESET_COORDINATE_BASES) {
      const definition = singleRegionDefinition(region, basis)
      const result = parseCaseInsertPresetDefinition(definition)
      const shouldPass = allowed.some((candidate) => candidate === basis)
      assert.equal(
        result.ok,
        shouldPass,
        `${region} with ${basis} should ${shouldPass ? 'pass' : 'fail'}`,
      )
      assert.equal(
        isCaseInsertPresetCoordinateBasisAllowed(region, basis),
        shouldPass,
      )
      if (!result.ok) {
        assert.equal(result.error.code, 'region-coordinate-basis-mismatch')
      }
    }
  }
})

test('keeps Back Panel isolated while permitting explicit complete-Tray background', () => {
  for (const fullTrayBasis of ['back', 'backSafe'] as const) {
    expectFailure(
      singleRegionDefinition('back-panel', fullTrayBasis),
      'region-coordinate-basis-mismatch',
    )
  }

  for (const backPanelBasis of ['backPanel', 'backPanelSafe'] as const) {
    expectFailure(
      singleRegionDefinition('tray-card', backPanelBasis),
      'region-coordinate-basis-mismatch',
    )
  }

  const tray = parseCaseInsertPresetDefinition(
    singleRegionDefinition('tray-card', 'back'),
  )
  assert.equal(tray.ok, true)
  if (tray.ok) {
    assert.equal(tray.value.slots[0]?.assignments[0]?.region, 'tray-card')
    assert.equal(tray.value.slots[0]?.assignments[0]?.ownerId, 'case.tray.background')
  }
})

test('requires independent left/right assignments and rejects generic spine identity', () => {
  const coordinated = createCoordinatedCaseInsertPresetDefinition()
  const parsed = parseCaseInsertPresetDefinition(coordinated)
  assert.equal(parsed.ok, true)
  if (parsed.ok) {
    const assignments = parsed.value.slots.flatMap(({ assignments }) => assignments)
    assert.equal(
      assignments.find(({ region }) => region === 'left-spine')?.ownerId,
      'case.spine.left.background',
    )
    assert.equal(
      assignments.find(({ region }) => region === 'right-spine')?.ownerId,
      'case.spine.right.background',
    )
  }

  const generic = singleRegionDefinition('left-spine', 'leftSpine')
  assignmentsOf(slotsOf(generic)[0]!)[0]!.region = 'spine'
  expectFailure(generic, 'invalid-region')

  const genericScope = createMinimalCaseInsertPresetDefinition()
  genericScope.applicationScopes = [{ kind: 'region', region: 'spine' }]
  expectFailure(genericScope, 'invalid-scope')
})

test('rejects duplicate scopes, slots, assignments, and owner/object bindings', () => {
  const duplicateScope = createMinimalCaseInsertPresetDefinition()
  duplicateScope.applicationScopes = [
    { kind: 'region', region: 'front-cover' },
    { kind: 'region', region: 'front-cover' },
  ]
  expectFailure(duplicateScope, 'duplicate-scope')

  const duplicateSlot = createMinimalCaseInsertPresetDefinition()
  duplicateSlot.slots = [
    ...slotsOf(duplicateSlot),
    cloneFixture(slotsOf(duplicateSlot)[0]),
  ]
  expectFailure(duplicateSlot, 'duplicate-slot')

  const duplicateAssignment = createMinimalCaseInsertPresetDefinition()
  const assignment = assignmentsOf(slotsOf(duplicateAssignment)[0]!)[0]!
  assignmentsOf(slotsOf(duplicateAssignment)[0]!).push({
    ...cloneFixture(assignment),
    object: { kind: 'fixed', id: 'case:cover:background' },
  })
  expectFailure(duplicateAssignment, 'duplicate-assignment')

  const duplicateBinding = createMinimalCaseInsertPresetDefinition()
  const duplicateBindingAssignment = cloneFixture(
    assignmentsOf(slotsOf(duplicateBinding)[0]!)[0]!,
  )
  duplicateBindingAssignment.id = 'case:preset-assignment:other-id'
  assignmentsOf(slotsOf(duplicateBinding)[0]!).push(duplicateBindingAssignment)
  expectFailure(duplicateBinding, 'duplicate-owner-object-binding')
})

test('binds repeated objects by stable ID and rejects indices, labels, and paths', () => {
  const repeated = createMinimalCaseInsertPresetDefinition()
  const slot = slotsOf(repeated)[0]!
  slot.roleId = 'additional-artwork'
  const assignment = assignmentsOf(slot)[0]!
  assignment.ownerId = 'case.cover.artwork-slots'
  assignment.object = { kind: 'repeated', id: 'cover-artwork-1' }
  assert.equal(parseCaseInsertPresetDefinition(repeated).ok, true)

  for (const id of ['0', 'Artwork Slot 1', 'artworkSlots[0]', '/slots/0']) {
    const invalid = cloneFixture(repeated)
    assignmentsOf(slotsOf(invalid)[0]!)[0]!.object = {
      kind: 'repeated',
      id,
    }
    expectFailure(invalid, 'invalid-object-binding')
  }
})

test('rejects incompatible role, owner, region, and object combinations', () => {
  const roleRegion = singleRegionDefinition('back-panel', 'backPanel')
  slotsOf(roleRegion)[0]!.roleId = 'background-artwork'
  expectFailure(roleRegion, 'role-region-mismatch')

  const ownerRegion = singleRegionDefinition('back-panel', 'backPanel')
  assignmentsOf(slotsOf(ownerRegion)[0]!)[0]!.ownerId = 'case.cover.text-blocks'
  expectFailure(ownerRegion, 'owner-region-mismatch')

  const ownerRole = createMinimalCaseInsertPresetDefinition()
  slotsOf(ownerRole)[0]!.roleId = 'game-title'
  expectFailure(ownerRole, 'owner-role-mismatch')

  const wrongBindingKind = createMinimalCaseInsertPresetDefinition()
  assignmentsOf(slotsOf(wrongBindingKind)[0]!)[0]!.object = {
    kind: 'repeated',
    id: 'cover-background',
  }
  expectFailure(wrongBindingKind, 'invalid-object-binding')

  const unsupportedOwner = createMinimalCaseInsertPresetDefinition()
  assignmentsOf(slotsOf(unsupportedOwner)[0]!)[0]!.ownerId =
    'case.cover.untrusted-path'
  expectFailure(unsupportedOwner, 'unsupported-owner')
})

test('rejects malformed, unknown-field, wrong-surface, and future definitions', () => {
  expectFailure(null, 'invalid-root')

  const unknown = createMinimalCaseInsertPresetDefinition()
  unknown.callback = 'not declarative data'
  expectFailure(unknown, 'unexpected-field')

  const future = createMinimalCaseInsertPresetDefinition()
  future.formatVersion = 2
  expectFailure(future, 'unsupported-format-version')

  const wrongKind = createMinimalCaseInsertPresetDefinition()
  wrongKind.kind = 'sbls/disc-preset'
  expectFailure(wrongKind, 'unsupported-kind')

  const wrongSurface = createMinimalCaseInsertPresetDefinition()
  wrongSurface.surface = 'disc'
  expectFailure(wrongSurface, 'invalid-surface')

  for (const compatibility of [
    { mode: 'any-case-template', templateId: 'jewelCase' },
    { mode: 'specific-template', templateId: 'Visible Label' },
    { mode: 'specific-template', templateId: '../jewelCase' },
  ]) {
    const invalidCompatibility = createMinimalCaseInsertPresetDefinition()
    invalidCompatibility.compatibility = compatibility
    expectFailure(invalidCompatibility, 'invalid-compatibility')
  }

  const unsupportedScope = createMinimalCaseInsertPresetDefinition()
  unsupportedScope.applicationScopes = [
    { kind: 'region', region: 'right-spine' },
  ]
  expectFailure(unsupportedScope, 'unsupported-scope')

  const missingTargetPresence = createMinimalCaseInsertPresetDefinition()
  delete assignmentsOf(slotsOf(missingTargetPresence)[0]!)[0]!.targetPresence
  expectFailure(missingTargetPresence, 'invalid-target-presence')

  for (const targetPresence of [true, 'create', 'warning']) {
    const invalidTargetPresence = createMinimalCaseInsertPresetDefinition()
    assignmentsOf(
      slotsOf(invalidTargetPresence)[0]!,
    )[0]!.targetPresence = targetPresence
    expectFailure(invalidTargetPresence, 'invalid-target-presence')
  }
})

test('definition source remains declarative, pure, and owner-mutation free', () => {
  const source = readFileSync(
    new URL('./caseInsertPresetDefinition.ts', import.meta.url),
    'utf8',
  )
  assert.doesNotMatch(
    source,
    /React|App\.tsx|components|document\.|window\.|ProjectJewelCaseState|setState|dispatch|renderer|exportCaseInsert|fetch\(|localStorage|sessionStorage|@tauri-apps|node:fs/i,
  )
})
