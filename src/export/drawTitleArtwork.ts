import { createTitleArtworkRenderItem } from '../project/projectTitleArtwork'
import type { ProjectTitleArtwork } from '../project/projectTypes'
import { drawMarkImage } from './drawMarkImage'

export async function drawTitleArtwork(
  context: CanvasRenderingContext2D,
  discContentSize: number,
  discOrigin: number,
  titleArtwork: ProjectTitleArtwork,
) {
  const renderItem = createTitleArtworkRenderItem(titleArtwork)

  if (!renderItem) {
    return
  }

  await drawMarkImage(context, discContentSize, discOrigin, renderItem)
}
