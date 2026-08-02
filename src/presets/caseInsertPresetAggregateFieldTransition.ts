import {
  resolveCaseInsertPresetAggregateBinding,
} from '../caseInsert/presetAssignmentSnapshot.ts'
import { normalizeProjectJewelCaseState } from '../caseInsert/normalization.ts'
import type {
  ProjectCaseInsertImageSlot,
  ProjectCaseInsertTextBlock,
  ProjectCaseInsertTextList,
  ProjectJewelCaseState,
} from '../project/projectTypes.ts'
import type { CaseInsertPresetOwnerId } from './caseInsertPresetDefinition.ts'
import {
  getCaseInsertPresetPlanOwnerRule,
  type CaseInsertPresetPlanFieldAction,
  type CaseInsertPresetPlanFieldId,
} from './caseInsertPresetApplyPlanning.ts'

type MutablePresetObject =
  | ProjectCaseInsertImageSlot
  | ProjectCaseInsertTextBlock
  | ProjectCaseInsertTextList

export type CaseInsertPresetAggregateLayoutWrite = Readonly<{
  id: string
  kind: CaseInsertPresetPlanFieldAction['kind']
  featureOwnerId: CaseInsertPresetOwnerId
  bindingKind: 'fixed' | 'repeated'
  bindingId: string
  runtimeObjectId: string
  fieldId: CaseInsertPresetPlanFieldId
  currentValuePrecondition: number | null
  proposedValue: number
}>

export type CaseInsertPresetAggregateFieldTransitionResult =
  | Readonly<{
      ok: true
      changed: boolean
      aggregate: Readonly<ProjectJewelCaseState>
    }>
  | Readonly<{
      ok: false
      status:
        | 'invalid-aggregate'
        | 'unsupported-action'
        | 'unsupported-owned-field'
        | 'invalid-current-value'
        | 'target-missing'
        | 'target-ambiguous'
        | 'transition-conflict'
      code: string
      writeId?: string
    }>

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function cloneMutable<T>(value: T): T {
  if (value === null || typeof value !== 'object') return value
  if (Array.isArray(value)) return value.map(cloneMutable) as T
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .map(([key, child]) => [key, cloneMutable(child)]),
  ) as T
}

function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== 'object') return value
  for (const child of Object.values(value as Record<string, unknown>)) {
    deepFreeze(child)
  }
  return Object.freeze(value)
}

function sameValue(left: unknown, right: unknown): boolean {
  if (left === right) return true
  if (Array.isArray(left) || Array.isArray(right)) {
    return Array.isArray(left) && Array.isArray(right) &&
      left.length === right.length &&
      left.every((value, index) => sameValue(value, right[index]))
  }
  if (!isRecord(left) || !isRecord(right)) return false
  const leftKeys = Object.keys(left)
  const rightKeys = Object.keys(right)
  return leftKeys.length === rightKeys.length && leftKeys.every((key) =>
    Object.prototype.hasOwnProperty.call(right, key) &&
    sameValue(left[key], right[key]))
}

function failure(
  status: Extract<
    CaseInsertPresetAggregateFieldTransitionResult,
    { ok: false }
  >['status'],
  code: string,
  writeId?: string,
): CaseInsertPresetAggregateFieldTransitionResult {
  return Object.freeze({
    ok: false,
    status,
    code,
    ...(writeId ? { writeId } : {}),
  })
}

function actionMatchesField(write: CaseInsertPresetAggregateLayoutWrite) {
  return (write.kind === 'set-layout-x' && write.fieldId === 'layout-x') ||
    (write.kind === 'set-layout-y' && write.fieldId === 'layout-y') ||
    (write.kind === 'set-layout-scale' && write.fieldId === 'layout-scale') ||
    (write.kind === 'set-layout-width' && write.fieldId === 'layout-width')
}

function ownerAllowsField(
  ownerId: CaseInsertPresetOwnerId,
  fieldId: CaseInsertPresetPlanFieldId,
) {
  const rule = getCaseInsertPresetPlanOwnerRule(ownerId)
  if (!rule) return false
  return rule.fieldMode === 'background' || rule.fieldMode === 'image'
    ? fieldId === 'layout-x' || fieldId === 'layout-y' ||
      fieldId === 'layout-scale'
    : fieldId === 'layout-x' || fieldId === 'layout-y' ||
      fieldId === 'layout-width'
}

function currentFieldValue(
  target: MutablePresetObject,
  fieldId: CaseInsertPresetPlanFieldId,
) {
  switch (fieldId) {
    case 'layout-x': return target.layout.x
    case 'layout-y': return target.layout.y
    case 'layout-scale': return target.layout.scale
    case 'layout-width': return target.layout.width ?? null
  }
}

function writeField(
  target: MutablePresetObject,
  write: CaseInsertPresetAggregateLayoutWrite,
) {
  switch (write.kind) {
    case 'set-layout-x': target.layout.x = write.proposedValue; return
    case 'set-layout-y': target.layout.y = write.proposedValue; return
    case 'set-layout-scale': target.layout.scale = write.proposedValue; return
    case 'set-layout-width': target.layout.width = write.proposedValue; return
  }
}

function getMutableOwnerItems(
  aggregate: ProjectJewelCaseState,
  ownerId: CaseInsertPresetOwnerId,
): MutablePresetObject[] {
  const { cover, tray } = aggregate.templates
  const { left, right } = aggregate.spine
  switch (ownerId) {
    case 'case.cover.background': return [cover.background]
    case 'case.cover.title-artwork': return [cover.titleArtwork]
    case 'case.cover.text-blocks': return cover.textBlocks
    case 'case.cover.artwork-slots': return cover.artworkSlots
    case 'case.cover.logo-slots': return cover.logoSlots
    case 'case.cover.mark-slots': return cover.markSlots
    case 'case.tray.background': return [tray.background]
    case 'case.tray.title-artwork': return [tray.titleArtwork]
    case 'case.tray.text-blocks': return tray.textBlocks
    case 'case.tray.text-lists': return tray.textLists
    case 'case.tray.artwork-slots': return tray.artworkSlots
    case 'case.tray.logo-slots': return tray.logoSlots
    case 'case.tray.mark-slots': return tray.markSlots
    case 'case.spine.left.background': return [left.background]
    case 'case.spine.left.title-artwork': return [left.titleArtwork]
    case 'case.spine.left.title-text': return [left.title]
    case 'case.spine.left.text-blocks': return left.textBlocks
    case 'case.spine.left.logo-slots': return left.logoSlots
    case 'case.spine.left.mark-slots': return left.markSlots
    case 'case.spine.right.background': return [right.background]
    case 'case.spine.right.title-artwork': return [right.titleArtwork]
    case 'case.spine.right.title-text': return [right.title]
    case 'case.spine.right.text-blocks': return right.textBlocks
    case 'case.spine.right.logo-slots': return right.logoSlots
    case 'case.spine.right.mark-slots': return right.markSlots
  }
}

function addressKey(write: CaseInsertPresetAggregateLayoutWrite) {
  return [
    write.featureOwnerId,
    write.bindingKind,
    write.bindingId,
    write.runtimeObjectId,
    write.fieldId,
  ].join('\u0000')
}

export function applyCaseInsertPresetAggregateLayoutWrites(
  aggregate: ProjectJewelCaseState,
  writes: readonly CaseInsertPresetAggregateLayoutWrite[],
): CaseInsertPresetAggregateFieldTransitionResult {
  let normalized: ProjectJewelCaseState
  try {
    normalized = normalizeProjectJewelCaseState(aggregate)
  } catch {
    return failure('invalid-aggregate', 'aggregate-normalization-failed')
  }
  if (!sameValue(aggregate, normalized)) {
    return failure('invalid-aggregate', 'aggregate-not-normalized')
  }
  if (!Array.isArray(writes)) {
    return failure('unsupported-action', 'writes-invalid')
  }

  const addresses = new Set<string>()
  for (const write of writes) {
    if (!write || typeof write.id !== 'string' || write.id.length === 0 ||
        !actionMatchesField(write)) {
      return failure('unsupported-action', 'write-action-invalid', write?.id)
    }
    if (!ownerAllowsField(write.featureOwnerId, write.fieldId)) {
      return failure(
        'unsupported-owned-field',
        'write-owner-field-unsupported',
        write.id,
      )
    }
    if ((write.currentValuePrecondition !== null &&
          !Number.isFinite(write.currentValuePrecondition)) ||
        (write.currentValuePrecondition === null &&
          write.fieldId !== 'layout-width') ||
        !Number.isFinite(write.proposedValue) ||
        ((write.fieldId === 'layout-scale' ||
          write.fieldId === 'layout-width') && write.proposedValue <= 0)) {
      return failure('invalid-current-value', 'write-value-invalid', write.id)
    }
    const key = addressKey(write)
    if (addresses.has(key)) {
      return failure('transition-conflict', 'write-address-duplicate', write.id)
    }
    addresses.add(key)

    const binding = resolveCaseInsertPresetAggregateBinding(
      normalized,
      write.featureOwnerId,
      { kind: write.bindingKind, id: write.bindingId },
    )
    if (binding.status === 'missing') {
      return failure('target-missing', 'write-target-missing', write.id)
    }
    if (binding.status === 'ambiguous') {
      return failure('target-ambiguous', 'write-target-ambiguous', write.id)
    }
    if (binding.status !== 'found' ||
        binding.currentState.id !== write.runtimeObjectId) {
      return failure('target-missing', 'write-target-address-mismatch', write.id)
    }
    const value = currentFieldValue(
      binding.currentState as MutablePresetObject,
      write.fieldId,
    )
    if (value !== write.currentValuePrecondition) {
      return failure(
        'transition-conflict',
        'write-current-value-precondition-failed',
        write.id,
      )
    }
  }

  const draft = cloneMutable(normalized)
  for (const write of writes) {
    const matches = getMutableOwnerItems(draft, write.featureOwnerId)
      .filter(({ id }) => id === write.runtimeObjectId)
    if (matches.length !== 1) {
      return failure(
        matches.length > 1 ? 'target-ambiguous' : 'target-missing',
        'draft-target-unavailable',
        write.id,
      )
    }
    writeField(matches[0]!, write)
  }

  let normalizedResult: ProjectJewelCaseState
  try {
    normalizedResult = normalizeProjectJewelCaseState(draft)
  } catch {
    return failure('transition-conflict', 'result-normalization-failed')
  }
  if (!sameValue(draft, normalizedResult)) {
    return failure('transition-conflict', 'result-not-canonically-normalized')
  }
  for (const write of writes) {
    const binding = resolveCaseInsertPresetAggregateBinding(
      normalizedResult,
      write.featureOwnerId,
      { kind: write.bindingKind, id: write.bindingId },
    )
    if (binding.status !== 'found' ||
        binding.currentState.id !== write.runtimeObjectId ||
        currentFieldValue(
          binding.currentState as MutablePresetObject,
          write.fieldId,
        ) !== write.proposedValue) {
      return failure(
        'transition-conflict',
        'result-verification-failed',
        write.id,
      )
    }
  }

  return deepFreeze({
    ok: true,
    changed: !sameValue(normalized, normalizedResult),
    aggregate: cloneMutable(normalizedResult),
  })
}
