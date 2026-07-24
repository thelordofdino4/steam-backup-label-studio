import type { RestoredCaseInsertProjectState } from '../project/projectCaseInsert'
import type { RestoredProjectState } from '../project/restoreProjectState'

type ValueSetter<T> = (value: T) => void

type DiscTextRestoreState = Pick<
  RestoredProjectState,
  | 'projectDiscNumberArtwork'
  | 'discTextSettings'
  | 'discTextValues'
  | 'discTextValueSources'
  | 'discTextTitleValue'
  | 'discTextHtmlSources'
  | 'discTextLayout'
  | 'discTextStyles'
>

type BackgroundRestoreState = Pick<
  RestoredProjectState,
  | 'backgroundScale'
  | 'backgroundOffset'
  | 'backgroundImageUrl'
  | 'backgroundImageSource'
  | 'backgroundImageSize'
  | 'isBackgroundArtworkEnabled'
>

export type ApplyRestoredCaseInsertProjectStateParams = {
  restoredProject: RestoredCaseInsertProjectState
  setManualGameTitle: ValueSetter<RestoredCaseInsertProjectState['manualGameTitle']>
  setProjectMetadata: ValueSetter<RestoredCaseInsertProjectState['projectMetadata']>
  setSelectedSteamGame: ValueSetter<RestoredCaseInsertProjectState['selectedSteamGame']>
  setProjectJewelCase: ValueSetter<RestoredCaseInsertProjectState['caseInsert']>
  setActiveCaseInsertTemplatePane:
    ValueSetter<RestoredCaseInsertProjectState['activeCaseInsertTemplatePane']>
  setActiveWorkspace: ValueSetter<'caseInsert'>
  setHomeStatusMessage: ValueSetter<string | null>
  scheduleCaseInsertBrandingMarkSlotSync: (
    overrides?: {
      projectMetadata?: RestoredCaseInsertProjectState['projectMetadata']
    },
  ) => void
}

export function applyRestoredCaseInsertProjectState({
  restoredProject,
  setManualGameTitle,
  setProjectMetadata,
  setSelectedSteamGame,
  setProjectJewelCase,
  setActiveCaseInsertTemplatePane,
  setActiveWorkspace,
  setHomeStatusMessage,
  scheduleCaseInsertBrandingMarkSlotSync,
}: ApplyRestoredCaseInsertProjectStateParams) {
  setManualGameTitle(restoredProject.manualGameTitle)
  setProjectMetadata(restoredProject.projectMetadata)
  setSelectedSteamGame(restoredProject.selectedSteamGame)
  setProjectJewelCase(restoredProject.caseInsert)
  setActiveCaseInsertTemplatePane(restoredProject.activeCaseInsertTemplatePane)
  setActiveWorkspace('caseInsert')
  setHomeStatusMessage(null)
  scheduleCaseInsertBrandingMarkSlotSync({
    projectMetadata: restoredProject.projectMetadata,
  })
}

export type ApplyRestoredDiscProjectStateParams = {
  restoredProject: RestoredProjectState
  restoreDiscGuidedWorkflow:
    ValueSetter<RestoredProjectState['discGuidedWorkflow']>
  setManualGameTitle: ValueSetter<RestoredProjectState['manualGameTitle']>
  setProjectMetadata: ValueSetter<RestoredProjectState['projectMetadata']>
  setProjectLogoAssets: ValueSetter<RestoredProjectState['projectLogoAssets']>
  setProjectTitleArtwork: ValueSetter<RestoredProjectState['projectTitleArtwork']>
  setProjectAdditionalArtwork:
    ValueSetter<RestoredProjectState['projectAdditionalArtwork']>
  setProjectRatingBadge: ValueSetter<RestoredProjectState['projectRatingBadge']>
  setProjectMediaMark: ValueSetter<RestoredProjectState['projectMediaMark']>
  setProjectPlatformMarks: ValueSetter<RestoredProjectState['projectPlatformMarks']>
  setProjectTechnicalMarks:
    ValueSetter<RestoredProjectState['projectTechnicalMarks']>
  setSelectedSteamGame: ValueSetter<RestoredProjectState['selectedSteamGame']>
  clearSelectedArtwork: () => void
  clearLocalSteamScreenshotResults: () => void
  restoreDiscTemplateState: ValueSetter<RestoredProjectState['template']>
  setSteamLogoPlacement: ValueSetter<RestoredProjectState['steamLogoPlacement']>
  setSteamBannerColors: ValueSetter<RestoredProjectState['steamBannerColors']>
  setSteamBannerLockupImageUrl:
    ValueSetter<RestoredProjectState['steamBannerLockupImageUrl']>
  setSteamBannerLockupImageSource:
    ValueSetter<RestoredProjectState['steamBannerLockupImageSource']>
  setSteamBannerLockupImageSize:
    ValueSetter<RestoredProjectState['steamBannerLockupImageSize']>
  setSteamBannerLockupLayout:
    ValueSetter<RestoredProjectState['steamBannerLockupLayout']>
  setSteamBannerUseTextFallback:
    ValueSetter<RestoredProjectState['steamBannerUseTextFallback']>
  setSteamBannerFallbackText:
    ValueSetter<RestoredProjectState['steamBannerFallbackText']>
  restoreExportGuides: ValueSetter<RestoredProjectState['exportGuides']>
  restoreDiscTextState: ValueSetter<DiscTextRestoreState>
  restoreBackgroundImageState: ValueSetter<BackgroundRestoreState>
  setActiveWorkspace: ValueSetter<'disc'>
  setHomeStatusMessage: ValueSetter<string | null>
  afterDiscProjectRestore?: ValueSetter<RestoredProjectState>
}

export function applyRestoredDiscProjectState({
  restoredProject,
  restoreDiscGuidedWorkflow,
  setManualGameTitle,
  setProjectMetadata,
  setProjectLogoAssets,
  setProjectTitleArtwork,
  setProjectAdditionalArtwork,
  setProjectRatingBadge,
  setProjectMediaMark,
  setProjectPlatformMarks,
  setProjectTechnicalMarks,
  setSelectedSteamGame,
  clearSelectedArtwork,
  clearLocalSteamScreenshotResults,
  restoreDiscTemplateState,
  setSteamLogoPlacement,
  setSteamBannerColors,
  setSteamBannerLockupImageUrl,
  setSteamBannerLockupImageSource,
  setSteamBannerLockupImageSize,
  setSteamBannerLockupLayout,
  setSteamBannerUseTextFallback,
  setSteamBannerFallbackText,
  restoreExportGuides,
  restoreDiscTextState,
  restoreBackgroundImageState,
  setActiveWorkspace,
  setHomeStatusMessage,
  afterDiscProjectRestore,
}: ApplyRestoredDiscProjectStateParams) {
  restoreDiscGuidedWorkflow(restoredProject.discGuidedWorkflow)
  setManualGameTitle(restoredProject.manualGameTitle)
  setProjectMetadata(restoredProject.projectMetadata)
  setProjectLogoAssets(restoredProject.projectLogoAssets)
  setProjectTitleArtwork(restoredProject.projectTitleArtwork)
  setProjectAdditionalArtwork(restoredProject.projectAdditionalArtwork)
  setProjectRatingBadge(restoredProject.projectRatingBadge)
  setProjectMediaMark(restoredProject.projectMediaMark)
  setProjectPlatformMarks(restoredProject.projectPlatformMarks)
  setProjectTechnicalMarks(restoredProject.projectTechnicalMarks)
  setSelectedSteamGame(restoredProject.selectedSteamGame)
  clearSelectedArtwork()
  clearLocalSteamScreenshotResults()

  restoreDiscTemplateState(restoredProject.template)
  setSteamLogoPlacement(restoredProject.steamLogoPlacement)
  setSteamBannerColors(restoredProject.steamBannerColors)
  setSteamBannerLockupImageUrl(restoredProject.steamBannerLockupImageUrl)
  setSteamBannerLockupImageSource(restoredProject.steamBannerLockupImageSource)
  setSteamBannerLockupImageSize(restoredProject.steamBannerLockupImageSize)
  setSteamBannerLockupLayout(restoredProject.steamBannerLockupLayout)
  setSteamBannerUseTextFallback(restoredProject.steamBannerUseTextFallback)
  setSteamBannerFallbackText(restoredProject.steamBannerFallbackText)
  restoreExportGuides(restoredProject.exportGuides)
  restoreDiscTextState({
    projectDiscNumberArtwork: restoredProject.projectDiscNumberArtwork,
    discTextSettings: restoredProject.discTextSettings,
    discTextValues: restoredProject.discTextValues,
    discTextValueSources: restoredProject.discTextValueSources,
    discTextTitleValue: restoredProject.discTextTitleValue,
    discTextHtmlSources: restoredProject.discTextHtmlSources,
    discTextLayout: restoredProject.discTextLayout,
    discTextStyles: restoredProject.discTextStyles,
  })
  restoreBackgroundImageState({
    backgroundScale: restoredProject.backgroundScale,
    backgroundOffset: restoredProject.backgroundOffset,
    backgroundImageUrl: restoredProject.backgroundImageUrl,
    backgroundImageSource: restoredProject.backgroundImageSource,
    backgroundImageSize: restoredProject.backgroundImageSize,
    isBackgroundArtworkEnabled: restoredProject.isBackgroundArtworkEnabled,
  })
  setActiveWorkspace('disc')
  afterDiscProjectRestore?.(restoredProject)
  setHomeStatusMessage(null)
}
