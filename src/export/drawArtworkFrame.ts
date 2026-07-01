import { getImageContentShape } from '../image/imageContentShape.ts'
import type {
  AdditionalArtworkFrame,
  BackgroundImageSize,
} from '../project/projectTypes.ts'
import {
  createBasicArtworkFramePath,
  createMetalArtworkFramePathData,
  createScaledImageContentShapePathData,
  createTexturedArtworkFramePathData,
  getArtworkFrameStrokeWidth,
  getArtworkFrameTextureUrl,
  isMetalArtworkFrame,
  isTexturedArtworkFrame,
  type ArtworkFrameRect,
} from '../render/artworkFrame.ts'
import { buildMetalArtworkFrameMaterialPlan } from '../render/artworkFrameMaterialPlan.ts'
import { renderArtworkFrameCanvasMaterialTexture } from '../render/artworkFrameMaterialCanvas.ts'
import type { ArtworkFrameMaterialSeed } from '../render/artworkFrameMaterialSeed.ts'
import {
  getActiveArtworkFrameMaterialLightOverride,
  type ArtworkFrameMaterialLightOverride,
} from '../render/artworkFrameMaterialLightEditor.ts'
import { loadCanvasSafeImage } from './canvasImage.ts'

const exportCanvasMaterialTextureCache = new Map()

export type DrawArtworkFrameOptions = {
  materialLightOverride?: ArtworkFrameMaterialLightOverride | null
  materialSeed?: ArtworkFrameMaterialSeed | null
}

export function createArtworkFrameClipPath(
  context: CanvasRenderingContext2D,
  frame: Pick<AdditionalArtworkFrame, 'shape'>,
  bounds: ArtworkFrameRect,
) {
  createBasicArtworkFramePath(context, frame, bounds)
}

function drawCanvasMetalFrameSurface(
  context: CanvasRenderingContext2D,
  framePath: Path2D,
  materialPlan: ReturnType<typeof buildMetalArtworkFrameMaterialPlan>,
  originalAlpha: number,
) {
  if (
    materialPlan.backend !== 'canvas-texture' ||
    !materialPlan.canvasTexture
  ) {
    return false
  }

  try {
    const rendered = renderArtworkFrameCanvasMaterialTexture(
      materialPlan.canvasTexture,
      { cache: exportCanvasMaterialTextureCache },
    )
    const textureBounds = materialPlan.canvasTexture.bounds

    context.save()
    context.globalAlpha = originalAlpha
    context.globalCompositeOperation = 'source-over'
    context.filter = 'none'

    if (materialPlan.canvasTexture.clipMode === 'fill') {
      context.clip(framePath, 'evenodd')
    }

    context.drawImage(
      rendered.imageSource as CanvasImageSource,
      textureBounds.x,
      textureBounds.y,
      textureBounds.width,
      textureBounds.height,
    )
    context.restore()

    return true
  } catch {
    return false
  }
}

export async function drawArtworkFrame(
  context: CanvasRenderingContext2D,
  frame: AdditionalArtworkFrame,
  bounds: ArtworkFrameRect,
  imageSize?: BackgroundImageSize | null,
  options: DrawArtworkFrameOptions = {},
) {
  if (!frame.enabled) {
    return
  }

  const contentShape = getImageContentShape(imageSize)
  const contentShapePathData = contentShape
    ? createScaledImageContentShapePathData(contentShape, bounds)
    : ''
  const strokeWidth = getArtworkFrameStrokeWidth(
    frame,
    bounds.width,
    bounds.height,
    1,
  )

  context.save()

  if (isMetalArtworkFrame(frame)) {
    const pathData = contentShapePathData ||
      createMetalArtworkFramePathData(frame, bounds, strokeWidth)

    if (!pathData) {
      context.restore()
      return
    }

    const framePath = new Path2D(pathData)
    const originalAlpha = context.globalAlpha
    const materialPlan = buildMetalArtworkFrameMaterialPlan({
      bounds,
      clipMode: contentShapePathData ? 'stroke' : 'fill',
      clipPathData: pathData,
      frame,
      lightVector: getActiveArtworkFrameMaterialLightOverride(
        options.materialLightOverride,
      )?.lightVector ?? null,
      materialSeed: options.materialSeed ?? null,
      pathData,
      strokeWidth,
    })

    drawCanvasMetalFrameSurface(
      context,
      framePath,
      materialPlan,
      originalAlpha,
    )
    context.restore()
    return
  }

  if (isTexturedArtworkFrame(frame)) {
    const textureUrl = getArtworkFrameTextureUrl(frame)
    const texture = textureUrl
      ? await loadCanvasSafeImage(textureUrl, 'rocky artwork frame texture')
      : null
    const pattern = texture ? context.createPattern(texture, 'repeat') : null
    const pathData = contentShapePathData ||
      createTexturedArtworkFramePathData(frame, bounds, strokeWidth)

    if (!pathData) {
      context.restore()
      return
    }

    const framePath = new Path2D(
      pathData,
    )
    const outlineWidth = Math.max(1, strokeWidth * 0.16)

    if (contentShapePathData) {
      context.lineCap = 'round'
      context.lineJoin = 'round'
      context.strokeStyle = 'rgba(15, 23, 42, 0.58)'
      context.lineWidth = strokeWidth + outlineWidth
      context.stroke(framePath)
      context.strokeStyle = pattern ?? frame.color
      context.lineWidth = strokeWidth
      context.stroke(framePath)
      context.restore()
      return
    }

    context.fillStyle = 'rgba(15, 23, 42, 0.58)'
    context.fill(framePath, 'evenodd')
    context.fillStyle = pattern ?? frame.color
    context.fill(framePath, 'evenodd')
    context.lineCap = 'round'
    context.lineJoin = 'round'
    context.strokeStyle = 'rgba(15, 23, 42, 0.58)'
    context.lineWidth = outlineWidth
    context.stroke(framePath)
    context.restore()
    return
  }

  if (contentShapePathData) {
    const framePath = new Path2D(contentShapePathData)

    context.strokeStyle = frame.color
    context.lineWidth = strokeWidth
    context.lineCap = 'round'
    context.lineJoin = 'round'
    context.stroke(framePath)
    context.restore()
    return
  }

  context.strokeStyle = frame.color
  context.lineWidth = strokeWidth
  createBasicArtworkFramePath(context, frame, bounds, strokeWidth)
  context.stroke()
  context.restore()
}
