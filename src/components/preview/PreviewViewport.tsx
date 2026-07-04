import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
  type ReactNode,
  type WheelEvent,
} from 'react'
import {
  PREVIEW_VIEWPORT_BUTTON_ZOOM_FACTOR,
  PREVIEW_VIEWPORT_DEFAULT_RAIL_BUTTON_SIZE,
  PREVIEW_VIEWPORT_DEFAULT_STATE,
  choosePreviewViewportRailButtonSize,
  clampPreviewViewportPointToSize,
  clampPreviewViewportState,
  getPreviewViewportRailWidth,
  getPreviewViewportZoomPercent,
  panPreviewViewportBy,
  resetPreviewViewportToFit,
  zoomPreviewViewportAroundPoint,
  type PreviewViewportBounds,
  type PreviewViewportPoint,
  type PreviewViewportState,
} from './previewViewportModel'

type ActivePreviewPan = {
  pointerId: number
  startClientX: number
  startClientY: number
  startPanX: number
  startPanY: number
}

const PREVIEW_VIEWPORT_BUTTON_PAN_STEP = 48
const PREVIEW_VIEWPORT_SURFACE_GAP_FALLBACK = 4

export type PreviewViewportProps = {
  children: ReactNode
  label: string
}

function MagnifierIcon({ kind }: { kind: 'in' | 'out' }) {
  return (
    <svg
      aria-hidden="true"
      className="preview-viewport-svg-icon preview-viewport-magnifier-icon"
      viewBox="0 0 24 24"
    >
      <circle cx="10.5" cy="10.5" r="6.25" />
      <path d="M15.2 15.2 20 20" />
      <path d="M7.5 10.5h6" />
      {kind === 'in' ? <path d="M10.5 7.5v6" /> : null}
    </svg>
  )
}

function ArrowIcon({
  direction,
}: {
  direction: 'down' | 'left' | 'right' | 'up'
}) {
  const pathByDirection = {
    up: 'M12 5 6 11h4v8h4v-8h4z',
    right: 'M19 12 13 6v4H5v4h8v4z',
    down: 'M12 19 18 13h-4V5h-4v8H6z',
    left: 'M5 12 11 6v4h8v4h-8v4z',
  }

  return (
    <svg
      aria-hidden="true"
      className="preview-viewport-svg-icon preview-viewport-arrow-icon"
      viewBox="0 0 24 24"
    >
      <path d={pathByDirection[direction]} />
    </svg>
  )
}

function isFormEditingTarget(target: EventTarget | null) {
  return target instanceof Element &&
    Boolean(target.closest('input, textarea, select, [contenteditable="true"]'))
}

function isPreviewViewportControlTarget(target: EventTarget | null) {
  return target instanceof Element &&
    Boolean(target.closest('[data-preview-viewport-controls="true"]'))
}

function readCssPixelVariable(
  element: HTMLElement,
  name: string,
  fallback: number,
) {
  const value = Number.parseFloat(
    window.getComputedStyle(element).getPropertyValue(name),
  )

  return Number.isFinite(value) ? value : fallback
}

function getPointInStageSlot(
  event: Pick<PointerEvent<HTMLElement> | WheelEvent<HTMLElement>, 'clientX' | 'clientY'>,
  viewportElement: HTMLElement,
  stageElement: HTMLElement,
): PreviewViewportPoint {
  const rect = viewportElement.getBoundingClientRect()

  return clampPreviewViewportPointToSize(
    {
      x: event.clientX - rect.left - stageElement.offsetLeft,
      y: event.clientY - rect.top - stageElement.offsetTop,
    },
    {
      width: stageElement.offsetWidth,
      height: stageElement.offsetHeight,
    },
  )
}

export function PreviewViewport({
  children,
  label,
}: PreviewViewportProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const stageRef = useRef<HTMLDivElement | null>(null)
  const activePanRef = useRef<ActivePreviewPan | null>(null)
  const previewInteractionPointerIdRef = useRef<number | null>(null)
  const railInteractionPointerIdRef = useRef<number | null>(null)
  const railSizeRecomputeTimeoutRef = useRef<number | null>(null)
  const railSizingFrozenRef = useRef(false)
  const spacePanArmedRef = useRef(false)
  const [viewportState, setViewportState] =
    useState<PreviewViewportState>(PREVIEW_VIEWPORT_DEFAULT_STATE)
  const [railButtonSize, setRailButtonSize] = useState(
    PREVIEW_VIEWPORT_DEFAULT_RAIL_BUTTON_SIZE,
  )
  const [isPanning, setIsPanning] = useState(false)
  const [isSpacePanArmed, setIsSpacePanArmed] = useState(false)

  const getViewportBounds = useCallback((): PreviewViewportBounds | null => {
    const viewportElement = viewportRef.current
    const stageElement = stageRef.current
    const contentElement = stageElement?.firstElementChild

    if (
      !viewportElement ||
      !stageElement ||
      !(contentElement instanceof HTMLElement)
    ) {
      return null
    }

    return {
      viewportWidth: stageElement.offsetWidth,
      viewportHeight: stageElement.offsetHeight,
      contentWidth: contentElement.offsetWidth,
      contentHeight: contentElement.offsetHeight,
    }
  }, [])

  const freezeRailSize = useCallback(() => {
    railSizingFrozenRef.current = true

    if (railSizeRecomputeTimeoutRef.current !== null) {
      window.clearTimeout(railSizeRecomputeTimeoutRef.current)
      railSizeRecomputeTimeoutRef.current = null
    }
  }, [])

  const recomputeRailButtonSize = useCallback(() => {
    if (activePanRef.current || railSizingFrozenRef.current) {
      return
    }

    const viewportElement = viewportRef.current
    const stageElement = stageRef.current
    const contentElement = stageElement?.firstElementChild

    if (
      !viewportElement ||
      !stageElement ||
      !(contentElement instanceof HTMLElement)
    ) {
      return
    }

    setRailButtonSize(
      choosePreviewViewportRailButtonSize({
        contentHeight: contentElement.offsetHeight,
        contentWidth: contentElement.offsetWidth,
        stageHeight: stageElement.offsetHeight,
        surfaceWindowGap: readCssPixelVariable(
          viewportElement,
          '--preview-surface-window-gap',
          PREVIEW_VIEWPORT_SURFACE_GAP_FALLBACK,
        ),
        viewportHeight: viewportElement.offsetHeight,
        viewportWidth: viewportElement.offsetWidth,
      }),
    )
  }, [])

  const releaseRailSizeFreeze = useCallback(() => {
    railSizingFrozenRef.current = false
    recomputeRailButtonSize()
  }, [recomputeRailButtonSize])

  const updateViewportState = useCallback(
    (updater: (current: PreviewViewportState) => PreviewViewportState) => {
      setViewportState((current) =>
        clampPreviewViewportState(updater(current), getViewportBounds()))
    },
    [getViewportBounds],
  )

  const zoomAtPoint = useCallback(
    (requestedZoom: number, point: PreviewViewportPoint) => {
      updateViewportState((current) =>
        zoomPreviewViewportAroundPoint(
          current,
          requestedZoom,
          point,
          getViewportBounds(),
        ))
    },
    [getViewportBounds, updateViewportState],
  )

  const zoomAtViewportCenter = useCallback((requestedZoom: number) => {
    const stageElement = stageRef.current
    const bounds = getViewportBounds()

    zoomAtPoint(requestedZoom, {
      x: stageElement ? stageElement.offsetWidth / 2 : bounds?.viewportWidth ?? 0,
      y: stageElement ? stageElement.offsetHeight / 2 : bounds?.viewportHeight ?? 0,
    })
  }, [getViewportBounds, zoomAtPoint])

  const handleZoomOut = useCallback(() => {
    zoomAtViewportCenter(viewportState.zoom / PREVIEW_VIEWPORT_BUTTON_ZOOM_FACTOR)
  }, [viewportState.zoom, zoomAtViewportCenter])

  const handleZoomIn = useCallback(() => {
    zoomAtViewportCenter(viewportState.zoom * PREVIEW_VIEWPORT_BUTTON_ZOOM_FACTOR)
  }, [viewportState.zoom, zoomAtViewportCenter])

  const handleFit = useCallback(() => {
    recomputeRailButtonSize()
    setViewportState(resetPreviewViewportToFit())
  }, [recomputeRailButtonSize])

  const handlePanBy = useCallback((delta: PreviewViewportPoint) => {
    updateViewportState((current) =>
      panPreviewViewportBy(current, delta, getViewportBounds()))
  }, [getViewportBounds, updateViewportState])

  const handleWheelCapture = useCallback((event: WheelEvent<HTMLDivElement>) => {
    if (!event.ctrlKey && !event.metaKey) {
      return
    }

    const viewportElement = viewportRef.current
    const stageElement = stageRef.current
    if (!viewportElement || !stageElement) {
      return
    }

    event.preventDefault()
    event.stopPropagation()
    freezeRailSize()

    if (railSizeRecomputeTimeoutRef.current !== null) {
      window.clearTimeout(railSizeRecomputeTimeoutRef.current)
    }
    railSizeRecomputeTimeoutRef.current = window.setTimeout(() => {
      railSizeRecomputeTimeoutRef.current = null
      releaseRailSizeFreeze()
    }, 160)

    const factor = Math.exp(-event.deltaY * 0.0015)
    zoomAtPoint(
      viewportState.zoom * factor,
      getPointInStageSlot(event, viewportElement, stageElement),
    )
  }, [freezeRailSize, releaseRailSizeFreeze, viewportState.zoom, zoomAtPoint])

  const beginPan = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      const viewportElement = viewportRef.current
      if (!viewportElement) {
        return
      }

      activePanRef.current = {
        pointerId: event.pointerId,
        startClientX: event.clientX,
        startClientY: event.clientY,
        startPanX: viewportState.panX,
        startPanY: viewportState.panY,
      }
      viewportElement.setPointerCapture(event.pointerId)
      setIsPanning(true)
    },
    [viewportState.panX, viewportState.panY],
  )

  const handlePointerDownCapture = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (isPreviewViewportControlTarget(event.target)) {
        return
      }

      if (
        event.button === 0 &&
        event.target instanceof Node &&
        stageRef.current?.contains(event.target)
      ) {
        freezeRailSize()
        previewInteractionPointerIdRef.current = event.pointerId
      }

      const isMiddleMouse = event.button === 1
      const isSpacePrimaryPan = event.button === 0 && spacePanArmedRef.current

      if (!isMiddleMouse && !isSpacePrimaryPan) {
        return
      }

      event.preventDefault()
      event.stopPropagation()
      beginPan(event)
    },
    [beginPan, freezeRailSize],
  )

  const handlePointerMoveCapture = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      const activePan = activePanRef.current
      if (!activePan || activePan.pointerId !== event.pointerId) {
        return
      }

      event.preventDefault()
      event.stopPropagation()
      setViewportState(
        clampPreviewViewportState(
          {
            zoom: viewportState.zoom,
            panX: activePan.startPanX + event.clientX - activePan.startClientX,
            panY: activePan.startPanY + event.clientY - activePan.startClientY,
          },
          getViewportBounds(),
        ),
      )
    },
    [getViewportBounds, viewportState.zoom],
  )

  const endPan = useCallback((pointerId: number) => {
    const activePan = activePanRef.current

    if (!activePan || activePan.pointerId !== pointerId) {
      return
    }

    const viewportElement = viewportRef.current
    if (viewportElement?.hasPointerCapture(pointerId)) {
      viewportElement.releasePointerCapture(pointerId)
    }

    activePanRef.current = null
    setIsPanning(false)
    recomputeRailButtonSize()
  }, [recomputeRailButtonSize])

  const handlePointerEndCapture = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      endPan(event.pointerId)

      if (previewInteractionPointerIdRef.current === event.pointerId) {
        previewInteractionPointerIdRef.current = null
        releaseRailSizeFreeze()
      }
    },
    [endPan, releaseRailSizeFreeze],
  )

  const handleRailControlPointerDownCapture = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (event.button === 0) {
        freezeRailSize()
        railInteractionPointerIdRef.current = event.pointerId
      }
    },
    [freezeRailSize],
  )

  const handleRailControlPointerEndCapture = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (
        railInteractionPointerIdRef.current === null ||
        railInteractionPointerIdRef.current === event.pointerId
      ) {
        railInteractionPointerIdRef.current = null
        releaseRailSizeFreeze()
      }
    },
    [releaseRailSizeFreeze],
  )

  const handleAuxClickCapture = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (event.button === 1) {
      event.preventDefault()
    }
  }, [])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (
        event.code !== 'Space' ||
        event.repeat ||
        isFormEditingTarget(event.target)
      ) {
        return
      }

      event.preventDefault()
      spacePanArmedRef.current = true
      setIsSpacePanArmed(true)
    }

    function handleKeyUp(event: KeyboardEvent) {
      if (event.code !== 'Space') {
        return
      }

      spacePanArmedRef.current = false
      setIsSpacePanArmed(false)
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  useEffect(() => () => {
    if (railSizeRecomputeTimeoutRef.current !== null) {
      window.clearTimeout(railSizeRecomputeTimeoutRef.current)
    }
  }, [])

  useEffect(() => {
    function handleWindowPointerEnd(event: globalThis.PointerEvent) {
      let shouldRelease = false

      if (previewInteractionPointerIdRef.current === event.pointerId) {
        previewInteractionPointerIdRef.current = null
        shouldRelease = true
      }

      if (railInteractionPointerIdRef.current === event.pointerId) {
        railInteractionPointerIdRef.current = null
        shouldRelease = true
      }

      if (shouldRelease) {
        releaseRailSizeFreeze()
      }
    }

    window.addEventListener('pointerup', handleWindowPointerEnd)
    window.addEventListener('pointercancel', handleWindowPointerEnd)

    return () => {
      window.removeEventListener('pointerup', handleWindowPointerEnd)
      window.removeEventListener('pointercancel', handleWindowPointerEnd)
    }
  }, [releaseRailSizeFreeze])

  useEffect(() => {
    const viewportElement = viewportRef.current
    const stageElement = stageRef.current
    const contentElement = stageElement?.firstElementChild

    if (
      typeof ResizeObserver === 'undefined' ||
      !viewportElement ||
      !(contentElement instanceof HTMLElement)
    ) {
      return undefined
    }

    const resizeObserver = new ResizeObserver(() => {
      recomputeRailButtonSize()
      setViewportState((current) =>
        clampPreviewViewportState(current, getViewportBounds()))
    })
    resizeObserver.observe(viewportElement)
    resizeObserver.observe(contentElement)

    return () => resizeObserver.disconnect()
  }, [getViewportBounds, recomputeRailButtonSize])

  const zoomPercent = getPreviewViewportZoomPercent(viewportState.zoom)
  const railWidth = getPreviewViewportRailWidth(railButtonSize)
  const viewportStyle = useMemo(() => ({
    '--preview-viewport-rail-button-size': `${railButtonSize}px`,
    '--preview-viewport-rail-width': `${railWidth}px`,
  }) as CSSProperties, [railButtonSize, railWidth])
  const stageStyle = useMemo(() => ({
    '--preview-viewport-pan-x': `${viewportState.panX}px`,
    '--preview-viewport-pan-y': `${viewportState.panY}px`,
    '--preview-viewport-zoom': `${viewportState.zoom}`,
  }) as CSSProperties, [viewportState.panX, viewportState.panY, viewportState.zoom])

  return (
    <div
      ref={viewportRef}
      className={[
        'preview-viewport',
        isPanning ? 'is-panning' : '',
        isSpacePanArmed ? 'is-space-pan-armed' : '',
      ].filter(Boolean).join(' ')}
      data-preview-viewport-zoom={zoomPercent}
      data-smoke-id="preview-viewport"
      aria-label={`${label} zoom and pan viewport`}
      style={viewportStyle}
      onAuxClickCapture={handleAuxClickCapture}
      onLostPointerCapture={handlePointerEndCapture}
      onPointerCancelCapture={handlePointerEndCapture}
      onPointerDownCapture={handlePointerDownCapture}
      onPointerMoveCapture={handlePointerMoveCapture}
      onPointerUpCapture={handlePointerEndCapture}
      onWheelCapture={handleWheelCapture}
    >
      <div
        ref={stageRef}
        className="preview-viewport-stage"
        data-smoke-id="preview-viewport-stage"
        style={stageStyle}
      >
        {children}
      </div>

      <div
        className="preview-viewport-controls"
        data-preview-viewport-controls="true"
        data-smoke-id="preview-viewport-controls"
        aria-label={`${label} viewport controls, ${zoomPercent} percent zoom`}
        title={`${label} viewport controls, ${zoomPercent}% zoom`}
        onLostPointerCapture={handleRailControlPointerEndCapture}
        onPointerCancelCapture={handleRailControlPointerEndCapture}
        onPointerDownCapture={handleRailControlPointerDownCapture}
        onPointerUpCapture={handleRailControlPointerEndCapture}
      >
        <div
          className="preview-viewport-controls-panel"
          role="group"
          aria-label={`${label} zoom and pan controls`}
        >
          <button
            type="button"
            className="preview-viewport-icon-button"
            aria-label={`Zoom in ${label} from ${zoomPercent} percent`}
            title={`Zoom in from ${zoomPercent}%`}
            onClick={handleZoomIn}
          >
            <MagnifierIcon kind="in" />
          </button>
          <button
            type="button"
            className="preview-viewport-icon-button"
            aria-label={`Zoom out ${label} from ${zoomPercent} percent`}
            title={`Zoom out from ${zoomPercent}%`}
            onClick={handleZoomOut}
          >
            <MagnifierIcon kind="out" />
          </button>
          <button
            type="button"
            className="preview-viewport-fit-button preview-viewport-button--span"
            aria-label={`Fit ${label} to available space from ${zoomPercent} percent`}
            title={`Fit from ${zoomPercent}%`}
            onClick={handleFit}
          >
            Fit
          </button>
          <button
            type="button"
            className="preview-viewport-icon-button preview-viewport-button--span"
            aria-label={`Pan ${label} up, current zoom ${zoomPercent} percent`}
            title="Pan up"
            onClick={() => handlePanBy({
              x: 0,
              y: PREVIEW_VIEWPORT_BUTTON_PAN_STEP,
            })}
          >
            <ArrowIcon direction="up" />
          </button>
          <button
            type="button"
            className="preview-viewport-icon-button"
            aria-label={`Pan ${label} left, current zoom ${zoomPercent} percent`}
            title="Pan left"
            onClick={() => handlePanBy({
              x: PREVIEW_VIEWPORT_BUTTON_PAN_STEP,
              y: 0,
            })}
          >
            <ArrowIcon direction="left" />
          </button>
          <button
            type="button"
            className="preview-viewport-icon-button"
            aria-label={`Pan ${label} right, current zoom ${zoomPercent} percent`}
            title="Pan right"
            onClick={() => handlePanBy({
              x: -PREVIEW_VIEWPORT_BUTTON_PAN_STEP,
              y: 0,
            })}
          >
            <ArrowIcon direction="right" />
          </button>
          <button
            type="button"
            className="preview-viewport-icon-button preview-viewport-button--span"
            aria-label={`Pan ${label} down, current zoom ${zoomPercent} percent`}
            title="Pan down"
            onClick={() => handlePanBy({
              x: 0,
              y: -PREVIEW_VIEWPORT_BUTTON_PAN_STEP,
            })}
          >
            <ArrowIcon direction="down" />
          </button>
        </div>
      </div>
    </div>
  )
}
