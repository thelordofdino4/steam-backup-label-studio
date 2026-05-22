export interface DiscTemplate {
  id: string
  name: string
  type: 'disc'
  units: 'mm'
  outerDiameterMm: number
  physicalCenterHoleDiameterMm: number
  innerHoleDiameterMm: number
  printableDiameterMm: number
  safeDiameterMm: number
  bleedDiameterMm?: number
  geometryNote?: string
  defaultZones: TemplateZone[]
}

export interface TemplateZone {
  id: string
  name: string
  xMm: number
  yMm: number
  widthMm: number
  heightMm: number
  anchor: 'center' | 'top-left'
}

export interface TemplateGuide {
  id: string
  name: string
  type: 'outerEdge' | 'centerHole' | 'safeZone' | 'bleedZone' | 'foldLine' | 'spineLine'
  visibleByDefault: boolean
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