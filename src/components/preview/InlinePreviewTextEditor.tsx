import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { createPortal } from 'react-dom'
import {
  isInlinePreviewTextSelectAllShortcut,
} from './inlinePreviewTextEditorInput'
import {
  getInlinePreviewTextCaretIndexForLineOffset,
  getInlinePreviewTextCaretLineOffset,
  getInlinePreviewTextSelectionLineOffsets,
} from './inlinePreviewTextEditorCaret'
import {
  getInlinePreviewTextControlLayout,
  type InlinePreviewTextAnchor,
  type InlinePreviewTextControlSizes,
  type InlinePreviewTextEditorMenuPlacement,
  type InlinePreviewTextRect,
  type InlinePreviewTextSize,
} from './inlinePreviewTextEditorPositioning'

export const INLINE_PREVIEW_TEXT_HOST_CLASS = 'inline-preview-text-host'
export const INLINE_PREVIEW_TEXT_LINE_INDEX_ATTRIBUTE =
  'data-inline-preview-text-line-index'
export const INLINE_PREVIEW_TEXT_TARGET_ATTRIBUTE =
  'data-inline-preview-text-target'

export type InlinePreviewTextEditorInputMode = 'overlay' | 'adapter'

export type InlinePreviewTextEditorTab =
  | 'presets'
  | 'text'
  | 'art'
  | 'utilities'

export type InlinePreviewTextEditorLine = {
  text: string
}

export type InlinePreviewTextEditorGeometryLine = {
  caretXRatios: number[]
  heightRatio: number
  text: string
  topRatio: number
}

export type InlinePreviewTextEditorProps = {
  ariaLabel: string
  caretValue: string
  inputMode?: InlinePreviewTextEditorInputMode
  geometryLines?: InlinePreviewTextEditorGeometryLine[]
  lines: InlinePreviewTextEditorLine[]
  targetKey: string
  value: string
  textareaStyle?: CSSProperties
  menuPlacement: InlinePreviewTextEditorMenuPlacement
  onValueChange: (value: string) => void
  onMoveHandlePointerDown: (event: ReactPointerEvent<Element>) => void
  onMoveHandlePointerMove: (event: ReactPointerEvent<Element>) => void
  onMoveHandlePointerUp: (event: ReactPointerEvent<Element>) => void
  onDone: () => void
}

type InlineTextControlFrame = {
  anchor: InlinePreviewTextAnchor
  previewRect: InlinePreviewTextRect
}

type InlineTextCaretFrame = {
  height: number
  left: number
  top: number
}

type InlineTextSelectionFrame = {
  height: number
  left: number
  top: number
  width: number
}

type InlineTextSelectionState = {
  end: number
  focus: number
  start: number
}

const INLINE_TEXT_EDITOR_TABS: Array<{
  id: InlinePreviewTextEditorTab
  label: string
}> = [
  { id: 'presets', label: 'Style Presets' },
  { id: 'text', label: 'Text Controls' },
  { id: 'art', label: 'Artistic Elements' },
  { id: 'utilities', label: 'Utilities' },
]

const INLINE_PREVIEW_SURFACE_SELECTOR = '.case-insert-preview, .disc-preview'

const INLINE_TEXT_DEFAULT_CONTROL_SIZES: InlinePreviewTextControlSizes = {
  menu: { height: 48, width: 76 },
  moveHandle: { height: 28, width: 48 },
  tabs: { height: 56, width: 340 },
}

function stopInlineTextEditorClick(event: MouseEvent<Element>) {
  event.stopPropagation()
}

function keepInlineTextEditorFocus(event: ReactPointerEvent<Element>) {
  event.preventDefault()
  event.stopPropagation()
}

function rectToInlineTextRect(rect: DOMRect): InlinePreviewTextRect {
  return {
    bottom: rect.bottom,
    left: rect.left,
    right: rect.right,
    top: rect.top,
  }
}

function getInlineTextPreviewSurface(host: Element) {
  return host.closest<HTMLElement>(INLINE_PREVIEW_SURFACE_SELECTOR)
}

function getInlineTextControlSize(
  element: Element | null,
  fallback: InlinePreviewTextSize,
): InlinePreviewTextSize {
  if (!element) return fallback

  const rect = element.getBoundingClientRect()

  if (rect.width <= 0 || rect.height <= 0) {
    return fallback
  }

  return {
    height: rect.height,
    width: rect.width,
  }
}

function areInlineTextSizesEqual(
  first: InlinePreviewTextSize,
  second: InlinePreviewTextSize,
) {
  return (
    Math.abs(first.height - second.height) < 0.5 &&
    Math.abs(first.width - second.width) < 0.5
  )
}

function areInlineTextControlSizesEqual(
  first: InlinePreviewTextControlSizes,
  second: InlinePreviewTextControlSizes,
) {
  return (
    areInlineTextSizesEqual(first.menu, second.menu) &&
    areInlineTextSizesEqual(first.moveHandle, second.moveHandle) &&
    areInlineTextSizesEqual(first.tabs, second.tabs)
  )
}

function getLineSpan(host: Element, lineIndex: number) {
  return host.querySelector<HTMLElement>(
    `[${INLINE_PREVIEW_TEXT_LINE_INDEX_ATTRIBUTE}="${lineIndex}"]`,
  )
}

function getInlinePreviewTextHostForTarget({
  inputMode,
  targetKey,
  textarea,
}: {
  inputMode: InlinePreviewTextEditorInputMode
  targetKey: string
  textarea: HTMLTextAreaElement | null
}) {
  if (inputMode === 'overlay') {
    return textarea?.closest<HTMLElement>(
      `.${INLINE_PREVIEW_TEXT_HOST_CLASS}`,
    ) ?? null
  }

  if (typeof document === 'undefined') {
    return null
  }

  const candidates = Array.from(
    document.querySelectorAll<HTMLElement>(
      `[${INLINE_PREVIEW_TEXT_TARGET_ATTRIBUTE}]`,
    ),
  )

  return candidates.find((candidate) =>
    candidate.getAttribute(INLINE_PREVIEW_TEXT_TARGET_ATTRIBUTE) === targetKey,
  ) ?? null
}

function getTextRangeBoundary(
  textNode: ChildNode | null,
  offset: number,
  lineRect: DOMRect,
) {
  if (
    !textNode ||
    textNode.nodeType !== Node.TEXT_NODE ||
    typeof document === 'undefined'
  ) {
    return offset <= 0 ? lineRect.left : lineRect.right
  }

  const textLength = textNode.textContent?.length ?? 0
  const rangeOffset = Math.max(0, Math.min(offset, textLength))

  if (rangeOffset === 0) {
    return lineRect.left
  }

  const range = document.createRange()
  range.setStart(textNode, 0)
  range.setEnd(textNode, rangeOffset)

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

function getLineTextNode(lineSpan: HTMLElement) {
  const textNode = lineSpan.firstChild

  return textNode && textNode.nodeType === Node.TEXT_NODE
    ? textNode
    : null
}

function clampTextNodeOffset(textNode: ChildNode, offset: number) {
  const textLength = textNode.textContent?.length ?? 0

  return Math.max(0, Math.min(offset, textLength))
}

function getTextNodeCaretOffset({
  lineSpan,
  offset,
  offsetNode,
  textNode,
}: {
  lineSpan: HTMLElement
  offset: number
  offsetNode: Node | null
  textNode: ChildNode
}) {
  if (offsetNode === textNode) {
    return clampTextNodeOffset(textNode, offset)
  }

  if (offsetNode instanceof Element && lineSpan.contains(offsetNode)) {
    return offset <= 0 ? 0 : clampTextNodeOffset(textNode, offset)
  }

  return null
}

function getCaretTextOffsetFromPoint(
  lineSpan: HTMLElement,
  clientX: number,
  clientY: number,
) {
  const textNode = getLineTextNode(lineSpan)

  if (!textNode || typeof document === 'undefined') {
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
          textNode,
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
        textNode,
      })
    : null

  range?.detach()

  return offset
}

function getNearestTextOffset(
  lineSpan: HTMLElement,
  clientX: number,
  clientY: number,
) {
  const caretOffset = getCaretTextOffsetFromPoint(lineSpan, clientX, clientY)

  if (caretOffset !== null) {
    return caretOffset
  }

  const lineRect = lineSpan.getBoundingClientRect()
  const textNode = getLineTextNode(lineSpan)
  const textLength = textNode?.textContent?.length ?? 0
  let nearestOffset = 0
  let nearestDistance = Math.abs(clientX - lineRect.left)

  for (let offset = 1; offset <= textLength; offset += 1) {
    const boundary = getTextRangeBoundary(textNode, offset, lineRect)
    const distance = Math.abs(clientX - boundary)

    if (distance <= nearestDistance) {
      nearestOffset = offset
      nearestDistance = distance
    }
  }

  return nearestOffset
}

function getNearestLineSpan({
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

function getGeometryLineFrame({
  geometryLine,
  hostRect,
}: {
  geometryLine: InlinePreviewTextEditorGeometryLine
  hostRect: DOMRect
}) {
  const top = hostRect.top + geometryLine.topRatio * hostRect.height
  const height = Math.max(1, geometryLine.heightRatio * hostRect.height)

  return {
    bottom: top + height,
    height,
    top,
  }
}

function getNearestGeometryLine({
  clientY,
  geometryLines,
  host,
}: {
  clientY: number
  geometryLines: InlinePreviewTextEditorGeometryLine[]
  host: Element
}) {
  const hostRect = host.getBoundingClientRect()
  let nearestLineIndex = 0
  let nearestDistance = Number.POSITIVE_INFINITY

  for (let lineIndex = 0; lineIndex < geometryLines.length; lineIndex += 1) {
    const frame = getGeometryLineFrame({
      geometryLine: geometryLines[lineIndex],
      hostRect,
    })
    const distance =
      clientY >= frame.top && clientY <= frame.bottom
        ? 0
        : Math.min(
            Math.abs(clientY - frame.top),
            Math.abs(clientY - frame.bottom),
          )

    if (distance < nearestDistance) {
      nearestDistance = distance
      nearestLineIndex = lineIndex
    }
  }

  if (geometryLines.length === 0) {
    return null
  }

  return {
    line: geometryLines[nearestLineIndex],
    lineIndex: nearestLineIndex,
  }
}

function getNearestGeometryTextOffset({
  clientX,
  geometryLine,
  host,
}: {
  clientX: number
  geometryLine: InlinePreviewTextEditorGeometryLine
  host: Element
}) {
  const hostRect = host.getBoundingClientRect()
  const caretXs = geometryLine.caretXRatios.map(
    (ratio) => hostRect.left + ratio * hostRect.width,
  )
  let nearestOffset = 0
  let nearestDistance = Number.POSITIVE_INFINITY

  for (let offset = 0; offset < caretXs.length; offset += 1) {
    const distance = Math.abs(clientX - caretXs[offset])

    if (distance <= nearestDistance) {
      nearestOffset = offset
      nearestDistance = distance
    }
  }

  return nearestOffset
}

function getPointerSelectionStart({
  caretValue,
  clientX,
  clientY,
  geometryLines,
  host,
  lines,
}: {
  caretValue: string
  clientX: number
  clientY: number
  geometryLines?: InlinePreviewTextEditorGeometryLine[]
  host: Element
  lines: InlinePreviewTextEditorLine[]
}) {
  if (geometryLines) {
    const nearestGeometryLine = getNearestGeometryLine({
      clientY,
      geometryLines,
      host,
    })

    if (!nearestGeometryLine) {
      return null
    }

    return getInlinePreviewTextCaretIndexForLineOffset({
      caretValue,
      lineIndex: nearestGeometryLine.lineIndex,
      lines,
      offset: getNearestGeometryTextOffset({
        clientX,
        geometryLine: nearestGeometryLine.line,
        host,
      }),
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

function getTextSelectionFrames({
  caretValue,
  geometryLines,
  host,
  lines,
  selection,
}: {
  caretValue: string
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

  return lineOffsets.flatMap((lineOffset) => {
    if (geometryLines) {
      const geometryLine = geometryLines[lineOffset.lineIndex]

      if (!geometryLine) {
        return []
      }

      const lineFrame = getGeometryLineFrame({ geometryLine, hostRect })
      const startRatio =
        geometryLine.caretXRatios[
          Math.max(
            0,
            Math.min(
              lineOffset.startOffset,
              geometryLine.caretXRatios.length - 1,
            ),
          )
        ] ?? 0
      const endRatio =
        geometryLine.caretXRatios[
          Math.max(
            0,
            Math.min(lineOffset.endOffset, geometryLine.caretXRatios.length - 1),
          )
        ] ?? startRatio
      const leftRatio = Math.min(startRatio, endRatio)
      const width = Math.abs(endRatio - startRatio) * hostRect.width

      if (width <= 0) {
        return []
      }

      return [
        {
          height: lineFrame.height,
          left: leftRatio * hostRect.width,
          top: lineFrame.top - hostRect.top,
          width,
        } satisfies InlineTextSelectionFrame,
      ]
    }

    const lineSpan = getLineSpan(host, lineOffset.lineIndex)

    if (!lineSpan) {
      return []
    }

    const lineRect = lineSpan.getBoundingClientRect()
    const textNode = lineSpan.firstChild
    const startBoundary = getTextRangeBoundary(
      textNode,
      lineOffset.startOffset,
      lineRect,
    )
    const endBoundary = getTextRangeBoundary(
      textNode,
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

function getTextareaSelectionState(textarea: HTMLTextAreaElement) {
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const focus = textarea.selectionDirection === 'backward' ? start : end

  return { end, focus, start } satisfies InlineTextSelectionState
}

function getCollapsedSelectionState(
  caretIndex: number,
): InlineTextSelectionState {
  return {
    end: caretIndex,
    focus: caretIndex,
    start: caretIndex,
  }
}

function getGeometryCaretFrame({
  caretValue,
  geometryLines,
  host,
  lines,
  selectionFocus,
}: {
  caretValue: string
  geometryLines: InlinePreviewTextEditorGeometryLine[]
  host: Element
  lines: InlinePreviewTextEditorLine[]
  selectionFocus: number
}): InlineTextCaretFrame | null {
  const hostRect = host.getBoundingClientRect()
  const { lineIndex, offset } = getInlinePreviewTextCaretLineOffset({
    caretIndex: selectionFocus,
    caretValue,
    lines,
  })
  const geometryLine = geometryLines[lineIndex]

  if (!geometryLine) {
    return null
  }

  const frame = getGeometryLineFrame({ geometryLine, hostRect })
  const caretXRatio =
    geometryLine.caretXRatios[
      Math.max(0, Math.min(offset, geometryLine.caretXRatios.length - 1))
    ] ?? 0

  return {
    height: frame.height,
    left: caretXRatio * hostRect.width,
    top: frame.top - hostRect.top,
  }
}

export function InlinePreviewTextEditor({
  ariaLabel,
  caretValue,
  inputMode = 'overlay',
  geometryLines,
  lines,
  targetKey,
  value,
  textareaStyle,
  menuPlacement,
  onValueChange,
  onMoveHandlePointerDown,
  onMoveHandlePointerMove,
  onMoveHandlePointerUp,
  onDone,
}: InlinePreviewTextEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const tabsRef = useRef<HTMLDivElement | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const moveHandleRef = useRef<HTMLButtonElement | null>(null)
  const adapterSelectionAnchorRef = useRef(value.length)
  const adapterSelectionPointerIdRef = useRef<number | null>(null)
  const [caretFrame, setCaretFrame] = useState<InlineTextCaretFrame | null>(null)
  const [selection, setSelection] = useState<InlineTextSelectionState>(() =>
    getCollapsedSelectionState(value.length),
  )
  const [selectionFrames, setSelectionFrames] = useState<
    InlineTextSelectionFrame[]
  >([])
  const [controlFrame, setControlFrame] =
    useState<InlineTextControlFrame | null>(null)
  const [controlSizes, setControlSizes] =
    useState<InlinePreviewTextControlSizes>(
      INLINE_TEXT_DEFAULT_CONTROL_SIZES,
    )
  const [activeTab, setActiveTab] =
    useState<InlinePreviewTextEditorTab>('text')

  const updateSelectionStart = () => {
    const textarea = textareaRef.current

    if (!textarea) {
      return
    }

    setSelection(getTextareaSelectionState(textarea))
  }

  const handleInlineTextEditorKeyDown = (
    event: KeyboardEvent<HTMLTextAreaElement>,
  ) => {
    event.stopPropagation()

    if (!isInlinePreviewTextSelectAllShortcut(event)) {
      return
    }

    event.preventDefault()

    const textarea = event.currentTarget
    textarea.setSelectionRange(0, textarea.value.length, 'forward')
    setSelection({
      end: textarea.value.length,
      focus: textarea.value.length,
      start: 0,
    })
  }

  const handleInlineTextEditorPointerDown = (
    event: ReactPointerEvent<HTMLTextAreaElement>,
  ) => {
    const textarea = event.currentTarget
    const host = textarea.closest(`.${INLINE_PREVIEW_TEXT_HOST_CLASS}`)
    const nextSelectionStart = host
      ? getPointerSelectionStart({
          caretValue,
          clientX: event.clientX,
          clientY: event.clientY,
          geometryLines,
          host,
          lines,
        })
      : null

    event.stopPropagation()

    if (nextSelectionStart === null) {
      return
    }

    event.preventDefault()
    textarea.focus({ preventScroll: true })
    textarea.setSelectionRange(
      nextSelectionStart,
      nextSelectionStart,
      'forward',
    )
    setSelection(getCollapsedSelectionState(nextSelectionStart))
  }

  useEffect(() => {
    const textarea = textareaRef.current

    if (!textarea) {
      return
    }

    textarea.focus({ preventScroll: true })
    textarea.setSelectionRange(textarea.value.length, textarea.value.length)
    adapterSelectionAnchorRef.current = textarea.value.length
    adapterSelectionPointerIdRef.current = null
    setSelection(getCollapsedSelectionState(textarea.value.length))
  }, [targetKey])

  useLayoutEffect(() => {
    const textarea = textareaRef.current
    const host = getInlinePreviewTextHostForTarget({
      inputMode,
      targetKey,
      textarea,
    })

    if (!host) {
      setControlFrame(null)
      return
    }

    const updateControlFrame = () => {
      const rect = host.getBoundingClientRect()
      const previewRect =
        getInlineTextPreviewSurface(host)?.getBoundingClientRect() ?? rect

      setControlFrame({
        anchor: {
          bottom: rect.bottom,
          centerX: rect.left + rect.width / 2,
          centerY: rect.top + rect.height / 2,
          right: rect.right,
          top: rect.top,
        },
        previewRect: rectToInlineTextRect(previewRect),
      })
    }

    updateControlFrame()

    const resizeObserver =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(updateControlFrame)

    resizeObserver?.observe(host)
    const previewSurface = getInlineTextPreviewSurface(host)
    if (previewSurface && previewSurface !== host) {
      resizeObserver?.observe(previewSurface)
    }
    window.addEventListener('resize', updateControlFrame)
    window.addEventListener('scroll', updateControlFrame, true)

    return () => {
      resizeObserver?.disconnect()
      window.removeEventListener('resize', updateControlFrame)
      window.removeEventListener('scroll', updateControlFrame, true)
    }
  }, [inputMode, menuPlacement, targetKey, value])

  useLayoutEffect(() => {
    if (!controlFrame) return

    const updateControlSizes = () => {
      const nextControlSizes = {
        menu: getInlineTextControlSize(
          menuRef.current,
          INLINE_TEXT_DEFAULT_CONTROL_SIZES.menu,
        ),
        moveHandle: getInlineTextControlSize(
          moveHandleRef.current,
          INLINE_TEXT_DEFAULT_CONTROL_SIZES.moveHandle,
        ),
        tabs: getInlineTextControlSize(
          tabsRef.current,
          INLINE_TEXT_DEFAULT_CONTROL_SIZES.tabs,
        ),
      }

      setControlSizes((currentControlSizes) =>
        areInlineTextControlSizesEqual(
          currentControlSizes,
          nextControlSizes,
        )
          ? currentControlSizes
          : nextControlSizes,
      )
    }

    updateControlSizes()

    const resizeObserver =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(updateControlSizes)

    if (tabsRef.current) resizeObserver?.observe(tabsRef.current)
    if (menuRef.current) resizeObserver?.observe(menuRef.current)
    if (moveHandleRef.current) resizeObserver?.observe(moveHandleRef.current)
    window.addEventListener('resize', updateControlSizes)

    return () => {
      resizeObserver?.disconnect()
      window.removeEventListener('resize', updateControlSizes)
    }
  }, [activeTab, controlFrame, menuPlacement, targetKey, value])

  useLayoutEffect(() => {
    const textarea = textareaRef.current
    const host = getInlinePreviewTextHostForTarget({
      inputMode,
      targetKey,
      textarea,
    })

    if (!host) {
      setCaretFrame(null)
      setSelectionFrames([])
      return
    }

    const hostRect = host.getBoundingClientRect()

    if (geometryLines) {
      setCaretFrame(
        getGeometryCaretFrame({
          caretValue,
          geometryLines,
          host,
          lines,
          selectionFocus: selection.focus,
        }) ?? {
          height: hostRect.height,
          left: 0,
          top: 0,
        },
      )
      setSelectionFrames(
        inputMode === 'adapter'
          ? getTextSelectionFrames({
              caretValue,
              geometryLines,
              host,
              lines,
              selection,
            })
          : [],
      )
      return
    }

    const { lineIndex, offset } = getInlinePreviewTextCaretLineOffset({
      caretIndex: selection.focus,
      caretValue,
      lines,
    })
    const lineSpan = getLineSpan(host, lineIndex)

    if (!lineSpan) {
      setCaretFrame({
        height: hostRect.height,
        left: 0,
        top: 0,
      })
      setSelectionFrames([])
      return
    }

    const lineRect = lineSpan.getBoundingClientRect()
    const textNode = lineSpan.firstChild
    let caretLeft = offset <= 0 ? lineRect.left : lineRect.right

    if (
      textNode &&
      textNode.nodeType === Node.TEXT_NODE &&
      typeof document !== 'undefined' &&
      offset > 0
    ) {
      const range = document.createRange()
      const textLength = textNode.textContent?.length ?? 0
      const rangeOffset = Math.max(0, Math.min(offset, textLength))

      range.setStart(textNode, 0)
      range.setEnd(textNode, rangeOffset)

      const rangeRect = range.getBoundingClientRect()

      if (rangeRect.width > 0 || rangeRect.height > 0) {
        caretLeft = rangeRect.right
      }

      range.detach()
    }

    setCaretFrame({
      height: Math.max(1, lineRect.height),
      left: caretLeft - hostRect.left,
      top: lineRect.top - hostRect.top,
    })
    setSelectionFrames(
      inputMode === 'adapter'
        ? getTextSelectionFrames({
            caretValue,
            geometryLines,
            host,
            lines,
            selection,
          })
        : [],
    )
  }, [
    caretValue,
    geometryLines,
    inputMode,
    lines,
    selection,
    targetKey,
    value,
  ])

  useLayoutEffect(() => {
    if (inputMode !== 'adapter') {
      return
    }

    const textarea = textareaRef.current
    const host = getInlinePreviewTextHostForTarget({
      inputMode,
      targetKey,
      textarea,
    })

    if (!textarea || !host) {
      return
    }

    const setAdapterPointerSelection = (
      event: globalThis.PointerEvent,
      anchor: number,
    ) => {
      const nextSelectionFocus = getPointerSelectionStart({
        caretValue,
        clientX: event.clientX,
        clientY: event.clientY,
        geometryLines,
        host,
        lines,
      })

      if (nextSelectionFocus === null) {
        return
      }

      const start = Math.min(anchor, nextSelectionFocus)
      const end = Math.max(anchor, nextSelectionFocus)
      const direction = nextSelectionFocus < anchor ? 'backward' : 'forward'

      textarea.focus({ preventScroll: true })
      textarea.setSelectionRange(start, end, direction)
      setSelection({
        end,
        focus: nextSelectionFocus,
        start,
      })
    }

    const handleAdapterPointerDown = (event: globalThis.PointerEvent) => {
      if (event.button !== 0) {
        return
      }

      const nextSelectionFocus = getPointerSelectionStart({
        caretValue,
        clientX: event.clientX,
        clientY: event.clientY,
        geometryLines,
        host,
        lines,
      })

      if (nextSelectionFocus === null) {
        return
      }

      event.preventDefault()
      event.stopPropagation()
      adapterSelectionAnchorRef.current = nextSelectionFocus
      adapterSelectionPointerIdRef.current = event.pointerId

      if (host instanceof HTMLElement && host.setPointerCapture) {
        host.setPointerCapture(event.pointerId)
      }

      textarea.focus({ preventScroll: true })
      textarea.setSelectionRange(
        nextSelectionFocus,
        nextSelectionFocus,
        'forward',
      )
      setSelection(getCollapsedSelectionState(nextSelectionFocus))
    }

    const handleAdapterPointerMove = (event: globalThis.PointerEvent) => {
      if (adapterSelectionPointerIdRef.current !== event.pointerId) {
        return
      }

      event.preventDefault()
      event.stopPropagation()
      setAdapterPointerSelection(event, adapterSelectionAnchorRef.current)
    }

    const handleAdapterPointerUp = (event: globalThis.PointerEvent) => {
      if (adapterSelectionPointerIdRef.current !== event.pointerId) {
        return
      }

      event.preventDefault()
      event.stopPropagation()

      if (host instanceof HTMLElement && host.releasePointerCapture) {
        try {
          host.releasePointerCapture(event.pointerId)
        } catch {
          // Some browsers release capture before pointerup if the pointer leaves.
        }
      }

      adapterSelectionPointerIdRef.current = null
    }

    host.addEventListener('pointerdown', handleAdapterPointerDown)
    host.addEventListener('pointermove', handleAdapterPointerMove)
    host.addEventListener('pointerup', handleAdapterPointerUp)
    host.addEventListener('pointercancel', handleAdapterPointerUp)

    return () => {
      host.removeEventListener('pointerdown', handleAdapterPointerDown)
      host.removeEventListener('pointermove', handleAdapterPointerMove)
      host.removeEventListener('pointerup', handleAdapterPointerUp)
      host.removeEventListener('pointercancel', handleAdapterPointerUp)
    }
  }, [caretValue, geometryLines, inputMode, lines, targetKey])

  const controlLayout = controlFrame
    ? getInlinePreviewTextControlLayout({
        anchor: controlFrame.anchor,
        previewRect: controlFrame.previewRect,
        requestedMenuPlacement: menuPlacement,
        sizes: controlSizes,
      })
    : null
  const resolvedMenuPlacement = controlLayout?.menu.placement ?? menuPlacement
  const tabsStyle = controlLayout
    ? ({
        left: controlLayout.tabs.left,
        maxWidth: controlLayout.tabs.maxWidth,
        top: controlLayout.tabs.top,
        transform: 'none',
      } satisfies CSSProperties)
    : undefined
  const menuStyle = controlLayout
    ? ({
        left: controlLayout.menu.left,
        maxWidth: controlLayout.menu.maxWidth,
        top: controlLayout.menu.top,
        transform: 'none',
      } satisfies CSSProperties)
    : undefined
  const moveHandleStyle = controlLayout
    ? ({
        left: controlLayout.moveHandle.left,
        top: controlLayout.moveHandle.top,
        transform: 'none',
      } satisfies CSSProperties)
    : undefined
  const controls = controlFrame ? (
    <>
      <div
        ref={tabsRef}
        className="inline-preview-text-tabs"
        onClick={stopInlineTextEditorClick}
        onPointerDown={keepInlineTextEditorFocus}
        style={tabsStyle}
      >
        {INLINE_TEXT_EDITOR_TABS.map((tab) => (
          <button
            key={tab.id}
            className={[
              'inline-preview-text-tab',
              activeTab === tab.id ? 'is-active' : '',
            ].filter(Boolean).join(' ')}
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              setActiveTab(tab.id)
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <button
        ref={moveHandleRef}
        className="inline-preview-text-move-handle"
        type="button"
        onPointerDown={(event) => {
          event.preventDefault()
          onMoveHandlePointerDown(event)
        }}
        onPointerMove={onMoveHandlePointerMove}
        onPointerUp={onMoveHandlePointerUp}
        onClick={stopInlineTextEditorClick}
        style={moveHandleStyle}
      >
        Move
      </button>

      <div
        ref={menuRef}
        className={[
          'inline-preview-text-menu',
          `inline-preview-text-menu--${resolvedMenuPlacement}`,
        ].join(' ')}
        onClick={stopInlineTextEditorClick}
        onPointerDown={keepInlineTextEditorFocus}
        style={menuStyle}
      >
        <button
          type="button"
          className="secondary-button inline-preview-text-done-button"
          onClick={(event) => {
            event.stopPropagation()
            onDone()
          }}
          onPointerDown={keepInlineTextEditorFocus}
        >
          Done
        </button>
      </div>
    </>
  ) : null

  const hasVisibleSelection =
    inputMode === 'adapter' && selection.start !== selection.end
  const textareaElement = (
    <textarea
      ref={textareaRef}
      aria-label={ariaLabel}
      className={[
        'inline-preview-textarea',
        inputMode === 'adapter'
          ? 'inline-preview-textarea--adapter'
          : '',
      ].filter(Boolean).join(' ')}
      value={value}
      spellCheck={false}
      style={inputMode === 'overlay' ? textareaStyle : undefined}
      onChange={(event) => {
        onValueChange(event.target.value)
        setSelection(getTextareaSelectionState(event.target))
      }}
      onClick={(event) => {
        stopInlineTextEditorClick(event)
        updateSelectionStart()
      }}
      onKeyDown={handleInlineTextEditorKeyDown}
      onKeyUp={updateSelectionStart}
      onBlur={onDone}
      onPointerDown={
        inputMode === 'overlay'
          ? handleInlineTextEditorPointerDown
          : undefined
      }
      onPointerUp={updateSelectionStart}
      onSelect={updateSelectionStart}
    />
  )

  return (
    <>
      {inputMode === 'adapter' && typeof document !== 'undefined'
        ? createPortal(textareaElement, document.body)
        : textareaElement}
      {selectionFrames.map((frame, index) => (
        <span
          key={`${index}-${frame.left}-${frame.width}`}
          aria-hidden="true"
          className="inline-preview-text-selection"
          style={{
            height: frame.height,
            left: frame.left,
            top: frame.top,
            width: frame.width,
          }}
        />
      ))}
      {caretFrame && !hasVisibleSelection ? (
        <span
          aria-hidden="true"
          className="inline-preview-text-caret"
          style={{
            height: caretFrame.height,
            left: caretFrame.left,
            top: caretFrame.top,
          }}
        />
      ) : null}
      {controls ? createPortal(controls, document.body) : null}
    </>
  )
}
