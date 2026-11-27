export const TEXT_BORDER_THICKNESS_MAX_PERCENT = 25
export const TEXT_BORDER_THICKNESS_DISPLAY_MAX = 100

export function getTextBorderThicknessDisplayValue(value: number | undefined) {
  return Math.round((value ?? 0) * TEXT_BORDER_THICKNESS_DISPLAY_MAX / TEXT_BORDER_THICKNESS_MAX_PERCENT)
}

export function getTextBorderThicknessFromDisplayValue(value: number) {
  return Math.min(TEXT_BORDER_THICKNESS_DISPLAY_MAX, Math.max(0, value))
    * TEXT_BORDER_THICKNESS_MAX_PERCENT / TEXT_BORDER_THICKNESS_DISPLAY_MAX
}

// An absent override (the control's Auto/0 position) preserves legacy paint.
export function normalizeTextBorderThicknessPercent(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined
  const percent = Math.min(TEXT_BORDER_THICKNESS_MAX_PERCENT, Math.round(value * 4) / 4)
  return percent > 0 ? percent : undefined
}

export function getExplicitTextBorderThicknessRatio(value: unknown) {
  const percent = normalizeTextBorderThicknessPercent(value)
  return percent === undefined ? undefined : percent / 100
}
