import type { JewelCasePixelRect } from './jewelCaseLayout.ts'
import type { getJewelCaseSpineTitlePreviewLayout } from './jewelCaseSpineLayout.ts'

export function assertApproximatelyEqual(actual: number, expected: number) {
  if (Math.abs(actual - expected) >= 0.000001) {
    throw new Error(`Expected ${actual} to approximately equal ${expected}`)
  }
}

export function assertRectApproximatelyEqual(
  actual: JewelCasePixelRect | null,
  expected: JewelCasePixelRect,
) {
  if (!actual) {
    throw new Error('Expected a pixel rect')
  }

  assertApproximatelyEqual(actual.x, expected.x)
  assertApproximatelyEqual(actual.y, expected.y)
  assertApproximatelyEqual(actual.width, expected.width)
  assertApproximatelyEqual(actual.height, expected.height)
}

export function rectsOverlap(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
) {
  return a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
}

function rotatePoint(
  point: { x: number; y: number },
  rotationDegrees: number,
) {
  const rotationRadians = rotationDegrees * Math.PI / 180

  return {
    x: point.x * Math.cos(rotationRadians) - point.y * Math.sin(rotationRadians),
    y: point.x * Math.sin(rotationRadians) + point.y * Math.cos(rotationRadians),
  }
}

function getBoundingRectFromPoints(points: Array<{ x: number; y: number }>) {
  const xs = points.map((point) => point.x)
  const ys = points.map((point) => point.y)
  const left = Math.min(...xs)
  const right = Math.max(...xs)
  const top = Math.min(...ys)
  const bottom = Math.max(...ys)

  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
  }
}

export function getSpineTextLineGlobalRects(
  layout: NonNullable<ReturnType<typeof getJewelCaseSpineTitlePreviewLayout>>,
) {
  return layout.lines.map((line) => {
    const corners = [
      { x: line.left, y: line.y },
      { x: line.left + line.width, y: line.y },
      { x: line.left + line.width, y: line.y + layout.lineHeightPx },
      { x: line.left, y: line.y + layout.lineHeightPx },
    ].map((corner) => {
      const rotated = rotatePoint(corner, layout.rotationDegrees)

      return {
        x: layout.center.x + rotated.x,
        y: layout.center.y + rotated.y,
      }
    })

    return getBoundingRectFromPoints(corners)
  })
}
