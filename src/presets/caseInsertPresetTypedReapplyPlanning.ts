import {
  isCaseInsertPresetAssignmentSnapshot,
  resolveCaseInsertPresetAggregateBinding,
  type CaseInsertPresetAssignmentSnapshot,
  type CaseInsertPresetSnapshotEnablement,
} from '../caseInsert/presetAssignmentSnapshot.ts'
import { normalizeProjectJewelCaseState } from '../caseInsert/normalization.ts'
import type {
  CaseInsertPresetAggregateContentIdentity,
} from '../caseInsert/presetAggregateIdentity.ts'
import type { ProjectJewelCaseState } from '../project/projectTypes.ts'
import {
  getCaseInsertPresetApplicationScopeKey,
  parseCaseInsertPresetDefinition,
  type CaseInsertPresetApplicationScope,
  type CaseInsertPresetConcreteRegionId,
  type CaseInsertPresetId,
} from './caseInsertPresetDefinition.ts'
import {
  createCaseInsertPresetResolvedLayoutProposal,
  type CaseInsertPresetPlanArtworkViewportAction,
  type CaseInsertPresetPlanFieldAction,
  type CaseInsertPresetPlanObjectCreationAction,
  type CaseInsertPresetPlanPreservationDecision,
  type CaseInsertPresetPlanSkip,
  type CaseInsertPresetPlanSourceAssignment,
} from './caseInsertPresetApplyPlanning.ts'
import {
  resolveCaseInsertPresetAssignmentsForDefinition,
} from './caseInsertPresetAssignmentResolution.ts'
import {
  CASE_INSERT_PRESET_TYPED_CUSTOMIZATION_REPORT_VERSION,
  CASE_INSERT_VIEWPORT_APPLIED_PRESET_CONFIGURATION_VERSION,
  detectCaseInsertPresetCustomization,
  validateCaseInsertAppliedPresetConfiguration,
  validateCaseInsertPresetCustomizationReport,
  type CaseInsertAppliedPresetOwnedFieldAddressV3,
  type CaseInsertAppliedPresetOwnedValue,
  type CaseInsertPresetOwnedFieldObservation,
  type CaseInsertPresetTypedCustomizationFieldRecord,
  type CaseInsertViewportAppliedPresetConfiguration,
} from './caseInsertPresetAppliedConfiguration.ts'
import {
  createCaseInsertPresetDeterministicIdentityDigest,
  encodeCaseInsertPresetDeterministicIdentity,
} from './caseInsertPresetDeterministicIdentity.ts'
import {
  deepFreezeCaseInsertPresetValue,
  sameCaseInsertPresetValue,
} from './caseInsertPresetSafeInput.ts'
import {
  CASE_INSERT_PRESET_TYPED_REAPPLY_PLAN_IDENTITY_PREFIX,
  CASE_INSERT_PRESET_TYPED_REAPPLY_REQUIREMENT_IDENTITY_PREFIX,
  CASE_INSERT_PRESET_TYPED_REAPPLY_REVIEW_IDENTITY_PREFIX,
  CASE_INSERT_PRESET_TYPED_REAPPLY_WARNING_IDENTITY_PREFIX,
} from './caseInsertPresetTypedReapplyIdentity.ts'

export {
  CASE_INSERT_PRESET_TYPED_REAPPLY_PLAN_IDENTITY_PREFIX,
  CASE_INSERT_PRESET_TYPED_REAPPLY_REQUIREMENT_IDENTITY_PREFIX,
  CASE_INSERT_PRESET_TYPED_REAPPLY_REVIEW_IDENTITY_PREFIX,
  CASE_INSERT_PRESET_TYPED_REAPPLY_WARNING_IDENTITY_PREFIX,
} from './caseInsertPresetTypedReapplyIdentity.ts'

export const CASE_INSERT_PRESET_TYPED_REAPPLY_PLAN_FORMAT_VERSION = 3 as const
export const CASE_INSERT_PRESET_TYPED_REAPPLY_CONFIGURATION_PROJECTION_KIND =
  'sbls/case-insert-preset-typed-reapply-configuration-projection' as const

export type CaseInsertPresetTypedCustomizedFieldPolicyRecord = Readonly<{
  configurationIdentity: string
  customizationReportIdentity: string
  address: CaseInsertAppliedPresetOwnedFieldAddressV3
  lastAppliedValue: CaseInsertAppliedPresetOwnedValue
  observation: CaseInsertPresetOwnedFieldObservation
  selectedPreset: Readonly<{ id: CaseInsertPresetId; revision: number }>
  policy:
    | 'overwrite-with-selected-preset'
    | 'preserve-current-customization'
}>

export type CaseInsertPresetTypedReapplyFieldDisposition =
  | 'retained-clean'
  | 'retained-customized-overwrite'
  | 'retained-customized-preserve'
  | 'retained-unavailable-overwrite'
  | 'retained-unavailable-preserve'
  | 'new-claim'
  | 'retired'

export type CaseInsertPresetTypedReapplyFieldEffect = Readonly<{
  address: CaseInsertAppliedPresetOwnedFieldAddressV3
  disposition: CaseInsertPresetTypedReapplyFieldDisposition
  policy:
    | 'overwrite-with-selected-preset'
    | 'preserve-current-customization'
    | null
  currentObservation: CaseInsertPresetOwnedFieldObservation
  previousLastAppliedValue: CaseInsertAppliedPresetOwnedValue | null
  selectedProposedValue: CaseInsertAppliedPresetOwnedValue | null
  projectedLastAppliedValue: CaseInsertAppliedPresetOwnedValue | null
  previousSources: readonly CaseInsertPresetPlanSourceAssignment[]
  selectedSources: readonly CaseInsertPresetPlanSourceAssignment[]
  projectedSources: readonly CaseInsertPresetPlanSourceAssignment[]
  aggregateWriteRequired: boolean
  ownershipOutcome: 'retained' | 'claimed' | 'retired'
  projectedCustomizationStatus: 'clean' | 'customized' | 'not-owned'
  enablement: CaseInsertPresetSnapshotEnablement | null
}>

export type CaseInsertPresetTypedReapplyDirectWrite = Readonly<{
  id: string
  kind: CaseInsertPresetPlanFieldAction['kind']
  address: CaseInsertAppliedPresetOwnedFieldAddressV3
  currentValuePrecondition: number
  proposedValue: number
  materialConsentRequirementIds: readonly string[]
}>

export type CaseInsertPresetTypedReapplyMaterialConsentRequirement = Readonly<{
  id: string
  kind:
    | 'overwrite-customized-owned-field'
    | 'new-field-claim-with-value-change'
    | 'multiple-concrete-regions'
    | 'material-visible-clipping'
  address: CaseInsertAppliedPresetOwnedFieldAddressV3 | null
  policy: 'overwrite-with-selected-preset' | null
  selectedPreset: Readonly<{ id: CaseInsertPresetId; revision: number }>
  sourceConfigurationIdentity: string
  sourceCustomizationReportIdentity: string
  evidence: Readonly<Record<string, unknown>>
}>

export type CaseInsertPresetTypedReapplyWarning = Readonly<{
  id: string
  kind: string
  evidence: Readonly<Record<string, unknown>>
}>

export type CaseInsertPresetTypedReapplyPlan = Readonly<{
  kind: 'sbls/case-insert-preset-reapply-plan'
  formatVersion: typeof CASE_INSERT_PRESET_TYPED_REAPPLY_PLAN_FORMAT_VERSION
  operation: 'reapply'
  source: Readonly<{
    configurationIdentity: string
    customizationReportIdentity: string
    projectKind: 'caseInsert'
    sessionId: string
    projectRevision: number
    template: Readonly<{ id: string; revision: null }>
    aggregateContentIdentity: CaseInsertPresetAggregateContentIdentity
  }>
  preset: Readonly<{
    id: CaseInsertPresetId
    previousRevision: number
    selectedRevision: number
    source: 'builtin' | 'user'
  }>
  requestedScope: CaseInsertPresetApplicationScope
  resolvedRegions: readonly CaseInsertPresetConcreteRegionId[]
  resolvedAssignments: readonly Readonly<Record<string, unknown>>[]
  selectedFootprint: readonly Readonly<{
    address: CaseInsertAppliedPresetOwnedFieldAddressV3
    proposedValue: CaseInsertAppliedPresetOwnedValue
    sources: readonly CaseInsertPresetPlanSourceAssignment[]
  }>[]
  fieldEffects: readonly CaseInsertPresetTypedReapplyFieldEffect[]
  fieldActions: readonly CaseInsertPresetTypedReapplyDirectWrite[]
  aggregateWrites: readonly CaseInsertPresetTypedReapplyDirectWrite[]
  objectCreationActions: readonly CaseInsertPresetPlanObjectCreationAction[]
  artworkViewportActions: readonly (CaseInsertPresetPlanArtworkViewportAction &
    Readonly<{
      writeOwnedFieldIds: readonly CaseInsertPresetPlanArtworkViewportAction[
        'ownedFieldIds'
      ][number][]
    }>)[]
  preservedCustomizedFields: readonly CaseInsertPresetTypedReapplyFieldEffect[]
  newlyClaimedFields: readonly CaseInsertPresetTypedReapplyFieldEffect[]
  retiredFields: readonly CaseInsertPresetTypedReapplyFieldEffect[]
  projectedConfiguration: Readonly<{
    kind: typeof CASE_INSERT_PRESET_TYPED_REAPPLY_CONFIGURATION_PROJECTION_KIND
    authority: 'non-authoritative-uninstalled-projection'
    sourceConfigurationIdentity: string
    sourceCustomizationReportIdentity: string
    selectedPreset: Readonly<{
      id: CaseInsertPresetId
      revision: number
      source: 'builtin' | 'user'
    }>
    requestedScope: CaseInsertPresetApplicationScope
    resolvedRegions: readonly CaseInsertPresetConcreteRegionId[]
    ownedFields: readonly Readonly<{
      address: CaseInsertAppliedPresetOwnedFieldAddressV3
      lastAppliedValue: CaseInsertAppliedPresetOwnedValue
      sources: readonly CaseInsertPresetPlanSourceAssignment[]
      expectedCustomizationStatus: 'clean' | 'customized'
    }>[]
  }>
  preservationDecisions: readonly CaseInsertPresetPlanPreservationDecision[]
  skips: readonly CaseInsertPresetPlanSkip[]
  warnings: readonly CaseInsertPresetTypedReapplyWarning[]
  blockers: readonly []
  materialConsentRequirements:
    readonly CaseInsertPresetTypedReapplyMaterialConsentRequirement[]
  preconditions: Readonly<{
    configurationIdentity: string
    customizationReportIdentity: string
    projectKind: 'caseInsert'
    sessionId: string
    projectRevision: number
    template: Readonly<{ id: string; revision: null }>
    aggregateContentIdentity: CaseInsertPresetAggregateContentIdentity
    selectedPreset: Readonly<{ id: CaseInsertPresetId; revision: number }>
    scopeKey: string
    resolvedRegions: readonly CaseInsertPresetConcreteRegionId[]
    fields: readonly Readonly<{
      address: CaseInsertAppliedPresetOwnedFieldAddressV3
      observation: CaseInsertPresetOwnedFieldObservation
      enablement: CaseInsertPresetSnapshotEnablement | null
    }>[]
  }>
  semanticEffects: Readonly<{
    aggregateWriteCount: number
    objectCreationCount: number
    artworkViewportWriteCount: number
    configurationEffect: true
  }>
  reviewIdentity: string
}>

export type PlanCaseInsertPresetTypedReapplyInput = Readonly<{
  operation: unknown
  configuration: unknown
  customizationReport: unknown
  current: Readonly<{
    projectKind: unknown
    aggregate: ProjectJewelCaseState
    sessionId: unknown
    projectRevision: unknown
    template: Readonly<{ id: unknown; revision: unknown }>
    snapshot: CaseInsertPresetAssignmentSnapshot
  }>
  selectedDefinition: unknown
  customizedFieldPolicies: readonly unknown[]
}>

export type CaseInsertPresetTypedReapplyPlanningResult =
  | Readonly<{
      ok: true
      status: 'planned' | 'aggregate-semantic-no-op'
      plan: CaseInsertPresetTypedReapplyPlan
    }>
  | Readonly<{
      ok: false
      status:
        | 'invalid-request'
        | 'invalid-configuration'
        | 'unsupported-configuration-version'
        | 'invalid-customization-report'
        | 'unsupported-report-version'
        | 'report-mismatch'
        | 'stale-customization-report'
        | 'attachment-context-mismatch'
        | 'invalid-selected-definition'
        | 'preset-identity-mismatch'
        | 'incompatible-selected-definition'
        | 'unsupported-operation'
        | 'policy-incomplete'
        | 'policy-mismatch'
        | 'unsupported-policy'
        | 'target-missing'
        | 'target-ambiguous'
        | 'unsupported-owned-field'
        | 'invalid-current-value'
        | 'resolution-blocked'
        | 'transition-conflict'
      code: string
      dimensions?: readonly string[]
      address?: CaseInsertAppliedPresetOwnedFieldAddressV3
    }>

type TypedFailure = Extract<
  CaseInsertPresetTypedReapplyPlanningResult,
  { ok: false }
>

type SelectedField = Readonly<{
  address: CaseInsertAppliedPresetOwnedFieldAddressV3
  proposedValue: CaseInsertAppliedPresetOwnedValue
  sources: readonly CaseInsertPresetPlanSourceAssignment[]
  directAction: CaseInsertPresetPlanFieldAction | null
  viewportAction: CaseInsertPresetPlanArtworkViewportAction | null
}>

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function cloneMutable<T>(value: T): T {
  if (value === null || typeof value !== 'object') return value
  if (Array.isArray(value)) return value.map(cloneMutable) as T
  return Object.fromEntries(Object.entries(value as Record<string, unknown>)
    .map(([key, child]) => [key, cloneMutable(child)])) as T
}

function failure(
  status: TypedFailure['status'],
  code: string,
  options: Readonly<{
    dimensions?: readonly string[]
    address?: CaseInsertAppliedPresetOwnedFieldAddressV3
  }> = {},
): TypedFailure {
  return deepFreezeCaseInsertPresetValue({
    ok: false,
    status,
    code,
    ...(options.dimensions ? { dimensions: [...options.dimensions] } : {}),
    ...(options.address ? { address: cloneMutable(options.address) } : {}),
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

function objectKey(address: CaseInsertAppliedPresetOwnedFieldAddressV3) {
  return [
    address.featureOwnerId,
    address.bindingKind,
    address.bindingId,
    address.runtimeObjectId,
  ].join('\u0000')
}

const REGION_ORDER = new Map([
  ['front-cover', 0],
  ['tray-card', 1],
  ['back-panel', 2],
  ['left-spine', 3],
  ['right-spine', 4],
])
const FIELD_ORDER = new Map([
  ['object-presence', 0],
  ['layout-x', 1],
  ['layout-y', 2],
  ['layout-scale', 3],
  ['layout-width', 4],
  ['image-fit', 5],
  ['reserved-artwork-viewport', 6],
])

function addressSort(
  left: CaseInsertAppliedPresetOwnedFieldAddressV3,
  right: CaseInsertAppliedPresetOwnedFieldAddressV3,
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

function cloneSources(
  sources: readonly CaseInsertPresetPlanSourceAssignment[],
) {
  return sources.map(cloneMutable).sort(sourceSort)
}

function canonicalPlanContent(
  plan: Omit<CaseInsertPresetTypedReapplyPlan, 'reviewIdentity'>,
) {
  const canonicalRegions = (regions: readonly CaseInsertPresetConcreteRegionId[]) =>
    [...regions].sort((left, right) =>
      (REGION_ORDER.get(left) ?? 99) - (REGION_ORDER.get(right) ?? 99))
  const canonicalEffect = (
    effect: CaseInsertPresetTypedReapplyFieldEffect,
  ) => ({
    ...cloneMutable(effect),
    previousSources: cloneSources(effect.previousSources),
    selectedSources: cloneSources(effect.selectedSources),
    projectedSources: cloneSources(effect.projectedSources),
  })
  return {
    ...cloneMutable(plan),
    resolvedRegions: canonicalRegions(plan.resolvedRegions),
    resolvedAssignments: plan.resolvedAssignments.map(cloneMutable).sort(
      (left, right) => encodeCaseInsertPresetDeterministicIdentity(left)
        .localeCompare(encodeCaseInsertPresetDeterministicIdentity(right)),
    ),
    selectedFootprint: plan.selectedFootprint.map((field) => ({
      ...cloneMutable(field),
      sources: cloneSources(field.sources),
    })).sort(
      (left, right) => addressSort(left.address, right.address),
    ),
    fieldEffects: plan.fieldEffects.map(canonicalEffect).sort(
      (left, right) => addressSort(left.address, right.address),
    ),
    fieldActions: plan.fieldActions.map((action) => ({
      ...cloneMutable(action),
      materialConsentRequirementIds:
        [...action.materialConsentRequirementIds].sort(),
    })).sort(
      (left, right) => addressSort(left.address, right.address),
    ),
    aggregateWrites: plan.aggregateWrites.map((action) => ({
      ...cloneMutable(action),
      materialConsentRequirementIds:
        [...action.materialConsentRequirementIds].sort(),
    })).sort(
      (left, right) => addressSort(left.address, right.address),
    ),
    objectCreationActions: plan.objectCreationActions.map(cloneMutable).sort(
      (left, right) => left.id.localeCompare(right.id),
    ),
    artworkViewportActions: plan.artworkViewportActions.map((action) => ({
      ...cloneMutable(action),
      writeOwnedFieldIds: [...action.writeOwnedFieldIds].sort((left, right) =>
        (FIELD_ORDER.get(left) ?? 99) - (FIELD_ORDER.get(right) ?? 99)),
    })).sort(
      (left, right) => left.id.localeCompare(right.id),
    ),
    preservedCustomizedFields: plan.preservedCustomizedFields
      .map(canonicalEffect).sort(
        (left, right) => addressSort(left.address, right.address),
      ),
    newlyClaimedFields: plan.newlyClaimedFields.map(canonicalEffect).sort(
      (left, right) => addressSort(left.address, right.address),
    ),
    retiredFields: plan.retiredFields.map(canonicalEffect).sort(
      (left, right) => addressSort(left.address, right.address),
    ),
    projectedConfiguration: {
      ...cloneMutable(plan.projectedConfiguration),
      resolvedRegions: canonicalRegions(
        plan.projectedConfiguration.resolvedRegions,
      ),
      ownedFields: plan.projectedConfiguration.ownedFields.map((field) => ({
        ...cloneMutable(field),
        sources: cloneSources(field.sources),
      })).sort((left, right) => addressSort(left.address, right.address)),
    },
    preservationDecisions: plan.preservationDecisions.map(cloneMutable).sort(
      (left, right) => left.id.localeCompare(right.id),
    ),
    skips: plan.skips.map(cloneMutable).sort((left, right) =>
      encodeCaseInsertPresetDeterministicIdentity(left).localeCompare(
        encodeCaseInsertPresetDeterministicIdentity(right),
      )),
    warnings: plan.warnings.map(cloneMutable).sort((left, right) =>
      left.id.localeCompare(right.id)),
    materialConsentRequirements: plan.materialConsentRequirements
      .map(cloneMutable).sort((left, right) => left.id.localeCompare(right.id)),
    preconditions: {
      ...cloneMutable(plan.preconditions),
      resolvedRegions: canonicalRegions(plan.preconditions.resolvedRegions),
      fields: plan.preconditions.fields.map(cloneMutable).sort(
        (left, right) => addressSort(left.address, right.address),
      ),
    },
  }
}

export function createCaseInsertPresetTypedReapplyReviewIdentity(
  plan: Omit<CaseInsertPresetTypedReapplyPlan, 'reviewIdentity'>,
) {
  return `${CASE_INSERT_PRESET_TYPED_REAPPLY_REVIEW_IDENTITY_PREFIX}${
    encodeCaseInsertPresetDeterministicIdentity(canonicalPlanContent(plan))
  }`
}

export function createCaseInsertPresetTypedReapplyPlanIdentity(
  plan: CaseInsertPresetTypedReapplyPlan,
) {
  return `${CASE_INSERT_PRESET_TYPED_REAPPLY_PLAN_IDENTITY_PREFIX}${
    encodeCaseInsertPresetDeterministicIdentity({
      ...canonicalPlanContent(plan),
      reviewIdentity: plan.reviewIdentity,
    })
  }`
}

function selectedAddress(action: CaseInsertPresetPlanFieldAction) {
  const first = action.sources[0]
  if (!first || action.sources.some((source) =>
    source.region !== first.region ||
    source.ownerId !== first.ownerId ||
    source.object.bindingKind !== first.object.bindingKind ||
    source.object.bindingId !== first.object.bindingId ||
    source.object.runtimeId !== first.object.runtimeId)) return null
  return {
    region: first.region,
    featureOwnerId: action.featureOwnerId,
    bindingKind: action.object.bindingKind,
    bindingId: action.object.bindingId,
    runtimeObjectId: action.object.runtimeId,
    fieldId: action.fieldId,
  } satisfies CaseInsertAppliedPresetOwnedFieldAddressV3
}

function viewportAddress(
  action: CaseInsertPresetPlanArtworkViewportAction,
  fieldId: CaseInsertAppliedPresetOwnedFieldAddressV3['fieldId'],
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

function viewportValue(
  action: CaseInsertPresetPlanArtworkViewportAction,
  fieldId: CaseInsertPresetPlanArtworkViewportAction['ownedFieldIds'][number],
): CaseInsertAppliedPresetOwnedValue {
  switch (fieldId) {
    case 'layout-x':
      return { kind: 'layout-number', value: action.proposedValues.layoutX }
    case 'layout-y':
      return { kind: 'layout-number', value: action.proposedValues.layoutY }
    case 'layout-scale':
      return { kind: 'layout-number', value: action.proposedValues.layoutScale }
    case 'image-fit':
      return { kind: 'image-fit', value: action.proposedValues.imageFit }
    case 'reserved-artwork-viewport':
      return {
        kind: 'reserved-artwork-viewport',
        value: cloneMutable(action.proposedValues.reservedArtworkViewport),
      }
  }
}

function sourceRequirement(
  raw: Readonly<{ id: string; kind: string }>,
  configuration: CaseInsertViewportAppliedPresetConfiguration,
  reportIdentity: string,
  selectedPreset: Readonly<{ id: CaseInsertPresetId; revision: number }>,
): CaseInsertPresetTypedReapplyMaterialConsentRequirement {
  const kind = raw.kind === 'multiple-concrete-regions'
    ? 'multiple-concrete-regions'
    : 'material-visible-clipping'
  return {
    id: raw.id,
    kind,
    address: null,
    policy: null,
    selectedPreset: cloneMutable(selectedPreset),
    sourceConfigurationIdentity: configuration.configurationIdentity,
    sourceCustomizationReportIdentity: reportIdentity,
    evidence: cloneMutable(raw),
  }
}

function ownedFieldMap(
  configuration: CaseInsertViewportAppliedPresetConfiguration,
) {
  return new Map(configuration.ownedFields.map((field) => [
    addressKey(field.address),
    field,
  ]))
}

function reportFieldMap(
  fields: readonly CaseInsertPresetTypedCustomizationFieldRecord[],
) {
  return new Map(fields.map((field) => [addressKey(field.address), field]))
}

function currentEnablement(
  aggregate: Readonly<ProjectJewelCaseState>,
  address: CaseInsertAppliedPresetOwnedFieldAddressV3,
) {
  const binding = resolveCaseInsertPresetAggregateBinding(
    aggregate,
    address.featureOwnerId,
    { kind: address.bindingKind, id: address.bindingId },
  )
  return binding.status === 'found' &&
      binding.currentState.id === address.runtimeObjectId
    ? cloneMutable(binding.enablement)
    : null
}

export function planCaseInsertPresetTypedReapply(
  input: PlanCaseInsertPresetTypedReapplyInput,
): CaseInsertPresetTypedReapplyPlanningResult {
  if (!isRecord(input) || input.operation !== 'reapply') {
    return failure('unsupported-operation', 'operation-must-be-reapply')
  }
  if (!Array.isArray(input.customizedFieldPolicies) ||
      !isRecord(input.current) || input.current.projectKind !== 'caseInsert' ||
      typeof input.current.sessionId !== 'string' ||
      input.current.sessionId.trim().length === 0 ||
      typeof input.current.projectRevision !== 'number' ||
      !Number.isSafeInteger(input.current.projectRevision) ||
      input.current.projectRevision < 0 || !isRecord(input.current.template) ||
      typeof input.current.template.id !== 'string' ||
      input.current.template.revision !== null ||
      !isRecord(input.current.aggregate)) {
    return failure('invalid-request', 'current-context-invalid')
  }
  const configurationResult = validateCaseInsertAppliedPresetConfiguration(
    input.configuration,
  )
  if (!configurationResult.ok) {
    return failure(configurationResult.status, configurationResult.code)
  }
  if (configurationResult.configuration.formatVersion !==
      CASE_INSERT_VIEWPORT_APPLIED_PRESET_CONFIGURATION_VERSION) {
    return failure(
      'unsupported-configuration-version',
      'typed-reapply-requires-configuration-v3',
    )
  }
  const configuration = configurationResult.configuration
  const reportResult = validateCaseInsertPresetCustomizationReport(
    input.customizationReport,
    configuration,
  )
  if (!reportResult.ok) return failure(reportResult.status, reportResult.code)
  if (reportResult.report.formatVersion !==
      CASE_INSERT_PRESET_TYPED_CUSTOMIZATION_REPORT_VERSION) {
    return failure(
      'unsupported-report-version',
      'typed-reapply-requires-customization-report-v2',
    )
  }
  const report = reportResult.report
  let normalized: ProjectJewelCaseState
  try {
    normalized = normalizeProjectJewelCaseState(input.current.aggregate)
  } catch {
    return failure('invalid-request', 'current-aggregate-invalid')
  }
  if (!sameCaseInsertPresetValue(normalized, input.current.aggregate)) {
    return failure('invalid-request', 'current-aggregate-not-normalized')
  }
  if (!isCaseInsertPresetAssignmentSnapshot(input.current.snapshot) ||
      input.current.snapshot.identity.sessionId !== input.current.sessionId ||
      input.current.snapshot.identity.projectRevision !==
        input.current.projectRevision ||
      input.current.snapshot.identity.template.id !== input.current.template.id ||
      input.current.snapshot.identity.template.revision !== null ||
      !sameCaseInsertPresetValue(input.current.snapshot.caseInsert, normalized)) {
    return failure(
      'attachment-context-mismatch',
      'snapshot-current-context-mismatch',
    )
  }
  const fresh = detectCaseInsertPresetCustomization({
    configuration,
    current: {
      projectKind: 'caseInsert',
      aggregate: normalized,
      sessionId: input.current.sessionId,
      projectRevision: input.current.projectRevision,
      template: { id: input.current.template.id, revision: null },
    },
  })
  if (!fresh.ok || fresh.formatVersion !==
      CASE_INSERT_PRESET_TYPED_CUSTOMIZATION_REPORT_VERSION ||
      fresh.reportIdentity !== report.reportIdentity) {
    return failure(
      'stale-customization-report',
      fresh.ok ? 'report-current-state-stale' : fresh.code,
    )
  }

  const definitionResult = parseCaseInsertPresetDefinition(
    input.selectedDefinition,
  )
  if (!definitionResult.ok) {
    return failure(
      'invalid-selected-definition',
      `selected-definition-${definitionResult.error.code}`,
    )
  }
  const definition = definitionResult.value
  if (definition.id !== configuration.preset.id) {
    return failure(
      'preset-identity-mismatch',
      'selected-preset-id-does-not-match-configuration',
    )
  }
  if (definition.revision !== configuration.preset.revision) {
    return failure(
      'incompatible-selected-definition',
      'typed-reapply-requires-exact-attached-definition-revision',
    )
  }
  const resolution = resolveCaseInsertPresetAssignmentsForDefinition({
    definition,
    requestedScope: configuration.requestedScope,
    snapshot: input.current.snapshot,
    expectedSnapshotIdentity: input.current.snapshot.identity,
  })
  if (!resolution.ok) {
    if (resolution.status === 'ambiguous-binding') {
      return failure('target-ambiguous', 'selected-target-ambiguous')
    }
    if (resolution.status === 'stale-snapshot') {
      return failure(
        'stale-customization-report',
        'selected-resolution-snapshot-stale',
        { dimensions: resolution.dimensions },
      )
    }
    return failure(
      resolution.status === 'invalid-definition' ||
          resolution.status === 'invalid-reference'
        ? 'invalid-selected-definition'
        : 'incompatible-selected-definition',
      `selected-definition-${resolution.status}`,
    )
  }
  if (!sameCaseInsertPresetValue(
    resolution.value.resolvedRegions,
    configuration.resolvedRegions,
  )) {
    return failure(
      'incompatible-selected-definition',
      'selected-concrete-regions-mismatch',
    )
  }
  const proposal = createCaseInsertPresetResolvedLayoutProposal({
    resolution,
    expected: {
      projectKind: 'caseInsert',
      preset: { id: definition.id, revision: definition.revision },
      requestedScope: configuration.requestedScope,
      snapshotIdentity: input.current.snapshot.identity,
    },
  })
  if (!proposal.ok) {
    if (proposal.status === 'blocked') {
      return failure('resolution-blocked', 'selected-layout-blocked')
    }
    if (proposal.status === 'stale-resolution') {
      return failure(
        'stale-customization-report',
        'selected-resolution-stale',
        { dimensions: proposal.dimensions },
      )
    }
    return failure(
      proposal.status === 'unsupported-action'
        ? 'unsupported-owned-field'
        : proposal.status === 'incompatible-resolution'
          ? 'incompatible-selected-definition'
          : proposal.status === 'unsupported-operation'
            ? 'unsupported-operation'
            : 'transition-conflict',
      `selected-layout-${proposal.status}`,
    )
  }

  const selectedByKey = new Map<string, SelectedField>()
  const addSelected = (field: SelectedField) => {
    const key = addressKey(field.address)
    const prior = selectedByKey.get(key)
    if (prior && !sameCaseInsertPresetValue(prior, field)) return false
    selectedByKey.set(key, deepFreezeCaseInsertPresetValue(field))
    return true
  }
  for (const action of proposal.fieldActions) {
    const address = selectedAddress(action)
    if (!address || !addSelected({
      address,
      proposedValue: { kind: 'layout-number', value: action.proposedValue },
      sources: cloneSources(action.sources),
      directAction: action,
      viewportAction: null,
    })) return failure(
      'transition-conflict',
      'selected-direct-footprint-conflict',
    )
  }
  for (const action of proposal.artworkViewportActions) {
    for (const fieldId of action.ownedFieldIds) {
      if (!addSelected({
        address: viewportAddress(action, fieldId),
        proposedValue: viewportValue(action, fieldId),
        sources: [cloneMutable(action.source)],
        directAction: null,
        viewportAction: action,
      })) return failure(
        'transition-conflict',
        'selected-viewport-footprint-conflict',
      )
    }
  }
  for (const action of proposal.objectCreationActions) {
    const address = viewportAddress(
      proposal.artworkViewportActions.find(({ id }) =>
        id === action.viewportActionId)!,
      'object-presence',
    )
    if (!addSelected({
      address,
      proposedValue: { kind: 'object-presence', value: 'present' },
      sources: [cloneMutable(action.source)],
      directAction: null,
      viewportAction: null,
    })) return failure(
      'transition-conflict',
      'selected-presence-footprint-conflict',
    )
  }
  const oldByKey = ownedFieldMap(configuration)
  for (const old of configuration.ownedFields) {
    if (old.address.fieldId !== 'object-presence' ||
        selectedByKey.has(addressKey(old.address))) continue
    const selectedViewport = proposal.artworkViewportActions.find((action) =>
      objectKey(viewportAddress(action, 'layout-x')) === objectKey(old.address))
    if (selectedViewport && old.sources.some((source) =>
      source.declaredPolicy === 'create-empty-repeated-artwork-slot-v1' &&
      source.assignmentId === selectedViewport.source.assignmentId)) {
      addSelected({
        address: cloneMutable(old.address),
        proposedValue: { kind: 'object-presence', value: 'present' },
        sources: cloneSources(old.sources),
        directAction: null,
        viewportAction: null,
      })
    }
  }

  const reportByKey = reportFieldMap(report.fields)
  const actionable = report.fields.filter(({ fieldStatus }) =>
    fieldStatus === 'value-diverged' || fieldStatus === 'object-absent')
  const policies = new Map<string,
    CaseInsertPresetTypedCustomizedFieldPolicyRecord>()
  for (const raw of input.customizedFieldPolicies) {
    if (!isRecord(raw) || !isRecord(raw.address) ||
        !isRecord(raw.lastAppliedValue) || !isRecord(raw.observation) ||
        !isRecord(raw.selectedPreset) ||
        (raw.policy !== 'overwrite-with-selected-preset' &&
          raw.policy !== 'preserve-current-customization')) {
      return failure('policy-mismatch', 'typed-policy-shape-invalid')
    }
    const address = raw.address as unknown as
      CaseInsertAppliedPresetOwnedFieldAddressV3
    const key = addressKey(address)
    const reportField = reportByKey.get(key)
    if (!reportField ||
        (reportField.fieldStatus !== 'value-diverged' &&
          reportField.fieldStatus !== 'object-absent') ||
        policies.has(key) ||
        raw.configurationIdentity !== configuration.configurationIdentity ||
        raw.customizationReportIdentity !== report.reportIdentity ||
        !sameCaseInsertPresetValue(raw.address, reportField.address) ||
        !sameCaseInsertPresetValue(
          raw.lastAppliedValue,
          reportField.lastAppliedValue,
        ) || !sameCaseInsertPresetValue(
          raw.observation,
          reportField.observation,
        ) || raw.selectedPreset.id !== definition.id ||
        raw.selectedPreset.revision !== definition.revision) {
      return failure('policy-mismatch', 'typed-policy-binding-mismatch', {
        address,
      })
    }
    policies.set(key, cloneMutable(raw) as
      CaseInsertPresetTypedCustomizedFieldPolicyRecord)
  }
  if (policies.size !== actionable.length || actionable.some((field) =>
    !policies.has(addressKey(field.address)))) {
    return failure('policy-incomplete', 'typed-customized-policy-missing')
  }

  const allKeys = [...new Set([
    ...oldByKey.keys(),
    ...selectedByKey.keys(),
  ])].sort((left, right) => addressSort(
    oldByKey.get(left)?.address ?? selectedByKey.get(left)!.address,
    oldByKey.get(right)?.address ?? selectedByKey.get(right)!.address,
  ))
  const effects: CaseInsertPresetTypedReapplyFieldEffect[] = []
  const presencePolicyByObject = new Map<string,
    CaseInsertPresetTypedCustomizedFieldPolicyRecord['policy']>()
  for (const policy of policies.values()) {
    if (policy.address.fieldId === 'object-presence') {
      presencePolicyByObject.set(objectKey(policy.address), policy.policy)
    }
  }
  for (const key of allKeys) {
    const old = oldByKey.get(key)
    const selected = selectedByKey.get(key)
    const reportField = old ? reportByKey.get(key) : undefined
    if (old && reportField && selected) {
      let policy = policies.get(key)?.policy ?? null
      const status = reportField.fieldStatus
      if (status === 'target-unavailable') {
        policy = presencePolicyByObject.get(objectKey(reportField.address)) ?? null
        if (!policy) return failure(
          'policy-incomplete',
          'typed-absent-object-policy-missing',
          { address: reportField.address },
        )
      }
      const preserve = policy === 'preserve-current-customization'
      const customized = status === 'value-diverged' ||
        status === 'object-absent' || status === 'target-unavailable'
      const disposition: CaseInsertPresetTypedReapplyFieldDisposition =
        !customized
          ? 'retained-clean'
          : status === 'target-unavailable'
            ? preserve
              ? 'retained-unavailable-preserve'
              : 'retained-unavailable-overwrite'
            : preserve
              ? 'retained-customized-preserve'
              : 'retained-customized-overwrite'
      const writeRequired = !preserve && (
        reportField.observation.status !== 'present' ||
        !sameCaseInsertPresetValue(
          reportField.observation.value,
          selected.proposedValue,
        ))
      effects.push({
        address: cloneMutable(old.address),
        disposition,
        policy,
        currentObservation: cloneMutable(reportField.observation),
        previousLastAppliedValue: cloneMutable(old.lastAppliedValue),
        selectedProposedValue: cloneMutable(selected.proposedValue),
        projectedLastAppliedValue: cloneMutable(
          preserve ? old.lastAppliedValue : selected.proposedValue,
        ),
        previousSources: cloneSources(old.sources),
        selectedSources: cloneSources(selected.sources),
        projectedSources: cloneSources(preserve ? old.sources : selected.sources),
        aggregateWriteRequired: writeRequired,
        ownershipOutcome: 'retained',
        projectedCustomizationStatus: preserve ? 'customized' : 'clean',
        enablement: currentEnablement(normalized, old.address),
      })
    } else if (old && reportField && !selected) {
      effects.push({
        address: cloneMutable(old.address),
        disposition: 'retired',
        policy: null,
        currentObservation: cloneMutable(reportField.observation),
        previousLastAppliedValue: cloneMutable(old.lastAppliedValue),
        selectedProposedValue: null,
        projectedLastAppliedValue: null,
        previousSources: cloneSources(old.sources),
        selectedSources: [],
        projectedSources: [],
        aggregateWriteRequired: false,
        ownershipOutcome: 'retired',
        projectedCustomizationStatus: 'not-owned',
        enablement: currentEnablement(normalized, old.address),
      })
    } else if (!old && selected) {
      const currentObservation: CaseInsertPresetOwnedFieldObservation =
        selected.address.fieldId === 'object-presence' &&
          selected.viewportAction === null
          ? { status: 'absent-owned-object' }
          : { status: 'present', value: cloneMutable(selected.proposedValue) }
      effects.push({
        address: cloneMutable(selected.address),
        disposition: 'new-claim',
        policy: null,
        currentObservation,
        previousLastAppliedValue: null,
        selectedProposedValue: cloneMutable(selected.proposedValue),
        projectedLastAppliedValue: cloneMutable(selected.proposedValue),
        previousSources: [],
        selectedSources: cloneSources(selected.sources),
        projectedSources: cloneSources(selected.sources),
        aggregateWriteRequired: currentObservation.status !== 'present' ||
          !sameCaseInsertPresetValue(
            currentObservation.value,
            selected.proposedValue,
          ),
        ownershipOutcome: 'claimed',
        projectedCustomizationStatus: 'clean',
        enablement: currentEnablement(normalized, selected.address),
      })
    } else {
      return failure('transition-conflict', 'typed-footprint-conflict')
    }
  }

  const effectByKey = new Map(effects.map((effect) => [
    addressKey(effect.address),
    effect,
  ]))
  const shouldRetainViewportAction = (
    action: CaseInsertPresetPlanArtworkViewportAction,
  ) => action.targetOrigin !== 'planned-creation' ||
    effectByKey.get(addressKey(
      viewportAddress(action, 'object-presence'),
    ))?.aggregateWriteRequired === true
  const omittedViewportActions = proposal.artworkViewportActions.filter(
    (action) => !shouldRetainViewportAction(action),
  )
  const omittedViewportWarningIds = new Set<string>()
  const omittedViewportRequirementIds = new Set<string>()
  for (const action of omittedViewportActions) {
    for (const warning of action.evidence.plan.warnings) {
      omittedViewportWarningIds.add(warning.id)
    }
    for (const requirement of
      action.evidence.plan.materialConsentRequirements) {
      omittedViewportRequirementIds.add(requirement.id)
    }
    for (const warning of proposal.warnings) {
      if ('id' in warning &&
          warning.kind === 'artwork-cover-fitting-deferred' &&
          warning.assignmentId === action.source.assignmentId) {
        omittedViewportWarningIds.add(warning.id)
      }
    }
  }
  const requirements: CaseInsertPresetTypedReapplyMaterialConsentRequirement[] =
    proposal.materialConsentRequirements.filter(({ id }) =>
      !omittedViewportRequirementIds.has(id)).map((requirement) =>
      sourceRequirement(
        requirement,
        configuration,
        report.reportIdentity,
        { id: definition.id, revision: definition.revision },
      ))
  for (const effect of effects) {
    if (effect.disposition !== 'retained-customized-overwrite') continue
    const content = {
      kind: 'overwrite-customized-owned-field' as const,
      address: cloneMutable(effect.address),
      policy: 'overwrite-with-selected-preset' as const,
      selectedPreset: { id: definition.id, revision: definition.revision },
      sourceConfigurationIdentity: configuration.configurationIdentity,
      sourceCustomizationReportIdentity: report.reportIdentity,
      evidence: {
        currentObservation: cloneMutable(effect.currentObservation),
        selectedProposedValue: cloneMutable(effect.selectedProposedValue),
      },
    }
    requirements.push({
      id: `${CASE_INSERT_PRESET_TYPED_REAPPLY_REQUIREMENT_IDENTITY_PREFIX}${
        createCaseInsertPresetDeterministicIdentityDigest(content)
      }`,
      ...content,
    })
  }
  const requirementIds = requirements.map(({ id }) => id).sort()
  const directWrites = proposal.fieldActions.flatMap((action) => {
    const address = selectedAddress(action)
    if (!address) return []
    const effect = effectByKey.get(addressKey(address))
    if (!effect?.aggregateWriteRequired) return []
    if (effect.currentObservation.status !== 'present' ||
        effect.currentObservation.value.kind !== 'layout-number') return []
    return [{
      id: `case:preset-reapply-write:v2:${
        createCaseInsertPresetDeterministicIdentityDigest({
          address,
          current: effect.currentObservation.value,
          proposed: action.proposedValue,
        })
      }`,
      kind: action.kind,
      address,
      currentValuePrecondition: effect.currentObservation.value.value,
      proposedValue: action.proposedValue,
      materialConsentRequirementIds: requirementIds,
    } satisfies CaseInsertPresetTypedReapplyDirectWrite]
  })
  const creationActions = proposal.objectCreationActions.filter((action) => {
    const viewport = proposal.artworkViewportActions.find(({ id }) =>
      id === action.viewportActionId)
    return viewport ? effectByKey.get(addressKey(
      viewportAddress(viewport, 'object-presence'),
    ))?.aggregateWriteRequired === true : false
  })
  const creationViewportIds = new Set(creationActions.map(
    ({ viewportActionId }) => viewportActionId,
  ))
  const viewportActions = proposal.artworkViewportActions.flatMap((action) => {
    if (!shouldRetainViewportAction(action) ||
        (action.targetOrigin === 'planned-creation' &&
          !creationViewportIds.has(action.id))) return []
    const writeOwnedFieldIds = action.ownedFieldIds.filter((fieldId) =>
      effectByKey.get(addressKey(viewportAddress(action, fieldId)))
        ?.aggregateWriteRequired)
    return [{
      ...cloneMutable(action),
      writeOwnedFieldIds,
    }]
  })
  const projectedOwnedFields = effects
    .filter(({ ownershipOutcome }) => ownershipOutcome !== 'retired')
    .map((effect) => ({
      address: cloneMutable(effect.address),
      lastAppliedValue: cloneMutable(effect.projectedLastAppliedValue!),
      sources: cloneSources(effect.projectedSources),
      expectedCustomizationStatus: effect.projectedCustomizationStatus ===
          'customized'
        ? 'customized' as const
        : 'clean' as const,
    }))
    .sort((left, right) => addressSort(left.address, right.address))
  const warnings: CaseInsertPresetTypedReapplyWarning[] = [
    ...proposal.warnings.filter((warning) =>
      !('id' in warning && omittedViewportWarningIds.has(warning.id)))
      .map((warning) => ({
      id: 'id' in warning && typeof warning.id === 'string'
        ? warning.id
        : `${CASE_INSERT_PRESET_TYPED_REAPPLY_WARNING_IDENTITY_PREFIX}${
            createCaseInsertPresetDeterministicIdentityDigest(warning)
          }`,
      kind: warning.kind,
      evidence: cloneMutable(warning) as unknown as Readonly<
        Record<string, unknown>
      >,
    })),
    ...effects.filter(({ disposition }) =>
      disposition === 'retained-customized-preserve' ||
      disposition === 'retained-unavailable-preserve').map((effect) => {
      const evidence = { address: cloneMutable(effect.address) }
      return {
        id: `${CASE_INSERT_PRESET_TYPED_REAPPLY_WARNING_IDENTITY_PREFIX}${
          createCaseInsertPresetDeterministicIdentityDigest({
            kind: 'customization-preserved',
            ...evidence,
          })
        }`,
        kind: 'customization-preserved',
        evidence,
      }
    }),
  ].sort((left, right) => left.id.localeCompare(right.id))
  const preconditions = effects.map((effect) => ({
    address: cloneMutable(effect.address),
    observation: cloneMutable(effect.currentObservation),
    enablement: effect.enablement,
  })).sort((left, right) => addressSort(left.address, right.address))
  const resolvedAssignments = proposal.assignments.map((assignment) => ({
    assignmentId: assignment.assignmentId,
    slotId: assignment.slotId,
    roleId: assignment.roleId,
    region: assignment.region,
    coordinateBasis: assignment.coordinateBasis,
    ownerId: assignment.ownerId,
    bindingKind: assignment.object.kind,
    bindingId: assignment.object.id,
    runtimeObjectId: assignment.currentState?.id ?? null,
    bindingStatus: assignment.bindingStatus,
    effectiveEnabled: assignment.enablement?.effectiveEnabled ?? null,
  }))
  const planContent: Omit<CaseInsertPresetTypedReapplyPlan, 'reviewIdentity'> = {
    kind: 'sbls/case-insert-preset-reapply-plan',
    formatVersion: CASE_INSERT_PRESET_TYPED_REAPPLY_PLAN_FORMAT_VERSION,
    operation: 'reapply',
    source: {
      configurationIdentity: configuration.configurationIdentity,
      customizationReportIdentity: report.reportIdentity,
      projectKind: 'caseInsert',
      sessionId: input.current.sessionId,
      projectRevision: input.current.projectRevision,
      template: { id: input.current.template.id, revision: null },
      aggregateContentIdentity:
        input.current.snapshot.identity.aggregateContentIdentity,
    },
    preset: {
      id: definition.id,
      previousRevision: configuration.preset.revision,
      selectedRevision: definition.revision,
      source: proposal.value.preset.source,
    },
    requestedScope: cloneMutable(configuration.requestedScope),
    resolvedRegions: [...configuration.resolvedRegions],
    resolvedAssignments,
    selectedFootprint: [...selectedByKey.values()].map((selected) => ({
      address: cloneMutable(selected.address),
      proposedValue: cloneMutable(selected.proposedValue),
      sources: cloneSources(selected.sources),
    })).sort((left, right) => addressSort(left.address, right.address)),
    fieldEffects: effects.sort((left, right) =>
      addressSort(left.address, right.address)),
    fieldActions: directWrites,
    aggregateWrites: directWrites,
    objectCreationActions: creationActions,
    artworkViewportActions: viewportActions,
    preservedCustomizedFields: effects.filter(({ disposition }) =>
      disposition === 'retained-customized-preserve' ||
      disposition === 'retained-unavailable-preserve'),
    newlyClaimedFields: effects.filter(({ disposition }) =>
      disposition === 'new-claim'),
    retiredFields: effects.filter(({ disposition }) =>
      disposition === 'retired'),
    projectedConfiguration: {
      kind: CASE_INSERT_PRESET_TYPED_REAPPLY_CONFIGURATION_PROJECTION_KIND,
      authority: 'non-authoritative-uninstalled-projection',
      sourceConfigurationIdentity: configuration.configurationIdentity,
      sourceCustomizationReportIdentity: report.reportIdentity,
      selectedPreset: {
        id: definition.id,
        revision: definition.revision,
        source: proposal.value.preset.source,
      },
      requestedScope: cloneMutable(configuration.requestedScope),
      resolvedRegions: [...configuration.resolvedRegions],
      ownedFields: projectedOwnedFields,
    },
    preservationDecisions: cloneMutable(proposal.preservationDecisions),
    skips: cloneMutable(proposal.skips),
    warnings,
    blockers: [],
    materialConsentRequirements: requirements.sort((left, right) =>
      left.id.localeCompare(right.id)),
    preconditions: {
      configurationIdentity: configuration.configurationIdentity,
      customizationReportIdentity: report.reportIdentity,
      projectKind: 'caseInsert',
      sessionId: input.current.sessionId,
      projectRevision: input.current.projectRevision,
      template: { id: input.current.template.id, revision: null },
      aggregateContentIdentity:
        input.current.snapshot.identity.aggregateContentIdentity,
      selectedPreset: { id: definition.id, revision: definition.revision },
      scopeKey: getCaseInsertPresetApplicationScopeKey(
        configuration.requestedScope,
      ),
      resolvedRegions: [...configuration.resolvedRegions],
      fields: preconditions,
    },
    semanticEffects: {
      aggregateWriteCount: directWrites.length +
        creationActions.length + viewportActions.reduce(
          (count, action) => count + action.writeOwnedFieldIds.length,
          0,
        ),
      objectCreationCount: creationActions.length,
      artworkViewportWriteCount: viewportActions.reduce(
        (count, action) => count + action.writeOwnedFieldIds.length,
        0,
      ),
      configurationEffect: true,
    },
  }
  const plan = deepFreezeCaseInsertPresetValue({
    ...canonicalPlanContent(planContent),
    reviewIdentity: createCaseInsertPresetTypedReapplyReviewIdentity(
      planContent,
    ),
  }) as CaseInsertPresetTypedReapplyPlan
  return deepFreezeCaseInsertPresetValue({
    ok: true,
    status: plan.semanticEffects.aggregateWriteCount === 0
      ? 'aggregate-semantic-no-op'
      : 'planned',
    plan,
  })
}
