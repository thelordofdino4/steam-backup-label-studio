import type {
  DiscTemplate,
  PrintTemplate,
  RectangularPrintTemplate,
  TemplateGuide,
  TemplateRect,
  TemplateRegion,
  TemplateSurface,
} from '../types/template.ts'

export type TemplatePhysicalSize = {
  widthMm: number
  heightMm: number
}

export type TemplateExportPixelSize = {
  widthPx: number
  heightPx: number
  dpi: number
}

export type RectangularTemplateValidationResult = {
  valid: boolean
  errors: string[]
}

export const DEFAULT_TEMPLATE_EXPORT_DPI = 300
export const TEMPLATE_MM_PER_INCH = 25.4

export function mmToTemplatePixels(
  mm: number,
  dpi = DEFAULT_TEMPLATE_EXPORT_DPI,
) {
  return Math.round((mm / TEMPLATE_MM_PER_INCH) * dpi)
}

export function templatePixelsToMillimeters(
  pixels: number,
  dpi = DEFAULT_TEMPLATE_EXPORT_DPI,
) {
  return (pixels / dpi) * TEMPLATE_MM_PER_INCH
}

export function isDiscTemplate(template: PrintTemplate): template is DiscTemplate {
  return template.type === 'disc'
}

export function isRectangularPrintTemplate(
  template: PrintTemplate,
): template is RectangularPrintTemplate {
  return template.type === 'caseInsert'
}

export function getTemplatePhysicalSize(
  template: PrintTemplate,
): TemplatePhysicalSize {
  if (isDiscTemplate(template)) {
    return {
      widthMm: template.outerDiameterMm,
      heightMm: template.outerDiameterMm,
    }
  }

  return {
    widthMm: template.widthMm,
    heightMm: template.heightMm,
  }
}

export function getTemplateExportPixelSize(
  template: PrintTemplate,
  dpi = DEFAULT_TEMPLATE_EXPORT_DPI,
): TemplateExportPixelSize {
  const physicalSize = getTemplatePhysicalSize(template)

  return {
    widthPx: mmToTemplatePixels(physicalSize.widthMm, dpi),
    heightPx: mmToTemplatePixels(physicalSize.heightMm, dpi),
    dpi,
  }
}

export function getTemplateSurface(
  template: RectangularPrintTemplate,
  surfaceId: string,
): TemplateSurface | null {
  return template.surfaces?.find((surface) => surface.id === surfaceId) ?? null
}

export function getTemplateSurfaceExportPixelSize(
  template: RectangularPrintTemplate,
  surfaceId: string,
  dpi = DEFAULT_TEMPLATE_EXPORT_DPI,
): TemplateExportPixelSize | null {
  const surface = getTemplateSurface(template, surfaceId)

  if (!surface) {
    return null
  }

  return {
    widthPx: mmToTemplatePixels(surface.widthMm, dpi),
    heightPx: mmToTemplatePixels(surface.heightMm, dpi),
    dpi,
  }
}

export function getTemplateRegion(
  template: RectangularPrintTemplate,
  regionId: string,
): TemplateRegion | null {
  return template.regions.find((region) => region.id === regionId) ?? null
}

export function getTemplateGuide(
  template: RectangularPrintTemplate,
  guideId: string,
): TemplateGuide | null {
  return template.guides.find((guide) => guide.id === guideId) ?? null
}

export function getTemplateRectRightMm(rect: TemplateRect) {
  return rect.xMm + rect.widthMm
}

export function getTemplateRectBottomMm(rect: TemplateRect) {
  return rect.yMm + rect.heightMm
}

export function isTemplateRectInside(
  inner: TemplateRect,
  outer: TemplateRect,
) {
  return (
    inner.xMm >= outer.xMm &&
    inner.yMm >= outer.yMm &&
    getTemplateRectRightMm(inner) <= getTemplateRectRightMm(outer) &&
    getTemplateRectBottomMm(inner) <= getTemplateRectBottomMm(outer)
  )
}

function validatePositiveRect(
  label: string,
  rect: TemplateRect,
  errors: string[],
) {
  if (rect.widthMm <= 0 || rect.heightMm <= 0) {
    errors.push(`${label} must have positive width and height.`)
  }
}

function validateRegion(
  template: RectangularPrintTemplate,
  region: TemplateRegion,
  canvasBounds: TemplateRect,
  errors: string[],
) {
  validatePositiveRect(`Region "${region.id}"`, region.bounds, errors)

  if (region.surfaceId && !template.surfaces?.some(({ id }) => id === region.surfaceId)) {
    errors.push(
      `Region "${region.id}" references missing surface "${region.surfaceId}".`,
    )
  }

  if (!isTemplateRectInside(region.bounds, canvasBounds)) {
    errors.push(`Region "${region.id}" must stay inside the template canvas.`)
  }

  if (
    region.parentRegionId &&
    !template.regions.some(({ id }) => id === region.parentRegionId)
  ) {
    errors.push(
      `Region "${region.id}" references missing parent "${region.parentRegionId}".`,
    )
  }
}

function getTemplateCanvasBounds(
  template: RectangularPrintTemplate,
  surfaceId?: string,
): TemplateRect {
  const surface = surfaceId ? getTemplateSurface(template, surfaceId) : null

  return {
    xMm: 0,
    yMm: 0,
    widthMm: surface?.widthMm ?? template.widthMm,
    heightMm: surface?.heightMm ?? template.heightMm,
  }
}

function validateGuide(
  template: RectangularPrintTemplate,
  guide: TemplateGuide,
  regionIds: Set<string>,
  errors: string[],
) {
  if (guide.surfaceId && !template.surfaces?.some(({ id }) => id === guide.surfaceId)) {
    errors.push(
      `Guide "${guide.id}" references missing surface "${guide.surfaceId}".`,
    )
  }

  if (guide.regionId && !regionIds.has(guide.regionId)) {
    errors.push(`Guide "${guide.id}" references missing region "${guide.regionId}".`)
  }

  const guideRegion = guide.regionId ? getTemplateRegion(template, guide.regionId) : null
  const canvasBounds = getTemplateCanvasBounds(
    template,
    guide.surfaceId ?? guideRegion?.surfaceId,
  )

  if (guide.bounds) {
    validatePositiveRect(`Guide "${guide.id}" bounds`, guide.bounds, errors)

    if (!isTemplateRectInside(guide.bounds, canvasBounds)) {
      errors.push(`Guide "${guide.id}" bounds must stay inside the template canvas.`)
    }
  }

  if (guide.line) {
    const offsetLimit =
      guide.line.orientation === 'vertical'
        ? canvasBounds.widthMm
        : canvasBounds.heightMm
    const endLimit =
      guide.line.orientation === 'vertical'
        ? canvasBounds.heightMm
        : canvasBounds.widthMm

    if (guide.line.offsetMm < 0 || guide.line.offsetMm > offsetLimit) {
      errors.push(`Guide "${guide.id}" line offset must stay inside the canvas.`)
    }

    if (
      guide.line.startMm < 0 ||
      guide.line.endMm < guide.line.startMm ||
      guide.line.endMm > endLimit
    ) {
      errors.push(`Guide "${guide.id}" line span must stay inside the canvas.`)
    }
  }
}

export function validateRectangularPrintTemplate(
  template: RectangularPrintTemplate,
): RectangularTemplateValidationResult {
  const errors: string[] = []
  const regionIds = new Set<string>()
  const surfaceIds = new Set<string>()

  if (template.widthMm <= 0 || template.heightMm <= 0) {
    errors.push('Template must have positive width and height.')
  }

  for (const surface of template.surfaces ?? []) {
    if (surfaceIds.has(surface.id)) {
      errors.push(`Surface "${surface.id}" is duplicated.`)
    }

    surfaceIds.add(surface.id)

    if (surface.widthMm <= 0 || surface.heightMm <= 0) {
      errors.push(`Surface "${surface.id}" must have positive width and height.`)
    }
  }

  for (const region of template.regions) {
    if (regionIds.has(region.id)) {
      errors.push(`Region "${region.id}" is duplicated.`)
    }

    regionIds.add(region.id)
    validateRegion(
      template,
      region,
      getTemplateCanvasBounds(template, region.surfaceId),
      errors,
    )
  }

  for (const guide of template.guides) {
    validateGuide(template, guide, regionIds, errors)
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
