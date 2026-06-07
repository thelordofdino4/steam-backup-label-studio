import type {
  JewelCaseImageFitResult,
  JewelCasePixelRect,
  JewelCasePixelSize,
} from './jewelCaseLayout.ts'

export type CaseInsertLayoutAxisRange = {
  min: number
  max: number
}

export type CaseInsertLayoutSliderRanges = {
  x: CaseInsertLayoutAxisRange
  y: CaseInsertLayoutAxisRange
}

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

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function normalizeSliderRangeValue(value: number) {
  const normalizedValue = Number(value.toFixed(4))

  return Object.is(normalizedValue, -0) ? 0 : normalizedValue
}

function clampLayoutAxisRange(
  range: CaseInsertLayoutAxisRange,
  bounds: CaseInsertLayoutAxisRange,
): CaseInsertLayoutAxisRange {
  const clampedRange = {
    min: clampNumber(range.min, bounds.min, bounds.max),
    max: clampNumber(range.max, bounds.min, bounds.max),
  }
  const min = normalizeSliderRangeValue(
    Math.ceil(clampedRange.min / CASE_INSERT_LAYOUT_SLIDER_STEP) *
    CASE_INSERT_LAYOUT_SLIDER_STEP,
  )
  const max = normalizeSliderRangeValue(
    Math.floor(clampedRange.max / CASE_INSERT_LAYOUT_SLIDER_STEP) *
    CASE_INSERT_LAYOUT_SLIDER_STEP,
  )

  if (min <= max) {
    return { min, max }
  }

  const midpoint = normalizeSliderRangeValue(
    (clampedRange.min + clampedRange.max) / 2,
  )

  return {
    min: midpoint,
    max: midpoint,
  }
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
