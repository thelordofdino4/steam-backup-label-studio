import type {
  CaseInsertTextAvoidanceRegion,
} from './caseInsertTextAvoidance.ts'
import {
  clampPixelRectToBounds,
  type JewelCasePixelRect,
} from './jewelCaseLayout.ts'

export type JewelCaseSpineBoxLayout = {
  center: {
    x: number
    y: number
  }
  width: number
  height: number
  rotationDegrees: number
  boundingRect: JewelCasePixelRect
}

export function rotatePoint(
  point: { x: number; y: number },
  rotationDegrees: number,
) {
  const rotationRadians = rotationDegrees * Math.PI / 180

  return {
    x: point.x * Math.cos(rotationRadians) - point.y * Math.sin(rotationRadians),
    y: point.x * Math.sin(rotationRadians) + point.y * Math.cos(rotationRadians),
  }
}

function getRectCorners(rect: JewelCasePixelRect) {
  return [
    { x: rect.x, y: rect.y },
    { x: rect.x + rect.width, y: rect.y },
    { x: rect.x + rect.width, y: rect.y + rect.height },
    { x: rect.x, y: rect.y + rect.height },
  ]
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

export function transformGlobalRectToLocal(
  rect: JewelCasePixelRect,
  center: { x: number; y: number },
  rotationDegrees: number,
): JewelCasePixelRect {
  return getBoundingRectFromPoints(
    getRectCorners(rect).map((corner) =>
      rotatePoint(
        {
          x: corner.x - center.x,
          y: corner.y - center.y,
        },
        -rotationDegrees,
      )),
  )
}

export function transformAvoidanceRegionsToLocal(
  regions: CaseInsertTextAvoidanceRegion[],
  center: { x: number; y: number },
  rotationDegrees: number,
): CaseInsertTextAvoidanceRegion[] {
  return regions.map((region) => ({
    ...region,
    bounds: transformGlobalRectToLocal(
      region.bounds,
      center,
      rotationDegrees,
    ),
  }))
}

function rotationSwapsAxes(rotationDegrees: number) {
  const normalized = Math.abs(((rotationDegrees % 180) + 180) % 180)

  return normalized > 45 && normalized < 135
}

export function getTransformedBoundingSize({
  height,
  rotationDegrees,
  width,
}: {
  height: number
  rotationDegrees: number
  width: number
}) {
  const swapsAxes = rotationSwapsAxes(rotationDegrees)

  return {
    width: swapsAxes ? height : width,
    height: swapsAxes ? width : height,
  }
}

export function getTransformedBoxLayout({
  safeBounds,
  width,
  height,
  rotationDegrees,
  centerPercent,
}: {
  safeBounds: JewelCasePixelRect
  width: number
  height: number
  rotationDegrees: number
  centerPercent: { x: number; y: number }
}): JewelCaseSpineBoxLayout {
  const boundingSize = getTransformedBoundingSize({
    height,
    rotationDegrees,
    width,
  })
  const requestedCenter = {
    x: safeBounds.x + safeBounds.width * centerPercent.x / 100,
    y: safeBounds.y + safeBounds.height * centerPercent.y / 100,
  }
  const boundingRect = {
    x: requestedCenter.x - boundingSize.width / 2,
    y: requestedCenter.y - boundingSize.height / 2,
    width: boundingSize.width,
    height: boundingSize.height,
  }

  return {
    center: requestedCenter,
    width,
    height,
    rotationDegrees,
    boundingRect,
  }
}

export function offsetTransformedBoxLayout(
  box: JewelCaseSpineBoxLayout,
  offset: { x: number; y: number },
): JewelCaseSpineBoxLayout {
  return {
    ...box,
    center: {
      x: box.center.x + offset.x,
      y: box.center.y + offset.y,
    },
    boundingRect: {
      ...box.boundingRect,
      x: box.boundingRect.x + offset.x,
      y: box.boundingRect.y + offset.y,
    },
  }
}

export function getTransformedBoxLayoutOffset(
  from: JewelCaseSpineBoxLayout,
  to: JewelCaseSpineBoxLayout,
) {
  return {
    x: to.center.x - from.center.x,
    y: to.center.y - from.center.y,
  }
}

export function boxLayoutOffsetIsZero(offset: { x: number; y: number }) {
  return Math.abs(offset.x) < 0.000001 && Math.abs(offset.y) < 0.000001
}

export function clampTransformedBoxLayoutToBounds(
  box: JewelCaseSpineBoxLayout,
  safeBounds: JewelCasePixelRect,
): JewelCaseSpineBoxLayout {
  const clampedBoundingRect = clampPixelRectToBounds(box.boundingRect, safeBounds)

  return offsetTransformedBoxLayout(box, {
    x: clampedBoundingRect.x - box.boundingRect.x,
    y: clampedBoundingRect.y - box.boundingRect.y,
  })
}

export function getLocalTransformedBoxBounds(box: JewelCaseSpineBoxLayout) {
  return {
    x: -box.width / 2,
    y: -box.height / 2,
    width: box.width,
    height: box.height,
  }
}

export function getVisualBoxFromLocalBounds(
  box: JewelCaseSpineBoxLayout,
  localVisualBounds: JewelCasePixelRect,
): JewelCaseSpineBoxLayout {
  const localVisualCenter = {
    x: localVisualBounds.x + localVisualBounds.width / 2,
    y: localVisualBounds.y + localVisualBounds.height / 2,
  }
  const rotatedVisualCenter = rotatePoint(
    localVisualCenter,
    box.rotationDegrees,
  )
  const visualCenter = {
    x: box.center.x + rotatedVisualCenter.x,
    y: box.center.y + rotatedVisualCenter.y,
  }
  const visualBoundingSize = getTransformedBoundingSize({
    height: localVisualBounds.height,
    rotationDegrees: box.rotationDegrees,
    width: localVisualBounds.width,
  })

  return {
    ...box,
    center: visualCenter,
    width: localVisualBounds.width,
    height: localVisualBounds.height,
    boundingRect: {
      x: visualCenter.x - visualBoundingSize.width / 2,
      y: visualCenter.y - visualBoundingSize.height / 2,
      width: visualBoundingSize.width,
      height: visualBoundingSize.height,
    },
  }
}
