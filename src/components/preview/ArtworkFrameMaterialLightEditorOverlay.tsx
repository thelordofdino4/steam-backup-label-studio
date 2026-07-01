import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from 'react'
import {
  findPreviewEditableElementsById,
  getPreviewElementOverlayUnionRect,
} from '../../editor/previewElementOverlay'
import type { ArtworkFrameRect } from '../../render/artworkFrame'
import {
  getArtworkFrameMaterialLightEditorStateFromPointer,
  getArtworkFrameMaterialLightEditorPillarShadow,
  getArtworkFrameMaterialLightEditorSunPoint,
  type ArtworkFrameMaterialLightOverride,
  type ArtworkFrameMaterialLightEditorTarget,
} from '../../render/artworkFrameMaterialLightEditor'
import {
  ARTWORK_FRAME_MATERIAL_OVERHEAD_LIGHT_VECTOR,
  getArtworkFrameMaterialHemisphereLightEditorPosition,
  type ArtworkFrameMaterialLightVector,
} from '../../render/artworkFrameMaterialLighting'
import type {
  ArtworkFrameCanvasMaterialQualityMode,
} from '../../render/artworkFrameMaterialPlan'

export const ARTWORK_FRAME_MATERIAL_LIGHT_EDITOR_CONTROL_ATTRIBUTE =
  'data-artwork-frame-material-light-editor'

export type ArtworkFrameMaterialPreviewLightOverride = {
  qualityMode: ArtworkFrameCanvasMaterialQualityMode
} & ArtworkFrameMaterialLightOverride

export type ArtworkFrameMaterialLightEditorOverlayProps = {
  lightOverride?: ArtworkFrameMaterialPreviewLightOverride | null
  onLightChange: (
    editableId: string,
    lightVector: ArtworkFrameMaterialLightVector,
    qualityMode: ArtworkFrameCanvasMaterialQualityMode,
  ) => void
  previewRef: RefObject<HTMLElement | null>
  target: ArtworkFrameMaterialLightEditorTarget | null
}

function measureTargetBounds(
  previewElement: HTMLElement,
  target: ArtworkFrameMaterialLightEditorTarget,
): ArtworkFrameRect | null {
  const elements = findPreviewEditableElementsById(
    previewElement,
    target.editableId,
  )
  const rect = getPreviewElementOverlayUnionRect(
    previewElement.getBoundingClientRect(),
    elements.map((element) => element.getBoundingClientRect()),
    {
      height: previewElement.offsetHeight,
      width: previewElement.offsetWidth,
    },
  )

  return rect
    ? {
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height,
      }
    : null
}

function getPreviewLocalPointer(
  event: ReactPointerEvent<Element>,
  previewElement: HTMLElement,
) {
  const previewRect = previewElement.getBoundingClientRect()
  const scaleX = previewElement.offsetWidth > 0
    ? previewRect.width / previewElement.offsetWidth
    : 1
  const scaleY = previewElement.offsetHeight > 0
    ? previewRect.height / previewElement.offsetHeight
    : 1

  return {
    x: (event.clientX - previewRect.left) / Math.max(0.0001, scaleX),
    y: (event.clientY - previewRect.top) / Math.max(0.0001, scaleY),
  }
}

function SunIcon() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
    >
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 1.8v3.1M12 19.1v3.1M4.8 4.8 7 7M17 17l2.2 2.2M1.8 12h3.1M19.1 12h3.1M4.8 19.2 7 17M17 7l2.2-2.2" />
    </svg>
  )
}

export function ArtworkFrameMaterialLightEditorOverlay({
  lightOverride = null,
  onLightChange,
  previewRef,
  target,
}: ArtworkFrameMaterialLightEditorOverlayProps) {
  const [bounds, setBounds] = useState<ArtworkFrameRect | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const animationFrameRef = useRef<number | null>(null)
  const shadowClipId = `artwork-frame-light-editor-shadow-${
    useId().replace(/[^A-Za-z0-9_-]/g, '')
  }`

  const measureBounds = useCallback(() => {
    const previewElement = previewRef.current

    setBounds(
      previewElement && target
        ? measureTargetBounds(previewElement, target)
        : null,
    )
  }, [previewRef, target])

  const scheduleMeasure = useCallback(() => {
    if (typeof window === 'undefined') {
      measureBounds()
      return
    }

    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current)
    }

    animationFrameRef.current = window.requestAnimationFrame(() => {
      animationFrameRef.current = null
      measureBounds()
    })
  }, [measureBounds])

  useLayoutEffect(() => {
    scheduleMeasure()
  }, [scheduleMeasure])

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

    if (!previewElement || typeof window === 'undefined') {
      return undefined
    }

    window.addEventListener('resize', scheduleMeasure)

    const resizeObserver = typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(scheduleMeasure)
    resizeObserver?.observe(previewElement)

    return () => {
      window.removeEventListener('resize', scheduleMeasure)
      resizeObserver?.disconnect()
    }
  }, [previewRef, scheduleMeasure])

  const lightVector = lightOverride?.lightVector ??
    (target ? ARTWORK_FRAME_MATERIAL_OVERHEAD_LIGHT_VECTOR : null)
  const sunPosition = lightVector
    ? getArtworkFrameMaterialHemisphereLightEditorPosition(lightVector)
    : null
  const sunPoint = useMemo(
    () =>
      bounds && sunPosition
        ? getArtworkFrameMaterialLightEditorSunPoint({
            bounds,
            sunPosition,
          })
        : null,
    [bounds, sunPosition],
  )

  const updateLightFromPointer = useCallback((
    event: ReactPointerEvent<Element>,
    qualityMode: ArtworkFrameCanvasMaterialQualityMode,
  ) => {
    const previewElement = previewRef.current

    if (!previewElement || !bounds || !target) {
      return
    }

    const state = getArtworkFrameMaterialLightEditorStateFromPointer({
      bounds,
      pointer: getPreviewLocalPointer(event, previewElement),
    })

    onLightChange(
      target.editableId,
      state.lightVector,
      qualityMode,
    )
  }, [bounds, onLightChange, previewRef, target])

  if (!target || !bounds || !sunPoint) {
    return null
  }

  const radius = Math.max(1, Math.min(bounds.width, bounds.height) / 2)
  const centerX = bounds.x + bounds.width / 2
  const centerY = bounds.y + bounds.height / 2
  const guideLeft = centerX - radius
  const guideTop = centerY - radius
  const guideSize = radius * 2
  const tetherDistance = sunPosition
    ? Math.hypot(sunPosition.x, sunPosition.y)
    : 0
  const showTether = isDragging || tetherDistance > 0.035
  const pillarShadow = sunPosition
    ? getArtworkFrameMaterialLightEditorPillarShadow(sunPosition)
    : null
  const shadowEndX = pillarShadow
    ? radius + pillarShadow.directionX * radius * pillarShadow.length
    : radius
  const shadowEndY = pillarShadow
    ? radius - pillarShadow.directionY * radius * pillarShadow.length
    : radius
  const shadowWidth = Math.max(10, Math.min(24, radius * 0.24))
  const shadowCoreWidth = Math.max(5, shadowWidth * 0.38)

  return (
    <div
      className="artwork-frame-light-editor-layer"
      {...{ [ARTWORK_FRAME_MATERIAL_LIGHT_EDITOR_CONTROL_ATTRIBUTE]: 'true' }}
    >
      <div
        className="artwork-frame-light-editor"
        style={{
          height: `${guideSize}px`,
          left: `${guideLeft}px`,
          top: `${guideTop}px`,
          width: `${guideSize}px`,
        }}
      >
        <svg
          className="artwork-frame-light-editor-guide"
          viewBox={`0 0 ${guideSize} ${guideSize}`}
          aria-hidden="true"
          focusable="false"
        >
          <defs>
            <clipPath id={shadowClipId}>
              <circle cx={radius} cy={radius} r={radius} />
            </clipPath>
          </defs>
          <circle
            className="artwork-frame-light-editor-radius"
            cx={radius}
            cy={radius}
            r={radius}
          />
          {pillarShadow?.visible ? (
            <g clipPath={`url(#${shadowClipId})`}>
              <line
                className="artwork-frame-light-editor-pillar-shadow artwork-frame-light-editor-pillar-shadow--wide"
                x1={radius}
                y1={radius}
                x2={shadowEndX}
                y2={shadowEndY}
                strokeWidth={shadowWidth}
                opacity={pillarShadow.opacity}
              />
              <line
                className="artwork-frame-light-editor-pillar-shadow artwork-frame-light-editor-pillar-shadow--core"
                x1={radius}
                y1={radius}
                x2={shadowEndX}
                y2={shadowEndY}
                strokeWidth={shadowCoreWidth}
                opacity={pillarShadow.opacity}
              />
            </g>
          ) : null}
          {showTether ? (
            <line
              className="artwork-frame-light-editor-tether"
              x1={radius}
              y1={radius}
              x2={sunPoint.x - guideLeft}
              y2={sunPoint.y - guideTop}
            />
          ) : null}
        </svg>
        <button
          type="button"
          className={[
            'artwork-frame-light-editor-sun',
            isDragging ? 'is-dragging' : '',
          ].filter(Boolean).join(' ')}
          aria-label={`Move light source for ${target.label}`}
          style={{
            left: `${sunPoint.x - guideLeft}px`,
            top: `${sunPoint.y - guideTop}px`,
          }}
          onPointerDown={(event) => {
            event.preventDefault()
            event.stopPropagation()
            event.currentTarget.setPointerCapture?.(event.pointerId)
            setIsDragging(true)
            updateLightFromPointer(event, 'interaction-preview')
          }}
          onPointerMove={(event) => {
            if (!isDragging) {
              return
            }

            event.preventDefault()
            event.stopPropagation()
            updateLightFromPointer(event, 'interaction-preview')
          }}
          onPointerUp={(event) => {
            if (!isDragging) {
              return
            }

            event.preventDefault()
            event.stopPropagation()
            setIsDragging(false)
            updateLightFromPointer(event, 'full')
            event.currentTarget.releasePointerCapture?.(event.pointerId)
          }}
          onPointerCancel={(event) => {
            setIsDragging(false)
            event.currentTarget.releasePointerCapture?.(event.pointerId)
          }}
        >
          <SunIcon />
        </button>
      </div>
    </div>
  )
}
