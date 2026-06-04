import { createPlatformMarkRenderModels } from '../render/platformMarkRenderModel'
import type { ProjectPlatformMarks } from '../project/projectTypes'
import { drawMarkImage } from './drawMarkImage'

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
