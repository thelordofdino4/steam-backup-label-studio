import type {
  AdditionalArtworkFrame,
  ProjectAdditionalArtwork,
  ProjectCaseInsertImageSlot,
  ProjectJewelCaseSpineSideState,
} from '../project/projectTypes.ts'
import type { CaseInsertTemplatePaneId } from '../caseInsert/templateSurfaces.ts'
import {
  isMetalArtworkFrame,
  type ArtworkFrameRect,
} from './artworkFrame.ts'
import {
  createArtworkFrameMaterialHemisphereLightVector,
  type ArtworkFrameMaterialLightEditorPosition,
  type ArtworkFrameMaterialLightVector,
} from './artworkFrameMaterialLighting.ts'

export type ArtworkFrameMaterialLightEditorPointer = {
  x: number
  y: number
}

export type ArtworkFrameMaterialLightEditorState = {
  lightVector: ArtworkFrameMaterialLightVector
  sunPosition: ArtworkFrameMaterialLightEditorPosition
}

export type ArtworkFrameMaterialLightEditorPillarShadow = {
  directionX: number
  directionY: number
  length: number
  opacity: number
  strength: number
  visible: boolean
}

export type ArtworkFrameMaterialLightEditorSelection = {
  clipPathData: string | null | undefined
  frame: Pick<AdditionalArtworkFrame, 'enabled' | 'style'> | null | undefined
}

export type ArtworkFrameMaterialLightEditorEditableElement = {
  id: string
  kind: string
  label: string
}

export type ArtworkFrameMaterialLightEditorTarget = {
  editableId: string
  frame: AdditionalArtworkFrame
  label: string
}

export type ArtworkFrameMaterialLightOverride = {
  lightVector: ArtworkFrameMaterialLightVector
}

export type ArtworkFrameMaterialLightOverrideMap =
  Record<string, ArtworkFrameMaterialLightOverride>

type ArtworkFrameMaterialLightEditorCaseInsertState = {
  templates: Record<
    CaseInsertTemplatePaneId,
    {
      artworkSlots: Array<
        Pick<ProjectCaseInsertImageSlot, 'frame' | 'id' | 'imageDataUrl' | 'label'>
      >
    }
  >
  spine: {
    left: Pick<ProjectJewelCaseSpineSideState, 'additionalArtworkEnabled'> & {
      artworkSlots: Array<
        Pick<ProjectCaseInsertImageSlot, 'frame' | 'id' | 'imageDataUrl' | 'label'>
      >
    }
    right: Pick<ProjectJewelCaseSpineSideState, 'additionalArtworkEnabled'> & {
      artworkSlots: Array<
        Pick<ProjectCaseInsertImageSlot, 'frame' | 'id' | 'imageDataUrl' | 'label'>
      >
    }
  }
}

export const ARTWORK_FRAME_MATERIAL_OVERHEAD_SUN_POSITION:
  ArtworkFrameMaterialLightEditorPosition = {
    x: 0,
    y: 0,
  }

function sanitizeCoordinate(value: number) {
  return Number.isFinite(value) ? value : 0
}

function getArtworkFrameMaterialLightEditorRadius(
  bounds: Pick<ArtworkFrameRect, 'height' | 'width'>,
) {
  return Math.max(1, Math.min(bounds.width, bounds.height) / 2)
}

function getArtworkFrameMaterialLightEditorCenter(bounds: ArtworkFrameRect) {
  return {
    x: bounds.x + bounds.width / 2,
    y: bounds.y + bounds.height / 2,
  }
}

export function isSelectedArtworkFrameCanvasLitMaterial({
  clipPathData,
  frame,
}: ArtworkFrameMaterialLightEditorSelection) {
  return Boolean(
    frame?.enabled &&
      isMetalArtworkFrame(frame) &&
      clipPathData,
  )
}

export function clampArtworkFrameMaterialLightEditorSunPosition(
  position: ArtworkFrameMaterialLightEditorPosition,
): ArtworkFrameMaterialLightEditorPosition {
  const x = sanitizeCoordinate(position.x)
  const y = sanitizeCoordinate(position.y)
  const radius = Math.hypot(x, y)

  if (radius <= 1) {
    return { x, y }
  }

  return {
    x: x / radius,
    y: y / radius,
  }
}

export function getArtworkFrameMaterialLightEditorSunPositionFromPointer({
  bounds,
  pointer,
}: {
  bounds: ArtworkFrameRect
  pointer: ArtworkFrameMaterialLightEditorPointer
}): ArtworkFrameMaterialLightEditorPosition {
  const center = getArtworkFrameMaterialLightEditorCenter(bounds)
  const radius = getArtworkFrameMaterialLightEditorRadius(bounds)

  return clampArtworkFrameMaterialLightEditorSunPosition({
    x: (sanitizeCoordinate(pointer.x) - center.x) / radius,
    y: (center.y - sanitizeCoordinate(pointer.y)) / radius,
  })
}

export function getArtworkFrameMaterialLightEditorPillarShadow(
  sunPosition: ArtworkFrameMaterialLightEditorPosition,
): ArtworkFrameMaterialLightEditorPillarShadow {
  const clampedSunPosition =
    clampArtworkFrameMaterialLightEditorSunPosition(sunPosition)
  const distance = Math.hypot(clampedSunPosition.x, clampedSunPosition.y)

  if (distance <= 0.035) {
    return {
      directionX: 0,
      directionY: 0,
      length: 0,
      opacity: 0,
      strength: 0,
      visible: false,
    }
  }

  const strength = Math.min(1, distance)

  return {
    directionX: clampedSunPosition.x / distance,
    directionY: clampedSunPosition.y / distance,
    length: 0.22 + strength * 0.66,
    opacity: 0.18 + strength * 0.42,
    strength,
    visible: true,
  }
}

export function getArtworkFrameMaterialLightEditorSunPoint({
  bounds,
  sunPosition,
}: {
  bounds: ArtworkFrameRect
  sunPosition: ArtworkFrameMaterialLightEditorPosition
}): ArtworkFrameMaterialLightEditorPointer {
  const center = getArtworkFrameMaterialLightEditorCenter(bounds)
  const radius = getArtworkFrameMaterialLightEditorRadius(bounds)
  const clampedSunPosition =
    clampArtworkFrameMaterialLightEditorSunPosition(sunPosition)

  return {
    x: center.x + clampedSunPosition.x * radius,
    y: center.y - clampedSunPosition.y * radius,
  }
}

export function getArtworkFrameMaterialLightEditorStateFromSunPosition(
  sunPosition: ArtworkFrameMaterialLightEditorPosition,
): ArtworkFrameMaterialLightEditorState {
  const clampedSunPosition =
    clampArtworkFrameMaterialLightEditorSunPosition(sunPosition)

  return {
    lightVector: createArtworkFrameMaterialHemisphereLightVector(
      clampedSunPosition,
    ),
    sunPosition: clampedSunPosition,
  }
}

export function getArtworkFrameMaterialLightEditorStateFromPointer({
  bounds,
  pointer,
}: {
  bounds: ArtworkFrameRect
  pointer: ArtworkFrameMaterialLightEditorPointer
}): ArtworkFrameMaterialLightEditorState {
  return getArtworkFrameMaterialLightEditorStateFromSunPosition(
    getArtworkFrameMaterialLightEditorSunPositionFromPointer({
      bounds,
      pointer,
    }),
  )
}

export function resetArtworkFrameMaterialLightEditorToOverhead():
  ArtworkFrameMaterialLightEditorState {
  return getArtworkFrameMaterialLightEditorStateFromSunPosition(
    ARTWORK_FRAME_MATERIAL_OVERHEAD_SUN_POSITION,
  )
}

export function getActiveArtworkFrameMaterialLightOverride<
  TLightOverride extends ArtworkFrameMaterialLightOverride,
>(
  lightOverride: TLightOverride | null | undefined,
) {
  return lightOverride ?? null
}

function isCanvasLitArtworkFrameSlot(
  slot: Pick<ProjectCaseInsertImageSlot, 'frame' | 'imageDataUrl'>,
) {
  return Boolean(
    slot.imageDataUrl &&
      isSelectedArtworkFrameCanvasLitMaterial({
        clipPathData: 'selected-frame',
        frame: slot.frame,
      }),
  )
}

function createArtworkFrameMaterialLightEditorTarget({
  editableId,
  label,
  slot,
}: {
  editableId: string
  label: string
  slot: Pick<ProjectCaseInsertImageSlot, 'frame' | 'imageDataUrl' | 'label'>
}): ArtworkFrameMaterialLightEditorTarget | null {
  return isCanvasLitArtworkFrameSlot(slot)
    ? {
        editableId,
        frame: slot.frame,
        label,
      }
    : null
}

export function getDiscArtworkFrameMaterialLightEditorTarget(
  additionalArtwork: ProjectAdditionalArtwork,
  selectedElement: ArtworkFrameMaterialLightEditorEditableElement | null,
): ArtworkFrameMaterialLightEditorTarget | null {
  if (
    !additionalArtwork.enabled ||
    !selectedElement ||
    selectedElement.kind !== 'artwork'
  ) {
    return null
  }

  const [, scope, elementId] = selectedElement.id.split(':')

  if (scope !== 'additional-artwork' || !elementId) {
    return null
  }

  const element = additionalArtwork.elements.find((item) =>
    item.id === elementId)

  return element
    ? createArtworkFrameMaterialLightEditorTarget({
        editableId: selectedElement.id,
        label: element.label || selectedElement.label,
        slot: {
          frame: element.frame,
          imageDataUrl: element.imageDataUrl,
          label: element.label,
        },
      })
    : null
}

function getCaseInsertTemplateArtworkTarget(
  caseInsert: ArtworkFrameMaterialLightEditorCaseInsertState,
  paneId: CaseInsertTemplatePaneId,
  selectedElement: ArtworkFrameMaterialLightEditorEditableElement,
) {
  const parts = selectedElement.id.split(':')
  const [, selectedPaneId, slotKey, slotId] = parts

  if (
    selectedPaneId !== paneId ||
    slotKey !== 'artworkSlots' ||
    !slotId
  ) {
    return null
  }

  const slot = caseInsert.templates[paneId].artworkSlots.find((item) =>
    item.id === slotId)

  return slot
    ? createArtworkFrameMaterialLightEditorTarget({
        editableId: selectedElement.id,
        label: slot.label || selectedElement.label,
        slot,
      })
    : null
}

function getCaseInsertSpineArtworkTargetFromSide(
  sideState: ArtworkFrameMaterialLightEditorCaseInsertState['spine']['left'],
  selectedElement: ArtworkFrameMaterialLightEditorEditableElement,
) {
  if (!sideState.additionalArtworkEnabled) {
    return null
  }

  const parts = selectedElement.id.split(':')
  const [, spineScope, side, slotKey, slotId] = parts

  if (
    spineScope !== 'spine' ||
    (side !== 'left' && side !== 'right') ||
    slotKey !== 'artworkSlots' ||
    !slotId
  ) {
    return null
  }

  const slot = sideState.artworkSlots.find((item) => item.id === slotId)

  return slot
    ? createArtworkFrameMaterialLightEditorTarget({
        editableId: selectedElement.id,
        label: slot.label || selectedElement.label,
        slot,
      })
    : null
}

function getCaseInsertSpineArtworkTarget(
  caseInsert: ArtworkFrameMaterialLightEditorCaseInsertState,
  selectedElement: ArtworkFrameMaterialLightEditorEditableElement,
) {
  const parts = selectedElement.id.split(':')
  const [, spineScope, side] = parts

  if (spineScope !== 'spine') {
    return null
  }

  return side === 'left'
    ? getCaseInsertSpineArtworkTargetFromSide(
        caseInsert.spine.left,
        selectedElement,
      )
    : side === 'right'
      ? getCaseInsertSpineArtworkTargetFromSide(
          caseInsert.spine.right,
          selectedElement,
        )
      : null
}

export function getCaseInsertArtworkFrameMaterialLightEditorTarget(
  caseInsert: ArtworkFrameMaterialLightEditorCaseInsertState,
  activeTemplatePane: CaseInsertTemplatePaneId,
  selectedElement: ArtworkFrameMaterialLightEditorEditableElement | null,
): ArtworkFrameMaterialLightEditorTarget | null {
  if (!selectedElement || selectedElement.kind !== 'artwork') {
    return null
  }

  const [surface] = selectedElement.id.split(':')

  if (surface !== 'case') {
    return null
  }

  return getCaseInsertTemplateArtworkTarget(
    caseInsert,
    activeTemplatePane,
    selectedElement,
  ) ?? getCaseInsertSpineArtworkTarget(caseInsert, selectedElement)
}
