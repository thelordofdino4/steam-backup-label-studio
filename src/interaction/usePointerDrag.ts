import { useCallback, useEffect, useRef, type PointerEvent } from 'react'
import type { PointerDragStart } from './dragGeometry'

export type PointerDragActivationOptions = {
  activationDelayMs?: number
  movementTolerancePx?: number
}

type PointerDragOptions<TDragState extends PointerDragStart, TElement extends Element> = {
  onDragCancel?: (dragState: TDragState) => void
  onDragEnd?: (
    dragState: TDragState,
    event: PointerEvent<TElement>,
  ) => void
  onDragRelease?: (dragState: TDragState) => void
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
  onDragCancel,
  onDragEnd,
  onDragRelease,
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

    activeDragRef.current = null

    if (activeDrag.activationTimeoutId !== null) {
      window.clearTimeout(activeDrag.activationTimeoutId)
    }

    if (activeDrag.currentTarget.hasPointerCapture(activeDrag.pointerId)) {
      activeDrag.currentTarget.releasePointerCapture(activeDrag.pointerId)
    }

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

      const replacedDrag = activeDragRef.current
      clearActiveDrag()
      if (replacedDrag?.activated) {
        onDragCancel?.(replacedDrag.dragState)
      }
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
    [clearActiveDrag, onDragCancel, stopPropagation],
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
      if (activeDrag.activated) {
        onDragEnd?.(activeDrag.dragState, event)
      }
    },
    [clearActiveDrag, onDragEnd, stopPropagation],
  )

  const cancelPointerDrag = useCallback((event?: PointerEvent<TElement>) => {
    const activeDrag = activeDragRef.current
    if (!activeDrag || (event && activeDrag.pointerId !== event.pointerId)) {
      return
    }
    if (event && stopPropagation) event.stopPropagation()
    clearActiveDrag()
    if (activeDrag.activated) onDragCancel?.(activeDrag.dragState)
  }, [clearActiveDrag, onDragCancel, stopPropagation])

  useEffect(() => () => {
    const releasedDrag = activeDragRef.current
    clearActiveDrag()
    if (releasedDrag?.activated) {
      onDragRelease?.(releasedDrag.dragState)
    }
  }, [clearActiveDrag, onDragRelease])

  return {
    beginPointerDrag,
    handlePointerMove,
    endPointerDrag,
    cancelPointerDrag,
  }
}
