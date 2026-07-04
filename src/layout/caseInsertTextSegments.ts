import type {
  ProjectCaseInsertTextAlign,
} from '../project/projectTypes.ts'
import type {
  JewelCasePixelRect,
} from './jewelCaseLayout.ts'
import {
  intersectPixelRects,
} from './jewelCaseLayout.ts'
import {
  getCaseInsertTextAvoidanceGap,
  inflateCaseInsertTextAvoidanceRect,
  type CaseInsertTextAvoidanceRegion,
} from './caseInsertTextAvoidance.ts'

export type CaseInsertTextLineSegment = {
  left: number
  right: number
  y: number
}

export function doVerticalRangesOverlap(
  top: number,
  bottom: number,
  region: JewelCasePixelRect,
) {
  return bottom >= region.y && top <= region.y + region.height
}

export function rectsOverlap(
  a: JewelCasePixelRect,
  b: JewelCasePixelRect,
) {
  return intersectPixelRects(a, b) !== null
}

function subtractRegionFromSegments(
  segments: Array<Omit<CaseInsertTextLineSegment, 'y'>>,
  region: JewelCasePixelRect,
) {
  return segments.flatMap((segment) => {
    const regionRight = region.x + region.width

    if (regionRight <= segment.left || region.x >= segment.right) {
      return [segment]
    }

    return [
      { left: segment.left, right: Math.min(region.x, segment.right) },
      { left: Math.max(regionRight, segment.left), right: segment.right },
    ].filter((candidate) => candidate.right - candidate.left > 1)
  })
}

export function getPreferredSegment(
  segments: Array<Omit<CaseInsertTextLineSegment, 'y'>>,
  align: ProjectCaseInsertTextAlign,
  baseSegment: Omit<CaseInsertTextLineSegment, 'y'>,
) {
  if (segments.length === 0) {
    return baseSegment
  }

  if (align === 'left') {
    return segments[0] ?? baseSegment
  }

  if (align === 'right') {
    return segments[segments.length - 1] ?? baseSegment
  }

  const centerX = (baseSegment.left + baseSegment.right) / 2
  const containingCenter = segments.find(
    (segment) => segment.left <= centerX && segment.right >= centerX,
  )

  if (containingCenter) {
    return containingCenter
  }

  return segments.reduce((bestSegment, segment) => {
    const bestWidth = bestSegment.right - bestSegment.left
    const segmentWidth = segment.right - segment.left

    if (segmentWidth !== bestWidth) {
      return segmentWidth > bestWidth ? segment : bestSegment
    }

    const bestCenter = (bestSegment.left + bestSegment.right) / 2
    const segmentCenter = (segment.left + segment.right) / 2

    return Math.abs(segmentCenter - centerX) < Math.abs(bestCenter - centerX)
      ? segment
      : bestSegment
  }, segments[0] ?? baseSegment)
}

export function getTextLayoutStartY({
  reservedBounds,
  padding,
  innerHeight,
  lineCount,
  lineHeightPx,
  verticalAlign,
}: {
  reservedBounds: JewelCasePixelRect
  padding: number
  innerHeight: number
  lineCount: number
  lineHeightPx: number
  verticalAlign?: 'center' | 'top'
}) {
  const contentHeight = Math.max(1, lineCount) * lineHeightPx

  if (verticalAlign === 'top') {
    return reservedBounds.y + padding
  }

  if (contentHeight > innerHeight) {
    return reservedBounds.y + reservedBounds.height / 2 - contentHeight / 2
  }

  return reservedBounds.y + padding + Math.max(
    0,
    (innerHeight - contentHeight) / 2,
  )
}

export function normalizeMaxLineCount(value: number | undefined) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : null
}

export function getAvoidanceLineSegments({
  reservedBounds,
  padding,
  innerHeight,
  lineCount,
  lineHeightPx,
  align,
  verticalAlign,
  avoidanceRegions,
}: {
  reservedBounds: JewelCasePixelRect
  padding: number
  innerHeight: number
  lineCount: number
  lineHeightPx: number
  align: ProjectCaseInsertTextAlign
  verticalAlign?: 'center' | 'top'
  avoidanceRegions: CaseInsertTextAvoidanceRegion[]
}): CaseInsertTextLineSegment[] {
  const marginPx = getCaseInsertTextAvoidanceGap(reservedBounds)
  const blockers = avoidanceRegions.map((region) =>
    inflateCaseInsertTextAvoidanceRect(region.bounds, marginPx))
  const baseSegment = {
    left: reservedBounds.x + padding,
    right: reservedBounds.x + reservedBounds.width - padding,
  }
  const startY = getTextLayoutStartY({
    reservedBounds,
    padding,
    innerHeight,
    lineCount,
    lineHeightPx,
    verticalAlign,
  })

  return Array.from({ length: Math.max(1, lineCount) }, (_, index) => {
    const y = startY + index * lineHeightPx
    const overlappingRegions = blockers.filter((region) =>
      doVerticalRangesOverlap(y, y + lineHeightPx, region))
    const availableSegments = overlappingRegions.reduce(
      (segments, region) => subtractRegionFromSegments(segments, region),
      [baseSegment],
    )
    const preferredSegment = getPreferredSegment(
      availableSegments,
      align,
      baseSegment,
    )

    return {
      ...preferredSegment,
      y,
    }
  })
}

export function getLineSegmentAnchorX(
  segment: CaseInsertTextLineSegment,
  align: ProjectCaseInsertTextAlign,
) {
  if (align === 'left') return segment.left
  if (align === 'right') return segment.right

  return (segment.left + segment.right) / 2
}
