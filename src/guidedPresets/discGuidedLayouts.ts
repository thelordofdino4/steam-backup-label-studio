import type { DiscRolePresetId } from '../layout/discRolePresets.ts'
import type { DiscGuidedSlotId } from './discGuidedSlots.ts'

export const DISC_GUIDED_LAYOUT_IDS = Object.freeze([
  'disc:guided-layout:classic-top-title',
] as const)

export type DiscGuidedLayoutId = (typeof DISC_GUIDED_LAYOUT_IDS)[number]

export type DiscGuidedLayoutVersion = number

export type DiscGuidedRectGeometry = Readonly<{
  kind: 'rect'
  centerXPercent: number
  centerYPercent: number
  widthPercent: number
  heightPercent: number
  rotationDegrees?: number
  contentAlignment?: Readonly<{
    horizontal: 'start' | 'center' | 'end'
    vertical: 'start' | 'center' | 'end'
  }>
}>

export type DiscGuidedPlaceholderLayer = 'background' | 'foreground'

export type DiscGuidedSetupKind =
  | 'game-title-choice'
  | 'background'
  | 'rating-badge'
  | 'media-format-mark'
  | 'operating-system-marks'
  | 'developer-logo'
  | 'publisher-logo'
  | 'legal-text'

export type DiscGuidedPopulationSource =
  | 'existing-steam-import'
  | 'accepted-metadata'
  | 'existing-owner-only'
  | 'none'

export type DiscGuidedLayoutSlotDefinition = Readonly<{
  slotId: DiscGuidedSlotId
  label: string
  visualGeometry: DiscGuidedRectGeometry
  actionGeometry: DiscGuidedRectGeometry
  visualLayer: DiscGuidedPlaceholderLayer
  setupKind: DiscGuidedSetupKind
  populationSource: DiscGuidedPopulationSource
}>

export type DiscGuidedRectGeometryParseError =
  | 'invalid-geometry'
  | 'invalid-kind'
  | 'invalid-center'
  | 'invalid-size'
  | 'invalid-rotation'
  | 'invalid-alignment'
  | 'unexpected-field'

export type DiscGuidedRectGeometryParseResult =
  | { ok: true; value: DiscGuidedRectGeometry }
  | { ok: false; error: DiscGuidedRectGeometryParseError }

export type DiscGuidedLayoutDefinition = Readonly<{
  id: DiscGuidedLayoutId
  version: DiscGuidedLayoutVersion
  baseRolePresetId: DiscRolePresetId
  slotOrder: readonly DiscGuidedSlotId[]
  slots: Readonly<
    Partial<Record<DiscGuidedSlotId, DiscGuidedLayoutSlotDefinition>>
  >
}>

export type DiscGuidedLayoutRegistry =
  readonly DiscGuidedLayoutDefinition[]

const GEOMETRY_FIELDS = new Set([
  'kind',
  'centerXPercent',
  'centerYPercent',
  'widthPercent',
  'heightPercent',
  'rotationDegrees',
  'contentAlignment',
])

const ALIGNMENT_FIELDS = new Set(['horizontal', 'vertical'])
const HORIZONTAL_ALIGNMENTS = new Set(['start', 'center', 'end'])
const VERTICAL_ALIGNMENTS = new Set(['start', 'center', 'end'])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasOnlyFields(value: Record<string, unknown>, allowedFields: Set<string>) {
  return Object.keys(value).every((field) => allowedFields.has(field))
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isNormalizedCenter(value: unknown): value is number {
  return isFiniteNumber(value) && value >= 0 && value <= 100
}

function isNormalizedSize(value: unknown): value is number {
  return isFiniteNumber(value) && value > 0 && value <= 100
}

function parseContentAlignment(value: unknown) {
  if (!isRecord(value) || !hasOnlyFields(value, ALIGNMENT_FIELDS)) {
    return null
  }

  if (
    typeof value.horizontal !== 'string' ||
    !HORIZONTAL_ALIGNMENTS.has(value.horizontal) ||
    typeof value.vertical !== 'string' ||
    !VERTICAL_ALIGNMENTS.has(value.vertical)
  ) {
    return null
  }

  return Object.freeze({
    horizontal: value.horizontal as 'start' | 'center' | 'end',
    vertical: value.vertical as 'start' | 'center' | 'end',
  })
}

export function parseDiscGuidedRectGeometry(
  value: unknown,
): DiscGuidedRectGeometryParseResult {
  if (!isRecord(value)) {
    return { ok: false, error: 'invalid-geometry' }
  }

  if (!hasOnlyFields(value, GEOMETRY_FIELDS)) {
    return { ok: false, error: 'unexpected-field' }
  }

  if (value.kind !== 'rect') {
    return { ok: false, error: 'invalid-kind' }
  }

  if (
    !isNormalizedCenter(value.centerXPercent) ||
    !isNormalizedCenter(value.centerYPercent)
  ) {
    return { ok: false, error: 'invalid-center' }
  }

  if (
    !isNormalizedSize(value.widthPercent) ||
    !isNormalizedSize(value.heightPercent)
  ) {
    return { ok: false, error: 'invalid-size' }
  }

  if (
    value.rotationDegrees !== undefined &&
    !isFiniteNumber(value.rotationDegrees)
  ) {
    return { ok: false, error: 'invalid-rotation' }
  }

  const contentAlignment = value.contentAlignment === undefined
    ? undefined
    : parseContentAlignment(value.contentAlignment)

  if (value.contentAlignment !== undefined && !contentAlignment) {
    return { ok: false, error: 'invalid-alignment' }
  }

  return {
    ok: true,
    value: Object.freeze({
      kind: 'rect',
      centerXPercent: value.centerXPercent,
      centerYPercent: value.centerYPercent,
      widthPercent: value.widthPercent,
      heightPercent: value.heightPercent,
      ...(value.rotationDegrees === undefined
        ? {}
        : { rotationDegrees: value.rotationDegrees }),
      ...(contentAlignment ? { contentAlignment } : {}),
    }),
  }
}

export function isDiscGuidedRectGeometry(
  value: unknown,
): value is DiscGuidedRectGeometry {
  return parseDiscGuidedRectGeometry(value).ok
}

const CLASSIC_TOP_TITLE_GEOMETRY = Object.freeze({
  kind: 'rect' as const,
  centerXPercent: 50,
  centerYPercent: 19.5,
  widthPercent: 62,
  heightPercent: 16,
}) satisfies DiscGuidedRectGeometry

const CLASSIC_BACKGROUND_VISUAL_GEOMETRY = Object.freeze({
  kind: 'rect' as const,
  centerXPercent: 50,
  centerYPercent: 50,
  widthPercent: 92,
  heightPercent: 92,
}) satisfies DiscGuidedRectGeometry

const CLASSIC_BACKGROUND_ACTION_GEOMETRY = Object.freeze({
  kind: 'rect' as const,
  centerXPercent: 50,
  centerYPercent: 34,
  widthPercent: 34,
  heightPercent: 8,
}) satisfies DiscGuidedRectGeometry

const CLASSIC_RATING_GEOMETRY = Object.freeze({
  kind: 'rect' as const,
  centerXPercent: 79,
  centerYPercent: 62,
  widthPercent: 20,
  heightPercent: 14,
}) satisfies DiscGuidedRectGeometry

const CLASSIC_MEDIA_FORMAT_GEOMETRY = Object.freeze({
  kind: 'rect' as const,
  centerXPercent: 80,
  centerYPercent: 76,
  widthPercent: 22,
  heightPercent: 9,
}) satisfies DiscGuidedRectGeometry

const CLASSIC_OPERATING_SYSTEM_MARKS_GEOMETRY = Object.freeze({
  kind: 'rect' as const,
  centerXPercent: 50,
  centerYPercent: 73,
  widthPercent: 28,
  heightPercent: 10,
}) satisfies DiscGuidedRectGeometry

const CLASSIC_DEVELOPER_LOGO_GEOMETRY = Object.freeze({
  kind: 'rect' as const,
  centerXPercent: 21,
  centerYPercent: 62,
  widthPercent: 26,
  heightPercent: 9,
}) satisfies DiscGuidedRectGeometry

const CLASSIC_PUBLISHER_LOGO_GEOMETRY = Object.freeze({
  kind: 'rect' as const,
  centerXPercent: 21,
  centerYPercent: 74,
  widthPercent: 26,
  heightPercent: 9,
}) satisfies DiscGuidedRectGeometry

const CLASSIC_LEGAL_GEOMETRY = Object.freeze({
  kind: 'rect' as const,
  centerXPercent: 50,
  centerYPercent: 89,
  widthPercent: 64,
  heightPercent: 8,
}) satisfies DiscGuidedRectGeometry

const CLASSIC_TOP_TITLE_SLOT_ORDER = Object.freeze([
  'disc:guided:game-title:primary',
  'disc:guided:background-image:primary',
  'disc:guided:rating-badge:primary',
  'disc:guided:media-format-mark:primary',
  'disc:guided:operating-system-marks:group',
  'disc:guided:developer-logo:primary',
  'disc:guided:publisher-logo:primary',
  'disc:guided:legal-text:copyright',
] as const satisfies readonly DiscGuidedSlotId[])

function createLayoutSlot(
  slot: DiscGuidedLayoutSlotDefinition,
): DiscGuidedLayoutSlotDefinition {
  return Object.freeze(slot)
}

// Layout presets place real feature-owner state. Guided layouts independently
// describe the semantic regions that a future editor-only overlay may present.
const CLASSIC_TOP_TITLE_GUIDED_LAYOUT = Object.freeze({
  id: 'disc:guided-layout:classic-top-title' as const,
  version: 1,
  baseRolePresetId: 'classic-top-title' as const,
  slotOrder: CLASSIC_TOP_TITLE_SLOT_ORDER,
  slots: Object.freeze({
    'disc:guided:background-image:primary': createLayoutSlot({
      slotId: 'disc:guided:background-image:primary',
      label: 'Background Image',
      visualGeometry: CLASSIC_BACKGROUND_VISUAL_GEOMETRY,
      actionGeometry: CLASSIC_BACKGROUND_ACTION_GEOMETRY,
      visualLayer: 'background',
      setupKind: 'background',
      populationSource: 'none',
    }),
    'disc:guided:game-title:primary': createLayoutSlot({
      slotId: 'disc:guided:game-title:primary',
      label: 'Game Title',
      visualGeometry: CLASSIC_TOP_TITLE_GEOMETRY,
      actionGeometry: CLASSIC_TOP_TITLE_GEOMETRY,
      visualLayer: 'foreground',
      setupKind: 'game-title-choice',
      populationSource: 'existing-steam-import',
    }),
    'disc:guided:rating-badge:primary': createLayoutSlot({
      slotId: 'disc:guided:rating-badge:primary',
      label: 'Rating Badge',
      visualGeometry: CLASSIC_RATING_GEOMETRY,
      actionGeometry: CLASSIC_RATING_GEOMETRY,
      visualLayer: 'foreground',
      setupKind: 'rating-badge',
      populationSource: 'accepted-metadata',
    }),
    'disc:guided:media-format-mark:primary': createLayoutSlot({
      slotId: 'disc:guided:media-format-mark:primary',
      label: 'Media Format Mark',
      visualGeometry: CLASSIC_MEDIA_FORMAT_GEOMETRY,
      actionGeometry: CLASSIC_MEDIA_FORMAT_GEOMETRY,
      visualLayer: 'foreground',
      setupKind: 'media-format-mark',
      populationSource: 'existing-owner-only',
    }),
    'disc:guided:operating-system-marks:group': createLayoutSlot({
      slotId: 'disc:guided:operating-system-marks:group',
      label: 'Operating System Marks',
      visualGeometry: CLASSIC_OPERATING_SYSTEM_MARKS_GEOMETRY,
      actionGeometry: CLASSIC_OPERATING_SYSTEM_MARKS_GEOMETRY,
      visualLayer: 'foreground',
      setupKind: 'operating-system-marks',
      populationSource: 'existing-owner-only',
    }),
    'disc:guided:developer-logo:primary': createLayoutSlot({
      slotId: 'disc:guided:developer-logo:primary',
      label: 'Developer Logo',
      visualGeometry: CLASSIC_DEVELOPER_LOGO_GEOMETRY,
      actionGeometry: CLASSIC_DEVELOPER_LOGO_GEOMETRY,
      visualLayer: 'foreground',
      setupKind: 'developer-logo',
      populationSource: 'existing-owner-only',
    }),
    'disc:guided:publisher-logo:primary': createLayoutSlot({
      slotId: 'disc:guided:publisher-logo:primary',
      label: 'Publisher Logo',
      visualGeometry: CLASSIC_PUBLISHER_LOGO_GEOMETRY,
      actionGeometry: CLASSIC_PUBLISHER_LOGO_GEOMETRY,
      visualLayer: 'foreground',
      setupKind: 'publisher-logo',
      populationSource: 'existing-owner-only',
    }),
    'disc:guided:legal-text:copyright': createLayoutSlot({
      slotId: 'disc:guided:legal-text:copyright',
      label: 'Copyright / Legal Text',
      visualGeometry: CLASSIC_LEGAL_GEOMETRY,
      actionGeometry: CLASSIC_LEGAL_GEOMETRY,
      visualLayer: 'foreground',
      setupKind: 'legal-text',
      populationSource: 'accepted-metadata',
    }),
  }),
}) satisfies DiscGuidedLayoutDefinition

export const DISC_GUIDED_LAYOUT_DEFINITIONS = Object.freeze([
  CLASSIC_TOP_TITLE_GUIDED_LAYOUT,
] as const satisfies DiscGuidedLayoutRegistry)

const DISC_GUIDED_LAYOUT_ID_BY_ROLE_PRESET: Readonly<
  Partial<Record<DiscRolePresetId, DiscGuidedLayoutId>>
> = Object.freeze({
  'classic-top-title': 'disc:guided-layout:classic-top-title',
})

export function isValidDiscGuidedLayoutVersion(
  version: unknown,
): version is DiscGuidedLayoutVersion {
  return Number.isSafeInteger(version) && Number(version) > 0
}

export function isSupportedDiscGuidedLayoutId(
  layoutId: unknown,
  registry: DiscGuidedLayoutRegistry = DISC_GUIDED_LAYOUT_DEFINITIONS,
): layoutId is DiscGuidedLayoutId {
  return typeof layoutId === 'string' && registry.some(
    (definition) => definition.id === layoutId,
  )
}

export function getDiscGuidedLayoutDefinition(
  layoutId: unknown,
  version?: unknown,
  registry: DiscGuidedLayoutRegistry = DISC_GUIDED_LAYOUT_DEFINITIONS,
): DiscGuidedLayoutDefinition | null {
  if (typeof layoutId !== 'string') return null

  if (version === undefined) {
    return getCurrentDiscGuidedLayoutDefinition(layoutId, registry)
  }

  if (!isValidDiscGuidedLayoutVersion(version)) return null

  return registry.find(
    (definition) => definition.id === layoutId &&
      definition.version === version,
  ) ?? null
}

export function isSupportedDiscGuidedLayoutVersion(
  layoutId: unknown,
  version: unknown,
  registry: DiscGuidedLayoutRegistry = DISC_GUIDED_LAYOUT_DEFINITIONS,
) {
  return getDiscGuidedLayoutDefinition(layoutId, version, registry) !== null
}

export function getCurrentDiscGuidedLayoutDefinition(
  layoutId: unknown,
  registry: DiscGuidedLayoutRegistry = DISC_GUIDED_LAYOUT_DEFINITIONS,
) {
  if (typeof layoutId !== 'string') return null

  return registry
    .filter((definition) => definition.id === layoutId)
    .reduce<DiscGuidedLayoutDefinition | null>(
      (current, definition) => !current || definition.version > current.version
        ? definition
        : current,
      null,
    )
}

export function getDiscGuidedCanonicalSlotOrder(
  layoutId: unknown,
  version: unknown,
  registry: DiscGuidedLayoutRegistry = DISC_GUIDED_LAYOUT_DEFINITIONS,
) {
  return getDiscGuidedLayoutDefinition(layoutId, version, registry)
    ?.slotOrder ?? Object.freeze([] as DiscGuidedSlotId[])
}

export function getDiscGuidedValidSlotIds(
  layoutId: unknown,
  version: unknown,
  registry: DiscGuidedLayoutRegistry = DISC_GUIDED_LAYOUT_DEFINITIONS,
) {
  return new Set(
    getDiscGuidedCanonicalSlotOrder(layoutId, version, registry),
  ) as ReadonlySet<DiscGuidedSlotId>
}

export function getDiscGuidedLayoutIdForRolePreset(
  presetId: DiscRolePresetId,
): DiscGuidedLayoutId | null {
  return DISC_GUIDED_LAYOUT_ID_BY_ROLE_PRESET[presetId] ?? null
}

export function getDiscGuidedSlotGeometry(
  layoutId: string,
  slotId: string,
): DiscGuidedRectGeometry | null {
  return getDiscGuidedLayoutSlotDefinition(
    layoutId,
    slotId,
  )?.visualGeometry ?? null
}

export function getDiscGuidedLayoutSlotDefinition(
  layoutId: string,
  slotId: string,
): DiscGuidedLayoutSlotDefinition | null {
  const definition = getDiscGuidedLayoutDefinition(layoutId)

  if (!definition || !Object.hasOwn(definition.slots, slotId)) {
    return null
  }

  return definition.slots[slotId as DiscGuidedSlotId] ?? null
}
