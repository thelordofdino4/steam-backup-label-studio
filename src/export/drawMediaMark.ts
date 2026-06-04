import { createMediaMarkRenderModel } from '../render/mediaMarkRenderModel'
import type { ProjectMediaMark } from '../project/projectTypes'
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
