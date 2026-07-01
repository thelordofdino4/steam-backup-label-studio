import { useCallback, useEffect, useMemo, useState } from 'react'
import type { AdditionalArtworkFrame, BackgroundImageSize } from '../../project/projectTypes'
import { getImageContentSize } from '../../image/imageContentBounds'
import { getImageContentShape } from '../../image/imageContentShape'
import {
  createMetalArtworkFramePathData,
  createTexturedArtworkFramePathData,
  getArtworkFrameStrokeWidth,
  getArtworkFrameTexturePatternSize,
  getArtworkFrameTextureUrl,
  isMetalArtworkFrame,
  isTexturedArtworkFrame,
} from '../../render/artworkFrame'
import {
  createArtworkFrameMaterialCanvasMaterialCache,
  renderArtworkFrameCanvasMaterialTexture,
} from '../../render/artworkFrameMaterialCanvas'
import {
  buildMetalArtworkFrameMaterialPlan,
  resolveArtworkFrameCanvasMaterialPreviewTexturePixelRatio,
  type ArtworkFrameCanvasMaterialQualityMode,
  type ArtworkFrameCanvasMaterialTextureDescriptor,
} from '../../render/artworkFrameMaterialPlan'
import {
  resolveArtworkFrameMaterialSeed,
  type ArtworkFrameMaterialSeed,
} from '../../render/artworkFrameMaterialSeed'
import type {
  ArtworkFrameMaterialLightVector,
} from '../../render/artworkFrameMaterialLighting'

const previewCanvasMaterialTextureCache = new Map()
const previewCanvasMaterialMapCache =
  createArtworkFrameMaterialCanvasMaterialCache()
const previewCanvasMaterialHrefCache = new Map<string, string>()

function createPreviewCanvas(width: number, height: number) {
  const canvas = document.createElement('canvas')

  canvas.width = width
  canvas.height = height

  return canvas
}

function getPreviewCanvasMaterialHref(
  texture: ArtworkFrameCanvasMaterialTextureDescriptor,
) {
  if (typeof document === 'undefined') {
    return null
  }

  try {
    const rendered = renderArtworkFrameCanvasMaterialTexture(texture, {
      cache: previewCanvasMaterialTextureCache,
      createCanvas: createPreviewCanvas,
      materialCache: previewCanvasMaterialMapCache,
    })
    const cachedHref = previewCanvasMaterialHrefCache.get(rendered.cacheKey)

    if (cachedHref) {
      return cachedHref
    }

    if (!('toDataURL' in rendered.canvas)) {
      return null
    }

    const href = rendered.canvas.toDataURL('image/png')

    previewCanvasMaterialHrefCache.set(rendered.cacheKey, href)

    return href
  } catch {
    return null
  }
}

type ArtworkFrameOverlayProps = {
  className: string
  frame: AdditionalArtworkFrame
  imageDataUrl?: string | null
  imageSize: BackgroundImageSize | null | undefined
  materialLightVector?: ArtworkFrameMaterialLightVector | null
  materialQualityMode?: ArtworkFrameCanvasMaterialQualityMode
  patternId: string
}

function useArtworkFrameMaterialSeed(
  imageDataUrl: string | null | undefined,
) {
  const [seedState, setSeedState] = useState<{
    imageDataUrl: string | null
    seed: ArtworkFrameMaterialSeed | null
  }>({ imageDataUrl: null, seed: null })

  useEffect(() => {
    let cancelled = false

    if (!imageDataUrl) {
      return () => {
        cancelled = true
      }
    }

    resolveArtworkFrameMaterialSeed(imageDataUrl).then((seed) => {
      if (!cancelled) {
        setSeedState({ imageDataUrl, seed })
      }
    })

    return () => {
      cancelled = true
    }
  }, [imageDataUrl])

  return seedState.imageDataUrl === imageDataUrl ? seedState.seed : null
}

function getPreviewDisplaySize(element: Element) {
  const rect = element.getBoundingClientRect()

  if (
    !Number.isFinite(rect.width) ||
    !Number.isFinite(rect.height) ||
    rect.width <= 0 ||
    rect.height <= 0
  ) {
    return null
  }

  return {
    height: rect.height,
    width: rect.width,
  }
}

function arePreviewDisplaySizesEqual(
  a: { height: number; width: number } | null,
  b: { height: number; width: number } | null,
) {
  if (a === b) {
    return true
  }

  if (!a || !b) {
    return false
  }

  return Math.abs(a.width - b.width) < 0.5 &&
    Math.abs(a.height - b.height) < 0.5
}

function usePreviewElementDisplaySize<T extends Element>() {
  const [element, setElement] = useState<T | null>(null)
  const [displaySize, setDisplaySize] = useState<{
    height: number
    width: number
  } | null>(null)
  const setMeasuredElement = useCallback((nextElement: T | null) => {
    setElement(nextElement)

    if (!nextElement) {
      setDisplaySize(null)
    }
  }, [])

  useEffect(() => {
    if (!element || typeof window === 'undefined') {
      return
    }

    let animationFrame = 0
    const updateDisplaySize = () => {
      const nextDisplaySize = getPreviewDisplaySize(element)

      setDisplaySize((previousDisplaySize) =>
        arePreviewDisplaySizesEqual(previousDisplaySize, nextDisplaySize)
          ? previousDisplaySize
          : nextDisplaySize
      )
    }
    const scheduleUpdate = () => {
      if (animationFrame) {
        window.cancelAnimationFrame(animationFrame)
      }

      animationFrame = window.requestAnimationFrame(() => {
        animationFrame = 0
        updateDisplaySize()
      })
    }

    updateDisplaySize()

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', scheduleUpdate)

      return () => {
        if (animationFrame) {
          window.cancelAnimationFrame(animationFrame)
        }

        window.removeEventListener('resize', scheduleUpdate)
      }
    }

    const observer = new ResizeObserver(scheduleUpdate)

    observer.observe(element)
    window.addEventListener('resize', scheduleUpdate)

    return () => {
      if (animationFrame) {
        window.cancelAnimationFrame(animationFrame)
      }

      observer.disconnect()
      window.removeEventListener('resize', scheduleUpdate)
    }
  }, [element])

  return [setMeasuredElement, displaySize] as const
}

function getFrameViewBox(imageSize: BackgroundImageSize | null | undefined) {
  const contentSize = getImageContentSize(imageSize)
  const width = 100
  const height =
    contentSize && contentSize.width > 0
      ? Math.max(1, 100 * (contentSize.height / contentSize.width))
      : 100

  return { width, height }
}

function sanitizeSvgId(value: string) {
  return value.replace(/[^A-Za-z0-9_-]/g, '-')
}

function TexturedArtworkFrameRing({
  pathData,
  patternId,
  strokeWidth,
}: {
  pathData: string
  patternId: string
  strokeWidth: number
}) {
  const outlineWidth = Math.max(0.2, strokeWidth * 0.16)

  return (
    <>
      <path
        d={pathData}
        fill="rgba(15, 23, 42, 0.62)"
        fillRule="evenodd"
      />
      <path
        d={pathData}
        fill={`url(#${patternId})`}
        fillRule="evenodd"
      />
      <path
        d={pathData}
        fill="none"
        stroke="rgba(15, 23, 42, 0.62)"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={outlineWidth}
      />
    </>
  )
}

function TexturedArtworkFrameStroke({
  pathData,
  patternId,
  strokeWidth,
}: {
  pathData: string
  patternId: string
  strokeWidth: number
}) {
  const outlineWidth = Math.max(0.2, strokeWidth * 0.16)

  return (
    <>
      <path
        d={pathData}
        fill="none"
        stroke="rgba(15, 23, 42, 0.62)"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={strokeWidth + outlineWidth}
      />
      <path
        d={pathData}
        fill="none"
        stroke={`url(#${patternId})`}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={strokeWidth}
      />
    </>
  )
}

function MetalArtworkFrameCanvasMaterial({
  bounds,
  clipMode = 'fill',
  materialSeed,
  lightVector = null,
  pathData,
  qualityMode = 'full',
  texturePixelRatio,
  frame,
  strokeWidth,
}: {
  bounds: { height: number; width: number }
  clipMode?: 'fill' | 'stroke'
  frame: AdditionalArtworkFrame
  materialSeed: ArtworkFrameMaterialSeed | null
  lightVector?: ArtworkFrameMaterialLightVector | null
  pathData: string
  qualityMode?: ArtworkFrameCanvasMaterialQualityMode
  strokeWidth: number
  texturePixelRatio?: number
}) {
  const materialPlan = useMemo(() => buildMetalArtworkFrameMaterialPlan({
    bounds: { x: 0, y: 0, width: bounds.width, height: bounds.height },
    clipMode,
    clipPathData: pathData,
    frame,
    lightVector,
    materialSeed,
    pathData,
    qualityMode,
    strokeWidth,
    texturePixelRatio,
  }), [bounds.height, bounds.width, clipMode, frame, lightVector, materialSeed, pathData, qualityMode, strokeWidth, texturePixelRatio])
  const canvasMaterialHref = useMemo(
    () =>
      materialPlan.backend === 'canvas-texture' && materialPlan.canvasTexture
        ? getPreviewCanvasMaterialHref(materialPlan.canvasTexture)
        : null,
    [materialPlan],
  )
  const textureBounds = materialPlan.canvasTexture?.bounds

  if (!canvasMaterialHref) {
    return null
  }

  return (
    <image
      href={canvasMaterialHref}
      x={textureBounds?.x ?? 0}
      y={textureBounds?.y ?? 0}
      width={textureBounds?.width ?? bounds.width}
      height={textureBounds?.height ?? bounds.height}
      preserveAspectRatio="none"
    />
  )
}
export function ArtworkFrameOverlay({
  className,
  frame,
  imageDataUrl,
  imageSize,
  materialLightVector = null,
  materialQualityMode = 'full',
  patternId,
}: ArtworkFrameOverlayProps) {
  const materialSeed = useArtworkFrameMaterialSeed(
    frame.enabled && isMetalArtworkFrame(frame) ? imageDataUrl : null,
  )
  const [
    artworkFrameSvgRef,
    artworkFrameDisplaySize,
  ] = usePreviewElementDisplaySize<SVGSVGElement>()

  if (!frame.enabled) {
    return null
  }

  const contentShape = getImageContentShape(imageSize)
  const viewBox = contentShape
    ? { width: contentShape.width, height: contentShape.height }
    : getFrameViewBox(imageSize)
  const strokeWidth = Math.min(
    getArtworkFrameStrokeWidth(frame, viewBox.width, viewBox.height),
    viewBox.width,
    viewBox.height,
  )
  const inset = strokeWidth / 2
  const tracedPathData = contentShape?.path ?? null
  const previewTexturePixelRatio = resolveArtworkFrameCanvasMaterialPreviewTexturePixelRatio({
    devicePixelRatio: typeof window === 'undefined'
      ? 1
      : window.devicePixelRatio,
    displaySize: artworkFrameDisplaySize,
    logicalSize: viewBox,
    qualityMode: materialQualityMode,
  })

  if (isTexturedArtworkFrame(frame)) {
    const safePatternId = sanitizeSvgId(patternId)
    const textureUrl = getArtworkFrameTextureUrl(frame)
    const pathData = tracedPathData ||
      createTexturedArtworkFramePathData(
        frame,
        { x: 0, y: 0, width: viewBox.width, height: viewBox.height },
        strokeWidth,
      )
    const patternSize = getArtworkFrameTexturePatternSize(viewBox, strokeWidth)

    return (
      <svg
        className={className}
        viewBox={`0 0 ${viewBox.width} ${viewBox.height}`}
        preserveAspectRatio="none"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <pattern
            id={safePatternId}
            patternUnits="userSpaceOnUse"
            width={patternSize}
            height={patternSize}
          >
            {textureUrl ? (
              <image
                href={textureUrl}
                width={patternSize}
                height={patternSize}
                preserveAspectRatio="xMidYMid slice"
              />
            ) : null}
          </pattern>
        </defs>
        {tracedPathData ? (
          <TexturedArtworkFrameStroke
            pathData={pathData}
            patternId={safePatternId}
            strokeWidth={strokeWidth}
          />
        ) : (
          <TexturedArtworkFrameRing
            pathData={pathData}
            patternId={safePatternId}
            strokeWidth={strokeWidth}
          />
        )}
      </svg>
    )
  }

  if (isMetalArtworkFrame(frame)) {
    const pathData = tracedPathData ||
      createMetalArtworkFramePathData(
        frame,
        { x: 0, y: 0, width: viewBox.width, height: viewBox.height },
        strokeWidth,
      )

    return (
      <svg
        ref={artworkFrameSvgRef}
        className={className}
        viewBox={`0 0 ${viewBox.width} ${viewBox.height}`}
        preserveAspectRatio="none"
        overflow="visible"
        aria-hidden="true"
        focusable="false"
      >
        <MetalArtworkFrameCanvasMaterial
          bounds={viewBox}
          clipMode={tracedPathData ? 'stroke' : 'fill'}
          frame={frame}
          lightVector={materialLightVector}
          materialSeed={materialSeed}
          pathData={pathData}
          qualityMode={materialQualityMode}
          strokeWidth={strokeWidth}
          texturePixelRatio={previewTexturePixelRatio}
        />
      </svg>
    )
  }

  return (
    <svg
      className={className}
      viewBox={`0 0 ${viewBox.width} ${viewBox.height}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      {tracedPathData ? (
        <path
          d={tracedPathData}
          fill="none"
          stroke={frame.color}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={strokeWidth}
        />
      ) : frame.shape === 'circle' ? (
        <ellipse
          cx={viewBox.width / 2}
          cy={viewBox.height / 2}
          rx={Math.max(0, (viewBox.width - strokeWidth) / 2)}
          ry={Math.max(0, (viewBox.height - strokeWidth) / 2)}
          fill="none"
          stroke={frame.color}
          strokeWidth={strokeWidth}
        />
      ) : (
        <rect
          x={inset}
          y={inset}
          width={Math.max(0, viewBox.width - strokeWidth)}
          height={Math.max(0, viewBox.height - strokeWidth)}
          fill="none"
          stroke={frame.color}
          strokeWidth={strokeWidth}
        />
      )}
    </svg>
  )
}
