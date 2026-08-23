import {
  isCaseInsertPresetAssignmentSnapshot,
  resolveCaseInsertPresetAggregateBinding,
  type CaseInsertPresetAssignmentSnapshot,
  type CaseInsertPresetAssignmentSnapshotIdentity,
  type CaseInsertPresetSnapshotEnablement,
} from '../caseInsert/presetAssignmentSnapshot.ts'
import { normalizeProjectJewelCaseState } from '../caseInsert/normalization.ts'
import type { ProjectJewelCaseState } from '../project/projectTypes.ts'
import type {
  CaseInsertPresetApplicationScope,
  CaseInsertPresetConcreteRegionId,
} from './caseInsertPresetDefinition.ts'
import {
  getCaseInsertPresetOwnedFieldCurrentValue,
  getCaseInsertPresetTypedOwnedFieldCurrentValue,
  isCaseInsertPresetOwnedFieldSemanticValue,
  canonicalizeCaseInsertAppliedPresetConfigurationOrdering,
  validateCaseInsertAppliedPresetConfiguration,
  type CaseInsertAppliedPresetConfiguration,
  type CaseInsertAppliedPresetOwnedValue,
  type CaseInsertAppliedPresetOwnedFieldAddress,
  type CaseInsertAppliedPresetOwnedFieldAddressV3,
  type CaseInsertPresetOwnedFieldObservation,
} from './caseInsertPresetAppliedConfiguration.ts'
import {
  CASE_INSERT_PRESET_DETACH_OWNERSHIP_PROJECTION_KIND,
  CASE_INSERT_PRESET_DETACH_PLAN_FORMAT_VERSION,
  CASE_INSERT_PRESET_DETACH_PLAN_KIND,
  CASE_INSERT_PRESET_TYPED_DETACH_PLAN_FORMAT_VERSION,
  canonicalizeCaseInsertPresetDetachPlanContent,
  createCaseInsertPresetDetachPlanIdentity,
  createCaseInsertPresetDetachPreservationIdentity,
  createCaseInsertPresetDetachReleaseIdentity,
  createCaseInsertPresetDetachReviewIdentity,
  createCaseInsertPresetDetachWarningIdentity,
} from './caseInsertPresetDetachIdentity.ts'

export {
  CASE_INSERT_PRESET_DETACH_OWNERSHIP_PROJECTION_KIND,
  CASE_INSERT_PRESET_DETACH_PLAN_FORMAT_VERSION,
  CASE_INSERT_PRESET_DETACH_PLAN_KIND,
  CASE_INSERT_PRESET_TYPED_DETACH_PLAN_FORMAT_VERSION,
} from './caseInsertPresetDetachIdentity.ts'

export type PlanCaseInsertPresetDetachInput = Readonly<{
  operation: unknown
  configuration: unknown
  current: Readonly<{
    projectKind: unknown
    aggregate: ProjectJewelCaseState
    sessionId: unknown
    projectRevision: unknown
    template: Readonly<{ id: unknown; revision: unknown }>
    snapshot: CaseInsertPresetAssignmentSnapshot
  }>
}>

type CaseInsertPresetDetachOwnedFieldAddress =
  | CaseInsertAppliedPresetOwnedFieldAddress
  | CaseInsertAppliedPresetOwnedFieldAddressV3

export type CaseInsertPresetDetachReleaseRecord = Readonly<{
  id: string
  address: CaseInsertPresetDetachOwnedFieldAddress
  currentValue: number | CaseInsertPresetOwnedFieldObservation
  previousLastAppliedValue: number | CaseInsertAppliedPresetOwnedValue
  sources: CaseInsertAppliedPresetConfiguration['ownedFields'][number]['sources']
  enablement: CaseInsertPresetSnapshotEnablement | null
  ownershipDisposition: 'release-complete-configuration-ownership'
  aggregateDisposition: 'preserve-exact-current-value'
}>

export type CaseInsertPresetDetachAggregatePreservation = Readonly<{
  id: string
  address: CaseInsertPresetDetachOwnedFieldAddress
  currentValue: number | CaseInsertPresetOwnedFieldObservation
  previousLastAppliedValue: number | CaseInsertAppliedPresetOwnedValue
  enablement: CaseInsertPresetSnapshotEnablement | null
  preservation: 'exact-current-value-no-write'
}>

export type CaseInsertPresetDetachWarning = Readonly<{
  id: string
  kind: 'complete-applied-preset-ownership-release'
  sourceConfigurationIdentity: string
  preset: Readonly<{ id: string; revision: number }>
  releaseCount: number
  resolvedRegions: readonly CaseInsertPresetConcreteRegionId[]
  aggregateEffect: 'preserve-every-current-value'
}>

export type CaseInsertPresetDetachFieldPrecondition = Readonly<{
  address: CaseInsertPresetDetachOwnedFieldAddress
  bindingMatch: 'exactly-one' | 'absent-owned-object'
  currentValue: number | CaseInsertPresetOwnedFieldObservation
  enablement: CaseInsertPresetSnapshotEnablement | null
}>

export type CaseInsertPresetDetachPlan = Readonly<{
  kind: typeof CASE_INSERT_PRESET_DETACH_PLAN_KIND
  formatVersion:
    | typeof CASE_INSERT_PRESET_DETACH_PLAN_FORMAT_VERSION
    | typeof CASE_INSERT_PRESET_TYPED_DETACH_PLAN_FORMAT_VERSION
  operation: 'detach'
  source: Readonly<{
    configurationIdentity: string
    configurationFormatVersion:
      CaseInsertAppliedPresetConfiguration['formatVersion']
    projectKind: 'caseInsert'
    sessionId: string
    projectRevision: number
    template: Readonly<{ id: string; revision: null }>
    configurationSnapshotIdentity:
      CaseInsertPresetAssignmentSnapshotIdentity
  }>
  preset: CaseInsertAppliedPresetConfiguration['preset']
  requestedScope: CaseInsertPresetApplicationScope
  resolvedRegions: CaseInsertAppliedPresetConfiguration['resolvedRegions']
  releaseFootprint: readonly CaseInsertPresetDetachReleaseRecord[]
  aggregatePreservations:
    readonly CaseInsertPresetDetachAggregatePreservation[]
  warnings: readonly CaseInsertPresetDetachWarning[]
  materialConsentRequirements: readonly []
  preconditions: Readonly<{
    configurationIdentity: string
    aggregateContentIdentity:
      CaseInsertPresetAssignmentSnapshotIdentity['aggregateContentIdentity']
    projectKind: 'caseInsert'
    sessionId: string
    projectRevision: number
    template: Readonly<{ id: string; revision: null }>
    resolvedRegions: CaseInsertAppliedPresetConfiguration['resolvedRegions']
    fields: readonly CaseInsertPresetDetachFieldPrecondition[]
  }>
  projectedOwnership: Readonly<{
    kind: typeof CASE_INSERT_PRESET_DETACH_OWNERSHIP_PROJECTION_KIND
    authority: 'non-authoritative-detach-projection'
    sourceConfigurationIdentity: string
    state: 'no-applied-preset-ownership'
    ownedFieldCount: 0
  }>
  semanticEffects: Readonly<{
    aggregateWriteCount: 0
    releasedOwnedFieldCount: number
    releasesCompleteConfiguration: true
    preservesEveryAggregateValue: true
    configurationDisposition:
      'remove-authoritative-applied-preset-configuration'
  }>
  reviewIdentity: string
  planIdentity: string
}>

export type CaseInsertPresetDetachPlanningFailureStatus =
  | 'invalid-request'
  | 'unsupported-operation'
  | 'invalid-source-configuration'
  | 'unsupported-configuration-version'
  | 'configuration-identity-mismatch'
  | 'attachment-context-mismatch'
  | 'stale-detach-context'
  | 'unsupported-owned-field'
  | 'invalid-current-value'
  | 'target-missing'
  | 'target-ambiguous'
  | 'footprint-mismatch'
  | 'duplicate-owned-address'
  | 'invalid-region'
  | 'transition-conflict'
  | 'plan-validation-failed'

export type CaseInsertPresetDetachPlanningResult =
  | Readonly<{
      ok: true
      status: 'planned'
      plan: CaseInsertPresetDetachPlan
    }>
  | Readonly<{
      ok: false
      status: CaseInsertPresetDetachPlanningFailureStatus
      code: string
      address?: CaseInsertPresetDetachOwnedFieldAddress
      dimensions?: readonly string[]
    }>

type Failure = Extract<CaseInsertPresetDetachPlanningResult, { ok: false }>

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

function deepFreeze<T>(value: T, seen = new WeakSet<object>()): T {
  if (value === null || typeof value !== 'object') return value
  if (seen.has(value)) return value
  seen.add(value)
  for (const child of Object.values(value as Record<string, unknown>)) {
    deepFreeze(child, seen)
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
  status: CaseInsertPresetDetachPlanningFailureStatus,
  code: string,
  options: Readonly<{
    address?: CaseInsertPresetDetachOwnedFieldAddress
    dimensions?: readonly string[]
  }> = {},
): Failure {
  return deepFreeze({
    ok: false,
    status,
    code,
    ...(options.address ? { address: cloneMutable(options.address) } : {}),
    ...(options.dimensions ? { dimensions: [...options.dimensions] } : {}),
  })
}

function addressKey(address: CaseInsertPresetDetachOwnedFieldAddress) {
  return [
    address.region,
    address.featureOwnerId,
    address.bindingKind,
    address.bindingId,
    address.runtimeObjectId,
    address.fieldId,
  ].join('\u0000')
}

function mapConfigurationFailure(
  status: 'invalid-configuration' | 'unsupported-configuration-version',
  code: string,
) {
  if (status === 'unsupported-configuration-version') {
    return failure('unsupported-configuration-version', code)
  }
  if (code === 'identity-invalid') {
    return failure('configuration-identity-mismatch', code)
  }
  if (code === 'owned-field-address-duplicate') {
    return failure('duplicate-owned-address', code)
  }
  if (code === 'owned-field-region-invalid') {
    return failure('invalid-region', code)
  }
  if (code === 'configuration-owned-field-unsupported' ||
      code === 'owned-field-unsupported') {
    return failure('unsupported-owned-field', code)
  }
  return failure('invalid-source-configuration', code)
}

function validateCurrentContext(
  input: PlanCaseInsertPresetDetachInput,
  configuration: CaseInsertAppliedPresetConfiguration,
): Readonly<{ aggregate: ProjectJewelCaseState }> | Failure {
  if (!isRecord(input.current) || input.current.projectKind !== 'caseInsert' ||
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
  if (configuration.template.id !== input.current.template.id) {
    contextDimensions.push('configuration-template-id')
  }
  if (configuration.template.revision !== input.current.template.revision) {
    contextDimensions.push('configuration-template-revision')
  }
  if (normalized.templateType !== input.current.template.id) {
    contextDimensions.push('aggregate-template-id')
  }
  if (contextDimensions.length > 0) {
    return failure(
      'attachment-context-mismatch',
      'configuration-current-context-mismatch',
      { dimensions: contextDimensions },
    )
  }
  if (input.current.projectRevision <
      configuration.source.snapshotIdentity.projectRevision) {
    return failure(
      'stale-detach-context',
      'configuration-project-revision-regressed',
      { dimensions: ['project-revision'] },
    )
  }

  if (!isCaseInsertPresetAssignmentSnapshot(input.current.snapshot)) {
    return failure('attachment-context-mismatch', 'snapshot-invalid')
  }
  const snapshotContextDimensions: string[] = []
  if (input.current.snapshot.identity.sessionId !== input.current.sessionId) {
    snapshotContextDimensions.push('session-id')
  }
  if (input.current.snapshot.identity.template.id !== input.current.template.id) {
    snapshotContextDimensions.push('template-id')
  }
  if (input.current.snapshot.identity.template.revision !==
      input.current.template.revision) {
    snapshotContextDimensions.push('template-revision')
  }
  if (snapshotContextDimensions.length > 0) {
    return failure(
      'attachment-context-mismatch',
      'snapshot-current-context-mismatch',
      { dimensions: snapshotContextDimensions },
    )
  }
  if (input.current.snapshot.identity.projectRevision !==
      input.current.projectRevision ||
      !sameValue(input.current.snapshot.caseInsert, normalized)) {
    return failure(
      'stale-detach-context',
      'snapshot-current-state-stale',
      { dimensions: ['project-revision-or-aggregate'] },
    )
  }
  return { aggregate: normalized }
}

function buildReleaseRecord(
  field: CaseInsertAppliedPresetConfiguration['ownedFields'][number],
  currentValue: number | CaseInsertPresetOwnedFieldObservation,
  enablement: CaseInsertPresetSnapshotEnablement | null,
): CaseInsertPresetDetachReleaseRecord {
  const content = {
    address: cloneMutable(field.address),
    currentValue,
    previousLastAppliedValue: field.lastAppliedValue,
    sources: cloneMutable(field.sources),
    enablement: cloneMutable(enablement),
    ownershipDisposition:
      'release-complete-configuration-ownership' as const,
    aggregateDisposition: 'preserve-exact-current-value' as const,
  }
  return deepFreeze({
    id: createCaseInsertPresetDetachReleaseIdentity(content),
    ...content,
  })
}

function buildPreservationRecord(
  field: CaseInsertAppliedPresetConfiguration['ownedFields'][number],
  currentValue: number | CaseInsertPresetOwnedFieldObservation,
  enablement: CaseInsertPresetSnapshotEnablement | null,
): CaseInsertPresetDetachAggregatePreservation {
  const content = {
    address: cloneMutable(field.address),
    currentValue,
    previousLastAppliedValue: field.lastAppliedValue,
    enablement: cloneMutable(enablement),
    preservation: 'exact-current-value-no-write' as const,
  }
  return deepFreeze({
    id: createCaseInsertPresetDetachPreservationIdentity(content),
    ...content,
  })
}

export function planCaseInsertPresetDetach(
  input: PlanCaseInsertPresetDetachInput,
): CaseInsertPresetDetachPlanningResult {
  if (!isRecord(input)) return failure('invalid-request', 'request-invalid')
  if (input.operation !== 'detach') {
    return failure('unsupported-operation', 'operation-must-be-detach')
  }

  const validatedConfiguration = validateCaseInsertAppliedPresetConfiguration(
    canonicalizeCaseInsertAppliedPresetConfigurationOrdering(
      input.configuration,
    ),
  )
  if (!validatedConfiguration.ok) {
    return mapConfigurationFailure(
      validatedConfiguration.status,
      validatedConfiguration.code,
    )
  }
  const configuration = validatedConfiguration.configuration
  const currentResult = validateCurrentContext(input, configuration)
  if ('ok' in currentResult && currentResult.ok === false) return currentResult
  const current = currentResult as Readonly<{ aggregate: ProjectJewelCaseState }>

  const releaseFootprint: CaseInsertPresetDetachReleaseRecord[] = []
  const aggregatePreservations:
    CaseInsertPresetDetachAggregatePreservation[] = []
  const fieldPreconditions: CaseInsertPresetDetachFieldPrecondition[] = []
  const addresses = new Set<string>()

  const recordField = (
    field: CaseInsertAppliedPresetConfiguration['ownedFields'][number],
    currentValue: number | CaseInsertPresetOwnedFieldObservation,
    enablement: CaseInsertPresetSnapshotEnablement | null,
    bindingMatch: CaseInsertPresetDetachFieldPrecondition['bindingMatch'],
  ) => {
    releaseFootprint.push(buildReleaseRecord(field, currentValue, enablement))
    aggregatePreservations.push(buildPreservationRecord(
      field,
      currentValue,
      enablement,
    ))
    fieldPreconditions.push(deepFreeze({
      address: cloneMutable(field.address),
      bindingMatch,
      currentValue: cloneMutable(currentValue),
      enablement: cloneMutable(enablement),
    }))
  }
  const presenceOwnedObjectKeys = configuration.formatVersion === 3
    ? new Set(configuration.ownedFields
        .filter(({ address }) => address.fieldId === 'object-presence')
        .map(({ address }) => [
          address.featureOwnerId,
          address.bindingKind,
          address.bindingId,
          address.runtimeObjectId,
        ].join('\u0000')))
    : new Set<string>()

  for (const field of configuration.ownedFields) {
    const key = addressKey(field.address)
    if (addresses.has(key)) {
      return failure(
        'duplicate-owned-address',
        'detach-owned-address-duplicate',
        { address: field.address },
      )
    }
    addresses.add(key)

    let binding: ReturnType<typeof resolveCaseInsertPresetAggregateBinding>
    try {
      binding = resolveCaseInsertPresetAggregateBinding(
        current.aggregate,
        field.address.featureOwnerId,
        { kind: field.address.bindingKind, id: field.address.bindingId },
      )
    } catch {
      return failure('transition-conflict', 'detach-target-lookup-failed', {
        address: field.address,
      })
    }
    if (binding.status === 'missing' && configuration.formatVersion === 3) {
      const objectKey = [
        field.address.featureOwnerId,
        field.address.bindingKind,
        field.address.bindingId,
        field.address.runtimeObjectId,
      ].join('\u0000')
      if (!presenceOwnedObjectKeys.has(objectKey)) {
        return failure('target-missing', 'detach-target-missing', {
          address: field.address,
        })
      }
      const observation: CaseInsertPresetOwnedFieldObservation =
        field.address.fieldId === 'object-presence'
          ? { status: 'absent-owned-object' }
          : { status: 'unavailable-object-absent' }
      recordField(field, observation, null, 'absent-owned-object')
      continue
    }
    if (binding.status === 'missing' || binding.status === 'unsupported') {
      return failure('target-missing', 'detach-target-missing', {
        address: field.address,
      })
    }
    if (binding.status === 'ambiguous') {
      return failure('target-ambiguous', 'detach-target-ambiguous', {
        address: field.address,
      })
    }
    if (binding.status !== 'found' ||
        binding.currentState.id !== field.address.runtimeObjectId) {
      return failure('target-missing', 'detach-target-address-mismatch', {
        address: field.address,
      })
    }
    if (configuration.formatVersion === 3) {
      const currentValue = getCaseInsertPresetTypedOwnedFieldCurrentValue(
        binding.currentState,
        field.address,
      )
      if (!currentValue && field.address.fieldId !==
          'reserved-artwork-viewport') {
        return failure(
          'invalid-current-value',
          'detach-current-value-invalid',
          { address: field.address },
        )
      }
      const observation: CaseInsertPresetOwnedFieldObservation = currentValue
        ? { status: 'present', value: currentValue }
        : { status: 'value-absent' }
      recordField(field, observation, binding.enablement, 'exactly-one')
    } else {
      const legacyAddress = field.address as
        CaseInsertAppliedPresetOwnedFieldAddress
      const currentValue = getCaseInsertPresetOwnedFieldCurrentValue(
        binding.currentState,
        legacyAddress.fieldId,
      )
      if (!isCaseInsertPresetOwnedFieldSemanticValue(
        legacyAddress.fieldId,
        currentValue,
      )) return failure(
        'invalid-current-value',
        'detach-current-value-invalid',
        { address: field.address },
      )
      recordField(field, currentValue, binding.enablement, 'exactly-one')
    }
  }

  if (releaseFootprint.length !== configuration.ownedFields.length ||
      aggregatePreservations.length !== configuration.ownedFields.length ||
      fieldPreconditions.length !== configuration.ownedFields.length) {
    return failure('footprint-mismatch', 'detach-footprint-incomplete')
  }

  const warningContent = {
    kind: 'complete-applied-preset-ownership-release' as const,
    sourceConfigurationIdentity: configuration.configurationIdentity,
    preset: {
      id: configuration.preset.id,
      revision: configuration.preset.revision,
    },
    releaseCount: releaseFootprint.length,
    resolvedRegions: [...configuration.resolvedRegions],
    aggregateEffect: 'preserve-every-current-value' as const,
  }
  const warnings: readonly CaseInsertPresetDetachWarning[] = [deepFreeze({
    id: createCaseInsertPresetDetachWarningIdentity(warningContent),
    ...warningContent,
  })]

  const planContent = canonicalizeCaseInsertPresetDetachPlanContent({
    kind: CASE_INSERT_PRESET_DETACH_PLAN_KIND,
    formatVersion: configuration.formatVersion === 3
      ? CASE_INSERT_PRESET_TYPED_DETACH_PLAN_FORMAT_VERSION
      : CASE_INSERT_PRESET_DETACH_PLAN_FORMAT_VERSION,
    operation: 'detach' as const,
    source: {
      configurationIdentity: configuration.configurationIdentity,
      configurationFormatVersion: configuration.formatVersion,
      projectKind: 'caseInsert' as const,
      sessionId: input.current.sessionId as string,
      projectRevision: input.current.projectRevision as number,
      template: {
        id: input.current.template.id as string,
        revision: null,
      },
      configurationSnapshotIdentity:
        cloneMutable(configuration.source.snapshotIdentity),
    },
    preset: cloneMutable(configuration.preset),
    requestedScope: cloneMutable(configuration.requestedScope),
    resolvedRegions: [...configuration.resolvedRegions],
    releaseFootprint,
    aggregatePreservations,
    warnings,
    materialConsentRequirements: [] as const,
    preconditions: {
      configurationIdentity: configuration.configurationIdentity,
      aggregateContentIdentity:
        input.current.snapshot.identity.aggregateContentIdentity,
      projectKind: 'caseInsert' as const,
      sessionId: input.current.sessionId as string,
      projectRevision: input.current.projectRevision as number,
      template: {
        id: input.current.template.id as string,
        revision: null,
      },
      resolvedRegions: [...configuration.resolvedRegions],
      fields: fieldPreconditions,
    },
    projectedOwnership: {
      kind: CASE_INSERT_PRESET_DETACH_OWNERSHIP_PROJECTION_KIND,
      authority: 'non-authoritative-detach-projection' as const,
      sourceConfigurationIdentity: configuration.configurationIdentity,
      state: 'no-applied-preset-ownership' as const,
      ownedFieldCount: 0 as const,
    },
    semanticEffects: {
      aggregateWriteCount: 0 as const,
      releasedOwnedFieldCount: releaseFootprint.length,
      releasesCompleteConfiguration: true as const,
      preservesEveryAggregateValue: true as const,
      configurationDisposition:
        'remove-authoritative-applied-preset-configuration' as const,
    },
  })
  const reviewIdentity = createCaseInsertPresetDetachReviewIdentity(planContent)
  const planIdentity = createCaseInsertPresetDetachPlanIdentity({
    ...planContent,
    reviewIdentity,
  })
  const plan = deepFreeze({
    ...planContent,
    reviewIdentity,
    planIdentity,
  }) as CaseInsertPresetDetachPlan

  const planAddresses = new Set(plan.releaseFootprint.map(({ address }) =>
    addressKey(address)))
  const preservationAddresses = new Set(
    plan.aggregatePreservations.map(({ address }) => addressKey(address)),
  )
  if (planAddresses.size !== configuration.ownedFields.length ||
      preservationAddresses.size !== configuration.ownedFields.length ||
      configuration.ownedFields.some(({ address }) =>
        !planAddresses.has(addressKey(address)) ||
        !preservationAddresses.has(addressKey(address))) ||
      plan.reviewIdentity !==
        createCaseInsertPresetDetachReviewIdentity(planContent) ||
      plan.planIdentity !== createCaseInsertPresetDetachPlanIdentity({
        ...planContent,
        reviewIdentity,
      })) {
    return failure('plan-validation-failed', 'detach-plan-self-validation-failed')
  }

  return deepFreeze({ ok: true, status: 'planned', plan })
}
