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

function getFormattedRangeBoundaryCandidates(
  value: number | string,
  step: number | string,
) {
  const parsedValue = getFiniteNumber(value)

  if (parsedValue === null) {
    return []
  }

  const precision = getEditorRangeFieldPrecision(step)

  return [
    formatEditorRangeFieldValue(parsedValue, step),
    parsedValue.toFixed(precision),
  ]
}

export function getEditorRangeFieldNumberInputCharacterCapacity({
  max,
  min,
  step,
}: {
  max: number | string
  min: number | string
  step: number | string
}) {
  const formattedValues = [
    ...getFormattedRangeBoundaryCandidates(min, step),
    ...getFormattedRangeBoundaryCandidates(max, step),
  ]
  const longestFormattedValue = formattedValues.reduce(
    (longestValue, formattedValue) =>
      Math.max(longestValue, formattedValue.length),
    0,
  )

  return Math.max(3, longestFormattedValue + 1)
}

export function normalizeEditorRangeFieldValue({
  max,
  min,
  outOfRangeBehavior = 'clamp',
  rawValue,
  step,
}: {
  max: number | string
  min: number | string
  outOfRangeBehavior?: 'clamp' | 'reject'
  rawValue: number | string
  step: number | string
}): number | null {
  if (outOfRangeBehavior === 'reject' &&
      typeof rawValue === 'string' && rawValue.trim() === '') {
    return null
  }

  const parsedValue = getFiniteNumber(rawValue)

  if (parsedValue === null) {
    return null
  }

  const minValue = getFiniteNumber(min)
  const maxValue = getFiniteNumber(max)
  const stepValue = getFiniteNumber(step)
  if (outOfRangeBehavior === 'reject' &&
      ((minValue !== null && parsedValue < minValue) ||
       (maxValue !== null && parsedValue > maxValue))) {
    return null
  }
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
