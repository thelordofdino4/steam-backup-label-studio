type CaseInsertArtworkViewportBasisRect = Readonly<{
  x: number
  y: number
  width: number
  height: number
}>

/** Keeps both image pixels and decorative frame paint inside the owned basis. */
export async function withCaseInsertArtworkViewportCanvasBasisClip<T>(
  context: Pick<
    CanvasRenderingContext2D,
    'beginPath' | 'clip' | 'rect' | 'restore' | 'save'
  >,
  basisRect: CaseInsertArtworkViewportBasisRect,
  draw: () => T | Promise<T>,
): Promise<T> {
  context.save()
  try {
    context.beginPath()
    context.rect(
      basisRect.x,
      basisRect.y,
      basisRect.width,
      basisRect.height,
    )
    context.clip()
    return await draw()
  } finally {
    context.restore()
  }
}
