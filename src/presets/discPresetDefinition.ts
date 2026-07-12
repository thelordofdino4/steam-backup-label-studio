import {
  DISC_GUIDED_SLOT_IDS,
  type DiscGuidedSlotId,
} from '../guidedPresets/discGuidedSlots.ts'

export const DISC_PRESET_DEFINITION_KIND = 'sbls/disc-preset' as const
export const DISC_PRESET_FORMAT_VERSION = 1 as const
export const DISC_PRESET_MAX_SLOTS = 32
export const DISC_PRESET_MAX_NAME_LENGTH = 120
export const DISC_PRESET_MAX_DESCRIPTION_LENGTH = 1000
export const DISC_PRESET_MAX_TEMPLATE_ID_LENGTH = 120

export type DiscPresetId =
  | `builtin:disc-preset:${string}`
  | `user:disc-preset:${string}`

export type DiscNormalizedRegion = Readonly<{
  centerXPercent: number
  centerYPercent: number
  widthPercent: number
  heightPercent: number
}>

export type DiscPresetTemplateCompatibility =
  | Readonly<{
      mode: 'any-disc-template'
      onConflict: 'resolve' | 'reject'
    }>
  | Readonly<{
      mode: 'specific-template'
      templateId: string
      onConflict: 'resolve' | 'reject'
    }>

export type DiscPointPresetTarget =
  | 'game-title.artwork'
  | 'rating.primary'
  | 'media-format.primary'
  | 'developer-logo.primary'
  | 'publisher-logo.primary'

export type DiscTextPresetTarget =
  | 'game-title.text'
  | 'legal.copyright'

export type DiscPresetSizePolicyV1 =
  | Readonly<{ mode: 'fixed-scale'; scale: number }>
  | Readonly<{ mode: 'fit-region' }>

export type DiscPointPlacementIntentV1 = Readonly<{
  kind: 'point'
  target: DiscPointPresetTarget
  size: DiscPresetSizePolicyV1
}>

export type DiscTextPlacementIntentV1 = Readonly<{
  kind: 'text'
  target: DiscTextPresetTarget
  mode: 'straight'
  align: 'left' | 'center' | 'right'
  fit: 'region' | 'fixed'
  fontSizePt?: number
}>

export type DiscBackgroundPlacementIntentV1 = Readonly<{
  kind: 'background'
  target: 'background.primary'
  fit: 'cover'
  scale: number
}>

export type DiscGroupPlacementIntentV1 = Readonly<{
  kind: 'group'
  target: 'operating-system-marks.enabled'
  preferredScale?: number
}>

export type DiscPresetPlacementIntentV1 =
  | DiscPointPlacementIntentV1
  | DiscTextPlacementIntentV1
  | DiscBackgroundPlacementIntentV1
  | DiscGroupPlacementIntentV1

export type DiscPresetSlotDefinitionV1 = Readonly<{
  id: DiscGuidedSlotId
  contentRegion: DiscNormalizedRegion
  actionRegion?: DiscNormalizedRegion
  visualLayer: 'background' | 'foreground'
  placements: readonly DiscPresetPlacementIntentV1[]
}>

export type DiscPresetDefinitionV1 = Readonly<{
  kind: typeof DISC_PRESET_DEFINITION_KIND
  formatVersion: typeof DISC_PRESET_FORMAT_VERSION
  id: DiscPresetId
  revision: number
  name: string
  description?: string
  surface: 'disc'
  compatibility: DiscPresetTemplateCompatibility
  slots: readonly DiscPresetSlotDefinitionV1[]
}>

export type DiscPresetDefinitionParseErrorCode =
  | 'invalid-root'
  | 'unexpected-field'
  | 'unsupported-kind'
  | 'unsupported-format-version'
  | 'invalid-id'
  | 'invalid-revision'
  | 'invalid-name'
  | 'invalid-description'
  | 'invalid-surface'
  | 'invalid-compatibility'
  | 'too-many-slots'
  | 'invalid-slot'
  | 'duplicate-slot'
  | 'unsupported-slot'
  | 'invalid-region'
  | 'invalid-visual-layer'
  | 'invalid-placement'
  | 'unsupported-placement'
  | 'unsupported-target'
  | 'target-slot-mismatch'
  | 'duplicate-target'

export type DiscPresetDefinitionParseResult =
  | Readonly<{ ok: true; value: DiscPresetDefinitionV1 }>
  | Readonly<{
      ok: false
      error: Readonly<{
        code: DiscPresetDefinitionParseErrorCode
        path: string
      }>
    }>

type UnknownRecord = Record<string, unknown>
type DiscPresetPlacementTarget = DiscPresetPlacementIntentV1['target']

const DEFINITION_FIELDS = new Set([
  'kind',
  'formatVersion',
  'id',
  'revision',
  'name',
  'description',
  'surface',
  'compatibility',
  'slots',
])
const SLOT_FIELDS = new Set([
  'id',
  'contentRegion',
  'actionRegion',
  'visualLayer',
  'placements',
])
const REGION_FIELDS = new Set([
  'centerXPercent',
  'centerYPercent',
  'widthPercent',
  'heightPercent',
])
const ANY_TEMPLATE_FIELDS = new Set(['mode', 'onConflict'])
const SPECIFIC_TEMPLATE_FIELDS = new Set(['mode', 'templateId', 'onConflict'])
const POINT_FIELDS = new Set(['kind', 'target', 'size'])
const TEXT_FIELDS = new Set([
  'kind',
  'target',
  'mode',
  'align',
  'fit',
  'fontSizePt',
])
const BACKGROUND_FIELDS = new Set(['kind', 'target', 'fit', 'scale'])
const GROUP_FIELDS = new Set(['kind', 'target', 'preferredScale'])
const FIXED_SCALE_FIELDS = new Set(['mode', 'scale'])
const FIT_REGION_FIELDS = new Set(['mode'])
const SUPPORTED_SLOT_IDS = new Set<string>(DISC_GUIDED_SLOT_IDS)
const BUILTIN_ID_PATTERN = /^builtin:disc-preset:[a-z0-9]+(?:-[a-z0-9]+)*$/
const USER_ID_PATTERN = /^user:disc-preset:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

const ALLOWED_TARGETS_BY_SLOT: Readonly<
  Partial<Record<DiscGuidedSlotId, ReadonlySet<DiscPresetPlacementTarget>>>
> = {
  'disc:guided:game-title:primary': new Set([
    'game-title.artwork',
    'game-title.text',
  ]),
  'disc:guided:background-image:primary': new Set(['background.primary']),
  'disc:guided:rating-badge:primary': new Set(['rating.primary']),
  'disc:guided:media-format-mark:primary': new Set(['media-format.primary']),
  'disc:guided:operating-system-marks:group': new Set([
    'operating-system-marks.enabled',
  ]),
  'disc:guided:developer-logo:primary': new Set(['developer-logo.primary']),
  'disc:guided:publisher-logo:primary': new Set(['publisher-logo.primary']),
  'disc:guided:legal-text:copyright': new Set(['legal.copyright']),
}

function failure(
  code: DiscPresetDefinitionParseErrorCode,
  path: string,
): DiscPresetDefinitionParseResult {
  return Object.freeze({
    ok: false,
    error: Object.freeze({ code, path }),
  })
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasOnlyFields(value: UnknownRecord, fields: ReadonlySet<string>) {
  return Object.keys(value).every((field) => fields.has(field))
}

function isPositiveSafeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) > 0
}

function isFiniteInRange(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isFinite(value) &&
    value >= min && value <= max
}

function isPositiveScale(value: unknown): value is number {
  return isFiniteInRange(value, Number.EPSILON, 10)
}

export function isDiscPresetId(value: unknown): value is DiscPresetId {
  return typeof value === 'string' &&
    (BUILTIN_ID_PATTERN.test(value) || USER_ID_PATTERN.test(value))
}

export function isBuiltInDiscPresetId(
  value: unknown,
): value is `builtin:disc-preset:${string}` {
  return typeof value === 'string' && BUILTIN_ID_PATTERN.test(value)
}

export function isUserDiscPresetId(
  value: unknown,
): value is `user:disc-preset:${string}` {
  return typeof value === 'string' && USER_ID_PATTERN.test(value)
}

function parseRegion(value: unknown): DiscNormalizedRegion | null {
  if (!isRecord(value) || !hasOnlyFields(value, REGION_FIELDS)) return null
  if (
    !isFiniteInRange(value.centerXPercent, 0, 100) ||
    !isFiniteInRange(value.centerYPercent, 0, 100) ||
    !isFiniteInRange(value.widthPercent, Number.EPSILON, 100) ||
    !isFiniteInRange(value.heightPercent, Number.EPSILON, 100)
  ) {
    return null
  }

  return Object.freeze({
    centerXPercent: value.centerXPercent,
    centerYPercent: value.centerYPercent,
    widthPercent: value.widthPercent,
    heightPercent: value.heightPercent,
  })
}

function parseCompatibility(
  value: unknown,
): DiscPresetTemplateCompatibility | null {
  if (!isRecord(value)) return null
  if (value.onConflict !== 'resolve' && value.onConflict !== 'reject') return null

  if (value.mode === 'any-disc-template') {
    if (!hasOnlyFields(value, ANY_TEMPLATE_FIELDS)) return null
    return Object.freeze({
      mode: value.mode,
      onConflict: value.onConflict,
    })
  }

  if (value.mode === 'specific-template') {
    if (!hasOnlyFields(value, SPECIFIC_TEMPLATE_FIELDS)) return null
    if (typeof value.templateId !== 'string') return null
    const templateId = value.templateId.trim()
    if (!templateId || templateId.length > DISC_PRESET_MAX_TEMPLATE_ID_LENGTH) {
      return null
    }
    return Object.freeze({
      mode: value.mode,
      templateId,
      onConflict: value.onConflict,
    })
  }

  return null
}

function parseSizePolicy(value: unknown): DiscPresetSizePolicyV1 | null {
  if (!isRecord(value)) return null

  if (value.mode === 'fixed-scale') {
    return hasOnlyFields(value, FIXED_SCALE_FIELDS) && isPositiveScale(value.scale)
      ? Object.freeze({ mode: value.mode, scale: value.scale })
      : null
  }

  return value.mode === 'fit-region' && hasOnlyFields(value, FIT_REGION_FIELDS)
    ? Object.freeze({ mode: value.mode })
    : null
}

function parsePlacementIntent(value: unknown): DiscPresetPlacementIntentV1 | null {
  if (!isRecord(value) || typeof value.kind !== 'string') return null

  if (value.kind === 'point') {
    const size = parseSizePolicy(value.size)
    if (!hasOnlyFields(value, POINT_FIELDS) || !size) return null
    if (![
      'game-title.artwork',
      'rating.primary',
      'media-format.primary',
      'developer-logo.primary',
      'publisher-logo.primary',
    ].includes(String(value.target))) return null
    return Object.freeze({
      kind: value.kind,
      target: value.target as DiscPointPresetTarget,
      size,
    })
  }

  if (value.kind === 'text') {
    if (!hasOnlyFields(value, TEXT_FIELDS)) return null
    if (!['game-title.text', 'legal.copyright'].includes(String(value.target))) {
      return null
    }
    if (value.mode !== 'straight') return null
    if (!['left', 'center', 'right'].includes(String(value.align))) return null
    if (value.fit !== 'region' && value.fit !== 'fixed') return null
    if (value.fontSizePt !== undefined && !isFiniteInRange(value.fontSizePt, 1, 96)) {
      return null
    }
    return Object.freeze({
      kind: value.kind,
      target: value.target as DiscTextPresetTarget,
      mode: value.mode,
      align: value.align as DiscTextPlacementIntentV1['align'],
      fit: value.fit,
      ...(value.fontSizePt === undefined ? {} : { fontSizePt: value.fontSizePt }),
    })
  }

  if (value.kind === 'background') {
    if (
      !hasOnlyFields(value, BACKGROUND_FIELDS) ||
      value.target !== 'background.primary' ||
      value.fit !== 'cover' ||
      !isPositiveScale(value.scale)
    ) return null
    return Object.freeze({
      kind: value.kind,
      target: value.target,
      fit: value.fit,
      scale: value.scale,
    })
  }

  if (value.kind === 'group') {
    if (
      !hasOnlyFields(value, GROUP_FIELDS) ||
      value.target !== 'operating-system-marks.enabled' ||
      (value.preferredScale !== undefined && !isPositiveScale(value.preferredScale))
    ) return null
    return Object.freeze({
      kind: value.kind,
      target: value.target,
      ...(value.preferredScale === undefined
        ? {}
        : { preferredScale: value.preferredScale }),
    })
  }

  return null
}

function parseSlot(
  value: unknown,
  index: number,
): DiscPresetDefinitionParseResult | DiscPresetSlotDefinitionV1 {
  const path = `slots[${index}]`
  if (!isRecord(value) || !hasOnlyFields(value, SLOT_FIELDS)) {
    return failure(isRecord(value) ? 'unexpected-field' : 'invalid-slot', path)
  }
  if (typeof value.id !== 'string' || !SUPPORTED_SLOT_IDS.has(value.id)) {
    return failure('unsupported-slot', `${path}.id`)
  }
  const slotId = value.id as DiscGuidedSlotId
  const allowedTargets = ALLOWED_TARGETS_BY_SLOT[slotId]
  if (!allowedTargets) return failure('unsupported-slot', `${path}.id`)

  const contentRegion = parseRegion(value.contentRegion)
  if (!contentRegion) return failure('invalid-region', `${path}.contentRegion`)
  const actionRegion = value.actionRegion === undefined
    ? undefined
    : parseRegion(value.actionRegion)
  if (value.actionRegion !== undefined && !actionRegion) {
    return failure('invalid-region', `${path}.actionRegion`)
  }
  if (value.visualLayer !== 'background' && value.visualLayer !== 'foreground') {
    return failure('invalid-visual-layer', `${path}.visualLayer`)
  }
  if (!Array.isArray(value.placements) || value.placements.length === 0) {
    return failure('invalid-placement', `${path}.placements`)
  }

  const placements: DiscPresetPlacementIntentV1[] = []
  const targets = new Set<string>()
  for (let placementIndex = 0; placementIndex < value.placements.length; placementIndex += 1) {
    const rawPlacement = value.placements[placementIndex]
    if (!isRecord(rawPlacement) || typeof rawPlacement.kind !== 'string') {
      return failure('invalid-placement', `${path}.placements[${placementIndex}]`)
    }
    if (!['point', 'text', 'background', 'group'].includes(rawPlacement.kind)) {
      return failure('unsupported-placement', `${path}.placements[${placementIndex}].kind`)
    }
    const placement = parsePlacementIntent(rawPlacement)
    if (!placement) {
      const knownTargets = [
        'game-title.artwork',
        'game-title.text',
        'background.primary',
        'rating.primary',
        'media-format.primary',
        'operating-system-marks.enabled',
        'developer-logo.primary',
        'publisher-logo.primary',
        'legal.copyright',
      ]
      const code = typeof rawPlacement.target === 'string' &&
          !knownTargets.includes(rawPlacement.target)
        ? 'unsupported-target'
        : 'invalid-placement'
      return failure(code, `${path}.placements[${placementIndex}]`)
    }
    if (!allowedTargets.has(placement.target)) {
      return failure('target-slot-mismatch', `${path}.placements[${placementIndex}].target`)
    }
    if (targets.has(placement.target)) {
      return failure('duplicate-target', `${path}.placements[${placementIndex}].target`)
    }
    targets.add(placement.target)
    placements.push(placement)
  }

  return Object.freeze({
    id: slotId,
    contentRegion,
    ...(actionRegion ? { actionRegion } : {}),
    visualLayer: value.visualLayer,
    placements: Object.freeze(placements),
  })
}

export function parseDiscPresetDefinition(
  value: unknown,
): DiscPresetDefinitionParseResult {
  if (!isRecord(value)) return failure('invalid-root', '$')
  if (!hasOnlyFields(value, DEFINITION_FIELDS)) return failure('unexpected-field', '$')
  if (value.kind !== DISC_PRESET_DEFINITION_KIND) return failure('unsupported-kind', 'kind')
  if (value.formatVersion !== DISC_PRESET_FORMAT_VERSION) {
    return failure('unsupported-format-version', 'formatVersion')
  }
  if (!isDiscPresetId(value.id)) return failure('invalid-id', 'id')
  if (!isPositiveSafeInteger(value.revision)) return failure('invalid-revision', 'revision')
  if (typeof value.name !== 'string') return failure('invalid-name', 'name')
  const name = value.name.trim()
  if (!name || name.length > DISC_PRESET_MAX_NAME_LENGTH) {
    return failure('invalid-name', 'name')
  }
  if (value.description !== undefined && typeof value.description !== 'string') {
    return failure('invalid-description', 'description')
  }
  const description = typeof value.description === 'string'
    ? value.description.trim()
    : undefined
  if (description && description.length > DISC_PRESET_MAX_DESCRIPTION_LENGTH) {
    return failure('invalid-description', 'description')
  }
  if (value.surface !== 'disc') return failure('invalid-surface', 'surface')
  const compatibility = parseCompatibility(value.compatibility)
  if (!compatibility) return failure('invalid-compatibility', 'compatibility')
  if (!Array.isArray(value.slots)) return failure('invalid-slot', 'slots')
  if (value.slots.length > DISC_PRESET_MAX_SLOTS) return failure('too-many-slots', 'slots')

  const slots: DiscPresetSlotDefinitionV1[] = []
  const slotIds = new Set<string>()
  for (let index = 0; index < value.slots.length; index += 1) {
    const slot = parseSlot(value.slots[index], index)
    if ('ok' in slot) return slot
    if (slotIds.has(slot.id)) return failure('duplicate-slot', `slots[${index}].id`)
    slotIds.add(slot.id)
    slots.push(slot)
  }

  return Object.freeze({
    ok: true,
    value: Object.freeze({
      kind: DISC_PRESET_DEFINITION_KIND,
      formatVersion: DISC_PRESET_FORMAT_VERSION,
      id: value.id,
      revision: value.revision,
      name,
      ...(description ? { description } : {}),
      surface: 'disc',
      compatibility,
      slots: Object.freeze(slots),
    }),
  })
}
