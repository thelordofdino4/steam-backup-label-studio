import type { DiscTemplate } from '../types/template'
import type { ExportGuideMode, ExportGuideSelection } from '../export/exportGuides'
import type {
  DiscTextKey,
  DiscTextLayout,
  DiscTextSettings,
  DiscTextValues,
  SteamLogoPlacement,
} from '../discText/types'
import type { DiscTextStyle } from '../discText/styles'
import type { DiscTextValueSources } from './metadataDiscTextTypes'
import type { DiscTemplateId } from '../templates/discTemplates'
import type {
  JewelCaseGuideId,
  JewelCaseSurfaceId,
} from '../templates/caseInsertTemplates'
import type { CaseInsertTemplatePaneId } from '../caseInsert/templateSurfaces'
import type { SteamImportedGame } from '../steam/steamApi'
import type {
  EditorProjectType,
  SupportedCaseInsertTemplateType,
} from '../editor/editorTypes'
import type { LegacyTextContentMode } from '../text/htmlText'

export type SteamBannerColors = {
  gradientStart: string
  gradientEnd: string
  accent: string
}

export type SteamBannerLockupLayout = {
  scale: number
  offsetX: number
  offsetY: number
}

export type GameRatingSystem = 'none' | 'ESRB' | 'PEGI' | 'USK' | 'custom'

export type ProjectMetadata = {
  title: string
  subtitle: string
  steamAppId: string
  developer: string
  publisher: string
  releaseDate: string
  backupDate: string
  discNumber: string
  discTotal: string
  installNotes: string
  copyrightText: string
  ratingSystem: GameRatingSystem
  ratingValue: string
}

export type SelectedDiscTemplateId = DiscTemplateId | 'custom'

export type BackgroundOffset = {
  x: number
  y: number
}

export type ImageContentBounds = {
  x: number
  y: number
  width: number
  height: number
}

export type ImageContentShape = {
  width: number
  height: number
  path: string
  fillRule: 'evenodd'
  safetyOutset?: number
}

export type BackgroundImageSize = {
  width: number
  height: number
  contentBounds?: ImageContentBounds | null
  contentShape?: ImageContentShape | null
}

export type ProjectImageAssetSource =
  | 'built-in'
  | 'placeholder'
  | 'steam-artwork'
  | 'web-artwork'
  | 'steam-logo-candidate'
  | 'official-logo-candidate'
  | 'local-steam-screenshot'
  | 'uploaded'
  | 'custom'
  | 'embedded'

export type ProjectImageAssetProvenance = {
  source: ProjectImageAssetSource
  sourceId: string | null
  sourceLabel: string
  sourceUrl?: string | null
}

export type LogoAssetLayout = {
  enabled: boolean
  scale: number
  x: number
  y: number
}

export type ProjectAdditionalLogoAsset = {
  id: string
  label: string
  imageDataUrl: string | null
  imageSource?: ProjectImageAssetProvenance | null
  imageSize: BackgroundImageSize | null
  layout: LogoAssetLayout
}

export type ProjectLogoAssets = {
  developerLogoDataUrl: string | null
  developerLogoSource: ProjectImageAssetProvenance | null
  developerLogoSize: BackgroundImageSize | null
  developerLogoLayout: LogoAssetLayout
  additionalDeveloperLogos: ProjectAdditionalLogoAsset[]
  publisherLogoDataUrl: string | null
  publisherLogoSource: ProjectImageAssetProvenance | null
  publisherLogoSize: BackgroundImageSize | null
  publisherLogoLayout: LogoAssetLayout
  additionalPublisherLogos: ProjectAdditionalLogoAsset[]
}

export type ProjectLogoAssetsInput =
  Partial<Omit<ProjectLogoAssets, 'additionalDeveloperLogos' | 'additionalPublisherLogos'>> & {
    additionalDeveloperLogos?: Array<Partial<ProjectAdditionalLogoAsset>>
    additionalPublisherLogos?: Array<Partial<ProjectAdditionalLogoAsset>>
  }

export type TitleArtworkSource = 'steam' | 'custom'

export type TitleArtworkLayout = {
  enabled: boolean
  scale: number
  x: number
  y: number
}

export type ProjectTitleArtworkDefaultAsset = {
  steamArtworkAssetId: string
  sourceLabel: string
  imageDataUrl: string
  imageSize: BackgroundImageSize
}

export type ProjectTitleArtwork = {
  source: TitleArtworkSource
  steamArtworkAssetId: string | null
  sourceLabel: string
  imageDataUrl: string | null
  imageSize: BackgroundImageSize | null
  defaultSteamLogo: ProjectTitleArtworkDefaultAsset | null
  layout: TitleArtworkLayout
}

export type DiscNumberArtworkMode = 'text' | 'badge'

export type DiscNumberBadgeSet = 'starterRing'

export type ProjectDiscNumberArtwork = {
  mode: DiscNumberArtworkMode
  badgeSet: DiscNumberBadgeSet
}

export type AdditionalArtworkSource =
  | 'custom'
  | 'steam-artwork'
  | 'web-artwork'
  | 'local-steam-screenshot'

export type AdditionalArtworkLayout = {
  enabled: boolean
  scale: number
  x: number
  y: number
}

export type AdditionalArtworkFrameShape = 'rectangle' | 'circle'

export type AdditionalArtworkFrameStyle = 'solid' | 'rocky'

export type AdditionalArtworkFrame = {
  enabled: boolean
  color: string
  width: number
  shape: AdditionalArtworkFrameShape
  style: AdditionalArtworkFrameStyle
  lumpiness: number
  jaggedness: number
  roughnessOffset: number
}

export type ProjectAdditionalArtworkElement = {
  id: string
  label: string
  source: AdditionalArtworkSource
  sourceId: string | null
  sourceLabel: string
  imageDataUrl: string | null
  imageSize: BackgroundImageSize | null
  layout: AdditionalArtworkLayout
  frame: AdditionalArtworkFrame
}

export type ProjectAdditionalArtwork = {
  enabled: boolean
  elements: ProjectAdditionalArtworkElement[]
}

export type ProjectAdditionalArtworkInput =
  Partial<Omit<ProjectAdditionalArtwork, 'elements'>> & {
    elements?: Array<Partial<ProjectAdditionalArtworkElement>>
  }

export type RatingBadgeSource = 'placeholder' | 'custom'

export type RatingBadgeLayout = {
  enabled: boolean
  scale: number
  x: number
  y: number
}

export type ProjectSupplementalUskRatingBadge = {
  ratingValue: string
  layout: RatingBadgeLayout
}

export type ProjectRatingBadge = {
  source: RatingBadgeSource
  customImageDataUrl: string | null
  customImageSize: BackgroundImageSize | null
  layout: RatingBadgeLayout
  uskBadge: ProjectSupplementalUskRatingBadge
}

export type MediaMarkValue =
  | 'bluRay'
  | 'dvd'
  | 'dvdRom'
  | 'cdRom'
  | 'dataDisc'
  | 'installDisc'

export type MediaMarkSource = 'placeholder' | 'custom'

export type MediaMarkTheme = 'light' | 'dark'

export type MediaMarkLayout = {
  enabled: boolean
  scale: number
  x: number
  y: number
}

export type ProjectMediaMark = {
  value: MediaMarkValue
  source: MediaMarkSource
  theme: MediaMarkTheme
  customImageDataUrl: string | null
  customImageSize: BackgroundImageSize | null
  layout: MediaMarkLayout
}

export type PlatformMarkValue =
  | 'pc'
  | 'windows'
  | 'linux'
  | 'steamDeck'
  | 'macos'

export type ProjectPlatformMarkInference = {
  source: 'none' | 'manual' | 'steam-appdetails'
  status: 'not-applied' | 'manual' | 'applied' | 'no-data'
  steamAppId: number | null
  values: PlatformMarkValue[]
  message: string
}

export type PlatformMarkSource = 'placeholder' | 'custom'

export type PlatformMarkTheme =
  | 'color'
  | 'light'
  | 'dark'
  | 'macos1988'
  | 'macos1995'
  | 'macos2001'
  | 'macos2003'
  | 'macos2012'
  | 'macos2016'
  | 'macos2017'
  | 'retro'
  | 'xp'
  | 'vista'
  | 'windows7'
  | 'windows10'
  | 'windows11'
  | 'pcPlatform'
  | 'pcSimplified'
  | 'pcSimplifiedDark'

export type PlatformMarkLayout = {
  enabled: boolean
  scale: number
  x: number
  y: number
}

export type ProjectPlatformMarkAsset = {
  source: PlatformMarkSource
  theme: PlatformMarkTheme
  customImageDataUrl: string | null
  customImageSize: BackgroundImageSize | null
  layout: PlatformMarkLayout
}

export type ProjectPlatformMarks = {
  values: PlatformMarkValue[]
  assets: Partial<Record<PlatformMarkValue, ProjectPlatformMarkAsset>>
  inference?: ProjectPlatformMarkInference
}

export type TechnicalMarkValue =
  | 'audio'
  | 'surround'
  | 'codec'
  | 'middleware'
  | 'technology'

export type TechnicalMarkSource = 'placeholder' | 'custom'

export type TechnicalMarkLayout = {
  enabled: boolean
  scale: number
  x: number
  y: number
}

export type ProjectTechnicalMarkAsset = {
  id?: string
  label: string
  source: TechnicalMarkSource
  customImageDataUrl: string | null
  customImageSize: BackgroundImageSize | null
  layout: TechnicalMarkLayout
}

export type ProjectTechnicalMarks = {
  values: TechnicalMarkValue[]
  assets: Partial<Record<TechnicalMarkValue, ProjectTechnicalMarkAsset>>
  additionalAssets?: Partial<Record<TechnicalMarkValue, ProjectTechnicalMarkAsset[]>>
}

export type ProjectTechnicalMarksInput =
  Partial<Omit<ProjectTechnicalMarks, 'assets' | 'additionalAssets'>> & {
    assets?: Partial<Record<TechnicalMarkValue, Partial<ProjectTechnicalMarkAsset>>>
    additionalAssets?: Partial<Record<TechnicalMarkValue, Array<Partial<ProjectTechnicalMarkAsset>>>>
  }

export type ProjectCaseInsertImageFit = 'cover' | 'contain' | 'scale' | 'crop'

export type ProjectCaseInsertLayout = {
  scale: number
  fontSizePt?: number
  width?: number
  x: number
  y: number
  rotation: number
}

export type ProjectCaseInsertSteamBanner = {
  enabled: boolean
  colors: SteamBannerColors
  lockupImageDataUrl: string | null
  lockupImageSource?: ProjectImageAssetProvenance | null
  lockupImageSize: BackgroundImageSize | null
  lockupLayout: ProjectCaseInsertLayout
  useTextFallback: boolean
  fallbackText: string
}

export type ProjectCaseInsertTitleArtworkDefaultAsset = {
  steamArtworkAssetId: string
  sourceLabel: string
  sourceUrl: string | null
  imageDataUrl: string
  imageSize: BackgroundImageSize
}

export type ProjectCaseInsertImageSlot = {
  id: string
  label: string
  enabled: boolean
  imageDataUrl: string | null
  imageSource?: ProjectImageAssetProvenance | null
  imageSize: BackgroundImageSize | null
  defaultSteamLogo: ProjectCaseInsertTitleArtworkDefaultAsset | null
  fit: ProjectCaseInsertImageFit
  layout: ProjectCaseInsertLayout
  frame: AdditionalArtworkFrame
}

export type ProjectCaseInsertTextSource = 'manual' | 'metadata' | 'steam'

export type ProjectCaseInsertTextAlign = 'left' | 'center' | 'right'

export type ProjectCaseInsertTextBlock = {
  id: string
  label: string
  enabled: boolean
  value: string
  contentMode?: LegacyTextContentMode
  htmlSource?: string
  markdownSource?: string
  source: ProjectCaseInsertTextSource
  avoidVisualElements: boolean
  align: ProjectCaseInsertTextAlign
  layout: ProjectCaseInsertLayout
  style: DiscTextStyle
}

export type ProjectCaseInsertTextList = {
  id: string
  label: string
  enabled: boolean
  items: string[]
  contentMode?: LegacyTextContentMode
  htmlSource?: string
  markdownSource?: string
  source: ProjectCaseInsertTextSource
  avoidVisualElements: boolean
  layout: ProjectCaseInsertLayout
  style: DiscTextStyle
}

export type ProjectCaseInsertSurfaceState = {
  steamBanner: ProjectCaseInsertSteamBanner
  background: ProjectCaseInsertImageSlot
  titleArtwork: ProjectCaseInsertImageSlot
  additionalArtworkEnabled: boolean
  artworkSlots: ProjectCaseInsertImageSlot[]
  logoSlots: ProjectCaseInsertImageSlot[]
  markSlots: ProjectCaseInsertImageSlot[]
  textBlocks: ProjectCaseInsertTextBlock[]
  textLists: ProjectCaseInsertTextList[]
}

export type ProjectJewelCaseSpineSideState = {
  steamBanner: ProjectCaseInsertSteamBanner
  background: ProjectCaseInsertImageSlot
  titleArtwork: ProjectCaseInsertImageSlot
  additionalArtworkEnabled: boolean
  artworkSlots: ProjectCaseInsertImageSlot[]
  logoSlots: ProjectCaseInsertImageSlot[]
  markSlots: ProjectCaseInsertImageSlot[]
  title: ProjectCaseInsertTextBlock
  textBlocks: ProjectCaseInsertTextBlock[]
}

export type ProjectJewelCaseSpineState = {
  mirrored: boolean
  left: ProjectJewelCaseSpineSideState
  right: ProjectJewelCaseSpineSideState
}

export type ProjectJewelCaseExportSettings = {
  surfaces: JewelCaseSurfaceId[]
  guideIds: JewelCaseGuideId[]
}

export type ProjectJewelCaseState = {
  templateType: SupportedCaseInsertTemplateType
  templates: Record<CaseInsertTemplatePaneId, ProjectCaseInsertSurfaceState>
  spine: ProjectJewelCaseSpineState
  export: ProjectJewelCaseExportSettings
}

export type SavedProjectBase = {
  schemaVersion: '0.1.0'
  projectType?: EditorProjectType
  title: string
  savedAt: string
  game: {
    manualTitle: string
    selectedSteamGame: SteamImportedGame | null
  }
  metadata?: ProjectMetadata
}

export type SavedDiscProject = SavedProjectBase & {
  projectType?: 'disc'
  logoAssets?: ProjectLogoAssetsInput
  titleArtwork?: Partial<ProjectTitleArtwork>
  discNumberArtwork?: Partial<ProjectDiscNumberArtwork>
  additionalArtwork?: ProjectAdditionalArtworkInput
  ratingBadge?: ProjectRatingBadge
  mediaMark?: ProjectMediaMark
  platformMarks?: ProjectPlatformMarks
  technicalMarks?: ProjectTechnicalMarksInput
  template: {
    type: 'disc'
    variant: SelectedDiscTemplateId
    customDimensions?: DiscTemplate | null
  }
  steamBackupLogo: {
    placement: SteamLogoPlacement
    bannerColors?: SteamBannerColors
    lockupImageDataUrl?: string | null
    lockupImageSource?: ProjectImageAssetProvenance | null
    lockupImageSize?: BackgroundImageSize | null
    lockupLayout?: SteamBannerLockupLayout
    useTextFallback?: boolean
    fallbackText?: string
  }
  export?: {
    guideMode?: ExportGuideMode
    guides?: ExportGuideSelection
  }
  background: {
    enabled?: boolean
    scale: number
    offset: BackgroundOffset
    imageDataUrl: string | null
    imageSource?: ProjectImageAssetProvenance | null
    imageSize?: BackgroundImageSize | null
    note: string
  }
  discText?: {
    settings?: Partial<DiscTextSettings>
    values?: Partial<DiscTextValues>
    valueSources?: Partial<DiscTextValueSources>
    titleValue?: string
    htmlSources?: Partial<Record<DiscTextKey, string>>
    markdownSources?: Partial<Record<DiscTextKey, string>>
    layout?: Partial<Record<DiscTextKey, Partial<DiscTextLayout>>>
    styles?: Partial<Record<DiscTextKey, Partial<DiscTextStyle>>>
  }
}

export type SavedCaseInsertProject = SavedProjectBase & {
  projectType: 'caseInsert'
  template: {
    type: 'caseInsert'
    variant: SupportedCaseInsertTemplateType
  }
  caseInsert: ProjectJewelCaseState
}

export type SavedProject = SavedDiscProject | SavedCaseInsertProject
