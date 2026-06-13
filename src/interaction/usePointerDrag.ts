import { useCallback, useEffect, useRef, type PointerEvent } from 'react'
import type { PointerDragStart } from './dragGeometry'

export type PointerDragActivationOptions = {
  activationDelayMs?: number
  movementTolerancePx?: number
}

type PointerDragOptions<TDragState extends PointerDragStart, TElement extends Element> = {
  onDragMove: (dragState: TDragState, event: PointerEvent<TElement>) => void
  stopPropagation?: boolean
}

type ActivePointerDrag<TDragState extends PointerDragStart, TElement extends Element> = {
  activationTimeoutId: number | null
  activated: boolean
  currentTarget: TElement
  dragState: TDragState
  movementTolerancePx: number
  pointerId: number
}

const DEFAULT_POINTER_DRAG_MOVEMENT_TOLERANCE_PX = 6

function getPointerTravelDistance(
  dragState: PointerDragStart,
  clientX: number,
  clientY: number,
) {
  const deltaX = clientX - dragState.startClientX
  const deltaY = clientY - dragState.startClientY

  return Math.sqrt(deltaX * deltaX + deltaY * deltaY)
}

export function usePointerDrag<
  TDragState extends PointerDragStart,
  TElement extends Element = Element,
>({
  onDragMove,
  stopPropagation = false,
}: PointerDragOptions<TDragState, TElement>) {
  const activeDragRef =
    useRef<ActivePointerDrag<TDragState, TElement> | null>(null)

  const clearActiveDrag = useCallback(() => {
    const activeDrag = activeDragRef.current

    if (!activeDrag) {
      return
    }

    if (activeDrag.activationTimeoutId !== null) {
      window.clearTimeout(activeDrag.activationTimeoutId)
    }

    if (activeDrag.currentTarget.hasPointerCapture(activeDrag.pointerId)) {
      activeDrag.currentTarget.releasePointerCapture(activeDrag.pointerId)
    }

    activeDragRef.current = null
  }, [])

  const beginPointerDrag = useCallback(
    (
      event: PointerEvent<TElement>,
      dragState: TDragState,
      activationOptions: PointerDragActivationOptions = {},
    ) => {
      if (stopPropagation) {
        event.stopPropagation()
      }

      clearActiveDrag()
      event.currentTarget.setPointerCapture(event.pointerId)

      const activationDelayMs = activationOptions.activationDelayMs ?? 0
      const activeDrag: ActivePointerDrag<TDragState, TElement> = {
        activationTimeoutId: null,
        activated: activationDelayMs <= 0,
        currentTarget: event.currentTarget,
        dragState,
        movementTolerancePx: activationOptions.movementTolerancePx ??
          DEFAULT_POINTER_DRAG_MOVEMENT_TOLERANCE_PX,
        pointerId: event.pointerId,
      }

      if (activationDelayMs > 0) {
        activeDrag.activationTimeoutId = window.setTimeout(() => {
          const currentDrag = activeDragRef.current
          if (currentDrag?.pointerId === event.pointerId) {
            currentDrag.activated = true
            currentDrag.activationTimeoutId = null
          }
        }, activationDelayMs)
      }

      activeDragRef.current = activeDrag
    },
    [clearActiveDrag, stopPropagation],
  )

  const handlePointerMove = useCallback(
    (event: PointerEvent<TElement>) => {
      const activeDrag = activeDragRef.current

      if (!activeDrag || activeDrag.pointerId !== event.pointerId) {
        return
      }

      if (stopPropagation) {
        event.stopPropagation()
      }

      if (!activeDrag.activated) {
        if (
          getPointerTravelDistance(
            activeDrag.dragState,
            event.clientX,
            event.clientY,
          ) > activeDrag.movementTolerancePx
        ) {
          clearActiveDrag()
        }

        return
      }

      onDragMove(activeDrag.dragState, event)
    },
    [clearActiveDrag, onDragMove, stopPropagation],
  )

  const endPointerDrag = useCallback(
    (event: PointerEvent<TElement>) => {
      const activeDrag = activeDragRef.current

      if (!activeDrag || activeDrag.pointerId !== event.pointerId) {
        return
      }

      if (stopPropagation) {
        event.stopPropagation()
      }

      clearActiveDrag()
    },
    [clearActiveDrag, stopPropagation],
  )

  const cancelPointerDrag = useCallback(() => {
    clearActiveDrag()
  }, [clearActiveDrag])

  useEffect(() => cancelPointerDrag, [cancelPointerDrag])

  return {
    beginPointerDrag,
    handlePointerMove,
    endPointerDrag,
    cancelPointerDrag,
  }
}
