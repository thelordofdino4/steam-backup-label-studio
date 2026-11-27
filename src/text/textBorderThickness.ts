export const TEXT_BORDER_THICKNESS_MAX_PERCENT = 25

// An absent override (the control's Auto/0 position) preserves legacy paint.
export function normalizeTextBorderThicknessPercent(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined
  const percent = Math.min(TEXT_BORDER_THICKNESS_MAX_PERCENT, Math.round(value))
  return percent > 0 ? percent : undefined
}

export function getExplicitTextBorderThicknessRatio(value: unknown) {
  const percent = normalizeTextBorderThicknessPercent(value)
  return percent === undefined ? undefined : percent / 100
}
