export type InlinePreviewTextHostLocalPoint = {
  x: number
  y: number
}

export type InlinePreviewTextHostLocalPointOptions = {
  clientX: number
  clientY: number
  hostHeight: number
  hostRect: Pick<DOMRect, 'height' | 'left' | 'top' | 'width'>
  hostWidth: number
  rotationDegrees?: number
}

export function mapClientPointToInlineTextHostLocalPoint({
  clientX,
  clientY,
  hostHeight,
  hostRect,
  hostWidth,
  rotationDegrees = 0,
}: InlinePreviewTextHostLocalPointOptions): InlinePreviewTextHostLocalPoint {
  if (!Number.isFinite(rotationDegrees) || Math.abs(rotationDegrees) < 0.001) {
    return {
      x: clientX - hostRect.left,
      y: clientY - hostRect.top,
    }
  }

  const centerX = hostRect.left + hostRect.width / 2
  const centerY = hostRect.top + hostRect.height / 2
  const radians = -rotationDegrees * Math.PI / 180
  const cos = Math.cos(radians)
  const sin = Math.sin(radians)
  const translatedX = clientX - centerX
  const translatedY = clientY - centerY

  return {
    x: translatedX * cos - translatedY * sin + hostWidth / 2,
    y: translatedX * sin + translatedY * cos + hostHeight / 2,
  }
}
