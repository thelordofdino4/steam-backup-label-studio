import { confirm, open, save } from '@tauri-apps/plugin-dialog'
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type PointerEvent } from 'react'
import {
  downloadSteamArtworkAsDataUrl,
  importSteamApp,
  searchSteamStore,
  type SteamArtworkAsset,
  type SteamImportedGame,
  type SteamSearchResult,
} from './steam/steamApi'
import {
  findSteamScreenshots,
  openLocalFolder,
  readLocalImageAsDataUrl,
  type LocalSteamScreenshotAsset,
} from './local/localArtwork'
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
import { DEFAULT_EXPORT_GUIDES, exportGuideModeToSelection, setExportGuideSelection, type ExportGuideKey, type ExportGuideSelection } from './exportGuides'
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
import { createProjectSnapshot } from './project/createProjectSnapshot'
import { normalizeParsedProject } from './project/normalizeProject'
import { createDefaultProjectMetadata, createProjectMetadataFromSteamGame, normalizeProjectMetadata, updateProjectMetadataField } from './project/projectMetadata'
import { clearLogoAsset, createDefaultProjectLogoAssets, getLogoAssetLayout, getLogoAssetSize, normalizeProjectLogoAssets, resetProjectLogoAssetLayout, setLogoAssetImage, setLogoAssetLayout, updateLogoAssetLayoutField, updateLogoAssetLayoutPosition, type LogoAssetKey, type LogoAssetLayoutField } from './project/projectLogoAssets'
import { clearMediaMarkImage, clearPlatformMarkImage, createDefaultProjectMediaMark, createDefaultProjectPlatformMarkAsset, createDefaultProjectPlatformMarks, normalizeProjectMediaMark, normalizeProjectPlatformMarks, resetProjectMediaMarkLayout, resetProjectPlatformMarkLayout, setMediaMarkCustomImage, setPlatformMarkCustomImage, updateMediaMarkLayoutField, updateMediaMarkLayoutPosition, updateMediaMarkSource, updateMediaMarkValue, updatePlatformMarkLayoutField, updatePlatformMarkLayoutPosition, updatePlatformMarkSource, updatePlatformMarkToggle, type MediaMarkLayoutField, type PlatformMarkLayoutField } from './project/projectMediaMark'
import { clearRatingBadgeImage, createDefaultProjectRatingBadge, normalizeProjectRatingBadge, resetProjectRatingBadgeLayout, setRatingBadgeCustomImage, updateRatingBadgeLayoutField, updateRatingBadgeLayoutPosition, updateRatingBadgeSource, type RatingBadgeLayoutField } from './project/projectRatingBadge'
import type { BackgroundImageSize, BackgroundOffset, MediaMarkSource, MediaMarkValue, PlatformMarkSource, PlatformMarkValue, ProjectLogoAssets, ProjectMediaMark, ProjectMetadata, ProjectPlatformMarks, ProjectRatingBadge, RatingBadgeSource, SelectedDiscTemplateId, SteamBannerColors, SteamBannerLockupLayout } from './project/projectTypes'
import { readProjectFile, writeBinaryFile, writeProjectFile } from './tauri/fileSystem'
import { loadImage } from './export/canvasImage'
import { exportDiscLabelPngBytes } from './export/exportPng'
import { buildExportPreflightSummary } from './export/exportPreflight'
import { getNaturalImageSize, readImageFileAsDataUrl } from './utils/imageFile'
import {
  DEFAULT_STEAM_BANNER_COLORS,
  DEFAULT_STEAM_BANNER_LOCKUP_LAYOUT,
  createCustomSteamBannerLockupImageState,
  createDefaultSteamBannerLockupImageState,
  createSteamBannerLockupImageState,
  updateSteamBannerColor,
  updateSteamBannerLockupLayoutField,
  type SteamBannerColorField,
  type SteamBannerLockupLayoutField,
} from './steamBanner'
import {
  DEFAULT_BACKGROUND_SCALE,
  createEmptyBackgroundImageState,
  createDefaultBackgroundOffset,
  createSelectedBackgroundImageState,
  getBackgroundPreviewSize,
  updateBackgroundScale,
} from './backgroundImage'
import {
  createPercentDragState,
  createPixelDragState,
  getDraggedPercentPoint,
  getDraggedPixelOffset,
  type PercentDragState,
  type PixelDragState,
} from './interaction/dragGeometry'
import {
  DISC_TEXT_KEYS,
  DEFAULT_DISC_TEXT_SETTINGS,
  createDefaultDiscTextLayout,
  createDefaultDiscTextValues,
  getDiscTextPreviewTransform,
  normalizeDiscTextLayout,
  normalizeDiscTextSettings,
  normalizeDiscTextValues,
  resetDiscTextLayout,
  isCurvedCopyrightDiscTextLayout,
  updateDiscTextAlignment,
  updateDiscTextArcSide,
  updateDraggedDiscTextLayoutPosition,
  updateDiscTextLayoutForSteamLogoPlacement,
  updateDiscTextLayoutField,
  updateDiscTextMode,
  updateDiscTextSetting,
  updateDiscTextValue,
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

type TextDragState = {
  key: DiscTextKey
} & PercentDragState

type LogoDragState = {
  logoKey: 'developer' | 'publisher'
} & PercentDragState

type RatingBadgeDragState = PercentDragState

type MediaMarkDragState = PercentDragState

type PlatformMarkDragState = {
  value: PlatformMarkValue
} & PercentDragState

type CustomDimensionKey =
  | 'outerDiameterMm'
  | 'physicalCenterHoleDiameterMm'
  | 'innerHoleDiameterMm'
  | 'printableDiameterMm'
  | 'safeDiameterMm'

type DragState = PixelDragState

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
  const [discTextLayout, setDiscTextLayout] = useState<DiscTextLayoutSettings>(() =>
    createDefaultDiscTextLayout('top'),
  )

  const dragStateRef = useRef<DragState | null>(null)
  const textDragStateRef = useRef<TextDragState | null>(null)
  const logoDragStateRef = useRef<LogoDragState | null>(null)
  const ratingBadgeDragStateRef = useRef<RatingBadgeDragState | null>(null)
  const mediaMarkDragStateRef = useRef<MediaMarkDragState | null>(null)
  const platformMarkDragStateRef = useRef<PlatformMarkDragState | null>(null)
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
      const screenshotsWithoutThumbnails = localSteamScreenshots.filter(
        (asset) => !localSteamScreenshotThumbnails[asset.id],
      )

      if (screenshotsWithoutThumbnails.length === 0) {
        return
      }

      const thumbnailEntries = await Promise.all(
        screenshotsWithoutThumbnails.slice(0, 24).map(async (asset) => {
          try {
            const imageDataUrl = await readLocalImageAsDataUrl(asset.path)

            return [asset.id, imageDataUrl] as const
          } catch {
            return null
          }
        }),
      )

      if (isCancelled) {
        return
      }

      const loadedThumbnails = thumbnailEntries.filter(
        (entry): entry is readonly [string, string] => entry !== null,
      )

      if (loadedThumbnails.length === 0) {
        return
      }

      setLocalSteamScreenshotThumbnails((currentThumbnails) => ({
        ...currentThumbnails,
        ...Object.fromEntries(loadedThumbnails),
      }))
    }

    void loadLocalSteamScreenshotThumbnails()

    return () => {
      isCancelled = true
    }
  }, [localSteamScreenshots, localSteamScreenshotThumbnails])

  async function setBackgroundFromDataUrl(
    imageDataUrl: string,
    statusMessage: string,
    options: { clearSelectedArtwork?: boolean } = {},
  ) {
    const image = await loadImage(imageDataUrl)
    const nextBackground = createSelectedBackgroundImageState(
      imageDataUrl,
      getNaturalImageSize(image),
    )

    setBackgroundImageUrl(nextBackground.imageUrl)
    setBackgroundImageSize(nextBackground.imageSize)
    setBackgroundScale(nextBackground.scale)
    setBackgroundOffset(nextBackground.offset)

    if (options.clearSelectedArtwork ?? true) {
      setSelectedArtworkId(null)
    }

    announceStatus(statusMessage)
  }

  async function handleSteamBannerLockupUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) {
      return
    }

    if (!file.type.startsWith('image/')) {
      announceStatus('Choose an image file for the banner lockup.')
      return
    }

    try {
      const imageDataUrl = await readImageFileAsDataUrl(file)
      const image = await loadImage(imageDataUrl)
      const lockupImage = createCustomSteamBannerLockupImageState(
        imageDataUrl,
        getNaturalImageSize(image),
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

    if (!file.type.startsWith('image/')) {
      announceStatus('Choose an image file for the logo asset.')
      return
    }

    try {
      const imageDataUrl = await readImageFileAsDataUrl(file)
      const image = await loadImage(imageDataUrl)
      const imageSize = getNaturalImageSize(image)

      setProjectLogoAssets((currentLogoAssets) => {
        const nextLogoAssets = setLogoAssetImage(
          currentLogoAssets,
          logoKey,
          imageDataUrl,
          imageSize,
        )
        const nextLayout = clampLogoAssetLayoutToSafeZone(
          getLogoAssetLayout(nextLogoAssets, logoKey),
          selectedDiscTemplate,
          getLogoAssetSize(nextLogoAssets, logoKey),
        )

        return setLogoAssetLayout(nextLogoAssets, logoKey, nextLayout)
      })

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

    if (!file.type.startsWith('image/')) {
      announceStatus('Choose an image file for the rating badge.')
      return
    }

    try {
      const imageDataUrl = await readImageFileAsDataUrl(file)
      const image = await loadImage(imageDataUrl)
      const imageSize = getNaturalImageSize(image)

      setProjectRatingBadge((currentBadge) => {
        const nextBadge = setRatingBadgeCustomImage(
          currentBadge,
          imageDataUrl,
          imageSize,
        )

        return {
          ...nextBadge,
          layout: clampRatingBadgeLayoutToSafeZone(nextBadge, selectedDiscTemplate),
        }
      })

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

    if (!file.type.startsWith('image/')) {
      announceStatus('Choose an image file for the media mark.')
      return
    }

    try {
      const imageDataUrl = await readImageFileAsDataUrl(file)
      const image = await loadImage(imageDataUrl)
      const imageSize = getNaturalImageSize(image)

      setProjectMediaMark((currentMark) => {
        const nextMark = setMediaMarkCustomImage(
          currentMark,
          imageDataUrl,
          imageSize,
        )

        return {
          ...nextMark,
          layout: clampMediaMarkLayoutToSafeZone(nextMark, selectedDiscTemplate),
        }
      })

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

    if (!file.type.startsWith('image/')) {
      announceStatus('Choose an image file for the platform mark.')
      return
    }

    try {
      const imageDataUrl = await readImageFileAsDataUrl(file)
      const image = await loadImage(imageDataUrl)
      const imageSize = getNaturalImageSize(image)

      setProjectPlatformMarks((currentMarks) =>
        clampProjectPlatformMarksToSafeZone(
          setPlatformMarkCustomImage(currentMarks, value, imageDataUrl, imageSize),
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

  function handleDiscTextContentChange(key: DiscTextKey, value: string) {
    if (key === 'title') {
      setManualGameTitle(value)
      return
    }

    setDiscTextValues((currentValues) =>
      updateDiscTextValue(currentValues, key, value),
    )
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
    setProjectMetadata((currentMetadata) =>
      updateProjectMetadataField(currentMetadata, field, value),
    )

    if (field === 'title') {
      setManualGameTitle(value)
    }
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

    dragStateRef.current = null
    textDragStateRef.current = null
    logoDragStateRef.current = null
    ratingBadgeDragStateRef.current = null
    mediaMarkDragStateRef.current = null
    platformMarkDragStateRef.current = null

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
      const importedGame = await importSteamApp(appId)
      setSelectedSteamGame(importedGame)
      setManualGameTitle(importedGame.title)
      setProjectMetadata((currentMetadata) =>
        createProjectMetadataFromSteamGame(importedGame, currentMetadata),
      )
      setDiscTextValues((currentValues) => ({
        ...currentValues,
        appId: String(importedGame.appId),
      }))
      const artworkCount = importedGame.artwork.length
      announceStatus(
        artworkCount > 0
          ? `Imported Steam metadata and ${artworkCount} artwork asset${artworkCount === 1 ? '' : 's'} for ${importedGame.title}.`
          : `Imported Steam metadata for ${importedGame.title}.`,
      )
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
      const imageDataUrl = await downloadSteamArtworkAsDataUrl(asset.url)
      await setBackgroundFromDataUrl(
        imageDataUrl,
        `Using ${asset.label} as the disc background.`,
        { clearSelectedArtwork: false },
      )
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
      const screenshots = await findSteamScreenshots(selectedSteamGame.appId)
      setLocalSteamScreenshots(screenshots)

      announceStatus(
        screenshots.length > 0
          ? `Found ${screenshots.length} local Steam screenshot${screenshots.length === 1 ? '' : 's'} for ${selectedSteamGame.title}.`
          : `No local Steam screenshots found for ${selectedSteamGame.title}.`,
      )
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
      const imageDataUrl = await readLocalImageAsDataUrl(asset.path)
      await setBackgroundFromDataUrl(
        imageDataUrl,
        `Using ${asset.label} as the disc background.`,
        { clearSelectedArtwork: false },
      )
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
      const project = normalizeParsedProject(contents)
      const savedTemplateId = project.template.variant
      const savedImageDataUrl = project.background.imageDataUrl
      const loadedCustomDiscTemplate = project.template.customDimensions
        ? buildCustomDiscTemplate(project.template.customDimensions)
        : buildCustomDiscTemplate(discTemplates.standardPrintableDisc)
      const loadedSelectedDiscTemplate =
        savedTemplateId === 'custom'
          ? loadedCustomDiscTemplate
          : savedTemplateId in discTemplates
            ? discTemplates[savedTemplateId]
            : discTemplates.standardPrintableDisc

      const loadedTitle = project.game?.manualTitle ?? project.title ?? 'Untitled Steam Backup Label'
      setManualGameTitle(loadedTitle)
      setProjectMetadata(
        normalizeProjectMetadata(
          project.metadata,
          loadedTitle,
          project.game?.selectedSteamGame?.appId,
        ),
      )
      const loadedLogoAssets = normalizeProjectLogoAssets(project.logoAssets)
      setProjectLogoAssets({
        ...loadedLogoAssets,
        developerLogoLayout: clampLogoAssetLayoutToSafeZone(
          loadedLogoAssets.developerLogoLayout,
          loadedSelectedDiscTemplate,
          loadedLogoAssets.developerLogoSize,
        ),
        publisherLogoLayout: clampLogoAssetLayoutToSafeZone(
          loadedLogoAssets.publisherLogoLayout,
          loadedSelectedDiscTemplate,
          loadedLogoAssets.publisherLogoSize,
        ),
      })
      const loadedRatingBadge = normalizeProjectRatingBadge(project.ratingBadge)
      setProjectRatingBadge({
        ...loadedRatingBadge,
        layout: clampRatingBadgeLayoutToSafeZone(
          loadedRatingBadge,
          loadedSelectedDiscTemplate,
        ),
      })
      const loadedMediaMark = normalizeProjectMediaMark(project.mediaMark)
      setProjectMediaMark({
        ...loadedMediaMark,
        layout: clampMediaMarkLayoutToSafeZone(
          loadedMediaMark,
          loadedSelectedDiscTemplate,
        ),
      })
      const loadedPlatformMarks = normalizeProjectPlatformMarks(
        project.platformMarks,
        project.mediaMark,
      )
      setProjectPlatformMarks(
        clampProjectPlatformMarksToSafeZone(
          loadedPlatformMarks,
          loadedSelectedDiscTemplate,
        ),
      )
      setSelectedSteamGame(project.game?.selectedSteamGame ?? null)
      setSelectedArtworkId(null)
      setLocalSteamScreenshots([])
      setLocalSteamScreenshotThumbnails({})
      setHasCheckedLocalSteamScreenshots(false)

      if (savedTemplateId === 'custom') {
        setCustomDiscTemplate(loadedCustomDiscTemplate)
        setSelectedDiscTemplateId('custom')
      } else if (savedTemplateId in discTemplates) {
        setSelectedDiscTemplateId(savedTemplateId)
      } else {
        setSelectedDiscTemplateId('standardPrintableDisc')
      }

      setSteamLogoPlacement(project.steamBackupLogo.placement)
      setSteamBannerColors(project.steamBackupLogo.bannerColors ?? DEFAULT_STEAM_BANNER_COLORS)
      const loadedLockupImage = createSteamBannerLockupImageState(
        project.steamBackupLogo.lockupImageDataUrl,
        project.steamBackupLogo.lockupImageSize,
      )
      setSteamBannerLockupImageUrl(loadedLockupImage.imageUrl)
      setSteamBannerLockupImageSize(loadedLockupImage.imageSize)
      setSteamBannerLockupLayout(
        project.steamBackupLogo.lockupLayout ?? DEFAULT_STEAM_BANNER_LOCKUP_LAYOUT,
      )
      setExportGuides(
        project.export?.guides ?? exportGuideModeToSelection(project.export?.guideMode),
      )
      setDiscTextSettings(normalizeDiscTextSettings(project.discText?.settings))
      setDiscTextValues(
        normalizeDiscTextValues(project.discText?.values, project.game?.selectedSteamGame?.appId),
      )
      setDiscTextLayout(
        clampDiscTextLayoutToSafeZone(
          normalizeDiscTextLayout(project.discText?.layout, project.steamBackupLogo.placement),
          loadedSelectedDiscTemplate,
        ),
      )
      setBackgroundScale(project.background.scale)
      setBackgroundOffset(project.background.offset)
      setBackgroundImageUrl(savedImageDataUrl)
      setBackgroundImageSize(project.background.imageSize ?? null)

      if (savedImageDataUrl && !project.background.imageSize) {
        try {
          const image = await loadImage(savedImageDataUrl)
          setBackgroundImageSize(getNaturalImageSize(image))
        } catch {
          setBackgroundImageSize(null)
        }
      }

      announceStatus(
        savedImageDataUrl
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

  function handleDiscTextPointerDown(
    event: PointerEvent<Element>,
    key: DiscTextKey,
  ) {
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)

    textDragStateRef.current = {
      key,
      ...createPercentDragState(
        event.pointerId,
        event.clientX,
        event.clientY,
        discTextLayout[key].x,
        discTextLayout[key].y,
      ),
    }
  }

  function handleDiscTextPointerMove(event: PointerEvent<Element>) {
    const dragState = textDragStateRef.current
    const previewRect = discPreviewRef.current?.getBoundingClientRect()

    if (!dragState || dragState.pointerId !== event.pointerId || !previewRect) {
      return
    }

    event.stopPropagation()

    const draggedPoint = getDraggedPercentPoint(
      dragState,
      event.clientX,
      event.clientY,
      previewRect,
    )

    setDiscTextLayout((currentLayout) => {
      const nextLayout = updateDraggedDiscTextLayoutPosition(
        currentLayout,
        dragState.key,
        draggedPoint,
      )
      const nextTextLayout = nextLayout[dragState.key]

      return {
        ...nextLayout,
        [dragState.key]: isCurvedCopyrightDiscTextLayout(
          dragState.key,
          currentLayout[dragState.key],
        )
          ? nextTextLayout
          : clampStraightDiscTextLayoutToSafeZone(
              dragState.key,
              nextTextLayout,
              selectedDiscTemplate,
            ),
      }
    })
  }

  function handleDiscTextPointerUp(event: PointerEvent<Element>) {
    const dragState = textDragStateRef.current

    if (!dragState || dragState.pointerId !== event.pointerId) {
      return
    }

    event.stopPropagation()
    textDragStateRef.current = null
    event.currentTarget.releasePointerCapture(event.pointerId)
  }

  function handleLogoAssetPointerDown(
    event: PointerEvent<Element>,
    logoKey: 'developer' | 'publisher',
  ) {
    const layout =
      logoKey === 'developer'
        ? projectLogoAssets.developerLogoLayout
        : projectLogoAssets.publisherLogoLayout

    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)

    logoDragStateRef.current = {
      logoKey,
      ...createPercentDragState(
        event.pointerId,
        event.clientX,
        event.clientY,
        layout.x,
        layout.y,
      ),
    }
  }

  function handleLogoAssetPointerMove(event: PointerEvent<Element>) {
    const dragState = logoDragStateRef.current
    const previewRect = discPreviewRef.current?.getBoundingClientRect()

    if (!dragState || dragState.pointerId !== event.pointerId || !previewRect) {
      return
    }

    event.stopPropagation()

    const draggedPoint = getDraggedPercentPoint(
      dragState,
      event.clientX,
      event.clientY,
      previewRect,
    )

    setProjectLogoAssets((currentLogoAssets) => {
      const nextLogoAssets = updateLogoAssetLayoutPosition(
        currentLogoAssets,
        dragState.logoKey,
        draggedPoint,
      )
      const nextLayout = clampLogoAssetLayoutToSafeZone(
        getLogoAssetLayout(nextLogoAssets, dragState.logoKey),
        selectedDiscTemplate,
        getLogoAssetSize(nextLogoAssets, dragState.logoKey),
      )

      return setLogoAssetLayout(nextLogoAssets, dragState.logoKey, nextLayout)
    })
  }

  function handleLogoAssetPointerUp(event: PointerEvent<Element>) {
    const dragState = logoDragStateRef.current

    if (!dragState || dragState.pointerId !== event.pointerId) {
      return
    }

    event.stopPropagation()
    logoDragStateRef.current = null
    event.currentTarget.releasePointerCapture(event.pointerId)
  }

  function handleRatingBadgePointerDown(event: PointerEvent<Element>) {
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)

    ratingBadgeDragStateRef.current = {
      ...createPercentDragState(
        event.pointerId,
        event.clientX,
        event.clientY,
        projectRatingBadge.layout.x,
        projectRatingBadge.layout.y,
      ),
    }
  }

  function handleRatingBadgePointerMove(event: PointerEvent<Element>) {
    const dragState = ratingBadgeDragStateRef.current
    const previewRect = discPreviewRef.current?.getBoundingClientRect()

    if (!dragState || dragState.pointerId !== event.pointerId || !previewRect) {
      return
    }

    event.stopPropagation()

    const draggedPoint = getDraggedPercentPoint(
      dragState,
      event.clientX,
      event.clientY,
      previewRect,
    )

    setProjectRatingBadge((currentBadge) => {
      const nextBadge = updateRatingBadgeLayoutPosition(currentBadge, draggedPoint)

      return {
        ...nextBadge,
        layout: clampRatingBadgeLayoutToSafeZone(nextBadge, selectedDiscTemplate),
      }
    })
  }

  function handleRatingBadgePointerUp(event: PointerEvent<Element>) {
    const dragState = ratingBadgeDragStateRef.current

    if (!dragState || dragState.pointerId !== event.pointerId) {
      return
    }

    event.stopPropagation()
    ratingBadgeDragStateRef.current = null
    event.currentTarget.releasePointerCapture(event.pointerId)
  }

  function handleMediaMarkPointerDown(event: PointerEvent<Element>) {
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)

    mediaMarkDragStateRef.current = {
      ...createPercentDragState(
        event.pointerId,
        event.clientX,
        event.clientY,
        projectMediaMark.layout.x,
        projectMediaMark.layout.y,
      ),
    }
  }

  function handleMediaMarkPointerMove(event: PointerEvent<Element>) {
    const dragState = mediaMarkDragStateRef.current
    const previewRect = discPreviewRef.current?.getBoundingClientRect()

    if (!dragState || dragState.pointerId !== event.pointerId || !previewRect) {
      return
    }

    event.stopPropagation()

    const draggedPoint = getDraggedPercentPoint(
      dragState,
      event.clientX,
      event.clientY,
      previewRect,
    )

    setProjectMediaMark((currentMark) => {
      const nextMark = updateMediaMarkLayoutPosition(currentMark, draggedPoint)

      return {
        ...nextMark,
        layout: clampMediaMarkLayoutToSafeZone(nextMark, selectedDiscTemplate),
      }
    })
  }

  function handleMediaMarkPointerUp(event: PointerEvent<Element>) {
    const dragState = mediaMarkDragStateRef.current

    if (!dragState || dragState.pointerId !== event.pointerId) {
      return
    }

    event.stopPropagation()
    mediaMarkDragStateRef.current = null
    event.currentTarget.releasePointerCapture(event.pointerId)
  }

  function handlePlatformMarkPointerDown(
    event: PointerEvent<Element>,
    value: PlatformMarkValue,
  ) {
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)

    const asset =
      projectPlatformMarks.assets[value] ?? createDefaultProjectPlatformMarkAsset(value)

    platformMarkDragStateRef.current = {
      value,
      ...createPercentDragState(
        event.pointerId,
        event.clientX,
        event.clientY,
        asset.layout.x,
        asset.layout.y,
      ),
    }
  }

  function handlePlatformMarkPointerMove(event: PointerEvent<Element>) {
    const dragState = platformMarkDragStateRef.current
    const previewRect = discPreviewRef.current?.getBoundingClientRect()

    if (!dragState || dragState.pointerId !== event.pointerId || !previewRect) {
      return
    }

    event.stopPropagation()

    const draggedPoint = getDraggedPercentPoint(
      dragState,
      event.clientX,
      event.clientY,
      previewRect,
    )

    setProjectPlatformMarks((currentMarks) => {
      const nextMarks = updatePlatformMarkLayoutPosition(
        currentMarks,
        dragState.value,
        draggedPoint,
      )

      return clampProjectPlatformMarksToSafeZone(nextMarks, selectedDiscTemplate)
    })
  }

  function handlePlatformMarkPointerUp(event: PointerEvent<Element>) {
    const dragState = platformMarkDragStateRef.current

    if (!dragState || dragState.pointerId !== event.pointerId) {
      return
    }

    event.stopPropagation()
    platformMarkDragStateRef.current = null
    event.currentTarget.releasePointerCapture(event.pointerId)
  }

  async function handleBackgroundUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    let imageDataUrl: string
    try {
      imageDataUrl = await readImageFileAsDataUrl(file)
    } catch {
      announceStatus('Background image could not be read.')
      return
    }

    try {
      await setBackgroundFromDataUrl(
        imageDataUrl,
        'Background image loaded and will be embedded when saved.',
      )
    } catch {
      announceStatus('Background image could not be loaded.')
    }
  }

  function handleResetBackground() {
    setBackgroundScale(DEFAULT_BACKGROUND_SCALE)
    setBackgroundOffset(createDefaultBackgroundOffset())
  }

  function handleBackgroundScaleChange(value: number) {
    setBackgroundScale(updateBackgroundScale(value))
  }

  function handleBackgroundPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!backgroundImageUrl) {
      return
    }

    event.currentTarget.setPointerCapture(event.pointerId)

    dragStateRef.current = createPixelDragState(
      event.pointerId,
      event.clientX,
      event.clientY,
      backgroundOffset,
    )
  }

  function handleBackgroundPointerMove(event: PointerEvent<HTMLDivElement>) {
    const dragState = dragStateRef.current

    if (!dragState || dragState.pointerId !== event.pointerId) {
      return
    }

    setBackgroundOffset(getDraggedPixelOffset(dragState, event.clientX, event.clientY))
  }

  function handleBackgroundPointerUp(event: PointerEvent<HTMLDivElement>) {
    const dragState = dragStateRef.current

    if (!dragState || dragState.pointerId !== event.pointerId) {
      return
    }

    dragStateRef.current = null
    event.currentTarget.releasePointerCapture(event.pointerId)
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
          manualGameTitle={manualGameTitle}
          handleDiscTextToggle={handleDiscTextToggle}
          handleDiscTextContentChange={handleDiscTextContentChange}
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
