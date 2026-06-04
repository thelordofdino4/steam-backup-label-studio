import {
  normalizeDiscTextLayout,
  normalizeDiscTextSettings,
  normalizeDiscTextValues,
  type DiscTextLayoutSettings,
  type DiscTextSettings,
  type DiscTextValues,
  type SteamLogoPlacement,
} from '../discText/index.ts'
import {
  normalizeDiscTextStyles,
  type DiscTextStyleSettings,
} from '../discText/styles.ts'
import { normalizeProjectDiscNumberArtwork } from '../discText/discNumberArtwork.ts'
import { exportGuideModeToSelection, type ExportGuideSelection } from '../export/exportGuides.ts'
import {
  clampDiscTextLayoutToSafeZone,
  clampMediaMarkLayoutToSafeZone,
  clampProjectAdditionalArtworkToSafeZone,
  clampProjectLogoAssetsToSafeZone,
  clampProjectPlatformMarksToSafeZone,
  clampProjectRatingBadgeToSafeZone,
  clampProjectTechnicalMarksToSafeZone,
  clampProjectTitleArtworkToSafeZone,
} from '../layout/discElementSafeZone.ts'
import {
  DEFAULT_STEAM_BANNER_COLORS,
  DEFAULT_STEAM_BANNER_FALLBACK_TEXT,
  DEFAULT_STEAM_BANNER_LOCKUP_LAYOUT,
  createSteamBannerLockupImageState,
  normalizeSteamBannerFallbackText,
} from '../branding/steamBannerDefaults.ts'
import { discTemplates, type DiscTemplateId } from '../templates/discTemplates.ts'
import type { SteamImportedGame } from '../steam/steamApi.ts'
import type { DiscTemplate } from '../types/template'
import { buildCustomDiscTemplate } from '../disc/geometry.ts'
import {
  createEmbeddedProjectImageAssetProvenance,
  createProjectImageAssetProvenance,
  normalizeProjectImageAssetProvenance,
} from './projectAssetStatus.ts'
import {
  normalizeDiscTextValueSources,
  type DiscTextValueSources,
} from './metadataDiscText.ts'
import { normalizeParsedProject } from './normalizeProject.ts'
import { normalizeProjectAdditionalArtwork } from './projectAdditionalArtwork.ts'
import { normalizeProjectLogoAssets } from './projectLogoAssets.ts'
import { normalizeProjectMediaMark } from './projectMediaMark.ts'
import { normalizeProjectPlatformMarks } from './projectPlatformMarks.ts'
import { normalizeProjectMetadata } from './projectMetadata.ts'
import { normalizeProjectRatingBadge } from './projectRatingBadge.ts'
import { normalizeProjectTechnicalMarks } from './projectTechnicalMarks.ts'
import { normalizeProjectTitleArtwork } from './projectTitleArtwork.ts'
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
  SavedDiscProject,
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
  projectDiscNumberArtwork: ProjectDiscNumberArtwork
  projectAdditionalArtwork: ProjectAdditionalArtwork
  projectRatingBadge: ProjectRatingBadge
  projectMediaMark: ProjectMediaMark
  projectPlatformMarks: ProjectPlatformMarks
  projectTechnicalMarks: ProjectTechnicalMarks
  selectedSteamGame: SteamImportedGame | null
  template: RestoredProjectTemplateState
  steamLogoPlacement: SteamLogoPlacement
  steamBannerColors: SteamBannerColors
  steamBannerLockupImageUrl: string | null
  steamBannerLockupImageSource: ProjectImageAssetProvenance | null
  steamBannerLockupImageSize: BackgroundImageSize | null
  steamBannerLockupLayout: SteamBannerLockupLayout
  steamBannerUseTextFallback: boolean
  steamBannerFallbackText: string
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
  backgroundImageSource: ProjectImageAssetProvenance | null
  backgroundImageSize: BackgroundImageSize | null
  isBackgroundArtworkEnabled: boolean
}

export type RestoreProjectStateOptions = {
  defaultSteamBannerLockupImageUrl?: string | null
  resolveBackgroundImageSize?: (
    imageDataUrl: string,
  ) => Promise<BackgroundImageSize | null>
}

function isSavedDiscProject(project: SavedProject): project is SavedDiscProject {
  return project.template?.type === 'disc'
}

function isDiscTemplateId(value: SelectedDiscTemplateId): value is DiscTemplateId {
  return value in discTemplates
}

function restoreTemplateState(project: SavedDiscProject): RestoredProjectTemplateState {
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
  project: SavedDiscProject,
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

function isDataImageUrl(value: string | null | undefined) {
  return Boolean(value?.startsWith('data:'))
}

function isSavedBuiltInSteamBannerLockup(project: SavedDiscProject) {
  const savedLockupImageUrl = project.steamBackupLogo.lockupImageDataUrl

  if (!savedLockupImageUrl || isDataImageUrl(savedLockupImageUrl)) {
    return false
  }

  return (
    project.steamBackupLogo.lockupImageSource?.source === 'built-in' ||
    !project.steamBackupLogo.lockupImageSize
  )
}

function restoreSteamBannerLockupImage(
  project: SavedDiscProject,
  defaultImageUrl: string | null,
) {
  if (isSavedBuiltInSteamBannerLockup(project)) {
    return createSteamBannerLockupImageState(null, null, defaultImageUrl)
  }

  return createSteamBannerLockupImageState(
    project.steamBackupLogo.lockupImageDataUrl,
    project.steamBackupLogo.lockupImageSize,
    defaultImageUrl,
  )
}

function restoreSteamBannerLockupImageSource(
  project: SavedDiscProject,
): ProjectImageAssetProvenance | null {
  const fallback = project.steamBackupLogo.lockupImageDataUrl
    ? isDataImageUrl(project.steamBackupLogo.lockupImageDataUrl)
      ? createEmbeddedProjectImageAssetProvenance('Custom Steam banner lockup')
      : createProjectImageAssetProvenance({
          source: 'built-in',
          sourceLabel: 'Default Steam banner lockup',
        })
    : null

  return normalizeProjectImageAssetProvenance(
    project.steamBackupLogo.lockupImageSource,
    fallback,
  )
}

function restoreBackgroundImageSource(
  project: SavedDiscProject,
): ProjectImageAssetProvenance | null {
  return normalizeProjectImageAssetProvenance(
    project.background.imageSource,
    project.background.imageDataUrl
      ? createEmbeddedProjectImageAssetProvenance('Embedded background image')
      : null,
  )
}

export async function restoreSavedProjectState(
  project: SavedDiscProject,
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
  const projectDiscNumberArtwork = normalizeProjectDiscNumberArtwork(
    project.discNumberArtwork,
  )
  const loadedAdditionalArtwork = normalizeProjectAdditionalArtwork(
    project.additionalArtwork,
    template.selectedDiscTemplate,
  )
  const projectAdditionalArtwork = clampProjectAdditionalArtworkToSafeZone(
    loadedAdditionalArtwork,
    template.selectedDiscTemplate,
  )
  const loadedRatingBadge = normalizeProjectRatingBadge(
    project.ratingBadge,
    template.selectedDiscTemplate,
  )
  const projectRatingBadge = clampProjectRatingBadgeToSafeZone(
    loadedRatingBadge,
    template.selectedDiscTemplate,
  )
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
    selectedSteamGame?.appId ?? null,
  )
  const loadedTechnicalMarks = normalizeProjectTechnicalMarks(
    project.technicalMarks,
    template.selectedDiscTemplate,
  )
  const steamBannerLockupImage = restoreSteamBannerLockupImage(
    project,
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
    projectDiscNumberArtwork,
    projectAdditionalArtwork,
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
    steamBannerLockupImageSource: restoreSteamBannerLockupImageSource(project),
    steamBannerLockupImageSize: steamBannerLockupImage.imageSize,
    steamBannerLockupLayout:
      project.steamBackupLogo.lockupLayout ?? DEFAULT_STEAM_BANNER_LOCKUP_LAYOUT,
    steamBannerUseTextFallback: project.steamBackupLogo.useTextFallback ?? false,
    steamBannerFallbackText: normalizeSteamBannerFallbackText(
      project.steamBackupLogo.fallbackText ?? DEFAULT_STEAM_BANNER_FALLBACK_TEXT,
    ),
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
    backgroundImageSource: restoreBackgroundImageSource(project),
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
  const project = normalizeParsedProject(contents)

  if (!isSavedDiscProject(project)) {
    throw new Error('Case insert projects must be restored by the case insert editor.')
  }

  return restoreSavedProjectState(project, options)
}
