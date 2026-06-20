export type InlinePreviewPointSizeControlConfig = {
  max: number
  min: number
  step: number
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function getDecimalPlaces(value: number) {
  const normalized = String(value)
  const decimalIndex = normalized.indexOf('.')

  return decimalIndex >= 0 ? normalized.length - decimalIndex - 1 : 0
}

export function formatInlinePreviewPointSizeValue(value: number) {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)))
}

export function parseInlinePreviewPointSizeDraft(draft: string) {
  const trimmedDraft = draft.trim()

  if (!trimmedDraft) {
    return null
  }

  const value = Number(trimmedDraft)

  return Number.isFinite(value) ? value : null
}

export function getInlinePreviewPointSizeLiveValue(
  draft: string,
  config: InlinePreviewPointSizeControlConfig,
) {
  const value = parseInlinePreviewPointSizeDraft(draft)

  if (value === null || value < config.min || value > config.max) {
    return null
  }

  return value
}

export function getInlinePreviewPointSizeCommitValue({
  currentValue,
  draft,
  max,
  min,
}: InlinePreviewPointSizeControlConfig & {
  currentValue: number
  draft: string
}) {
  const value = parseInlinePreviewPointSizeDraft(draft)

  return value === null
    ? clampNumber(currentValue, min, max)
    : clampNumber(value, min, max)
}

export function stepInlinePreviewPointSizeValue({
  direction,
  max,
  min,
  step,
  value,
}: InlinePreviewPointSizeControlConfig & {
  direction: -1 | 1
  value: number
}) {
  const precision = Math.max(getDecimalPlaces(step), 2)
  const nextValue = clampNumber(value + direction * step, min, max)

  return Number(nextValue.toFixed(precision))
}

export function getNearestInlinePreviewPointSizeOptionIndex({
  draft,
  options,
  value,
}: {
  draft: string
  options: readonly number[]
  value: number
}) {
  const parsedDraft = parseInlinePreviewPointSizeDraft(draft)
  const targetValue = parsedDraft ?? value
  const exactIndex = options.findIndex((option) => option === targetValue)

  if (exactIndex >= 0) {
    return exactIndex
  }

  return options.reduce((bestIndex, option, index) => {
    const bestDistance = Math.abs(options[bestIndex] - targetValue)
    const distance = Math.abs(option - targetValue)

    return distance < bestDistance ? index : bestIndex
  }, 0)
}
