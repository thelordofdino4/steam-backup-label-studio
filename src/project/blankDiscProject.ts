import {
  DEFAULT_DISC_TEXT_SETTINGS,
  createDefaultDiscTextLayout,
  createDefaultDiscTextValues,
} from '../discText/index.ts'
import { createDefaultDiscTextStyles } from '../discText/styles.ts'
import { createDefaultProjectDiscNumberArtwork } from '../discText/discNumberArtwork.ts'
import { DEFAULT_EXPORT_GUIDES } from '../export/exportGuides.ts'
import { INITIAL_DISC_GUIDED_WORKFLOW_STATE } from '../guidedPresets/discGuidedWorkflow.ts'
import { createEmptyBackgroundImageState } from '../image/backgroundImage.ts'
import {
  DEFAULT_STEAM_BANNER_COLORS,
  DEFAULT_STEAM_BANNER_FALLBACK_TEXT,
  DEFAULT_STEAM_BANNER_LOCKUP_LAYOUT,
  getDefaultSteamBannerLockupSourceLabel,
} from '../branding/steamBannerDefaults.ts'
import {
  createDefaultDiscTemplateState,
  getSelectedDiscTemplate,
} from '../templates/discTemplateStateModel.ts'
import { createProjectSnapshot } from './createProjectSnapshot.ts'
import { createDefaultProjectAdditionalArtwork } from './projectAdditionalArtwork.ts'
import { createProjectImageAssetProvenance } from './projectAssetStatus.ts'
import { createDefaultProjectLogoAssets } from './projectLogoAssets.ts'
import { createDefaultProjectMediaMark } from './projectMediaMark.ts'
import {
  createDefaultDiscTextValueSources,
} from './metadataDiscText.ts'
import {
  DEFAULT_DISC_PROJECT_TITLE,
  createDefaultProjectMetadata,
} from './projectMetadata.ts'
import { createDefaultProjectPlatformMarks } from './projectPlatformMarks.ts'
import { createDefaultProjectRatingBadge } from './projectRatingBadge.ts'
import { createDefaultProjectTechnicalMarks } from './projectTechnicalMarks.ts'
import { createDefaultProjectTitleArtwork } from './projectTitleArtwork.ts'
import type { SavedDiscProject } from './projectTypes.ts'

/** Creates the same complete persistable aggregate as the live Disc reset owners. */
export function createBlankDiscSavedProject(): SavedDiscProject {
  const templateState = createDefaultDiscTemplateState()
  const selectedTemplate = getSelectedDiscTemplate(templateState)
  const background = createEmptyBackgroundImageState()

  return createProjectSnapshot({
    discGuidedWorkflow: INITIAL_DISC_GUIDED_WORKFLOW_STATE,
    manualGameTitle: DEFAULT_DISC_PROJECT_TITLE,
    selectedSteamGame: null,
    projectMetadata: createDefaultProjectMetadata(),
    projectLogoAssets: createDefaultProjectLogoAssets(selectedTemplate),
    projectTitleArtwork: createDefaultProjectTitleArtwork(
      selectedTemplate,
      'top',
    ),
    projectDiscNumberArtwork: createDefaultProjectDiscNumberArtwork(),
    projectAdditionalArtwork: createDefaultProjectAdditionalArtwork(),
    projectRatingBadge: createDefaultProjectRatingBadge(selectedTemplate),
    projectMediaMark: createDefaultProjectMediaMark(selectedTemplate),
    projectPlatformMarks: createDefaultProjectPlatformMarks(),
    projectTechnicalMarks: createDefaultProjectTechnicalMarks(),
    selectedDiscTemplateId: templateState.selectedDiscTemplateId,
    customDiscTemplate: templateState.customDiscTemplate,
    steamLogoPlacement: 'top',
    steamBannerColors: DEFAULT_STEAM_BANNER_COLORS,
    steamBannerLockupImageUrl: null,
    steamBannerLockupImageSource: createProjectImageAssetProvenance({
      source: 'built-in',
      sourceLabel: getDefaultSteamBannerLockupSourceLabel('banner-lockup'),
    }),
    steamBannerLockupImageSize: null,
    steamBannerLockupLayout: DEFAULT_STEAM_BANNER_LOCKUP_LAYOUT,
    steamBannerUseTextFallback: false,
    steamBannerFallbackText: DEFAULT_STEAM_BANNER_FALLBACK_TEXT,
    exportGuides: DEFAULT_EXPORT_GUIDES,
    backgroundScale: background.scale,
    backgroundOffset: background.offset,
    backgroundImageUrl: background.imageUrl,
    backgroundImageSource: null,
    backgroundImageSize: background.imageSize,
    isBackgroundArtworkEnabled: true,
    discTextSettings: DEFAULT_DISC_TEXT_SETTINGS,
    discTextValues: createDefaultDiscTextValues(),
    discTextValueSources: createDefaultDiscTextValueSources(),
    discTextTitleValue: '',
    discTextHtmlSources: {},
    discTextLayout: createDefaultDiscTextLayout('top', selectedTemplate),
    discTextStyles: createDefaultDiscTextStyles(),
  })
}
