import {
  normalizeDiscTextLayout,
  normalizeDiscTextSettings,
  normalizeDiscTextValues,
  type DiscTextLayoutSettings,
  type DiscTextSettings,
  type DiscTextValues,
  type SteamLogoPlacement,
} from '../discText.ts'
import {
  normalizeDiscTextStyles,
  type DiscTextStyleSettings,
} from '../discTextStyles.ts'
import { exportGuideModeToSelection, type ExportGuideSelection } from '../exportGuides.ts'
import {
  clampDiscTextLayoutToSafeZone,
  clampMediaMarkLayoutToSafeZone,
  clampProjectLogoAssetsToSafeZone,
  clampProjectPlatformMarksToSafeZone,
  clampProjectTechnicalMarksToSafeZone,
  clampProjectTitleArtworkToSafeZone,
  clampRatingBadgeLayoutToSafeZone,
} from '../layout/discElementSafeZone.ts'
import {
  DEFAULT_STEAM_BANNER_COLORS,
  DEFAULT_STEAM_BANNER_LOCKUP_LAYOUT,
  createSteamBannerLockupImageState,
} from '../steamBannerDefaults.ts'
import { discTemplates, type DiscTemplateId } from '../templates/discTemplates.ts'
import type { SteamImportedGame } from '../steam/steamApi.ts'
import type { DiscTemplate } from '../types/template'
import { buildCustomDiscTemplate } from '../discGeometry.ts'
import {
  normalizeDiscTextValueSources,
  type DiscTextValueSources,
} from './metadataDiscText.ts'
import { normalizeParsedProject } from './normalizeProject.ts'
import { normalizeProjectLogoAssets } from './projectLogoAssets.ts'
import { normalizeProjectMediaMark, normalizeProjectPlatformMarks } from './projectMediaMark.ts'
import { normalizeProjectMetadata } from './projectMetadata.ts'
import { normalizeProjectRatingBadge } from './projectRatingBadge.ts'
import { normalizeProjectTechnicalMarks } from './projectTechnicalMarks.ts'
import { normalizeProjectTitleArtwork } from './projectTitleArtwork.ts'
import type {
  BackgroundImageSize,
  BackgroundOffset,
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

export type RestoredProjectTemplateState = {
  selectedDiscTemplateId: SelectedDiscTemplateId
  customDiscTemplate?: DiscTemplate
  selectedDiscTemplate: DiscTemplate
}

export type RestoredProjectState = {
  manualGameTitle: string
  projectMetadata: ProjectMetadata
  projectLogoAssets: ProjectLogoAssets
  projectTitleArtwork: ProjectTitleArtwork
  projectRatingBadge: ProjectRatingBadge
  projectMediaMark: ProjectMediaMark
  projectPlatformMarks: ProjectPlatformMarks
  projectTechnicalMarks: ProjectTechnicalMarks
  selectedSteamGame: SteamImportedGame | null
  template: RestoredProjectTemplateState
  steamLogoPlacement: SteamLogoPlacement
  steamBannerColors: SteamBannerColors
  steamBannerLockupImageUrl: string | null
  steamBannerLockupImageSize: BackgroundImageSize | null
  steamBannerLockupLayout: SteamBannerLockupLayout
  exportGuides: ExportGuideSelection
  discTextSettings: DiscTextSettings
  discTextValues: DiscTextValues
  discTextValueSources: DiscTextValueSources
  discTextTitleValue: string
  discTextLayout: DiscTextLayoutSettings
  discTextStyles: DiscTextStyleSettings
  backgroundScale: number
  backgroundOffset: BackgroundOffset
  backgroundImageUrl: string | null
  backgroundImageSize: BackgroundImageSize | null
  isBackgroundArtworkEnabled: boolean
}

export type RestoreProjectStateOptions = {
  defaultSteamBannerLockupImageUrl?: string | null
  resolveBackgroundImageSize?: (
    imageDataUrl: string,
  ) => Promise<BackgroundImageSize | null>
}

function isDiscTemplateId(value: SelectedDiscTemplateId): value is DiscTemplateId {
  return value in discTemplates
}

function restoreTemplateState(project: SavedProject): RestoredProjectTemplateState {
  const savedTemplateId = project.template.variant
  const loadedCustomDiscTemplate = project.template.customDimensions
    ? buildCustomDiscTemplate(project.template.customDimensions)
    : buildCustomDiscTemplate(discTemplates.standardPrintableDisc)

  if (savedTemplateId === 'custom') {
    return {
      selectedDiscTemplateId: 'custom',
      customDiscTemplate: loadedCustomDiscTemplate,
      selectedDiscTemplate: loadedCustomDiscTemplate,
    }
  }

  if (isDiscTemplateId(savedTemplateId)) {
    return {
      selectedDiscTemplateId: savedTemplateId,
      selectedDiscTemplate: discTemplates[savedTemplateId],
    }
  }

  return {
    selectedDiscTemplateId: 'standardPrintableDisc',
    selectedDiscTemplate: discTemplates.standardPrintableDisc,
  }
}

async function restoreBackgroundImageSize(
  project: SavedProject,
  resolveBackgroundImageSize?: RestoreProjectStateOptions['resolveBackgroundImageSize'],
): Promise<BackgroundImageSize | null> {
  const savedImageSize = project.background.imageSize ?? null

  if (savedImageSize || !project.background.imageDataUrl || !resolveBackgroundImageSize) {
    return savedImageSize
  }

  try {
    return await resolveBackgroundImageSize(project.background.imageDataUrl)
  } catch {
    return null
  }
}

export async function restoreSavedProjectState(
  project: SavedProject,
  options: RestoreProjectStateOptions = {},
): Promise<RestoredProjectState> {
  const template = restoreTemplateState(project)
  const selectedSteamGame = project.game?.selectedSteamGame ?? null
  const manualGameTitle =
    project.game?.manualTitle ?? project.title ?? 'Untitled Steam Backup Label'
  const projectMetadata = normalizeProjectMetadata(
    project.metadata,
    manualGameTitle,
    selectedSteamGame?.appId,
  )
  const loadedLogoAssets = normalizeProjectLogoAssets(
    project.logoAssets,
    template.selectedDiscTemplate,
  )
  const projectLogoAssets = clampProjectLogoAssetsToSafeZone(
    loadedLogoAssets,
    template.selectedDiscTemplate,
  )
  const loadedTitleArtwork = normalizeProjectTitleArtwork(
    project.titleArtwork,
    template.selectedDiscTemplate,
    project.steamBackupLogo.placement,
  )
  const projectTitleArtwork = clampProjectTitleArtworkToSafeZone(
    loadedTitleArtwork,
    template.selectedDiscTemplate,
  )
  const loadedRatingBadge = normalizeProjectRatingBadge(
    project.ratingBadge,
    template.selectedDiscTemplate,
  )
  const projectRatingBadge = {
    ...loadedRatingBadge,
    layout: clampRatingBadgeLayoutToSafeZone(
      loadedRatingBadge,
      template.selectedDiscTemplate,
    ),
  }
  const loadedMediaMark = normalizeProjectMediaMark(
    project.mediaMark,
    template.selectedDiscTemplate,
  )
  const projectMediaMark = {
    ...loadedMediaMark,
    layout: clampMediaMarkLayoutToSafeZone(
      loadedMediaMark,
      template.selectedDiscTemplate,
    ),
  }
  const loadedPlatformMarks = normalizeProjectPlatformMarks(
    project.platformMarks,
    project.mediaMark,
    template.selectedDiscTemplate,
  )
  const loadedTechnicalMarks = normalizeProjectTechnicalMarks(
    project.technicalMarks,
    template.selectedDiscTemplate,
  )
  const steamBannerLockupImage = createSteamBannerLockupImageState(
    project.steamBackupLogo.lockupImageDataUrl,
    project.steamBackupLogo.lockupImageSize,
    options.defaultSteamBannerLockupImageUrl ?? null,
  )
  const discTextValues = normalizeDiscTextValues(
    project.discText?.values,
    selectedSteamGame?.appId,
  )
  const discTextTitleValue = project.discText?.titleValue ?? ''

  return {
    manualGameTitle,
    projectMetadata,
    projectLogoAssets,
    projectTitleArtwork,
    projectRatingBadge,
    projectMediaMark,
    projectPlatformMarks: clampProjectPlatformMarksToSafeZone(
      loadedPlatformMarks,
      template.selectedDiscTemplate,
    ),
    projectTechnicalMarks: clampProjectTechnicalMarksToSafeZone(
      loadedTechnicalMarks,
      template.selectedDiscTemplate,
    ),
    selectedSteamGame,
    template,
    steamLogoPlacement: project.steamBackupLogo.placement,
    steamBannerColors: project.steamBackupLogo.bannerColors ?? DEFAULT_STEAM_BANNER_COLORS,
    steamBannerLockupImageUrl: steamBannerLockupImage.imageUrl,
    steamBannerLockupImageSize: steamBannerLockupImage.imageSize,
    steamBannerLockupLayout:
      project.steamBackupLogo.lockupLayout ?? DEFAULT_STEAM_BANNER_LOCKUP_LAYOUT,
    exportGuides: project.export?.guides ?? exportGuideModeToSelection(project.export?.guideMode),
    discTextSettings: normalizeDiscTextSettings(project.discText?.settings),
    discTextValues,
    discTextValueSources: normalizeDiscTextValueSources(
      project.discText?.valueSources,
      discTextValues,
      projectMetadata,
      discTextTitleValue,
    ),
    discTextTitleValue,
    discTextLayout: clampDiscTextLayoutToSafeZone(
      normalizeDiscTextLayout(
        project.discText?.layout,
        project.steamBackupLogo.placement,
        template.selectedDiscTemplate,
      ),
      template.selectedDiscTemplate,
    ),
    discTextStyles: normalizeDiscTextStyles(project.discText?.styles),
    backgroundScale: project.background.scale,
    backgroundOffset: project.background.offset,
    backgroundImageUrl: project.background.imageDataUrl,
    backgroundImageSize: await restoreBackgroundImageSize(
      project,
      options.resolveBackgroundImageSize,
    ),
    isBackgroundArtworkEnabled: project.background.enabled ?? true,
  }
}

export function restoreProjectStateFromContents(
  contents: string,
  options: RestoreProjectStateOptions = {},
): Promise<RestoredProjectState> {
  return restoreSavedProjectState(normalizeParsedProject(contents), options)
}
