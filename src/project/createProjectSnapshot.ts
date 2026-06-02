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
import { normalizeSteamBannerFallbackText } from '../steamBannerDefaults'
import type {
  BackgroundImageSize,
  BackgroundOffset,
  ProjectImageAssetProvenance,
  ProjectAdditionalArtwork,
  ProjectDiscNumberArtwork,
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
  projectDiscNumberArtwork: ProjectDiscNumberArtwork
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
  steamBannerLockupImageSource: ProjectImageAssetProvenance | null
  steamBannerLockupImageSize: BackgroundImageSize | null
  steamBannerLockupLayout: SteamBannerLockupLayout
  steamBannerUseTextFallback: boolean
  steamBannerFallbackText: string
  exportGuides: ExportGuideSelection
  backgroundScale: number
  backgroundOffset: BackgroundOffset
  backgroundImageUrl: string | null
  backgroundImageSource: ProjectImageAssetProvenance | null
  backgroundImageSize: BackgroundImageSize | null
  isBackgroundArtworkEnabled: boolean
  discTextSettings: DiscTextSettings
  discTextValues: DiscTextValues
  discTextValueSources: DiscTextValueSources
  discTextTitleValue: string
  discTextLayout: DiscTextLayoutSettings
  discTextStyles: DiscTextStyleSettings
}

function shouldPersistSteamBannerLockupImage(
  imageUrl: string | null,
  imageSource: ProjectImageAssetProvenance | null,
) {
  return Boolean(imageUrl) && imageSource?.source !== 'built-in'
}

export function createProjectSnapshot({
  manualGameTitle,
  selectedSteamGame,
  projectMetadata,
  projectLogoAssets,
  projectTitleArtwork,
  projectDiscNumberArtwork,
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
  steamBannerLockupImageSource,
  steamBannerLockupImageSize,
  steamBannerLockupLayout,
  steamBannerUseTextFallback,
  steamBannerFallbackText,
  exportGuides,
  backgroundScale,
  backgroundOffset,
  backgroundImageUrl,
  backgroundImageSource,
  backgroundImageSize,
  isBackgroundArtworkEnabled,
  discTextSettings,
  discTextValues,
  discTextValueSources,
  discTextTitleValue,
  discTextLayout,
  discTextStyles,
}: CreateProjectSnapshotParams): SavedProject {
  const shouldPersistLockupImage = shouldPersistSteamBannerLockupImage(
    steamBannerLockupImageUrl,
    steamBannerLockupImageSource,
  )

  return {
    schemaVersion: '0.1.0',
    projectType: 'disc',
    title: manualGameTitle,
    savedAt: new Date().toISOString(),
    game: {
      manualTitle: manualGameTitle,
      selectedSteamGame,
    },
    metadata: projectMetadata,
    logoAssets: projectLogoAssets,
    titleArtwork: projectTitleArtwork,
    discNumberArtwork: projectDiscNumberArtwork,
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
      lockupImageDataUrl: shouldPersistLockupImage ? steamBannerLockupImageUrl : null,
      lockupImageSource: steamBannerLockupImageSource,
      lockupImageSize: shouldPersistLockupImage ? steamBannerLockupImageSize : null,
      lockupLayout: steamBannerLockupLayout,
      useTextFallback: steamBannerUseTextFallback,
      fallbackText: normalizeSteamBannerFallbackText(steamBannerFallbackText),
    },
    export: {
      guides: exportGuides,
    },
    background: {
      enabled: isBackgroundArtworkEnabled,
      scale: backgroundScale,
      offset: backgroundOffset,
      imageDataUrl: backgroundImageUrl,
      imageSource: backgroundImageSource,
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
