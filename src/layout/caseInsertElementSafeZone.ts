import type {
  JewelCaseImageFitResult,
  JewelCasePixelRect,
  JewelCasePixelSize,
} from './jewelCaseLayout.ts'
import {
  clampSteppedLayoutAxisRange,
  type LayoutAxisRange as SharedLayoutAxisRange,
  type LayoutSliderRanges as SharedLayoutSliderRanges,
} from './layoutRangeMath.ts'

export type CaseInsertLayoutAxisRange = SharedLayoutAxisRange

export type CaseInsertLayoutSliderRanges = SharedLayoutSliderRanges

export const CASE_INSERT_LAYOUT_SLIDER_STEP = 0.1

export const CASE_INSERT_PERCENT_LAYOUT_RANGE: CaseInsertLayoutAxisRange = {
  min: 0,
  max: 100,
}

export const CASE_INSERT_OFFSET_LAYOUT_RANGE: CaseInsertLayoutAxisRange = {
  min: -100,
  max: 100,
}

export const CASE_INSERT_PERCENT_LAYOUT_RANGES: CaseInsertLayoutSliderRanges = {
  x: CASE_INSERT_PERCENT_LAYOUT_RANGE,
  y: CASE_INSERT_PERCENT_LAYOUT_RANGE,
}

export const CASE_INSERT_OFFSET_LAYOUT_RANGES: CaseInsertLayoutSliderRanges = {
  x: CASE_INSERT_OFFSET_LAYOUT_RANGE,
  y: CASE_INSERT_OFFSET_LAYOUT_RANGE,
}

const EPSILON = 0.000001

function clampLayoutAxisRange(
  range: CaseInsertLayoutAxisRange,
  bounds: CaseInsertLayoutAxisRange,
): CaseInsertLayoutAxisRange {
  return clampSteppedLayoutAxisRange(range, bounds, {
    step: CASE_INSERT_LAYOUT_SLIDER_STEP,
  })
}

function getCenteredAxisRange({
  boundsLength,
  renderedLength,
}: {
  boundsLength: number
  renderedLength: number
}): CaseInsertLayoutAxisRange {
  if (boundsLength <= 0 || renderedLength <= 0) {
    return CASE_INSERT_PERCENT_LAYOUT_RANGE
  }

  const insetPercent = renderedLength / 2 / boundsLength * 100

  return clampLayoutAxisRange(
    {
      min: insetPercent,
      max: 100 - insetPercent,
    },
    CASE_INSERT_PERCENT_LAYOUT_RANGE,
  )
}

function getOffsetAxisRange({
  boundsLength,
  rectEnd,
  rectStart,
}: {
  boundsLength: number
  rectEnd: number
  rectStart: number
}): CaseInsertLayoutAxisRange {
  if (boundsLength <= 0 || rectEnd <= rectStart) {
    return CASE_INSERT_PERCENT_LAYOUT_RANGE
  }

  return clampLayoutAxisRange(
    {
      min: -rectStart / boundsLength * 100,
      max: (boundsLength - rectEnd) / boundsLength * 100,
    },
    CASE_INSERT_PERCENT_LAYOUT_RANGE,
  )
}

export function getCenteredRectLayoutSliderRanges(
  bounds: JewelCasePixelRect,
  renderedSize: JewelCasePixelSize,
): CaseInsertLayoutSliderRanges {
  return {
    x: getCenteredAxisRange({
      boundsLength: bounds.width,
      renderedLength: renderedSize.width,
    }),
    y: getCenteredAxisRange({
      boundsLength: bounds.height,
      renderedLength: renderedSize.height,
    }),
  }
}

export function getOffsetRectLayoutSliderRanges(
  bounds: JewelCasePixelRect,
  rectOffsetFromLayoutPoint: JewelCasePixelRect,
): CaseInsertLayoutSliderRanges {
  return {
    x: getOffsetAxisRange({
      boundsLength: bounds.width,
      rectStart: rectOffsetFromLayoutPoint.x,
      rectEnd: rectOffsetFromLayoutPoint.x + rectOffsetFromLayoutPoint.width,
    }),
    y: getOffsetAxisRange({
      boundsLength: bounds.height,
      rectStart: rectOffsetFromLayoutPoint.y,
      rectEnd: rectOffsetFromLayoutPoint.y + rectOffsetFromLayoutPoint.height,
    }),
  }
}

function getImageFitAxisOffsetRange({
  imageLength,
  regionLength,
}: {
  imageLength: number
  regionLength: number
}): CaseInsertLayoutAxisRange {
  if (imageLength <= regionLength + EPSILON || regionLength <= 0) {
    return { min: 0, max: 0 }
  }

  const offsetPercent = (imageLength - regionLength) /
    (imageLength + regionLength) * 100

  return clampLayoutAxisRange(
    {
      min: -offsetPercent,
      max: offsetPercent,
    },
    CASE_INSERT_OFFSET_LAYOUT_RANGE,
  )
}

export function getImageFitOffsetLayoutSliderRanges(
  fit: JewelCaseImageFitResult | null,
): CaseInsertLayoutSliderRanges {
  if (!fit) {
    return CASE_INSERT_OFFSET_LAYOUT_RANGES
  }

  return {
    x: getImageFitAxisOffsetRange({
      imageLength: fit.imageRect.width,
      regionLength: fit.region.width,
    }),
    y: getImageFitAxisOffsetRange({
      imageLength: fit.imageRect.height,
      regionLength: fit.region.height,
    }),
  }
}
