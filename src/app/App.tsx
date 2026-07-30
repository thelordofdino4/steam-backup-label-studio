import { confirm, open, save } from '@tauri-apps/plugin-dialog'
import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import { unstable_batchedUpdates } from 'react-dom'
import type { JewelCaseGuideId } from '../templates/caseInsertTemplates'
import {
  normalizeCaseInsertNavigationSurfaceForPane,
  type CaseInsertTemplatePaneId,
} from '../caseInsert/templateSurfaces'
import type { DiscTemplate } from '../types/template'
import { clampProjectRatingBadgeToSafeZone } from '../layout/discElementSafeZone'
import '../styles/App.css'
import '../styles/layoutFix.css'
import { CaseInsertEditorShell } from '../components/caseInsert/CaseInsertEditorShell'
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
import { useDiscGuidedPlaceholderPreview } from '../hooks/useDiscGuidedPlaceholderPreview'
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
  applySupplementalUskRatingCandidate,
} from './appSupplementalUskRatingCandidate'
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
  getCaseInsertRatingBadgeForSteamImport,
} from '../caseInsert/steamImportBrandingDefaults'
import {
  createSteamCaseInsertTitleArtworkSeed,
} from '../caseInsert/titleArtwork'
import {
  applySteamImportDefaultsToCaseInsert,
} from '../caseInsert/steamImportDefaults'
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
import { readProjectFile, writeBinaryFile } from '../tauri/fileSystem'
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
  runCaseInsertPngExport,
  runDiscPngExport,
} from './appPngExport'
import {
  createCaseInsertPngExportInput,
  createDiscPngExportInput,
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
  runSteamDiscVisualDefaultImport,
  shouldApplySteamPlatformMarksEligibilityChange,
} from './appSteamDiscVisualImport'
import {
  createSavedProjectForWorkspace,
} from './appProjectSave'
import {
  stageAppProjectOpen,
} from './appProjectLoad'
import {
  createApplicationEditorAggregateApplier,
} from './appProjectRestore'
import {
  getProjectOpenCompatibilityFeedback,
} from './appProjectOpenFeedback'
import {
  useApplicationLifecycleRoot,
} from './useApplicationLifecycleRoot'
import {
  applyDiscRolePresetToOwners,
} from './appDiscRolePresetApplication'
import { createBlankDiscSavedProject } from '../project/blankDiscProject'
import {
  prepareNewProjectEditorApply,
} from './appProjectNewEditorApply'

type SteamMetadataApplyOptions = {
  announce?: boolean
  mode?: 'primary' | 'supplemental-usk'
  applyDiscVisualDefaults?: boolean
}

type SteamImportOptions = {
  applyDiscVisualDefaults?: boolean
  applyCaseInsertBackCoverDefaults?: boolean
}

function App() {
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
  const discPreviewRef = useRef<HTMLDivElement | null>(null)
  const caseInsertPreviewRef = useRef<HTMLDivElement | null>(null)
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
    customOuterDiameterMaxMm,
    isCustomDiscTemplate,
    guideOverlay,
    discExportPreviewFallbackSize,
    resetDiscTemplateState,
    restoreDiscTemplateState,
    handleTemplateChange,
    handleCustomDimensionChange,
  } = useDiscTemplate({
    announceStatus,
    clampForegroundElementLayoutsToTemplate,
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
    activeDiscPreset.recordTargetedPresetApplication(result.application)
    return isActiveDiscPresetBackgroundFitImpossible(result.application)
      ? null
      : result.background
  }
  const {
    backgroundImageUrl,
    backgroundImageSource,
    backgroundImageSize,
    backgroundScale,
    backgroundOffset,
    setBackgroundOffset,
    isBackgroundArtworkEnabled,
    selectedArtworkId,
    setSelectedArtworkId,
    isArtworkLoading,
    backgroundPreviewSize,
    backgroundOffsetSliderRanges,
    effectiveBackgroundImageUrl,
    effectiveBackgroundImageSize,
    applyBackgroundImageImport,
    resetBackgroundArtwork,
    clearSelectedArtwork,
    handleBackgroundUpload,
    handleResetBackground,
    handleUseSteamArtwork,
    handleBackgroundArtworkEnabledChange,
    handleBackgroundScaleChange,
    handleBackgroundOffsetChange,
    handleFitBackgroundToSteamBannerOpenArea,
    restoreBackgroundImageState,
  } = useBackgroundImage({
    discPreviewSize,
    steamLogoPlacement,
    announceStatus,
    applyActivePresetPlacement: applyActiveBackgroundPresetPlacement,
    onDiscGuidedSlotCompleted: completeActiveDiscGuidedSlot,
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
    resetDiscTextState,
    restoreDiscTextState,
    clampDiscTextLayoutToTemplate,
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
    clampProjectLogoAssetsToTemplate,
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
    clampProjectRatingBadgeToTemplate,
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
    clampProjectMediaMarkToTemplate,
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
    clampProjectPlatformMarksToTemplate,
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
    clampProjectTechnicalMarksToTemplate,
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
    clampProjectTitleArtworkToTemplate,
    resetProjectTitleArtwork,
    resetTitleArtworkLayoutForPlacement,
    handleTitleArtworkLayoutChange,
    handleResetTitleArtworkLayout,
    handleRestoreTitleArtworkDefault,
    handleTitleArtworkUpload,
    applySteamTitleArtworkImport,
  } = useTitleArtwork({
    selectedDiscTemplate,
    steamLogoPlacement,
    announceStatus,
    applyActivePresetPlacement: applyActiveTitleArtworkPresetPlacement,
    onDiscGuidedSlotCompleted: completeActiveDiscGuidedSlot,
  })
  const {
    projectAdditionalArtwork,
    setProjectAdditionalArtwork,
    clampProjectAdditionalArtworkToTemplate,
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
      setOffset: setBackgroundOffset,
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
  })

  function clampForegroundElementLayoutsToTemplate(template: DiscTemplate) {
    clampProjectLogoAssetsToTemplate(template)
    clampProjectTitleArtworkToTemplate(template)
    clampProjectAdditionalArtworkToTemplate(template)
    clampProjectRatingBadgeToTemplate(template)
    clampProjectMediaMarkToTemplate(template)
    clampProjectPlatformMarksToTemplate(template)
    clampProjectTechnicalMarksToTemplate(template)

    clampDiscTextLayoutToTemplate(template)
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
    const result = applyDiscRolePresetToOwners({
      presetId,
      currentState: {
        background: {
          enabled: isBackgroundArtworkEnabled,
          scale: backgroundScale,
          offset: backgroundOffset,
          imageDataUrl: backgroundImageUrl,
          imageSource: backgroundImageSource,
          imageSize: backgroundImageSize,
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
      },
      selectedDiscTemplate,
      actions: {
        restoreBackgroundImageState,
        setProjectTitleArtwork,
        clampProjectTitleArtworkToTemplate,
        restoreDiscTextState,
        setDiscTextLayout,
        clampDiscTextLayoutToTemplate,
        setProjectLogoAssets,
        clampProjectLogoAssetsToTemplate,
        setProjectRatingBadge,
        clampProjectRatingBadgeToTemplate,
        setProjectMediaMark,
        clampProjectMediaMarkToTemplate,
        setProjectPlatformMarks,
        clampProjectPlatformMarksToTemplate,
        setProjectTechnicalMarks,
        clampProjectTechnicalMarksToTemplate,
      },
    })

    if (!result.applied) {
      activeDiscPreset.recordPresetApplication(null, null, false)
      discGuidedPlaceholderPreview.recordPresetApplication(presetId, false)
      announceStatus('Layout preset is unavailable. Choose another preset.')
      return false
    }

    activeDiscPreset.recordPresetApplication(
      result.activePresetRef,
      result.activeResolvedPreset,
      true,
    )
    discGuidedPlaceholderPreview.recordPresetApplication(
      result.canonicalPresetId ?? result.preset.id,
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

    if (announcedFitIssue) {
      return true
    }

    announceStatus(`Applied ${result.preset.label} layout preset.`)
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
      const nextRatingBadge = applySupplementalUskRatingCandidate({
        ratingBadge: projectRatingBadge,
        metadata: projectMetadata,
        supplementalRatingValue: candidate.ratingValue,
        selectedDiscTemplate,
        applyActivePrimaryRatingPlacement: (ratingBadge) =>
          applyActiveRatingBadgePresetPlacement(
            ratingBadge,
            projectMetadata,
          ),
      })
      setProjectRatingBadge(nextRatingBadge)

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
    const result = await findSteamMetadataCandidates()

    if (result) {
      autoApplySteamMetadataCandidates(result, options)
    }
  }

  function handleApplyRatingCandidate(
    candidate: RatingBoardCandidate,
    options?: { mode?: 'primary' | 'supplemental-usk' },
  ) {
    applyRatingCandidateToProject(candidate, options)
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
    resetBackgroundArtwork()
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

  async function dispatchNewProject(
    commandId: 'project.new-disc' | 'project.new-case',
  ) {
    const result = await applicationLifecycleRoot.dispatch(commandId)
    if (result.disposition === 'not-executed') {
      announceStatus(
        result.userMessage ??
          (result.reason === 'busy'
            ? 'A project operation is already in progress.'
            : 'New Project is currently unavailable.'),
      )
      return
    }
    if (result.result.feedback) {
      announceStatus(result.result.feedback.message)
    }
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
    const shouldReturn = await confirm(
      'Return to the main menu? Unsaved changes will remain in memory for now, but new actions may replace them.',
      {
        title: 'Return to main menu?',
        kind: 'warning',
      },
    )

    if (!shouldReturn) {
      return
    }

    cancelPreviewPointerDrag()
    cancelCaseInsertPreviewPointerDrag()
    activeDiscPreset.clearActivePreset()
    setActiveWorkspace('home')
    setHomeStatusMessage(null)
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
    clearLocalSteamScreenshotResults()

    await runSteamImport(appId, async (importedState) => {
      const metadataCandidateResult = loadImportedSteamMetadataCandidates(
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
      const discVisualImport = applyDiscVisualDefaults
        ? await runSteamDiscVisualDefaultImport({
            importedGame: importedState.importedGame,
            nextProjectMetadata,
            shouldUpdateCopyrightDiscTextSource,
            projectPlatformMarks,
            selectedDiscTemplate,
            selectedSteamGame,
            applySteamImportedDiscTextValues,
            applySteamTitleArtworkImport,
          })
        : null
      const caseInsertTitleArtworkSeed = options.applyCaseInsertBackCoverDefaults
        ? await createSteamCaseInsertTitleArtworkSeed(importedState.importedGame)
        : null
      const caseInsertRatingBadgeForImport =
        options.applyCaseInsertBackCoverDefaults
          ? getCaseInsertRatingBadgeForSteamImport({
              projectMetadata: nextProjectMetadata,
              projectRatingBadge,
              ratingCandidate: autoRatingCandidate,
            })
          : projectRatingBadge
      const caseInsertBackCoverCopyFit = options.applyCaseInsertBackCoverDefaults
        ? createFittedSteamBackCoverCopy(importedState.importedGame, {
            legalText: nextProjectMetadata.copyrightText,
          })
        : null

      setSelectedSteamGame(importedState.importedGame)
      clearSteamSearchResults()
      setManualGameTitle(importedState.manualGameTitle)
      setProjectMetadata(nextProjectMetadata)
      if (options.applyCaseInsertBackCoverDefaults) {
        setProjectRatingBadge(caseInsertRatingBadgeForImport)
      }

      announceStatus(importedState.statusMessage)

      if (options.applyCaseInsertBackCoverDefaults) {
        setProjectJewelCase((currentCaseInsert) => {
          return applySteamImportDefaultsToCaseInsert({
            caseInsert: currentCaseInsert,
            importedGame: importedState.importedGame,
            legalText: nextProjectMetadata.copyrightText,
            replaceExisting: isDifferentSelectedSteamGame,
            titleArtworkSeed: caseInsertTitleArtworkSeed,
            ratingCandidate: autoRatingCandidate,
            brandingSources: {
              projectMetadata: nextProjectMetadata,
              projectLogoAssets,
              projectRatingBadge: caseInsertRatingBadgeForImport,
              projectMediaMark,
              projectPlatformMarks,
              projectTechnicalMarks,
            },
          })
        })
        announceStatus('Updated available Tray Card back-cover fields from Steam metadata.')
        caseInsertBackCoverCopyFit?.warnings.forEach((warning) => {
          announceStatus(warning)
        })
        if (caseInsertTitleArtworkSeed) {
          announceStatus(caseInsertTitleArtworkSeed.statusMessage)
        }
      }

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
    })
  }

  const captureCurrentSavedProject = useCallback(
    () => createSavedProjectForWorkspace({
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
        discTextHtmlSources,
        discTextLayout,
        discTextStyles,
      },
    }),
    [
      activeCaseInsertTemplatePane,
      activeWorkspace,
      backgroundImageSize,
      backgroundImageSource,
      backgroundImageUrl,
      backgroundOffset,
      backgroundScale,
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
      isBackgroundArtworkEnabled,
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
    const result = await applicationLifecycleRoot.dispatch('project.save')
    if (result.disposition === 'not-executed') {
      if (result.userMessage) announceStatus(result.userMessage)
      return
    }
    const feedback = result.result.feedback
    if (feedback) announceStatus(feedback.message)
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
          restoreBackgroundImageState,
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
  })

  useLayoutEffect(() => {
    if (activeWorkspace === 'home') return
    const session = applicationLifecycleRoot.getLifecycleState().activeSession
    if (!session || session.kind !== activeWorkspace) return

    applicationLifecycleRoot.synchronizeCurrentProject({
      sessionId: session.id,
      kind: activeWorkspace,
      project: captureCurrentSavedProject(),
    })
  }, [
    activeWorkspace,
    applicationLifecycleRoot,
    captureCurrentSavedProject,
  ])

  async function handleLoadProject() {
    const result = await applicationLifecycleRoot.dispatch('project.open')
    const feedbackMessage = getProjectOpenCompatibilityFeedback(result)
    if (feedbackMessage) announceStatus(feedbackMessage)
  }

  async function handleExportPng() {
    if (activeWorkspace === 'caseInsert') {
      await runCaseInsertPngExport({
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
        writeBinaryFileCommand: writeBinaryFile,
        buildPreflightSummary: buildCaseInsertExportPreflightSummary,
        exportPngBytes: exportCaseInsertPngBytes,
        announceStatus,
      })
      return
    }

    await runDiscPngExport({
      ...createDiscPngExportInput({
        selectedDiscTemplateId,
        selectedDiscTemplate,
        backgroundImageUrl: effectiveBackgroundImageUrl,
        backgroundImageSize: effectiveBackgroundImageSize,
        selectedSteamGame,
        manualGameTitle,
        steamLogoPlacement,
        steamBannerUseTextFallback,
        steamBannerFallbackText,
        steamBannerLockupImageUrl,
        discTextSettings,
        projectLogoAssets,
        projectTitleArtwork,
        projectMetadata,
        projectRatingBadge,
        projectMediaMark,
        projectPlatformMarks,
        projectTechnicalMarks,
        exportGuides,
        resolvedDiscTextTitle,
        backgroundScale,
        backgroundOffset,
        steamBannerColors,
        steamBannerLockupImageSize,
        steamBannerLockupLayout,
        projectDiscNumberArtwork,
        projectAdditionalArtwork,
        discTextValues,
        discTextValueSources,
        discTextHtmlSources,
        discTextStyles,
        discTextLayout,
      }),
      getPreviewSize: () =>
        discPreviewRef.current?.getBoundingClientRect().width ??
        discExportPreviewFallbackSize,
      saveDialog: save,
      confirmDialog: confirm,
      writeBinaryFileCommand: writeBinaryFile,
      buildPreflightSummary: buildExportPreflightSummary,
      exportPngBytes: exportDiscLabelPngBytes,
      announceStatus,
    })
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
      caseInsertBrandingMarkSync.scheduleCaseInsertBrandingMarkSlotSync()
    },
    handleFindMetadataCandidates: async () => {
      await handleFindAndApplySteamMetadataCandidates({
        applyDiscVisualDefaults: false,
      })
      caseInsertBrandingMarkSync.scheduleCaseInsertBrandingMarkSlotSync()
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
    isBackgroundArtworkEnabled,
    handleBackgroundArtworkEnabledChange,
    backgroundScale,
    backgroundOffset,
    backgroundOffsetSliderRanges,
    handleBackgroundScaleChange,
    handleBackgroundOffsetChange,
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
    handleSupplementalUskRatingBadgeValueChange,
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

  if (activeWorkspace === 'home') {
    return (
      <>
        <HomeScreen
          onLoadProject={handleLoadProject}
          onNewDisc={handleStartNewDiscProject}
          onNewCaseInsert={handleOpenCaseInsertEditor}
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
        <CaseInsertEditorShell
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
        projectStatus={projectStatus}
        statusToasts={statusToasts}
        onMainMenu={handleReturnToHome}
        onNewCaseInsert={handleOpenCaseInsertEditor}
        onNewDisc={handleStartNewDiscProject}
        onSaveProject={handleSaveProject}
        onLoadProject={handleLoadProject}
        onExportPng={handleExportPng}
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
      <main className="app-shell">
      <aside className="sidebar">
        <h1>Steam Backup Label Studio</h1>
        <p className="muted">Alpha disc label editor</p>

        <ProjectPanel
          projectStatus={projectStatus}
          handleNewProject={handleNewProject}
          handleSaveProject={handleSaveProject}
          handleLoadProject={handleLoadProject}
          handleExportPng={handleExportPng}
          handleMainMenu={handleReturnToHome}
          handleNewCaseInsert={handleSwitchToCaseInsertFromDisc}
        />

        <ExportOptionsPanel
          exportGuides={exportGuides}
          handleExportGuideToggle={handleExportGuideToggle}
        />

        <TemplatePanel
          selectedDiscTemplateId={selectedDiscTemplateId}
          selectedDiscTemplate={selectedDiscTemplate}
          isCustomDiscTemplate={isCustomDiscTemplate}
          customDiscTemplate={customDiscTemplate}
          discTemplateOptions={discTemplateOptions}
          customOuterDiameterMaxMm={customOuterDiameterMaxMm}
          handleTemplateChange={handleTemplateChange}
          handleCustomDimensionChange={handleCustomDimensionChange}
        />

        <GamePanel {...gamePanelProps} />

        <DiscSteamBrandingControls {...brandingPanelProps} />

        <DiscLayoutPresetsPanel
          guidedProgress={discGuidedPlaceholderPreview.progressItems}
          onApplyPreset={handleApplyDiscRolePreset}
          onIncludeGuidedSlot={discGuidedPlaceholderPreview.includeSlot}
          onShowGuidedSlotAgain={discGuidedPlaceholderPreview.showSlotAgain}
          onResetGuidedProgress={discGuidedPlaceholderPreview.resetProgress}
        />

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
      </EditorRoleFocusProvider>
      <ProjectReplacementDialog
        onDecision={replacementPrompt.decide}
        open={replacementPrompt.open}
      />
    </>
  )
}

export default App
