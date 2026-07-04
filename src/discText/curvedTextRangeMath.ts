export function clampCurvedTextRangeValue(
  value: number,
  min: number,
  max: number,
) {
  if (max < min) return min

  return Math.min(Math.max(value, min), max)
}

export function clampCurvedTextArcDegrees(arcDegrees: number) {
  if (!Number.isFinite(arcDegrees)) return 0

  return clampCurvedTextRangeValue(arcDegrees, 0, 360)
}
