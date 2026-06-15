import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
} from 'react'
import { createPortal } from 'react-dom'
import {
  isInlinePreviewTextSelectAllShortcut,
} from './inlinePreviewTextEditorInput'
import {
  getInlinePreviewTextCaretIndexForLineOffset,
  getInlinePreviewTextCaretLineOffset,
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

export type InlinePreviewTextEditorTab =
  | 'presets'
  | 'text'
  | 'art'
  | 'utilities'

export type InlinePreviewTextEditorLine = {
  text: string
}

export type InlinePreviewTextEditorProps = {
  ariaLabel: string
  caretValue: string
  lines: InlinePreviewTextEditorLine[]
  targetKey: string
  value: string
  textareaStyle?: CSSProperties
  menuPlacement: InlinePreviewTextEditorMenuPlacement
  onValueChange: (value: string) => void
  onMoveHandlePointerDown: (event: PointerEvent<Element>) => void
  onMoveHandlePointerMove: (event: PointerEvent<Element>) => void
  onMoveHandlePointerUp: (event: PointerEvent<Element>) => void
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

function keepInlineTextEditorFocus(event: PointerEvent<Element>) {
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

function getNearestTextOffset(lineSpan: HTMLElement, clientX: number) {
  const lineRect = lineSpan.getBoundingClientRect()
  const textNode = lineSpan.firstChild
  const textLength =
    textNode && textNode.nodeType === Node.TEXT_NODE
      ? textNode.textContent?.length ?? 0
      : 0
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

function getPointerSelectionStart({
  caretValue,
  clientX,
  clientY,
  host,
  lines,
}: {
  caretValue: string
  clientX: number
  clientY: number
  host: Element
  lines: InlinePreviewTextEditorLine[]
}) {
  const nearestLine = getNearestLineSpan({ clientY, host, lines })

  if (!nearestLine) {
    return null
  }

  return getInlinePreviewTextCaretIndexForLineOffset({
    caretValue,
    lineIndex: nearestLine.lineIndex,
    lines,
    offset: getNearestTextOffset(nearestLine.lineSpan, clientX),
  })
}

export function InlinePreviewTextEditor({
  ariaLabel,
  caretValue,
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
  const [caretFrame, setCaretFrame] = useState<InlineTextCaretFrame | null>(null)
  const [selectionStart, setSelectionStart] = useState(value.length)
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

    setSelectionStart(textarea.selectionStart)
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
    setSelectionStart(0)
  }

  const handleInlineTextEditorPointerDown = (
    event: PointerEvent<HTMLTextAreaElement>,
  ) => {
    const textarea = event.currentTarget
    const host = textarea.closest(`.${INLINE_PREVIEW_TEXT_HOST_CLASS}`)
    const nextSelectionStart = host
      ? getPointerSelectionStart({
          caretValue,
          clientX: event.clientX,
          clientY: event.clientY,
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
    setSelectionStart(nextSelectionStart)
  }

  useEffect(() => {
    const textarea = textareaRef.current

    if (!textarea) {
      return
    }

    textarea.focus({ preventScroll: true })
    textarea.setSelectionRange(textarea.value.length, textarea.value.length)
    setSelectionStart(textarea.value.length)
  }, [targetKey])

  useLayoutEffect(() => {
    const textarea = textareaRef.current
    const host = textarea?.closest(`.${INLINE_PREVIEW_TEXT_HOST_CLASS}`)

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
  }, [menuPlacement, targetKey, value])

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
    const host = textarea?.closest(`.${INLINE_PREVIEW_TEXT_HOST_CLASS}`)

    if (!host) {
      setCaretFrame(null)
      return
    }

    const hostRect = host.getBoundingClientRect()
    const { lineIndex, offset } = getInlinePreviewTextCaretLineOffset({
      caretIndex: selectionStart,
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
  }, [caretValue, lines, selectionStart, targetKey, value])

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

  return (
    <>
      <textarea
        ref={textareaRef}
        aria-label={ariaLabel}
        className="inline-preview-textarea"
        value={value}
        spellCheck={false}
        style={textareaStyle}
        onChange={(event) => {
          onValueChange(event.target.value)
          setSelectionStart(event.target.selectionStart)
        }}
        onClick={(event) => {
          stopInlineTextEditorClick(event)
          updateSelectionStart()
        }}
        onKeyDown={handleInlineTextEditorKeyDown}
        onKeyUp={updateSelectionStart}
        onBlur={onDone}
        onPointerDown={handleInlineTextEditorPointerDown}
        onPointerUp={updateSelectionStart}
        onSelect={updateSelectionStart}
      />
      {caretFrame ? (
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
