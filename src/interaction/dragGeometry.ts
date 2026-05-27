import type { BackgroundOffset } from '../project/projectTypes'

type DragBounds = {
  width: number
  height: number
}

export type PointerDragStart = {
  pointerId: number
  startClientX: number
  startClientY: number
}

export type PercentDragState = PointerDragStart & {
  startX: number
  startY: number
}

export type PixelDragState = PointerDragStart & {
  startOffsetX: number
  startOffsetY: number
}

export function createPercentDragState(
  pointerId: number,
  clientX: number,
  clientY: number,
  startX: number,
  startY: number,
): PercentDragState {
  return {
    pointerId,
    startClientX: clientX,
    startClientY: clientY,
    startX,
    startY,
  }
}

export function getDraggedPercentPoint(
  dragState: PercentDragState,
  clientX: number,
  clientY: number,
  bounds: DragBounds,
) {
  return {
    x: dragState.startX + ((clientX - dragState.startClientX) / bounds.width) * 100,
    y: dragState.startY + ((clientY - dragState.startClientY) / bounds.height) * 100,
  }
}

export function createPixelDragState(
  pointerId: number,
  clientX: number,
  clientY: number,
  startOffset: BackgroundOffset,
): PixelDragState {
  return {
    pointerId,
    startClientX: clientX,
    startClientY: clientY,
    startOffsetX: startOffset.x,
    startOffsetY: startOffset.y,
  }
}

export function getDraggedPixelOffset(
  dragState: PixelDragState,
  clientX: number,
  clientY: number,
): BackgroundOffset {
  return {
    x: dragState.startOffsetX + clientX - dragState.startClientX,
    y: dragState.startOffsetY + clientY - dragState.startClientY,
  }
}
