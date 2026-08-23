import {
  encodeCaseInsertPresetDeterministicIdentity,
} from './caseInsertPresetDeterministicIdentity.ts'

const REVIEW_IDENTITY_PREFIX = 'case:preset-apply-review:v1:'
const CONSENT_REQUIREMENT_PREFIX = 'case:preset-consent:v1:'
const WARNING_IDENTITY_PREFIX = 'case:preset-warning:v1:'

type ReviewableWarning =
  | Readonly<{
      kind: 'disabled-target-layout-only'
      assignmentId: string
      ownerId: string
      objectId: string
    }>
  | Readonly<{
      kind: 'complete-tray-span'
      assignmentId: string
      coordinateBasis: 'back' | 'backSafe'
    }>
  | Readonly<{
      kind: 'text-height-fitting-deferred'
      assignmentId: string
      issue: 181
    }>
  | Readonly<{
      kind: 'multiple-concrete-regions'
      regions: readonly string[]
      assignmentIds: readonly string[]
    }>
  | Readonly<{
      id: string
      kind: 'material-visible-clipping'
      classification: 'derived-cover' | 'explicit-crop'
      assignmentId: string
    }>
  | Readonly<{
      id: string
      kind: 'artwork-cover-fitting-deferred'
      assignmentId: string
      ownerId: string
      objectId: string
      fittingMode: 'cover'
      reviewMessage: string
    }>

type ReviewableConsentRequirement =
  | Readonly<{
      id: `case:preset-consent:${string}`
      kind: 'multiple-concrete-regions'
      regions: readonly string[]
      assignmentIds: readonly string[]
    }>
  | Readonly<{
      id: `case:preset-consent:${string}`
      kind: 'material-visible-clipping'
      warningId: string
      assignmentId: string
    }>

type ReviewablePlan = Readonly<{
  kind: string
  formatVersion: number
  identity: Readonly<{
    operation: string
    presetId: string
    presetRevision: number
    sessionId: string
    projectRevision: number
    scopeKey: string
  }>
  operation: string
  preset: Readonly<{ id: string; revision: number; source: string }>
  resolvedRegions: readonly string[]
  source: Readonly<{
    projectKind: string
    snapshotIdentity: Readonly<{
      sessionId: string
      projectRevision: number
      template: Readonly<{ id: string; revision: number | null }>
      aggregateContentIdentity: string
    }>
  }>
  assignments: readonly Readonly<{
    assignmentId: string
    slotId: string
    roleId: string
    region: string
    ownerId: string
    objectId: string
    object: Readonly<{
      bindingKind: string
      bindingId: string
      runtimeId: string | null
    }>
    bindingStatus: string
    expectedEnablement: Readonly<{
      objectEnabled: boolean
      ownerEnabled: boolean | null
      effectiveEnabled: boolean
    }> | null
    fieldActionIds: readonly string[]
    objectCreationActionId: string | null
    artworkViewportActionId: string | null
    preservationDecisionIds: readonly string[]
    skip: Readonly<{
      kind: string
      assignmentId: string
      slotId: string
      region: string
      ownerId: string
      objectId: string
    }> | null
    semanticNoOp: boolean
  }>[]
  fieldActions: readonly Readonly<{
    id: string
    kind: string
    featureOwnerId: string
    object: Readonly<{
      bindingKind: string
      bindingId: string
      runtimeId: string
    }>
    fieldId: string
    currentValue: number | null
    proposedValue: number
    semanticNoOp: boolean
    preservationClassification: string
    consentClassification: string
    sources: readonly Readonly<{
      presetId: string
      presetRevision: number
      slotId: string
      assignmentId: string
      roleId: string
      region: string
      coordinateBasis: string
      ownerId: string
      object: Readonly<{
        bindingKind: string
        bindingId: string
        runtimeId: string
      }>
      declaredPolicy: string
    }>[]
  }>[]
  objectCreationActions: readonly Readonly<{
    id: string
    kind: string
    source: Readonly<{
      assignmentId: string
      declaredPolicy: string
    }>
    target: Readonly<{
      featureOwnerId: string
      bindingKind: string
      bindingId: string
      runtimeObjectId: string
    }>
    before: Readonly<{ presence: string; exactMatchCount: number }>
    canonicalInitialObject: unknown
    insertionPolicy: string
    ownedFieldIds: readonly string[]
    unownedFieldIds: readonly string[]
    viewportActionId: string
    semanticNoOp: boolean
    review: unknown
  }>[]
  artworkViewportActions: readonly Readonly<{
    id: string
    kind: string
    source: Readonly<{
      assignmentId: string
      declaredPolicy: string
    }>
    target: Readonly<{
      featureOwnerId: string
      bindingKind: string
      bindingId: string
      runtimeObjectId: string
    }>
    targetOrigin: string
    sourceState: unknown
    evidence: Readonly<{
      status: string
      plan: Readonly<{ identity: string }>
    }>
    currentValues: unknown
    proposedValues: unknown
    ownedFieldIds: readonly string[]
    preservedFieldIds: readonly string[]
    semanticNoOp: boolean
    review: unknown
  }>[]
  preservationDecisions: readonly Readonly<{
    id: string
    assignmentId: string | null
    category: string
    classification: string
    evidence: Readonly<{
      ownerId: string | null
      objectId: string | null
      present: boolean
    }>
  }>[]
  skips: readonly Readonly<{
    kind: string
    assignmentId: string
    slotId: string
    region: string
    ownerId: string
    objectId: string
  }>[]
  warnings: readonly ReviewableWarning[]
  blockers: readonly (
    | Readonly<{
        kind: 'missing-required-target'
        assignmentId: string
        ownerId: string
        objectId: string
      }>
    | Readonly<{
        kind: 'geometry-outside-owner-basis' | 'geometry-unavailable'
        assignmentId: string
        coordinateBasis: string
        ownerBasis: string
      }>
    | Readonly<{
        kind: 'conflicting-field-actions'
        ownerId: string
        runtimeObjectId: string
        fieldId: string
        proposedValues: readonly number[]
        assignmentIds: readonly string[]
      }>
  )[]
  materialConsentRequirements: readonly ReviewableConsentRequirement[]
  semanticNoOp: Readonly<{
    aggregate: boolean
    fieldActionCount: number
    changedFieldActionCount: number
    noOpFieldActionCount: number
    objectCreationActionCount: number
    changedArtworkViewportActionCount: number
    noOpArtworkViewportActionCount: number
  }>
  preconditions: Readonly<{
    sessionId: string
    projectRevision: number
    projectKind: string
    template: Readonly<{ id: string; revision: number | null }>
    aggregateContentIdentity: string
    preset: Readonly<{ id: string; revision: number }>
    scopeKey: string
    resolvedRegions: readonly string[]
  }>
  fieldFootprint: readonly Readonly<{
    featureOwnerId: string
    runtimeObjectId: string
    fieldId: string
    acceptedValueCandidate: number
    sourceAssignmentIds: readonly string[]
  }>[]
}>

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

function warningPayload(warning: ReviewableWarning) {
  switch (warning.kind) {
    case 'disabled-target-layout-only':
      return primitiveTuple(warning.kind, [
        warning.assignmentId,
        warning.ownerId,
        warning.objectId,
      ])
    case 'complete-tray-span':
      return primitiveTuple(warning.kind, [
        warning.assignmentId,
        warning.coordinateBasis,
      ])
    case 'text-height-fitting-deferred':
      return primitiveTuple(warning.kind, [
        warning.assignmentId,
        warning.issue,
      ])
    case 'multiple-concrete-regions':
      return tuple(warning.kind, [
        primitiveTuple('regions', warning.regions),
        primitiveTuple('assignments', warning.assignmentIds),
      ])
    case 'material-visible-clipping':
      return primitiveTuple(warning.kind, [
        warning.id,
        warning.classification,
        warning.assignmentId,
      ])
    case 'artwork-cover-fitting-deferred':
      return primitiveTuple(warning.kind, [
        warning.id,
        warning.assignmentId,
        warning.ownerId,
        warning.objectId,
        warning.fittingMode,
        warning.reviewMessage,
      ])
  }
}

type ReviewableConsentPayload =
  | Omit<Extract<
      ReviewableConsentRequirement,
      Readonly<{ kind: 'multiple-concrete-regions' }>
    >, 'id'>
  | Omit<Extract<
      ReviewableConsentRequirement,
      Readonly<{ kind: 'material-visible-clipping' }>
    >, 'id'>

function materialConsentPayload(requirement: ReviewableConsentPayload) {
  return requirement.kind === 'multiple-concrete-regions'
    ? tuple(requirement.kind, [
        primitiveTuple('regions', requirement.regions),
        primitiveTuple('assignments', requirement.assignmentIds),
      ])
    : primitiveTuple(requirement.kind, [
        requirement.warningId,
        requirement.assignmentId,
      ])
}

export function createCaseInsertPresetPlanWarningIdentity(
  warning: ReviewableWarning,
) {
  if ('id' in warning) return warning.id
  return `${WARNING_IDENTITY_PREFIX}${warningPayload(warning)}`
}

export function createCaseInsertPresetMaterialConsentRequirementId(
  requirement: ReviewableConsentPayload,
): `case:preset-consent:${string}` {
  return `${CONSENT_REQUIREMENT_PREFIX}${materialConsentPayload(requirement)}`
}

export function createCaseInsertPresetApplyPlanReviewIdentity(
  plan: ReviewablePlan,
) {
  const assignments = plan.assignments.map((assignment) => tuple('assignment', [
    primitiveTuple('identity', [
      assignment.assignmentId,
      assignment.slotId,
      assignment.roleId,
      assignment.region,
      assignment.ownerId,
      assignment.objectId,
      assignment.object.bindingKind,
      assignment.object.bindingId,
      assignment.object.runtimeId,
      assignment.bindingStatus,
      assignment.objectCreationActionId,
      assignment.artworkViewportActionId,
      assignment.semanticNoOp,
    ]),
    assignment.expectedEnablement
      ? primitiveTuple('enablement', [
          assignment.expectedEnablement.objectEnabled,
          assignment.expectedEnablement.ownerEnabled,
          assignment.expectedEnablement.effectiveEnabled,
        ])
      : primitiveTuple('enablement', [null]),
    primitiveTuple('field-actions', assignment.fieldActionIds),
    primitiveTuple('preservation-decisions', assignment.preservationDecisionIds),
    assignment.skip
      ? primitiveTuple('skip', [
          assignment.skip.kind,
          assignment.skip.assignmentId,
          assignment.skip.slotId,
          assignment.skip.region,
          assignment.skip.ownerId,
          assignment.skip.objectId,
        ])
      : primitiveTuple('skip', [null]),
  ]))

  const fieldActions = plan.fieldActions.map((action) => tuple('field-action', [
    primitiveTuple('action', [
      action.id,
      action.kind,
      action.featureOwnerId,
      action.object.bindingKind,
      action.object.bindingId,
      action.object.runtimeId,
      action.fieldId,
      action.currentValue,
      action.proposedValue,
      action.semanticNoOp,
      action.preservationClassification,
      action.consentClassification,
    ]),
    tuple('sources', action.sources.map((source) => primitiveTuple('source', [
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
    ]))),
  ]))

  const objectCreationActions = plan.objectCreationActions.map((action) =>
    primitiveTuple('object-creation-action', [
      action.id,
      action.kind,
      action.source.assignmentId,
      action.source.declaredPolicy,
      action.target.featureOwnerId,
      action.target.bindingKind,
      action.target.bindingId,
      action.target.runtimeObjectId,
      action.before.presence,
      action.before.exactMatchCount,
      encodeCaseInsertPresetDeterministicIdentity(
        action.canonicalInitialObject,
      ),
      action.insertionPolicy,
      encodeCaseInsertPresetDeterministicIdentity(action.ownedFieldIds),
      encodeCaseInsertPresetDeterministicIdentity(action.unownedFieldIds),
      action.viewportActionId,
      action.semanticNoOp,
      encodeCaseInsertPresetDeterministicIdentity(action.review),
    ]))

  const artworkViewportActions = plan.artworkViewportActions.map((action) =>
    primitiveTuple('artwork-viewport-action', [
      action.id,
      action.kind,
      action.source.assignmentId,
      action.source.declaredPolicy,
      action.target.featureOwnerId,
      action.target.bindingKind,
      action.target.bindingId,
      action.target.runtimeObjectId,
      action.targetOrigin,
      encodeCaseInsertPresetDeterministicIdentity(action.sourceState),
      action.evidence.status,
      action.evidence.plan.identity,
      encodeCaseInsertPresetDeterministicIdentity(action.currentValues),
      encodeCaseInsertPresetDeterministicIdentity(action.proposedValues),
      encodeCaseInsertPresetDeterministicIdentity(action.ownedFieldIds),
      encodeCaseInsertPresetDeterministicIdentity(action.preservedFieldIds),
      action.semanticNoOp,
      encodeCaseInsertPresetDeterministicIdentity(action.review),
    ]))

  const preservation = plan.preservationDecisions.map((decision) =>
    primitiveTuple('preservation', [
      decision.id,
      decision.assignmentId,
      decision.category,
      decision.classification,
      decision.evidence.ownerId,
      decision.evidence.objectId,
      decision.evidence.present,
    ]))

  const skips = plan.skips.map((skip) => primitiveTuple('skip', [
    skip.kind,
    skip.assignmentId,
    skip.slotId,
    skip.region,
    skip.ownerId,
    skip.objectId,
  ]))

  const blockers = plan.blockers.map((blocker) => {
    switch (blocker.kind) {
      case 'missing-required-target':
        return primitiveTuple(blocker.kind, [
          blocker.assignmentId,
          blocker.ownerId,
          blocker.objectId,
        ])
      case 'geometry-outside-owner-basis':
      case 'geometry-unavailable':
        return primitiveTuple(blocker.kind, [
          blocker.assignmentId,
          blocker.coordinateBasis,
          blocker.ownerBasis,
        ])
      case 'conflicting-field-actions':
        return tuple(blocker.kind, [
          primitiveTuple('target', [
            blocker.ownerId,
            blocker.runtimeObjectId,
            blocker.fieldId,
          ]),
          primitiveTuple('values', blocker.proposedValues),
          primitiveTuple('assignments', blocker.assignmentIds),
        ])
    }
  })

  const consentRequirements = plan.materialConsentRequirements.map(
    (requirement) => tuple('material-consent', [
      atom(requirement.id),
      materialConsentPayload(requirement),
    ]),
  )

  const footprint = plan.fieldFootprint.map((entry) => tuple('footprint', [
    primitiveTuple('target', [
      entry.featureOwnerId,
      entry.runtimeObjectId,
      entry.fieldId,
      entry.acceptedValueCandidate,
    ]),
    primitiveTuple('assignments', entry.sourceAssignmentIds),
  ]))

  const payload = tuple('case-preset-apply-plan', [
    primitiveTuple('format', [plan.kind, plan.formatVersion, plan.operation]),
    primitiveTuple('identity', [
      plan.identity.operation,
      plan.identity.presetId,
      plan.identity.presetRevision,
      plan.identity.sessionId,
      plan.identity.projectRevision,
      plan.identity.scopeKey,
    ]),
    primitiveTuple('preset', [
      plan.preset.id,
      plan.preset.revision,
      plan.preset.source,
    ]),
    primitiveTuple('scope', [plan.preconditions.scopeKey]),
    primitiveTuple('regions', plan.resolvedRegions),
    primitiveTuple('source', [
      plan.source.projectKind,
      plan.source.snapshotIdentity.sessionId,
      plan.source.snapshotIdentity.projectRevision,
      plan.source.snapshotIdentity.template.id,
      plan.source.snapshotIdentity.template.revision,
      plan.source.snapshotIdentity.aggregateContentIdentity,
    ]),
    tuple('assignments', assignments),
    tuple('field-actions', fieldActions),
    tuple('object-creation-actions', objectCreationActions),
    tuple('artwork-viewport-actions', artworkViewportActions),
    tuple('preservation', preservation),
    tuple('skips', skips),
    tuple('warnings', plan.warnings.map(warningPayload)),
    tuple('blockers', blockers),
    tuple('material-consent', consentRequirements),
    primitiveTuple('semantic-no-op', [
      plan.semanticNoOp.aggregate,
      plan.semanticNoOp.fieldActionCount,
      plan.semanticNoOp.changedFieldActionCount,
      plan.semanticNoOp.noOpFieldActionCount,
      plan.semanticNoOp.objectCreationActionCount,
      plan.semanticNoOp.changedArtworkViewportActionCount,
      plan.semanticNoOp.noOpArtworkViewportActionCount,
    ]),
    primitiveTuple('preconditions', [
      plan.preconditions.sessionId,
      plan.preconditions.projectRevision,
      plan.preconditions.projectKind,
      plan.preconditions.template.id,
      plan.preconditions.template.revision,
      plan.preconditions.aggregateContentIdentity,
      plan.preconditions.preset.id,
      plan.preconditions.preset.revision,
      plan.preconditions.scopeKey,
    ]),
    primitiveTuple('precondition-regions', plan.preconditions.resolvedRegions),
    tuple('field-footprint', footprint),
  ])

  return `${REVIEW_IDENTITY_PREFIX}${payload}`
}
