import {
  DEFAULT_CASE_INSERT_TEMPLATE_TYPE,
  type SupportedCaseInsertTemplateType,
} from '../editor/editorTypes.ts'
import type {
  RectangularPrintTemplate,
  TemplateGuide,
  TemplateRect,
  TemplateRegion,
} from '../types/template.ts'
import {
  getTemplateGuide,
  getTemplateRegion,
  templatePixelsToMillimeters,
} from './templateModel.ts'

export type CaseInsertTemplateId = SupportedCaseInsertTemplateType

export type JewelCaseSurfaceId = 'front' | 'back'

export type JewelCaseRegionId =
  | 'frontBleed'
  | 'frontTrim'
  | 'front'
  | 'frontSafe'
  | 'backBleed'
  | 'backTrim'
  | 'back'
  | 'backSafe'
  | 'backPanel'
  | 'backPanelSafe'
  | 'leftSpine'
  | 'leftSpineSafe'
  | 'rightSpine'
  | 'rightSpineSafe'

export type JewelCaseGuideId =
  | 'frontBleedBounds'
  | 'frontTrimBounds'
  | 'frontBounds'
  | 'frontSafeBounds'
  | 'backBleedBounds'
  | 'backTrimBounds'
  | 'backBounds'
  | 'backSafeBounds'
  | 'backPanelBounds'
  | 'backPanelSafeBounds'
  | 'leftSpineBounds'
  | 'leftSpineSafeBounds'
  | 'rightSpineBounds'
  | 'rightSpineSafeBounds'
  | 'leftSpineFold'
  | 'rightSpineFold'

export const JEWEL_CASE_FRONT_SURFACE_WIDTH_PX = 1414
export const JEWEL_CASE_FRONT_SURFACE_HEIGHT_PX = 1414
export const JEWEL_CASE_BACK_SURFACE_WIDTH_PX = 1780
export const JEWEL_CASE_BACK_SURFACE_HEIGHT_PX = 1390
export const JEWEL_CASE_SPINE_WIDTH_PX = 75
export const JEWEL_CASE_BACK_PANEL_WIDTH_PX =
  JEWEL_CASE_BACK_SURFACE_WIDTH_PX - JEWEL_CASE_SPINE_WIDTH_PX * 2
export const JEWEL_CASE_SAFE_MARGIN_PX = 48
export const JEWEL_CASE_SPINE_SAFE_SIDE_MARGIN_PX = 10

export const JEWEL_CASE_FRONT_SURFACE_WIDTH_MM = templatePixelsToMillimeters(
  JEWEL_CASE_FRONT_SURFACE_WIDTH_PX,
)
export const JEWEL_CASE_FRONT_SURFACE_HEIGHT_MM = templatePixelsToMillimeters(
  JEWEL_CASE_FRONT_SURFACE_HEIGHT_PX,
)
export const JEWEL_CASE_BACK_SURFACE_WIDTH_MM = templatePixelsToMillimeters(
  JEWEL_CASE_BACK_SURFACE_WIDTH_PX,
)
export const JEWEL_CASE_BACK_SURFACE_HEIGHT_MM = templatePixelsToMillimeters(
  JEWEL_CASE_BACK_SURFACE_HEIGHT_PX,
)
export const JEWEL_CASE_SPINE_WIDTH_MM = templatePixelsToMillimeters(
  JEWEL_CASE_SPINE_WIDTH_PX,
)
export const JEWEL_CASE_BACK_PANEL_WIDTH_MM = templatePixelsToMillimeters(
  JEWEL_CASE_BACK_PANEL_WIDTH_PX,
)
export const JEWEL_CASE_SAFE_MARGIN_MM = templatePixelsToMillimeters(
  JEWEL_CASE_SAFE_MARGIN_PX,
)
export const JEWEL_CASE_SPINE_SAFE_SIDE_MARGIN_MM =
  templatePixelsToMillimeters(JEWEL_CASE_SPINE_SAFE_SIDE_MARGIN_PX)

const frontSurfaceRect: TemplateRect = {
  xMm: 0,
  yMm: 0,
  widthMm: JEWEL_CASE_FRONT_SURFACE_WIDTH_MM,
  heightMm: JEWEL_CASE_FRONT_SURFACE_HEIGHT_MM,
}

const backSurfaceRect: TemplateRect = {
  xMm: 0,
  yMm: 0,
  widthMm: JEWEL_CASE_BACK_SURFACE_WIDTH_MM,
  heightMm: JEWEL_CASE_BACK_SURFACE_HEIGHT_MM,
}

const leftSpineRegion: TemplateRect = {
  xMm: 0,
  yMm: 0,
  widthMm: JEWEL_CASE_SPINE_WIDTH_MM,
  heightMm: JEWEL_CASE_BACK_SURFACE_HEIGHT_MM,
}

const backPanelRegion: TemplateRect = {
  xMm: JEWEL_CASE_SPINE_WIDTH_MM,
  yMm: 0,
  widthMm: JEWEL_CASE_BACK_PANEL_WIDTH_MM,
  heightMm: JEWEL_CASE_BACK_SURFACE_HEIGHT_MM,
}

const rightSpineRegion: TemplateRect = {
  xMm: JEWEL_CASE_SPINE_WIDTH_MM + JEWEL_CASE_BACK_PANEL_WIDTH_MM,
  yMm: 0,
  widthMm: JEWEL_CASE_SPINE_WIDTH_MM,
  heightMm: JEWEL_CASE_BACK_SURFACE_HEIGHT_MM,
}

function insetRect(
  rect: TemplateRect,
  xMarginMm: number,
  yMarginMm = xMarginMm,
): TemplateRect {
  return {
    xMm: rect.xMm + xMarginMm,
    yMm: rect.yMm + yMarginMm,
    widthMm: Math.max(0, rect.widthMm - xMarginMm * 2),
    heightMm: Math.max(0, rect.heightMm - yMarginMm * 2),
  }
}

const jewelCaseRegions: TemplateRegion[] = [
  {
    id: 'frontBleed',
    name: 'Front bleed bounds',
    role: 'bleed',
    surfaceId: 'front',
    bounds: frontSurfaceRect,
  },
  {
    id: 'frontTrim',
    name: 'Front trim bounds',
    role: 'trim',
    surfaceId: 'front',
    bounds: frontSurfaceRect,
    parentRegionId: 'frontBleed',
  },
  {
    id: 'front',
    name: 'Front cover',
    role: 'front',
    surfaceId: 'front',
    bounds: frontSurfaceRect,
    parentRegionId: 'frontTrim',
  },
  {
    id: 'frontSafe',
    name: 'Front cover safe area',
    role: 'safe',
    surfaceId: 'front',
    bounds: insetRect(frontSurfaceRect, JEWEL_CASE_SAFE_MARGIN_MM),
    parentRegionId: 'front',
  },
  {
    id: 'backBleed',
    name: 'Back tray bleed bounds',
    role: 'bleed',
    surfaceId: 'back',
    bounds: backSurfaceRect,
  },
  {
    id: 'backTrim',
    name: 'Back tray trim bounds',
    role: 'trim',
    surfaceId: 'back',
    bounds: backSurfaceRect,
    parentRegionId: 'backBleed',
  },
  {
    id: 'back',
    name: 'Back tray card',
    role: 'back',
    surfaceId: 'back',
    bounds: backSurfaceRect,
    parentRegionId: 'backTrim',
  },
  {
    id: 'backSafe',
    name: 'Back tray safe area',
    role: 'safe',
    surfaceId: 'back',
    bounds: insetRect(backSurfaceRect, JEWEL_CASE_SAFE_MARGIN_MM),
    parentRegionId: 'back',
  },
  {
    id: 'leftSpine',
    name: 'Left spine',
    role: 'spine',
    surfaceId: 'back',
    bounds: leftSpineRegion,
    parentRegionId: 'back',
  },
  {
    id: 'leftSpineSafe',
    name: 'Left spine safe area',
    role: 'safe',
    surfaceId: 'back',
    bounds: insetRect(
      leftSpineRegion,
      JEWEL_CASE_SPINE_SAFE_SIDE_MARGIN_MM,
      JEWEL_CASE_SAFE_MARGIN_MM,
    ),
    parentRegionId: 'leftSpine',
  },
  {
    id: 'backPanel',
    name: 'Back cover panel',
    role: 'printable',
    surfaceId: 'back',
    bounds: backPanelRegion,
    parentRegionId: 'back',
  },
  {
    id: 'backPanelSafe',
    name: 'Back cover panel safe area',
    role: 'safe',
    surfaceId: 'back',
    bounds: insetRect(backPanelRegion, JEWEL_CASE_SAFE_MARGIN_MM),
    parentRegionId: 'backPanel',
  },
  {
    id: 'rightSpine',
    name: 'Right spine',
    role: 'spine',
    surfaceId: 'back',
    bounds: rightSpineRegion,
    parentRegionId: 'back',
  },
  {
    id: 'rightSpineSafe',
    name: 'Right spine safe area',
    role: 'safe',
    surfaceId: 'back',
    bounds: insetRect(
      rightSpineRegion,
      JEWEL_CASE_SPINE_SAFE_SIDE_MARGIN_MM,
      JEWEL_CASE_SAFE_MARGIN_MM,
    ),
    parentRegionId: 'rightSpine',
  },
]

function createRegionBoundsGuide(
  id: JewelCaseGuideId,
  name: string,
  regionId: JewelCaseRegionId,
): TemplateGuide {
  const region = jewelCaseRegions.find(({ id: currentId }) => currentId === regionId)

  return {
    id,
    name,
    type: 'regionBounds',
    surfaceId: region?.surfaceId,
    regionId,
    visibleByDefault: true,
  }
}

const spineFoldStartMm = 0
const spineFoldEndMm = JEWEL_CASE_BACK_SURFACE_HEIGHT_MM

const jewelCaseGuides: TemplateGuide[] = [
  createRegionBoundsGuide('frontBleedBounds', 'Front bleed bounds', 'frontBleed'),
  createRegionBoundsGuide('frontTrimBounds', 'Front trim bounds', 'frontTrim'),
  createRegionBoundsGuide('frontBounds', 'Front cover bounds', 'front'),
  createRegionBoundsGuide('frontSafeBounds', 'Front safe bounds', 'frontSafe'),
  createRegionBoundsGuide('backBleedBounds', 'Back tray bleed bounds', 'backBleed'),
  createRegionBoundsGuide('backTrimBounds', 'Back tray trim bounds', 'backTrim'),
  createRegionBoundsGuide('backBounds', 'Back tray bounds', 'back'),
  createRegionBoundsGuide('backSafeBounds', 'Back tray safe bounds', 'backSafe'),
  createRegionBoundsGuide('backPanelBounds', 'Back panel bounds', 'backPanel'),
  createRegionBoundsGuide(
    'backPanelSafeBounds',
    'Back panel safe bounds',
    'backPanelSafe',
  ),
  createRegionBoundsGuide('leftSpineBounds', 'Left spine bounds', 'leftSpine'),
  createRegionBoundsGuide(
    'leftSpineSafeBounds',
    'Left spine safe bounds',
    'leftSpineSafe',
  ),
  createRegionBoundsGuide('rightSpineBounds', 'Right spine bounds', 'rightSpine'),
  createRegionBoundsGuide(
    'rightSpineSafeBounds',
    'Right spine safe bounds',
    'rightSpineSafe',
  ),
  {
    id: 'leftSpineFold',
    name: 'Left spine fold line',
    type: 'foldLine',
    surfaceId: 'back',
    visibleByDefault: true,
    line: {
      orientation: 'vertical',
      offsetMm: JEWEL_CASE_SPINE_WIDTH_MM,
      startMm: spineFoldStartMm,
      endMm: spineFoldEndMm,
    },
  },
  {
    id: 'rightSpineFold',
    name: 'Right spine fold line',
    type: 'foldLine',
    surfaceId: 'back',
    visibleByDefault: true,
    line: {
      orientation: 'vertical',
      offsetMm: JEWEL_CASE_SPINE_WIDTH_MM + JEWEL_CASE_BACK_PANEL_WIDTH_MM,
      startMm: spineFoldStartMm,
      endMm: spineFoldEndMm,
    },
  },
]

export const jewelCaseInsertTemplate: RectangularPrintTemplate = {
  id: DEFAULT_CASE_INSERT_TEMPLATE_TYPE,
  name: 'Jewel case insert set',
  type: 'caseInsert',
  variant: DEFAULT_CASE_INSERT_TEMPLATE_TYPE,
  units: 'mm',
  widthMm: JEWEL_CASE_BACK_SURFACE_WIDTH_MM,
  heightMm: JEWEL_CASE_BACK_SURFACE_HEIGHT_MM,
  geometryNote:
    'Fixed Steam Game Covers-style jewel case template. Export the front and back tray as separate surfaces; the back tray surface already includes both 75 px spine strips.',
  surfaces: [
    {
      id: 'front',
      name: 'Front cover print surface',
      widthMm: JEWEL_CASE_FRONT_SURFACE_WIDTH_MM,
      heightMm: JEWEL_CASE_FRONT_SURFACE_HEIGHT_MM,
      geometryNote: 'Matches the measured SGC front cut area: 1414 x 1414 px at 300 DPI.',
    },
    {
      id: 'back',
      name: 'Back tray print surface',
      widthMm: JEWEL_CASE_BACK_SURFACE_WIDTH_MM,
      heightMm: JEWEL_CASE_BACK_SURFACE_HEIGHT_MM,
      geometryNote:
        'Matches the measured SGC back cut area: 1780 x 1390 px at 300 DPI, including two 75 px spine strips.',
    },
  ],
  regions: jewelCaseRegions,
  guides: jewelCaseGuides,
}

export const caseInsertTemplates: Record<
  CaseInsertTemplateId,
  RectangularPrintTemplate
> = {
  jewelCase: jewelCaseInsertTemplate,
}

export const caseInsertTemplateOptions = Object.values(caseInsertTemplates)

export function getCaseInsertTemplate(
  templateId: CaseInsertTemplateId = DEFAULT_CASE_INSERT_TEMPLATE_TYPE,
): RectangularPrintTemplate {
  return caseInsertTemplates[templateId]
}

export function getCaseInsertTemplateRegion(
  templateId: CaseInsertTemplateId,
  regionId: JewelCaseRegionId,
): TemplateRegion | null {
  return getTemplateRegion(getCaseInsertTemplate(templateId), regionId)
}

export function getJewelCaseTemplateRegion(
  regionId: JewelCaseRegionId,
): TemplateRegion | null {
  return getCaseInsertTemplateRegion(DEFAULT_CASE_INSERT_TEMPLATE_TYPE, regionId)
}

export function getCaseInsertTemplateGuide(
  templateId: CaseInsertTemplateId,
  guideId: JewelCaseGuideId,
): TemplateGuide | null {
  return getTemplateGuide(getCaseInsertTemplate(templateId), guideId)
}

export function getJewelCaseTemplateGuide(
  guideId: JewelCaseGuideId,
): TemplateGuide | null {
  return getCaseInsertTemplateGuide(DEFAULT_CASE_INSERT_TEMPLATE_TYPE, guideId)
}
