import type {
  MediaMarkRenderModel,
  PlatformMarkRenderModel,
} from '../mediaMarkRenderModel'
import {
  createMediaMarkRenderModel,
  createPlatformMarkRenderModels,
} from '../mediaMarkRenderModel'
import type { ProjectMediaMark, ProjectPlatformMarks } from '../project/projectTypes'
import { loadImage } from './canvasImage'

type MarkRenderModel = MediaMarkRenderModel | PlatformMarkRenderModel

async function drawMarkImage(
  context: CanvasRenderingContext2D,
  discContentSize: number,
  discOrigin: number,
  model: MarkRenderModel,
) {
  const image = await loadImage(model.imageDataUrl)
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

export async function drawMediaMark(
  context: CanvasRenderingContext2D,
  discContentSize: number,
  discOrigin: number,
  mediaMark: ProjectMediaMark,
) {
  const model = createMediaMarkRenderModel(mediaMark)

  if (!model) {
    return
  }

  await drawMarkImage(context, discContentSize, discOrigin, model)
}

export async function drawPlatformMarks(
  context: CanvasRenderingContext2D,
  discContentSize: number,
  discOrigin: number,
  platformMarks: ProjectPlatformMarks,
) {
  for (const model of createPlatformMarkRenderModels(platformMarks)) {
    await drawMarkImage(context, discContentSize, discOrigin, model)
  }
}
