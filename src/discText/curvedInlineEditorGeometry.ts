import {
  getCopyrightArcSide,
  getReadableCurvedTextScale,
  type DiscTextLayout,
  type SteamLogoPlacement,
} from './index.ts'
import {
  getResolvedDiscTextFontSizePercent,
} from './pointSize.ts'
import type { DiscTemplate } from '../types/template.ts'
import type { CurvedDiscTextLineGeometry } from './svgLayer.ts'

export type CurvedDiscTextEditorBounds = {
  centerX: number
  centerY: number
  halfHeight: number
  halfWidth: number
}

export type CurvedDiscTextPaintBox = {
  bottom: number
  left: number
  right: number
  top: number
}

export type CurvedDiscTextHostGeometry = {
  bounds: CurvedDiscTextEditorBounds
  lines: readonly CurvedDiscTextLineGeometry[]
}

export type CurvedDiscTextHostRect = {
  height: number
  left: number
  top: number
  width: number
}

export type CurvedDiscTextHostSize = {
  hostHeight: number
  hostWidth: number
}

export type CurvedDiscTextCaretFrame = {
  height: number
  left: number
  pathD?: string
  rotationDegrees: number
  strokeWidth?: number
  top: number
  viewportHeight?: number
  viewportWidth?: number
}

export type CurvedDiscTextSelectionFrame = {
  height: number
  left: number
  pathD?: string
  rotationDegrees: number
  strokeWidth?: number
  top: number
  viewportHeight?: number
  viewportWidth?: number
  width: number
}

function degreesToRadians(degrees: number) {
  return (degrees * Math.PI) / 180
}

function getArcPoint(radius: number, angleDegrees: number) {
  const radians = degreesToRadians(angleDegrees)
  return {
    x: 50 + Math.cos(radians) * radius,
    y: 50 + Math.sin(radians) * radius,
  }
}

function getSampledArcAngles(centerAngleDegrees: number, arcDegrees: number) {
  const halfArc = Math.max(0, Math.min(360, arcDegrees)) / 2
  const start = centerAngleDegrees - halfArc
  const end = centerAngleDegrees + halfArc
  const sampleCount = 24

  return Array.from({ length: sampleCount + 1 }, (_, index) =>
    start + ((end - start) * index) / sampleCount)
}

function clampValue(value: number, min: number, max: number) {
  if (max < min) return min

  return Math.min(Math.max(value, min), max)
}

function normalizeAngleDegrees(angle: number) {
  return ((angle % 360) + 360) % 360
}

function getLineRangeStart({
  caretValue,
  lineIndex,
  lines,
}: {
  caretValue: string
  lineIndex: number
  lines: readonly { text: string }[]
}) {
  let searchStart = 0

  for (let index = 0; index < lines.length; index += 1) {
    const lineText = lines[index]?.text ?? ''
    const exactLineStart = lineText
      ? caretValue.indexOf(lineText, searchStart)
      : searchStart
    const lineStart = exactLineStart >= 0 ? exactLineStart : searchStart
    const lineEnd = clampValue(
      lineStart + lineText.length,
      lineStart,
      caretValue.length,
    )

    if (index === lineIndex) {
      return lineStart
    }

    searchStart = lineEnd
    while (
      searchStart < caretValue.length &&
      /\s/.test(caretValue.charAt(searchStart))
    ) {
      searchStart += 1
    }
  }

  return caretValue.length
}

function getLineOffsetForCaretIndex({
  caretIndex,
  caretValue,
  lines,
}: {
  caretIndex: number
  caretValue: string
  lines: readonly { text: string }[]
}) {
  const normalizedCaret = clampValue(caretIndex, 0, caretValue.length)
  let searchStart = 0

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const lineText = lines[lineIndex]?.text ?? ''
    const exactLineStart = lineText
      ? caretValue.indexOf(lineText, searchStart)
      : searchStart
    const lineStart = exactLineStart >= 0 ? exactLineStart : searchStart
    const lineEnd = clampValue(
      lineStart + lineText.length,
      lineStart,
      caretValue.length,
    )
    const nextLine = lines[lineIndex + 1]

    if (normalizedCaret <= lineEnd || !nextLine) {
      return {
        lineIndex,
        offset: clampValue(normalizedCaret - lineStart, 0, lineText.length),
      }
    }

    searchStart = lineEnd
    while (
      searchStart < caretValue.length &&
      /\s/.test(caretValue.charAt(searchStart))
    ) {
      searchStart += 1
    }
  }

  return { lineIndex: 0, offset: 0 }
}

function percentToHostLocal({
  bounds,
  hostHeight,
  hostWidth,
  x,
  y,
}: CurvedDiscTextHostGeometry & CurvedDiscTextHostSize & {
  x: number
  y: number
}) {
  const boundsWidth = Math.max(0.01, bounds.halfWidth * 2)
  const boundsHeight = Math.max(0.01, bounds.halfHeight * 2)
  const left = bounds.centerX - boundsWidth / 2
  const top = bounds.centerY - boundsHeight / 2

  return {
    x: ((x - left) / boundsWidth) * hostWidth,
    y: ((y - top) / boundsHeight) * hostHeight,
  }
}

function getArcProgress(line: CurvedDiscTextLineGeometry, angleDegrees: number) {
  const total = Math.max(0.001, line.angleWidthDegrees)
  const intervalStart = line.isTopArc
    ? line.startAngleDegrees
    : line.startAngleDegrees - total
  const intervalEnd = line.isTopArc
    ? line.startAngleDegrees + total
    : line.startAngleDegrees
  const candidates = [-360, 0, 360].map((delta) => angleDegrees + delta)
  const unwrappedAngle = candidates.reduce((best, candidate) => {
    const distanceToInterval = candidate < intervalStart
      ? intervalStart - candidate
      : candidate > intervalEnd
        ? candidate - intervalEnd
        : 0
    const bestDistance = best < intervalStart
      ? intervalStart - best
      : best > intervalEnd
        ? best - intervalEnd
        : 0

    return distanceToInterval < bestDistance ? candidate : best
  }, candidates[1] ?? angleDegrees)

  const delta = line.isTopArc
    ? unwrappedAngle - line.startAngleDegrees
    : line.startAngleDegrees - unwrappedAngle

  return clampValue(delta / total, 0, 1)
}

function getAngleForLineProgress(
  line: CurvedDiscTextLineGeometry,
  progress: number,
) {
  const direction = line.isTopArc ? 1 : -1

  return line.startAngleDegrees +
    direction * line.angleWidthDegrees * clampValue(progress, 0, 1)
}

function getPointOnLine(line: CurvedDiscTextLineGeometry, progress: number) {
  return getArcPoint(line.radius, getAngleForLineProgress(line, progress))
}

function getFallbackLineBoundaryProgresses(line: CurvedDiscTextLineGeometry) {
  const length = Math.max(1, line.text.length)

  return Array.from({ length: length + 1 }, (_, offset) => ({
    offset,
    progress: offset / length,
  }))
}

function getLineBoundaryProgresses(line: CurvedDiscTextLineGeometry) {
  return line.boundaryProgresses?.length
    ? line.boundaryProgresses
    : getFallbackLineBoundaryProgresses(line)
}

function getLineTextLength(line: CurvedDiscTextLineGeometry) {
  const boundaries = getLineBoundaryProgresses(line)
  return boundaries[boundaries.length - 1]?.offset ?? line.text.length
}

function getLineProgressForOffset(
  line: CurvedDiscTextLineGeometry,
  offset: number,
) {
  const boundaries = getLineBoundaryProgresses(line)
  const normalizedOffset = clampValue(offset, 0, getLineTextLength(line))
  let previous = boundaries[0] ?? { offset: 0, progress: 0 }

  for (const boundary of boundaries) {
    if (boundary.offset === normalizedOffset) {
      return boundary.progress
    }

    if (boundary.offset > normalizedOffset) {
      const span = boundary.offset - previous.offset
      const ratio = span > 0
        ? (normalizedOffset - previous.offset) / span
        : 0

      return previous.progress +
        (boundary.progress - previous.progress) * clampValue(ratio, 0, 1)
    }

    previous = boundary
  }

  return previous.progress
}

function getLineOffsetForProgress(
  line: CurvedDiscTextLineGeometry,
  progress: number,
) {
  const boundaries = getLineBoundaryProgresses(line)
  const normalizedProgress = clampValue(progress, 0, 1)
  let nearest = boundaries[0] ?? { offset: 0, progress: 0 }
  let nearestDistance = Math.abs(nearest.progress - normalizedProgress)

  for (const boundary of boundaries) {
    const distance = Math.abs(boundary.progress - normalizedProgress)

    if (distance <= nearestDistance) {
      nearest = boundary
      nearestDistance = distance
    }
  }

  return nearest.offset
}

function formatPathNumber(value: number) {
  return Number.isFinite(value) ? Number(value.toFixed(3)) : 0
}

function getRadialCaretRotationDegrees(angleDegrees: number) {
  return normalizeAngleDegrees(angleDegrees - 90)
}

function getTangentSelectionRotationDegrees(angleDegrees: number) {
  return normalizeAngleDegrees(angleDegrees + 90)
}

function getFrameHeight({
  bounds,
  fontSize,
  hostHeight,
}: CurvedDiscTextHostSize & {
  bounds: CurvedDiscTextEditorBounds
  fontSize: number
}) {
  const boundsHeight = Math.max(0.01, bounds.halfHeight * 2)

  return Math.max(8, (fontSize / boundsHeight) * hostHeight * 1.35)
}

function getLocalArcRadius({
  bounds,
  hostHeight,
  hostWidth,
  radius,
}: CurvedDiscTextHostSize & {
  bounds: CurvedDiscTextEditorBounds
  radius: number
}) {
  const boundsWidth = Math.max(0.01, bounds.halfWidth * 2)
  const boundsHeight = Math.max(0.01, bounds.halfHeight * 2)

  return {
    x: (radius / boundsWidth) * hostWidth,
    y: (radius / boundsHeight) * hostHeight,
  }
}

function getCurvedSelectionPath({
  endProgress,
  geometry,
  hostHeight,
  hostWidth,
  line,
  startProgress,
}: CurvedDiscTextHostSize & {
  endProgress: number
  geometry: CurvedDiscTextHostGeometry
  line: CurvedDiscTextLineGeometry
  startProgress: number
}) {
  const startPoint = getPointOnLine(line, startProgress)
  const endPoint = getPointOnLine(line, endProgress)
  const localStart = percentToHostLocal({
    ...geometry,
    hostHeight,
    hostWidth,
    x: startPoint.x,
    y: startPoint.y,
  })
  const localEnd = percentToHostLocal({
    ...geometry,
    hostHeight,
    hostWidth,
    x: endPoint.x,
    y: endPoint.y,
  })
  const radii = getLocalArcRadius({
    bounds: geometry.bounds,
    hostHeight,
    hostWidth,
    radius: line.radius,
  })
  const angleSpan = Math.abs(endProgress - startProgress) *
    line.angleWidthDegrees
  const largeArcFlag = angleSpan > 180 ? 1 : 0
  const sweepFlag = line.isTopArc ? 1 : 0

  return [
    'M',
    formatPathNumber(localStart.x),
    formatPathNumber(localStart.y),
    'A',
    formatPathNumber(radii.x),
    formatPathNumber(radii.y),
    0,
    largeArcFlag,
    sweepFlag,
    formatPathNumber(localEnd.x),
    formatPathNumber(localEnd.y),
  ].join(' ')
}

function getCurvedCaretPath({
  geometry,
  height,
  hostHeight,
  hostWidth,
  point,
}: CurvedDiscTextHostSize & {
  geometry: CurvedDiscTextHostGeometry
  height: number
  point: { x: number; y: number }
}) {
  const localPoint = percentToHostLocal({
    ...geometry,
    hostHeight,
    hostWidth,
    x: point.x,
    y: point.y,
  })
  const localCenter = percentToHostLocal({
    ...geometry,
    hostHeight,
    hostWidth,
    x: 50,
    y: 50,
  })
  const directionX = localPoint.x - localCenter.x
  const directionY = localPoint.y - localCenter.y
  const magnitude = Math.max(0.001, Math.hypot(directionX, directionY))
  const unitX = directionX / magnitude
  const unitY = directionY / magnitude
  const halfHeight = height / 2

  return [
    'M',
    formatPathNumber(localPoint.x - unitX * halfHeight),
    formatPathNumber(localPoint.y - unitY * halfHeight),
    'L',
    formatPathNumber(localPoint.x + unitX * halfHeight),
    formatPathNumber(localPoint.y + unitY * halfHeight),
  ].join(' ')
}

function getLineOffsetFromClientPoint({
  clientX,
  clientY,
  geometry,
  hostHeight,
  hostRect,
  hostWidth,
}: {
  clientX: number
  clientY: number
  geometry: CurvedDiscTextHostGeometry
  hostHeight: number
  hostRect: CurvedDiscTextHostRect
  hostWidth: number
}) {
  if (geometry.lines.length === 0) return null

  const boundsWidth = Math.max(0.01, geometry.bounds.halfWidth * 2)
  const boundsHeight = Math.max(0.01, geometry.bounds.halfHeight * 2)
  const localX = clientX - hostRect.left
  const localY = clientY - hostRect.top
  const x = geometry.bounds.centerX - boundsWidth / 2 +
    (localX / Math.max(1, hostWidth)) * boundsWidth
  const y = geometry.bounds.centerY - boundsHeight / 2 +
    (localY / Math.max(1, hostHeight)) * boundsHeight
  const radius = Math.hypot(x - 50, y - 50)
  const angle = normalizeAngleDegrees(
    Math.atan2(y - 50, x - 50) * (180 / Math.PI),
  )
  let nearestLineIndex = 0
  let nearestDistance = Number.POSITIVE_INFINITY

  for (let index = 0; index < geometry.lines.length; index += 1) {
    const line = geometry.lines[index]
    const progress = getArcProgress(line, angle)
    const point = getPointOnLine(line, progress)
    const distance = Math.hypot(x - point.x, y - point.y) +
      Math.abs(radius - line.radius) * 0.4

    if (distance < nearestDistance) {
      nearestDistance = distance
      nearestLineIndex = index
    }
  }

  const line = geometry.lines[nearestLineIndex]
  const progress = getArcProgress(line, angle)

  return {
    lineIndex: nearestLineIndex,
    offset: getLineOffsetForProgress(line, progress),
  }
}

export function getCurvedDiscTextProgressForSvgPoint(
  line: CurvedDiscTextLineGeometry,
  point: { x: number; y: number },
) {
  const angle = normalizeAngleDegrees(
    Math.atan2(point.y - 50, point.x - 50) * (180 / Math.PI),
  )

  return getArcProgress(line, angle)
}

export function getCurvedDiscTextOffsetForSvgPoint({
  geometry,
  x,
  y,
}: {
  geometry: CurvedDiscTextHostGeometry
  x: number
  y: number
}) {
  if (geometry.lines.length === 0) return null

  const radius = Math.hypot(x - 50, y - 50)
  let nearestLineIndex = 0
  let nearestDistance = Number.POSITIVE_INFINITY

  for (let index = 0; index < geometry.lines.length; index += 1) {
    const line = geometry.lines[index]
    const progress = getCurvedDiscTextProgressForSvgPoint(line, { x, y })
    const point = getPointOnLine(line, progress)
    const distance = Math.hypot(x - point.x, y - point.y) +
      Math.abs(radius - line.radius) * 0.4

    if (distance < nearestDistance) {
      nearestDistance = distance
      nearestLineIndex = index
    }
  }

  const line = geometry.lines[nearestLineIndex]
  const progress = getCurvedDiscTextProgressForSvgPoint(line, { x, y })

  return {
    lineIndex: nearestLineIndex,
    offset: getLineOffsetForProgress(line, progress),
  }
}

export function getCurvedDiscTextOffsetForClientPoint({
  clientX,
  clientY,
  geometry,
  hostHeight,
  hostRect,
  hostWidth,
}: {
  clientX: number
  clientY: number
  geometry: CurvedDiscTextHostGeometry
  hostHeight: number
  hostRect: CurvedDiscTextHostRect
  hostWidth: number
}) {
  return getLineOffsetFromClientPoint({
    clientX,
    clientY,
    geometry,
    hostHeight,
    hostRect,
    hostWidth,
  })
}

export function getCurvedDiscTextCaretFrame({
  caretValue,
  geometry,
  hostHeight,
  hostWidth,
  lines,
  selectionFocus,
}: CurvedDiscTextHostSize & {
  caretValue: string
  geometry: CurvedDiscTextHostGeometry
  lines: readonly { text: string }[]
  selectionFocus: number
}): CurvedDiscTextCaretFrame | null {
  const { lineIndex, offset } = getLineOffsetForCaretIndex({
    caretIndex: selectionFocus,
    caretValue,
    lines,
  })
  const line = geometry.lines[lineIndex]

  if (!line) return null

  const progress = getLineProgressForOffset(line, offset)
  const angle = getAngleForLineProgress(line, progress)
  const point = getPointOnLine(line, progress)
  const localPoint = percentToHostLocal({
    ...geometry,
    hostHeight,
    hostWidth,
    x: point.x,
    y: point.y,
  })
  const height = getFrameHeight({
    bounds: geometry.bounds,
    fontSize: line.fontSize,
    hostHeight,
    hostWidth,
  })

  return {
    height,
    left: localPoint.x,
    pathD: getCurvedCaretPath({
      geometry,
      height,
      hostHeight,
      hostWidth,
      point,
    }),
    rotationDegrees: getRadialCaretRotationDegrees(angle),
    strokeWidth: 2,
    top: localPoint.y - height / 2,
    viewportHeight: hostHeight,
    viewportWidth: hostWidth,
  }
}

export function getCurvedDiscTextSelectionFrames({
  caretValue,
  geometry,
  hostHeight,
  hostWidth,
  lines,
  selection,
}: CurvedDiscTextHostSize & {
  caretValue: string
  geometry: CurvedDiscTextHostGeometry
  lines: readonly { text: string }[]
  selection: { end: number; start: number }
}): CurvedDiscTextSelectionFrame[] {
  const selectionStart = clampValue(
    Math.min(selection.start, selection.end),
    0,
    caretValue.length,
  )
  const selectionEnd = clampValue(
    Math.max(selection.start, selection.end),
    0,
    caretValue.length,
  )

  if (selectionStart === selectionEnd) return []

  return geometry.lines.flatMap((line, lineIndex) => {
    const lineStart = getLineRangeStart({ caretValue, lineIndex, lines })
    const lineEnd = lineStart + line.text.length
    const start = Math.max(selectionStart, lineStart)
    const end = Math.min(selectionEnd, lineEnd)

    if (start >= end) return []

    const startProgress = getLineProgressForOffset(line, start - lineStart)
    const endProgress = getLineProgressForOffset(line, end - lineStart)
    const middleProgress = (startProgress + endProgress) / 2
    const middlePoint = getPointOnLine(line, middleProgress)
    const localMiddle = percentToHostLocal({
      ...geometry,
      hostHeight,
      hostWidth,
      x: middlePoint.x,
      y: middlePoint.y,
    })
    const height = getFrameHeight({
      bounds: geometry.bounds,
      fontSize: line.fontSize,
      hostHeight,
      hostWidth,
    })
    const radii = getLocalArcRadius({
      bounds: geometry.bounds,
      hostHeight,
      hostWidth,
      radius: line.radius,
    })
    const width = Math.max(
      2,
      Math.abs(endProgress - startProgress) *
        ((radii.x + radii.y) / 2) *
        (line.angleWidthDegrees * Math.PI / 180),
    )

    return [{
      height,
      left: localMiddle.x - width / 2,
      pathD: getCurvedSelectionPath({
        endProgress,
        geometry,
        hostHeight,
        hostWidth,
        line,
        startProgress,
      }),
      rotationDegrees: getTangentSelectionRotationDegrees(
        getAngleForLineProgress(line, middleProgress),
      ),
      strokeWidth: height,
      top: localMiddle.y - height / 2,
      viewportHeight: hostHeight,
      viewportWidth: hostWidth,
      width,
    }]
  })
}

function isFinitePaintBox(box: CurvedDiscTextPaintBox) {
  return (
    Number.isFinite(box.bottom) &&
    Number.isFinite(box.left) &&
    Number.isFinite(box.right) &&
    Number.isFinite(box.top) &&
    box.right > box.left &&
    box.bottom > box.top
  )
}

export function getCurvedDiscTextEditorBoundsFromPaintBoxes({
  boxes,
  minimumSizePercent = 2,
  paintSlackPercent = 0,
}: {
  boxes: readonly CurvedDiscTextPaintBox[]
  minimumSizePercent?: number
  paintSlackPercent?: number
}): CurvedDiscTextEditorBounds | null {
  const validBoxes = boxes.filter(isFinitePaintBox)

  if (validBoxes.length === 0) {
    return null
  }

  const left = Math.max(
    0,
    Math.min(...validBoxes.map((box) => box.left)) - paintSlackPercent,
  )
  const right = Math.min(
    100,
    Math.max(...validBoxes.map((box) => box.right)) + paintSlackPercent,
  )
  const top = Math.max(
    0,
    Math.min(...validBoxes.map((box) => box.top)) - paintSlackPercent,
  )
  const bottom = Math.min(
    100,
    Math.max(...validBoxes.map((box) => box.bottom)) + paintSlackPercent,
  )
  const width = Math.min(
    100,
    Math.max(minimumSizePercent, right - left),
  )
  const height = Math.min(
    100,
    Math.max(minimumSizePercent, bottom - top),
  )
  const centerX = clampValue((left + right) / 2, width / 2, 100 - width / 2)
  const centerY = clampValue((top + bottom) / 2, height / 2, 100 - height / 2)

  return {
    centerX,
    centerY,
    halfHeight: height / 2,
    halfWidth: width / 2,
  }
}

export function getCurvedDiscTextEditorBounds({
  layout,
  placement,
  safeZoneRadiusPercent,
  template,
}: {
  layout: DiscTextLayout
  placement: SteamLogoPlacement
  safeZoneRadiusPercent: number
  template?: DiscTemplate
}): CurvedDiscTextEditorBounds {
  const isTopArc = getCopyrightArcSide(placement, layout) === 'top'
  const textRadius = Math.max(1, safeZoneRadiusPercent - layout.y * 0.18)
  const centerAngle = (isTopArc ? 270 : 90) + layout.x
  const lineSpacing = 2.2 * getReadableCurvedTextScale(layout.scale)
  const fontSize = getResolvedDiscTextFontSizePercent(
    layout,
    'copyright',
    template,
  )
  const paintSlack = Math.max(2.2, fontSize * 1.8)
  const outerRadius = textRadius + paintSlack
  const innerRadius = Math.max(1, textRadius - lineSpacing * 3 - paintSlack)
  const points = getSampledArcAngles(centerAngle, layout.arcDegrees).flatMap(
    (angle) => [
      getArcPoint(outerRadius, angle),
      getArcPoint(innerRadius, angle),
    ],
  )
  const left = Math.max(0, Math.min(...points.map((point) => point.x)))
  const right = Math.min(100, Math.max(...points.map((point) => point.x)))
  const top = Math.max(0, Math.min(...points.map((point) => point.y)))
  const bottom = Math.min(100, Math.max(...points.map((point) => point.y)))
  const minSize = Math.max(8, fontSize * 3)
  const width = Math.max(minSize, right - left)
  const height = Math.max(minSize, bottom - top)
  const centerX = Math.min(100 - width / 2, Math.max(width / 2, (left + right) / 2))
  const centerY = Math.min(100 - height / 2, Math.max(height / 2, (top + bottom) / 2))

  return {
    centerX,
    centerY,
    halfHeight: height / 2,
    halfWidth: width / 2,
  }
}
