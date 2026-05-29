import type { DiscTemplate } from '../types/template'
import type { ExportGuideMode, ExportGuideSelection } from '../exportGuides'
import type {
  DiscTextKey,
  DiscTextLayout,
  DiscTextSettings,
  DiscTextValues,
  SteamLogoPlacement,
} from '../discText'
import type { DiscTextValueSources } from './metadataDiscText'
import type { DiscTemplateId } from '../templates/discTemplates'
import type { SteamImportedGame } from '../steam/steamApi'

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

export type GameRatingSystem = 'none' | 'ESRB' | 'PEGI' | 'custom'

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

export type BackgroundImageSize = {
  width: number
  height: number
}

export type LogoAssetLayout = {
  enabled: boolean
  scale: number
  x: number
  y: number
}

export type ProjectAdditionalLogoAsset = {
  id: string
  imageDataUrl: string | null
  imageSize: BackgroundImageSize | null
  layout: LogoAssetLayout
}

export type ProjectLogoAssets = {
  developerLogoDataUrl: string | null
  developerLogoSize: BackgroundImageSize | null
  developerLogoLayout: LogoAssetLayout
  additionalDeveloperLogos: ProjectAdditionalLogoAsset[]
  publisherLogoDataUrl: string | null
  publisherLogoSize: BackgroundImageSize | null
  publisherLogoLayout: LogoAssetLayout
  additionalPublisherLogos: ProjectAdditionalLogoAsset[]
}

export type RatingBadgeSource = 'placeholder' | 'custom'

export type RatingBadgeLayout = {
  enabled: boolean
  scale: number
  x: number
  y: number
}

export type ProjectRatingBadge = {
  source: RatingBadgeSource
  customImageDataUrl: string | null
  customImageSize: BackgroundImageSize | null
  layout: RatingBadgeLayout
}

export type MediaMarkValue =
  | 'dvd'
  | 'dvdRom'
  | 'cdRom'
  | 'dataDisc'
  | 'installDisc'

export type MediaMarkSource = 'placeholder' | 'custom'

export type MediaMarkLayout = {
  enabled: boolean
  scale: number
  x: number
  y: number
}

export type ProjectMediaMark = {
  value: MediaMarkValue
  source: MediaMarkSource
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

export type PlatformMarkSource = 'placeholder' | 'custom'

export type PlatformMarkLayout = {
  enabled: boolean
  scale: number
  x: number
  y: number
}

export type ProjectPlatformMarkAsset = {
  source: PlatformMarkSource
  customImageDataUrl: string | null
  customImageSize: BackgroundImageSize | null
  layout: PlatformMarkLayout
}

export type ProjectPlatformMarks = {
  values: PlatformMarkValue[]
  assets: Partial<Record<PlatformMarkValue, ProjectPlatformMarkAsset>>
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
  source: TechnicalMarkSource
  customImageDataUrl: string | null
  customImageSize: BackgroundImageSize | null
  layout: TechnicalMarkLayout
}

export type ProjectTechnicalMarks = {
  values: TechnicalMarkValue[]
  assets: Partial<Record<TechnicalMarkValue, ProjectTechnicalMarkAsset>>
}

export type SavedProject = {
  schemaVersion: '0.1.0'
  title: string
  savedAt: string
  game: {
    manualTitle: string
    selectedSteamGame: SteamImportedGame | null
  }
  metadata?: ProjectMetadata
  logoAssets?: Partial<ProjectLogoAssets>
  ratingBadge?: ProjectRatingBadge
  mediaMark?: ProjectMediaMark
  platformMarks?: ProjectPlatformMarks
  technicalMarks?: ProjectTechnicalMarks
  template: {
    type: 'disc'
    variant: SelectedDiscTemplateId
    customDimensions?: DiscTemplate | null
  }
  steamBackupLogo: {
    placement: SteamLogoPlacement
    bannerColors?: SteamBannerColors
    lockupImageDataUrl?: string | null
    lockupImageSize?: BackgroundImageSize | null
    lockupLayout?: SteamBannerLockupLayout
  }
  export?: {
    guideMode?: ExportGuideMode
    guides?: ExportGuideSelection
  }
  background: {
    scale: number
    offset: BackgroundOffset
    imageDataUrl: string | null
    imageSize?: BackgroundImageSize | null
    note: string
  }
  discText?: {
    settings?: Partial<DiscTextSettings>
    values?: Partial<DiscTextValues>
    valueSources?: Partial<DiscTextValueSources>
    titleValue?: string
    layout?: Partial<Record<DiscTextKey, Partial<DiscTextLayout>>>
  }
}
