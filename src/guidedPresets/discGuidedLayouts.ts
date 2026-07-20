import type { DiscRolePresetId } from '../layout/discRolePresets.ts'
import type {
  DiscNormalizedRegion,
  DiscPresetId,
} from '../presets/discPresetDefinition.ts'
import {
  CLASSIC_TOP_TITLE_DISC_PRESET,
} from '../presets/builtins/classicTopTitleDiscPreset.ts'
import {
  resolveDiscPresetCompatibilityId,
} from '../presets/discPresetRegistry.ts'
import type {
  DiscPresetSlotResolutionStatus,
  ResolvedDiscPresetDefinition,
} from '../presets/discPresetResolution.ts'
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
  resolutionStatus: DiscPresetSlotResolutionStatus
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
  presetId: DiscPresetId
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

type DiscGuidedSlotPresentation = Readonly<{
  label: string
  setupKind: DiscGuidedSetupKind
  populationSource: DiscGuidedPopulationSource
}>

const CLASSIC_SLOT_PRESENTATION: Readonly<
  Record<DiscGuidedSlotId, DiscGuidedSlotPresentation | undefined>
> = Object.freeze({
  'disc:guided:game-title:primary': Object.freeze({
    label: 'Game Title',
    setupKind: 'game-title-choice',
    populationSource: 'existing-steam-import',
  }),
  'disc:guided:background-image:primary': Object.freeze({
    label: 'Background Image',
    setupKind: 'background',
    populationSource: 'none',
  }),
  'disc:guided:rating-badge:primary': Object.freeze({
    label: 'Rating Badge',
    setupKind: 'rating-badge',
    populationSource: 'accepted-metadata',
  }),
  'disc:guided:media-format-mark:primary': Object.freeze({
    label: 'Media Format Mark',
    setupKind: 'media-format-mark',
    populationSource: 'existing-owner-only',
  }),
  'disc:guided:operating-system-marks:group': Object.freeze({
    label: 'Operating System Marks',
    setupKind: 'operating-system-marks',
    populationSource: 'existing-owner-only',
  }),
  'disc:guided:developer-logo:primary': Object.freeze({
    label: 'Developer Logo',
    setupKind: 'developer-logo',
    populationSource: 'existing-owner-only',
  }),
  'disc:guided:publisher-logo:primary': Object.freeze({
    label: 'Publisher Logo',
    setupKind: 'publisher-logo',
    populationSource: 'existing-owner-only',
  }),
  'disc:guided:legal-text:copyright': Object.freeze({
    label: 'Copyright / Legal Text',
    setupKind: 'legal-text',
    populationSource: 'accepted-metadata',
  }),
  'disc:guided:additional-artwork:primary': undefined,
  'disc:guided:additional-text:custom-note': undefined,
})

function toGuidedGeometry(region: DiscNormalizedRegion): DiscGuidedRectGeometry {
  return Object.freeze({ kind: 'rect', ...region })
}

const CLASSIC_TOP_TITLE_SLOT_ORDER = Object.freeze(
  CLASSIC_TOP_TITLE_DISC_PRESET.slots.map(({ id }) => id),
) satisfies readonly DiscGuidedSlotId[]

const CLASSIC_TOP_TITLE_GUIDED_SLOTS = Object.freeze(Object.fromEntries(
  CLASSIC_TOP_TITLE_DISC_PRESET.slots.map((slot) => {
    const presentation = CLASSIC_SLOT_PRESENTATION[slot.id]

    if (!presentation) {
      throw new Error(`Missing guided presentation for Disc preset slot ${slot.id}.`)
    }

    return [
      slot.id,
      Object.freeze({
        slotId: slot.id,
        label: presentation.label,
        visualGeometry: toGuidedGeometry(slot.contentRegion),
        actionGeometry: toGuidedGeometry(slot.actionRegion ?? slot.contentRegion),
        visualLayer: slot.visualLayer,
        setupKind: presentation.setupKind,
        populationSource: presentation.populationSource,
        resolutionStatus: 'resolved' as const,
      }),
    ]
  }),
)) as Readonly<Partial<Record<DiscGuidedSlotId, DiscGuidedLayoutSlotDefinition>>>

// The compatibility guided-layout identity projects geometry from the canonical
// serializable preset while setup and population metadata remain editor guidance.
const CLASSIC_TOP_TITLE_GUIDED_LAYOUT = Object.freeze({
  id: 'disc:guided-layout:classic-top-title' as const,
  presetId: CLASSIC_TOP_TITLE_DISC_PRESET.id,
  baseRolePresetId: 'classic-top-title' as const,
  slotOrder: CLASSIC_TOP_TITLE_SLOT_ORDER,
  slots: CLASSIC_TOP_TITLE_GUIDED_SLOTS,
}) satisfies DiscGuidedLayoutDefinition

export const DISC_GUIDED_LAYOUT_DEFINITIONS = Object.freeze([
  CLASSIC_TOP_TITLE_GUIDED_LAYOUT,
] as const satisfies readonly DiscGuidedLayoutDefinition[])

export function getDiscGuidedLayoutDefinition(
  layoutId: string,
): DiscGuidedLayoutDefinition | null {
  return DISC_GUIDED_LAYOUT_DEFINITIONS.find(
    (definition) => definition.id === layoutId,
  ) ?? null
}

export function getDiscGuidedLayoutIdForRolePreset(
  presetId: DiscRolePresetId | DiscPresetId,
): DiscGuidedLayoutId | null {
  return resolveDiscPresetCompatibilityId(presetId) ===
      CLASSIC_TOP_TITLE_DISC_PRESET.id
    ? CLASSIC_TOP_TITLE_GUIDED_LAYOUT.id
    : null
}

export function createDiscGuidedLayoutDefinitionFromResolvedPreset(
  preset: ResolvedDiscPresetDefinition,
): DiscGuidedLayoutDefinition | null {
  const layoutId = getDiscGuidedLayoutIdForRolePreset(preset.sourcePresetId)
  const baseLayout = layoutId
    ? getDiscGuidedLayoutDefinition(layoutId)
    : null

  if (
    !baseLayout ||
    baseLayout.presetId !== preset.sourcePresetId
  ) {
    return null
  }

  const slots = Object.freeze(Object.fromEntries(preset.slots.map((slot) => {
    const presentation = CLASSIC_SLOT_PRESENTATION[slot.id]

    if (!presentation) {
      return [slot.id, undefined]
    }

    return [
      slot.id,
      Object.freeze({
        slotId: slot.id,
        label: presentation.label,
        visualGeometry: toGuidedGeometry(slot.resolvedContentRegion),
        actionGeometry: toGuidedGeometry(slot.resolvedActionRegion),
        visualLayer: slot.visualLayer,
        setupKind: presentation.setupKind,
        populationSource: presentation.populationSource,
        resolutionStatus: slot.status,
      }),
    ]
  }))) as Readonly<
    Partial<Record<DiscGuidedSlotId, DiscGuidedLayoutSlotDefinition>>
  >

  return Object.freeze({
    id: baseLayout.id,
    presetId: preset.sourcePresetId,
    baseRolePresetId: baseLayout.baseRolePresetId,
    slotOrder: Object.freeze(preset.slots.map(({ id }) => id)),
    slots,
  })
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
