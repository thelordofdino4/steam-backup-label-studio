import { getImageContentSourceRect } from '../image/imageContentBounds.ts'
import type {
  BackgroundImageSize,
  ImageContentBounds,
} from '../project/projectTypes.ts'
import { caseInsertTemplates } from '../templates/caseInsertTemplates.ts'
import {
  CASE_INSERT_PRESET_CONCRETE_REGION_IDS,
  CASE_INSERT_PRESET_COORDINATE_BASES,
  CASE_INSERT_PRESET_MAX_OBJECT_ID_LENGTH,
  CASE_INSERT_PRESET_MAX_TEMPLATE_ID_LENGTH,
  CASE_INSERT_PRESET_OWNER_IDS,
  CASE_INSERT_PRESET_ROLE_IDS,
  isCaseInsertPresetCoordinateBasisAllowed,
  isCaseInsertPresetId,
  isCaseInsertPresetOwnerBindingCompatible,
  type CaseInsertPresetConcreteRegionId,
  type CaseInsertPresetCoordinateBasis,
  type CaseInsertPresetId,
  type CaseInsertPresetNormalizedRegion,
  type CaseInsertPresetObjectBinding,
  type CaseInsertPresetOwnerId,
  type CaseInsertPresetRoleId,
  type CaseInsertPresetTemplateCompatibility,
} from './caseInsertPresetDefinition.ts'
import {
  createCaseInsertPresetIdentityDigestFromChunks,
} from './caseInsertPresetIdentityDigest.ts'
import {
  cloneCaseInsertPresetPlainInput,
  deepFreezeCaseInsertPresetValue,
  hasExactCaseInsertPresetKeys,
  type CaseInsertPresetPlainRecord,
} from './caseInsertPresetSafeInput.ts'

export const CASE_INSERT_PRESET_ARTWORK_VIEWPORT_ACTION_KIND =
  'sbls/case-insert-preset-artwork-viewport-action' as const
export const CASE_INSERT_PRESET_ARTWORK_VIEWPORT_ACTION_FORMAT_VERSION = 1 as const
export const CASE_INSERT_PRESET_ARTWORK_VIEWPORT_PLAN_KIND =
  'sbls/case-insert-preset-artwork-viewport-plan' as const
export const CASE_INSERT_PRESET_ARTWORK_VIEWPORT_PLAN_FORMAT_VERSION = 1 as const
export const CASE_INSERT_PRESET_ARTWORK_CROP_ASPECT_TOLERANCE = 1e-12

/**
 * Viewport action v1 extends the definition-v1 owner vocabulary only for
 * ordinary repeated Spine artwork. Definition v1, its canonical owner list,
 * and its Apply/Reapply/Detach resolvers intentionally remain unchanged.
 */
export const CASE_INSERT_PRESET_ARTWORK_VIEWPORT_OWNER_IDS_V1 = Object.freeze([
  ...CASE_INSERT_PRESET_OWNER_IDS,
  'case.spine.left.artwork-slots',
  'case.spine.right.artwork-slots',
] as const)

export type CaseInsertPresetArtworkViewportOwnerIdV1 =
  typeof CASE_INSERT_PRESET_ARTWORK_VIEWPORT_OWNER_IDS_V1[number]

const CASE_INSERT_PRESET_ARTWORK_NUMERIC_TOLERANCE = Number.EPSILON * 64
const CASE_INSERT_PRESET_ARTWORK_MAX_IDENTITY_LENGTH = 512

const SLOT_ID_PATTERN = /^case:preset-slot:[a-z0-9]+(?:-[a-z0-9]+)*$/
const ASSIGNMENT_ID_PATTERN =
  /^case:preset-assignment:[a-z0-9]+(?:-[a-z0-9]+)*$/
const REPEATED_OBJECT_ID_PATTERN =
  /^[a-z][a-z0-9]*(?:(?:-|:)[a-z0-9]+)*$/

const REGION_IDS = new Set<string>(CASE_INSERT_PRESET_CONCRETE_REGION_IDS)
const COORDINATE_BASES = new Set<string>(CASE_INSERT_PRESET_COORDINATE_BASES)
const ROLE_IDS = new Set<string>(CASE_INSERT_PRESET_ROLE_IDS)
const DEFINITION_OWNER_IDS = new Set<string>(CASE_INSERT_PRESET_OWNER_IDS)
const OWNER_IDS = new Set<string>(
  CASE_INSERT_PRESET_ARTWORK_VIEWPORT_OWNER_IDS_V1,
)
const ARTWORK_OWNER_IDS = new Set<CaseInsertPresetArtworkViewportOwnerIdV1>([
  'case.cover.background',
  'case.cover.title-artwork',
  'case.cover.artwork-slots',
  'case.cover.logo-slots',
  'case.cover.mark-slots',
  'case.tray.background',
  'case.tray.title-artwork',
  'case.tray.artwork-slots',
  'case.tray.logo-slots',
  'case.tray.mark-slots',
  'case.spine.left.background',
  'case.spine.left.title-artwork',
  'case.spine.left.artwork-slots',
  'case.spine.left.logo-slots',
  'case.spine.left.mark-slots',
  'case.spine.right.background',
  'case.spine.right.title-artwork',
  'case.spine.right.artwork-slots',
  'case.spine.right.logo-slots',
  'case.spine.right.mark-slots',
])
const ROOT_FIELDS = Object.freeze([
  'assignment',
  'template',
  'action',
  'source',
  'capabilities',
])
const ASSIGNMENT_FIELDS = Object.freeze([
  'presetId',
  'presetRevision',
  'slotId',
  'assignmentId',
  'roleId',
  'region',
  'coordinateBasis',
  'ownerId',
  'object',
])
const OBJECT_FIELDS = Object.freeze(['kind', 'id'])
const TEMPLATE_FIELDS = Object.freeze(['id', 'revision', 'presetCompatibility'])
const ANY_TEMPLATE_COMPATIBILITY_FIELDS = Object.freeze([
  'presetId',
  'presetRevision',
  'mode',
])
const SPECIFIC_TEMPLATE_COMPATIBILITY_FIELDS = Object.freeze([
  ...ANY_TEMPLATE_COMPATIBILITY_FIELDS,
  'templateId',
])
const ACTION_FIELDS = Object.freeze([
  'kind',
  'formatVersion',
  'viewport',
  'fitting',
])
const REGION_FIELDS = Object.freeze([
  'centerXPercent',
  'centerYPercent',
  'widthPercent',
  'heightPercent',
])
const SOURCE_FIELDS = Object.freeze([
  'assetIdentity',
  'provenanceIdentity',
  'width',
  'height',
  'contentBounds',
])
const CONTENT_BOUNDS_FIELDS = Object.freeze(['x', 'y', 'width', 'height'])
const CAPABILITY_FIELDS = Object.freeze([
  'ownerId',
  'object',
  'viewportGeometry',
  'contain',
  'cover',
  'explicitCropFraming',
  'focalOffset',
  'zoom',
])
const SUCCESS_RESULT_FIELDS = Object.freeze(['ok', 'status', 'plan'])

export type CaseInsertPresetArtworkViewportAssignmentIdentity = Readonly<{
  presetId: CaseInsertPresetId
  presetRevision: number
  slotId: `case:preset-slot:${string}`
  assignmentId: `case:preset-assignment:${string}`
  roleId: CaseInsertPresetRoleId
  region: CaseInsertPresetConcreteRegionId
  coordinateBasis: CaseInsertPresetCoordinateBasis
  ownerId: CaseInsertPresetArtworkViewportOwnerIdV1
  object: CaseInsertPresetObjectBinding
}>

export type CaseInsertPresetArtworkFittingIntent =
  | Readonly<{ mode: 'contain' }>
  | Readonly<{ mode: 'cover' }>
  | Readonly<{
      mode: 'explicit-crop'
      sourceWindow: CaseInsertPresetNormalizedRegion
    }>

export type CaseInsertPresetArtworkViewportActionV1 = Readonly<{
  kind: typeof CASE_INSERT_PRESET_ARTWORK_VIEWPORT_ACTION_KIND
  formatVersion:
    typeof CASE_INSERT_PRESET_ARTWORK_VIEWPORT_ACTION_FORMAT_VERSION
  viewport: CaseInsertPresetNormalizedRegion
  fitting: CaseInsertPresetArtworkFittingIntent
}>

export type CaseInsertPresetArtworkViewportSource = Readonly<{
  assetIdentity: string
  provenanceIdentity: string | null
  width: number
  height: number
  contentBounds: Readonly<ImageContentBounds> | null
}>

export type CaseInsertPresetArtworkViewportCapabilities = Readonly<{
  ownerId: CaseInsertPresetArtworkViewportOwnerIdV1
  object: CaseInsertPresetObjectBinding
  viewportGeometry: boolean
  contain: boolean
  cover: boolean
  explicitCropFraming: boolean
  focalOffset: boolean
  zoom: boolean
}>

export type CaseInsertPresetArtworkViewportTemplateCompatibility = Readonly<{
  presetId: CaseInsertPresetId
  presetRevision: number
}> & CaseInsertPresetTemplateCompatibility

export type CaseInsertPresetArtworkViewportTemplate = Readonly<{
  id: string
  revision: number | null
  presetCompatibility: CaseInsertPresetArtworkViewportTemplateCompatibility
}>

export type PlanCaseInsertPresetArtworkViewportInput = Readonly<{
  assignment: CaseInsertPresetArtworkViewportAssignmentIdentity
  template: CaseInsertPresetArtworkViewportTemplate
  action: CaseInsertPresetArtworkViewportActionV1
  source: CaseInsertPresetArtworkViewportSource | null
  capabilities: CaseInsertPresetArtworkViewportCapabilities
}>

export type CaseInsertPresetArtworkViewportCapability =
  | 'viewport-geometry'
  | 'contain'
  | 'cover'
  | 'explicit-crop-framing'
  | 'focal-offset'
  | 'zoom'

export type CaseInsertPresetArtworkViewportValidationCode =
  | 'input-not-plain'
  | 'unexpected-field'
  | 'invalid-assignment-identity'
  | 'invalid-template-identity'
  | 'invalid-template-compatibility'
  | 'invalid-action'
  | 'invalid-viewport'
  | 'viewport-outside-basis'
  | 'invalid-fitting-intent'
  | 'invalid-source-identity'
  | 'invalid-source-dimensions'
  | 'invalid-content-bounds'
  | 'empty-source-content'
  | 'invalid-capability-evidence'
  | 'numeric-result-invalid'

export type CaseInsertPresetArtworkViewportCompatibilityCode =
  | 'capability-target-mismatch'
  | 'template-compatibility-target-mismatch'
  | 'template-id-incompatible'
  | 'region-coordinate-basis-mismatch'
  | 'coordinate-basis-unavailable'
  | 'crop-window-aspect-incompatible'

export type CaseInsertPresetArtworkViewportUnsupportedCode =
  | 'action-kind-unsupported'
  | 'action-version-unsupported'
  | 'template-unsupported'
  | 'template-revision-unsupported'
  | 'assignment-owner-unsupported'
  | 'owner-capability-unsupported'

export type CaseInsertPresetArtworkViewportRect = Readonly<{
  x: number
  y: number
  width: number
  height: number
}>

export type CaseInsertPresetArtworkViewportPhysicalRect = Readonly<{
  xMm: number
  yMm: number
  widthMm: number
  heightMm: number
}>

export type CaseInsertPresetArtworkViewportWarning = Readonly<{
  id: `case:preset-warning:v1:artwork-visible-clipping:${string}`
  kind: 'material-visible-clipping'
  classification: 'derived-cover' | 'explicit-crop'
  assignmentId: `case:preset-assignment:${string}`
}>

export type CaseInsertPresetArtworkViewportConsentRequirement = Readonly<{
  id: `case:preset-consent:v1:artwork-visible-clipping:${string}`
  kind: 'material-visible-clipping'
  warningId: CaseInsertPresetArtworkViewportWarning['id']
  assignmentId: `case:preset-assignment:${string}`
}>

export type CaseInsertPresetArtworkViewportClippingEvidence = Readonly<{
  classification:
    | 'none'
    | 'derived-cover'
    | 'explicit-crop'
    | 'unknown-deferred'
  visibleClipping: boolean | null
  material: boolean | null
  clippedSourcePixels: Readonly<{
    left: number
    top: number
    right: number
    bottom: number
  }> | null
  clippedSourceFractions: Readonly<{
    left: number
    top: number
    right: number
    bottom: number
    area: number
  }> | null
}>

type CaseInsertPresetArtworkViewportCommonPlan = Readonly<{
  kind: typeof CASE_INSERT_PRESET_ARTWORK_VIEWPORT_PLAN_KIND
  formatVersion: typeof CASE_INSERT_PRESET_ARTWORK_VIEWPORT_PLAN_FORMAT_VERSION
  identity: `case:preset-artwork-fitting-plan:v1:${string}`
  assignment: CaseInsertPresetArtworkViewportAssignmentIdentity
  template: Readonly<{
    id: string
    revision: number | null
    surfaceId: string
    presetCompatibility: CaseInsertPresetArtworkViewportTemplateCompatibility
  }>
  viewport: Readonly<{
    identity: `case:preset-artwork-viewport:v1:${string}`
    coordinateBasis: CaseInsertPresetCoordinateBasis
    basisRectMm: CaseInsertPresetArtworkViewportPhysicalRect
    normalizedRegion: CaseInsertPresetNormalizedRegion
    rectMm: CaseInsertPresetArtworkViewportPhysicalRect
    centerXMm: number
    centerYMm: number
    physicalWidthMm: number
    physicalHeightMm: number
    physicalAspectRatio: number
  }>
  intent: Readonly<{
    identity: `case:preset-artwork-fitting-intent:v1:${string}`
    declaration: CaseInsertPresetArtworkFittingIntent
  }>
  capabilities: CaseInsertPresetArtworkViewportCapabilities
  requiredCapabilities: readonly CaseInsertPresetArtworkViewportCapability[]
  pendingCapabilityChecks: readonly CaseInsertPresetArtworkViewportCapability[]
  preservation: Readonly<{
    imageBytes: 'preserved-outside-boundary'
    provenance: 'preserved-by-identity'
    contentBounds: 'read-only-source-authority'
    destructiveCrop: 'not-performed'
    assetReplacement: 'not-requested'
    projectMutation: 'not-performed'
  }>
}>

export type CaseInsertPresetArtworkViewportDeferredPlan =
  CaseInsertPresetArtworkViewportCommonPlan & Readonly<{
    resolution: 'deferred'
    source: null
    fitting: Readonly<{
      status: 'deferred-source-dimensions'
      visibleSourceRect: null
      renderedContentRectMm: null
      scaleMmPerSourcePixel: null
      derivedFocalPosition: null
      derivedZoom: null
    }>
    clipping: CaseInsertPresetArtworkViewportClippingEvidence
    warnings: readonly CaseInsertPresetArtworkViewportWarning[]
    materialConsentRequirements:
      readonly CaseInsertPresetArtworkViewportConsentRequirement[]
  }>

export type CaseInsertPresetArtworkViewportResolvedPlan =
  CaseInsertPresetArtworkViewportCommonPlan & Readonly<{
    resolution: 'resolved'
    source: Readonly<{
      assetIdentity: string
      provenanceIdentity: string | null
      imageRect: CaseInsertPresetArtworkViewportRect
      contentRect: CaseInsertPresetArtworkViewportRect
    }>
    fitting: Readonly<{
      status: 'resolved'
      visibleSourceRect: CaseInsertPresetArtworkViewportRect
      renderedContentRectMm: CaseInsertPresetArtworkViewportPhysicalRect
      scaleMmPerSourcePixel: number
      viewportFill: 'complete' | 'letterboxed'
      unusedViewportMm: Readonly<{
        left: number
        top: number
        right: number
        bottom: number
      }>
      derivedFocalPosition: Readonly<{
        xPercent: number
        yPercent: number
      }> | null
      derivedZoom: number | null
    }>
    clipping: CaseInsertPresetArtworkViewportClippingEvidence
    warnings: readonly CaseInsertPresetArtworkViewportWarning[]
    materialConsentRequirements:
      readonly CaseInsertPresetArtworkViewportConsentRequirement[]
  }>

export type CaseInsertPresetArtworkViewportPlanningResult =
  | Readonly<{
      ok: true
      status: 'resolved'
      plan: CaseInsertPresetArtworkViewportResolvedPlan
    }>
  | Readonly<{
      ok: true
      status: 'deferred'
      plan: CaseInsertPresetArtworkViewportDeferredPlan
    }>
  | Readonly<{
      ok: false
      status: 'invalid'
      error: Readonly<{
        code: CaseInsertPresetArtworkViewportValidationCode
        path: string
        detail?: string
      }>
    }>
  | Readonly<{
      ok: false
      status: 'incompatible'
      error: Readonly<{
        code: CaseInsertPresetArtworkViewportCompatibilityCode
        path: string
      }>
    }>
  | Readonly<{
      ok: false
      status: 'unsupported'
      error: Readonly<{
        code: CaseInsertPresetArtworkViewportUnsupportedCode
        path: string
        capability?: CaseInsertPresetArtworkViewportCapability
        ownerId?: CaseInsertPresetArtworkViewportOwnerIdV1
        objectId?: string
      }>
    }>

export type CaseInsertPresetArtworkViewportPlanningSuccess = Extract<
  CaseInsertPresetArtworkViewportPlanningResult,
  Readonly<{ ok: true }>
>

export type CaseInsertPresetArtworkViewportSuccessEvidenceValidationCode =
  | 'evidence-not-plain'
  | 'evidence-not-success'
  | 'evidence-noncanonical'

export type CaseInsertPresetArtworkViewportSuccessEvidenceValidationResult =
  | Readonly<{
      ok: true
      status: 'canonical'
      canonicalResult: CaseInsertPresetArtworkViewportPlanningSuccess
    }>
  | Readonly<{
      ok: false
      status: 'invalid'
      error: Readonly<{
        code: CaseInsertPresetArtworkViewportSuccessEvidenceValidationCode
        path: string
        detail?: string
      }>
    }>

type Parsed<T> = Readonly<{ ok: true; value: T }> |
  Readonly<{ ok: false; result: CaseInsertPresetArtworkViewportPlanningResult }>

type ResolvedGeometry = Readonly<{
  template: Readonly<{ id: string; revision: number | null; surfaceId: string }>
  basisRectMm: CaseInsertPresetArtworkViewportPhysicalRect
  viewportRectMm: CaseInsertPresetArtworkViewportPhysicalRect
  centerXMm: number
  centerYMm: number
  aspectRatio: number
}>

function isRecord(value: unknown): value is CaseInsertPresetPlainRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function canonicalNumber(value: number) {
  return Object.is(value, -0) ? 0 : value
}

function invalid(
  code: CaseInsertPresetArtworkViewportValidationCode,
  path: string,
  detail?: string,
): CaseInsertPresetArtworkViewportPlanningResult {
  return deepFreezeCaseInsertPresetValue({
    ok: false,
    status: 'invalid',
    error: { code, path, ...(detail ? { detail } : {}) },
  })
}

function incompatible(
  code: CaseInsertPresetArtworkViewportCompatibilityCode,
  path: string,
): CaseInsertPresetArtworkViewportPlanningResult {
  return deepFreezeCaseInsertPresetValue({
    ok: false,
    status: 'incompatible',
    error: { code, path },
  })
}

function unsupported(
  code: CaseInsertPresetArtworkViewportUnsupportedCode,
  path: string,
  evidence: Readonly<{
    capability?: CaseInsertPresetArtworkViewportCapability
    ownerId?: CaseInsertPresetArtworkViewportOwnerIdV1
    objectId?: string
  }> = {},
): CaseInsertPresetArtworkViewportPlanningResult {
  return deepFreezeCaseInsertPresetValue({
    ok: false,
    status: 'unsupported',
    error: { code, path, ...evidence },
  })
}

function success<T>(value: T): Parsed<T> {
  return { ok: true, value }
}

function failure<T>(
  result: CaseInsertPresetArtworkViewportPlanningResult,
): Parsed<T> {
  return { ok: false, result }
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isPositiveSafeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0
}

function isNonNegativeSafeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}

function isBoundedIdentity(value: unknown, nullable = false) {
  return (nullable && value === null) || (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= CASE_INSERT_PRESET_ARTWORK_MAX_IDENTITY_LENGTH &&
    value.trim() === value &&
    hasOnlyPairedSurrogates(value)
  )
}

function hasOnlyPairedSurrogates(value: string) {
  for (let index = 0; index < value.length; index += 1) {
    const codeUnit = value.charCodeAt(index)
    if (codeUnit >= 0xd800 && codeUnit <= 0xdbff) {
      if (index + 1 >= value.length) return false
      const next = value.charCodeAt(index + 1)
      if (next < 0xdc00 || next > 0xdfff) return false
      index += 1
    } else if (codeUnit >= 0xdc00 && codeUnit <= 0xdfff) {
      return false
    }
  }
  return true
}

function isBoundedTemplateId(value: unknown) {
  return typeof value === 'string' && value.length > 0 &&
    value.length <= CASE_INSERT_PRESET_MAX_TEMPLATE_ID_LENGTH &&
    value.trim() === value && hasOnlyPairedSurrogates(value)
}

function parseObjectBinding(
  value: unknown,
  path: string,
): Parsed<CaseInsertPresetObjectBinding> {
  if (!isRecord(value) || !hasExactCaseInsertPresetKeys(value, OBJECT_FIELDS) ||
      (value.kind !== 'fixed' && value.kind !== 'repeated') ||
      typeof value.id !== 'string' || value.id.length === 0 ||
      value.id.length > CASE_INSERT_PRESET_MAX_OBJECT_ID_LENGTH ||
      value.id.trim() !== value.id) {
    return failure(invalid('invalid-assignment-identity', path))
  }
  return success({ kind: value.kind, id: value.id })
}

function parseAssignment(
  value: unknown,
): Parsed<CaseInsertPresetArtworkViewportAssignmentIdentity> {
  if (!isRecord(value) ||
      !hasExactCaseInsertPresetKeys(value, ASSIGNMENT_FIELDS)) {
    return failure(invalid(
      isRecord(value) ? 'unexpected-field' : 'invalid-assignment-identity',
      'assignment',
    ))
  }
  if (!isCaseInsertPresetId(value.presetId) ||
      !isPositiveSafeInteger(value.presetRevision) ||
      typeof value.slotId !== 'string' || !SLOT_ID_PATTERN.test(value.slotId) ||
      typeof value.assignmentId !== 'string' ||
      !ASSIGNMENT_ID_PATTERN.test(value.assignmentId) ||
      typeof value.roleId !== 'string' || !ROLE_IDS.has(value.roleId) ||
      typeof value.region !== 'string' || !REGION_IDS.has(value.region) ||
      typeof value.coordinateBasis !== 'string' ||
      !COORDINATE_BASES.has(value.coordinateBasis) ||
      typeof value.ownerId !== 'string' || !OWNER_IDS.has(value.ownerId)) {
    return failure(invalid('invalid-assignment-identity', 'assignment'))
  }
  const object = parseObjectBinding(value.object, 'assignment.object')
  if (!object.ok) return object
  return success({
    presetId: value.presetId,
    presetRevision: value.presetRevision,
    slotId: value.slotId as `case:preset-slot:${string}`,
    assignmentId: value.assignmentId as `case:preset-assignment:${string}`,
    roleId: value.roleId as CaseInsertPresetRoleId,
    region: value.region as CaseInsertPresetConcreteRegionId,
    coordinateBasis: value.coordinateBasis as CaseInsertPresetCoordinateBasis,
    ownerId: value.ownerId as CaseInsertPresetArtworkViewportOwnerIdV1,
    object: object.value,
  })
}

function parseTemplateCompatibility(
  value: unknown,
): Parsed<CaseInsertPresetArtworkViewportTemplateCompatibility> {
  if (!isRecord(value) ||
      (value.mode !== 'any-case-template' &&
        value.mode !== 'specific-template')) {
    return failure(invalid(
      'invalid-template-compatibility',
      'template.presetCompatibility',
    ))
  }
  const fields = value.mode === 'specific-template'
    ? SPECIFIC_TEMPLATE_COMPATIBILITY_FIELDS
    : ANY_TEMPLATE_COMPATIBILITY_FIELDS
  if (!hasExactCaseInsertPresetKeys(value, fields) ||
      !isCaseInsertPresetId(value.presetId) ||
      !isPositiveSafeInteger(value.presetRevision) ||
      (value.mode === 'specific-template' &&
        !isBoundedTemplateId(value.templateId))) {
    return failure(invalid(
      'invalid-template-compatibility',
      'template.presetCompatibility',
    ))
  }
  return success(value.mode === 'specific-template'
    ? {
        presetId: value.presetId,
        presetRevision: value.presetRevision,
        mode: 'specific-template',
        templateId: value.templateId as string,
      }
    : {
        presetId: value.presetId,
        presetRevision: value.presetRevision,
        mode: 'any-case-template',
      })
}

function parseTemplate(
  value: unknown,
): Parsed<CaseInsertPresetArtworkViewportTemplate> {
  if (!isRecord(value) || !hasExactCaseInsertPresetKeys(value, TEMPLATE_FIELDS) ||
      !isBoundedTemplateId(value.id) ||
      (value.revision !== null && !isPositiveSafeInteger(value.revision))) {
    return failure(invalid('invalid-template-identity', 'template'))
  }
  const presetCompatibility = parseTemplateCompatibility(
    value.presetCompatibility,
  )
  if (!presetCompatibility.ok) return presetCompatibility
  return success({
    id: value.id as string,
    revision: value.revision as number | null,
    presetCompatibility: presetCompatibility.value,
  })
}

function parseNormalizedRegion(
  value: unknown,
  path: string,
  invalidCode: 'invalid-viewport' | 'invalid-fitting-intent',
): Parsed<CaseInsertPresetNormalizedRegion> {
  if (!isRecord(value) || !hasExactCaseInsertPresetKeys(value, REGION_FIELDS) ||
      !isFiniteNumber(value.centerXPercent) ||
      !isFiniteNumber(value.centerYPercent) ||
      !isFiniteNumber(value.widthPercent) ||
      !isFiniteNumber(value.heightPercent)) {
    return failure(invalid(invalidCode, path))
  }
  const region = {
    centerXPercent: canonicalNumber(value.centerXPercent),
    centerYPercent: canonicalNumber(value.centerYPercent),
    widthPercent: canonicalNumber(value.widthPercent),
    heightPercent: canonicalNumber(value.heightPercent),
  }
  if (region.centerXPercent < 0 || region.centerXPercent > 100 ||
      region.centerYPercent < 0 || region.centerYPercent > 100 ||
      region.widthPercent < Number.EPSILON || region.widthPercent > 100 ||
      region.heightPercent < Number.EPSILON || region.heightPercent > 100) {
    return failure(invalid(invalidCode, path))
  }
  const left = region.centerXPercent - region.widthPercent / 2
  const right = region.centerXPercent + region.widthPercent / 2
  const top = region.centerYPercent - region.heightPercent / 2
  const bottom = region.centerYPercent + region.heightPercent / 2
  if (left < 0 || right > 100 || top < 0 || bottom > 100) {
    return failure(invalid(
      invalidCode === 'invalid-viewport'
        ? 'viewport-outside-basis'
        : invalidCode,
      path,
    ))
  }
  return success(region)
}

function parseFittingIntent(
  value: unknown,
): Parsed<CaseInsertPresetArtworkFittingIntent> {
  if (!isRecord(value) || typeof value.mode !== 'string') {
    return failure(invalid('invalid-fitting-intent', 'action.fitting'))
  }
  if (value.mode === 'contain' || value.mode === 'cover') {
    if (!hasExactCaseInsertPresetKeys(value, ['mode'])) {
      return failure(invalid('unexpected-field', 'action.fitting'))
    }
    return success({ mode: value.mode })
  }
  if (value.mode === 'explicit-crop') {
    if (!hasExactCaseInsertPresetKeys(value, ['mode', 'sourceWindow'])) {
      return failure(invalid('unexpected-field', 'action.fitting'))
    }
    const sourceWindow = parseNormalizedRegion(
      value.sourceWindow,
      'action.fitting.sourceWindow',
      'invalid-fitting-intent',
    )
    if (!sourceWindow.ok) return sourceWindow
    return success({ mode: 'explicit-crop', sourceWindow: sourceWindow.value })
  }
  return failure(invalid('invalid-fitting-intent', 'action.fitting.mode'))
}

function parseAction(
  value: unknown,
): Parsed<CaseInsertPresetArtworkViewportActionV1> {
  if (!isRecord(value) || !hasExactCaseInsertPresetKeys(value, ACTION_FIELDS)) {
    return failure(invalid(
      isRecord(value) ? 'unexpected-field' : 'invalid-action',
      'action',
    ))
  }
  if (value.kind !== CASE_INSERT_PRESET_ARTWORK_VIEWPORT_ACTION_KIND) {
    return failure(unsupported('action-kind-unsupported', 'action.kind'))
  }
  if (value.formatVersion !==
      CASE_INSERT_PRESET_ARTWORK_VIEWPORT_ACTION_FORMAT_VERSION) {
    return failure(unsupported(
      'action-version-unsupported',
      'action.formatVersion',
    ))
  }
  const viewport = parseNormalizedRegion(
    value.viewport,
    'action.viewport',
    'invalid-viewport',
  )
  if (!viewport.ok) return viewport
  const fitting = parseFittingIntent(value.fitting)
  if (!fitting.ok) return fitting
  return success({
    kind: CASE_INSERT_PRESET_ARTWORK_VIEWPORT_ACTION_KIND,
    formatVersion: CASE_INSERT_PRESET_ARTWORK_VIEWPORT_ACTION_FORMAT_VERSION,
    viewport: viewport.value,
    fitting: fitting.value,
  })
}

function parseContentBounds(
  value: unknown,
  imageWidth: number,
  imageHeight: number,
): Parsed<Readonly<ImageContentBounds> | null> {
  if (value === null) return success(null)
  if (!isRecord(value) ||
      !hasExactCaseInsertPresetKeys(value, CONTENT_BOUNDS_FIELDS) ||
      !isNonNegativeSafeInteger(value.x) ||
      !isNonNegativeSafeInteger(value.y) ||
      !isNonNegativeSafeInteger(value.width) ||
      !isNonNegativeSafeInteger(value.height)) {
    return failure(invalid('invalid-content-bounds', 'source.contentBounds'))
  }
  if (value.x === 0 && value.y === 0 &&
      value.width === 0 && value.height === 0) {
    return success({ x: 0, y: 0, width: 0, height: 0 })
  }
  if (
      !isPositiveSafeInteger(value.width) ||
      !isPositiveSafeInteger(value.height) ||
      value.x > imageWidth || value.y > imageHeight ||
      value.width > imageWidth - value.x ||
      value.height > imageHeight - value.y) {
    return failure(invalid('invalid-content-bounds', 'source.contentBounds'))
  }
  return success({
    x: value.x,
    y: value.y,
    width: value.width,
    height: value.height,
  })
}

function parseSource(
  value: unknown,
): Parsed<CaseInsertPresetArtworkViewportSource | null> {
  if (value === null) return success(null)
  if (!isRecord(value) || !hasExactCaseInsertPresetKeys(value, SOURCE_FIELDS)) {
    return failure(invalid(
      isRecord(value) ? 'unexpected-field' : 'invalid-source-dimensions',
      'source',
    ))
  }
  if (!isBoundedIdentity(value.assetIdentity) ||
      !isBoundedIdentity(value.provenanceIdentity, true)) {
    return failure(invalid('invalid-source-identity', 'source'))
  }
  if (!isPositiveSafeInteger(value.width) ||
      !isPositiveSafeInteger(value.height)) {
    return failure(invalid('invalid-source-dimensions', 'source'))
  }
  const contentBounds = parseContentBounds(
    value.contentBounds,
    value.width,
    value.height,
  )
  if (!contentBounds.ok) return contentBounds
  return success({
    assetIdentity: value.assetIdentity as string,
    provenanceIdentity: value.provenanceIdentity as string | null,
    width: value.width,
    height: value.height,
    contentBounds: contentBounds.value,
  })
}

function parseCapabilities(
  value: unknown,
): Parsed<CaseInsertPresetArtworkViewportCapabilities> {
  if (!isRecord(value) ||
      !hasExactCaseInsertPresetKeys(value, CAPABILITY_FIELDS) ||
      typeof value.ownerId !== 'string' || !OWNER_IDS.has(value.ownerId) ||
      typeof value.viewportGeometry !== 'boolean' ||
      typeof value.contain !== 'boolean' || typeof value.cover !== 'boolean' ||
      typeof value.explicitCropFraming !== 'boolean' ||
      typeof value.focalOffset !== 'boolean' || typeof value.zoom !== 'boolean') {
    return failure(invalid('invalid-capability-evidence', 'capabilities'))
  }
  const object = parseObjectBinding(value.object, 'capabilities.object')
  if (!object.ok) {
    return failure(invalid(
      'invalid-capability-evidence',
      'capabilities.object',
    ))
  }
  return success({
    ownerId: value.ownerId as CaseInsertPresetArtworkViewportOwnerIdV1,
    object: object.value,
    viewportGeometry: value.viewportGeometry,
    contain: value.contain,
    cover: value.cover,
    explicitCropFraming: value.explicitCropFraming,
    focalOffset: value.focalOffset,
    zoom: value.zoom,
  })
}

function sameObjectBinding(
  left: CaseInsertPresetObjectBinding,
  right: CaseInsertPresetObjectBinding,
) {
  return left.kind === right.kind && left.id === right.id
}

function isViewportOwnerBindingCompatible(
  region: CaseInsertPresetConcreteRegionId,
  roleId: CaseInsertPresetRoleId,
  ownerId: CaseInsertPresetArtworkViewportOwnerIdV1,
  object: CaseInsertPresetObjectBinding,
) {
  if (DEFINITION_OWNER_IDS.has(ownerId)) {
    return isCaseInsertPresetOwnerBindingCompatible(
      region,
      roleId,
      ownerId as CaseInsertPresetOwnerId,
      object,
    )
  }

  if (object.kind !== 'repeated' ||
      !REPEATED_OBJECT_ID_PATTERN.test(object.id) ||
      roleId !== 'additional-artwork') {
    return false
  }

  return ownerId === 'case.spine.left.artwork-slots'
    ? region === 'left-spine'
    : ownerId === 'case.spine.right.artwork-slots' &&
        region === 'right-spine'
}

function validateCompatibility(
  input: PlanCaseInsertPresetArtworkViewportInput,
): CaseInsertPresetArtworkViewportPlanningResult | null {
  if (!isViewportOwnerBindingCompatible(
    input.assignment.region,
    input.assignment.roleId,
    input.assignment.ownerId,
    input.assignment.object,
  )) {
    return invalid('invalid-assignment-identity', 'assignment')
  }
  const presetCompatibility = input.template.presetCompatibility
  if (presetCompatibility.presetId !== input.assignment.presetId ||
      presetCompatibility.presetRevision !== input.assignment.presetRevision) {
    return incompatible(
      'template-compatibility-target-mismatch',
      'template.presetCompatibility',
    )
  }
  if (presetCompatibility.mode === 'specific-template' &&
      presetCompatibility.templateId !== input.template.id) {
    return incompatible(
      'template-id-incompatible',
      'template.presetCompatibility.templateId',
    )
  }
  if (!isCaseInsertPresetCoordinateBasisAllowed(
    input.assignment.region,
    input.assignment.coordinateBasis,
  )) {
    return incompatible(
      'region-coordinate-basis-mismatch',
      'assignment.coordinateBasis',
    )
  }
  if (input.capabilities.ownerId !== input.assignment.ownerId ||
      !sameObjectBinding(input.capabilities.object, input.assignment.object)) {
    return incompatible('capability-target-mismatch', 'capabilities')
  }
  if (!ARTWORK_OWNER_IDS.has(input.assignment.ownerId)) {
    return unsupported(
      'assignment-owner-unsupported',
      'assignment.ownerId',
      {
        ownerId: input.assignment.ownerId,
        objectId: input.assignment.object.id,
      },
    )
  }
  if (!Object.hasOwn(caseInsertTemplates, input.template.id)) {
    return unsupported('template-unsupported', 'template.id')
  }
  if (input.template.revision !== null) {
    return unsupported('template-revision-unsupported', 'template.revision')
  }
  return null
}

function capabilityValue(
  capabilities: CaseInsertPresetArtworkViewportCapabilities,
  capability: CaseInsertPresetArtworkViewportCapability,
) {
  switch (capability) {
    case 'viewport-geometry': return capabilities.viewportGeometry
    case 'contain': return capabilities.contain
    case 'cover': return capabilities.cover
    case 'explicit-crop-framing': return capabilities.explicitCropFraming
    case 'focal-offset': return capabilities.focalOffset
    case 'zoom': return capabilities.zoom
  }
}

function requireCapability(
  input: PlanCaseInsertPresetArtworkViewportInput,
  capability: CaseInsertPresetArtworkViewportCapability,
) {
  return capabilityValue(input.capabilities, capability)
    ? null
    : unsupported(
        'owner-capability-unsupported',
        'capabilities',
        {
          capability,
          ownerId: input.assignment.ownerId,
          objectId: input.assignment.object.id,
        },
      )
}

function immediatelyRequiredCapabilities(
  fitting: CaseInsertPresetArtworkFittingIntent,
) {
  const required: CaseInsertPresetArtworkViewportCapability[] = [
    'viewport-geometry',
    fitting.mode === 'contain'
      ? 'contain'
      : fitting.mode === 'cover'
        ? 'cover'
        : 'explicit-crop-framing',
  ]
  if (fitting.mode === 'explicit-crop' &&
      (fitting.sourceWindow.centerXPercent !== 50 ||
       fitting.sourceWindow.centerYPercent !== 50)) {
    required.push('focal-offset')
  }
  return required
}

function validateImmediateCapabilities(
  input: PlanCaseInsertPresetArtworkViewportInput,
  required: readonly CaseInsertPresetArtworkViewportCapability[],
) {
  for (const capability of required) {
    const result = requireCapability(input, capability)
    if (result) return result
  }
  return null
}

function resolveGeometry(
  input: PlanCaseInsertPresetArtworkViewportInput,
): Parsed<ResolvedGeometry> {
  const template = caseInsertTemplates[
    input.template.id as keyof typeof caseInsertTemplates
  ]
  const basis = template?.regions.find(
    ({ id }) => id === input.assignment.coordinateBasis,
  )
  if (!basis?.surfaceId) {
    return failure(incompatible(
      'coordinate-basis-unavailable',
      'assignment.coordinateBasis',
    ))
  }
  const basisRectMm = {
    xMm: canonicalNumber(basis.bounds.xMm),
    yMm: canonicalNumber(basis.bounds.yMm),
    widthMm: canonicalNumber(basis.bounds.widthMm),
    heightMm: canonicalNumber(basis.bounds.heightMm),
  }
  const normalized = input.action.viewport
  const widthMm = basisRectMm.widthMm * normalized.widthPercent / 100
  const heightMm = basisRectMm.heightMm * normalized.heightPercent / 100
  const centerXMm = basisRectMm.xMm +
    basisRectMm.widthMm * normalized.centerXPercent / 100
  const centerYMm = basisRectMm.yMm +
    basisRectMm.heightMm * normalized.centerYPercent / 100
  const viewportRectMm = {
    xMm: centerXMm - widthMm / 2,
    yMm: centerYMm - heightMm / 2,
    widthMm,
    heightMm,
  }
  const aspectRatio = widthMm / heightMm
  if (![...Object.values(basisRectMm), ...Object.values(viewportRectMm),
    centerXMm, centerYMm, aspectRatio].every(Number.isFinite) ||
      basisRectMm.widthMm <= 0 || basisRectMm.heightMm <= 0 ||
      widthMm <= 0 || heightMm <= 0 || aspectRatio <= 0) {
    return failure(invalid('numeric-result-invalid', 'action.viewport'))
  }
  return success({
    template: {
      id: input.template.id,
      revision: input.template.revision,
      surfaceId: basis.surfaceId,
    },
    basisRectMm,
    viewportRectMm,
    centerXMm,
    centerYMm,
    aspectRatio,
  })
}

function atom(value: string | number | boolean | null) {
  const type = value === null ? 'null' : typeof value
  const canonical = typeof value === 'number'
    ? String(canonicalNumber(value))
    : value === null
      ? ''
      : String(value)
  return `${type.length}:${type}${canonical.length}:${canonical}`
}

function createIdentity(
  prefix: string,
  values: readonly (string | number | boolean | null)[],
) {
  const digest = createCaseInsertPresetIdentityDigestFromChunks(
    values.flatMap((value) => [atom(value), '|']),
  )
  return `${prefix}${digest}`
}

function assignmentIdentityAtoms(
  assignment: CaseInsertPresetArtworkViewportAssignmentIdentity,
) {
  return [
    assignment.presetId,
    assignment.presetRevision,
    assignment.slotId,
    assignment.assignmentId,
    assignment.roleId,
    assignment.region,
    assignment.coordinateBasis,
    assignment.ownerId,
    assignment.object.kind,
    assignment.object.id,
  ] as const
}

function regionIdentityAtoms(region: CaseInsertPresetNormalizedRegion) {
  return [
    region.centerXPercent,
    region.centerYPercent,
    region.widthPercent,
    region.heightPercent,
  ] as const
}

function capabilityIdentityAtoms(
  capabilities: CaseInsertPresetArtworkViewportCapabilities,
) {
  return [
    capabilities.ownerId,
    capabilities.object.kind,
    capabilities.object.id,
    capabilities.viewportGeometry,
    capabilities.contain,
    capabilities.cover,
    capabilities.explicitCropFraming,
    capabilities.focalOffset,
    capabilities.zoom,
  ] as const
}

function templateCompatibilityIdentityAtoms(
  compatibility: CaseInsertPresetArtworkViewportTemplateCompatibility,
) {
  return compatibility.mode === 'specific-template'
    ? [
        compatibility.presetId,
        compatibility.presetRevision,
        compatibility.mode,
        compatibility.templateId,
      ] as const
    : [
        compatibility.presetId,
        compatibility.presetRevision,
        compatibility.mode,
        null,
      ] as const
}

function fittingIdentityAtoms(intent: CaseInsertPresetArtworkFittingIntent) {
  return intent.mode === 'explicit-crop'
    ? [intent.mode, ...regionIdentityAtoms(intent.sourceWindow)] as const
    : [intent.mode] as const
}

function createViewportIdentity(
  input: PlanCaseInsertPresetArtworkViewportInput,
  geometry: ResolvedGeometry,
) {
  return createIdentity('case:preset-artwork-viewport:v1:', [
    CASE_INSERT_PRESET_ARTWORK_VIEWPORT_ACTION_KIND,
    CASE_INSERT_PRESET_ARTWORK_VIEWPORT_ACTION_FORMAT_VERSION,
    ...assignmentIdentityAtoms(input.assignment),
    input.template.id,
    input.template.revision,
    ...templateCompatibilityIdentityAtoms(input.template.presetCompatibility),
    geometry.template.surfaceId,
    ...Object.values(geometry.basisRectMm),
    ...regionIdentityAtoms(input.action.viewport),
  ]) as `case:preset-artwork-viewport:v1:${string}`
}

function createIntentIdentity(
  viewportIdentity: string,
  intent: CaseInsertPresetArtworkFittingIntent,
) {
  return createIdentity('case:preset-artwork-fitting-intent:v1:', [
    viewportIdentity,
    ...fittingIdentityAtoms(intent),
  ]) as `case:preset-artwork-fitting-intent:v1:${string}`
}

function createPlanIdentity(
  viewportIdentity: string,
  intentIdentity: string,
  input: PlanCaseInsertPresetArtworkViewportInput,
  contentRect: CaseInsertPresetArtworkViewportRect | null,
) {
  return createIdentity('case:preset-artwork-fitting-plan:v1:', [
    viewportIdentity,
    intentIdentity,
    ...capabilityIdentityAtoms(input.capabilities),
    input.source?.assetIdentity ?? null,
    input.source?.provenanceIdentity ?? null,
    input.source?.width ?? null,
    input.source?.height ?? null,
    contentRect?.x ?? null,
    contentRect?.y ?? null,
    contentRect?.width ?? null,
    contentRect?.height ?? null,
  ]) as `case:preset-artwork-fitting-plan:v1:${string}`
}

function commonPlan(
  input: PlanCaseInsertPresetArtworkViewportInput,
  geometry: ResolvedGeometry,
  requiredCapabilities: readonly CaseInsertPresetArtworkViewportCapability[],
  pendingCapabilityChecks: readonly CaseInsertPresetArtworkViewportCapability[],
  contentRect: CaseInsertPresetArtworkViewportRect | null,
): CaseInsertPresetArtworkViewportCommonPlan {
  const viewportIdentity = createViewportIdentity(input, geometry)
  const intentIdentity = createIntentIdentity(
    viewportIdentity,
    input.action.fitting,
  )
  return {
    kind: CASE_INSERT_PRESET_ARTWORK_VIEWPORT_PLAN_KIND,
    formatVersion: CASE_INSERT_PRESET_ARTWORK_VIEWPORT_PLAN_FORMAT_VERSION,
    identity: createPlanIdentity(
      viewportIdentity,
      intentIdentity,
      input,
      contentRect,
    ),
    assignment: {
      ...input.assignment,
      object: { ...input.assignment.object },
    },
    template: {
      ...geometry.template,
      presetCompatibility: { ...input.template.presetCompatibility },
    },
    viewport: {
      identity: viewportIdentity,
      coordinateBasis: input.assignment.coordinateBasis,
      basisRectMm: { ...geometry.basisRectMm },
      normalizedRegion: { ...input.action.viewport },
      rectMm: { ...geometry.viewportRectMm },
      centerXMm: geometry.centerXMm,
      centerYMm: geometry.centerYMm,
      physicalWidthMm: geometry.viewportRectMm.widthMm,
      physicalHeightMm: geometry.viewportRectMm.heightMm,
      physicalAspectRatio: geometry.aspectRatio,
    },
    intent: {
      identity: intentIdentity,
      declaration: input.action.fitting.mode === 'explicit-crop'
        ? {
            mode: 'explicit-crop',
            sourceWindow: { ...input.action.fitting.sourceWindow },
          }
        : { mode: input.action.fitting.mode },
    },
    capabilities: {
      ...input.capabilities,
      object: { ...input.capabilities.object },
    },
    requiredCapabilities: [...requiredCapabilities],
    pendingCapabilityChecks: [...pendingCapabilityChecks],
    preservation: {
      imageBytes: 'preserved-outside-boundary',
      provenance: 'preserved-by-identity',
      contentBounds: 'read-only-source-authority',
      destructiveCrop: 'not-performed',
      assetReplacement: 'not-requested',
      projectMutation: 'not-performed',
    },
  }
}

function deferredPlan(
  input: PlanCaseInsertPresetArtworkViewportInput,
  geometry: ResolvedGeometry,
  requiredCapabilities: readonly CaseInsertPresetArtworkViewportCapability[],
) {
  const clippingClassification = input.action.fitting.mode === 'contain'
    ? 'none' as const
    : 'unknown-deferred' as const
  const pendingCapabilityChecks = input.action.fitting.mode === 'explicit-crop'
    ? ['zoom'] as const
    : [] as const
  const plan: CaseInsertPresetArtworkViewportDeferredPlan = {
    ...commonPlan(
      input,
      geometry,
      requiredCapabilities,
      pendingCapabilityChecks,
      null,
    ),
    resolution: 'deferred',
    source: null,
    fitting: {
      status: 'deferred-source-dimensions',
      visibleSourceRect: null,
      renderedContentRectMm: null,
      scaleMmPerSourcePixel: null,
      derivedFocalPosition: null,
      derivedZoom: null,
    },
    clipping: {
      classification: clippingClassification,
      visibleClipping: clippingClassification === 'none' ? false : null,
      material: clippingClassification === 'none' ? false : null,
      clippedSourcePixels: null,
      clippedSourceFractions: null,
    },
    warnings: [],
    materialConsentRequirements: [],
  }
  return deepFreezeCaseInsertPresetValue({
    ok: true,
    status: 'deferred',
    plan,
  } satisfies CaseInsertPresetArtworkViewportPlanningResult)
}

function getSourceContentRect(
  source: CaseInsertPresetArtworkViewportSource,
): Parsed<CaseInsertPresetArtworkViewportRect> {
  const imageSize: BackgroundImageSize = {
    width: source.width,
    height: source.height,
    ...(source.contentBounds
      ? { contentBounds: { ...source.contentBounds } }
      : {}),
  }
  const contentRect = getImageContentSourceRect(imageSize)
  if (!contentRect || contentRect.width <= 0 || contentRect.height <= 0) {
    return failure(invalid('empty-source-content', 'source.contentBounds'))
  }
  return success({ ...contentRect })
}

function normalizeNoise(value: number) {
  return Math.abs(value) <= CASE_INSERT_PRESET_ARTWORK_NUMERIC_TOLERANCE
    ? 0
    : value
}

function relativeDifference(left: number, right: number) {
  return Math.abs(left - right) / Math.max(Math.abs(left), Math.abs(right))
}

function sourceWindowFromRegion(
  content: CaseInsertPresetArtworkViewportRect,
  region: CaseInsertPresetNormalizedRegion,
): CaseInsertPresetArtworkViewportRect {
  const width = content.width * region.widthPercent / 100
  const height = content.height * region.heightPercent / 100
  const centerX = content.x + content.width * region.centerXPercent / 100
  const centerY = content.y + content.height * region.centerYPercent / 100
  return {
    x: centerX - width / 2,
    y: centerY - height / 2,
    width,
    height,
  }
}

function canonicalCoverWindow(
  viewport: CaseInsertPresetArtworkViewportPhysicalRect,
  content: CaseInsertPresetArtworkViewportRect,
) {
  const scale = Math.max(
    viewport.widthMm / content.width,
    viewport.heightMm / content.height,
  )
  const width = viewport.widthMm / scale
  const height = viewport.heightMm / scale
  return {
    scale,
    rect: {
      x: content.x + (content.width - width) / 2,
      y: content.y + (content.height - height) / 2,
      width,
      height,
    },
  }
}

function renderedContentRect(
  viewport: CaseInsertPresetArtworkViewportPhysicalRect,
  content: CaseInsertPresetArtworkViewportRect,
  visible: CaseInsertPresetArtworkViewportRect,
  scale: number,
): CaseInsertPresetArtworkViewportPhysicalRect {
  return {
    xMm: viewport.xMm - (visible.x - content.x) * scale,
    yMm: viewport.yMm - (visible.y - content.y) * scale,
    widthMm: content.width * scale,
    heightMm: content.height * scale,
  }
}

function clippingEvidence(
  mode: CaseInsertPresetArtworkFittingIntent['mode'],
  content: CaseInsertPresetArtworkViewportRect,
  visible: CaseInsertPresetArtworkViewportRect,
): CaseInsertPresetArtworkViewportClippingEvidence {
  const pixels = {
    left: normalizeNoise(Math.max(0, visible.x - content.x)),
    top: normalizeNoise(Math.max(0, visible.y - content.y)),
    right: normalizeNoise(Math.max(
      0,
      content.x + content.width - visible.x - visible.width,
    )),
    bottom: normalizeNoise(Math.max(
      0,
      content.y + content.height - visible.y - visible.height,
    )),
  }
  const fractions = {
    left: normalizeNoise(pixels.left / content.width),
    top: normalizeNoise(pixels.top / content.height),
    right: normalizeNoise(pixels.right / content.width),
    bottom: normalizeNoise(pixels.bottom / content.height),
    area: normalizeNoise(Math.max(
      0,
      1 - (visible.width / content.width) *
        (visible.height / content.height),
    )),
  }
  const material = fractions.area > CASE_INSERT_PRESET_ARTWORK_NUMERIC_TOLERANCE
  return {
    classification: mode === 'explicit-crop'
      ? 'explicit-crop'
      : material
        ? 'derived-cover'
        : 'none',
    visibleClipping: material,
    material,
    clippedSourcePixels: pixels,
    clippedSourceFractions: fractions,
  }
}

function warningAndConsent(
  input: PlanCaseInsertPresetArtworkViewportInput,
  viewportIdentity: string,
  intentIdentity: string,
  clipping: CaseInsertPresetArtworkViewportClippingEvidence,
  content: CaseInsertPresetArtworkViewportRect,
  visible: CaseInsertPresetArtworkViewportRect,
) {
  if (!clipping.material ||
      (clipping.classification !== 'derived-cover' &&
       clipping.classification !== 'explicit-crop')) {
    return {
      warnings: [] as readonly CaseInsertPresetArtworkViewportWarning[],
      materialConsentRequirements:
        [] as readonly CaseInsertPresetArtworkViewportConsentRequirement[],
    }
  }
  const evidenceDigest = createCaseInsertPresetIdentityDigestFromChunks([
    atom(viewportIdentity),
    atom(intentIdentity),
    atom(input.source?.assetIdentity ?? null),
    atom(input.source?.provenanceIdentity ?? null),
    atom(content.x),
    atom(content.y),
    atom(content.width),
    atom(content.height),
    atom(clipping.classification),
    atom(visible.x),
    atom(visible.y),
    atom(visible.width),
    atom(visible.height),
  ])
  const warningId =
    `case:preset-warning:v1:artwork-visible-clipping:${evidenceDigest}` as const
  const warning: CaseInsertPresetArtworkViewportWarning = {
    id: warningId,
    kind: 'material-visible-clipping',
    classification: clipping.classification,
    assignmentId: input.assignment.assignmentId,
  }
  const consent: CaseInsertPresetArtworkViewportConsentRequirement = {
    id: `case:preset-consent:v1:artwork-visible-clipping:${evidenceDigest}`,
    kind: 'material-visible-clipping',
    warningId,
    assignmentId: input.assignment.assignmentId,
  }
  return {
    warnings: [warning],
    materialConsentRequirements: [consent],
  }
}

function validateFiniteResolvedNumbers(value: unknown): boolean {
  if (typeof value === 'number') return Number.isFinite(value)
  if (value === null || typeof value === 'string' ||
      typeof value === 'boolean') return true
  if (Array.isArray(value)) return value.every(validateFiniteResolvedNumbers)
  return typeof value === 'object' && value !== null &&
    Object.values(value).every(validateFiniteResolvedNumbers)
}

function resolveFitting(
  input: PlanCaseInsertPresetArtworkViewportInput,
  geometry: ResolvedGeometry,
  content: CaseInsertPresetArtworkViewportRect,
  immediateCapabilities: readonly CaseInsertPresetArtworkViewportCapability[],
): CaseInsertPresetArtworkViewportPlanningResult {
  const viewport = geometry.viewportRectMm
  const intent = input.action.fitting
  let visible: CaseInsertPresetArtworkViewportRect
  let scale: number
  let viewportFill: 'complete' | 'letterboxed'
  let unusedViewportMm: {
    left: number
    top: number
    right: number
    bottom: number
  }
  let derivedFocalPosition: { xPercent: number; yPercent: number } | null = null
  let derivedZoom: number | null = null
  const requiredCapabilities = [...immediateCapabilities]

  if (intent.mode === 'contain') {
    scale = Math.min(
      viewport.widthMm / content.width,
      viewport.heightMm / content.height,
    )
    visible = { ...content }
    const displayedWidth = content.width * scale
    const displayedHeight = content.height * scale
    const horizontal = Math.max(0, (viewport.widthMm - displayedWidth) / 2)
    const vertical = Math.max(0, (viewport.heightMm - displayedHeight) / 2)
    unusedViewportMm = {
      left: horizontal,
      top: vertical,
      right: horizontal,
      bottom: vertical,
    }
    viewportFill = horizontal <= CASE_INSERT_PRESET_ARTWORK_NUMERIC_TOLERANCE &&
      vertical <= CASE_INSERT_PRESET_ARTWORK_NUMERIC_TOLERANCE
      ? 'complete'
      : 'letterboxed'
  } else if (intent.mode === 'cover') {
    const cover = canonicalCoverWindow(viewport, content)
    scale = cover.scale
    visible = cover.rect
    unusedViewportMm = { left: 0, top: 0, right: 0, bottom: 0 }
    viewportFill = 'complete'
  } else {
    visible = sourceWindowFromRegion(content, intent.sourceWindow)
    const sourceAspectRatio = visible.width / visible.height
    if (!Number.isFinite(sourceAspectRatio) || sourceAspectRatio <= 0 ||
        relativeDifference(sourceAspectRatio, geometry.aspectRatio) >
          CASE_INSERT_PRESET_ARTWORK_CROP_ASPECT_TOLERANCE) {
      return incompatible(
        'crop-window-aspect-incompatible',
        'action.fitting.sourceWindow',
      )
    }
    scale = viewport.widthMm / visible.width
    const heightScale = viewport.heightMm / visible.height
    if (relativeDifference(scale, heightScale) >
        CASE_INSERT_PRESET_ARTWORK_CROP_ASPECT_TOLERANCE) {
      return incompatible(
        'crop-window-aspect-incompatible',
        'action.fitting.sourceWindow',
      )
    }
    const cover = canonicalCoverWindow(viewport, content)
    const zoomWidth = cover.rect.width / visible.width
    const zoomHeight = cover.rect.height / visible.height
    const rawZoom = Math.max(zoomWidth, zoomHeight)
    derivedZoom = relativeDifference(rawZoom, 1) <=
      CASE_INSERT_PRESET_ARTWORK_CROP_ASPECT_TOLERANCE
      ? 1
      : rawZoom
    derivedFocalPosition = {
      xPercent: intent.sourceWindow.centerXPercent,
      yPercent: intent.sourceWindow.centerYPercent,
    }
    if (derivedZoom > 1) {
      requiredCapabilities.push('zoom')
      const capabilityFailure = requireCapability(input, 'zoom')
      if (capabilityFailure) return capabilityFailure
    }
    unusedViewportMm = { left: 0, top: 0, right: 0, bottom: 0 }
    viewportFill = 'complete'
  }

  const rendered = intent.mode === 'contain'
    ? {
        xMm: viewport.xMm + unusedViewportMm.left,
        yMm: viewport.yMm + unusedViewportMm.top,
        widthMm: content.width * scale,
        heightMm: content.height * scale,
      }
    : renderedContentRect(viewport, content, visible, scale)
  const clipping = intent.mode === 'contain'
    ? {
        classification: 'none' as const,
        visibleClipping: false,
        material: false,
        clippedSourcePixels: { left: 0, top: 0, right: 0, bottom: 0 },
        clippedSourceFractions: {
          left: 0,
          top: 0,
          right: 0,
          bottom: 0,
          area: 0,
        },
      }
    : clippingEvidence(intent.mode, content, visible)
  const base = commonPlan(
    input,
    geometry,
    requiredCapabilities,
    [],
    content,
  )
  const review = warningAndConsent(
    input,
    base.viewport.identity,
    base.intent.identity,
    clipping,
    content,
    visible,
  )
  const plan: CaseInsertPresetArtworkViewportResolvedPlan = {
    ...base,
    resolution: 'resolved',
    source: {
      assetIdentity: input.source!.assetIdentity,
      provenanceIdentity: input.source!.provenanceIdentity,
      imageRect: { x: 0, y: 0, width: input.source!.width, height: input.source!.height },
      contentRect: { ...content },
    },
    fitting: {
      status: 'resolved',
      visibleSourceRect: { ...visible },
      renderedContentRectMm: rendered,
      scaleMmPerSourcePixel: scale,
      viewportFill,
      unusedViewportMm,
      derivedFocalPosition,
      derivedZoom,
    },
    clipping,
    warnings: review.warnings,
    materialConsentRequirements: review.materialConsentRequirements,
  }
  if (!validateFiniteResolvedNumbers(plan)) {
    return invalid('numeric-result-invalid', '$')
  }
  return deepFreezeCaseInsertPresetValue({
    ok: true,
    status: 'resolved',
    plan,
  })
}

/**
 * Pure, presentation-neutral planner for future Case preset artwork viewport
 * actions. The action model is deliberately separate from Case definition v1
 * and from the persisted ProjectCaseInsertImageFit vocabulary.
 */
export function planCaseInsertPresetArtworkViewport(
  value: unknown,
): CaseInsertPresetArtworkViewportPlanningResult {
  const cloned = cloneCaseInsertPresetPlainInput(value)
  if (!cloned.ok) {
    return invalid('input-not-plain', '$', cloned.code)
  }
  if (!isRecord(cloned.value) ||
      !hasExactCaseInsertPresetKeys(cloned.value, ROOT_FIELDS)) {
    return invalid(
      isRecord(cloned.value) ? 'unexpected-field' : 'input-not-plain',
      '$',
    )
  }

  const assignment = parseAssignment(cloned.value.assignment)
  if (!assignment.ok) return assignment.result
  const template = parseTemplate(cloned.value.template)
  if (!template.ok) return template.result
  const action = parseAction(cloned.value.action)
  if (!action.ok) return action.result
  const source = parseSource(cloned.value.source)
  if (!source.ok) return source.result
  const capabilities = parseCapabilities(cloned.value.capabilities)
  if (!capabilities.ok) return capabilities.result

  const input: PlanCaseInsertPresetArtworkViewportInput = {
    assignment: assignment.value,
    template: template.value,
    action: action.value,
    source: source.value,
    capabilities: capabilities.value,
  }
  const compatibilityFailure = validateCompatibility(input)
  if (compatibilityFailure) return compatibilityFailure

  const requiredCapabilities = immediatelyRequiredCapabilities(
    input.action.fitting,
  )
  const capabilityFailure = validateImmediateCapabilities(
    input,
    requiredCapabilities,
  )
  if (capabilityFailure) return capabilityFailure

  const geometry = resolveGeometry(input)
  if (!geometry.ok) return geometry.result
  if (!input.source) {
    return deferredPlan(input, geometry.value, requiredCapabilities)
  }
  const content = getSourceContentRect(input.source)
  if (!content.ok) return content.result
  return resolveFitting(
    input,
    geometry.value,
    content.value,
    requiredCapabilities,
  )
}

function canonicalEvidenceValuesMatch(left: unknown, right: unknown): boolean {
  if (typeof left !== typeof right) return false
  if (left === null || right === null || typeof left !== 'object') {
    return Object.is(left, right)
  }
  if (Array.isArray(left) || Array.isArray(right)) {
    return Array.isArray(left) && Array.isArray(right) &&
      left.length === right.length &&
      left.every((item, index) =>
        canonicalEvidenceValuesMatch(item, right[index]))
  }
  const leftRecord = left as Readonly<Record<string, unknown>>
  const rightRecord = right as Readonly<Record<string, unknown>>
  const leftKeys = Object.keys(leftRecord).sort()
  const rightKeys = Object.keys(rightRecord).sort()
  return leftKeys.length === rightKeys.length &&
    leftKeys.every((key, index) =>
      key === rightKeys[index] &&
      canonicalEvidenceValuesMatch(leftRecord[key], rightRecord[key]))
}

function reconstructSourceFromSuccessPlan(
  plan: CaseInsertPresetPlainRecord,
  status: 'resolved' | 'deferred',
) {
  if (status === 'deferred') return null
  const source = isRecord(plan.source) ? plan.source : {}
  const imageRect = isRecord(source.imageRect) ? source.imageRect : {}
  return {
    assetIdentity: source.assetIdentity,
    provenanceIdentity: source.provenanceIdentity,
    width: imageRect.width,
    height: imageRect.height,
    contentBounds: source.contentRect,
  }
}

function reconstructInputFromSuccessEvidence(
  evidence: CaseInsertPresetPlainRecord,
  status: 'resolved' | 'deferred',
) {
  const plan = isRecord(evidence.plan) ? evidence.plan : {}
  const template = isRecord(plan.template) ? plan.template : {}
  const viewport = isRecord(plan.viewport) ? plan.viewport : {}
  const intent = isRecord(plan.intent) ? plan.intent : {}
  return {
    assignment: plan.assignment,
    template: {
      id: template.id,
      revision: template.revision,
      presetCompatibility: template.presetCompatibility,
    },
    action: {
      kind: CASE_INSERT_PRESET_ARTWORK_VIEWPORT_ACTION_KIND,
      formatVersion:
        CASE_INSERT_PRESET_ARTWORK_VIEWPORT_ACTION_FORMAT_VERSION,
      viewport: viewport.normalizedRegion,
      fitting: intent.declaration,
    },
    source: reconstructSourceFromSuccessPlan(plan, status),
    capabilities: plan.capabilities,
  }
}

function invalidSuccessEvidence(
  code: CaseInsertPresetArtworkViewportSuccessEvidenceValidationCode,
  path: string,
  detail?: string,
): CaseInsertPresetArtworkViewportSuccessEvidenceValidationResult {
  return deepFreezeCaseInsertPresetValue({
    ok: false,
    status: 'invalid',
    error: { code, path, ...(detail ? { detail } : {}) },
  })
}

/**
 * Reconstructs and reruns the pure planner, then returns that canonical result.
 * A structurally similar or merely frozen object is not accepted as validated
 * success evidence.
 */
export function validateCaseInsertPresetArtworkViewportPlanningSuccess(
  value: unknown,
): CaseInsertPresetArtworkViewportSuccessEvidenceValidationResult {
  const cloned = cloneCaseInsertPresetPlainInput(value)
  if (!cloned.ok) {
    return invalidSuccessEvidence(
      'evidence-not-plain',
      '$',
      cloned.code,
    )
  }
  if (!isRecord(cloned.value) ||
      !hasExactCaseInsertPresetKeys(cloned.value, SUCCESS_RESULT_FIELDS) ||
      cloned.value.ok !== true ||
      (cloned.value.status !== 'resolved' &&
        cloned.value.status !== 'deferred') ||
      !isRecord(cloned.value.plan)) {
    return invalidSuccessEvidence('evidence-not-success', '$')
  }

  const canonicalResult = planCaseInsertPresetArtworkViewport(
    reconstructInputFromSuccessEvidence(cloned.value, cloned.value.status),
  )
  if (!canonicalResult.ok ||
      canonicalResult.status !== cloned.value.status ||
      !canonicalEvidenceValuesMatch(cloned.value, canonicalResult)) {
    return invalidSuccessEvidence('evidence-noncanonical', '$')
  }

  return deepFreezeCaseInsertPresetValue({
    ok: true,
    status: 'canonical',
    canonicalResult,
  })
}
