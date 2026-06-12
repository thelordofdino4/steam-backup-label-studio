import { getImageContentShape } from '../image/imageContentShape.ts'
import type {
  AdditionalArtworkFrame,
  BackgroundImageSize,
} from '../project/projectTypes.ts'
import {
  createBasicArtworkFramePath,
  createScaledImageContentShapePathData,
  createTexturedArtworkFramePathData,
  getArtworkFrameStrokeWidth,
  getArtworkFrameTextureUrl,
  isTexturedArtworkFrame,
  type ArtworkFrameRect,
} from '../render/artworkFrame.ts'
import { loadCanvasSafeImage } from './canvasImage.ts'

export function createArtworkFrameClipPath(
  context: CanvasRenderingContext2D,
  frame: Pick<AdditionalArtworkFrame, 'shape'>,
  bounds: ArtworkFrameRect,
) {
  createBasicArtworkFramePath(context, frame, bounds)
}

export async function drawArtworkFrame(
  context: CanvasRenderingContext2D,
  frame: AdditionalArtworkFrame,
  bounds: ArtworkFrameRect,
  imageSize?: BackgroundImageSize | null,
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
