import type {
  PercentPositionedImageRenderArtifact,
  RenderPointLayout,
} from '../render/imageRenderArtifact.ts'
import {
  drawImageContent,
  getCanvasImageContentSize,
  loadCanvasSafeImage,
} from './canvasImage.ts'

type MarkImageRenderModel = Pick<
  PercentPositionedImageRenderArtifact<RenderPointLayout>,
  'imageDataUrl' | 'label' | 'layout' | 'scaledBounds' | 'imageSize'
>

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
  const contentSize = getCanvasImageContentSize(image, model.imageSize)

  if (!contentSize) {
    return
  }

  const aspectRatio = contentSize.width / contentSize.height
  let drawWidth = maxWidth
  let drawHeight = drawWidth / aspectRatio

  if (drawHeight > maxHeight) {
    drawHeight = maxHeight
    drawWidth = drawHeight * aspectRatio
  }

  const centerX = discOrigin + discContentSize * (model.layout.x / 100)
  const centerY = discOrigin + discContentSize * (model.layout.y / 100)

  drawImageContent(
    context,
    image,
    model.imageSize,
    {
      x: centerX - drawWidth / 2,
      y: centerY - drawHeight / 2,
      width: drawWidth,
      height: drawHeight,
    },
  )
}
