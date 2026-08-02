import {
  CASE_INSERT_PRESET_ASSIGNMENT_SNAPSHOT_KIND,
  isCaseInsertPresetAssignmentSnapshot,
  resolveCaseInsertPresetSnapshotBinding,
  type CaseInsertPresetAssignmentSnapshot,
  type CaseInsertPresetAssignmentSnapshotIdentity,
  type CaseInsertPresetSnapshotObjectState,
} from '../caseInsert/presetAssignmentSnapshot.ts'
import {
  isCaseInsertPresetAggregateContentIdentity,
  validateCaseInsertPresetAggregateContent,
} from '../caseInsert/presetAggregateIdentity.ts'
import { normalizeProjectJewelCaseState } from '../caseInsert/normalization.ts'
import type { ProjectJewelCaseState } from '../project/projectTypes.ts'
import { caseInsertTemplates } from '../templates/caseInsertTemplates.ts'
import {
  CASE_INSERT_PRESET_CONCRETE_REGION_IDS,
  CASE_INSERT_PRESET_OWNER_IDS,
  CASE_INSERT_PRESET_ROLE_IDS,
  getCaseInsertPresetApplicationScopeKey,
  isCaseInsertPresetCoordinateBasisAllowed,
  isCaseInsertPresetId,
  parseCaseInsertPresetApplicationScope,
  type CaseInsertPresetApplicationScope,
  type CaseInsertPresetConcreteRegionId,
  type CaseInsertPresetOwnerId,
} from './caseInsertPresetDefinition.ts'
import {
  CASE_INSERT_PRESET_APPLY_PLAN_FORMAT_VERSION,
  CASE_INSERT_PRESET_APPLY_PLAN_KIND,
  getCaseInsertPresetPlanOwnerRule,
  type CaseInsertPresetApplyPlan,
  type CaseInsertPresetApplyPlanningResult,
  type CaseInsertPresetPlanFieldAction,
  type CaseInsertPresetPlanFieldId,
  type CaseInsertPresetPlanSourceAssignment,
} from './caseInsertPresetApplyPlanning.ts'
import {
  createCaseInsertPresetApplyPlanReviewIdentity,
  createCaseInsertPresetMaterialConsentRequirementId,
  createCaseInsertPresetPlanWarningIdentity,
} from './caseInsertPresetApplyReviewIdentity.ts'
import {
  createCaseInsertPresetAttachedEndpoint,
  createCaseInsertPresetUnattachedEndpoint,
  isCaseInsertPresetAttachmentEndpoint,
  type CaseInsertPresetAttachmentEndpoint,
} from './caseInsertPresetAttachmentEndpoint.ts'
import {
  CASE_INSERT_PRESET_APPLIED_CONFIGURATION_CANDIDATE_KIND,
  CASE_INSERT_PRESET_APPLIED_CONFIGURATION_CANDIDATE_VERSION,
  type CaseInsertPresetAppliedConfigurationCandidate,
  type ImmutableProjectJewelCaseState,
} from './caseInsertPresetApplyCandidate.ts'
import {
  applyCaseInsertPresetAggregateLayoutWrites,
  type CaseInsertPresetAggregateLayoutWrite,
} from './caseInsertPresetAggregateFieldTransition.ts'
import {
  validateCaseInsertAppliedPresetConfiguration,
  validateCaseInsertAppliedPresetConfigurationCandidate,
  type CaseInsertAppliedPresetConfiguration,
} from './caseInsertPresetAppliedConfiguration.ts'
import {
  encodeCaseInsertPresetDeterministicIdentity,
} from './caseInsertPresetReapplyIdentity.ts'
import {
  createCaseInsertPresetTransitionSuccessEvidence,
  type CaseInsertPresetTransitionSuccessEvidence,
} from './caseInsertPresetTransitionSuccessIdentity.ts'
import {
  cloneCaseInsertPresetPlainInput,
  deepFreezeCaseInsertPresetValue,
  hasExactCaseInsertPresetKeys,
  sameCaseInsertPresetValue,
} from './caseInsertPresetSafeInput.ts'

export const CASE_INSERT_PRESET_APPLY_REVIEW_APPROVAL_KIND =
  'sbls/case-insert-preset-apply-review-approval' as const
export const CASE_INSERT_PRESET_MATERIAL_CONSENT_ACCEPTANCE_KIND =
  'sbls/case-insert-preset-material-consent-acceptance' as const
export const CASE_INSERT_PRESET_APPLY_TRANSITION_SUCCESS_VERSION = 1 as const

export {
  CASE_INSERT_PRESET_APPLIED_CONFIGURATION_CANDIDATE_KIND,
  CASE_INSERT_PRESET_APPLIED_CONFIGURATION_CANDIDATE_VERSION,
  type CaseInsertPresetAppliedConfigurationCandidate,
  type ImmutableProjectJewelCaseState,
} from './caseInsertPresetApplyCandidate.ts'

export type CaseInsertPresetApplyReviewApproval = Readonly<{
  kind: typeof CASE_INSERT_PRESET_APPLY_REVIEW_APPROVAL_KIND
  decision: 'approved'
  planReviewIdentity: string
}>

export type CaseInsertPresetMaterialConsentAcceptance = Readonly<{
  kind: typeof CASE_INSERT_PRESET_MATERIAL_CONSENT_ACCEPTANCE_KIND
  decision: 'accepted'
  planReviewIdentity: string
  requirementId: `case:preset-consent:${string}`
  category: 'multiple-concrete-regions'
  regions: readonly CaseInsertPresetConcreteRegionId[]
  assignmentIds: readonly `case:preset-assignment:${string}`[]
}>

export type CaseInsertPresetAttachmentAssertion =
  CaseInsertPresetAttachmentEndpoint

export type ApplyCaseInsertPresetFirstTimeInput = Readonly<{
  planningResult: CaseInsertPresetApplyPlanningResult
  source: Readonly<{
    projectKind: 'caseInsert'
    aggregate: ProjectJewelCaseState
    snapshotIdentity: CaseInsertPresetAssignmentSnapshotIdentity
    preset: Readonly<{
      id: CaseInsertPresetApplyPlan['preset']['id']
      revision: number
    }>
    requestedScope: CaseInsertPresetApplicationScope
  }>
  attachment: CaseInsertPresetAttachmentAssertion
  reviewApproval: CaseInsertPresetApplyReviewApproval | null
  materialConsentAcceptances:
    readonly CaseInsertPresetMaterialConsentAcceptance[]
}>

type FailureCode = Readonly<{
  ok: false
  status:
    | 'review-required'
    | 'review-mismatch'
    | 'consent-incomplete'
    | 'consent-mismatch'
    | 'stale-plan'
    | 'precondition-failed'
    | 'target-missing'
    | 'target-ambiguous'
    | 'invalid-plan'
    | 'invalid-source-aggregate'
    | 'incompatible-source-aggregate'
    | 'already-attached'
    | 'unsupported-plan-version'
    | 'unsupported-operation'
    | 'unsupported-action'
    | 'transition-conflict'
    | 'configuration-validation-failed'
  code: string
  details?: Readonly<Record<string, unknown>>
}>

export type CaseInsertPresetApplyTransitionResult =
  | Readonly<{
      ok: true
      status: 'applied' | 'applied-semantic-no-op'
      formatVersion: typeof CASE_INSERT_PRESET_APPLY_TRANSITION_SUCCESS_VERSION
      operation: 'apply'
      transitionIdentity: string
      sourceAggregate: ImmutableProjectJewelCaseState
      aggregate: ImmutableProjectJewelCaseState
      configurationCandidate: CaseInsertPresetAppliedConfigurationCandidate
      successorConfiguration: CaseInsertAppliedPresetConfiguration
      successEvidence: CaseInsertPresetTransitionSuccessEvidence
      applicationAdoptionStatus: 'not-adopted'
    }>
  | FailureCode

declare const CASE_INSERT_PRESET_VALIDATED_APPLY_SUCCESS: unique symbol

export type ValidatedCaseInsertPresetApplyTransitionSuccess = Extract<
  CaseInsertPresetApplyTransitionResult,
  { ok: true }
> & Readonly<{
  [CASE_INSERT_PRESET_VALIDATED_APPLY_SUCCESS]: true
}>

export type CaseInsertPresetApplyTransitionSuccessValidationResult =
  | Readonly<{
      ok: true
      status: 'validated'
      success: ValidatedCaseInsertPresetApplyTransitionSuccess
    }>
  | Readonly<{
      ok: false
      status:
        | 'invalid-transition-success'
        | 'unsupported-transition-success-version'
        | 'transition-success-identity-mismatch'
        | 'transition-lineage-mismatch'
        | 'source-aggregate-mismatch'
        | 'result-aggregate-mismatch'
        | 'source-attachment-mismatch'
        | 'successor-attachment-mismatch'
        | 'configuration-identity-mismatch'
        | 'application-adoption-status-mismatch'
      code: string
    }>

const REGION_SET = new Set<string>(CASE_INSERT_PRESET_CONCRETE_REGION_IDS)
const OWNER_SET = new Set<string>(CASE_INSERT_PRESET_OWNER_IDS)
const ROLE_SET = new Set<string>(CASE_INSERT_PRESET_ROLE_IDS)
const BINDING_STATUS_SET = new Set([
  'resolved',
  'resolved-disabled',
  'missing-optional',
])
const PRESERVATION_CATEGORY_SET = new Set([
  'image-bytes',
  'image-provenance',
  'text-content',
  'rich-text-content',
  'metadata-source-and-manual-override',
  'branding-selection-and-custom-assets',
  'enablement-and-disabled-payload',
  'repeated-object-identity',
  'frame-material-and-style',
  'fit-crop-and-rotation',
  'untargeted-object-fields',
  'owners-outside-requested-scope',
])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNonNegativeSafeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}

function isPositiveSafeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isDeeplyFrozen(value: unknown): boolean {
  if (value === null || typeof value !== 'object') return true
  return Object.isFrozen(value) && Object.values(value).every(isDeeplyFrozen)
}

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
  const leftKeys = Object.keys(left).sort()
  const rightKeys = Object.keys(right).sort()
  return leftKeys.length === rightKeys.length &&
    leftKeys.every((key, index) =>
      key === rightKeys[index] && sameValue(left[key], right[key]))
}

function sameStringArray(left: unknown, right: readonly string[]) {
  return Array.isArray(left) && left.length === right.length &&
    left.every((value, index) => value === right[index])
}

function sameStringSet(left: readonly string[], right: readonly string[]) {
  return left.length === right.length &&
    left.every((value) => right.includes(value))
}

function failure(
  status: FailureCode['status'],
  code: string,
  details?: Readonly<Record<string, unknown>>,
): FailureCode {
  return deepFreeze({
    ok: false,
    status,
    code,
    ...(details ? { details: cloneMutable(details) } : {}),
  })
}

function isSnapshotIdentity(
  value: unknown,
): value is CaseInsertPresetAssignmentSnapshotIdentity {
  if (!isRecord(value) || !isRecord(value.template)) return false
  return typeof value.sessionId === 'string' && value.sessionId.trim().length > 0 &&
    isNonNegativeSafeInteger(value.projectRevision) &&
    typeof value.template.id === 'string' && value.template.id.trim().length > 0 &&
    value.template.revision === null &&
    isCaseInsertPresetAggregateContentIdentity(
      value.aggregateContentIdentity,
    )
}

function staleDimensions(
  actual: CaseInsertPresetAssignmentSnapshotIdentity,
  expected: CaseInsertPresetAssignmentSnapshotIdentity,
) {
  const dimensions: string[] = []
  if (actual.sessionId !== expected.sessionId) dimensions.push('session-id')
  if (actual.projectRevision !== expected.projectRevision) {
    dimensions.push('project-revision')
  }
  if (actual.template.id !== expected.template.id) dimensions.push('template-id')
  if (actual.template.revision !== expected.template.revision) {
    dimensions.push('template-revision')
  }
  if (actual.aggregateContentIdentity !== expected.aggregateContentIdentity) {
    dimensions.push('aggregate-content')
  }
  return dimensions
}

function actionKindMatchesField(action: CaseInsertPresetPlanFieldAction) {
  return (action.kind === 'set-layout-x' && action.fieldId === 'layout-x') ||
    (action.kind === 'set-layout-y' && action.fieldId === 'layout-y') ||
    (action.kind === 'set-layout-scale' && action.fieldId === 'layout-scale') ||
    (action.kind === 'set-layout-width' && action.fieldId === 'layout-width')
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

function validatePlan(
  planningResult: CaseInsertPresetApplyPlanningResult,
): Readonly<{
  ok: true
  planningStatus: 'planned' | 'semantic-no-op'
  plan: CaseInsertPresetApplyPlan
}> | FailureCode {
  if (!isRecord(planningResult) || !isDeeplyFrozen(planningResult) ||
      planningResult.ok !== true ||
      (planningResult.status !== 'planned' &&
        planningResult.status !== 'semantic-no-op') ||
      !isRecord(planningResult.plan)) {
    return failure('invalid-plan', 'planner-result-not-executable')
  }

  const plan = planningResult.plan as CaseInsertPresetApplyPlan
  if (plan.kind !== CASE_INSERT_PRESET_APPLY_PLAN_KIND) {
    return failure('invalid-plan', 'plan-kind-invalid')
  }
  if (plan.formatVersion !== CASE_INSERT_PRESET_APPLY_PLAN_FORMAT_VERSION) {
    return failure('unsupported-plan-version', 'plan-version-unsupported', {
      formatVersion: plan.formatVersion,
    })
  }
  if (plan.operation !== 'apply' || plan.identity?.operation !== 'apply') {
    return failure('unsupported-operation', 'operation-unsupported', {
      operation: plan.operation,
    })
  }
  if (!Array.isArray(plan.blockers) || plan.blockers.length > 0) {
    return failure('invalid-plan', 'plan-has-blockers')
  }
  if (!isRecord(plan.identity) || !isRecord(plan.preset) ||
      !isRecord(plan.source) || !isSnapshotIdentity(plan.source.snapshotIdentity) ||
      !isRecord(plan.preconditions) ||
      !isSnapshotIdentity({
        sessionId: plan.preconditions.sessionId,
        projectRevision: plan.preconditions.projectRevision,
        template: plan.preconditions.template,
        aggregateContentIdentity:
          plan.preconditions.aggregateContentIdentity,
      }) ||
      plan.source.projectKind !== 'caseInsert' ||
      plan.preconditions.projectKind !== 'caseInsert' ||
      !isCaseInsertPresetId(plan.preset.id) ||
      !isPositiveSafeInteger(plan.preset.revision) ||
      !isCaseInsertPresetId(plan.preconditions.preset?.id) ||
      !isPositiveSafeInteger(plan.preconditions.preset?.revision) ||
      (plan.preset.source !== 'builtin' && plan.preset.source !== 'user') ||
      (plan.preset.source === 'builtin') !== plan.preset.id.startsWith('builtin:') ||
      !isSnapshotIdentity(plan.source.snapshotIdentity)) {
    return failure('invalid-plan', 'plan-identity-invalid')
  }

  const parsedScope = parseCaseInsertPresetApplicationScope(plan.requestedScope)
  if (!parsedScope.ok) return failure('invalid-plan', 'plan-scope-invalid')
  const scopeKey = getCaseInsertPresetApplicationScopeKey(parsedScope.value)
  const identityMismatch = plan.identity.presetId !== plan.preset.id ||
    plan.identity.presetRevision !== plan.preset.revision ||
    plan.identity.sessionId !== plan.source.snapshotIdentity.sessionId ||
    plan.identity.projectRevision !== plan.source.snapshotIdentity.projectRevision ||
    plan.identity.scopeKey !== scopeKey ||
    plan.preconditions.sessionId !== plan.identity.sessionId ||
    plan.preconditions.projectRevision !== plan.identity.projectRevision ||
    plan.preconditions.template.id !== plan.source.snapshotIdentity.template.id ||
    plan.preconditions.template.revision !==
      plan.source.snapshotIdentity.template.revision ||
    plan.preconditions.aggregateContentIdentity !==
      plan.source.snapshotIdentity.aggregateContentIdentity ||
    plan.preconditions.preset.id !== plan.preset.id ||
    plan.preconditions.preset.revision !== plan.preset.revision ||
    plan.preconditions.scopeKey !== scopeKey
  if (identityMismatch) return failure('invalid-plan', 'plan-identity-incoherent')

  if (!Array.isArray(plan.resolvedRegions) || plan.resolvedRegions.length === 0 ||
      new Set(plan.resolvedRegions).size !== plan.resolvedRegions.length ||
      plan.resolvedRegions.some((region) => !REGION_SET.has(region)) ||
      !sameStringArray(plan.preconditions.resolvedRegions, plan.resolvedRegions)) {
    return failure('invalid-plan', 'plan-regions-invalid')
  }

  if (!Array.isArray(plan.assignments) || plan.assignments.length === 0 ||
      !Array.isArray(plan.fieldActions) ||
      !Array.isArray(plan.fieldFootprint) ||
      !Array.isArray(plan.preservationDecisions) ||
      !Array.isArray(plan.skips) || !Array.isArray(plan.warnings) ||
      !Array.isArray(plan.materialConsentRequirements) ||
      !isRecord(plan.semanticNoOp)) {
    return failure('invalid-plan', 'plan-collections-invalid')
  }

  const assignmentById = new Map<string, CaseInsertPresetApplyPlan['assignments'][number]>()
  for (const assignment of plan.assignments) {
    const rule = getCaseInsertPresetPlanOwnerRule(assignment.ownerId)
    if (!assignment.assignmentId?.startsWith('case:preset-assignment:') ||
        !assignment.slotId?.startsWith('case:preset-slot:') ||
        assignmentById.has(assignment.assignmentId) ||
        !ROLE_SET.has(assignment.roleId) || !OWNER_SET.has(assignment.ownerId) ||
        !REGION_SET.has(assignment.region) || !rule ||
        rule.region !== assignment.region ||
        assignment.objectId !== assignment.object?.bindingId ||
        (assignment.object.bindingKind !== 'fixed' &&
          assignment.object.bindingKind !== 'repeated') ||
        typeof assignment.object.bindingId !== 'string' ||
        !BINDING_STATUS_SET.has(assignment.bindingStatus) ||
        !Array.isArray(assignment.fieldActionIds) ||
        !Array.isArray(assignment.preservationDecisionIds)) {
      return failure('invalid-plan', 'assignment-invalid')
    }
    const isMissing = assignment.bindingStatus === 'missing-optional'
    if (isMissing !== (assignment.object.runtimeId === null) ||
        isMissing !== (assignment.expectedEnablement === null) ||
        isMissing !== (assignment.skip !== null)) {
      return failure('invalid-plan', 'assignment-presence-incoherent')
    }
    if (!isMissing) {
      const enablement = assignment.expectedEnablement
      if (!enablement || typeof enablement.objectEnabled !== 'boolean' ||
          (enablement.ownerEnabled !== null &&
            typeof enablement.ownerEnabled !== 'boolean') ||
          typeof enablement.effectiveEnabled !== 'boolean' ||
          enablement.effectiveEnabled !==
            (enablement.objectEnabled && enablement.ownerEnabled !== false) ||
          (assignment.bindingStatus === 'resolved') !==
            enablement.effectiveEnabled ||
          typeof assignment.object.runtimeId !== 'string' ||
          assignment.object.runtimeId.length === 0) {
        return failure('invalid-plan', 'assignment-enablement-incoherent')
      }
    }
    assignmentById.set(assignment.assignmentId, assignment)
  }
  const assignmentRegions = [
    ...new Set(plan.assignments.map(({ region }) => region)),
  ]
  if (!sameStringSet(plan.resolvedRegions, assignmentRegions)) {
    return failure('invalid-plan', 'assignment-regions-incoherent')
  }

  const actionIds = new Set<string>()
  const actionTargetValues = new Map<string, number>()
  for (const unknownAction of plan.fieldActions as readonly unknown[]) {
    if (!isRecord(unknownAction) ||
        !['set-layout-x', 'set-layout-y', 'set-layout-scale', 'set-layout-width']
          .includes(String(unknownAction.kind))) {
      return failure('unsupported-action', 'field-action-unsupported', {
        actionId: isRecord(unknownAction) ? unknownAction.id : null,
      })
    }
    const action = unknownAction as CaseInsertPresetPlanFieldAction
    if (typeof action.id !== 'string' ||
        !OWNER_SET.has(action.featureOwnerId) ||
        !actionKindMatchesField(action) ||
        !ownerAllowsField(action.featureOwnerId, action.fieldId) ||
        !isRecord(action.object) ||
        (action.object.bindingKind !== 'fixed' &&
          action.object.bindingKind !== 'repeated') ||
        !action.object.bindingId || !action.object.runtimeId ||
        (action.currentValue !== null && !isFiniteNumber(action.currentValue)) ||
        !isFiniteNumber(action.proposedValue) ||
        ((action.fieldId === 'layout-scale' ||
          action.fieldId === 'layout-width') && action.proposedValue <= 0) ||
        (action.currentValue === null && action.fieldId !== 'layout-width') ||
        action.semanticNoOp !==
          (action.currentValue !== null &&
            action.currentValue === action.proposedValue) ||
        action.preservationClassification !== 'layout-only-preserve-content' ||
        action.consentClassification !== 'ordinary-reviewed-layout' ||
        !Array.isArray(action.sources) || action.sources.length === 0) {
      return failure('invalid-plan', 'field-action-invalid', { actionId: action.id })
    }
    const expectedActionId = [
      'case:preset-field-action',
      action.featureOwnerId,
      action.object.runtimeId,
      action.fieldId,
    ].join(':')
    if (action.id !== expectedActionId) {
      return failure('invalid-plan', 'field-action-id-invalid', { actionId: action.id })
    }
    const targetKey = [
      action.featureOwnerId,
      action.object.runtimeId,
      action.fieldId,
    ].join('\u0000')
    const existingValue = actionTargetValues.get(targetKey)
    if (existingValue !== undefined && existingValue !== action.proposedValue) {
      return failure('transition-conflict', 'divergent-field-actions', {
        actionId: action.id,
      })
    }
    if (existingValue !== undefined) {
      return failure('invalid-plan', 'uncoalesced-identical-field-actions', {
        actionId: action.id,
      })
    }
    if (actionIds.has(action.id)) {
      return failure('invalid-plan', 'duplicate-field-action-id', {
        actionId: action.id,
      })
    }
    actionTargetValues.set(targetKey, action.proposedValue)
    actionIds.add(action.id)

    const sourceIds = new Set<string>()
    for (const source of action.sources) {
      const assignment = assignmentById.get(source.assignmentId)
      if (!assignment || sourceIds.has(source.assignmentId) ||
          source.presetId !== plan.preset.id ||
          source.presetRevision !== plan.preset.revision ||
          source.slotId !== assignment.slotId ||
          source.roleId !== assignment.roleId ||
          source.region !== assignment.region ||
          !isCaseInsertPresetCoordinateBasisAllowed(
            source.region,
            source.coordinateBasis,
          ) ||
          source.ownerId !== assignment.ownerId ||
          source.ownerId !== action.featureOwnerId ||
          source.object.bindingKind !== assignment.object.bindingKind ||
          source.object.bindingId !== assignment.object.bindingId ||
          source.object.runtimeId !== assignment.object.runtimeId ||
          source.object.runtimeId !== action.object.runtimeId ||
          source.declaredPolicy !== 'normalized-content-region-direct-layout-v1') {
        return failure('invalid-plan', 'field-action-provenance-invalid', {
          actionId: action.id,
        })
      }
      sourceIds.add(source.assignmentId)
    }
  }

  if (plan.fieldFootprint.length !== plan.fieldActions.length) {
    return failure('invalid-plan', 'field-footprint-count-mismatch')
  }
  for (let index = 0; index < plan.fieldActions.length; index += 1) {
    const action = plan.fieldActions[index]!
    const footprint = plan.fieldFootprint[index]
    if (!footprint || footprint.featureOwnerId !== action.featureOwnerId ||
        footprint.runtimeObjectId !== action.object.runtimeId ||
        footprint.fieldId !== action.fieldId ||
        footprint.acceptedValueCandidate !== action.proposedValue ||
        !sameStringArray(
          footprint.sourceAssignmentIds,
          action.sources.map(
            ({ assignmentId }: CaseInsertPresetPlanSourceAssignment) =>
              assignmentId,
          ),
        )) {
      return failure('invalid-plan', 'field-footprint-incoherent')
    }
  }

  const skipByAssignment = new Map(plan.skips.map((skip) => [skip.assignmentId, skip]))
  if (skipByAssignment.size !== plan.skips.length) {
    return failure('invalid-plan', 'duplicate-skip')
  }
  const preservationIds = new Set<string>()
  for (const decision of plan.preservationDecisions) {
    if (!decision.id || preservationIds.has(decision.id) ||
        decision.classification !== 'preserved' ||
        !PRESERVATION_CATEGORY_SET.has(decision.category) ||
        (decision.assignmentId !== null &&
          !assignmentById.has(decision.assignmentId)) ||
        !isRecord(decision.evidence) ||
        typeof decision.evidence.present !== 'boolean') {
      return failure('invalid-plan', 'preservation-decision-invalid')
    }
    preservationIds.add(decision.id)
  }
  for (const assignment of plan.assignments) {
    const expectedActionIds = plan.fieldActions
      .filter(({ sources }) => sources.some(
        ({ assignmentId }: CaseInsertPresetPlanSourceAssignment) =>
          assignmentId === assignment.assignmentId,
      ))
      .map(({ id }) => id)
    const expectedPreservationIds = plan.preservationDecisions
      .filter(({ assignmentId }) => assignmentId === assignment.assignmentId)
      .map(({ id }) => id)
    const skip = skipByAssignment.get(assignment.assignmentId) ?? null
    if (!sameStringArray(assignment.fieldActionIds, expectedActionIds) ||
        !sameStringArray(assignment.preservationDecisionIds, expectedPreservationIds) ||
        !sameValue(assignment.skip, skip) ||
        (assignment.bindingStatus === 'missing-optional' &&
          (assignment.fieldActionIds.length > 0 || !skip)) ||
        (assignment.bindingStatus !== 'missing-optional' &&
          assignment.fieldActionIds.length === 0) ||
        (skip && (skip.kind !== 'missing-optional-target' ||
          skip.assignmentId !== assignment.assignmentId ||
          skip.slotId !== assignment.slotId || skip.region !== assignment.region ||
          skip.ownerId !== assignment.ownerId ||
          skip.objectId !== assignment.object.bindingId))) {
      return failure('invalid-plan', 'assignment-summary-incoherent')
    }
    const expectedNoOp = expectedActionIds.length === 0 || plan.fieldActions
      .filter(({ id }) => expectedActionIds.includes(id))
      .every(({ semanticNoOp }) => semanticNoOp)
    if (assignment.semanticNoOp !== expectedNoOp) {
      return failure('invalid-plan', 'assignment-no-op-incoherent')
    }
  }

  const changed = plan.fieldActions.filter(({ semanticNoOp }) => !semanticNoOp).length
  if (plan.semanticNoOp.fieldActionCount !== plan.fieldActions.length ||
      plan.semanticNoOp.changedFieldActionCount !== changed ||
      plan.semanticNoOp.noOpFieldActionCount !== plan.fieldActions.length - changed ||
      plan.semanticNoOp.aggregate !== (changed === 0) ||
      (planningResult.status === 'semantic-no-op') !== plan.semanticNoOp.aggregate) {
    return failure('invalid-plan', 'semantic-no-op-incoherent')
  }

  const warningIds = new Set<string>()
  try {
    for (const warning of plan.warnings) {
      const warningId = createCaseInsertPresetPlanWarningIdentity(warning)
      if (warningIds.has(warningId)) {
        return failure('invalid-plan', 'duplicate-warning')
      }
      warningIds.add(warningId)
    }
  } catch {
    return failure('invalid-plan', 'warning-invalid')
  }

  const requirementIds = new Set<string>()
  for (const requirement of plan.materialConsentRequirements) {
    if (requirement.kind !== 'multiple-concrete-regions' ||
        !Array.isArray(requirement.regions) ||
        !Array.isArray(requirement.assignmentIds) ||
        requirement.regions.length < 2 ||
        requirement.regions.some(
          (region: CaseInsertPresetConcreteRegionId) =>
            !plan.resolvedRegions.includes(region),
        ) ||
        requirement.assignmentIds.some(
          (id: `case:preset-assignment:${string}`) => !assignmentById.has(id),
        ) ||
        requirement.id !== createCaseInsertPresetMaterialConsentRequirementId(
          requirement,
        ) || requirementIds.has(requirement.id)) {
      return failure('invalid-plan', 'material-consent-requirement-invalid')
    }
    requirementIds.add(requirement.id)
  }

  return {
    ok: true,
    planningStatus: planningResult.status,
    plan,
  }
}

function validateReview(
  plan: CaseInsertPresetApplyPlan,
  approval: CaseInsertPresetApplyReviewApproval | null,
) {
  if (approval === null) {
    return failure('review-required', 'review-approval-missing')
  }
  let expectedIdentity: string
  try {
    expectedIdentity = createCaseInsertPresetApplyPlanReviewIdentity(plan)
  } catch {
    return failure('review-mismatch', 'review-identity-unavailable')
  }
  if (!isRecord(approval) ||
      approval.kind !== CASE_INSERT_PRESET_APPLY_REVIEW_APPROVAL_KIND ||
      approval.decision !== 'approved' ||
      plan.reviewIdentity !== expectedIdentity ||
      approval.planReviewIdentity !== expectedIdentity) {
    return failure('review-mismatch', 'review-plan-mismatch')
  }
  return null
}

function validateConsent(
  plan: CaseInsertPresetApplyPlan,
  acceptances: readonly CaseInsertPresetMaterialConsentAcceptance[],
) {
  if (!Array.isArray(acceptances)) {
    return failure('consent-mismatch', 'consent-records-invalid')
  }
  const requirementById = new Map(
    plan.materialConsentRequirements.map((requirement) =>
      [requirement.id, requirement] as const),
  )
  const acceptedIds = new Set<string>()
  for (const acceptance of acceptances) {
    if (!isRecord(acceptance) ||
        acceptance.kind !== CASE_INSERT_PRESET_MATERIAL_CONSENT_ACCEPTANCE_KIND ||
        acceptance.decision !== 'accepted' ||
        acceptance.planReviewIdentity !== plan.reviewIdentity ||
        typeof acceptance.requirementId !== 'string' ||
        acceptedIds.has(acceptance.requirementId)) {
      return failure('consent-mismatch', 'consent-record-invalid')
    }
    const requirement = requirementById.get(
      acceptance.requirementId as `case:preset-consent:${string}`,
    )
    if (!requirement || acceptance.category !== requirement.kind ||
        !sameStringArray(acceptance.regions, requirement.regions) ||
        !sameStringArray(acceptance.assignmentIds, requirement.assignmentIds)) {
      return failure('consent-mismatch', 'consent-requirement-mismatch', {
        requirementId: acceptance.requirementId,
      })
    }
    acceptedIds.add(acceptance.requirementId)
  }
  const missing = [...requirementById.keys()].filter((id) => !acceptedIds.has(id))
  return missing.length > 0
    ? failure('consent-incomplete', 'material-consent-missing', {
        requirementIds: missing,
      })
    : null
}

function currentFieldValue(
  target: CaseInsertPresetSnapshotObjectState,
  fieldId: CaseInsertPresetPlanFieldId,
) {
  switch (fieldId) {
    case 'layout-x': return target.layout.x
    case 'layout-y': return target.layout.y
    case 'layout-scale': return target.layout.scale
    case 'layout-width': return target.layout.width ?? null
  }
}

function createCurrentSnapshot(
  aggregate: ProjectJewelCaseState,
  identity: CaseInsertPresetAssignmentSnapshotIdentity,
): CaseInsertPresetAssignmentSnapshot | null {
  const snapshot = deepFreeze({
    kind: CASE_INSERT_PRESET_ASSIGNMENT_SNAPSHOT_KIND,
    identity: cloneMutable(identity),
    caseInsert: cloneMutable(aggregate),
  })
  return isCaseInsertPresetAssignmentSnapshot(snapshot) ? snapshot : null
}

function preflightTargets(
  plan: CaseInsertPresetApplyPlan,
  snapshot: CaseInsertPresetAssignmentSnapshot,
) {
  for (const assignment of plan.assignments) {
    const binding = resolveCaseInsertPresetSnapshotBinding(
      snapshot,
      assignment.ownerId,
      {
        kind: assignment.object.bindingKind,
        id: assignment.object.bindingId,
      },
    )
    if (assignment.bindingStatus === 'missing-optional') {
      if (binding.status === 'ambiguous') {
        return failure('target-ambiguous', 'optional-target-became-ambiguous', {
          assignmentId: assignment.assignmentId,
        })
      }
      if (binding.status !== 'missing') {
        return failure('precondition-failed', 'optional-target-presence-changed', {
          assignmentId: assignment.assignmentId,
        })
      }
      continue
    }
    if (binding.status === 'missing') {
      return failure('target-missing', 'exact-target-missing', {
        assignmentId: assignment.assignmentId,
      })
    }
    if (binding.status === 'ambiguous') {
      return failure('target-ambiguous', 'exact-target-ambiguous', {
        assignmentId: assignment.assignmentId,
        matches: binding.matches,
      })
    }
    if (binding.status !== 'found' ||
        binding.currentState.id !== assignment.object.runtimeId) {
      return failure('precondition-failed', 'exact-target-address-changed', {
        assignmentId: assignment.assignmentId,
      })
    }
    if (!sameValue(binding.enablement, assignment.expectedEnablement)) {
      return failure('precondition-failed', 'target-enablement-changed', {
        assignmentId: assignment.assignmentId,
      })
    }
  }

  for (const action of plan.fieldActions) {
    const binding = resolveCaseInsertPresetSnapshotBinding(
      snapshot,
      action.featureOwnerId,
      { kind: action.object.bindingKind, id: action.object.bindingId },
    )
    if (binding.status !== 'found' ||
        binding.currentState.id !== action.object.runtimeId) {
      return failure(
        binding.status === 'ambiguous' ? 'target-ambiguous' : 'target-missing',
        'action-target-unavailable',
        { actionId: action.id },
      )
    }
    if (currentFieldValue(binding.currentState, action.fieldId) !==
        action.currentValue) {
      return failure('precondition-failed', 'action-current-value-changed', {
        actionId: action.id,
        fieldId: action.fieldId,
      })
    }
  }
  return null
}

function buildConfigurationCandidate(
  plan: CaseInsertPresetApplyPlan,
  acceptedConsentIds: readonly `case:preset-consent:${string}`[],
): CaseInsertPresetAppliedConfigurationCandidate {
  return deepFreeze({
    kind: CASE_INSERT_PRESET_APPLIED_CONFIGURATION_CANDIDATE_KIND,
    formatVersion: CASE_INSERT_PRESET_APPLIED_CONFIGURATION_CANDIDATE_VERSION,
    installationStatus: 'candidate-uninstalled',
    operation: 'apply',
    preset: { ...plan.preset },
    requestedScope: cloneMutable(plan.requestedScope),
    resolvedRegions: [...plan.resolvedRegions],
    template: { ...plan.preconditions.template },
    reviewedPlanIdentity: plan.reviewIdentity,
    sourceSnapshotIdentity: cloneMutable(plan.source.snapshotIdentity),
    ownedFields: plan.fieldActions.map((action) => ({
      featureOwnerId: action.featureOwnerId,
      object: { ...action.object },
      fieldId: action.fieldId,
      lastAppliedValue: action.proposedValue,
      sources: action.sources.map((source) => ({
        ...source,
        object: { ...source.object },
      })),
    })),
    reviewedWarningIds: plan.warnings.map(
      createCaseInsertPresetPlanWarningIdentity,
    ),
    acceptedMaterialConsentRequirementIds: [...acceptedConsentIds],
  })
}

export function createCaseInsertPresetApplyReviewApproval(
  plan: CaseInsertPresetApplyPlan,
): CaseInsertPresetApplyReviewApproval {
  return deepFreeze({
    kind: CASE_INSERT_PRESET_APPLY_REVIEW_APPROVAL_KIND,
    decision: 'approved',
    planReviewIdentity: createCaseInsertPresetApplyPlanReviewIdentity(plan),
  })
}

export function createCaseInsertPresetMaterialConsentAcceptance(
  plan: CaseInsertPresetApplyPlan,
  requirementId: string,
): CaseInsertPresetMaterialConsentAcceptance | null {
  const requirement = plan.materialConsentRequirements.find(
    ({ id }) => id === requirementId,
  )
  if (!requirement) return null
  return deepFreeze({
    kind: CASE_INSERT_PRESET_MATERIAL_CONSENT_ACCEPTANCE_KIND,
    decision: 'accepted',
    planReviewIdentity: createCaseInsertPresetApplyPlanReviewIdentity(plan),
    requirementId: requirement.id,
    category: requirement.kind,
    regions: [...requirement.regions],
    assignmentIds: [...requirement.assignmentIds],
  })
}

export function applyCaseInsertPresetFirstTime(
  input: ApplyCaseInsertPresetFirstTimeInput,
): CaseInsertPresetApplyTransitionResult {
  let validated: ReturnType<typeof validatePlan>
  try {
    validated = validatePlan(input.planningResult)
  } catch {
    return failure('invalid-plan', 'plan-validation-failed')
  }
  if (!validated.ok) return validated
  const { plan, planningStatus } = validated

  const reviewFailure = validateReview(plan, input.reviewApproval)
  if (reviewFailure) return reviewFailure
  const consentFailure = validateConsent(
    plan,
    input.materialConsentAcceptances,
  )
  if (consentFailure) return consentFailure

  if (!isCaseInsertPresetAttachmentEndpoint(input.attachment)) {
    return failure('invalid-source-aggregate', 'attachment-assertion-invalid')
  }
  if (input.attachment.status === 'attached') {
    return failure('already-attached', 'preset-configuration-already-attached', {
      configurationIdentity: input.attachment.configurationIdentity,
    })
  }

  if (!isRecord(input.source) || input.source.projectKind !== 'caseInsert') {
    return failure(
      'incompatible-source-aggregate',
      'source-project-kind-incompatible',
    )
  }
  if (!isSnapshotIdentity(input.source.snapshotIdentity)) {
    return failure('invalid-source-aggregate', 'source-snapshot-identity-invalid')
  }
  const stale = staleDimensions(
    input.source.snapshotIdentity,
    plan.source.snapshotIdentity,
  )
  if (stale.length > 0) {
    return failure('stale-plan', 'source-snapshot-stale', { dimensions: stale })
  }
  const scope = parseCaseInsertPresetApplicationScope(input.source.requestedScope)
  if (!scope.ok ||
      getCaseInsertPresetApplicationScopeKey(scope.value) !==
        plan.preconditions.scopeKey ||
      input.source.preset.id !== plan.preconditions.preset.id ||
      input.source.preset.revision !== plan.preconditions.preset.revision) {
    return failure('precondition-failed', 'source-plan-context-mismatch')
  }

  if (!isRecord(input.source.aggregate)) {
    return failure('invalid-source-aggregate', 'source-aggregate-invalid')
  }
  let normalized: ProjectJewelCaseState
  try {
    normalized = normalizeProjectJewelCaseState(input.source.aggregate)
  } catch {
    return failure('invalid-source-aggregate', 'source-normalization-failed')
  }
  if (!sameValue(input.source.aggregate, normalized)) {
    return failure('invalid-source-aggregate', 'source-aggregate-not-normalized')
  }
  const aggregateContent = validateCaseInsertPresetAggregateContent(normalized)
  if (!aggregateContent.ok || aggregateContent.aggregateContentIdentity !==
      input.source.snapshotIdentity.aggregateContentIdentity) {
    return failure(
      'invalid-source-aggregate',
      'source-aggregate-identity-mismatch',
    )
  }
  if (!caseInsertTemplates[normalized.templateType] ||
      normalized.templateType !== plan.preconditions.template.id) {
    return failure(
      'incompatible-source-aggregate',
      'source-template-incompatible',
    )
  }

  const snapshot = createCurrentSnapshot(normalized, input.source.snapshotIdentity)
  if (!snapshot) {
    return failure('invalid-source-aggregate', 'source-snapshot-invalid')
  }
  const targetFailure = preflightTargets(plan, snapshot)
  if (targetFailure) return targetFailure

  const writes: CaseInsertPresetAggregateLayoutWrite[] = plan.fieldActions
    .map((action) => ({
      id: action.id,
      kind: action.kind,
      featureOwnerId: action.featureOwnerId,
      bindingKind: action.object.bindingKind,
      bindingId: action.object.bindingId,
      runtimeObjectId: action.object.runtimeId,
      fieldId: action.fieldId,
      currentValuePrecondition: action.currentValue,
      proposedValue: action.proposedValue,
    }))
  const fieldTransition = applyCaseInsertPresetAggregateLayoutWrites(
    normalized,
    writes,
  )
  if (!fieldTransition.ok) {
    const status = fieldTransition.status === 'target-missing' ||
        fieldTransition.status === 'target-ambiguous'
      ? fieldTransition.status
      : fieldTransition.status === 'unsupported-action' ||
          fieldTransition.status === 'unsupported-owned-field'
        ? 'unsupported-action'
        : 'transition-conflict'
    return failure(status, fieldTransition.code, {
      actionId: fieldTransition.writeId,
    })
  }
  const normalizedResult = fieldTransition.aggregate as ProjectJewelCaseState

  const acceptedConsentIds = plan.materialConsentRequirements.map(({ id }) => id)
  const configurationCandidate = buildConfigurationCandidate(
    plan,
    acceptedConsentIds,
  )
  const aggregate = deepFreeze(cloneMutable(normalizedResult))
  const status = planningStatus === 'semantic-no-op'
    ? 'applied-semantic-no-op' as const
    : 'applied' as const
  const candidateResult = deepFreeze({
    ok: true as const,
    status,
    aggregate,
    configurationCandidate,
  })
  const validatedConfiguration =
    validateCaseInsertAppliedPresetConfigurationCandidate(candidateResult)
  if (!validatedConfiguration.ok) {
    return failure(
      'configuration-validation-failed',
      validatedConfiguration.code,
    )
  }
  const sourceAggregate = deepFreeze(cloneMutable(normalized))
  const sourceAggregateContent = validateCaseInsertPresetAggregateContent(
    sourceAggregate,
  )
  const resultAggregateContent = validateCaseInsertPresetAggregateContent(
    aggregate,
  )
  if (!sourceAggregateContent.ok || !resultAggregateContent.ok) {
    return failure(
      'configuration-validation-failed',
      'aggregate-content-identity-unavailable',
    )
  }
  const planIdentity = `case:preset-apply-plan:v2:${
    encodeCaseInsertPresetDeterministicIdentity(plan)
  }`
  const reviewAcceptanceIdentity =
    `case:preset-apply-review-acceptance:v1:${
      encodeCaseInsertPresetDeterministicIdentity(input.reviewApproval)
    }`
  const materialConsentAcceptanceIdentities =
    input.materialConsentAcceptances.map((acceptance) =>
      `case:preset-apply-consent-acceptance:v1:${
        encodeCaseInsertPresetDeterministicIdentity(acceptance)
      }`)
  const successorConfiguration = validatedConfiguration.configuration
  const successEvidence = createCaseInsertPresetTransitionSuccessEvidence({
    operation: 'apply',
    transitionStatus: status,
    context: {
      projectKind: 'caseInsert',
      sessionId: input.source.snapshotIdentity.sessionId,
      projectRevision: input.source.snapshotIdentity.projectRevision,
      template: cloneMutable(input.source.snapshotIdentity.template),
      snapshotAggregateContentIdentity:
        input.source.snapshotIdentity.aggregateContentIdentity,
    },
    lineage: {
      planIdentity,
      planReviewIdentity: plan.reviewIdentity,
      reviewAcceptanceIdentity,
      materialConsentAcceptanceIdentities,
      operationTransitionIdentity: null,
    },
    sourceAggregateContentIdentity:
      sourceAggregateContent.aggregateContentIdentity,
    resultAggregateContentIdentity:
      resultAggregateContent.aggregateContentIdentity,
    sourceAttachment: createCaseInsertPresetUnattachedEndpoint(),
    successorAttachment: createCaseInsertPresetAttachedEndpoint(
      successorConfiguration.configurationIdentity,
    ),
    sourceConfigurationIdentity: null,
    successorConfigurationIdentity:
      successorConfiguration.configurationIdentity,
    configurationReleaseIdentity: null,
    applicationAdoptionStatus: 'not-adopted',
  })
  return deepFreeze({
    ok: true,
    status,
    formatVersion: CASE_INSERT_PRESET_APPLY_TRANSITION_SUCCESS_VERSION,
    operation: 'apply' as const,
    transitionIdentity: successEvidence.transitionIdentity,
    sourceAggregate,
    aggregate,
    configurationCandidate,
    successorConfiguration,
    successEvidence,
    applicationAdoptionStatus: 'not-adopted' as const,
  })
}

function applySuccessValidationFailure(
  status: Exclude<
    CaseInsertPresetApplyTransitionSuccessValidationResult,
    { ok: true }
  >['status'],
  code: string,
): CaseInsertPresetApplyTransitionSuccessValidationResult {
  return Object.freeze({ ok: false, status, code })
}

export function validateCaseInsertPresetApplyTransitionSuccess(
  value: unknown,
): CaseInsertPresetApplyTransitionSuccessValidationResult {
  const cloned = cloneCaseInsertPresetPlainInput(value)
  if (!cloned.ok || !isRecord(cloned.value)) {
    return applySuccessValidationFailure(
      'invalid-transition-success',
      cloned.ok ? 'apply-success-root-invalid' : cloned.code,
    )
  }
  const success = cloned.value
  if (success.operation === 'apply' && success.formatVersion !==
      CASE_INSERT_PRESET_APPLY_TRANSITION_SUCCESS_VERSION) {
    return applySuccessValidationFailure(
      'unsupported-transition-success-version',
      'apply-success-version-unsupported',
    )
  }
  if (!hasExactCaseInsertPresetKeys(success, [
    'ok', 'status', 'formatVersion', 'operation', 'transitionIdentity',
    'sourceAggregate', 'aggregate', 'configurationCandidate',
    'successorConfiguration', 'successEvidence',
    'applicationAdoptionStatus',
  ]) || success.ok !== true || success.operation !== 'apply' ||
      success.formatVersion !==
        CASE_INSERT_PRESET_APPLY_TRANSITION_SUCCESS_VERSION ||
      (success.status !== 'applied' &&
        success.status !== 'applied-semantic-no-op')) {
    return applySuccessValidationFailure(
      'invalid-transition-success',
      'apply-success-shape-invalid',
    )
  }
  if (success.applicationAdoptionStatus !== 'not-adopted') {
    return applySuccessValidationFailure(
      'application-adoption-status-mismatch',
      'apply-success-adoption-status-invalid',
    )
  }
  const sourceAggregate = validateCaseInsertPresetAggregateContent(
    success.sourceAggregate,
  )
  if (!sourceAggregate.ok) {
    return applySuccessValidationFailure(
      'source-aggregate-mismatch',
      sourceAggregate.code,
    )
  }
  const resultAggregate = validateCaseInsertPresetAggregateContent(
    success.aggregate,
  )
  if (!resultAggregate.ok) {
    return applySuccessValidationFailure(
      'result-aggregate-mismatch',
      resultAggregate.code,
    )
  }

  const frozenCandidateInput = deepFreezeCaseInsertPresetValue({
    ok: true as const,
    status: success.status,
    aggregate: resultAggregate.aggregate,
    configurationCandidate: success.configurationCandidate,
  }) as unknown as Parameters<
    typeof validateCaseInsertAppliedPresetConfigurationCandidate
  >[0]
  const promoted = validateCaseInsertAppliedPresetConfigurationCandidate(
    frozenCandidateInput,
  )
  if (!promoted.ok) {
    return applySuccessValidationFailure(
      'configuration-identity-mismatch',
      promoted.code,
    )
  }
  const successor = validateCaseInsertAppliedPresetConfiguration(
    deepFreezeCaseInsertPresetValue(success.successorConfiguration),
  )
  if (!successor.ok || !sameCaseInsertPresetValue(
    successor.ok ? successor.configuration : null,
    promoted.configuration,
  )) {
    return applySuccessValidationFailure(
      'configuration-identity-mismatch',
      successor.ok
        ? 'apply-successor-configuration-mismatch'
        : successor.code,
    )
  }
  if (!isRecord(success.successEvidence) ||
      !hasExactCaseInsertPresetKeys(success.successEvidence, [
        'kind', 'formatVersion', 'operation', 'transitionResultVersion',
        'transitionStatus', 'context', 'lineage',
        'sourceAggregateContentIdentity', 'resultAggregateContentIdentity',
        'sourceAttachment', 'successorAttachment',
        'sourceConfigurationIdentity', 'successorConfigurationIdentity',
        'configurationReleaseIdentity', 'applicationAdoptionStatus',
        'transitionIdentity', 'wholeSuccessIdentity',
      ])) {
    return applySuccessValidationFailure(
      'invalid-transition-success',
      'apply-success-evidence-shape-invalid',
    )
  }
  const evidence = success.successEvidence as unknown as
    CaseInsertPresetTransitionSuccessEvidence
  if (!isRecord(evidence.context) || !isRecord(evidence.lineage) ||
      !isCaseInsertPresetAttachmentEndpoint(evidence.sourceAttachment) ||
      !isCaseInsertPresetAttachmentEndpoint(evidence.successorAttachment) ||
      evidence.sourceAttachment.status !== 'unattached') {
    return applySuccessValidationFailure(
      'source-attachment-mismatch',
      'apply-source-attachment-not-authoritative-absence',
    )
  }
  if (evidence.successorAttachment.status !== 'attached' ||
      evidence.successorAttachment.configurationIdentity !==
        promoted.configuration.configurationIdentity ||
      evidence.successorConfigurationIdentity !==
        promoted.configuration.configurationIdentity ||
      evidence.sourceConfigurationIdentity !== null ||
      evidence.configurationReleaseIdentity !== null) {
    return applySuccessValidationFailure(
      'successor-attachment-mismatch',
      'apply-successor-attachment-incoherent',
    )
  }
  if (typeof evidence.lineage.planIdentity !== 'string' ||
      !evidence.lineage.planIdentity.startsWith('case:preset-apply-plan:v2:') ||
      typeof evidence.lineage.planReviewIdentity !== 'string' ||
      !evidence.lineage.planReviewIdentity.startsWith(
        'case:preset-apply-review:v1:',
      ) || typeof evidence.lineage.reviewAcceptanceIdentity !== 'string' ||
      !evidence.lineage.reviewAcceptanceIdentity.startsWith(
        'case:preset-apply-review-acceptance:v1:',
      ) || !Array.isArray(
        evidence.lineage.materialConsentAcceptanceIdentities,
      ) || evidence.lineage.planReviewIdentity !==
        promoted.configuration.reviewedPlanIdentity ||
      evidence.lineage.operationTransitionIdentity !== null ||
      evidence.lineage.materialConsentAcceptanceIdentities.some(
        (identity) => typeof identity !== 'string' || !identity.startsWith(
          'case:preset-apply-consent-acceptance:v1:',
        ),
      )) {
    return applySuccessValidationFailure(
      'transition-lineage-mismatch',
      'apply-success-lineage-invalid',
    )
  }
  if (evidence.operation !== 'apply' ||
      evidence.transitionStatus !== success.status ||
      evidence.applicationAdoptionStatus !== 'not-adopted' ||
      evidence.context.projectKind !== 'caseInsert' ||
      evidence.context.sessionId !==
        promoted.configuration.source.snapshotIdentity.sessionId ||
      evidence.context.projectRevision !==
        promoted.configuration.source.snapshotIdentity.projectRevision ||
      !sameCaseInsertPresetValue(
        evidence.context.template,
        promoted.configuration.source.snapshotIdentity.template,
      ) || evidence.context.snapshotAggregateContentIdentity !==
        promoted.configuration.source.snapshotIdentity
          .aggregateContentIdentity ||
      evidence.sourceAggregateContentIdentity !==
        sourceAggregate.aggregateContentIdentity ||
      evidence.resultAggregateContentIdentity !==
        resultAggregate.aggregateContentIdentity ||
      sourceAggregate.aggregateContentIdentity !==
        evidence.context.snapshotAggregateContentIdentity) {
    return applySuccessValidationFailure(
      'source-aggregate-mismatch',
      'apply-success-aggregate-context-incoherent',
    )
  }
  const expectedEvidence = createCaseInsertPresetTransitionSuccessEvidence({
    operation: 'apply',
    transitionStatus: success.status,
    context: evidence.context,
    lineage: evidence.lineage,
    sourceAggregateContentIdentity:
      sourceAggregate.aggregateContentIdentity,
    resultAggregateContentIdentity:
      resultAggregate.aggregateContentIdentity,
    sourceAttachment: evidence.sourceAttachment,
    successorAttachment: evidence.successorAttachment,
    sourceConfigurationIdentity: null,
    successorConfigurationIdentity:
      promoted.configuration.configurationIdentity,
    configurationReleaseIdentity: null,
    applicationAdoptionStatus: 'not-adopted',
  })
  if (!sameCaseInsertPresetValue(evidence, expectedEvidence) ||
      success.transitionIdentity !== expectedEvidence.transitionIdentity) {
    return applySuccessValidationFailure(
      'transition-success-identity-mismatch',
      'apply-whole-success-identity-invalid',
    )
  }

  return deepFreezeCaseInsertPresetValue({
    ok: true,
    status: 'validated' as const,
    success: deepFreezeCaseInsertPresetValue(success) as unknown as
      ValidatedCaseInsertPresetApplyTransitionSuccess,
  })
}
