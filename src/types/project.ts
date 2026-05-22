export type TemplateType = 'disc' | 'jewelCase' | 'dvdCase' | 'bluRayCase'

export type AssetType =
  | 'background'
  | 'logo'
  | 'screenshot'
  | 'icon'
  | 'rating'
  | 'publisherLogo'
  | 'developerLogo'
  | 'misc'

export type AssetSource = 'steam' | 'local' | 'builtIn'

export type LayerType = 'image' | 'text' | 'logo' | 'rating' | 'shape' | 'mask'

export interface ProjectFile {
  schemaVersion: string
  projectId: string
  title: string
  createdAt: string
  updatedAt: string
  steam?: SteamGameMetadata
  templates: TemplateInstance[]
  assets: AssetReference[]
  settings: ProjectSettings
}

export interface ProjectSettings {
  exportDpi: number
  showGuides: boolean
  showBleed: boolean
  showSafeZone: boolean
}

export interface SteamGameMetadata {
  appId: number
  title: string
  developer?: string[]
  publisher?: string[]
  releaseDate?: string
  shortDescription?: string
  longDescription?: string
  genres?: string[]
  categories?: string[]
  minimumRequirements?: string
  recommendedRequirements?: string
  sourceUrl?: string
}

export interface AssetReference {
  id: string
  type: AssetType
  source: AssetSource
  name: string
  path?: string
  url?: string
  width?: number
  height?: number
  attribution?: string
}

export interface TemplateInstance {
  id: string
  templateId: string
  templateType: TemplateType
  name: string
  dimensions: TemplateDimensions
  layers: DesignLayer[]
}

export interface TemplateDimensions {
  units: 'mm'
  widthMm: number
  heightMm: number
}

export interface DesignLayer {
  id: string
  type: LayerType
  name: string
  x: number
  y: number
  width: number
  height: number
  rotation: number
  opacity: number
  zIndex: number
  locked: boolean
  hidden: boolean
  assetId?: string
  text?: TextLayerData
  image?: ImageLayerData
}

export interface TextLayerData {
  value: string
  fontFamily: string
  fontSize: number
  fontWeight?: string
  color: string
  align: 'left' | 'center' | 'right'
  curved?: boolean
  curveMode?: 'topArc' | 'bottomArc' | 'ring'
}

export interface ImageLayerData {
  fitMode: 'contain' | 'cover' | 'stretch' | 'manualCrop'
  cropX?: number
  cropY?: number
  cropWidth?: number
  cropHeight?: number
  maintainAspectRatio: boolean
}
