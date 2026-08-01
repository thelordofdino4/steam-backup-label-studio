import {
  getCaseInsertPresetSnapshotOwnerCapabilities,
  getCaseInsertPresetSnapshotTemplateCapabilities,
  isCaseInsertPresetAssignmentSnapshot,
  resolveCaseInsertPresetSnapshotBinding,
  type CaseInsertPresetAssignmentSnapshot,
  type CaseInsertPresetAssignmentSnapshotIdentity,
  type CaseInsertPresetSnapshotEnablement,
  type CaseInsertPresetSnapshotObjectState,
} from '../caseInsert/presetAssignmentSnapshot.ts'
import type {
  CaseInsertPresetCatalog,
  CaseInsertPresetCatalogSource,
  CaseInsertPresetReference,
} from './caseInsertPresetCatalog.ts'
import {
  evaluateCaseInsertPresetCompatibility,
  type CaseInsertPresetCompatibilityReason,
  type CaseInsertPresetCompatibilityStatus,
} from './caseInsertPresetCompatibility.ts'
import {
  CASE_INSERT_PRESET_CONCRETE_REGION_IDS,
  type CaseInsertPresetApplicationScope,
  type CaseInsertPresetAssignmentDefinitionV1,
  type CaseInsertPresetConcreteRegionId,
  type CaseInsertPresetCoordinateBasis,
  type CaseInsertPresetId,
  type CaseInsertPresetNormalizedRegion,
  type CaseInsertPresetObjectBinding,
  type CaseInsertPresetOwnerId,
  type CaseInsertPresetRoleId,
  type CaseInsertPresetSlotDefinitionV1,
  type CaseInsertPresetTargetPresence,
} from './caseInsertPresetDefinition.ts'

export type CaseInsertPresetAssignmentBindingStatus =
  | 'resolved'
  | 'resolved-disabled'
  | 'missing-optional'
  | 'missing-required'

export type ResolvedCaseInsertPresetAssignment = Readonly<{
  presetId: CaseInsertPresetId
  presetRevision: number
  slotId: `case:preset-slot:${string}`
  assignmentId: `case:preset-assignment:${string}`
  roleId: CaseInsertPresetRoleId
  region: CaseInsertPresetConcreteRegionId
  coordinateBasis: CaseInsertPresetCoordinateBasis
  ownerId: CaseInsertPresetOwnerId
  object: CaseInsertPresetObjectBinding
  targetPresence: CaseInsertPresetTargetPresence
  bindingStatus: CaseInsertPresetAssignmentBindingStatus
  currentState: CaseInsertPresetSnapshotObjectState | null
  enablement: CaseInsertPresetSnapshotEnablement | null
  contentRegion: CaseInsertPresetNormalizedRegion
  actionRegion: CaseInsertPresetNormalizedRegion | null
}>

export type ResolvedCaseInsertPresetAssignments = Readonly<{
  preset: Readonly<{
    id: CaseInsertPresetId
    revision: number
    source: CaseInsertPresetCatalogSource
  }>
  snapshotIdentity: CaseInsertPresetAssignmentSnapshotIdentity
  requestedScope: CaseInsertPresetApplicationScope
  resolvedRegions: readonly CaseInsertPresetConcreteRegionId[]
  assignments: readonly ResolvedCaseInsertPresetAssignment[]
  compatibilityStatus: CaseInsertPresetCompatibilityStatus
  compatibilityReasons: readonly CaseInsertPresetCompatibilityReason[]
}>

export type CaseInsertPresetAssignmentResolutionResult =
  | Readonly<{
      ok: true
      status: 'resolved' | 'resolved-with-missing-targets'
      value: ResolvedCaseInsertPresetAssignments
    }>
  | Readonly<{
      ok: false
      status: 'invalid-reference'
      error: Readonly<{
        code: 'invalid-reference' | 'unknown-id' | 'unknown-revision'
        id: string
        revision: number | null
      }>
    }>
  | Readonly<{
      ok: false
      status: 'invalid-definition'
      reasons: readonly CaseInsertPresetCompatibilityReason[]
    }>
  | Readonly<{
      ok: false
      status: 'invalid-scope'
      error: Readonly<{
        code: 'scope-invalid' | 'scope-unsupported' | 'scope-empty'
      }>
    }>
  | Readonly<{
      ok: false
      status: 'incompatible'
      reasons: readonly CaseInsertPresetCompatibilityReason[]
    }>
  | Readonly<{
      ok: false
      status: 'stale-snapshot'
      dimensions: readonly (
        | 'session-id'
        | 'project-revision'
        | 'template-id'
        | 'template-revision'
      )[]
    }>
  | Readonly<{
      ok: false
      status: 'ambiguous-binding'
      error: Readonly<{
        assignmentId: `case:preset-assignment:${string}`
        ownerId: CaseInsertPresetOwnerId
        objectId: string
        matches: number
      }>
    }>
  | Readonly<{
      ok: false
      status: 'unsupported-snapshot' | 'unsupported-template'
    }>

export type ResolveCaseInsertPresetAssignmentsInput = Readonly<{
  catalog: CaseInsertPresetCatalog
  reference: CaseInsertPresetReference
  requestedScope: unknown
  snapshot: CaseInsertPresetAssignmentSnapshot
  expectedSnapshotIdentity: CaseInsertPresetAssignmentSnapshotIdentity
}>

const REGION_ORDER = new Map(
  CASE_INSERT_PRESET_CONCRETE_REGION_IDS.map((region, index) => [region, index]),
)

function frozenRegion(
  region: CaseInsertPresetNormalizedRegion,
): CaseInsertPresetNormalizedRegion {
  return Object.freeze({ ...region })
}

function frozenObject(
  object: CaseInsertPresetObjectBinding,
): CaseInsertPresetObjectBinding {
  return Object.freeze({ ...object })
}

function frozenIdentity(
  identity: CaseInsertPresetAssignmentSnapshotIdentity,
): CaseInsertPresetAssignmentSnapshotIdentity {
  return Object.freeze({
    sessionId: identity.sessionId,
    projectRevision: identity.projectRevision,
    template: Object.freeze({ ...identity.template }),
  })
}

function frozenReasons(
  reasons: readonly CaseInsertPresetCompatibilityReason[],
) {
  return Object.freeze(reasons.map((reason) => Object.freeze({ ...reason })))
}

function invalidReference(
  code: 'invalid-reference' | 'unknown-id' | 'unknown-revision',
  id: string,
  revision: number | null,
): CaseInsertPresetAssignmentResolutionResult {
  return Object.freeze({
    ok: false,
    status: 'invalid-reference',
    error: Object.freeze({ code, id, revision }),
  })
}

function getStaleDimensions(
  actual: CaseInsertPresetAssignmentSnapshotIdentity,
  expected: CaseInsertPresetAssignmentSnapshotIdentity,
) {
  const dimensions: (
    | 'session-id'
    | 'project-revision'
    | 'template-id'
    | 'template-revision'
  )[] = []
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

function getScopeRegions(
  definitionRegions: ReadonlySet<CaseInsertPresetConcreteRegionId>,
  scope: CaseInsertPresetApplicationScope,
) {
  const selected = new Set<CaseInsertPresetConcreteRegionId>()
  if (scope.kind === 'region') {
    if (definitionRegions.has(scope.region)) selected.add(scope.region)
  } else if (scope.kind === 'section') {
    const candidates = scope.section === 'front'
      ? ['front-cover'] as const
      : scope.section === 'back'
        ? ['tray-card', 'back-panel'] as const
        : ['left-spine', 'right-spine'] as const
    for (const region of candidates) {
      if (definitionRegions.has(region)) selected.add(region)
    }
  } else {
    for (const region of definitionRegions) selected.add(region)
  }

  return Object.freeze([...selected].sort((left, right) =>
    (REGION_ORDER.get(left) ?? 99) - (REGION_ORDER.get(right) ?? 99)))
}

function isExactPositiveRevision(reference: CaseInsertPresetReference) {
  return typeof reference.revision === 'number' &&
    Number.isSafeInteger(reference.revision) &&
    reference.revision > 0
}

function isExpectedIdentitySupported(
  identity: CaseInsertPresetAssignmentSnapshotIdentity,
) {
  return typeof identity.sessionId === 'string' &&
    identity.sessionId.trim().length > 0 &&
    Number.isSafeInteger(identity.projectRevision) &&
    identity.projectRevision >= 0 &&
    typeof identity.template.id === 'string' &&
    identity.template.id.trim().length > 0 &&
    identity.template.revision === null
}

function createResolvedAssignment(
  presetId: CaseInsertPresetId,
  presetRevision: number,
  slot: CaseInsertPresetSlotDefinitionV1,
  assignment: CaseInsertPresetAssignmentDefinitionV1,
  snapshot: CaseInsertPresetAssignmentSnapshot,
): ResolvedCaseInsertPresetAssignment | CaseInsertPresetAssignmentResolutionResult {
  const binding = resolveCaseInsertPresetSnapshotBinding(
    snapshot,
    assignment.ownerId,
    assignment.object,
  )

  if (binding.status === 'unsupported') {
    return Object.freeze({ ok: false, status: 'unsupported-snapshot' })
  }
  if (binding.status === 'ambiguous') {
    return Object.freeze({
      ok: false,
      status: 'ambiguous-binding',
      error: Object.freeze({
        assignmentId: assignment.id,
        ownerId: assignment.ownerId,
        objectId: assignment.object.id,
        matches: binding.matches,
      }),
    })
  }

  const bindingStatus: CaseInsertPresetAssignmentBindingStatus =
    binding.status === 'missing'
      ? assignment.targetPresence === 'required'
        ? 'missing-required'
        : 'missing-optional'
      : binding.enablement.effectiveEnabled
        ? 'resolved'
        : 'resolved-disabled'

  return Object.freeze({
    presetId,
    presetRevision,
    slotId: slot.id,
    assignmentId: assignment.id,
    roleId: slot.roleId,
    region: assignment.region,
    coordinateBasis: assignment.coordinateBasis,
    ownerId: assignment.ownerId,
    object: frozenObject(assignment.object),
    targetPresence: assignment.targetPresence,
    bindingStatus,
    currentState: binding.status === 'found' ? binding.currentState : null,
    enablement: binding.status === 'found' ? binding.enablement : null,
    contentRegion: frozenRegion(assignment.contentRegion),
    actionRegion: assignment.actionRegion
      ? frozenRegion(assignment.actionRegion)
      : null,
  })
}

export function resolveCaseInsertPresetAssignments(
  input: ResolveCaseInsertPresetAssignmentsInput,
): CaseInsertPresetAssignmentResolutionResult {
  if (!isExactPositiveRevision(input.reference)) {
    return invalidReference(
      'invalid-reference',
      typeof input.reference?.id === 'string' ? input.reference.id : '',
      typeof input.reference?.revision === 'number'
        ? input.reference.revision
        : null,
    )
  }

  const catalogResolution = input.catalog.resolve(input.reference)
  if (!catalogResolution.ok) {
    return invalidReference(
      catalogResolution.error.code,
      catalogResolution.error.id,
      catalogResolution.error.revision,
    )
  }
  const catalogValue = catalogResolution.value
  if (catalogValue.canonicalReference.id !== catalogValue.definition.id ||
      catalogValue.canonicalReference.revision !== catalogValue.definition.revision ||
      catalogValue.canonicalReference.revision !== input.reference.revision) {
    return Object.freeze({
      ok: false,
      status: 'invalid-definition',
      reasons: Object.freeze([]),
    })
  }

  if (!isCaseInsertPresetAssignmentSnapshot(input.snapshot) ||
      !isExpectedIdentitySupported(input.expectedSnapshotIdentity)) {
    return Object.freeze({ ok: false, status: 'unsupported-snapshot' })
  }
  const staleDimensions = getStaleDimensions(
    input.snapshot.identity,
    input.expectedSnapshotIdentity,
  )
  if (staleDimensions.length > 0) {
    return Object.freeze({
      ok: false,
      status: 'stale-snapshot',
      dimensions: Object.freeze(staleDimensions),
    })
  }

  const templateCapabilities =
    getCaseInsertPresetSnapshotTemplateCapabilities(input.snapshot)
  if (templateCapabilities.length === 0) {
    return Object.freeze({ ok: false, status: 'unsupported-template' })
  }
  const compatibility = evaluateCaseInsertPresetCompatibility(
    catalogValue.definition,
    {
      projectKind: 'caseInsert',
      templateId: input.snapshot.identity.template.id,
      templateCapabilities,
      ownerCapabilities: getCaseInsertPresetSnapshotOwnerCapabilities(
        input.snapshot,
      ),
      requestedScope: input.requestedScope,
    },
  )
  const compatibilityReasons = frozenReasons(compatibility.reasons)
  if (!compatibility.definition) {
    return Object.freeze({
      ok: false,
      status: 'invalid-definition',
      reasons: compatibilityReasons,
    })
  }

  const scopeReason = compatibility.reasons.find(({ code }) =>
    code === 'scope-invalid' || code === 'scope-unsupported')
  if (scopeReason || !compatibility.requestedScope) {
    return Object.freeze({
      ok: false,
      status: 'invalid-scope',
      error: Object.freeze({
        code: scopeReason?.code === 'scope-unsupported'
          ? 'scope-unsupported'
          : 'scope-invalid',
      }),
    })
  }
  if (compatibility.status === 'incompatible') {
    return Object.freeze({
      ok: false,
      status: 'incompatible',
      reasons: compatibilityReasons,
    })
  }

  const definition = compatibility.definition
  const requestedScope = compatibility.requestedScope
  const definitionRegions = new Set(definition.slots.flatMap(({ assignments }) =>
    assignments.map(({ region }) => region)))
  const resolvedRegions = getScopeRegions(definitionRegions, requestedScope)
  if (resolvedRegions.length === 0) {
    return Object.freeze({
      ok: false,
      status: 'invalid-scope',
      error: Object.freeze({ code: 'scope-empty' }),
    })
  }
  const resolvedRegionSet = new Set(resolvedRegions)
  const selected = definition.slots.flatMap((slot) =>
    slot.assignments
      .filter(({ region }) => resolvedRegionSet.has(region))
      .map((assignment) => ({ slot, assignment })))
    .sort((left, right) =>
      (REGION_ORDER.get(left.assignment.region) ?? 99) -
        (REGION_ORDER.get(right.assignment.region) ?? 99) ||
      left.slot.id.localeCompare(right.slot.id) ||
      left.assignment.id.localeCompare(right.assignment.id))
  if (selected.length === 0) {
    return Object.freeze({
      ok: false,
      status: 'invalid-scope',
      error: Object.freeze({ code: 'scope-empty' }),
    })
  }

  const assignments: ResolvedCaseInsertPresetAssignment[] = []
  for (const { slot, assignment } of selected) {
    const resolved = createResolvedAssignment(
      definition.id,
      definition.revision,
      slot,
      assignment,
      input.snapshot,
    )
    if ('ok' in resolved) return resolved
    assignments.push(resolved)
  }

  const value = Object.freeze({
    preset: Object.freeze({
      id: definition.id,
      revision: definition.revision,
      source: catalogValue.source,
    }),
    snapshotIdentity: frozenIdentity(input.snapshot.identity),
    requestedScope: Object.freeze({ ...requestedScope }) as
      CaseInsertPresetApplicationScope,
    resolvedRegions,
    assignments: Object.freeze(assignments),
    compatibilityStatus: compatibility.status,
    compatibilityReasons,
  })
  const hasMissingTargets = assignments.some(({ bindingStatus }) =>
    bindingStatus === 'missing-optional' ||
    bindingStatus === 'missing-required')

  return Object.freeze({
    ok: true,
    status: hasMissingTargets ? 'resolved-with-missing-targets' : 'resolved',
    value,
  })
}
