import { createAdditionalArtworkRenderItems } from '../project/projectAdditionalArtwork'
import type { ProjectAdditionalArtwork } from '../project/projectTypes'
import { drawMarkImage } from './drawMarkImage'

export async function drawAdditionalArtwork(
  context: CanvasRenderingContext2D,
  discContentSize: number,
  discOrigin: number,
  additionalArtwork: ProjectAdditionalArtwork,
) {
  for (const renderItem of createAdditionalArtworkRenderItems(additionalArtwork)) {
    await drawMarkImage(context, discContentSize, discOrigin, {
      imageDataUrl: renderItem.imageDataUrl,
      layout: renderItem.layout,
      scaledBounds: renderItem.scaledBounds,
    })
  }
}
