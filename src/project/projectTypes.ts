import type { DiscTemplate } from '../types/template'
import type { ExportGuideMode, ExportGuideSelection } from '../exportGuides'
import type {
  DiscTextKey,
  DiscTextLayout,
  DiscTextSettings,
  DiscTextValues,
  SteamLogoPlacement,
} from '../discText'
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

export type SelectedDiscTemplateId = DiscTemplateId | 'custom'

export type BackgroundOffset = {
  x: number
  y: number
}

export type BackgroundImageSize = {
  width: number
  height: number
}

export type SavedProject = {
  schemaVersion: '0.1.0'
  title: string
  savedAt: string
  game: {
    manualTitle: string
    selectedSteamGame: SteamImportedGame | null
  }
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
    layout?: Partial<Record<DiscTextKey, Partial<DiscTextLayout>>>
  }
}
