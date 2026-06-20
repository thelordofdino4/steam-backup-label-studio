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

export type InlinePreviewTextGeometryLinePoint = {
  caretXRatios: readonly number[]
  heightRatio: number
  topRatio: number
}

export type InlinePreviewTextGeometryOffset = {
  lineIndex: number
  offset: number
}

export type InlinePreviewTextGeometryOffsetOptions =
  InlinePreviewTextHostLocalPointOptions & {
    geometryLines: readonly InlinePreviewTextGeometryLinePoint[]
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

function getGeometryLineFrame({
  geometryLine,
  hostHeight,
}: {
  geometryLine: InlinePreviewTextGeometryLinePoint
  hostHeight: number
}) {
  const top = geometryLine.topRatio * hostHeight
  const height = Math.max(1, geometryLine.heightRatio * hostHeight)

  return {
    bottom: top + height,
    height,
    top,
  }
}

function getNearestGeometryLine({
  geometryLines,
  hostHeight,
  localY,
}: {
  geometryLines: readonly InlinePreviewTextGeometryLinePoint[]
  hostHeight: number
  localY: number
}) {
  let nearestLineIndex = 0
  let nearestDistance = Number.POSITIVE_INFINITY

  for (let lineIndex = 0; lineIndex < geometryLines.length; lineIndex += 1) {
    const frame = getGeometryLineFrame({
      geometryLine: geometryLines[lineIndex],
      hostHeight,
    })
    const distance =
      localY >= frame.top && localY <= frame.bottom
        ? 0
        : Math.min(
            Math.abs(localY - frame.top),
            Math.abs(localY - frame.bottom),
          )

    if (distance < nearestDistance) {
      nearestDistance = distance
      nearestLineIndex = lineIndex
    }
  }

  if (geometryLines.length === 0) {
    return null
  }

  return {
    line: geometryLines[nearestLineIndex],
    lineIndex: nearestLineIndex,
  }
}

function getNearestGeometryTextOffset({
  geometryLine,
  hostWidth,
  localX,
}: {
  geometryLine: InlinePreviewTextGeometryLinePoint
  hostWidth: number
  localX: number
}) {
  const caretXs = geometryLine.caretXRatios.map(
    (ratio) => ratio * hostWidth,
  )
  let nearestOffset = 0
  let nearestDistance = Number.POSITIVE_INFINITY

  for (let offset = 0; offset < caretXs.length; offset += 1) {
    const distance = Math.abs(localX - caretXs[offset])

    if (distance <= nearestDistance) {
      nearestOffset = offset
      nearestDistance = distance
    }
  }

  return nearestOffset
}

export function getInlinePreviewTextGeometryOffsetForClientPoint({
  clientX,
  clientY,
  geometryLines,
  hostHeight,
  hostRect,
  hostWidth,
  rotationDegrees,
}: InlinePreviewTextGeometryOffsetOptions): InlinePreviewTextGeometryOffset | null {
  const localPoint = mapClientPointToInlineTextHostLocalPoint({
    clientX,
    clientY,
    hostHeight,
    hostRect,
    hostWidth,
    rotationDegrees,
  })
  const nearestGeometryLine = getNearestGeometryLine({
    geometryLines,
    hostHeight,
    localY: localPoint.y,
  })

  if (!nearestGeometryLine) {
    return null
  }

  return {
    lineIndex: nearestGeometryLine.lineIndex,
    offset: getNearestGeometryTextOffset({
      geometryLine: nearestGeometryLine.line,
      hostWidth,
      localX: localPoint.x,
    }),
  }
}
