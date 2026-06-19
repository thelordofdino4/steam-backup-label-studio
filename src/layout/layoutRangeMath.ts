export type LayoutAxisRange = {
  min: number
  max: number
}

export type LayoutSliderRanges = {
  x: LayoutAxisRange
  y: LayoutAxisRange
}

export type StepLayoutAxisRangeOptions = {
  precision?: number
  step: number
}

export const DEFAULT_LAYOUT_RANGE_PRECISION = 4

export function clampLayoutNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function getFiniteLayoutNumber(value: number, fallback: number) {
  return Number.isFinite(value) ? value : fallback
}

export function normalizeLayoutAxisRange(
  range: LayoutAxisRange,
): LayoutAxisRange {
  return range.min <= range.max
    ? { min: range.min, max: range.max }
    : { min: range.max, max: range.min }
}

export function normalizeLayoutRangeValue(
  value: number,
  precision = DEFAULT_LAYOUT_RANGE_PRECISION,
) {
  const normalizedValue = Number(value.toFixed(precision))

  return Object.is(normalizedValue, -0) ? 0 : normalizedValue
}

export function clampSteppedLayoutAxisRange(
  range: LayoutAxisRange,
  bounds: LayoutAxisRange,
  { precision = DEFAULT_LAYOUT_RANGE_PRECISION, step }: StepLayoutAxisRangeOptions,
): LayoutAxisRange {
  const clampedRange = {
    min: clampLayoutNumber(range.min, bounds.min, bounds.max),
    max: clampLayoutNumber(range.max, bounds.min, bounds.max),
  }
  const min = normalizeLayoutRangeValue(
    Math.ceil(clampedRange.min / step) * step,
    precision,
  )
  const max = normalizeLayoutRangeValue(
    Math.floor(clampedRange.max / step) * step,
    precision,
  )

  if (min <= max) {
    return { min, max }
  }

  const midpoint = normalizeLayoutRangeValue(
    (clampedRange.min + clampedRange.max) / 2,
    precision,
  )

  return {
    min: midpoint,
    max: midpoint,
  }
}
