import type { CaseInsertTemplateType } from '../editor/editorTypes'

export type TemplateUnits = 'mm'

export type TemplateKind = 'disc' | 'caseInsert'

export type TemplateAnchor = 'center' | 'top-left'

export type TemplateRegionRole =
  | 'canvas'
  | 'bleed'
  | 'trim'
  | 'safe'
  | 'front'
  | 'back'
  | 'spine'
  | 'printable'

export type TemplateGuideType =
  | 'outerEdge'
  | 'centerHole'
  | 'safeZone'
  | 'bleedZone'
  | 'trimLine'
  | 'foldLine'
  | 'spineLine'
  | 'regionBounds'

export type TemplateLineOrientation = 'horizontal' | 'vertical'

export interface TemplateRect {
  xMm: number
  yMm: number
  widthMm: number
  heightMm: number
}

export interface TemplateSurface {
  id: string
  name: string
  widthMm: number
  heightMm: number
  geometryNote?: string
}

export interface TemplateLine {
  orientation: TemplateLineOrientation
  offsetMm: number
  startMm: number
  endMm: number
}

export interface BaseTemplate {
  id: string
  name: string
  type: TemplateKind
  units: TemplateUnits
  geometryNote?: string
}

export interface DiscTemplate extends BaseTemplate {
  type: 'disc'
  outerDiameterMm: number
  physicalCenterHoleDiameterMm: number
  innerHoleDiameterMm: number
  printableDiameterMm: number
  safeDiameterMm: number
  bleedDiameterMm?: number
  defaultZones: TemplateZone[]
  guides?: TemplateGuide[]
  masks?: TemplateMask[]
}

export interface TemplateZone {
  id: string
  name: string
  xMm: number
  yMm: number
  widthMm: number
  heightMm: number
  anchor: TemplateAnchor
}

export interface TemplateRegion {
  id: string
  name: string
  role: TemplateRegionRole
  surfaceId?: string
  bounds: TemplateRect
  parentRegionId?: string
}

export interface TemplateGuide {
  id: string
  name: string
  type: TemplateGuideType
  visibleByDefault: boolean
  surfaceId?: string
  regionId?: string
  bounds?: TemplateRect
  line?: TemplateLine
}

export interface TemplateMask {
  id: string
  name: string
  type: 'circle' | 'rectangle'
  xMm: number
  yMm: number
  widthMm: number
  heightMm: number
}

export interface RectangularPrintTemplate extends BaseTemplate {
  type: 'caseInsert'
  variant: CaseInsertTemplateType
  widthMm: number
  heightMm: number
  surfaces?: TemplateSurface[]
  regions: TemplateRegion[]
  guides: TemplateGuide[]
  masks?: TemplateMask[]
}

export type PrintTemplate = DiscTemplate | RectangularPrintTemplate
