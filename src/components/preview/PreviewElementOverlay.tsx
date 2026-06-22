import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from 'react'
import {
  findClosestPreviewEditableElement,
  findPreviewEditableElementsById,
  getPreviewElementOverlayUnionRect,
  type PreviewEditableElement,
  type PreviewElementOverlayRect,
} from '../../editor/previewElementOverlay'

export type PreviewElementOverlayProps = {
  previewRef: RefObject<HTMLElement | null>
}

type OverlayBoxState = {
  element: PreviewEditableElement
  rect: PreviewElementOverlayRect
}

function isSameEditableElement(
  left: PreviewEditableElement | null,
  right: PreviewEditableElement | null,
) {
  return left?.id === right?.id &&
    left?.label === right?.label &&
    left?.kind === right?.kind
}

function setEditableElementState(
  setter: (updater: (current: PreviewEditableElement | null) => PreviewEditableElement | null) => void,
  nextElement: PreviewEditableElement | null,
) {
  setter((current) =>
    isSameEditableElement(current, nextElement) ? current : nextElement)
}

function toOverlayBoxState(
  previewElement: HTMLElement,
  editableElement: PreviewEditableElement | null,
): OverlayBoxState | null {
  if (!editableElement) {
    return null
  }

  const elements = findPreviewEditableElementsById(
    previewElement,
    editableElement.id,
  )
  const rect = getPreviewElementOverlayUnionRect(
    previewElement.getBoundingClientRect(),
    elements.map((element) => element.getBoundingClientRect()),
    {
      width: previewElement.offsetWidth,
      height: previewElement.offsetHeight,
    },
  )

  return rect ? { element: editableElement, rect } : null
}

function usePreviewElementOverlayState(previewRef: RefObject<HTMLElement | null>) {
  const [hoveredElement, setHoveredElement] =
    useState<PreviewEditableElement | null>(null)
  const [selectedElement, setSelectedElement] =
    useState<PreviewEditableElement | null>(null)
  const [hoveredBox, setHoveredBox] = useState<OverlayBoxState | null>(null)
  const [selectedBox, setSelectedBox] = useState<OverlayBoxState | null>(null)
  const animationFrameRef = useRef<number | null>(null)

  const measureActiveElements = useCallback(() => {
    const previewElement = previewRef.current

    if (!previewElement) {
      setHoveredBox(null)
      setSelectedBox(null)
      return
    }

    setHoveredBox(toOverlayBoxState(previewElement, hoveredElement))
    setSelectedBox(toOverlayBoxState(previewElement, selectedElement))
  }, [hoveredElement, previewRef, selectedElement])

  const scheduleMeasure = useCallback(() => {
    if (typeof window === 'undefined') {
      return
    }

    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current)
    }

    animationFrameRef.current = window.requestAnimationFrame(() => {
      animationFrameRef.current = null
      measureActiveElements()
    })
  }, [measureActiveElements])

  useLayoutEffect(() => {
    scheduleMeasure()
  })

  useEffect(
    () => () => {
      if (
        typeof window !== 'undefined' &&
        animationFrameRef.current !== null
      ) {
        window.cancelAnimationFrame(animationFrameRef.current)
      }
    },
    [],
  )

  useEffect(() => {
    const previewElement = previewRef.current

    if (!previewElement) {
      return undefined
    }

    function handlePointerOver(event: PointerEvent | MouseEvent) {
      const match = findClosestPreviewEditableElement(event.target)

      setEditableElementState(setHoveredElement, match?.editableElement ?? null)
      scheduleMeasure()
    }

    function handlePointerOut(event: PointerEvent | MouseEvent) {
      const currentMatch = findClosestPreviewEditableElement(event.target)
      if (!currentMatch) {
        return
      }

      if (
        event.relatedTarget instanceof Node &&
        currentMatch.element.contains(event.relatedTarget)
      ) {
        return
      }

      setEditableElementState(setHoveredElement, null)
      scheduleMeasure()
    }

    function handlePointerDown(event: PointerEvent) {
      const match = findClosestPreviewEditableElement(event.target)

      setEditableElementState(setSelectedElement, match?.editableElement ?? null)
      scheduleMeasure()
    }

    function clearPointerInteraction() {
      setEditableElementState(setHoveredElement, null)
      setEditableElementState(setSelectedElement, null)
      setHoveredBox(null)
      setSelectedBox(null)
    }

    function handlePointerMove(event: PointerEvent | MouseEvent) {
      const match = findClosestPreviewEditableElement(event.target)

      setEditableElementState(setHoveredElement, match?.editableElement ?? null)
      scheduleMeasure()
    }

    function handleFocusIn(event: FocusEvent) {
      const match = findClosestPreviewEditableElement(event.target)

      if (match) {
        setEditableElementState(setHoveredElement, match.editableElement)
        scheduleMeasure()
      }
    }

    function handleFocusOut(event: FocusEvent) {
      const currentMatch = findClosestPreviewEditableElement(event.target)
      if (!currentMatch) {
        return
      }

      if (
        event.relatedTarget instanceof Node &&
        currentMatch.element.contains(event.relatedTarget)
      ) {
        return
      }

      setEditableElementState(setHoveredElement, null)
      scheduleMeasure()
    }

    previewElement.addEventListener('pointerover', handlePointerOver)
    previewElement.addEventListener('pointerout', handlePointerOut)
    previewElement.addEventListener('mouseover', handlePointerOver)
    previewElement.addEventListener('mouseout', handlePointerOut)
    previewElement.addEventListener('pointerdown', handlePointerDown, true)
    previewElement.addEventListener('pointermove', handlePointerMove, true)
    previewElement.addEventListener('mousemove', handlePointerMove, true)
    previewElement.addEventListener('pointerup', clearPointerInteraction, true)
    previewElement.addEventListener('pointercancel', clearPointerInteraction, true)
    window.addEventListener('pointerup', clearPointerInteraction, true)
    window.addEventListener('pointercancel', clearPointerInteraction, true)
    previewElement.addEventListener('focusin', handleFocusIn)
    previewElement.addEventListener('focusout', handleFocusOut)
    window.addEventListener('resize', scheduleMeasure)

    const resizeObserver = typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(scheduleMeasure)
    resizeObserver?.observe(previewElement)

    return () => {
      previewElement.removeEventListener('pointerover', handlePointerOver)
      previewElement.removeEventListener('pointerout', handlePointerOut)
      previewElement.removeEventListener('mouseover', handlePointerOver)
      previewElement.removeEventListener('mouseout', handlePointerOut)
      previewElement.removeEventListener('pointerdown', handlePointerDown, true)
      previewElement.removeEventListener('pointermove', handlePointerMove, true)
      previewElement.removeEventListener('mousemove', handlePointerMove, true)
      previewElement.removeEventListener('pointerup', clearPointerInteraction, true)
      previewElement.removeEventListener('pointercancel', clearPointerInteraction, true)
      window.removeEventListener('pointerup', clearPointerInteraction, true)
      window.removeEventListener('pointercancel', clearPointerInteraction, true)
      previewElement.removeEventListener('focusin', handleFocusIn)
      previewElement.removeEventListener('focusout', handleFocusOut)
      window.removeEventListener('resize', scheduleMeasure)
      resizeObserver?.disconnect()
    }
  }, [previewRef, scheduleMeasure])

  return { hoveredBox, selectedBox }
}

function OverlayBox({
  box,
  state,
}: {
  box: OverlayBoxState
  state: 'hovered' | 'selected'
}) {
  return (
    <div
      className={`preview-element-outline preview-element-outline--${state}`}
      data-preview-element-outline-id={box.element.id}
      data-preview-element-outline-kind={box.element.kind}
      style={{
        height: `${box.rect.height}px`,
        left: `${box.rect.left}px`,
        top: `${box.rect.top}px`,
        width: `${box.rect.width}px`,
      }}
    />
  )
}

export function PreviewElementOverlay({
  previewRef,
}: PreviewElementOverlayProps) {
  const { hoveredBox, selectedBox } = usePreviewElementOverlayState(previewRef)
  const shouldRenderHoveredBox =
    hoveredBox && hoveredBox.element.id !== selectedBox?.element.id

  if (!hoveredBox && !selectedBox) {
    return null
  }

  return (
    <div className="preview-element-overlay-layer" aria-hidden="true">
      {shouldRenderHoveredBox ? (
        <OverlayBox box={hoveredBox} state="hovered" />
      ) : null}
      {selectedBox ? <OverlayBox box={selectedBox} state="selected" /> : null}
    </div>
  )
}
