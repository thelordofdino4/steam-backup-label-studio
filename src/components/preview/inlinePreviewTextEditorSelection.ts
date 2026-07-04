import type {
  InlinePreviewTextEditorCaretFrame,
  InlinePreviewTextEditorSelectionFrame,
  InlinePreviewTextEditorSelectionRange,
} from './inlinePreviewTextEditorContract'
import {
  clampPlainTextOffset,
} from '../../text/richTextSelectionRanges.ts'

export type InlineTextCaretFrame = {
  height: number
  left: number
  pathD?: string
  rotationDegrees?: number
  strokeWidth?: number
  top: number
  viewportHeight?: number
  viewportWidth?: number
}

export type InlineTextSelectionFrame = {
  height: number
  left: number
  pathD?: string
  rotationDegrees?: number
  strokeWidth?: number
  top: number
  viewportHeight?: number
  viewportWidth?: number
  width: number
}

export type InlineTextSelectionState = {
  end: number
  focus: number
  start: number
}

export function normalizeExternalCaretFrame(
  frame: InlinePreviewTextEditorCaretFrame | null,
): InlineTextCaretFrame | null {
  return frame
}

export function normalizeExternalSelectionFrames(
  frames: readonly InlinePreviewTextEditorSelectionFrame[],
): InlineTextSelectionFrame[] {
  return frames.map((frame) => ({ ...frame }))
}

export function getInlineTextSelectionRange(
  selection: InlineTextSelectionState,
): InlinePreviewTextEditorSelectionRange {
  return {
    end: selection.end,
    start: selection.start,
  }
}

export function getInlineTextSelectionStateFromRange(
  selection: InlinePreviewTextEditorSelectionRange,
  valueLength: number,
): InlineTextSelectionState {
  const start = clampPlainTextOffset(selection.start, valueLength)
  const end = clampPlainTextOffset(selection.end, valueLength)

  return {
    end,
    focus: end,
    start,
  }
}

export function clampInlineTextSelectionState(
  selection: InlineTextSelectionState,
  valueLength: number,
): InlineTextSelectionState {
  return {
    end: clampPlainTextOffset(selection.end, valueLength),
    focus: clampPlainTextOffset(selection.focus, valueLength),
    start: clampPlainTextOffset(selection.start, valueLength),
  }
}

export function getTextareaSelectionState(
  textarea: HTMLTextAreaElement,
): InlineTextSelectionState {
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const focus = textarea.selectionDirection === 'backward' ? start : end

  return { end, focus, start }
}

export function getCollapsedSelectionState(
  caretIndex: number,
): InlineTextSelectionState {
  return {
    end: caretIndex,
    focus: caretIndex,
    start: caretIndex,
  }
}

export function isInlineTextSelectionCollapsed(
  selection: InlinePreviewTextEditorSelectionRange,
) {
  return selection.start === selection.end
}
