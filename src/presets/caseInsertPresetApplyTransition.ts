import {
  CASE_INSERT_PRESET_ASSIGNMENT_SNAPSHOT_KIND,
  isCaseInsertPresetAssignmentSnapshot,
  resolveCaseInsertPresetSnapshotBinding,
  type CaseInsertPresetAssignmentSnapshot,
  type CaseInsertPresetAssignmentSnapshotIdentity,
  type CaseInsertPresetSnapshotObjectState,
} from '../caseInsert/presetAssignmentSnapshot.ts'
import { normalizeProjectJewelCaseState } from '../caseInsert/normalization.ts'
import type {
  ProjectCaseInsertImageSlot,
  ProjectCaseInsertTextBlock,
  ProjectCaseInsertTextList,
  ProjectJewelCaseState,
} from '../project/projectTypes.ts'
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

export const CASE_INSERT_PRESET_APPLY_REVIEW_APPROVAL_KIND =
  'sbls/case-insert-preset-apply-review-approval' as const
export const CASE_INSERT_PRESET_MATERIAL_CONSENT_ACCEPTANCE_KIND =
  'sbls/case-insert-preset-material-consent-acceptance' as const
export const CASE_INSERT_PRESET_APPLIED_CONFIGURATION_CANDIDATE_KIND =
  'sbls/case-insert-preset-applied-configuration-candidate' as const
export const CASE_INSERT_PRESET_APPLIED_CONFIGURATION_CANDIDATE_VERSION = 1 as const

type DeepReadonly<T> = T extends readonly (infer Item)[]
  ? readonly DeepReadonly<Item>[]
  : T extends object
    ? { readonly [Key in keyof T]: DeepReadonly<T[Key]> }
    : T

export type ImmutableProjectJewelCaseState =
  DeepReadonly<ProjectJewelCaseState>

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
  | Readonly<{ status: 'unattached' }>
  | Readonly<{
      status: 'attached'
      configurationIdentity: string
    }>

export type CaseInsertPresetAppliedConfigurationCandidate = Readonly<{
  kind: typeof CASE_INSERT_PRESET_APPLIED_CONFIGURATION_CANDIDATE_KIND
  formatVersion: typeof CASE_INSERT_PRESET_APPLIED_CONFIGURATION_CANDIDATE_VERSION
  installationStatus: 'candidate-uninstalled'
  operation: 'apply'
  preset: Readonly<{
    id: CaseInsertPresetApplyPlan['preset']['id']
    revision: number
    source: 'builtin' | 'user'
  }>
  requestedScope: CaseInsertPresetApplicationScope
  resolvedRegions: readonly CaseInsertPresetConcreteRegionId[]
  template: Readonly<{ id: string; revision: null }>
  reviewedPlanIdentity: string
  sourceSnapshotIdentity: CaseInsertPresetAssignmentSnapshotIdentity
  ownedFields: readonly Readonly<{
    featureOwnerId: CaseInsertPresetOwnerId
    object: CaseInsertPresetPlanSourceAssignment['object']
    fieldId: CaseInsertPresetPlanFieldId
    lastAppliedValue: number
    sources: readonly CaseInsertPresetPlanSourceAssignment[]
  }>[]
  reviewedWarningIds: readonly string[]
  acceptedMaterialConsentRequirementIds:
    readonly `case:preset-consent:${string}`[]
}>

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
  code: string
  details?: Readonly<Record<string, unknown>>
}>

export type CaseInsertPresetApplyTransitionResult =
  | Readonly<{
      ok: true
      status: 'applied' | 'applied-semantic-no-op'
      aggregate: ImmutableProjectJewelCaseState
      configurationCandidate: CaseInsertPresetAppliedConfigurationCandidate
    }>
  | FailureCode

type CaseInsertPresetMutableObject =
  | ProjectCaseInsertImageSlot
  | ProjectCaseInsertTextBlock
  | ProjectCaseInsertTextList

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
    value.template.revision === null
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

function getMutableOwnerItems(
  aggregate: ProjectJewelCaseState,
  ownerId: CaseInsertPresetOwnerId,
): CaseInsertPresetMutableObject[] {
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

function writeField(
  target: CaseInsertPresetMutableObject,
  action: CaseInsertPresetPlanFieldAction,
) {
  switch (action.kind) {
    case 'set-layout-x': target.layout.x = action.proposedValue; return
    case 'set-layout-y': target.layout.y = action.proposedValue; return
    case 'set-layout-scale': target.layout.scale = action.proposedValue; return
    case 'set-layout-width': target.layout.width = action.proposedValue; return
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

  if (!isRecord(input.attachment) ||
      (input.attachment.status !== 'unattached' &&
        input.attachment.status !== 'attached')) {
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

  const draft = cloneMutable(normalized)
  for (const action of plan.fieldActions) {
    const matches = getMutableOwnerItems(draft, action.featureOwnerId)
      .filter(({ id }) => id === action.object.runtimeId)
    if (matches.length !== 1) {
      return failure(
        matches.length > 1 ? 'target-ambiguous' : 'target-missing',
        'draft-target-unavailable',
        { actionId: action.id },
      )
    }
    writeField(matches[0]!, action)
  }

  let normalizedResult: ProjectJewelCaseState
  try {
    normalizedResult = normalizeProjectJewelCaseState(draft)
  } catch {
    return failure('invalid-plan', 'result-normalization-failed')
  }
  if (!sameValue(draft, normalizedResult)) {
    return failure('invalid-plan', 'result-not-canonically-normalized')
  }
  for (const action of plan.fieldActions) {
    const matches = getMutableOwnerItems(normalizedResult, action.featureOwnerId)
      .filter(({ id }) => id === action.object.runtimeId)
    if (matches.length !== 1 ||
        currentFieldValue(matches[0]!, action.fieldId) !== action.proposedValue) {
      return failure('transition-conflict', 'result-verification-failed', {
        actionId: action.id,
      })
    }
  }

  const acceptedConsentIds = plan.materialConsentRequirements.map(({ id }) => id)
  const configurationCandidate = buildConfigurationCandidate(
    plan,
    acceptedConsentIds,
  )
  const aggregate = deepFreeze(cloneMutable(normalizedResult))
  return deepFreeze({
    ok: true,
    status: planningStatus === 'semantic-no-op'
      ? 'applied-semantic-no-op'
      : 'applied',
    aggregate,
    configurationCandidate,
  })
}
