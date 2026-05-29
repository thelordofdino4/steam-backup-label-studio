import {
  createMediaMarkRenderModel,
  createPlatformMarkRenderModels,
} from '../mediaMarkRenderModel'
import type { ProjectMediaMark, ProjectPlatformMarks } from '../project/projectTypes'
import { drawMarkImage } from './drawMarkImage'

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
