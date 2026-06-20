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
