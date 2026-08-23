import assert from 'node:assert/strict'
import test from 'node:test'
import {
  CASE_INSERT_PRESET_ARTWORK_SLOT_PROVISIONING_CAPABILITIES,
  CASE_INSERT_PRESET_EMPTY_ARTWORK_SLOT_INSERTION_POLICY,
  createCaseInsertPresetEmptyArtworkSlot,
  getCaseInsertPresetArtworkSlotProvisioningCapability,
  provisionCaseInsertPresetEmptyArtworkSlots,
  type CaseInsertPresetArtworkSlotProvisioningTarget,
} from './presetArtworkSlotProvisioning.ts'

const EXPECTED_CAPABILITIES = [
  {
    target: {
      presetId: 'builtin:case-preset:jewel-case-essentials',
      presetRevision: 2,
      templateId: 'jewelCase',
      templateRevision: null,
      slotId: 'case:preset-slot:back-screenshots',
      assignmentId: 'case:preset-assignment:back-screenshot-one',
      roleId: 'screenshots',
      region: 'back-panel',
      coordinateBasis: 'backPanelSafe',
      ownerId: 'case.tray.artwork-slots',
      object: { kind: 'repeated', id: 'tray-artwork-1' },
    },
    slotNumber: 1,
    canonicalLabel: 'Artwork 1',
    reviewLabel: 'Screenshot 1',
    insertionPolicy: 'append-preserve-existing-order',
  },
  {
    target: {
      presetId: 'builtin:case-preset:jewel-case-essentials',
      presetRevision: 2,
      templateId: 'jewelCase',
      templateRevision: null,
      slotId: 'case:preset-slot:back-screenshots',
      assignmentId: 'case:preset-assignment:back-screenshot-two',
      roleId: 'screenshots',
      region: 'back-panel',
      coordinateBasis: 'backPanelSafe',
      ownerId: 'case.tray.artwork-slots',
      object: { kind: 'repeated', id: 'tray-artwork-2' },
    },
    slotNumber: 2,
    canonicalLabel: 'Artwork 2',
    reviewLabel: 'Screenshot 2',
    insertionPolicy: 'append-preserve-existing-order',
  },
  {
    target: {
      presetId: 'builtin:case-preset:jewel-case-essentials',
      presetRevision: 2,
      templateId: 'jewelCase',
      templateRevision: null,
      slotId: 'case:preset-slot:back-screenshots',
      assignmentId: 'case:preset-assignment:back-screenshot-three',
      roleId: 'screenshots',
      region: 'back-panel',
      coordinateBasis: 'backPanelSafe',
      ownerId: 'case.tray.artwork-slots',
      object: { kind: 'repeated', id: 'tray-artwork-3' },
    },
    slotNumber: 3,
    canonicalLabel: 'Artwork 3',
    reviewLabel: 'Screenshot 3',
    insertionPolicy: 'append-preserve-existing-order',
  },
] as const

function assertDeeplyFrozen(value: unknown, seen = new Set<unknown>()) {
  if (!value || typeof value !== 'object' || seen.has(value)) return
  seen.add(value)
  assert.equal(Object.isFrozen(value), true)
  for (const child of Object.values(value)) assertDeeplyFrozen(child, seen)
}

function copyTarget(
  index = 0,
): CaseInsertPresetArtworkSlotProvisioningTarget {
  return structuredClone(
    CASE_INSERT_PRESET_ARTWORK_SLOT_PROVISIONING_CAPABILITIES[index]!.target,
  )
}

test('publishes exactly the three reviewed Jewel Case Essentials v2 capabilities', () => {
  assert.equal(
    CASE_INSERT_PRESET_EMPTY_ARTWORK_SLOT_INSERTION_POLICY,
    'append-preserve-existing-order',
  )
  assert.deepEqual(
    CASE_INSERT_PRESET_ARTWORK_SLOT_PROVISIONING_CAPABILITIES,
    EXPECTED_CAPABILITIES,
  )
  assertDeeplyFrozen(CASE_INSERT_PRESET_ARTWORK_SLOT_PROVISIONING_CAPABILITIES)

  for (const [index, expected] of EXPECTED_CAPABILITIES.entries()) {
    const target = copyTarget(index)
    const before = structuredClone(target)
    const capability = getCaseInsertPresetArtworkSlotProvisioningCapability(
      target,
    )

    assert.deepEqual(capability, expected)
    assert.equal(
      capability,
      CASE_INSERT_PRESET_ARTWORK_SLOT_PROVISIONING_CAPABILITIES[index],
    )
    assert.deepEqual(target, before)
    assertDeeplyFrozen(capability)
  }
})

test('creates canonical empty disabled slots without placement or viewport adoption', () => {
  for (const [index, expected] of EXPECTED_CAPABILITIES.entries()) {
    const target = copyTarget(index)
    const before = structuredClone(target)
    const result = createCaseInsertPresetEmptyArtworkSlot(target)

    assert.equal(result.ok, true)
    if (!result.ok) assert.fail(`Expected target ${index + 1} to be supported.`)
    assert.equal(result.status, 'created-canonical-empty-slot')
    assert.equal(
      result.capability,
      CASE_INSERT_PRESET_ARTWORK_SLOT_PROVISIONING_CAPABILITIES[index],
    )
    assert.deepEqual(result.slot, {
      id: expected.target.object.id,
      label: expected.canonicalLabel,
      enabled: false,
      imageDataUrl: null,
      imageSource: null,
      imageSize: null,
      defaultSteamLogo: null,
      fit: 'contain',
      layout: {
        scale: 1,
        x: 0,
        y: 0,
        rotation: 0,
      },
      frame: {
        enabled: false,
        color: '#f9fafb',
        width: 2,
        shape: 'rectangle',
        style: 'solid',
        lumpiness: 50,
        jaggedness: 50,
        roughnessOffset: 0,
      },
    })
    assert.equal(Object.hasOwn(result.slot, 'reservedArtworkViewport'), false)
    assert.equal(Object.hasOwn(result.slot.layout, 'width'), false)
    assert.equal(Object.hasOwn(result.slot.layout, 'fontSizePt'), false)
    assert.deepEqual(target, before)
    assertDeeplyFrozen(result)
  }
})

test('rejects every hostile identity variant outside the exact capability table', () => {
  type HostileCase = Readonly<{
    name: string
    mutate: (target: Record<string, unknown>) => void
  }>
  const hostileCases: readonly HostileCase[] = [
    {
      name: 'wrong preset',
      mutate: (target) => { target.presetId = 'builtin:case-preset:other' },
    },
    {
      name: 'wrong preset revision',
      mutate: (target) => { target.presetRevision = 1 },
    },
    {
      name: 'wrong template',
      mutate: (target) => { target.templateId = 'dvdCase' },
    },
    {
      name: 'wrong template revision',
      mutate: (target) => { target.templateRevision = 1 },
    },
    {
      name: 'wrong slot',
      mutate: (target) => {
        target.slotId = 'case:preset-slot:other-screenshots'
      },
    },
    {
      name: 'wrong assignment',
      mutate: (target) => {
        target.assignmentId = 'case:preset-assignment:back-screenshot-other'
      },
    },
    {
      name: 'wrong role',
      mutate: (target) => { target.roleId = 'additional-artwork' },
    },
    {
      name: 'wrong region',
      mutate: (target) => { target.region = 'front' },
    },
    {
      name: 'wrong coordinate basis',
      mutate: (target) => { target.coordinateBasis = 'backPanel' },
    },
    {
      name: 'wrong owner',
      mutate: (target) => { target.ownerId = 'case.cover.artwork-slots' },
    },
    {
      name: 'fixed object',
      mutate: (target) => {
        target.object = { kind: 'fixed', id: 'tray-artwork-1' }
      },
    },
    {
      name: 'wrong repeated object id',
      mutate: (target) => {
        target.object = { kind: 'repeated', id: 'tray-artwork-4' }
      },
    },
  ]

  for (const hostile of hostileCases) {
    const target = copyTarget() as unknown as Record<string, unknown>
    hostile.mutate(target)
    const before = structuredClone(target)
    const typedTarget = target as unknown as
      CaseInsertPresetArtworkSlotProvisioningTarget

    assert.equal(
      getCaseInsertPresetArtworkSlotProvisioningCapability(typedTarget),
      null,
      hostile.name,
    )
    const result = createCaseInsertPresetEmptyArtworkSlot(typedTarget)
    assert.deepEqual(result, {
      ok: false,
      status: 'unsupported-target',
      code: 'preset-artwork-slot-creation-target-unsupported',
    }, hostile.name)
    assert.deepEqual(target, before, hostile.name)
    assertDeeplyFrozen(result)
  }
})

test('creation is deterministic, returns fresh slot objects, and never mutates input', () => {
  for (let index = 0; index < EXPECTED_CAPABILITIES.length; index += 1) {
    const target = copyTarget(index)
    const before = structuredClone(target)
    const first = createCaseInsertPresetEmptyArtworkSlot(target)
    const second = createCaseInsertPresetEmptyArtworkSlot(target)

    assert.deepEqual(first, second)
    assert.notEqual(first, second)
    assert.equal(first.ok, true)
    assert.equal(second.ok, true)
    if (!first.ok || !second.ok) assert.fail('Expected supported targets.')
    assert.notEqual(first.slot, second.slot)
    assert.notEqual(first.slot.layout, second.slot.layout)
    assert.notEqual(first.slot.frame, second.slot.frame)
    assert.deepEqual(target, before)
    assertDeeplyFrozen(first)
    assertDeeplyFrozen(second)
  }
})

test('batch provisioning preserves custom order and appends exact targets in slot-number order', () => {
  const canonical = createCaseInsertPresetEmptyArtworkSlot(copyTarget())
  assert.equal(canonical.ok, true)
  if (!canonical.ok) assert.fail('Expected supported target.')
  const customA = structuredClone(canonical.slot)
  customA.id = 'custom-z'
  customA.label = 'Custom Z'
  const customB = structuredClone(canonical.slot)
  customB.id = 'custom-a'
  customB.label = 'Custom A'
  const duplicateOutsideFootprint = structuredClone(customA)
  const current = [customA, customB, duplicateOutsideFootprint]
  const before = structuredClone(current)

  const result = provisionCaseInsertPresetEmptyArtworkSlots(
    current,
    [copyTarget(2), copyTarget(0), copyTarget(1)],
  )

  assert.equal(result.ok, true)
  if (!result.ok) assert.fail(`${result.status}:${result.code}`)
  assert.deepEqual(result.createdObjectIds, [
    'tray-artwork-1',
    'tray-artwork-2',
    'tray-artwork-3',
  ])
  assert.deepEqual(result.slots.map(({ id }) => id), [
    'custom-z',
    'custom-a',
    'custom-z',
    'tray-artwork-1',
    'tray-artwork-2',
    'tray-artwork-3',
  ])
  assert.deepEqual(current, before)
  assert.equal(result.slots[0], current[0])
  assert.equal(result.slots[1], current[1])
  assert.equal(result.slots[2], current[2])
  assert.equal(Object.isFrozen(result), true)
  assert.equal(Object.isFrozen(result.slots), true)
  assert.equal(Object.isFrozen(result.createdObjectIds), true)
  for (const slot of result.slots.slice(current.length)) {
    assertDeeplyFrozen(slot)
  }
})

test('batch provisioning validates every reviewed target before returning a successor', () => {
  const duplicateRequest = provisionCaseInsertPresetEmptyArtworkSlots(
    [],
    [copyTarget(), copyTarget()],
  )
  assert.deepEqual(duplicateRequest, {
    ok: false,
    status: 'duplicate-requested-object-id',
    code: 'preset-artwork-slot-creation-request-duplicate',
    objectId: 'tray-artwork-1',
  })

  const existing = createCaseInsertPresetEmptyArtworkSlot(copyTarget())
  assert.equal(existing.ok, true)
  if (!existing.ok) assert.fail('Expected supported target.')
  const exactDuplicate = provisionCaseInsertPresetEmptyArtworkSlots(
    [existing.slot, structuredClone(existing.slot)],
    [copyTarget()],
  )
  assert.deepEqual(exactDuplicate, {
    ok: false,
    status: 'duplicate-existing-object-id',
    code: 'preset-artwork-slot-existing-id-ambiguous',
    objectId: 'tray-artwork-1',
  })

  const invalid = copyTarget(1) as unknown as Record<string, unknown>
  invalid.ownerId = 'case.cover.artwork-slots'
  const current = [structuredClone(existing.slot)]
  current[0]!.id = 'custom-existing'
  const before = structuredClone(current)
  const rejected = provisionCaseInsertPresetEmptyArtworkSlots(
    current,
    [copyTarget(0), invalid as unknown as CaseInsertPresetArtworkSlotProvisioningTarget],
  )
  assert.deepEqual(rejected, {
    ok: false,
    status: 'unsupported-target',
    code: 'preset-artwork-slot-creation-target-unsupported',
  })
  assert.deepEqual(current, before)
})
