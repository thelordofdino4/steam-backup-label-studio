import type { RenderBoundsPercent } from '../disc/geometry.ts'
import type { DiscTextKey } from './index.ts'

export type DiscTextAvoidanceRegion = {
  id: string
  label: string
  sourceDiscTextKey?: DiscTextKey
  left: number
  right: number
  top: number
  bottom: number
}

export const DISC_TEXT_AVOIDANCE_GAP_PERCENT = 1.4

function clampPercent(value: number) {
  return Math.min(100, Math.max(0, value))
}

export function createDiscTextAvoidanceRegionFromBounds(
  id: string,
  label: string,
  centerX: number,
  centerY: number,
  bounds: RenderBoundsPercent,
  margin = DISC_TEXT_AVOIDANCE_GAP_PERCENT,
): DiscTextAvoidanceRegion {
  return {
    id,
    label,
    left: clampPercent(centerX - bounds.halfWidth - margin),
    right: clampPercent(centerX + bounds.halfWidth + margin),
    top: clampPercent(centerY - bounds.halfHeight - margin),
    bottom: clampPercent(centerY + bounds.halfHeight + margin),
  }
}
