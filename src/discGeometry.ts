import type { DiscTemplate } from './types/template'

export const EXPORT_DPI = 300
export const MM_PER_INCH = 25.4
export const CUSTOM_OUTER_DIAMETER_MAX_MM = 305
export const DISC_LAYOUT_CENTER_PERCENT = 50

export type LayoutPoint = {
  x: number
  y: number
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

export function clampPointToSafeCircle(point: LayoutPoint, safeZoneRadiusPercent: number): LayoutPoint {
  const radius = Math.max(0, safeZoneRadiusPercent)
  const x = Number.isFinite(point.x) ? point.x : DISC_LAYOUT_CENTER_PERCENT
  const y = Number.isFinite(point.y) ? point.y : DISC_LAYOUT_CENTER_PERCENT
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

export function clampLayoutPointToSafeZone(point: LayoutPoint, template: DiscTemplate): LayoutPoint {
  return clampPointToSafeCircle(point, getSafeZoneRadiusPercent(template))
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

export function buildCustomDiscTemplate(baseTemplate: DiscTemplate, dimensions: Partial<DiscTemplate>): DiscTemplate {
  return normalizeCustomDiscTemplate({
    ...baseTemplate,
    id: 'custom',
    name: 'Custom Disc',
    geometryNote: 'User-defined dimensions',
    ...dimensions,
  })
}
