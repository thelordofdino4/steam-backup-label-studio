import type { DiscTemplate } from './types/template'

export const EXPORT_DPI = 300
export const MM_PER_INCH = 25.4
export const CUSTOM_OUTER_DIAMETER_MAX_MM = 305

export function clampNumber(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

export function mmToPixels(mm: number) {
  return Math.round((mm / MM_PER_INCH) * EXPORT_DPI)
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
