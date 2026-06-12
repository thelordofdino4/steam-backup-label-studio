import {
  createAdditionalArtworkRenderItems,
  type AdditionalArtworkRenderItem,
} from '../project/projectAdditionalArtwork'
import { hasImageContentShape } from '../image/imageContentShape'
import type { ProjectAdditionalArtwork } from '../project/projectTypes'
import { drawImageContent, loadCanvasSafeImage } from './canvasImage'
import { createArtworkFrameClipPath, drawArtworkFrame } from './drawArtworkFrame'

type AdditionalArtworkCanvasBounds = {
  centerX: number
  centerY: number
  drawWidth: number
  drawHeight: number
  height: number
  width: number
  x: number
  y: number
}

function getCanvasBounds(
  discContentSize: number,
  discOrigin: number,
  renderItem: AdditionalArtworkRenderItem,
): AdditionalArtworkCanvasBounds {
  const drawWidth = discContentSize * (renderItem.scaledBounds.halfWidth * 2 / 100)
  const drawHeight = discContentSize * (renderItem.scaledBounds.halfHeight * 2 / 100)
  const centerX = discOrigin + discContentSize * (renderItem.layout.x / 100)
  const centerY = discOrigin + discContentSize * (renderItem.layout.y / 100)

  return {
    centerX,
    centerY,
    drawWidth,
    drawHeight,
    height: drawHeight,
    width: drawWidth,
    x: centerX - drawWidth / 2,
    y: centerY - drawHeight / 2,
  }
}

async function drawAdditionalArtworkItem(
  context: CanvasRenderingContext2D,
  discContentSize: number,
  discOrigin: number,
  renderItem: AdditionalArtworkRenderItem,
) {
  const image = await loadCanvasSafeImage(
    renderItem.imageDataUrl,
    `${renderItem.label} image`,
  )
  const bounds = getCanvasBounds(discContentSize, discOrigin, renderItem)

  context.save()

  if (
    renderItem.frame.enabled &&
    renderItem.frame.shape === 'circle' &&
    !hasImageContentShape(renderItem.imageSize)
  ) {
    createArtworkFrameClipPath(context, renderItem.frame, bounds)
    context.clip()
  }

  drawImageContent(
    context,
    image,
    renderItem.imageSize,
    {
      x: bounds.x,
      y: bounds.y,
      width: bounds.drawWidth,
      height: bounds.drawHeight,
    },
  )
  context.restore()

  await drawArtworkFrame(context, renderItem.frame, bounds, renderItem.imageSize)
}

export async function drawAdditionalArtwork(
  context: CanvasRenderingContext2D,
  discContentSize: number,
  discOrigin: number,
  additionalArtwork: ProjectAdditionalArtwork,
) {
  for (const renderItem of createAdditionalArtworkRenderItems(additionalArtwork)) {
    await drawAdditionalArtworkItem(
      context,
      discContentSize,
      discOrigin,
      renderItem,
    )
  }
}
