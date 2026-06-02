import type { RenderBoundsPercent } from '../discGeometry'
import { loadCanvasSafeImage } from './canvasImage.ts'

type MarkImageRenderModel = {
  imageDataUrl: string
  label?: string
  layout: {
    x: number
    y: number
  }
  scaledBounds: RenderBoundsPercent
}

export async function drawMarkImage(
  context: CanvasRenderingContext2D,
  discContentSize: number,
  discOrigin: number,
  model: MarkImageRenderModel,
  imageLoader: typeof loadCanvasSafeImage = loadCanvasSafeImage,
) {
  const image = await imageLoader(
    model.imageDataUrl,
    model.label ? `${model.label} image` : 'mark image',
  )
  const maxWidth = discContentSize * (model.scaledBounds.halfWidth * 2 / 100)
  const maxHeight = discContentSize * (model.scaledBounds.halfHeight * 2 / 100)
  const naturalWidth = image.naturalWidth || image.width || 1
  const naturalHeight = image.naturalHeight || image.height || 1
  const aspectRatio = naturalWidth / naturalHeight
  let drawWidth = maxWidth
  let drawHeight = drawWidth / aspectRatio

  if (drawHeight > maxHeight) {
    drawHeight = maxHeight
    drawWidth = drawHeight * aspectRatio
  }

  const centerX = discOrigin + discContentSize * (model.layout.x / 100)
  const centerY = discOrigin + discContentSize * (model.layout.y / 100)

  context.drawImage(
    image,
    centerX - drawWidth / 2,
    centerY - drawHeight / 2,
    drawWidth,
    drawHeight,
  )
}
