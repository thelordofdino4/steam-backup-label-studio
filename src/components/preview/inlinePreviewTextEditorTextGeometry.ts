import {
  getInlinePreviewTextCaretIndexForLineOffset,
  getInlinePreviewTextCaretLineOffset,
  getInlinePreviewTextSelectionLineOffsets,
} from './inlinePreviewTextEditorCaret.ts'
import {
  getInlinePreviewTextGeometryOffsetForClientPoint,
} from './inlinePreviewTextEditorTransform.ts'
import {
  normalizeExternalCaretFrame,
  normalizeExternalSelectionFrames,
  type InlineTextCaretFrame,
  type InlineTextSelectionFrame,
  type InlineTextSelectionState,
} from './inlinePreviewTextEditorSelection.ts'
import {
  clampPlainTextOffset,
} from '../../text/richTextSelectionRanges.ts'
import type {
  InlinePreviewTextEditorGeometryAdapter,
  InlinePreviewTextEditorGeometryLine,
  InlinePreviewTextEditorLine,
} from './inlinePreviewTextEditorContract.ts'

export const INLINE_PREVIEW_TEXT_HOST_CLASS = 'inline-preview-text-host'
export const INLINE_PREVIEW_TEXT_LINE_INDEX_ATTRIBUTE =
  'data-inline-preview-text-line-index'

export function getLineSpan(host: Element, lineIndex: number) {
  return host.querySelector<HTMLElement>(
    `[${INLINE_PREVIEW_TEXT_LINE_INDEX_ATTRIBUTE}="${lineIndex}"]`,
  )
}

export function getTextRangeBoundary(
  lineSpan: HTMLElement,
  offset: number,
  lineRect: DOMRect,
) {
  if (
    typeof document === 'undefined'
  ) {
    return offset <= 0 ? lineRect.left : lineRect.right
  }

  const textNodes = getLineTextNodes(lineSpan)
  const textLength = getLineTextLength(textNodes)
  const rangeOffset = clampPlainTextOffset(offset, textLength)

  if (rangeOffset === 0) {
    return lineRect.left
  }

  if (textNodes.length === 0) {
    return offset <= 0 ? lineRect.left : lineRect.right
  }

  let currentOffset = 0
  let endNode = textNodes[textNodes.length - 1]
  let endOffset = endNode.textContent?.length ?? 0

  for (const textNode of textNodes) {
    const nodeLength = textNode.textContent?.length ?? 0

    if (rangeOffset <= currentOffset + nodeLength) {
      endNode = textNode
      endOffset = rangeOffset - currentOffset
      break
    }

    currentOffset += nodeLength
  }

  const range = document.createRange()
  range.setStart(textNodes[0], 0)
  range.setEnd(endNode, endOffset)

  const rects = Array.from(range.getClientRects())
  const lastRect = rects[rects.length - 1]
  const rangeRect = lastRect ?? range.getBoundingClientRect()
  const boundary =
    rangeRect.width > 0 || rangeRect.height > 0
      ? rangeRect.right
      : lineRect.right

  range.detach()

  return boundary
}

export function getLineTextNodes(lineSpan: HTMLElement) {
  const ownerDocument = lineSpan.ownerDocument
  const walker = ownerDocument.createTreeWalker(
    lineSpan,
    NodeFilter.SHOW_TEXT,
  )
  const textNodes: Text[] = []
  let currentNode = walker.nextNode()

  while (currentNode) {
    if (currentNode.textContent) {
      textNodes.push(currentNode as Text)
    }
    currentNode = walker.nextNode()
  }

  return textNodes
}

export function getLineTextLength(textNodes: readonly Text[]) {
  return textNodes.reduce(
    (length, textNode) => length + (textNode.textContent?.length ?? 0),
    0,
  )
}

export function clampTextNodeOffset(textNode: Text, offset: number) {
  const textLength = textNode.textContent?.length ?? 0

  return clampPlainTextOffset(offset, textLength)
}

export function getInlinePreviewGeometryCaretXRatio({
  caretXRatios,
  fallback = 0,
  offset,
}: {
  caretXRatios: readonly number[]
  fallback?: number
  offset: number
}) {
  const ratioIndex = Math.max(0, Math.min(offset, caretXRatios.length - 1))

  return caretXRatios[ratioIndex] ?? fallback
}

export function getElementTextOffset(
  lineSpan: HTMLElement,
  element: Element,
  offset: number,
) {
  let textOffset = 0
  const childNodes = Array.from(element.childNodes)
  const clampedOffset = Math.max(0, Math.min(offset, childNodes.length))

  for (let index = 0; index < clampedOffset; index += 1) {
    textOffset += childNodes[index].textContent?.length ?? 0
  }

  if (element !== lineSpan) {
    let ancestor: Node | null = element

    while (ancestor?.parentNode && ancestor.parentNode !== lineSpan) {
      const parent: ParentNode = ancestor.parentNode
      const siblings: Node[] = Array.from(parent.childNodes)
      const ancestorIndex = siblings.findIndex((sibling) => sibling === ancestor)

      for (let index = 0; index < ancestorIndex; index += 1) {
        textOffset += siblings[index].textContent?.length ?? 0
      }

      ancestor = parent
    }

    if (ancestor?.parentNode === lineSpan) {
      const siblings: Node[] = Array.from(lineSpan.childNodes)
      const ancestorIndex = siblings.findIndex((sibling) => sibling === ancestor)

      for (let index = 0; index < ancestorIndex; index += 1) {
        textOffset += siblings[index].textContent?.length ?? 0
      }
    }
  }

  return clampPlainTextOffset(textOffset, lineSpan.textContent?.length ?? 0)
}

export function getTextNodeCaretOffset({
  lineSpan,
  offset,
  offsetNode,
}: {
  lineSpan: HTMLElement
  offset: number
  offsetNode: Node | null
}) {
  const textNodes = getLineTextNodes(lineSpan)
  let textOffset = 0

  for (const textNode of textNodes) {
    if (offsetNode === textNode) {
      return textOffset + clampTextNodeOffset(textNode, offset)
    }
    textOffset += textNode.textContent?.length ?? 0
  }

  if (offsetNode instanceof Element && lineSpan.contains(offsetNode)) {
    return getElementTextOffset(lineSpan, offsetNode, offset)
  }

  return null
}

export function getCaretTextOffsetFromPoint(
  lineSpan: HTMLElement,
  clientX: number,
  clientY: number,
) {
  if (typeof document === 'undefined') {
    return null
  }

  const ownerDocument = lineSpan.ownerDocument
  const caretPositionFromPoint = ownerDocument.caretPositionFromPoint

  if (caretPositionFromPoint) {
    const position = caretPositionFromPoint.call(
      ownerDocument,
      clientX,
      clientY,
    )
    const offset = position
      ? getTextNodeCaretOffset({
          lineSpan,
          offset: position.offset,
          offsetNode: position.offsetNode,
        })
      : null

    if (offset !== null) {
      return offset
    }
  }

  const documentWithCaretRange = ownerDocument as Document & {
    caretRangeFromPoint?: (x: number, y: number) => Range | null
  }
  const caretRangeFromPoint = documentWithCaretRange.caretRangeFromPoint

  if (!caretRangeFromPoint) {
    return null
  }

  const range = caretRangeFromPoint.call(ownerDocument, clientX, clientY)
  const offset = range
    ? getTextNodeCaretOffset({
        lineSpan,
        offset: range.startOffset,
        offsetNode: range.startContainer,
      })
    : null

  range?.detach()

  return offset
}

export function getNearestTextOffset(
  lineSpan: HTMLElement,
  clientX: number,
  clientY: number,
) {
  const caretOffset = getCaretTextOffsetFromPoint(lineSpan, clientX, clientY)

  if (caretOffset !== null) {
    return caretOffset
  }

  const lineRect = lineSpan.getBoundingClientRect()
  const textLength = getLineTextLength(getLineTextNodes(lineSpan))
  let nearestOffset = 0
  let nearestDistance = Math.abs(clientX - lineRect.left)

  for (let offset = 1; offset <= textLength; offset += 1) {
    const boundary = getTextRangeBoundary(lineSpan, offset, lineRect)
    const distance = Math.abs(clientX - boundary)

    if (distance <= nearestDistance) {
      nearestOffset = offset
      nearestDistance = distance
    }
  }

  return nearestOffset
}

export function getNearestLineSpan({
  clientY,
  host,
  lines,
}: {
  clientY: number
  host: Element
  lines: InlinePreviewTextEditorLine[]
}) {
  let nearestLineSpan: HTMLElement | null = null
  let nearestLineIndex = 0
  let nearestDistance = Number.POSITIVE_INFINITY

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const lineSpan = getLineSpan(host, lineIndex)

    if (!lineSpan) {
      continue
    }

    const rect = lineSpan.getBoundingClientRect()
    const distance =
      clientY >= rect.top && clientY <= rect.bottom
        ? 0
        : Math.min(
            Math.abs(clientY - rect.top),
            Math.abs(clientY - rect.bottom),
          )

    if (distance < nearestDistance) {
      nearestDistance = distance
      nearestLineIndex = lineIndex
      nearestLineSpan = lineSpan
    }
  }

  if (!nearestLineSpan) {
    return null
  }

  return {
    lineIndex: nearestLineIndex,
    lineSpan: nearestLineSpan,
  }
}

export function getGeometryLineFrame({
  geometryLine,
  hostHeight,
}: {
  geometryLine: InlinePreviewTextEditorGeometryLine
  hostHeight: number
}) {
  const top = geometryLine.topRatio * hostHeight
  const height = Math.max(1, geometryLine.heightRatio * hostHeight)

  return {
    bottom: top + height,
    height,
    top,
  }
}

export function getHostLocalSize(host: Element, hostRect: DOMRect) {
  const htmlHost = host instanceof HTMLElement ? host : null
  const width = htmlHost?.offsetWidth || hostRect.width
  const height = htmlHost?.offsetHeight || hostRect.height

  return {
    height: Math.max(1, height),
    width: Math.max(1, width),
  }
}

export function getPointerSelectionStart({
  caretValue,
  clientX,
  clientY,
  geometryAdapter,
  geometryLines,
  host,
  lines,
  rotationDegrees,
}: {
  caretValue: string
  clientX: number
  clientY: number
  geometryAdapter?: InlinePreviewTextEditorGeometryAdapter
  geometryLines?: InlinePreviewTextEditorGeometryLine[]
  host: Element
  lines: InlinePreviewTextEditorLine[]
  rotationDegrees?: number
}) {
  if (geometryAdapter) {
    const hostRect = host.getBoundingClientRect()
    const hostSize = getHostLocalSize(host, hostRect)
    const geometryOffset = geometryAdapter.getOffsetForClientPoint({
      clientX,
      clientY,
      hostHeight: hostSize.height,
      hostRect,
      hostWidth: hostSize.width,
    })

    if (!geometryOffset) {
      return null
    }

    return getInlinePreviewTextCaretIndexForLineOffset({
      caretValue,
      lineIndex: geometryOffset.lineIndex,
      lines,
      offset: geometryOffset.offset,
    })
  }

  if (geometryLines) {
    const hostRect = host.getBoundingClientRect()
    const hostSize = getHostLocalSize(host, hostRect)
    const geometryOffset = getInlinePreviewTextGeometryOffsetForClientPoint({
      clientX,
      clientY,
      geometryLines,
      hostHeight: hostSize.height,
      hostRect,
      hostWidth: hostSize.width,
      rotationDegrees,
    })

    if (!geometryOffset) {
      return null
    }

    return getInlinePreviewTextCaretIndexForLineOffset({
      caretValue,
      lineIndex: geometryOffset.lineIndex,
      lines,
      offset: geometryOffset.offset,
    })
  }

  const nearestLine = getNearestLineSpan({ clientY, host, lines })

  if (!nearestLine) {
    return null
  }

  return getInlinePreviewTextCaretIndexForLineOffset({
    caretValue,
    lineIndex: nearestLine.lineIndex,
    lines,
    offset: getNearestTextOffset(nearestLine.lineSpan, clientX, clientY),
  })
}

export function getTextSelectionFrames({
  caretValue,
  geometryAdapter,
  geometryLines,
  host,
  lines,
  selection,
}: {
  caretValue: string
  geometryAdapter?: InlinePreviewTextEditorGeometryAdapter
  geometryLines?: InlinePreviewTextEditorGeometryLine[]
  host: Element
  lines: InlinePreviewTextEditorLine[]
  selection: InlineTextSelectionState
}) {
  const lineOffsets = getInlinePreviewTextSelectionLineOffsets({
    caretValue,
    lines,
    selectionEnd: selection.end,
    selectionStart: selection.start,
  })
  const hostRect = host.getBoundingClientRect()

  if (geometryAdapter) {
    const hostSize = getHostLocalSize(host, hostRect)

    return normalizeExternalSelectionFrames(
      geometryAdapter.getSelectionFrames({
        caretValue,
        hostHeight: hostSize.height,
        hostRect,
        hostWidth: hostSize.width,
        lines,
        selection: {
          end: selection.end,
          start: selection.start,
        },
      }),
    )
  }

  return lineOffsets.flatMap((lineOffset) => {
    if (geometryLines) {
      const geometryLine = geometryLines[lineOffset.lineIndex]

      if (!geometryLine) {
        return []
      }

      const hostSize = getHostLocalSize(host, hostRect)
      const lineFrame = getGeometryLineFrame({
        geometryLine,
        hostHeight: hostSize.height,
      })
      const startRatio = getInlinePreviewGeometryCaretXRatio({
        caretXRatios: geometryLine.caretXRatios,
        offset: lineOffset.startOffset,
      })
      const endRatio = getInlinePreviewGeometryCaretXRatio({
        caretXRatios: geometryLine.caretXRatios,
        fallback: startRatio,
        offset: lineOffset.endOffset,
      })
      const leftRatio = Math.min(startRatio, endRatio)
      const width = Math.abs(endRatio - startRatio) * hostSize.width

      if (width <= 0) {
        return []
      }

      return [
        {
          height: lineFrame.height,
          left: leftRatio * hostSize.width,
          top: lineFrame.top,
          width,
        } satisfies InlineTextSelectionFrame,
      ]
    }

    const lineSpan = getLineSpan(host, lineOffset.lineIndex)

    if (!lineSpan) {
      return []
    }

    const lineRect = lineSpan.getBoundingClientRect()
    const startBoundary = getTextRangeBoundary(
      lineSpan,
      lineOffset.startOffset,
      lineRect,
    )
    const endBoundary = getTextRangeBoundary(
      lineSpan,
      lineOffset.endOffset,
      lineRect,
    )
    const left = Math.min(startBoundary, endBoundary)
    const width = Math.abs(endBoundary - startBoundary)

    if (width <= 0) {
      return []
    }

    return [
      {
        height: Math.max(1, lineRect.height),
        left: left - hostRect.left,
        top: lineRect.top - hostRect.top,
        width,
      } satisfies InlineTextSelectionFrame,
    ]
  })
}

export function getGeometryCaretFrame({
  caretValue,
  geometryAdapter,
  geometryLines,
  host,
  lines,
  selectionFocus,
}: {
  caretValue: string
  geometryAdapter?: InlinePreviewTextEditorGeometryAdapter
  geometryLines?: InlinePreviewTextEditorGeometryLine[]
  host: Element
  lines: InlinePreviewTextEditorLine[]
  selectionFocus: number
}): InlineTextCaretFrame | null {
  const hostRect = host.getBoundingClientRect()
  const hostSize = getHostLocalSize(host, hostRect)

  if (geometryAdapter) {
    return normalizeExternalCaretFrame(
      geometryAdapter.getCaretFrame({
        caretValue,
        hostHeight: hostSize.height,
        hostRect,
        hostWidth: hostSize.width,
        lines,
        selectionFocus,
      }),
    )
  }
  const { lineIndex, offset } = getInlinePreviewTextCaretLineOffset({
    caretIndex: selectionFocus,
    caretValue,
    lines,
  })
  const geometryLine = geometryLines?.[lineIndex]

  if (!geometryLine) {
    return null
  }

  const frame = getGeometryLineFrame({
    geometryLine,
    hostHeight: hostSize.height,
  })
  const caretXRatio = getInlinePreviewGeometryCaretXRatio({
    caretXRatios: geometryLine.caretXRatios,
    offset,
  })

  return {
    height: frame.height,
    left: caretXRatio * hostSize.width,
    top: frame.top,
  }
}
