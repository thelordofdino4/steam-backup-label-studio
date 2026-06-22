export type DragBounds = {
  width: number
  height: number
}

export type DragPoint = {
  x: number
  y: number
}

export type DragPointRange = {
  maxX: number
  maxY: number
  minX: number
  minY: number
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

export const PERCENT_DRAG_POINT_RANGE: DragPointRange = {
  minX: 0,
  maxX: 100,
  minY: 0,
  maxY: 100,
}

export const OFFSET_DRAG_POINT_RANGE: DragPointRange = {
  minX: -100,
  maxX: 100,
  minY: -100,
  maxY: 100,
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
): DragPoint {
  return {
    x: dragState.startX + ((clientX - dragState.startClientX) / bounds.width) * 100,
    y: dragState.startY + ((clientY - dragState.startClientY) / bounds.height) * 100,
  }
}

export function createElementPercentDragState<TExtra extends object>(
  pointerId: number,
  clientX: number,
  clientY: number,
  startX: number,
  startY: number,
  extra: TExtra,
): TExtra & PercentDragState {
  return {
    ...extra,
    ...createPercentDragState(
      pointerId,
      clientX,
      clientY,
      startX,
      startY,
    ),
  }
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function clampDragPointToRange(
  point: DragPoint,
  range: DragPointRange,
): DragPoint {
  return {
    x: clampNumber(point.x, range.minX, range.maxX),
    y: clampNumber(point.y, range.minY, range.maxY),
  }
}

export function createPixelDragState(
  pointerId: number,
  clientX: number,
  clientY: number,
  startOffset: DragPoint,
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
  dragScale = 1,
): DragPoint {
  const safeDragScale = Number.isFinite(dragScale) && dragScale > 0
    ? dragScale
    : 1

  return {
    x: dragState.startOffsetX +
      (clientX - dragState.startClientX) / safeDragScale,
    y: dragState.startOffsetY +
      (clientY - dragState.startClientY) / safeDragScale,
  }
}
