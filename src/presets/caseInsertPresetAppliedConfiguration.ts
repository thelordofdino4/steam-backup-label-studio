import {
  resolveCaseInsertPresetAggregateBinding,
  type CaseInsertPresetAssignmentSnapshotIdentity,
  type CaseInsertPresetSnapshotObjectState,
} from '../caseInsert/presetAssignmentSnapshot.ts'
import { normalizeProjectJewelCaseState } from '../caseInsert/normalization.ts'
import type { ProjectJewelCaseState } from '../project/projectTypes.ts'
import { caseInsertTemplates } from '../templates/caseInsertTemplates.ts'
import {
  CASE_INSERT_PRESET_CONCRETE_REGION_IDS,
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
  getCaseInsertPresetPlanOwnerRule,
  type CaseInsertPresetPlanFieldId,
  type CaseInsertPresetPlanSourceAssignment,
} from './caseInsertPresetApplyPlanning.ts'
import {
  CASE_INSERT_PRESET_APPLIED_CONFIGURATION_CANDIDATE_KIND,
  CASE_INSERT_PRESET_APPLIED_CONFIGURATION_CANDIDATE_VERSION,
  type CaseInsertPresetApplyTransitionResult,
} from './caseInsertPresetApplyTransition.ts'
import {
  CASE_INSERT_PRESET_REAPPLY_CONSENT_IDENTITY_PREFIX,
  CASE_INSERT_PRESET_REAPPLY_REVIEW_ACCEPTANCE_IDENTITY_PREFIX,
  CASE_INSERT_PRESET_REAPPLY_REVIEW_IDENTITY_PREFIX,
  CASE_INSERT_PRESET_REAPPLY_TRANSITION_IDENTITY_PREFIX,
  CASE_INSERT_PRESET_REAPPLY_WARNING_IDENTITY_PREFIX,
} from './caseInsertPresetReapplyIdentity.ts'

export const CASE_INSERT_APPLIED_PRESET_CONFIGURATION_KIND =
  'sbls/case-insert-applied-preset-configuration' as const
export const CASE_INSERT_APPLIED_PRESET_CONFIGURATION_VERSION = 1 as const
export const CASE_INSERT_REAPPLIED_PRESET_CONFIGURATION_VERSION = 2 as const
export const CASE_INSERT_PRESET_CUSTOMIZATION_REPORT_KIND =
  'sbls/case-insert-preset-customization-report' as const
export const CASE_INSERT_PRESET_CUSTOMIZATION_REPORT_VERSION = 1 as const

const CONFIGURATION_IDENTITY_PREFIX =
  'case:preset-applied-configuration:v1:'
const CUSTOMIZATION_REPORT_IDENTITY_PREFIX =
  'case:preset-customization-report:v1:'
const REVIEW_IDENTITY_PREFIX = 'case:preset-apply-review:v1:'
const WARNING_IDENTITY_PREFIX = 'case:preset-warning:v1:'
const CONSENT_IDENTITY_PREFIX = 'case:preset-consent:v1:'

const REGION_ORDER = new Map(
  CASE_INSERT_PRESET_CONCRETE_REGION_IDS.map((region, index) => [region, index]),
)
const FIELD_ORDER = new Map<CaseInsertPresetPlanFieldId, number>([
  ['layout-x', 0],
  ['layout-y', 1],
  ['layout-scale', 2],
  ['layout-width', 3],
])
const FIELD_IDS = new Set<string>(FIELD_ORDER.keys())
const ROLE_IDS = new Set<string>(CASE_INSERT_PRESET_ROLE_IDS)
const SLOT_ID_PATTERN = /^case:preset-slot:[a-z0-9]+(?:-[a-z0-9]+)*$/
const ASSIGNMENT_ID_PATTERN =
  /^case:preset-assignment:[a-z0-9]+(?:-[a-z0-9]+)*$/

export type CaseInsertAppliedPresetOwnedFieldAddress = Readonly<{
  region: CaseInsertPresetConcreteRegionId
  featureOwnerId: CaseInsertPresetOwnerId
  bindingKind: 'fixed' | 'repeated'
  bindingId: string
  runtimeObjectId: string
  fieldId: CaseInsertPresetPlanFieldId
}>

export type CaseInsertAppliedPresetOwnedField = Readonly<{
  address: CaseInsertAppliedPresetOwnedFieldAddress
  lastAppliedValue: number
  sources: readonly CaseInsertPresetPlanSourceAssignment[]
}>

type CaseInsertAppliedPresetConfigurationBase = Readonly<{
  kind: typeof CASE_INSERT_APPLIED_PRESET_CONFIGURATION_KIND
  domainStatus: 'validated-authoritative'
  attachmentStatus: 'detached-uninstalled'
  configurationIdentity: string
  firstApply: Readonly<{
    operation: 'apply'
    transitionStatus: 'applied' | 'applied-semantic-no-op'
  }>
  preset: Readonly<{
    id: `builtin:case-preset:${string}` | `user:case-preset:${string}`
    revision: number
    source: 'builtin' | 'user'
  }>
  requestedScope: CaseInsertPresetApplicationScope
  resolvedRegions: readonly CaseInsertPresetConcreteRegionId[]
  template: Readonly<{ id: string; revision: null }>
  reviewedPlanIdentity: string
  source: Readonly<{
    projectKind: 'caseInsert'
    snapshotIdentity: CaseInsertPresetAssignmentSnapshotIdentity
  }>
  ownedFields: readonly CaseInsertAppliedPresetOwnedField[]
  reviewedWarningIds: readonly string[]
  acceptedMaterialConsentRequirementIds:
    readonly string[]
}>

export type CaseInsertFirstAppliedPresetConfiguration =
  CaseInsertAppliedPresetConfigurationBase & Readonly<{
    formatVersion: typeof CASE_INSERT_APPLIED_PRESET_CONFIGURATION_VERSION
  }>

export type CaseInsertReappliedPresetConfiguration =
  CaseInsertAppliedPresetConfigurationBase & Readonly<{
    formatVersion: typeof CASE_INSERT_REAPPLIED_PRESET_CONFIGURATION_VERSION
    reapply: Readonly<{
      operation: 'reapply'
      transitionStatus:
        | 'reapplied'
        | 'reapplied-aggregate-semantic-no-op'
        | 'reapplied-semantic-no-op'
      transitionIdentity: string
      sourceConfigurationIdentity: string
      sourceCustomizationReportIdentity: string
      reviewAcceptanceIdentity: string
      previousPresetRevision: number
    }>
  }>

export type CaseInsertAppliedPresetConfiguration =
  | CaseInsertFirstAppliedPresetConfiguration
  | CaseInsertReappliedPresetConfiguration

export type CaseInsertAppliedPresetConfigurationValidationResult =
  | Readonly<{
      ok: true
      status: 'validated'
      configuration: CaseInsertAppliedPresetConfiguration
    }>
  | Readonly<{
      ok: false
      status: 'invalid-configuration' | 'unsupported-configuration-version'
      code: string
    }>

export type CaseInsertPresetCustomizationFieldRecord = Readonly<{
  address: CaseInsertAppliedPresetOwnedFieldAddress
  lastAppliedValue: number
  currentValue: number
  fieldStatus: 'unchanged' | 'value-diverged'
  sources: readonly CaseInsertPresetPlanSourceAssignment[]
}>

export type DetectCaseInsertPresetCustomizationInput = Readonly<{
  configuration: CaseInsertAppliedPresetConfiguration
  current: Readonly<{
    projectKind: string
    aggregate: ProjectJewelCaseState
    sessionId: string
    projectRevision: number
    template: Readonly<{ id: string; revision: number | null }>
  }>
}>

type DetectionFailureStatus =
  | 'invalid-configuration'
  | 'unsupported-configuration-version'
  | 'incompatible-current-aggregate'
  | 'attachment-context-mismatch'
  | 'target-missing'
  | 'target-ambiguous'
  | 'unsupported-owned-field'
  | 'invalid-current-value'

export type CaseInsertPresetCustomizationDetectionResult =
  | Readonly<{
      ok: true
      status: 'clean' | 'customized'
      kind: typeof CASE_INSERT_PRESET_CUSTOMIZATION_REPORT_KIND
      formatVersion: typeof CASE_INSERT_PRESET_CUSTOMIZATION_REPORT_VERSION
      reportIdentity: string
      configurationIdentity: string
      current: Readonly<{
        projectKind: 'caseInsert'
        sessionId: string
        projectRevision: number
        template: Readonly<{ id: string; revision: null }>
      }>
      fields: readonly CaseInsertPresetCustomizationFieldRecord[]
      summary: Readonly<{
        fieldCount: number
        unchangedFieldCount: number
        customizedFieldCount: number
      }>
    }>
  | Readonly<{
      ok: false
      status: DetectionFailureStatus
      code: string
      address?: CaseInsertAppliedPresetOwnedFieldAddress
      dimensions?: readonly string[]
    }>

export type CaseInsertPresetCustomizationReport = Extract<
  CaseInsertPresetCustomizationDetectionResult,
  Readonly<{ ok: true }>
>

export type CaseInsertPresetCustomizationReportValidationResult =
  | Readonly<{
      ok: true
      status: 'validated'
      report: CaseInsertPresetCustomizationReport
    }>
  | Readonly<{
      ok: false
      status:
        | 'invalid-customization-report'
        | 'unsupported-report-version'
        | 'report-mismatch'
      code: string
    }>

type ValidationFailure = Extract<
  CaseInsertAppliedPresetConfigurationValidationResult,
  Readonly<{ ok: false }>
>

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasExactKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
) {
  const actual = Object.keys(value)
  return actual.length === expected.length &&
    actual.every((key) => expected.includes(key))
}

function isNonNegativeSafeInteger(value: unknown): value is number {
  return typeof value === 'number' &&
    Number.isSafeInteger(value) &&
    value >= 0
}

function isPositiveSafeInteger(value: unknown): value is number {
  return typeof value === 'number' &&
    Number.isSafeInteger(value) &&
    value > 0
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
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
  return leftKeys.length === rightKeys.length &&
    leftKeys.every((key) =>
      Object.prototype.hasOwnProperty.call(right, key) &&
      sameValue(left[key], right[key]))
}

function validationFailure(
  status: ValidationFailure['status'],
  code: string,
): ValidationFailure {
  return Object.freeze({ ok: false, status, code })
}

function detectionFailure(
  status: DetectionFailureStatus,
  code: string,
  options: Readonly<{
    address?: CaseInsertAppliedPresetOwnedFieldAddress
    dimensions?: readonly string[]
  }> = {},
): Extract<CaseInsertPresetCustomizationDetectionResult, { ok: false }> {
  return deepFreeze({
    ok: false,
    status,
    code,
    ...(options.address ? { address: cloneMutable(options.address) } : {}),
    ...(options.dimensions ? { dimensions: [...options.dimensions] } : {}),
  })
}

function isSnapshotIdentity(
  value: unknown,
): value is CaseInsertPresetAssignmentSnapshotIdentity {
  if (!isRecord(value) || !hasExactKeys(value, [
    'sessionId',
    'projectRevision',
    'template',
  ]) || !isRecord(value.template) || !hasExactKeys(value.template, [
    'id',
    'revision',
  ])) {
    return false
  }
  return typeof value.sessionId === 'string' &&
    value.sessionId.trim().length > 0 &&
    isNonNegativeSafeInteger(value.projectRevision) &&
    typeof value.template.id === 'string' &&
    value.template.id.trim().length > 0 &&
    value.template.revision === null
}

function isCanonicalPreset(
  value: unknown,
): value is CaseInsertAppliedPresetConfiguration['preset'] {
  if (!isRecord(value) || !hasExactKeys(value, ['id', 'revision', 'source']) ||
      !isCaseInsertPresetId(value.id) ||
      !isPositiveSafeInteger(value.revision) ||
      (value.source !== 'builtin' && value.source !== 'user')) {
    return false
  }
  return value.source === (value.id.startsWith('builtin:') ? 'builtin' : 'user')
}

function parseCanonicalRegions(value: unknown) {
  if (!Array.isArray(value) || value.length === 0) return null
  const regions: CaseInsertPresetConcreteRegionId[] = []
  const seen = new Set<string>()
  for (const region of value) {
    if (typeof region !== 'string' || !REGION_ORDER.has(
      region as CaseInsertPresetConcreteRegionId,
    ) || seen.has(region)) {
      return null
    }
    seen.add(region)
    regions.push(region as CaseInsertPresetConcreteRegionId)
  }
  const sorted = [...regions].sort((left, right) =>
    REGION_ORDER.get(left)! - REGION_ORDER.get(right)!)
  return regions.every((region, index) => region === sorted[index])
    ? regions
    : null
}

function scopeMatchesRegions(
  scope: CaseInsertPresetApplicationScope,
  regions: readonly CaseInsertPresetConcreteRegionId[],
) {
  if (scope.kind === 'complete') return regions.length > 0
  if (scope.kind === 'region') {
    return regions.length === 1 && regions[0] === scope.region
  }
  if (scope.section === 'front') {
    return regions.length === 1 && regions[0] === 'front-cover'
  }
  const allowed = scope.section === 'back'
    ? new Set(['tray-card', 'back-panel'])
    : new Set(['left-spine', 'right-spine'])
  return regions.length > 0 && regions.every((region) => allowed.has(region))
}

export function isCaseInsertPresetOwnedFieldSemanticValue(
  fieldId: CaseInsertPresetPlanFieldId,
  value: unknown,
): value is number {
  return isFiniteNumber(value) &&
    ((fieldId !== 'layout-scale' && fieldId !== 'layout-width') || value > 0)
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

export function getCaseInsertPresetOwnedFieldCurrentValue(
  target: CaseInsertPresetSnapshotObjectState,
  fieldId: CaseInsertPresetPlanFieldId,
): unknown {
  if (!isRecord(target.layout)) return undefined
  switch (fieldId) {
    case 'layout-x': return target.layout.x
    case 'layout-y': return target.layout.y
    case 'layout-scale': return target.layout.scale
    case 'layout-width': return target.layout.width
  }
}

function sourceSort(
  left: CaseInsertPresetPlanSourceAssignment,
  right: CaseInsertPresetPlanSourceAssignment,
) {
  return REGION_ORDER.get(left.region)! - REGION_ORDER.get(right.region)! ||
    left.slotId.localeCompare(right.slotId) ||
    left.assignmentId.localeCompare(right.assignmentId)
}

function ownedFieldSort(
  left: CaseInsertAppliedPresetOwnedField,
  right: CaseInsertAppliedPresetOwnedField,
) {
  return REGION_ORDER.get(left.address.region)! -
      REGION_ORDER.get(right.address.region)! ||
    left.address.featureOwnerId.localeCompare(right.address.featureOwnerId) ||
    left.address.runtimeObjectId.localeCompare(right.address.runtimeObjectId) ||
    FIELD_ORDER.get(left.address.fieldId)! - FIELD_ORDER.get(right.address.fieldId)!
}

function ownedFieldAddressKey(
  address: CaseInsertAppliedPresetOwnedFieldAddress,
) {
  return [
    address.region,
    address.featureOwnerId,
    address.bindingKind,
    address.bindingId,
    address.runtimeObjectId,
    address.fieldId,
  ].join('\u0000')
}

function sameOrder<T>(
  values: readonly T[],
  compare: (left: T, right: T) => number,
) {
  const sorted = [...values].sort(compare)
  return values.every((value, index) => value === sorted[index])
}

function parseSourceAssignment(
  value: unknown,
  context: Readonly<{
    preset: CaseInsertAppliedPresetConfiguration['preset']
    regions: readonly CaseInsertPresetConcreteRegionId[]
    ownerId: CaseInsertPresetOwnerId
    bindingKind: 'fixed' | 'repeated'
    bindingId: string
    runtimeObjectId: string
  }>,
): CaseInsertPresetPlanSourceAssignment | null {
  if (!isRecord(value) || !hasExactKeys(value, [
    'presetId',
    'presetRevision',
    'slotId',
    'assignmentId',
    'roleId',
    'region',
    'coordinateBasis',
    'ownerId',
    'object',
    'declaredPolicy',
  ]) || value.presetId !== context.preset.id ||
      value.presetRevision !== context.preset.revision ||
      typeof value.slotId !== 'string' || !SLOT_ID_PATTERN.test(value.slotId) ||
      typeof value.assignmentId !== 'string' ||
      !ASSIGNMENT_ID_PATTERN.test(value.assignmentId) ||
      typeof value.roleId !== 'string' || !ROLE_IDS.has(value.roleId) ||
      typeof value.region !== 'string' ||
      !context.regions.includes(value.region as CaseInsertPresetConcreteRegionId) ||
      typeof value.coordinateBasis !== 'string' ||
      !isCaseInsertPresetCoordinateBasisAllowed(
        value.region as CaseInsertPresetConcreteRegionId,
        value.coordinateBasis as never,
      ) || value.ownerId !== context.ownerId ||
      value.declaredPolicy !== 'normalized-content-region-direct-layout-v1' ||
      !isRecord(value.object) ||
      !hasExactKeys(value.object, ['bindingKind', 'bindingId', 'runtimeId']) ||
      value.object.bindingKind !== context.bindingKind ||
      value.object.bindingId !== context.bindingId ||
      value.object.runtimeId !== context.runtimeObjectId) {
    return null
  }
  const ownerRule = getCaseInsertPresetPlanOwnerRule(context.ownerId)
  if (!ownerRule || ownerRule.region !== value.region) return null
  return value as CaseInsertPresetPlanSourceAssignment
}

function parseCandidateOwnedFields(
  rawFields: unknown,
  context: Readonly<{
    preset: CaseInsertAppliedPresetConfiguration['preset']
    regions: readonly CaseInsertPresetConcreteRegionId[]
    aggregate?: ProjectJewelCaseState
  }>,
): Readonly<{
  ok: true
  fields: readonly CaseInsertAppliedPresetOwnedField[]
}> | Readonly<{ ok: false; code: string }> {
  if (!Array.isArray(rawFields)) return { ok: false, code: 'owned-fields-invalid' }
  const fields: CaseInsertAppliedPresetOwnedField[] = []
  const addresses = new Set<string>()

  for (const rawField of rawFields) {
    if (!isRecord(rawField) || !hasExactKeys(rawField, [
      'featureOwnerId',
      'object',
      'fieldId',
      'lastAppliedValue',
      'sources',
    ]) || typeof rawField.featureOwnerId !== 'string' ||
        !isRecord(rawField.object) ||
        !hasExactKeys(rawField.object, [
          'bindingKind',
          'bindingId',
          'runtimeId',
        ]) || (rawField.object.bindingKind !== 'fixed' &&
          rawField.object.bindingKind !== 'repeated') ||
        typeof rawField.object.bindingId !== 'string' ||
        rawField.object.bindingId.trim().length === 0 ||
        typeof rawField.object.runtimeId !== 'string' ||
        rawField.object.runtimeId.trim().length === 0 ||
        typeof rawField.fieldId !== 'string' ||
        !FIELD_IDS.has(rawField.fieldId)) {
      return { ok: false, code: 'owned-field-invalid' }
    }
    const ownerId = rawField.featureOwnerId as CaseInsertPresetOwnerId
    const fieldId = rawField.fieldId as CaseInsertPresetPlanFieldId
    const ownerRule = getCaseInsertPresetPlanOwnerRule(ownerId)
    if (!ownerRule || !ownerAllowsField(ownerId, fieldId)) {
      return { ok: false, code: 'owned-field-unsupported' }
    }
    if (!isCaseInsertPresetOwnedFieldSemanticValue(
      fieldId,
      rawField.lastAppliedValue,
    ) ||
        !Array.isArray(rawField.sources) || rawField.sources.length === 0) {
      return { ok: false, code: 'owned-field-value-or-provenance-invalid' }
    }
    const sources: CaseInsertPresetPlanSourceAssignment[] = []
    const sourceIds = new Set<string>()
    for (const rawSource of rawField.sources) {
      const source = parseSourceAssignment(rawSource, {
        preset: context.preset,
        regions: context.regions,
        ownerId,
        bindingKind: rawField.object.bindingKind,
        bindingId: rawField.object.bindingId,
        runtimeObjectId: rawField.object.runtimeId,
      })
      if (!source || sourceIds.has(source.assignmentId)) {
        return { ok: false, code: 'owned-field-provenance-invalid' }
      }
      sourceIds.add(source.assignmentId)
      sources.push(source)
    }
    if (!sameOrder(sources, sourceSort)) {
      return { ok: false, code: 'owned-field-provenance-order-invalid' }
    }
    const address: CaseInsertAppliedPresetOwnedFieldAddress = {
      region: sources[0]!.region,
      featureOwnerId: ownerId,
      bindingKind: rawField.object.bindingKind,
      bindingId: rawField.object.bindingId,
      runtimeObjectId: rawField.object.runtimeId,
      fieldId,
    }
    if (sources.some(({ region }) => region !== address.region) ||
        ownerRule.region !== address.region) {
      return { ok: false, code: 'owned-field-region-invalid' }
    }
    const addressKey = [
      address.featureOwnerId,
      address.bindingKind,
      address.bindingId,
      address.runtimeObjectId,
      address.fieldId,
    ].join('\u0000')
    if (addresses.has(addressKey)) {
      return { ok: false, code: 'owned-field-address-duplicate' }
    }
    addresses.add(addressKey)

    if (context.aggregate) {
      let binding: ReturnType<typeof resolveCaseInsertPresetAggregateBinding>
      try {
        binding = resolveCaseInsertPresetAggregateBinding(
          context.aggregate,
          ownerId,
          { kind: address.bindingKind, id: address.bindingId },
        )
      } catch {
        return { ok: false, code: 'candidate-target-lookup-failed' }
      }
      if (binding.status !== 'found' ||
          binding.currentState.id !== address.runtimeObjectId ||
          getCaseInsertPresetOwnedFieldCurrentValue(
            binding.currentState,
            fieldId,
          ) !==
            rawField.lastAppliedValue) {
        return { ok: false, code: 'candidate-aggregate-incoherent' }
      }
    }

    fields.push({
      address,
      lastAppliedValue: rawField.lastAppliedValue,
      sources: sources.map((source) => ({
        ...source,
        object: { ...source.object },
      })),
    })
  }
  if (!sameOrder(fields, ownedFieldSort)) {
    return { ok: false, code: 'owned-field-order-invalid' }
  }
  return { ok: true, fields }
}

function parseUniqueIdentityList(
  value: unknown,
  prefix: string,
): readonly string[] | null {
  if (!Array.isArray(value)) return null
  const ids: string[] = []
  const seen = new Set<string>()
  for (const id of value) {
    if (typeof id !== 'string' || !id.startsWith(prefix) || seen.has(id)) {
      return null
    }
    seen.add(id)
    ids.push(id)
  }
  return ids
}

function atom(value: boolean | number | string | null) {
  const encoded = value === null
    ? 'null'
    : typeof value === 'boolean'
      ? value ? 'true' : 'false'
      : typeof value === 'number'
        ? Object.is(value, -0) ? '0' : String(value)
        : value
  return `${encoded.length}:${encoded}`
}

function tuple(label: string, values: readonly string[]) {
  return `${atom(label)}${atom(values.length)}${values.map(atom).join('')}`
}

function primitiveTuple(
  label: string,
  values: readonly (boolean | number | string | null)[],
) {
  return tuple(label, values.map((value) => atom(value)))
}

function sourceIdentity(source: CaseInsertPresetPlanSourceAssignment) {
  return primitiveTuple('source', [
    source.presetId,
    source.presetRevision,
    source.slotId,
    source.assignmentId,
    source.roleId,
    source.region,
    source.coordinateBasis,
    source.ownerId,
    source.object.bindingKind,
    source.object.bindingId,
    source.object.runtimeId,
    source.declaredPolicy,
  ])
}

type ConfigurationIdentityInput =
  | Omit<CaseInsertFirstAppliedPresetConfiguration, 'configurationIdentity'>
  | Omit<CaseInsertReappliedPresetConfiguration, 'configurationIdentity'>

function createConfigurationIdentity(
  configuration: ConfigurationIdentityInput,
) {
  const fields = configuration.ownedFields.map((field) => tuple('owned-field', [
    primitiveTuple('address', [
      field.address.region,
      field.address.featureOwnerId,
      field.address.bindingKind,
      field.address.bindingId,
      field.address.runtimeObjectId,
      field.address.fieldId,
    ]),
    primitiveTuple('last-applied-value', [field.lastAppliedValue]),
    tuple('sources', field.sources.map(sourceIdentity)),
  ]))
  const payloadParts = [
    primitiveTuple('format', [
      configuration.kind,
      configuration.formatVersion,
      configuration.domainStatus,
      configuration.attachmentStatus,
    ]),
    primitiveTuple('first-apply', [
      configuration.firstApply.operation,
      configuration.firstApply.transitionStatus,
    ]),
    ...(configuration.formatVersion ===
        CASE_INSERT_REAPPLIED_PRESET_CONFIGURATION_VERSION
      ? [primitiveTuple('reapply', [
          configuration.reapply.operation,
          configuration.reapply.transitionStatus,
          configuration.reapply.transitionIdentity,
          configuration.reapply.sourceConfigurationIdentity,
          configuration.reapply.sourceCustomizationReportIdentity,
          configuration.reapply.reviewAcceptanceIdentity,
          configuration.reapply.previousPresetRevision,
        ])]
      : []),
    primitiveTuple('preset', [
      configuration.preset.id,
      configuration.preset.revision,
      configuration.preset.source,
    ]),
    primitiveTuple('scope', [
      getCaseInsertPresetApplicationScopeKey(configuration.requestedScope),
    ]),
    primitiveTuple('regions', configuration.resolvedRegions),
    primitiveTuple('template', [
      configuration.template.id,
      configuration.template.revision,
    ]),
    primitiveTuple('review', [configuration.reviewedPlanIdentity]),
    primitiveTuple('source', [
      configuration.source.projectKind,
      configuration.source.snapshotIdentity.sessionId,
      configuration.source.snapshotIdentity.projectRevision,
      configuration.source.snapshotIdentity.template.id,
      configuration.source.snapshotIdentity.template.revision,
    ]),
    tuple('owned-fields', fields),
    primitiveTuple('reviewed-warnings', configuration.reviewedWarningIds),
    primitiveTuple(
      'accepted-consents',
      configuration.acceptedMaterialConsentRequirementIds,
    ),
  ]
  const payload = tuple('case-applied-preset-configuration', payloadParts)
  return `${CONFIGURATION_IDENTITY_PREFIX}${payload}`
}

export function createCaseInsertAppliedPresetConfigurationIdentity(
  configuration: ConfigurationIdentityInput,
) {
  return createConfigurationIdentity(configuration)
}

function rebuildConfiguration(value: unknown): Readonly<{
  ok: true
  configuration: CaseInsertAppliedPresetConfiguration
}> | Readonly<{ ok: false; status: ValidationFailure['status']; code: string }> {
  if (!isRecord(value)) {
    return { ok: false, status: 'invalid-configuration', code: 'root-invalid' }
  }
  if (value.kind === CASE_INSERT_APPLIED_PRESET_CONFIGURATION_KIND &&
      value.formatVersion !== CASE_INSERT_APPLIED_PRESET_CONFIGURATION_VERSION &&
      value.formatVersion !== CASE_INSERT_REAPPLIED_PRESET_CONFIGURATION_VERSION) {
    return {
      ok: false,
      status: 'unsupported-configuration-version',
      code: 'configuration-version-unsupported',
    }
  }
  const isReapplied = value.formatVersion ===
    CASE_INSERT_REAPPLIED_PRESET_CONFIGURATION_VERSION
  const expectedKeys = [
    'kind',
    'formatVersion',
    'domainStatus',
    'attachmentStatus',
    'configurationIdentity',
    'firstApply',
    'preset',
    'requestedScope',
    'resolvedRegions',
    'template',
    'reviewedPlanIdentity',
    'source',
    'ownedFields',
    'reviewedWarningIds',
    'acceptedMaterialConsentRequirementIds',
    ...(isReapplied ? ['reapply'] : []),
  ]
  if (!isDeeplyFrozen(value) || !hasExactKeys(value, expectedKeys) ||
      value.kind !== CASE_INSERT_APPLIED_PRESET_CONFIGURATION_KIND ||
      (value.formatVersion !== CASE_INSERT_APPLIED_PRESET_CONFIGURATION_VERSION &&
        value.formatVersion !== CASE_INSERT_REAPPLIED_PRESET_CONFIGURATION_VERSION) ||
      value.domainStatus !== 'validated-authoritative' ||
      value.attachmentStatus !== 'detached-uninstalled' ||
      typeof value.configurationIdentity !== 'string' ||
      !isRecord(value.firstApply) || !hasExactKeys(value.firstApply, [
        'operation',
        'transitionStatus',
      ]) || value.firstApply.operation !== 'apply' ||
      (value.firstApply.transitionStatus !== 'applied' &&
        value.firstApply.transitionStatus !== 'applied-semantic-no-op') ||
      !isCanonicalPreset(value.preset)) {
    return { ok: false, status: 'invalid-configuration', code: 'shape-invalid' }
  }
  if (isReapplied && (!isRecord(value.reapply) ||
      !hasExactKeys(value.reapply, [
        'operation',
        'transitionStatus',
        'transitionIdentity',
        'sourceConfigurationIdentity',
        'sourceCustomizationReportIdentity',
        'reviewAcceptanceIdentity',
        'previousPresetRevision',
      ]) || value.reapply.operation !== 'reapply' ||
      (value.reapply.transitionStatus !== 'reapplied' &&
        value.reapply.transitionStatus !==
          'reapplied-aggregate-semantic-no-op' &&
        value.reapply.transitionStatus !== 'reapplied-semantic-no-op') ||
      typeof value.reapply.transitionIdentity !== 'string' ||
      !value.reapply.transitionIdentity.startsWith(
        CASE_INSERT_PRESET_REAPPLY_TRANSITION_IDENTITY_PREFIX,
      ) || typeof value.reapply.sourceConfigurationIdentity !== 'string' ||
      !value.reapply.sourceConfigurationIdentity.startsWith(
        CONFIGURATION_IDENTITY_PREFIX,
      ) || typeof value.reapply.sourceCustomizationReportIdentity !== 'string' ||
      !value.reapply.sourceCustomizationReportIdentity.startsWith(
        CUSTOMIZATION_REPORT_IDENTITY_PREFIX,
      ) || typeof value.reapply.reviewAcceptanceIdentity !== 'string' ||
      !value.reapply.reviewAcceptanceIdentity.startsWith(
        CASE_INSERT_PRESET_REAPPLY_REVIEW_ACCEPTANCE_IDENTITY_PREFIX,
      ) || !isPositiveSafeInteger(value.reapply.previousPresetRevision))) {
    return {
      ok: false,
      status: 'invalid-configuration',
      code: 'reapply-evidence-invalid',
    }
  }
  const scope = parseCaseInsertPresetApplicationScope(value.requestedScope)
  const regions = parseCanonicalRegions(value.resolvedRegions)
  if (!scope.ok || !regions || !scopeMatchesRegions(scope.value, regions) ||
      !isRecord(value.template) ||
      !hasExactKeys(value.template, ['id', 'revision']) ||
      typeof value.template.id !== 'string' || value.template.revision !== null ||
      !caseInsertTemplates[value.template.id as keyof typeof caseInsertTemplates] ||
      typeof value.reviewedPlanIdentity !== 'string' ||
      !value.reviewedPlanIdentity.startsWith(
        isReapplied
          ? CASE_INSERT_PRESET_REAPPLY_REVIEW_IDENTITY_PREFIX
          : REVIEW_IDENTITY_PREFIX,
      ) ||
      !isRecord(value.source) ||
      !hasExactKeys(value.source, ['projectKind', 'snapshotIdentity']) ||
      value.source.projectKind !== 'caseInsert' ||
      !isSnapshotIdentity(value.source.snapshotIdentity) ||
      value.source.snapshotIdentity.template.id !== value.template.id ||
      value.source.snapshotIdentity.template.revision !== value.template.revision) {
    return { ok: false, status: 'invalid-configuration', code: 'context-invalid' }
  }
  const fields = Array.isArray(value.ownedFields)
    ? value.ownedFields.map((field) => {
        if (!isRecord(field) || !hasExactKeys(field, [
          'address',
          'lastAppliedValue',
          'sources',
        ]) || !isRecord(field.address) || !hasExactKeys(field.address, [
          'region',
          'featureOwnerId',
          'bindingKind',
          'bindingId',
          'runtimeObjectId',
          'fieldId',
        ])) return null
        return {
          featureOwnerId: field.address.featureOwnerId,
          object: {
            bindingKind: field.address.bindingKind,
            bindingId: field.address.bindingId,
            runtimeId: field.address.runtimeObjectId,
          },
          fieldId: field.address.fieldId,
          lastAppliedValue: field.lastAppliedValue,
          sources: field.sources,
          expectedRegion: field.address.region,
        }
      })
    : null
  if (!fields || fields.some((field) => field === null)) {
    return { ok: false, status: 'invalid-configuration', code: 'owned-fields-invalid' }
  }
  const parsedFields = parseCandidateOwnedFields(
    fields.map((field) => ({
      featureOwnerId: field!.featureOwnerId,
      object: field!.object,
      fieldId: field!.fieldId,
      lastAppliedValue: field!.lastAppliedValue,
      sources: field!.sources,
    })),
    { preset: value.preset, regions },
  )
  if (!parsedFields.ok || parsedFields.fields.some((field, index) =>
    field.address.region !== fields[index]!.expectedRegion)) {
    return {
      ok: false,
      status: 'invalid-configuration',
      code: parsedFields.ok ? 'owned-field-address-invalid' : parsedFields.code,
    }
  }
  const warningIds = parseUniqueIdentityList(
    value.reviewedWarningIds,
    isReapplied
      ? CASE_INSERT_PRESET_REAPPLY_WARNING_IDENTITY_PREFIX
      : WARNING_IDENTITY_PREFIX,
  )
  const consentIds = parseUniqueIdentityList(
    value.acceptedMaterialConsentRequirementIds,
    isReapplied
      ? CASE_INSERT_PRESET_REAPPLY_CONSENT_IDENTITY_PREFIX
      : CONSENT_IDENTITY_PREFIX,
  )
  if (!warningIds || !consentIds) {
    return { ok: false, status: 'invalid-configuration', code: 'evidence-invalid' }
  }
  const common = {
    kind: CASE_INSERT_APPLIED_PRESET_CONFIGURATION_KIND,
    domainStatus: 'validated-authoritative' as const,
    attachmentStatus: 'detached-uninstalled' as const,
    firstApply: {
      operation: 'apply' as const,
      transitionStatus: value.firstApply.transitionStatus as
        CaseInsertAppliedPresetConfiguration['firstApply']['transitionStatus'],
    },
    preset: { ...value.preset },
    requestedScope: cloneMutable(scope.value),
    resolvedRegions: [...regions],
    template: { id: value.template.id, revision: null },
    reviewedPlanIdentity: value.reviewedPlanIdentity,
    source: {
      projectKind: 'caseInsert' as const,
      snapshotIdentity: cloneMutable(value.source.snapshotIdentity),
    },
    ownedFields: parsedFields.fields.map((field) => cloneMutable(field)),
    reviewedWarningIds: [...warningIds],
    acceptedMaterialConsentRequirementIds:
      [...consentIds],
  }
  const content: ConfigurationIdentityInput = isReapplied
    ? {
        ...common,
        formatVersion: CASE_INSERT_REAPPLIED_PRESET_CONFIGURATION_VERSION,
        reapply: cloneMutable(
          value.reapply as CaseInsertReappliedPresetConfiguration['reapply'],
        ),
      }
    : {
        ...common,
        formatVersion: CASE_INSERT_APPLIED_PRESET_CONFIGURATION_VERSION,
      }
  const identity = createConfigurationIdentity(content)
  if (value.configurationIdentity !== identity) {
    return { ok: false, status: 'invalid-configuration', code: 'identity-invalid' }
  }
  return {
    ok: true,
    configuration: deepFreeze({ ...content, configurationIdentity: identity }),
  }
}

export function validateCaseInsertAppliedPresetConfiguration(
  value: unknown,
): CaseInsertAppliedPresetConfigurationValidationResult {
  if (hasUnsupportedConfigurationField(value)) {
    return validationFailure(
      'invalid-configuration',
      'configuration-owned-field-unsupported',
    )
  }
  const rebuilt = rebuildConfiguration(value)
  return rebuilt.ok
    ? deepFreeze({
        ok: true,
        status: 'validated',
        configuration: rebuilt.configuration,
      })
    : validationFailure(rebuilt.status, rebuilt.code)
}

export function validateCaseInsertAppliedPresetConfigurationCandidate(
  transitionResult: CaseInsertPresetApplyTransitionResult,
): CaseInsertAppliedPresetConfigurationValidationResult {
  if (!isRecord(transitionResult) || !isDeeplyFrozen(transitionResult) ||
      transitionResult.ok !== true ||
      (transitionResult.status !== 'applied' &&
        transitionResult.status !== 'applied-semantic-no-op') ||
      !hasExactKeys(transitionResult, [
        'ok',
        'status',
        'aggregate',
        'configurationCandidate',
      ])) {
    return validationFailure(
      'invalid-configuration',
      'transition-result-not-successful',
    )
  }
  const candidate = transitionResult.configurationCandidate
  if (isRecord(candidate) &&
      candidate.kind === CASE_INSERT_PRESET_APPLIED_CONFIGURATION_CANDIDATE_KIND &&
      candidate.formatVersion !==
        CASE_INSERT_PRESET_APPLIED_CONFIGURATION_CANDIDATE_VERSION) {
    return validationFailure(
      'unsupported-configuration-version',
      'candidate-version-unsupported',
    )
  }
  if (!isRecord(candidate) || !hasExactKeys(candidate, [
    'kind',
    'formatVersion',
    'installationStatus',
    'operation',
    'preset',
    'requestedScope',
    'resolvedRegions',
    'template',
    'reviewedPlanIdentity',
    'sourceSnapshotIdentity',
    'ownedFields',
    'reviewedWarningIds',
    'acceptedMaterialConsentRequirementIds',
  ]) || candidate.kind !== CASE_INSERT_PRESET_APPLIED_CONFIGURATION_CANDIDATE_KIND ||
      candidate.formatVersion !==
        CASE_INSERT_PRESET_APPLIED_CONFIGURATION_CANDIDATE_VERSION ||
      candidate.installationStatus !== 'candidate-uninstalled' ||
      candidate.operation !== 'apply' || !isCanonicalPreset(candidate.preset)) {
    return validationFailure('invalid-configuration', 'candidate-shape-invalid')
  }
  const scope = parseCaseInsertPresetApplicationScope(candidate.requestedScope)
  const regions = parseCanonicalRegions(candidate.resolvedRegions)
  if (!scope.ok || !regions || !scopeMatchesRegions(scope.value, regions) ||
      !isRecord(candidate.template) ||
      !hasExactKeys(candidate.template, ['id', 'revision']) ||
      typeof candidate.template.id !== 'string' ||
      candidate.template.revision !== null ||
      !caseInsertTemplates[
        candidate.template.id as keyof typeof caseInsertTemplates
      ] || typeof candidate.reviewedPlanIdentity !== 'string' ||
      !candidate.reviewedPlanIdentity.startsWith(REVIEW_IDENTITY_PREFIX) ||
      !isSnapshotIdentity(candidate.sourceSnapshotIdentity) ||
      candidate.sourceSnapshotIdentity.template.id !== candidate.template.id ||
      candidate.sourceSnapshotIdentity.template.revision !==
        candidate.template.revision) {
    return validationFailure('invalid-configuration', 'candidate-context-invalid')
  }
  let normalized: ProjectJewelCaseState
  try {
    normalized = normalizeProjectJewelCaseState(transitionResult.aggregate)
  } catch {
    return validationFailure('invalid-configuration', 'aggregate-invalid')
  }
  if (!sameValue(transitionResult.aggregate, normalized) ||
      normalized.templateType !== candidate.template.id) {
    return validationFailure('invalid-configuration', 'aggregate-incompatible')
  }
  const fields = parseCandidateOwnedFields(candidate.ownedFields, {
    preset: candidate.preset,
    regions,
    aggregate: normalized,
  })
  if (!fields.ok) {
    return validationFailure('invalid-configuration', fields.code)
  }
  const warningIds = parseUniqueIdentityList(
    candidate.reviewedWarningIds,
    WARNING_IDENTITY_PREFIX,
  )
  const consentIds = parseUniqueIdentityList(
    candidate.acceptedMaterialConsentRequirementIds,
    CONSENT_IDENTITY_PREFIX,
  )
  if (!warningIds || !consentIds) {
    return validationFailure('invalid-configuration', 'candidate-evidence-invalid')
  }
  const content: ConfigurationIdentityInput = {
    kind: CASE_INSERT_APPLIED_PRESET_CONFIGURATION_KIND,
    formatVersion: CASE_INSERT_APPLIED_PRESET_CONFIGURATION_VERSION,
    domainStatus: 'validated-authoritative',
    attachmentStatus: 'detached-uninstalled',
    firstApply: {
      operation: 'apply',
      transitionStatus: transitionResult.status,
    },
    preset: { ...candidate.preset },
    requestedScope: cloneMutable(scope.value),
    resolvedRegions: [...regions],
    template: { id: candidate.template.id, revision: null },
    reviewedPlanIdentity: candidate.reviewedPlanIdentity,
    source: {
      projectKind: 'caseInsert',
      snapshotIdentity: cloneMutable(candidate.sourceSnapshotIdentity),
    },
    ownedFields: fields.fields.map((field) => cloneMutable(field)),
    reviewedWarningIds: [...warningIds],
    acceptedMaterialConsentRequirementIds:
      [...consentIds] as `case:preset-consent:${string}`[],
  }
  const configurationIdentity = createConfigurationIdentity(content)
  return deepFreeze({
    ok: true,
    status: 'validated',
    configuration: { ...content, configurationIdentity },
  })
}

function hasUnsupportedConfigurationField(value: unknown) {
  if (!isRecord(value) || !Array.isArray(value.ownedFields)) return false
  return value.ownedFields.some((field) => {
    if (!isRecord(field) || !isRecord(field.address)) return false
    const { featureOwnerId, fieldId } = field.address
    if (typeof fieldId !== 'string' || !FIELD_IDS.has(fieldId)) return true
    if (typeof featureOwnerId !== 'string') return false
    return !ownerAllowsField(
      featureOwnerId as CaseInsertPresetOwnerId,
      fieldId as CaseInsertPresetPlanFieldId,
    )
  })
}

function createCustomizationReportIdentity(input: Readonly<{
  status: 'clean' | 'customized'
  configurationIdentity: string
  current: Readonly<{
    projectKind: 'caseInsert'
    sessionId: string
    projectRevision: number
    template: Readonly<{ id: string; revision: null }>
  }>
  fields: readonly CaseInsertPresetCustomizationFieldRecord[]
}>) {
  const fields = input.fields.map((field) => tuple('field', [
    primitiveTuple('address', [
      field.address.region,
      field.address.featureOwnerId,
      field.address.bindingKind,
      field.address.bindingId,
      field.address.runtimeObjectId,
      field.address.fieldId,
    ]),
    primitiveTuple('values', [
      field.lastAppliedValue,
      field.currentValue,
      field.fieldStatus,
    ]),
    tuple('sources', field.sources.map(sourceIdentity)),
  ]))
  const payload = tuple('case-preset-customization-report', [
    primitiveTuple('format', [
      CASE_INSERT_PRESET_CUSTOMIZATION_REPORT_KIND,
      CASE_INSERT_PRESET_CUSTOMIZATION_REPORT_VERSION,
      input.status,
    ]),
    primitiveTuple('configuration', [input.configurationIdentity]),
    primitiveTuple('current', [
      input.current.projectKind,
      input.current.sessionId,
      input.current.projectRevision,
      input.current.template.id,
      input.current.template.revision,
    ]),
    tuple('fields', fields),
  ])
  return `${CUSTOMIZATION_REPORT_IDENTITY_PREFIX}${payload}`
}

function reportValidationFailure(
  status: Extract<
    CaseInsertPresetCustomizationReportValidationResult,
    { ok: false }
  >['status'],
  code: string,
): CaseInsertPresetCustomizationReportValidationResult {
  return Object.freeze({ ok: false, status, code })
}

export function validateCaseInsertPresetCustomizationReport(
  value: unknown,
  authoritativeConfiguration: unknown,
): CaseInsertPresetCustomizationReportValidationResult {
  const validatedConfiguration = validateCaseInsertAppliedPresetConfiguration(
    authoritativeConfiguration,
  )
  if (!validatedConfiguration.ok) {
    return reportValidationFailure(
      'report-mismatch',
      'authoritative-configuration-invalid',
    )
  }
  const configuration = validatedConfiguration.configuration
  if (isRecord(value) &&
      value.kind === CASE_INSERT_PRESET_CUSTOMIZATION_REPORT_KIND &&
      value.formatVersion !== CASE_INSERT_PRESET_CUSTOMIZATION_REPORT_VERSION) {
    return reportValidationFailure(
      'unsupported-report-version',
      'report-version-unsupported',
    )
  }
  if (!isRecord(value) || !isDeeplyFrozen(value) || !hasExactKeys(value, [
    'ok',
    'status',
    'kind',
    'formatVersion',
    'reportIdentity',
    'configurationIdentity',
    'current',
    'fields',
    'summary',
  ]) || value.ok !== true ||
      (value.status !== 'clean' && value.status !== 'customized') ||
      value.kind !== CASE_INSERT_PRESET_CUSTOMIZATION_REPORT_KIND ||
      value.formatVersion !== CASE_INSERT_PRESET_CUSTOMIZATION_REPORT_VERSION ||
      typeof value.reportIdentity !== 'string' ||
      typeof value.configurationIdentity !== 'string' ||
      !isRecord(value.current) || !hasExactKeys(value.current, [
        'projectKind',
        'sessionId',
        'projectRevision',
        'template',
      ]) || value.current.projectKind !== 'caseInsert' ||
      typeof value.current.sessionId !== 'string' ||
      value.current.sessionId.trim().length === 0 ||
      !isNonNegativeSafeInteger(value.current.projectRevision) ||
      !isRecord(value.current.template) ||
      !hasExactKeys(value.current.template, ['id', 'revision']) ||
      typeof value.current.template.id !== 'string' ||
      value.current.template.revision !== null ||
      !Array.isArray(value.fields) || !isRecord(value.summary) ||
      !hasExactKeys(value.summary, [
        'fieldCount',
        'unchangedFieldCount',
        'customizedFieldCount',
      ])) {
    return reportValidationFailure(
      'invalid-customization-report',
      'report-shape-invalid',
    )
  }
  if (value.configurationIdentity !== configuration.configurationIdentity) {
    return reportValidationFailure(
      'report-mismatch',
      'configuration-identity-mismatch',
    )
  }

  const fieldsByAddress = new Map<string, Record<string, unknown>>()
  for (const rawField of value.fields) {
    if (!isRecord(rawField) || !hasExactKeys(rawField, [
      'address',
      'lastAppliedValue',
      'currentValue',
      'fieldStatus',
      'sources',
    ]) || !isRecord(rawField.address) || !hasExactKeys(rawField.address, [
      'region',
      'featureOwnerId',
      'bindingKind',
      'bindingId',
      'runtimeObjectId',
      'fieldId',
    ])) {
      return reportValidationFailure(
        'invalid-customization-report',
        'report-field-shape-invalid',
      )
    }
    const key = ownedFieldAddressKey(
      rawField.address as CaseInsertAppliedPresetOwnedFieldAddress,
    )
    if (fieldsByAddress.has(key)) {
      return reportValidationFailure(
        'invalid-customization-report',
        'report-field-duplicate',
      )
    }
    fieldsByAddress.set(key, rawField)
  }
  if (fieldsByAddress.size !== configuration.ownedFields.length) {
    return reportValidationFailure(
      'report-mismatch',
      'report-footprint-mismatch',
    )
  }

  const fields: CaseInsertPresetCustomizationFieldRecord[] = []
  for (const ownedField of configuration.ownedFields) {
    const rawField = fieldsByAddress.get(
      ownedFieldAddressKey(ownedField.address),
    )
    if (!rawField || !sameValue(rawField.address, ownedField.address) ||
        rawField.lastAppliedValue !== ownedField.lastAppliedValue ||
        !sameValue(rawField.sources, ownedField.sources) ||
        !isCaseInsertPresetOwnedFieldSemanticValue(
          ownedField.address.fieldId,
          rawField.currentValue,
        )) {
      return reportValidationFailure(
        'report-mismatch',
        'report-field-mismatch',
      )
    }
    const expectedStatus = rawField.currentValue === ownedField.lastAppliedValue
      ? 'unchanged'
      : 'value-diverged'
    if (rawField.fieldStatus !== expectedStatus) {
      return reportValidationFailure(
        'invalid-customization-report',
        'report-field-classification-invalid',
      )
    }
    fields.push({
      address: cloneMutable(ownedField.address),
      lastAppliedValue: ownedField.lastAppliedValue,
      currentValue: rawField.currentValue as number,
      fieldStatus: expectedStatus,
      sources: ownedField.sources.map((source) => cloneMutable(source)),
    })
  }

  const customizedFieldCount = fields.filter(
    ({ fieldStatus }) => fieldStatus === 'value-diverged',
  ).length
  const expectedStatus = customizedFieldCount === 0 ? 'clean' : 'customized'
  if (value.status !== expectedStatus ||
      value.summary.fieldCount !== fields.length ||
      value.summary.unchangedFieldCount !== fields.length - customizedFieldCount ||
      value.summary.customizedFieldCount !== customizedFieldCount) {
    return reportValidationFailure(
      'invalid-customization-report',
      'report-summary-invalid',
    )
  }
  const current = {
    projectKind: 'caseInsert' as const,
    sessionId: value.current.sessionId,
    projectRevision: value.current.projectRevision as number,
    template: {
      id: value.current.template.id as string,
      revision: null,
    },
  }
  const reportIdentity = createCustomizationReportIdentity({
    status: expectedStatus,
    configurationIdentity: configuration.configurationIdentity,
    current,
    fields,
  })
  if (value.reportIdentity !== reportIdentity) {
    return reportValidationFailure(
      'invalid-customization-report',
      'report-identity-invalid',
    )
  }
  return deepFreeze({
    ok: true,
    status: 'validated',
    report: {
      ok: true,
      status: expectedStatus,
      kind: CASE_INSERT_PRESET_CUSTOMIZATION_REPORT_KIND,
      formatVersion: CASE_INSERT_PRESET_CUSTOMIZATION_REPORT_VERSION,
      reportIdentity,
      configurationIdentity: configuration.configurationIdentity,
      current,
      fields,
      summary: {
        fieldCount: fields.length,
        unchangedFieldCount: fields.length - customizedFieldCount,
        customizedFieldCount,
      },
    },
  })
}

export function detectCaseInsertPresetCustomization(
  input: DetectCaseInsertPresetCustomizationInput,
): CaseInsertPresetCustomizationDetectionResult {
  if (hasUnsupportedConfigurationField(input.configuration)) {
    return detectionFailure(
      'unsupported-owned-field',
      'configuration-owned-field-unsupported',
    )
  }
  const validated = rebuildConfiguration(input.configuration)
  if (!validated.ok) {
    return detectionFailure(validated.status, validated.code)
  }
  const configuration = validated.configuration
  const current = input.current
  if (!isRecord(current) || current.projectKind !== 'caseInsert' ||
      typeof current.sessionId !== 'string' ||
      current.sessionId.trim().length === 0 ||
      !isNonNegativeSafeInteger(current.projectRevision) ||
      !isRecord(current.template) ||
      typeof current.template.id !== 'string' ||
      (current.template.revision !== null &&
        !isNonNegativeSafeInteger(current.template.revision)) ||
      !isRecord(current.aggregate)) {
    return detectionFailure(
      'incompatible-current-aggregate',
      'current-context-invalid',
    )
  }
  const contextMismatches: string[] = []
  if (current.sessionId !==
      configuration.source.snapshotIdentity.sessionId) {
    contextMismatches.push('session-id')
  }
  if (current.projectRevision <
      configuration.source.snapshotIdentity.projectRevision) {
    contextMismatches.push('project-revision-regressed')
  }
  if (current.template.id !== configuration.template.id) {
    contextMismatches.push('template-id')
  }
  if (current.template.revision !== configuration.template.revision) {
    contextMismatches.push('template-revision')
  }
  if (current.aggregate.templateType !== current.template.id) {
    contextMismatches.push('aggregate-template-id')
  }
  if (contextMismatches.length > 0) {
    return detectionFailure(
      'attachment-context-mismatch',
      'configuration-current-context-mismatch',
      { dimensions: contextMismatches },
    )
  }

  const fields: CaseInsertPresetCustomizationFieldRecord[] = []
  for (const ownedField of configuration.ownedFields) {
    let binding: ReturnType<typeof resolveCaseInsertPresetAggregateBinding>
    try {
      binding = resolveCaseInsertPresetAggregateBinding(
        current.aggregate,
        ownedField.address.featureOwnerId,
        {
          kind: ownedField.address.bindingKind,
          id: ownedField.address.bindingId,
        },
      )
    } catch {
      return detectionFailure(
        'incompatible-current-aggregate',
        'current-target-lookup-failed',
      )
    }
    if (binding.status === 'missing') {
      return detectionFailure(
        'target-missing',
        'owned-target-missing',
        { address: ownedField.address },
      )
    }
    if (binding.status === 'ambiguous') {
      return detectionFailure(
        'target-ambiguous',
        'owned-target-ambiguous',
        { address: ownedField.address },
      )
    }
    if (binding.status !== 'found' ||
        binding.currentState.id !== ownedField.address.runtimeObjectId) {
      return detectionFailure(
        'target-missing',
        'owned-target-address-mismatch',
        { address: ownedField.address },
      )
    }
    const value = getCaseInsertPresetOwnedFieldCurrentValue(
      binding.currentState,
      ownedField.address.fieldId,
    )
    if (!isCaseInsertPresetOwnedFieldSemanticValue(
      ownedField.address.fieldId,
      value,
    )) {
      return detectionFailure(
        'invalid-current-value',
        'owned-target-current-value-invalid',
        { address: ownedField.address },
      )
    }
    fields.push({
      address: cloneMutable(ownedField.address),
      lastAppliedValue: ownedField.lastAppliedValue,
      currentValue: value,
      fieldStatus: value === ownedField.lastAppliedValue
        ? 'unchanged'
        : 'value-diverged',
      sources: ownedField.sources.map((source) => cloneMutable(source)),
    })
  }

  let normalized: ProjectJewelCaseState
  try {
    normalized = normalizeProjectJewelCaseState(current.aggregate)
  } catch {
    return detectionFailure(
      'incompatible-current-aggregate',
      'current-aggregate-normalization-failed',
    )
  }
  if (!sameValue(current.aggregate, normalized)) {
    return detectionFailure(
      'incompatible-current-aggregate',
      'current-aggregate-not-normalized',
    )
  }

  const customizedFieldCount = fields.filter(
    ({ fieldStatus }) => fieldStatus === 'value-diverged',
  ).length
  const status = customizedFieldCount === 0 ? 'clean' : 'customized'
  const currentIdentity = {
    projectKind: 'caseInsert' as const,
    sessionId: current.sessionId,
    projectRevision: current.projectRevision,
    template: { id: current.template.id, revision: null },
  }
  const reportIdentity = createCustomizationReportIdentity({
    status,
    configurationIdentity: configuration.configurationIdentity,
    current: currentIdentity,
    fields,
  })
  return deepFreeze({
    ok: true,
    status,
    kind: CASE_INSERT_PRESET_CUSTOMIZATION_REPORT_KIND,
    formatVersion: CASE_INSERT_PRESET_CUSTOMIZATION_REPORT_VERSION,
    reportIdentity,
    configurationIdentity: configuration.configurationIdentity,
    current: currentIdentity,
    fields,
    summary: {
      fieldCount: fields.length,
      unchangedFieldCount: fields.length - customizedFieldCount,
      customizedFieldCount,
    },
  })
}
