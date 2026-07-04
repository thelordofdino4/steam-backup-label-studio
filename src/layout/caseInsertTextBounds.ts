import {
  clampPixelRectToBounds,
  type JewelCasePixelRect,
} from './jewelCaseLayout.ts'

function offsetRect(
  rect: JewelCasePixelRect,
  offset: { x: number; y: number },
): JewelCasePixelRect {
  return {
    ...rect,
    x: rect.x + offset.x,
    y: rect.y + offset.y,
  }
}

export function clampReservedBoundsToVisualBounds({
  boundsLimit,
  reservedBounds,
  visualBounds,
}: {
  boundsLimit: JewelCasePixelRect
  reservedBounds: JewelCasePixelRect
  visualBounds: JewelCasePixelRect
}) {
  const clampedVisualBounds = clampPixelRectToBounds(
    visualBounds,
    boundsLimit,
  )
  const offset = {
    x: clampedVisualBounds.x - visualBounds.x,
    y: clampedVisualBounds.y - visualBounds.y,
  }

  return offsetRect(reservedBounds, offset)
}
