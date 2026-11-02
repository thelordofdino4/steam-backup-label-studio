import type {
  ProjectCaseInsertImageFit,
  ProjectCaseInsertImageSlot,
  ProjectJewelCaseState,
} from '../project/projectTypes.ts'
import {
  CASE_INSERT_RESERVED_ARTWORK_VIEWPORT_ZOOM_MAX,
  CASE_INSERT_RESERVED_ARTWORK_VIEWPORT_ZOOM_MIN,
  normalizeProjectCaseInsertReservedArtworkViewport,
  type CaseInsertReservedArtworkViewportOwner,
} from './artworkViewportState.ts'
import {
  getJewelCaseSpineEditSides,
  getJewelCaseSpineSideScopedId,
} from './jewelCaseTransitions.ts'
import type { JewelCaseSpineSide } from './types.ts'

export const CASE_INSERT_ARTWORK_FRAMING_FITS = Object.freeze([
  'contain',
  'cover',
  'crop',
] as const)

export const CASE_INSERT_ARTWORK_FOCAL_POSITION_MIN = 0
export const CASE_INSERT_ARTWORK_FOCAL_POSITION_MAX = 100
export const CASE_INSERT_ARTWORK_ZOOM_SLIDER_MAX = 10

export type CaseInsertArtworkFramingFit =
  (typeof CASE_INSERT_ARTWORK_FRAMING_FITS)[number]

export type CaseInsertArtworkFramingChange =
  | Readonly<{ field: 'fit'; value: CaseInsertArtworkFramingFit }>
  | Readonly<{ field: 'focal-x'; value: number }>
  | Readonly<{ field: 'focal-y'; value: number }>
  | Readonly<{ field: 'zoom'; value: number }>

export type CaseInsertArtworkFramingViewModel = Readonly<{
  fit: CaseInsertArtworkFramingFit
  focalXPercent: number
  focalYPercent: number
  zoom: number
  showFocalPosition: boolean
  showZoom: boolean
}>

export type CaseInsertArtworkFramingTransitionResult =
  | Readonly<{
      ok: true
      status: 'updated' | 'no-op'
      project: ProjectJewelCaseState
    }>
  | Readonly<{
      ok: false
      status: 'invalid' | 'not-found' | 'incompatible'
      code:
        | 'invalid-change'
        | 'slot-not-found'
        | 'viewport-unavailable'
        | 'unsupported-current-fit'
      project: ProjectJewelCaseState
    }>

function isFramingFit(
  value: ProjectCaseInsertImageFit,
): value is CaseInsertArtworkFramingFit {
  return (CASE_INSERT_ARTWORK_FRAMING_FITS as readonly string[]).includes(value)
}

function isFiniteWithin(value: number, minimum: number, maximum: number) {
  return Number.isFinite(value) && value >= minimum && value <= maximum
}

function isValidChange(change: CaseInsertArtworkFramingChange) {
  switch (change.field) {
    case 'fit':
      return isFramingFit(change.value)
    case 'focal-x':
    case 'focal-y':
      return isFiniteWithin(
        change.value,
        CASE_INSERT_ARTWORK_FOCAL_POSITION_MIN,
        CASE_INSERT_ARTWORK_FOCAL_POSITION_MAX,
      )
    case 'zoom':
      return isFiniteWithin(
        change.value,
        CASE_INSERT_RESERVED_ARTWORK_VIEWPORT_ZOOM_MIN,
        CASE_INSERT_RESERVED_ARTWORK_VIEWPORT_ZOOM_MAX,
      )
  }
}

export function getCaseInsertArtworkFramingViewModel(
  slot: ProjectCaseInsertImageSlot,
  owner: CaseInsertReservedArtworkViewportOwner,
): CaseInsertArtworkFramingViewModel | null {
  if (slot.reservedArtworkViewport == null || !isFramingFit(slot.fit)) {
    return null
  }

  const viewport = normalizeProjectCaseInsertReservedArtworkViewport(
    slot.reservedArtworkViewport,
    owner,
  )
  if (!viewport) return null

  return Object.freeze({
    fit: slot.fit,
    focalXPercent: viewport.focalPosition.xPercent,
    focalYPercent: viewport.focalPosition.yPercent,
    zoom: viewport.zoom,
    showFocalPosition: slot.fit === 'crop',
    showZoom: slot.fit === 'crop',
  })
}

function getOwnerSlots(
  project: ProjectJewelCaseState,
  owner: CaseInsertReservedArtworkViewportOwner,
) {
  switch (owner) {
    case 'cover':
    case 'tray':
      return project.templates[owner].artworkSlots
    case 'leftSpine':
      return project.spine.left.artworkSlots
    case 'rightSpine':
      return project.spine.right.artworkSlots
  }
}

function replaceOwnerSlots(
  project: ProjectJewelCaseState,
  owner: CaseInsertReservedArtworkViewportOwner,
  artworkSlots: ProjectCaseInsertImageSlot[],
): ProjectJewelCaseState {
  switch (owner) {
    case 'cover':
    case 'tray':
      return {
        ...project,
        templates: {
          ...project.templates,
          [owner]: {
            ...project.templates[owner],
            artworkSlots,
          },
        },
      }
    case 'leftSpine':
    case 'rightSpine': {
      const side = owner === 'leftSpine' ? 'left' : 'right'
      return {
        ...project,
        spine: {
          ...project.spine,
          [side]: {
            ...project.spine[side],
            artworkSlots,
          },
        },
      }
    }
  }
}

function updateFramingSlot(
  slot: ProjectCaseInsertImageSlot,
  owner: CaseInsertReservedArtworkViewportOwner,
  change: CaseInsertArtworkFramingChange,
): ProjectCaseInsertImageSlot | null {
  const viewport = normalizeProjectCaseInsertReservedArtworkViewport(
    slot.reservedArtworkViewport,
    owner,
  )
  if (!viewport) return null

  switch (change.field) {
    case 'fit':
      return slot.fit === change.value ? slot : { ...slot, fit: change.value }
    case 'focal-x':
      return viewport.focalPosition.xPercent === change.value
        ? slot
        : {
            ...slot,
            reservedArtworkViewport: {
              ...viewport,
              focalPosition: {
                ...viewport.focalPosition,
                xPercent: change.value,
              },
            },
          }
    case 'focal-y':
      return viewport.focalPosition.yPercent === change.value
        ? slot
        : {
            ...slot,
            reservedArtworkViewport: {
              ...viewport,
              focalPosition: {
                ...viewport.focalPosition,
                yPercent: change.value,
              },
            },
          }
    case 'zoom':
      return viewport.zoom === change.value
        ? slot
        : {
            ...slot,
            reservedArtworkViewport: {
              ...viewport,
              zoom: change.value,
            },
          }
  }
}

/**
 * Updates one viewport-backed repeated-artwork slot through its stable ID and
 * explicit physical owner. This transition never creates or repairs slots.
 */
export function transitionCaseInsertArtworkFraming(
  project: ProjectJewelCaseState,
  owner: CaseInsertReservedArtworkViewportOwner,
  slotId: string,
  change: CaseInsertArtworkFramingChange,
): CaseInsertArtworkFramingTransitionResult {
  if (!isValidChange(change)) {
    return {
      ok: false,
      status: 'invalid',
      code: 'invalid-change',
      project,
    }
  }

  const slots = getOwnerSlots(project, owner)
  const slotIndex = slots.findIndex(({ id }) => id === slotId)
  if (slotIndex < 0) {
    return {
      ok: false,
      status: 'not-found',
      code: 'slot-not-found',
      project,
    }
  }

  const slot = slots[slotIndex]!
  if (slot.reservedArtworkViewport == null) {
    return {
      ok: false,
      status: 'incompatible',
      code: 'viewport-unavailable',
      project,
    }
  }
  if (!isFramingFit(slot.fit)) {
    return {
      ok: false,
      status: 'incompatible',
      code: 'unsupported-current-fit',
      project,
    }
  }

  const updatedSlot = updateFramingSlot(slot, owner, change)
  if (!updatedSlot) {
    return {
      ok: false,
      status: 'incompatible',
      code: 'viewport-unavailable',
      project,
    }
  }
  if (updatedSlot === slot) {
    return { ok: true, status: 'no-op', project }
  }

  const artworkSlots = [...slots]
  artworkSlots[slotIndex] = updatedSlot
  return {
    ok: true,
    status: 'updated',
    project: replaceOwnerSlots(project, owner, artworkSlots),
  }
}

/**
 * Applies one logical Spine framing edit to the established mirrored or
 * side-specific physical owners atomically.
 */
export function transitionJewelCaseSpineArtworkFraming(
  project: ProjectJewelCaseState,
  side: JewelCaseSpineSide,
  slotId: string,
  change: CaseInsertArtworkFramingChange,
): CaseInsertArtworkFramingTransitionResult {
  let candidate = project
  for (const targetSide of getJewelCaseSpineEditSides(project.spine, side)) {
    const result = transitionCaseInsertArtworkFraming(
      candidate,
      targetSide === 'left' ? 'leftSpine' : 'rightSpine',
      getJewelCaseSpineSideScopedId(targetSide, slotId),
      change,
    )
    if (!result.ok) {
      return { ...result, project }
    }
    candidate = result.project
  }

  return candidate === project
    ? { ok: true, status: 'no-op', project }
    : { ok: true, status: 'updated', project: candidate }
}
