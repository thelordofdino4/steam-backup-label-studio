import {
  clampPixelRectToBounds,
  type JewelCasePixelRect,
} from './jewelCaseLayout.ts'

export type CaseInsertTextAvoidanceRegion = {
  id: string
  label: string
  bounds: JewelCasePixelRect
  sourceTextBlockId?: string
  sourceTextListId?: string
}

type Range = {
  start: number
  end: number
}

type SegmentChoice = {
  start: number
  length: number
}

type ApplyTextAvoidanceOptions = {
  marginPx?: number
  preserveSize?: boolean
}

const MIN_TEXT_SEGMENT_PX = 32
const MIN_TEXT_SEGMENT_RATIO = 0.35
const DEFAULT_TEXT_AVOIDANCE_GAP_RATIO = 0.018
const DEFAULT_TEXT_AVOIDANCE_MIN_GAP_PX = 6

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function getRectRight(rect: JewelCasePixelRect) {
  return rect.x + rect.width
}

function getRectBottom(rect: JewelCasePixelRect) {
  return rect.y + rect.height
}

function rangesOverlap(a: Range, b: Range) {
  return a.start < b.end && a.end > b.start
}

function rectsOverlap(a: JewelCasePixelRect, b: JewelCasePixelRect) {
  return rangesOverlap(
    { start: a.x, end: getRectRight(a) },
    { start: b.x, end: getRectRight(b) },
  ) && rangesOverlap(
    { start: a.y, end: getRectBottom(a) },
    { start: b.y, end: getRectBottom(b) },
  )
}

export function getCaseInsertTextAvoidanceGap(safeBounds: JewelCasePixelRect) {
  return Math.max(
    DEFAULT_TEXT_AVOIDANCE_MIN_GAP_PX,
    Math.min(safeBounds.width, safeBounds.height) *
      DEFAULT_TEXT_AVOIDANCE_GAP_RATIO,
  )
}

export function inflateCaseInsertTextAvoidanceRect(
  rect: JewelCasePixelRect,
  marginPx: number,
): JewelCasePixelRect {
  return {
    x: rect.x - marginPx,
    y: rect.y - marginPx,
    width: rect.width + marginPx * 2,
    height: rect.height + marginPx * 2,
  }
}

function subtractRanges(base: Range, blockers: Range[]) {
  const sortedBlockers = blockers
    .map((blocker) => ({
      start: clampNumber(blocker.start, base.start, base.end),
      end: clampNumber(blocker.end, base.start, base.end),
    }))
    .filter((blocker) => blocker.end > blocker.start)
    .sort((a, b) => a.start - b.start)
  const segments: Range[] = []
  let cursor = base.start

  for (const blocker of sortedBlockers) {
    if (blocker.start > cursor) {
      segments.push({ start: cursor, end: blocker.start })
    }
    cursor = Math.max(cursor, blocker.end)
  }

  if (cursor < base.end) {
    segments.push({ start: cursor, end: base.end })
  }

  return segments
}

function chooseSegment(
  segments: Range[],
  desiredCenter: number,
  desiredLength: number,
  preserveSize: boolean,
): SegmentChoice | null {
  const minLength = preserveSize
    ? desiredLength
    : Math.min(
        desiredLength,
        Math.max(MIN_TEXT_SEGMENT_PX, desiredLength * MIN_TEXT_SEGMENT_RATIO),
      )
  const candidates = segments
    .map((segment) => ({
      ...segment,
      length: segment.end - segment.start,
    }))
    .filter((segment) => segment.length >= minLength)

  if (candidates.length === 0) {
    return null
  }

  const best = candidates.sort((a, b) => {
    const aContains = desiredCenter >= a.start && desiredCenter <= a.end
    const bContains = desiredCenter >= b.start && desiredCenter <= b.end

    if (aContains !== bContains) return aContains ? -1 : 1

    const aDistance = Math.abs((a.start + a.end) / 2 - desiredCenter)
    const bDistance = Math.abs((b.start + b.end) / 2 - desiredCenter)

    if (aDistance !== bDistance) return aDistance - bDistance

    return b.length - a.length
  })[0]

  if (!best) {
    return null
  }

  const length = preserveSize ? desiredLength : Math.min(desiredLength, best.length)
  const center = clampNumber(
    desiredCenter,
    best.start + length / 2,
    best.end - length / 2,
  )

  return {
    start: center - length / 2,
    length,
  }
}

export function createCaseInsertTextAvoidanceRegionFromRect(
  id: string,
  label: string,
  bounds: JewelCasePixelRect,
): CaseInsertTextAvoidanceRegion {
  return { id, label, bounds }
}

export function applyCaseInsertTextRectAvoidance(
  rect: JewelCasePixelRect,
  safeBounds: JewelCasePixelRect,
  avoidanceRegions: CaseInsertTextAvoidanceRegion[] = [],
  options: ApplyTextAvoidanceOptions = {},
): JewelCasePixelRect {
  const clampedRect = clampPixelRectToBounds(rect, safeBounds)
  const marginPx = options.marginPx ?? getCaseInsertTextAvoidanceGap(safeBounds)
  const blockers = avoidanceRegions
    .map((region) => inflateCaseInsertTextAvoidanceRect(region.bounds, marginPx))
    .filter((blocker) => rectsOverlap(clampedRect, blocker))

  if (blockers.length === 0) {
    return clampedRect
  }

  const preserveSize = options.preserveSize ?? false
  const horizontalSegments = subtractRanges(
    { start: safeBounds.x, end: getRectRight(safeBounds) },
    blockers
      .filter((blocker) =>
        rangesOverlap(
          { start: clampedRect.y, end: getRectBottom(clampedRect) },
          { start: blocker.y, end: getRectBottom(blocker) },
        ))
      .map((blocker) => ({ start: blocker.x, end: getRectRight(blocker) })),
  )
  const horizontalChoice = chooseSegment(
    horizontalSegments,
    clampedRect.x + clampedRect.width / 2,
    clampedRect.width,
    preserveSize,
  )

  if (horizontalChoice) {
    return clampPixelRectToBounds(
      {
        ...clampedRect,
        x: horizontalChoice.start,
        width: horizontalChoice.length,
      },
      safeBounds,
    )
  }

  const verticalSegments = subtractRanges(
    { start: safeBounds.y, end: getRectBottom(safeBounds) },
    blockers
      .filter((blocker) =>
        rangesOverlap(
          { start: clampedRect.x, end: getRectRight(clampedRect) },
          { start: blocker.x, end: getRectRight(blocker) },
        ))
      .map((blocker) => ({ start: blocker.y, end: getRectBottom(blocker) })),
  )
  const verticalChoice = chooseSegment(
    verticalSegments,
    clampedRect.y + clampedRect.height / 2,
    clampedRect.height,
    preserveSize,
  )

  if (verticalChoice) {
    return clampPixelRectToBounds(
      {
        ...clampedRect,
        y: verticalChoice.start,
        height: verticalChoice.length,
      },
      safeBounds,
    )
  }

  return clampedRect
}
