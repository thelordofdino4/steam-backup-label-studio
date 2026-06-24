import {
  getGuideInsetPercent,
  mmToPixels,
} from '../disc/geometry.ts'
import type { DiscTemplate } from '../types/template.ts'

export function createDiscTemplateGuideOverlay(template: DiscTemplate) {
  return {
    innerPrintableBoundaryPercent:
      (template.innerHoleDiameterMm / template.outerDiameterMm) * 100,
    physicalCenterHolePercent:
      (template.physicalCenterHoleDiameterMm / template.outerDiameterMm) * 100,
    printableInsetPercent: getGuideInsetPercent(
      template.outerDiameterMm,
      template.printableDiameterMm,
    ),
    safeInsetPercent: getGuideInsetPercent(
      template.outerDiameterMm,
      template.safeDiameterMm,
    ),
  }
}

export function getDiscTemplateExportPreviewFallbackSize(template: DiscTemplate) {
  return mmToPixels(template.outerDiameterMm)
}
