import type { DiscTemplate } from './types/template'
import type { DiscTextKey, DiscTextLayout } from './discText'

export const EXPORT_DPI = 300
export const MM_PER_INCH = 25.4
export const CUSTOM_OUTER_DIAMETER_MAX_MM = 305
export const DISC_LAYOUT_CENTER_PERCENT = 50
export const LOGO_BASE_WIDTH_RATIO = 0.18
export const LOGO_MAX_HEIGHT_RATIO = 0.1
export const RATING_BADGE_BASE_WIDTH_RATIO = 0.09
export const RATING_BADGE_BASE_HEIGHT_RATIO = 0.13
export const MEDIA_MARK_BASE_WIDTH_RATIO = 0.13
export const MEDIA_MARK_BASE_HEIGHT_RATIO = 0.08
export const PLATFORM_MARK_BASE_WIDTH_RATIO = 0.12
export const PLATFORM_MARK_BASE_HEIGHT_RATIO = 0.08

export type LayoutPoint = {
  x: number
  y: number
}

export type RenderBoundsPercent = {
  halfWidth: number
  halfHeight: number
}

export type NaturalSize = {
  width: number
  height: number
} | null

const STRAIGHT_DISC_TEXT_METRICS: Record<
  DiscTextKey,
  { fontSizePercent: number; maxLines: number }
> = {
  title: { fontSizePercent: 3.6, maxLines: 2 },
  subtitle: { fontSizePercent: 2.2, maxLines: 1 },
  discNumber: { fontSizePercent: 1.9, maxLines: 1 },
  backupDate: { fontSizePercent: 1.6, maxLines: 1 },
  appId: { fontSizePercent: 1.5, maxLines: 1 },
  developer: { fontSizePercent: 1.45, maxLines: 1 },
  publisher: { fontSizePercent: 1.45, maxLines: 1 },
  installNotes: { fontSizePercent: 1.5, maxLines: 2 },
  customNote: { fontSizePercent: 1.5, maxLines: 2 },
  copyright: { fontSizePercent: 1.1, maxLines: 3 },
}

export function clampNumber(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

export function mmToPixels(mm: number) {
  return Math.round((mm / MM_PER_INCH) * EXPORT_DPI)
}

export function getSafeZoneRadiusPercent(template: DiscTemplate) {
  if (template.outerDiameterMm <= 0) {
    return 0
  }

  return (template.safeDiameterMm / template.outerDiameterMm) * DISC_LAYOUT_CENTER_PERCENT
}

export function getGuideInsetPercent(outerDiameterMm: number, guideDiameterMm: number) {
  return ((outerDiameterMm - guideDiameterMm) / 2 / outerDiameterMm) * 100
}

export function clampPointToSafeCircle(point: LayoutPoint, safeZoneRadiusPercent: number): LayoutPoint {
  const x = Number.isFinite(point.x) ? point.x : DISC_LAYOUT_CENTER_PERCENT
  const y = Number.isFinite(point.y) ? point.y : DISC_LAYOUT_CENTER_PERCENT
  const radius = Math.max(0, safeZoneRadiusPercent)
  const deltaX = x - DISC_LAYOUT_CENTER_PERCENT
  const deltaY = y - DISC_LAYOUT_CENTER_PERCENT
  const distance = Math.hypot(deltaX, deltaY)

  if (distance <= radius || distance === 0) {
    return { x, y }
  }

  const scale = radius / distance

  return {
    x: DISC_LAYOUT_CENTER_PERCENT + deltaX * scale,
    y: DISC_LAYOUT_CENTER_PERCENT + deltaY * scale,
  }
}

export function clampRectToSafeCircle(
  point: LayoutPoint,
  safeZoneRadiusPercent: number,
  bounds: RenderBoundsPercent,
): LayoutPoint {
  const x = Number.isFinite(point.x) ? point.x : DISC_LAYOUT_CENTER_PERCENT
  const y = Number.isFinite(point.y) ? point.y : DISC_LAYOUT_CENTER_PERCENT
  const safeZoneRadius = Math.max(0, safeZoneRadiusPercent)
  const halfWidth = Math.max(0, bounds.halfWidth)
  const halfHeight = Math.max(0, bounds.halfHeight)

  if (halfWidth === 0 && halfHeight === 0) {
    return clampPointToSafeCircle({ x, y }, safeZoneRadius)
  }

  const cornerRadius = Math.hypot(halfWidth, halfHeight)

  if (cornerRadius >= safeZoneRadius) {
    return {
      x: DISC_LAYOUT_CENTER_PERCENT,
      y: DISC_LAYOUT_CENTER_PERCENT,
    }
  }

  const deltaX = x - DISC_LAYOUT_CENTER_PERCENT
  const deltaY = y - DISC_LAYOUT_CENTER_PERCENT
  const distance = Math.hypot(deltaX, deltaY)

  if (distance === 0) {
    return { x, y }
  }

  const unitX = Math.abs(deltaX / distance)
  const unitY = Math.abs(deltaY / distance)
  const projectedBounds = unitX * halfWidth + unitY * halfHeight
  const remainingRadiusSquared = Math.max(
    0,
    safeZoneRadius ** 2 -
    halfWidth ** 2 -
    halfHeight ** 2 +
    projectedBounds ** 2,
  )
  const maxDistance =
    -projectedBounds +
    Math.sqrt(remainingRadiusSquared)

  if (distance <= maxDistance) {
    return { x, y }
  }

  const scale = maxDistance / distance

  return {
    x: DISC_LAYOUT_CENTER_PERCENT + deltaX * scale,
    y: DISC_LAYOUT_CENTER_PERCENT + deltaY * scale,
  }
}

export function clampLayoutPointToSafeZone(
  point: LayoutPoint,
  template: DiscTemplate,
  bounds?: RenderBoundsPercent,
): LayoutPoint {
  const safeZoneRadius = getSafeZoneRadiusPercent(template)

  if (bounds) {
    return clampRectToSafeCircle(point, safeZoneRadius, bounds)
  }

  return clampPointToSafeCircle(point, safeZoneRadius)
}

export function getContainedAssetBoundsPercent(
  naturalSize: NaturalSize,
  baseWidthRatio: number,
  maxHeightRatio: number,
  scale: number,
): RenderBoundsPercent {
  const maxWidthPercent = baseWidthRatio * 100 * scale
  const maxHeightPercent = maxHeightRatio * 100 * scale

  if (!naturalSize || naturalSize.width <= 0 || naturalSize.height <= 0) {
    return {
      halfWidth: maxWidthPercent / 2,
      halfHeight: maxHeightPercent / 2,
    }
  }

  const aspectRatio = naturalSize.width / naturalSize.height
  let widthPercent = maxWidthPercent
  let heightPercent = widthPercent / aspectRatio

  if (heightPercent > maxHeightPercent) {
    heightPercent = maxHeightPercent
    widthPercent = heightPercent * aspectRatio
  }

  return {
    halfWidth: widthPercent / 2,
    halfHeight: heightPercent / 2,
  }
}

export function getLogoAssetBoundsPercent(naturalSize: NaturalSize, scale: number) {
  return getContainedAssetBoundsPercent(
    naturalSize,
    LOGO_BASE_WIDTH_RATIO,
    LOGO_MAX_HEIGHT_RATIO,
    scale,
  )
}

export function getRatingBadgeBoundsPercent(naturalSize: NaturalSize, scale: number) {
  return getContainedAssetBoundsPercent(
    naturalSize,
    RATING_BADGE_BASE_WIDTH_RATIO,
    RATING_BADGE_BASE_HEIGHT_RATIO,
    scale,
  )
}

export function getRatingBadgePlaceholderBoundsPercent(scale: number): RenderBoundsPercent {
  return {
    halfWidth: (RATING_BADGE_BASE_WIDTH_RATIO * 100 * scale) / 2,
    halfHeight: (RATING_BADGE_BASE_HEIGHT_RATIO * 100 * scale) / 2,
  }
}

export function getMediaMarkBoundsPercent(naturalSize: NaturalSize, scale: number) {
  return getContainedAssetBoundsPercent(
    naturalSize,
    MEDIA_MARK_BASE_WIDTH_RATIO,
    MEDIA_MARK_BASE_HEIGHT_RATIO,
    scale,
  )
}

export function getMediaMarkPlaceholderBoundsPercent(scale: number): RenderBoundsPercent {
  return {
    halfWidth: (MEDIA_MARK_BASE_WIDTH_RATIO * 100 * scale) / 2,
    halfHeight: (MEDIA_MARK_BASE_HEIGHT_RATIO * 100 * scale) / 2,
  }
}

export function getPlatformMarkBoundsPercent(naturalSize: NaturalSize, scale: number) {
  return getContainedAssetBoundsPercent(
    naturalSize,
    PLATFORM_MARK_BASE_WIDTH_RATIO,
    PLATFORM_MARK_BASE_HEIGHT_RATIO,
    scale,
  )
}

export function getPlatformMarkPlaceholderBoundsPercent(scale: number): RenderBoundsPercent {
  return {
    halfWidth: (PLATFORM_MARK_BASE_WIDTH_RATIO * 100 * scale) / 2,
    halfHeight: (PLATFORM_MARK_BASE_HEIGHT_RATIO * 100 * scale) / 2,
  }
}

export function getStraightDiscTextBoundsPercent(
  key: DiscTextKey,
  layout: DiscTextLayout,
): RenderBoundsPercent {
  const metrics = STRAIGHT_DISC_TEXT_METRICS[key]
  const scale = Number.isFinite(layout.scale) ? Math.max(0, layout.scale) : 1
  const width = Number.isFinite(layout.width) ? Math.max(0, layout.width) : 0
  const estimatedLineHeightPercent = metrics.fontSizePercent * 1.2

  return {
    halfWidth: (width * scale) / 2,
    halfHeight: (estimatedLineHeightPercent * metrics.maxLines * scale) / 2,
  }
}

export function normalizeCustomDiscTemplate(template: DiscTemplate): DiscTemplate {
  const outerDiameterMm = clampNumber(template.outerDiameterMm, 20, CUSTOM_OUTER_DIAMETER_MAX_MM)
  const physicalCenterHoleDiameterMm = clampNumber(template.physicalCenterHoleDiameterMm, 0, outerDiameterMm - 1)
  const innerHoleDiameterMm = clampNumber(template.innerHoleDiameterMm, physicalCenterHoleDiameterMm, outerDiameterMm - 1)
  const printableDiameterMm = clampNumber(template.printableDiameterMm, innerHoleDiameterMm, outerDiameterMm)
  const safeDiameterMm = clampNumber(template.safeDiameterMm, innerHoleDiameterMm, printableDiameterMm)

  return {
    ...template,
    outerDiameterMm,
    physicalCenterHoleDiameterMm,
    innerHoleDiameterMm,
    printableDiameterMm,
    safeDiameterMm,
  }
}

export function buildCustomDiscTemplate(
  source: DiscTemplate,
  dimensions?: Partial<DiscTemplate>,
): DiscTemplate {
  return normalizeCustomDiscTemplate({
    ...source,
    ...dimensions,
    id: 'custom',
    name: 'Custom dimensions',
    geometryNote:
      'Custom dimensions are saved with the project. Safe zone is advisory only and does not crop exported artwork.',
    defaultZones: [],
  })
}
