import type { PointerEvent as ReactPointerEvent } from 'react'
import type { PointerDragActivationOptions } from './usePointerDrag.ts'

export const TEXT_BODY_DRAG_ACTIVATION_OPTIONS = {
  activationDelayMs: 320,
  movementTolerancePx: 6,
} satisfies PointerDragActivationOptions

export const MOVE_HANDLE_DRAG_ACTIVATION_OPTIONS = {
  activationDelayMs: 0,
  movementTolerancePx: 0,
} satisfies PointerDragActivationOptions

export type MoveHandlePointerLike = Pick<
  ReactPointerEvent<Element>,
  'button' | 'isPrimary'
>

export function isPrimaryMoveHandlePointer(event: MoveHandlePointerLike) {
  return event.button === 0 && event.isPrimary !== false
}

export type TextEdgeGrabBandPoint = {
  x: number
  y: number
}

export type TextEdgeGrabBandBox = {
  height: number
  width: number
}

export type TextEdgeGrabBandOptions = TextEdgeGrabBandBox & {
  inwardTolerancePx?: number
  outerBandPx?: number
  point: TextEdgeGrabBandPoint
}

export function getRotatedLocalTextEdgePoint({
  clientX,
  clientY,
  height,
  rect,
  rotationDegrees = 0,
  width,
}: {
  clientX: number
  clientY: number
  height: number
  rect: Pick<DOMRect, 'height' | 'left' | 'top' | 'width'>
  rotationDegrees?: number
  width: number
}): TextEdgeGrabBandPoint {
  const centerX = rect.left + rect.width / 2
  const centerY = rect.top + rect.height / 2
  const radians = -rotationDegrees * Math.PI / 180
  const dx = clientX - centerX
  const dy = clientY - centerY
  const cos = Math.cos(radians)
  const sin = Math.sin(radians)

  return {
    x: dx * cos - dy * sin + width / 2,
    y: dx * sin + dy * cos + height / 2,
  }
}

export function isPointInTextEdgeGrabBand({
  height,
  inwardTolerancePx = 2,
  outerBandPx = 8,
  point,
  width,
}: TextEdgeGrabBandOptions) {
  if (width <= 0 || height <= 0) {
    return false
  }

  const inwardX = Math.min(inwardTolerancePx, Math.max(0, width / 4))
  const inwardY = Math.min(inwardTolerancePx, Math.max(0, height / 4))
  const insideExpandedBox =
    point.x >= -outerBandPx &&
    point.x <= width + outerBandPx &&
    point.y >= -outerBandPx &&
    point.y <= height + outerBandPx

  if (!insideExpandedBox) {
    return false
  }

  return (
    point.x <= inwardX ||
    point.x >= width - inwardX ||
    point.y <= inwardY ||
    point.y >= height - inwardY
  )
}
