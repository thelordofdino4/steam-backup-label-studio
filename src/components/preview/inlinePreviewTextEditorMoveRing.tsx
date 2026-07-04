import type {
  PointerEventHandler,
  Ref,
} from 'react'
import {
  stopInlineTextEditorClick,
} from './inlinePreviewTextRibbonControls'

const INLINE_TEXT_EDGE_MOVE_HITS = [
  'top',
  'right',
  'bottom',
  'left',
  'top-left',
  'top-right',
  'bottom-right',
  'bottom-left',
]

type InlinePreviewTextEditorMoveRingProps = {
  isDragging: boolean
  moveEdgeRef: Ref<HTMLDivElement>
  moveHandleRef: Ref<HTMLButtonElement>
  onMoveEdgePointerRelease: PointerEventHandler<HTMLSpanElement>
}

export function InlinePreviewTextEditorMoveRing({
  isDragging,
  moveEdgeRef,
  moveHandleRef,
  onMoveEdgePointerRelease,
}: InlinePreviewTextEditorMoveRingProps) {
  return (
    <div
      ref={moveEdgeRef}
      aria-hidden="true"
      className={[
        'inline-preview-text-edge-move-ring',
        isDragging ? 'is-dragging' : '',
      ].filter(Boolean).join(' ')}
      data-smoke-id="inline-text-edge-move-ring"
    >
      {INLINE_TEXT_EDGE_MOVE_HITS.map((edge) => (
        <span
          key={edge}
          className={[
            'inline-preview-text-edge-move-hit',
            `inline-preview-text-edge-move-hit--${edge}`,
          ].join(' ')}
          data-smoke-id={`inline-text-edge-move-${edge}`}
          onPointerUp={onMoveEdgePointerRelease}
          onPointerCancel={onMoveEdgePointerRelease}
          onLostPointerCapture={onMoveEdgePointerRelease}
          onClick={stopInlineTextEditorClick}
        />
      ))}
      <button
        ref={moveHandleRef}
        className={[
          'inline-preview-text-move-handle',
          isDragging ? 'is-dragging' : '',
        ].filter(Boolean).join(' ')}
        data-smoke-id="inline-text-move-handle"
        type="button"
        onClick={stopInlineTextEditorClick}
      >
        Move
      </button>
    </div>
  )
}
