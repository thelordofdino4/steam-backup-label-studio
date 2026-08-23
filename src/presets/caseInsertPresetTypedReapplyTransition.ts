import {
  resolveCaseInsertPresetAggregateBinding,
} from '../caseInsert/presetAssignmentSnapshot.ts'
import {
  validateCaseInsertPresetAggregateContent,
} from '../caseInsert/presetAggregateIdentity.ts'
import { normalizeProjectJewelCaseState } from '../caseInsert/normalization.ts'
import type { ProjectJewelCaseState } from '../project/projectTypes.ts'
import {
  getCaseInsertPresetApplicationScopeKey,
} from './caseInsertPresetDefinition.ts'
import {
  applyCaseInsertPresetAggregateLayoutWrites,
  type CaseInsertPresetAggregateLayoutWrite,
} from './caseInsertPresetAggregateFieldTransition.ts'
import {
  applyCaseInsertPresetReviewedArtworkActions,
} from './caseInsertPresetArtworkActionTransition.ts'
import type {
  CaseInsertPresetPlanArtworkViewportAction,
  CaseInsertPresetPlanSourceAssignment,
} from './caseInsertPresetApplyPlanning.ts'
import {
  CASE_INSERT_APPLIED_PRESET_CONFIGURATION_KIND,
  CASE_INSERT_PRESET_TYPED_CUSTOMIZATION_REPORT_VERSION,
  CASE_INSERT_VIEWPORT_APPLIED_PRESET_CONFIGURATION_VERSION,
  createCaseInsertAppliedPresetConfigurationIdentity,
  detectCaseInsertPresetCustomization,
  getCaseInsertPresetTypedOwnedFieldCurrentValue,
  isCaseInsertAppliedPresetOwnedValueForField,
  validateCaseInsertAppliedPresetConfiguration,
  validateCaseInsertPresetCustomizationReport,
  type CaseInsertAppliedPresetConfiguration,
  type CaseInsertAppliedPresetOwnedFieldAddressV3,
  type CaseInsertAppliedPresetOwnedValue,
  type CaseInsertPresetCustomizationReport,
  type CaseInsertPresetOwnedFieldObservation,
  type CaseInsertViewportAppliedPresetConfiguration,
} from './caseInsertPresetAppliedConfiguration.ts'
import {
  createCaseInsertPresetAttachedEndpoint,
} from './caseInsertPresetAttachmentEndpoint.ts'
import {
  createCaseInsertPresetDeterministicIdentityDigest,
} from './caseInsertPresetDeterministicIdentity.ts'
import {
  createCaseInsertPresetReapplyConsentAcceptanceIdentity,
  createCaseInsertPresetReapplyReviewAcceptanceIdentity,
} from './caseInsertPresetReapplyIdentity.ts'
import {
  CASE_INSERT_PRESET_TYPED_REAPPLY_PLAN_FORMAT_VERSION,
  CASE_INSERT_PRESET_TYPED_REAPPLY_CONFIGURATION_PROJECTION_KIND,
  createCaseInsertPresetTypedReapplyPlanIdentity,
  createCaseInsertPresetTypedReapplyReviewIdentity,
  type CaseInsertPresetTypedReapplyMaterialConsentRequirement,
  type CaseInsertPresetTypedReapplyFieldEffect,
  type CaseInsertPresetTypedReapplyPlan,
} from './caseInsertPresetTypedReapplyPlanning.ts'
import {
  createCaseInsertPresetMaterialConsentRequirementId,
} from './caseInsertPresetApplyReviewIdentity.ts'
import {
  createCaseInsertPresetTransitionSuccessEvidence,
  type CaseInsertPresetTransitionSuccessEvidence,
} from './caseInsertPresetTransitionSuccessIdentity.ts'
import {
  deepFreezeCaseInsertPresetValue,
  sameCaseInsertPresetValue,
} from './caseInsertPresetSafeInput.ts'
import {
  CASE_INSERT_PRESET_TYPED_REAPPLY_REQUIREMENT_IDENTITY_PREFIX,
  CASE_INSERT_PRESET_TYPED_REAPPLY_TRANSITION_IDENTITY_PREFIX,
  CASE_INSERT_PRESET_TYPED_REAPPLY_WARNING_IDENTITY_PREFIX,
} from './caseInsertPresetTypedReapplyIdentity.ts'

export {
  CASE_INSERT_PRESET_TYPED_REAPPLY_TRANSITION_IDENTITY_PREFIX,
} from './caseInsertPresetTypedReapplyIdentity.ts'
type CaseInsertPresetPlanArtworkViewportActionFieldId =
  CaseInsertPresetPlanArtworkViewportAction['ownedFieldIds'][number]

const CASE_INSERT_PRESET_ARTWORK_VIEWPORT_OWNED_FIELD_IDS = [
  'layout-x',
  'layout-y',
  'layout-scale',
  'image-fit',
  'reserved-artwork-viewport',
] as const satisfies readonly CaseInsertPresetPlanArtworkViewportActionFieldId[]

export type CaseInsertPresetTypedReapplyReviewAcceptance = Readonly<{
  kind: 'sbls/case-insert-preset-reapply-review-acceptance'
  formatVersion: 1
  decision: 'accepted'
  operation: 'reapply'
  planIdentity: string
  planReviewIdentity: string
  sourceConfigurationIdentity: string
  sourceCustomizationReportIdentity: string
  selectedPreset: Readonly<{ id: string; revision: number }>
  acceptanceIdentity: string
}>

export type CaseInsertPresetTypedReapplyConsentAcceptance = Readonly<{
  kind: 'sbls/case-insert-preset-reapply-consent-acceptance'
  formatVersion: 1
  decision: 'accepted'
  operation: 'reapply'
  planIdentity: string
  planReviewIdentity: string
  requirementId: string
  requirement: CaseInsertPresetTypedReapplyMaterialConsentRequirement
  acceptanceIdentity: string
}>

export type TransitionCaseInsertPresetTypedReapplyInput = Readonly<{
  operation: 'reapply'
  plan: CaseInsertPresetTypedReapplyPlan
  sourceConfiguration: CaseInsertAppliedPresetConfiguration
  customizationReport: CaseInsertPresetCustomizationReport
  reviewAcceptance: CaseInsertPresetTypedReapplyReviewAcceptance
  materialConsentAcceptances:
    readonly CaseInsertPresetTypedReapplyConsentAcceptance[]
  current: Readonly<{
    projectKind: string
    aggregate: ProjectJewelCaseState
    sessionId: string
    projectRevision: number
    template: Readonly<{ id: string; revision: number | null }>
  }>
}>

export type CaseInsertPresetTypedReapplyTransitionFailure = Readonly<{
  ok: false
  status:
    | 'invalid-request'
    | 'unsupported-operation'
    | 'invalid-plan'
    | 'unsupported-plan-version'
    | 'plan-identity-mismatch'
    | 'invalid-source-configuration'
    | 'unsupported-configuration-version'
    | 'invalid-customization-report'
    | 'unsupported-report-version'
    | 'configuration-mismatch'
    | 'report-mismatch'
    | 'attachment-context-mismatch'
    | 'stale-reapply-plan'
    | 'invalid-review-acceptance'
    | 'review-mismatch'
    | 'missing-material-consent'
    | 'duplicate-material-consent'
    | 'unexpected-material-consent'
    | 'material-consent-mismatch'
    | 'unsupported-action'
    | 'unsupported-owned-field'
    | 'invalid-current-value'
    | 'target-missing'
    | 'target-ambiguous'
    | 'transition-conflict'
    | 'projected-configuration-mismatch'
    | 'configuration-validation-failed'
  code: string
  dimensions?: readonly string[]
  address?: CaseInsertAppliedPresetOwnedFieldAddressV3
  requirementId?: string
}>

export type CaseInsertPresetTypedReapplyTransitionSuccess = Readonly<{
  ok: true
  status:
    | 'reapplied'
    | 'reapplied-aggregate-semantic-no-op'
    | 'reapplied-semantic-no-op'
  transitionIdentity: string
  formatVersion: 1
  operation: 'reapply'
  sourceAggregate: Readonly<ProjectJewelCaseState>
  sourceConfiguration: CaseInsertViewportAppliedPresetConfiguration
  aggregate: Readonly<ProjectJewelCaseState>
  nextConfiguration: CaseInsertViewportAppliedPresetConfiguration
  successEvidence: CaseInsertPresetTransitionSuccessEvidence
  applicationAdoptionStatus: 'not-adopted'
}>

export type CaseInsertPresetTypedReapplyTransitionResult =
  | CaseInsertPresetTypedReapplyTransitionSuccess
  | CaseInsertPresetTypedReapplyTransitionFailure

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isObjectValue(value: unknown): boolean {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function cloneMutable<T>(value: T): T {
  if (value === null || typeof value !== 'object') return value
  if (Array.isArray(value)) return value.map(cloneMutable) as T
  return Object.fromEntries(Object.entries(value as Record<string, unknown>)
    .map(([key, child]) => [key, cloneMutable(child)])) as T
}

function failure(
  status: CaseInsertPresetTypedReapplyTransitionFailure['status'],
  code: string,
  options: Readonly<{
    dimensions?: readonly string[]
    address?: CaseInsertAppliedPresetOwnedFieldAddressV3
    requirementId?: string
  }> = {},
): CaseInsertPresetTypedReapplyTransitionFailure {
  return deepFreezeCaseInsertPresetValue({
    ok: false,
    status,
    code,
    ...(options.dimensions ? { dimensions: [...options.dimensions] } : {}),
    ...(options.address ? { address: cloneMutable(options.address) } : {}),
    ...(options.requirementId ? { requirementId: options.requirementId } : {}),
  })
}

function addressKey(address: CaseInsertAppliedPresetOwnedFieldAddressV3) {
  return [
    address.region,
    address.featureOwnerId,
    address.bindingKind,
    address.bindingId,
    address.runtimeObjectId,
    address.fieldId,
  ].join('\u0000')
}

function artworkViewportGroupKey(
  address: CaseInsertAppliedPresetOwnedFieldAddressV3,
  source: CaseInsertPresetPlanSourceAssignment,
) {
  return [
    address.region,
    address.featureOwnerId,
    address.bindingKind,
    address.bindingId,
    address.runtimeObjectId,
    source.assignmentId,
  ].join('\u0000')
}

function artworkViewportAddress(
  action: CaseInsertPresetPlanArtworkViewportAction,
  fieldId: CaseInsertPresetPlanArtworkViewportActionFieldId,
): CaseInsertAppliedPresetOwnedFieldAddressV3 {
  return {
    region: action.source.region,
    featureOwnerId: action.target.featureOwnerId,
    bindingKind: action.target.bindingKind,
    bindingId: action.target.bindingId,
    runtimeObjectId: action.target.runtimeObjectId,
    fieldId,
  }
}

function sameStringSet(
  left: readonly string[],
  right: readonly string[],
) {
  return left.length === right.length &&
    new Set(left).size === left.length &&
    new Set(right).size === right.length &&
    left.every((value) => right.includes(value))
}

function hasUniqueAddresses(
  values: readonly Readonly<{
    address: CaseInsertAppliedPresetOwnedFieldAddressV3
  }>[],
) {
  return new Set(values.map(({ address }) => addressKey(address))).size ===
    values.length
}

function hasUniqueIds(values: readonly Readonly<{ id: string }>[]) {
  return values.every(({ id }) => typeof id === 'string' && id.length > 0) &&
    new Set(values.map(({ id }) => id)).size === values.length
}

function expectedDirectWriteKind(
  fieldId: CaseInsertAppliedPresetOwnedFieldAddressV3['fieldId'],
) {
  switch (fieldId) {
    case 'layout-x': return 'set-layout-x' as const
    case 'layout-y': return 'set-layout-y' as const
    case 'layout-scale': return 'set-layout-scale' as const
    case 'layout-width': return 'set-layout-width' as const
    default: return null
  }
}

function isArtworkViewportOwnedFieldId(
  fieldId: CaseInsertAppliedPresetOwnedFieldAddressV3['fieldId'],
): fieldId is CaseInsertPresetPlanArtworkViewportActionFieldId {
  return fieldId === 'layout-x' || fieldId === 'layout-y' ||
    fieldId === 'layout-scale' || fieldId === 'image-fit' ||
    fieldId === 'reserved-artwork-viewport'
}

function artworkValue(
  action: CaseInsertPresetPlanArtworkViewportAction,
  fieldId: CaseInsertPresetPlanArtworkViewportActionFieldId,
  source: 'current' | 'proposed',
): CaseInsertAppliedPresetOwnedValue | null {
  const values = source === 'current'
    ? action.currentValues
    : action.proposedValues
  if (values === null) return null
  switch (fieldId) {
    case 'layout-x':
      return { kind: 'layout-number', value: values.layoutX }
    case 'layout-y':
      return { kind: 'layout-number', value: values.layoutY }
    case 'layout-scale':
      return { kind: 'layout-number', value: values.layoutScale }
    case 'image-fit':
      return { kind: 'image-fit', value: values.imageFit }
    case 'reserved-artwork-viewport':
      return {
        kind: 'reserved-artwork-viewport',
        value: cloneMutable(values.reservedArtworkViewport),
      }
  }
}

function sameRecordSet<T extends Readonly<Record<string, unknown>>>(
  left: readonly T[],
  right: readonly T[],
  key: (value: T) => string,
) {
  if (left.length !== right.length) return false
  const leftKeys = left.map(key)
  if (new Set(leftKeys).size !== left.length) return false
  const rightByKey = new Map(right.map((value) => [key(value), value]))
  return rightByKey.size === right.length && left.every((value) => {
    const candidate = rightByKey.get(key(value))
    return candidate !== undefined && sameCaseInsertPresetValue(value, candidate)
  })
}

function sourceMatchesResolvedAssignment(
  source: CaseInsertPresetPlanSourceAssignment,
  raw: Readonly<Record<string, unknown>>,
) {
  return raw.assignmentId === source.assignmentId &&
    raw.slotId === source.slotId && raw.roleId === source.roleId &&
    raw.region === source.region &&
    raw.coordinateBasis === source.coordinateBasis &&
    raw.ownerId === source.ownerId &&
    raw.bindingKind === source.object.bindingKind &&
    raw.bindingId === source.object.bindingId
}

function sameSourceAssignmentContext(
  left: CaseInsertPresetPlanSourceAssignment,
  right: CaseInsertPresetPlanSourceAssignment,
) {
  return left.presetId === right.presetId &&
    left.presetRevision === right.presetRevision &&
    left.slotId === right.slotId && left.assignmentId === right.assignmentId &&
    left.roleId === right.roleId && left.region === right.region &&
    left.coordinateBasis === right.coordinateBasis &&
    left.ownerId === right.ownerId &&
    sameCaseInsertPresetValue(left.object, right.object)
}

function sameObservation(
  left: CaseInsertPresetOwnedFieldObservation,
  right: CaseInsertPresetOwnedFieldObservation,
) {
  return sameCaseInsertPresetValue(left, right)
}

function planContent(plan: CaseInsertPresetTypedReapplyPlan) {
  return Object.fromEntries(Object.entries(plan).filter(([key]) =>
    key !== 'reviewIdentity')) as Omit<
      CaseInsertPresetTypedReapplyPlan,
      'reviewIdentity'
    >
}

function validatePlan(
  value: unknown,
): CaseInsertPresetTypedReapplyPlan | CaseInsertPresetTypedReapplyTransitionFailure {
  if (!isRecord(value) || value.kind !==
      'sbls/case-insert-preset-reapply-plan') {
    return failure('invalid-plan', 'typed-reapply-plan-invalid')
  }
  if (value.formatVersion !==
      CASE_INSERT_PRESET_TYPED_REAPPLY_PLAN_FORMAT_VERSION) {
    return failure(
      'unsupported-plan-version',
      'typed-reapply-plan-version-unsupported',
    )
  }
  const plan = value as unknown as CaseInsertPresetTypedReapplyPlan
  if (plan.operation !== 'reapply' ||
      !isRecord(plan.source) || !isRecord(plan.preset) ||
      !isRecord(plan.projectedConfiguration) || !isRecord(plan.preconditions) ||
      !isRecord(plan.semanticEffects) || !Array.isArray(plan.fieldEffects) ||
      !Array.isArray(plan.resolvedRegions) ||
      !Array.isArray(plan.resolvedAssignments) ||
      !Array.isArray(plan.selectedFootprint) ||
      !Array.isArray(plan.fieldActions) ||
      !Array.isArray(plan.aggregateWrites) ||
      !Array.isArray(plan.objectCreationActions) ||
      !Array.isArray(plan.artworkViewportActions) ||
      !Array.isArray(plan.projectedConfiguration.ownedFields) ||
      !Array.isArray(plan.projectedConfiguration.resolvedRegions) ||
      !Array.isArray(plan.preservedCustomizedFields) ||
      !Array.isArray(plan.newlyClaimedFields) ||
      !Array.isArray(plan.retiredFields) ||
      !Array.isArray(plan.preservationDecisions) ||
      !Array.isArray(plan.skips) || !Array.isArray(plan.warnings) ||
      !Array.isArray(plan.blockers) ||
      !Array.isArray(plan.preconditions.fields) ||
      !Array.isArray(plan.preconditions.resolvedRegions) ||
      !Array.isArray(plan.materialConsentRequirements) ||
      typeof plan.reviewIdentity !== 'string' ||
      plan.projectedConfiguration.kind !==
        CASE_INSERT_PRESET_TYPED_REAPPLY_CONFIGURATION_PROJECTION_KIND ||
      plan.projectedConfiguration.authority !==
        'non-authoritative-uninstalled-projection' ||
      plan.blockers.length !== 0) {
    return failure('invalid-plan', 'typed-reapply-plan-shape-invalid')
  }
  let expectedReviewIdentity: string
  try {
    expectedReviewIdentity = createCaseInsertPresetTypedReapplyReviewIdentity(
      planContent(plan),
    )
  } catch {
    return failure('invalid-plan', 'typed-reapply-plan-identity-unavailable')
  }
  if (plan.reviewIdentity !== expectedReviewIdentity) {
    return failure(
      'plan-identity-mismatch',
      'typed-reapply-review-identity-mismatch',
    )
  }
  const effects = new Map<string,
    CaseInsertPresetTypedReapplyPlan['fieldEffects'][number]>()
  for (const effect of plan.fieldEffects) {
    if (!isObjectValue(effect) || !isObjectValue(effect.address) ||
        !isObjectValue(effect.currentObservation) ||
        !Array.isArray(effect.previousSources) ||
        !Array.isArray(effect.selectedSources) ||
        !Array.isArray(effect.projectedSources) ||
        (effect.previousLastAppliedValue !== null &&
          !isCaseInsertAppliedPresetOwnedValueForField(
            effect.address,
            effect.previousLastAppliedValue,
          )) || (effect.selectedProposedValue !== null &&
          !isCaseInsertAppliedPresetOwnedValueForField(
            effect.address,
            effect.selectedProposedValue,
          )) || (effect.projectedLastAppliedValue !== null &&
          !isCaseInsertAppliedPresetOwnedValueForField(
            effect.address,
            effect.projectedLastAppliedValue,
          )) || (effect.currentObservation.status === 'present' &&
          !isCaseInsertAppliedPresetOwnedValueForField(
            effect.address,
            effect.currentObservation.value,
          ))) {
      return failure('invalid-plan', 'typed-reapply-effect-shape-invalid')
    }
    const key = addressKey(effect.address)
    if (effects.has(key)) {
      return failure('invalid-plan', 'typed-reapply-effect-address-duplicate', {
        address: effect.address,
      })
    }
    const retired = effect.disposition === 'retired'
    const claimed = effect.disposition === 'new-claim'
    const preserve = effect.policy === 'preserve-current-customization'
    const overwrite = effect.policy === 'overwrite-with-selected-preset'
    const retainedClean = effect.disposition === 'retained-clean'
    const retainedCustomized =
      effect.disposition === 'retained-customized-overwrite' ||
      effect.disposition === 'retained-customized-preserve' ||
      effect.disposition === 'retained-unavailable-overwrite' ||
      effect.disposition === 'retained-unavailable-preserve'
    const expectedWriteRequired = !retired && !preserve &&
      effect.selectedProposedValue !== null &&
      (effect.currentObservation.status !== 'present' ||
        !sameCaseInsertPresetValue(
          effect.currentObservation.value,
          effect.selectedProposedValue,
        ))
    if ((retired && (effect.ownershipOutcome !== 'retired' ||
          effect.policy !== null || effect.selectedProposedValue !== null ||
          effect.projectedLastAppliedValue !== null ||
          effect.projectedSources.length !== 0 ||
          effect.aggregateWriteRequired ||
          effect.projectedCustomizationStatus !== 'not-owned')) ||
        (claimed && (effect.ownershipOutcome !== 'claimed' ||
          effect.policy !== null || effect.previousLastAppliedValue !== null ||
          effect.previousSources.length !== 0 ||
          effect.selectedProposedValue === null ||
          effect.projectedLastAppliedValue === null ||
          !sameCaseInsertPresetValue(
            effect.projectedLastAppliedValue,
            effect.selectedProposedValue,
          ) || !sameCaseInsertPresetValue(
            effect.projectedSources,
            effect.selectedSources,
          ) || effect.projectedCustomizationStatus !== 'clean')) ||
        (!retired && !claimed && (effect.ownershipOutcome !== 'retained' ||
          effect.previousLastAppliedValue === null ||
          effect.selectedProposedValue === null ||
          effect.projectedLastAppliedValue === null ||
          (!retainedClean && !retainedCustomized))) ||
        (retainedClean && (effect.policy !== null ||
          effect.projectedCustomizationStatus !== 'clean' ||
          !sameCaseInsertPresetValue(
            effect.projectedLastAppliedValue,
            effect.selectedProposedValue,
          ) || !sameCaseInsertPresetValue(
            effect.projectedSources,
            effect.selectedSources,
          ))) ||
        (retainedCustomized && !preserve && !overwrite) ||
        (preserve && (!effect.disposition.endsWith('-preserve') ||
          effect.projectedCustomizationStatus !== 'customized' ||
          !sameCaseInsertPresetValue(
            effect.projectedLastAppliedValue,
            effect.previousLastAppliedValue,
          ) || !sameCaseInsertPresetValue(
            effect.projectedSources,
            effect.previousSources,
          ))) || (overwrite &&
          (!effect.disposition.endsWith('-overwrite') ||
            effect.projectedCustomizationStatus !== 'clean' ||
            !sameCaseInsertPresetValue(
              effect.projectedLastAppliedValue,
              effect.selectedProposedValue,
            ) || !sameCaseInsertPresetValue(
              effect.projectedSources,
              effect.selectedSources,
            ))) || effect.aggregateWriteRequired !== expectedWriteRequired) {
      return failure(
        'invalid-plan',
        'typed-reapply-effect-semantics-incoherent',
        { address: effect.address },
      )
    }
    effects.set(key, effect)
  }
  const projected = new Map<string,
    CaseInsertPresetTypedReapplyPlan['projectedConfiguration'][
      'ownedFields'
    ][number]>()
  for (const field of plan.projectedConfiguration.ownedFields) {
    if (!isObjectValue(field) || !isObjectValue(field.address) ||
        !Array.isArray(field.sources) ||
        !isCaseInsertAppliedPresetOwnedValueForField(
          field.address,
          field.lastAppliedValue,
        ) || (field.expectedCustomizationStatus !== 'clean' &&
          field.expectedCustomizationStatus !== 'customized')) {
      return failure(
        'projected-configuration-mismatch',
        'typed-reapply-projected-field-shape-invalid',
      )
    }
    projected.set(addressKey(field.address), field)
  }
  if (projected.size !== plan.projectedConfiguration.ownedFields.length) {
    return failure(
      'projected-configuration-mismatch',
      'typed-reapply-projected-address-duplicate',
    )
  }
  const retainedEffects = plan.fieldEffects.filter(({ ownershipOutcome }) =>
    ownershipOutcome !== 'retired')
  if (projected.size !== retainedEffects.length) {
    return failure(
      'projected-configuration-mismatch',
      'typed-reapply-projected-field-set-incomplete',
    )
  }
  for (const effect of plan.fieldEffects) {
    const field = projected.get(addressKey(effect.address))
    if (effect.ownershipOutcome === 'retired') {
      if (field) return failure(
        'projected-configuration-mismatch',
        'typed-reapply-retired-field-projected',
      )
      continue
    }
    if (!field || !sameCaseInsertPresetValue(
      field.lastAppliedValue,
      effect.projectedLastAppliedValue,
    ) || !sameCaseInsertPresetValue(
      field.sources,
      effect.projectedSources,
    ) || field.expectedCustomizationStatus !==
      effect.projectedCustomizationStatus) return failure(
      'projected-configuration-mismatch',
      'typed-reapply-projected-field-incoherent',
      { address: effect.address },
    )
  }
  const footprint = new Map<string,
    CaseInsertPresetTypedReapplyPlan['selectedFootprint'][number]>()
  for (const field of plan.selectedFootprint) {
    if (!isObjectValue(field) || !isObjectValue(field.address) ||
        !Array.isArray(field.sources) ||
        !isCaseInsertAppliedPresetOwnedValueForField(
          field.address,
          field.proposedValue,
        )) {
      return failure('invalid-plan', 'typed-reapply-footprint-shape-invalid')
    }
    const key = addressKey(field.address)
    if (footprint.has(key)) {
      return failure(
        'invalid-plan',
        'typed-reapply-footprint-address-duplicate',
        { address: field.address },
      )
    }
    footprint.set(key, field)
  }
  const selectedEffects = plan.fieldEffects.filter((effect) =>
    effect.selectedProposedValue !== null)
  if (footprint.size !== selectedEffects.length || selectedEffects.some(
    (effect) => {
      const selected = footprint.get(addressKey(effect.address))
      return !selected || !sameCaseInsertPresetValue(
        selected.proposedValue,
        effect.selectedProposedValue,
      ) || !sameCaseInsertPresetValue(
        selected.sources,
        effect.selectedSources,
      )
    },
  )) {
    return failure('invalid-plan', 'typed-reapply-footprint-incoherent')
  }
  const preconditionByKey = new Map<string,
    CaseInsertPresetTypedReapplyPlan['preconditions']['fields'][number]>()
  for (const precondition of plan.preconditions.fields) {
    if (!isObjectValue(precondition) ||
        !isObjectValue(precondition.address) ||
        !isObjectValue(precondition.observation)) {
      return failure('invalid-plan', 'typed-reapply-precondition-shape-invalid')
    }
    const key = addressKey(precondition.address)
    if (preconditionByKey.has(key)) {
      return failure(
        'invalid-plan',
        'typed-reapply-precondition-address-duplicate',
        { address: precondition.address },
      )
    }
    preconditionByKey.set(key, precondition)
  }
  if (preconditionByKey.size !== effects.size || plan.fieldEffects.some(
    (effect) => {
      const precondition = preconditionByKey.get(addressKey(effect.address))
      return !precondition || !sameCaseInsertPresetValue(
        precondition.observation,
        effect.currentObservation,
      ) || !sameCaseInsertPresetValue(
        precondition.enablement,
        effect.enablement,
      )
    },
  )) {
    return failure('invalid-plan', 'typed-reapply-precondition-incoherent')
  }
  const expectedPreserved = plan.fieldEffects.filter(({ disposition }) =>
    disposition === 'retained-customized-preserve' ||
    disposition === 'retained-unavailable-preserve')
  const expectedClaimed = plan.fieldEffects.filter(({ disposition }) =>
    disposition === 'new-claim')
  const expectedRetired = plan.fieldEffects.filter(({ disposition }) =>
    disposition === 'retired')
  const effectKey = (effect: CaseInsertPresetTypedReapplyFieldEffect) =>
    addressKey(effect.address)
  if (!hasUniqueAddresses(plan.preservedCustomizedFields) ||
      !hasUniqueAddresses(plan.newlyClaimedFields) ||
      !hasUniqueAddresses(plan.retiredFields) ||
      !sameRecordSet(
        plan.preservedCustomizedFields,
        expectedPreserved,
        effectKey,
      ) || !sameRecordSet(
        plan.newlyClaimedFields,
        expectedClaimed,
        effectKey,
      ) || !sameRecordSet(plan.retiredFields, expectedRetired, effectKey)) {
    return failure('invalid-plan', 'typed-reapply-effect-summary-incoherent')
  }
  if (!hasUniqueIds(plan.warnings) ||
      !hasUniqueIds(plan.materialConsentRequirements)) {
    return failure('invalid-plan', 'typed-reapply-evidence-id-duplicate')
  }
  for (const warning of plan.warnings) {
    if (!isObjectValue(warning) || typeof warning.kind !== 'string' ||
        !isObjectValue(warning.evidence)) {
      return failure('invalid-plan', 'typed-reapply-warning-shape-invalid')
    }
    if (warning.id.startsWith('case:preset-warning:v1:')) {
      if (warning.evidence.id !== warning.id ||
          warning.evidence.kind !== warning.kind) {
        return failure(
          'invalid-plan',
          'typed-reapply-propagated-warning-identity-mismatch',
        )
      }
      continue
    }
    if (warning.id.startsWith(
      CASE_INSERT_PRESET_TYPED_REAPPLY_WARNING_IDENTITY_PREFIX,
    ) && warning.evidence.kind === warning.kind && warning.id ===
      `${CASE_INSERT_PRESET_TYPED_REAPPLY_WARNING_IDENTITY_PREFIX}${
        createCaseInsertPresetDeterministicIdentityDigest(warning.evidence)
      }`) continue
    const address = warning.evidence.address
    if (warning.kind !== 'customization-preserved' ||
        !isRecord(address) || warning.id !==
          `${CASE_INSERT_PRESET_TYPED_REAPPLY_WARNING_IDENTITY_PREFIX}${
            createCaseInsertPresetDeterministicIdentityDigest({
              kind: warning.kind,
              address,
            })
          }` || !plan.preservedCustomizedFields.some((effect) =>
          sameCaseInsertPresetValue(effect.address, address))) {
      return failure('invalid-plan', 'typed-reapply-warning-incoherent')
    }
  }
  for (const requirement of plan.materialConsentRequirements) {
    if (!isObjectValue(requirement) ||
        !isObjectValue(requirement.selectedPreset) ||
        !isObjectValue(requirement.evidence) ||
        requirement.selectedPreset.id !== plan.preset.id ||
        requirement.selectedPreset.revision !== plan.preset.selectedRevision ||
        requirement.sourceConfigurationIdentity !==
          plan.source.configurationIdentity ||
        requirement.sourceCustomizationReportIdentity !==
          plan.source.customizationReportIdentity) {
      return failure('invalid-plan', 'typed-reapply-requirement-shape-invalid')
    }
    if (requirement.kind === 'overwrite-customized-owned-field') {
      if (requirement.address === null ||
          requirement.policy !== 'overwrite-with-selected-preset') {
        return failure(
          'invalid-plan',
          'typed-reapply-overwrite-requirement-invalid',
        )
      }
      const effect = effects.get(addressKey(requirement.address))
      const content = {
        kind: requirement.kind,
        address: cloneMutable(requirement.address),
        policy: requirement.policy,
        selectedPreset: cloneMutable(requirement.selectedPreset),
        sourceConfigurationIdentity:
          requirement.sourceConfigurationIdentity,
        sourceCustomizationReportIdentity:
          requirement.sourceCustomizationReportIdentity,
        evidence: {
          currentObservation: cloneMutable(effect?.currentObservation),
          selectedProposedValue: cloneMutable(effect?.selectedProposedValue),
        },
      }
      if (effect?.disposition !== 'retained-customized-overwrite' ||
          !sameCaseInsertPresetValue(requirement.evidence, content.evidence) ||
          requirement.id !==
            `${CASE_INSERT_PRESET_TYPED_REAPPLY_REQUIREMENT_IDENTITY_PREFIX}${
              createCaseInsertPresetDeterministicIdentityDigest(content)
            }`) {
        return failure(
          'invalid-plan',
          'typed-reapply-overwrite-requirement-incoherent',
        )
      }
      continue
    }
    if ((requirement.kind !== 'multiple-concrete-regions' &&
        requirement.kind !== 'material-visible-clipping') ||
        requirement.address !== null || requirement.policy !== null ||
        requirement.evidence.id !== requirement.id ||
        (requirement.kind === 'multiple-concrete-regions'
          ? requirement.evidence.kind !== 'multiple-concrete-regions'
          : requirement.evidence.kind !== 'material-visible-clipping')) {
      return failure('invalid-plan', 'typed-reapply-source-requirement-invalid')
    }
  }
  if (plan.source.projectKind !== 'caseInsert' ||
      typeof plan.source.configurationIdentity !== 'string' ||
      typeof plan.source.customizationReportIdentity !== 'string' ||
      typeof plan.source.sessionId !== 'string' ||
      !Number.isSafeInteger(plan.source.projectRevision) ||
      plan.source.projectRevision < 0 || !isRecord(plan.source.template) ||
      plan.source.template.revision !== null ||
      plan.preset.previousRevision !== plan.preset.selectedRevision ||
      plan.projectedConfiguration.sourceConfigurationIdentity !==
        plan.source.configurationIdentity ||
      plan.projectedConfiguration.sourceCustomizationReportIdentity !==
        plan.source.customizationReportIdentity ||
      plan.projectedConfiguration.selectedPreset.id !== plan.preset.id ||
      plan.projectedConfiguration.selectedPreset.revision !==
        plan.preset.selectedRevision ||
      plan.projectedConfiguration.selectedPreset.source !== plan.preset.source ||
      !sameCaseInsertPresetValue(
        plan.projectedConfiguration.requestedScope,
        plan.requestedScope,
      ) || !sameStringSet(
        plan.projectedConfiguration.resolvedRegions,
        plan.resolvedRegions,
      ) || plan.preconditions.configurationIdentity !==
        plan.source.configurationIdentity ||
      plan.preconditions.customizationReportIdentity !==
        plan.source.customizationReportIdentity ||
      plan.preconditions.projectKind !== plan.source.projectKind ||
      plan.preconditions.sessionId !== plan.source.sessionId ||
      plan.preconditions.projectRevision !== plan.source.projectRevision ||
      !sameCaseInsertPresetValue(
        plan.preconditions.template,
        plan.source.template,
      ) || plan.preconditions.aggregateContentIdentity !==
        plan.source.aggregateContentIdentity ||
      plan.preconditions.selectedPreset.id !== plan.preset.id ||
      plan.preconditions.selectedPreset.revision !==
        plan.preset.selectedRevision ||
      plan.preconditions.scopeKey !==
        getCaseInsertPresetApplicationScopeKey(plan.requestedScope) ||
      !sameStringSet(plan.preconditions.resolvedRegions, plan.resolvedRegions)) {
    return failure('invalid-plan', 'typed-reapply-lineage-incoherent')
  }
  const resolvedByAssignmentId = new Map<string, Readonly<Record<string, unknown>>>()
  for (const assignment of plan.resolvedAssignments) {
    if (!isRecord(assignment) ||
        typeof assignment.assignmentId !== 'string' ||
        resolvedByAssignmentId.has(assignment.assignmentId)) {
      return failure('invalid-plan', 'typed-reapply-resolution-incoherent')
    }
    resolvedByAssignmentId.set(assignment.assignmentId, assignment)
  }
  for (const selected of plan.selectedFootprint) {
    for (const source of selected.sources) {
      if (!isObjectValue(source) || !isObjectValue(source.object) ||
          source.presetId !== plan.preset.id ||
          source.presetRevision !== plan.preset.selectedRevision) {
        return failure(
          'invalid-plan',
          'typed-reapply-selected-source-incoherent',
          { address: selected.address },
        )
      }
      const resolved = resolvedByAssignmentId.get(source.assignmentId)
      if (!resolved || !sourceMatchesResolvedAssignment(source, resolved)) {
        return failure(
          'invalid-plan',
          'typed-reapply-selected-source-resolution-mismatch',
          { address: selected.address },
        )
      }
    }
  }
  const multipleRegionWarnings = plan.warnings.filter(({ kind }) =>
    kind === 'multiple-concrete-regions')
  const multipleRegionRequirements = plan.materialConsentRequirements.filter(
    ({ kind }) => kind === 'multiple-concrete-regions',
  )
  const allAssignmentIds = plan.resolvedAssignments.map(({ assignmentId }) =>
    String(assignmentId))
  const consentAssignmentIds = plan.resolvedAssignments.filter(
    ({ bindingStatus }) => bindingStatus === 'resolved' ||
      bindingStatus === 'resolved-disabled',
  ).map(({ assignmentId }) => String(assignmentId))
  const directSelectedValueChanged = plan.fieldEffects.some(
    (effect: CaseInsertPresetTypedReapplyFieldEffect) =>
      effect.selectedSources.some(
        (source: CaseInsertPresetPlanSourceAssignment) =>
          source.declaredPolicy ===
            'normalized-content-region-direct-layout-v1',
      ) &&
    effect.selectedProposedValue?.kind === 'layout-number' &&
    (effect.currentObservation.status !== 'present' ||
      !sameCaseInsertPresetValue(
        effect.currentObservation.value,
        effect.selectedProposedValue,
      )),
  )
  if (plan.resolvedRegions.length > 1) {
    const warning = multipleRegionWarnings[0]
    if (multipleRegionWarnings.length !== 1 || !warning ||
        !Array.isArray(warning.evidence.regions) ||
        !Array.isArray(warning.evidence.assignmentIds) ||
        !sameStringSet(
          warning.evidence.regions.map(String),
          plan.resolvedRegions,
        ) || !sameStringSet(
          warning.evidence.assignmentIds.map(String),
          allAssignmentIds,
        )) {
      return failure(
        'invalid-plan',
        'typed-reapply-multiple-region-warning-incoherent',
      )
    }
    if (directSelectedValueChanged) {
      const requirement = multipleRegionRequirements[0]
      if (multipleRegionRequirements.length !== 1 || !requirement ||
          !Array.isArray(requirement.evidence.regions) ||
          !Array.isArray(requirement.evidence.assignmentIds) ||
          !sameStringSet(
            requirement.evidence.regions.map(String),
            plan.resolvedRegions,
          ) || !sameStringSet(
            requirement.evidence.assignmentIds.map(String),
            consentAssignmentIds,
          ) || requirement.id !==
            createCaseInsertPresetMaterialConsentRequirementId({
              kind: 'multiple-concrete-regions',
              regions: requirement.evidence.regions as
                CaseInsertPresetTypedReapplyPlan['resolvedRegions'],
              assignmentIds: requirement.evidence.assignmentIds as
                readonly `case:preset-assignment:${string}`[],
            })) {
        return failure(
          'invalid-plan',
          'typed-reapply-multiple-region-consent-incoherent',
        )
      }
    } else if (multipleRegionRequirements.length !== 0) {
      return failure(
        'invalid-plan',
        'typed-reapply-multiple-region-consent-unexpected',
      )
    }
  } else if (multipleRegionWarnings.length !== 0 ||
      multipleRegionRequirements.length !== 0) {
    return failure(
      'invalid-plan',
      'typed-reapply-multiple-region-evidence-unexpected',
    )
  }
  const directActionKey = (
    write: CaseInsertPresetTypedReapplyPlan['aggregateWrites'][number],
  ) => `${addressKey(write.address)}\u0000${write.id}`
  if (!sameRecordSet(plan.fieldActions, plan.aggregateWrites, directActionKey)) {
    return failure('invalid-plan', 'typed-reapply-field-actions-diverged')
  }
  const requirementIds = plan.materialConsentRequirements.map(({ id }) => id)
  const directWriteKeys = new Set<string>()
  const directWriteIds = new Set<string>()
  for (const write of plan.aggregateWrites) {
    if (!isObjectValue(write) || !isObjectValue(write.address) ||
        !Array.isArray(write.materialConsentRequirementIds)) {
      return failure('invalid-plan', 'typed-reapply-direct-write-shape-invalid')
    }
    const key = addressKey(write.address)
    const effect = effects.get(key)
    const expectedKind = expectedDirectWriteKind(write.address.fieldId)
    if (directWriteKeys.has(key) || directWriteIds.has(write.id) ||
        !effect?.aggregateWriteRequired || expectedKind === null ||
        write.kind !== expectedKind ||
        effect.currentObservation.status !== 'present' ||
        effect.currentObservation.value.kind !== 'layout-number' ||
        effect.selectedProposedValue?.kind !== 'layout-number' ||
        write.currentValuePrecondition !==
          effect.currentObservation.value.value ||
        write.proposedValue !== effect.selectedProposedValue.value ||
        !sameStringSet(
          write.materialConsentRequirementIds,
          requirementIds,
        )) {
      return failure(
        'invalid-plan',
        'typed-reapply-direct-write-incoherent',
        { address: write.address },
      )
    }
    directWriteKeys.add(key)
    directWriteIds.add(write.id)
  }
  type ExpectedViewportGroup = {
    source: CaseInsertPresetPlanSourceAssignment
    fields: Map<
      CaseInsertPresetPlanArtworkViewportActionFieldId,
      CaseInsertPresetTypedReapplyFieldEffect
    >
  }
  const selectedViewportGroups = new Map<string, ExpectedViewportGroup>()
  for (const effect of plan.fieldEffects) {
    if (!isArtworkViewportOwnedFieldId(effect.address.fieldId) ||
        effect.selectedProposedValue === null) continue
    const viewportSources = effect.selectedSources.filter(
      (source: CaseInsertPresetPlanSourceAssignment) =>
        source.declaredPolicy === 'reserved-artwork-viewport-v1',
    )
    if (viewportSources.length === 0) continue
    const source = viewportSources[0]!
    if (effect.selectedSources.length !== 1 || viewportSources.length !== 1 ||
        source.region !== effect.address.region ||
        source.ownerId !== effect.address.featureOwnerId ||
        source.object.bindingKind !== effect.address.bindingKind ||
        source.object.bindingId !== effect.address.bindingId ||
        source.object.runtimeId !== effect.address.runtimeObjectId) {
      return failure(
        'invalid-plan',
        'typed-reapply-viewport-selected-source-incoherent',
        { address: effect.address },
      )
    }
    const groupKey = artworkViewportGroupKey(effect.address, source)
    const group = selectedViewportGroups.get(groupKey) ?? {
      source,
      fields: new Map(),
    }
    if (!sameSourceAssignmentContext(group.source, source) ||
        group.fields.has(effect.address.fieldId)) {
      return failure(
        'invalid-plan',
        'typed-reapply-viewport-selected-footprint-duplicate',
        { address: effect.address },
      )
    }
    group.fields.set(effect.address.fieldId, effect)
    selectedViewportGroups.set(groupKey, group)
  }
  const expectedViewportGroups = new Map<string,
    ExpectedViewportGroup & {
      targetOrigin: CaseInsertPresetPlanArtworkViewportAction['targetOrigin']
    }>()
  for (const [groupKey, group] of selectedViewportGroups) {
    if (group.fields.size !==
        CASE_INSERT_PRESET_ARTWORK_VIEWPORT_OWNED_FIELD_IDS.length ||
        CASE_INSERT_PRESET_ARTWORK_VIEWPORT_OWNED_FIELD_IDS.some((fieldId) =>
          !group.fields.has(fieldId))) {
      return failure(
        'invalid-plan',
        'typed-reapply-viewport-selected-footprint-incomplete',
      )
    }
    const representative = group.fields.get('layout-x')!
    const everyTargetPresent = [...group.fields.values()].every(
      ({ currentObservation }) => currentObservation.status === 'present',
    )
    if (everyTargetPresent) {
      expectedViewportGroups.set(groupKey, {
        ...group,
        targetOrigin: 'existing',
      })
      continue
    }
    const everyTargetUnavailable = [...group.fields.values()].every(
      ({ currentObservation }) =>
        currentObservation.status === 'unavailable-object-absent',
    )
    const presenceAddress = {
      ...representative.address,
      fieldId: 'object-presence' as const,
    }
    const presenceEffect = effects.get(addressKey(presenceAddress))
    const creationAuthorized = everyTargetUnavailable &&
      presenceEffect?.currentObservation.status === 'absent-owned-object' &&
      presenceEffect.aggregateWriteRequired === true &&
      presenceEffect.selectedProposedValue?.kind === 'object-presence' &&
      presenceEffect.selectedProposedValue.value === 'present' &&
      presenceEffect.projectedCustomizationStatus === 'clean'
    if (creationAuthorized) {
      expectedViewportGroups.set(groupKey, {
        ...group,
        targetOrigin: 'planned-creation',
      })
      continue
    }
    const preservedAbsence = everyTargetUnavailable &&
      presenceEffect?.currentObservation.status === 'absent-owned-object' &&
      presenceEffect.aggregateWriteRequired === false &&
      presenceEffect.policy === 'preserve-current-customization' &&
      presenceEffect.projectedCustomizationStatus === 'customized' &&
      [...group.fields.values()].every((effect) =>
        effect.aggregateWriteRequired === false &&
        effect.policy === 'preserve-current-customization' &&
        effect.projectedCustomizationStatus === 'customized')
    if (!preservedAbsence) {
      return failure(
        'invalid-plan',
        'typed-reapply-viewport-selected-footprint-unexecutable',
        { address: representative.address },
      )
    }
  }
  const viewportWriteKeys = new Set<string>()
  const viewportActionIds = new Set<string>()
  const representedViewportGroups = new Set<string>()
  const viewportEvidenceWarningIds = new Set<string>()
  const deferredCoverWarningIds = new Set<string>()
  const viewportAssignmentIds = new Set<string>()
  const viewportEvidenceRequirementIds = new Set<string>()
  for (const action of plan.artworkViewportActions) {
    if (!isObjectValue(action) || !isObjectValue(action.source) ||
        !isObjectValue(action.target) ||
        !isObjectValue(action.proposedValues) ||
        !isObjectValue(action.evidence) || action.evidence.ok !== true ||
        !isObjectValue(action.evidence.plan) ||
        !Array.isArray(action.evidence.plan.warnings) ||
        !Array.isArray(action.evidence.plan.materialConsentRequirements) ||
        !Array.isArray(action.ownedFieldIds) ||
        !Array.isArray(action.writeOwnedFieldIds) ||
        viewportActionIds.has(action.id)) return failure(
      'invalid-plan',
      'typed-reapply-viewport-mask-invalid',
    )
    const resolved = resolvedByAssignmentId.get(action.source.assignmentId)
    const representativeAddress = artworkViewportAddress(action, 'layout-x')
    const groupKey = artworkViewportGroupKey(
      representativeAddress,
      action.source,
    )
    const expectedGroup = expectedViewportGroups.get(groupKey)
    if (action.kind !== 'adopt-reserved-artwork-viewport' ||
        action.source.presetId !== plan.preset.id ||
        action.source.presetRevision !== plan.preset.selectedRevision ||
        action.source.declaredPolicy !== 'reserved-artwork-viewport-v1' ||
        !resolved || !sourceMatchesResolvedAssignment(action.source, resolved) ||
        action.source.ownerId !== action.target.featureOwnerId ||
        action.source.object.bindingKind !== action.target.bindingKind ||
        action.source.object.bindingId !== action.target.bindingId ||
        action.source.object.runtimeId !== action.target.runtimeObjectId ||
        !expectedGroup || representedViewportGroups.has(groupKey) ||
        expectedGroup.targetOrigin !== action.targetOrigin ||
        !sameStringSet(
          action.ownedFieldIds,
          CASE_INSERT_PRESET_ARTWORK_VIEWPORT_OWNED_FIELD_IDS,
        ) || (action.targetOrigin === 'existing'
          ? action.currentValues === null ||
            resolved.runtimeObjectId !== action.target.runtimeObjectId
          : action.targetOrigin === 'planned-creation'
            ? action.currentValues !== null || resolved.runtimeObjectId !== null
            : true) ||
        new Set(action.writeOwnedFieldIds).size !==
      action.writeOwnedFieldIds.length || action.writeOwnedFieldIds.some(
      (fieldId: CaseInsertPresetPlanArtworkViewportActionFieldId) =>
        !action.ownedFieldIds.includes(fieldId),
    )) return failure(
      'invalid-plan',
      'typed-reapply-viewport-mask-invalid',
    )
    viewportActionIds.add(action.id)
    representedViewportGroups.add(groupKey)
    viewportAssignmentIds.add(action.source.assignmentId)
    for (const fieldId of action.ownedFieldIds) {
      const address = artworkViewportAddress(action, fieldId)
      const key = addressKey(address)
      const effect = effects.get(key)
      const selectedValue = artworkValue(action, fieldId, 'proposed')
      const currentValue = artworkValue(action, fieldId, 'current')
      if (!effect || selectedValue === null || !sameCaseInsertPresetValue(
            effect.selectedProposedValue,
            selectedValue,
          ) || !sameCaseInsertPresetValue(
            effect.selectedSources,
            [action.source],
          ) || (action.currentValues === null
            ? effect.currentObservation.status === 'present'
            : effect.currentObservation.status !== 'present' ||
              !sameCaseInsertPresetValue(
                effect.currentObservation.value,
                currentValue,
              ))) {
        return failure(
          'invalid-plan',
          'typed-reapply-viewport-review-incoherent',
          { address },
        )
      }
    }
    if (action.evidence.status === 'deferred' &&
        action.evidence.plan.intent.declaration.mode === 'cover') {
      const warningEvidence = {
        id: `case:preset-warning:v1:artwork-fitting-deferred:${
          createCaseInsertPresetDeterministicIdentityDigest({
            assignmentId: action.source.assignmentId,
            viewportIdentity: action.evidence.plan.viewport.identity,
            intentIdentity: action.evidence.plan.intent.identity,
          })
        }`,
        kind: 'artwork-cover-fitting-deferred' as const,
        assignmentId: action.source.assignmentId,
        ownerId: action.target.featureOwnerId,
        objectId: action.target.runtimeObjectId,
        fittingMode: 'cover' as const,
        reviewMessage: 'Future artwork will use Cover and may be cropped.',
      }
      deferredCoverWarningIds.add(warningEvidence.id)
      if (!plan.warnings.some((warning) =>
        warning.id === warningEvidence.id &&
        warning.kind === warningEvidence.kind &&
        sameCaseInsertPresetValue(warning.evidence, warningEvidence))) {
        return failure(
          'invalid-plan',
          'typed-reapply-deferred-cover-warning-omitted',
        )
      }
    }
    for (const evidenceWarning of action.evidence.plan.warnings) {
      viewportEvidenceWarningIds.add(evidenceWarning.id)
      if (!plan.warnings.some((warning) =>
        warning.id === evidenceWarning.id &&
        warning.kind === evidenceWarning.kind &&
        sameCaseInsertPresetValue(warning.evidence, evidenceWarning))) {
        return failure(
          'invalid-plan',
          'typed-reapply-viewport-warning-evidence-omitted',
        )
      }
    }
    for (const evidenceRequirement of
      action.evidence.plan.materialConsentRequirements) {
      viewportEvidenceRequirementIds.add(evidenceRequirement.id)
      const requirement = plan.materialConsentRequirements.find(({ id }) =>
        id === evidenceRequirement.id)
      if (!requirement || requirement.kind !== evidenceRequirement.kind ||
          requirement.address !== null || requirement.policy !== null ||
          !sameCaseInsertPresetValue(
            requirement.evidence,
            evidenceRequirement,
          )) {
        return failure(
          'invalid-plan',
          'typed-reapply-viewport-consent-evidence-omitted',
        )
      }
    }
    for (const fieldId of action.writeOwnedFieldIds) {
      const address = {
        region: action.source.region,
        featureOwnerId: action.target.featureOwnerId,
        bindingKind: action.target.bindingKind,
        bindingId: action.target.bindingId,
        runtimeObjectId: action.target.runtimeObjectId,
        fieldId,
      } as const
      const key = addressKey(address)
      const effect = effects.get(key)
      const selectedValue = artworkValue(action, fieldId, 'proposed')
      const currentValue = artworkValue(action, fieldId, 'current')
      if (viewportWriteKeys.has(key) || directWriteKeys.has(key) ||
          !effect?.aggregateWriteRequired ||
          selectedValue === null || !sameCaseInsertPresetValue(
            effect.selectedProposedValue,
            selectedValue,
          ) || !sameCaseInsertPresetValue(
            effect.selectedSources,
            [action.source],
          ) || (action.currentValues === null
            ? effect.currentObservation.status === 'present'
            : effect.currentObservation.status !== 'present' ||
              !sameCaseInsertPresetValue(
                effect.currentObservation.value,
                currentValue,
              ))) {
        return failure(
          'invalid-plan',
          'typed-reapply-viewport-write-incoherent',
          { address },
        )
      }
      viewportWriteKeys.add(key)
    }
  }
  if (representedViewportGroups.size !== expectedViewportGroups.size ||
      [...expectedViewportGroups.keys()].some((key) =>
        !representedViewportGroups.has(key))) {
    return failure(
      'invalid-plan',
      'typed-reapply-viewport-review-footprint-incomplete',
    )
  }
  if (plan.warnings.some((warning) =>
    warning.kind === 'artwork-cover-fitting-deferred' &&
    viewportAssignmentIds.has(
      typeof warning.evidence.assignmentId === 'string'
        ? warning.evidence.assignmentId
        : '',
    ) && !deferredCoverWarningIds.has(warning.id))) {
    return failure(
      'invalid-plan',
      'typed-reapply-deferred-cover-warning-substituted',
    )
  }
  if (plan.warnings.some((warning) =>
    warning.kind === 'material-visible-clipping' &&
    !viewportEvidenceWarningIds.has(warning.id))) {
    return failure(
      'invalid-plan',
      'typed-reapply-viewport-warning-evidence-substituted',
    )
  }
  if (plan.materialConsentRequirements.some((requirement) =>
    requirement.kind === 'material-visible-clipping' &&
    !viewportEvidenceRequirementIds.has(requirement.id))) {
    return failure(
      'invalid-plan',
      'typed-reapply-viewport-consent-evidence-substituted',
    )
  }
  const creationWriteKeys = new Set<string>()
  const creationActionIds = new Set<string>()
  const creationViewportIds = new Set<string>()
  for (const action of plan.objectCreationActions) {
    if (!isObjectValue(action) || !isObjectValue(action.source) ||
        !isObjectValue(action.target) ||
        !isObjectValue(action.canonicalInitialObject) ||
        creationActionIds.has(action.id) ||
        creationViewportIds.has(action.viewportActionId)) {
      return failure('invalid-plan', 'typed-reapply-creation-action-invalid')
    }
    const address = {
      region: action.source.region,
      featureOwnerId: action.target.featureOwnerId,
      bindingKind: action.target.bindingKind,
      bindingId: action.target.bindingId,
      runtimeObjectId: action.target.runtimeObjectId,
      fieldId: 'object-presence',
    } as const
    const key = addressKey(address)
    const effect = effects.get(key)
    const viewportAction = plan.artworkViewportActions.find(({ id }) =>
      id === action.viewportActionId)
    if (creationWriteKeys.has(key) || !effect?.aggregateWriteRequired ||
        effect.address.fieldId !== 'object-presence' ||
        effect.currentObservation.status !== 'absent-owned-object' ||
        effect.selectedProposedValue?.kind !== 'object-presence' ||
        effect.selectedProposedValue.value !== 'present' ||
        !sameCaseInsertPresetValue(effect.selectedSources, [action.source]) ||
        !viewportAction || viewportAction.targetOrigin !== 'planned-creation' ||
        !sameCaseInsertPresetValue(viewportAction.target, action.target) ||
        !sameSourceAssignmentContext(viewportAction.source, action.source) ||
        action.canonicalInitialObject.id !== action.target.runtimeObjectId) {
      return failure(
        'invalid-plan',
        'typed-reapply-creation-action-incoherent',
        { address: effect?.address },
      )
    }
    creationWriteKeys.add(key)
    creationActionIds.add(action.id)
    creationViewportIds.add(action.viewportActionId)
  }
  for (const action of plan.artworkViewportActions) {
    if ((action.targetOrigin === 'planned-creation') !==
        creationViewportIds.has(action.id)) {
      return failure(
        'invalid-plan',
        'typed-reapply-creation-viewport-link-incoherent',
      )
    }
  }
  const representedWriteKeys = new Set([
    ...directWriteKeys,
    ...viewportWriteKeys,
    ...creationWriteKeys,
  ])
  const requiredWriteKeys = new Set(plan.fieldEffects
    .filter(({ aggregateWriteRequired }) => aggregateWriteRequired)
    .map(({ address }) => addressKey(address)))
  if (representedWriteKeys.size !== requiredWriteKeys.size ||
      [...requiredWriteKeys].some((key) => !representedWriteKeys.has(key))) {
    return failure(
      'invalid-plan',
      'typed-reapply-write-footprint-incomplete',
    )
  }
  const expectedWriteCount = plan.aggregateWrites.length +
    plan.objectCreationActions.length + viewportWriteKeys.size
  if (plan.semanticEffects.aggregateWriteCount !== expectedWriteCount ||
      plan.semanticEffects.objectCreationCount !==
        plan.objectCreationActions.length ||
      plan.semanticEffects.artworkViewportWriteCount !==
        viewportWriteKeys.size ||
      plan.semanticEffects.configurationEffect !== true) {
    return failure('invalid-plan', 'typed-reapply-effects-incoherent')
  }
  return deepFreezeCaseInsertPresetValue(cloneMutable(plan))
}

function reviewAcceptanceContent(plan: CaseInsertPresetTypedReapplyPlan) {
  return {
    kind: 'sbls/case-insert-preset-reapply-review-acceptance' as const,
    formatVersion: 1 as const,
    decision: 'accepted' as const,
    operation: 'reapply' as const,
    planIdentity: createCaseInsertPresetTypedReapplyPlanIdentity(plan),
    planReviewIdentity: plan.reviewIdentity,
    sourceConfigurationIdentity: plan.source.configurationIdentity,
    sourceCustomizationReportIdentity:
      plan.source.customizationReportIdentity,
    selectedPreset: {
      id: plan.preset.id,
      revision: plan.preset.selectedRevision,
    },
  }
}

export function createCaseInsertPresetTypedReapplyReviewAcceptance(
  plan: CaseInsertPresetTypedReapplyPlan,
): CaseInsertPresetTypedReapplyReviewAcceptance {
  const content = reviewAcceptanceContent(plan)
  return deepFreezeCaseInsertPresetValue({
    ...content,
    acceptanceIdentity:
      createCaseInsertPresetReapplyReviewAcceptanceIdentity(content),
  })
}

function consentAcceptanceContent(
  plan: CaseInsertPresetTypedReapplyPlan,
  requirement: CaseInsertPresetTypedReapplyMaterialConsentRequirement,
) {
  return {
    kind: 'sbls/case-insert-preset-reapply-consent-acceptance' as const,
    formatVersion: 1 as const,
    decision: 'accepted' as const,
    operation: 'reapply' as const,
    planIdentity: createCaseInsertPresetTypedReapplyPlanIdentity(plan),
    planReviewIdentity: plan.reviewIdentity,
    requirementId: requirement.id,
    requirement: cloneMutable(requirement),
  }
}

export function createCaseInsertPresetTypedReapplyConsentAcceptance(
  plan: CaseInsertPresetTypedReapplyPlan,
  requirement: CaseInsertPresetTypedReapplyMaterialConsentRequirement,
): CaseInsertPresetTypedReapplyConsentAcceptance {
  const content = consentAcceptanceContent(plan, requirement)
  return deepFreezeCaseInsertPresetValue({
    ...content,
    acceptanceIdentity:
      createCaseInsertPresetReapplyConsentAcceptanceIdentity(content),
  })
}

function validateAcceptances(
  plan: CaseInsertPresetTypedReapplyPlan,
  reviewAcceptance: unknown,
  materialConsentAcceptances: unknown,
): CaseInsertPresetTypedReapplyTransitionFailure | null {
  if (!sameCaseInsertPresetValue(
    reviewAcceptance,
    createCaseInsertPresetTypedReapplyReviewAcceptance(plan),
  )) return failure(
    reviewAcceptance === null || reviewAcceptance === undefined
      ? 'invalid-review-acceptance'
      : 'review-mismatch',
    'typed-reapply-review-acceptance-mismatch',
  )
  if (!Array.isArray(materialConsentAcceptances)) {
    return failure(
      'missing-material-consent',
      'typed-reapply-consent-set-invalid',
    )
  }
  if (materialConsentAcceptances.length !==
      plan.materialConsentRequirements.length) {
    return failure(
      materialConsentAcceptances.length >
          plan.materialConsentRequirements.length
        ? 'unexpected-material-consent'
        : 'missing-material-consent',
      'typed-reapply-consent-set-incomplete',
    )
  }
  const byId = new Map(plan.materialConsentRequirements.map((requirement) => [
    requirement.id,
    requirement,
  ]))
  const seen = new Set<string>()
  for (const acceptance of materialConsentAcceptances) {
    const id = isRecord(acceptance) &&
        typeof acceptance.requirementId === 'string'
      ? acceptance.requirementId
      : ''
    if (seen.has(id)) return failure(
      'duplicate-material-consent',
      'typed-reapply-consent-duplicate',
      { requirementId: id || undefined },
    )
    seen.add(id)
    const requirement = byId.get(id)
    if (!requirement || !sameCaseInsertPresetValue(
      acceptance,
      createCaseInsertPresetTypedReapplyConsentAcceptance(plan, requirement),
    )) return failure(
      'material-consent-mismatch',
      'typed-reapply-consent-mismatch',
      { requirementId: id || undefined },
    )
  }
  return null
}

function preflight(
  plan: CaseInsertPresetTypedReapplyPlan,
  configuration: CaseInsertViewportAppliedPresetConfiguration,
  report: Extract<
    CaseInsertPresetCustomizationReport,
    { formatVersion: typeof CASE_INSERT_PRESET_TYPED_CUSTOMIZATION_REPORT_VERSION }
  >,
  current: TransitionCaseInsertPresetTypedReapplyInput['current'],
): Readonly<{ aggregate: ProjectJewelCaseState }> |
  CaseInsertPresetTypedReapplyTransitionFailure {
  if (current.projectKind !== 'caseInsert' ||
      current.sessionId !== plan.source.sessionId ||
      current.projectRevision !== plan.source.projectRevision ||
      !sameCaseInsertPresetValue(current.template, plan.source.template) ||
      current.template.id !== configuration.template.id ||
      current.template.revision !== null) {
    return failure(
      'stale-reapply-plan',
      'typed-reapply-current-context-stale',
    )
  }
  let aggregate: ProjectJewelCaseState
  try {
    aggregate = normalizeProjectJewelCaseState(current.aggregate)
  } catch {
    return failure('attachment-context-mismatch', 'current-aggregate-invalid')
  }
  if (!sameCaseInsertPresetValue(aggregate, current.aggregate)) {
    return failure(
      'attachment-context-mismatch',
      'current-aggregate-not-normalized',
    )
  }
  const content = validateCaseInsertPresetAggregateContent(aggregate)
  if (!content.ok || content.aggregateContentIdentity !==
      plan.preconditions.aggregateContentIdentity) {
    return failure(
      'stale-reapply-plan',
      'typed-reapply-aggregate-content-stale',
    )
  }
  const fresh = detectCaseInsertPresetCustomization({
    configuration,
    current: {
      projectKind: 'caseInsert',
      aggregate,
      sessionId: current.sessionId,
      projectRevision: current.projectRevision,
      template: current.template,
    },
  })
  if (!fresh.ok || fresh.formatVersion !==
      CASE_INSERT_PRESET_TYPED_CUSTOMIZATION_REPORT_VERSION ||
      fresh.reportIdentity !== report.reportIdentity) {
    return failure(
      'stale-reapply-plan',
      fresh.ok ? 'typed-reapply-report-stale' : fresh.code,
    )
  }
  const reportByKey = new Map(report.fields.map((field) => [
    addressKey(field.address),
    field,
  ]))
  if (plan.preconditions.fields.length !== plan.fieldEffects.length) {
    return failure('invalid-plan', 'typed-reapply-precondition-incomplete')
  }
  for (const precondition of plan.preconditions.fields) {
    const field = reportByKey.get(addressKey(precondition.address))
    const effect = plan.fieldEffects.find((candidate) =>
      addressKey(candidate.address) === addressKey(precondition.address))
    if (!effect || effect.previousLastAppliedValue !== null &&
        (!field || !sameObservation(
          field.observation,
          precondition.observation,
        ))) return failure(
      'stale-reapply-plan',
      'typed-reapply-field-precondition-stale',
      { address: precondition.address },
    )
    if (field && !sameObservation(
      effect.currentObservation,
      field.observation,
    )) return failure(
      'invalid-plan',
      'typed-reapply-effect-observation-incoherent',
      { address: precondition.address },
    )
  }
  return { aggregate }
}

function transitionStatus(changed: boolean) {
  return changed
    ? 'reapplied' as const
    : 'reapplied-aggregate-semantic-no-op' as const
}

export function transitionCaseInsertPresetTypedReapply(
  input: TransitionCaseInsertPresetTypedReapplyInput,
): CaseInsertPresetTypedReapplyTransitionResult {
  if (!isRecord(input)) return failure('invalid-request', 'request-invalid')
  if (input.operation !== 'reapply') {
    return failure('unsupported-operation', 'operation-unsupported')
  }
  let planResult: ReturnType<typeof validatePlan>
  try {
    planResult = validatePlan(input.plan)
  } catch {
    return failure('invalid-plan', 'typed-reapply-plan-validation-failed')
  }
  if ('ok' in planResult && planResult.ok === false) return planResult
  const plan = planResult as CaseInsertPresetTypedReapplyPlan
  const configurationResult = validateCaseInsertAppliedPresetConfiguration(
    input.sourceConfiguration,
  )
  if (!configurationResult.ok) return failure(
    configurationResult.status === 'unsupported-configuration-version'
      ? 'unsupported-configuration-version'
      : 'invalid-source-configuration',
    configurationResult.code,
  )
  if (configurationResult.configuration.formatVersion !==
      CASE_INSERT_VIEWPORT_APPLIED_PRESET_CONFIGURATION_VERSION) {
    return failure(
      'unsupported-configuration-version',
      'typed-reapply-source-configuration-version-invalid',
    )
  }
  const configuration = configurationResult.configuration
  const reportResult = validateCaseInsertPresetCustomizationReport(
    input.customizationReport,
    configuration,
  )
  if (!reportResult.ok) return failure(
    reportResult.status === 'unsupported-report-version'
      ? 'unsupported-report-version'
      : reportResult.status === 'report-mismatch'
        ? 'report-mismatch'
        : 'invalid-customization-report',
    reportResult.code,
  )
  if (reportResult.report.formatVersion !==
      CASE_INSERT_PRESET_TYPED_CUSTOMIZATION_REPORT_VERSION) {
    return failure(
      'unsupported-report-version',
      'typed-reapply-report-version-invalid',
    )
  }
  const report = reportResult.report
  if (plan.source.configurationIdentity !==
      configuration.configurationIdentity ||
      plan.source.customizationReportIdentity !== report.reportIdentity ||
      plan.projectedConfiguration.sourceConfigurationIdentity !==
        configuration.configurationIdentity ||
      plan.projectedConfiguration.sourceCustomizationReportIdentity !==
        report.reportIdentity || plan.preset.id !== configuration.preset.id ||
      plan.preset.previousRevision !== configuration.preset.revision ||
      plan.preset.selectedRevision !== configuration.preset.revision ||
      plan.preset.source !== configuration.preset.source ||
      !sameCaseInsertPresetValue(
        plan.requestedScope,
        configuration.requestedScope,
      ) || !sameStringSet(
        plan.resolvedRegions,
        configuration.resolvedRegions,
      ) || !sameCaseInsertPresetValue(
        plan.projectedConfiguration.requestedScope,
        configuration.requestedScope,
      ) || !sameStringSet(
        plan.projectedConfiguration.resolvedRegions,
        configuration.resolvedRegions,
      ) || plan.projectedConfiguration.selectedPreset.id !==
        configuration.preset.id ||
      plan.projectedConfiguration.selectedPreset.revision !==
        configuration.preset.revision ||
      plan.projectedConfiguration.selectedPreset.source !==
        configuration.preset.source ||
      plan.source.projectKind !== report.current.projectKind ||
      plan.source.sessionId !== report.current.sessionId ||
      plan.source.projectRevision !== report.current.projectRevision ||
      !sameCaseInsertPresetValue(plan.source.template, report.current.template)) {
    return failure('configuration-mismatch', 'typed-reapply-lineage-mismatch')
  }
  const acceptanceFailure = validateAcceptances(
    plan,
    input.reviewAcceptance,
    input.materialConsentAcceptances,
  )
  if (acceptanceFailure) return acceptanceFailure
  const currentResult = preflight(plan, configuration, report, input.current)
  if ('ok' in currentResult && currentResult.ok === false) return currentResult
  const current = currentResult as Readonly<{ aggregate: ProjectJewelCaseState }>

  const directWrites: CaseInsertPresetAggregateLayoutWrite[] =
    plan.aggregateWrites.map((write) => ({
      id: write.id,
      kind: write.kind,
      featureOwnerId: write.address.featureOwnerId,
      bindingKind: write.address.bindingKind,
      bindingId: write.address.bindingId,
      runtimeObjectId: write.address.runtimeObjectId,
      fieldId: write.address.fieldId as
        CaseInsertPresetAggregateLayoutWrite['fieldId'],
      currentValuePrecondition: write.currentValuePrecondition,
      proposedValue: write.proposedValue,
    }))
  const directResult = applyCaseInsertPresetAggregateLayoutWrites(
    current.aggregate,
    directWrites,
  )
  if (!directResult.ok) return failure(
    directResult.status === 'target-missing' ||
        directResult.status === 'target-ambiguous' ||
        directResult.status === 'unsupported-action' ||
        directResult.status === 'unsupported-owned-field' ||
        directResult.status === 'invalid-current-value'
      ? directResult.status
      : 'transition-conflict',
    directResult.code,
  )
  const artworkResult = applyCaseInsertPresetReviewedArtworkActions({
    aggregate: directResult.aggregate,
    objectCreationActions: plan.objectCreationActions,
    artworkViewportActions: plan.artworkViewportActions,
  })
  if (!artworkResult.ok) return failure(
    artworkResult.status === 'target-missing' ||
        artworkResult.status === 'target-ambiguous' ||
        artworkResult.status === 'unsupported-action'
      ? artworkResult.status
      : 'transition-conflict',
    artworkResult.code,
  )
  const aggregateChanged = !sameCaseInsertPresetValue(
    current.aggregate,
    artworkResult.aggregate,
  )
  const status = transitionStatus(aggregateChanged)
  const planIdentity = createCaseInsertPresetTypedReapplyPlanIdentity(plan)
  const acceptedRequirementIds = plan.materialConsentRequirements
    .map(({ id }) => id).sort()
  const warningIds = plan.warnings.map(({ id }) => id).sort()
  const operationTransitionContent = {
    operation: 'reapply' as const,
    status,
    planIdentity,
    planReviewIdentity: plan.reviewIdentity,
    sourceConfigurationIdentity: configuration.configurationIdentity,
    sourceCustomizationReportIdentity: report.reportIdentity,
    reviewAcceptanceIdentity: input.reviewAcceptance.acceptanceIdentity,
    acceptedRequirementIds,
    current: {
      projectKind: 'caseInsert' as const,
      sessionId: input.current.sessionId,
      projectRevision: input.current.projectRevision,
      template: cloneMutable(input.current.template),
    },
    selectedPreset: cloneMutable(plan.projectedConfiguration.selectedPreset),
    aggregateWrites: cloneMutable(plan.aggregateWrites),
    objectCreationActions: cloneMutable(plan.objectCreationActions),
    artworkViewportActions: cloneMutable(plan.artworkViewportActions),
    nextOwnedFields: cloneMutable(plan.projectedConfiguration.ownedFields),
  }
  const operationTransitionIdentity =
    `${CASE_INSERT_PRESET_TYPED_REAPPLY_TRANSITION_IDENTITY_PREFIX}${
      createCaseInsertPresetDeterministicIdentityDigest(
        operationTransitionContent,
      )
    }`
  const configurationContent: Omit<
    CaseInsertViewportAppliedPresetConfiguration,
    'configurationIdentity'
  > = {
    kind: CASE_INSERT_APPLIED_PRESET_CONFIGURATION_KIND,
    formatVersion: CASE_INSERT_VIEWPORT_APPLIED_PRESET_CONFIGURATION_VERSION,
    domainStatus: 'validated-authoritative',
    attachmentStatus: 'detached-uninstalled',
    firstApply: cloneMutable(configuration.firstApply),
    reapply: {
      operation: 'reapply',
      transitionStatus: status,
      transitionIdentity: operationTransitionIdentity,
      sourceConfigurationIdentity: configuration.configurationIdentity,
      sourceCustomizationReportIdentity: report.reportIdentity,
      reviewAcceptanceIdentity: input.reviewAcceptance.acceptanceIdentity,
      previousPresetRevision: configuration.preset.revision,
    },
    preset: cloneMutable(plan.projectedConfiguration.selectedPreset),
    requestedScope: cloneMutable(plan.requestedScope),
    resolvedRegions: [...plan.resolvedRegions],
    template: { id: input.current.template.id, revision: null },
    reviewedPlanIdentity: plan.reviewIdentity,
    source: {
      projectKind: 'caseInsert',
      snapshotIdentity: {
        sessionId: input.current.sessionId,
        projectRevision: input.current.projectRevision,
        template: { id: input.current.template.id, revision: null },
        aggregateContentIdentity:
          plan.preconditions.aggregateContentIdentity,
      },
    },
    ownedFields: plan.projectedConfiguration.ownedFields.map((field) => ({
      address: cloneMutable(field.address),
      lastAppliedValue: cloneMutable(field.lastAppliedValue),
      sources: cloneMutable(field.sources),
    })),
    reviewedWarningIds: warningIds,
    acceptedMaterialConsentRequirementIds: acceptedRequirementIds,
  }
  const nextCandidate = deepFreezeCaseInsertPresetValue({
    ...configurationContent,
    configurationIdentity:
      createCaseInsertAppliedPresetConfigurationIdentity(configurationContent),
  })
  const nextResult = validateCaseInsertAppliedPresetConfiguration(nextCandidate)
  if (!nextResult.ok || nextResult.configuration.formatVersion !==
      CASE_INSERT_VIEWPORT_APPLIED_PRESET_CONFIGURATION_VERSION ||
      nextResult.configuration.reapply === null) {
    return failure(
      'configuration-validation-failed',
      nextResult.ok ? 'typed-reapply-successor-version-invalid' :
        nextResult.code,
    )
  }
  const nextConfiguration = nextResult.configuration
  const presenceOwnedObjects = new Set(nextConfiguration.ownedFields
    .filter(({ address }) => address.fieldId === 'object-presence')
    .map(({ address }) => [
      address.featureOwnerId,
      address.bindingKind,
      address.bindingId,
      address.runtimeObjectId,
    ].join('\u0000')))
  for (const field of nextConfiguration.ownedFields) {
    const binding = resolveCaseInsertPresetAggregateBinding(
      artworkResult.aggregate,
      field.address.featureOwnerId,
      { kind: field.address.bindingKind, id: field.address.bindingId },
    )
    const projected = plan.projectedConfiguration.ownedFields.find((candidate) =>
      addressKey(candidate.address) === addressKey(field.address))!
    if (binding.status === 'missing' &&
        projected.expectedCustomizationStatus === 'customized' &&
        presenceOwnedObjects.has([
      field.address.featureOwnerId,
      field.address.bindingKind,
      field.address.bindingId,
      field.address.runtimeObjectId,
    ].join('\u0000'))) continue
    if (binding.status !== 'found' ||
        binding.currentState.id !== field.address.runtimeObjectId) {
      return failure(
        'configuration-validation-failed',
        'typed-reapply-successor-target-incoherent',
        { address: field.address },
      )
    }
    const currentValue = getCaseInsertPresetTypedOwnedFieldCurrentValue(
      binding.currentState,
      field.address,
    )
    if (projected.expectedCustomizationStatus === 'clean' &&
        !sameCaseInsertPresetValue(currentValue, field.lastAppliedValue)) {
      return failure(
        'configuration-validation-failed',
        'typed-reapply-successor-value-incoherent',
        { address: field.address },
      )
    }
  }
  const sourceAggregate = deepFreezeCaseInsertPresetValue(
    cloneMutable(current.aggregate),
  )
  const sourceContent = validateCaseInsertPresetAggregateContent(sourceAggregate)
  const resultContent = validateCaseInsertPresetAggregateContent(
    artworkResult.aggregate,
  )
  if (!sourceContent.ok || !resultContent.ok) return failure(
    'configuration-validation-failed',
    'typed-reapply-aggregate-content-identity-unavailable',
  )
  const successEvidence = createCaseInsertPresetTransitionSuccessEvidence({
    operation: 'reapply',
    transitionStatus: status,
    context: {
      projectKind: 'caseInsert',
      sessionId: input.current.sessionId,
      projectRevision: input.current.projectRevision,
      template: { id: input.current.template.id, revision: null },
      snapshotAggregateContentIdentity:
        plan.preconditions.aggregateContentIdentity,
    },
    lineage: {
      planIdentity,
      planReviewIdentity: plan.reviewIdentity,
      reviewAcceptanceIdentity: input.reviewAcceptance.acceptanceIdentity,
      materialConsentAcceptanceIdentities:
        input.materialConsentAcceptances.map(({ acceptanceIdentity }) =>
          acceptanceIdentity),
      operationTransitionIdentity,
    },
    sourceAggregateContentIdentity: sourceContent.aggregateContentIdentity,
    resultAggregateContentIdentity: resultContent.aggregateContentIdentity,
    sourceAttachment: createCaseInsertPresetAttachedEndpoint(
      configuration.configurationIdentity,
    ),
    successorAttachment: createCaseInsertPresetAttachedEndpoint(
      nextConfiguration.configurationIdentity,
    ),
    sourceConfigurationIdentity: configuration.configurationIdentity,
    successorConfigurationIdentity: nextConfiguration.configurationIdentity,
    configurationReleaseIdentity: null,
    applicationAdoptionStatus: 'not-adopted',
  })
  return deepFreezeCaseInsertPresetValue({
    ok: true,
    status,
    transitionIdentity: successEvidence.transitionIdentity,
    formatVersion: 1,
    operation: 'reapply',
    sourceAggregate,
    sourceConfiguration: configuration,
    aggregate: artworkResult.aggregate,
    nextConfiguration,
    successEvidence,
    applicationAdoptionStatus: 'not-adopted',
  })
}
