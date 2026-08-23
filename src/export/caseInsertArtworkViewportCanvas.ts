import type { AdditionalArtworkFrame } from '../project/projectTypes.ts'
import type {
  CaseInsertArtworkViewportRenderArtifact,
} from '../render/caseInsertArtworkViewportRenderArtifact.ts'
import {
  getCanvasImageStoredSourceRect,
  loadCanvasSafeImage,
} from './canvasImage.ts'
import {
  createArtworkFrameClipPath,
  drawArtworkFrame,
} from './drawArtworkFrame.ts'
import {
  withCaseInsertArtworkViewportCanvasBasisClip,
} from './caseInsertArtworkViewportCanvasBasisClip.ts'

export async function drawCaseInsertArtworkViewportArtifact(
  context: CanvasRenderingContext2D,
  artifact: CaseInsertArtworkViewportRenderArtifact,
  frame: AdditionalArtworkFrame,
) {
  const image = await loadCanvasSafeImage(
    artifact.imageDataUrl,
    artifact.label,
  )
  const imageSize = artifact.imageSize
  if (!imageSize) return false

  const sourceRect = getCanvasImageStoredSourceRect(
    image,
    imageSize,
    artifact.visibleSourceRect,
  )
  if (!sourceRect) return false

  return withCaseInsertArtworkViewportCanvasBasisClip(
    context,
    artifact.basisRect,
    async () => {
      context.translate(artifact.box.center.x, artifact.box.center.y)
      context.rotate(artifact.box.rotationDegrees * Math.PI / 180)

      context.save()
      try {
        context.beginPath()
        createArtworkFrameClipPath(
          context,
          frame.enabled && frame.shape === 'circle'
            ? frame
            : { shape: 'rectangle' },
          artifact.clipRect,
        )
        context.clip()
        context.drawImage(
          image,
          sourceRect.x,
          sourceRect.y,
          sourceRect.width,
          sourceRect.height,
          artifact.destinationRect.x,
          artifact.destinationRect.y,
          artifact.destinationRect.width,
          artifact.destinationRect.height,
        )
      } finally {
        context.restore()
      }

      await drawArtworkFrame(
        context,
        frame,
        artifact.localFrameRect,
        null,
      )
      return true
    },
  )
}
