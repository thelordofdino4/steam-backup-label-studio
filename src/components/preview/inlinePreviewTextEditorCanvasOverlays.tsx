import type {
  InlineTextCaretFrame,
  InlineTextSelectionFrame,
} from './inlinePreviewTextEditorSelection'

type InlinePreviewTextEditorCanvasOverlaysProps = {
  caretFrame: InlineTextCaretFrame | null
  hasVisibleSelection: boolean
  selectionFrames: InlineTextSelectionFrame[]
  shouldRenderCanvasInput: boolean
}

export function InlinePreviewTextEditorCanvasOverlays({
  caretFrame,
  hasVisibleSelection,
  selectionFrames,
  shouldRenderCanvasInput,
}: InlinePreviewTextEditorCanvasOverlaysProps) {
  if (!shouldRenderCanvasInput) {
    return null
  }

  return (
    <>
      {selectionFrames.map((frame, index) => (
        frame.pathD ? (
          <svg
            key={`${index}-${frame.pathD}`}
            aria-hidden="true"
            className="inline-preview-text-selection inline-preview-text-selection--path"
            data-smoke-id="inline-text-selection-path"
            style={{
              height: frame.viewportHeight ?? frame.height,
              left: 0,
              top: 0,
              width: frame.viewportWidth ?? frame.width,
            }}
            viewBox={`0 0 ${frame.viewportWidth ?? frame.width} ${frame.viewportHeight ?? frame.height}`}
          >
            <path
              className="inline-preview-text-selection-path"
              d={frame.pathD}
              pathLength={1}
              strokeWidth={frame.strokeWidth ?? frame.height}
            />
          </svg>
        ) : (
          <span
            key={`${index}-${frame.left}-${frame.width}`}
            aria-hidden="true"
            className="inline-preview-text-selection"
            style={{
              height: frame.height,
              left: frame.left,
              top: frame.top,
              transform:
                typeof frame.rotationDegrees === 'number'
                  ? `rotate(${frame.rotationDegrees}deg)`
                  : undefined,
              width: frame.width,
            }}
          />
        )
      ))}
      {caretFrame && !hasVisibleSelection ? (
        caretFrame.pathD ? (
          <svg
            aria-hidden="true"
            className="inline-preview-text-caret inline-preview-text-caret--path"
            data-smoke-id="inline-text-caret-path"
            style={{
              height: caretFrame.viewportHeight ?? caretFrame.height,
              left: 0,
              top: 0,
              width: caretFrame.viewportWidth ?? caretFrame.height,
            }}
            viewBox={`0 0 ${caretFrame.viewportWidth ?? caretFrame.height} ${caretFrame.viewportHeight ?? caretFrame.height}`}
          >
            <path
              className="inline-preview-text-caret-path"
              d={caretFrame.pathD}
              strokeWidth={caretFrame.strokeWidth ?? 2}
            />
          </svg>
        ) : (
          <span
            aria-hidden="true"
            className="inline-preview-text-caret"
            style={{
              height: caretFrame.height,
              left: caretFrame.left,
              top: caretFrame.top,
              transform:
                typeof caretFrame.rotationDegrees === 'number'
                  ? `rotate(${caretFrame.rotationDegrees}deg)`
                  : undefined,
            }}
          />
        )
      ) : null}
    </>
  )
}
