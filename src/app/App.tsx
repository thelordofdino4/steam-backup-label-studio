import { confirm, open, save } from '@tauri-apps/plugin-dialog'
import { useEffect, useRef, useState } from 'react'
import {
  searchSteamStore,
  type SteamArtworkAsset,
  type SteamImportedGame,
  type SteamSearchResult,
} from '../steam/steamApi'
import {
  openLocalFolder,
  type LocalSteamScreenshotAsset,
} from '../local/localArtwork'
import { createLocalSteamScreenshotDiscovery } from '../local/localSteamScreenshotDiscovery'
import { loadMissingLocalSteamScreenshotThumbnails } from '../local/localSteamScreenshotThumbnails'
import {
  applySteamGameImportToProjectMetadata,
  createSteamGameImport,
} from '../steam/steamGameImport'
import { applySteamPlatformMarksImport } from '../steam/steamPlatformMarks'
import { discTemplates, discTemplateOptions } from '../templates/discTemplates'
import type { DiscTemplate } from '../types/template'
import {
  CUSTOM_OUTER_DIAMETER_MAX_MM,
  EXPORT_DPI,
  buildCustomDiscTemplate,
  getGuideInsetPercent,
  mmToPixels,
  normalizeCustomDiscTemplate,
} from '../disc/geometry'
import { clampProjectRatingBadgeToSafeZone } from '../layout/discElementSafeZone'
import { validateDiscTemplateGeometryGuardrail } from '../layout/discTemplateGeometryGuardrail'
import { DEFAULT_EXPORT_GUIDES, setExportGuideSelection, type ExportGuideKey, type ExportGuideSelection } from '../export/exportGuides'
import '../styles/App.css'
import '../styles/layoutFix.css'
import { CaseInsertEditorShell } from '../components/caseInsert/CaseInsertEditorShell'
import { HomeScreen } from '../components/home/HomeScreen'
import type { EditorWorkspace } from '../editor/editorTypes'
import { DiscPreview } from '../components/preview/DiscPreview'
import { ArtworkPanel } from '../components/sidebar/ArtworkPanel'
import { BrandingPanel } from '../components/sidebar/BrandingPanel'
import { ExportOptionsPanel } from '../components/sidebar/ExportOptionsPanel'
import { GamePanel } from '../components/sidebar/GamePanel'
import { GuideLegendPanel } from '../components/sidebar/GuideLegendPanel'
import { ProjectPanel } from '../components/sidebar/ProjectPanel'
import { TemplatePanel } from '../components/sidebar/TemplatePanel'
import { TextPanel } from '../components/sidebar/TextPanel'
import { useAdditionalArtwork } from '../hooks/useAdditionalArtwork'
import { useDiscTextState } from '../hooks/useDiscTextState'
import { useLogoAssetDiscovery } from '../hooks/useLogoAssetDiscovery'
import { useBackgroundArtwork } from '../hooks/useBackgroundArtwork'
import { useJewelCaseFrontEditor } from '../hooks/useJewelCaseFrontEditor'
import { useMediaMarkState } from '../hooks/useMediaMarkState'
import { usePlatformMarksState } from '../hooks/usePlatformMarksState'
import { useProjectLogoAssets } from '../hooks/useProjectLogoAssets'
import { useRatingBadgeState } from '../hooks/useRatingBadgeState'
import { useStatusToasts } from '../hooks/useStatusToasts'
import { useSteamMetadataAssistance } from '../hooks/useSteamMetadataAssistance'
import { useSteamBannerState } from '../hooks/useSteamBannerState'
import { useTechnicalMarks } from '../hooks/useTechnicalMarks'
import { useTitleArtwork } from '../hooks/useTitleArtwork'
import { useWebArtworkDiscovery } from '../hooks/useWebArtworkDiscovery'
import {
  createLocalSteamScreenshotBackgroundImport,
  createSteamArtworkBackgroundImport,
} from '../image/backgroundImageImport'
import { createProjectSnapshot } from '../project/createProjectSnapshot'
import { resolveSavedProjectRouteFromContents } from '../project/projectRouting'
import { restoreProjectStateFromContents } from '../project/restoreProjectState'
import { createDefaultProjectMetadata } from '../project/projectMetadata'
import {
  DEFAULT_CASE_INSERT_PROJECT_TITLE,
  createCaseInsertProjectSnapshot,
  createDefaultProjectJewelCaseState,
  restoreCaseInsertProjectStateFromContents,
} from '../project/projectCaseInsert'
import {
  updateRatingBadgeEnabledState,
  updateSupplementalUskRatingBadgeEnabledState,
  updateSupplementalUskRatingBadgeValue,
} from '../project/projectRatingBadge'
import type { ProjectMetadata, SelectedDiscTemplateId } from '../project/projectTypes'
import { readProjectFile, writeBinaryFile, writeProjectFile } from '../tauri/fileSystem'
import {
  type LegalTextCandidate,
  type RatingBoardCandidate,
  type SteamMetadataCandidateDiscoveryResult,
} from '../steam/steamMetadataCandidates'
import {
  getAutoApplyLegalCandidateForMetadata,
  getAutoApplyRatingCandidateForMetadata,
} from '../steam/steamMetadataAutoApply'
import { loadImage } from '../export/canvasImage'
import { exportDiscLabelPngBytes } from '../export/exportPng'
import { buildExportPreflightSummary } from '../export/exportPreflight'
import { getNaturalImageSize } from '../utils/imageFile'
import {
  DEFAULT_STEAM_BANNER_LOCKUP_IMAGE_URL,
} from '../branding/steamBanner'
import { useDiscPreviewPointerDrag } from '../interaction/useDiscPreviewPointerDrag'
import { getDiscTextPreviewTransform, type SteamLogoPlacement } from '../discText/index'

type CustomDimensionKey =
  | 'outerDiameterMm'
  | 'physicalCenterHoleDiameterMm'
  | 'innerHoleDiameterMm'
  | 'printableDiameterMm'
  | 'safeDiameterMm'

function App() {
  const [activeWorkspace, setActiveWorkspace] = useState<EditorWorkspace>('home')
  const [homeStatusMessage, setHomeStatusMessage] = useState<string | null>(null)
  const [selectedDiscTemplateId, setSelectedDiscTemplateId] =
    useState<SelectedDiscTemplateId>('standardPrintableDisc')
  const [customDiscTemplate, setCustomDiscTemplate] = useState<DiscTemplate>(() =>
    buildCustomDiscTemplate(discTemplates.standardPrintableDisc),
  )
  const [steamLogoPlacement, setSteamLogoPlacement] =
    useState<SteamLogoPlacement>('top')
  const [exportGuides, setExportGuides] = useState<ExportGuideSelection>(
    DEFAULT_EXPORT_GUIDES,
  )
  const [discPreviewSize, setDiscPreviewSize] = useState(640)
  const { projectStatus, statusToasts, announceStatus } = useStatusToasts()
  const [gameSearchQuery, setGameSearchQuery] = useState('')
  const [manualGameTitle, setManualGameTitle] = useState('Untitled Steam Backup Label')
  const [projectJewelCase, setProjectJewelCase] = useState(() =>
    createDefaultProjectJewelCaseState(DEFAULT_CASE_INSERT_PROJECT_TITLE),
  )
  const jewelCaseFrontEditor = useJewelCaseFrontEditor({
    setProjectJewelCase,
    announceStatus,
  })
  const [projectMetadata, setProjectMetadata] = useState<ProjectMetadata>(() =>
    createDefaultProjectMetadata(),
  )
  const [steamSearchResults, setSteamSearchResults] = useState<SteamSearchResult[]>([])
  const [selectedSteamGame, setSelectedSteamGame] = useState<SteamImportedGame | null>(null)
  const [isSteamSearchLoading, setIsSteamSearchLoading] = useState(false)
  const [isSteamImportLoading, setIsSteamImportLoading] = useState(false)
  const [selectedArtworkId, setSelectedArtworkId] = useState<string | null>(null)
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
  const {
    backgroundImageUrl,
    setBackgroundImageUrl,
    backgroundImageSource,
    setBackgroundImageSource,
    backgroundImageSize,
    setBackgroundImageSize,
    backgroundScale,
    setBackgroundScale,
    backgroundOffset,
    setBackgroundOffset,
    isBackgroundArtworkEnabled,
    setIsBackgroundArtworkEnabled,
    backgroundPreviewSize,
    backgroundOffsetSliderRanges,
    effectiveBackgroundImageUrl,
    effectiveBackgroundImageSize,
    applyBackgroundImageImport,
    resetBackgroundArtwork,
    handleBackgroundUpload,
    handleResetBackground,
    handleBackgroundArtworkEnabledChange,
    handleBackgroundScaleChange,
    handleBackgroundOffsetChange,
    handleFitBackgroundToSteamBannerOpenArea,
  } = useBackgroundArtwork({
    discPreviewSize,
    steamLogoPlacement,
    setSelectedArtworkId,
    announceStatus,
  })
  const [localSteamScreenshots, setLocalSteamScreenshots] = useState<
    LocalSteamScreenshotAsset[]
  >([])
  const [localSteamScreenshotThumbnails, setLocalSteamScreenshotThumbnails] = useState<
    Record<string, string>
  >({})
  const [hasCheckedLocalSteamScreenshots, setHasCheckedLocalSteamScreenshots] =
    useState(false)
  const [isLocalSteamScreenshotsLoading, setIsLocalSteamScreenshotsLoading] =
    useState(false)
  const [isArtworkLoading, setIsArtworkLoading] = useState(false)

  const discPreviewRef = useRef<HTMLDivElement | null>(null)
  const selectedDiscTemplate =
    selectedDiscTemplateId === 'custom'
      ? customDiscTemplate
      : discTemplates[selectedDiscTemplateId]
  const isCustomDiscTemplate = selectedDiscTemplateId === 'custom'
  const {
    projectDiscNumberArtwork,
    discTextSettings,
    discTextValues,
    discTextValueSources,
    discTextTitleValue,
    discTextLayout,
    discTextStyles,
    metadataBoundDiscTextValues,
    resolvedDiscTextTitle,
    setDiscTextLayout,
    resetDiscTextState,
    restoreDiscTextState,
    clampDiscTextLayoutToTemplate,
    repositionDiscTextForSteamLogoPlacement,
    clampDiscTextLayoutForContent,
    clampMetadataBoundDiscTextLayoutsForProjectMetadataFields,
    handleDiscTextToggle,
    handleDiscTextContentChange,
    handleUseMetadataDiscTextValue,
    handleDiscTextLayoutChange,
    handleDiscTextAlignmentChange,
    handleDiscTextModeChange,
    handleDiscTextArcSideChange,
    handleDiscTextVisualAvoidanceChange,
    handleResetDiscTextLayout,
    handleDiscTextStyleChange,
    handleResetDiscTextStyle,
    handleApplyDiscTextStylePreset,
    handleDiscNumberArtworkModeChange,
    handleDiscNumberArtworkBadgeSetChange,
    enableCurvedCopyrightDiscText,
    setCopyrightDiscTextEnabled,
    applySteamImportedDiscTextValues,
  } = useDiscTextState({
    projectMetadata,
    selectedDiscTemplate,
    steamLogoPlacement,
  })
  const {
    projectLogoAssets,
    setProjectLogoAssets,
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
    announceStatus,
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
  } = usePlatformMarksState({
    selectedDiscTemplate,
    selectedSteamGame,
    announceStatus,
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
    announceStatus,
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
  useEffect(() => {
    if (activeWorkspace !== 'disc') {
      return
    }

    const previewElement = discPreviewRef.current

    if (!previewElement) {
      return
    }

    const updatePreviewSize = () => {
      const nextSize = previewElement.getBoundingClientRect().width

      if (Number.isFinite(nextSize) && nextSize > 0) {
        setDiscPreviewSize(nextSize)
      }
    }

    updatePreviewSize()

    if (typeof ResizeObserver === 'undefined') {
      return
    }

    const resizeObserver = new ResizeObserver(updatePreviewSize)
    resizeObserver.observe(previewElement)

    return () => resizeObserver.disconnect()
  }, [activeWorkspace])

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

  const printableInsetPercent = getGuideInsetPercent(
    selectedDiscTemplate.outerDiameterMm,
    selectedDiscTemplate.printableDiameterMm,
  )
  const safeInsetPercent = getGuideInsetPercent(
    selectedDiscTemplate.outerDiameterMm,
    selectedDiscTemplate.safeDiameterMm,
  )
  const physicalCenterHolePercent =
    (selectedDiscTemplate.physicalCenterHoleDiameterMm / selectedDiscTemplate.outerDiameterMm) * 100
  const innerPrintableBoundaryPercent =
    (selectedDiscTemplate.innerHoleDiameterMm / selectedDiscTemplate.outerDiameterMm) * 100

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

  useEffect(() => {
    let isCancelled = false

    async function loadLocalSteamScreenshotThumbnails() {
      const loadedThumbnails = await loadMissingLocalSteamScreenshotThumbnails(
        localSteamScreenshots,
        localSteamScreenshotThumbnails,
      )

      if (isCancelled) {
        return
      }

      if (Object.keys(loadedThumbnails).length === 0) {
        return
      }

      setLocalSteamScreenshotThumbnails((currentThumbnails) => ({
        ...currentThumbnails,
        ...loadedThumbnails,
      }))
    }

    void loadLocalSteamScreenshotThumbnails()

    return () => {
      isCancelled = true
    }
  }, [localSteamScreenshots, localSteamScreenshotThumbnails])

  function handleRatingBadgeEnabledChange(enabled: boolean) {
    const nextState = updateRatingBadgeEnabledState(
      projectMetadata,
      projectRatingBadge,
      enabled,
    )

    setProjectMetadata(nextState.metadata)
    setProjectRatingBadge(
      clampProjectRatingBadgeToSafeZone(nextState.ratingBadge, selectedDiscTemplate),
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

  function handleExportGuideToggle(guide: ExportGuideKey, checked: boolean) {
    setExportGuides((currentGuides) =>
      setExportGuideSelection(currentGuides, guide, checked),
    )
  }

  function handleProjectMetadataFieldsChange(fields: Partial<ProjectMetadata>) {
    const nextProjectMetadata = {
      ...projectMetadata,
      ...fields,
    }
    const affectedMetadataFields = Object.keys(fields) as Array<keyof ProjectMetadata>

    setProjectMetadata(nextProjectMetadata)

    if (typeof fields.title === 'string') {
      setManualGameTitle(fields.title)
    }

    clampMetadataBoundDiscTextLayoutsForProjectMetadataFields(
      affectedMetadataFields,
      nextProjectMetadata,
    )
  }

  function handleProjectMetadataChange(field: keyof ProjectMetadata, value: string) {
    handleProjectMetadataFieldsChange({ [field]: value } as Partial<ProjectMetadata>)
  }

  function applyRatingCandidateToProject(
    candidate: RatingBoardCandidate,
    options: { announce?: boolean; mode?: 'primary' | 'supplemental-usk' } = {},
  ) {
    if (!candidate.canApply) {
      announceStatus('That rating candidate is informational only.')
      return
    }

    const shouldApplyAsSupplementalUsk =
      options.mode !== 'primary' &&
      candidate.applyKind === 'rating' &&
      candidate.ratingSystem === 'USK' &&
      projectMetadata.ratingSystem === 'PEGI'

    if (shouldApplyAsSupplementalUsk) {
      setProjectRatingBadge((currentBadge) => {
        const enabledBadge = {
          ...currentBadge,
          layout: {
            ...currentBadge.layout,
            enabled: true,
          },
        }
        const nextBadge = updateSupplementalUskRatingBadgeEnabledState(
          updateSupplementalUskRatingBadgeValue(enabledBadge, candidate.ratingValue),
          true,
        )

        return clampProjectRatingBadgeToSafeZone(nextBadge, selectedDiscTemplate)
      })

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
    setRatingBadgeEnabledForAppliedCandidate(candidate)

    if (options.announce ?? true) announceStatus(
      candidate.applyKind === 'none'
        ? `Using no rating badge value from ${candidate.boardLabel} candidate.`
        : `Applied ${candidate.boardLabel} ${candidate.displayRating} to rating metadata.`,
    )
  }

  function applyLegalCandidateToProject(
    candidate: LegalTextCandidate,
    options: { announce?: boolean } = {},
  ) {
    handleProjectMetadataFieldsChange({
      copyrightText: candidate.text,
    })
    enableCurvedCopyrightDiscText()

    if (options.announce ?? true) {
      announceStatus('Applied suggested legal text and enabled curved copyright text.')
    }
  }

  function announceAutoAppliedMetadataCandidates(
    ratingCandidate: RatingBoardCandidate | null,
    legalCandidate: LegalTextCandidate | null,
  ) {
    const appliedLabels: string[] = []

    if (ratingCandidate) {
      appliedLabels.push(`${ratingCandidate.boardLabel} ${ratingCandidate.displayRating} rating badge`)
    }

    if (legalCandidate) {
      appliedLabels.push('curved copyright/legal text')
    }

    if (appliedLabels.length > 0) {
      announceStatus(`Auto-applied ${appliedLabels.join(' and ')}.`)
    }
  }

  function autoApplySteamMetadataCandidates(
    result: SteamMetadataCandidateDiscoveryResult,
  ) {
    const ratingCandidate = getAutoApplyRatingCandidateForMetadata(
      result,
      projectMetadata,
      false,
    )
    const legalCandidate = getAutoApplyLegalCandidateForMetadata(
      result,
      projectMetadata,
      false,
    )
    const metadataFields: Partial<ProjectMetadata> = {
      ...(ratingCandidate
        ? {
            ratingSystem: ratingCandidate.ratingSystem,
            ratingValue: ratingCandidate.ratingValue,
          }
        : {}),
      ...(legalCandidate
        ? {
            copyrightText: legalCandidate.text,
          }
        : {}),
    }

    if (Object.keys(metadataFields).length > 0) {
      handleProjectMetadataFieldsChange(metadataFields)
    }

    if (ratingCandidate) setRatingBadgeEnabledForAppliedCandidate(ratingCandidate)
    if (legalCandidate) enableCurvedCopyrightDiscText()

    announceAutoAppliedMetadataCandidates(ratingCandidate, legalCandidate)
  }

  async function handleFindAndApplySteamMetadataCandidates() {
    const result = await findSteamMetadataCandidates()

    if (result) {
      autoApplySteamMetadataCandidates(result)
    }
  }

  function handleApplyRatingCandidate(
    candidate: RatingBoardCandidate,
    options?: { mode?: 'primary' | 'supplemental-usk' },
  ) {
    applyRatingCandidateToProject(candidate, options)
  }

  function handleApplyLegalCandidate(candidate: LegalTextCandidate) {
    applyLegalCandidateToProject(candidate)
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

  function resetDiscProjectState() {
    cancelPreviewPointerDrag()

    setSelectedDiscTemplateId('standardPrintableDisc')
    setCustomDiscTemplate(buildCustomDiscTemplate(discTemplates.standardPrintableDisc))
    setSteamLogoPlacement('top')
    resetSteamBannerState()
    setExportGuides(DEFAULT_EXPORT_GUIDES)
    resetBackgroundArtwork()
    setGameSearchQuery('')
    setManualGameTitle('Untitled Steam Backup Label')
    setProjectMetadata(createDefaultProjectMetadata())
    resetProjectLogoAssets(discTemplates.standardPrintableDisc)
    resetProjectTitleArtwork(discTemplates.standardPrintableDisc, 'top')
    resetProjectAdditionalArtwork()
    resetProjectRatingBadge(discTemplates.standardPrintableDisc)
    resetProjectMediaMark(discTemplates.standardPrintableDisc)
    resetProjectPlatformMarks()
    resetProjectTechnicalMarks()
    resetDiscTextState(discTemplates.standardPrintableDisc, 'top')
    setSteamSearchResults([])
    setSelectedSteamGame(null)
    setIsSteamSearchLoading(false)
    setIsSteamImportLoading(false)
    setSelectedArtworkId(null)
    setLocalSteamScreenshots([])
    setHasCheckedLocalSteamScreenshots(false)
    setIsLocalSteamScreenshotsLoading(false)
    setIsArtworkLoading(false)
  }

  function resetCaseInsertProjectState() {
    setManualGameTitle(DEFAULT_CASE_INSERT_PROJECT_TITLE)
    setProjectMetadata({
      ...createDefaultProjectMetadata(),
      title: DEFAULT_CASE_INSERT_PROJECT_TITLE,
    })
    setSelectedSteamGame(null)
    setProjectJewelCase(
      createDefaultProjectJewelCaseState(DEFAULT_CASE_INSERT_PROJECT_TITLE),
    )
  }

  async function handleNewProject() {
    const shouldReset = await confirm(
      'Start a new project? Unsaved changes will be lost.',
      {
        title: 'Start a new project?',
        kind: 'warning',
      },
    )

    if (!shouldReset) {
      return
    }

    resetDiscProjectState()
    setActiveWorkspace('disc')
    setHomeStatusMessage(null)
    announceStatus('Started a new blank project.')
  }

  function handleStartNewDiscProject() {
    resetDiscProjectState()
    setActiveWorkspace('disc')
    setHomeStatusMessage(null)
    announceStatus('Started a new blank disc project.')
  }

  function handleOpenCaseInsertEditor() {
    resetCaseInsertProjectState()
    setActiveWorkspace('caseInsert')
    setHomeStatusMessage(null)
    announceStatus('Started a new blank case insert project.')
  }

  function handleWizardPlaceholder() {
    setHomeStatusMessage('Guided setup is planned for a future pass.')
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
    setActiveWorkspace('home')
    setHomeStatusMessage(null)
  }

  async function handleSwitchToCaseInsertFromDisc() {
    const shouldSwitch = await confirm(
      'Switch to the Case Insert Editor? Unsaved disc changes will remain in memory for now, but case editor work is still in progress.',
      {
        title: 'Switch editor?',
        kind: 'warning',
      },
    )

    if (!shouldSwitch) {
      return
    }

    handleOpenCaseInsertEditor()
  }

  function handleTemplateChange(templateId: SelectedDiscTemplateId) {
    setSelectedDiscTemplateId(templateId)

    if (templateId === 'custom') {
      clampForegroundElementLayoutsToTemplate(customDiscTemplate)
      announceStatus('Custom disc dimensions enabled. Edit the numeric fields below.')
      return
    }

    clampForegroundElementLayoutsToTemplate(discTemplates[templateId])
    announceStatus(`Selected ${discTemplates[templateId].name}.`)
  }

  function handleCustomDimensionChange(field: CustomDimensionKey, value: string) {
    const numericValue = Number(value)

    if (!Number.isFinite(numericValue) || numericValue <= 0) {
      return
    }

    const nextTemplate = normalizeCustomDiscTemplate({
      ...customDiscTemplate,
      [field]: numericValue,
    })
    const geometryGuardrail = validateDiscTemplateGeometryGuardrail(
      nextTemplate,
      {
        discTextSettings,
        discTextValues: metadataBoundDiscTextValues,
        discTextTitle: resolvedDiscTextTitle,
        discTextLayout,
        projectLogoAssets,
        projectMetadata,
        projectRatingBadge,
        projectMediaMark,
        projectPlatformMarks,
      },
    )

    if (!geometryGuardrail.allowed) {
      const [firstBlockingElement] = geometryGuardrail.blockingElementLabels
      const extraCount = geometryGuardrail.blockingElementLabels.length - 1

      announceStatus(
        `Custom geometry needs more printable space for ${firstBlockingElement}${extraCount > 0 ? ` and ${extraCount} more` : ''}.`,
      )
      return
    }

    setCustomDiscTemplate(nextTemplate)

    if (selectedDiscTemplateId === 'custom') {
      clampForegroundElementLayoutsToTemplate(nextTemplate)
    }
  }

  async function handleSteamSearch() {
    const trimmedQuery = gameSearchQuery.trim()

    if (!trimmedQuery) {
      announceStatus('Enter a Steam game title or App ID to search.')
      return
    }

    setIsSteamSearchLoading(true)
    announceStatus(`Searching Steam for "${trimmedQuery}"...`)

    try {
      const results = await searchSteamStore(trimmedQuery)
      setSteamSearchResults(results)
      announceStatus(
        results.length > 0
          ? `Found ${results.length} Steam result${results.length === 1 ? '' : 's'}.`
          : 'Steam returned no results. Manual title entry is still available.',
      )
    } catch (error) {
      announceStatus(`Steam search failed: ${String(error)}`)
    } finally {
      setIsSteamSearchLoading(false)
    }
  }

  async function handleSteamImport(appId: number) {
    setIsSteamImportLoading(true)
    setSelectedArtworkId(null)
    setLocalSteamScreenshots([])
    setLocalSteamScreenshotThumbnails({})
    setHasCheckedLocalSteamScreenshots(false)
    announceStatus(`Importing Steam App ID ${appId}...`)

    try {
      const importedState = await createSteamGameImport(appId)
      const metadataCandidateResult = loadImportedSteamMetadataCandidates(
        importedState.importedGame,
      )
      const isDifferentSelectedSteamGame =
        selectedSteamGame !== null &&
        selectedSteamGame.appId !== importedState.importedGame.appId
      const autoRatingCandidate = getAutoApplyRatingCandidateForMetadata(
        metadataCandidateResult,
        projectMetadata,
        isDifferentSelectedSteamGame,
      )
      const autoLegalCandidate = getAutoApplyLegalCandidateForMetadata(
        metadataCandidateResult,
        projectMetadata,
        isDifferentSelectedSteamGame,
      )
      const nextProjectMetadata = applySteamGameImportToProjectMetadata(
        importedState.importedGame,
        projectMetadata,
      )
      const shouldResetGameScopedRating = isDifferentSelectedSteamGame
      const shouldResetGameScopedLegal = isDifferentSelectedSteamGame
      const nextProjectMetadataWithAutoApply = {
        ...nextProjectMetadata,
        ...(autoRatingCandidate
          ? {
              ratingSystem: autoRatingCandidate.ratingSystem,
              ratingValue: autoRatingCandidate.ratingValue,
            }
          : shouldResetGameScopedRating
            ? {
                ratingSystem: 'none' as const,
                ratingValue: '',
              }
            : {}),
        ...(autoLegalCandidate
          ? {
              copyrightText: autoLegalCandidate.text,
            }
          : shouldResetGameScopedLegal
            ? {
                copyrightText: '',
              }
            : {}),
      }
      const shouldUpdateCopyrightDiscTextSource =
        Boolean(autoLegalCandidate) || shouldResetGameScopedLegal
      const nextDiscTextResolution = applySteamImportedDiscTextValues(
        importedState.importedGame,
        nextProjectMetadataWithAutoApply,
        { useMetadataCopyright: shouldUpdateCopyrightDiscTextSource },
      )
      const titleArtworkImport = await applySteamTitleArtworkImport(
        importedState.importedGame,
      )
      const platformMarkImport = applySteamPlatformMarksImport({
        importedGame: importedState.importedGame,
        currentPlatformMarks: projectPlatformMarks,
        selectedDiscTemplate,
        previousSelectedSteamGame: selectedSteamGame,
      })
      setSelectedSteamGame(importedState.importedGame)
      setSteamSearchResults([])
      setManualGameTitle(importedState.manualGameTitle)
      setProjectMetadata(nextProjectMetadataWithAutoApply)
      setProjectPlatformMarks(platformMarkImport.platformMarks)
      if (autoLegalCandidate) {
        enableCurvedCopyrightDiscText()
      } else if (shouldResetGameScopedLegal) {
        setCopyrightDiscTextEnabled(false)
      }
      if (autoRatingCandidate) {
        setRatingBadgeEnabledForAppliedCandidate(autoRatingCandidate)
      } else if (shouldResetGameScopedRating) {
        setRatingBadgeEnabled(false)
      }
      clampDiscTextLayoutForContent('title', nextDiscTextResolution.resolvedDiscTextTitle)
      clampMetadataBoundDiscTextLayoutsForProjectMetadataFields(
        ['steamAppId', 'developer', 'publisher', 'copyrightText'],
        nextProjectMetadataWithAutoApply,
        nextDiscTextResolution,
      )
      announceStatus(importedState.statusMessage)
      announceStatus(titleArtworkImport.statusMessage)
      announceStatus(platformMarkImport.statusMessage)
      announceAutoAppliedMetadataCandidates(autoRatingCandidate, autoLegalCandidate)
    } catch (error) {
      announceStatus(`Steam import failed: ${String(error)}`)
    } finally {
      setIsSteamImportLoading(false)
    }
  }

  async function handleUseSteamArtwork(asset: SteamArtworkAsset) {
    setIsArtworkLoading(true)
    setSelectedArtworkId(asset.id)
    announceStatus(`Downloading ${asset.label}...`)

    try {
      applyBackgroundImageImport(await createSteamArtworkBackgroundImport(asset))
    } catch (error) {
      setSelectedArtworkId(null)
      announceStatus(`Steam artwork download failed: ${String(error)}`)
    } finally {
      setIsArtworkLoading(false)
    }
  }

  async function handleFindLocalSteamScreenshots() {
    if (!selectedSteamGame) {
      announceStatus('Select or import a Steam game before checking local screenshots.')
      return
    }

    setIsLocalSteamScreenshotsLoading(true)
    setHasCheckedLocalSteamScreenshots(true)
    announceStatus(`Checking local Steam screenshots for ${selectedSteamGame.title}...`)

    try {
      const discovery = await createLocalSteamScreenshotDiscovery(selectedSteamGame)
      setLocalSteamScreenshots(discovery.screenshots)
      announceStatus(discovery.statusMessage)
    } catch (error) {
      setLocalSteamScreenshots([])
      setLocalSteamScreenshotThumbnails({})
      announceStatus(`Local Steam screenshot check failed: ${String(error)}`)
    } finally {
      setIsLocalSteamScreenshotsLoading(false)
    }
  }

  async function handleUseLocalSteamScreenshot(asset: LocalSteamScreenshotAsset) {
    setSelectedArtworkId(asset.id)
    announceStatus(`Loading ${asset.label}...`)

    try {
      applyBackgroundImageImport(await createLocalSteamScreenshotBackgroundImport(asset))
    } catch (error) {
      setSelectedArtworkId(null)
      announceStatus(`Local screenshot could not be applied: ${String(error)}`)
    }
  }

  async function handleOpenLocalSteamScreenshotFolder() {
    const folderPath = localSteamScreenshots[0]?.folderPath

    if (!folderPath) {
      announceStatus('No local Steam screenshot folder is available yet.')
      return
    }

    try {
      await openLocalFolder(folderPath)
      announceStatus('Opened local Steam screenshot folder.')
    } catch (error) {
      announceStatus(`Could not open screenshot folder: ${String(error)}`)
    }
  }

  async function handleSaveProject() {
    try {
      const path = await save({
        defaultPath:
          activeWorkspace === 'caseInsert'
            ? 'steam-backup-case-insert.sbls.json'
            : 'steam-backup-label.sbls.json',
        filters: [
          {
            name: 'Steam Backup Label Studio Project',
            extensions: ['json'],
          },
        ],
      })

      if (!path) {
        announceStatus('Save cancelled.')
        return
      }

      const project = activeWorkspace === 'caseInsert'
        ? createCaseInsertProjectSnapshot({
            manualGameTitle,
            selectedSteamGame,
            projectMetadata,
            caseInsert: projectJewelCase,
          })
        : createProjectSnapshot({
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
          })
      await writeProjectFile(path, JSON.stringify(project, null, 2))

      announceStatus(`Saved project to ${path}`)
    } catch (error) {
      announceStatus(`Save failed: ${String(error)}`)
    }
  }

  async function handleLoadProject() {
    try {
      const selected = await open({
        multiple: false,
        filters: [
          {
            name: 'Steam Backup Label Studio Project',
            extensions: ['json'],
          },
        ],
      })

      if (!selected || Array.isArray(selected)) {
        announceStatus('Load cancelled.')
        return
      }

      const contents = await readProjectFile(selected)
      const projectRoute = resolveSavedProjectRouteFromContents(contents)

      if (projectRoute.projectType === 'caseInsert') {
        const restoredCaseProject = restoreCaseInsertProjectStateFromContents(contents)

        setManualGameTitle(restoredCaseProject.manualGameTitle)
        setProjectMetadata(restoredCaseProject.projectMetadata)
        setSelectedSteamGame(restoredCaseProject.selectedSteamGame)
        setProjectJewelCase(restoredCaseProject.caseInsert)
        setActiveWorkspace('caseInsert')
        setHomeStatusMessage(null)
        announceStatus(
          'Loaded case insert project template, metadata, and preview geometry.',
        )
        return
      }

      const restoredProject = await restoreProjectStateFromContents(contents, {
        defaultSteamBannerLockupImageUrl: DEFAULT_STEAM_BANNER_LOCKUP_IMAGE_URL,
        resolveBackgroundImageSize: async (imageDataUrl) =>
          getNaturalImageSize(await loadImage(imageDataUrl)),
      })

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
      setSelectedArtworkId(null)
      setLocalSteamScreenshots([])
      setLocalSteamScreenshotThumbnails({})
      setHasCheckedLocalSteamScreenshots(false)

      if (restoredProject.template.customDiscTemplate) {
        setCustomDiscTemplate(restoredProject.template.customDiscTemplate)
      }
      setSelectedDiscTemplateId(restoredProject.template.selectedDiscTemplateId)
      setSteamLogoPlacement(restoredProject.steamLogoPlacement)
      setSteamBannerColors(restoredProject.steamBannerColors)
      setSteamBannerLockupImageUrl(restoredProject.steamBannerLockupImageUrl)
      setSteamBannerLockupImageSource(restoredProject.steamBannerLockupImageSource)
      setSteamBannerLockupImageSize(restoredProject.steamBannerLockupImageSize)
      setSteamBannerLockupLayout(restoredProject.steamBannerLockupLayout)
      setSteamBannerUseTextFallback(restoredProject.steamBannerUseTextFallback)
      setSteamBannerFallbackText(restoredProject.steamBannerFallbackText)
      setExportGuides(restoredProject.exportGuides)
      restoreDiscTextState({
        projectDiscNumberArtwork: restoredProject.projectDiscNumberArtwork,
        discTextSettings: restoredProject.discTextSettings,
        discTextValues: restoredProject.discTextValues,
        discTextValueSources: restoredProject.discTextValueSources,
        discTextTitleValue: restoredProject.discTextTitleValue,
        discTextLayout: restoredProject.discTextLayout,
        discTextStyles: restoredProject.discTextStyles,
      })
      setBackgroundScale(restoredProject.backgroundScale)
      setBackgroundOffset(restoredProject.backgroundOffset)
      setBackgroundImageUrl(restoredProject.backgroundImageUrl)
      setBackgroundImageSource(restoredProject.backgroundImageSource)
      setBackgroundImageSize(restoredProject.backgroundImageSize)
      setIsBackgroundArtworkEnabled(restoredProject.isBackgroundArtworkEnabled)
      setActiveWorkspace('disc')
      setHomeStatusMessage(null)

      announceStatus(
        restoredProject.backgroundImageUrl
          ? 'Loaded project layout, game metadata, embedded background image, and template geometry.'
          : 'Loaded project layout, game metadata, and template geometry. No embedded background image was found.',
      )
    } catch (error) {
      announceStatus(`Load failed: ${String(error)}`)
    }
  }

  async function handleExportPng() {
    if (activeWorkspace === 'caseInsert') {
      announceStatus('Case insert PNG export is planned for the export pass.')
      return
    }

    try {
      const path = await save({
        defaultPath: 'steam-backup-label.png',
        filters: [
          {
            name: 'PNG Image',
            extensions: ['png'],
          },
        ],
      })

      if (!path) {
        announceStatus('Export cancelled.')
        return
      }

      const preflight = buildExportPreflightSummary({
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
      })
      const shouldExport = await confirm(preflight.message, {
        title: 'Export PNG preflight',
        kind: preflight.hasWarnings ? 'warning' : 'info',
        okLabel: 'Export PNG',
        cancelLabel: 'Cancel',
      })

      if (!shouldExport) {
        announceStatus('Export cancelled after preflight.')
        return
      }

      const previewSize =
        discPreviewRef.current?.getBoundingClientRect().width ??
        mmToPixels(selectedDiscTemplate.outerDiameterMm)
      const result = await exportDiscLabelPngBytes({
        selectedDiscTemplate,
        backgroundImageUrl: effectiveBackgroundImageUrl,
        backgroundScale,
        backgroundOffset,
        previewSize,
        steamLogoPlacement,
        steamBannerColors,
        steamBannerLockupImageUrl,
        steamBannerLockupLayout,
        steamBannerUseTextFallback,
        steamBannerFallbackText,
        projectLogoAssets,
        projectTitleArtwork,
        projectDiscNumberArtwork,
        projectAdditionalArtwork,
        projectMetadata,
        projectRatingBadge,
        projectMediaMark,
        projectPlatformMarks,
        projectTechnicalMarks,
        discTextSettings,
        discTextValues,
        discTextValueSources,
        discTextStyles,
        discTextLayout,
        manualGameTitle: resolvedDiscTextTitle,
        exportGuides,
      })

      await writeBinaryFile(path, result.bytes)

      announceStatus(
        `Exported ${result.width} × ${result.height}px PNG at ${EXPORT_DPI} DPI.`,
      )
    } catch (error) {
      announceStatus(`Export failed: ${String(error)}`)
    }
  }

  if (activeWorkspace === 'home') {
    return (
      <HomeScreen
        onLoadProject={handleLoadProject}
        onNewDisc={handleStartNewDiscProject}
        onNewCaseInsert={handleOpenCaseInsertEditor}
        onWizard={handleWizardPlaceholder}
        statusMessage={homeStatusMessage}
      />
    )
  }

  if (activeWorkspace === 'caseInsert') {
    return (
      <CaseInsertEditorShell
        caseInsert={projectJewelCase}
        frontEditor={jewelCaseFrontEditor}
        imageSources={{
          selectedSteamGame,
          localSteamScreenshots,
          localSteamScreenshotThumbnails,
        }}
        projectStatus={projectStatus}
        manualGameTitle={manualGameTitle}
        statusToasts={statusToasts}
        onMainMenu={handleReturnToHome}
        onNewCaseInsert={handleOpenCaseInsertEditor}
        onNewDisc={handleStartNewDiscProject}
        onSaveProject={handleSaveProject}
        onLoadProject={handleLoadProject}
        onExportPng={handleExportPng}
      />
    )
  }

  return (
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

        <GamePanel
          manualGameTitle={manualGameTitle}
          setManualGameTitle={setManualGameTitle}
          projectMetadata={projectMetadata}
          handleProjectMetadataChange={handleProjectMetadataChange}
          handleProjectMetadataFieldsChange={handleProjectMetadataFieldsChange}
          gameSearchQuery={gameSearchQuery}
          setGameSearchQuery={setGameSearchQuery}
          handleSteamSearch={handleSteamSearch}
          steamSearchResults={steamSearchResults}
          handleSteamImport={handleSteamImport}
          selectedSteamGame={selectedSteamGame}
          isSteamSearchLoading={isSteamSearchLoading}
          isSteamImportLoading={isSteamImportLoading}
          metadataAssistance={steamMetadataAssistance}
          canFindMetadataCandidates={canFindMetadataCandidates}
          handleFindMetadataCandidates={handleFindAndApplySteamMetadataCandidates}
          handleApplyRatingCandidate={handleApplyRatingCandidate}
          handleApplyLegalCandidate={handleApplyLegalCandidate}
          handleCopyLegalCandidate={handleCopyLegalCandidate}
        />

        <TemplatePanel
          selectedDiscTemplateId={selectedDiscTemplateId}
          selectedDiscTemplate={selectedDiscTemplate}
          isCustomDiscTemplate={isCustomDiscTemplate}
          customDiscTemplate={customDiscTemplate}
          discTemplateOptions={discTemplateOptions}
          customOuterDiameterMaxMm={CUSTOM_OUTER_DIAMETER_MAX_MM}
          handleTemplateChange={handleTemplateChange}
          handleCustomDimensionChange={handleCustomDimensionChange}
        />

        <ArtworkPanel
          selectedSteamGame={selectedSteamGame}
          selectedArtworkId={selectedArtworkId}
          isArtworkLoading={isArtworkLoading}
          handleUseSteamArtwork={handleUseSteamArtwork}
          webArtworkDiscovery={webArtworkDiscovery}
          handleFindWebArtworkCandidates={findWebArtworkCandidates}
          handleUseWebArtworkCandidate={applyWebArtworkCandidate}
          localSteamScreenshots={localSteamScreenshots}
          localSteamScreenshotThumbnails={localSteamScreenshotThumbnails}
          hasCheckedLocalSteamScreenshots={hasCheckedLocalSteamScreenshots}
          isLocalSteamScreenshotsLoading={isLocalSteamScreenshotsLoading}
          handleFindLocalSteamScreenshots={handleFindLocalSteamScreenshots}
          handleOpenLocalSteamScreenshotFolder={handleOpenLocalSteamScreenshotFolder}
          handleUseLocalSteamScreenshot={handleUseLocalSteamScreenshot}
          handleBackgroundUpload={handleBackgroundUpload}
          isBackgroundArtworkEnabled={isBackgroundArtworkEnabled}
          handleBackgroundArtworkEnabledChange={handleBackgroundArtworkEnabledChange}
          backgroundScale={backgroundScale}
          backgroundOffset={backgroundOffset}
          backgroundOffsetSliderRanges={backgroundOffsetSliderRanges}
          handleBackgroundScaleChange={handleBackgroundScaleChange}
          handleBackgroundOffsetChange={handleBackgroundOffsetChange}
          backgroundImageUrl={backgroundImageUrl}
          backgroundImageSource={backgroundImageSource}
          handleResetBackground={handleResetBackground}
          canFitBackgroundToSteamBannerOpenArea={
            Boolean(backgroundImageUrl)
          }
          backgroundFitButtonLabel={
            steamLogoPlacement === 'none'
              ? 'Fit edge to edge'
              : 'Fit between Steam banner and disc edge'
          }
          handleFitBackgroundToSteamBannerOpenArea={handleFitBackgroundToSteamBannerOpenArea}
          projectTitleArtwork={projectTitleArtwork}
          selectedDiscTemplate={selectedDiscTemplate}
          handleTitleArtworkLayoutChange={handleTitleArtworkLayoutChange}
          handleResetTitleArtworkLayout={handleResetTitleArtworkLayout}
          handleRestoreTitleArtworkDefault={handleRestoreTitleArtworkDefault}
          handleTitleArtworkUpload={handleTitleArtworkUpload}
          projectAdditionalArtwork={projectAdditionalArtwork}
          handleAdditionalArtworkEnabledChange={handleAdditionalArtworkEnabledChange}
          handleAddAdditionalArtworkElement={handleAddAdditionalArtworkElement}
          handleAdditionalArtworkUpload={handleAdditionalArtworkUpload}
          handleUseSteamArtworkAsAdditionalArtwork={
            handleUseSteamArtworkAsAdditionalArtwork
          }
          handleUseLocalSteamScreenshotAsAdditionalArtwork={
            handleUseLocalSteamScreenshotAsAdditionalArtwork
          }
          handleAdditionalArtworkLayoutChange={handleAdditionalArtworkLayoutChange}
          handleAdditionalArtworkLabelChange={handleAdditionalArtworkLabelChange}
          handleAdditionalArtworkFrameChange={handleAdditionalArtworkFrameChange}
          handleResetAdditionalArtworkElementLayout={
            handleResetAdditionalArtworkElementLayout
          }
          handleResetAdditionalArtworkElementFrame={
            handleResetAdditionalArtworkElementFrame
          }
          handleClearAdditionalArtworkElementImage={
            handleClearAdditionalArtworkElementImage
          }
          handleRemoveAdditionalArtworkElement={handleRemoveAdditionalArtworkElement}
        />

        <BrandingPanel
          steamLogoPlacement={steamLogoPlacement}
          handleSteamLogoPlacementChange={handleSteamLogoPlacementChange}
          steamBannerLockupImageUrl={steamBannerLockupImageUrl}
          steamBannerLockupImageSource={steamBannerLockupImageSource}
          steamBannerLockupImageSize={steamBannerLockupImageSize}
          steamBannerLockupLayout={steamBannerLockupLayout}
          steamBannerUseTextFallback={steamBannerUseTextFallback}
          steamBannerFallbackText={steamBannerFallbackText}
          steamBannerColors={steamBannerColors}
          projectLogoAssets={projectLogoAssets}
          projectMetadata={projectMetadata}
          projectRatingBadge={projectRatingBadge}
          projectMediaMark={projectMediaMark}
          projectPlatformMarks={projectPlatformMarks}
          projectTechnicalMarks={projectTechnicalMarks}
          selectedDiscTemplate={selectedDiscTemplate}
          handleProjectMetadataChange={handleProjectMetadataChange}
          handleProjectMetadataFieldsChange={handleProjectMetadataFieldsChange}
          handleSteamBannerLockupUpload={handleSteamBannerLockupUpload}
          handleClearSteamBannerLockup={handleClearSteamBannerLockup}
          handleSteamBannerLockupLayoutChange={handleSteamBannerLockupLayoutChange}
          handleResetSteamBannerLockupLayout={handleResetSteamBannerLockupLayout}
          handleSteamBannerUseTextFallbackChange={
            handleSteamBannerUseTextFallbackChange
          }
          handleSteamBannerFallbackTextChange={handleSteamBannerFallbackTextChange}
          handleSteamBannerColorChange={handleSteamBannerColorChange}
          handleResetSteamBannerColors={handleResetSteamBannerColors}
          handleLogoAssetUpload={handleLogoAssetUpload}
          logoCandidateDiscovery={logoCandidateDiscovery}
          handleFindLogoCandidates={findLogoCandidates}
          handleApplyLogoCandidate={applyLogoCandidate}
          handleLogoAssetLayoutChange={handleLogoAssetLayoutChange}
          handleClearLogoAsset={handleClearLogoAsset}
          handleResetLogoAssetLayout={handleResetLogoAssetLayout}
          handleAddAdditionalLogoAsset={handleAddAdditionalLogoAsset}
          handleAdditionalLogoAssetLabelChange={handleAdditionalLogoAssetLabelChange}
          handleRemoveAdditionalLogoAsset={handleRemoveAdditionalLogoAsset}
          handleRatingBadgeUpload={handleRatingBadgeUpload}
          handleRatingBadgeSourceChange={handleRatingBadgeSourceChange}
          handleRatingBadgeEnabledChange={handleRatingBadgeEnabledChange}
          handleRatingBadgeLayoutChange={handleRatingBadgeLayoutChange}
          handleSupplementalUskRatingBadgeEnabledChange={handleSupplementalUskRatingBadgeEnabledChange}
          handleSupplementalUskRatingBadgeValueChange={handleSupplementalUskRatingBadgeValueChange}
          handleSupplementalUskRatingBadgeLayoutChange={handleSupplementalUskRatingBadgeLayoutChange}
          handleClearRatingBadgeImage={handleClearRatingBadgeImage}
          handleResetRatingBadgeLayout={handleResetRatingBadgeLayout}
          handleResetSupplementalUskRatingBadgeLayout={handleResetSupplementalUskRatingBadgeLayout}
          handleMediaMarkUpload={handleMediaMarkUpload}
          handleMediaMarkValueChange={handleMediaMarkValueChange}
          handleMediaMarkSourceChange={handleMediaMarkSourceChange}
          handleMediaMarkThemeChange={handleMediaMarkThemeChange}
          handleMediaMarkLayoutChange={handleMediaMarkLayoutChange}
          handleClearMediaMarkImage={handleClearMediaMarkImage}
          handleResetMediaMarkLayout={handleResetMediaMarkLayout}
          handlePlatformMarkToggle={handlePlatformMarkToggle}
          handlePlatformMarkUpload={handlePlatformMarkUpload}
          handlePlatformMarkSourceChange={handlePlatformMarkSourceChange}
          handlePlatformMarkThemeChange={handlePlatformMarkThemeChange}
          handlePlatformMarkLayoutChange={handlePlatformMarkLayoutChange}
          handleClearPlatformMarkImage={handleClearPlatformMarkImage}
          handleResetPlatformMarkLayout={handleResetPlatformMarkLayout}
          handleTechnicalMarkToggle={handleTechnicalMarkToggle}
          handleTechnicalMarkUpload={handleTechnicalMarkUpload}
          handleTechnicalMarkSourceChange={handleTechnicalMarkSourceChange}
          handleTechnicalMarkLayoutChange={handleTechnicalMarkLayoutChange}
          handleTechnicalMarkLabelChange={handleTechnicalMarkLabelChange}
          handleClearTechnicalMarkImage={handleClearTechnicalMarkImage}
          handleResetTechnicalMarkLayout={handleResetTechnicalMarkLayout}
        />


        <TextPanel
          discTextSettings={discTextSettings}
          discTextLayout={discTextLayout}
          discTextStyles={discTextStyles}
          projectDiscNumberArtwork={projectDiscNumberArtwork}
          discTextValues={discTextValues}
          discTextValueSources={discTextValueSources}
          metadataBoundDiscTextValues={metadataBoundDiscTextValues}
          discTextTitleValue={discTextTitleValue}
          resolvedDiscTextTitle={resolvedDiscTextTitle}
          selectedDiscTemplate={selectedDiscTemplate}
          handleDiscTextToggle={handleDiscTextToggle}
          handleDiscTextContentChange={handleDiscTextContentChange}
          handleUseMetadataDiscTextValue={handleUseMetadataDiscTextValue}
          handleDiscTextLayoutChange={handleDiscTextLayoutChange}
          handleDiscTextAlignmentChange={handleDiscTextAlignmentChange}
          handleDiscTextModeChange={handleDiscTextModeChange}
          handleDiscTextArcSideChange={handleDiscTextArcSideChange}
          handleDiscTextVisualAvoidanceChange={handleDiscTextVisualAvoidanceChange}
          handleResetDiscTextLayout={handleResetDiscTextLayout}
          handleDiscTextStyleChange={handleDiscTextStyleChange}
          handleApplyDiscTextStylePreset={handleApplyDiscTextStylePreset}
          handleDiscNumberArtworkModeChange={handleDiscNumberArtworkModeChange}
          handleDiscNumberArtworkBadgeSetChange={handleDiscNumberArtworkBadgeSetChange}
          handleResetDiscTextStyle={handleResetDiscTextStyle}
          steamLogoPlacement={steamLogoPlacement}
        />

        <GuideLegendPanel />
      </aside>

      <DiscPreview
        discPreviewRef={discPreviewRef}
        statusToasts={statusToasts}
        background={{
          imageUrl: effectiveBackgroundImageUrl,
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
          styles: discTextStyles,
          manualGameTitle: resolvedDiscTextTitle,
          layout: discTextLayout,
          discNumberArtwork: projectDiscNumberArtwork,
          selectedDiscTemplate,
          getPreviewTransform: getDiscTextPreviewTransform,
        }}
        pointerHandlers={previewPointerHandlers}
        guideOverlay={{
          innerPrintableBoundaryPercent,
          printableInsetPercent,
          safeInsetPercent,
          physicalCenterHolePercent,
        }}
      />
    </main>
  )
}

export default App
