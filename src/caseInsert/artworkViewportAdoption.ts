import type {
  AdditionalArtworkFrame,
  BackgroundImageSize,
  ProjectCaseInsertLayout,
  ProjectCaseInsertImageFit,
  ProjectCaseInsertImageSlot,
  ProjectCaseInsertReservedArtworkViewport,
  ProjectCaseInsertReservedArtworkViewportCoordinateBasis,
  ProjectImageAssetProvenance,
} from '../project/projectTypes.ts'
import {
  ADDITIONAL_ARTWORK_FRAME_JAGGEDNESS_MAX,
  ADDITIONAL_ARTWORK_FRAME_JAGGEDNESS_MIN,
  ADDITIONAL_ARTWORK_FRAME_LUMPINESS_MAX,
  ADDITIONAL_ARTWORK_FRAME_LUMPINESS_MIN,
  ADDITIONAL_ARTWORK_FRAME_ROUGHNESS_OFFSET_MAX,
  ADDITIONAL_ARTWORK_FRAME_ROUGHNESS_OFFSET_MIN,
  ADDITIONAL_ARTWORK_FRAME_WIDTH_MAX,
  ADDITIONAL_ARTWORK_FRAME_WIDTH_MIN,
} from '../project/additionalArtworkFrame.ts'
import {
  normalizeProjectImageAssetProvenance,
} from '../project/projectAssetStatus.ts'
import { normalizeImageSize } from '../project/savedProjectNormalization.ts'
import {
  CASE_INSERT_PRESET_MAX_OBJECT_ID_LENGTH,
  isCaseInsertPresetId,
  type CaseInsertPresetConcreteRegionId,
  type CaseInsertPresetId,
  type CaseInsertPresetRoleId,
} from '../presets/caseInsertPresetDefinition.ts'
import {
  validateCaseInsertPresetArtworkViewportPlanningSuccess,
} from '../presets/caseInsertPresetArtworkViewport.ts'
import {
  cloneCaseInsertPresetPlainInput,
  deepFreezeCaseInsertPresetValue,
  hasExactCaseInsertPresetKeys,
  sameCaseInsertPresetValue,
  type CaseInsertPresetPlainRecord,
} from '../presets/caseInsertPresetSafeInput.ts'
import {
  CASE_INSERT_RESERVED_ARTWORK_VIEWPORT_FORMAT_VERSION,
  CASE_INSERT_RESERVED_ARTWORK_VIEWPORT_KIND,
  CASE_INSERT_RESERVED_ARTWORK_VIEWPORT_PERCENT_MAX,
  CASE_INSERT_RESERVED_ARTWORK_VIEWPORT_PERCENT_MIN,
  CASE_INSERT_RESERVED_ARTWORK_VIEWPORT_ZOOM_MAX,
  CASE_INSERT_RESERVED_ARTWORK_VIEWPORT_ZOOM_MIN,
  normalizeProjectCaseInsertReservedArtworkViewport,
  type CaseInsertReservedArtworkViewportOwner,
} from './artworkViewportState.ts'
import {
  CASE_INSERT_TEXT_WIDTH_MAX,
  CASE_INSERT_TEXT_WIDTH_MIN,
} from './textLayout.ts'
import {
  CASE_INSERT_TEXT_FONT_SIZE_PT_MAX,
  CASE_INSERT_TEXT_FONT_SIZE_PT_MIN,
} from './textSizing.ts'

const ADOPTION_INPUT_FIELDS = Object.freeze(['slot', 'target', 'evidence'])
const ADOPTION_TARGET_FIELDS = Object.freeze([
  'templateId',
  'templateRevision',
  'presetId',
  'presetRevision',
  'slotId',
  'assignmentId',
  'ownerId',
  'objectId',
  'coordinateBasis',
])
const SLOT_ID_PATTERN = /^case:preset-slot:[a-z0-9]+(?:-[a-z0-9]+)*$/
const ASSIGNMENT_ID_PATTERN =
  /^case:preset-assignment:[a-z0-9]+(?:-[a-z0-9]+)*$/
const SLOT_REQUIRED_FIELDS = Object.freeze([
  'id',
  'label',
  'enabled',
  'imageDataUrl',
  'imageSize',
  'defaultSteamLogo',
  'fit',
  'layout',
  'frame',
])
const SLOT_OPTIONAL_FIELDS = Object.freeze([
  'imageSource',
  'reservedArtworkViewport',
])
const LAYOUT_REQUIRED_FIELDS = Object.freeze([
  'scale',
  'x',
  'y',
  'rotation',
])
const LAYOUT_OPTIONAL_FIELDS = Object.freeze(['fontSizePt', 'width'])
const IMAGE_SIZE_REQUIRED_FIELDS = Object.freeze(['width', 'height'])
const IMAGE_SIZE_OPTIONAL_FIELDS = Object.freeze([
  'contentBounds',
  'contentShape',
])
const IMAGE_SOURCE_REQUIRED_FIELDS = Object.freeze([
  'source',
  'sourceId',
  'sourceLabel',
])
const IMAGE_SOURCE_OPTIONAL_FIELDS = Object.freeze(['sourceUrl'])

export const CASE_INSERT_ARTWORK_VIEWPORT_ADOPTION_OWNER_IDS = Object.freeze([
  'case.cover.artwork-slots',
  'case.tray.artwork-slots',
  'case.spine.left.artwork-slots',
  'case.spine.right.artwork-slots',
] as const)

export type CaseInsertArtworkViewportAdoptionOwnerId =
  typeof CASE_INSERT_ARTWORK_VIEWPORT_ADOPTION_OWNER_IDS[number]

export type CaseInsertArtworkViewportAdoptionTarget = Readonly<{
  templateId: 'jewelCase'
  templateRevision: null
  presetId: CaseInsertPresetId
  presetRevision: number
  slotId: `case:preset-slot:${string}`
  assignmentId: `case:preset-assignment:${string}`
  ownerId: CaseInsertArtworkViewportAdoptionOwnerId
  objectId: string
  coordinateBasis: ProjectCaseInsertReservedArtworkViewportCoordinateBasis
}>

type DeepReadonly<T> = T extends readonly (infer Item)[]
  ? readonly DeepReadonly<Item>[]
  : T extends object
    ? { readonly [Key in keyof T]: DeepReadonly<T[Key]> }
    : T

export type CaseInsertArtworkViewportAdoptionInvalidCode =
  | 'input-not-plain'
  | 'unexpected-field'
  | 'slot-invalid'
  | 'target-invalid'
  | 'evidence-invalid'

export type CaseInsertArtworkViewportAdoptionCompatibilityCode =
  | 'assignment-target-mismatch'
  | 'template-target-mismatch'
  | 'owner-target-mismatch'
  | 'object-target-mismatch'
  | 'role-region-basis-target-mismatch'
  | 'capability-target-mismatch'

export type CaseInsertArtworkViewportAdoptionUnsupportedCode =
  | 'owner-unsupported'
  | 'template-unsupported'
  | 'deferred-explicit-crop-unsupported'
  | 'viewport-size-unsupported'
  | 'viewport-zoom-unsupported'

export type CaseInsertArtworkViewportAdoptionResult =
  | Readonly<{
      ok: true
      status: 'adopted'
      slot: DeepReadonly<ProjectCaseInsertImageSlot>
    }>
  | Readonly<{
      ok: false
      status: 'invalid'
      error: Readonly<{
        code: CaseInsertArtworkViewportAdoptionInvalidCode
        path: string
        detail?: string
      }>
    }>
  | Readonly<{
      ok: false
      status: 'incompatible'
      error: Readonly<{
        code: CaseInsertArtworkViewportAdoptionCompatibilityCode
        path: string
      }>
    }>
  | Readonly<{
      ok: false
      status: 'unsupported'
      error: Readonly<{
        code: CaseInsertArtworkViewportAdoptionUnsupportedCode
        path: string
        ownerId?: string
      }>
    }>

type OwnerBinding = Readonly<{
  region: CaseInsertPresetConcreteRegionId
  roleId: CaseInsertPresetRoleId
  viewportOwner: CaseInsertReservedArtworkViewportOwner
  coordinateBases:
    readonly ProjectCaseInsertReservedArtworkViewportCoordinateBasis[]
}>

const OWNER_BINDINGS = Object.freeze({
  'case.cover.artwork-slots': Object.freeze({
    region: 'front-cover',
    roleId: 'additional-artwork',
    viewportOwner: 'cover',
    coordinateBases: Object.freeze(['front', 'frontSafe'] as const),
  }),
  'case.tray.artwork-slots': Object.freeze({
    region: 'back-panel',
    roleId: 'screenshots',
    viewportOwner: 'tray',
    coordinateBases: Object.freeze(['backPanel', 'backPanelSafe'] as const),
  }),
  'case.spine.left.artwork-slots': Object.freeze({
    region: 'left-spine',
    roleId: 'additional-artwork',
    viewportOwner: 'leftSpine',
    coordinateBases: Object.freeze(['leftSpine', 'leftSpineSafe'] as const),
  }),
  'case.spine.right.artwork-slots': Object.freeze({
    region: 'right-spine',
    roleId: 'additional-artwork',
    viewportOwner: 'rightSpine',
    coordinateBases: Object.freeze(['rightSpine', 'rightSpineSafe'] as const),
  }),
} satisfies Readonly<Record<
  CaseInsertArtworkViewportAdoptionOwnerId,
  OwnerBinding
>>)

function isRecord(value: unknown): value is CaseInsertPresetPlainRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasRequiredAndAllowedKeys(
  value: CaseInsertPresetPlainRecord,
  required: readonly string[],
  optional: readonly string[] = [],
) {
  const keys = Object.keys(value)
  const allowed = new Set([...required, ...optional])
  return required.every((key) => Object.hasOwn(value, key)) &&
    keys.every((key) => allowed.has(key))
}

function isFiniteWithin(
  value: unknown,
  minimum: number,
  maximum: number,
): value is number {
  return typeof value === 'number' && Number.isFinite(value) &&
    value >= minimum && value <= maximum
}

function invalid(
  code: CaseInsertArtworkViewportAdoptionInvalidCode,
  path: string,
  detail?: string,
): CaseInsertArtworkViewportAdoptionResult {
  return deepFreezeCaseInsertPresetValue({
    ok: false,
    status: 'invalid',
    error: { code, path, ...(detail ? { detail } : {}) },
  })
}

function incompatible(
  code: CaseInsertArtworkViewportAdoptionCompatibilityCode,
  path: string,
): CaseInsertArtworkViewportAdoptionResult {
  return deepFreezeCaseInsertPresetValue({
    ok: false,
    status: 'incompatible',
    error: { code, path },
  })
}

function unsupported(
  code: CaseInsertArtworkViewportAdoptionUnsupportedCode,
  path: string,
  ownerId?: string,
): CaseInsertArtworkViewportAdoptionResult {
  return deepFreezeCaseInsertPresetValue({
    ok: false,
    status: 'unsupported',
    error: { code, path, ...(ownerId ? { ownerId } : {}) },
  })
}

function isSupportedOwnerId(
  value: unknown,
): value is CaseInsertArtworkViewportAdoptionOwnerId {
  return typeof value === 'string' &&
    CASE_INSERT_ARTWORK_VIEWPORT_ADOPTION_OWNER_IDS.some(
      (ownerId) => ownerId === value,
    )
}

function parseTarget(
  value: CaseInsertPresetPlainRecord,
): CaseInsertArtworkViewportAdoptionTarget | CaseInsertArtworkViewportAdoptionResult {
  if (!hasExactCaseInsertPresetKeys(value, ADOPTION_TARGET_FIELDS)) {
    return invalid('unexpected-field', 'target')
  }
  if (typeof value.ownerId !== 'string') {
    return invalid('target-invalid', 'target.ownerId')
  }
  if (!isSupportedOwnerId(value.ownerId)) {
    return unsupported('owner-unsupported', 'target.ownerId', value.ownerId)
  }
  if (value.templateId !== 'jewelCase' || value.templateRevision !== null) {
    return unsupported('template-unsupported', 'target.templateId')
  }
  if (!isCaseInsertPresetId(value.presetId) ||
      typeof value.presetRevision !== 'number' ||
      !Number.isSafeInteger(value.presetRevision) ||
      value.presetRevision <= 0 ||
      typeof value.slotId !== 'string' ||
      !SLOT_ID_PATTERN.test(value.slotId) ||
      typeof value.assignmentId !== 'string' ||
      !ASSIGNMENT_ID_PATTERN.test(value.assignmentId) ||
      typeof value.objectId !== 'string' ||
      value.objectId.length === 0 ||
      value.objectId.length > CASE_INSERT_PRESET_MAX_OBJECT_ID_LENGTH ||
      value.objectId.trim() !== value.objectId ||
      typeof value.coordinateBasis !== 'string') {
    return invalid('target-invalid', 'target')
  }

  const binding = OWNER_BINDINGS[value.ownerId]
  if (!binding.coordinateBases.some(
    (coordinateBasis) => coordinateBasis === value.coordinateBasis,
  )) {
    return incompatible(
      'role-region-basis-target-mismatch',
      'target.coordinateBasis',
    )
  }

  return value as unknown as CaseInsertArtworkViewportAdoptionTarget
}

type ParsedValue<T> = Readonly<{ ok: true; value: T }> |
  Readonly<{ ok: false }>

function parsed<T>(value: T): ParsedValue<T> {
  return { ok: true, value }
}

const PARSE_FAILURE: ParsedValue<never> = Object.freeze({ ok: false })

function parseImageSource(
  value: unknown,
): ParsedValue<ProjectImageAssetProvenance | null> {
  if (value === null) return parsed(null)
  if (!isRecord(value) ||
      !hasRequiredAndAllowedKeys(
        value,
        IMAGE_SOURCE_REQUIRED_FIELDS,
        IMAGE_SOURCE_OPTIONAL_FIELDS,
      )) {
    return PARSE_FAILURE
  }
  const normalized = normalizeProjectImageAssetProvenance(
    value as Partial<ProjectImageAssetProvenance>,
    null,
  )
  if (!normalized ||
      normalized.source !== value.source ||
      normalized.sourceId !== value.sourceId ||
      normalized.sourceLabel !== value.sourceLabel ||
      (Object.hasOwn(value, 'sourceUrl') &&
        normalized.sourceUrl !== value.sourceUrl)) {
    return PARSE_FAILURE
  }
  return parsed({
    source: normalized.source,
    sourceId: normalized.sourceId,
    sourceLabel: normalized.sourceLabel,
    ...(Object.hasOwn(value, 'sourceUrl')
      ? { sourceUrl: normalized.sourceUrl ?? null }
      : {}),
  })
}

function parseImageSize(
  value: unknown,
): ParsedValue<BackgroundImageSize | null> {
  if (value === null) return parsed(null)
  if (!isRecord(value) ||
      !hasRequiredAndAllowedKeys(
        value,
        IMAGE_SIZE_REQUIRED_FIELDS,
        IMAGE_SIZE_OPTIONAL_FIELDS,
      )) {
    return PARSE_FAILURE
  }
  const normalized = normalizeImageSize(value)
  if (!normalized) return PARSE_FAILURE

  const expected = {
    width: value.width,
    height: value.height,
    ...(Object.hasOwn(value, 'contentBounds') && value.contentBounds !== null
      ? { contentBounds: value.contentBounds }
      : {}),
    ...(Object.hasOwn(value, 'contentShape') && value.contentShape !== null
      ? { contentShape: value.contentShape }
      : {}),
  }
  if (!sameCaseInsertPresetValue(normalized, expected)) return PARSE_FAILURE

  return parsed({
    width: normalized.width,
    height: normalized.height,
    ...(Object.hasOwn(value, 'contentBounds')
      ? { contentBounds: value.contentBounds as BackgroundImageSize['contentBounds'] }
      : {}),
    ...(Object.hasOwn(value, 'contentShape')
      ? { contentShape: value.contentShape as BackgroundImageSize['contentShape'] }
      : {}),
  })
}

function parseLayout(
  value: unknown,
): ParsedValue<ProjectCaseInsertLayout> {
  if (!isRecord(value) ||
      !hasRequiredAndAllowedKeys(
        value,
        LAYOUT_REQUIRED_FIELDS,
        LAYOUT_OPTIONAL_FIELDS,
      ) ||
      typeof value.scale !== 'number' ||
      !Number.isFinite(value.scale) || value.scale <= 0 ||
      typeof value.x !== 'number' || !Number.isFinite(value.x) ||
      typeof value.y !== 'number' || !Number.isFinite(value.y) ||
      typeof value.rotation !== 'number' || !Number.isFinite(value.rotation) ||
      (Object.hasOwn(value, 'fontSizePt') &&
        !isFiniteWithin(
          value.fontSizePt,
          CASE_INSERT_TEXT_FONT_SIZE_PT_MIN,
          CASE_INSERT_TEXT_FONT_SIZE_PT_MAX,
        )) ||
      (Object.hasOwn(value, 'width') &&
        !isFiniteWithin(
          value.width,
          CASE_INSERT_TEXT_WIDTH_MIN,
          CASE_INSERT_TEXT_WIDTH_MAX,
        ))) {
    return PARSE_FAILURE
  }
  return parsed({
    scale: value.scale,
    ...(Object.hasOwn(value, 'fontSizePt')
      ? { fontSizePt: value.fontSizePt as number }
      : {}),
    ...(Object.hasOwn(value, 'width')
      ? { width: value.width as number }
      : {}),
    x: value.x,
    y: value.y,
    rotation: value.rotation,
  })
}

function parseFrame(
  value: unknown,
): ParsedValue<AdditionalArtworkFrame> {
  if (!isRecord(value) ||
      !hasExactCaseInsertPresetKeys(value, [
        'enabled',
        'color',
        'width',
        'shape',
        'style',
        'lumpiness',
        'jaggedness',
        'roughnessOffset',
      ]) ||
      typeof value.enabled !== 'boolean' ||
      typeof value.color !== 'string' || !value.color.trim() ||
      !isFiniteWithin(
        value.width,
        ADDITIONAL_ARTWORK_FRAME_WIDTH_MIN,
        ADDITIONAL_ARTWORK_FRAME_WIDTH_MAX,
      ) ||
      (value.shape !== 'rectangle' && value.shape !== 'circle') ||
      (value.style !== 'solid' && value.style !== 'rocky') ||
      !isFiniteWithin(
        value.lumpiness,
        ADDITIONAL_ARTWORK_FRAME_LUMPINESS_MIN,
        ADDITIONAL_ARTWORK_FRAME_LUMPINESS_MAX,
      ) ||
      !isFiniteWithin(
        value.jaggedness,
        ADDITIONAL_ARTWORK_FRAME_JAGGEDNESS_MIN,
        ADDITIONAL_ARTWORK_FRAME_JAGGEDNESS_MAX,
      ) ||
      !isFiniteWithin(
        value.roughnessOffset,
        ADDITIONAL_ARTWORK_FRAME_ROUGHNESS_OFFSET_MIN,
        ADDITIONAL_ARTWORK_FRAME_ROUGHNESS_OFFSET_MAX,
      )) {
    return PARSE_FAILURE
  }
  return parsed({
    enabled: value.enabled,
    color: value.color,
    width: value.width,
    shape: value.shape,
    style: value.style,
    lumpiness: value.lumpiness,
    jaggedness: value.jaggedness,
    roughnessOffset: value.roughnessOffset,
  })
}

function parseSlot(
  value: CaseInsertPresetPlainRecord,
  viewportOwner: CaseInsertReservedArtworkViewportOwner,
): ProjectCaseInsertImageSlot | null {
  if (!hasRequiredAndAllowedKeys(
    value,
    SLOT_REQUIRED_FIELDS,
    SLOT_OPTIONAL_FIELDS,
  ) ||
      typeof value.id !== 'string' || value.id.length === 0 ||
      value.id.length > CASE_INSERT_PRESET_MAX_OBJECT_ID_LENGTH ||
      value.id.trim() !== value.id ||
      typeof value.label !== 'string' ||
      typeof value.enabled !== 'boolean' ||
      value.defaultSteamLogo !== null ||
      (value.imageDataUrl !== null && typeof value.imageDataUrl !== 'string') ||
      (value.fit !== 'contain' && value.fit !== 'cover' &&
        value.fit !== 'crop' && value.fit !== 'scale')) {
    return null
  }

  const imageSource = Object.hasOwn(value, 'imageSource')
    ? parseImageSource(value.imageSource)
    : parsed<ProjectImageAssetProvenance | null>(null)
  const imageSize = parseImageSize(value.imageSize)
  const layout = parseLayout(value.layout)
  const frame = parseFrame(value.frame)
  if (!imageSource.ok || !imageSize.ok || !layout.ok || !frame.ok) return null

  if (Object.hasOwn(value, 'reservedArtworkViewport') &&
      value.reservedArtworkViewport !== null) {
    const normalized = normalizeProjectCaseInsertReservedArtworkViewport(
      value.reservedArtworkViewport,
      viewportOwner,
    )
    if (!normalized ||
        !sameCaseInsertPresetValue(
          normalized,
          value.reservedArtworkViewport,
        )) {
      return null
    }
  }

  return {
    id: value.id,
    label: value.label,
    enabled: value.enabled,
    imageDataUrl: value.imageDataUrl,
    ...(Object.hasOwn(value, 'imageSource')
      ? { imageSource: imageSource.value }
      : {}),
    imageSize: imageSize.value,
    defaultSteamLogo: null,
    fit: value.fit,
    layout: layout.value,
    frame: frame.value,
    ...(Object.hasOwn(value, 'reservedArtworkViewport')
      ? {
          reservedArtworkViewport:
            value.reservedArtworkViewport as
              ProjectCaseInsertReservedArtworkViewport | null,
        }
      : {}),
  }
}

function fittingState(
  declaration: Readonly<{ mode: string }>,
  plan: Extract<
    ReturnType<typeof validateCaseInsertPresetArtworkViewportPlanningSuccess>,
    Readonly<{ ok: true }>
  >['canonicalResult']['plan'],
): Readonly<{
  fit: ProjectCaseInsertImageFit
  focalPosition: Readonly<{ xPercent: number; yPercent: number }>
  zoom: number
}> | CaseInsertArtworkViewportAdoptionResult {
  if (declaration.mode === 'contain' || declaration.mode === 'cover') {
    return {
      fit: declaration.mode,
      focalPosition: { xPercent: 50, yPercent: 50 },
      zoom: 1,
    }
  }
  if (declaration.mode !== 'explicit-crop') {
    return invalid('evidence-invalid', 'evidence.plan.intent.declaration')
  }
  if (plan.resolution === 'deferred') {
    return unsupported(
      'deferred-explicit-crop-unsupported',
      'evidence.plan.resolution',
    )
  }
  if (!plan.fitting.derivedFocalPosition ||
      plan.fitting.derivedZoom === null) {
    return invalid('evidence-invalid', 'evidence.plan.fitting')
  }
  if (plan.fitting.derivedZoom <
        CASE_INSERT_RESERVED_ARTWORK_VIEWPORT_ZOOM_MIN ||
      plan.fitting.derivedZoom >
        CASE_INSERT_RESERVED_ARTWORK_VIEWPORT_ZOOM_MAX) {
    return unsupported(
      'viewport-zoom-unsupported',
      'evidence.plan.fitting.derivedZoom',
    )
  }
  return {
    fit: 'crop',
    focalPosition: { ...plan.fitting.derivedFocalPosition },
    zoom: plan.fitting.derivedZoom,
  }
}

/**
 * Pure owner adapter from canonical planner evidence to one ordinary repeated
 * Case artwork slot. It has no catalog, lifecycle, command, React, renderer,
 * export, or persistence side effects.
 */
export function adoptCaseInsertArtworkViewport(
  value: unknown,
): CaseInsertArtworkViewportAdoptionResult {
  const cloned = cloneCaseInsertPresetPlainInput(value)
  if (!cloned.ok) {
    return invalid('input-not-plain', '$', cloned.code)
  }
  if (!isRecord(cloned.value) ||
      !hasExactCaseInsertPresetKeys(cloned.value, ADOPTION_INPUT_FIELDS)) {
    return invalid(
      isRecord(cloned.value) ? 'unexpected-field' : 'input-not-plain',
      '$',
    )
  }
  if (!isRecord(cloned.value.slot)) {
    return invalid('slot-invalid', 'slot')
  }
  if (!isRecord(cloned.value.target)) {
    return invalid('target-invalid', 'target')
  }

  const target = parseTarget(cloned.value.target)
  if ('ok' in target) return target
  const slot = parseSlot(
    cloned.value.slot,
    OWNER_BINDINGS[target.ownerId].viewportOwner,
  )
  if (!slot) return invalid('slot-invalid', 'slot')

  const validated =
    validateCaseInsertPresetArtworkViewportPlanningSuccess(
      cloned.value.evidence,
    )
  if (!validated.ok) {
    return invalid(
      'evidence-invalid',
      'evidence',
      validated.error.code,
    )
  }

  const { plan } = validated.canonicalResult
  const compatibility = plan.template.presetCompatibility
  if (plan.template.id !== target.templateId ||
      plan.template.revision !== target.templateRevision ||
      compatibility.presetId !== target.presetId ||
      compatibility.presetRevision !== target.presetRevision ||
      (compatibility.mode === 'specific-template' &&
        compatibility.templateId !== target.templateId)) {
    return incompatible('template-target-mismatch', 'evidence.plan.template')
  }
  if (plan.assignment.presetId !== target.presetId ||
      plan.assignment.presetRevision !== target.presetRevision ||
      plan.assignment.slotId !== target.slotId ||
      plan.assignment.assignmentId !== target.assignmentId) {
    return incompatible(
      'assignment-target-mismatch',
      'evidence.plan.assignment',
    )
  }
  if (plan.assignment.ownerId !== target.ownerId) {
    return incompatible(
      'owner-target-mismatch',
      'evidence.plan.assignment.ownerId',
    )
  }
  if (plan.assignment.object.kind !== 'repeated' ||
      plan.assignment.object.id !== target.objectId ||
      target.objectId !== slot.id) {
    return incompatible(
      'object-target-mismatch',
      'evidence.plan.assignment.object',
    )
  }

  const binding = OWNER_BINDINGS[target.ownerId]
  if (plan.assignment.region !== binding.region ||
      plan.assignment.roleId !== binding.roleId ||
      plan.assignment.coordinateBasis !== target.coordinateBasis ||
      !binding.coordinateBases.some(
        (coordinateBasis) => coordinateBasis === target.coordinateBasis,
      )) {
    return incompatible(
      'role-region-basis-target-mismatch',
      'evidence.plan.assignment',
    )
  }
  if (plan.capabilities.ownerId !== target.ownerId ||
      plan.capabilities.object.kind !== 'repeated' ||
      plan.capabilities.object.id !== target.objectId) {
    return incompatible(
      'capability-target-mismatch',
      'evidence.plan.capabilities',
    )
  }

  const normalizedRegion = plan.viewport.normalizedRegion
  if (normalizedRegion.widthPercent <
        CASE_INSERT_RESERVED_ARTWORK_VIEWPORT_PERCENT_MIN ||
      normalizedRegion.widthPercent >
        CASE_INSERT_RESERVED_ARTWORK_VIEWPORT_PERCENT_MAX ||
      normalizedRegion.heightPercent <
        CASE_INSERT_RESERVED_ARTWORK_VIEWPORT_PERCENT_MIN ||
      normalizedRegion.heightPercent >
        CASE_INSERT_RESERVED_ARTWORK_VIEWPORT_PERCENT_MAX) {
    return unsupported(
      'viewport-size-unsupported',
      'evidence.plan.viewport.normalizedRegion',
    )
  }
  const fitting = fittingState(plan.intent.declaration, plan)
  if ('ok' in fitting) return fitting
  const reservedArtworkViewport: ProjectCaseInsertReservedArtworkViewport = {
    kind: CASE_INSERT_RESERVED_ARTWORK_VIEWPORT_KIND,
    formatVersion: CASE_INSERT_RESERVED_ARTWORK_VIEWPORT_FORMAT_VERSION,
    templateId: target.templateId,
    templateRevision: target.templateRevision,
    coordinateBasis: target.coordinateBasis,
    widthPercent: normalizedRegion.widthPercent,
    heightPercent: normalizedRegion.heightPercent,
    focalPosition: { ...fitting.focalPosition },
    zoom: fitting.zoom,
  }
  const adoptedSlot: ProjectCaseInsertImageSlot = {
    ...slot,
    fit: fitting.fit,
    layout: {
      ...slot.layout,
      scale: 1,
      x: normalizedRegion.centerXPercent,
      y: normalizedRegion.centerYPercent,
    },
    reservedArtworkViewport,
  }

  return deepFreezeCaseInsertPresetValue({
    ok: true,
    status: 'adopted',
    slot: adoptedSlot,
  })
}
