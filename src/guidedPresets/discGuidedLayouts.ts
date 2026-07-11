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
}>

export type DiscGuidedSetupKind =
  | 'game-title-choice'
  | 'background'
  | 'rating-badge'
  | 'media-format-mark'
  | 'operating-system-marks'
  | 'developer-logo'
  | 'publisher-logo'
  | 'legal-text'

export type DiscGuidedLayoutSlotDefinition = Readonly<{
  slotId: DiscGuidedSlotId
  label: string
  geometry: DiscGuidedRectGeometry
  setupKind: DiscGuidedSetupKind
}>

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

const CLASSIC_SLOT_ORDER = Object.freeze([
  'disc:guided:game-title:primary',
  'disc:guided:background-image:primary',
  'disc:guided:rating-badge:primary',
  'disc:guided:media-format-mark:primary',
  'disc:guided:operating-system-marks:group',
  'disc:guided:developer-logo:primary',
  'disc:guided:publisher-logo:primary',
  'disc:guided:legal-text:copyright',
] as const satisfies readonly DiscGuidedSlotId[])

function createSlot(
  slot: DiscGuidedLayoutSlotDefinition,
): DiscGuidedLayoutSlotDefinition {
  return Object.freeze({
    ...slot,
    geometry: Object.freeze({ ...slot.geometry }),
  })
}

const CLASSIC_TOP_TITLE = Object.freeze({
  id: 'disc:guided-layout:classic-top-title' as const,
  version: 1,
  baseRolePresetId: 'classic-top-title' as const,
  slotOrder: CLASSIC_SLOT_ORDER,
  slots: Object.freeze({
    'disc:guided:game-title:primary': createSlot({
      slotId: 'disc:guided:game-title:primary',
      label: 'Game Title',
      geometry: {
        kind: 'rect',
        centerXPercent: 50,
        centerYPercent: 19.5,
        widthPercent: 62,
        heightPercent: 16,
      },
      setupKind: 'game-title-choice',
    }),
    'disc:guided:background-image:primary': createSlot({
      slotId: 'disc:guided:background-image:primary',
      label: 'Background Image',
      geometry: {
        kind: 'rect',
        centerXPercent: 50,
        centerYPercent: 50,
        widthPercent: 92,
        heightPercent: 92,
      },
      setupKind: 'background',
    }),
    'disc:guided:rating-badge:primary': createSlot({
      slotId: 'disc:guided:rating-badge:primary',
      label: 'Rating Badge',
      geometry: {
        kind: 'rect',
        centerXPercent: 79,
        centerYPercent: 62,
        widthPercent: 20,
        heightPercent: 14,
      },
      setupKind: 'rating-badge',
    }),
    'disc:guided:media-format-mark:primary': createSlot({
      slotId: 'disc:guided:media-format-mark:primary',
      label: 'Media Format Mark',
      geometry: {
        kind: 'rect',
        centerXPercent: 80,
        centerYPercent: 76,
        widthPercent: 22,
        heightPercent: 9,
      },
      setupKind: 'media-format-mark',
    }),
    'disc:guided:operating-system-marks:group': createSlot({
      slotId: 'disc:guided:operating-system-marks:group',
      label: 'Operating System Marks',
      geometry: {
        kind: 'rect',
        centerXPercent: 50,
        centerYPercent: 73,
        widthPercent: 28,
        heightPercent: 10,
      },
      setupKind: 'operating-system-marks',
    }),
    'disc:guided:developer-logo:primary': createSlot({
      slotId: 'disc:guided:developer-logo:primary',
      label: 'Developer Logo',
      geometry: {
        kind: 'rect',
        centerXPercent: 21,
        centerYPercent: 62,
        widthPercent: 26,
        heightPercent: 9,
      },
      setupKind: 'developer-logo',
    }),
    'disc:guided:publisher-logo:primary': createSlot({
      slotId: 'disc:guided:publisher-logo:primary',
      label: 'Publisher Logo',
      geometry: {
        kind: 'rect',
        centerXPercent: 21,
        centerYPercent: 74,
        widthPercent: 26,
        heightPercent: 9,
      },
      setupKind: 'publisher-logo',
    }),
    'disc:guided:legal-text:copyright': createSlot({
      slotId: 'disc:guided:legal-text:copyright',
      label: 'Copyright / Legal Text',
      geometry: {
        kind: 'rect',
        centerXPercent: 50,
        centerYPercent: 89,
        widthPercent: 64,
        heightPercent: 8,
      },
      setupKind: 'legal-text',
    }),
  }),
}) satisfies DiscGuidedLayoutDefinition

export const DISC_GUIDED_LAYOUT_DEFINITIONS = Object.freeze([
  CLASSIC_TOP_TITLE,
] as const satisfies DiscGuidedLayoutRegistry)

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
  version: unknown,
  registry: DiscGuidedLayoutRegistry = DISC_GUIDED_LAYOUT_DEFINITIONS,
): DiscGuidedLayoutDefinition | null {
  if (typeof layoutId !== 'string' || !isValidDiscGuidedLayoutVersion(version)) {
    return null
  }

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
