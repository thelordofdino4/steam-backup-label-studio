import type {
  DiscTextLayoutSettings,
  DiscTextSettings,
  DiscTextValues,
  SteamLogoPlacement,
} from '../discText'
import type { DiscTextStyleSettings } from '../discTextStyles'
import type { ExportGuideSelection } from '../exportGuides'
import type { SteamImportedGame } from '../steam/steamApi'
import type { DiscTemplate } from '../types/template'
import type { DiscTextValueSources } from './metadataDiscText'
import type {
  BackgroundImageSize,
  BackgroundOffset,
  ProjectAdditionalArtwork,
  ProjectLogoAssets,
  ProjectMediaMark,
  ProjectMetadata,
  ProjectPlatformMarks,
  ProjectRatingBadge,
  ProjectTechnicalMarks,
  ProjectTitleArtwork,
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
  projectTitleArtwork: ProjectTitleArtwork
  projectAdditionalArtwork: ProjectAdditionalArtwork
  projectRatingBadge: ProjectRatingBadge
  projectMediaMark: ProjectMediaMark
  projectPlatformMarks: ProjectPlatformMarks
  projectTechnicalMarks: ProjectTechnicalMarks
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
  isBackgroundArtworkEnabled: boolean
  discTextSettings: DiscTextSettings
  discTextValues: DiscTextValues
  discTextValueSources: DiscTextValueSources
  discTextTitleValue: string
  discTextLayout: DiscTextLayoutSettings
  discTextStyles: DiscTextStyleSettings
}

export function createProjectSnapshot({
  manualGameTitle,
  selectedSteamGame,
  projectMetadata,
  projectLogoAssets,
  projectTitleArtwork,
  projectAdditionalArtwork,
  projectRatingBadge,
  projectMediaMark,
  projectPlatformMarks,
  projectTechnicalMarks,
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
  isBackgroundArtworkEnabled,
  discTextSettings,
  discTextValues,
  discTextValueSources,
  discTextTitleValue,
  discTextLayout,
  discTextStyles,
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
    titleArtwork: projectTitleArtwork,
    additionalArtwork: projectAdditionalArtwork,
    ratingBadge: projectRatingBadge,
    mediaMark: projectMediaMark,
    platformMarks: projectPlatformMarks,
    technicalMarks: projectTechnicalMarks,
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
      enabled: isBackgroundArtworkEnabled,
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
      titleValue: discTextTitleValue,
      layout: discTextLayout,
      styles: discTextStyles,
    },
  }
}
