import { confirm, open, save } from '@tauri-apps/plugin-dialog'
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import {
  searchSteamStore,
  type SteamArtworkAsset,
  type SteamImportedGame,
  type SteamSearchResult,
} from './steam/steamApi'
import {
  openLocalFolder,
  type LocalSteamScreenshotAsset,
} from './local/localArtwork'
import { createLocalSteamScreenshotDiscovery } from './local/localSteamScreenshotDiscovery'
import { loadMissingLocalSteamScreenshotThumbnails } from './local/localSteamScreenshotThumbnails'
import {
  applySteamGameImportToDiscTextValues,
  applySteamGameImportToProjectMetadata,
  createSteamGameImport,
} from './steam/steamGameImport'
import { applySteamPlatformMarksImport } from './steam/steamPlatformMarks'
import { discTemplates, discTemplateOptions } from './templates/discTemplates'
import type { DiscTemplate } from './types/template'
import {
  CUSTOM_OUTER_DIAMETER_MAX_MM,
  EXPORT_DPI,
  buildCustomDiscTemplate,
  getGuideInsetPercent,
  mmToPixels,
  normalizeCustomDiscTemplate,
} from './discGeometry'
import {
  clampDiscTextLayoutToSafeZone,
  clampLogoAssetLayoutToSafeZone,
  clampMediaMarkLayoutToSafeZone,
  clampProjectLogoAssetsToSafeZone,
  clampProjectPlatformMarksToSafeZone,
  clampProjectRatingBadgeToSafeZone,
  clampStraightDiscTextLayoutToSafeZone,
} from './layout/discElementSafeZone'
import { validateDiscTemplateGeometryGuardrail } from './layout/discTemplateGeometryGuardrail'
import { DEFAULT_EXPORT_GUIDES, setExportGuideSelection, type ExportGuideKey, type ExportGuideSelection } from './exportGuides'
import './App.css'
import './layoutFix.css'
import { CaseInsertPlaceholder } from './components/caseInsert/CaseInsertPlaceholder'
import { HomeScreen } from './components/home/HomeScreen'
import type { EditorWorkspace } from './editor/editorTypes'
import { DiscPreview } from './components/preview/DiscPreview'
import { ArtworkPanel } from './components/sidebar/ArtworkPanel'
import { BrandingPanel } from './components/sidebar/BrandingPanel'
import { ExportOptionsPanel } from './components/sidebar/ExportOptionsPanel'
import { GamePanel } from './components/sidebar/GamePanel'
import { GuideLegendPanel } from './components/sidebar/GuideLegendPanel'
import { ProjectPanel } from './components/sidebar/ProjectPanel'
import { TemplatePanel } from './components/sidebar/TemplatePanel'
import { TextPanel } from './components/sidebar/TextPanel'
import { useAdditionalArtwork } from './hooks/useAdditionalArtwork'
import { useLogoAssetDiscovery } from './hooks/useLogoAssetDiscovery'
import { useStatusToasts } from './hooks/useStatusToasts'
import { useSteamMetadataAssistance } from './hooks/useSteamMetadataAssistance'
import { useTechnicalMarks } from './hooks/useTechnicalMarks'
import { useTitleArtwork } from './hooks/useTitleArtwork'
import { useWebArtworkDiscovery } from './hooks/useWebArtworkDiscovery'
import {
  BackgroundImageLoadError,
  createLocalSteamScreenshotBackgroundImport,
  createSteamArtworkBackgroundImport,
  createUploadedBackgroundImageImport,
  type BackgroundImageImportResult,
} from './backgroundImageImport'
import { createProjectSnapshot } from './project/createProjectSnapshot'
import { createProjectImageAssetProvenance } from './project/projectAssetStatus'
import { resolveSavedProjectRouteFromContents } from './project/projectRouting'
import { restoreProjectStateFromContents } from './project/restoreProjectState'
import { createDefaultProjectMetadata } from './project/projectMetadata'
import {
  createDefaultDiscTextValueSources,
  getDiscTextKeysForProjectMetadataField,
  isMetadataBoundDiscTextKey,
  resolveMetadataBoundDiscTextTitle,
  resolveMetadataBoundDiscTextValues,
  updateDiscTextInputValue,
  type DiscTextValueSources,
  type MetadataBoundDiscTextKey,
} from './project/metadataDiscText'
import { addAdditionalLogoAsset, clearLogoAsset, createDefaultProjectLogoAssets, getLogoAssetLayout, getLogoAssetSize, removeAdditionalLogoAsset, resetProjectLogoAssetLayout, setLogoAssetLayout, updateAdditionalLogoAssetLabel, updateLogoAssetLayoutField, type LogoAssetKey, type LogoAssetLayoutField } from './project/projectLogoAssets'
import { clearMediaMarkImage, clearPlatformMarkImage, createDefaultProjectMediaMark, createDefaultProjectPlatformMarks, markProjectPlatformMarksManual, resetProjectMediaMarkLayout, resetProjectPlatformMarkLayout, updateMediaMarkLayoutField, updateMediaMarkSource, updateMediaMarkTheme, updateMediaMarkValue, updatePlatformMarkLayoutField, updatePlatformMarkSource, updatePlatformMarkTheme, updatePlatformMarkToggle, type MediaMarkLayoutField, type PlatformMarkLayoutField } from './project/projectMediaMark'
import { clearRatingBadgeImage, createDefaultProjectRatingBadge, resetProjectRatingBadgeLayout, resetSupplementalUskRatingBadgeLayout, updateRatingBadgeEnabledState, updateRatingBadgeLayoutField, updateRatingBadgeSource, updateSupplementalUskRatingBadgeEnabledState, updateSupplementalUskRatingBadgeLayoutField, updateSupplementalUskRatingBadgeValue, type RatingBadgeLayoutField } from './project/projectRatingBadge'
import {
  applyImportedLogoAsset,
  applyImportedMediaMark,
  applyImportedPlatformMark,
  applyImportedRatingBadge,
} from './project/projectVisualAssetImport'
import type { BackgroundImageSize, BackgroundOffset, MediaMarkSource, MediaMarkTheme, MediaMarkValue, PlatformMarkSource, PlatformMarkTheme, PlatformMarkValue, ProjectImageAssetProvenance, ProjectLogoAssets, ProjectMediaMark, ProjectMetadata, ProjectPlatformMarks, ProjectRatingBadge, RatingBadgeSource, SelectedDiscTemplateId, SteamBannerColors, SteamBannerLockupLayout } from './project/projectTypes'
import {
  createDefaultProjectDiscNumberArtwork,
  updateDiscNumberArtworkBadgeSet,
  updateDiscNumberArtworkMode,
  type DiscNumberArtworkMode,
  type DiscNumberBadgeSet,
} from './discNumberArtwork'
import { readProjectFile, writeBinaryFile, writeProjectFile } from './tauri/fileSystem'
import {
  getAutoApplyLegalTextCandidate,
  getAutoApplyRatingCandidate,
  type LegalTextCandidate,
  type RatingBoardCandidate,
  type SteamMetadataCandidateDiscoveryResult,
} from './steam/steamMetadataCandidates'
import { loadImage } from './export/canvasImage'
import { exportDiscLabelPngBytes } from './export/exportPng'
import { buildExportPreflightSummary } from './export/exportPreflight'
import { getNaturalImageSize } from './utils/imageFile'
import {
  DEFAULT_STEAM_BANNER_COLORS,
  DEFAULT_STEAM_BANNER_FALLBACK_TEXT,
  DEFAULT_STEAM_BANNER_LOCKUP_IMAGE_URL,
  DEFAULT_STEAM_BANNER_LOCKUP_LAYOUT,
  createCustomSteamBannerLockupImageState,
  createDefaultSteamBannerLockupImageState,
  updateSteamBannerColor,
  updateSteamBannerLockupLayoutField,
  type SteamBannerColorField,
  type SteamBannerLockupLayoutField,
} from './steamBanner'
import {
  DEFAULT_BACKGROUND_SCALE,
  clampBackgroundOffsetToImageBounds,
  createEmptyBackgroundImageState,
  createDefaultBackgroundOffset,
  getBackgroundOffsetSliderRanges,
  getBackgroundPreviewSize,
  updateBackgroundOffsetField,
  updateBackgroundScale,
  type BackgroundOffsetField,
} from './backgroundImage'
import { getBackgroundFitToSteamBannerOpenArea } from './layout/backgroundArtworkFit'
import { isImageFile, readImportedImageAssetFromFile } from './utils/importedImageAsset'
import { useDiscPreviewPointerDrag } from './interaction/useDiscPreviewPointerDrag'
import {
  DISC_TEXT_KEYS,
  DEFAULT_DISC_TEXT_SETTINGS,
  createDefaultDiscTextLayout,
  createDefaultDiscTextValues,
  getDiscTextContent,
  getDiscTextPreviewTransform,
  resetDiscTextLayout,
  isCurvedCopyrightDiscTextLayout,
  updateDiscTextAlignment,
  updateDiscTextArcSide,
  updateDiscTextLayoutForSteamLogoPlacement,
  updateDiscTextLayoutField,
  updateDiscTextVisualAvoidance,
  updateDiscTextMode,
  updateDiscTextSetting,
  type DiscTextAlignment,
  type DiscTextArcSide,
  type DiscTextKey,
  type DiscTextLayoutNumericField,
  type DiscTextLayoutSettings,
  type DiscTextMode,
  type DiscTextSettings,
  type DiscTextValues,
  type SteamLogoPlacement,
} from './discText'
import {
  createDefaultDiscTextStyles,
  applyDiscTextStylePreset,
  resetDiscTextStyle,
  updateDiscTextStyleField,
  type DiscTextStyleField,
  type DiscTextStyleSettings,
  type DiscTextStyleValue,
} from './discTextStyles'

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
  const [steamBannerColors, setSteamBannerColors] = useState<SteamBannerColors>(
    DEFAULT_STEAM_BANNER_COLORS,
  )
  const [steamBannerLockupImageUrl, setSteamBannerLockupImageUrl] = useState<
    string | null
  >(() => createDefaultSteamBannerLockupImageState().imageUrl)
  const [steamBannerLockupImageSource, setSteamBannerLockupImageSource] =
    useState<ProjectImageAssetProvenance | null>(() =>
      createProjectImageAssetProvenance({
        source: 'built-in',
        sourceLabel: 'Default Steam banner lockup',
      }),
    )
  const [steamBannerLockupImageSize, setSteamBannerLockupImageSize] =
    useState<BackgroundImageSize | null>(null)
  const [steamBannerLockupLayout, setSteamBannerLockupLayout] =
    useState<SteamBannerLockupLayout>(DEFAULT_STEAM_BANNER_LOCKUP_LAYOUT)
  const [steamBannerUseTextFallback, setSteamBannerUseTextFallback] =
    useState(false)
  const [steamBannerFallbackText, setSteamBannerFallbackText] = useState(
    DEFAULT_STEAM_BANNER_FALLBACK_TEXT,
  )
  const [exportGuides, setExportGuides] = useState<ExportGuideSelection>(
    DEFAULT_EXPORT_GUIDES,
  )
  const [backgroundImageUrl, setBackgroundImageUrl] = useState<string | null>(null)
  const [backgroundImageSource, setBackgroundImageSource] =
    useState<ProjectImageAssetProvenance | null>(null)
  const [backgroundImageSize, setBackgroundImageSize] =
    useState<BackgroundImageSize | null>(null)
  const [backgroundScale, setBackgroundScale] = useState(DEFAULT_BACKGROUND_SCALE)
  const [backgroundOffset, setBackgroundOffset] = useState<BackgroundOffset>({
    ...createDefaultBackgroundOffset(),
  })
  const [isBackgroundArtworkEnabled, setIsBackgroundArtworkEnabled] = useState(true)
  const [discPreviewSize, setDiscPreviewSize] = useState(640)
  const { projectStatus, statusToasts, announceStatus } = useStatusToasts()
  const [gameSearchQuery, setGameSearchQuery] = useState('')
  const [manualGameTitle, setManualGameTitle] = useState('Untitled Steam Backup Label')
  const [projectMetadata, setProjectMetadata] = useState<ProjectMetadata>(() =>
    createDefaultProjectMetadata(),
  )
  const [projectLogoAssets, setProjectLogoAssets] = useState<ProjectLogoAssets>(() =>
    createDefaultProjectLogoAssets(discTemplates.standardPrintableDisc),
  )
  const [projectRatingBadge, setProjectRatingBadge] = useState<ProjectRatingBadge>(() =>
    createDefaultProjectRatingBadge(discTemplates.standardPrintableDisc),
  )
  const [projectMediaMark, setProjectMediaMark] = useState<ProjectMediaMark>(() =>
    createDefaultProjectMediaMark(discTemplates.standardPrintableDisc),
  )
  const [projectPlatformMarks, setProjectPlatformMarks] = useState<ProjectPlatformMarks>(() =>
    createDefaultProjectPlatformMarks(),
  )
  const [steamSearchResults, setSteamSearchResults] = useState<SteamSearchResult[]>([])
  const [selectedSteamGame, setSelectedSteamGame] = useState<SteamImportedGame | null>(null)
  const [isSteamSearchLoading, setIsSteamSearchLoading] = useState(false)
  const [isSteamImportLoading, setIsSteamImportLoading] = useState(false)
  const [selectedArtworkId, setSelectedArtworkId] = useState<string | null>(null)
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
  const [discTextSettings, setDiscTextSettings] = useState<DiscTextSettings>(
    DEFAULT_DISC_TEXT_SETTINGS,
  )
  const [discTextValues, setDiscTextValues] = useState<DiscTextValues>(() =>
    createDefaultDiscTextValues(),
  )
  const [discTextValueSources, setDiscTextValueSources] = useState<DiscTextValueSources>(() =>
    createDefaultDiscTextValueSources(),
  )
  const [discTextTitleValue, setDiscTextTitleValue] = useState('')
  const [discTextLayout, setDiscTextLayout] = useState<DiscTextLayoutSettings>(() =>
    createDefaultDiscTextLayout('top', discTemplates.standardPrintableDisc),
  )
  const [discTextStyles, setDiscTextStyles] = useState<DiscTextStyleSettings>(() =>
    createDefaultDiscTextStyles(),
  )
  const [projectDiscNumberArtwork, setProjectDiscNumberArtwork] = useState(() =>
    createDefaultProjectDiscNumberArtwork(),
  )

  const discPreviewRef = useRef<HTMLDivElement | null>(null)
  const selectedDiscTemplate =
    selectedDiscTemplateId === 'custom'
      ? customDiscTemplate
      : discTemplates[selectedDiscTemplateId]
  const isCustomDiscTemplate = selectedDiscTemplateId === 'custom'
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
  const backgroundPreviewSize = useMemo(
    () => getBackgroundPreviewSize(backgroundImageSize),
    [backgroundImageSize],
  )
  const backgroundOffsetSliderRanges = useMemo(
    () =>
      getBackgroundOffsetSliderRanges(
        backgroundImageSize,
        backgroundScale,
        discPreviewSize,
      ),
    [backgroundImageSize, backgroundScale, discPreviewSize],
  )
  const effectiveBackgroundImageUrl = isBackgroundArtworkEnabled
    ? backgroundImageUrl
    : null
  const effectiveBackgroundImageSize = isBackgroundArtworkEnabled
    ? backgroundImageSize
    : null
  const metadataBoundDiscTextValues = useMemo(
    () =>
      resolveMetadataBoundDiscTextValues(
        discTextValues,
        projectMetadata,
        discTextValueSources,
      ),
    [discTextValues, discTextValueSources, projectMetadata],
  )
  const resolvedDiscTextTitle = useMemo(
    () =>
      resolveMetadataBoundDiscTextTitle(
        discTextTitleValue,
        projectMetadata,
        discTextValueSources,
      ),
    [discTextTitleValue, projectMetadata, discTextValueSources],
  )
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
    handleBackgroundPointerDown,
    handleBackgroundPointerMove,
    handleBackgroundPointerUp,
    handleDiscTextPointerDown,
    handleDiscTextPointerMove,
    handleDiscTextPointerUp,
    handleLogoAssetPointerDown,
    handleLogoAssetPointerMove,
    handleLogoAssetPointerUp,
    handleTitleArtworkPointerDown,
    handleTitleArtworkPointerMove,
    handleTitleArtworkPointerUp,
    handleAdditionalArtworkPointerDown,
    handleAdditionalArtworkPointerMove,
    handleAdditionalArtworkPointerUp,
    handleRatingBadgePointerDown,
    handleRatingBadgePointerMove,
    handleRatingBadgePointerUp,
    handleMediaMarkPointerDown,
    handleMediaMarkPointerMove,
    handleMediaMarkPointerUp,
    handlePlatformMarkPointerDown,
    handlePlatformMarkPointerMove,
    handlePlatformMarkPointerUp,
    handleTechnicalMarkPointerDown,
    handleTechnicalMarkPointerMove,
    handleTechnicalMarkPointerUp,
  } = useDiscPreviewPointerDrag({
    discPreviewRef,
    selectedDiscTemplate,
    backgroundImageUrl: effectiveBackgroundImageUrl,
    backgroundImageSize,
    backgroundScale,
    backgroundOffset,
    setBackgroundOffset,
    discTextLayout,
    setDiscTextLayout,
    projectLogoAssets,
    setProjectLogoAssets,
    projectTitleArtwork,
    setProjectTitleArtwork,
    projectAdditionalArtwork,
    setProjectAdditionalArtwork,
    projectRatingBadge,
    setProjectRatingBadge,
    projectMediaMark,
    setProjectMediaMark,
    projectPlatformMarks,
    setProjectPlatformMarks,
    projectTechnicalMarks,
    setProjectTechnicalMarks,
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
    setProjectLogoAssets((currentLogoAssets) =>
      clampProjectLogoAssetsToSafeZone(currentLogoAssets, template),
    )

    clampProjectTitleArtworkToTemplate(template)
    clampProjectAdditionalArtworkToTemplate(template)

    setProjectRatingBadge((currentBadge) =>
      clampProjectRatingBadgeToSafeZone(currentBadge, template),
    )

    setProjectMediaMark((currentMark) => {
      const layout = clampMediaMarkLayoutToSafeZone(currentMark, template)

      if (
        layout.x === currentMark.layout.x &&
        layout.y === currentMark.layout.y
      ) {
        return currentMark
      }

      return {
        ...currentMark,
        layout,
      }
    })

    setProjectPlatformMarks((currentMarks) =>
      clampProjectPlatformMarksToSafeZone(currentMarks, template),
    )

    clampProjectTechnicalMarksToTemplate(template)

    setDiscTextLayout((currentLayout) => {
      const nextLayout = clampDiscTextLayoutToSafeZone(currentLayout, template)
      const didChange = DISC_TEXT_KEYS.some(
        (key) =>
          nextLayout[key].x !== currentLayout[key].x ||
          nextLayout[key].y !== currentLayout[key].y,
      )

      return didChange ? nextLayout : currentLayout
    })
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

  function applyBackgroundImageImport(importedBackground: BackgroundImageImportResult) {
    setBackgroundImageUrl(importedBackground.background.imageUrl)
    setBackgroundImageSource(importedBackground.imageSource)
    setBackgroundImageSize(importedBackground.background.imageSize)
    setBackgroundScale(importedBackground.background.scale)
    setBackgroundOffset(importedBackground.background.offset)
    setIsBackgroundArtworkEnabled(true)
    setSelectedArtworkId(importedBackground.selectedArtworkId)
    announceStatus(importedBackground.statusMessage)
  }

  async function handleSteamBannerLockupUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) {
      return
    }

    if (!isImageFile(file)) {
      announceStatus('Choose an image file for the banner lockup.')
      return
    }

    try {
      const importedImage = await readImportedImageAssetFromFile(file)
      const lockupImage = createCustomSteamBannerLockupImageState(
        importedImage.imageDataUrl,
        importedImage.imageSize,
      )

      setSteamBannerLockupImageUrl(lockupImage.imageUrl)
      setSteamBannerLockupImageSource(createProjectImageAssetProvenance({
        source: 'uploaded',
        sourceLabel: file.name,
      }))
      setSteamBannerLockupImageSize(lockupImage.imageSize)
      setSteamBannerUseTextFallback(false)
      announceStatus(`Using ${file.name} as the Steam banner lockup.`)
    } catch (error) {
      announceStatus(`Banner lockup import failed: ${String(error)}`)
    }
  }

  function handleClearSteamBannerLockup() {
    const lockupImage = createDefaultSteamBannerLockupImageState()
    setSteamBannerLockupImageUrl(lockupImage.imageUrl)
    setSteamBannerLockupImageSource(createProjectImageAssetProvenance({
      source: 'built-in',
      sourceLabel: 'Default Steam banner lockup',
    }))
    setSteamBannerLockupImageSize(lockupImage.imageSize)
    announceStatus('Reset Steam banner lockup image to the default asset.')
  }

  function handleSteamBannerUseTextFallbackChange(useTextFallback: boolean) {
    setSteamBannerUseTextFallback(useTextFallback)
    announceStatus(
      useTextFallback
        ? 'Using saved text for the Steam banner lockup.'
        : 'Using the Steam banner lockup image.',
    )
  }

  function handleSteamBannerFallbackTextChange(fallbackText: string) {
    setSteamBannerFallbackText(fallbackText)
  }

  function handleSteamBannerLockupLayoutChange(
    field: SteamBannerLockupLayoutField,
    value: number,
  ) {
    setSteamBannerLockupLayout((currentLayout) =>
      updateSteamBannerLockupLayoutField(currentLayout, field, value),
    )
  }

  function handleResetSteamBannerLockupLayout() {
    setSteamBannerLockupLayout(DEFAULT_STEAM_BANNER_LOCKUP_LAYOUT)
    announceStatus('Reset Steam banner lockup layout to the default position.')
  }

  function handleSteamBannerColorChange(
    field: SteamBannerColorField,
    value: string,
  ) {
    setSteamBannerColors((currentColors) =>
      updateSteamBannerColor(currentColors, field, value),
    )
  }

  async function handleLogoAssetUpload(
    logoKey: 'developer' | 'publisher',
    event: ChangeEvent<HTMLInputElement>,
    additionalLogoId?: string,
  ) {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) {
      return
    }

    if (!isImageFile(file)) {
      announceStatus('Choose an image file for the logo asset.')
      return
    }

    try {
      const importedImage = await readImportedImageAssetFromFile(file)

      setProjectLogoAssets((currentLogoAssets) =>
        applyImportedLogoAsset(
          currentLogoAssets,
          logoKey,
          importedImage,
          selectedDiscTemplate,
          createProjectImageAssetProvenance({
            source: 'uploaded',
            sourceLabel: file.name,
          }),
          additionalLogoId,
        ),
      )

      announceStatus(
        `Using ${file.name} as the ${additionalLogoId ? `additional ${logoKey}` : logoKey} logo.`,
      )
    } catch (error) {
      announceStatus(`Logo import failed: ${String(error)}`)
    }
  }

  function handleLogoAssetLayoutChange(
    logoKey: LogoAssetKey,
    field: LogoAssetLayoutField,
    value: boolean | number,
    additionalLogoId?: string,
  ) {
    setProjectLogoAssets((currentLogoAssets) => {
      const nextLogoAssets = updateLogoAssetLayoutField(
        currentLogoAssets,
        logoKey,
        field,
        value,
        additionalLogoId,
      )
      const nextLayout = clampLogoAssetLayoutToSafeZone(
        getLogoAssetLayout(nextLogoAssets, logoKey, additionalLogoId),
        selectedDiscTemplate,
        getLogoAssetSize(nextLogoAssets, logoKey, additionalLogoId),
      )

      return setLogoAssetLayout(nextLogoAssets, logoKey, nextLayout, additionalLogoId)
    })
  }

  function handleClearLogoAsset(logoKey: LogoAssetKey, additionalLogoId?: string) {
    setProjectLogoAssets((currentLogoAssets) => {
      const nextLogoAssets = clearLogoAsset(
        currentLogoAssets,
        logoKey,
        additionalLogoId,
      )
      const nextLayout = clampLogoAssetLayoutToSafeZone(
        getLogoAssetLayout(nextLogoAssets, logoKey, additionalLogoId),
        selectedDiscTemplate,
        getLogoAssetSize(nextLogoAssets, logoKey, additionalLogoId),
      )

      return setLogoAssetLayout(nextLogoAssets, logoKey, nextLayout, additionalLogoId)
    })

    announceStatus(`Cleared ${additionalLogoId ? `additional ${logoKey}` : logoKey} logo asset.`)
  }

  function handleResetLogoAssetLayout(logoKey: LogoAssetKey, additionalLogoId?: string) {
    setProjectLogoAssets((currentLogoAssets) => {
      const nextLogoAssets = resetProjectLogoAssetLayout(
        currentLogoAssets,
        logoKey,
        selectedDiscTemplate,
        additionalLogoId,
      )
      const nextLayout = clampLogoAssetLayoutToSafeZone(
        getLogoAssetLayout(nextLogoAssets, logoKey, additionalLogoId),
        selectedDiscTemplate,
        getLogoAssetSize(nextLogoAssets, logoKey, additionalLogoId),
      )

      return setLogoAssetLayout(nextLogoAssets, logoKey, nextLayout, additionalLogoId)
    })

    announceStatus(`Reset ${additionalLogoId ? `additional ${logoKey}` : logoKey} logo layout.`)
  }

  function handleAddAdditionalLogoAsset(logoKey: LogoAssetKey) {
    setProjectLogoAssets((currentLogoAssets) =>
      addAdditionalLogoAsset(currentLogoAssets, logoKey, selectedDiscTemplate),
    )
    announceStatus(`Added an additional ${logoKey} logo.`)
  }

  function handleRemoveAdditionalLogoAsset(
    logoKey: LogoAssetKey,
    additionalLogoId: string,
  ) {
    setProjectLogoAssets((currentLogoAssets) =>
      removeAdditionalLogoAsset(currentLogoAssets, logoKey, additionalLogoId),
    )
    announceStatus(`Deleted an additional ${logoKey} logo.`)
  }

  function handleAdditionalLogoAssetLabelChange(
    logoKey: LogoAssetKey,
    additionalLogoId: string,
    label: string,
  ) {
    setProjectLogoAssets((currentLogoAssets) =>
      updateAdditionalLogoAssetLabel(
        currentLogoAssets,
        logoKey,
        additionalLogoId,
        label,
      ),
    )
  }

  async function handleRatingBadgeUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) {
      return
    }

    if (!isImageFile(file)) {
      announceStatus('Choose an image file for the rating badge.')
      return
    }

    try {
      const importedImage = await readImportedImageAssetFromFile(file)

      setProjectRatingBadge((currentBadge) =>
        applyImportedRatingBadge(
          currentBadge,
          importedImage,
          selectedDiscTemplate,
        ),
      )

      announceStatus(`Using ${file.name} as the rating badge.`)
    } catch (error) {
      announceStatus(`Rating badge import failed: ${String(error)}`)
    }
  }

  function handleRatingBadgeSourceChange(source: RatingBadgeSource) {
    setProjectRatingBadge((currentBadge) => {
      const nextBadge = updateRatingBadgeSource(currentBadge, source)

      return clampProjectRatingBadgeToSafeZone(nextBadge, selectedDiscTemplate)
    })
  }

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
      const nextMetadataBoundValues = resolveMetadataBoundDiscTextValues(
        discTextValues,
        nextState.metadata,
        discTextValueSources,
      )
      const nextResolvedTitle = resolveMetadataBoundDiscTextTitle(
        discTextTitleValue,
        nextState.metadata,
        discTextValueSources,
      )

      clampMetadataBoundDiscTextLayoutsForContent(
        [
          ...getDiscTextKeysForProjectMetadataField('ratingSystem'),
          ...getDiscTextKeysForProjectMetadataField('ratingValue'),
        ],
        nextMetadataBoundValues,
        nextResolvedTitle,
      )
    }
  }

  function handleRatingBadgeLayoutChange(
    field: RatingBadgeLayoutField,
    value: boolean | number,
  ) {
    setProjectRatingBadge((currentBadge) => {
      const nextBadge = updateRatingBadgeLayoutField(currentBadge, field, value)

      return clampProjectRatingBadgeToSafeZone(nextBadge, selectedDiscTemplate)
    })
  }

  function handleSupplementalUskRatingBadgeEnabledChange(enabled: boolean) {
    setProjectRatingBadge((currentBadge) =>
      clampProjectRatingBadgeToSafeZone(
        updateSupplementalUskRatingBadgeEnabledState(currentBadge, enabled),
        selectedDiscTemplate,
      ),
    )
  }

  function handleSupplementalUskRatingBadgeValueChange(ratingValue: string) {
    setProjectRatingBadge((currentBadge) =>
      updateSupplementalUskRatingBadgeValue(currentBadge, ratingValue),
    )
  }

  function handleSupplementalUskRatingBadgeLayoutChange(
    field: RatingBadgeLayoutField,
    value: boolean | number,
  ) {
    setProjectRatingBadge((currentBadge) =>
      clampProjectRatingBadgeToSafeZone(
        updateSupplementalUskRatingBadgeLayoutField(currentBadge, field, value),
        selectedDiscTemplate,
      ),
    )
  }

  function handleClearRatingBadgeImage() {
    setProjectRatingBadge((currentBadge) => {
      const nextBadge = clearRatingBadgeImage(currentBadge)

      return clampProjectRatingBadgeToSafeZone(nextBadge, selectedDiscTemplate)
    })

    announceStatus('Cleared custom rating badge image.')
  }

  function handleResetRatingBadgeLayout() {
    setProjectRatingBadge((currentBadge) => {
      const nextBadge = resetProjectRatingBadgeLayout(
        currentBadge,
        selectedDiscTemplate,
      )

      return clampProjectRatingBadgeToSafeZone(nextBadge, selectedDiscTemplate)
    })

    announceStatus('Reset rating badge layout.')
  }

  function handleResetSupplementalUskRatingBadgeLayout() {
    setProjectRatingBadge((currentBadge) =>
      clampProjectRatingBadgeToSafeZone(
        resetSupplementalUskRatingBadgeLayout(
          currentBadge,
          selectedDiscTemplate,
        ),
        selectedDiscTemplate,
      ),
    )

    announceStatus('Reset additional USK badge layout.')
  }

  async function handleMediaMarkUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) {
      return
    }

    if (!isImageFile(file)) {
      announceStatus('Choose an image file for the media mark.')
      return
    }

    try {
      const importedImage = await readImportedImageAssetFromFile(file)

      setProjectMediaMark((currentMark) =>
        applyImportedMediaMark(
          currentMark,
          importedImage,
          selectedDiscTemplate,
        ),
      )

      announceStatus(`Using ${file.name} as the media mark.`)
    } catch (error) {
      announceStatus(`Media mark import failed: ${String(error)}`)
    }
  }

  function handleMediaMarkValueChange(value: MediaMarkValue) {
    setProjectMediaMark((currentMark) =>
      updateMediaMarkValue(currentMark, value),
    )
  }

  function handleMediaMarkSourceChange(source: MediaMarkSource) {
    setProjectMediaMark((currentMark) => {
      const nextMark = updateMediaMarkSource(currentMark, source)

      return {
        ...nextMark,
        layout: clampMediaMarkLayoutToSafeZone(nextMark, selectedDiscTemplate),
      }
    })
  }

  function handleMediaMarkThemeChange(theme: MediaMarkTheme) {
    setProjectMediaMark((currentMark) =>
      updateMediaMarkTheme(currentMark, theme),
    )
  }

  function handleMediaMarkLayoutChange(
    field: MediaMarkLayoutField,
    value: boolean | number,
  ) {
    setProjectMediaMark((currentMark) => {
      const nextMark = updateMediaMarkLayoutField(currentMark, field, value)

      return {
        ...nextMark,
        layout: clampMediaMarkLayoutToSafeZone(nextMark, selectedDiscTemplate),
      }
    })
  }

  function handleClearMediaMarkImage() {
    setProjectMediaMark((currentMark) => {
      const nextMark = clearMediaMarkImage(currentMark)

      return {
        ...nextMark,
        layout: clampMediaMarkLayoutToSafeZone(nextMark, selectedDiscTemplate),
      }
    })

    announceStatus('Cleared custom media mark image.')
  }

  function handleResetMediaMarkLayout() {
    setProjectMediaMark((currentMark) => {
      const nextMark = resetProjectMediaMarkLayout(
        currentMark,
        selectedDiscTemplate,
      )

      return {
        ...nextMark,
        layout: clampMediaMarkLayoutToSafeZone(nextMark, selectedDiscTemplate),
      }
    })

    announceStatus('Reset media mark layout.')
  }

  function handlePlatformMarkToggle(value: PlatformMarkValue, enabled: boolean) {
    setProjectPlatformMarks((currentMarks) => {
      const nextMarks = clampProjectPlatformMarksToSafeZone(
        updatePlatformMarkToggle(
          currentMarks,
          value,
          enabled,
          selectedDiscTemplate,
        ),
        selectedDiscTemplate,
      )

      return markProjectPlatformMarksManual(nextMarks, selectedSteamGame?.appId ?? null)
    })
  }

  async function handlePlatformMarkUpload(
    value: PlatformMarkValue,
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) {
      return
    }

    if (!isImageFile(file)) {
      announceStatus('Choose an image file for the platform mark.')
      return
    }

    try {
      const importedImage = await readImportedImageAssetFromFile(file)

      setProjectPlatformMarks((currentMarks) => {
        const nextMarks = applyImportedPlatformMark(
          currentMarks,
          value,
          importedImage,
          selectedDiscTemplate,
        )

        return markProjectPlatformMarksManual(nextMarks, selectedSteamGame?.appId ?? null)
      })

      announceStatus(`Using ${file.name} as the platform mark.`)
    } catch (error) {
      announceStatus(`Platform mark import failed: ${String(error)}`)
    }
  }

  function handlePlatformMarkSourceChange(value: PlatformMarkValue, source: PlatformMarkSource) {
    setProjectPlatformMarks((currentMarks) => {
      const nextMarks = clampProjectPlatformMarksToSafeZone(
        updatePlatformMarkSource(currentMarks, value, source),
        selectedDiscTemplate,
      )

      return markProjectPlatformMarksManual(nextMarks, selectedSteamGame?.appId ?? null)
    })
  }

  function handlePlatformMarkThemeChange(value: PlatformMarkValue, theme: PlatformMarkTheme) {
    setProjectPlatformMarks((currentMarks) => {
      const nextMarks = updatePlatformMarkTheme(
        currentMarks,
        value,
        theme,
        selectedDiscTemplate,
      )

      return markProjectPlatformMarksManual(nextMarks, selectedSteamGame?.appId ?? null)
    })
  }

  function handlePlatformMarkLayoutChange(
    platformValue: PlatformMarkValue,
    field: PlatformMarkLayoutField,
    layoutValue: boolean | number,
  ) {
    setProjectPlatformMarks((currentMarks) => {
      const nextMarks = clampProjectPlatformMarksToSafeZone(
        updatePlatformMarkLayoutField(currentMarks, platformValue, field, layoutValue),
        selectedDiscTemplate,
      )

      return markProjectPlatformMarksManual(nextMarks, selectedSteamGame?.appId ?? null)
    })
  }

  function handleClearPlatformMarkImage(value: PlatformMarkValue) {
    setProjectPlatformMarks((currentMarks) => {
      const nextMarks = clampProjectPlatformMarksToSafeZone(
        clearPlatformMarkImage(currentMarks, value),
        selectedDiscTemplate,
      )

      return markProjectPlatformMarksManual(nextMarks, selectedSteamGame?.appId ?? null)
    })

    announceStatus('Cleared custom platform mark image.')
  }

  function handleResetPlatformMarkLayout(value: PlatformMarkValue) {
    setProjectPlatformMarks((currentMarks) => {
      const nextMarks = clampProjectPlatformMarksToSafeZone(
        resetProjectPlatformMarkLayout(currentMarks, value, selectedDiscTemplate),
        selectedDiscTemplate,
      )

      return markProjectPlatformMarksManual(nextMarks, selectedSteamGame?.appId ?? null)
    })

    announceStatus('Reset platform mark layout.')
  }

  function handleResetSteamBannerColors() {
    setSteamBannerColors(DEFAULT_STEAM_BANNER_COLORS)
    announceStatus('Reset Steam banner colors to the default palette.')
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

    setDiscTextLayout((currentLayout) => {
      return clampDiscTextLayoutToSafeZone(
        updateDiscTextLayoutForSteamLogoPlacement(
          currentLayout,
          placement,
          selectedDiscTemplate,
        ),
        selectedDiscTemplate,
      )
    })

    resetTitleArtworkLayoutForPlacement(placement)
  }

  function handleDiscTextToggle(key: DiscTextKey, checked: boolean) {
    setDiscTextSettings((currentSettings) =>
      updateDiscTextSetting(currentSettings, key, checked),
    )
  }

  function clampDiscTextLayoutForContent(key: DiscTextKey, renderedText: string) {
    setDiscTextLayout((currentLayout) => {
      const currentTextLayout = currentLayout[key]

      if (isCurvedCopyrightDiscTextLayout(key, currentTextLayout)) {
        return currentLayout
      }

      return {
        ...currentLayout,
        [key]: clampStraightDiscTextLayoutToSafeZone(
          key,
          currentTextLayout,
          selectedDiscTemplate,
          renderedText,
        ),
      }
    })
  }

  function clampMetadataBoundDiscTextLayoutsForContent(
    keys: MetadataBoundDiscTextKey[],
    values: DiscTextValues,
    title: string,
    sources: DiscTextValueSources = discTextValueSources,
  ) {
    for (const key of keys) {
      if (sources[key] === 'manual') {
        continue
      }

      clampDiscTextLayoutForContent(
        key,
        getDiscTextContent(key, values, title),
      )
    }
  }

  function handleDiscTextContentChange(key: DiscTextKey, value: string) {
    const nextInputUpdate = updateDiscTextInputValue(
      discTextValues,
      discTextValueSources,
      key,
      value,
      discTextTitleValue,
    )
    const nextMetadataBoundValues = resolveMetadataBoundDiscTextValues(
      nextInputUpdate.values,
      projectMetadata,
      nextInputUpdate.sources,
    )
    const nextResolvedTitle = resolveMetadataBoundDiscTextTitle(
      nextInputUpdate.titleValue,
      projectMetadata,
      nextInputUpdate.sources,
    )

    if (isMetadataBoundDiscTextKey(key)) {
      setDiscTextValueSources(nextInputUpdate.sources)
    }
    setDiscTextValues(nextInputUpdate.values)
    setDiscTextTitleValue(nextInputUpdate.titleValue)
    clampDiscTextLayoutForContent(
      key,
      getDiscTextContent(key, nextMetadataBoundValues, nextResolvedTitle),
    )
  }

  function handleUseMetadataDiscTextValue(key: MetadataBoundDiscTextKey) {
    const nextInputUpdate = updateDiscTextInputValue(
      discTextValues,
      discTextValueSources,
      key,
      '',
      discTextTitleValue,
    )
    const nextMetadataBoundValues = resolveMetadataBoundDiscTextValues(
      nextInputUpdate.values,
      projectMetadata,
      nextInputUpdate.sources,
    )
    const nextResolvedTitle = resolveMetadataBoundDiscTextTitle(
      nextInputUpdate.titleValue,
      projectMetadata,
      nextInputUpdate.sources,
    )

    setDiscTextValueSources(nextInputUpdate.sources)
    setDiscTextValues(nextInputUpdate.values)
    setDiscTextTitleValue(nextInputUpdate.titleValue)
    clampDiscTextLayoutForContent(
      key,
      getDiscTextContent(key, nextMetadataBoundValues, nextResolvedTitle),
    )
  }

  function getCurrentDiscTextContent(key: DiscTextKey) {
    return getDiscTextContent(key, metadataBoundDiscTextValues, resolvedDiscTextTitle)
  }

  function handleDiscTextLayoutChange(
    key: DiscTextKey,
    field: DiscTextLayoutNumericField,
    value: number,
  ) {
    setDiscTextLayout((currentLayout) => {
      const nextLayout = updateDiscTextLayoutField(currentLayout, key, field, value)

      return {
        ...nextLayout,
        [key]: clampStraightDiscTextLayoutToSafeZone(
          key,
          nextLayout[key],
          selectedDiscTemplate,
          getCurrentDiscTextContent(key),
        ),
      }
    })
  }

  function handleDiscTextAlignmentChange(key: DiscTextKey, align: DiscTextAlignment) {
    setDiscTextLayout((currentLayout) => {
      const nextLayout = updateDiscTextAlignment(currentLayout, key, align)
      const nextTextLayout = nextLayout[key]

      return {
        ...nextLayout,
        [key]: isCurvedCopyrightDiscTextLayout(key, nextTextLayout)
          ? nextTextLayout
          : clampStraightDiscTextLayoutToSafeZone(
              key,
              nextTextLayout,
              selectedDiscTemplate,
              getCurrentDiscTextContent(key),
            ),
      }
    })
  }

  function handleDiscTextModeChange(key: DiscTextKey, mode: DiscTextMode) {
    setDiscTextLayout((currentLayout) => {
      const nextLayout = updateDiscTextMode(
        currentLayout,
        key,
        mode,
        steamLogoPlacement,
        selectedDiscTemplate,
      )

      return {
        ...nextLayout,
        [key]: clampStraightDiscTextLayoutToSafeZone(
          key,
          nextLayout[key],
          selectedDiscTemplate,
          getCurrentDiscTextContent(key),
        ),
      }
    })
  }

  function handleDiscTextArcSideChange(key: DiscTextKey, arcSide: DiscTextArcSide) {
    setDiscTextLayout((currentLayout) =>
      updateDiscTextArcSide(currentLayout, key, arcSide),
    )
  }

  function handleDiscTextVisualAvoidanceChange(
    key: DiscTextKey,
    avoidVisualElements: boolean,
  ) {
    setDiscTextLayout((currentLayout) =>
      updateDiscTextVisualAvoidance(
        currentLayout,
        key,
        avoidVisualElements,
      ),
    )
  }

  function handleResetDiscTextLayout(key: DiscTextKey) {
    setDiscTextLayout((currentLayout) => {
      const nextLayout = resetDiscTextLayout(
        currentLayout,
        key,
        steamLogoPlacement,
        selectedDiscTemplate,
      )

      return {
        ...nextLayout,
        [key]: clampStraightDiscTextLayoutToSafeZone(
          key,
          nextLayout[key],
          selectedDiscTemplate,
          getCurrentDiscTextContent(key),
        ),
      }
    })
  }

  function handleDiscTextStyleChange(
    key: DiscTextKey,
    field: DiscTextStyleField,
    value: DiscTextStyleValue,
  ) {
    setDiscTextStyles((currentStyles) =>
      updateDiscTextStyleField(currentStyles, key, field, value),
    )
  }

  function handleResetDiscTextStyle(key: DiscTextKey) {
    setDiscTextStyles((currentStyles) => resetDiscTextStyle(currentStyles, key))
  }

  function handleApplyDiscTextStylePreset(key: DiscTextKey, presetId: string) {
    setDiscTextStyles((currentStyles) =>
      applyDiscTextStylePreset(currentStyles, key, presetId),
    )
  }

  function handleDiscNumberArtworkModeChange(mode: DiscNumberArtworkMode) {
    setProjectDiscNumberArtwork((currentArtwork) =>
      updateDiscNumberArtworkMode(currentArtwork, mode),
    )
  }

  function handleDiscNumberArtworkBadgeSetChange(badgeSet: DiscNumberBadgeSet) {
    setProjectDiscNumberArtwork((currentArtwork) =>
      updateDiscNumberArtworkBadgeSet(currentArtwork, badgeSet),
    )
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
    const affectedTextKeys = (Object.keys(fields) as Array<keyof ProjectMetadata>)
      .flatMap((field) => getDiscTextKeysForProjectMetadataField(field))
    const nextMetadataBoundValues = resolveMetadataBoundDiscTextValues(
      discTextValues,
      nextProjectMetadata,
      discTextValueSources,
    )
    const nextResolvedTitle = resolveMetadataBoundDiscTextTitle(
      discTextTitleValue,
      nextProjectMetadata,
      discTextValueSources,
    )

    setProjectMetadata(nextProjectMetadata)

    if (typeof fields.title === 'string') {
      setManualGameTitle(fields.title)
    }

    clampMetadataBoundDiscTextLayoutsForContent(
      affectedTextKeys,
      nextMetadataBoundValues,
      nextResolvedTitle,
    )
  }

  function handleProjectMetadataChange(field: keyof ProjectMetadata, value: string) {
    handleProjectMetadataFieldsChange({ [field]: value } as Partial<ProjectMetadata>)
  }

  function setRatingBadgeEnabledForAppliedCandidate(candidate: RatingBoardCandidate) {
    setRatingBadgeEnabled(candidate.applyKind !== 'none' && candidate.ratingSystem !== 'none')
  }

  function setRatingBadgeEnabled(enabled: boolean) {
    setProjectRatingBadge((currentBadge) => {
      const nextBadge = {
        ...currentBadge,
        layout: {
          ...currentBadge.layout,
          enabled,
        },
      }

      return clampProjectRatingBadgeToSafeZone(nextBadge, selectedDiscTemplate)
    })
  }

  function enableCurvedCopyrightDiscText() {
    setDiscTextValueSources((currentSources) => ({
      ...currentSources,
      copyright: 'metadata',
    }))
    setDiscTextSettings((currentSettings) =>
      updateDiscTextSetting(currentSettings, 'copyright', true),
    )
    setDiscTextLayout((currentLayout) =>
      updateDiscTextMode(
        currentLayout,
        'copyright',
        'curved',
        steamLogoPlacement,
        selectedDiscTemplate,
      ),
    )
  }

  function setCopyrightDiscTextEnabled(enabled: boolean) {
    setDiscTextSettings((currentSettings) =>
      updateDiscTextSetting(currentSettings, 'copyright', enabled),
    )
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

  function isRatingMetadataDefault(metadata: ProjectMetadata) {
    return metadata.ratingSystem === 'none' && metadata.ratingValue.trim() === ''
  }

  function getAutoApplyRatingCandidateForMetadata(
    result: SteamMetadataCandidateDiscoveryResult,
    metadata: ProjectMetadata,
    allowReplaceExisting: boolean,
  ) {
    const candidate = getAutoApplyRatingCandidate(result.ratingCandidates)

    if (!candidate) return null
    if (allowReplaceExisting || isRatingMetadataDefault(metadata)) return candidate

    return null
  }

  function getAutoApplyLegalCandidateForMetadata(
    result: SteamMetadataCandidateDiscoveryResult,
    metadata: ProjectMetadata,
    allowReplaceExisting: boolean,
  ) {
    const candidate = getAutoApplyLegalTextCandidate(result.legalCandidates)

    if (!candidate) return null
    if (allowReplaceExisting || metadata.copyrightText.trim() === '') return candidate

    return null
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
    setSteamBannerColors(DEFAULT_STEAM_BANNER_COLORS)
    const defaultLockupImage = createDefaultSteamBannerLockupImageState()
    setSteamBannerLockupImageUrl(defaultLockupImage.imageUrl)
    setSteamBannerLockupImageSource(createProjectImageAssetProvenance({
      source: 'built-in',
      sourceLabel: 'Default Steam banner lockup',
    }))
    setSteamBannerLockupImageSize(defaultLockupImage.imageSize)
    setSteamBannerLockupLayout(DEFAULT_STEAM_BANNER_LOCKUP_LAYOUT)
    setSteamBannerUseTextFallback(false)
    setSteamBannerFallbackText(DEFAULT_STEAM_BANNER_FALLBACK_TEXT)
    setExportGuides(DEFAULT_EXPORT_GUIDES)
    const emptyBackground = createEmptyBackgroundImageState()
    setBackgroundImageUrl(emptyBackground.imageUrl)
    setBackgroundImageSource(null)
    setBackgroundImageSize(emptyBackground.imageSize)
    setBackgroundScale(emptyBackground.scale)
    setBackgroundOffset(emptyBackground.offset)
    setIsBackgroundArtworkEnabled(true)
    setGameSearchQuery('')
    setManualGameTitle('Untitled Steam Backup Label')
    setProjectMetadata(createDefaultProjectMetadata())
    setProjectLogoAssets(
      createDefaultProjectLogoAssets(discTemplates.standardPrintableDisc),
    )
    resetProjectTitleArtwork(discTemplates.standardPrintableDisc, 'top')
    setProjectDiscNumberArtwork(createDefaultProjectDiscNumberArtwork())
    resetProjectAdditionalArtwork()
    setProjectRatingBadge(
      createDefaultProjectRatingBadge(discTemplates.standardPrintableDisc),
    )
    setProjectMediaMark(
      createDefaultProjectMediaMark(discTemplates.standardPrintableDisc),
    )
    setProjectPlatformMarks(createDefaultProjectPlatformMarks())
    resetProjectTechnicalMarks()
    setSteamSearchResults([])
    setSelectedSteamGame(null)
    setIsSteamSearchLoading(false)
    setIsSteamImportLoading(false)
    setSelectedArtworkId(null)
    setLocalSteamScreenshots([])
    setHasCheckedLocalSteamScreenshots(false)
    setIsLocalSteamScreenshotsLoading(false)
    setIsArtworkLoading(false)
    setDiscTextSettings(DEFAULT_DISC_TEXT_SETTINGS)
    setDiscTextValues(createDefaultDiscTextValues())
    setDiscTextValueSources(createDefaultDiscTextValueSources())
    setDiscTextTitleValue('')
    setDiscTextLayout(
      createDefaultDiscTextLayout('top', discTemplates.standardPrintableDisc),
    )
    setDiscTextStyles(createDefaultDiscTextStyles())
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
    setActiveWorkspace('caseInsert')
    setHomeStatusMessage(null)
    announceStatus('Case Insert Editor is ready for the jewel case foundation pass.')
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
      const nextDiscTextValueSources = shouldUpdateCopyrightDiscTextSource
        ? {
            ...discTextValueSources,
            copyright: 'metadata' as const,
          }
        : discTextValueSources
      const nextDiscTextValuesBase = applySteamGameImportToDiscTextValues(
        importedState.importedGame,
        discTextValues,
        nextDiscTextValueSources,
      )
      const nextDiscTextValues = shouldUpdateCopyrightDiscTextSource
        ? {
            ...nextDiscTextValuesBase,
            copyright: '',
          }
        : nextDiscTextValuesBase
      const nextMetadataBoundValues = resolveMetadataBoundDiscTextValues(
        nextDiscTextValues,
        nextProjectMetadataWithAutoApply,
        nextDiscTextValueSources,
      )
      const nextResolvedTitle = resolveMetadataBoundDiscTextTitle(
        discTextTitleValue,
        nextProjectMetadataWithAutoApply,
        nextDiscTextValueSources,
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
      setDiscTextValues(nextDiscTextValues)
      if (shouldUpdateCopyrightDiscTextSource) {
        setDiscTextValueSources(nextDiscTextValueSources)
      }
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
      clampDiscTextLayoutForContent('title', nextResolvedTitle)
      clampMetadataBoundDiscTextLayoutsForContent(
        [
          ...getDiscTextKeysForProjectMetadataField('steamAppId'),
          ...getDiscTextKeysForProjectMetadataField('developer'),
          ...getDiscTextKeysForProjectMetadataField('publisher'),
          ...getDiscTextKeysForProjectMetadataField('copyrightText'),
        ],
        nextMetadataBoundValues,
        nextResolvedTitle,
        nextDiscTextValueSources,
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
        defaultPath: 'steam-backup-label.sbls.json',
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

      const project = createProjectSnapshot({
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
        setActiveWorkspace('caseInsert')
        setHomeStatusMessage(null)
        announceStatus(
          'Loaded a case insert project shell. Jewel case editing is not implemented yet.',
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
      setProjectDiscNumberArtwork(restoredProject.projectDiscNumberArtwork)
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
      setDiscTextSettings(restoredProject.discTextSettings)
      setDiscTextValues(restoredProject.discTextValues)
      setDiscTextValueSources(restoredProject.discTextValueSources)
      setDiscTextTitleValue(restoredProject.discTextTitleValue)
      setDiscTextLayout(restoredProject.discTextLayout)
      setDiscTextStyles(restoredProject.discTextStyles)
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

  async function handleBackgroundUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    try {
      applyBackgroundImageImport(await createUploadedBackgroundImageImport(file))
    } catch (error) {
      announceStatus(
        error instanceof BackgroundImageLoadError
          ? 'Background image could not be loaded.'
          : 'Background image could not be read.',
      )
    }
  }

  function handleResetBackground() {
    setBackgroundScale(DEFAULT_BACKGROUND_SCALE)
    setBackgroundOffset(createDefaultBackgroundOffset())
  }

  function handleBackgroundArtworkEnabledChange(enabled: boolean) {
    setIsBackgroundArtworkEnabled(enabled)
  }

  function handleBackgroundScaleChange(value: number) {
    const nextScale = updateBackgroundScale(value)

    setBackgroundScale(nextScale)
    setBackgroundOffset((currentOffset) =>
      clampBackgroundOffsetToImageBounds(
        currentOffset,
        backgroundImageSize,
        nextScale,
        discPreviewSize,
      ),
    )
  }

  function handleBackgroundOffsetChange(
    field: BackgroundOffsetField,
    value: number,
  ) {
    setBackgroundOffset((currentOffset) =>
      updateBackgroundOffsetField(
        currentOffset,
        field,
        value,
        backgroundImageSize,
        backgroundScale,
        discPreviewSize,
      ),
    )
  }

  function handleFitBackgroundToSteamBannerOpenArea() {
    const fit = getBackgroundFitToSteamBannerOpenArea({
      imageSize: backgroundImageSize,
      previewSize: discPreviewSize,
      steamLogoPlacement,
    })

    if (!fit) {
      announceStatus('Choose a background image before fitting the background.')
      return
    }

    setBackgroundScale(updateBackgroundScale(fit.scale))
    setBackgroundOffset(fit.offset)
    announceStatus(
      steamLogoPlacement === 'none'
        ? 'Fit background edge to edge.'
        : 'Fit background between the Steam banner and disc edge.',
    )
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
      <CaseInsertPlaceholder
        onMainMenu={handleReturnToHome}
        onNewDisc={handleStartNewDiscProject}
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
        backgroundImageUrl={effectiveBackgroundImageUrl}
        backgroundPreviewSize={backgroundPreviewSize}
        backgroundOffset={backgroundOffset}
        backgroundScale={backgroundScale}
        handleBackgroundPointerDown={handleBackgroundPointerDown}
        handleBackgroundPointerMove={handleBackgroundPointerMove}
        handleBackgroundPointerUp={handleBackgroundPointerUp}
        steamLogoPlacement={steamLogoPlacement}
        steamBannerColors={steamBannerColors}
        steamBannerLockupImageUrl={steamBannerLockupImageUrl}
        steamBannerLockupImageSize={steamBannerLockupImageSize}
        steamBannerLockupLayout={steamBannerLockupLayout}
        steamBannerUseTextFallback={steamBannerUseTextFallback}
        steamBannerFallbackText={steamBannerFallbackText}
        projectLogoAssets={projectLogoAssets}
        projectTitleArtwork={projectTitleArtwork}
        projectDiscNumberArtwork={projectDiscNumberArtwork}
        projectAdditionalArtwork={projectAdditionalArtwork}
        projectMetadata={projectMetadata}
        projectRatingBadge={projectRatingBadge}
        projectMediaMark={projectMediaMark}
        projectPlatformMarks={projectPlatformMarks}
        projectTechnicalMarks={projectTechnicalMarks}
        handleRatingBadgePointerDown={handleRatingBadgePointerDown}
        handleRatingBadgePointerMove={handleRatingBadgePointerMove}
        handleRatingBadgePointerUp={handleRatingBadgePointerUp}
        handleMediaMarkPointerDown={handleMediaMarkPointerDown}
        handleMediaMarkPointerMove={handleMediaMarkPointerMove}
        handleMediaMarkPointerUp={handleMediaMarkPointerUp}
        handlePlatformMarkPointerDown={handlePlatformMarkPointerDown}
        handlePlatformMarkPointerMove={handlePlatformMarkPointerMove}
        handlePlatformMarkPointerUp={handlePlatformMarkPointerUp}
        handleTechnicalMarkPointerDown={handleTechnicalMarkPointerDown}
        handleTechnicalMarkPointerMove={handleTechnicalMarkPointerMove}
        handleTechnicalMarkPointerUp={handleTechnicalMarkPointerUp}
        handleLogoAssetPointerDown={handleLogoAssetPointerDown}
        handleLogoAssetPointerMove={handleLogoAssetPointerMove}
        handleLogoAssetPointerUp={handleLogoAssetPointerUp}
        handleTitleArtworkPointerDown={handleTitleArtworkPointerDown}
        handleTitleArtworkPointerMove={handleTitleArtworkPointerMove}
        handleTitleArtworkPointerUp={handleTitleArtworkPointerUp}
        handleAdditionalArtworkPointerDown={handleAdditionalArtworkPointerDown}
        handleAdditionalArtworkPointerMove={handleAdditionalArtworkPointerMove}
        handleAdditionalArtworkPointerUp={handleAdditionalArtworkPointerUp}
        discTextSettings={discTextSettings}
        discTextValues={discTextValues}
        discTextValueSources={discTextValueSources}
        discTextStyles={discTextStyles}
        manualGameTitle={resolvedDiscTextTitle}
        discTextLayout={discTextLayout}
        selectedDiscTemplate={selectedDiscTemplate}
        getDiscTextPreviewTransform={getDiscTextPreviewTransform}
        handleDiscTextPointerDown={handleDiscTextPointerDown}
        handleDiscTextPointerMove={handleDiscTextPointerMove}
        handleDiscTextPointerUp={handleDiscTextPointerUp}
        innerPrintableBoundaryPercent={innerPrintableBoundaryPercent}
        printableInsetPercent={printableInsetPercent}
        safeInsetPercent={safeInsetPercent}
        physicalCenterHolePercent={physicalCenterHolePercent}
      />
    </main>
  )
}

export default App
