import { createTechnicalMarkRenderModels } from '../technicalMarkRenderModel'
import type { ProjectTechnicalMarks } from '../project/projectTypes'
import { drawMarkImage } from './drawMarkImage'

export async function drawTechnicalMarks(
  context: CanvasRenderingContext2D,
  discContentSize: number,
  discOrigin: number,
  technicalMarks: ProjectTechnicalMarks,
) {
  for (const model of createTechnicalMarkRenderModels(technicalMarks)) {
    await drawMarkImage(context, discContentSize, discOrigin, model)
  }
}
