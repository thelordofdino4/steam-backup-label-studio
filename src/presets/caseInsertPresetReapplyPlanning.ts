import {
  isCaseInsertPresetAssignmentSnapshot,
  resolveCaseInsertPresetAggregateBinding,
  type CaseInsertPresetAssignmentSnapshot,
  type CaseInsertPresetSnapshotEnablement,
} from '../caseInsert/presetAssignmentSnapshot.ts'
import { normalizeProjectJewelCaseState } from '../caseInsert/normalization.ts'
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
  type CaseInsertPresetPlanFieldAction,
  type CaseInsertPresetPlanFieldId,
  type CaseInsertPresetPlanPreservationDecision,
  type CaseInsertPresetPlanSkip,
  type CaseInsertPresetPlanSourceAssignment,
  type CaseInsertPresetPlanWarning,
} from './caseInsertPresetApplyPlanning.ts'
import {
  resolveCaseInsertPresetAssignmentsForDefinition,
  type ResolvedCaseInsertPresetAssignment,
} from './caseInsertPresetAssignmentResolution.ts'
import {
  getCaseInsertPresetOwnedFieldCurrentValue,
  isCaseInsertPresetOwnedFieldSemanticValue,
  validateCaseInsertAppliedPresetConfiguration,
  validateCaseInsertPresetCustomizationReport,
  type CaseInsertAppliedPresetConfiguration,
  type CaseInsertAppliedPresetOwnedFieldAddress,
  type CaseInsertPresetCustomizationReport,
} from './caseInsertPresetAppliedConfiguration.ts'

export const CASE_INSERT_PRESET_REAPPLY_PLAN_KIND =
  'sbls/case-insert-preset-reapply-plan' as const
export const CASE_INSERT_PRESET_REAPPLY_PLAN_FORMAT_VERSION = 1 as const
export const CASE_INSERT_PRESET_REAPPLY_CONFIGURATION_PROJECTION_KIND =
  'sbls/case-insert-preset-reapply-configuration-projection' as const

export type CaseInsertPresetCustomizedFieldPolicy =
  | 'overwrite-with-selected-preset'
  | 'preserve-current-customization'

export type CaseInsertPresetCustomizedFieldPolicyRecord = Readonly<{
  configurationIdentity: string
  customizationReportIdentity: string
  address: CaseInsertAppliedPresetOwnedFieldAddress
  lastAppliedValue: number
  currentValue: number
  selectedPreset: Readonly<{ id: CaseInsertPresetId; revision: number }>
  selectedProposedValue: number
  policy: CaseInsertPresetCustomizedFieldPolicy
}>

export type PlanCaseInsertPresetReapplyInput = Readonly<{
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

export type CaseInsertPresetReapplyFieldDisposition =
  | 'retained-clean'
  | 'retained-customized-overwrite'
  | 'retained-customized-preserve'
  | 'new-claim'
  | 'retired'

export type CaseInsertPresetReapplyProvenanceDisposition =
  | 'unchanged'
  | 'changed'
  | 'coalesced'
  | 'not-applicable'

export type CaseInsertPresetReapplyFieldEffect = Readonly<{
  address: CaseInsertAppliedPresetOwnedFieldAddress
  disposition: CaseInsertPresetReapplyFieldDisposition
  policy: CaseInsertPresetCustomizedFieldPolicy | null
  currentValue: number
  previousLastAppliedValue: number | null
  selectedProposedValue: number | null
  projectedLastAppliedValue: number | null
  previousSources: readonly CaseInsertPresetPlanSourceAssignment[]
  selectedSources: readonly CaseInsertPresetPlanSourceAssignment[]
  projectedSources: readonly CaseInsertPresetPlanSourceAssignment[]
  provenanceDisposition: CaseInsertPresetReapplyProvenanceDisposition
  aggregateWriteRequired: boolean
  ownershipOutcome: 'retained' | 'claimed' | 'retired'
  projectedCustomizationStatus: 'clean' | 'customized' | 'not-owned'
  enablement: CaseInsertPresetSnapshotEnablement
}>

export type CaseInsertPresetReapplyAggregateWrite = Readonly<{
  id: string
  kind: CaseInsertPresetPlanFieldAction['kind']
  address: CaseInsertAppliedPresetOwnedFieldAddress
  disposition: Exclude<
    CaseInsertPresetReapplyFieldDisposition,
    'retained-customized-preserve' | 'retired'
  >
  policy: CaseInsertPresetCustomizedFieldPolicy | null
  currentValuePrecondition: number
  proposedValue: number
  sources: readonly CaseInsertPresetPlanSourceAssignment[]
  materialConsentRequirementIds: readonly string[]
}>

export type CaseInsertPresetReapplyMaterialConsentRequirement = Readonly<{
  id: string
  kind:
    | 'overwrite-customized-owned-field'
    | 'new-field-claim-with-value-change'
    | 'multiple-concrete-regions'
  address: CaseInsertAppliedPresetOwnedFieldAddress | null
  sourceConfigurationIdentity: string
  sourceCustomizationReportIdentity: string
  selectedPreset: Readonly<{ id: CaseInsertPresetId; revision: number }>
  policy: CaseInsertPresetCustomizedFieldPolicy | null
  previousLastAppliedValue: number | null
  currentValue: number | null
  proposedValue: number | null
  sources: readonly CaseInsertPresetPlanSourceAssignment[]
  assignmentIds: readonly string[]
  regions: readonly CaseInsertPresetConcreteRegionId[]
}>

export type CaseInsertPresetReapplyWarning =
  | Readonly<{
      kind: 'selected-layout-warning'
      warning: CaseInsertPresetPlanWarning
    }>
  | Readonly<{
      kind:
        | 'customization-preserved'
        | 'new-field-claim'
        | 'field-retired'
        | 'field-provenance-changed'
      address: CaseInsertAppliedPresetOwnedFieldAddress
    }>

export type CaseInsertPresetReapplyFieldPrecondition = Readonly<{
  address: CaseInsertAppliedPresetOwnedFieldAddress
  bindingMatch: 'exactly-one'
  currentValue: number
  enablement: CaseInsertPresetSnapshotEnablement
}>

export type CaseInsertPresetReapplyProjectedOwnedField = Readonly<{
  address: CaseInsertAppliedPresetOwnedFieldAddress
  lastAppliedValue: number
  sources: readonly CaseInsertPresetPlanSourceAssignment[]
  disposition: Exclude<CaseInsertPresetReapplyFieldDisposition, 'retired'>
  expectedCustomizationStatus: 'clean' | 'customized'
}>

export type CaseInsertPresetReapplyPlan = Readonly<{
  kind: typeof CASE_INSERT_PRESET_REAPPLY_PLAN_KIND
  formatVersion: typeof CASE_INSERT_PRESET_REAPPLY_PLAN_FORMAT_VERSION
  operation: 'reapply'
  source: Readonly<{
    configurationIdentity: string
    customizationReportIdentity: string
    projectKind: 'caseInsert'
    sessionId: string
    projectRevision: number
    template: Readonly<{ id: string; revision: null }>
  }>
  preset: Readonly<{
    id: CaseInsertPresetId
    previousRevision: number
    selectedRevision: number
    source: 'builtin' | 'user'
  }>
  requestedScope: CaseInsertPresetApplicationScope
  resolvedRegions: readonly CaseInsertPresetConcreteRegionId[]
  resolvedAssignments: readonly Readonly<{
    assignmentId: string
    slotId: string
    roleId: string
    region: CaseInsertPresetConcreteRegionId
    coordinateBasis: string
    ownerId: string
    bindingKind: 'fixed' | 'repeated'
    bindingId: string
    runtimeObjectId: string | null
    bindingStatus: string
    effectiveEnabled: boolean | null
  }>[]
  selectedFootprint: readonly Readonly<{
    address: CaseInsertAppliedPresetOwnedFieldAddress
    proposedValue: number
    sources: readonly CaseInsertPresetPlanSourceAssignment[]
  }>[]
  fieldEffects: readonly CaseInsertPresetReapplyFieldEffect[]
  aggregateWrites: readonly CaseInsertPresetReapplyAggregateWrite[]
  preservedCustomizedFields: readonly CaseInsertPresetReapplyFieldEffect[]
  newlyClaimedFields: readonly CaseInsertPresetReapplyFieldEffect[]
  retiredFields: readonly CaseInsertPresetReapplyFieldEffect[]
  projectedConfiguration: Readonly<{
    kind: typeof CASE_INSERT_PRESET_REAPPLY_CONFIGURATION_PROJECTION_KIND
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
    ownedFields: readonly CaseInsertPresetReapplyProjectedOwnedField[]
  }>
  preservationDecisions:
    readonly CaseInsertPresetPlanPreservationDecision[]
  skips: readonly CaseInsertPresetPlanSkip[]
  warnings: readonly CaseInsertPresetReapplyWarning[]
  blockers: readonly []
  materialConsentRequirements:
    readonly CaseInsertPresetReapplyMaterialConsentRequirement[]
  preconditions: Readonly<{
    configurationIdentity: string
    customizationReportIdentity: string
    projectKind: 'caseInsert'
    sessionId: string
    projectRevision: number
    template: Readonly<{ id: string; revision: null }>
    selectedPreset: Readonly<{ id: CaseInsertPresetId; revision: number }>
    scopeKey: string
    resolvedRegions: readonly CaseInsertPresetConcreteRegionId[]
    fields: readonly CaseInsertPresetReapplyFieldPrecondition[]
  }>
  semanticEffects: Readonly<{
    aggregateWriteCount: number
    configurationEffect: boolean
  }>
  reviewIdentity: string
}>

export type CaseInsertPresetReapplyPlanningFailureStatus =
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

export type CaseInsertPresetReapplyPlanningResult =
  | Readonly<{
      ok: true
      status: 'planned' | 'aggregate-semantic-no-op'
      plan: CaseInsertPresetReapplyPlan
    }>
  | Readonly<{
      ok: false
      status: CaseInsertPresetReapplyPlanningFailureStatus
      code: string
      dimensions?: readonly string[]
      address?: CaseInsertAppliedPresetOwnedFieldAddress
    }>

type SelectedField = Readonly<{
  address: CaseInsertAppliedPresetOwnedFieldAddress
  proposedValue: number
  currentValue: number
  sources: readonly CaseInsertPresetPlanSourceAssignment[]
  actionKind: CaseInsertPresetPlanFieldAction['kind']
  enablement: CaseInsertPresetSnapshotEnablement
}>

const REGION_ORDER = new Map<CaseInsertPresetConcreteRegionId, number>([
  ['front-cover', 0],
  ['tray-card', 1],
  ['back-panel', 2],
  ['left-spine', 3],
  ['right-spine', 4],
])
const FIELD_ORDER = new Map<CaseInsertPresetPlanFieldId, number>([
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

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) deepFreeze(child)
    Object.freeze(value)
  }
  return value
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

function failure(
  status: CaseInsertPresetReapplyPlanningFailureStatus,
  code: string,
  options: Readonly<{
    dimensions?: readonly string[]
    address?: CaseInsertAppliedPresetOwnedFieldAddress
  }> = {},
): CaseInsertPresetReapplyPlanningResult {
  return deepFreeze({
    ok: false,
    status,
    code,
    ...(options.dimensions ? { dimensions: [...options.dimensions] } : {}),
    ...(options.address ? { address: { ...options.address } } : {}),
  })
}

function deterministicEncode(value: unknown): string {
  if (value === null) return 'n0:'
  if (typeof value === 'boolean') return `b1:${value ? '1' : '0'}`
  if (typeof value === 'number') {
    const encoded = Object.is(value, -0) ? '-0' : String(value)
    return `d${encoded.length}:${encoded}`
  }
  if (typeof value === 'string') return `s${value.length}:${value}`
  if (Array.isArray(value)) {
    const encoded = value.map(deterministicEncode).join('')
    return `a${value.length}:${encoded.length}:${encoded}`
  }
  if (isRecord(value)) {
    const entries = Object.keys(value).sort().map((key) =>
      deterministicEncode(key) + deterministicEncode(value[key]))
    const encoded = entries.join('')
    return `o${entries.length}:${encoded.length}:${encoded}`
  }
  throw new Error('Unsupported deterministic identity value.')
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

function cloneSources(sources: readonly CaseInsertPresetPlanSourceAssignment[]) {
  return sources.map((source) => ({
    ...source,
    object: { ...source.object },
  })).sort(sourceSort)
}

function uniqueSources(
  sources: readonly CaseInsertPresetPlanSourceAssignment[],
) {
  const byAssignment = new Map<string, CaseInsertPresetPlanSourceAssignment>()
  for (const source of sources) {
    byAssignment.set(source.assignmentId, source)
  }
  return cloneSources([...byAssignment.values()])
}

function readCurrentField(
  aggregate: ProjectJewelCaseState,
  address: CaseInsertAppliedPresetOwnedFieldAddress,
): Readonly<{
  ok: true
  value: number
  enablement: CaseInsertPresetSnapshotEnablement
}> | Readonly<{
  ok: false
  status: 'target-missing' | 'target-ambiguous' |
    'unsupported-owned-field' | 'invalid-current-value'
  code: string
}> {
  const binding = resolveCaseInsertPresetAggregateBinding(
    aggregate,
    address.featureOwnerId,
    { kind: address.bindingKind, id: address.bindingId },
  )
  if (binding.status === 'missing') {
    return { ok: false, status: 'target-missing', code: 'exact-target-missing' }
  }
  if (binding.status === 'ambiguous') {
    return { ok: false, status: 'target-ambiguous', code: 'exact-target-ambiguous' }
  }
  if (binding.status !== 'found') {
    return {
      ok: false,
      status: 'unsupported-owned-field',
      code: 'owned-field-binding-unsupported',
    }
  }
  if (binding.currentState.id !== address.runtimeObjectId) {
    return {
      ok: false,
      status: 'target-missing',
      code: 'runtime-object-identity-mismatch',
    }
  }
  const currentValue = getCaseInsertPresetOwnedFieldCurrentValue(
    binding.currentState,
    address.fieldId,
  )
  if (!isCaseInsertPresetOwnedFieldSemanticValue(
    address.fieldId,
    currentValue,
  )) {
    return {
      ok: false,
      status: 'invalid-current-value',
      code: 'current-semantic-value-invalid',
    }
  }
  return {
    ok: true,
    value: currentValue,
    enablement: binding.enablement,
  }
}

function sameCanonicalRegions(
  left: readonly CaseInsertPresetConcreteRegionId[],
  right: readonly CaseInsertPresetConcreteRegionId[],
) {
  return left.length === right.length &&
    left.every((region, index) => region === right[index])
}

function selectedAddress(
  action: CaseInsertPresetPlanFieldAction,
): CaseInsertAppliedPresetOwnedFieldAddress | null {
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
  }
}

function provenanceDisposition(
  previous: readonly CaseInsertPresetPlanSourceAssignment[],
  selected: readonly CaseInsertPresetPlanSourceAssignment[],
): CaseInsertPresetReapplyProvenanceDisposition {
  if (selected.length > 1) return 'coalesced'
  return sameValue(previous, selected) ? 'unchanged' : 'changed'
}

function consentRequirement(
  kind: CaseInsertPresetReapplyMaterialConsentRequirement['kind'],
  options: Omit<CaseInsertPresetReapplyMaterialConsentRequirement, 'id' | 'kind'>,
) {
  const content = { kind, ...options }
  return deepFreeze({
    id: `case:preset-reapply-consent:v1:${deterministicEncode(content)}`,
    ...content,
  })
}

function mapResolutionFailure(
  result: Exclude<
    ReturnType<typeof resolveCaseInsertPresetAssignmentsForDefinition>,
    { ok: true }
  >,
): CaseInsertPresetReapplyPlanningResult {
  switch (result.status) {
    case 'invalid-definition':
      return failure('invalid-selected-definition', 'selected-definition-invalid')
    case 'incompatible':
    case 'invalid-scope':
    case 'unsupported-template':
      return failure(
        'incompatible-selected-definition',
        `selected-definition-${result.status}`,
      )
    case 'stale-snapshot':
      return failure(
        'stale-customization-report',
        'selected-resolution-snapshot-stale',
        { dimensions: result.dimensions },
      )
    case 'ambiguous-binding':
      return failure('target-ambiguous', 'selected-target-ambiguous')
    case 'unsupported-snapshot':
      return failure('attachment-context-mismatch', 'current-snapshot-unsupported')
    case 'invalid-reference':
      return failure('invalid-selected-definition', 'selected-reference-invalid')
  }
  return failure('resolution-blocked', 'selected-resolution-unclassified')
}

function mapProposalFailure(
  result: Exclude<
    ReturnType<typeof createCaseInsertPresetResolvedLayoutProposal>,
    { ok: true }
  >,
): CaseInsertPresetReapplyPlanningResult {
  switch (result.status) {
    case 'blocked': {
      const missing = result.blockers.find(({ kind }) =>
        kind === 'missing-required-target')
      return failure(
        missing ? 'target-missing' : 'resolution-blocked',
        missing ? 'required-selected-target-missing' : 'selected-layout-blocked',
      )
    }
    case 'conflicting-actions':
      return failure('transition-conflict', 'selected-field-actions-conflict')
    case 'unsupported-action':
      return failure('unsupported-owned-field', 'selected-action-unsupported')
    case 'incompatible-resolution':
      return failure(
        'incompatible-selected-definition',
        'selected-resolution-incompatible',
      )
    case 'stale-resolution':
      return failure(
        'stale-customization-report',
        'selected-resolution-stale',
        { dimensions: result.dimensions },
      )
    case 'invalid-resolution':
      return failure('resolution-blocked', result.code)
    case 'unsupported-operation':
      return failure('unsupported-operation', 'layout-proposal-operation-unsupported')
  }
  return failure('resolution-blocked', 'selected-layout-proposal-unclassified')
}

function validatePolicyRecords(
  rawPolicies: readonly unknown[],
  configuration: CaseInsertAppliedPresetConfiguration,
  report: CaseInsertPresetCustomizationReport,
  selectedPreset: Readonly<{ id: CaseInsertPresetId; revision: number }>,
  selectedByKey: ReadonlyMap<string, SelectedField>,
): Readonly<{
  ok: true
  policies: ReadonlyMap<string, CaseInsertPresetCustomizedFieldPolicyRecord>
}> | Readonly<{
  ok: false
  result: CaseInsertPresetReapplyPlanningResult
}> {
  const oldByKey = new Map(configuration.ownedFields.map((field) => [
    addressKey(field.address),
    field,
  ]))
  const reportByKey = new Map(report.fields.map((field) => [
    addressKey(field.address),
    field,
  ]))
  const required = new Set(report.fields
    .filter(({ fieldStatus }) => fieldStatus === 'value-diverged')
    .map(({ address }) => addressKey(address))
    .filter((key) => selectedByKey.has(key)))
  const policies = new Map<string, CaseInsertPresetCustomizedFieldPolicyRecord>()

  for (const rawPolicy of rawPolicies) {
    if (!isRecord(rawPolicy) || !hasExactKeys(rawPolicy, [
      'configurationIdentity',
      'customizationReportIdentity',
      'address',
      'lastAppliedValue',
      'currentValue',
      'selectedPreset',
      'selectedProposedValue',
      'policy',
    ]) || !isRecord(rawPolicy.address) || !isRecord(rawPolicy.selectedPreset)) {
      return {
        ok: false,
        result: failure('policy-mismatch', 'policy-shape-invalid'),
      }
    }
    if (rawPolicy.policy !== 'overwrite-with-selected-preset' &&
        rawPolicy.policy !== 'preserve-current-customization') {
      return {
        ok: false,
        result: failure('unsupported-policy', 'customized-policy-unsupported'),
      }
    }
    const address = rawPolicy.address as CaseInsertAppliedPresetOwnedFieldAddress
    const key = addressKey(address)
    const old = oldByKey.get(key)
    const reportField = reportByKey.get(key)
    const selected = selectedByKey.get(key)
    if (!old || !reportField || !selected || !required.has(key) ||
        policies.has(key) || !sameValue(address, old.address) ||
        rawPolicy.configurationIdentity !== configuration.configurationIdentity ||
        rawPolicy.customizationReportIdentity !== report.reportIdentity ||
        rawPolicy.lastAppliedValue !== old.lastAppliedValue ||
        rawPolicy.currentValue !== reportField.currentValue ||
        !hasExactKeys(rawPolicy.selectedPreset, ['id', 'revision']) ||
        rawPolicy.selectedPreset.id !== selectedPreset.id ||
        rawPolicy.selectedPreset.revision !== selectedPreset.revision ||
        rawPolicy.selectedProposedValue !== selected.proposedValue) {
      return {
        ok: false,
        result: failure('policy-mismatch', 'customized-policy-binding-mismatch'),
      }
    }
    policies.set(key, deepFreeze({
      configurationIdentity: configuration.configurationIdentity,
      customizationReportIdentity: report.reportIdentity,
      address: { ...old.address },
      lastAppliedValue: old.lastAppliedValue,
      currentValue: reportField.currentValue,
      selectedPreset: { ...selectedPreset },
      selectedProposedValue: selected.proposedValue,
      policy: rawPolicy.policy,
    }))
  }
  if (policies.size !== required.size) {
    return {
      ok: false,
      result: failure('policy-incomplete', 'customized-policy-missing'),
    }
  }
  return { ok: true, policies }
}

function resolvedAssignmentSummary(
  assignment: ResolvedCaseInsertPresetAssignment,
) {
  return {
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
  }
}

export function planCaseInsertPresetReapply(
  input: PlanCaseInsertPresetReapplyInput,
): CaseInsertPresetReapplyPlanningResult {
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

  const validatedConfiguration = validateCaseInsertAppliedPresetConfiguration(
    input.configuration,
  )
  if (!validatedConfiguration.ok) {
    if (validatedConfiguration.code ===
        'configuration-owned-field-unsupported') {
      return failure('unsupported-owned-field', validatedConfiguration.code)
    }
    return failure(validatedConfiguration.status, validatedConfiguration.code)
  }
  const configuration = validatedConfiguration.configuration
  const validatedReport = validateCaseInsertPresetCustomizationReport(
    input.customizationReport,
    configuration,
  )
  if (!validatedReport.ok) {
    return failure(validatedReport.status, validatedReport.code)
  }
  const report = validatedReport.report

  let normalized: ProjectJewelCaseState
  try {
    normalized = normalizeProjectJewelCaseState(input.current.aggregate)
  } catch {
    return failure('invalid-request', 'current-aggregate-invalid')
  }
  if (!sameValue(normalized, input.current.aggregate)) {
    return failure('invalid-request', 'current-aggregate-not-normalized')
  }

  const contextDimensions: string[] = []
  if (configuration.source.snapshotIdentity.sessionId !==
      input.current.sessionId) contextDimensions.push('configuration-session-id')
  if (input.current.projectRevision <
      configuration.source.snapshotIdentity.projectRevision) {
    contextDimensions.push('configuration-project-revision-regressed')
  }
  if (configuration.template.id !== input.current.template.id) {
    contextDimensions.push('configuration-template-id')
  }
  if (configuration.template.revision !== input.current.template.revision) {
    contextDimensions.push('configuration-template-revision')
  }
  if (input.current.aggregate.templateType !== input.current.template.id) {
    contextDimensions.push('aggregate-template-id')
  }
  if (contextDimensions.length > 0) {
    return failure(
      'attachment-context-mismatch',
      'configuration-current-context-mismatch',
      { dimensions: contextDimensions },
    )
  }
  if (report.current.projectRevision !== input.current.projectRevision) {
    return failure(
      'stale-customization-report',
      'report-project-revision-stale',
      { dimensions: ['project-revision'] },
    )
  }
  const reportContextDimensions: string[] = []
  if (report.current.sessionId !== input.current.sessionId) {
    reportContextDimensions.push('session-id')
  }
  if (report.current.template.id !== input.current.template.id) {
    reportContextDimensions.push('template-id')
  }
  if (report.current.template.revision !== input.current.template.revision) {
    reportContextDimensions.push('template-revision')
  }
  if (reportContextDimensions.length > 0) {
    return failure(
      'attachment-context-mismatch',
      'report-current-context-mismatch',
      { dimensions: reportContextDimensions },
    )
  }
  if (!isCaseInsertPresetAssignmentSnapshot(input.current.snapshot) ||
      input.current.snapshot.identity.sessionId !== input.current.sessionId ||
      input.current.snapshot.identity.projectRevision !==
        input.current.projectRevision ||
      input.current.snapshot.identity.template.id !== input.current.template.id ||
      input.current.snapshot.identity.template.revision !==
        input.current.template.revision ||
      !sameValue(input.current.snapshot.caseInsert, normalized)) {
    return failure(
      'attachment-context-mismatch',
      'snapshot-current-context-mismatch',
    )
  }

  const currentByKey = new Map<string, Readonly<{
    value: number
    enablement: CaseInsertPresetSnapshotEnablement
  }>>()
  for (const reportField of report.fields) {
    const current = readCurrentField(normalized, reportField.address)
    if (!current.ok) {
      return failure(current.status, current.code, {
        address: reportField.address,
      })
    }
    if (current.value !== reportField.currentValue) {
      return failure(
        'stale-customization-report',
        'report-current-value-stale',
        { address: reportField.address },
      )
    }
    currentByKey.set(addressKey(reportField.address), current)
  }

  const parsedDefinition = parseCaseInsertPresetDefinition(
    input.selectedDefinition,
  )
  if (!parsedDefinition.ok) {
    return failure(
      'invalid-selected-definition',
      `selected-definition-${parsedDefinition.error.code}`,
    )
  }
  const selectedDefinition = parsedDefinition.value
  if (selectedDefinition.id !== configuration.preset.id) {
    return failure(
      'preset-identity-mismatch',
      'selected-preset-id-does-not-match-configuration',
    )
  }
  const resolution = resolveCaseInsertPresetAssignmentsForDefinition({
    definition: selectedDefinition,
    requestedScope: configuration.requestedScope,
    snapshot: input.current.snapshot,
    expectedSnapshotIdentity: input.current.snapshot.identity,
  })
  if (!resolution.ok) return mapResolutionFailure(resolution)
  if (!sameCanonicalRegions(
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
      preset: {
        id: selectedDefinition.id,
        revision: selectedDefinition.revision,
      },
      requestedScope: configuration.requestedScope,
      snapshotIdentity: input.current.snapshot.identity,
    },
  })
  if (!proposal.ok) return mapProposalFailure(proposal)

  const selectedByKey = new Map<string, SelectedField>()
  for (const action of proposal.fieldActions) {
    const address = selectedAddress(action)
    if (!address || action.currentValue === null ||
        !isCaseInsertPresetOwnedFieldSemanticValue(
          address.fieldId,
          action.currentValue,
        ) || !isCaseInsertPresetOwnedFieldSemanticValue(
          address.fieldId,
          action.proposedValue,
        )) {
      return failure(
        'transition-conflict',
        'selected-field-address-or-value-invalid',
      )
    }
    const current = readCurrentField(normalized, address)
    if (!current.ok) {
      return failure(current.status, current.code, { address })
    }
    if (current.value !== action.currentValue) {
      return failure(
        'transition-conflict',
        'selected-action-current-value-mismatch',
        { address },
      )
    }
    const key = addressKey(address)
    if (selectedByKey.has(key)) {
      return failure('transition-conflict', 'selected-footprint-duplicate')
    }
    selectedByKey.set(key, deepFreeze({
      address: { ...address },
      proposedValue: action.proposedValue,
      currentValue: action.currentValue,
      sources: cloneSources(action.sources),
      actionKind: action.kind,
      enablement: { ...current.enablement },
    }))
    currentByKey.set(key, current)
  }

  const policyValidation = validatePolicyRecords(
    input.customizedFieldPolicies,
    configuration,
    report,
    { id: selectedDefinition.id, revision: selectedDefinition.revision },
    selectedByKey,
  )
  if (!policyValidation.ok) return policyValidation.result

  const oldByKey = new Map(configuration.ownedFields.map((field) => [
    addressKey(field.address),
    field,
  ]))
  const reportByKey = new Map(report.fields.map((field) => [
    addressKey(field.address),
    field,
  ]))
  const allKeys = [...new Set([
    ...oldByKey.keys(),
    ...selectedByKey.keys(),
  ])].sort((left, right) => {
    const leftAddress = oldByKey.get(left)?.address ??
      selectedByKey.get(left)!.address
    const rightAddress = oldByKey.get(right)?.address ??
      selectedByKey.get(right)!.address
    return addressSort(leftAddress, rightAddress)
  })
  const effects: CaseInsertPresetReapplyFieldEffect[] = []
  for (const key of allKeys) {
    const old = oldByKey.get(key)
    const reportField = reportByKey.get(key)
    const selected = selectedByKey.get(key)
    const current = currentByKey.get(key)
    if (!current) {
      return failure('transition-conflict', 'field-precondition-missing')
    }
    if (old && reportField && selected) {
      if (reportField.fieldStatus === 'unchanged') {
        effects.push({
          address: { ...old.address },
          disposition: 'retained-clean',
          policy: null,
          currentValue: current.value,
          previousLastAppliedValue: old.lastAppliedValue,
          selectedProposedValue: selected.proposedValue,
          projectedLastAppliedValue: selected.proposedValue,
          previousSources: cloneSources(old.sources),
          selectedSources: cloneSources(selected.sources),
          projectedSources: cloneSources(selected.sources),
          provenanceDisposition: provenanceDisposition(
            old.sources,
            selected.sources,
          ),
          aggregateWriteRequired: current.value !== selected.proposedValue,
          ownershipOutcome: 'retained',
          projectedCustomizationStatus: 'clean',
          enablement: { ...current.enablement },
        })
      } else {
        const policy = policyValidation.policies.get(key)!
        const preserve = policy.policy === 'preserve-current-customization'
        effects.push({
          address: { ...old.address },
          disposition: preserve
            ? 'retained-customized-preserve'
            : 'retained-customized-overwrite',
          policy: policy.policy,
          currentValue: current.value,
          previousLastAppliedValue: old.lastAppliedValue,
          selectedProposedValue: selected.proposedValue,
          projectedLastAppliedValue: preserve
            ? old.lastAppliedValue
            : selected.proposedValue,
          previousSources: cloneSources(old.sources),
          selectedSources: cloneSources(selected.sources),
          projectedSources: preserve
            ? cloneSources(old.sources)
            : cloneSources(selected.sources),
          provenanceDisposition: preserve
            ? 'unchanged'
            : provenanceDisposition(old.sources, selected.sources),
          aggregateWriteRequired: !preserve &&
            current.value !== selected.proposedValue,
          ownershipOutcome: 'retained',
          projectedCustomizationStatus: preserve ? 'customized' : 'clean',
          enablement: { ...current.enablement },
        })
      }
    } else if (old && reportField && !selected) {
      effects.push({
        address: { ...old.address },
        disposition: 'retired',
        policy: null,
        currentValue: current.value,
        previousLastAppliedValue: old.lastAppliedValue,
        selectedProposedValue: null,
        projectedLastAppliedValue: null,
        previousSources: cloneSources(old.sources),
        selectedSources: [],
        projectedSources: [],
        provenanceDisposition: 'not-applicable',
        aggregateWriteRequired: false,
        ownershipOutcome: 'retired',
        projectedCustomizationStatus: 'not-owned',
        enablement: { ...current.enablement },
      })
    } else if (!old && !reportField && selected) {
      effects.push({
        address: { ...selected.address },
        disposition: 'new-claim',
        policy: null,
        currentValue: current.value,
        previousLastAppliedValue: null,
        selectedProposedValue: selected.proposedValue,
        projectedLastAppliedValue: selected.proposedValue,
        previousSources: [],
        selectedSources: cloneSources(selected.sources),
        projectedSources: cloneSources(selected.sources),
        provenanceDisposition: selected.sources.length > 1
          ? 'coalesced'
          : 'changed',
        aggregateWriteRequired: current.value !== selected.proposedValue,
        ownershipOutcome: 'claimed',
        projectedCustomizationStatus: 'clean',
        enablement: { ...current.enablement },
      })
    } else {
      return failure('transition-conflict', 'footprint-classification-conflict')
    }
  }

  const materialConsentRequirements:
    CaseInsertPresetReapplyMaterialConsentRequirement[] = []
  const consentIdsByKey = new Map<string, string[]>()
  for (const effect of effects) {
    if (effect.disposition === 'retained-customized-overwrite') {
      const requirement = consentRequirement(
        'overwrite-customized-owned-field',
        {
          address: { ...effect.address },
          sourceConfigurationIdentity: configuration.configurationIdentity,
          sourceCustomizationReportIdentity: report.reportIdentity,
          selectedPreset: {
            id: selectedDefinition.id,
            revision: selectedDefinition.revision,
          },
          policy: effect.policy,
          previousLastAppliedValue: effect.previousLastAppliedValue,
          currentValue: effect.currentValue,
          proposedValue: effect.selectedProposedValue,
          sources: cloneSources(effect.selectedSources),
          assignmentIds: effect.selectedSources.map(({ assignmentId }) =>
            assignmentId),
          regions: [effect.address.region],
        },
      )
      materialConsentRequirements.push(requirement)
      consentIdsByKey.set(addressKey(effect.address), [requirement.id])
    } else if (effect.disposition === 'new-claim' &&
        effect.aggregateWriteRequired) {
      const requirement = consentRequirement(
        'new-field-claim-with-value-change',
        {
          address: { ...effect.address },
          sourceConfigurationIdentity: configuration.configurationIdentity,
          sourceCustomizationReportIdentity: report.reportIdentity,
          selectedPreset: {
            id: selectedDefinition.id,
            revision: selectedDefinition.revision,
          },
          policy: null,
          previousLastAppliedValue: null,
          currentValue: effect.currentValue,
          proposedValue: effect.selectedProposedValue,
          sources: cloneSources(effect.selectedSources),
          assignmentIds: effect.selectedSources.map(({ assignmentId }) =>
            assignmentId),
          regions: [effect.address.region],
        },
      )
      materialConsentRequirements.push(requirement)
      consentIdsByKey.set(addressKey(effect.address), [requirement.id])
    }
  }
  if (proposal.materialConsentRequirements.some((requirement) =>
    requirement.kind === 'multiple-concrete-regions') &&
      effects.some(({ aggregateWriteRequired }) => aggregateWriteRequired)) {
    const assignmentIds = proposal.assignments
      .filter(({ bindingStatus }) =>
        bindingStatus === 'resolved' || bindingStatus === 'resolved-disabled')
      .map(({ assignmentId }) => assignmentId)
    materialConsentRequirements.push(consentRequirement(
      'multiple-concrete-regions',
      {
        address: null,
        sourceConfigurationIdentity: configuration.configurationIdentity,
        sourceCustomizationReportIdentity: report.reportIdentity,
        selectedPreset: {
          id: selectedDefinition.id,
          revision: selectedDefinition.revision,
        },
        policy: null,
        previousLastAppliedValue: null,
        currentValue: null,
        proposedValue: null,
        sources: uniqueSources(proposal.fieldActions.flatMap(({ sources }) =>
          sources)),
        assignmentIds,
        regions: [...proposal.value.resolvedRegions],
      },
    ))
  }
  materialConsentRequirements.sort((left, right) =>
    left.kind.localeCompare(right.kind) ||
    (left.address && right.address ? addressSort(left.address, right.address) :
      left.address ? 1 : right.address ? -1 : 0) ||
    left.id.localeCompare(right.id))
  const globalConsentIds = materialConsentRequirements
    .filter(({ address }) => address === null)
    .map(({ id }) => id)

  const actionByKey = new Map(proposal.fieldActions.map((action) => {
    const address = selectedAddress(action)!
    return [addressKey(address), action] as const
  }))
  const aggregateWrites = effects
    .filter(({ aggregateWriteRequired }) => aggregateWriteRequired)
    .map((effect) => {
      const selected = selectedByKey.get(addressKey(effect.address))!
      return {
        id: [
          'case:preset-reapply-write',
          effect.address.featureOwnerId,
          effect.address.runtimeObjectId,
          effect.address.fieldId,
        ].join(':'),
        kind: actionByKey.get(addressKey(effect.address))!.kind,
        address: { ...effect.address },
        disposition: effect.disposition as
          CaseInsertPresetReapplyAggregateWrite['disposition'],
        policy: effect.policy,
        currentValuePrecondition: effect.currentValue,
        proposedValue: selected.proposedValue,
        sources: cloneSources(selected.sources),
        materialConsentRequirementIds:
          [
            ...(consentIdsByKey.get(addressKey(effect.address)) ?? []),
            ...globalConsentIds,
          ].sort(),
      }
    })

  const warnings: CaseInsertPresetReapplyWarning[] = [
    ...proposal.warnings.map((warning) => ({
      kind: 'selected-layout-warning' as const,
      warning,
    })),
    ...effects.flatMap((effect): CaseInsertPresetReapplyWarning[] => {
      const result: CaseInsertPresetReapplyWarning[] = []
      if (effect.disposition === 'retained-customized-preserve') {
        result.push({ kind: 'customization-preserved', address: effect.address })
      }
      if (effect.disposition === 'new-claim') {
        result.push({ kind: 'new-field-claim', address: effect.address })
      }
      if (effect.disposition === 'retired') {
        result.push({ kind: 'field-retired', address: effect.address })
      }
      if (effect.provenanceDisposition === 'changed' ||
          effect.provenanceDisposition === 'coalesced') {
        result.push({ kind: 'field-provenance-changed', address: effect.address })
      }
      return result
    }),
  ].sort((left, right) =>
    left.kind.localeCompare(right.kind) ||
    deterministicEncode(left).localeCompare(deterministicEncode(right)))

  const projectedOwnedFields = effects
    .filter((effect): effect is CaseInsertPresetReapplyFieldEffect & Readonly<{
      disposition: Exclude<CaseInsertPresetReapplyFieldDisposition, 'retired'>
      projectedLastAppliedValue: number
    }> => effect.disposition !== 'retired' &&
      effect.projectedLastAppliedValue !== null)
    .map((effect) => ({
      address: { ...effect.address },
      lastAppliedValue: effect.projectedLastAppliedValue,
      sources: cloneSources(effect.projectedSources),
      disposition: effect.disposition,
      expectedCustomizationStatus:
        effect.projectedCustomizationStatus as 'clean' | 'customized',
    }))

  const fieldPreconditions = effects.map((effect) => ({
    address: { ...effect.address },
    bindingMatch: 'exactly-one' as const,
    currentValue: effect.currentValue,
    enablement: { ...effect.enablement },
  }))
  const scopeKey = getCaseInsertPresetApplicationScopeKey(
    configuration.requestedScope,
  )
  const planContent: Omit<CaseInsertPresetReapplyPlan, 'reviewIdentity'> = {
    kind: CASE_INSERT_PRESET_REAPPLY_PLAN_KIND,
    formatVersion: CASE_INSERT_PRESET_REAPPLY_PLAN_FORMAT_VERSION,
    operation: 'reapply',
    source: {
      configurationIdentity: configuration.configurationIdentity,
      customizationReportIdentity: report.reportIdentity,
      projectKind: 'caseInsert',
      sessionId: input.current.sessionId,
      projectRevision: input.current.projectRevision,
      template: { id: input.current.template.id, revision: null },
    },
    preset: {
      id: selectedDefinition.id,
      previousRevision: configuration.preset.revision,
      selectedRevision: selectedDefinition.revision,
      source: proposal.value.preset.source,
    },
    requestedScope: { ...configuration.requestedScope } as
      CaseInsertPresetApplicationScope,
    resolvedRegions: [...configuration.resolvedRegions],
    resolvedAssignments: proposal.assignments.map(resolvedAssignmentSummary),
    selectedFootprint: [...selectedByKey.values()]
      .sort((left, right) => addressSort(left.address, right.address))
      .map((field) => ({
        address: { ...field.address },
        proposedValue: field.proposedValue,
        sources: cloneSources(field.sources),
      })),
    fieldEffects: effects,
    aggregateWrites,
    preservedCustomizedFields: effects.filter(({ disposition }) =>
      disposition === 'retained-customized-preserve'),
    newlyClaimedFields: effects.filter(({ disposition }) =>
      disposition === 'new-claim'),
    retiredFields: effects.filter(({ disposition }) => disposition === 'retired'),
    projectedConfiguration: {
      kind: CASE_INSERT_PRESET_REAPPLY_CONFIGURATION_PROJECTION_KIND,
      authority: 'non-authoritative-uninstalled-projection',
      sourceConfigurationIdentity: configuration.configurationIdentity,
      sourceCustomizationReportIdentity: report.reportIdentity,
      selectedPreset: {
        id: selectedDefinition.id,
        revision: selectedDefinition.revision,
        source: proposal.value.preset.source,
      },
      requestedScope: { ...configuration.requestedScope } as
        CaseInsertPresetApplicationScope,
      resolvedRegions: [...configuration.resolvedRegions],
      ownedFields: projectedOwnedFields,
    },
    preservationDecisions: proposal.preservationDecisions,
    skips: proposal.skips,
    warnings,
    blockers: [],
    materialConsentRequirements,
    preconditions: {
      configurationIdentity: configuration.configurationIdentity,
      customizationReportIdentity: report.reportIdentity,
      projectKind: 'caseInsert',
      sessionId: input.current.sessionId,
      projectRevision: input.current.projectRevision,
      template: { id: input.current.template.id, revision: null },
      selectedPreset: {
        id: selectedDefinition.id,
        revision: selectedDefinition.revision,
      },
      scopeKey,
      resolvedRegions: [...configuration.resolvedRegions],
      fields: fieldPreconditions,
    },
    semanticEffects: {
      aggregateWriteCount: aggregateWrites.length,
      configurationEffect: true,
    },
  }
  const plan = deepFreeze({
    ...planContent,
    reviewIdentity:
      `case:preset-reapply-review:v1:${deterministicEncode(planContent)}`,
  })
  return deepFreeze({
    ok: true,
    status: aggregateWrites.length === 0
      ? 'aggregate-semantic-no-op'
      : 'planned',
    plan,
  })
}
