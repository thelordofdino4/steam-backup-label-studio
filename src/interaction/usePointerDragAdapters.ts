import { type PointerEvent } from 'react'
import {
  getDraggedPercentPoint,
  getDraggedPixelOffset,
  type DragBounds,
  type DragPoint,
  type PercentDragState,
  type PixelDragState,
} from './dragGeometry'
import { usePointerDrag } from './usePointerDrag'

type PercentPointerDragOptions<TDragState extends PercentDragState> = {
  getBounds: (dragState: TDragState) => DragBounds | null | undefined
  onDraggedPoint: (dragState: TDragState, draggedPoint: DragPoint) => void
  stopPropagation?: boolean
}

type PixelPointerDragOptions<TDragState extends PixelDragState> = {
  getScale?: (dragState: TDragState) => number | null | undefined
  onDraggedOffset: (dragState: TDragState, draggedOffset: DragPoint) => void
  stopPropagation?: boolean
}

export function usePercentPointerDrag<
  TDragState extends PercentDragState,
  TElement extends Element = Element,
>({
  getBounds,
  onDraggedPoint,
  stopPropagation = true,
}: PercentPointerDragOptions<TDragState>) {
  return usePointerDrag<TDragState, TElement>({
    stopPropagation,
    onDragMove: (dragState, event: PointerEvent<TElement>) => {
      const bounds = getBounds(dragState)

      if (!bounds) {
        return
      }

      onDraggedPoint(
        dragState,
        getDraggedPercentPoint(
          dragState,
          event.clientX,
          event.clientY,
          bounds,
        ),
      )
    },
  })
}

export function usePixelPointerDrag<
  TDragState extends PixelDragState,
  TElement extends Element = Element,
>({
  getScale,
  onDraggedOffset,
  stopPropagation = false,
}: PixelPointerDragOptions<TDragState>) {
  return usePointerDrag<TDragState, TElement>({
    stopPropagation,
    onDragMove: (dragState, event: PointerEvent<TElement>) => {
      onDraggedOffset(
        dragState,
        getDraggedPixelOffset(
          dragState,
          event.clientX,
          event.clientY,
          getScale?.(dragState) ?? 1,
        ),
      )
    },
  })
}
