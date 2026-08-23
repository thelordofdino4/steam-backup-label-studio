import {
  adoptCaseInsertArtworkViewport,
} from '../caseInsert/artworkViewportAdoption.ts'
import {
  createCaseInsertPresetEmptyArtworkSlot,
  getCaseInsertPresetArtworkSlotProvisioningCapability,
  provisionCaseInsertPresetEmptyArtworkSlots,
} from '../caseInsert/presetArtworkSlotProvisioning.ts'
import type {
  ProjectCaseInsertImageSlot,
  ProjectJewelCaseState,
} from '../project/projectTypes.ts'
import type {
  CaseInsertPresetPlanArtworkViewportAction,
  CaseInsertPresetPlanArtworkViewportOwnedValues,
  CaseInsertPresetPlanObjectCreationAction,
} from './caseInsertPresetApplyPlanning.ts'
import {
  createCaseInsertPresetArtworkViewportSourceEvidence,
} from './caseInsertPresetArtworkViewportSource.ts'
import {
  deepFreezeCaseInsertPresetValue,
  sameCaseInsertPresetValue,
} from './caseInsertPresetSafeInput.ts'

export type CaseInsertPresetArtworkActionTransitionResult =
  | Readonly<{
      ok: true
      status: 'transitioned' | 'semantic-no-op'
      aggregate: Readonly<ProjectJewelCaseState>
      createdObjectIds: readonly string[]
    }>
  | Readonly<{
      ok: false
      status:
        | 'invalid-action'
        | 'target-missing'
        | 'target-ambiguous'
        | 'precondition-failed'
        | 'unsupported-action'
      code: string
      actionId?: string
    }>

function cloneMutable<T>(value: T): T {
  if (value === null || typeof value !== 'object') return value
  if (Array.isArray(value)) {
    return value.map((item) => cloneMutable(item)) as T
  }
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .map(([key, child]) => [key, cloneMutable(child)]),
  ) as T
}

function failure(
  status: Extract<
    CaseInsertPresetArtworkActionTransitionResult,
    Readonly<{ ok: false }>
  >['status'],
  code: string,
  actionId?: string,
): CaseInsertPresetArtworkActionTransitionResult {
  return Object.freeze({
    ok: false,
    status,
    code,
    ...(actionId ? { actionId } : {}),
  })
}

function ownedValues(
  slot: Readonly<ProjectCaseInsertImageSlot>,
): CaseInsertPresetPlanArtworkViewportOwnedValues {
  return {
    layoutX: slot.layout.x,
    layoutY: slot.layout.y,
    layoutScale: slot.layout.scale,
    imageFit: slot.fit,
    reservedArtworkViewport: slot.reservedArtworkViewport
      ? {
          ...slot.reservedArtworkViewport,
          focalPosition: { ...slot.reservedArtworkViewport.focalPosition },
        }
      : null,
  }
}

function provisioningTarget(
  aggregate: Readonly<ProjectJewelCaseState>,
  action: CaseInsertPresetPlanObjectCreationAction,
) {
  return {
    presetId: action.source.presetId,
    presetRevision: action.source.presetRevision,
    templateId: aggregate.templateType,
    templateRevision: null,
    slotId: action.source.slotId,
    assignmentId: action.source.assignmentId,
    roleId: action.source.roleId,
    region: action.source.region,
    coordinateBasis: action.source.coordinateBasis,
    ownerId: action.source.ownerId,
    object: {
      kind: action.source.object.bindingKind,
      id: action.source.object.bindingId,
    },
  }
}

/**
 * The shared pure executor for reviewed repeated-artwork creation and reserved
 * viewport adoption. Callers choose the already-reviewed action subset (for
 * example Reapply overwrite versus preserve); this owner validates every
 * membership and viewport precondition before returning one successor.
 */
export function applyCaseInsertPresetReviewedArtworkActions(input: Readonly<{
  aggregate: Readonly<ProjectJewelCaseState>
  objectCreationActions:
    readonly CaseInsertPresetPlanObjectCreationAction[]
  artworkViewportActions:
    readonly (CaseInsertPresetPlanArtworkViewportAction & Readonly<{
      writeOwnedFieldIds?:
        readonly CaseInsertPresetPlanArtworkViewportAction['ownedFieldIds'][number][]
    }>)[]
}>): CaseInsertPresetArtworkActionTransitionResult {
  const creationIds = new Set(
    input.objectCreationActions.map(({ viewportActionId }) => viewportActionId),
  )
  if (creationIds.size !== input.objectCreationActions.length ||
      input.artworkViewportActions.some((action) =>
        (action.targetOrigin === 'planned-creation') !==
          creationIds.has(action.id)) ||
      input.objectCreationActions.some((action) =>
        !input.artworkViewportActions.some(
          ({ id }) => id === action.viewportActionId,
        ))) {
    return failure(
      'invalid-action',
      'preset-artwork-action-linkage-invalid',
    )
  }

  const creationTargets = []
  for (const action of input.objectCreationActions) {
    const target = provisioningTarget(input.aggregate, action)
    const capability =
      getCaseInsertPresetArtworkSlotProvisioningCapability(target)
    const canonical = capability
      ? createCaseInsertPresetEmptyArtworkSlot(capability.target)
      : null
    if (!capability || action.kind !== 'create-empty-repeated-artwork-slot' ||
        !canonical?.ok || !sameCaseInsertPresetValue(
          canonical.slot,
          action.canonicalInitialObject,
        ) ||
        action.target.featureOwnerId !== capability.target.ownerId ||
        action.target.bindingKind !== capability.target.object.kind ||
        action.target.bindingId !== capability.target.object.id ||
        action.target.runtimeObjectId !== capability.target.object.id ||
        action.before.presence !== 'absent' ||
        action.before.exactMatchCount !== 0 ||
        action.insertionPolicy !== capability.insertionPolicy ||
        action.source.declaredPolicy !==
          'create-empty-repeated-artwork-slot-v1') {
      return failure(
        'invalid-action',
        'preset-artwork-creation-action-invalid',
        action.id,
      )
    }
    creationTargets.push(target)
  }

  const provisioned = provisionCaseInsertPresetEmptyArtworkSlots(
    input.aggregate.templates.tray.artworkSlots,
    creationTargets,
  )
  if (!provisioned.ok) {
    return failure(
      provisioned.status === 'duplicate-existing-object-id'
        ? 'target-ambiguous'
        : provisioned.status === 'target-already-present'
          ? 'precondition-failed'
          : 'invalid-action',
      provisioned.code,
    )
  }

  const slots = [...provisioned.slots]
  for (const action of input.artworkViewportActions) {
    const matches = slots
      .map((slot, index) => ({ slot, index }))
      .filter(({ slot }) => slot.id === action.target.runtimeObjectId)
    if (matches.length === 0) {
      return failure(
        'target-missing',
        'preset-artwork-viewport-target-missing',
        action.id,
      )
    }
    if (matches.length > 1) {
      return failure(
        'target-ambiguous',
        'preset-artwork-viewport-target-ambiguous',
        action.id,
      )
    }
    const { slot, index } = matches[0]!
    const evidence = createCaseInsertPresetArtworkViewportSourceEvidence(slot)
    if (!evidence.ok || !sameCaseInsertPresetValue(
      evidence.ok ? evidence.sourceState : null,
      action.sourceState,
    )) {
      return failure(
        'precondition-failed',
        'preset-artwork-viewport-source-changed',
        action.id,
      )
    }
    const expectedCurrent = action.targetOrigin === 'planned-creation'
      ? null
      : ownedValues(slot)
    if (!sameCaseInsertPresetValue(expectedCurrent, action.currentValues)) {
      return failure(
        'precondition-failed',
        'preset-artwork-viewport-current-values-changed',
        action.id,
      )
    }
    const adopted = adoptCaseInsertArtworkViewport({
      slot,
      target: {
        templateId: input.aggregate.templateType,
        templateRevision: null,
        presetId: action.source.presetId,
        presetRevision: action.source.presetRevision,
        slotId: action.source.slotId,
        assignmentId: action.source.assignmentId,
        ownerId: action.target.featureOwnerId,
        objectId: action.target.runtimeObjectId,
        coordinateBasis: action.source.coordinateBasis,
      },
      evidence: action.evidence,
    })
    if (!adopted.ok) {
      return failure(
        'unsupported-action',
        `preset-artwork-viewport-adoption-${adopted.status}`,
        action.id,
      )
    }
    if (!sameCaseInsertPresetValue(
      ownedValues(adopted.slot),
      action.proposedValues,
    )) {
      return failure(
        'invalid-action',
        'preset-artwork-viewport-proposal-incoherent',
        action.id,
      )
    }
    const writeOwnedFieldIds = action.writeOwnedFieldIds ??
      action.ownedFieldIds
    if (writeOwnedFieldIds.some((fieldId) =>
      !action.ownedFieldIds.includes(fieldId)) ||
      new Set(writeOwnedFieldIds).size !== writeOwnedFieldIds.length) {
      return failure(
        'invalid-action',
        'preset-artwork-viewport-write-mask-invalid',
        action.id,
      )
    }
    const adoptedSlot = adopted.slot
    const nextSlot: ProjectCaseInsertImageSlot = {
      ...cloneMutable(slot),
      fit: writeOwnedFieldIds.includes('image-fit')
        ? adoptedSlot.fit
        : slot.fit,
      layout: {
        ...cloneMutable(slot.layout),
        x: writeOwnedFieldIds.includes('layout-x')
          ? adoptedSlot.layout.x
          : slot.layout.x,
        y: writeOwnedFieldIds.includes('layout-y')
          ? adoptedSlot.layout.y
          : slot.layout.y,
        scale: writeOwnedFieldIds.includes('layout-scale')
          ? adoptedSlot.layout.scale
          : slot.layout.scale,
      },
      ...(writeOwnedFieldIds.includes('reserved-artwork-viewport')
        ? {
            reservedArtworkViewport:
              cloneMutable(adoptedSlot.reservedArtworkViewport ?? null),
          }
        : Object.hasOwn(slot, 'reservedArtworkViewport')
          ? {
              reservedArtworkViewport:
                cloneMutable(slot.reservedArtworkViewport ?? null),
            }
          : {}),
    }
    slots[index] = nextSlot
  }

  const aggregate = cloneMutable(input.aggregate)
  aggregate.templates.tray.artworkSlots = slots.map(cloneMutable)
  const changed = provisioned.createdObjectIds.length > 0 ||
    !sameCaseInsertPresetValue(
      slots,
      input.aggregate.templates.tray.artworkSlots,
    )
  return deepFreezeCaseInsertPresetValue({
    ok: true,
    status: changed ? 'transitioned' : 'semantic-no-op',
    aggregate,
    createdObjectIds: [...provisioned.createdObjectIds],
  })
}
