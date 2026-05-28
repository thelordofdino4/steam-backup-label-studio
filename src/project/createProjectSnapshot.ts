import type {
  DiscTextLayoutSettings,
  DiscTextSettings,
  DiscTextValues,
  SteamLogoPlacement,
} from '../discText'
import type { ExportGuideSelection } from '../exportGuides'
import type { SteamImportedGame } from '../steam/steamApi'
import type { DiscTemplate } from '../types/template'
import type { DiscTextValueSources } from './metadataDiscText'
import type {
  BackgroundImageSize,
  BackgroundOffset,
  ProjectLogoAssets,
  ProjectMediaMark,
  ProjectMetadata,
  ProjectPlatformMarks,
  ProjectRatingBadge,
  SavedProject,
  SelectedDiscTemplateId,
  SteamBannerColors,
  SteamBannerLockupLayout,
} from './projectTypes'

export type CreateProjectSnapshotParams = {
  manualGameTitle: string
  selectedSteamGame: SteamImportedGame | null
  projectMetadata: ProjectMetadata
  projectLogoAssets: ProjectLogoAssets
  projectRatingBadge: ProjectRatingBadge
  projectMediaMark: ProjectMediaMark
  projectPlatformMarks: ProjectPlatformMarks
  selectedDiscTemplateId: SelectedDiscTemplateId
  customDiscTemplate: DiscTemplate
  steamLogoPlacement: SteamLogoPlacement
  steamBannerColors: SteamBannerColors
  steamBannerLockupImageUrl: string | null
  steamBannerLockupImageSize: BackgroundImageSize | null
  steamBannerLockupLayout: SteamBannerLockupLayout
  exportGuides: ExportGuideSelection
  backgroundScale: number
  backgroundOffset: BackgroundOffset
  backgroundImageUrl: string | null
  backgroundImageSize: BackgroundImageSize | null
  discTextSettings: DiscTextSettings
  discTextValues: DiscTextValues
  discTextValueSources: DiscTextValueSources
  discTextLayout: DiscTextLayoutSettings
}

export function createProjectSnapshot({
  manualGameTitle,
  selectedSteamGame,
  projectMetadata,
  projectLogoAssets,
  projectRatingBadge,
  projectMediaMark,
  projectPlatformMarks,
  selectedDiscTemplateId,
  customDiscTemplate,
  steamLogoPlacement,
  steamBannerColors,
  steamBannerLockupImageUrl,
  steamBannerLockupImageSize,
  steamBannerLockupLayout,
  exportGuides,
  backgroundScale,
  backgroundOffset,
  backgroundImageUrl,
  backgroundImageSize,
  discTextSettings,
  discTextValues,
  discTextValueSources,
  discTextLayout,
}: CreateProjectSnapshotParams): SavedProject {
  return {
    schemaVersion: '0.1.0',
    title: manualGameTitle,
    savedAt: new Date().toISOString(),
    game: {
      manualTitle: manualGameTitle,
      selectedSteamGame,
    },
    metadata: projectMetadata,
    logoAssets: projectLogoAssets,
    ratingBadge: projectRatingBadge,
    mediaMark: projectMediaMark,
    platformMarks: projectPlatformMarks,
    template: {
      type: 'disc',
      variant: selectedDiscTemplateId,
      customDimensions: selectedDiscTemplateId === 'custom' ? customDiscTemplate : null,
    },
    steamBackupLogo: {
      placement: steamLogoPlacement,
      bannerColors: steamBannerColors,
      lockupImageDataUrl: steamBannerLockupImageUrl,
      lockupImageSize: steamBannerLockupImageSize,
      lockupLayout: steamBannerLockupLayout,
    },
    export: {
      guides: exportGuides,
    },
    background: {
      scale: backgroundScale,
      offset: backgroundOffset,
      imageDataUrl: backgroundImageUrl,
      imageSize: backgroundImageSize,
      note:
        'MVP save state embeds the background image as a data URL. A more efficient .sbls package format can replace this later.',
    },
    discText: {
      settings: discTextSettings,
      values: discTextValues,
      valueSources: discTextValueSources,
      layout: discTextLayout,
    },
  }
}
