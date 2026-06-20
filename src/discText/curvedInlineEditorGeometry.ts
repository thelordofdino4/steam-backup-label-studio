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
