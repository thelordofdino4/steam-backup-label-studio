import {
  isCaseInsertPresetAssignmentSnapshot,
  resolveCaseInsertPresetAggregateBinding,
  type CaseInsertPresetAssignmentSnapshot,
} from '../caseInsert/presetAssignmentSnapshot.ts'
import { normalizeProjectJewelCaseState } from '../caseInsert/normalization.ts'
import type { ProjectJewelCaseState } from '../project/projectTypes.ts'
import {
  canonicalizeCaseInsertAppliedPresetConfigurationOrdering,
  getCaseInsertPresetOwnedFieldCurrentValue,
  isCaseInsertPresetOwnedFieldSemanticValue,
  validateCaseInsertAppliedPresetConfiguration,
  type CaseInsertAppliedPresetConfiguration,
  type CaseInsertAppliedPresetOwnedFieldAddress,
} from './caseInsertPresetAppliedConfiguration.ts'
import {
  CASE_INSERT_PRESET_DETACH_OWNERSHIP_PROJECTION_KIND,
  CASE_INSERT_PRESET_DETACH_PLAN_FORMAT_VERSION,
  CASE_INSERT_PRESET_DETACH_PLAN_KIND,
  canonicalizeCaseInsertPresetDetachPlanContent,
  createCaseInsertPresetDetachPlanIdentity,
  createCaseInsertPresetDetachPreservationIdentity,
  createCaseInsertPresetDetachReleaseIdentity,
  createCaseInsertPresetDetachReviewAcceptanceIdentity,
  createCaseInsertPresetDetachReviewIdentity,
  createCaseInsertPresetDetachTransitionIdentity,
  createCaseInsertPresetDetachWarningIdentity,
} from './caseInsertPresetDetachIdentity.ts'
import type {
  CaseInsertPresetDetachAggregatePreservation,
  CaseInsertPresetDetachPlan,
  CaseInsertPresetDetachReleaseRecord,
  CaseInsertPresetDetachWarning,
} from './caseInsertPresetDetachPlanning.ts'

export const CASE_INSERT_PRESET_DETACH_REVIEW_ACCEPTANCE_KIND =
  'sbls/case-insert-preset-detach-review-acceptance' as const
export const CASE_INSERT_PRESET_DETACH_REVIEW_ACCEPTANCE_VERSION = 1 as const
export const CASE_INSERT_PRESET_DETACH_RELEASE_RESULT_KIND =
  'sbls/case-insert-preset-detach-release-result' as const
export const CASE_INSERT_PRESET_DETACH_RELEASE_RESULT_VERSION = 1 as const

export type CaseInsertPresetDetachReviewAcceptance = Readonly<{
  kind: typeof CASE_INSERT_PRESET_DETACH_REVIEW_ACCEPTANCE_KIND
  formatVersion: typeof CASE_INSERT_PRESET_DETACH_REVIEW_ACCEPTANCE_VERSION
  decision: 'accepted'
  operation: 'detach'
  planIdentity: string
  planReviewIdentity: string
  sourceConfigurationIdentity: string
  reviewedWarningIds: readonly string[]
  materialConsentRequirementIds: readonly string[]
  acceptanceIdentity: string
}>

export type CaseInsertPresetDetachConfigurationReleaseResult = Readonly<{
  kind: typeof CASE_INSERT_PRESET_DETACH_RELEASE_RESULT_KIND
  formatVersion: typeof CASE_INSERT_PRESET_DETACH_RELEASE_RESULT_VERSION
  domainStatus: 'validated-authoritative-transition-evidence'
  operation: 'detach'
  transitionIdentity: string
  transitionClassification: 'meaningful-configuration-ownership-release'
  sourceConfigurationIdentity: string
  sourceConfigurationFormatVersion: 1 | 2
  preset: CaseInsertAppliedPresetConfiguration['preset']
  planIdentity: string
  planReviewIdentity: string
  reviewAcceptanceIdentity: string
  reviewedWarningIds: readonly string[]
  acceptedMaterialConsentRequirementIds: readonly string[]
  context: Readonly<{
    projectKind: 'caseInsert'
    sessionId: string
    projectRevision: number
    template: Readonly<{ id: string; revision: null }>
  }>
  releasedFootprint: readonly CaseInsertPresetDetachReleaseRecord[]
  proof: Readonly<{
    sourceOwnedFieldCount: number
    releasedOwnedFieldCount: number
    releasesCompleteConfiguration: true
    aggregateWriteCount: 0
    aggregateClassification: 'aggregate-semantic-no-write'
    preservesEveryAggregateValue: true
  }>
  nextAppliedPresetConfiguration: null
  applicationAdoptionStatus: 'not-adopted'
}>

export type TransitionCaseInsertPresetDetachInput = Readonly<{
  operation: unknown
  plan: unknown
  sourceConfiguration: unknown
  reviewAcceptance: unknown
  materialConsentAcceptances: unknown
  current: Readonly<{
    projectKind: unknown
    aggregate: ProjectJewelCaseState
    sessionId: unknown
    projectRevision: unknown
    template: Readonly<{ id: unknown; revision: unknown }>
    snapshot: CaseInsertPresetAssignmentSnapshot
  }>
}>

export type CaseInsertPresetDetachTransitionFailureStatus =
  | 'invalid-request'
  | 'unsupported-operation'
  | 'invalid-plan'
  | 'unsupported-plan-version'
  | 'plan-identity-mismatch'
  | 'invalid-source-configuration'
  | 'unsupported-configuration-version'
  | 'configuration-identity-mismatch'
  | 'configuration-mismatch'
  | 'attachment-context-mismatch'
  | 'stale-detach-plan'
  | 'invalid-review-acceptance'
  | 'review-mismatch'
  | 'missing-review-acceptance'
  | 'missing-material-consent'
  | 'duplicate-material-consent'
  | 'unexpected-material-consent'
  | 'material-consent-mismatch'
  | 'unsupported-release-record'
  | 'unsupported-owned-field'
  | 'invalid-current-value'
  | 'target-missing'
  | 'target-ambiguous'
  | 'footprint-mismatch'
  | 'duplicate-owned-address'
  | 'invalid-region'
  | 'transition-conflict'
  | 'projected-ownership-mismatch'
  | 'release-validation-failed'

export type CaseInsertPresetDetachTransitionResult =
  | Readonly<{
      ok: true
      status: 'detached-aggregate-semantic-no-op'
      transitionIdentity: string
      aggregate: Readonly<ProjectJewelCaseState>
      releaseResult: CaseInsertPresetDetachConfigurationReleaseResult
    }>
  | Readonly<{
      ok: false
      status: CaseInsertPresetDetachTransitionFailureStatus
      code: string
      dimensions?: readonly string[]
      address?: CaseInsertAppliedPresetOwnedFieldAddress
      requirementId?: string
    }>

type Failure = Extract<CaseInsertPresetDetachTransitionResult, { ok: false }>

const PLAN_KEYS = [
  'kind', 'formatVersion', 'operation', 'source', 'preset', 'requestedScope',
  'resolvedRegions', 'releaseFootprint', 'aggregatePreservations', 'warnings',
  'materialConsentRequirements', 'preconditions', 'projectedOwnership',
  'semanticEffects', 'reviewIdentity', 'planIdentity',
] as const
const ADDRESS_KEYS = [
  'region', 'featureOwnerId', 'bindingKind', 'bindingId', 'runtimeObjectId',
  'fieldId',
] as const
const RELEASE_KEYS = [
  'id', 'address', 'currentValue', 'previousLastAppliedValue', 'sources',
  'enablement', 'ownershipDisposition', 'aggregateDisposition',
] as const
const PRESERVATION_KEYS = [
  'id', 'address', 'currentValue', 'previousLastAppliedValue', 'enablement',
  'preservation',
] as const
const WARNING_KEYS = [
  'id', 'kind', 'sourceConfigurationIdentity', 'preset', 'releaseCount',
  'resolvedRegions', 'aggregateEffect',
] as const
const FIELD_PRECONDITION_KEYS = [
  'address', 'bindingMatch', 'currentValue', 'enablement',
] as const
const ENABLEMENT_KEYS = [
  'objectEnabled', 'ownerEnabled', 'effectiveEnabled',
] as const

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

function deepFreeze<T>(value: T, seen = new WeakSet<object>()): T {
  if (value === null || typeof value !== 'object') return value
  if (seen.has(value)) return value
  seen.add(value)
  for (const child of Object.values(value as Record<string, unknown>)) {
    deepFreeze(child, seen)
  }
  return Object.freeze(value)
}

function isDeeplyFrozen(
  value: unknown,
  seen = new WeakSet<object>(),
): boolean {
  if (value === null || typeof value !== 'object') return true
  if (seen.has(value)) return true
  seen.add(value)
  return Object.isFrozen(value) && Object.values(value).every((child) =>
    isDeeplyFrozen(child, seen))
}

function sameValue(
  left: unknown,
  right: unknown,
  seen = new WeakMap<object, WeakSet<object>>(),
): boolean {
  if (left === right) return true
  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right) ||
        left.length !== right.length) return false
  } else if (!isRecord(left) || !isRecord(right)) {
    return false
  }
  const leftObject = left as object
  const rightObject = right as object
  const comparedRights = seen.get(leftObject) ?? new WeakSet<object>()
  if (comparedRights.has(rightObject)) return true
  comparedRights.add(rightObject)
  seen.set(leftObject, comparedRights)
  if (Array.isArray(left) && Array.isArray(right)) {
    return left.every((value, index) => sameValue(value, right[index], seen))
  }
  const leftRecord = left as Record<string, unknown>
  const rightRecord = right as Record<string, unknown>
  const leftKeys = Object.keys(leftRecord)
  const rightKeys = Object.keys(rightRecord)
  return leftKeys.length === rightKeys.length && leftKeys.every((key) =>
    Object.prototype.hasOwnProperty.call(rightRecord, key) &&
    sameValue(leftRecord[key], rightRecord[key], seen))
}

function failure(
  status: CaseInsertPresetDetachTransitionFailureStatus,
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
    ...(options.requirementId ? { requirementId: options.requirementId } : {}),
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

function validAddress(value: unknown) {
  return isRecord(value) && hasExactKeys(value, ADDRESS_KEYS) &&
    typeof value.region === 'string' &&
    typeof value.featureOwnerId === 'string' &&
    (value.bindingKind === 'fixed' || value.bindingKind === 'repeated') &&
    typeof value.bindingId === 'string' &&
    typeof value.runtimeObjectId === 'string' &&
    typeof value.fieldId === 'string'
}

function validEnablement(value: unknown) {
  return isRecord(value) && hasExactKeys(value, ENABLEMENT_KEYS) &&
    typeof value.objectEnabled === 'boolean' &&
    (value.ownerEnabled === null || typeof value.ownerEnabled === 'boolean') &&
    typeof value.effectiveEnabled === 'boolean'
}

function validatePlanShape(value: unknown): value is CaseInsertPresetDetachPlan {
  if (!isRecord(value) || !isDeeplyFrozen(value) ||
      !hasExactKeys(value, PLAN_KEYS) ||
      value.kind !== CASE_INSERT_PRESET_DETACH_PLAN_KIND ||
      value.operation !== 'detach' || !isRecord(value.source) ||
      !hasExactKeys(value.source, [
        'configurationIdentity', 'configurationFormatVersion', 'projectKind',
        'sessionId', 'projectRevision', 'template',
        'configurationSnapshotIdentity',
      ]) || !isRecord(value.preset) ||
      !hasExactKeys(value.preset, ['id', 'revision', 'source']) ||
      !Array.isArray(value.resolvedRegions) ||
      !Array.isArray(value.releaseFootprint) ||
      !Array.isArray(value.aggregatePreservations) ||
      !Array.isArray(value.warnings) ||
      !Array.isArray(value.materialConsentRequirements) ||
      !isRecord(value.preconditions) ||
      !hasExactKeys(value.preconditions, [
        'configurationIdentity', 'projectKind', 'sessionId', 'projectRevision',
        'template', 'resolvedRegions', 'fields',
      ]) || !Array.isArray(value.preconditions.resolvedRegions) ||
      !Array.isArray(value.preconditions.fields) ||
      !isRecord(value.projectedOwnership) ||
      !hasExactKeys(value.projectedOwnership, [
        'kind', 'authority', 'sourceConfigurationIdentity', 'state',
        'ownedFieldCount',
      ]) || !isRecord(value.semanticEffects) ||
      !hasExactKeys(value.semanticEffects, [
        'aggregateWriteCount', 'releasedOwnedFieldCount',
        'releasesCompleteConfiguration', 'preservesEveryAggregateValue',
        'configurationDisposition',
      ]) || typeof value.reviewIdentity !== 'string' ||
      typeof value.planIdentity !== 'string') return false
  return value.releaseFootprint.every((release) =>
    isRecord(release) && hasExactKeys(release, RELEASE_KEYS) &&
    validAddress(release.address) && Array.isArray(release.sources) &&
    validEnablement(release.enablement)) &&
    value.aggregatePreservations.every((preservation) =>
      isRecord(preservation) && hasExactKeys(preservation, PRESERVATION_KEYS) &&
      validAddress(preservation.address) &&
      validEnablement(preservation.enablement)) &&
    value.warnings.every((warning) =>
      isRecord(warning) && hasExactKeys(warning, WARNING_KEYS)) &&
    value.preconditions.fields.every((field) =>
      isRecord(field) && hasExactKeys(field, FIELD_PRECONDITION_KEYS) &&
      validAddress(field.address) && validEnablement(field.enablement))
}

function planContent(plan: CaseInsertPresetDetachPlan) {
  return Object.fromEntries(Object.entries(plan).filter(([key]) =>
    key !== 'reviewIdentity' && key !== 'planIdentity')) as Omit<
      CaseInsertPresetDetachPlan,
      'reviewIdentity' | 'planIdentity'
    >
}

function canonicalPlan(value: unknown): CaseInsertPresetDetachPlan | Failure {
  if (isRecord(value) && value.kind === CASE_INSERT_PRESET_DETACH_PLAN_KIND &&
      value.formatVersion !== CASE_INSERT_PRESET_DETACH_PLAN_FORMAT_VERSION) {
    return failure('unsupported-plan-version', 'detach-plan-version-unsupported')
  }
  if (!validatePlanShape(value)) {
    return failure('invalid-plan', 'detach-plan-shape-invalid')
  }
  let content: Omit<
    CaseInsertPresetDetachPlan,
    'reviewIdentity' | 'planIdentity'
  >
  try {
    content = canonicalizeCaseInsertPresetDetachPlanContent(planContent(value))
  } catch {
    return failure('invalid-plan', 'detach-plan-canonicalization-failed')
  }
  for (const release of content.releaseFootprint) {
    const { id, ...releaseContent } = release
    if (id !== createCaseInsertPresetDetachReleaseIdentity(releaseContent)) {
      return failure('plan-identity-mismatch', 'release-identity-mismatch', {
        address: release.address,
      })
    }
  }
  for (const preservation of content.aggregatePreservations) {
    const { id, ...preservationContent } = preservation
    if (id !== createCaseInsertPresetDetachPreservationIdentity(
      preservationContent,
    )) return failure(
      'plan-identity-mismatch',
      'preservation-identity-mismatch',
      { address: preservation.address },
    )
  }
  for (const warning of content.warnings) {
    const { id, ...warningContent } = warning
    if (id !== createCaseInsertPresetDetachWarningIdentity(warningContent)) {
      return failure('plan-identity-mismatch', 'warning-identity-mismatch')
    }
  }
  const reviewIdentity = createCaseInsertPresetDetachReviewIdentity(content)
  if (value.reviewIdentity !== reviewIdentity) {
    return failure('plan-identity-mismatch', 'detach-review-identity-mismatch')
  }
  const planIdentity = createCaseInsertPresetDetachPlanIdentity({
    ...content,
    reviewIdentity,
  })
  if (value.planIdentity !== planIdentity) {
    return failure('plan-identity-mismatch', 'detach-plan-identity-mismatch')
  }
  return deepFreeze({ ...content, reviewIdentity, planIdentity })
}

function mapConfigurationFailure(
  result: Extract<
    ReturnType<typeof validateCaseInsertAppliedPresetConfiguration>,
    { ok: false }
  >,
): Failure {
  if (result.status === 'unsupported-configuration-version') {
    return failure('unsupported-configuration-version', result.code)
  }
  if (result.code === 'identity-invalid') {
    return failure('configuration-identity-mismatch', result.code)
  }
  if (result.code === 'owned-field-address-duplicate') {
    return failure('duplicate-owned-address', result.code)
  }
  if (result.code === 'owned-field-region-invalid') {
    return failure('invalid-region', result.code)
  }
  if (result.code === 'configuration-owned-field-unsupported' ||
      result.code === 'owned-field-unsupported') {
    return failure('unsupported-owned-field', result.code)
  }
  return failure('invalid-source-configuration', result.code)
}

function validatePlanSemantics(
  plan: CaseInsertPresetDetachPlan,
  configuration: CaseInsertAppliedPresetConfiguration,
): Failure | null {
  if (configuration.ownedFields.length === 0) {
    return failure('footprint-mismatch', 'source-owned-footprint-empty')
  }
  if (plan.source.configurationIdentity !== configuration.configurationIdentity ||
      plan.preconditions.configurationIdentity !==
        configuration.configurationIdentity ||
      plan.projectedOwnership.sourceConfigurationIdentity !==
        configuration.configurationIdentity) {
    return failure('configuration-mismatch', 'plan-configuration-mismatch')
  }
  if (plan.source.configurationFormatVersion !== configuration.formatVersion ||
      plan.source.projectKind !== 'caseInsert' ||
      plan.preconditions.projectKind !== 'caseInsert' ||
      !sameValue(plan.source.configurationSnapshotIdentity,
        configuration.source.snapshotIdentity) ||
      !sameValue(plan.preset, configuration.preset) ||
      !sameValue(plan.requestedScope, configuration.requestedScope) ||
      !sameValue(plan.resolvedRegions, configuration.resolvedRegions) ||
      !sameValue(plan.preconditions.resolvedRegions,
        configuration.resolvedRegions) ||
      plan.source.sessionId !== plan.preconditions.sessionId ||
      plan.source.projectRevision !== plan.preconditions.projectRevision ||
      !sameValue(plan.source.template, plan.preconditions.template) ||
      !sameValue(plan.source.template, configuration.template)) {
    return failure('invalid-plan', 'detach-plan-context-incoherent')
  }

  const configurationByAddress = new Map(configuration.ownedFields.map((field) =>
    [addressKey(field.address), field]))
  const releaseByAddress = new Map<string, CaseInsertPresetDetachReleaseRecord>()
  for (const release of plan.releaseFootprint) {
    const key = addressKey(release.address)
    if (releaseByAddress.has(key)) {
      return failure('duplicate-owned-address', 'release-address-duplicate', {
        address: release.address,
      })
    }
    const field = configurationByAddress.get(key)
    if (!field) {
      return failure('footprint-mismatch', 'release-address-not-owned', {
        address: release.address,
      })
    }
    if (!isCaseInsertPresetOwnedFieldSemanticValue(
      release.address.fieldId,
      release.currentValue,
    ) || release.previousLastAppliedValue !== field.lastAppliedValue ||
        !sameValue(release.sources, field.sources) ||
        release.ownershipDisposition !==
          'release-complete-configuration-ownership' ||
        release.aggregateDisposition !== 'preserve-exact-current-value') {
      return failure('unsupported-release-record', 'release-record-incoherent', {
        address: release.address,
      })
    }
    releaseByAddress.set(key, release)
  }
  if (releaseByAddress.size !== configurationByAddress.size ||
      [...configurationByAddress.keys()].some((key) =>
        !releaseByAddress.has(key))) {
    return failure('footprint-mismatch', 'release-footprint-incomplete')
  }

  const preservationByAddress = new Map<
    string,
    CaseInsertPresetDetachAggregatePreservation
  >()
  for (const preservation of plan.aggregatePreservations) {
    const key = addressKey(preservation.address)
    if (preservationByAddress.has(key)) {
      return failure('duplicate-owned-address', 'preservation-address-duplicate', {
        address: preservation.address,
      })
    }
    const release = releaseByAddress.get(key)
    if (!release || preservation.currentValue !== release.currentValue ||
        preservation.previousLastAppliedValue !==
          release.previousLastAppliedValue ||
        !sameValue(preservation.enablement, release.enablement) ||
        preservation.preservation !== 'exact-current-value-no-write') {
      return failure(
        'footprint-mismatch',
        'release-preservation-footprint-mismatch',
        { address: preservation.address },
      )
    }
    preservationByAddress.set(key, preservation)
  }
  if (preservationByAddress.size !== releaseByAddress.size ||
      [...releaseByAddress.keys()].some((key) =>
        !preservationByAddress.has(key))) {
    return failure('footprint-mismatch', 'preservation-footprint-incomplete')
  }

  const preconditionByAddress = new Map<string,
    CaseInsertPresetDetachPlan['preconditions']['fields'][number]>()
  for (const precondition of plan.preconditions.fields) {
    const key = addressKey(precondition.address)
    if (preconditionByAddress.has(key)) {
      return failure('duplicate-owned-address', 'precondition-address-duplicate', {
        address: precondition.address,
      })
    }
    const release = releaseByAddress.get(key)
    if (!release || precondition.bindingMatch !== 'exactly-one' ||
        precondition.currentValue !== release.currentValue ||
        !sameValue(precondition.enablement, release.enablement)) {
      return failure('invalid-plan', 'field-precondition-incoherent', {
        address: precondition.address,
      })
    }
    preconditionByAddress.set(key, precondition)
  }
  if (preconditionByAddress.size !== releaseByAddress.size ||
      [...releaseByAddress.keys()].some((key) =>
        !preconditionByAddress.has(key))) {
    return failure('footprint-mismatch', 'precondition-footprint-incomplete')
  }

  const expectedWarningContent = {
    kind: 'complete-applied-preset-ownership-release' as const,
    sourceConfigurationIdentity: configuration.configurationIdentity,
    preset: {
      id: configuration.preset.id,
      revision: configuration.preset.revision,
    },
    releaseCount: configuration.ownedFields.length,
    resolvedRegions: [...configuration.resolvedRegions],
    aggregateEffect: 'preserve-every-current-value' as const,
  }
  const expectedWarning: CaseInsertPresetDetachWarning = {
    id: createCaseInsertPresetDetachWarningIdentity(expectedWarningContent),
    ...expectedWarningContent,
  }
  if (plan.warnings.length !== 1 ||
      !sameValue(plan.warnings[0], expectedWarning) ||
      plan.materialConsentRequirements.length !== 0) {
    return failure('invalid-plan', 'detach-warning-or-requirements-incoherent')
  }
  if (plan.projectedOwnership.kind !==
      CASE_INSERT_PRESET_DETACH_OWNERSHIP_PROJECTION_KIND ||
      plan.projectedOwnership.authority !==
        'non-authoritative-detach-projection' ||
      plan.projectedOwnership.state !== 'no-applied-preset-ownership' ||
      plan.projectedOwnership.ownedFieldCount !== 0) {
    return failure(
      'projected-ownership-mismatch',
      'detach-ownership-projection-incoherent',
    )
  }
  if (plan.semanticEffects.aggregateWriteCount !== 0 ||
      plan.semanticEffects.releasedOwnedFieldCount !==
        configuration.ownedFields.length ||
      plan.semanticEffects.releasesCompleteConfiguration !== true ||
      plan.semanticEffects.preservesEveryAggregateValue !== true ||
      plan.semanticEffects.configurationDisposition !==
        'remove-authoritative-applied-preset-configuration') {
    return failure('invalid-plan', 'detach-semantic-effects-incoherent')
  }
  return null
}

function reviewAcceptanceContent(plan: CaseInsertPresetDetachPlan) {
  return {
    kind: CASE_INSERT_PRESET_DETACH_REVIEW_ACCEPTANCE_KIND,
    formatVersion: CASE_INSERT_PRESET_DETACH_REVIEW_ACCEPTANCE_VERSION,
    decision: 'accepted' as const,
    operation: 'detach' as const,
    planIdentity: plan.planIdentity,
    planReviewIdentity: plan.reviewIdentity,
    sourceConfigurationIdentity: plan.source.configurationIdentity,
    reviewedWarningIds: plan.warnings
      .map(({ id }) => id).sort(),
    materialConsentRequirementIds: [] as string[],
  }
}

export function createCaseInsertPresetDetachReviewAcceptance(
  plan: CaseInsertPresetDetachPlan,
): CaseInsertPresetDetachReviewAcceptance {
  const content = reviewAcceptanceContent(plan)
  return deepFreeze({
    ...content,
    acceptanceIdentity:
      createCaseInsertPresetDetachReviewAcceptanceIdentity(content),
  })
}

function validateReviewAcceptance(
  plan: CaseInsertPresetDetachPlan,
  value: unknown,
): Failure | null {
  if (value === null || value === undefined) {
    return failure('missing-review-acceptance', 'review-acceptance-missing')
  }
  if (isRecord(value) &&
      value.kind === CASE_INSERT_PRESET_DETACH_REVIEW_ACCEPTANCE_KIND &&
      value.formatVersion !==
        CASE_INSERT_PRESET_DETACH_REVIEW_ACCEPTANCE_VERSION) {
    return failure('invalid-review-acceptance', 'review-version-unsupported')
  }
  if (!isRecord(value) || !isDeeplyFrozen(value) || !hasExactKeys(value, [
    'kind', 'formatVersion', 'decision', 'operation', 'planIdentity',
    'planReviewIdentity', 'sourceConfigurationIdentity', 'reviewedWarningIds',
    'materialConsentRequirementIds', 'acceptanceIdentity',
  ])) return failure('invalid-review-acceptance', 'review-acceptance-invalid')
  return sameValue(value, createCaseInsertPresetDetachReviewAcceptance(plan))
    ? null
    : failure('review-mismatch', 'review-acceptance-mismatch')
}

function validateMaterialConsentAcceptances(
  plan: CaseInsertPresetDetachPlan,
  values: unknown,
): Failure | null {
  if (!Array.isArray(values)) {
    return failure('missing-material-consent', 'consent-acceptances-invalid')
  }
  const seen = new Set<string>()
  for (const value of values) {
    const requirementId = isRecord(value) &&
        typeof value.requirementId === 'string'
      ? value.requirementId
      : undefined
    if (requirementId && seen.has(requirementId)) {
      return failure('duplicate-material-consent', 'consent-duplicate', {
        requirementId,
      })
    }
    if (requirementId) seen.add(requirementId)
  }
  if (plan.materialConsentRequirements.length === 0 && values.length > 0) {
    const first = values[0]
    return failure('unexpected-material-consent', 'consent-unexpected', {
      requirementId: isRecord(first) && typeof first.requirementId === 'string'
        ? first.requirementId
        : undefined,
    })
  }
  if (values.length !== plan.materialConsentRequirements.length) {
    return failure('missing-material-consent', 'consent-set-incomplete')
  }
  return values.length === 0
    ? null
    : failure('material-consent-mismatch', 'consent-set-unsupported')
}

function preflightCurrent(
  plan: CaseInsertPresetDetachPlan,
  current: TransitionCaseInsertPresetDetachInput['current'],
): Readonly<{ aggregate: ProjectJewelCaseState }> | Failure {
  if (!isRecord(current) || current.projectKind !== 'caseInsert' ||
      typeof current.sessionId !== 'string' ||
      current.sessionId.trim().length === 0 ||
      typeof current.projectRevision !== 'number' ||
      !Number.isSafeInteger(current.projectRevision) ||
      current.projectRevision < 0 || !isRecord(current.template) ||
      typeof current.template.id !== 'string' ||
      current.template.revision !== null || !isRecord(current.aggregate)) {
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
    return failure('stale-detach-plan', 'detach-context-stale', { dimensions })
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
  if (!isCaseInsertPresetAssignmentSnapshot(current.snapshot)) {
    return failure('attachment-context-mismatch', 'current-snapshot-invalid')
  }
  if (current.snapshot.identity.sessionId !== current.sessionId ||
      current.snapshot.identity.projectRevision !== current.projectRevision ||
      !sameValue(current.snapshot.identity.template, current.template) ||
      !sameValue(current.snapshot.caseInsert, normalized)) {
    return failure('stale-detach-plan', 'current-snapshot-stale')
  }

  const preservationByAddress = new Map(plan.aggregatePreservations.map(
    (preservation) => [addressKey(preservation.address), preservation],
  ))
  const preconditionByAddress = new Map(plan.preconditions.fields.map(
    (precondition) => [addressKey(precondition.address), precondition],
  ))
  for (const release of plan.releaseFootprint) {
    let binding: ReturnType<typeof resolveCaseInsertPresetAggregateBinding>
    try {
      binding = resolveCaseInsertPresetAggregateBinding(
        normalized,
        release.address.featureOwnerId,
        { kind: release.address.bindingKind, id: release.address.bindingId },
      )
    } catch {
      return failure('transition-conflict', 'detach-target-lookup-failed', {
        address: release.address,
      })
    }
    if (binding.status === 'missing' || binding.status === 'unsupported') {
      return failure('target-missing', 'detach-target-missing', {
        address: release.address,
      })
    }
    if (binding.status === 'ambiguous') {
      return failure('target-ambiguous', 'detach-target-ambiguous', {
        address: release.address,
      })
    }
    if (binding.status !== 'found' ||
        binding.currentState.id !== release.address.runtimeObjectId) {
      return failure('target-missing', 'detach-target-address-mismatch', {
        address: release.address,
      })
    }
    const currentValue = getCaseInsertPresetOwnedFieldCurrentValue(
      binding.currentState,
      release.address.fieldId,
    )
    if (!isCaseInsertPresetOwnedFieldSemanticValue(
      release.address.fieldId,
      currentValue,
    )) return failure('invalid-current-value', 'current-value-invalid', {
      address: release.address,
    })
    const preservation = preservationByAddress.get(addressKey(release.address))!
    const precondition = preconditionByAddress.get(addressKey(release.address))!
    if (currentValue !== release.currentValue ||
        currentValue !== preservation.currentValue ||
        currentValue !== precondition.currentValue ||
        !sameValue(binding.enablement, release.enablement) ||
        !sameValue(binding.enablement, preservation.enablement) ||
        !sameValue(binding.enablement, precondition.enablement)) {
      return failure('stale-detach-plan', 'field-precondition-stale', {
        address: release.address,
      })
    }
  }
  return { aggregate: normalized }
}

function validateReleaseResult(
  result: CaseInsertPresetDetachConfigurationReleaseResult,
  plan: CaseInsertPresetDetachPlan,
  configuration: CaseInsertAppliedPresetConfiguration,
  acceptance: CaseInsertPresetDetachReviewAcceptance,
) {
  const expectedTransitionIdentity = createCaseInsertPresetDetachTransitionIdentity({
    operation: 'detach',
    status: 'detached-aggregate-semantic-no-op',
    planIdentity: plan.planIdentity,
    planReviewIdentity: plan.reviewIdentity,
    sourceConfigurationIdentity: configuration.configurationIdentity,
    reviewAcceptanceIdentity: acceptance.acceptanceIdentity,
    reviewedWarningIds: plan.warnings.map(({ id }) => id).sort(),
    acceptedMaterialConsentRequirementIds: [] as string[],
    current: cloneMutable(result.context),
    releasedFootprint: cloneMutable(plan.releaseFootprint),
    aggregateWriteCount: 0,
    nextAppliedPresetConfiguration: null,
    applicationAdoptionStatus: 'not-adopted',
  })
  return result.transitionIdentity === expectedTransitionIdentity &&
    result.releasedFootprint.length === configuration.ownedFields.length &&
    result.proof.sourceOwnedFieldCount === configuration.ownedFields.length &&
    result.proof.releasedOwnedFieldCount === configuration.ownedFields.length &&
    result.proof.aggregateWriteCount === 0 &&
    result.nextAppliedPresetConfiguration === null &&
    result.applicationAdoptionStatus === 'not-adopted'
}

export function transitionCaseInsertPresetDetach(
  input: TransitionCaseInsertPresetDetachInput,
): CaseInsertPresetDetachTransitionResult {
  if (!isRecord(input)) return failure('invalid-request', 'request-invalid')
  if (input.operation !== 'detach') {
    return failure('unsupported-operation', 'operation-must-be-detach')
  }
  const planResult = canonicalPlan(input.plan)
  if ('ok' in planResult && planResult.ok === false) return planResult
  const plan = planResult as CaseInsertPresetDetachPlan

  const validatedConfiguration = validateCaseInsertAppliedPresetConfiguration(
    canonicalizeCaseInsertAppliedPresetConfigurationOrdering(
      input.sourceConfiguration,
    ),
  )
  if (!validatedConfiguration.ok) {
    return mapConfigurationFailure(validatedConfiguration)
  }
  const configuration = validatedConfiguration.configuration
  const semanticFailure = validatePlanSemantics(plan, configuration)
  if (semanticFailure) return semanticFailure
  const reviewFailure = validateReviewAcceptance(plan, input.reviewAcceptance)
  if (reviewFailure) return reviewFailure
  const consentFailure = validateMaterialConsentAcceptances(
    plan,
    input.materialConsentAcceptances,
  )
  if (consentFailure) return consentFailure
  const currentResult = preflightCurrent(plan, input.current)
  if ('ok' in currentResult && currentResult.ok === false) return currentResult
  const current = currentResult as Readonly<{ aggregate: ProjectJewelCaseState }>

  // All structural, identity, authority, acceptance, footprint, target, and
  // value checks are complete above. Success construction begins only here.
  const acceptance = input.reviewAcceptance as
    CaseInsertPresetDetachReviewAcceptance
  const context = deepFreeze({
    projectKind: 'caseInsert' as const,
    sessionId: input.current.sessionId as string,
    projectRevision: input.current.projectRevision as number,
    template: cloneMutable(input.current.template) as {
      id: string
      revision: null
    },
  })
  const reviewedWarningIds = plan.warnings.map(({ id }) => id).sort()
  const acceptedMaterialConsentRequirementIds: string[] = []
  const transitionIdentity = createCaseInsertPresetDetachTransitionIdentity({
    operation: 'detach',
    status: 'detached-aggregate-semantic-no-op',
    planIdentity: plan.planIdentity,
    planReviewIdentity: plan.reviewIdentity,
    sourceConfigurationIdentity: configuration.configurationIdentity,
    reviewAcceptanceIdentity: acceptance.acceptanceIdentity,
    reviewedWarningIds,
    acceptedMaterialConsentRequirementIds,
    current: cloneMutable(context),
    releasedFootprint: cloneMutable(plan.releaseFootprint),
    aggregateWriteCount: 0,
    nextAppliedPresetConfiguration: null,
    applicationAdoptionStatus: 'not-adopted',
  })
  const aggregate = deepFreeze(cloneMutable(current.aggregate))
  const releaseResult = deepFreeze({
    kind: CASE_INSERT_PRESET_DETACH_RELEASE_RESULT_KIND,
    formatVersion: CASE_INSERT_PRESET_DETACH_RELEASE_RESULT_VERSION,
    domainStatus: 'validated-authoritative-transition-evidence' as const,
    operation: 'detach' as const,
    transitionIdentity,
    transitionClassification:
      'meaningful-configuration-ownership-release' as const,
    sourceConfigurationIdentity: configuration.configurationIdentity,
    sourceConfigurationFormatVersion: configuration.formatVersion,
    preset: cloneMutable(configuration.preset),
    planIdentity: plan.planIdentity,
    planReviewIdentity: plan.reviewIdentity,
    reviewAcceptanceIdentity: acceptance.acceptanceIdentity,
    reviewedWarningIds,
    acceptedMaterialConsentRequirementIds,
    context,
    releasedFootprint: cloneMutable(plan.releaseFootprint),
    proof: {
      sourceOwnedFieldCount: configuration.ownedFields.length,
      releasedOwnedFieldCount: plan.releaseFootprint.length,
      releasesCompleteConfiguration: true as const,
      aggregateWriteCount: 0 as const,
      aggregateClassification: 'aggregate-semantic-no-write' as const,
      preservesEveryAggregateValue: true as const,
    },
    nextAppliedPresetConfiguration: null,
    applicationAdoptionStatus: 'not-adopted' as const,
  })
  if (!sameValue(aggregate, current.aggregate) || !isDeeplyFrozen(aggregate) ||
      !isDeeplyFrozen(releaseResult) || !validateReleaseResult(
        releaseResult,
        plan,
        configuration,
        acceptance,
      )) {
    return failure('release-validation-failed', 'detach-release-self-invalid')
  }
  return deepFreeze({
    ok: true,
    status: 'detached-aggregate-semantic-no-op' as const,
    transitionIdentity,
    aggregate,
    releaseResult,
  })
}
