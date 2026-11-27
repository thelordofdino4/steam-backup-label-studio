import type { BackgroundImageSize, BackgroundOffset } from '../project/projectTypes.ts'
import {
  projectBackgroundImageLayout,
  resolveBackgroundImageLayout,
} from '../image/backgroundImage.ts'
import { drawImageContent, getCanvasImageContentSize } from './canvasImage.ts'

export function drawBackgroundArtwork(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  imageSize: BackgroundImageSize | null,
  scale: number,
  offset: BackgroundOffset,
  coordinateSize: number,
  outputSize: number,
  origin: number,
  surfaceAlreadyClipped = false,
) {
  const contentSize = getCanvasImageContentSize(image, imageSize)
  if (!contentSize) return

  // Preserve the legacy missing-metadata fallback to the loaded image's size.
  const layout = projectBackgroundImageLayout(
    resolveBackgroundImageLayout(imageSize ?? contentSize, scale, offset, coordinateSize),
    outputSize,
    { x: origin, y: origin },
  )
  context.save()
  try {
    // The production Disc layer stack already clips all its content once.
    // Reapplying an antialiased clip can change boundary pixels.
    if (!surfaceAlreadyClipped) {
      context.beginPath()
      context.arc(layout.clip.center.x, layout.clip.center.y, layout.clip.radius, 0, Math.PI * 2)
      context.clip()
    }
    drawImageContent(context, image, imageSize, layout.contentRect)
  } finally {
    context.restore()
  }
}
