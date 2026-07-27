import type { RestoredCaseInsertProjectState } from '../project/projectCaseInsert.ts'
import type { RestoredProjectState } from '../project/restoreProjectState.ts'
import { getNormalizedProjectKind } from '../lifecycle/canonicalProject.ts'
import {
  commandFailed,
  commandSucceeded,
  type ApplicationCommandResult,
} from '../lifecycle/applicationCommandTypes.ts'
import type { ActiveDiscPresetState } from '../presets/discPresetTargetedApplication.ts'
import type { ProjectSessionEditorRoute } from '../lifecycle/projectSession.ts'
import type {
  ApplicationLifecycleStateCommitResult,
} from '../lifecycle/applicationLifecycleStateStore.ts'
import type {
  StagedProjectOpenCandidate,
} from './appProjectLoad.ts'

type ValueSetter<Value> = (value: Value) => void

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

export type ApplicationEditorAggregateApplyDependencies = Readonly<{
  batchReactUpdates: (apply: () => void) => void
  shell: Readonly<{
    setActiveWorkspace: ValueSetter<'disc' | 'caseInsert'>
    setHomeStatusMessage: ValueSetter<string | null>
    restoreCaseInsertRoute: (
      pane: RestoredCaseInsertProjectState['activeCaseInsertTemplatePane'],
      surface: Extract<
        ProjectSessionEditorRoute,
        { workspace: 'caseInsert' }
      >['surface'],
    ) => void
  }>
  commonProject: Readonly<{
    setManualGameTitle: ValueSetter<RestoredProjectState['manualGameTitle']>
    setProjectMetadata: ValueSetter<RestoredProjectState['projectMetadata']>
    setSelectedSteamGame: ValueSetter<RestoredProjectState['selectedSteamGame']>
  }>
  discProject: Readonly<{
    restoreDiscGuidedWorkflow:
      ValueSetter<RestoredProjectState['discGuidedWorkflow']>
    setProjectLogoAssets: ValueSetter<RestoredProjectState['projectLogoAssets']>
    setProjectTitleArtwork:
      ValueSetter<RestoredProjectState['projectTitleArtwork']>
    setProjectAdditionalArtwork:
      ValueSetter<RestoredProjectState['projectAdditionalArtwork']>
    setProjectRatingBadge:
      ValueSetter<RestoredProjectState['projectRatingBadge']>
    setProjectMediaMark: ValueSetter<RestoredProjectState['projectMediaMark']>
    setProjectPlatformMarks:
      ValueSetter<RestoredProjectState['projectPlatformMarks']>
    setProjectTechnicalMarks:
      ValueSetter<RestoredProjectState['projectTechnicalMarks']>
    restoreDiscTemplateState: ValueSetter<RestoredProjectState['template']>
    setSteamLogoPlacement:
      ValueSetter<RestoredProjectState['steamLogoPlacement']>
    setSteamBannerColors:
      ValueSetter<RestoredProjectState['steamBannerColors']>
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
  }>
  caseInsertProject: Readonly<{
    setProjectJewelCase:
      ValueSetter<RestoredCaseInsertProjectState['caseInsert']>
  }>
  transientEditor: Readonly<{
    clearPreviewSelections: () => void
    clearDiscArtworkSelection: () => void
    clearDiscLocalScreenshotResults: () => void
    restoreActiveDiscPresetState: (
      state: ActiveDiscPresetState | null,
    ) => void
  }>
}>

export type PreparedApplicationEditorAggregateApply = Readonly<{
  commitLifecycleAndApply(
    commitLifecycle: () => ApplicationLifecycleStateCommitResult,
  ): ApplicationLifecycleStateCommitResult
}>

export interface ApplicationEditorAggregateApplier {
  prepare(
    candidate: StagedProjectOpenCandidate,
  ): ApplicationCommandResult<PreparedApplicationEditorAggregateApply>
}

function invalidCandidate(
  diagnosticMessage: string,
): ApplicationCommandResult<never> {
  return commandFailed({
    code: 'project.open-editor-apply-precondition-failed',
    userMessage: 'The opened project could not be applied to the editor.',
    diagnosticMessage,
    recoverable: true,
  })
}

function validateCandidate(
  candidate: StagedProjectOpenCandidate,
): ApplicationCommandResult<void> {
  if (
    !Object.isFrozen(candidate) ||
    !Object.isFrozen(candidate.normalizedProject) ||
    !Object.isFrozen(candidate.restoredProject)
  ) {
    return invalidCandidate('The staged Open candidate is not immutable.')
  }

  if (getNormalizedProjectKind(candidate.normalizedProject) !== candidate.projectType) {
    return invalidCandidate(
      'The staged project kind does not match its normalized project.',
    )
  }

  if (
    candidate.editorRoute.workspace !== candidate.projectType ||
    !candidate.selectedPath
  ) {
    return invalidCandidate(
      'The staged project route or selected path is invalid.',
    )
  }

  return commandSucceeded(undefined)
}

function applyDiscCandidate(
  dependencies: ApplicationEditorAggregateApplyDependencies,
  candidate: Extract<StagedProjectOpenCandidate, { projectType: 'disc' }>,
) {
  const restored = candidate.restoredProject as unknown as RestoredProjectState

  dependencies.transientEditor.clearPreviewSelections()
  dependencies.discProject.restoreDiscGuidedWorkflow(
    restored.discGuidedWorkflow,
  )
  dependencies.commonProject.setManualGameTitle(restored.manualGameTitle)
  dependencies.commonProject.setProjectMetadata(restored.projectMetadata)
  dependencies.discProject.setProjectLogoAssets(restored.projectLogoAssets)
  dependencies.discProject.setProjectTitleArtwork(restored.projectTitleArtwork)
  dependencies.discProject.setProjectAdditionalArtwork(
    restored.projectAdditionalArtwork,
  )
  dependencies.discProject.setProjectRatingBadge(restored.projectRatingBadge)
  dependencies.discProject.setProjectMediaMark(restored.projectMediaMark)
  dependencies.discProject.setProjectPlatformMarks(restored.projectPlatformMarks)
  dependencies.discProject.setProjectTechnicalMarks(
    restored.projectTechnicalMarks,
  )
  dependencies.commonProject.setSelectedSteamGame(restored.selectedSteamGame)
  dependencies.transientEditor.clearDiscArtworkSelection()
  dependencies.transientEditor.clearDiscLocalScreenshotResults()
  dependencies.discProject.restoreDiscTemplateState(restored.template)
  dependencies.discProject.setSteamLogoPlacement(restored.steamLogoPlacement)
  dependencies.discProject.setSteamBannerColors(restored.steamBannerColors)
  dependencies.discProject.setSteamBannerLockupImageUrl(
    restored.steamBannerLockupImageUrl,
  )
  dependencies.discProject.setSteamBannerLockupImageSource(
    restored.steamBannerLockupImageSource,
  )
  dependencies.discProject.setSteamBannerLockupImageSize(
    restored.steamBannerLockupImageSize,
  )
  dependencies.discProject.setSteamBannerLockupLayout(
    restored.steamBannerLockupLayout,
  )
  dependencies.discProject.setSteamBannerUseTextFallback(
    restored.steamBannerUseTextFallback,
  )
  dependencies.discProject.setSteamBannerFallbackText(
    restored.steamBannerFallbackText,
  )
  dependencies.discProject.restoreExportGuides(restored.exportGuides)
  dependencies.discProject.restoreDiscTextState({
    projectDiscNumberArtwork: restored.projectDiscNumberArtwork,
    discTextSettings: restored.discTextSettings,
    discTextValues: restored.discTextValues,
    discTextValueSources: restored.discTextValueSources,
    discTextTitleValue: restored.discTextTitleValue,
    discTextHtmlSources: restored.discTextHtmlSources,
    discTextLayout: restored.discTextLayout,
    discTextStyles: restored.discTextStyles,
  })
  dependencies.discProject.restoreBackgroundImageState({
    backgroundScale: restored.backgroundScale,
    backgroundOffset: restored.backgroundOffset,
    backgroundImageUrl: restored.backgroundImageUrl,
    backgroundImageSource: restored.backgroundImageSource,
    backgroundImageSize: restored.backgroundImageSize,
    isBackgroundArtworkEnabled: restored.isBackgroundArtworkEnabled,
  })
  dependencies.transientEditor.restoreActiveDiscPresetState(
    candidate.activeDiscPresetState as ActiveDiscPresetState | null,
  )
  dependencies.shell.setActiveWorkspace('disc')
  dependencies.shell.setHomeStatusMessage(null)
}

function applyCaseInsertCandidate(
  dependencies: ApplicationEditorAggregateApplyDependencies,
  candidate: Extract<StagedProjectOpenCandidate, { projectType: 'caseInsert' }>,
) {
  const restored = candidate.restoredProject as unknown as
    RestoredCaseInsertProjectState

  dependencies.transientEditor.clearPreviewSelections()
  dependencies.commonProject.setManualGameTitle(restored.manualGameTitle)
  dependencies.commonProject.setProjectMetadata(restored.projectMetadata)
  dependencies.commonProject.setSelectedSteamGame(restored.selectedSteamGame)
  dependencies.caseInsertProject.setProjectJewelCase(restored.caseInsert)
  dependencies.shell.restoreCaseInsertRoute(
    restored.activeCaseInsertTemplatePane,
    candidate.editorRoute.surface,
  )
  dependencies.transientEditor.restoreActiveDiscPresetState(null)
  dependencies.shell.setActiveWorkspace('caseInsert')
  dependencies.shell.setHomeStatusMessage(null)
}

/**
 * Captures current owner adapters before lifecycle commit. The returned apply
 * function performs one synchronous React batch and contains no fallible load
 * work or asynchronous boundary.
 */
export function createApplicationEditorAggregateApplier(
  dependencies: ApplicationEditorAggregateApplyDependencies,
): ApplicationEditorAggregateApplier {
  return Object.freeze({
    prepare(candidate: StagedProjectOpenCandidate) {
      const validation = validateCandidate(candidate)
      if (validation.status !== 'success') return validation

      return commandSucceeded(Object.freeze({
        commitLifecycleAndApply(
          commitLifecycle: () => ApplicationLifecycleStateCommitResult,
        ) {
          let commitResult: ApplicationLifecycleStateCommitResult | undefined
          dependencies.batchReactUpdates(() => {
            commitResult = commitLifecycle()
            if (commitResult.status === 'committed') {
              if (candidate.projectType === 'caseInsert') {
                applyCaseInsertCandidate(dependencies, candidate)
              } else {
                applyDiscCandidate(dependencies, candidate)
              }
            }
          })

          if (!commitResult) {
            throw new Error('The lifecycle/editor batch did not run synchronously.')
          }
          return commitResult
        },
      }))
    },
  })
}
