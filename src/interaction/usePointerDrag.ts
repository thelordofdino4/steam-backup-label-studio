import { useCallback, useRef, type PointerEvent } from 'react'
import type { PointerDragStart } from './dragGeometry'

type PointerDragOptions<TDragState extends PointerDragStart, TElement extends Element> = {
  onDragMove: (dragState: TDragState, event: PointerEvent<TElement>) => void
  stopPropagation?: boolean
}

export function usePointerDrag<
  TDragState extends PointerDragStart,
  TElement extends Element = Element,
>({
  onDragMove,
  stopPropagation = false,
}: PointerDragOptions<TDragState, TElement>) {
  const activeDragRef = useRef<TDragState | null>(null)

  const beginPointerDrag = useCallback(
    (event: PointerEvent<TElement>, dragState: TDragState) => {
      if (stopPropagation) {
        event.stopPropagation()
      }

      event.currentTarget.setPointerCapture(event.pointerId)
      activeDragRef.current = dragState
    },
    [stopPropagation],
  )

  const handlePointerMove = useCallback(
    (event: PointerEvent<TElement>) => {
      const dragState = activeDragRef.current

      if (!dragState || dragState.pointerId !== event.pointerId) {
        return
      }

      if (stopPropagation) {
        event.stopPropagation()
      }

      onDragMove(dragState, event)
    },
    [onDragMove, stopPropagation],
  )

  const endPointerDrag = useCallback(
    (event: PointerEvent<TElement>) => {
      const dragState = activeDragRef.current

      if (!dragState || dragState.pointerId !== event.pointerId) {
        return
      }

      if (stopPropagation) {
        event.stopPropagation()
      }

      activeDragRef.current = null

      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId)
      }
    },
    [stopPropagation],
  )

  const cancelPointerDrag = useCallback(() => {
    activeDragRef.current = null
  }, [])

  return {
    beginPointerDrag,
    handlePointerMove,
    endPointerDrag,
    cancelPointerDrag,
  }
}
