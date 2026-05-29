import type { RenderBoundsPercent } from '../discGeometry'
import { loadImage } from './canvasImage'

type MarkImageRenderModel = {
  imageDataUrl: string
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
  imageLoader: typeof loadImage = loadImage,
) {
  const image = await imageLoader(model.imageDataUrl)
  const drawWidth = discContentSize * (model.scaledBounds.halfWidth * 2 / 100)
  const drawHeight = discContentSize * (model.scaledBounds.halfHeight * 2 / 100)
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
