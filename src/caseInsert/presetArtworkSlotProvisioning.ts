import { createRepeatedArtworkLabel } from '../editor/repeatedArtwork.ts'
import type { ProjectCaseInsertImageSlot } from '../project/projectTypes.ts'
import type {
  CaseInsertPresetConcreteRegionId,
  CaseInsertPresetCoordinateBasis,
  CaseInsertPresetId,
  CaseInsertPresetOwnerId,
  CaseInsertPresetRoleId,
} from '../presets/caseInsertPresetDefinition.ts'
import { createDefaultCaseInsertImageSlot } from './defaults.ts'

export const CASE_INSERT_PRESET_EMPTY_ARTWORK_SLOT_INSERTION_POLICY =
  'append-preserve-existing-order' as const

export type CaseInsertPresetProvisionableArtworkObjectId =
  | 'tray-artwork-1'
  | 'tray-artwork-2'
  | 'tray-artwork-3'

export type CaseInsertPresetArtworkSlotProvisioningTarget = Readonly<{
  presetId: CaseInsertPresetId
  presetRevision: number
  templateId: string
  templateRevision: number | null
  slotId: `case:preset-slot:${string}`
  assignmentId: `case:preset-assignment:${string}`
  roleId: CaseInsertPresetRoleId
  region: CaseInsertPresetConcreteRegionId
  coordinateBasis: CaseInsertPresetCoordinateBasis
  ownerId: CaseInsertPresetOwnerId
  object: Readonly<{
    kind: 'fixed' | 'repeated'
    id: string
  }>
}>

export type CaseInsertPresetArtworkSlotProvisioningCapability = Readonly<{
  target: Readonly<{
    presetId: 'builtin:case-preset:jewel-case-essentials'
    presetRevision: 2
    templateId: 'jewelCase'
    templateRevision: null
    slotId: 'case:preset-slot:back-screenshots'
    assignmentId:
      | 'case:preset-assignment:back-screenshot-one'
      | 'case:preset-assignment:back-screenshot-two'
      | 'case:preset-assignment:back-screenshot-three'
    roleId: 'screenshots'
    region: 'back-panel'
    coordinateBasis: 'backPanelSafe'
    ownerId: 'case.tray.artwork-slots'
    object: Readonly<{
      kind: 'repeated'
      id: CaseInsertPresetProvisionableArtworkObjectId
    }>
  }>
  slotNumber: 1 | 2 | 3
  canonicalLabel: `Artwork ${1 | 2 | 3}`
  reviewLabel: `Screenshot ${1 | 2 | 3}`
  insertionPolicy:
    typeof CASE_INSERT_PRESET_EMPTY_ARTWORK_SLOT_INSERTION_POLICY
}>

export type CreateCaseInsertPresetEmptyArtworkSlotResult =
  | Readonly<{
      ok: true
      status: 'created-canonical-empty-slot'
      capability: CaseInsertPresetArtworkSlotProvisioningCapability
      slot: Readonly<ProjectCaseInsertImageSlot>
    }>
  | Readonly<{
      ok: false
      status: 'unsupported-target'
      code: 'preset-artwork-slot-creation-target-unsupported'
    }>

export type ProvisionCaseInsertPresetEmptyArtworkSlotsResult =
  | Readonly<{
      ok: true
      status: 'provisioned'
      slots: readonly Readonly<ProjectCaseInsertImageSlot>[]
      createdObjectIds:
        readonly CaseInsertPresetProvisionableArtworkObjectId[]
    }>
  | Readonly<{
      ok: false
      status:
        | 'unsupported-target'
        | 'duplicate-existing-object-id'
        | 'target-already-present'
        | 'duplicate-requested-object-id'
      code:
        | 'preset-artwork-slot-creation-target-unsupported'
        | 'preset-artwork-slot-existing-id-ambiguous'
        | 'preset-artwork-slot-target-already-present'
        | 'preset-artwork-slot-creation-request-duplicate'
      objectId?: string
    }>

const COMMON_TARGET = Object.freeze({
  presetId: 'builtin:case-preset:jewel-case-essentials' as const,
  presetRevision: 2 as const,
  templateId: 'jewelCase' as const,
  templateRevision: null,
  slotId: 'case:preset-slot:back-screenshots' as const,
  roleId: 'screenshots' as const,
  region: 'back-panel' as const,
  coordinateBasis: 'backPanelSafe' as const,
  ownerId: 'case.tray.artwork-slots' as const,
})

function capability(
  slotNumber: 1 | 2 | 3,
  ordinal: 'one' | 'two' | 'three',
): CaseInsertPresetArtworkSlotProvisioningCapability {
  const objectId = `tray-artwork-${slotNumber}` as
    CaseInsertPresetProvisionableArtworkObjectId
  return Object.freeze({
    target: Object.freeze({
      ...COMMON_TARGET,
      assignmentId:
        `case:preset-assignment:back-screenshot-${ordinal}` as const,
      object: Object.freeze({ kind: 'repeated' as const, id: objectId }),
    }),
    slotNumber,
    canonicalLabel: createRepeatedArtworkLabel(slotNumber) as
      `Artwork ${1 | 2 | 3}`,
    reviewLabel: `Screenshot ${slotNumber}` as `Screenshot ${1 | 2 | 3}`,
    insertionPolicy: CASE_INSERT_PRESET_EMPTY_ARTWORK_SLOT_INSERTION_POLICY,
  })
}

export const CASE_INSERT_PRESET_ARTWORK_SLOT_PROVISIONING_CAPABILITIES =
  Object.freeze([
    capability(1, 'one'),
    capability(2, 'two'),
    capability(3, 'three'),
  ] as const)

function targetMatches(
  actual: CaseInsertPresetArtworkSlotProvisioningTarget,
  expected: CaseInsertPresetArtworkSlotProvisioningCapability['target'],
) {
  return actual.presetId === expected.presetId &&
    actual.presetRevision === expected.presetRevision &&
    actual.templateId === expected.templateId &&
    actual.templateRevision === expected.templateRevision &&
    actual.slotId === expected.slotId &&
    actual.assignmentId === expected.assignmentId &&
    actual.roleId === expected.roleId &&
    actual.region === expected.region &&
    actual.coordinateBasis === expected.coordinateBasis &&
    actual.ownerId === expected.ownerId &&
    actual.object.kind === expected.object.kind &&
    actual.object.id === expected.object.id
}

export function getCaseInsertPresetArtworkSlotProvisioningCapability(
  target: CaseInsertPresetArtworkSlotProvisioningTarget,
): CaseInsertPresetArtworkSlotProvisioningCapability | null {
  return CASE_INSERT_PRESET_ARTWORK_SLOT_PROVISIONING_CAPABILITIES.find(
    (entry) => targetMatches(target, entry.target),
  ) ?? null
}

/**
 * The sole current factory boundary for definition-declared preset slot
 * provisioning. It authorizes three exact Jewel Case Essentials revision-2
 * targets and delegates their initial object shape to the ordinary Case
 * repeated-artwork factory. Placement and reserved viewport ownership are
 * intentionally applied later from validated viewport evidence.
 */
export function createCaseInsertPresetEmptyArtworkSlot(
  target: CaseInsertPresetArtworkSlotProvisioningTarget,
): CreateCaseInsertPresetEmptyArtworkSlotResult {
  const matched = getCaseInsertPresetArtworkSlotProvisioningCapability(target)
  if (!matched) {
    return Object.freeze({
      ok: false,
      status: 'unsupported-target',
      code: 'preset-artwork-slot-creation-target-unsupported',
    })
  }

  const created = createDefaultCaseInsertImageSlot(
    matched.target.object.id,
    matched.canonicalLabel,
  )
  const slot: ProjectCaseInsertImageSlot = {
    ...created,
    layout: { ...created.layout },
    frame: { ...created.frame },
  }
  Object.freeze(slot.layout)
  Object.freeze(slot.frame)
  Object.freeze(slot)
  return Object.freeze({
    ok: true,
    status: 'created-canonical-empty-slot',
    capability: matched,
    slot,
  })
}

/**
 * Pure atomic membership transition for reviewed preset-created artwork slots.
 * Every request is validated before any successor array is built. Existing
 * order is retained and new objects are appended in the canonical capability
 * order, independent of caller request order.
 */
export function provisionCaseInsertPresetEmptyArtworkSlots(
  currentSlots: readonly Readonly<ProjectCaseInsertImageSlot>[],
  requestedTargets: readonly CaseInsertPresetArtworkSlotProvisioningTarget[],
): ProvisionCaseInsertPresetEmptyArtworkSlotsResult {
  const existingCounts = new Map<string, number>()
  for (const slot of currentSlots) {
    existingCounts.set(slot.id, (existingCounts.get(slot.id) ?? 0) + 1)
  }
  const requested = new Map<
    CaseInsertPresetProvisionableArtworkObjectId,
    CaseInsertPresetArtworkSlotProvisioningCapability
  >()
  for (const target of requestedTargets) {
    const matched = getCaseInsertPresetArtworkSlotProvisioningCapability(target)
    if (!matched) {
      return Object.freeze({
        ok: false,
        status: 'unsupported-target',
        code: 'preset-artwork-slot-creation-target-unsupported',
      })
    }
    const objectId = matched.target.object.id
    if (requested.has(objectId)) {
      return Object.freeze({
        ok: false,
        status: 'duplicate-requested-object-id',
        code: 'preset-artwork-slot-creation-request-duplicate',
        objectId,
      })
    }
    const existingCount = existingCounts.get(objectId) ?? 0
    if (existingCount > 1) {
      return Object.freeze({
        ok: false,
        status: 'duplicate-existing-object-id',
        code: 'preset-artwork-slot-existing-id-ambiguous',
        objectId,
      })
    }
    if (existingCount === 1) {
      return Object.freeze({
        ok: false,
        status: 'target-already-present',
        code: 'preset-artwork-slot-target-already-present',
        objectId,
      })
    }
    requested.set(objectId, matched)
  }

  const ordered = CASE_INSERT_PRESET_ARTWORK_SLOT_PROVISIONING_CAPABILITIES
    .filter(({ target }) => requested.has(target.object.id))
  const created: Readonly<ProjectCaseInsertImageSlot>[] = []
  for (const matched of ordered) {
    const result = createCaseInsertPresetEmptyArtworkSlot(matched.target)
    if (!result.ok) {
      return Object.freeze({
        ok: false,
        status: 'unsupported-target',
        code: result.code,
      })
    }
    created.push(result.slot)
  }
  const slots = [...currentSlots, ...created]
  Object.freeze(slots)
  const createdObjectIds = ordered.map(({ target }) => target.object.id)
  Object.freeze(createdObjectIds)
  return Object.freeze({
    ok: true,
    status: 'provisioned',
    slots,
    createdObjectIds,
  })
}
