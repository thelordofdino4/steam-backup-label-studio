export type ContextualRibbonInnerGroupProfile = Readonly<{
  min: number
  preferred: number
  max: number
  growthWeight: 0 | 1
  growthPriority: 0
}>

export function ribbonInnerGroupProfile(
  min: number,
  max = min,
  preferred = min,
): ContextualRibbonInnerGroupProfile {
  return { min, preferred: Math.max(min, Math.min(max, preferred)), max,
    growthWeight: max > min ? 1 : 0, growthPriority: 0 }
}

// The contract assigns equal growth to groups at the same width. Priority is
// deliberately uniform; weights declare eligibility, not unequal peer growth.
export function getContextualRibbonInnerGroupWidths(
  groups: readonly ContextualRibbonInnerGroupProfile[],
  availableWidth: number,
  gap = 0,
) {
  const widths = groups.map(group => group.min)
  let remaining = Math.max(0, (Number.isFinite(availableWidth) ? availableWidth : 0)
    - Math.max(0, gap) * Math.max(0, groups.length - 1)
    - widths.reduce((sum, value) => sum + value, 0))
  while (remaining > 0.000001) {
    const eligible = groups.map((group, index) => ({ group, index }))
      .filter(({ group, index }) => group.growthWeight > 0 && widths[index] < group.max - 0.000001)
    if (!eligible.length) break
    const smallest = Math.min(...eligible.map(({ index }) => widths[index]))
    const growing = eligible.filter(({ index }) => widths[index] <= smallest + 0.000001)
    const next = Math.min(
      ...growing.map(({ group }) => group.max),
      ...eligible.filter(({ index }) => widths[index] > smallest + 0.000001).map(({ index }) => widths[index]),
    )
    const increase = Math.min(next - smallest, remaining / growing.length)
    for (const { index } of growing) widths[index] += increase
    remaining -= increase * growing.length
  }
  return widths
}

// These inputs are domain bounds, not the value being edited. The renderer
// displays at most two fraction digits; reserve that capacity before editing.
export function getRibbonRangeValueCapacityCh(
  controls: readonly ({ min: number; max: number; step?: number } | undefined)[],
) {
  return controls.reduce((capacity, control) => {
    if (!control) return capacity
    const values = [control.min, control.max, control.step ?? 1]
    const decimals = Math.max(...values.map(value =>
      (value.toFixed(2).replace(/0+$/, '').split('.')[1] ?? '').length))
    const magnitude = Number(Math.max(Math.abs(control.min), Math.abs(control.max)).toFixed(2))
    const digits = magnitude < 1 ? 1 : Math.floor(Math.log10(magnitude)) + 1
    return Math.max(capacity, digits + (control.min < 0 ? 1 : 0)
      + (decimals > 0 ? decimals + 1 : 0) + 1)
  }, 4)
}
