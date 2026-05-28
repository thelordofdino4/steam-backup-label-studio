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
  clampProjectPlatformMarksToSafeZone,
  clampRatingBadgeLayoutToSafeZone,
  clampStraightDiscTextLayoutToSafeZone,
} from './layout/discElementSafeZone'
import { DEFAULT_EXPORT_GUIDES, setExportGuideSelection, type ExportGuideKey, type ExportGuideSelection } from './exportGuides'
import './App.css'
import './layoutFix.css'
import { DiscPreview } from './components/preview/DiscPreview'
import { ArtworkPanel } from './components/sidebar/ArtworkPanel'
import { BrandingPanel } from './components/sidebar/BrandingPanel'
import { ExportOptionsPanel } from './components/sidebar/ExportOptionsPanel'
import { GamePanel } from './components/sidebar/GamePanel'
import { GuideLegendPanel } from './components/sidebar/GuideLegendPanel'
import { ProjectPanel } from './components/sidebar/ProjectPanel'
import { TemplatePanel } from './components/sidebar/TemplatePanel'
import { TextPanel } from './components/sidebar/TextPanel'
import { useStatusToasts } from './hooks/useStatusToasts'
import {
  BackgroundImageLoadError,
  createLocalSteamScreenshotBackgroundImport,
  createSteamArtworkBackgroundImport,
  createUploadedBackgroundImageImport,
  type BackgroundImageImportResult,
} from './backgroundImageImport'
import { createProjectSnapshot } from './project/createProjectSnapshot'
import { restoreProjectStateFromContents } from './project/restoreProjectState'
import { createDefaultProjectMetadata, updateProjectMetadataField } from './project/projectMetadata'
import {
  createDefaultDiscTextValueSources,
  getDiscTextKeysForProjectMetadataField,
  isMetadataBoundDiscTextKey,
  resolveMetadataBoundDiscTextValues,
  updateDiscTextInputValue,
  type DiscTextValueSources,
  type MetadataBoundDiscTextKey,
} from './project/metadataDiscText'
import { clearLogoAsset, createDefaultProjectLogoAssets, getLogoAssetLayout, getLogoAssetSize, resetProjectLogoAssetLayout, setLogoAssetLayout, updateLogoAssetLayoutField, type LogoAssetKey, type LogoAssetLayoutField } from './project/projectLogoAssets'
import { clearMediaMarkImage, clearPlatformMarkImage, createDefaultProjectMediaMark, createDefaultProjectPlatformMarks, resetProjectMediaMarkLayout, resetProjectPlatformMarkLayout, updateMediaMarkLayoutField, updateMediaMarkSource, updateMediaMarkValue, updatePlatformMarkLayoutField, updatePlatformMarkSource, updatePlatformMarkToggle, type MediaMarkLayoutField, type PlatformMarkLayoutField } from './project/projectMediaMark'
import { clearRatingBadgeImage, createDefaultProjectRatingBadge, resetProjectRatingBadgeLayout, updateRatingBadgeLayoutField, updateRatingBadgeSource, type RatingBadgeLayoutField } from './project/projectRatingBadge'
import {
  applyImportedLogoAsset,
  applyImportedMediaMark,
  applyImportedPlatformMark,
  applyImportedRatingBadge,
} from './project/projectVisualAssetImport'
import type { BackgroundImageSize, BackgroundOffset, MediaMarkSource, MediaMarkValue, PlatformMarkSource, PlatformMarkValue, ProjectLogoAssets, ProjectMediaMark, ProjectMetadata, ProjectPlatformMarks, ProjectRatingBadge, RatingBadgeSource, SelectedDiscTemplateId, SteamBannerColors, SteamBannerLockupLayout } from './project/projectTypes'
import { readProjectFile, writeBinaryFile, writeProjectFile } from './tauri/fileSystem'
import { loadImage } from './export/canvasImage'
import { exportDiscLabelPngBytes } from './export/exportPng'
import { buildExportPreflightSummary } from './export/exportPreflight'
import { getNaturalImageSize } from './utils/imageFile'
import {
  DEFAULT_STEAM_BANNER_COLORS,
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
  createEmptyBackgroundImageState,
  createDefaultBackgroundOffset,
  getBackgroundPreviewSize,
  updateBackgroundScale,
} from './backgroundImage'
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

type CustomDimensionKey =
  | 'outerDiameterMm'
  | 'physicalCenterHoleDiameterMm'
  | 'innerHoleDiameterMm'
  | 'printableDiameterMm'
  | 'safeDiameterMm'

function App() {
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
  const [steamBannerLockupImageSize, setSteamBannerLockupImageSize] =
    useState<BackgroundImageSize | null>(null)
  const [steamBannerLockupLayout, setSteamBannerLockupLayout] =
    useState<SteamBannerLockupLayout>(DEFAULT_STEAM_BANNER_LOCKUP_LAYOUT)
  const [exportGuides, setExportGuides] = useState<ExportGuideSelection>(
    DEFAULT_EXPORT_GUIDES,
  )
  const [backgroundImageUrl, setBackgroundImageUrl] = useState<string | null>(null)
  const [backgroundImageSize, setBackgroundImageSize] =
    useState<BackgroundImageSize | null>(null)
  const [backgroundScale, setBackgroundScale] = useState(DEFAULT_BACKGROUND_SCALE)
  const [backgroundOffset, setBackgroundOffset] = useState<BackgroundOffset>({
    ...createDefaultBackgroundOffset(),
  })
  const { projectStatus, statusToasts, announceStatus } = useStatusToasts()
  const [gameSearchQuery, setGameSearchQuery] = useState('')
  const [manualGameTitle, setManualGameTitle] = useState('Untitled Steam Backup Label')
  const [projectMetadata, setProjectMetadata] = useState<ProjectMetadata>(() =>
    createDefaultProjectMetadata(),
  )
  const [projectLogoAssets, setProjectLogoAssets] = useState<ProjectLogoAssets>(() =>
    createDefaultProjectLogoAssets(),
  )
  const [projectRatingBadge, setProjectRatingBadge] = useState<ProjectRatingBadge>(() =>
    createDefaultProjectRatingBadge(),
  )
  const [projectMediaMark, setProjectMediaMark] = useState<ProjectMediaMark>(() =>
    createDefaultProjectMediaMark(),
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
  const [discTextLayout, setDiscTextLayout] = useState<DiscTextLayoutSettings>(() =>
    createDefaultDiscTextLayout('top'),
  )

  const discPreviewRef = useRef<HTMLDivElement | null>(null)
  const selectedDiscTemplate =
    selectedDiscTemplateId === 'custom'
      ? customDiscTemplate
      : discTemplates[selectedDiscTemplateId]
  const isCustomDiscTemplate = selectedDiscTemplateId === 'custom'
  const backgroundPreviewSize = useMemo(
    () => getBackgroundPreviewSize(backgroundImageSize),
    [backgroundImageSize],
  )
  const metadataBoundDiscTextValues = useMemo(
    () =>
      resolveMetadataBoundDiscTextValues(
        discTextValues,
        projectMetadata,
        discTextValueSources,
      ),
    [discTextValues, discTextValueSources, projectMetadata],
  )

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
    handleRatingBadgePointerDown,
    handleRatingBadgePointerMove,
    handleRatingBadgePointerUp,
    handleMediaMarkPointerDown,
    handleMediaMarkPointerMove,
    handleMediaMarkPointerUp,
    handlePlatformMarkPointerDown,
    handlePlatformMarkPointerMove,
    handlePlatformMarkPointerUp,
  } = useDiscPreviewPointerDrag({
    discPreviewRef,
    selectedDiscTemplate,
    backgroundImageUrl,
    backgroundOffset,
    setBackgroundOffset,
    discTextLayout,
    setDiscTextLayout,
    projectLogoAssets,
    setProjectLogoAssets,
    projectRatingBadge,
    setProjectRatingBadge,
    projectMediaMark,
    setProjectMediaMark,
    projectPlatformMarks,
    setProjectPlatformMarks,
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
    setProjectLogoAssets((currentLogoAssets) => {
      const developerLogoLayout = clampLogoAssetLayoutToSafeZone(
        currentLogoAssets.developerLogoLayout,
        template,
        currentLogoAssets.developerLogoSize,
      )
      const publisherLogoLayout = clampLogoAssetLayoutToSafeZone(
        currentLogoAssets.publisherLogoLayout,
        template,
        currentLogoAssets.publisherLogoSize,
      )

      if (
        developerLogoLayout.x === currentLogoAssets.developerLogoLayout.x &&
        developerLogoLayout.y === currentLogoAssets.developerLogoLayout.y &&
        publisherLogoLayout.x === currentLogoAssets.publisherLogoLayout.x &&
        publisherLogoLayout.y === currentLogoAssets.publisherLogoLayout.y
      ) {
        return currentLogoAssets
      }

      return {
        ...currentLogoAssets,
        developerLogoLayout,
        publisherLogoLayout,
      }
    })

    setProjectRatingBadge((currentBadge) => {
      const layout = clampRatingBadgeLayoutToSafeZone(currentBadge, template)

      if (
        layout.x === currentBadge.layout.x &&
        layout.y === currentBadge.layout.y
      ) {
        return currentBadge
      }

      return {
        ...currentBadge,
        layout,
      }
    })

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
    setBackgroundImageSize(importedBackground.background.imageSize)
    setBackgroundScale(importedBackground.background.scale)
    setBackgroundOffset(importedBackground.background.offset)
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
      setSteamBannerLockupImageSize(lockupImage.imageSize)
      announceStatus(`Using ${file.name} as the Steam banner lockup.`)
    } catch (error) {
      announceStatus(`Banner lockup import failed: ${String(error)}`)
    }
  }

  function handleClearSteamBannerLockup() {
    const lockupImage = createDefaultSteamBannerLockupImageState()
    setSteamBannerLockupImageUrl(lockupImage.imageUrl)
    setSteamBannerLockupImageSize(lockupImage.imageSize)
    announceStatus('Reset Steam banner lockup image to the default asset.')
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
        ),
      )

      announceStatus(`Using ${file.name} as the ${logoKey} logo.`)
    } catch (error) {
      announceStatus(`Logo import failed: ${String(error)}`)
    }
  }

  function handleLogoAssetLayoutChange(
    logoKey: LogoAssetKey,
    field: LogoAssetLayoutField,
    value: boolean | number,
  ) {
    setProjectLogoAssets((currentLogoAssets) => {
      const nextLogoAssets = updateLogoAssetLayoutField(
        currentLogoAssets,
        logoKey,
        field,
        value,
      )
      const nextLayout = clampLogoAssetLayoutToSafeZone(
        getLogoAssetLayout(nextLogoAssets, logoKey),
        selectedDiscTemplate,
        getLogoAssetSize(nextLogoAssets, logoKey),
      )

      return setLogoAssetLayout(nextLogoAssets, logoKey, nextLayout)
    })
  }

  function handleClearLogoAsset(logoKey: LogoAssetKey) {
    setProjectLogoAssets((currentLogoAssets) => {
      const nextLogoAssets = clearLogoAsset(currentLogoAssets, logoKey)
      const nextLayout = clampLogoAssetLayoutToSafeZone(
        getLogoAssetLayout(nextLogoAssets, logoKey),
        selectedDiscTemplate,
        getLogoAssetSize(nextLogoAssets, logoKey),
      )

      return setLogoAssetLayout(nextLogoAssets, logoKey, nextLayout)
    })

    announceStatus(`Cleared ${logoKey} logo asset.`)
  }

  function handleResetLogoAssetLayout(logoKey: LogoAssetKey) {
    setProjectLogoAssets((currentLogoAssets) => {
      const nextLogoAssets = resetProjectLogoAssetLayout(currentLogoAssets, logoKey)
      const nextLayout = clampLogoAssetLayoutToSafeZone(
        getLogoAssetLayout(nextLogoAssets, logoKey),
        selectedDiscTemplate,
        getLogoAssetSize(nextLogoAssets, logoKey),
      )

      return setLogoAssetLayout(nextLogoAssets, logoKey, nextLayout)
    })

    announceStatus(`Reset ${logoKey} logo layout.`)
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

      return {
        ...nextBadge,
        layout: clampRatingBadgeLayoutToSafeZone(nextBadge, selectedDiscTemplate),
      }
    })
  }

  function handleRatingBadgeLayoutChange(
    field: RatingBadgeLayoutField,
    value: boolean | number,
  ) {
    setProjectRatingBadge((currentBadge) => {
      const nextBadge = updateRatingBadgeLayoutField(currentBadge, field, value)

      return {
        ...nextBadge,
        layout: clampRatingBadgeLayoutToSafeZone(nextBadge, selectedDiscTemplate),
      }
    })
  }

  function handleClearRatingBadgeImage() {
    setProjectRatingBadge((currentBadge) => {
      const nextBadge = clearRatingBadgeImage(currentBadge)

      return {
        ...nextBadge,
        layout: clampRatingBadgeLayoutToSafeZone(nextBadge, selectedDiscTemplate),
      }
    })

    announceStatus('Cleared custom rating badge image.')
  }

  function handleResetRatingBadgeLayout() {
    setProjectRatingBadge((currentBadge) => {
      const nextBadge = resetProjectRatingBadgeLayout(currentBadge)

      return {
        ...nextBadge,
        layout: clampRatingBadgeLayoutToSafeZone(nextBadge, selectedDiscTemplate),
      }
    })

    announceStatus('Reset rating badge layout.')
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
      const nextMark = resetProjectMediaMarkLayout(currentMark)

      return {
        ...nextMark,
        layout: clampMediaMarkLayoutToSafeZone(nextMark, selectedDiscTemplate),
      }
    })

    announceStatus('Reset media mark layout.')
  }

  function handlePlatformMarkToggle(value: PlatformMarkValue, enabled: boolean) {
    setProjectPlatformMarks((currentMarks) =>
      clampProjectPlatformMarksToSafeZone(
        updatePlatformMarkToggle(currentMarks, value, enabled),
        selectedDiscTemplate,
      ),
    )
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

      setProjectPlatformMarks((currentMarks) =>
        applyImportedPlatformMark(
          currentMarks,
          value,
          importedImage,
          selectedDiscTemplate,
        ),
      )

      announceStatus(`Using ${file.name} as the platform mark.`)
    } catch (error) {
      announceStatus(`Platform mark import failed: ${String(error)}`)
    }
  }

  function handlePlatformMarkSourceChange(value: PlatformMarkValue, source: PlatformMarkSource) {
    setProjectPlatformMarks((currentMarks) =>
      clampProjectPlatformMarksToSafeZone(
        updatePlatformMarkSource(currentMarks, value, source),
        selectedDiscTemplate,
      ),
    )
  }

  function handlePlatformMarkLayoutChange(
    platformValue: PlatformMarkValue,
    field: PlatformMarkLayoutField,
    layoutValue: boolean | number,
  ) {
    setProjectPlatformMarks((currentMarks) =>
      clampProjectPlatformMarksToSafeZone(
        updatePlatformMarkLayoutField(currentMarks, platformValue, field, layoutValue),
        selectedDiscTemplate,
      ),
    )
  }

  function handleClearPlatformMarkImage(value: PlatformMarkValue) {
    setProjectPlatformMarks((currentMarks) =>
      clampProjectPlatformMarksToSafeZone(
        clearPlatformMarkImage(currentMarks, value),
        selectedDiscTemplate,
      ),
    )

    announceStatus('Cleared custom platform mark image.')
  }

  function handleResetPlatformMarkLayout(value: PlatformMarkValue) {
    setProjectPlatformMarks((currentMarks) =>
      clampProjectPlatformMarksToSafeZone(
        resetProjectPlatformMarkLayout(currentMarks, value),
        selectedDiscTemplate,
      ),
    )

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
        updateDiscTextLayoutForSteamLogoPlacement(currentLayout, placement),
        selectedDiscTemplate,
      )
    })
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
  ) {
    for (const key of keys) {
      if (discTextValueSources[key] === 'manual') {
        continue
      }

      clampDiscTextLayoutForContent(
        key,
        getDiscTextContent(key, values, manualGameTitle),
      )
    }
  }

  function handleDiscTextContentChange(key: DiscTextKey, value: string) {
    if (key === 'title') {
      setManualGameTitle(value)
      clampDiscTextLayoutForContent(key, value)
      return
    }

    const nextInputUpdate = updateDiscTextInputValue(
      discTextValues,
      discTextValueSources,
      key,
      value,
    )
    const nextMetadataBoundValues = resolveMetadataBoundDiscTextValues(
      nextInputUpdate.values,
      projectMetadata,
      nextInputUpdate.sources,
    )

    if (isMetadataBoundDiscTextKey(key)) {
      setDiscTextValueSources(nextInputUpdate.sources)
    }
    setDiscTextValues(nextInputUpdate.values)
    clampDiscTextLayoutForContent(
      key,
      getDiscTextContent(key, nextMetadataBoundValues, manualGameTitle),
    )
  }

  function handleUseMetadataDiscTextValue(key: MetadataBoundDiscTextKey) {
    const nextInputUpdate = updateDiscTextInputValue(
      discTextValues,
      discTextValueSources,
      key,
      '',
    )
    const nextMetadataBoundValues = resolveMetadataBoundDiscTextValues(
      nextInputUpdate.values,
      projectMetadata,
      nextInputUpdate.sources,
    )

    setDiscTextValueSources(nextInputUpdate.sources)
    setDiscTextValues(nextInputUpdate.values)
    clampDiscTextLayoutForContent(
      key,
      getDiscTextContent(key, nextMetadataBoundValues, manualGameTitle),
    )
  }

  function getCurrentDiscTextContent(key: DiscTextKey) {
    return getDiscTextContent(key, metadataBoundDiscTextValues, manualGameTitle)
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

  function handleResetDiscTextLayout(key: DiscTextKey) {
    setDiscTextLayout((currentLayout) => {
      const nextLayout = resetDiscTextLayout(currentLayout, key, steamLogoPlacement)

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

  function handleExportGuideToggle(guide: ExportGuideKey, checked: boolean) {
    setExportGuides((currentGuides) =>
      setExportGuideSelection(currentGuides, guide, checked),
    )
  }

  function handleProjectMetadataChange(field: keyof ProjectMetadata, value: string) {
    const nextProjectMetadata = updateProjectMetadataField(
      projectMetadata,
      field,
      value,
    )
    const affectedTextKeys = getDiscTextKeysForProjectMetadataField(field)
    const nextMetadataBoundValues = resolveMetadataBoundDiscTextValues(
      discTextValues,
      nextProjectMetadata,
      discTextValueSources,
    )

    setProjectMetadata(nextProjectMetadata)

    if (field === 'title') {
      setManualGameTitle(value)
      clampDiscTextLayoutForContent('title', value)
      return
    }

    clampMetadataBoundDiscTextLayoutsForContent(
      affectedTextKeys,
      nextMetadataBoundValues,
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

    cancelPreviewPointerDrag()

    setSelectedDiscTemplateId('standardPrintableDisc')
    setCustomDiscTemplate(buildCustomDiscTemplate(discTemplates.standardPrintableDisc))
    setSteamLogoPlacement('top')
    setSteamBannerColors(DEFAULT_STEAM_BANNER_COLORS)
    const defaultLockupImage = createDefaultSteamBannerLockupImageState()
    setSteamBannerLockupImageUrl(defaultLockupImage.imageUrl)
    setSteamBannerLockupImageSize(defaultLockupImage.imageSize)
    setSteamBannerLockupLayout(DEFAULT_STEAM_BANNER_LOCKUP_LAYOUT)
    setExportGuides(DEFAULT_EXPORT_GUIDES)
    const emptyBackground = createEmptyBackgroundImageState()
    setBackgroundImageUrl(emptyBackground.imageUrl)
    setBackgroundImageSize(emptyBackground.imageSize)
    setBackgroundScale(emptyBackground.scale)
    setBackgroundOffset(emptyBackground.offset)
    setGameSearchQuery('')
    setManualGameTitle('Untitled Steam Backup Label')
    setProjectMetadata(createDefaultProjectMetadata())
    setProjectLogoAssets(createDefaultProjectLogoAssets())
    setProjectRatingBadge(createDefaultProjectRatingBadge())
    setProjectMediaMark(createDefaultProjectMediaMark())
    setProjectPlatformMarks(createDefaultProjectPlatformMarks())
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
    setDiscTextLayout(createDefaultDiscTextLayout('top'))

    announceStatus('Started a new blank project.')
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
      const nextProjectMetadata = applySteamGameImportToProjectMetadata(
        importedState.importedGame,
        projectMetadata,
      )
      const nextDiscTextValues = applySteamGameImportToDiscTextValues(
        importedState.importedGame,
        discTextValues,
        discTextValueSources,
      )
      const nextMetadataBoundValues = resolveMetadataBoundDiscTextValues(
        nextDiscTextValues,
        nextProjectMetadata,
        discTextValueSources,
      )
      setSelectedSteamGame(importedState.importedGame)
      setManualGameTitle(importedState.manualGameTitle)
      setProjectMetadata(nextProjectMetadata)
      setDiscTextValues(nextDiscTextValues)
      clampDiscTextLayoutForContent('title', importedState.manualGameTitle)
      clampMetadataBoundDiscTextLayoutsForContent(
        [
          ...getDiscTextKeysForProjectMetadataField('steamAppId'),
          ...getDiscTextKeysForProjectMetadataField('developer'),
          ...getDiscTextKeysForProjectMetadataField('publisher'),
        ],
        nextMetadataBoundValues,
      )
      announceStatus(importedState.statusMessage)
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
        projectRatingBadge,
        projectMediaMark,
        projectPlatformMarks,
        selectedDiscTemplateId,
        customDiscTemplate,
        steamLogoPlacement,
        steamBannerColors,
        steamBannerLockupImageUrl,
        steamBannerLockupImageSize,
        steamBannerLockupLayout,
        exportGuides,
        backgroundScale,
        backgroundOffset,
        backgroundImageUrl,
        backgroundImageSize,
        discTextSettings,
        discTextValues,
        discTextValueSources,
        discTextLayout,
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
      const restoredProject = await restoreProjectStateFromContents(contents, {
        defaultSteamBannerLockupImageUrl: DEFAULT_STEAM_BANNER_LOCKUP_IMAGE_URL,
        resolveBackgroundImageSize: async (imageDataUrl) =>
          getNaturalImageSize(await loadImage(imageDataUrl)),
      })

      setManualGameTitle(restoredProject.manualGameTitle)
      setProjectMetadata(restoredProject.projectMetadata)
      setProjectLogoAssets(restoredProject.projectLogoAssets)
      setProjectRatingBadge(restoredProject.projectRatingBadge)
      setProjectMediaMark(restoredProject.projectMediaMark)
      setProjectPlatformMarks(restoredProject.projectPlatformMarks)
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
      setSteamBannerLockupImageSize(restoredProject.steamBannerLockupImageSize)
      setSteamBannerLockupLayout(restoredProject.steamBannerLockupLayout)
      setExportGuides(restoredProject.exportGuides)
      setDiscTextSettings(restoredProject.discTextSettings)
      setDiscTextValues(restoredProject.discTextValues)
      setDiscTextValueSources(restoredProject.discTextValueSources)
      setDiscTextLayout(restoredProject.discTextLayout)
      setBackgroundScale(restoredProject.backgroundScale)
      setBackgroundOffset(restoredProject.backgroundOffset)
      setBackgroundImageUrl(restoredProject.backgroundImageUrl)
      setBackgroundImageSize(restoredProject.backgroundImageSize)

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
        backgroundImageUrl,
        backgroundImageSize,
        selectedSteamGame,
        manualGameTitle,
        steamLogoPlacement,
        discTextSettings,
        projectLogoAssets,
        projectMetadata,
        projectRatingBadge,
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
        backgroundImageUrl,
        backgroundScale,
        backgroundOffset,
        previewSize,
        steamLogoPlacement,
        steamBannerColors,
        steamBannerLockupImageUrl,
        steamBannerLockupLayout,
        projectLogoAssets,
        projectMetadata,
        projectRatingBadge,
        projectMediaMark,
        projectPlatformMarks,
        discTextSettings,
        discTextValues,
        discTextValueSources,
        discTextLayout,
        manualGameTitle,
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

  function handleBackgroundScaleChange(value: number) {
    setBackgroundScale(updateBackgroundScale(value))
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <h1>Steam Backup Label Studio</h1>
        <p className="muted">Pre-alpha disc label editor</p>

        <ProjectPanel
          projectStatus={projectStatus}
          handleNewProject={handleNewProject}
          handleSaveProject={handleSaveProject}
          handleLoadProject={handleLoadProject}
          handleExportPng={handleExportPng}
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
          gameSearchQuery={gameSearchQuery}
          setGameSearchQuery={setGameSearchQuery}
          handleSteamSearch={handleSteamSearch}
          steamSearchResults={steamSearchResults}
          handleSteamImport={handleSteamImport}
          selectedSteamGame={selectedSteamGame}
          isSteamSearchLoading={isSteamSearchLoading}
          isSteamImportLoading={isSteamImportLoading}
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
          localSteamScreenshots={localSteamScreenshots}
          localSteamScreenshotThumbnails={localSteamScreenshotThumbnails}
          hasCheckedLocalSteamScreenshots={hasCheckedLocalSteamScreenshots}
          isLocalSteamScreenshotsLoading={isLocalSteamScreenshotsLoading}
          handleFindLocalSteamScreenshots={handleFindLocalSteamScreenshots}
          handleOpenLocalSteamScreenshotFolder={handleOpenLocalSteamScreenshotFolder}
          handleUseLocalSteamScreenshot={handleUseLocalSteamScreenshot}
          handleBackgroundUpload={handleBackgroundUpload}
          backgroundScale={backgroundScale}
          handleBackgroundScaleChange={handleBackgroundScaleChange}
          backgroundImageUrl={backgroundImageUrl}
          handleResetBackground={handleResetBackground}
        />

        <BrandingPanel
          steamLogoPlacement={steamLogoPlacement}
          handleSteamLogoPlacementChange={handleSteamLogoPlacementChange}
          steamBannerLockupImageUrl={steamBannerLockupImageUrl}
          steamBannerLockupImageSize={steamBannerLockupImageSize}
          steamBannerLockupLayout={steamBannerLockupLayout}
          steamBannerColors={steamBannerColors}
          projectLogoAssets={projectLogoAssets}
          projectMetadata={projectMetadata}
          projectRatingBadge={projectRatingBadge}
          projectMediaMark={projectMediaMark}
          projectPlatformMarks={projectPlatformMarks}
          selectedDiscTemplate={selectedDiscTemplate}
          handleProjectMetadataChange={handleProjectMetadataChange}
          handleSteamBannerLockupUpload={handleSteamBannerLockupUpload}
          handleClearSteamBannerLockup={handleClearSteamBannerLockup}
          handleSteamBannerLockupLayoutChange={handleSteamBannerLockupLayoutChange}
          handleResetSteamBannerLockupLayout={handleResetSteamBannerLockupLayout}
          handleSteamBannerColorChange={handleSteamBannerColorChange}
          handleResetSteamBannerColors={handleResetSteamBannerColors}
          handleLogoAssetUpload={handleLogoAssetUpload}
          handleLogoAssetLayoutChange={handleLogoAssetLayoutChange}
          handleClearLogoAsset={handleClearLogoAsset}
          handleResetLogoAssetLayout={handleResetLogoAssetLayout}
          handleRatingBadgeUpload={handleRatingBadgeUpload}
          handleRatingBadgeSourceChange={handleRatingBadgeSourceChange}
          handleRatingBadgeLayoutChange={handleRatingBadgeLayoutChange}
          handleClearRatingBadgeImage={handleClearRatingBadgeImage}
          handleResetRatingBadgeLayout={handleResetRatingBadgeLayout}
          handleMediaMarkUpload={handleMediaMarkUpload}
          handleMediaMarkValueChange={handleMediaMarkValueChange}
          handleMediaMarkSourceChange={handleMediaMarkSourceChange}
          handleMediaMarkLayoutChange={handleMediaMarkLayoutChange}
          handleClearMediaMarkImage={handleClearMediaMarkImage}
          handleResetMediaMarkLayout={handleResetMediaMarkLayout}
          handlePlatformMarkToggle={handlePlatformMarkToggle}
          handlePlatformMarkUpload={handlePlatformMarkUpload}
          handlePlatformMarkSourceChange={handlePlatformMarkSourceChange}
          handlePlatformMarkLayoutChange={handlePlatformMarkLayoutChange}
          handleClearPlatformMarkImage={handleClearPlatformMarkImage}
          handleResetPlatformMarkLayout={handleResetPlatformMarkLayout}
        />


        <TextPanel
          discTextSettings={discTextSettings}
          discTextLayout={discTextLayout}
          discTextValues={discTextValues}
          discTextValueSources={discTextValueSources}
          metadataBoundDiscTextValues={metadataBoundDiscTextValues}
          manualGameTitle={manualGameTitle}
          selectedDiscTemplate={selectedDiscTemplate}
          handleDiscTextToggle={handleDiscTextToggle}
          handleDiscTextContentChange={handleDiscTextContentChange}
          handleUseMetadataDiscTextValue={handleUseMetadataDiscTextValue}
          handleDiscTextLayoutChange={handleDiscTextLayoutChange}
          handleDiscTextAlignmentChange={handleDiscTextAlignmentChange}
          handleDiscTextModeChange={handleDiscTextModeChange}
          handleDiscTextArcSideChange={handleDiscTextArcSideChange}
          handleResetDiscTextLayout={handleResetDiscTextLayout}
          steamLogoPlacement={steamLogoPlacement}
        />

        <GuideLegendPanel />
      </aside>

      <DiscPreview
        discPreviewRef={discPreviewRef}
        statusToasts={statusToasts}
        backgroundImageUrl={backgroundImageUrl}
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
        projectLogoAssets={projectLogoAssets}
        projectMetadata={projectMetadata}
        projectRatingBadge={projectRatingBadge}
        projectMediaMark={projectMediaMark}
        projectPlatformMarks={projectPlatformMarks}
        handleRatingBadgePointerDown={handleRatingBadgePointerDown}
        handleRatingBadgePointerMove={handleRatingBadgePointerMove}
        handleRatingBadgePointerUp={handleRatingBadgePointerUp}
        handleMediaMarkPointerDown={handleMediaMarkPointerDown}
        handleMediaMarkPointerMove={handleMediaMarkPointerMove}
        handleMediaMarkPointerUp={handleMediaMarkPointerUp}
        handlePlatformMarkPointerDown={handlePlatformMarkPointerDown}
        handlePlatformMarkPointerMove={handlePlatformMarkPointerMove}
        handlePlatformMarkPointerUp={handlePlatformMarkPointerUp}
        handleLogoAssetPointerDown={handleLogoAssetPointerDown}
        handleLogoAssetPointerMove={handleLogoAssetPointerMove}
        handleLogoAssetPointerUp={handleLogoAssetPointerUp}
        discTextSettings={discTextSettings}
        discTextValues={discTextValues}
        discTextValueSources={discTextValueSources}
        manualGameTitle={manualGameTitle}
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
