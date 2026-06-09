import {
  createAdditionalArtworkRenderItems,
  type AdditionalArtworkRenderItem,
} from '../project/projectAdditionalArtwork'
import type { ProjectAdditionalArtwork } from '../project/projectTypes'
import { drawImageContent, loadCanvasSafeImage } from './canvasImage'

type AdditionalArtworkCanvasBounds = {
  centerX: number
  centerY: number
  drawWidth: number
  drawHeight: number
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
    x: centerX - drawWidth / 2,
    y: centerY - drawHeight / 2,
  }
}

function createAdditionalArtworkFramePath(
  context: CanvasRenderingContext2D,
  renderItem: AdditionalArtworkRenderItem,
  bounds: AdditionalArtworkCanvasBounds,
  strokeWidth = 0,
) {
  const inset = strokeWidth / 2

  context.beginPath()

  if (renderItem.frame.shape === 'circle') {
    context.ellipse(
      bounds.centerX,
      bounds.centerY,
      Math.max(0, (bounds.drawWidth - strokeWidth) / 2),
      Math.max(0, (bounds.drawHeight - strokeWidth) / 2),
      0,
      0,
      Math.PI * 2,
    )
    return
  }

  context.rect(
    bounds.x + inset,
    bounds.y + inset,
    Math.max(0, bounds.drawWidth - strokeWidth),
    Math.max(0, bounds.drawHeight - strokeWidth),
  )
}

function drawAdditionalArtworkFrame(
  context: CanvasRenderingContext2D,
  renderItem: AdditionalArtworkRenderItem,
  bounds: AdditionalArtworkCanvasBounds,
) {
  if (!renderItem.frame.enabled) {
    return
  }

  const strokeWidth = Math.max(
    1,
    Math.min(bounds.drawWidth, bounds.drawHeight) * (renderItem.frame.width / 100),
  )

  context.save()
  context.strokeStyle = renderItem.frame.color
  context.lineWidth = strokeWidth
  createAdditionalArtworkFramePath(context, renderItem, bounds, strokeWidth)
  context.stroke()
  context.restore()
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

  if (renderItem.frame.enabled && renderItem.frame.shape === 'circle') {
    createAdditionalArtworkFramePath(context, renderItem, bounds)
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

  drawAdditionalArtworkFrame(context, renderItem, bounds)
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
