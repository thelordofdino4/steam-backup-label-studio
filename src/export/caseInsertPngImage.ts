import { hasImageContentShape } from '../image/imageContentShape'
import type { JewelCaseImageFitResult, JewelCasePixelRect } from '../layout/jewelCaseLayout'
import type {
  JewelCaseSpineBoxLayout,
} from '../layout/jewelCaseSpineLayout'
import type {
  ProjectCaseInsertImageSlot,
} from '../project/projectTypes'
import type {
  RectPositionedImageRenderArtifact,
} from '../render/imageRenderArtifact'
import {
  drawImageContent,
  getCanvasImageContentSize,
  loadCanvasSafeImage,
} from './canvasImage'
import {
  createArtworkFrameClipPath,
  drawArtworkFrame,
} from './drawArtworkFrame'

export async function drawImageFit(
  context: CanvasRenderingContext2D,
  fit: JewelCaseImageFitResult | null,
  imageDataUrl: string | null,
  description: string,
  beforeImage?: () => void,
  afterImage?: () => void,
) {
  if (!fit || !imageDataUrl) {
    return
  }

  const image = await loadCanvasSafeImage(imageDataUrl, description)

  context.save()
  beforeImage?.()
  context.beginPath()
  context.rect(
    fit.region.x,
    fit.region.y,
    fit.region.width,
    fit.region.height,
  )
  context.clip()

  if (fit.sourceRect.width <= 0 || fit.sourceRect.height <= 0) {
    context.restore()
    return
  }

  context.drawImage(
    image,
    fit.sourceRect.x,
    fit.sourceRect.y,
    fit.sourceRect.width,
    fit.sourceRect.height,
    fit.visibleRect.x,
    fit.visibleRect.y,
    fit.visibleRect.width,
    fit.visibleRect.height,
  )
  afterImage?.()
  context.restore()
}

export async function drawImageArtifactInRect(
  context: CanvasRenderingContext2D,
  artifact: RectPositionedImageRenderArtifact | null,
) {
  if (!artifact) {
    return
  }

  const image = await loadCanvasSafeImage(artifact.imageDataUrl, artifact.label)

  drawImageContent(
    context,
    image,
    artifact.imageSize,
    artifact.rect,
  )
}

export async function drawImageSlotInRect(
  context: CanvasRenderingContext2D,
  slot: ProjectCaseInsertImageSlot,
  rect: JewelCasePixelRect | null,
  description: string,
) {
  if (!rect || !slot.imageDataUrl) {
    return
  }

  const image = await loadCanvasSafeImage(slot.imageDataUrl, description)

  context.save()
  if (
    slot.frame.enabled &&
    slot.frame.shape === 'circle' &&
    !hasImageContentShape(slot.imageSize)
  ) {
    createArtworkFrameClipPath(context, slot.frame, rect)
    context.clip()
  }
  drawImageContent(context, image, slot.imageSize, rect)
  context.restore()

  await drawArtworkFrame(context, slot.frame, rect, slot.imageSize)
}

export async function drawContainImageInLocalBox(
  context: CanvasRenderingContext2D,
  imageDataUrl: string,
  imageSize: ProjectCaseInsertImageSlot['imageSize'],
  width: number,
  height: number,
  description: string,
) {
  const image = await loadCanvasSafeImage(imageDataUrl, description)
  const contentSize = getCanvasImageContentSize(image, imageSize)

  if (!contentSize) {
    return
  }

  const scale = Math.min(width / contentSize.width, height / contentSize.height)
  const drawWidth = contentSize.width * scale
  const drawHeight = contentSize.height * scale

  drawImageContent(
    context,
    image,
    imageSize,
    {
      x: -drawWidth / 2,
      y: -drawHeight / 2,
      width: drawWidth,
      height: drawHeight,
    },
  )
}

export function drawWithTransformedBox(
  context: CanvasRenderingContext2D,
  box: JewelCaseSpineBoxLayout,
  draw: () => void | Promise<void>,
) {
  context.save()
  context.translate(box.center.x, box.center.y)
  context.rotate(box.rotationDegrees * Math.PI / 180)
  context.beginPath()
  context.rect(-box.width / 2, -box.height / 2, box.width, box.height)
  context.clip()

  const result = draw()

  if (result instanceof Promise) {
    return result.finally(() => context.restore())
  }

  context.restore()
  return undefined
}
