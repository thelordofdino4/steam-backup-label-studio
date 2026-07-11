import type { DiscRolePresetId } from '../layout/discRolePresets.ts'
import type { DiscGuidedSlotId } from './discGuidedSlots.ts'

export const DISC_GUIDED_LAYOUT_IDS = Object.freeze([
  'disc:guided-layout:classic-top-title',
] as const)

export type DiscGuidedLayoutId = (typeof DISC_GUIDED_LAYOUT_IDS)[number]

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
  | 'rating'
  | 'company-logo-choice'
  | 'legal'

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
  baseRolePresetId: DiscRolePresetId
  slotOrder: readonly DiscGuidedSlotId[]
  slots: Readonly<
    Partial<Record<DiscGuidedSlotId, DiscGuidedLayoutSlotDefinition>>
  >
}>

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
  centerYPercent: 36,
  widthPercent: 34,
  heightPercent: 10,
}) satisfies DiscGuidedRectGeometry

const CLASSIC_RATING_GEOMETRY = Object.freeze({
  kind: 'rect' as const,
  centerXPercent: 78,
  centerYPercent: 68,
  widthPercent: 20,
  heightPercent: 18,
}) satisfies DiscGuidedRectGeometry

const CLASSIC_COMPANY_LOGO_GEOMETRY = Object.freeze({
  kind: 'rect' as const,
  centerXPercent: 22,
  centerYPercent: 69,
  widthPercent: 28,
  heightPercent: 22,
}) satisfies DiscGuidedRectGeometry

const CLASSIC_LEGAL_GEOMETRY = Object.freeze({
  kind: 'rect' as const,
  centerXPercent: 50,
  centerYPercent: 88,
  widthPercent: 64,
  heightPercent: 12,
}) satisfies DiscGuidedRectGeometry

const CLASSIC_TOP_TITLE_SLOT_ORDER = Object.freeze([
  'disc:guided:background-image:primary',
  'disc:guided:game-title:primary',
  'disc:guided:rating:primary',
  'disc:guided:company-logo:primary',
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
    'disc:guided:rating:primary': createLayoutSlot({
      slotId: 'disc:guided:rating:primary',
      label: 'Game Info Logos',
      visualGeometry: CLASSIC_RATING_GEOMETRY,
      actionGeometry: CLASSIC_RATING_GEOMETRY,
      visualLayer: 'foreground',
      setupKind: 'rating',
      populationSource: 'accepted-metadata',
    }),
    'disc:guided:company-logo:primary': createLayoutSlot({
      slotId: 'disc:guided:company-logo:primary',
      label: 'Company Logos',
      visualGeometry: CLASSIC_COMPANY_LOGO_GEOMETRY,
      actionGeometry: CLASSIC_COMPANY_LOGO_GEOMETRY,
      visualLayer: 'foreground',
      setupKind: 'company-logo-choice',
      populationSource: 'existing-owner-only',
    }),
    'disc:guided:legal-text:copyright': createLayoutSlot({
      slotId: 'disc:guided:legal-text:copyright',
      label: 'Legal Info',
      visualGeometry: CLASSIC_LEGAL_GEOMETRY,
      actionGeometry: CLASSIC_LEGAL_GEOMETRY,
      visualLayer: 'foreground',
      setupKind: 'legal',
      populationSource: 'accepted-metadata',
    }),
  }),
}) satisfies DiscGuidedLayoutDefinition

export const DISC_GUIDED_LAYOUT_DEFINITIONS = Object.freeze([
  CLASSIC_TOP_TITLE_GUIDED_LAYOUT,
] as const satisfies readonly DiscGuidedLayoutDefinition[])

const DISC_GUIDED_LAYOUT_ID_BY_ROLE_PRESET: Readonly<
  Partial<Record<DiscRolePresetId, DiscGuidedLayoutId>>
> = Object.freeze({
  'classic-top-title': 'disc:guided-layout:classic-top-title',
})

export function getDiscGuidedLayoutDefinition(
  layoutId: string,
): DiscGuidedLayoutDefinition | null {
  return DISC_GUIDED_LAYOUT_DEFINITIONS.find(
    (definition) => definition.id === layoutId,
  ) ?? null
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
