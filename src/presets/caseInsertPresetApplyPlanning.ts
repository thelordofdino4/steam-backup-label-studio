import {
  type CaseInsertPresetAssignmentSnapshotIdentity,
  type CaseInsertPresetSnapshotObjectState,
} from '../caseInsert/presetAssignmentSnapshot.ts'
import {
  adoptCaseInsertArtworkViewport,
  type CaseInsertArtworkViewportAdoptionTarget,
} from '../caseInsert/artworkViewportAdoption.ts'
import {
  createCaseInsertPresetEmptyArtworkSlot,
  getCaseInsertPresetArtworkSlotProvisioningCapability,
  type CaseInsertPresetArtworkSlotProvisioningCapability,
  type CaseInsertPresetArtworkSlotProvisioningTarget,
} from '../caseInsert/presetArtworkSlotProvisioning.ts'
import {
  isCaseInsertPresetAggregateContentIdentity,
} from '../caseInsert/presetAggregateIdentity.ts'
import type {
  ProjectCaseInsertImageFit,
  ProjectCaseInsertImageSlot,
  ProjectCaseInsertLayout,
  ProjectCaseInsertReservedArtworkViewport,
} from '../project/projectTypes.ts'
import { caseInsertTemplates } from '../templates/caseInsertTemplates.ts'
import type { TemplateRect } from '../types/template.ts'
import type {
  CaseInsertPresetAssignmentResolutionResult,
  ResolvedCaseInsertPresetAssignment,
  ResolvedCaseInsertPresetAssignments,
} from './caseInsertPresetAssignmentResolution.ts'
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
  type CaseInsertPresetCoordinateBasis,
  type CaseInsertPresetId,
  type CaseInsertPresetObjectBinding,
  type CaseInsertPresetOwnerId,
  type CaseInsertPresetRoleId,
} from './caseInsertPresetDefinition.ts'
import {
  createCaseInsertPresetApplyPlanReviewIdentity,
  createCaseInsertPresetMaterialConsentRequirementId,
} from './caseInsertPresetApplyReviewIdentity.ts'
import {
  CASE_INSERT_PRESET_ARTWORK_VIEWPORT_ACTION_FORMAT_VERSION,
  CASE_INSERT_PRESET_ARTWORK_VIEWPORT_ACTION_KIND,
  planCaseInsertPresetArtworkViewport,
  type CaseInsertPresetArtworkViewportConsentRequirement,
  type CaseInsertPresetArtworkViewportPlanningSuccess,
  type CaseInsertPresetArtworkViewportWarning,
} from './caseInsertPresetArtworkViewport.ts'
import {
  createCaseInsertPresetArtworkViewportSourceEvidence,
  type CaseInsertPresetArtworkViewportSourceState,
} from './caseInsertPresetArtworkViewportSource.ts'
import {
  createCaseInsertPresetDeterministicIdentityDigest,
} from './caseInsertPresetDeterministicIdentity.ts'
import type {
  CaseInsertAppliedPresetLayoutFieldId,
  CaseInsertAppliedPresetSourceAssignment,
} from './caseInsertPresetOwnedField.ts'

export const CASE_INSERT_PRESET_APPLY_PLAN_KIND =
  'sbls/case-insert-preset-apply-plan' as const
export const CASE_INSERT_PRESET_APPLY_PLAN_FORMAT_VERSION = 3 as const

export type CaseInsertPresetPlanOperation = 'apply'
export type CaseInsertPresetPlanRequestedOperation =
  | CaseInsertPresetPlanOperation
  | 'reapply'
  | 'detach'

export type CaseInsertPresetPlanFieldId =
  CaseInsertAppliedPresetLayoutFieldId

export type CaseInsertPresetPlanPreservationCategory =
  | 'image-bytes'
  | 'image-provenance'
  | 'text-content'
  | 'rich-text-content'
  | 'metadata-source-and-manual-override'
  | 'branding-selection-and-custom-assets'
  | 'enablement-and-disabled-payload'
  | 'repeated-object-identity'
  | 'frame-material-and-style'
  | 'fit-crop-and-rotation'
  | 'untargeted-object-fields'
  | 'owners-outside-requested-scope'

export type CaseInsertPresetPlanSourceAssignment =
  CaseInsertAppliedPresetSourceAssignment

export type CaseInsertPresetPlanObjectCreationAction = Readonly<{
  id: `case:preset-object-creation-action:v1:${string}`
  kind: 'create-empty-repeated-artwork-slot'
  source: CaseInsertPresetPlanSourceAssignment
  target: Readonly<{
    featureOwnerId: 'case.tray.artwork-slots'
    bindingKind: 'repeated'
    bindingId: string
    runtimeObjectId: string
  }>
  before: Readonly<{
    presence: 'absent'
    exactMatchCount: 0
  }>
  canonicalInitialObject: Readonly<ProjectCaseInsertImageSlot>
  insertionPolicy: 'append-preserve-existing-order'
  ownedFieldIds: readonly ['object-presence']
  unownedFieldIds: readonly [
    'image-data',
    'image-provenance',
    'image-dimensions',
    'default-steam-logo',
    'label-after-creation',
    'enabled',
    'frame',
    'array-position-after-creation',
    'owner-enablement',
  ]
  viewportActionId: `case:preset-artwork-viewport-action:v1:${string}`
  semanticNoOp: false
  review: Readonly<{
    actionLabel: string
    targetLabel: string
    initialStateLabel: 'Empty and disabled'
    insertionLabel: 'Append after existing Tray artwork without reordering it'
    preservationLabel:
      'Does not select, import, populate, or enable screenshot artwork'
  }>
}>

export type CaseInsertPresetPlanArtworkViewportOwnedValues = Readonly<{
  layoutX: number
  layoutY: number
  layoutScale: number
  imageFit: ProjectCaseInsertImageFit
  reservedArtworkViewport:
    Readonly<ProjectCaseInsertReservedArtworkViewport> | null
}>

export type CaseInsertPresetPlanArtworkViewportAction = Readonly<{
  id: `case:preset-artwork-viewport-action:v1:${string}`
  kind: 'adopt-reserved-artwork-viewport'
  source: CaseInsertPresetPlanSourceAssignment
  target: Readonly<{
    featureOwnerId: 'case.tray.artwork-slots'
    bindingKind: 'repeated'
    bindingId: string
    runtimeObjectId: string
  }>
  targetOrigin: 'existing' | 'planned-creation'
  sourceState: CaseInsertPresetArtworkViewportSourceState
  evidence: CaseInsertPresetArtworkViewportPlanningSuccess
  currentValues: CaseInsertPresetPlanArtworkViewportOwnedValues | null
  proposedValues: CaseInsertPresetPlanArtworkViewportOwnedValues
  ownedFieldIds: readonly [
    'layout-x',
    'layout-y',
    'layout-scale',
    'image-fit',
    'reserved-artwork-viewport',
  ]
  preservedFieldIds: readonly [
    'image-data',
    'image-provenance',
    'image-dimensions',
    'default-steam-logo',
    'label',
    'enabled',
    'frame',
    'layout-rotation',
    'owner-enablement',
    'array-order',
  ]
  semanticNoOp: boolean
  review: Readonly<{
    actionLabel: string
    targetLabel: string
    fittingLabel: 'Contain' | 'Cover' | 'Explicit crop'
    sourceStateLabel:
      | 'Current artwork fitting is fully resolved'
      | 'Future artwork fitting is deferred until an image is selected'
    preservationLabel:
      'Preserves image content, provenance, dimensions, label, enablement, frame, and rotation'
  }>
}>

type CaseInsertPresetPlanFieldActionBase = Readonly<{
  id: string
  featureOwnerId: CaseInsertPresetOwnerId
  object: CaseInsertPresetPlanSourceAssignment['object']
  fieldId: CaseInsertPresetPlanFieldId
  currentValue: number | null
  proposedValue: number
  semanticNoOp: boolean
  preservationClassification: 'layout-only-preserve-content'
  consentClassification: 'ordinary-reviewed-layout'
  sources: readonly CaseInsertPresetPlanSourceAssignment[]
}>

export type CaseInsertPresetPlanFieldAction =
  | (CaseInsertPresetPlanFieldActionBase & Readonly<{
      kind: 'set-layout-x'
      fieldId: 'layout-x'
    }>)
  | (CaseInsertPresetPlanFieldActionBase & Readonly<{
      kind: 'set-layout-y'
      fieldId: 'layout-y'
    }>)
  | (CaseInsertPresetPlanFieldActionBase & Readonly<{
      kind: 'set-layout-scale'
      fieldId: 'layout-scale'
    }>)
  | (CaseInsertPresetPlanFieldActionBase & Readonly<{
      kind: 'set-layout-width'
      fieldId: 'layout-width'
    }>)

export type CaseInsertPresetPlanPreservationDecision = Readonly<{
  id: string
  assignmentId: `case:preset-assignment:${string}` | null
  category: CaseInsertPresetPlanPreservationCategory
  classification: 'preserved'
  evidence: Readonly<{
    ownerId: CaseInsertPresetOwnerId | null
    objectId: string | null
    present: boolean
  }>
}>

export type CaseInsertPresetPlanSkip = Readonly<{
  kind: 'missing-optional-target'
  assignmentId: `case:preset-assignment:${string}`
  slotId: `case:preset-slot:${string}`
  region: CaseInsertPresetConcreteRegionId
  ownerId: CaseInsertPresetOwnerId
  objectId: string
}>

export type CaseInsertPresetPlanWarning =
  | Readonly<{
      kind: 'disabled-target-layout-only'
      assignmentId: `case:preset-assignment:${string}`
      ownerId: CaseInsertPresetOwnerId
      objectId: string
    }>
  | Readonly<{
      kind: 'complete-tray-span'
      assignmentId: `case:preset-assignment:${string}`
      coordinateBasis: 'back' | 'backSafe'
    }>
  | Readonly<{
      kind: 'text-height-fitting-deferred'
      assignmentId: `case:preset-assignment:${string}`
      issue: 181
    }>
  | Readonly<{
      kind: 'multiple-concrete-regions'
      regions: readonly CaseInsertPresetConcreteRegionId[]
      assignmentIds: readonly `case:preset-assignment:${string}`[]
    }>
  | CaseInsertPresetArtworkViewportWarning
  | Readonly<{
      id: `case:preset-warning:v1:artwork-fitting-deferred:${string}`
      kind: 'artwork-cover-fitting-deferred'
      assignmentId: `case:preset-assignment:${string}`
      ownerId: 'case.tray.artwork-slots'
      objectId: string
      fittingMode: 'cover'
      reviewMessage: 'Future artwork will use Cover and may be cropped.'
    }>

export type CaseInsertPresetPlanBlocker =
  | Readonly<{
      kind: 'missing-required-target'
      assignmentId: `case:preset-assignment:${string}`
      ownerId: CaseInsertPresetOwnerId
      objectId: string
    }>
  | Readonly<{
      kind: 'geometry-outside-owner-basis'
      assignmentId: `case:preset-assignment:${string}`
      coordinateBasis: CaseInsertPresetCoordinateBasis
      ownerBasis: CaseInsertPresetCoordinateBasis
    }>
  | Readonly<{
      kind: 'geometry-unavailable'
      assignmentId: `case:preset-assignment:${string}`
      coordinateBasis: CaseInsertPresetCoordinateBasis
      ownerBasis: CaseInsertPresetCoordinateBasis
    }>
  | Readonly<{
      kind: 'conflicting-field-actions'
      ownerId: CaseInsertPresetOwnerId
      runtimeObjectId: string
      fieldId: CaseInsertPresetPlanFieldId
      proposedValues: readonly number[]
      assignmentIds: readonly `case:preset-assignment:${string}`[]
    }>

export type CaseInsertPresetUnsupportedAction = Readonly<{
  kind:
    | 'action-region-policy-unavailable'
    | 'text-fitting-unavailable'
    | 'empty-target-creation-unsupported'
    | 'artwork-viewport-planning-unavailable'
    | 'artwork-viewport-adoption-unavailable'
    | 'artwork-source-unavailable'
  assignmentId: `case:preset-assignment:${string}`
  ownerId: CaseInsertPresetOwnerId
  objectId: string
  coordinateBasis: CaseInsertPresetCoordinateBasis
}>

export type CaseInsertPresetMaterialConsentRequirement =
  | Readonly<{
      id: `case:preset-consent:${string}`
      kind: 'multiple-concrete-regions'
      regions: readonly CaseInsertPresetConcreteRegionId[]
      assignmentIds: readonly `case:preset-assignment:${string}`[]
    }>
  | CaseInsertPresetArtworkViewportConsentRequirement

export type CaseInsertPresetPlanFieldFootprint = Readonly<{
  featureOwnerId: CaseInsertPresetOwnerId
  runtimeObjectId: string
  fieldId: CaseInsertPresetPlanFieldId
  acceptedValueCandidate: number
  sourceAssignmentIds: readonly `case:preset-assignment:${string}`[]
}>

export type CaseInsertPresetApplyPlan = Readonly<{
  kind: typeof CASE_INSERT_PRESET_APPLY_PLAN_KIND
  formatVersion: typeof CASE_INSERT_PRESET_APPLY_PLAN_FORMAT_VERSION
  identity: Readonly<{
    operation: CaseInsertPresetPlanOperation
    presetId: CaseInsertPresetId
    presetRevision: number
    sessionId: string
    projectRevision: number
    scopeKey: string
  }>
  operation: CaseInsertPresetPlanOperation
  preset: Readonly<{
    id: CaseInsertPresetId
    revision: number
    source: 'builtin' | 'user'
  }>
  requestedScope: CaseInsertPresetApplicationScope
  resolvedRegions: readonly CaseInsertPresetConcreteRegionId[]
  source: Readonly<{
    projectKind: 'caseInsert'
    snapshotIdentity: CaseInsertPresetAssignmentSnapshotIdentity
  }>
  assignments: readonly Readonly<{
    assignmentId: `case:preset-assignment:${string}`
    slotId: `case:preset-slot:${string}`
    roleId: CaseInsertPresetRoleId
    region: CaseInsertPresetConcreteRegionId
    ownerId: CaseInsertPresetOwnerId
    objectId: string
    object: Readonly<{
      bindingKind: CaseInsertPresetObjectBinding['kind']
      bindingId: string
      runtimeId: string | null
    }>
    bindingStatus: ResolvedCaseInsertPresetAssignment['bindingStatus']
    expectedEnablement: ResolvedCaseInsertPresetAssignment['enablement']
    fieldActionIds: readonly string[]
    objectCreationActionId:
      | CaseInsertPresetPlanObjectCreationAction['id']
      | null
    artworkViewportActionId:
      | CaseInsertPresetPlanArtworkViewportAction['id']
      | null
    preservationDecisionIds: readonly string[]
    skip: CaseInsertPresetPlanSkip | null
    semanticNoOp: boolean
  }>[]
  fieldActions: readonly CaseInsertPresetPlanFieldAction[]
  objectCreationActions: readonly CaseInsertPresetPlanObjectCreationAction[]
  artworkViewportActions: readonly CaseInsertPresetPlanArtworkViewportAction[]
  preservationDecisions: readonly CaseInsertPresetPlanPreservationDecision[]
  skips: readonly CaseInsertPresetPlanSkip[]
  warnings: readonly CaseInsertPresetPlanWarning[]
  blockers: readonly CaseInsertPresetPlanBlocker[]
  materialConsentRequirements:
    readonly CaseInsertPresetMaterialConsentRequirement[]
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
    projectKind: 'caseInsert'
    template: Readonly<{ id: string; revision: null }>
    aggregateContentIdentity: CaseInsertPresetAssignmentSnapshotIdentity[
      'aggregateContentIdentity'
    ]
    preset: Readonly<{ id: CaseInsertPresetId; revision: number }>
    scopeKey: string
    resolvedRegions: readonly CaseInsertPresetConcreteRegionId[]
  }>
  fieldFootprint: readonly CaseInsertPresetPlanFieldFootprint[]
  reviewIdentity: string
}>

export type PlanCaseInsertPresetFirstApplyInput = Readonly<{
  operation: unknown
  resolution: CaseInsertPresetAssignmentResolutionResult
  expected: Readonly<{
    projectKind: unknown
    preset: Readonly<{ id: unknown; revision: unknown }>
    requestedScope: unknown
    snapshotIdentity: CaseInsertPresetAssignmentSnapshotIdentity
  }>
}>

export type CaseInsertPresetApplyPlanningResult =
  | Readonly<{
      ok: true
      status: 'planned' | 'semantic-no-op'
      plan: CaseInsertPresetApplyPlan
    }>
  | Readonly<{
      ok: false
      status: 'blocked'
      blockers: readonly CaseInsertPresetPlanBlocker[]
    }>
  | Readonly<{
      ok: false
      status: 'stale-resolution'
      dimensions: readonly (
        | 'session-id'
        | 'project-revision'
        | 'template-id'
        | 'template-revision'
        | 'aggregate-content'
      )[]
    }>
  | Readonly<{
      ok: false
      status: 'invalid-resolution'
      code: string
    }>
  | Readonly<{
      ok: false
      status: 'incompatible-resolution'
      reasons: readonly Readonly<{
        code: string
        path: string
        severity: 'warning' | 'error'
      }>[]
    }>
  | Readonly<{
      ok: false
      status: 'unsupported-operation'
      operation: unknown
    }>
  | Readonly<{
      ok: false
      status: 'unsupported-action'
      actions: readonly CaseInsertPresetUnsupportedAction[]
    }>
  | Readonly<{
      ok: false
      status: 'conflicting-actions'
      blockers: readonly Extract<
        CaseInsertPresetPlanBlocker,
        Readonly<{ kind: 'conflicting-field-actions' }>
      >[]
    }>

type CaseInsertPresetApplyPlanningFailure = Exclude<
  CaseInsertPresetApplyPlanningResult,
  Readonly<{ ok: true }>
>

export type CreateCaseInsertPresetResolvedLayoutProposalInput = Readonly<{
  resolution: CaseInsertPresetAssignmentResolutionResult
  expected: PlanCaseInsertPresetFirstApplyInput['expected']
}>

export type CaseInsertPresetResolvedLayoutProposalResult =
  | Readonly<{
      ok: true
      value: ResolvedCaseInsertPresetAssignments
      assignments: readonly ResolvedCaseInsertPresetAssignment[]
      fieldActions: readonly CaseInsertPresetPlanFieldAction[]
      objectCreationActions:
        readonly CaseInsertPresetPlanObjectCreationAction[]
      artworkViewportActions:
        readonly CaseInsertPresetPlanArtworkViewportAction[]
      preservationDecisions:
        readonly CaseInsertPresetPlanPreservationDecision[]
      skips: readonly CaseInsertPresetPlanSkip[]
      warnings: readonly CaseInsertPresetPlanWarning[]
      materialConsentRequirements:
        readonly CaseInsertPresetMaterialConsentRequirement[]
    }>
  | CaseInsertPresetApplyPlanningFailure

export type CaseInsertPresetPlanOwnerRule = Readonly<{
  region: CaseInsertPresetConcreteRegionId
  ownerBasis: CaseInsertPresetCoordinateBasis
  fieldMode: 'background' | 'image' | 'text' | 'text-list'
}>

type PendingFieldAction = Readonly<{
  kind: CaseInsertPresetPlanFieldAction['kind']
  fieldId: CaseInsertPresetPlanFieldId
  currentValue: number | null
  proposedValue: number
  source: CaseInsertPresetPlanSourceAssignment
}>

type PlannedArtworkViewportActions = Readonly<{
  creationAction: CaseInsertPresetPlanObjectCreationAction | null
  viewportAction: CaseInsertPresetPlanArtworkViewportAction
  warnings: readonly CaseInsertPresetPlanWarning[]
  materialConsentRequirements:
    readonly CaseInsertPresetArtworkViewportConsentRequirement[]
}>

const REGION_ORDER = new Map(
  CASE_INSERT_PRESET_CONCRETE_REGION_IDS.map((region, index) => [region, index]),
)
const OWNER_ID_SET = new Set<string>(CASE_INSERT_PRESET_OWNER_IDS)
const ROLE_ID_SET = new Set<string>(CASE_INSERT_PRESET_ROLE_IDS)

const OWNER_RULES = Object.freeze({
  'case.cover.background': ownerRule('front-cover', 'front', 'background'),
  'case.cover.title-artwork': ownerRule('front-cover', 'frontSafe', 'image'),
  'case.cover.text-blocks': ownerRule('front-cover', 'frontSafe', 'text'),
  'case.cover.artwork-slots': ownerRule('front-cover', 'frontSafe', 'image'),
  'case.cover.logo-slots': ownerRule('front-cover', 'frontSafe', 'image'),
  'case.cover.mark-slots': ownerRule('front-cover', 'frontSafe', 'image'),
  'case.tray.background': ownerRule('tray-card', 'back', 'background'),
  'case.tray.title-artwork': ownerRule('back-panel', 'backPanelSafe', 'image'),
  'case.tray.text-blocks': ownerRule('back-panel', 'backPanelSafe', 'text'),
  'case.tray.text-lists': ownerRule('back-panel', 'backPanelSafe', 'text-list'),
  'case.tray.artwork-slots': ownerRule('back-panel', 'backPanelSafe', 'image'),
  'case.tray.logo-slots': ownerRule('back-panel', 'backPanelSafe', 'image'),
  'case.tray.mark-slots': ownerRule('back-panel', 'backPanelSafe', 'image'),
  'case.spine.left.background': ownerRule('left-spine', 'leftSpine', 'background'),
  'case.spine.left.title-artwork': ownerRule('left-spine', 'leftSpineSafe', 'image'),
  'case.spine.left.title-text': ownerRule('left-spine', 'leftSpineSafe', 'text'),
  'case.spine.left.text-blocks': ownerRule('left-spine', 'leftSpineSafe', 'text'),
  'case.spine.left.logo-slots': ownerRule('left-spine', 'leftSpineSafe', 'image'),
  'case.spine.left.mark-slots': ownerRule('left-spine', 'leftSpineSafe', 'image'),
  'case.spine.right.background': ownerRule('right-spine', 'rightSpine', 'background'),
  'case.spine.right.title-artwork': ownerRule('right-spine', 'rightSpineSafe', 'image'),
  'case.spine.right.title-text': ownerRule('right-spine', 'rightSpineSafe', 'text'),
  'case.spine.right.text-blocks': ownerRule('right-spine', 'rightSpineSafe', 'text'),
  'case.spine.right.logo-slots': ownerRule('right-spine', 'rightSpineSafe', 'image'),
  'case.spine.right.mark-slots': ownerRule('right-spine', 'rightSpineSafe', 'image'),
} satisfies Readonly<Record<CaseInsertPresetOwnerId, CaseInsertPresetPlanOwnerRule>>)

const FIELD_ORDER = new Map<CaseInsertPresetPlanFieldId, number>([
  ['layout-x', 0],
  ['layout-y', 1],
  ['layout-scale', 2],
  ['layout-width', 3],
])

function ownerRule(
  region: CaseInsertPresetConcreteRegionId,
  ownerBasis: CaseInsertPresetCoordinateBasis,
  fieldMode: CaseInsertPresetPlanOwnerRule['fieldMode'],
): CaseInsertPresetPlanOwnerRule {
  return Object.freeze({ region, ownerBasis, fieldMode })
}

export function getCaseInsertPresetPlanOwnerRule(
  ownerId: unknown,
): CaseInsertPresetPlanOwnerRule | null {
  return typeof ownerId === 'string' && OWNER_ID_SET.has(ownerId)
    ? OWNER_RULES[ownerId as CaseInsertPresetOwnerId]
    : null
}

function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== 'object') {
    return value
  }
  for (const child of Object.values(value as Record<string, unknown>)) {
    deepFreeze(child)
  }
  return Object.freeze(value)
}

function sameValue(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true
  if (Array.isArray(left) || Array.isArray(right)) {
    return Array.isArray(left) && Array.isArray(right) &&
      left.length === right.length &&
      left.every((item, index) => sameValue(item, right[index]))
  }
  if (!left || !right || typeof left !== 'object' ||
      typeof right !== 'object') return false
  const leftRecord = left as Readonly<Record<string, unknown>>
  const rightRecord = right as Readonly<Record<string, unknown>>
  const leftKeys = Object.keys(leftRecord).sort()
  const rightKeys = Object.keys(rightRecord).sort()
  return leftKeys.length === rightKeys.length &&
    leftKeys.every((key, index) => key === rightKeys[index] &&
      sameValue(leftRecord[key], rightRecord[key]))
}

function isDeeplyFrozen(value: unknown): boolean {
  if (value === null || typeof value !== 'object') return true
  return Object.isFrozen(value) && Object.values(value).every(isDeeplyFrozen)
}

function sameNumber(left: number | null, right: number) {
  return left !== null && left === right
}

function sameScope(left: unknown, right: unknown) {
  const parsedLeft = parseCaseInsertPresetApplicationScope(left)
  const parsedRight = parseCaseInsertPresetApplicationScope(right)
  return parsedLeft.ok && parsedRight.ok &&
    getCaseInsertPresetApplicationScopeKey(parsedLeft.value) ===
      getCaseInsertPresetApplicationScopeKey(parsedRight.value)
}

function isSnapshotIdentity(
  value: unknown,
): value is CaseInsertPresetAssignmentSnapshotIdentity {
  if (!value || typeof value !== 'object') return false
  const identity = value as Record<string, unknown>
  if (!identity.template || typeof identity.template !== 'object') return false
  const template = identity.template as Record<string, unknown>
  return typeof identity.sessionId === 'string' &&
    identity.sessionId.trim().length > 0 &&
    typeof identity.projectRevision === 'number' &&
    Number.isSafeInteger(identity.projectRevision) &&
    identity.projectRevision >= 0 &&
    typeof template.id === 'string' &&
    template.id.trim().length > 0 &&
    template.revision === null &&
    isCaseInsertPresetAggregateContentIdentity(
      identity.aggregateContentIdentity,
    )
}

function staleDimensions(
  actual: CaseInsertPresetAssignmentSnapshotIdentity,
  expected: CaseInsertPresetAssignmentSnapshotIdentity,
) {
  const dimensions: (
    | 'session-id'
    | 'project-revision'
    | 'template-id'
    | 'template-revision'
    | 'aggregate-content'
  )[] = []
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

function invalid(code: string): CaseInsertPresetApplyPlanningFailure {
  return deepFreeze({ ok: false, status: 'invalid-resolution', code })
}

function mapResolutionFailure(
  resolution: Extract<CaseInsertPresetAssignmentResolutionResult, { ok: false }>,
): CaseInsertPresetApplyPlanningFailure {
  if (resolution.status === 'stale-snapshot') {
    return deepFreeze({
      ok: false,
      status: 'stale-resolution',
      dimensions: [...resolution.dimensions],
    })
  }
  if (resolution.status === 'incompatible') {
    return deepFreeze({
      ok: false,
      status: 'incompatible-resolution',
      reasons: resolution.reasons.map((reason) => ({ ...reason })),
    })
  }
  return invalid(`resolver-${resolution.status}`)
}

function isFiniteLayout(layout: unknown): layout is Readonly<ProjectCaseInsertLayout> {
  if (!layout || typeof layout !== 'object') return false
  const value = layout as Record<string, unknown>
  return ['scale', 'x', 'y', 'rotation'].every((field) =>
    typeof value[field] === 'number' && Number.isFinite(value[field])) &&
    (value.width === undefined ||
      (typeof value.width === 'number' && Number.isFinite(value.width))) &&
    (value.fontSizePt === undefined ||
      (typeof value.fontSizePt === 'number' && Number.isFinite(value.fontSizePt)))
}

function isResolvedAssignmentStructurallyValid(
  assignment: ResolvedCaseInsertPresetAssignment,
  value: ResolvedCaseInsertPresetAssignments,
) {
  if (assignment.presetId !== value.preset.id ||
      assignment.presetRevision !== value.preset.revision ||
      !ROLE_ID_SET.has(assignment.roleId) ||
      !OWNER_ID_SET.has(assignment.ownerId) ||
      OWNER_RULES[assignment.ownerId].region !== assignment.region ||
      !isCaseInsertPresetCoordinateBasisAllowed(
        assignment.region,
        assignment.coordinateBasis,
      ) ||
      !value.resolvedRegions.includes(assignment.region) ||
      !assignment.assignmentId.startsWith('case:preset-assignment:') ||
      !assignment.slotId.startsWith('case:preset-slot:') ||
      !assignment.object.id ||
      (assignment.object.kind !== 'fixed' && assignment.object.kind !== 'repeated')) {
    return false
  }

  if ((assignment.artworkViewport !== undefined &&
      assignment.actionRegion === null) ||
      (assignment.bindingStatus === 'missing-create-empty' &&
        assignment.missingTargetPolicy !== 'create-empty') ||
      ((assignment.bindingStatus === 'missing-optional' ||
        assignment.bindingStatus === 'missing-required') &&
        assignment.missingTargetPolicy === 'create-empty')) {
    return false
  }

  const missing = assignment.bindingStatus === 'missing-create-empty' ||
    assignment.bindingStatus === 'missing-optional' ||
    assignment.bindingStatus === 'missing-required'
  if (missing) {
    return assignment.currentState === null && assignment.enablement === null
  }
  if (!assignment.currentState || !assignment.enablement ||
      !isFiniteLayout(assignment.currentState.layout) ||
      typeof assignment.currentState.id !== 'string' ||
      assignment.currentState.id.length === 0 ||
      typeof assignment.currentState.enabled !== 'boolean') {
    return false
  }
  if (assignment.object.kind === 'repeated' &&
      assignment.object.id !== assignment.currentState.id) {
    return false
  }
  return assignment.bindingStatus === 'resolved'
    ? assignment.enablement.effectiveEnabled
    : !assignment.enablement.effectiveEnabled
}

function validateResolvedValue(
  value: ResolvedCaseInsertPresetAssignments,
  input: PlanCaseInsertPresetFirstApplyInput,
): CaseInsertPresetApplyPlanningFailure | null {
  if (!isDeeplyFrozen(input.resolution) ||
      !isCaseInsertPresetId(value.preset.id) ||
      !Number.isSafeInteger(value.preset.revision) ||
      value.preset.revision <= 0 ||
      (value.preset.source !== 'builtin' && value.preset.source !== 'user') ||
      !isSnapshotIdentity(value.snapshotIdentity) ||
      !isSnapshotIdentity(input.expected.snapshotIdentity) ||
      input.expected.projectKind !== 'caseInsert' ||
      input.expected.preset.id !== value.preset.id ||
      input.expected.preset.revision !== value.preset.revision ||
      !sameScope(input.expected.requestedScope, value.requestedScope) ||
      value.compatibilityStatus === 'incompatible') {
    return invalid('identity-or-compatibility-mismatch')
  }

  const stale = staleDimensions(
    value.snapshotIdentity,
    input.expected.snapshotIdentity,
  )
  if (stale.length > 0) {
    return deepFreeze({
      ok: false,
      status: 'stale-resolution',
      dimensions: stale,
    })
  }

  const template = caseInsertTemplates[
    value.snapshotIdentity.template.id as keyof typeof caseInsertTemplates
  ]
  const regionSet = new Set(value.resolvedRegions)
  if (!template || value.snapshotIdentity.template.revision !== null ||
      value.resolvedRegions.length === 0 ||
      regionSet.size !== value.resolvedRegions.length ||
      value.resolvedRegions.some((region) => !REGION_ORDER.has(region)) ||
      value.assignments.length === 0 ||
      value.assignments.some((assignment) =>
        !isResolvedAssignmentStructurallyValid(assignment, value))) {
    return invalid('malformed-resolved-value')
  }
  return null
}

function getTemplateRect(
  templateId: string,
  basis: CaseInsertPresetCoordinateBasis,
): TemplateRect | null {
  const template = caseInsertTemplates[
    templateId as keyof typeof caseInsertTemplates
  ]
  return template?.regions.find(({ id }) => id === basis)?.bounds ?? null
}

function normalizedRegionInOwnerBasis(
  assignment: ResolvedCaseInsertPresetAssignment,
  templateId: string,
) {
  const rule = OWNER_RULES[assignment.ownerId]
  const source = getTemplateRect(templateId, assignment.coordinateBasis)
  const owner = getTemplateRect(templateId, rule.ownerBasis)
  if (!source || !owner || owner.widthMm <= 0 || owner.heightMm <= 0) {
    return { ok: false as const, kind: 'unavailable' as const, rule }
  }

  const region = assignment.contentRegion
  const normalized = assignment.coordinateBasis === rule.ownerBasis
    ? { ...region }
    : {
        centerXPercent:
          (source.xMm + source.widthMm * region.centerXPercent / 100 -
            owner.xMm) / owner.widthMm * 100,
        centerYPercent:
          (source.yMm + source.heightMm * region.centerYPercent / 100 -
            owner.yMm) / owner.heightMm * 100,
        widthPercent: source.widthMm * region.widthPercent / owner.widthMm,
        heightPercent: source.heightMm * region.heightPercent / owner.heightMm,
      }
  const left = normalized.centerXPercent - normalized.widthPercent / 2
  const right = normalized.centerXPercent + normalized.widthPercent / 2
  const top = normalized.centerYPercent - normalized.heightPercent / 2
  const bottom = normalized.centerYPercent + normalized.heightPercent / 2
  if (![...Object.values(normalized), left, right, top, bottom].every(Number.isFinite) ||
      left < 0 || right > 100 || top < 0 || bottom > 100) {
    return { ok: false as const, kind: 'outside' as const, rule }
  }
  return { ok: true as const, region: normalized, rule }
}

function sourceAssignment(
  assignment: ResolvedCaseInsertPresetAssignment,
  runtimeId = assignment.currentState?.id ?? assignment.object.id,
  declaredPolicy: CaseInsertPresetPlanSourceAssignment['declaredPolicy'] =
    'normalized-content-region-direct-layout-v1',
): CaseInsertPresetPlanSourceAssignment {
  return deepFreeze({
    presetId: assignment.presetId,
    presetRevision: assignment.presetRevision,
    slotId: assignment.slotId,
    assignmentId: assignment.assignmentId,
    roleId: assignment.roleId,
    region: assignment.region,
    coordinateBasis: assignment.coordinateBasis,
    ownerId: assignment.ownerId,
    object: {
      bindingKind: assignment.object.kind,
      bindingId: assignment.object.id,
      runtimeId,
    },
    declaredPolicy,
  })
}

function provisioningTarget(
  assignment: ResolvedCaseInsertPresetAssignment,
  templateId: string,
  templateRevision: number | null,
): CaseInsertPresetArtworkSlotProvisioningTarget {
  return {
    presetId: assignment.presetId,
    presetRevision: assignment.presetRevision,
    templateId,
    templateRevision,
    slotId: assignment.slotId,
    assignmentId: assignment.assignmentId,
    roleId: assignment.roleId,
    region: assignment.region,
    coordinateBasis: assignment.coordinateBasis,
    ownerId: assignment.ownerId,
    object: { ...assignment.object },
  }
}

function viewportAdoptionTarget(
  capability: CaseInsertPresetArtworkSlotProvisioningCapability,
): CaseInsertArtworkViewportAdoptionTarget {
  return {
    templateId: capability.target.templateId,
    templateRevision: capability.target.templateRevision,
    presetId: capability.target.presetId,
    presetRevision: capability.target.presetRevision,
    slotId: capability.target.slotId,
    assignmentId: capability.target.assignmentId,
    ownerId: capability.target.ownerId,
    objectId: capability.target.object.id,
    coordinateBasis: capability.target.coordinateBasis,
  }
}

function viewportOwnedValues(
  slot: Readonly<ProjectCaseInsertImageSlot>,
): CaseInsertPresetPlanArtworkViewportOwnedValues {
  return {
    layoutX: slot.layout.x,
    layoutY: slot.layout.y,
    layoutScale: slot.layout.scale,
    imageFit: slot.fit,
    reservedArtworkViewport: slot.reservedArtworkViewport
      ? {
          ...slot.reservedArtworkViewport,
          focalPosition: {
            ...slot.reservedArtworkViewport.focalPosition,
          },
        }
      : null,
  }
}

function artworkViewportActionId(
  assignment: ResolvedCaseInsertPresetAssignment,
  evidence: CaseInsertPresetArtworkViewportPlanningSuccess,
) {
  return `case:preset-artwork-viewport-action:v1:${
    createCaseInsertPresetDeterministicIdentityDigest({
      assignmentId: assignment.assignmentId,
      ownerId: assignment.ownerId,
      objectId: assignment.object.id,
      evidenceIdentity: evidence.plan.identity,
    })
  }` as const
}

function objectCreationActionId(
  capability: CaseInsertPresetArtworkSlotProvisioningCapability,
  viewportActionId: CaseInsertPresetPlanArtworkViewportAction['id'],
) {
  return `case:preset-object-creation-action:v1:${
    createCaseInsertPresetDeterministicIdentityDigest({
      target: capability.target,
      viewportActionId,
      insertionPolicy: capability.insertionPolicy,
    })
  }` as const
}

function planArtworkViewportActions(
  assignment: ResolvedCaseInsertPresetAssignment,
  templateId: string,
  templateRevision: number | null,
): PlannedArtworkViewportActions | null {
  if (!assignment.artworkViewport || !assignment.actionRegion) return null
  const capability = getCaseInsertPresetArtworkSlotProvisioningCapability(
    provisioningTarget(assignment, templateId, templateRevision),
  )
  if (!capability) return null

  let targetSlot: Readonly<ProjectCaseInsertImageSlot>
  let targetOrigin: CaseInsertPresetPlanArtworkViewportAction['targetOrigin']
  if (assignment.bindingStatus === 'missing-create-empty') {
    const created = createCaseInsertPresetEmptyArtworkSlot(capability.target)
    if (!created.ok) return null
    targetSlot = created.slot
    targetOrigin = 'planned-creation'
  } else if (assignment.currentState &&
      isImageState(assignment.currentState)) {
    targetSlot = assignment.currentState
    targetOrigin = 'existing'
  } else {
    return null
  }

  const sourceEvidence =
    createCaseInsertPresetArtworkViewportSourceEvidence(targetSlot)
  if (!sourceEvidence.ok) return null
  const evidence = planCaseInsertPresetArtworkViewport({
    assignment: {
      presetId: assignment.presetId,
      presetRevision: assignment.presetRevision,
      slotId: assignment.slotId,
      assignmentId: assignment.assignmentId,
      roleId: assignment.roleId,
      region: assignment.region,
      coordinateBasis: assignment.coordinateBasis,
      ownerId: assignment.ownerId,
      object: { ...assignment.object },
    },
    template: {
      id: templateId,
      revision: templateRevision,
      presetCompatibility: {
        mode: 'specific-template',
        templateId,
        presetId: assignment.presetId,
        presetRevision: assignment.presetRevision,
      },
    },
    action: {
      kind: CASE_INSERT_PRESET_ARTWORK_VIEWPORT_ACTION_KIND,
      formatVersion:
        CASE_INSERT_PRESET_ARTWORK_VIEWPORT_ACTION_FORMAT_VERSION,
      viewport: { ...assignment.actionRegion },
      fitting: assignment.artworkViewport.fitting.mode === 'explicit-crop'
        ? {
            mode: 'explicit-crop',
            sourceWindow: {
              ...assignment.artworkViewport.fitting.sourceWindow,
            },
          }
        : { mode: assignment.artworkViewport.fitting.mode },
    },
    source: sourceEvidence.source,
    capabilities: {
      ownerId: capability.target.ownerId,
      object: { ...capability.target.object },
      viewportGeometry: true,
      contain: true,
      cover: true,
      explicitCropFraming: true,
      focalOffset: true,
      zoom: true,
    },
  })
  if (!evidence.ok) return null

  const adopted = adoptCaseInsertArtworkViewport({
    slot: targetSlot,
    target: viewportAdoptionTarget(capability),
    evidence,
  })
  if (!adopted.ok) return null
  const id = artworkViewportActionId(assignment, evidence)
  const currentValues = targetOrigin === 'existing'
    ? viewportOwnedValues(targetSlot)
    : null
  const proposedValues = viewportOwnedValues(adopted.slot)
  const viewportAction: CaseInsertPresetPlanArtworkViewportAction = {
    id,
    kind: 'adopt-reserved-artwork-viewport',
    source: sourceAssignment(
      assignment,
      capability.target.object.id,
      'reserved-artwork-viewport-v1',
    ),
    target: {
      featureOwnerId: capability.target.ownerId,
      bindingKind: capability.target.object.kind,
      bindingId: capability.target.object.id,
      runtimeObjectId: capability.target.object.id,
    },
    targetOrigin,
    sourceState: sourceEvidence.sourceState,
    evidence,
    currentValues,
    proposedValues,
    ownedFieldIds: [
      'layout-x',
      'layout-y',
      'layout-scale',
      'image-fit',
      'reserved-artwork-viewport',
    ],
    preservedFieldIds: [
      'image-data',
      'image-provenance',
      'image-dimensions',
      'default-steam-logo',
      'label',
      'enabled',
      'frame',
      'layout-rotation',
      'owner-enablement',
      'array-order',
    ],
    semanticNoOp: currentValues !== null &&
      sameValue(currentValues, proposedValues),
    review: {
      actionLabel: `Reserve ${capability.reviewLabel} artwork frame`,
      targetLabel: capability.reviewLabel,
      fittingLabel: evidence.plan.intent.declaration.mode === 'contain'
        ? 'Contain'
        : evidence.plan.intent.declaration.mode === 'cover'
          ? 'Cover'
          : 'Explicit crop',
      sourceStateLabel: evidence.status === 'deferred'
        ? 'Future artwork fitting is deferred until an image is selected'
        : 'Current artwork fitting is fully resolved',
      preservationLabel:
        'Preserves image content, provenance, dimensions, label, enablement, frame, and rotation',
    },
  }
  const creationAction = targetOrigin === 'planned-creation'
    ? {
        id: objectCreationActionId(capability, id),
        kind: 'create-empty-repeated-artwork-slot' as const,
        source: sourceAssignment(
          assignment,
          capability.target.object.id,
          'create-empty-repeated-artwork-slot-v1',
        ),
        target: {
          featureOwnerId: capability.target.ownerId,
          bindingKind: capability.target.object.kind,
          bindingId: capability.target.object.id,
          runtimeObjectId: capability.target.object.id,
        },
        before: { presence: 'absent' as const, exactMatchCount: 0 as const },
        canonicalInitialObject: targetSlot,
        insertionPolicy: capability.insertionPolicy,
        ownedFieldIds: ['object-presence'] as const,
        unownedFieldIds: [
          'image-data',
          'image-provenance',
          'image-dimensions',
          'default-steam-logo',
          'label-after-creation',
          'enabled',
          'frame',
          'array-position-after-creation',
          'owner-enablement',
        ] as const,
        viewportActionId: id,
        semanticNoOp: false as const,
        review: {
          actionLabel: `Create empty ${capability.reviewLabel} slot`,
          targetLabel: capability.reviewLabel,
          initialStateLabel: 'Empty and disabled' as const,
          insertionLabel:
            'Append after existing Tray artwork without reordering it' as const,
          preservationLabel:
            'Does not select, import, populate, or enable screenshot artwork' as const,
        },
      } satisfies CaseInsertPresetPlanObjectCreationAction
    : null
  const warnings: CaseInsertPresetPlanWarning[] = [
    ...evidence.plan.warnings,
  ]
  if (evidence.status === 'deferred' &&
      evidence.plan.intent.declaration.mode === 'cover') {
    warnings.push({
      id: `case:preset-warning:v1:artwork-fitting-deferred:${
        createCaseInsertPresetDeterministicIdentityDigest({
          assignmentId: assignment.assignmentId,
          viewportIdentity: evidence.plan.viewport.identity,
          intentIdentity: evidence.plan.intent.identity,
        })
      }`,
      kind: 'artwork-cover-fitting-deferred',
      assignmentId: assignment.assignmentId,
      ownerId: capability.target.ownerId,
      objectId: capability.target.object.id,
      fittingMode: 'cover',
      reviewMessage: 'Future artwork will use Cover and may be cropped.',
    })
  }

  return deepFreeze({
    creationAction,
    viewportAction,
    warnings,
    materialConsentRequirements: [
      ...evidence.plan.materialConsentRequirements,
    ],
  })
}

function pendingAction(
  kind: PendingFieldAction['kind'],
  fieldId: CaseInsertPresetPlanFieldId,
  currentValue: number | null,
  proposedValue: number,
  source: CaseInsertPresetPlanSourceAssignment,
): PendingFieldAction {
  return { kind, fieldId, currentValue, proposedValue, source }
}

function buildPendingActions(
  assignment: ResolvedCaseInsertPresetAssignment,
  templateId: string,
):
  | Readonly<{ ok: true; actions: readonly PendingFieldAction[] }>
  | Readonly<{ ok: false; blocker: CaseInsertPresetPlanBlocker }> {
  const converted = normalizedRegionInOwnerBasis(assignment, templateId)
  if (!converted.ok) {
    return {
      ok: false,
      blocker: {
        kind: converted.kind === 'outside'
          ? 'geometry-outside-owner-basis'
          : 'geometry-unavailable',
        assignmentId: assignment.assignmentId,
        coordinateBasis: assignment.coordinateBasis,
        ownerBasis: converted.rule.ownerBasis,
      },
    }
  }

  const layout = assignment.currentState!.layout
  const source = sourceAssignment(assignment)
  const { fieldMode } = converted.rule
  const actions: PendingFieldAction[] = []
  const proposedX = fieldMode === 'background'
    ? (converted.region.centerXPercent - 50) * 2
    : converted.region.centerXPercent
  const proposedY = fieldMode === 'background'
    ? (converted.region.centerYPercent - 50) * 2
    : converted.region.centerYPercent
  actions.push(pendingAction(
    'set-layout-x',
    'layout-x',
    layout.x,
    proposedX,
    source,
  ))
  actions.push(pendingAction(
    'set-layout-y',
    'layout-y',
    layout.y,
    proposedY,
    source,
  ))

  if (fieldMode === 'background' || fieldMode === 'image') {
    actions.push(pendingAction(
      'set-layout-scale',
      'layout-scale',
      layout.scale,
      Math.min(
        converted.region.widthPercent,
        converted.region.heightPercent,
      ) / 100,
      source,
    ))
  } else {
    actions.push(pendingAction(
      'set-layout-width',
      'layout-width',
      layout.width ?? null,
      converted.region.widthPercent,
      source,
    ))
  }

  return { ok: true, actions }
}

function assignmentSort(
  left: ResolvedCaseInsertPresetAssignment,
  right: ResolvedCaseInsertPresetAssignment,
) {
  return (REGION_ORDER.get(left.region) ?? 99) -
      (REGION_ORDER.get(right.region) ?? 99) ||
    left.slotId.localeCompare(right.slotId) ||
    left.assignmentId.localeCompare(right.assignmentId)
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

function actionSort(
  left: CaseInsertPresetPlanFieldAction,
  right: CaseInsertPresetPlanFieldAction,
) {
  const leftSource = left.sources[0]!
  const rightSource = right.sources[0]!
  return (REGION_ORDER.get(leftSource.region) ?? 99) -
      (REGION_ORDER.get(rightSource.region) ?? 99) ||
    left.featureOwnerId.localeCompare(right.featureOwnerId) ||
    left.object.runtimeId.localeCompare(right.object.runtimeId) ||
    (FIELD_ORDER.get(left.fieldId) ?? 99) - (FIELD_ORDER.get(right.fieldId) ?? 99)
}

function coalesceActions(pending: readonly PendingFieldAction[]) {
  const byField = new Map<string, PendingFieldAction[]>()
  for (const action of pending) {
    const key = [
      action.source.ownerId,
      action.source.object.runtimeId,
      action.fieldId,
    ].join('\u0000')
    const existing = byField.get(key) ?? []
    existing.push(action)
    byField.set(key, existing)
  }

  const actions: CaseInsertPresetPlanFieldAction[] = []
  const conflicts: Extract<
    CaseInsertPresetPlanBlocker,
    Readonly<{ kind: 'conflicting-field-actions' }>
  >[] = []
  for (const group of byField.values()) {
    const first = group[0]!
    const proposedValues = [...new Set(group.map(({ proposedValue }) => proposedValue))]
      .sort((left, right) => left - right)
    const currentValues = [...new Set(group.map(({ currentValue }) => currentValue))]
    const sources = group.map(({ source }) => source).sort(sourceSort)
    if (proposedValues.length > 1) {
      conflicts.push({
        kind: 'conflicting-field-actions',
        ownerId: first.source.ownerId,
        runtimeObjectId: first.source.object.runtimeId,
        fieldId: first.fieldId,
        proposedValues,
        assignmentIds: sources.map(({ assignmentId }) => assignmentId),
      })
      continue
    }
    if (currentValues.length > 1) return { invalid: true as const }
    const proposedValue = proposedValues[0]!
    actions.push({
      id: [
        'case:preset-field-action',
        first.source.ownerId,
        first.source.object.runtimeId,
        first.fieldId,
      ].join(':'),
      kind: first.kind,
      featureOwnerId: first.source.ownerId,
      object: { ...first.source.object },
      fieldId: first.fieldId,
      currentValue: currentValues[0]!,
      proposedValue,
      semanticNoOp: sameNumber(currentValues[0]!, proposedValue),
      preservationClassification: 'layout-only-preserve-content',
      consentClassification: 'ordinary-reviewed-layout',
      sources,
    } as CaseInsertPresetPlanFieldAction)
  }
  actions.sort(actionSort)
  conflicts.sort((left, right) =>
    left.ownerId.localeCompare(right.ownerId) ||
    left.runtimeObjectId.localeCompare(right.runtimeObjectId) ||
    (FIELD_ORDER.get(left.fieldId) ?? 99) -
      (FIELD_ORDER.get(right.fieldId) ?? 99))
  return { invalid: false as const, actions, conflicts }
}

function isImageState(
  state: CaseInsertPresetSnapshotObjectState,
): state is CaseInsertPresetSnapshotObjectState &
  Readonly<ProjectCaseInsertImageSlot> {
  return 'imageDataUrl' in state
}

function preservationCategories(
  assignment: ResolvedCaseInsertPresetAssignment,
) {
  const categories: CaseInsertPresetPlanPreservationCategory[] = [
    'enablement-and-disabled-payload',
    'untargeted-object-fields',
  ]
  if (assignment.object.kind === 'repeated') {
    categories.push('repeated-object-identity')
  }
  if (assignment.currentState && isImageState(assignment.currentState)) {
    categories.push(
      'image-bytes',
      'image-provenance',
      'branding-selection-and-custom-assets',
      'frame-material-and-style',
      'fit-crop-and-rotation',
    )
  } else if (assignment.currentState) {
    categories.push(
      'text-content',
      'rich-text-content',
      'metadata-source-and-manual-override',
      'frame-material-and-style',
      'fit-crop-and-rotation',
    )
  }
  return categories.sort()
}

function buildPreservationDecisions(
  assignments: readonly ResolvedCaseInsertPresetAssignment[],
) {
  const decisions: CaseInsertPresetPlanPreservationDecision[] = []
  for (const assignment of assignments) {
    for (const category of preservationCategories(assignment)) {
      decisions.push({
        id: `case:preset-preservation:${assignment.assignmentId}:${category}`,
        assignmentId: assignment.assignmentId,
        category,
        classification: 'preserved',
        evidence: {
          ownerId: assignment.ownerId,
          objectId: assignment.currentState?.id ?? assignment.object.id,
          present: assignment.currentState !== null,
        },
      })
    }
  }
  decisions.push({
    id: 'case:preset-preservation:aggregate:owners-outside-requested-scope',
    assignmentId: null,
    category: 'owners-outside-requested-scope',
    classification: 'preserved',
    evidence: { ownerId: null, objectId: null, present: true },
  })
  return decisions
}

function warningSort(
  left: CaseInsertPresetPlanWarning,
  right: CaseInsertPresetPlanWarning,
) {
  return left.kind.localeCompare(right.kind) ||
    ('assignmentId' in left ? left.assignmentId : '').localeCompare(
      'assignmentId' in right ? right.assignmentId : '',
    )
}

function buildWarnings(
  assignments: readonly ResolvedCaseInsertPresetAssignment[],
  regions: readonly CaseInsertPresetConcreteRegionId[],
) {
  const warnings: CaseInsertPresetPlanWarning[] = []
  for (const assignment of assignments) {
    if (assignment.bindingStatus === 'resolved-disabled') {
      warnings.push({
        kind: 'disabled-target-layout-only',
        assignmentId: assignment.assignmentId,
        ownerId: assignment.ownerId,
        objectId: assignment.object.id,
      })
    }
    if (assignment.region === 'tray-card' &&
        (assignment.coordinateBasis === 'back' ||
          assignment.coordinateBasis === 'backSafe')) {
      warnings.push({
        kind: 'complete-tray-span',
        assignmentId: assignment.assignmentId,
        coordinateBasis: assignment.coordinateBasis,
      })
    }
    if (assignment.currentState &&
        !isImageState(assignment.currentState)) {
      warnings.push({
        kind: 'text-height-fitting-deferred',
        assignmentId: assignment.assignmentId,
        issue: 181,
      })
    }
  }
  if (regions.length > 1) {
    warnings.push({
      kind: 'multiple-concrete-regions',
      regions: [...regions],
      assignmentIds: assignments.map(({ assignmentId }) => assignmentId),
    })
  }
  return warnings.sort(warningSort)
}

function buildAssignmentSummaries(
  assignments: readonly ResolvedCaseInsertPresetAssignment[],
  fieldActions: readonly CaseInsertPresetPlanFieldAction[],
  objectCreationActions:
    readonly CaseInsertPresetPlanObjectCreationAction[],
  artworkViewportActions:
    readonly CaseInsertPresetPlanArtworkViewportAction[],
  decisions: readonly CaseInsertPresetPlanPreservationDecision[],
  skips: readonly CaseInsertPresetPlanSkip[],
) {
  return assignments.map((assignment) => {
    const actionIds = fieldActions
      .filter(({ sources }) => sources.some(({ assignmentId }) =>
        assignmentId === assignment.assignmentId))
      .map(({ id }) => id)
    const preservationDecisionIds = decisions
      .filter(({ assignmentId }) => assignmentId === assignment.assignmentId)
      .map(({ id }) => id)
    const skip = skips.find(({ assignmentId }) =>
      assignmentId === assignment.assignmentId) ?? null
    const objectCreationActionId = objectCreationActions.find(
      ({ source }) => source.assignmentId === assignment.assignmentId,
    )?.id ?? null
    const artworkViewportActionId = artworkViewportActions.find(
      ({ source }) => source.assignmentId === assignment.assignmentId,
    )?.id ?? null
    const viewportNoOp = artworkViewportActionId === null ||
      artworkViewportActions.find(
        ({ id }) => id === artworkViewportActionId,
      )?.semanticNoOp === true
    return {
      assignmentId: assignment.assignmentId,
      slotId: assignment.slotId,
      roleId: assignment.roleId,
      region: assignment.region,
      ownerId: assignment.ownerId,
      objectId: assignment.object.id,
      object: {
        bindingKind: assignment.object.kind,
        bindingId: assignment.object.id,
        runtimeId: assignment.currentState?.id ?? null,
      },
      bindingStatus: assignment.bindingStatus,
      expectedEnablement: assignment.enablement
        ? { ...assignment.enablement }
        : null,
      fieldActionIds: actionIds,
      objectCreationActionId,
      artworkViewportActionId,
      preservationDecisionIds,
      skip,
      semanticNoOp: objectCreationActionId === null && viewportNoOp &&
        (actionIds.length === 0 || fieldActions
          .filter(({ id }) => actionIds.includes(id))
          .every(({ semanticNoOp }) => semanticNoOp)),
    }
  })
}

export function planCaseInsertPresetFirstApply(
  input: PlanCaseInsertPresetFirstApplyInput,
): CaseInsertPresetApplyPlanningResult {
  if (input.operation !== 'apply') {
    return deepFreeze({
      ok: false,
      status: 'unsupported-operation',
      operation: typeof input.operation === 'string' ? input.operation : null,
    })
  }
  const proposal = createCaseInsertPresetResolvedLayoutProposal({
    resolution: input.resolution,
    expected: input.expected,
  })
  if (!proposal.ok) return proposal

  const {
    value,
    assignments,
    fieldActions,
    objectCreationActions,
    artworkViewportActions,
    preservationDecisions,
    skips,
    warnings,
    materialConsentRequirements,
  } = proposal
  const changedFieldActionCount = fieldActions.filter(
    ({ semanticNoOp }) => !semanticNoOp,
  ).length
  const changedArtworkViewportActionCount = artworkViewportActions.filter(
    ({ semanticNoOp }) => !semanticNoOp,
  ).length
  const aggregateNoOp = changedFieldActionCount === 0 &&
    objectCreationActions.length === 0 &&
    changedArtworkViewportActionCount === 0
  const requestedScope = parseCaseInsertPresetApplicationScope(
    value.requestedScope,
  )
  if (!requestedScope.ok) return invalid('resolved-scope-invalid')
  const scopeKey = getCaseInsertPresetApplicationScopeKey(requestedScope.value)
  const fieldFootprint = fieldActions.map((action) => ({
    featureOwnerId: action.featureOwnerId,
    runtimeObjectId: action.object.runtimeId,
    fieldId: action.fieldId,
    acceptedValueCandidate: action.proposedValue,
    sourceAssignmentIds: action.sources.map(({ assignmentId }) => assignmentId),
  }))
  const planContent: Omit<CaseInsertPresetApplyPlan, 'reviewIdentity'> = {
    kind: CASE_INSERT_PRESET_APPLY_PLAN_KIND,
    formatVersion: CASE_INSERT_PRESET_APPLY_PLAN_FORMAT_VERSION,
    identity: {
      operation: 'apply',
      presetId: value.preset.id,
      presetRevision: value.preset.revision,
      sessionId: value.snapshotIdentity.sessionId,
      projectRevision: value.snapshotIdentity.projectRevision,
      scopeKey,
    },
    operation: 'apply',
    preset: { ...value.preset },
    requestedScope: { ...requestedScope.value } as CaseInsertPresetApplicationScope,
    resolvedRegions: [...value.resolvedRegions],
    source: {
      projectKind: 'caseInsert',
      snapshotIdentity: {
        sessionId: value.snapshotIdentity.sessionId,
        projectRevision: value.snapshotIdentity.projectRevision,
        template: { ...value.snapshotIdentity.template },
        aggregateContentIdentity:
          value.snapshotIdentity.aggregateContentIdentity,
      },
    },
    assignments: buildAssignmentSummaries(
      assignments,
      fieldActions,
      objectCreationActions,
      artworkViewportActions,
      preservationDecisions,
      skips,
    ),
    fieldActions,
    objectCreationActions,
    artworkViewportActions,
    preservationDecisions,
    skips,
    warnings,
    blockers: [],
    materialConsentRequirements,
    semanticNoOp: {
      aggregate: aggregateNoOp,
      fieldActionCount: fieldActions.length,
      changedFieldActionCount,
      noOpFieldActionCount: fieldActions.length - changedFieldActionCount,
      objectCreationActionCount: objectCreationActions.length,
      changedArtworkViewportActionCount,
      noOpArtworkViewportActionCount:
        artworkViewportActions.length - changedArtworkViewportActionCount,
    },
    preconditions: {
      sessionId: value.snapshotIdentity.sessionId,
      projectRevision: value.snapshotIdentity.projectRevision,
      projectKind: 'caseInsert',
      template: { ...value.snapshotIdentity.template },
      aggregateContentIdentity:
        value.snapshotIdentity.aggregateContentIdentity,
      preset: { id: value.preset.id, revision: value.preset.revision },
      scopeKey,
      resolvedRegions: [...value.resolvedRegions],
    },
    fieldFootprint,
  }
  const plan: CaseInsertPresetApplyPlan = deepFreeze({
    ...planContent,
    reviewIdentity: createCaseInsertPresetApplyPlanReviewIdentity(planContent),
  })

  return deepFreeze({
    ok: true,
    status: aggregateNoOp ? 'semantic-no-op' : 'planned',
    plan,
  })
}

export function createCaseInsertPresetResolvedLayoutProposal(
  input: CreateCaseInsertPresetResolvedLayoutProposalInput,
): CaseInsertPresetResolvedLayoutProposalResult {
  if (!input.resolution.ok) return mapResolutionFailure(input.resolution)

  const value = input.resolution.value
  const invalidResult = validateResolvedValue(value, {
    operation: 'apply',
    resolution: input.resolution,
    expected: input.expected,
  })
  if (invalidResult) return invalidResult as Exclude<
    CaseInsertPresetApplyPlanningResult,
    Readonly<{ ok: true }> |
    Readonly<{ ok: false; status: 'unsupported-operation' }>
  >

  const assignments = [...value.assignments].sort(assignmentSort)
  const blockers: CaseInsertPresetPlanBlocker[] = []
  const unsupported: CaseInsertPresetUnsupportedAction[] = []
  const skips: CaseInsertPresetPlanSkip[] = []
  const pending: PendingFieldAction[] = []
  const objectCreationActions: CaseInsertPresetPlanObjectCreationAction[] = []
  const artworkViewportActions: CaseInsertPresetPlanArtworkViewportAction[] = []
  const artworkViewportWarnings: CaseInsertPresetPlanWarning[] = []
  const artworkViewportConsentRequirements:
    CaseInsertPresetArtworkViewportConsentRequirement[] = []

  for (const assignment of assignments) {
    if (assignment.bindingStatus === 'missing-required') {
      blockers.push({
        kind: 'missing-required-target',
        assignmentId: assignment.assignmentId,
        ownerId: assignment.ownerId,
        objectId: assignment.object.id,
      })
      continue
    }
    if (assignment.bindingStatus === 'missing-optional') {
      skips.push({
        kind: 'missing-optional-target',
        assignmentId: assignment.assignmentId,
        slotId: assignment.slotId,
        region: assignment.region,
        ownerId: assignment.ownerId,
        objectId: assignment.object.id,
      })
      continue
    }
    if (assignment.artworkViewport) {
      const planned = planArtworkViewportActions(
        assignment,
        value.snapshotIdentity.template.id,
        value.snapshotIdentity.template.revision,
      )
      if (!planned) {
        unsupported.push({
          kind: assignment.bindingStatus === 'missing-create-empty'
            ? 'empty-target-creation-unsupported'
            : 'artwork-viewport-planning-unavailable',
          assignmentId: assignment.assignmentId,
          ownerId: assignment.ownerId,
          objectId: assignment.object.id,
          coordinateBasis: assignment.coordinateBasis,
        })
        continue
      }
      if (planned.creationAction) {
        objectCreationActions.push(planned.creationAction)
      }
      artworkViewportActions.push(planned.viewportAction)
      artworkViewportWarnings.push(...planned.warnings)
      artworkViewportConsentRequirements.push(
        ...planned.materialConsentRequirements,
      )
      continue
    }
    if (assignment.bindingStatus === 'missing-create-empty') {
      unsupported.push({
        kind: 'empty-target-creation-unsupported',
        assignmentId: assignment.assignmentId,
        ownerId: assignment.ownerId,
        objectId: assignment.object.id,
        coordinateBasis: assignment.coordinateBasis,
      })
      continue
    }
    if (assignment.actionRegion) {
      unsupported.push({
        kind: assignment.currentState && !isImageState(assignment.currentState)
          ? 'text-fitting-unavailable'
          : 'action-region-policy-unavailable',
        assignmentId: assignment.assignmentId,
        ownerId: assignment.ownerId,
        objectId: assignment.object.id,
        coordinateBasis: assignment.coordinateBasis,
      })
      continue
    }
    const planned = buildPendingActions(
      assignment,
      value.snapshotIdentity.template.id,
    )
    if (!planned.ok) blockers.push(planned.blocker)
    else pending.push(...planned.actions)
  }

  if (unsupported.length > 0) {
    unsupported.sort((left, right) =>
      left.assignmentId.localeCompare(right.assignmentId))
    return deepFreeze({
      ok: false,
      status: 'unsupported-action',
      actions: unsupported,
    })
  }
  if (blockers.length > 0) {
    blockers.sort((left, right) =>
      ('assignmentId' in left ? left.assignmentId : '').localeCompare(
        'assignmentId' in right ? right.assignmentId : '',
      ))
    return deepFreeze({ ok: false, status: 'blocked', blockers })
  }

  const coalesced = coalesceActions(pending)
  if (coalesced.invalid) return invalid('inconsistent-current-field-values')
  if (coalesced.conflicts.length > 0) {
    return deepFreeze({
      ok: false,
      status: 'conflicting-actions',
      blockers: coalesced.conflicts,
    })
  }

  const fieldActions = coalesced.actions
  objectCreationActions.sort((left, right) => {
    const leftCapability =
      getCaseInsertPresetArtworkSlotProvisioningCapability({
        presetId: left.source.presetId,
        presetRevision: left.source.presetRevision,
        templateId: value.snapshotIdentity.template.id,
        templateRevision: value.snapshotIdentity.template.revision,
        slotId: left.source.slotId,
        assignmentId: left.source.assignmentId,
        roleId: left.source.roleId,
        region: left.source.region,
        coordinateBasis: left.source.coordinateBasis,
        ownerId: left.source.ownerId,
        object: {
          kind: left.source.object.bindingKind,
          id: left.source.object.bindingId,
        },
      })
    const rightCapability =
      getCaseInsertPresetArtworkSlotProvisioningCapability({
        presetId: right.source.presetId,
        presetRevision: right.source.presetRevision,
        templateId: value.snapshotIdentity.template.id,
        templateRevision: value.snapshotIdentity.template.revision,
        slotId: right.source.slotId,
        assignmentId: right.source.assignmentId,
        roleId: right.source.roleId,
        region: right.source.region,
        coordinateBasis: right.source.coordinateBasis,
        ownerId: right.source.ownerId,
        object: {
          kind: right.source.object.bindingKind,
          id: right.source.object.bindingId,
        },
      })
    return (leftCapability?.slotNumber ?? 99) -
      (rightCapability?.slotNumber ?? 99)
  })
  const viewportOrder = new Map(
    objectCreationActions.map((action, index) => [
      action.viewportActionId,
      index,
    ]),
  )
  artworkViewportActions.sort((left, right) =>
    (viewportOrder.get(left.id) ?? 99) -
      (viewportOrder.get(right.id) ?? 99) ||
    left.source.assignmentId.localeCompare(right.source.assignmentId))
  const preservationDecisions = buildPreservationDecisions(assignments)
  const warnings = [
    ...buildWarnings(assignments, value.resolvedRegions),
    ...artworkViewportWarnings,
  ].sort(warningSort)
  const changedFieldActionCount = fieldActions.filter(
    ({ semanticNoOp }) => !semanticNoOp,
  ).length
  const materialConsentRequirements: CaseInsertPresetMaterialConsentRequirement[] = []
  if (value.resolvedRegions.length > 1 && changedFieldActionCount > 0) {
    const requirement = {
      kind: 'multiple-concrete-regions' as const,
      regions: [...value.resolvedRegions],
      assignmentIds: assignments
        .filter(({ bindingStatus }) =>
          bindingStatus === 'resolved' ||
          bindingStatus === 'resolved-disabled')
        .map(({ assignmentId }) => assignmentId),
    }
    materialConsentRequirements.push({
      id: createCaseInsertPresetMaterialConsentRequirementId(requirement),
      ...requirement,
    })
  }
  materialConsentRequirements.push(...artworkViewportConsentRequirements)
  return deepFreeze({
    ok: true,
    value,
    assignments,
    fieldActions,
    objectCreationActions,
    artworkViewportActions,
    preservationDecisions,
    skips,
    warnings,
    materialConsentRequirements,
  })
}
