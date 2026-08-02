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
  CASE_INSERT_APPLIED_PRESET_CONFIGURATION_KIND,
  CASE_INSERT_REAPPLIED_PRESET_CONFIGURATION_VERSION,
  createCaseInsertAppliedPresetConfigurationIdentity,
  getCaseInsertPresetOwnedFieldCurrentValue,
  isCaseInsertPresetOwnedFieldSemanticValue,
  validateCaseInsertAppliedPresetConfiguration,
  validateCaseInsertPresetCustomizationReport,
  type CaseInsertAppliedPresetConfiguration,
  type CaseInsertAppliedPresetOwnedFieldAddress,
  type CaseInsertPresetCustomizationReport,
  type CaseInsertReappliedPresetConfiguration,
} from './caseInsertPresetAppliedConfiguration.ts'
import type { CaseInsertPresetPlanSourceAssignment } from './caseInsertPresetApplyPlanning.ts'
import {
  CASE_INSERT_PRESET_REAPPLY_CONFIGURATION_PROJECTION_KIND,
  CASE_INSERT_PRESET_REAPPLY_PLAN_FORMAT_VERSION,
  CASE_INSERT_PRESET_REAPPLY_PLAN_KIND,
  createCaseInsertPresetReapplyConsentAcceptanceIdentity,
  createCaseInsertPresetReapplyConsentRequirementId,
  createCaseInsertPresetReapplyPlanIdentity,
  createCaseInsertPresetReapplyReviewAcceptanceIdentity,
  createCaseInsertPresetReapplyReviewIdentity,
  createCaseInsertPresetReapplyTransitionIdentity,
  createCaseInsertPresetReapplyWarningIdentity,
  canonicalizeCaseInsertPresetReapplyConsentRequirement,
  canonicalizeCaseInsertPresetReapplyPlanContent,
  encodeCaseInsertPresetDeterministicIdentity,
} from './caseInsertPresetReapplyIdentity.ts'
import type {
  CaseInsertPresetReapplyFieldEffect,
  CaseInsertPresetReapplyMaterialConsentRequirement,
  CaseInsertPresetReapplyPlan,
} from './caseInsertPresetReapplyPlanning.ts'
import {
  createCaseInsertPresetAttachedEndpoint,
  isCaseInsertPresetAttachmentEndpoint,
} from './caseInsertPresetAttachmentEndpoint.ts'
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

export const CASE_INSERT_PRESET_REAPPLY_TRANSITION_SUCCESS_VERSION = 1 as const

export const CASE_INSERT_PRESET_REAPPLY_REVIEW_ACCEPTANCE_KIND =
  'sbls/case-insert-preset-reapply-review-acceptance' as const
export const CASE_INSERT_PRESET_REAPPLY_REVIEW_ACCEPTANCE_VERSION = 1 as const
export const CASE_INSERT_PRESET_REAPPLY_CONSENT_ACCEPTANCE_KIND =
  'sbls/case-insert-preset-reapply-consent-acceptance' as const
export const CASE_INSERT_PRESET_REAPPLY_CONSENT_ACCEPTANCE_VERSION = 1 as const

export type CaseInsertPresetReapplyReviewAcceptance = Readonly<{
  kind: typeof CASE_INSERT_PRESET_REAPPLY_REVIEW_ACCEPTANCE_KIND
  formatVersion: typeof CASE_INSERT_PRESET_REAPPLY_REVIEW_ACCEPTANCE_VERSION
  decision: 'accepted'
  operation: 'reapply'
  planIdentity: string
  planReviewIdentity: string
  sourceConfigurationIdentity: string
  sourceCustomizationReportIdentity: string
  selectedPreset: Readonly<{ id: string; revision: number }>
  acceptanceIdentity: string
}>

export type CaseInsertPresetReapplyConsentAcceptance = Readonly<{
  kind: typeof CASE_INSERT_PRESET_REAPPLY_CONSENT_ACCEPTANCE_KIND
  formatVersion: typeof CASE_INSERT_PRESET_REAPPLY_CONSENT_ACCEPTANCE_VERSION
  decision: 'accepted'
  operation: 'reapply'
  planIdentity: string
  planReviewIdentity: string
  requirementId: string
  requirement: CaseInsertPresetReapplyMaterialConsentRequirement
  acceptanceIdentity: string
}>

export type TransitionCaseInsertPresetReapplyInput = Readonly<{
  operation: 'reapply'
  plan: CaseInsertPresetReapplyPlan
  sourceConfiguration: CaseInsertAppliedPresetConfiguration
  customizationReport: CaseInsertPresetCustomizationReport
  reviewAcceptance: CaseInsertPresetReapplyReviewAcceptance
  materialConsentAcceptances:
    readonly CaseInsertPresetReapplyConsentAcceptance[]
  current: Readonly<{
    projectKind: string
    aggregate: ProjectJewelCaseState
    sessionId: string
    projectRevision: number
    template: Readonly<{ id: string; revision: number | null }>
  }>
}>

export type CaseInsertPresetReapplyTransitionFailureStatus =
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

export type CaseInsertPresetReapplyTransitionResult =
  | Readonly<{
      ok: true
      status:
        | 'reapplied'
        | 'reapplied-aggregate-semantic-no-op'
        | 'reapplied-semantic-no-op'
      transitionIdentity: string
      formatVersion:
        typeof CASE_INSERT_PRESET_REAPPLY_TRANSITION_SUCCESS_VERSION
      operation: 'reapply'
      sourceAggregate: Readonly<ProjectJewelCaseState>
      sourceConfiguration: CaseInsertAppliedPresetConfiguration
      aggregate: Readonly<ProjectJewelCaseState>
      nextConfiguration: CaseInsertReappliedPresetConfiguration
      successEvidence: CaseInsertPresetTransitionSuccessEvidence
      applicationAdoptionStatus: 'not-adopted'
    }>
  | Readonly<{
      ok: false
      status: CaseInsertPresetReapplyTransitionFailureStatus
      code: string
      dimensions?: readonly string[]
      address?: CaseInsertAppliedPresetOwnedFieldAddress
      requirementId?: string
    }>

declare const CASE_INSERT_PRESET_VALIDATED_REAPPLY_SUCCESS: unique symbol

export type ValidatedCaseInsertPresetReapplyTransitionSuccess = Extract<
  CaseInsertPresetReapplyTransitionResult,
  { ok: true }
> & Readonly<{
  [CASE_INSERT_PRESET_VALIDATED_REAPPLY_SUCCESS]: true
}>

export type CaseInsertPresetReapplyTransitionSuccessValidationResult =
  | Readonly<{
      ok: true
      status: 'validated'
      success: ValidatedCaseInsertPresetReapplyTransitionSuccess
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

type Failure = Extract<CaseInsertPresetReapplyTransitionResult, { ok: false }>

const PLAN_KEYS = [
  'kind', 'formatVersion', 'operation', 'source', 'preset', 'requestedScope',
  'resolvedRegions', 'resolvedAssignments', 'selectedFootprint', 'fieldEffects',
  'aggregateWrites', 'preservedCustomizedFields', 'newlyClaimedFields',
  'retiredFields', 'projectedConfiguration', 'preservationDecisions', 'skips',
  'warnings', 'blockers', 'materialConsentRequirements', 'preconditions',
  'semanticEffects', 'reviewIdentity',
] as const
const ADDRESS_KEYS = [
  'region', 'featureOwnerId', 'bindingKind', 'bindingId', 'runtimeObjectId',
  'fieldId',
] as const
const EFFECT_KEYS = [
  'address', 'disposition', 'policy', 'currentValue',
  'previousLastAppliedValue', 'selectedProposedValue',
  'projectedLastAppliedValue', 'previousSources', 'selectedSources',
  'projectedSources', 'provenanceDisposition', 'aggregateWriteRequired',
  'ownershipOutcome', 'projectedCustomizationStatus', 'enablement',
] as const
const REQUIREMENT_KEYS = [
  'id', 'kind', 'address', 'sourceConfigurationIdentity',
  'sourceCustomizationReportIdentity', 'selectedPreset', 'policy',
  'previousLastAppliedValue', 'currentValue', 'proposedValue', 'sources',
  'assignmentIds', 'regions',
] as const
const REGION_ORDER = new Map([
  ['front-cover', 0],
  ['tray-card', 1],
  ['back-panel', 2],
  ['left-spine', 3],
  ['right-spine', 4],
])
const FIELD_ORDER = new Map([
  ['layout-x', 0],
  ['layout-y', 1],
  ['layout-scale', 2],
  ['layout-width', 3],
])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]) {
  const actual = Object.keys(value).sort()
  const expected = [...keys].sort()
  return actual.length === expected.length &&
    actual.every((key, index) => key === expected[index])
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

function isDeeplyFrozen(value: unknown): boolean {
  if (value === null || typeof value !== 'object') return true
  return Object.isFrozen(value) && Object.values(value).every(isDeeplyFrozen)
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
  status: CaseInsertPresetReapplyTransitionFailureStatus,
  code: string,
  options: Readonly<{
    dimensions?: readonly string[]
    address?: CaseInsertAppliedPresetOwnedFieldAddress
    requirementId?: string
  }> = {},
): Failure {
  return deepFreeze({
    ok: false,
    status,
    code,
    ...(options.dimensions ? { dimensions: [...options.dimensions] } : {}),
    ...(options.address ? { address: cloneMutable(options.address) } : {}),
    ...(options.requirementId
      ? { requirementId: options.requirementId }
      : {}),
  })
}

function addressKey(address: CaseInsertAppliedPresetOwnedFieldAddress) {
  return [
    address.region,
    address.featureOwnerId,
    address.bindingKind,
    address.bindingId,
    address.runtimeObjectId,
    address.fieldId,
  ].join('\u0000')
}

function addressSort(
  left: CaseInsertAppliedPresetOwnedFieldAddress,
  right: CaseInsertAppliedPresetOwnedFieldAddress,
) {
  return (REGION_ORDER.get(left.region) ?? 99) -
      (REGION_ORDER.get(right.region) ?? 99) ||
    left.featureOwnerId.localeCompare(right.featureOwnerId) ||
    left.runtimeObjectId.localeCompare(right.runtimeObjectId) ||
    (FIELD_ORDER.get(left.fieldId) ?? 99) -
      (FIELD_ORDER.get(right.fieldId) ?? 99) ||
    left.bindingId.localeCompare(right.bindingId)
}

function sourceSort(
  left: CaseInsertPresetPlanSourceAssignment,
  right: CaseInsertPresetPlanSourceAssignment,
) {
  return (REGION_ORDER.get(left.region) ?? 99) -
      (REGION_ORDER.get(right.region) ?? 99) ||
    left.slotId.localeCompare(right.slotId) ||
    left.assignmentId.localeCompare(right.assignmentId)
}

function validatePlanShape(value: unknown): value is CaseInsertPresetReapplyPlan {
  if (!isRecord(value) || !isDeeplyFrozen(value) ||
      !hasExactKeys(value, PLAN_KEYS) ||
      value.kind !== CASE_INSERT_PRESET_REAPPLY_PLAN_KIND ||
      value.operation !== 'reapply' || !isRecord(value.source) ||
      !hasExactKeys(value.source, [
        'configurationIdentity', 'customizationReportIdentity', 'projectKind',
        'sessionId', 'projectRevision', 'template',
        'aggregateContentIdentity',
      ]) || !isRecord(value.preset) || !hasExactKeys(value.preset, [
        'id', 'previousRevision', 'selectedRevision', 'source',
      ]) || !isRecord(value.projectedConfiguration) ||
      !hasExactKeys(value.projectedConfiguration, [
        'kind', 'authority', 'sourceConfigurationIdentity',
        'sourceCustomizationReportIdentity', 'selectedPreset',
        'requestedScope', 'resolvedRegions', 'ownedFields',
      ]) || !isRecord(value.preconditions) ||
      !hasExactKeys(value.preconditions, [
        'configurationIdentity', 'customizationReportIdentity', 'projectKind',
        'sessionId', 'projectRevision', 'template', 'selectedPreset',
        'scopeKey', 'resolvedRegions', 'fields', 'aggregateContentIdentity',
      ]) || !isRecord(value.semanticEffects) ||
      !hasExactKeys(value.semanticEffects, [
        'aggregateWriteCount', 'configurationEffect',
      ])) return false
  const arrayKeys = [
    'resolvedRegions', 'resolvedAssignments', 'selectedFootprint',
    'fieldEffects', 'aggregateWrites', 'preservedCustomizedFields',
    'newlyClaimedFields', 'retiredFields', 'preservationDecisions', 'skips',
    'warnings', 'blockers', 'materialConsentRequirements',
  ]
  if (arrayKeys.some((key) => !Array.isArray(value[key])) ||
      !Array.isArray(value.projectedConfiguration.ownedFields) ||
      !Array.isArray(value.projectedConfiguration.resolvedRegions) ||
      !Array.isArray(value.preconditions.fields) ||
      !Array.isArray(value.preconditions.resolvedRegions) ||
      (value.blockers as unknown[]).length !== 0 ||
      typeof value.reviewIdentity !== 'string') return false
  return (value.fieldEffects as unknown[]).every((effect) =>
    isRecord(effect) && hasExactKeys(effect, EFFECT_KEYS) &&
    isRecord(effect.address) && hasExactKeys(effect.address, ADDRESS_KEYS) &&
    isRecord(effect.enablement) && hasExactKeys(effect.enablement, [
      'objectEnabled', 'ownerEnabled', 'effectiveEnabled',
    ])) &&
    (value.materialConsentRequirements as unknown[]).every((requirement) =>
      isRecord(requirement) && hasExactKeys(requirement, REQUIREMENT_KEYS) &&
      (requirement.address === null || (isRecord(requirement.address) &&
        hasExactKeys(requirement.address, ADDRESS_KEYS))))
}

function canonicalPlan(
  value: unknown,
): CaseInsertPresetReapplyPlan | Failure {
  if (isRecord(value) && value.kind === CASE_INSERT_PRESET_REAPPLY_PLAN_KIND &&
      value.formatVersion !== CASE_INSERT_PRESET_REAPPLY_PLAN_FORMAT_VERSION) {
    return failure(
      'unsupported-plan-version',
      'reapply-plan-version-unsupported',
    )
  }
  if (!validatePlanShape(value)) {
    return failure('invalid-plan', 'reapply-plan-shape-invalid')
  }
  for (const requirement of value.materialConsentRequirements) {
    if (requirement.id !== createCaseInsertPresetReapplyConsentRequirementId(
      requirementContent(requirement),
    )) return failure(
      'plan-identity-mismatch',
      'reapply-requirement-identity-mismatch',
      { requirementId: requirement.id },
    )
  }
  const sortEffects = (effects: readonly CaseInsertPresetReapplyFieldEffect[]) =>
    effects.map(cloneMutable).sort((left, right) =>
      addressSort(left.address, right.address))
  if (!sameValue(
    sortEffects(value.preservedCustomizedFields),
    sortEffects(value.fieldEffects.filter(({ disposition }) =>
      disposition === 'retained-customized-preserve')),
  ) || !sameValue(
    sortEffects(value.newlyClaimedFields),
    sortEffects(value.fieldEffects.filter(({ disposition }) =>
      disposition === 'new-claim')),
  ) || !sameValue(
    sortEffects(value.retiredFields),
    sortEffects(value.fieldEffects.filter(({ disposition }) =>
      disposition === 'retired')),
  )) return failure('invalid-plan', 'reapply-classification-lists-incoherent')
  let content: Omit<CaseInsertPresetReapplyPlan, 'reviewIdentity'>
  try {
    const rawContent = Object.fromEntries(
      Object.entries(value).filter(([key]) => key !== 'reviewIdentity'),
    ) as Omit<CaseInsertPresetReapplyPlan, 'reviewIdentity'>
    content = canonicalizeCaseInsertPresetReapplyPlanContent(rawContent)
  } catch {
    return failure('invalid-plan', 'reapply-plan-canonicalization-failed')
  }
  const expectedReviewIdentity = createCaseInsertPresetReapplyReviewIdentity(
    content,
  )
  if (value.reviewIdentity !== expectedReviewIdentity) {
    return failure('plan-identity-mismatch', 'reapply-review-identity-mismatch')
  }
  return deepFreeze({ ...content, reviewIdentity: expectedReviewIdentity })
}

function expectedActionKind(fieldId: string) {
  switch (fieldId) {
    case 'layout-x': return 'set-layout-x'
    case 'layout-y': return 'set-layout-y'
    case 'layout-scale': return 'set-layout-scale'
    case 'layout-width': return 'set-layout-width'
    default: return null
  }
}

function sourcesEqual(
  left: readonly CaseInsertPresetPlanSourceAssignment[],
  right: readonly CaseInsertPresetPlanSourceAssignment[],
) {
  return sameValue(left, right)
}

function requirementContent(
  requirement: CaseInsertPresetReapplyMaterialConsentRequirement,
) {
  return Object.fromEntries(
    Object.entries(requirement).filter(([key]) => key !== 'id'),
  ) as Omit<CaseInsertPresetReapplyMaterialConsentRequirement, 'id'>
}

function expectedLocalRequirement(
  effect: CaseInsertPresetReapplyFieldEffect,
  plan: CaseInsertPresetReapplyPlan,
): CaseInsertPresetReapplyMaterialConsentRequirement | null {
  const kind = effect.disposition === 'retained-customized-overwrite'
    ? 'overwrite-customized-owned-field'
    : effect.disposition === 'new-claim' && effect.aggregateWriteRequired
      ? 'new-field-claim-with-value-change'
      : null
  if (!kind) return null
  const content = {
    kind,
    address: cloneMutable(effect.address),
    sourceConfigurationIdentity: plan.source.configurationIdentity,
    sourceCustomizationReportIdentity:
      plan.source.customizationReportIdentity,
    selectedPreset: {
      id: plan.preset.id,
      revision: plan.preset.selectedRevision,
    },
    policy: effect.policy,
    previousLastAppliedValue: effect.previousLastAppliedValue,
    currentValue: effect.currentValue,
    proposedValue: effect.selectedProposedValue,
    sources: [...cloneMutable(effect.selectedSources)].sort(sourceSort),
    assignmentIds: effect.selectedSources.map(({ assignmentId }) =>
      assignmentId).sort(),
    regions: [effect.address.region],
  } as const
  return canonicalizeCaseInsertPresetReapplyConsentRequirement(content)
}

function expectedGlobalRequirement(
  plan: CaseInsertPresetReapplyPlan,
): CaseInsertPresetReapplyMaterialConsentRequirement | null {
  const hasWarning = plan.warnings.some((warning) =>
    warning.kind === 'selected-layout-warning' &&
    warning.warning.kind === 'multiple-concrete-regions')
  if (!hasWarning || plan.aggregateWrites.length === 0) return null
  const sources = new Map<string, CaseInsertPresetPlanSourceAssignment>()
  for (const field of plan.selectedFootprint) {
    for (const source of field.sources) sources.set(source.assignmentId, source)
  }
  const content = {
    kind: 'multiple-concrete-regions' as const,
    address: null,
    sourceConfigurationIdentity: plan.source.configurationIdentity,
    sourceCustomizationReportIdentity:
      plan.source.customizationReportIdentity,
    selectedPreset: {
      id: plan.preset.id,
      revision: plan.preset.selectedRevision,
    },
    policy: null,
    previousLastAppliedValue: null,
    currentValue: null,
    proposedValue: null,
    sources: [...sources.values()].sort(sourceSort),
    assignmentIds: plan.resolvedAssignments
      .filter(({ bindingStatus }) =>
        bindingStatus === 'resolved' || bindingStatus === 'resolved-disabled')
      .map(({ assignmentId }) => assignmentId).sort(),
    regions: [...plan.resolvedRegions],
  }
  return canonicalizeCaseInsertPresetReapplyConsentRequirement(content)
}

function validatePlanSemantics(
  plan: CaseInsertPresetReapplyPlan,
  configuration: CaseInsertAppliedPresetConfiguration,
  report: CaseInsertPresetCustomizationReport,
): Failure | null {
  if (plan.source.configurationIdentity !== configuration.configurationIdentity ||
      plan.preconditions.configurationIdentity !==
        configuration.configurationIdentity ||
      plan.projectedConfiguration.sourceConfigurationIdentity !==
        configuration.configurationIdentity) {
    return failure('configuration-mismatch', 'plan-configuration-mismatch')
  }
  if (plan.source.customizationReportIdentity !== report.reportIdentity ||
      plan.preconditions.customizationReportIdentity !== report.reportIdentity ||
      plan.projectedConfiguration.sourceCustomizationReportIdentity !==
        report.reportIdentity) {
    return failure('report-mismatch', 'plan-report-mismatch')
  }
  if (plan.preset.id !== configuration.preset.id ||
      plan.preset.previousRevision !== configuration.preset.revision ||
      plan.preset.source !== (plan.preset.id.startsWith('builtin:')
        ? 'builtin'
        : 'user') || plan.preset.selectedRevision < 1 ||
      plan.projectedConfiguration.kind !==
        CASE_INSERT_PRESET_REAPPLY_CONFIGURATION_PROJECTION_KIND ||
      plan.projectedConfiguration.authority !==
        'non-authoritative-uninstalled-projection' ||
      !sameValue(plan.projectedConfiguration.selectedPreset, {
        id: plan.preset.id,
        revision: plan.preset.selectedRevision,
        source: plan.preset.source,
      }) || !sameValue(plan.requestedScope, configuration.requestedScope) ||
      !sameValue(plan.resolvedRegions, configuration.resolvedRegions) ||
      !sameValue(
        plan.projectedConfiguration.requestedScope,
        configuration.requestedScope,
      ) || !sameValue(
        plan.projectedConfiguration.resolvedRegions,
        configuration.resolvedRegions,
      ) || plan.preconditions.scopeKey !==
        getCaseInsertPresetApplicationScopeKey(configuration.requestedScope) ||
      !sameValue(plan.preconditions.resolvedRegions, plan.resolvedRegions) ||
      !sameValue(plan.preconditions.selectedPreset, {
        id: plan.preset.id,
        revision: plan.preset.selectedRevision,
      }) || plan.semanticEffects.configurationEffect !== true ||
      plan.semanticEffects.aggregateWriteCount !== plan.aggregateWrites.length) {
    return failure('invalid-plan', 'reapply-plan-context-incoherent')
  }
  if (plan.source.projectKind !== 'caseInsert' ||
      plan.preconditions.projectKind !== 'caseInsert' ||
      plan.source.sessionId !== plan.preconditions.sessionId ||
      plan.source.projectRevision !== plan.preconditions.projectRevision ||
      plan.source.aggregateContentIdentity !==
        plan.preconditions.aggregateContentIdentity ||
      !sameValue(plan.source.template, configuration.template) ||
      !sameValue(plan.preconditions.template, configuration.template) ||
      report.current.projectKind !== 'caseInsert' ||
      report.current.sessionId !== plan.source.sessionId ||
      report.current.projectRevision !== plan.source.projectRevision ||
      !sameValue(report.current.template, plan.source.template)) {
    return failure('invalid-plan', 'reapply-source-context-incoherent')
  }

  const oldByKey = new Map(configuration.ownedFields.map((field) => [
    addressKey(field.address), field,
  ]))
  const reportByKey = new Map(report.fields.map((field) => [
    addressKey(field.address), field,
  ]))
  const selectedByKey = new Map<string,
    CaseInsertPresetReapplyPlan['selectedFootprint'][number]>()
  for (const field of plan.selectedFootprint) {
    const key = addressKey(field.address)
    if (selectedByKey.has(key) ||
        !isCaseInsertPresetOwnedFieldSemanticValue(
          field.address.fieldId,
          field.proposedValue,
        ) || field.sources.length === 0 || field.sources.some((source) =>
          source.presetId !== plan.preset.id ||
          source.presetRevision !== plan.preset.selectedRevision ||
          source.region !== field.address.region ||
          source.ownerId !== field.address.featureOwnerId ||
          source.object.bindingKind !== field.address.bindingKind ||
          source.object.bindingId !== field.address.bindingId ||
          source.object.runtimeId !== field.address.runtimeObjectId)) {
      return failure('invalid-plan', 'selected-footprint-invalid')
    }
    selectedByKey.set(key, field)
  }
  const effectByKey = new Map<string, CaseInsertPresetReapplyFieldEffect>()
  for (const effect of plan.fieldEffects) {
    const key = addressKey(effect.address)
    if (effectByKey.has(key)) {
      return failure('invalid-plan', 'field-effect-address-duplicate')
    }
    effectByKey.set(key, effect)
    const old = oldByKey.get(key)
    const reportField = reportByKey.get(key)
    const selected = selectedByKey.get(key)
    const expectedDisposition = old && reportField && selected
      ? reportField.fieldStatus === 'unchanged'
        ? 'retained-clean'
        : effect.policy === 'preserve-current-customization'
          ? 'retained-customized-preserve'
          : effect.policy === 'overwrite-with-selected-preset'
            ? 'retained-customized-overwrite'
            : null
      : old && reportField && !selected
        ? 'retired'
        : !old && !reportField && selected
          ? 'new-claim'
          : null
    if (!expectedDisposition || effect.disposition !== expectedDisposition ||
        (old && effect.previousLastAppliedValue !== old.lastAppliedValue) ||
        (!old && effect.previousLastAppliedValue !== null) ||
        (old && !sourcesEqual(effect.previousSources, old.sources)) ||
        (!old && effect.previousSources.length !== 0) ||
        (selected && effect.selectedProposedValue !== selected.proposedValue) ||
        (!selected && effect.selectedProposedValue !== null) ||
        (selected && !sourcesEqual(effect.selectedSources, selected.sources)) ||
        (!selected && effect.selectedSources.length !== 0) ||
        (reportField && effect.currentValue !== reportField.currentValue)) {
      return failure('invalid-plan', 'field-effect-classification-incoherent', {
        address: effect.address,
      })
    }
    const preserve = expectedDisposition === 'retained-customized-preserve'
    const retire = expectedDisposition === 'retired'
    const expectedProjectedValue = retire
      ? null
      : preserve ? old!.lastAppliedValue : selected!.proposedValue
    const expectedProjectedSources = retire
      ? []
      : preserve ? old!.sources : selected!.sources
    const expectedWrite = !preserve && !retire &&
      effect.currentValue !== selected!.proposedValue
    const expectedOutcome = retire
      ? 'retired'
      : old ? 'retained' : 'claimed'
    const expectedCustomization = retire
      ? 'not-owned'
      : preserve ? 'customized' : 'clean'
    if (effect.projectedLastAppliedValue !== expectedProjectedValue ||
        !sourcesEqual(effect.projectedSources, expectedProjectedSources) ||
        effect.aggregateWriteRequired !== expectedWrite ||
        effect.ownershipOutcome !== expectedOutcome ||
        effect.projectedCustomizationStatus !== expectedCustomization ||
        ((expectedDisposition === 'retained-clean' || retire ||
          expectedDisposition === 'new-claim') && effect.policy !== null)) {
      return failure('invalid-plan', 'field-effect-projection-incoherent', {
        address: effect.address,
      })
    }
  }
  const allKeys = new Set([...oldByKey.keys(), ...selectedByKey.keys()])
  if (effectByKey.size !== allKeys.size ||
      [...allKeys].some((key) => !effectByKey.has(key))) {
    return failure('invalid-plan', 'field-effect-footprint-incomplete')
  }

  const expectedProjection = plan.fieldEffects
    .filter(({ disposition }) => disposition !== 'retired')
    .map((effect) => ({
      address: cloneMutable(effect.address),
      lastAppliedValue: effect.projectedLastAppliedValue,
      sources: cloneMutable(effect.projectedSources),
      disposition: effect.disposition,
      expectedCustomizationStatus: effect.projectedCustomizationStatus,
    }))
  if (!sameValue(plan.projectedConfiguration.ownedFields, expectedProjection) ||
      !sameValue(
        plan.preservedCustomizedFields,
        plan.fieldEffects.filter(({ disposition }) =>
          disposition === 'retained-customized-preserve'),
      ) || !sameValue(
        plan.newlyClaimedFields,
        plan.fieldEffects.filter(({ disposition }) =>
          disposition === 'new-claim'),
      ) || !sameValue(
        plan.retiredFields,
        plan.fieldEffects.filter(({ disposition }) => disposition === 'retired'),
      )) {
    return failure(
      'projected-configuration-mismatch',
      'projected-footprint-incoherent',
    )
  }

  const expectedPreconditions = plan.fieldEffects.map((effect) => ({
    address: cloneMutable(effect.address),
    bindingMatch: 'exactly-one',
    currentValue: effect.currentValue,
    enablement: cloneMutable(effect.enablement),
  }))
  if (!sameValue(plan.preconditions.fields, expectedPreconditions)) {
    return failure('invalid-plan', 'field-preconditions-incoherent')
  }

  const expectedEffectWarnings = plan.fieldEffects.flatMap((effect) => {
    const warnings: CaseInsertPresetReapplyPlan['warnings'][number][] = []
    if (effect.disposition === 'retained-customized-preserve') {
      warnings.push({ kind: 'customization-preserved', address: effect.address })
    }
    if (effect.disposition === 'new-claim') {
      warnings.push({ kind: 'new-field-claim', address: effect.address })
    }
    if (effect.disposition === 'retired') {
      warnings.push({ kind: 'field-retired', address: effect.address })
    }
    if (effect.provenanceDisposition === 'changed' ||
        effect.provenanceDisposition === 'coalesced') {
      warnings.push({
        kind: 'field-provenance-changed',
        address: effect.address,
      })
    }
    return warnings
  }).sort((left, right) =>
    left.kind.localeCompare(right.kind) ||
    encodeCaseInsertPresetDeterministicIdentity(left).localeCompare(
      encodeCaseInsertPresetDeterministicIdentity(right),
    ))
  const actualEffectWarnings = plan.warnings
    .filter(({ kind }) => kind !== 'selected-layout-warning')
  const warningIds = plan.warnings.map(createCaseInsertPresetReapplyWarningIdentity)
  if (!sameValue(actualEffectWarnings, expectedEffectWarnings) ||
      new Set(warningIds).size !== warningIds.length) {
    return failure('invalid-plan', 'reapply-warnings-incoherent')
  }
  const assignmentIds = new Set(plan.resolvedAssignments.map(({ assignmentId }) =>
    assignmentId))
  for (const warning of plan.warnings) {
    if (warning.kind !== 'selected-layout-warning') continue
    const encoded = encodeCaseInsertPresetDeterministicIdentity(warning.warning)
    if (encoded.length === 0 || ('assignmentId' in warning.warning &&
        !assignmentIds.has(warning.warning.assignmentId)) ||
        ('assignmentIds' in warning.warning &&
          warning.warning.assignmentIds.some((id) => !assignmentIds.has(id)))) {
      return failure('invalid-plan', 'selected-layout-warning-unbound')
    }
  }

  const expectedRequirements = plan.fieldEffects
    .map((effect) => expectedLocalRequirement(effect, plan))
    .filter((item): item is CaseInsertPresetReapplyMaterialConsentRequirement =>
      item !== null)
  const globalRequirement = expectedGlobalRequirement(plan)
  if (globalRequirement) expectedRequirements.push(globalRequirement)
  expectedRequirements.sort((left, right) =>
    left.kind.localeCompare(right.kind) ||
    (left.address && right.address
      ? addressSort(left.address, right.address)
      : left.address ? 1 : right.address ? -1 : 0) ||
    left.id.localeCompare(right.id))
  if (!sameValue(plan.materialConsentRequirements, expectedRequirements)) {
    return failure('invalid-plan', 'material-requirements-incoherent')
  }
  for (const requirement of plan.materialConsentRequirements) {
    if (requirement.id !== createCaseInsertPresetReapplyConsentRequirementId(
      requirementContent(requirement),
    )) return failure('plan-identity-mismatch', 'requirement-identity-mismatch', {
      requirementId: requirement.id,
    })
  }

  const globalIds = expectedRequirements
    .filter(({ address }) => address === null)
    .map(({ id }) => id)
  const expectedWrites = plan.fieldEffects
    .filter(({ aggregateWriteRequired }) => aggregateWriteRequired)
    .map((effect) => {
      const localIds = expectedRequirements
        .filter(({ address }) => address &&
          addressKey(address) === addressKey(effect.address))
        .map(({ id }) => id)
      return {
        id: [
          'case:preset-reapply-write',
          effect.address.featureOwnerId,
          effect.address.runtimeObjectId,
          effect.address.fieldId,
        ].join(':'),
        kind: expectedActionKind(effect.address.fieldId),
        address: cloneMutable(effect.address),
        disposition: effect.disposition,
        policy: effect.policy,
        currentValuePrecondition: effect.currentValue,
        proposedValue: effect.selectedProposedValue,
        sources: cloneMutable(effect.selectedSources),
        materialConsentRequirementIds: [...localIds, ...globalIds].sort(),
      }
    })
  if (expectedWrites.some(({ kind }) => kind === null)) {
    return failure('unsupported-owned-field', 'owned-layout-field-unsupported')
  }
  if (!sameValue(plan.aggregateWrites, expectedWrites)) {
    return failure('unsupported-action', 'aggregate-write-set-incoherent')
  }
  return null
}

function reviewAcceptanceContent(
  plan: CaseInsertPresetReapplyPlan,
) {
  return {
    kind: CASE_INSERT_PRESET_REAPPLY_REVIEW_ACCEPTANCE_KIND,
    formatVersion: CASE_INSERT_PRESET_REAPPLY_REVIEW_ACCEPTANCE_VERSION,
    decision: 'accepted' as const,
    operation: 'reapply' as const,
    planIdentity: createCaseInsertPresetReapplyPlanIdentity(plan),
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

export function createCaseInsertPresetReapplyReviewAcceptance(
  plan: CaseInsertPresetReapplyPlan,
): CaseInsertPresetReapplyReviewAcceptance {
  const content = reviewAcceptanceContent(plan)
  return deepFreeze({
    ...content,
    acceptanceIdentity:
      createCaseInsertPresetReapplyReviewAcceptanceIdentity(content),
  })
}

function consentAcceptanceContent(
  plan: CaseInsertPresetReapplyPlan,
  requirement: CaseInsertPresetReapplyMaterialConsentRequirement,
) {
  return {
    kind: CASE_INSERT_PRESET_REAPPLY_CONSENT_ACCEPTANCE_KIND,
    formatVersion: CASE_INSERT_PRESET_REAPPLY_CONSENT_ACCEPTANCE_VERSION,
    decision: 'accepted' as const,
    operation: 'reapply' as const,
    planIdentity: createCaseInsertPresetReapplyPlanIdentity(plan),
    planReviewIdentity: plan.reviewIdentity,
    requirementId: requirement.id,
    requirement: cloneMutable(requirement),
  }
}

export function createCaseInsertPresetReapplyConsentAcceptance(
  plan: CaseInsertPresetReapplyPlan,
  requirementId: string,
): CaseInsertPresetReapplyConsentAcceptance | null {
  const validatedPlan = canonicalPlan(plan)
  if ('ok' in validatedPlan && validatedPlan.ok === false) return null
  const canonical = validatedPlan as CaseInsertPresetReapplyPlan
  const requirement = canonical.materialConsentRequirements.find(({ id }) =>
    id === requirementId)
  if (!requirement) return null
  const content = consentAcceptanceContent(canonical, requirement)
  return deepFreeze({
    ...content,
    acceptanceIdentity:
      createCaseInsertPresetReapplyConsentAcceptanceIdentity(content),
  })
}

function validateReviewAcceptance(
  plan: CaseInsertPresetReapplyPlan,
  value: unknown,
): Failure | null {
  if (isRecord(value) &&
      value.kind === CASE_INSERT_PRESET_REAPPLY_REVIEW_ACCEPTANCE_KIND &&
      value.formatVersion !==
        CASE_INSERT_PRESET_REAPPLY_REVIEW_ACCEPTANCE_VERSION) {
    return failure('invalid-review-acceptance', 'review-version-unsupported')
  }
  if (!isRecord(value) || !isDeeplyFrozen(value) || !hasExactKeys(value, [
    'kind', 'formatVersion', 'decision', 'operation', 'planIdentity',
    'planReviewIdentity', 'sourceConfigurationIdentity',
    'sourceCustomizationReportIdentity', 'selectedPreset',
    'acceptanceIdentity',
  ])) return failure('invalid-review-acceptance', 'review-acceptance-invalid')
  const expected = createCaseInsertPresetReapplyReviewAcceptance(plan)
  return sameValue(value, expected)
    ? null
    : failure('review-mismatch', 'review-acceptance-mismatch')
}

function validateConsentAcceptances(
  plan: CaseInsertPresetReapplyPlan,
  values: unknown,
): Failure | null {
  if (!Array.isArray(values)) {
    return failure('missing-material-consent', 'consent-acceptances-invalid')
  }
  const requiredById = new Map(plan.materialConsentRequirements.map(
    (requirement) => [requirement.id, requirement],
  ))
  const acceptedIds = new Set<string>()
  for (const value of values) {
    if (!isRecord(value) || !isDeeplyFrozen(value) || !hasExactKeys(value, [
      'kind', 'formatVersion', 'decision', 'operation', 'planIdentity',
      'planReviewIdentity', 'requirementId', 'requirement',
      'acceptanceIdentity',
    ])) return failure('material-consent-mismatch', 'consent-invalid')
    if (value.kind === CASE_INSERT_PRESET_REAPPLY_CONSENT_ACCEPTANCE_KIND &&
        value.formatVersion !==
          CASE_INSERT_PRESET_REAPPLY_CONSENT_ACCEPTANCE_VERSION) {
      return failure('material-consent-mismatch', 'consent-version-unsupported')
    }
    if (typeof value.requirementId !== 'string' ||
        !requiredById.has(value.requirementId)) {
      return failure('unexpected-material-consent', 'consent-unexpected', {
        requirementId: typeof value.requirementId === 'string'
          ? value.requirementId
          : undefined,
      })
    }
    if (acceptedIds.has(value.requirementId)) {
      return failure('duplicate-material-consent', 'consent-duplicate', {
        requirementId: value.requirementId,
      })
    }
    const expected = createCaseInsertPresetReapplyConsentAcceptance(
      plan,
      value.requirementId,
    )!
    if (!sameValue(value, expected)) {
      return failure('material-consent-mismatch', 'consent-facts-mismatch', {
        requirementId: value.requirementId,
      })
    }
    acceptedIds.add(value.requirementId)
  }
  const missing = [...requiredById.keys()].find((id) => !acceptedIds.has(id))
  return missing
    ? failure('missing-material-consent', 'consent-missing', {
        requirementId: missing,
      })
    : null
}

function preflightCurrent(
  plan: CaseInsertPresetReapplyPlan,
  current: TransitionCaseInsertPresetReapplyInput['current'],
): Readonly<{ aggregate: ProjectJewelCaseState }> | Failure {
  if (!isRecord(current) || current.projectKind !== 'caseInsert' ||
      typeof current.sessionId !== 'string' ||
      !Number.isSafeInteger(current.projectRevision) ||
      current.projectRevision < 0 || !isRecord(current.template) ||
      typeof current.template.id !== 'string' ||
      current.template.revision !== null) {
    return failure('attachment-context-mismatch', 'current-context-invalid')
  }
  const dimensions: string[] = []
  if (current.sessionId !== plan.preconditions.sessionId) {
    dimensions.push('session-id')
  }
  if (current.projectRevision !== plan.preconditions.projectRevision) {
    dimensions.push('project-revision')
  }
  if (!sameValue(current.template, plan.preconditions.template)) {
    dimensions.push('template')
  }
  if (dimensions.length > 0) {
    return failure('stale-reapply-plan', 'reapply-context-stale', { dimensions })
  }
  let normalized: ProjectJewelCaseState
  try {
    normalized = normalizeProjectJewelCaseState(current.aggregate)
  } catch {
    return failure('attachment-context-mismatch', 'current-aggregate-invalid')
  }
  if (!sameValue(current.aggregate, normalized) ||
      normalized.templateType !== current.template.id) {
    return failure(
      'attachment-context-mismatch',
      'current-aggregate-context-mismatch',
    )
  }
  const aggregateContent = validateCaseInsertPresetAggregateContent(normalized)
  if (!aggregateContent.ok || aggregateContent.aggregateContentIdentity !==
      plan.preconditions.aggregateContentIdentity) {
    return failure(
      'attachment-context-mismatch',
      'current-aggregate-identity-mismatch',
    )
  }
  for (const effect of plan.fieldEffects) {
    const binding = resolveCaseInsertPresetAggregateBinding(
      normalized,
      effect.address.featureOwnerId,
      { kind: effect.address.bindingKind, id: effect.address.bindingId },
    )
    if (binding.status === 'missing') {
      return failure('target-missing', 'reapply-target-missing', {
        address: effect.address,
      })
    }
    if (binding.status === 'ambiguous') {
      return failure('target-ambiguous', 'reapply-target-ambiguous', {
        address: effect.address,
      })
    }
    if (binding.status !== 'found' ||
        binding.currentState.id !== effect.address.runtimeObjectId) {
      return failure('target-missing', 'reapply-target-address-mismatch', {
        address: effect.address,
      })
    }
    const currentValue = getCaseInsertPresetOwnedFieldCurrentValue(
      binding.currentState,
      effect.address.fieldId,
    )
    if (!isCaseInsertPresetOwnedFieldSemanticValue(
      effect.address.fieldId,
      currentValue,
    )) return failure('invalid-current-value', 'current-value-invalid', {
      address: effect.address,
    })
    if (currentValue !== effect.currentValue ||
        !sameValue(binding.enablement, effect.enablement)) {
      return failure('stale-reapply-plan', 'field-precondition-stale', {
        address: effect.address,
      })
    }
  }
  return { aggregate: normalized }
}

function transitionStatus(
  aggregateChanged: boolean,
  configurationChanged: boolean,
): Extract<CaseInsertPresetReapplyTransitionResult, { ok: true }>['status'] {
  if (aggregateChanged) return 'reapplied'
  return configurationChanged
    ? 'reapplied-aggregate-semantic-no-op'
    : 'reapplied-semantic-no-op'
}

export function transitionCaseInsertPresetReapply(
  input: TransitionCaseInsertPresetReapplyInput,
): CaseInsertPresetReapplyTransitionResult {
  if (!isRecord(input)) return failure('invalid-request', 'request-invalid')
  if (input.operation !== 'reapply') {
    return failure('unsupported-operation', 'operation-unsupported')
  }
  const planResult = canonicalPlan(input.plan)
  if ('ok' in planResult && planResult.ok === false) return planResult
  const plan = planResult as CaseInsertPresetReapplyPlan

  const validatedConfiguration = validateCaseInsertAppliedPresetConfiguration(
    input.sourceConfiguration,
  )
  if (!validatedConfiguration.ok) {
    return failure(
      validatedConfiguration.status === 'unsupported-configuration-version'
        ? 'unsupported-configuration-version'
        : 'invalid-source-configuration',
      validatedConfiguration.code,
    )
  }
  const configuration = validatedConfiguration.configuration
  const validatedReport = validateCaseInsertPresetCustomizationReport(
    input.customizationReport,
    configuration,
  )
  if (!validatedReport.ok) {
    const status = validatedReport.status === 'unsupported-report-version'
      ? 'unsupported-report-version'
      : validatedReport.status === 'report-mismatch'
        ? 'report-mismatch'
        : 'invalid-customization-report'
    return failure(status, validatedReport.code)
  }
  const report = validatedReport.report
  const semanticFailure = validatePlanSemantics(plan, configuration, report)
  if (semanticFailure) return semanticFailure
  const reviewFailure = validateReviewAcceptance(plan, input.reviewAcceptance)
  if (reviewFailure) return reviewFailure
  const consentFailure = validateConsentAcceptances(
    plan,
    input.materialConsentAcceptances,
  )
  if (consentFailure) return consentFailure
  const currentResult = preflightCurrent(plan, input.current)
  if ('ok' in currentResult && currentResult.ok === false) return currentResult
  const current = currentResult as Readonly<{ aggregate: ProjectJewelCaseState }>

  const writes: CaseInsertPresetAggregateLayoutWrite[] = plan.aggregateWrites
    .map((write) => ({
      id: write.id,
      kind: write.kind,
      featureOwnerId: write.address.featureOwnerId,
      bindingKind: write.address.bindingKind,
      bindingId: write.address.bindingId,
      runtimeObjectId: write.address.runtimeObjectId,
      fieldId: write.address.fieldId,
      currentValuePrecondition: write.currentValuePrecondition,
      proposedValue: write.proposedValue,
    }))
  const aggregateResult = applyCaseInsertPresetAggregateLayoutWrites(
    current.aggregate,
    writes,
  )
  if (!aggregateResult.ok) {
    const status = aggregateResult.status === 'target-missing' ||
        aggregateResult.status === 'target-ambiguous' ||
        aggregateResult.status === 'unsupported-action' ||
        aggregateResult.status === 'unsupported-owned-field' ||
        aggregateResult.status === 'invalid-current-value'
      ? aggregateResult.status
      : 'transition-conflict'
    return failure(status, aggregateResult.code)
  }

  const configurationChanged = true
  const status = transitionStatus(aggregateResult.changed, configurationChanged)
  const acceptedRequirementIds = plan.materialConsentRequirements
    .map(({ id }) => id).sort()
  const warningIds = plan.warnings
    .map(createCaseInsertPresetReapplyWarningIdentity).sort()
  const planIdentity = createCaseInsertPresetReapplyPlanIdentity(plan)
  const operationTransitionIdentity =
    createCaseInsertPresetReapplyTransitionIdentity({
      operation: 'reapply',
      status,
      planIdentity,
      planReviewIdentity: plan.reviewIdentity,
      sourceConfigurationIdentity: configuration.configurationIdentity,
      sourceCustomizationReportIdentity: report.reportIdentity,
      reviewAcceptanceIdentity: input.reviewAcceptance.acceptanceIdentity,
      acceptedRequirementIds,
      current: {
        projectKind: 'caseInsert',
        sessionId: input.current.sessionId,
        projectRevision: input.current.projectRevision,
        template: cloneMutable(input.current.template),
      },
      selectedPreset: {
        id: plan.preset.id,
        revision: plan.preset.selectedRevision,
        source: plan.preset.source,
      },
      aggregateWrites: cloneMutable(plan.aggregateWrites),
      nextOwnedFields: cloneMutable(plan.projectedConfiguration.ownedFields),
    })
  const configurationContent: Omit<
    CaseInsertReappliedPresetConfiguration,
    'configurationIdentity'
  > = {
    kind: CASE_INSERT_APPLIED_PRESET_CONFIGURATION_KIND,
    formatVersion: CASE_INSERT_REAPPLIED_PRESET_CONFIGURATION_VERSION,
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
    preset: {
      id: plan.preset.id,
      revision: plan.preset.selectedRevision,
      source: plan.preset.source,
    },
    requestedScope: cloneMutable(plan.requestedScope),
    resolvedRegions: [...plan.resolvedRegions],
    template: cloneMutable(input.current.template) as { id: string; revision: null },
    reviewedPlanIdentity: plan.reviewIdentity,
    source: {
      projectKind: 'caseInsert',
      snapshotIdentity: {
        sessionId: input.current.sessionId,
        projectRevision: input.current.projectRevision,
        template: cloneMutable(input.current.template) as {
          id: string
          revision: null
        },
        aggregateContentIdentity:
          plan.preconditions.aggregateContentIdentity,
      },
    },
    ownedFields: plan.projectedConfiguration.ownedFields.map((field) => ({
      address: cloneMutable(field.address),
      lastAppliedValue: field.lastAppliedValue,
      sources: cloneMutable(field.sources),
    })),
    reviewedWarningIds: warningIds,
    acceptedMaterialConsentRequirementIds: acceptedRequirementIds,
  }
  const nextConfiguration = deepFreeze({
    ...configurationContent,
    configurationIdentity:
      createCaseInsertAppliedPresetConfigurationIdentity(configurationContent),
  })
  const validatedNext = validateCaseInsertAppliedPresetConfiguration(
    nextConfiguration,
  )
  if (!validatedNext.ok || validatedNext.configuration.formatVersion !==
      CASE_INSERT_REAPPLIED_PRESET_CONFIGURATION_VERSION) {
    return failure(
      'configuration-validation-failed',
      validatedNext.ok ? 'reapplied-configuration-version-invalid' :
        validatedNext.code,
    )
  }
  for (const field of validatedNext.configuration.ownedFields) {
    const binding = resolveCaseInsertPresetAggregateBinding(
      aggregateResult.aggregate,
      field.address.featureOwnerId,
      { kind: field.address.bindingKind, id: field.address.bindingId },
    )
    if (binding.status !== 'found' ||
        binding.currentState.id !== field.address.runtimeObjectId) {
      return failure(
        'configuration-validation-failed',
        'next-configuration-target-incoherent',
      )
    }
    const currentValue = getCaseInsertPresetOwnedFieldCurrentValue(
      binding.currentState,
      field.address.fieldId,
    )
    const projected = plan.projectedConfiguration.ownedFields.find((item) =>
      addressKey(item.address) === addressKey(field.address))!
    const expectedCurrent = projected.expectedCustomizationStatus === 'clean'
      ? field.lastAppliedValue
      : plan.fieldEffects.find((effect) =>
          addressKey(effect.address) === addressKey(field.address))!.currentValue
    if (currentValue !== expectedCurrent) {
      return failure(
        'configuration-validation-failed',
        'next-aggregate-configuration-incoherent',
      )
    }
  }
  const sourceAggregate = deepFreeze(cloneMutable(current.aggregate))
  const sourceAggregateContent = validateCaseInsertPresetAggregateContent(
    sourceAggregate,
  )
  const resultAggregateContent = validateCaseInsertPresetAggregateContent(
    aggregateResult.aggregate,
  )
  if (!sourceAggregateContent.ok || !resultAggregateContent.ok) {
    return failure(
      'configuration-validation-failed',
      'aggregate-content-identity-unavailable',
    )
  }
  const successEvidence = createCaseInsertPresetTransitionSuccessEvidence({
    operation: 'reapply',
    transitionStatus: status,
    context: {
      projectKind: 'caseInsert',
      sessionId: input.current.sessionId,
      projectRevision: input.current.projectRevision,
      template: cloneMutable(input.current.template) as {
        id: string
        revision: null
      },
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
    sourceAggregateContentIdentity:
      sourceAggregateContent.aggregateContentIdentity,
    resultAggregateContentIdentity:
      resultAggregateContent.aggregateContentIdentity,
    sourceAttachment: createCaseInsertPresetAttachedEndpoint(
      configuration.configurationIdentity,
    ),
    successorAttachment: createCaseInsertPresetAttachedEndpoint(
      validatedNext.configuration.configurationIdentity,
    ),
    sourceConfigurationIdentity: configuration.configurationIdentity,
    successorConfigurationIdentity:
      validatedNext.configuration.configurationIdentity,
    configurationReleaseIdentity: null,
    applicationAdoptionStatus: 'not-adopted',
  })
  return deepFreeze({
    ok: true,
    status,
    formatVersion: CASE_INSERT_PRESET_REAPPLY_TRANSITION_SUCCESS_VERSION,
    operation: 'reapply' as const,
    transitionIdentity: successEvidence.transitionIdentity,
    sourceAggregate,
    sourceConfiguration: configuration,
    aggregate: aggregateResult.aggregate,
    nextConfiguration: validatedNext.configuration,
    successEvidence,
    applicationAdoptionStatus: 'not-adopted' as const,
  })
}

function reapplySuccessValidationFailure(
  status: Exclude<
    CaseInsertPresetReapplyTransitionSuccessValidationResult,
    { ok: true }
  >['status'],
  code: string,
): CaseInsertPresetReapplyTransitionSuccessValidationResult {
  return Object.freeze({ ok: false, status, code })
}

export function validateCaseInsertPresetReapplyTransitionSuccess(
  value: unknown,
): CaseInsertPresetReapplyTransitionSuccessValidationResult {
  const cloned = cloneCaseInsertPresetPlainInput(value)
  if (!cloned.ok || !isRecord(cloned.value)) {
    return reapplySuccessValidationFailure(
      'invalid-transition-success',
      cloned.ok ? 'reapply-success-root-invalid' : cloned.code,
    )
  }
  const success = cloned.value
  if (success.operation === 'reapply' && success.formatVersion !==
      CASE_INSERT_PRESET_REAPPLY_TRANSITION_SUCCESS_VERSION) {
    return reapplySuccessValidationFailure(
      'unsupported-transition-success-version',
      'reapply-success-version-unsupported',
    )
  }
  if (!hasExactCaseInsertPresetKeys(success, [
    'ok', 'status', 'formatVersion', 'operation', 'transitionIdentity',
    'sourceAggregate', 'sourceConfiguration', 'aggregate',
    'nextConfiguration', 'successEvidence', 'applicationAdoptionStatus',
  ]) || success.ok !== true || success.operation !== 'reapply' ||
      success.formatVersion !==
        CASE_INSERT_PRESET_REAPPLY_TRANSITION_SUCCESS_VERSION ||
      (success.status !== 'reapplied' &&
        success.status !== 'reapplied-aggregate-semantic-no-op' &&
        success.status !== 'reapplied-semantic-no-op')) {
    return reapplySuccessValidationFailure(
      'invalid-transition-success',
      'reapply-success-shape-invalid',
    )
  }
  if (success.applicationAdoptionStatus !== 'not-adopted') {
    return reapplySuccessValidationFailure(
      'application-adoption-status-mismatch',
      'reapply-success-adoption-status-invalid',
    )
  }
  const sourceAggregate = validateCaseInsertPresetAggregateContent(
    success.sourceAggregate,
  )
  if (!sourceAggregate.ok) {
    return reapplySuccessValidationFailure(
      'source-aggregate-mismatch',
      sourceAggregate.code,
    )
  }
  const resultAggregate = validateCaseInsertPresetAggregateContent(
    success.aggregate,
  )
  if (!resultAggregate.ok) {
    return reapplySuccessValidationFailure(
      'result-aggregate-mismatch',
      resultAggregate.code,
    )
  }
  const sourceConfiguration = validateCaseInsertAppliedPresetConfiguration(
    deepFreezeCaseInsertPresetValue(success.sourceConfiguration),
  )
  const successorConfiguration = validateCaseInsertAppliedPresetConfiguration(
    deepFreezeCaseInsertPresetValue(success.nextConfiguration),
  )
  if (!sourceConfiguration.ok || !successorConfiguration.ok ||
      successorConfiguration.configuration.formatVersion !==
        CASE_INSERT_REAPPLIED_PRESET_CONFIGURATION_VERSION) {
    return reapplySuccessValidationFailure(
      'configuration-identity-mismatch',
      !sourceConfiguration.ok
        ? sourceConfiguration.code
        : !successorConfiguration.ok
          ? successorConfiguration.code
          : 'reapply-successor-configuration-version-invalid',
    )
  }
  const sourceConfig = sourceConfiguration.configuration
  const successorConfig = successorConfiguration.configuration as
    CaseInsertReappliedPresetConfiguration
  if (sourceConfig.configurationIdentity ===
      successorConfig.configurationIdentity ||
      successorConfig.reapply.sourceConfigurationIdentity !==
        sourceConfig.configurationIdentity ||
      successorConfig.reapply.transitionStatus !== success.status) {
    return reapplySuccessValidationFailure(
      'configuration-identity-mismatch',
      'reapply-configuration-endpoints-incoherent',
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
    return reapplySuccessValidationFailure(
      'invalid-transition-success',
      'reapply-success-evidence-shape-invalid',
    )
  }
  const evidence = success.successEvidence as unknown as
    CaseInsertPresetTransitionSuccessEvidence
  if (!isRecord(evidence.context) || !isRecord(evidence.lineage) ||
      !isCaseInsertPresetAttachmentEndpoint(evidence.sourceAttachment) ||
      !isCaseInsertPresetAttachmentEndpoint(evidence.successorAttachment) ||
      evidence.sourceAttachment.status !== 'attached' ||
      evidence.sourceAttachment.configurationIdentity !==
        sourceConfig.configurationIdentity ||
      evidence.sourceConfigurationIdentity !==
        sourceConfig.configurationIdentity) {
    return reapplySuccessValidationFailure(
      'source-attachment-mismatch',
      'reapply-source-attachment-incoherent',
    )
  }
  if (evidence.successorAttachment.status !== 'attached' ||
      evidence.successorAttachment.configurationIdentity !==
        successorConfig.configurationIdentity ||
      evidence.successorConfigurationIdentity !==
        successorConfig.configurationIdentity ||
      evidence.configurationReleaseIdentity !== null) {
    return reapplySuccessValidationFailure(
      'successor-attachment-mismatch',
      'reapply-successor-attachment-incoherent',
    )
  }
  if (typeof evidence.lineage.planIdentity !== 'string' ||
      !evidence.lineage.planIdentity.startsWith(
        'case:preset-reapply-plan:v2:',
      ) || typeof evidence.lineage.planReviewIdentity !== 'string' ||
      !evidence.lineage.planReviewIdentity.startsWith(
        'case:preset-reapply-review:v2:',
      ) || typeof evidence.lineage.reviewAcceptanceIdentity !== 'string' ||
      !evidence.lineage.reviewAcceptanceIdentity.startsWith(
        'case:preset-reapply-review-acceptance:v1:',
      ) || !Array.isArray(
        evidence.lineage.materialConsentAcceptanceIdentities,
      ) || evidence.lineage.materialConsentAcceptanceIdentities.some(
        (identity) => typeof identity !== 'string' || !identity.startsWith(
          'case:preset-reapply-consent-acceptance:v1:',
        ),
      ) || evidence.lineage.operationTransitionIdentity !==
        successorConfig.reapply.transitionIdentity ||
      evidence.lineage.reviewAcceptanceIdentity !==
        successorConfig.reapply.reviewAcceptanceIdentity ||
      evidence.lineage.planReviewIdentity !==
        successorConfig.reviewedPlanIdentity) {
    return reapplySuccessValidationFailure(
      'transition-lineage-mismatch',
      'reapply-success-lineage-incoherent',
    )
  }
  if (evidence.operation !== 'reapply' ||
      evidence.transitionStatus !== success.status ||
      evidence.applicationAdoptionStatus !== 'not-adopted' ||
      evidence.context.projectKind !== 'caseInsert' ||
      evidence.context.sessionId !==
        successorConfig.source.snapshotIdentity.sessionId ||
      evidence.context.projectRevision !==
        successorConfig.source.snapshotIdentity.projectRevision ||
      !sameCaseInsertPresetValue(
        evidence.context.template,
        successorConfig.source.snapshotIdentity.template,
      ) || evidence.context.snapshotAggregateContentIdentity !==
        successorConfig.source.snapshotIdentity.aggregateContentIdentity ||
      evidence.sourceAggregateContentIdentity !==
        sourceAggregate.aggregateContentIdentity ||
      evidence.resultAggregateContentIdentity !==
        resultAggregate.aggregateContentIdentity ||
      evidence.context.snapshotAggregateContentIdentity !==
        sourceAggregate.aggregateContentIdentity) {
    return reapplySuccessValidationFailure(
      'source-aggregate-mismatch',
      'reapply-success-aggregate-context-incoherent',
    )
  }
  const expectedEvidence = createCaseInsertPresetTransitionSuccessEvidence({
    operation: 'reapply',
    transitionStatus: success.status,
    context: evidence.context,
    lineage: evidence.lineage,
    sourceAggregateContentIdentity:
      sourceAggregate.aggregateContentIdentity,
    resultAggregateContentIdentity:
      resultAggregate.aggregateContentIdentity,
    sourceAttachment: evidence.sourceAttachment,
    successorAttachment: evidence.successorAttachment,
    sourceConfigurationIdentity: sourceConfig.configurationIdentity,
    successorConfigurationIdentity: successorConfig.configurationIdentity,
    configurationReleaseIdentity: null,
    applicationAdoptionStatus: 'not-adopted',
  })
  if (!sameCaseInsertPresetValue(evidence, expectedEvidence) ||
      success.transitionIdentity !== expectedEvidence.transitionIdentity) {
    return reapplySuccessValidationFailure(
      'transition-success-identity-mismatch',
      'reapply-whole-success-identity-invalid',
    )
  }

  return deepFreezeCaseInsertPresetValue({
    ok: true,
    status: 'validated' as const,
    success: deepFreezeCaseInsertPresetValue(success) as unknown as
      ValidatedCaseInsertPresetReapplyTransitionSuccess,
  })
}
