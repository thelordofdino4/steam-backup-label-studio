import type { AdditionalArtworkFrame } from '../project/projectTypes.ts'
import {
  createArtworkFrameCorrosionFieldRequest,
  type ArtworkFrameCorrosionFieldRequest,
} from './artworkFrameCorrosionField.ts'
import {
  getMetalArtworkFrameEdgeInsets,
  type ArtworkFrameRect,
} from './artworkFrame.ts'
import type { ArtworkFrameMaterialSeed } from './artworkFrameMaterialSeed.ts'
import {
  getArtworkFrameMaterialLightVectorKey,
  resolveArtworkFrameMaterialLightVector,
  type ArtworkFrameMaterialLightVector,
} from './artworkFrameMaterialLighting.ts'
import {
  measureArtworkFrameMaterialPerformance,
  type ArtworkFrameMaterialPerformanceRecorder,
} from './artworkFrameMaterialPerformance.ts'
import {
  createArtworkFrameSteelFinishFieldRequest,
  getArtworkFrameSteelFinishFieldRequestKey,
  type ArtworkFrameSteelFinishFieldRequest,
} from './artworkFrameSteelFinish.ts'

export const ARTWORK_FRAME_CANVAS_MATERIAL_MAX_TEXTURE_DIMENSION = 1536
export const ARTWORK_FRAME_CANVAS_MATERIAL_INTERACTION_MAX_TEXTURE_DIMENSION =
  384
export const ARTWORK_FRAME_CANVAS_MATERIAL_PIXEL_RATIO = 2

type MetalArtworkFrameMaterialSettings = Pick<
  AdditionalArtworkFrame,
  | 'metalBrushAngle'
  | 'metalBevelWidth'
  | 'metalDepth'
  | 'metalPattern'
  | 'metalPatternScale'
  | 'metalPatternStrength'
  | 'metalPolish'
  | 'metalProfile'
  | 'metalTarnish'
  | 'metalType'
  | 'shape'
  | 'style'
  | 'width'
>

export type ArtworkFrameCanvasMaterialTextureSize = {
  height: number
  scale: number
  width: number
}

export type ArtworkFrameCanvasMaterialQualityMode =
  | 'full'
  | 'interaction-preview'

export type ArtworkFrameCanvasMaterialLighting = {
  lightVector: ArtworkFrameMaterialLightVector
}

export type ArtworkFrameCanvasMaterialClipMode = 'fill' | 'stroke'

export type ArtworkFrameCanvasMaterialStrokeClip = {
  lineCap: CanvasLineCap
  lineJoin: CanvasLineJoin
  lineWidth: number
}

export type ArtworkFrameCanvasMaterialTextureDescriptor = {
  backend: 'canvas-texture'
  bounds: ArtworkFrameRect
  clipMode: ArtworkFrameCanvasMaterialClipMode
  clipPathData: string
  clipStroke: ArtworkFrameCanvasMaterialStrokeClip | null
  corrosionFieldRequest: ArtworkFrameCorrosionFieldRequest | null
  lighting: ArtworkFrameCanvasMaterialLighting
  material: 'metal'
  materialSeed: ArtworkFrameMaterialSeed | null
  pathData: string
  qualityMode?: ArtworkFrameCanvasMaterialQualityMode
  role: 'metal-surface-maps'
  steelFinishFieldRequest?: ArtworkFrameSteelFinishFieldRequest | null
  strokeWidth: number
  textureSize: ArtworkFrameCanvasMaterialTextureSize
}

export type ArtworkFrameMaterialRenderBackend = 'canvas-texture'

export type MetalArtworkFrameMaterialPlan = {
  backend: ArtworkFrameMaterialRenderBackend
  bounds: ArtworkFrameRect
  canvasTexture: ArtworkFrameCanvasMaterialTextureDescriptor | null
  clipPathData: string | null
  material: 'metal'
  pathData: string
  strokeWidth: number
}

export type MetalArtworkFrameMaterialPlanOptions = {
  bounds: ArtworkFrameRect
  clipMode?: ArtworkFrameCanvasMaterialClipMode
  clipPathData: string | null
  frame: MetalArtworkFrameMaterialSettings
  materialSeed?: ArtworkFrameMaterialSeed | null
  lightVector?: ArtworkFrameMaterialLightVector | null
  maxTextureDimension?: number
  pathData: string
  performance?: ArtworkFrameMaterialPerformanceRecorder | null
  qualityMode?: ArtworkFrameCanvasMaterialQualityMode
  strokeWidth: number
  texturePixelRatio?: number
}

function resolveArtworkFrameCanvasMaterialQualityMode(
  qualityMode: ArtworkFrameCanvasMaterialQualityMode | null | undefined,
): ArtworkFrameCanvasMaterialQualityMode {
  return qualityMode === 'interaction-preview'
    ? 'interaction-preview'
    : 'full'
}

function resolveArtworkFrameCanvasMaterialMaxTextureDimension({
  maxTextureDimension,
  qualityMode,
}: {
  maxTextureDimension?: number
  qualityMode: ArtworkFrameCanvasMaterialQualityMode
}) {
  const requestedMax = Number.isFinite(maxTextureDimension)
    ? Math.max(1, Math.floor(maxTextureDimension ?? 1))
    : null

  if (qualityMode === 'interaction-preview') {
    return Math.min(
      ARTWORK_FRAME_CANVAS_MATERIAL_MAX_TEXTURE_DIMENSION,
      requestedMax ??
        ARTWORK_FRAME_CANVAS_MATERIAL_INTERACTION_MAX_TEXTURE_DIMENSION,
    )
  }

  return Math.min(
    ARTWORK_FRAME_CANVAS_MATERIAL_MAX_TEXTURE_DIMENSION,
    requestedMax ?? ARTWORK_FRAME_CANVAS_MATERIAL_MAX_TEXTURE_DIMENSION,
  )
}

export function resolveArtworkFrameCanvasMaterialTextureSize(
  bounds: Pick<ArtworkFrameRect, 'height' | 'width'>,
  maxTextureDimension = ARTWORK_FRAME_CANVAS_MATERIAL_MAX_TEXTURE_DIMENSION,
  pixelRatio = ARTWORK_FRAME_CANVAS_MATERIAL_PIXEL_RATIO,
): ArtworkFrameCanvasMaterialTextureSize {
  const width = Math.max(1, bounds.width)
  const height = Math.max(1, bounds.height)
  const maxDimension = Math.max(1, maxTextureDimension)
  const desiredScale = Math.max(1, pixelRatio)
  const scale = Math.min(
    desiredScale,
    maxDimension / Math.max(width, height),
  )

  return {
    height: Math.max(1, Math.round(height * scale)),
    scale,
    width: Math.max(1, Math.round(width * scale)),
  }
}

export function resolveArtworkFrameCanvasMaterialPreviewTexturePixelRatio({
  devicePixelRatio = 1,
  displaySize,
  logicalSize,
  maxTextureDimension,
  qualityMode,
}: {
  devicePixelRatio?: number | null
  displaySize?: Pick<ArtworkFrameRect, 'height' | 'width'> | null
  logicalSize: Pick<ArtworkFrameRect, 'height' | 'width'>
  maxTextureDimension?: number
  qualityMode?: ArtworkFrameCanvasMaterialQualityMode | null
}): number {
  const logicalWidth = Math.max(1, logicalSize.width)
  const logicalHeight = Math.max(1, logicalSize.height)
  const displayWidth = Number.isFinite(displaySize?.width)
    ? Math.max(0, displaySize?.width ?? 0)
    : 0
  const displayHeight = Number.isFinite(displaySize?.height)
    ? Math.max(0, displaySize?.height ?? 0)
    : 0
  const resolvedQualityMode = resolveArtworkFrameCanvasMaterialQualityMode(
    qualityMode,
  )
  const resolvedMaxTextureDimension =
    resolveArtworkFrameCanvasMaterialMaxTextureDimension({
      maxTextureDimension,
      qualityMode: resolvedQualityMode,
    })
  const displayScale = displayWidth > 0 && displayHeight > 0
    ? Math.max(displayWidth / logicalWidth, displayHeight / logicalHeight)
    : ARTWORK_FRAME_CANVAS_MATERIAL_PIXEL_RATIO
  const safeDevicePixelRatio = Number.isFinite(devicePixelRatio)
    ? Math.max(1, devicePixelRatio ?? 1)
    : 1
  const requestedPixelRatio = Math.max(
    ARTWORK_FRAME_CANVAS_MATERIAL_PIXEL_RATIO,
    displayScale * safeDevicePixelRatio,
  )
  const maxPixelRatio = Math.max(
    1,
    resolvedMaxTextureDimension / Math.max(logicalWidth, logicalHeight),
  )

  return Math.min(requestedPixelRatio, maxPixelRatio)
}

export function resolveArtworkFrameCanvasMaterialTextureBounds(
  bounds: ArtworkFrameRect,
  clipMode: ArtworkFrameCanvasMaterialClipMode,
  strokeWidth: number,
): ArtworkFrameRect {
  const strokeOutset = clipMode === 'stroke'
    ? strokeWidth / 2
    : -getMetalArtworkFrameEdgeInsets(strokeWidth).outerInset
  const outset = Math.max(0, strokeOutset)

  if (outset <= 0) {
    return bounds
  }

  return {
    x: bounds.x - outset,
    y: bounds.y - outset,
    width: bounds.width + outset * 2,
    height: bounds.height + outset * 2,
  }
}

export function canUseCanvasArtworkFrameMaterialTexture({
  clipPathData,
  frame,
}: Pick<MetalArtworkFrameMaterialPlanOptions, 'clipPathData' | 'frame'>) {
  return frame.style === 'metal' && Boolean(clipPathData)
}

export function buildMetalArtworkFrameMaterialPlan({
  bounds,
  clipMode = 'fill',
  clipPathData,
  frame,
  lightVector: requestedLightVector = null,
  materialSeed = null,
  maxTextureDimension,
  pathData,
  performance,
  qualityMode: requestedQualityMode,
  strokeWidth,
  texturePixelRatio,
}: MetalArtworkFrameMaterialPlanOptions): MetalArtworkFrameMaterialPlan {
  return measureArtworkFrameMaterialPerformance(
    performance,
    'descriptor-material-plan',
    () => {
      const qualityMode = resolveArtworkFrameCanvasMaterialQualityMode(
        requestedQualityMode,
      )
      const resolvedMaxTextureDimension =
        resolveArtworkFrameCanvasMaterialMaxTextureDimension({
          maxTextureDimension,
          qualityMode,
        })
      const textureBounds = resolveArtworkFrameCanvasMaterialTextureBounds(
        bounds,
        clipMode,
        strokeWidth,
      )
      const textureSize = resolveArtworkFrameCanvasMaterialTextureSize(
        textureBounds,
        resolvedMaxTextureDimension,
        texturePixelRatio,
      )
      const lightVector = resolveArtworkFrameMaterialLightVector(
        requestedLightVector,
      )
      const canvasTexture = canUseCanvasArtworkFrameMaterialTexture({
        clipPathData,
        frame,
      }) && clipPathData
        ? {
            backend: 'canvas-texture' as const,
            bounds: textureBounds,
            clipMode,
            clipPathData,
            clipStroke: clipMode === 'stroke'
              ? {
                  lineCap: 'round' as const,
                  lineJoin: 'round' as const,
                  lineWidth: strokeWidth,
                }
              : null,
            corrosionFieldRequest: createArtworkFrameCorrosionFieldRequest({
              bounds,
              frame,
              materialSeed,
              samplingBounds: textureBounds,
              strokeWidth,
              textureSize,
            }),
            lighting: {
              lightVector,
            },
            material: 'metal' as const,
            materialSeed,
            pathData,
            qualityMode,
            role: 'metal-surface-maps' as const,
            steelFinishFieldRequest: createArtworkFrameSteelFinishFieldRequest({
              bounds,
              frame,
              materialSeed,
              samplingBounds: textureBounds,
              strokeWidth,
              textureSize,
            }),
            strokeWidth,
            textureSize,
          }
        : null

      return {
        backend: 'canvas-texture',
        bounds,
        canvasTexture,
        clipPathData,
        material: 'metal',
        pathData,
        strokeWidth,
      }
    },
  )
}

function getStableStringHash(value: string) {
  let hash = 0

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0
  }

  return hash.toString(36)
}

function formatMaterialKeyNumber(value: number) {
  return Number.isFinite(value) ? value.toFixed(3) : '0.000'
}

export function getArtworkFrameCanvasMaterialTextureKey(
  texture: ArtworkFrameCanvasMaterialTextureDescriptor,
) {
  const qualityMode = resolveArtworkFrameCanvasMaterialQualityMode(
    texture.qualityMode,
  )

  return [
    texture.role,
    `quality:${qualityMode}`,
    formatMaterialKeyNumber(texture.bounds.x),
    formatMaterialKeyNumber(texture.bounds.y),
    formatMaterialKeyNumber(texture.bounds.width),
    formatMaterialKeyNumber(texture.bounds.height),
    formatMaterialKeyNumber(texture.strokeWidth),
    texture.textureSize.width,
    texture.textureSize.height,
    texture.clipMode,
    texture.clipStroke
      ? [
          formatMaterialKeyNumber(texture.clipStroke.lineWidth),
          texture.clipStroke.lineCap,
          texture.clipStroke.lineJoin,
        ].join(':')
      : 'no-stroke-clip',
    texture.corrosionFieldRequest?.geometrySeedKey ?? 'no-corrosion-field',
    texture.materialSeed
      ? [
          texture.materialSeed.algorithm,
          texture.materialSeed.key,
          texture.materialSeed.seed32.toString(36),
        ].join(':')
      : 'no-material-seed',
    formatMaterialKeyNumber(texture.corrosionFieldRequest?.tarnishUnit ?? 0),
    getArtworkFrameMaterialLightVectorKey(texture.lighting.lightVector),
    getStableStringHash(texture.clipPathData),
    getStableStringHash(texture.pathData),
    ...(texture.steelFinishFieldRequest
      ? [getArtworkFrameSteelFinishFieldRequestKey(texture.steelFinishFieldRequest)]
      : []),
  ].join('|')
}
