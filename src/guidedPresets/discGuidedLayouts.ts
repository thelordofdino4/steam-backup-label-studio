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
  slots: Readonly<Partial<Record<DiscGuidedSlotId, DiscGuidedRectGeometry>>>
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
  contentAlignment: Object.freeze({
    horizontal: 'center' as const,
    vertical: 'center' as const,
  }),
}) satisfies DiscGuidedRectGeometry

// Layout presets place real feature-owner state. Guided layouts independently
// describe the semantic regions that a future editor-only overlay may present.
const CLASSIC_TOP_TITLE_GUIDED_LAYOUT = Object.freeze({
  id: 'disc:guided-layout:classic-top-title' as const,
  baseRolePresetId: 'classic-top-title' as const,
  slots: Object.freeze({
    'disc:guided:game-title:primary': CLASSIC_TOP_TITLE_GEOMETRY,
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
  const definition = getDiscGuidedLayoutDefinition(layoutId)

  if (!definition || !Object.hasOwn(definition.slots, slotId)) {
    return null
  }

  return definition.slots[slotId as DiscGuidedSlotId] ?? null
}
