import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type FocusEvent as ReactFocusEvent,
  type ChangeEvent,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent as ReactPointerEvent,
  type SyntheticEvent,
} from 'react'
import { createPortal } from 'react-dom'
import {
  isInlinePreviewTextSelectAllShortcut,
} from './inlinePreviewTextEditorInput'
import {
  isInlinePreviewTextEditorControlEvent,
  shouldKeepInlinePreviewTextEditorOpenOnBlur,
  type InlinePreviewTextEditorControlRoot,
} from './inlinePreviewTextEditorInteraction'
import {
  clampInlineTextSelectionState,
  getCollapsedSelectionState,
  getInlineTextSelectionRange,
  getInlineTextSelectionStateFromRange,
  getTextareaSelectionState,
  isInlineTextSelectionCollapsed,
  type InlineTextCaretFrame,
  type InlineTextSelectionFrame,
  type InlineTextSelectionState,
} from './inlinePreviewTextEditorSelection'
import {
  getInlinePreviewTextCaretLineOffset,
} from './inlinePreviewTextEditorCaret'
import {
  useContextualTextRibbonRegistration,
} from './contextualTextRibbonBridgeContext'
import {
  revealContextualTextRibbonScrollItem,
} from './contextualTextRibbonScrollReveal'
import {
  stopInlineTextEditorClick,
} from './inlinePreviewTextRibbonControls'
import {
  InlinePreviewTextEditorCanvasOverlays,
} from './inlinePreviewTextEditorCanvasOverlays'
import {
  InlinePreviewTextEditorMoveRing,
} from './inlinePreviewTextEditorMoveRing'
import {
  InlinePreviewTextEditorTextarea,
} from './inlinePreviewTextEditorTextarea'
import {
  InlinePreviewTextEditorRibbon,
} from './inlinePreviewTextEditorRibbon'
import {
  createInlinePreviewHtmlSourceDraft,
  getInlinePreviewHtmlSourceDraftFallback,
  getInlinePreviewHtmlSourceDraftIdentity,
  getInlinePreviewHtmlSourceDraftValue,
  resolveInlinePreviewHtmlSourceDraft,
} from './inlinePreviewTextEditorSource'
import {
  getRotatedLocalTextEdgePoint,
  isPointInTextEdgeGrabBand,
  isPrimaryMoveHandlePointer,
} from '../../interaction/textMoveHandleDrag'
import {
  getGeometryCaretFrame,
  getLineSpan,
  getPointerSelectionStart,
  getTextRangeBoundary,
  getTextSelectionFrames,
  INLINE_PREVIEW_TEXT_HOST_CLASS,
} from './inlinePreviewTextEditorTextGeometry'
import {
  INLINE_PREVIEW_TEXT_TARGET_ATTRIBUTE,
} from '../../editor/previewEditableRegistry'
import type {
  InlinePreviewTextEditorDoneCommit,
  InlinePreviewTextEditorInputMode,
  InlinePreviewTextEditorProps,
  InlinePreviewTextEditorSelectionRange,
  InlinePreviewTextEditorTab,
} from './inlinePreviewTextEditorContract'

export {
  INLINE_PREVIEW_TEXT_TARGET_ATTRIBUTE,
} from '../../editor/previewEditableRegistry'

export type {
  InlinePreviewTextEditorCheckboxControl,
  InlinePreviewTextEditorColorControl,
  InlinePreviewTextEditorControls,
  InlinePreviewTextEditorDoneCommit,
  InlinePreviewTextEditorGeometryAdapter,
  InlinePreviewTextEditorGeometryLine,
  InlinePreviewTextEditorInputMode,
  InlinePreviewTextEditorLine,
  InlinePreviewTextEditorOption,
  InlinePreviewTextEditorProps,
  InlinePreviewTextEditorRangeControl,
  InlinePreviewTextEditorSelectControl,
  InlinePreviewTextEditorSelectionRange,
  InlinePreviewTextEditorTextValueControl,
  InlinePreviewTextEditorTab,
  InlinePreviewTextEditorToggleState,
  InlinePreviewTextEditorToggleControl,
} from './inlinePreviewTextEditorContract'

export {
  INLINE_PREVIEW_TEXT_HOST_CLASS,
  INLINE_PREVIEW_TEXT_LINE_INDEX_ATTRIBUTE,
} from './inlinePreviewTextEditorTextGeometry'

const INLINE_TEXT_EDGE_GRAB_OUTER_BAND_PX = 8
const INLINE_TEXT_EDGE_GRAB_INWARD_TOLERANCE_PX = 2

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

function isPointerInInlineTextEdgeGrabBand({
  clientX,
  clientY,
  host,
  rotationDegrees = 0,
}: {
  clientX: number
  clientY: number
  host: HTMLElement
  rotationDegrees?: number
}) {
  const rect = host.getBoundingClientRect()
  const width = host.offsetWidth || rect.width
  const height = host.offsetHeight || rect.height
  const point = getRotatedLocalTextEdgePoint({
    clientX,
    clientY,
    height,
    rect,
    rotationDegrees,
    width,
  })

  return isPointInTextEdgeGrabBand({
    height,
    inwardTolerancePx: INLINE_TEXT_EDGE_GRAB_INWARD_TOLERANCE_PX,
    outerBandPx: INLINE_TEXT_EDGE_GRAB_OUTER_BAND_PX,
    point,
    width,
  })
}

export function InlinePreviewTextEditor({
  ariaLabel,
  caretValue,
  controls: editorControls,
  inputMode = 'overlay',
  geometryAdapter,
  geometryLines,
  lines,
  rotationDegrees,
  targetKey,
  value,
  sourceValue,
  textareaStyle,
  sourceMode = false,
  suppressCanvasInput = false,
  onValueChange,
  onMoveHandlePointerDown,
  onMoveHandlePointerMove,
  onMoveHandlePointerUp,
  onRichTextKeyboardCommand,
  onDone,
}: InlinePreviewTextEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const tabsRef = useRef<HTMLDivElement | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const moveHandleRef = useRef<HTMLButtonElement | null>(null)
  const moveEdgeRef = useRef<HTMLDivElement | null>(null)
  const activeMoveHandlePointerIdRef = useRef<number | null>(null)
  const activeMoveEdgePointerIdRef = useRef<number | null>(null)
  const controlPointerStartedAtRef = useRef<number | null>(null)
  const controlPointerStartedInsideRef = useRef(false)
  const ribbonPointerInteractionRef = useRef(false)
  const adapterSelectionAnchorRef = useRef(value.length)
  const adapterSelectionPointerIdRef = useRef<number | null>(null)
  const adapterSelectionCaptureElementRef = useRef<Element | null>(null)
  const pendingSelectionRef =
    useRef<InlinePreviewTextEditorSelectionRange | null>(null)
  const retainedCommandSelectionRef =
    useRef<InlinePreviewTextEditorSelectionRange | null>(null)
  const [caretFrame, setCaretFrame] = useState<InlineTextCaretFrame | null>(null)
  const [selection, setSelection] = useState<InlineTextSelectionState>(() =>
    getCollapsedSelectionState(value.length),
  )
  const boundedSelection = useMemo(
    () => clampInlineTextSelectionState(selection, value.length),
    [selection, value.length],
  )
  const [selectionFrames, setSelectionFrames] = useState<
    InlineTextSelectionFrame[]
  >([])
  const [activeTab, setActiveTab] =
    useState<InlinePreviewTextEditorTab>('text')
  const [isMoveHandleDragging, setIsMoveHandleDragging] = useState(false)
  const sourceDraftIdentity =
    getInlinePreviewHtmlSourceDraftIdentity(targetKey)
  const sourceDraftFallbackValue = getInlinePreviewHtmlSourceDraftFallback({
    sourceValue,
    value,
  })
  const [sourceDraft, setSourceDraft] = useState(() =>
    createInlinePreviewHtmlSourceDraft({
      fallbackValue: sourceDraftFallbackValue,
      initialized: sourceMode,
      identity: sourceDraftIdentity,
    }))
  const activeSourceDraft = resolveInlinePreviewHtmlSourceDraft({
    draft: sourceDraft,
    fallbackValue: sourceDraftFallbackValue,
    initialized: sourceMode,
    identity: sourceDraftIdentity,
  })
  const sourceDraftValue = getInlinePreviewHtmlSourceDraftValue({
    draft: activeSourceDraft,
    fallbackValue: sourceDraftFallbackValue,
  })
  const htmlSourceControl = editorControls?.html?.source
  const isCurvedTextSource =
    Boolean(
      editorControls?.utilities?.arcDegrees &&
      editorControls.utilities.lineSpacing &&
      !editorControls.text?.bulletedList,
    )

  const updateSourceDraft = useCallback((nextDraft: string) => {
    setSourceDraft({
      identity: sourceDraftIdentity,
      initialized: true,
      value: nextDraft,
    })
    onValueChange(nextDraft, { sourceMode: true })
  }, [onValueChange, sourceDraftIdentity])

  const commitSourceDraft = useCallback((): InlinePreviewTextEditorDoneCommit | undefined => {
    const sourceTextarea =
      menuRef.current?.querySelector<HTMLTextAreaElement>(
        '.inline-preview-text-source-textarea',
      )

    if (sourceMode || (activeTab === 'html' && sourceTextarea)) {
      const committedValue = sourceTextarea?.value ?? sourceDraftValue
      const commit = {
        sourceMode: true,
        value: committedValue,
      }

      onValueChange(committedValue, {
        sourceMode: true,
      })
      return commit
    }

    return undefined
  }, [activeTab, onValueChange, sourceDraftValue, sourceMode])

  const changeActiveTab = useCallback((nextTab: InlinePreviewTextEditorTab) => {
    if (nextTab === activeTab) return

    if (nextTab === 'html') {
      setSourceDraft({
        identity: sourceDraftIdentity,
        initialized: false,
        value: '',
      })
      if (!sourceMode) {
        htmlSourceControl?.onChange(true)
      }
      setActiveTab(nextTab)
      return
    }

    if (activeTab === 'html') {
      commitSourceDraft()
      htmlSourceControl?.onChange(false)
    }
    setActiveTab(nextTab)
  }, [
    activeTab,
    commitSourceDraft,
    htmlSourceControl,
    sourceDraftIdentity,
    sourceMode,
  ])

  const setRibbonMenuRef = useCallback((element: HTMLDivElement | null) => {
    menuRef.current = element
  }, [])

  const handleRibbonControlInteraction = useCallback(
    (event: SyntheticEvent<Element>) => {
      if (ribbonPointerInteractionRef.current) {
        return
      }
      revealContextualTextRibbonScrollItem(event.target)
    },
    [],
  )

  const handleRibbonKeyboardInteraction = useCallback(() => {
    ribbonPointerInteractionRef.current = false
  }, [])

  const handleRibbonPointerDown = useCallback(() => {
    ribbonPointerInteractionRef.current = true
  }, [])

  const getInlineControlRoots = useCallback(() => {
    const elements: HTMLElement[] = []

    if (tabsRef.current) elements.push(tabsRef.current)
    if (menuRef.current) elements.push(menuRef.current)
    if (moveHandleRef.current) elements.push(moveHandleRef.current)
    if (moveEdgeRef.current) elements.push(moveEdgeRef.current)

    return elements.map((element) => ({
      contains: (target: unknown) =>
        target instanceof Node && element.contains(target),
    } satisfies InlinePreviewTextEditorControlRoot))
  }, [])

  const retainCommandSelection = useCallback((
    nextSelection: InlinePreviewTextEditorSelectionRange,
  ) => {
    if (!isInlineTextSelectionCollapsed(nextSelection)) {
      retainedCommandSelectionRef.current = nextSelection
    }
  }, [])

  const clearRetainedCommandSelection = useCallback(() => {
    retainedCommandSelectionRef.current = null
  }, [])

  const getCommandSelection = useCallback(() => {
    const textarea = textareaRef.current

    if (textarea) {
      const textareaSelection = getTextareaSelectionState(textarea)
      const textareaSelectionRange =
        getInlineTextSelectionRange(textareaSelection)

      if (!isInlineTextSelectionCollapsed(textareaSelectionRange)) {
        return textareaSelectionRange
      }
    }

    const currentSelection = getInlineTextSelectionRange(boundedSelection)

    if (!isInlineTextSelectionCollapsed(currentSelection)) {
      return currentSelection
    }

    return retainedCommandSelectionRef.current ?? currentSelection
  }, [boundedSelection])

  const retainTextareaSelectionForCommands = useCallback(() => {
    const textarea = textareaRef.current

    if (!textarea) {
      return
    }

    const textareaSelection = getTextareaSelectionState(textarea)

    if (textareaSelection.start !== textareaSelection.end) {
      retainCommandSelection(textareaSelection)
    }
  }, [retainCommandSelection])

  const updateSelectionStart = () => {
    const textarea = textareaRef.current

    if (!textarea) {
      return
    }

    const nextSelection = getTextareaSelectionState(textarea)
    if (nextSelection.start === nextSelection.end) {
      clearRetainedCommandSelection()
    } else {
      retainCommandSelection(nextSelection)
    }
    setSelection(nextSelection)
  }

  const applyInlineTextSelectionRange = useCallback(
    (nextSelection: InlinePreviewTextEditorSelectionRange) => {
      pendingSelectionRef.current = nextSelection

      const textarea = textareaRef.current
      const valueLength = textarea?.value.length ?? value.length
      const nextSelectionState = getInlineTextSelectionStateFromRange(
        nextSelection,
        valueLength,
      )

      if (textarea) {
        textarea.focus({ preventScroll: true })
        textarea.setSelectionRange(
          nextSelectionState.start,
          nextSelectionState.end,
          'forward',
        )
      }

      adapterSelectionAnchorRef.current = nextSelectionState.focus
      retainCommandSelection(nextSelectionState)
      setSelection(nextSelectionState)
    },
    [retainCommandSelection, value.length],
  )

  const handleInlineTextEditorKeyDown = (
    event: KeyboardEvent<HTMLTextAreaElement>,
  ) => {
    event.stopPropagation()

    if (!sourceMode && onRichTextKeyboardCommand) {
      const command =
        event.key === 'Enter'
          ? event.shiftKey ? 'shiftEnter' : 'enter'
          : event.key === 'Backspace'
            ? 'backspace'
            : null

      if (command) {
        const nextSelection = onRichTextKeyboardCommand(
          command,
          getInlineTextSelectionRange(boundedSelection),
        )

        if (nextSelection) {
          event.preventDefault()
          applyInlineTextSelectionRange(nextSelection)
          return
        }
      }
    }

    if (!isInlinePreviewTextSelectAllShortcut(event)) {
      return
    }

    event.preventDefault()

    const textarea = event.currentTarget
    textarea.setSelectionRange(0, textarea.value.length, 'forward')
    retainCommandSelection({
      end: textarea.value.length,
      start: 0,
    })
    setSelection({
      end: textarea.value.length,
      focus: textarea.value.length,
      start: 0,
    })
  }

  const handleInlineTextEditorChange = (
    event: ChangeEvent<HTMLTextAreaElement>,
  ) => {
    if (sourceMode) {
      return
    }

    onValueChange(event.target.value, { sourceMode: false })
    setSelection(getTextareaSelectionState(event.target))
  }

  const handleInlineTextEditorClick = (
    event: MouseEvent<HTMLTextAreaElement>,
  ) => {
    stopInlineTextEditorClick(event)
    updateSelectionStart()
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
          rotationDegrees,
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
    clearRetainedCommandSelection()
    setSelection(getCollapsedSelectionState(nextSelectionStart))
  }

  const handleInlineTextEditorBlur = (
    event: ReactFocusEvent<HTMLTextAreaElement>,
  ) => {
    if (activeMoveHandlePointerIdRef.current !== null) {
      return
    }
    if (
      controlPointerStartedAtRef.current !== null &&
      Date.now() - controlPointerStartedAtRef.current < 500
    ) {
      return
    }

    if (
      shouldKeepInlinePreviewTextEditorOpenOnBlur({
        pointerStartedInsideControls: controlPointerStartedInsideRef.current,
        relatedTarget: event.relatedTarget,
        roots: getInlineControlRoots(),
      })
    ) {
      return
    }

    onDone()
  }

  useEffect(() => {
    if (typeof document === 'undefined') {
      return undefined
    }

    const handleDocumentPointerDown = (event: globalThis.PointerEvent) => {
      controlPointerStartedInsideRef.current =
        isInlinePreviewTextEditorControlEvent({
          composedPath: event.composedPath?.(),
          roots: getInlineControlRoots(),
          target: event.target,
        })
      if (controlPointerStartedInsideRef.current) {
        controlPointerStartedAtRef.current = Date.now()
      }
    }
    const handleDocumentPointerEnd = () => {
      controlPointerStartedInsideRef.current = false
    }

    document.addEventListener('pointerdown', handleDocumentPointerDown, true)
    document.addEventListener('pointerup', handleDocumentPointerEnd, true)
    document.addEventListener('pointercancel', handleDocumentPointerEnd, true)

    return () => {
      document.removeEventListener(
        'pointerdown',
        handleDocumentPointerDown,
        true,
      )
      document.removeEventListener('pointerup', handleDocumentPointerEnd, true)
      document.removeEventListener(
        'pointercancel',
        handleDocumentPointerEnd,
        true,
      )
    }
  }, [getInlineControlRoots])

  useEffect(() => {
    if (typeof document === 'undefined') {
      return undefined
    }

    const handleDocumentMovePointerMove = (
      event: globalThis.PointerEvent,
    ) => {
      if (activeMoveHandlePointerIdRef.current !== event.pointerId) {
        return
      }
      event.preventDefault()
      event.stopPropagation()
      onMoveHandlePointerMove(event as never)
    }
    const handleDocumentMovePointerEnd = (
      event: globalThis.PointerEvent,
    ) => {
      if (activeMoveHandlePointerIdRef.current !== event.pointerId) {
        return
      }

      activeMoveHandlePointerIdRef.current = null
      activeMoveEdgePointerIdRef.current = null
      setIsMoveHandleDragging(false)
      onMoveHandlePointerUp(event as never)
    }

    document.addEventListener(
      'pointermove',
      handleDocumentMovePointerMove,
      true,
    )
    document.addEventListener('pointerup', handleDocumentMovePointerEnd, true)
    document.addEventListener(
      'pointercancel',
      handleDocumentMovePointerEnd,
      true,
    )

    return () => {
      document.removeEventListener(
        'pointermove',
        handleDocumentMovePointerMove,
        true,
      )
      document.removeEventListener(
        'pointerup',
        handleDocumentMovePointerEnd,
        true,
      )
      document.removeEventListener(
        'pointercancel',
        handleDocumentMovePointerEnd,
        true,
      )
    }
  }, [onMoveHandlePointerMove, onMoveHandlePointerUp])

  useEffect(() => {
    const textarea = textareaRef.current

    if (!textarea || sourceMode) {
      return
    }

    textarea.focus({ preventScroll: true })
    textarea.setSelectionRange(textarea.value.length, textarea.value.length)
    adapterSelectionAnchorRef.current = textarea.value.length
    adapterSelectionPointerIdRef.current = null
    clearRetainedCommandSelection()
    setSelection(getCollapsedSelectionState(textarea.value.length))
  }, [clearRetainedCommandSelection, sourceMode, targetKey])

  useLayoutEffect(() => {
    const pendingSelection = pendingSelectionRef.current

    if (!pendingSelection || sourceMode) {
      return
    }

    const textarea = textareaRef.current
    const valueLength = textarea?.value.length ?? value.length
    const nextSelectionState = getInlineTextSelectionStateFromRange(
      pendingSelection,
      valueLength,
    )

    pendingSelectionRef.current = null

    if (textarea) {
      textarea.focus({ preventScroll: true })
      textarea.setSelectionRange(
        nextSelectionState.start,
        nextSelectionState.end,
        'forward',
      )
    }

    adapterSelectionAnchorRef.current = nextSelectionState.focus
    retainCommandSelection(nextSelectionState)
    setSelection(nextSelectionState)
  }, [retainCommandSelection, sourceMode, targetKey, value])

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

    if (geometryAdapter || geometryLines) {
      setCaretFrame(
        getGeometryCaretFrame({
          caretValue,
          geometryAdapter,
          geometryLines,
          host,
          lines,
          selectionFocus: boundedSelection.focus,
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
              geometryAdapter,
              geometryLines,
              host,
              lines,
              selection: boundedSelection,
            })
          : [],
      )
      return
    }

    const { lineIndex, offset } = getInlinePreviewTextCaretLineOffset({
      caretIndex: boundedSelection.focus,
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
    let caretLeft = offset <= 0 ? lineRect.left : lineRect.right

    if (offset > 0) {
      caretLeft = getTextRangeBoundary(lineSpan, offset, lineRect)
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
            geometryAdapter,
            geometryLines,
            host,
            lines,
            selection: boundedSelection,
          })
        : [],
    )
  }, [
    caretValue,
    geometryAdapter,
    geometryLines,
    inputMode,
    lines,
    rotationDegrees,
    boundedSelection,
    sourceMode,
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
        geometryAdapter,
        geometryLines,
        host,
        lines,
        rotationDegrees,
      })

      if (nextSelectionFocus === null) {
        return
      }

      const start = Math.min(anchor, nextSelectionFocus)
      const end = Math.max(anchor, nextSelectionFocus)
      const direction = nextSelectionFocus < anchor ? 'backward' : 'forward'

      textarea.focus({ preventScroll: true })
      textarea.setSelectionRange(start, end, direction)
      retainCommandSelection({ end, start })
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
        geometryAdapter,
        geometryLines,
        host,
        lines,
        rotationDegrees,
      })

      if (nextSelectionFocus === null) {
        return
      }

      event.preventDefault()
      event.stopPropagation()
      adapterSelectionAnchorRef.current = nextSelectionFocus
      adapterSelectionPointerIdRef.current = event.pointerId

      const captureElement = event.currentTarget instanceof Element
        ? event.currentTarget
        : host
      adapterSelectionCaptureElementRef.current = captureElement

      if (captureElement.setPointerCapture) {
        captureElement.setPointerCapture(event.pointerId)
      }

      textarea.focus({ preventScroll: true })
      textarea.setSelectionRange(
        nextSelectionFocus,
        nextSelectionFocus,
        'forward',
      )
      clearRetainedCommandSelection()
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

      const captureElement = adapterSelectionCaptureElementRef.current
      if (captureElement?.releasePointerCapture) {
        try {
          captureElement.releasePointerCapture(event.pointerId)
        } catch {
          // Some browsers release capture before pointerup if the pointer leaves.
        }
      }

      adapterSelectionPointerIdRef.current = null
      adapterSelectionCaptureElementRef.current = null
    }

    const interactionElements = Array.from(new Set([
      host,
      ...(geometryAdapter?.getInteractionElements?.() ?? []),
    ]))
    const adapterPointerDownListener = handleAdapterPointerDown as EventListener
    const adapterPointerMoveListener = handleAdapterPointerMove as EventListener
    const adapterPointerUpListener = handleAdapterPointerUp as EventListener

    for (const element of interactionElements) {
      element.addEventListener('pointerdown', adapterPointerDownListener)
      element.addEventListener('pointermove', adapterPointerMoveListener)
      element.addEventListener('pointerup', adapterPointerUpListener)
      element.addEventListener('pointercancel', adapterPointerUpListener)
    }
    document.addEventListener('pointermove', adapterPointerMoveListener)
    document.addEventListener('pointerup', adapterPointerUpListener)
    document.addEventListener('pointercancel', adapterPointerUpListener)

    return () => {
      for (const element of interactionElements) {
        element.removeEventListener('pointerdown', adapterPointerDownListener)
        element.removeEventListener('pointermove', adapterPointerMoveListener)
        element.removeEventListener('pointerup', adapterPointerUpListener)
        element.removeEventListener('pointercancel', adapterPointerUpListener)
      }
      document.removeEventListener('pointermove', adapterPointerMoveListener)
      document.removeEventListener('pointerup', adapterPointerUpListener)
      document.removeEventListener('pointercancel', adapterPointerUpListener)
    }
  }, [
    caretValue,
    clearRetainedCommandSelection,
    geometryAdapter,
    geometryLines,
    inputMode,
    lines,
    retainCommandSelection,
    rotationDegrees,
    sourceMode,
    targetKey,
  ])

  const handleMoveEdgePointerRelease = (
    event: ReactPointerEvent<HTMLSpanElement>,
  ) => {
    event.stopPropagation()

    if (activeMoveHandlePointerIdRef.current === event.pointerId) {
      activeMoveHandlePointerIdRef.current = null
      activeMoveEdgePointerIdRef.current = null
      setIsMoveHandleDragging(false)
      onMoveHandlePointerUp(event)
    }
  }
  useEffect(() => {
    const edgeRing = moveEdgeRef.current

    if (!edgeRing) {
      return undefined
    }

    const getHost = () =>
      edgeRing.closest<HTMLElement>(`.${INLINE_PREVIEW_TEXT_HOST_CLASS}`)
    const updateEdgeGrabCursor = (event: globalThis.PointerEvent) => {
      const target = event.target
      const host = getHost()
      const isEdgeHit =
        target instanceof Element &&
        Boolean(target.closest('.inline-preview-text-edge-move-hit')) &&
        host !== null &&
        isPointerInInlineTextEdgeGrabBand({
          clientX: event.clientX,
          clientY: event.clientY,
          host,
          rotationDegrees,
        })

      edgeRing.toggleAttribute('data-edge-grab-active', isEdgeHit)
    }
    const clearEdgeGrabCursor = () => {
      edgeRing.removeAttribute('data-edge-grab-active')
    }
    const handleEdgeRingPointerDown = (
      event: globalThis.PointerEvent,
    ) => {
      const target = event.target
      const isMoveHandle = target instanceof Element &&
        Boolean(target.closest('.inline-preview-text-move-handle'))
      const isEdgeHit = target instanceof Element &&
        Boolean(target.closest('.inline-preview-text-edge-move-hit'))
      const host = getHost()

      if (
        (!isMoveHandle && !isEdgeHit) ||
        !isPrimaryMoveHandlePointer(event)
      ) {
        return
      }
      if (
        isEdgeHit &&
        (!host || !isPointerInInlineTextEdgeGrabBand({
          clientX: event.clientX,
          clientY: event.clientY,
          host,
          rotationDegrees,
        }))
      ) {
        return
      }

      event.preventDefault()
      event.stopPropagation()
      controlPointerStartedInsideRef.current = true
      controlPointerStartedAtRef.current = Date.now()
      activeMoveHandlePointerIdRef.current = event.pointerId
      activeMoveEdgePointerIdRef.current = isEdgeHit ? event.pointerId : null
      setIsMoveHandleDragging(true)
      onMoveHandlePointerDown(event as never)
    }

    edgeRing.addEventListener('pointermove', updateEdgeGrabCursor)
    edgeRing.addEventListener('pointerleave', clearEdgeGrabCursor)
    edgeRing.addEventListener('pointerdown', handleEdgeRingPointerDown)

    return () => {
      edgeRing.removeEventListener('pointermove', updateEdgeGrabCursor)
      edgeRing.removeEventListener('pointerleave', clearEdgeGrabCursor)
      edgeRing.removeEventListener('pointerdown', handleEdgeRingPointerDown)
    }
  }, [onMoveHandlePointerDown, rotationDegrees])
  const ribbonControls = useMemo(() => (
    <InlinePreviewTextEditorRibbon
      activeTab={activeTab}
      controls={editorControls}
      getCommandSelection={getCommandSelection}
      isCurvedText={isCurvedTextSource}
      selection={getInlineTextSelectionRange(boundedSelection)}
      sourceDraft={sourceDraftValue}
      tabsRef={tabsRef}
      onDone={() => {
        const commit = commitSourceDraft()
        onDone(commit)
      }}
      onRibbonControlInteraction={handleRibbonControlInteraction}
      onRibbonKeyboardInteraction={handleRibbonKeyboardInteraction}
      onRibbonMenuRef={setRibbonMenuRef}
      onRibbonPointerDown={handleRibbonPointerDown}
      onRetainTextareaSelectionForCommands={
        retainTextareaSelectionForCommands
      }
      onSelectionChange={applyInlineTextSelectionRange}
      onSourceDraftChange={updateSourceDraft}
      onTabChange={changeActiveTab}
    />
  ), [
    activeTab,
    applyInlineTextSelectionRange,
    changeActiveTab,
    commitSourceDraft,
    editorControls,
    getCommandSelection,
    handleRibbonControlInteraction,
    handleRibbonKeyboardInteraction,
    handleRibbonPointerDown,
    isCurvedTextSource,
    onDone,
    retainTextareaSelectionForCommands,
    boundedSelection,
    setRibbonMenuRef,
    sourceDraftValue,
    updateSourceDraft,
  ])

  useContextualTextRibbonRegistration({
    content: ribbonControls,
    targetKey,
  })

  const hasVisibleSelection =
    inputMode === 'adapter' && boundedSelection.start !== boundedSelection.end
  const shouldRenderCanvasInput =
    !suppressCanvasInput && (inputMode === 'adapter' || !sourceMode)
  const textareaElement = (
    <InlinePreviewTextEditorTextarea
      textareaRef={textareaRef}
      ariaLabel={ariaLabel}
      inputMode={inputMode}
      readOnly={sourceMode}
      value={value}
      textareaStyle={textareaStyle}
      onChange={handleInlineTextEditorChange}
      onClick={handleInlineTextEditorClick}
      onKeyDown={handleInlineTextEditorKeyDown}
      onKeyUp={updateSelectionStart}
      onBlur={handleInlineTextEditorBlur}
      onPointerDown={
        inputMode === 'overlay' && !sourceMode
          ? handleInlineTextEditorPointerDown
          : undefined
      }
      onPointerUp={updateSelectionStart}
      onSelect={updateSelectionStart}
    />
  )

  return (
    <>
      {shouldRenderCanvasInput ? (
        inputMode === 'adapter' && typeof document !== 'undefined'
          ? createPortal(textareaElement, document.body)
          : textareaElement
      ) : null}
      <InlinePreviewTextEditorMoveRing
        isDragging={isMoveHandleDragging}
        moveEdgeRef={moveEdgeRef}
        moveHandleRef={moveHandleRef}
        onMoveEdgePointerRelease={handleMoveEdgePointerRelease}
      />
      <InlinePreviewTextEditorCanvasOverlays
        caretFrame={caretFrame}
        hasVisibleSelection={hasVisibleSelection}
        selectionFrames={selectionFrames}
        shouldRenderCanvasInput={shouldRenderCanvasInput}
      />
    </>
  )
}
