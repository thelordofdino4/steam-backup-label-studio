import {
  applyCaseSteamDocumentImport, readCaseSteamDocumentBasis, stepProjectedCaseHistory, shouldEnableCaseHistoryRating,
} from './appCaseSteamDocumentCommand.ts'
import { planCaseSteamDocumentImport } from './appCaseSteamDocumentPlan.ts'
import { planDiscSteamDocumentImport } from './appDiscSteamDocumentPlan.ts'
import { readDiscEditorDocumentBasis, applyDiscEditorDocumentEdit, type DiscEditorDocumentOperation } from './appDiscEditorDocumentCommand.ts'
import { planDiscTemplateDocumentEdit } from './appDiscTemplateDocumentPlan.ts'
import type { DiscTemplateState } from '../templates/discTemplateStateModel.ts'
import { prepareDiscHistoryGuidedAttachment, readDiscHistoryTemplate, stepProjectedDiscHistory } from './appDiscHistoryProjection.ts'
import { captureDiscBackgroundExportInput } from '../lifecycle/canonicalProject.ts'
import { readDiscBackgroundAsset } from '../image/discBackgroundAsset.ts'
import { useApplicationTerminationIngress } from './useApplicationTerminationIngress'
import { confirm, open, save } from '@tauri-apps/plugin-dialog'
import { buildSteamMetadataCandidatesFromImportedGame } from '../steam/steamMetadataCandidates'
import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import { unstable_batchedUpdates } from 'react-dom'
import type { JewelCaseGuideId } from '../templates/caseInsertTemplates'
import {
  normalizeCaseInsertNavigationSurfaceForPane,
  type CaseInsertTemplatePaneId,
} from '../caseInsert/templateSurfaces'
import { clampProjectRatingBadgeToSafeZone } from '../layout/discElementSafeZone'
import '../styles/App.css'
import '../styles/layoutFix.css'
import { CaseInsertEditorShell } from '../components/caseInsert/CaseInsertEditorShell'
import {
  createAppCaseInsertPresetWorkflowOwner,
} from './appCaseInsertPresetWorkflow'
import {
  createCaseInsertPresetPresentationController,
} from './caseInsertPresetPresentationController'
import { CASE_INSERT_PRESET_CATALOG } from '../presets/caseInsertPresetCatalog'
import {
  DiscAdditionalTextRoleControls,
} from '../components/editor/DiscAdditionalTextRoleControls'
import {
  DiscAdditionalArtworkRoleControls,
} from '../components/editor/DiscAdditionalArtworkRoleControls'
import {
  DiscBackgroundArtworkRoleControls,
} from '../components/editor/DiscBackgroundArtworkRoleControls'
import {
  DiscEditorNavigationRolePanel,
} from '../components/editor/DiscEditorNavigationRolePanel'
import {
  DiscGameTitleRoleControls,
} from '../components/editor/DiscGameTitleRoleControls'
import {
  DiscGameInfoLogoRoleControls,
} from '../components/editor/DiscGameInfoLogoRoleControls'
import {
  DiscCompanyLogosRoleControls,
} from '../components/editor/DiscCompanyLogosRoleControls'
import {
  DiscLegalInfoRoleControls,
} from '../components/editor/DiscLegalInfoRoleControls'
import {
  EditorRoleFocusProvider,
} from '../components/editor/EditorRoleFocusProvider'
import {
  ApplicationWorkflowHostBoundary,
  WorkflowPresentationOutlet,
} from '../components/editor/ApplicationWorkflowHost'
import {
  useApplicationWorkflowNavigationRouter,
} from '../components/editor/applicationWorkflowNavigation'
import { focusApplicationEditorSurface } from '../editor/applicationEditorFocusAdapter'
import {
  getEditorNavigationShellRoleSectionItems,
} from '../components/editor/editorNavigationShellViewModel'
import { HomeScreen } from '../components/home/HomeScreen'
import type { EditorWorkspace } from '../editor/editorTypes'
import {
  getCaseInsertNavigationRoute,
  type CaseInsertNavigationSurfaceId,
} from '../editor/editorNavigationShell'
import { DiscPreview } from '../components/preview/DiscPreview'
import type { ArtworkPanelProps } from '../components/sidebar/artwork/types'
import { DiscSteamBrandingControls } from '../components/sidebar/branding/DiscSteamBrandingControls'
import type { BrandingPanelProps } from '../components/sidebar/branding/types'
import { ExportOptionsPanel } from '../components/sidebar/ExportOptionsPanel'
import { GamePanel, type GamePanelProps } from '../components/sidebar/GamePanel'
import { ProjectPanel } from '../components/sidebar/ProjectPanel'
import {
  ProjectReplacementDialog,
} from '../components/project/ProjectReplacementDialog'
import {
  useProjectReplacementPrompt,
} from '../components/project/useProjectReplacementPrompt'
import { DiscLayoutPresetsPanel } from '../components/sidebar/DiscLayoutPresetsPanel'
import { TemplatePanel } from '../components/sidebar/TemplatePanel'
import type { TextPanelProps } from '../components/sidebar/textPanelTypes'
import { useAdditionalArtwork } from '../hooks/useAdditionalArtwork'
import { useDiscExportGuides } from '../hooks/useDiscExportGuides'
import { useDiscPreviewSize } from '../hooks/useDiscPreviewSize'
import { useDiscTemplate } from '../hooks/useDiscTemplate'
import { useDiscTextEditor } from '../hooks/useDiscTextEditor'
import { useLogoAssetDiscovery } from '../hooks/useLogoAssetDiscovery'
import { useLocalSteamScreenshots } from '../hooks/useLocalSteamScreenshots'
import { useBackgroundImage } from '../hooks/useBackgroundImage'
import { useCaseInsertBrandingMarkSync } from '../hooks/useCaseInsertBrandingMarkSync'
import { useCaseInsertTemplateEditor } from '../hooks/useCaseInsertTemplateEditor'
import { useJewelCaseSpineEditor } from '../hooks/useJewelCaseSpineEditor'
import { useMediaMarkState } from '../hooks/useMediaMarkState'
import { usePlatformMarksState } from '../hooks/usePlatformMarksState'
import { useProjectLogoAssets } from '../hooks/useProjectLogoAssets'
import { useRatingBadgeState } from '../hooks/useRatingBadgeState'
import { useStatusToasts } from '../hooks/useStatusToasts'
import { useSteamMetadataAssistance } from '../hooks/useSteamMetadataAssistance'
import { useSteamBannerState } from '../hooks/useSteamBannerState'
import { useSteamImport } from '../hooks/useSteamImport'
import { useTechnicalMarks } from '../hooks/useTechnicalMarks'
import { useTitleArtwork } from '../hooks/useTitleArtwork'
import { useWebArtworkDiscovery } from '../hooks/useWebArtworkDiscovery'
import {
  INITIAL_DISC_GUIDED_WORKFLOW_STATE,
  completeDiscGuidedSlot,
  type DiscGuidedWorkflowState,
} from '../guidedPresets/discGuidedWorkflow'
import {
  completeDiscGuidedRatingBadgeAction,
  completeDiscGuidedSlotsForMetadataAction,
} from '../guidedPresets/discGuidedCompletion'
import type { DiscGuidedSlotState } from '../guidedPresets/discGuidedSlots'
import { getNextDiscGuidedWorkflowForPresetApplication, useDiscGuidedPlaceholderPreview } from '../hooks/useDiscGuidedPlaceholderPreview'
import { useActiveDiscPreset } from '../hooks/useActiveDiscPreset'
import {
  applyActiveDiscPresetToBackgroundState,
  isActiveDiscPresetBackgroundFitImpossible,
} from './appActiveDiscPresetBackground'
import {
  applyActiveDiscPresetToPlatformMarkState,
  isActiveDiscPresetPlatformFitImpossible,
} from './appActiveDiscPresetPlatformMarks'
import {
  applyActiveDiscPresetToLogoAssetsState,
  applyActiveDiscPresetToMediaMarkState,
  applyActiveDiscPresetToRatingBadgeState,
  applyActiveDiscPresetToTitleArtworkState,
  isActiveDiscPresetPointFitImpossible,
} from './appActiveDiscPresetPointOwners'
import {
  planDiscSupplementalUskEdit,
} from './appSupplementalUskRatingCandidate'
import { captureDiscRatingLayoutBasis, type DiscRatingLayoutSyncBasis } from '../lifecycle/discRatingLayoutSync'
import {
  ACTIVE_DISC_PRESET_LEGAL_FIT_IMPOSSIBLE_MESSAGE,
  applyActiveDiscPresetToLegalTextState,
  hasDiscPresetLegalFitImpossibleWarning,
  isActiveDiscPresetLegalFitImpossible,
} from './appActiveDiscPresetLegalText'
import {
  ACTIVE_DISC_PRESET_TITLE_FIT_IMPOSSIBLE_MESSAGE,
  applyActiveDiscPresetToTitleTextState,
  hasDiscPresetTitleFitImpossibleWarning,
  isActiveDiscPresetTitleFitImpossible,
} from './appActiveDiscPresetTitleText'
import type {
  ActiveDiscPresetRef,
} from '../presets/discPresetTargetedApplication'
import {
  preserveDiscPointOwnerPlacement,
  type DiscBackgroundPresetOwnerState,
} from '../presets/discPresetOwnerPlacement'
import { createDefaultProjectMetadata } from '../project/projectMetadata'
import {
  DEFAULT_CASE_INSERT_PROJECT_TITLE,
  createBlankJewelCaseSavedProject,
  createDefaultProjectJewelCaseState,
  setProjectJewelCaseExportGuideIds,
} from '../project/projectCaseInsert'
import {
  applyCaseInsertBackCoverLegalText,
} from '../caseInsert/steamBackCoverImport'
import type {
  CaseInsertPreviewTextTarget,
} from '../caseInsert/previewTextSelection'
import { createFittedSteamBackCoverCopy } from '../caseInsert/backCoverCopyFit'
import {
  createSteamCaseInsertTitleArtworkSeed,
} from '../caseInsert/titleArtwork'
import {
  updateRatingBadgeEnabledState,
} from '../project/projectRatingBadge'
import type {
  ProjectLogoAssets,
  ProjectMediaMark,
  ProjectMetadata,
  ProjectRatingBadge,
  ProjectTitleArtwork,
  SavedCaseInsertProject,
  SavedDiscProject,
  SavedProject,
} from '../project/projectTypes'
import { readProjectFile } from '../tauri/fileSystem'
import { writePngFile } from '../tauri/pngFile.ts'
import { decodeProjectPackageFile } from '../tauri/packageProjectFile'
import { recognizeProjectFileFormat } from '../tauri/projectFileFormat'
import { encodeAndWriteProjectPackageFile } from '../tauri/projectPackageWrite'
import {
  type LegalTextCandidate,
  type RatingBoardCandidate,
  type SteamMetadataCandidateDiscoveryResult,
} from '../steam/steamMetadataCandidates'
import {
  loadImage,
} from '../export/canvasImage'
import { buildCaseInsertExportPreflightSummary } from '../export/caseInsertExportPreflight'
import { exportCaseInsertPngBytes } from '../export/exportCaseInsertPng'
import { exportDiscLabelPngBytes } from '../export/exportPng'
import { buildExportPreflightSummary } from '../export/exportPreflight'
import { createImageSizeWithDetectedContentBounds } from '../image/imageContentBounds'
import {
  DEFAULT_STEAM_BANNER_LOCKUP_IMAGE_URL,
} from '../branding/steamBanner'
import { useCaseInsertPreviewPointerDrag } from '../interaction/useCaseInsertPreviewPointerDrag'
import { useDiscPreviewPointerDrag } from '../interaction/useDiscPreviewPointerDrag'
import {
  getDiscTextPreviewTransform,
  type SteamLogoPlacement,
} from '../discText/index'
import {
  captureDiscPngLayout,
  createCaseInsertPngExportInput,
  createDiscPngExportInput,
  getDiscPngExportPreviewWidth,
} from './appPngExportInputs'
import {
  createCaseInsertPreviewTextHandlers,
} from './appCaseInsertPreviewTextHandlers'
import {
  createSteamMetadataAutoApplyPlan,
  createSteamImportMetadataPlan,
  getAutoAppliedMetadataCandidateStatusMessage,
} from './appSteamImportPlan'
import {
  applyPreparedSteamDiscVisualDefaultImport,
  prepareSteamDiscVisualDefaultImport,
  shouldApplySteamPlatformMarksEligibilityChange,
} from './appSteamDiscVisualImport'
import {
  createLegacyProjectForWorkspace,
} from './appProjectSave'
import {
  stageAppProjectOpen,
} from './appProjectLoad'
import {
  createApplicationEditorAggregateApplier,
} from './appProjectRestore'
import {
  publishApplicationCommandFeedback,
} from './appApplicationCommandFeedback'
import {
  useApplicationLifecycleRoot,
} from './useApplicationLifecycleRoot'
import {
  useApplicationMenuCommandIngress,
} from './useApplicationMenuLifecycleIngress'
import {
  useApplicationDocumentSelectionOwnership,
} from './applicationDocumentSelectionOwnership'
import { useApplicationModalPresence } from './useApplicationModalPresence'
import {
  type DiscRolePresetBackgroundRestoreState,
} from './appDiscRolePresetApplication'
import { createBlankDiscSavedProject } from '../project/blankDiscProject'
import { planDiscPresetDocument } from './appDiscPresetDocumentPlan.ts'
import { commitPreparedDiscBackgroundCompound, projectDiscPresetSiblingFields } from './appDiscBackgroundCompoundCommand.ts'
import { createSavedDiscGuidedLayout, restoreSavedDiscGuidedWorkflow } from '../project/projectGuidedWorkflow.ts'
import {
  prepareNewProjectEditorApply,
} from './appProjectNewEditorApply'
import {
  prepareApplicationWorkspaceNavigationApply,
  type ApplicationWorkspaceDestination,
} from './appWorkspaceNavigationApply'
import { selectHomeResumeProjectSummary } from './appHomeResume'
import type {
  ApplicationCommandId,
} from '../lifecycle/applicationCommandTypes'

type SteamMetadataApplyOptions = {
  announce?: boolean
  mode?: 'primary' | 'supplemental-usk'
  applyDiscVisualDefaults?: boolean
}

type SteamImportOptions = {
  applyDiscVisualDefaults?: boolean
  applyCaseInsertBackCoverDefaults?: boolean
}

type DiscHistoryDiagnostic = (
  step: (direction: 'undo' | 'redo') => ReturnType<typeof stepProjectedDiscHistory>,
) => () => void

type CaseHistoryDiagnostic = (
  step: (direction: 'undo' | 'redo') => ReturnType<typeof stepProjectedCaseHistory>,
) => () => void

function App({ connectDiscHistoryDiagnostic, connectCaseHistoryDiagnostic }: {
  connectDiscHistoryDiagnostic?: DiscHistoryDiagnostic
  connectCaseHistoryDiagnostic?: CaseHistoryDiagnostic
} = {}) {
  const [activeWorkspace, setActiveWorkspace] = useState<EditorWorkspace>('home')
  const [homeStatusMessage, setHomeStatusMessage] = useState<string | null>(null)
  const [discGuidedWorkflow, setDiscGuidedWorkflow] =
    useState<DiscGuidedWorkflowState>(INITIAL_DISC_GUIDED_WORKFLOW_STATE)
  const completeActiveDiscGuidedSlot = useCallback((
    slotId: Parameters<typeof completeDiscGuidedSlot>[1],
  ) => {
    setDiscGuidedWorkflow((currentWorkflow) =>
      completeDiscGuidedSlot(currentWorkflow, slotId).state,
    )
  }, [])
  const { projectStatus, statusToasts, announceStatus } = useStatusToasts()
  const replacementPrompt = useProjectReplacementPrompt()
  const applicationModalActive = useApplicationModalPresence()
  const discPreviewRef = useRef<HTMLDivElement | null>(null)
  const caseInsertPreviewRef = useRef<HTMLDivElement | null>(null)
  const discEditorHeadingRef = useRef<HTMLHeadingElement | null>(null)
  const caseEditorHeadingRef = useRef<HTMLHeadingElement | null>(null)
  const workspaceFocusRequestRef =
    useRef<ApplicationWorkspaceDestination | null>(null)
  const discPreviewSize = useDiscPreviewSize({
    activeWorkspace,
    discPreviewRef,
  })
  const {
    selectedDiscTemplateId,
    customDiscTemplate,
    selectedDiscTemplate,
    defaultDiscTemplate,
    discTemplateOptions,
    customDimensionFields,
    isCustomDiscTemplate,
    guideOverlay,
    discExportPreviewFallbackSize,
    resetDiscTemplateState,
    restoreDiscTemplateState,
    handleTemplateChange,
    handleCustomDimensionChange,
  } = useDiscTemplate({
    announceStatus,
    commitTemplateChange: handleDiscTemplateDocumentEdit,
    getGeometryGuardrailState,
  })
  const [steamLogoPlacement, setSteamLogoPlacement] =
    useState<SteamLogoPlacement>('top')
  const {
    exportGuides,
    resetExportGuides,
    restoreExportGuides,
    handleExportGuideToggle,
  } = useDiscExportGuides()
  const [manualGameTitle, setManualGameTitle] = useState('Untitled Steam Backup Label')
  const [projectJewelCase, setProjectJewelCase] = useState(() =>
    createDefaultProjectJewelCaseState(DEFAULT_CASE_INSERT_PROJECT_TITLE),
  )
  const [activeCaseInsertTemplatePane, setActiveCaseInsertTemplatePane] =
    useState<CaseInsertTemplatePaneId>('cover')
  const [
    activeCaseInsertNavigationSurface,
    setActiveCaseInsertNavigationSurface,
  ] = useState<CaseInsertNavigationSurfaceId>('front')
  const [selectedCaseInsertTextTarget, setSelectedCaseInsertTextTarget] =
    useState<CaseInsertPreviewTextTarget | null>(null)
  const caseInsertTemplateEditor = useCaseInsertTemplateEditor({
    setProjectJewelCase,
    announceStatus,
  })
  const discRoleSectionItems =
    getEditorNavigationShellRoleSectionItems('disc-label')
  const jewelCaseSpineEditor = useJewelCaseSpineEditor({
    setProjectJewelCase,
    announceStatus,
  })
  const [projectMetadata, setProjectMetadata] = useState<ProjectMetadata>(() =>
    createDefaultProjectMetadata(),
  )
  const {
    gameSearchQuery,
    setGameSearchQuery,
    steamSearchResults,
    selectedSteamGame,
    setSelectedSteamGame,
    isSteamSearchLoading,
    isSteamImportLoading,
    resetSteamImportState,
    clearSteamSearchResults,
    runSteamImport,
    handleSteamSearch,
  } = useSteamImport({
    announceStatus,
  })
  const {
    steamBannerColors,
    setSteamBannerColors,
    steamBannerLockupImageUrl,
    setSteamBannerLockupImageUrl,
    steamBannerLockupImageSource,
    setSteamBannerLockupImageSource,
    steamBannerLockupImageSize,
    setSteamBannerLockupImageSize,
    steamBannerLockupLayout,
    setSteamBannerLockupLayout,
    steamBannerUseTextFallback,
    setSteamBannerUseTextFallback,
    steamBannerFallbackText,
    setSteamBannerFallbackText,
    resetSteamBannerState,
    handleSteamBannerLockupUpload,
    handleClearSteamBannerLockup,
    handleSteamBannerUseTextFallbackChange,
    handleSteamBannerFallbackTextChange,
    handleSteamBannerLockupLayoutChange,
    handleResetSteamBannerLockupLayout,
    handleSteamBannerColorChange,
    handleResetSteamBannerColors,
  } = useSteamBannerState({
    announceStatus,
  })
  const activeDiscPreset = useActiveDiscPreset()

  function applyActiveBackgroundPresetPlacement(
    background: DiscBackgroundPresetOwnerState,
  ) {
    const result = applyActiveDiscPresetToBackgroundState({
      presetState: activeDiscPreset.getActivePresetState(),
      selectedDiscTemplate,
      background,
    })
    return {
      background: isActiveDiscPresetBackgroundFitImpossible(result.application) ? null : result.background,
      acceptPlacement: () => activeDiscPreset.recordTargetedPresetApplication(result.application),
    }
  }
  const {
    backgroundImageUrl,
    backgroundImageSource,
    backgroundImageSize,
    backgroundScale,
    backgroundOffset,
    beginBackgroundDrag,
    updateBackgroundDragOffset,
    finishBackgroundDrag,
    cancelBackgroundDrag,
    backgroundRangeGesture,
    isBackgroundArtworkEnabled,
    selectedArtworkId,
    setSelectedArtworkId,
    isArtworkLoading,
    backgroundPreviewSize,
    backgroundOffsetSliderRanges,
    effectiveBackgroundImageUrl,
    effectiveBackgroundImageSize,
    applyBackgroundImageImport,
    clearSelectedArtwork,
    handleBackgroundUpload,
    handlePickNativeBackgroundFile,
    handleResetBackground,
    handleUseSteamArtwork,
    handleBackgroundArtworkEnabledChange,
    handleBackgroundScaleChange,
    handleBackgroundOffsetChange,
    handleFitBackgroundToSteamBannerOpenArea,
    invalidateBackgroundWorkAfterPreset,
    getDiscSession,
  } = useBackgroundImage({
    discPreviewSize,
    steamLogoPlacement,
    announceStatus,
    applyActivePresetPlacement: applyActiveBackgroundPresetPlacement,
    prepareGuidedCompletion(slotId, session) {
      const committed = restoreSavedDiscGuidedWorkflow(session.project.editor)
      const next = completeDiscGuidedSlot(committed, slotId)
      if (next.outcome !== 'completed') return null
      const guidedLayout = createSavedDiscGuidedLayout(next.state)
      if (!guidedLayout) return null
      return { guidedLayout, mirror: () => setDiscGuidedWorkflow(next.state) }
    },
  })
  const {
    localSteamScreenshots,
    localSteamScreenshotThumbnails,
    hasCheckedLocalSteamScreenshots,
    isLocalSteamScreenshotsLoading,
    resetLocalSteamScreenshotSearch,
    clearLocalSteamScreenshotResults,
    handleFindLocalSteamScreenshots,
    handleUseLocalSteamScreenshot,
    handleOpenLocalSteamScreenshotFolder,
  } = useLocalSteamScreenshots({
    selectedSteamGame,
    applyBackgroundImageImport,
    setSelectedArtworkId,
    announceStatus,
  })
  const lastAnnouncedImpossibleTitlePresetRef =
    useRef<ActiveDiscPresetRef | null>(null)
  const lastAnnouncedImpossibleLegalPresetRef =
    useRef<ActiveDiscPresetRef | null>(null)

  function applyActiveTitleArtworkPresetPlacement(
    titleArtwork: ProjectTitleArtwork,
  ) {
    const result = applyActiveDiscPresetToTitleArtworkState({
      presetState: activeDiscPreset.getActivePresetState(),
      selectedDiscTemplate,
      titleArtwork,
    })
    activeDiscPreset.recordTargetedPresetApplication(result.application)
    return isActiveDiscPresetPointFitImpossible(
      result.application,
      'game-title.artwork',
    )
      ? null
      : result.titleArtwork
  }

  function applyActiveRatingBadgePresetPlacement(
    ratingBadge: ProjectRatingBadge,
    metadata: Pick<ProjectMetadata, 'ratingSystem' | 'ratingValue'>,
  ) {
    const result = applyActiveDiscPresetToRatingBadgeState({
      presetState: activeDiscPreset.getActivePresetState(),
      selectedDiscTemplate,
      ratingBadge,
      metadata,
    })
    activeDiscPreset.recordTargetedPresetApplication(result.application)
    return isActiveDiscPresetPointFitImpossible(
      result.application,
      'rating.primary',
    )
      ? null
      : result.ratingBadge
  }

  function applyActiveMediaMarkPresetPlacement(
    mediaMark: ProjectMediaMark,
  ) {
    const result = applyActiveDiscPresetToMediaMarkState({
      presetState: activeDiscPreset.getActivePresetState(),
      selectedDiscTemplate,
      mediaMark,
    })
    activeDiscPreset.recordTargetedPresetApplication(result.application)
    return isActiveDiscPresetPointFitImpossible(
      result.application,
      'media-format.primary',
    )
      ? null
      : result.mediaMark
  }

  function applyActiveLogoPresetPlacement(
    logoAssets: ProjectLogoAssets,
    logoKey: 'developer' | 'publisher',
  ) {
    const result = applyActiveDiscPresetToLogoAssetsState({
      presetState: activeDiscPreset.getActivePresetState(),
      selectedDiscTemplate,
      logoAssets,
      logoKey,
    })
    activeDiscPreset.recordTargetedPresetApplication(result.application)
    const target = logoKey === 'developer'
      ? 'developer-logo.primary' as const
      : 'publisher-logo.primary' as const
    return isActiveDiscPresetPointFitImpossible(
      result.application,
      target,
    )
      ? null
      : result.logoAssets
  }
  const {
    projectDiscNumberArtwork,
    discTextSettings,
    discTextValues,
    discTextValueSources,
    discTextTitleValue,
    discTextHtmlSources,
    discTextLayout,
    discTextStyles,
    selectedDiscTextKey,
    setSelectedDiscTextKey,
    metadataBoundDiscTextValues,
    resolvedDiscTextTitle,
    getCurrentDiscTextContent,
    setDiscTextLayout,
    setDiscTextValues,
    setDiscTextValueSources,
    resetDiscTextState,
    restoreDiscTextState,
    planDiscTextLayoutClamp,
    setDiscTextSettings,
    repositionDiscTextForSteamLogoPlacement,
    clampMetadataBoundDiscTextLayoutsForProjectMetadataFields,
    handleDiscTextToggle,
    handleDiscTextPreviewEditStart,
    handleDiscTextContentChange,
    handleDiscTextContentModeChange,
    handleDiscTextInlineDraftChange,
    finalizeDiscTextInlineDraft,
    handleUseMetadataDiscTextValue,
    handleDiscTextLayoutChange,
    handleDiscTextAlignmentChange,
    handleDiscTextModeChange,
    handleDiscTextArcSideChange,
    handleDiscTextVisualAvoidanceChange,
    handleResetDiscTextLayout,
    handleDiscTextStyleChange,
    handleDiscTextRichTextCommand,
    handleDiscTextRichTextKeyboardCommand,
    getDiscTextRichTextCommandState,
    handleResetDiscTextStyle,
    handleApplyDiscTextStylePreset,
    handleDiscNumberArtworkModeChange,
    handleDiscNumberArtworkBadgeSetChange,
    enableCurvedCopyrightDiscText,
    setCopyrightDiscTextEnabled,
    applySteamImportedDiscTextValues,
  } = useDiscTextEditor({
    projectMetadata,
    selectedDiscTemplate,
    steamLogoPlacement,
    onDiscGuidedSlotCompleted: completeActiveDiscGuidedSlot,
    applyActivePresetTitlePlacement: (input) => {
      const result = applyActiveDiscPresetToTitleTextState({
        presetState: activeDiscPreset.getActivePresetState(),
        selectedDiscTemplate,
        titleText: {
          key: 'title',
          ...input,
        },
      })
      const activePresetRef = activeDiscPreset.getActivePresetRef()
      const fitIsImpossible =
        isActiveDiscPresetTitleFitImpossible(result.application)

      if (
        fitIsImpossible &&
        activePresetRef &&
        lastAnnouncedImpossibleTitlePresetRef.current !== activePresetRef
      ) {
        lastAnnouncedImpossibleTitlePresetRef.current = activePresetRef
        announceStatus(ACTIVE_DISC_PRESET_TITLE_FIT_IMPOSSIBLE_MESSAGE)
      } else if (!fitIsImpossible) {
        lastAnnouncedImpossibleTitlePresetRef.current = null
      }

      activeDiscPreset.recordTargetedPresetApplication(result.application)
      return fitIsImpossible ? null : result.titleText.layout
    },
    applyActivePresetLegalPlacement: (input) => {
      const result = applyActiveDiscPresetToLegalTextState({
        presetState: activeDiscPreset.getActivePresetState(),
        selectedDiscTemplate,
        legalText: {
          key: 'copyright',
          ...input,
        },
      })
      const activePresetRef = activeDiscPreset.getActivePresetRef()
      const fitIsImpossible =
        isActiveDiscPresetLegalFitImpossible(result.application)

      if (
        fitIsImpossible &&
        activePresetRef &&
        lastAnnouncedImpossibleLegalPresetRef.current !== activePresetRef
      ) {
        lastAnnouncedImpossibleLegalPresetRef.current = activePresetRef
        announceStatus(ACTIVE_DISC_PRESET_LEGAL_FIT_IMPOSSIBLE_MESSAGE)
      } else if (!fitIsImpossible) {
        lastAnnouncedImpossibleLegalPresetRef.current = null
      }

      activeDiscPreset.recordTargetedPresetApplication(result.application)
      return fitIsImpossible ? null : result.legalText.layout
    },
  })
  const {
    projectLogoAssets,
    setProjectLogoAssets,
    applyLogoAssetImport,
    resetProjectLogoAssets,
    handleLogoAssetUpload,
    handleLogoAssetLayoutChange,
    handleClearLogoAsset,
    handleResetLogoAssetLayout,
    handleAddAdditionalLogoAsset,
    handleRemoveAdditionalLogoAsset,
    handleAdditionalLogoAssetLabelChange,
  } = useProjectLogoAssets({
    selectedDiscTemplate,
    announceStatus,
    applyActivePresetPlacement: applyActiveLogoPresetPlacement,
    onDiscGuidedSlotCompleted: completeActiveDiscGuidedSlot,
  })
  const {
    projectRatingBadge,
    setProjectRatingBadge,
    resetProjectRatingBadge,
    setRatingBadgeEnabled,
    setRatingBadgeEnabledForAppliedCandidate,
    handleRatingBadgeUpload,
    handleRatingBadgeSourceChange,
    handleRatingBadgeLayoutChange,
    handleSupplementalUskRatingBadgeEnabledChange,
    handleSupplementalUskRatingBadgeValueChange,
    handleSupplementalUskRatingBadgeLayoutChange,
    handleClearRatingBadgeImage,
    handleResetRatingBadgeLayout,
    handleResetSupplementalUskRatingBadgeLayout,
  } = useRatingBadgeState({
    selectedDiscTemplate,
    projectMetadata,
    announceStatus,
    applyActivePresetPlacement: applyActiveRatingBadgePresetPlacement,
    onDiscGuidedSlotCompleted: completeActiveDiscGuidedSlot,
  })
  const {
    projectMediaMark,
    setProjectMediaMark,
    resetProjectMediaMark,
    handleMediaMarkUpload,
    handleMediaMarkValueChange,
    handleMediaMarkSourceChange,
    handleMediaMarkThemeChange,
    handleMediaMarkLayoutChange,
    handleClearMediaMarkImage,
    handleResetMediaMarkLayout,
  } = useMediaMarkState({
    selectedDiscTemplate,
    announceStatus,
    applyActivePresetPlacement: applyActiveMediaMarkPresetPlacement,
    onDiscGuidedSlotCompleted: completeActiveDiscGuidedSlot,
  })
  const {
    projectPlatformMarks,
    setProjectPlatformMarks,
    resetProjectPlatformMarks,
    handlePlatformMarkToggle,
    handlePlatformMarkUpload,
    handlePlatformMarkSourceChange,
    handlePlatformMarkThemeChange,
    handlePlatformMarkLayoutChange,
    handleClearPlatformMarkImage,
    handleResetPlatformMarkLayout,
    applyProjectPlatformMarksEligibilityChange,
  } = usePlatformMarksState({
    selectedDiscTemplate,
    selectedSteamGame,
    announceStatus,
    onDiscGuidedSlotCompleted: completeActiveDiscGuidedSlot,
    applyActivePresetPlacement: (platformMarks) => {
      const result = applyActiveDiscPresetToPlatformMarkState({
        presetState: activeDiscPreset.getActivePresetState(),
        selectedDiscTemplate,
        platformMarks,
      })
      activeDiscPreset.recordTargetedPresetApplication(result.application)
      return isActiveDiscPresetPlatformFitImpossible(result.application)
        ? null
        : result.platformMarks
    },
  })
  const {
    projectTechnicalMarks,
    setProjectTechnicalMarks,
    resetProjectTechnicalMarks,
    handleTechnicalMarkToggle,
    handleTechnicalMarkUpload,
    handleTechnicalMarkSourceChange,
    handleTechnicalMarkLayoutChange,
    handleTechnicalMarkLabelChange,
    handleClearTechnicalMarkImage,
    handleResetTechnicalMarkLayout,
    handleAddTechnicalMarkAsset,
    handleRemoveTechnicalMarkAsset,
  } = useTechnicalMarks({
    selectedDiscTemplate,
    announceStatus,
  })
  const {
    projectTitleArtwork,
    setProjectTitleArtwork,
    resetProjectTitleArtwork,
    resetTitleArtworkLayoutForPlacement,
    handleTitleArtworkLayoutChange,
    handleResetTitleArtworkLayout,
    handleRestoreTitleArtworkDefault,
    handleTitleArtworkUpload,
    prepareSteamTitleArtworkImport,
    applySteamTitleArtworkImport,
  } = useTitleArtwork({
    selectedDiscTemplate,
    steamLogoPlacement,
    announceStatus,
    applyActivePresetPlacement: applyActiveTitleArtworkPresetPlacement,
    commitLayoutReset: handleDiscTitleArtworkLayoutReset,
    onDiscGuidedSlotCompleted: completeActiveDiscGuidedSlot,
  })
  const {
    projectAdditionalArtwork,
    setProjectAdditionalArtwork,
    resetProjectAdditionalArtwork,
    handleAdditionalArtworkEnabledChange,
    handleAddAdditionalArtworkElement,
    handleAdditionalArtworkUpload,
    handleUseSteamArtworkAsAdditionalArtwork,
    handleUseWebArtworkCandidateAsAdditionalArtwork,
    handleUseLocalSteamScreenshotAsAdditionalArtwork,
    handleAdditionalArtworkLayoutChange,
    handleAdditionalArtworkLabelChange,
    handleResetAdditionalArtworkElementLayout,
    handleAdditionalArtworkFrameChange,
    handleResetAdditionalArtworkElementFrame,
    handleClearAdditionalArtworkElementImage,
    handleRemoveAdditionalArtworkElement,
  } = useAdditionalArtwork({
    selectedDiscTemplate,
    announceStatus,
  })
  const {
    logoCandidateDiscovery,
    findLogoCandidates,
    applyLogoCandidate,
  } = useLogoAssetDiscovery({
    selectedSteamGame,
    projectMetadata,
    selectedDiscTemplate,
    setProjectLogoAssets,
    applyLogoAssetImport,
    announceStatus,
    onDiscGuidedSlotCompleted: completeActiveDiscGuidedSlot,
  })
  const {
    steamMetadataAssistance,
    canFindMetadataCandidates,
    findSteamMetadataCandidates,
    loadImportedSteamMetadataCandidates,
  } = useSteamMetadataAssistance({
    selectedSteamGame,
    projectMetadata,
    announceStatus,
  })
  const {
    webArtworkDiscovery,
    findWebArtworkCandidates,
    applyWebArtworkCandidate,
  } = useWebArtworkDiscovery({
    selectedSteamGame,
    projectMetadata,
    applyBackgroundImageImport,
    announceStatus,
  })
  const caseInsertBrandingSources = {
    projectMetadata,
    projectLogoAssets,
    projectRatingBadge,
    projectMediaMark,
    projectPlatformMarks,
    projectTechnicalMarks,
  }
  const caseInsertBrandingMarkSync = useCaseInsertBrandingMarkSync({
    setProjectJewelCase,
    selectedDiscTemplate,
    brandingSources: caseInsertBrandingSources,
    handleProjectMetadataFieldsChange,
    handleRatingBadgeUpload,
    handleRatingBadgeSourceChange,
    handleRatingBadgeEnabledChange,
    handleSupplementalUskRatingBadgeEnabledChange,
    handleSupplementalUskRatingBadgeValueChange,
    handleClearRatingBadgeImage,
    handleMediaMarkUpload,
    handleMediaMarkValueChange,
    handleMediaMarkSourceChange,
    handleMediaMarkThemeChange,
    handleMediaMarkLayoutChange,
    handleClearMediaMarkImage,
    handlePlatformMarkToggle,
    handlePlatformMarkUpload,
    handlePlatformMarkSourceChange,
    handlePlatformMarkThemeChange,
    handlePlatformMarkLayoutChange,
    handleClearPlatformMarkImage,
    handleTechnicalMarkToggle,
    handleTechnicalMarkUpload,
    handleTechnicalMarkSourceChange,
    handleTechnicalMarkLayoutChange,
    handleTechnicalMarkLabelChange,
    handleClearTechnicalMarkImage,
    handleAddTechnicalMarkAsset,
    handleRemoveTechnicalMarkAsset,
  })

  const {
    cancelPreviewPointerDrag,
    previewPointerHandlers,
  } = useDiscPreviewPointerDrag({
    preview: {
      discPreviewRef,
      selectedDiscTemplate,
    },
    background: {
      imageUrl: effectiveBackgroundImageUrl,
      imageSize: backgroundImageSize,
      scale: backgroundScale,
      offset: backgroundOffset,
      begin: beginBackgroundDrag,
      updateOffset: updateBackgroundDragOffset,
      finish: finishBackgroundDrag,
      cancel: cancelBackgroundDrag,
    },
    discText: {
      layout: discTextLayout,
      styles: discTextStyles,
      getTextContent: getCurrentDiscTextContent,
      setLayout: setDiscTextLayout,
    },
    logoAssets: {
      value: projectLogoAssets,
      setValue: setProjectLogoAssets,
    },
    titleArtwork: {
      value: projectTitleArtwork,
      setValue: setProjectTitleArtwork,
    },
    additionalArtwork: {
      value: projectAdditionalArtwork,
      setValue: setProjectAdditionalArtwork,
    },
    ratingBadge: {
      projectMetadata,
      value: projectRatingBadge,
      setValue: setProjectRatingBadge,
    },
    mediaMark: {
      value: projectMediaMark,
      setValue: setProjectMediaMark,
    },
    platformMarks: {
      value: projectPlatformMarks,
      setValue: setProjectPlatformMarks,
    },
    technicalMarks: {
      value: projectTechnicalMarks,
      setValue: setProjectTechnicalMarks,
    },
  })
  const {
    cancelCaseInsertPreviewPointerDrag,
    caseInsertPreviewPointerHandlers,
  } = useCaseInsertPreviewPointerDrag({
    preview: {
      caseInsertPreviewRef,
      activeTemplatePane: activeCaseInsertTemplatePane,
    },
    caseInsert: projectJewelCase,
    setProjectJewelCase,
  })

  const {
    getCaseInsertPreviewTextRichTextCommandState,
    handleCaseInsertPreviewTextAlignChange,
    handleCaseInsertPreviewTextApplyLayoutPreset,
    handleCaseInsertPreviewTextApplyStylePreset,
    handleCaseInsertPreviewTextAvoidVisualElementsChange,
    handleCaseInsertPreviewTextContentModeChange,
    handleCaseInsertPreviewTextEditComplete,
    handleCaseInsertPreviewTextEnabledChange,
    handleCaseInsertPreviewTextLayoutChange,
    handleCaseInsertPreviewTextResetLayout,
    handleCaseInsertPreviewTextResetStyle,
    handleCaseInsertPreviewTextRichTextCommand,
    handleCaseInsertPreviewTextRichTextKeyboardCommand,
    handleCaseInsertPreviewTextStyleChange,
    handleCaseInsertPreviewTextUseMetadataValue,
    handleCaseInsertPreviewTextValueChange,
  } = createCaseInsertPreviewTextHandlers({
    projectJewelCase,
    projectMetadata,
    setProjectJewelCase,
    setSelectedCaseInsertTextTarget,
    resetSpineTitleLayout: jewelCaseSpineEditor.handleResetSpineTitleLayout,
    resetTemplateTextBlockLayout:
      caseInsertTemplateEditor.handleResetTextBlockLayout,
  })
  const discGuidedSlotState = {
    background: {
      enabled: isBackgroundArtworkEnabled,
      imageDataUrl: backgroundImageUrl,
      imageSize: backgroundImageSize,
    },
    titleArtwork: projectTitleArtwork,
    metadata: projectMetadata,
    ratingBadge: projectRatingBadge,
    mediaMark: projectMediaMark,
    platformMarks: projectPlatformMarks,
    logoAssets: projectLogoAssets,
    additionalArtwork: projectAdditionalArtwork,
    discText: {
      settings: discTextSettings,
      values: discTextValues,
      valueSources: discTextValueSources,
      titleValue: discTextTitleValue,
      htmlSources: discTextHtmlSources,
    },
  } satisfies DiscGuidedSlotState
  const discGuidedPlaceholderPreview = useDiscGuidedPlaceholderPreview({
    state: discGuidedSlotState,
    workflow: discGuidedWorkflow,
    updateWorkflow: setDiscGuidedWorkflow,
    activePresetState: activeDiscPreset.activePresetState,
    resetProgress: () => handleDiscGuidedDocumentEdit({ kind: 'reset-guided-progress' }),
    editSlot: (action, slotId) => handleDiscGuidedDocumentEdit({ kind: 'edit-guided-slot', action, slotId }),
  })

  function getDiscDocumentRenderedOwners() {
    return {
      titleArtwork: projectTitleArtwork, additionalArtwork: projectAdditionalArtwork,
      ratingBadge: projectRatingBadge, mediaMark: projectMediaMark, platformMarks: projectPlatformMarks,
      logoAssets: projectLogoAssets, technicalMarks: projectTechnicalMarks, metadata: projectMetadata,
      discTextSettings, discTextLayout, discTextValues, discTextValueSources,
      discTextTitleValue, discTextHtmlSources, discTextStyles,
    }
  }

  function handleDiscTemplateDocumentEdit(next: DiscTemplateState, projectTemplate: () => void) {
    if (finishBackgroundDrag().status !== 'success') return false
    const captured = captureCurrentLegacyProject()
    if (captured.kind !== 'disc') return false
    const basis = readDiscEditorDocumentBasis(applicationLifecycleRoot, captured.project)
    if (!basis) return false
    const rendered = getDiscDocumentRenderedOwners()
    const { fields, template } = planDiscTemplateDocumentEdit(next, rendered, planDiscTextLayoutClamp)
    const { template: savedTemplate, ...mirrorOwners } = fields
    void savedTemplate
    const workflow = discGuidedWorkflow
    const guided = workflow.activeLayout ? prepareDiscHistoryGuidedAttachment({
      workflow, current: basis.current.project, target: basis.current.project,
      plan: mirrorOwners, renderProjection: captured.project, rendered, template,
    }) : null
    if (workflow.activeLayout && !guided) return false
    return applyDiscEditorDocumentEdit(applicationLifecycleRoot, basis, { kind: 'template', fields },
      unstable_batchedUpdates, (accepted) => {
        projectTemplate()
        if (accepted.revision === basis.current.revision) return
        setProjectTitleArtwork(fields.titleArtwork)
        setProjectAdditionalArtwork(fields.additionalArtwork)
        setProjectLogoAssets(fields.logoAssets)
        setProjectRatingBadge(fields.ratingBadge)
        setProjectMediaMark(fields.mediaMark)
        setProjectPlatformMarks(fields.platformMarks)
        setProjectTechnicalMarks(fields.technicalMarks)
        setDiscTextLayout(fields.discTextLayout)
        if (guided) activeDiscPreset.restoreActivePresetState(guided.attachment)
      })
  }

  function handleDiscGuidedDocumentEdit(operation: Extract<DiscEditorDocumentOperation, { kind: 'reset-guided-progress' | 'edit-guided-slot' }>) {
    if (finishBackgroundDrag().status !== 'success') return
    const captured = captureCurrentLegacyProject()
    if (captured.kind !== 'disc') return
    const basis = readDiscEditorDocumentBasis(applicationLifecycleRoot, captured.project)
    if (!basis) return
    applyDiscEditorDocumentEdit(applicationLifecycleRoot, basis, operation,
      unstable_batchedUpdates, (accepted) => {
        if (accepted.revision !== basis.current.revision) {
          setDiscGuidedWorkflow(restoreSavedDiscGuidedWorkflow(accepted.project.editor))
        }
      })
  }

  function handleDiscTitleArtworkLayoutReset(layout: typeof projectTitleArtwork.layout) {
    if (finishBackgroundDrag().status !== 'success') return false
    const captured = captureCurrentLegacyProject()
    if (captured.kind !== 'disc') return false
    const basis = readDiscEditorDocumentBasis(applicationLifecycleRoot, captured.project)
    if (!basis) return false
    return applyDiscEditorDocumentEdit(applicationLifecycleRoot, basis, { kind: 'reset-title-artwork-layout', layout },
      unstable_batchedUpdates, accepted => {
        if (accepted.revision !== basis.current.revision) {
          setProjectTitleArtwork({ ...projectTitleArtwork, layout })
        }
      })
  }

  function getGeometryGuardrailState() {
    return {
      discTextSettings,
      discTextValues: metadataBoundDiscTextValues,
      discTextTitle: resolvedDiscTextTitle,
      discTextLayout,
      projectLogoAssets,
      projectMetadata,
      projectRatingBadge,
      projectMediaMark,
      projectPlatformMarks,
      projectTechnicalMarks,
    }
  }

  function handleApplyDiscRolePreset(presetId: string) {
    if (finishBackgroundDrag().status !== 'success') return false
    const session = getDiscSession()
    if (!session || !applicationLifecycleRoot.canCommitDiscBackground()) return false
    const background = session.project.background
    const currentState = {
      background: {
        enabled: background.enabled ?? true,
        scale: background.scale,
        offset: background.offset,
        imageDataUrl: readDiscBackgroundAsset(background.asset),
        imageSource: background.imageSource ?? null,
        imageSize: background.imageSize ?? null,
      },
      titleArtwork: projectTitleArtwork,
      projectDiscNumberArtwork,
      discTextSettings,
      discTextValues,
      discTextValueSources,
      discTextTitleValue,
      discTextHtmlSources,
      discTextLayout,
      discTextStyles,
      logoAssets: projectLogoAssets,
      ratingBadge: projectRatingBadge,
      mediaMark: projectMediaMark,
      platformMarks: projectPlatformMarks,
      technicalMarks: projectTechnicalMarks,
      additionalArtwork: projectAdditionalArtwork,
      metadata: projectMetadata,
    }
    const plan = planDiscPresetDocument({
      presetId, currentState, selectedDiscTemplate, clampDiscTextLayout: planDiscTextLayoutClamp,
    })
    const { result } = plan

    if (!result.applied) {
      activeDiscPreset.recordPresetApplication(null, null, false)
      announceStatus('Layout preset is unavailable. Choose another preset.')
      return false
    }

    const preparedBackground: DiscRolePresetBackgroundRestoreState | null = plan.background
    const fields = projectDiscPresetSiblingFields(
      currentState, plan.owners, result.dispatchedOwners, result.activePresetRef ? 'preserve' : 'explicit',
    )
    const guided = getNextDiscGuidedWorkflowForPresetApplication({
      currentWorkflow: restoreSavedDiscGuidedWorkflow(session.project.editor),
      presetId: result.canonicalPresetId ?? result.preset.id,
      applied: true,
      ownerState: discGuidedSlotState,
    })
    const outcome = unstable_batchedUpdates(() => commitPreparedDiscBackgroundCompound(applicationLifecycleRoot, {
      sessionId: session.id, expectedRevision: session.revision,
      operation: { kind: 'asset', background: preparedBackground ? {
        note: background.note,
        enabled: preparedBackground.isBackgroundArtworkEnabled,
        scale: preparedBackground.backgroundScale,
        offset: preparedBackground.backgroundOffset,
        imageDataUrl: preparedBackground.backgroundImageUrl,
        imageSource: preparedBackground.backgroundImageSource,
        imageSize: preparedBackground.backgroundImageSize,
      } : {
        note: background.note, enabled: background.enabled, scale: background.scale,
        offset: background.offset, imageSource: background.imageSource,
        imageSize: background.imageSize, imageDataUrl: readDiscBackgroundAsset(background.asset),
      } },
    }, { kind: 'preset', fields, guidedLayout: createSavedDiscGuidedLayout(guided) }, mirror => {
      const owners = plan.owners
      for (const owner of result.dispatchedOwners) {
        switch (owner) {
          case 'titleArtwork': if (mirror.presetField('titleArtwork')) setProjectTitleArtwork(owners.titleArtwork); break
          case 'logoAssets': if (mirror.presetField('logoAssets')) setProjectLogoAssets(owners.logoAssets); break
          case 'ratingBadge':
            if (fields.ratingBadge && (mirror.primaryRatingLayout || mirror.supplementalRatingLayout)) {
              const { layout, uskLayout } = fields.ratingBadge
              setProjectRatingBadge(current => ({
                ...current,
                layout: mirror.primaryRatingLayout ? { ...current.layout, ...layout } : current.layout,
                uskBadge: mirror.supplementalRatingLayout
                  ? { ...current.uskBadge, layout: { ...current.uskBadge.layout, ...uskLayout } }
                  : current.uskBadge,
              }))
            }
            break
          case 'mediaMark': if (mirror.presetField('mediaMark')) setProjectMediaMark(owners.mediaMark); break
          case 'platformMarks': if (mirror.presetField('platformMarks')) setProjectPlatformMarks(owners.platformMarks); break
          case 'technicalMarks': if (mirror.presetField('technicalMarks')) setProjectTechnicalMarks(owners.technicalMarks); break
          case 'discText':
            if (mirror.discTextSettings && currentState.discTextSettings !== owners.discTextSettings) {
              setDiscTextSettings(owners.discTextSettings)
            }
            if (mirror.discTextLayout) setDiscTextLayout(owners.discTextLayout)
            break
        }
      }
      if (mirror.guided) setDiscGuidedWorkflow(guided)
      if (!mirror.currentInteraction) return
      if (preparedBackground) invalidateBackgroundWorkAfterPreset()
      activeDiscPreset.recordPresetApplication(
        result.activePresetRef,
        result.activeResolvedPreset,
        true,
      )

      let announcedFitIssue = false
      if (hasDiscPresetTitleFitImpossibleWarning(result.warnings)) {
        lastAnnouncedImpossibleTitlePresetRef.current =
          result.activePresetRef
        announceStatus(ACTIVE_DISC_PRESET_TITLE_FIT_IMPOSSIBLE_MESSAGE)
        announcedFitIssue = true
      }

      if (hasDiscPresetLegalFitImpossibleWarning(result.warnings)) {
        lastAnnouncedImpossibleLegalPresetRef.current =
          result.activePresetRef
        announceStatus(ACTIVE_DISC_PRESET_LEGAL_FIT_IMPOSSIBLE_MESSAGE)
        announcedFitIssue = true
      }

      if (!announcedFitIssue) announceStatus(`Applied ${result.preset.label} layout preset.`)
    }))
    if (outcome !== 'committed' && outcome !== 'no-op') {
      announceStatus('The Disc preset could not be applied safely.')
      return false
    }
    return true
  }

  function handleRatingBadgeEnabledChange(enabled: boolean) {
    const nextState = updateRatingBadgeEnabledState(
      projectMetadata,
      projectRatingBadge,
      enabled,
    )
    const nextRatingBadge = clampProjectRatingBadgeToSafeZone(
      nextState.ratingBadge,
      selectedDiscTemplate,
      nextState.metadata,
    )
    const finalRatingBadge = enabled
      ? applyActiveRatingBadgePresetPlacement(
          nextRatingBadge,
          nextState.metadata,
        ) ?? {
          ...nextRatingBadge,
          layout: preserveDiscPointOwnerPlacement(
            nextRatingBadge.layout,
            projectRatingBadge.layout,
          ),
        }
      : nextRatingBadge

    setProjectMetadata(nextState.metadata)
    setProjectRatingBadge(finalRatingBadge)
    completeDiscGuidedRatingBadgeAction(
      completeActiveDiscGuidedSlot,
      nextState.metadata,
      finalRatingBadge,
    )

    if (enabled) {
      clampMetadataBoundDiscTextLayoutsForProjectMetadataFields(
        ['ratingSystem', 'ratingValue'],
        nextState.metadata,
      )
    }
  }

  function handleSteamLogoPlacementChange(placement: SteamLogoPlacement) {
    const previousPlacement = steamLogoPlacement
    setSteamLogoPlacement(placement)

    const shouldRepositionForBannerSideChange =
      previousPlacement !== 'none' &&
      placement !== 'none' &&
      previousPlacement !== placement

    if (!shouldRepositionForBannerSideChange) {
      return
    }

    repositionDiscTextForSteamLogoPlacement(placement)
    resetTitleArtworkLayoutForPlacement(placement)
  }

  function handleCaseInsertExportGuideToggle(
    guideIds: readonly JewelCaseGuideId[],
    checked: boolean,
  ) {
    setProjectJewelCase((currentCaseInsert) => {
      const nextGuideIds = new Set(currentCaseInsert.export.guideIds)

      for (const guideId of guideIds) {
        if (checked) {
          nextGuideIds.add(guideId)
        } else {
          nextGuideIds.delete(guideId)
        }
      }

      return setProjectJewelCaseExportGuideIds(
        currentCaseInsert,
        Array.from(nextGuideIds),
      )
    })
  }

  function handleProjectMetadataFieldsChange(fields: Partial<ProjectMetadata>) {
    const nextProjectMetadata = {
      ...projectMetadata,
      ...fields,
    }
    const affectedMetadataFields = Object.keys(fields) as Array<keyof ProjectMetadata>

    if (activeWorkspace === 'disc') {
      completeDiscGuidedSlotsForMetadataAction(
        completeActiveDiscGuidedSlot,
        {
          ...discGuidedSlotState,
          metadata: nextProjectMetadata,
        },
        affectedMetadataFields,
      )
    }

    setProjectMetadata(nextProjectMetadata)

    if (typeof fields.title === 'string') {
      setManualGameTitle(fields.title)
    }

    clampMetadataBoundDiscTextLayoutsForProjectMetadataFields(
      affectedMetadataFields,
      nextProjectMetadata,
    )

    if (
      affectedMetadataFields.includes('ratingSystem') ||
      affectedMetadataFields.includes('ratingValue')
    ) {
      const clampedRatingBadge = clampProjectRatingBadgeToSafeZone(
        projectRatingBadge,
        selectedDiscTemplate,
        nextProjectMetadata,
      )
      setProjectRatingBadge(
        applyActiveRatingBadgePresetPlacement(
          clampedRatingBadge,
          nextProjectMetadata,
        ) ?? {
          ...clampedRatingBadge,
          layout: projectRatingBadge.layout,
        },
      )
    }
  }

  function handleProjectMetadataChange(field: keyof ProjectMetadata, value: string) {
    handleProjectMetadataFieldsChange({ [field]: value } as Partial<ProjectMetadata>)
  }

  function applyRatingCandidateToProject(
    candidate: RatingBoardCandidate,
    options: SteamMetadataApplyOptions = {},
  ) {
    const applyDiscVisualDefaults = options.applyDiscVisualDefaults ?? true

    if (!candidate.canApply) {
      announceStatus('That rating candidate is informational only.')
      return
    }

    const shouldApplyAsSupplementalUsk =
      applyDiscVisualDefaults &&
      options.mode !== 'primary' &&
      candidate.applyKind === 'rating' &&
      candidate.ratingSystem === 'USK' &&
      projectMetadata.ratingSystem === 'PEGI'

    if (shouldApplyAsSupplementalUsk) {
      const accepted = applyDiscSupplementalUskAction(candidate.ratingValue, true)
      if (!accepted) return

      if (options.announce ?? true) {
        announceStatus(
          `Applied ${candidate.boardLabel} ${candidate.displayRating} as an additional badge alongside PEGI.`,
        )
      }
      return
    }

    handleProjectMetadataFieldsChange({
      ratingSystem: candidate.ratingSystem,
      ratingValue: candidate.ratingValue,
    })
    if (applyDiscVisualDefaults) {
      setRatingBadgeEnabledForAppliedCandidate(candidate)
    }

    if (options.announce ?? true) announceStatus(
      candidate.applyKind === 'none'
        ? `Using no rating badge value from ${candidate.boardLabel} candidate.`
        : `Applied ${candidate.boardLabel} ${candidate.displayRating} to rating metadata.`,
    )
  }

  function applyLegalCandidateToProject(
    candidate: LegalTextCandidate,
    options: SteamMetadataApplyOptions = {},
  ) {
    const applyDiscVisualDefaults = options.applyDiscVisualDefaults ?? true

    handleProjectMetadataFieldsChange({
      copyrightText: candidate.text,
    })
    if (applyDiscVisualDefaults) {
      enableCurvedCopyrightDiscText(candidate.text)
    }

    if (options.announce ?? true) {
      announceStatus(
        applyDiscVisualDefaults
          ? 'Applied suggested legal text and enabled curved copyright text.'
          : 'Applied suggested legal text to metadata.',
      )
    }
  }

  function announceAutoAppliedMetadataCandidates(
    ratingCandidate: RatingBoardCandidate | null,
    legalCandidate: LegalTextCandidate | null,
    options: { applyDiscVisualDefaults?: boolean } = {},
  ) {
    const statusMessage = getAutoAppliedMetadataCandidateStatusMessage(
      ratingCandidate,
      legalCandidate,
      options,
    )

    if (statusMessage) announceStatus(statusMessage)
  }

  function autoApplySteamMetadataCandidates(
    result: SteamMetadataCandidateDiscoveryResult,
    options: { applyDiscVisualDefaults?: boolean } = {},
  ) {
    const applyDiscVisualDefaults = options.applyDiscVisualDefaults ?? true
    const {
      ratingCandidate,
      legalCandidate,
      metadataFields,
    } = createSteamMetadataAutoApplyPlan({
      metadataCandidateResult: result,
      projectMetadata,
    })

    if (Object.keys(metadataFields).length > 0) {
      handleProjectMetadataFieldsChange(metadataFields)
    }

    if (applyDiscVisualDefaults) {
      if (ratingCandidate) setRatingBadgeEnabledForAppliedCandidate(ratingCandidate)
      if (legalCandidate) enableCurvedCopyrightDiscText(legalCandidate.text)
    }

    announceAutoAppliedMetadataCandidates(ratingCandidate, legalCandidate, {
      applyDiscVisualDefaults,
    })
  }

  async function handleFindAndApplySteamMetadataCandidates(
    options: { applyDiscVisualDefaults?: boolean } = {},
  ) {
    await findSteamMetadataCandidates((result) => {
      autoApplySteamMetadataCandidates(result, options)
      if (options.applyDiscVisualDefaults === false) {
        caseInsertBrandingMarkSync.scheduleCaseInsertBrandingMarkSlotSync()
      }
    })
  }

  function handleApplyRatingCandidate(
    candidate: RatingBoardCandidate,
    options?: { mode?: 'primary' | 'supplemental-usk' },
  ) {
    applyRatingCandidateToProject(candidate, options)
  }

  function applyDiscSupplementalUskAction(ratingValue: string, applySuggestion: boolean) {
    const basis = applicationLifecycleRoot.getStateSnapshot()
    const disc = basis.state.activeSession
    if (disc?.kind !== 'disc' || basis.state.visibleWorkspace !== 'disc') return false
    const planned = planDiscSupplementalUskEdit(disc.project.ratingBadge ?? projectRatingBadge,
      applySuggestion ? {
        kind: 'apply-suggestion', metadata: disc.project.metadata ?? projectMetadata, ratingValue,
        selectedDiscTemplate, presetState: activeDiscPreset.getActivePresetState(),
      } : { kind: 'choose-value', ratingValue })
    let accepted = false
    unstable_batchedUpdates(() => {
      const result = applicationLifecycleRoot.commitDiscSupplementalUsk({
        sessionId: disc.id, expectedGeneration: basis.generation, ratingValue: planned.badge.uskBadge.ratingValue,
        ...(applySuggestion ? { placement: { layout: planned.badge.layout, uskLayout: planned.badge.uskBadge.layout } } : {}),
      })
      const now = applicationLifecycleRoot.getStateSnapshot()
      const current = now.state.activeSession
      if ((result !== 'committed' && result !== 'no-op') || current?.kind !== 'disc' ||
          current.id !== disc.id || now.state.visibleWorkspace !== 'disc') return
      const badge = current.project.ratingBadge
      if (!badge) return
      accepted = (result === 'committed' ? basis.generation + 1 : basis.generation) === now.generation
      setProjectRatingBadge(local => ({
        ...local,
        layout: applySuggestion ? badge.layout : local.layout,
        uskBadge: {
          ...local.uskBadge,
          layout: applySuggestion ? badge.uskBadge.layout : local.uskBadge.layout,
          ratingValue: badge.uskBadge.ratingValue,
        },
      }))
      if (accepted && planned.placementApplication) {
        activeDiscPreset.recordTargetedPresetApplication(planned.placementApplication)
      }
    })
    return accepted
  }

  function handleDiscSupplementalUskValueChange(ratingValue: string) {
    applyDiscSupplementalUskAction(ratingValue, false)
  }

  function handleApplyCaseInsertRatingCandidate(
    candidate: RatingBoardCandidate,
    options?: { mode?: 'primary' | 'supplemental-usk' },
  ) {
    applyRatingCandidateToProject(candidate, {
      ...options,
      applyDiscVisualDefaults: false,
    })
    caseInsertBrandingMarkSync.scheduleCaseInsertBrandingMarkSlotSync()
  }

  function handleApplyLegalCandidate(candidate: LegalTextCandidate) {
    applyLegalCandidateToProject(candidate)
  }

  function handleApplyCaseInsertLegalCandidate(candidate: LegalTextCandidate) {
    applyLegalCandidateToProject(candidate, {
      applyDiscVisualDefaults: false,
      announce: false,
    })
    setProjectJewelCase((currentCaseInsert) =>
      applyCaseInsertBackCoverLegalText(currentCaseInsert, candidate.text),
    )
    announceStatus('Applied suggested legal text to metadata and tray card.')
  }

  async function handleCopyLegalCandidate(candidate: LegalTextCandidate) {
    if (!navigator.clipboard?.writeText) {
      announceStatus('Clipboard copy is unavailable in this runtime. The legal text field remains editable.')
      return
    }

    try {
      await navigator.clipboard.writeText(candidate.text)
      announceStatus('Copied suggested legal text.')
    } catch (error) {
      announceStatus(`Copying legal text failed: ${String(error)}`)
    }
  }

  function resetDiscProjectState(preparedProject?: SavedProject) {
    const blank = preparedProject?.template.type === 'disc'
      ? preparedProject as SavedDiscProject
      : null
    cancelPreviewPointerDrag()
    cancelCaseInsertPreviewPointerDrag()
    activeDiscPreset.clearActivePreset()

    resetDiscTemplateState()
    setDiscGuidedWorkflow(INITIAL_DISC_GUIDED_WORKFLOW_STATE)
    setSteamLogoPlacement('top')
    resetSteamBannerState()
    resetExportGuides()
    clearSelectedArtwork()
    setManualGameTitle(blank?.game.manualTitle ?? 'Untitled Steam Backup Label')
    setProjectMetadata(blank?.metadata ?? createDefaultProjectMetadata())
    resetProjectLogoAssets(defaultDiscTemplate)
    resetProjectTitleArtwork(defaultDiscTemplate, 'top')
    resetProjectAdditionalArtwork()
    resetProjectRatingBadge(defaultDiscTemplate)
    resetProjectMediaMark(defaultDiscTemplate)
    resetProjectPlatformMarks()
    resetProjectTechnicalMarks()
    resetDiscTextState(defaultDiscTemplate, 'top')
    resetSteamImportState()
    resetLocalSteamScreenshotSearch()
  }

  function resetCaseInsertProjectState(preparedProject?: SavedProject) {
    const blank = preparedProject?.template.type === 'caseInsert'
      ? preparedProject as SavedCaseInsertProject
      : null
    const blankTitle = blank?.game.manualTitle ?? DEFAULT_CASE_INSERT_PROJECT_TITLE
    cancelCaseInsertPreviewPointerDrag()
    activeDiscPreset.clearActivePreset()

    setManualGameTitle(blankTitle)
    setProjectMetadata(blank?.metadata ?? {
      ...createDefaultProjectMetadata(),
      title: blankTitle,
    })
    setSelectedSteamGame(null)
    setProjectJewelCase(
      blank?.caseInsert ?? createDefaultProjectJewelCaseState(blankTitle),
    )
    resetProjectLogoAssets(defaultDiscTemplate)
    resetProjectRatingBadge(defaultDiscTemplate)
    resetProjectMediaMark(defaultDiscTemplate)
    resetProjectPlatformMarks()
    resetProjectTechnicalMarks()
    resetProjectAdditionalArtwork()
    setActiveCaseInsertTemplatePane('cover')
    setActiveCaseInsertNavigationSurface('front')
  }

  function handleCaseInsertNavigationSurfaceChange(
    surfaceId: CaseInsertNavigationSurfaceId,
  ) {
    const route = getCaseInsertNavigationRoute(surfaceId)

    setActiveCaseInsertNavigationSurface(route.navigationSurfaceId)
    setActiveCaseInsertTemplatePane(route.caseInsertPane)
  }

  function handleActiveCaseInsertTemplatePaneChange(
    paneId: CaseInsertTemplatePaneId,
  ) {
    setActiveCaseInsertTemplatePane(paneId)
    setActiveCaseInsertNavigationSurface(
      normalizeCaseInsertNavigationSurfaceForPane(
        paneId,
        activeCaseInsertNavigationSurface,
      ),
    )
  }

  async function dispatchApplicationCommand(commandId: ApplicationCommandId) {
    const result = await applicationLifecycleRoot.dispatch(commandId)
    publishApplicationCommandFeedback(result, {
      announceStatus,
      setHomeStatusMessage,
    })
    return result
  }

  async function dispatchNewProject(
    commandId: 'project.new-disc' | 'project.new-case',
  ) {
    await dispatchApplicationCommand(commandId)
  }

  async function handleNewProject() {
    await dispatchNewProject('project.new-disc')
  }

  async function handleStartNewDiscProject() {
    await dispatchNewProject('project.new-disc')
  }

  async function handleOpenCaseInsertEditor() {
    await dispatchNewProject('project.new-case')
  }

  async function handleReturnToHome() {
    await dispatchApplicationCommand('workspace.return-home')
  }

  async function handleResumeProject() {
    await dispatchApplicationCommand('project.resume')
  }

  async function handleSwitchToCaseInsertFromDisc() {
    await dispatchNewProject('project.new-case')
  }

  async function handleSteamImport(
    appId: number,
    options: SteamImportOptions = {},
  ) {
    const applyDiscVisualDefaults = options.applyDiscVisualDefaults ?? true

    clearSelectedArtwork()

    await runSteamImport(appId, async (importedState, request) => {
      const metadataCandidateResult = buildSteamMetadataCandidatesFromImportedGame(
        importedState.importedGame,
      )
      const {
        isDifferentSelectedSteamGame,
        autoRatingCandidate,
        autoLegalCandidate,
        nextProjectMetadata,
        shouldResetGameScopedRating,
        shouldResetGameScopedLegal,
        shouldUpdateCopyrightDiscTextSource,
      } = createSteamImportMetadataPlan({
        importedGame: importedState.importedGame,
        selectedSteamGame,
        projectMetadata,
        metadataCandidateResult,
      })
      const preparedDiscVisualImport = applyDiscVisualDefaults
        ? await prepareSteamDiscVisualDefaultImport({
          importedGame: importedState.importedGame,
          nextProjectMetadata,
          shouldUpdateCopyrightDiscTextSource,
          projectPlatformMarks,
          selectedDiscTemplate,
          selectedSteamGame,
          prepareSteamTitleArtworkImport,
        })
        : null
      const caseInsertTitleArtworkSeed = options.applyCaseInsertBackCoverDefaults
        ? await createSteamCaseInsertTitleArtworkSeed(importedState.importedGame)
        : null
      const caseInsertBackCoverCopyFit = options.applyCaseInsertBackCoverDefaults
        ? createFittedSteamBackCoverCopy(importedState.importedGame, {
          legalText: nextProjectMetadata.copyrightText,
        })
        : null

      return () => {
        if (activeWorkspace === 'disc' && preparedDiscVisualImport && !options.applyCaseInsertBackCoverDefaults) {
          const captured = captureCurrentLegacyProject()
          if (captured.kind !== 'disc') return
          // The async hook has just admitted the session/content revision. A
          // same-content Save As can change generation while the PNG decodes.
          const basis = readDiscEditorDocumentBasis(applicationLifecycleRoot, captured.project)
          if (!basis || basis.current.id !== request.sessionId ||
              basis.current.revision !== request.contentRevision || importedState.importedGame.appId !== appId) return
          const plan = planDiscSteamDocumentImport(preparedDiscVisualImport, {
            isDifferentSelectedSteamGame, autoRatingCandidate, autoLegalCandidate, nextProjectMetadata,
            shouldResetGameScopedRating, shouldResetGameScopedLegal, shouldUpdateCopyrightDiscTextSource,
          }, getDiscDocumentRenderedOwners(), selectedDiscTemplate, steamLogoPlacement,
          activeDiscPreset.getActivePresetState())
          const committed = applyDiscEditorDocumentEdit(applicationLifecycleRoot, basis, {
            kind: 'steam-import', expectedRevision: request.contentRevision, after: plan.after,
          }, unstable_batchedUpdates, accepted => {
            if (accepted.revision !== basis.current.revision) {
              setSelectedSteamGame(importedState.importedGame)
              setManualGameTitle(importedState.manualGameTitle)
              setProjectMetadata(nextProjectMetadata)
              setProjectTitleArtwork(plan.titleArtwork)
              if (plan.platformMarks) setProjectPlatformMarks(plan.platformMarks)
              if (plan.badge) setProjectRatingBadge(plan.badge)
              setDiscTextSettings({ ...discTextSettings, copyright: plan.copyrightEnabled })
              setDiscTextLayout({ ...discTextLayout, ...plan.layout })
              setDiscTextValues({
                ...discTextValues,
                ...(plan.after.text?.appId !== undefined && { appId: plan.after.text.appId }),
                ...(plan.after.text?.copyright !== undefined && { copyright: plan.after.text.copyright }),
              })
              setDiscTextValueSources({
                ...discTextValueSources,
                ...(plan.after.text?.copyrightSource && { copyright: plan.after.text.copyrightSource }),
              })
              setDiscGuidedWorkflow(restoreSavedDiscGuidedWorkflow(accepted.project.editor))
              activeDiscPreset.restoreActivePresetState(plan.presetState)
            }
            loadImportedSteamMetadataCandidates(importedState.importedGame)
            clearSteamSearchResults()
          })
          if (!committed) throw new Error('The checked Disc import could not be applied.')
          announceStatus(importedState.statusMessage)
          announceStatus(preparedDiscVisualImport.titleArtwork.statusMessage)
          announceStatus(preparedDiscVisualImport.platform.statusMessage)
          announceAutoAppliedMetadataCandidates(autoRatingCandidate, autoLegalCandidate, { applyDiscVisualDefaults })
          return
        }
        if (options.applyCaseInsertBackCoverDefaults) {
          const captured = captureCurrentLegacyProject()
          if (captured.kind !== 'caseInsert') return
          const basis = readCaseSteamDocumentBasis(applicationLifecycleRoot, captured.project)
          if (!basis || basis.current.id !== request.sessionId ||
              basis.current.revision !== request.contentRevision || importedState.importedGame.appId !== appId) return
          const plan = planCaseSteamDocumentImport({
            current: captured.project, importedGame: importedState.importedGame,
            titleArtworkSeed: caseInsertTitleArtworkSeed,
            metadataPlan: {
              isDifferentSelectedSteamGame, autoRatingCandidate, autoLegalCandidate, nextProjectMetadata,
              shouldResetGameScopedRating, shouldResetGameScopedLegal, shouldUpdateCopyrightDiscTextSource,
            },
            brandingSources: {
              projectMetadata, projectLogoAssets, projectRatingBadge, projectMediaMark, projectPlatformMarks, projectTechnicalMarks,
            },
          })
          const committed = applyCaseSteamDocumentImport(applicationLifecycleRoot, {
            sessionId: request.sessionId, expectedRevision: request.contentRevision,
            expectedGeneration: basis.expectedGeneration, proposed: plan.project,
          }, unstable_batchedUpdates, changed => {
            if (changed) {
              setSelectedSteamGame(importedState.importedGame)
              setManualGameTitle(importedState.manualGameTitle)
              setProjectMetadata(nextProjectMetadata)
              setProjectRatingBadge(plan.ratingBadge)
              setProjectJewelCase(plan.project.caseInsert)
            }
            loadImportedSteamMetadataCandidates(importedState.importedGame)
            clearSteamSearchResults()
          })
          if (!committed) throw new Error('The checked Case import could not be applied.')
          announceStatus(importedState.statusMessage)
          caseInsertBackCoverCopyFit?.warnings.forEach(warning => announceStatus(warning))
          if (caseInsertTitleArtworkSeed) announceStatus(caseInsertTitleArtworkSeed.statusMessage)
          announceAutoAppliedMetadataCandidates(autoRatingCandidate, autoLegalCandidate, { applyDiscVisualDefaults })
          announceStatus(plan.backCoverStatus)
          return
        }
        loadImportedSteamMetadataCandidates(importedState.importedGame)
        const discVisualImport = preparedDiscVisualImport
          ? applyPreparedSteamDiscVisualDefaultImport(preparedDiscVisualImport, {
            applySteamImportedDiscTextValues,
            applySteamTitleArtworkImport,
          })
          : null
        setSelectedSteamGame(importedState.importedGame)
        clearSteamSearchResults()
        setManualGameTitle(importedState.manualGameTitle)
        setProjectMetadata(nextProjectMetadata)
        announceStatus(importedState.statusMessage)

        if (discVisualImport) {
          if (
            shouldApplySteamPlatformMarksEligibilityChange(
              discVisualImport.platformMarkImportStatus,
            )
          ) {
            applyProjectPlatformMarksEligibilityChange(
              discVisualImport.platformMarks,
            )
          }
          if (autoLegalCandidate) {
            enableCurvedCopyrightDiscText(autoLegalCandidate.text)
          } else if (shouldResetGameScopedLegal) {
            setCopyrightDiscTextEnabled(false)
          }
          if (autoRatingCandidate) {
            setRatingBadgeEnabledForAppliedCandidate(autoRatingCandidate)
          } else if (shouldResetGameScopedRating) {
            setRatingBadgeEnabled(false)
          }
          clampMetadataBoundDiscTextLayoutsForProjectMetadataFields(
            [
              'title',
              'steamAppId',
              'developer',
              'publisher',
              'copyrightText',
            ],
            nextProjectMetadata,
            discVisualImport.nextDiscTextResolution,
          )
          announceStatus(discVisualImport.titleArtworkStatusMessage)
          announceStatus(discVisualImport.platformMarkStatusMessage)
        }

        announceAutoAppliedMetadataCandidates(autoRatingCandidate, autoLegalCandidate, {
          applyDiscVisualDefaults,
        })
      }
    })
  }

  const captureCurrentLegacyProject = useCallback(
    () => createLegacyProjectForWorkspace({
      activeWorkspace,
      caseInsertProject: {
        manualGameTitle,
        selectedSteamGame,
        projectMetadata,
        caseInsert: projectJewelCase,
        activeCaseInsertTemplatePane,
      },
      discProject: {
        discGuidedWorkflow,
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
        discTextSettings,
        discTextValues,
        discTextValueSources,
        discTextTitleValue,
        discTextHtmlSources,
        discTextLayout,
        discTextStyles,
      },
    }),
    [
      activeCaseInsertTemplatePane,
      activeWorkspace,
      customDiscTemplate,
      discGuidedWorkflow,
      discTextHtmlSources,
      discTextLayout,
      discTextSettings,
      discTextStyles,
      discTextTitleValue,
      discTextValueSources,
      discTextValues,
      exportGuides,
      manualGameTitle,
      projectAdditionalArtwork,
      projectDiscNumberArtwork,
      projectJewelCase,
      projectLogoAssets,
      projectMediaMark,
      projectMetadata,
      projectPlatformMarks,
      projectRatingBadge,
      projectTechnicalMarks,
      projectTitleArtwork,
      selectedDiscTemplateId,
      selectedSteamGame,
      steamBannerColors,
      steamBannerFallbackText,
      steamBannerLockupImageSize,
      steamBannerLockupImageSource,
      steamBannerLockupImageUrl,
      steamBannerLockupLayout,
      steamBannerUseTextFallback,
      steamLogoPlacement,
    ],
  )

  async function handleSaveProject() {
    await dispatchApplicationCommand('project.save')
  }

  const applicationLifecycleRoot = useApplicationLifecycleRoot({
    open: {
      stageCandidate: () => stageAppProjectOpen({
      openDialog: async (options) => open({
        multiple: options.multiple,
        filters: options.filters?.map((filter) => ({
          name: filter.name,
          extensions: [...filter.extensions],
        })),
      }),
      readProjectFileCommand: readProjectFile,
      recognizeProjectFileFormatCommand: recognizeProjectFileFormat,
      decodeProjectPackageFileCommand: decodeProjectPackageFile,
      defaultSteamBannerLockupImageUrl:
        DEFAULT_STEAM_BANNER_LOCKUP_IMAGE_URL,
      resolveBackgroundImageSize: async (imageDataUrl) =>
        createImageSizeWithDetectedContentBounds(await loadImage(imageDataUrl)),
      caseInsertBrandingSources,
    }),
      prepareEditorAggregateApply: (candidate) =>
        createApplicationEditorAggregateApplier({
        batchReactUpdates: (apply) => unstable_batchedUpdates(apply),
        shell: {
          setActiveWorkspace,
          setHomeStatusMessage,
          restoreCaseInsertRoute: (pane, surface) => {
            setActiveCaseInsertTemplatePane(pane)
            setActiveCaseInsertNavigationSurface(surface)
          },
        },
        commonProject: {
          setManualGameTitle,
          setProjectMetadata,
          setSelectedSteamGame,
        },
        discProject: {
          restoreDiscGuidedWorkflow: setDiscGuidedWorkflow,
          setProjectLogoAssets,
          setProjectTitleArtwork,
          setProjectAdditionalArtwork,
          setProjectRatingBadge,
          setProjectMediaMark,
          setProjectPlatformMarks,
          setProjectTechnicalMarks,
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
        },
        caseInsertProject: {
          setProjectJewelCase,
        },
        transientEditor: {
          clearPreviewSelections: () => {
            setSelectedCaseInsertTextTarget(null)
            setSelectedDiscTextKey(null)
          },
          clearDiscArtworkSelection: clearSelectedArtwork,
          clearDiscLocalScreenshotResults: clearLocalSteamScreenshotResults,
          restoreActiveDiscPresetState:
            activeDiscPreset.restoreActivePresetState,
        },
        }).prepare(candidate),
    },
    save: {
      saveDialog: async (options) => save({
        defaultPath: options.defaultPath,
        filters: options.filters.map((filter) => ({
          name: filter.name,
          extensions: [...filter.extensions],
        })),
      }),
      packageWrite: Object.freeze({
        encodeAndWrite: encodeAndWriteProjectPackageFile,
      }),
    },
    replacement: {
      promptForReplacementDecision: replacementPrompt.requestDecision,
    },
    newProject: {
      createBlankProject: (kind) => kind === 'disc'
        ? createBlankDiscSavedProject()
        : createBlankJewelCaseSavedProject(),
      prepareEditorApply: (kind, project) => prepareNewProjectEditorApply({
        batchReactUpdates: (apply) => unstable_batchedUpdates(apply),
        resetDiscProject: resetDiscProjectState,
        resetCaseProject: resetCaseInsertProjectState,
        setActiveWorkspace,
        setHomeStatusMessage,
      }, kind, project),
    },
    workspaceNavigation: {
      prepareWorkspaceApply: (destination) =>
        prepareApplicationWorkspaceNavigationApply({
          batchReactUpdates: (apply) => unstable_batchedUpdates(apply),
          cancelActivePointerGestures: () => {
            cancelPreviewPointerDrag()
            cancelCaseInsertPreviewPointerDrag()
          },
          setActiveWorkspace,
          restoreCaseInsertRoute: (pane, surface) => {
            setActiveCaseInsertTemplatePane(pane)
            setActiveCaseInsertNavigationSurface(surface)
          },
          requestFocus: (requestedDestination) => {
            workspaceFocusRequestRef.current = requestedDestination
          },
        }, destination),
    },
    exportPng: {
      getCaseInsertAdapter: () => activeWorkspace === 'caseInsert'
        ? Object.freeze({
            kind: 'caseInsert',
            physicalTarget: activeCaseInsertTemplatePane === 'cover'
              ? 'case-cover-sheet'
              : 'case-tray-card',
            captureInvocation: () => ({
              ...createCaseInsertPngExportInput({
                caseInsert: projectJewelCase,
                activeTemplatePane: activeCaseInsertTemplatePane,
                projectMetadata,
                projectLogoAssets,
                projectRatingBadge,
                projectMediaMark,
                projectPlatformMarks,
                projectTechnicalMarks,
              }),
              saveDialog: save,
              confirmDialog: confirm,
              writePngFileCommand: writePngFile,
              buildPreflightSummary: buildCaseInsertExportPreflightSummary,
              exportPngBytes: exportCaseInsertPngBytes,
            }),
          })
        : null,
      getDiscAdapter: () => activeWorkspace === 'disc'
        ? Object.freeze({
          kind: 'disc',
          physicalTarget: 'disc-label',
          captureInvocation: session => {
            return {
              ...createDiscPngExportInput({
                selectedDiscTemplateId,
                selectedDiscTemplate,
                ...captureDiscBackgroundExportInput(session.project.background),
                ...captureDiscPngLayout(session.project, { discTextSettings, discTextLayout, projectRatingBadge }),
                selectedSteamGame,
                manualGameTitle,
                steamLogoPlacement,
                steamBannerUseTextFallback,
                steamBannerFallbackText,
                steamBannerLockupImageUrl,
                projectLogoAssets,
                projectTitleArtwork,
                projectMetadata,
                projectMediaMark,
                projectPlatformMarks,
                projectTechnicalMarks,
                exportGuides,
                resolvedDiscTextTitle,
                steamBannerColors,
                steamBannerLockupImageSize,
                steamBannerLockupLayout,
                projectDiscNumberArtwork,
                projectAdditionalArtwork,
                discTextValues,
                discTextValueSources,
                discTextHtmlSources,
                discTextStyles,
              }),
              getPreviewSize: () => getDiscPngExportPreviewWidth(
                discPreviewRef.current,
                discExportPreviewFallbackSize,
              ),
              saveDialog: save,
              confirmDialog: confirm,
              writePngFileCommand: writePngFile,
              buildPreflightSummary: buildExportPreflightSummary,
              exportPngBytes: exportDiscLabelPngBytes,
            }
          },
        })
        : null,
    },
  })
  const applicationCommandSnapshot = useSyncExternalStore(
    applicationLifecycleRoot.subscribe,
    applicationLifecycleRoot.getSnapshot,
    applicationLifecycleRoot.getSnapshot,
  )
  const [caseInsertPresetWorkflowOwner] = useState(() =>
    createAppCaseInsertPresetWorkflowOwner({
      lifecycle: applicationLifecycleRoot,
      catalog: CASE_INSERT_PRESET_CATALOG,
    }))
  const [caseInsertPresetPresentation] = useState(() =>
    createCaseInsertPresetPresentationController({
      workflow: caseInsertPresetWorkflowOwner,
      catalog: CASE_INSERT_PRESET_CATALOG,
      publishDispatchFeedback: (dispatch) => {
        if (dispatch.disposition === 'executed' && dispatch.result.status === 'success') {
          const accepted = applicationLifecycleRoot.getStateSnapshot()
          const session = accepted.state.activeSession
          const receipt = dispatch.result.value as { sessionId?: string; projectRevision?: number; applicationRevision?: number } | undefined
          if (accepted.casePresetProjectionPending && session?.kind === 'caseInsert' &&
              receipt?.sessionId === session.id && receipt.projectRevision === session.revision &&
              receipt.applicationRevision === session.caseInsertPresetApplication.applicationRevision) {
            setProjectJewelCase(structuredClone(session.project.caseInsert) as typeof projectJewelCase)
          }
        }
        publishApplicationCommandFeedback(dispatch, {
          announceStatus,
          setHomeStatusMessage,
        })
      },
    }))
  const exportPngDisabled =
    !applicationCommandSnapshot.capabilities['export.png'].canExecute
  const getWorkflowFallbackFocus = useCallback(() => {
    if (activeWorkspace === 'disc') return discEditorHeadingRef.current
    if (activeWorkspace === 'caseInsert') return caseEditorHeadingRef.current
    return document.getElementById('home-title')
  }, [activeWorkspace])
  const workflowNavigationRouter = useApplicationWorkflowNavigationRouter({
    environment: {
      sessionId: applicationCommandSnapshot.lifecycle.activeSession?.id ?? null,
      workspaceId: activeWorkspace === 'disc'
        ? 'workspace.disc'
        : activeWorkspace === 'caseInsert'
          ? 'workspace.case'
          : null,
      surfaceId: activeWorkspace === 'disc'
        ? 'surface.disc'
        : activeWorkspace === 'caseInsert'
          ? activeCaseInsertNavigationSurface === 'front'
            ? 'surface.case.front'
            : activeCaseInsertNavigationSurface === 'back'
              ? 'surface.case.back'
              : 'surface.case.spine'
          : null,
      lifecycleTransitionActive:
        applicationCommandSnapshot.busy.occupiedScopes.includes(
          'lifecycle.transition',
        ),
      applicationModalActive,
    },
    getFallbackFocus: getWorkflowFallbackFocus,
    focusApplicationSurface: focusApplicationEditorSurface,
    onCapabilitiesChanged:
      applicationLifecycleRoot.refreshCommandCapabilities,
  })
  useApplicationTerminationIngress({ announceStatus, setHomeStatusMessage, applicationModalActive })
  useApplicationMenuCommandIngress({
    announceStatus,
    setHomeStatusMessage,
    workflowNavigation: workflowNavigationRouter.menuPort,
  })
  useApplicationDocumentSelectionOwnership()

  const renderedSessionId = applicationCommandSnapshot.lifecycle.activeSession?.id
  const historyProjectionPending =
    applicationLifecycleRoot.getStateSnapshot().discHistoryProjectionPending === true
  const caseSteamProjectionPending =
    applicationLifecycleRoot.getStateSnapshot().caseSteamProjectionPending === true
  const discRatingProjectionBasis = useRef<{ sessionId: string; basis: DiscRatingLayoutSyncBasis } | null>(null)
  useLayoutEffect(() => {
    if (activeWorkspace === 'home') return
    const lifecycle = applicationLifecycleRoot.getStateSnapshot()
    const session = lifecycle.state.activeSession
    if (!session || session.id !== renderedSessionId || session.kind !== activeWorkspace) return

    const captured = captureCurrentLegacyProject()
    if (captured.kind === 'disc') {
      if (lifecycle.discHistoryProjectionPending) {
        const outcome = applicationLifecycleRoot.acknowledgeDiscHistoryProjection({
          sessionId: session.id, expectedGeneration: lifecycle.generation, projection: captured.project,
        })
        if (outcome === 'committed') {
          discRatingProjectionBasis.current = {
            sessionId: session.id, basis: captureDiscRatingLayoutBasis(captured.project.ratingBadge ?? projectRatingBadge),
          }
        }
        return
      }
      const previous = discRatingProjectionBasis.current
      const outcome = applicationLifecycleRoot.synchronizeDiscLegacyProject({
        sessionId: session.id, legacy: captured.project,
        ...(previous?.sessionId === session.id ? { ratingBasis: previous.basis } : {}),
      })
      if (outcome === 'synchronized' || outcome === 'no-op') {
        discRatingProjectionBasis.current = {
          sessionId: session.id, basis: captureDiscRatingLayoutBasis(captured.project.ratingBadge ?? projectRatingBadge),
        }
      }
    } else {
      if (lifecycle.caseSteamProjectionPending) {
        applicationLifecycleRoot.acknowledgeCaseSteamProjection({
          sessionId: session.id, expectedGeneration: lifecycle.generation, projection: captured.project,
        })
        return
      }
      applicationLifecycleRoot.synchronizeCurrentProject({
        sessionId: session.id, kind: 'caseInsert', project: captured.project,
      })
    }
    applicationLifecycleRoot.synchronizeCurrentEditorRoute({
      sessionId: session.id,
      kind: activeWorkspace,
      route: activeWorkspace === 'disc'
        ? { workspace: 'disc' }
        : {
            workspace: 'caseInsert',
            surface: activeCaseInsertNavigationSurface,
          },
    })
  }, [
    activeCaseInsertNavigationSurface,
    activeWorkspace,
    applicationLifecycleRoot,
    captureCurrentLegacyProject,
    caseSteamProjectionPending,
    historyProjectionPending,
    projectRatingBadge,
    renderedSessionId,
  ])

  // Intentionally not a public menu/shortcut and not present in production
  // composition. The mounted fixture can exercise the real editor batch.
  useLayoutEffect(() => connectDiscHistoryDiagnostic?.(direction =>
    stepProjectedDiscHistory(applicationLifecycleRoot, direction, {
      batch: unstable_batchedUpdates,
      setGame: ({ manualTitle, selectedSteamGame }) => {
        setManualGameTitle(manualTitle)
        setSelectedSteamGame(selectedSteamGame)
      },
      setMetadata: setProjectMetadata,
      setDiscTextValues,
      setDiscTextValueSources,
      setTemplate: restoreDiscTemplateState,
      setAdditionalArtwork: setProjectAdditionalArtwork,
      setRatingBadge: setProjectRatingBadge,
      setMediaMark: setProjectMediaMark,
      setPlatformMarks: setProjectPlatformMarks,
      setTitleArtwork: setProjectTitleArtwork,
      setLogoAssets: setProjectLogoAssets,
      setTechnicalMarks: setProjectTechnicalMarks,
      setDiscTextSettings,
      setDiscTextLayout,
      prepareGuidedAttachment(workflow, target, plan, current) {
        const projection = captureCurrentLegacyProject()
        if (projection.kind !== 'disc') return null
        const template = plan.template ? readDiscHistoryTemplate(plan.template) : selectedDiscTemplate
        if (!template) return null
        const prepared = prepareDiscHistoryGuidedAttachment({
          workflow, target, plan, current, template,
          renderProjection: projection.project, rendered: getDiscDocumentRenderedOwners(),
        })
        return prepared ? () => {
          setDiscGuidedWorkflow(prepared.workflow)
          activeDiscPreset.restoreActivePresetState(prepared.attachment)
        } : null
      },
    })),
  )

  useLayoutEffect(() => connectCaseHistoryDiagnostic?.(direction => {
    const captured = captureCurrentLegacyProject()
    if (captured.kind !== 'caseInsert') return 'unavailable'
    return stepProjectedCaseHistory(applicationLifecycleRoot, direction, captured.project,
      unstable_batchedUpdates, target => {
        if (!target.metadata) return
        setManualGameTitle(target.game.manualTitle)
        setSelectedSteamGame(target.game.selectedSteamGame)
        setProjectMetadata(target.metadata)
        setProjectJewelCase(target.caseInsert)
        const metadata = target.metadata
        const enabled = shouldEnableCaseHistoryRating(target)
        setProjectRatingBadge(current => updateRatingBadgeEnabledState(metadata, current, enabled).ratingBadge)
      })
  }))

  useLayoutEffect(() => {
    const destination = workspaceFocusRequestRef.current
    if (!destination) return
    workspaceFocusRequestRef.current = null

    const target = destination.workspace === 'home'
      ? document.getElementById('home-resume-project') ??
        document.getElementById('home-title')
      : document.getElementById(
          destination.workspace === 'disc'
            ? 'disc-editor-heading'
            : 'case-insert-editor-heading',
        )
    target?.focus({ preventScroll: true })
  })

  async function handleLoadProject() {
    await dispatchApplicationCommand('project.open')
  }

  async function handleExportPng() {
    await dispatchApplicationCommand('export.png')
  }

  const gamePanelProps: GamePanelProps = {
    manualGameTitle,
    setManualGameTitle,
    projectMetadata,
    handleProjectMetadataChange,
    handleProjectMetadataFieldsChange,
    gameSearchQuery,
    setGameSearchQuery,
    handleSteamSearch,
    steamSearchResults,
    handleSteamImport,
    selectedSteamGame,
    isSteamSearchLoading,
    isSteamImportLoading,
    metadataAssistance: steamMetadataAssistance,
    canFindMetadataCandidates,
    handleFindMetadataCandidates: handleFindAndApplySteamMetadataCandidates,
    handleApplyRatingCandidate,
    handleApplyLegalCandidate,
    handleCopyLegalCandidate,
  }
  const caseInsertGamePanelProps: GamePanelProps = {
    ...gamePanelProps,
    handleProjectMetadataChange:
      caseInsertBrandingMarkSync.handleCaseInsertProjectMetadataChange,
    handleProjectMetadataFieldsChange:
      caseInsertBrandingMarkSync.handleCaseInsertProjectMetadataFieldsChange,
    handleSteamImport: async (appId) => {
      await handleSteamImport(appId, {
        applyDiscVisualDefaults: false,
        applyCaseInsertBackCoverDefaults: true,
      })
    },
    handleFindMetadataCandidates: async () => {
      await handleFindAndApplySteamMetadataCandidates({
        applyDiscVisualDefaults: false,
      })
    },
    handleApplyRatingCandidate: handleApplyCaseInsertRatingCandidate,
    handleApplyLegalCandidate: handleApplyCaseInsertLegalCandidate,
  }
  const artworkPanelProps: ArtworkPanelProps = {
    selectedSteamGame,
    selectedArtworkId,
    isArtworkLoading,
    handleUseSteamArtwork,
    webArtworkDiscovery,
    handleFindWebArtworkCandidates: findWebArtworkCandidates,
    handleUseWebArtworkCandidate: applyWebArtworkCandidate,
    localSteamScreenshots,
    localSteamScreenshotThumbnails,
    hasCheckedLocalSteamScreenshots,
    isLocalSteamScreenshotsLoading,
    handleFindLocalSteamScreenshots,
    handleOpenLocalSteamScreenshotFolder,
    handleUseLocalSteamScreenshot,
    handleBackgroundUpload,
    handlePickNativeBackgroundFile,
    isBackgroundArtworkEnabled,
    handleBackgroundArtworkEnabledChange,
    backgroundScale,
    backgroundOffset,
    backgroundOffsetSliderRanges,
    handleBackgroundScaleChange,
    handleBackgroundOffsetChange,
    backgroundRangeGesture,
    backgroundImageUrl,
    backgroundImageSource,
    handleResetBackground,
    canFitBackgroundToSteamBannerOpenArea: Boolean(backgroundImageUrl),
    backgroundFitButtonLabel:
      steamLogoPlacement === 'none'
        ? 'Fit edge to edge'
        : 'Fit between Steam banner and disc edge',
    handleFitBackgroundToSteamBannerOpenArea,
    projectTitleArtwork,
    selectedDiscTemplate,
    handleTitleArtworkLayoutChange,
    handleResetTitleArtworkLayout,
    handleRestoreTitleArtworkDefault,
    handleTitleArtworkUpload,
    projectAdditionalArtwork,
    handleAdditionalArtworkEnabledChange,
    handleAddAdditionalArtworkElement,
    handleAdditionalArtworkUpload,
    handleUseSteamArtworkAsAdditionalArtwork,
    handleUseWebArtworkCandidateAsAdditionalArtwork,
    handleUseLocalSteamScreenshotAsAdditionalArtwork,
    handleAdditionalArtworkLayoutChange,
    handleAdditionalArtworkLabelChange,
    handleAdditionalArtworkFrameChange,
    handleResetAdditionalArtworkElementLayout,
    handleResetAdditionalArtworkElementFrame,
    handleClearAdditionalArtworkElementImage,
    handleRemoveAdditionalArtworkElement,
  }

  const brandingPanelProps: BrandingPanelProps = {
    steamLogoPlacement,
    handleSteamLogoPlacementChange,
    steamBannerLockupImageUrl,
    steamBannerLockupImageSource,
    steamBannerLockupImageSize,
    steamBannerLockupLayout,
    steamBannerUseTextFallback,
    steamBannerFallbackText,
    steamBannerColors,
    projectLogoAssets,
    projectMetadata,
    projectRatingBadge,
    projectMediaMark,
    projectPlatformMarks,
    projectTechnicalMarks,
    selectedDiscTemplate,
    handleProjectMetadataChange,
    handleProjectMetadataFieldsChange,
    handleSteamBannerLockupUpload,
    handleClearSteamBannerLockup,
    handleSteamBannerLockupLayoutChange,
    handleResetSteamBannerLockupLayout,
    handleSteamBannerUseTextFallbackChange,
    handleSteamBannerFallbackTextChange,
    handleSteamBannerColorChange,
    handleResetSteamBannerColors,
    handleLogoAssetUpload,
    logoCandidateDiscovery,
    handleFindLogoCandidates: findLogoCandidates,
    handleApplyLogoCandidate: applyLogoCandidate,
    handleLogoAssetLayoutChange,
    handleClearLogoAsset,
    handleResetLogoAssetLayout,
    handleAddAdditionalLogoAsset,
    handleAdditionalLogoAssetLabelChange,
    handleRemoveAdditionalLogoAsset,
    handleRatingBadgeUpload,
    handleRatingBadgeSourceChange,
    handleRatingBadgeEnabledChange,
    handleRatingBadgeLayoutChange,
    handleSupplementalUskRatingBadgeEnabledChange,
    handleSupplementalUskRatingBadgeValueChange: handleDiscSupplementalUskValueChange,
    handleSupplementalUskRatingBadgeLayoutChange,
    handleClearRatingBadgeImage,
    handleResetRatingBadgeLayout,
    handleResetSupplementalUskRatingBadgeLayout,
    handleMediaMarkUpload,
    handleMediaMarkValueChange,
    handleMediaMarkSourceChange,
    handleMediaMarkThemeChange,
    handleMediaMarkLayoutChange,
    handleClearMediaMarkImage,
    handleResetMediaMarkLayout,
    handlePlatformMarkToggle,
    handlePlatformMarkUpload,
    handlePlatformMarkSourceChange,
    handlePlatformMarkThemeChange,
    handlePlatformMarkLayoutChange,
    handleClearPlatformMarkImage,
    handleResetPlatformMarkLayout,
    handleTechnicalMarkToggle,
    handleTechnicalMarkUpload,
    handleTechnicalMarkSourceChange,
    handleTechnicalMarkLayoutChange,
    handleTechnicalMarkLabelChange,
    handleClearTechnicalMarkImage,
    handleResetTechnicalMarkLayout,
    handleAddTechnicalMarkAsset,
    handleRemoveTechnicalMarkAsset,
  }
  const textPanelProps: TextPanelProps = {
    discTextSettings,
    discTextLayout,
    discTextStyles,
    projectDiscNumberArtwork,
    discTextValues,
    discTextValueSources,
    metadataBoundDiscTextValues,
    discTextTitleValue,
    resolvedDiscTextTitle,
    selectedDiscTemplate,
    selectedDiscTextKey,
    handleDiscTextToggle,
    handleDiscTextPreviewEditStart,
    handleDiscTextContentChange,
    handleUseMetadataDiscTextValue,
    handleDiscTextLayoutChange,
    handleDiscTextAlignmentChange,
    handleDiscTextModeChange,
    handleDiscTextArcSideChange,
    handleDiscTextVisualAvoidanceChange,
    handleResetDiscTextLayout,
    handleDiscTextStyleChange,
    handleApplyDiscTextStylePreset,
    handleDiscNumberArtworkModeChange,
    handleDiscNumberArtworkBadgeSetChange,
    handleResetDiscTextStyle,
    steamLogoPlacement,
  }

  const homeResumeProject = selectHomeResumeProjectSummary(
    applicationLifecycleRoot.getLifecycleState(),
  )

  if (activeWorkspace === 'home') {
    return (
      <>
        <HomeScreen
          onLoadProject={handleLoadProject}
          onNewDisc={handleStartNewDiscProject}
          onNewCaseInsert={handleOpenCaseInsertEditor}
          onResumeProject={handleResumeProject}
          resumeProject={homeResumeProject}
          statusMessage={homeStatusMessage}
        />
        <ProjectReplacementDialog
          onDecision={replacementPrompt.decide}
          open={replacementPrompt.open}
        />
      </>
    )
  }

  if (activeWorkspace === 'caseInsert') {
    return (
      <>
        <ApplicationWorkflowHostBoundary
          controller={workflowNavigationRouter.controller}
          hostContentRef={workflowNavigationRouter.hostContentRef}
        >
        <CaseInsertEditorShell
        editorHeadingRef={caseEditorHeadingRef}
        caseInsert={projectJewelCase}
        activeTemplatePane={activeCaseInsertTemplatePane}
        activeNavigationSurface={activeCaseInsertNavigationSurface}
        selectedTextTarget={selectedCaseInsertTextTarget}
        caseInsertPreviewRef={caseInsertPreviewRef}
        pointerHandlers={caseInsertPreviewPointerHandlers}
        editor={caseInsertTemplateEditor}
        spineEditor={jewelCaseSpineEditor}
        imageSources={{
          selectedSteamGame,
          localSteamScreenshots,
          localSteamScreenshotThumbnails,
          hasCheckedLocalSteamScreenshots,
          isLocalSteamScreenshotsLoading,
          onFindLocalSteamScreenshots: handleFindLocalSteamScreenshots,
          onOpenLocalSteamScreenshotFolder: handleOpenLocalSteamScreenshotFolder,
          webArtworkDiscovery,
          onFindWebArtworkCandidates: findWebArtworkCandidates,
        }}
        brandingSources={{
          projectMetadata,
          projectLogoAssets,
          projectRatingBadge,
          projectMediaMark,
          projectPlatformMarks,
          projectTechnicalMarks,
        }}
        getBrandingControls={
          caseInsertBrandingMarkSync.getCaseInsertBrandingControlsForTarget
        }
        logoCandidateDiscovery={logoCandidateDiscovery}
        handleFindLogoCandidates={findLogoCandidates}
        gamePanelProps={caseInsertGamePanelProps}
        caseInsertPresetPresentation={caseInsertPresetPresentation}
        projectStatus={projectStatus}
        statusToasts={statusToasts}
        onMainMenu={handleReturnToHome}
        onNewCaseInsert={handleOpenCaseInsertEditor}
        onNewDisc={handleStartNewDiscProject}
        onSaveProject={handleSaveProject}
        onLoadProject={handleLoadProject}
        onExportPng={handleExportPng}
        exportPngDisabled={exportPngDisabled}
        onExportGuideToggle={handleCaseInsertExportGuideToggle}
        onNavigationSurfaceChange={handleCaseInsertNavigationSurfaceChange}
        onActiveTemplatePaneChange={handleActiveCaseInsertTemplatePaneChange}
        onSelectedTextTargetChange={setSelectedCaseInsertTextTarget}
        onTextTargetValueChange={handleCaseInsertPreviewTextValueChange}
        onTextTargetEditComplete={handleCaseInsertPreviewTextEditComplete}
        previewTextControlHandlers={{
        onEnabledChange: handleCaseInsertPreviewTextEnabledChange,
        onStyleChange: handleCaseInsertPreviewTextStyleChange,
        onRichTextCommand: handleCaseInsertPreviewTextRichTextCommand,
        onRichTextKeyboardCommand:
          handleCaseInsertPreviewTextRichTextKeyboardCommand,
        getRichTextCommandState:
          getCaseInsertPreviewTextRichTextCommandState,
        onApplyStylePreset: handleCaseInsertPreviewTextApplyStylePreset,
        onApplyLayoutPreset: handleCaseInsertPreviewTextApplyLayoutPreset,
        onResetStyle: handleCaseInsertPreviewTextResetStyle,
        onResetLayout: handleCaseInsertPreviewTextResetLayout,
          onLayoutChange: handleCaseInsertPreviewTextLayoutChange,
          onAlignChange: handleCaseInsertPreviewTextAlignChange,
          onAvoidVisualElementsChange:
            handleCaseInsertPreviewTextAvoidVisualElementsChange,
          onContentModeChange: handleCaseInsertPreviewTextContentModeChange,
          onUseMetadataValue: handleCaseInsertPreviewTextUseMetadataValue,
        }}
        />
        </ApplicationWorkflowHostBoundary>
        <ProjectReplacementDialog
          onDecision={replacementPrompt.decide}
          open={replacementPrompt.open}
        />
      </>
    )
  }

  return (
    <>
      <EditorRoleFocusProvider>
      <ApplicationWorkflowHostBoundary
        controller={workflowNavigationRouter.controller}
        hostContentRef={workflowNavigationRouter.hostContentRef}
      >
      <main className="app-shell">
      <aside className="sidebar">
        <h1 id="disc-editor-heading" ref={discEditorHeadingRef} tabIndex={-1}>
          Steam Backup Label Studio
        </h1>
        <p className="muted">Alpha disc label editor</p>

        <ProjectPanel
          projectStatus={projectStatus}
          handleNewProject={handleNewProject}
          handleSaveProject={handleSaveProject}
          handleLoadProject={handleLoadProject}
          handleExportPng={handleExportPng}
          exportPngDisabled={exportPngDisabled}
          handleMainMenu={handleReturnToHome}
          handleNewCaseInsert={handleSwitchToCaseInsertFromDisc}
        />

        <WorkflowPresentationOutlet workflowId="workflow.export-options">
          <ExportOptionsPanel
            exportGuides={exportGuides}
            handleExportGuideToggle={handleExportGuideToggle}
          />
        </WorkflowPresentationOutlet>

        <WorkflowPresentationOutlet workflowId="workflow.disc-template">
          <TemplatePanel
            selectedDiscTemplateId={selectedDiscTemplateId}
            selectedDiscTemplate={selectedDiscTemplate}
            isCustomDiscTemplate={isCustomDiscTemplate}
            discTemplateOptions={discTemplateOptions}
            customDimensionFields={customDimensionFields}
            handleTemplateChange={handleTemplateChange}
            handleCustomDimensionChange={handleCustomDimensionChange}
          />
        </WorkflowPresentationOutlet>

        <WorkflowPresentationOutlet workflowId="workflow.game">
          <GamePanel {...gamePanelProps} />
        </WorkflowPresentationOutlet>

        <DiscSteamBrandingControls {...brandingPanelProps} />

        <WorkflowPresentationOutlet workflowId="workflow.disc-layout-presets">
          <DiscLayoutPresetsPanel
            guidedProgress={discGuidedPlaceholderPreview.progressItems}
            onApplyPreset={handleApplyDiscRolePreset}
            onIncludeGuidedSlot={discGuidedPlaceholderPreview.includeSlot}
            onShowGuidedSlotAgain={discGuidedPlaceholderPreview.showSlotAgain}
            onResetGuidedProgress={discGuidedPlaceholderPreview.resetProgress}
          />
        </WorkflowPresentationOutlet>

        {discRoleSectionItems.map((section) => (
          <DiscEditorNavigationRolePanel
            key={section.id}
            label={section.label}
            roleId={section.id}
            smokeId={section.smokeId}
          >
            {section.id === 'background-artwork' ? (
              <DiscBackgroundArtworkRoleControls
                artworkControls={artworkPanelProps}
              />
            ) : section.id === 'game-title' ? (
              <DiscGameTitleRoleControls
                artworkControls={artworkPanelProps}
                textControls={textPanelProps}
              />
            ) : section.id === 'game-info-logos' ? (
              <DiscGameInfoLogoRoleControls
                brandingControls={brandingPanelProps}
              />
            ) : section.id === 'company-logos' ? (
              <DiscCompanyLogosRoleControls
                brandingControls={brandingPanelProps}
              />
            ) : section.id === 'legal-info' ? (
              <DiscLegalInfoRoleControls textControls={textPanelProps} />
            ) : section.id === 'additional-artwork' ? (
              <DiscAdditionalArtworkRoleControls
                artworkControls={artworkPanelProps}
              />
            ) : section.id === 'additional-text' ? (
              <DiscAdditionalTextRoleControls textControls={textPanelProps} />
            ) : null}
          </DiscEditorNavigationRolePanel>
        ))}
      </aside>

      <DiscPreview
        discPreviewRef={discPreviewRef}
        selectedDiscTemplateId={selectedDiscTemplateId}
        statusToasts={statusToasts}
        background={{
          imageUrl: effectiveBackgroundImageUrl,
          imageSize: effectiveBackgroundImageSize,
          previewSize: backgroundPreviewSize,
          offset: backgroundOffset,
          scale: backgroundScale,
        }}
        steamBanner={{
          logoPlacement: steamLogoPlacement,
          colors: steamBannerColors,
          lockupImageUrl: steamBannerLockupImageUrl,
          lockupImageSize: steamBannerLockupImageSize,
          lockupLayout: steamBannerLockupLayout,
          useTextFallback: steamBannerUseTextFallback,
          fallbackText: steamBannerFallbackText,
        }}
        artwork={{
          logoAssets: projectLogoAssets,
          titleArtwork: projectTitleArtwork,
          additionalArtwork: projectAdditionalArtwork,
        }}
        metadata={projectMetadata}
        marks={{
          ratingBadge: projectRatingBadge,
          mediaMark: projectMediaMark,
          platformMarks: projectPlatformMarks,
          technicalMarks: projectTechnicalMarks,
        }}
        discText={{
          settings: discTextSettings,
          values: discTextValues,
          valueSources: discTextValueSources,
          htmlSources: discTextHtmlSources,
          styles: discTextStyles,
          manualGameTitle: resolvedDiscTextTitle,
          layout: discTextLayout,
          discNumberArtwork: projectDiscNumberArtwork,
          selectedDiscTemplate,
          selectedKey: selectedDiscTextKey,
          getPreviewTransform: getDiscTextPreviewTransform,
          onSelectedKeyChange: setSelectedDiscTextKey,
          onTextEnabledChange: handleDiscTextToggle,
          onTextValueChange: handleDiscTextInlineDraftChange,
          onTextContentModeChange: handleDiscTextContentModeChange,
          onUseMetadataTextValue: handleUseMetadataDiscTextValue,
          onTextEditComplete: finalizeDiscTextInlineDraft,
          onTextStyleChange: handleDiscTextStyleChange,
          onTextRichTextCommand: handleDiscTextRichTextCommand,
          onTextRichTextKeyboardCommand:
            handleDiscTextRichTextKeyboardCommand,
          getTextRichTextCommandState: getDiscTextRichTextCommandState,
          onApplyTextStylePreset: handleApplyDiscTextStylePreset,
          onResetTextStyle: handleResetDiscTextStyle,
          onTextLayoutChange: handleDiscTextLayoutChange,
          onTextAlignmentChange: handleDiscTextAlignmentChange,
          onTextArcSideChange: handleDiscTextArcSideChange,
          onTextVisualAvoidanceChange: handleDiscTextVisualAvoidanceChange,
          onResetTextLayout: handleResetDiscTextLayout,
        }}
        pointerHandlers={previewPointerHandlers}
        guideOverlay={guideOverlay}
        editorAffordances={{
          guidedPlaceholders: discGuidedPlaceholderPreview.placeholders,
          guidedWorkflow: discGuidedWorkflow,
          onOmitGuidedSlot: discGuidedPlaceholderPreview.omitSlot,
        }}
      />
      </main>
      </ApplicationWorkflowHostBoundary>
      </EditorRoleFocusProvider>
      <ProjectReplacementDialog
        onDecision={replacementPrompt.decide}
        open={replacementPrompt.open}
      />
    </>
  )
}

export default App
