export type DiscPresetScaleControlRange = Readonly<{
  min: number
  max: number
}>

type DiscPresetScaleControlRangeInput = Readonly<{
  currentScale: number
  nominalMin: number
  nominalMax: number
}>

type DiscPresetScaleControlValueInput = DiscPresetScaleControlRangeInput &
  Readonly<{
    value: number
  }>

/**
 * Keeps a semantic preset fit representable by its manual scale control.
 *
 * This expands manual-control bounds only. It does not normalize the fitted
 * owner state or make manual edits reapply the preset.
 */
export function getDiscPresetScaleControlRange({
  currentScale,
  nominalMin,
  nominalMax,
}: DiscPresetScaleControlRangeInput): DiscPresetScaleControlRange {
  if (!Number.isFinite(currentScale) || currentScale <= 0) {
    return Object.freeze({ min: nominalMin, max: nominalMax })
  }

  return Object.freeze({
    min: Math.min(nominalMin, currentScale),
    max: Math.max(nominalMax, currentScale),
  })
}

export function clampDiscPresetScaleControlValue({
  value,
  currentScale,
  nominalMin,
  nominalMax,
}: DiscPresetScaleControlValueInput) {
  const range = getDiscPresetScaleControlRange({
    currentScale,
    nominalMin,
    nominalMax,
  })
  const safeCurrentScale =
    Number.isFinite(currentScale) && currentScale > 0
      ? currentScale
      : range.min
  const safeValue = Number.isFinite(value) ? value : safeCurrentScale

  return Math.min(Math.max(safeValue, range.min), range.max)
}
