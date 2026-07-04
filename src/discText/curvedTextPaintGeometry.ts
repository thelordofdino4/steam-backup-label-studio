import type { CurvedTextLineLayout } from './curvedTextLayout.ts'

export const DISC_TEXT_CURVED_STROKE_WIDTH = 0.28
export const DISC_TEXT_CURVED_UNDERLINE_OFFSET_FACTOR = 0.42
export const DISC_TEXT_CURVED_UNDERLINE_STROKE_FACTOR = 0.08

type CurvedTextPaintStyle = {
  contrast: string
  underline?: boolean
}

export type CurvedDiscTextPaintBox = {
  bottom: number
  left: number
  right: number
  top: number
}

type CurvedLinePaintLayout = Pick<
  CurvedTextLineLayout,
  | 'angleWidthDegrees'
  | 'radius'
  | 'startAngleDegrees'
>

function hasCurvedDiscTextShadow(style: CurvedTextPaintStyle) {
  return style.contrast === 'shadow' || style.contrast === 'strokeShadow'
}

function hasCurvedDiscTextStroke(style: CurvedTextPaintStyle) {
  return style.contrast === 'stroke' || style.contrast === 'strokeShadow'
}

export function getCurvedUnderlineRadius(
  isTopArc: boolean,
  radius: number,
  fontSize: number,
) {
  const offset = fontSize * DISC_TEXT_CURVED_UNDERLINE_OFFSET_FACTOR
  return Math.max(1, isTopArc ? radius - offset : radius + offset)
}

function getArcPoint(radius: number, angleDegrees: number) {
  const radians = (angleDegrees * Math.PI) / 180

  return {
    x: 50 + Math.cos(radians) * radius,
    y: 50 + Math.sin(radians) * radius,
  }
}

function getCurvedPaintRadialSlack({
  fontSize,
  renderStyle,
}: {
  fontSize: number
  renderStyle: CurvedTextPaintStyle
}) {
  const shadowSlack = hasCurvedDiscTextShadow(renderStyle) ? 1.4 : 0
  const strokeSlack = hasCurvedDiscTextStroke(renderStyle)
    ? DISC_TEXT_CURVED_STROKE_WIDTH / 2
    : 0
  const underlineSlack = renderStyle.underline
    ? fontSize * (
        DISC_TEXT_CURVED_UNDERLINE_OFFSET_FACTOR +
        DISC_TEXT_CURVED_UNDERLINE_STROKE_FACTOR
      )
    : 0

  return Math.max(
    0.9,
    fontSize * 0.72,
    strokeSlack + shadowSlack + underlineSlack,
  )
}

export function getCurvedLinePaintBox({
  fontSize,
  isTopArc,
  lineLayout,
  renderStyle,
}: {
  fontSize: number
  isTopArc: boolean
  lineLayout: CurvedLinePaintLayout
  renderStyle: CurvedTextPaintStyle
}): CurvedDiscTextPaintBox | null {
  if (lineLayout.angleWidthDegrees <= 0) return null

  const radialSlack = getCurvedPaintRadialSlack({ fontSize, renderStyle })
  const sampleCount = Math.max(
    6,
    Math.ceil(lineLayout.angleWidthDegrees / 8),
  )
  const radii = [
    Math.max(1, lineLayout.radius - radialSlack),
    lineLayout.radius + radialSlack,
  ]
  const points = []

  for (let index = 0; index <= sampleCount; index += 1) {
    const angle =
      lineLayout.startAngleDegrees +
      (lineLayout.angleWidthDegrees * index) / sampleCount *
        (isTopArc ? 1 : -1)

    for (const radius of radii) {
      points.push(getArcPoint(radius, angle))
    }
  }

  return {
    bottom: Math.max(...points.map((point) => point.y)),
    left: Math.min(...points.map((point) => point.x)),
    right: Math.max(...points.map((point) => point.x)),
    top: Math.min(...points.map((point) => point.y)),
  }
}

export function getCurvedLinePaintSegmentBoxes({
  fontSize,
  isTopArc,
  lineLayout,
  renderStyle,
}: {
  fontSize: number
  isTopArc: boolean
  lineLayout: CurvedLinePaintLayout
  renderStyle: CurvedTextPaintStyle
}): CurvedDiscTextPaintBox[] {
  if (lineLayout.angleWidthDegrees <= 0) return []

  const radialSlack = getCurvedPaintRadialSlack({ fontSize, renderStyle })
  const segmentCount = Math.max(
    1,
    Math.ceil(lineLayout.angleWidthDegrees / 8),
  )
  const direction = isTopArc ? 1 : -1
  const radii = [
    Math.max(1, lineLayout.radius - radialSlack),
    lineLayout.radius + radialSlack,
  ]

  return Array.from({ length: segmentCount }, (_, segmentIndex) => {
    const startProgress = segmentIndex / segmentCount
    const endProgress = (segmentIndex + 1) / segmentCount
    const midProgress = (startProgress + endProgress) / 2
    const angles = [startProgress, midProgress, endProgress].map((progress) =>
      lineLayout.startAngleDegrees +
        direction * lineLayout.angleWidthDegrees * progress)
    const points = angles.flatMap((angle) =>
      radii.map((radius) => getArcPoint(radius, angle)))

    return {
      bottom: Math.max(...points.map((point) => point.y)),
      left: Math.min(...points.map((point) => point.x)),
      right: Math.max(...points.map((point) => point.x)),
      top: Math.min(...points.map((point) => point.y)),
    }
  })
}
