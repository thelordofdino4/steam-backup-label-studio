export function getEditorRangeFieldValue(rawValue: string) {
  return Number(rawValue)
}

function getFiniteNumber(value: number | string): number | null {
  const parsedValue = Number(value)

  return Number.isFinite(parsedValue) ? parsedValue : null
}

export function getEditorRangeFieldPrecision(step: number | string) {
  const stepValue = String(step)

  if (!stepValue.includes('.')) {
    return 0
  }

  return stepValue.split('.')[1]?.length ?? 0
}

export function formatEditorRangeFieldValue(
  value: number,
  step: number | string,
) {
  const precision = getEditorRangeFieldPrecision(step)
  const roundedValue = Number(value.toFixed(Math.max(precision, 0)))
  const snapTolerance = 10 ** -(precision + 2)

  if (Math.abs(roundedValue - value) <= snapTolerance) {
    return String(roundedValue)
  }

  return String(value)
}

export function normalizeEditorRangeFieldValue({
  max,
  min,
  rawValue,
  step,
}: {
  max: number | string
  min: number | string
  rawValue: number | string
  step: number | string
}): number | null {
  const parsedValue = getFiniteNumber(rawValue)

  if (parsedValue === null) {
    return null
  }

  const minValue = getFiniteNumber(min)
  const maxValue = getFiniteNumber(max)
  const stepValue = getFiniteNumber(step)
  const clampedValue = Math.min(
    maxValue ?? parsedValue,
    Math.max(minValue ?? parsedValue, parsedValue),
  )

  if (!stepValue || stepValue <= 0 || minValue === null) {
    return clampedValue
  }

  const precision = getEditorRangeFieldPrecision(step)
  const snappedValue =
    minValue + Math.round((clampedValue - minValue) / stepValue) * stepValue
  const normalizedValue = Math.min(
    maxValue ?? snappedValue,
    Math.max(minValue, snappedValue),
  )

  return Number(normalizedValue.toFixed(Math.max(precision, 0)))
}
