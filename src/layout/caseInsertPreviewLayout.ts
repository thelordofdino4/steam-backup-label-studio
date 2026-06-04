import {
  DEFAULT_CASE_INSERT_TEMPLATE_TYPE,
  type SupportedCaseInsertTemplateType,
} from '../editor/editorTypes.ts'
import {
  getCaseInsertTemplate,
  type JewelCaseGuideId,
  type JewelCaseRegionId,
  type JewelCaseSurfaceId,
} from '../templates/caseInsertTemplates.ts'
import { mmToTemplatePixels } from '../templates/templateModel.ts'
import type {
  TemplateGuideType,
  TemplateLineOrientation,
  TemplateRegionRole,
} from '../types/template.ts'
import {
  getJewelCaseRegionExportBounds,
  getJewelCaseSurfaceExportSize,
  type JewelCasePixelRect,
} from './jewelCaseLayout.ts'

export type CaseInsertPreviewSurfaceLayout = {
  surfaceId: JewelCaseSurfaceId
  name: string
  bounds: JewelCasePixelRect
}

export type CaseInsertPreviewRegionLayout = {
  regionId: JewelCaseRegionId
  name: string
  role: TemplateRegionRole
  surfaceId: JewelCaseSurfaceId
  parentRegionId?: string
  bounds: JewelCasePixelRect
}

export type CaseInsertPreviewGuideLine = {
  orientation: TemplateLineOrientation
  x1: number
  y1: number
  x2: number
  y2: number
}

export type CaseInsertPreviewGuideLayout = {
  guideId: JewelCaseGuideId
  name: string
  type: TemplateGuideType
  surfaceId: JewelCaseSurfaceId
  regionId?: JewelCaseRegionId
  regionRole?: TemplateRegionRole
  bounds?: JewelCasePixelRect
  line?: CaseInsertPreviewGuideLine
}

export type CaseInsertPreviewLayout = {
  templateId: SupportedCaseInsertTemplateType
  width: number
  height: number
  gap: number
  surfaces: CaseInsertPreviewSurfaceLayout[]
  regions: CaseInsertPreviewRegionLayout[]
  guides: CaseInsertPreviewGuideLayout[]
}

export const JEWEL_CASE_PREVIEW_SURFACE_GAP_PX = 96

function offsetRect(
  rect: JewelCasePixelRect,
  offset: { x: number; y: number },
): JewelCasePixelRect {
  return {
    x: rect.x + offset.x,
    y: rect.y + offset.y,
    width: rect.width,
    height: rect.height,
  }
}

function getSurfaceLayout(
  surfaces: CaseInsertPreviewSurfaceLayout[],
  surfaceId: JewelCaseSurfaceId,
) {
  return surfaces.find((surface) => surface.surfaceId === surfaceId) ?? null
}

function createGuideLine(
  guideSurface: CaseInsertPreviewSurfaceLayout,
  orientation: TemplateLineOrientation,
  offsetMm: number,
  startMm: number,
  endMm: number,
): CaseInsertPreviewGuideLine {
  const offsetPx = mmToTemplatePixels(offsetMm)
  const startPx = mmToTemplatePixels(startMm)
  const endPx = mmToTemplatePixels(endMm)

  return orientation === 'vertical'
    ? {
        orientation,
        x1: guideSurface.bounds.x + offsetPx,
        y1: guideSurface.bounds.y + startPx,
        x2: guideSurface.bounds.x + offsetPx,
        y2: guideSurface.bounds.y + endPx,
      }
    : {
        orientation,
        x1: guideSurface.bounds.x + startPx,
        y1: guideSurface.bounds.y + offsetPx,
        x2: guideSurface.bounds.x + endPx,
        y2: guideSurface.bounds.y + offsetPx,
      }
}

export function createJewelCasePreviewLayout(
  templateId: SupportedCaseInsertTemplateType = DEFAULT_CASE_INSERT_TEMPLATE_TYPE,
  printSurfaceId: JewelCaseSurfaceId = 'front',
): CaseInsertPreviewLayout {
  const template = getCaseInsertTemplate(templateId)
  const surfaceSize = getJewelCaseSurfaceExportSize(printSurfaceId, { templateId })

  if (!surfaceSize) {
    throw new Error(`Could not resolve ${printSurfaceId} preview surface for ${templateId}.`)
  }

  const surfaces: CaseInsertPreviewSurfaceLayout[] = [
    {
      surfaceId: printSurfaceId,
      name: printSurfaceId === 'front' ? 'Cover Sheet' : 'Tray Card',
      bounds: {
        x: 0,
        y: 0,
        width: surfaceSize.width,
        height: surfaceSize.height,
      },
    },
  ]
  const regions = template.regions.flatMap((region) => {
    const surfaceId = region.surfaceId as JewelCaseSurfaceId | undefined
    const surface = surfaceId ? getSurfaceLayout(surfaces, surfaceId) : null
    const regionBounds = getJewelCaseRegionExportBounds(
      region.id as JewelCaseRegionId,
      { templateId },
    )

    if (!surface || !regionBounds) {
      return []
    }

    return [{
      regionId: region.id as JewelCaseRegionId,
      name: region.name,
      role: region.role,
      surfaceId: surface.surfaceId,
      parentRegionId: region.parentRegionId,
      bounds: offsetRect(regionBounds, surface.bounds),
    }]
  })
  const guides = template.guides.flatMap((guide) => {
    const region = guide.regionId
      ? regions.find(({ regionId }) => regionId === guide.regionId)
      : null
    const surfaceId = (guide.surfaceId ?? region?.surfaceId) as
      | JewelCaseSurfaceId
      | undefined
    const surface = surfaceId ? getSurfaceLayout(surfaces, surfaceId) : null

    if (!surface) {
      return []
    }

    const bounds = guide.bounds
      ? offsetRect(
          {
            x: mmToTemplatePixels(guide.bounds.xMm),
            y: mmToTemplatePixels(guide.bounds.yMm),
            width: mmToTemplatePixels(guide.bounds.widthMm),
            height: mmToTemplatePixels(guide.bounds.heightMm),
          },
          surface.bounds,
        )
      : region?.bounds
    const line = guide.line
      ? createGuideLine(
          surface,
          guide.line.orientation,
          guide.line.offsetMm,
          guide.line.startMm,
          guide.line.endMm,
        )
      : undefined

    return [{
      guideId: guide.id as JewelCaseGuideId,
      name: guide.name,
      type: guide.type,
      surfaceId: surface.surfaceId,
      regionId: guide.regionId as JewelCaseRegionId | undefined,
      regionRole: region?.role,
      bounds,
      line,
    }]
  })

  return {
    templateId,
    width: surfaceSize.width,
    height: surfaceSize.height,
    gap: 0,
    surfaces,
    regions,
    guides,
  }
}
