import { confirm, open, save } from '@tauri-apps/plugin-dialog'
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type CSSProperties, type PointerEvent } from 'react'
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
  clampLayoutPointToSafeZone,
  clampNumber,
  CUSTOM_OUTER_DIAMETER_MAX_MM,
  EXPORT_DPI,
  mmToPixels,
  normalizeCustomDiscTemplate,
} from './discGeometry'
import { DEFAULT_EXPORT_GUIDES, exportGuideModeToSelection, type ExportGuideKey, type ExportGuideSelection } from './exportGuides'
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
import { normalizeParsedProject } from './project/normalizeProject'
import { createDefaultProjectMetadata, createProjectMetadataFromSteamGame, normalizeProjectMetadata } from './project/projectMetadata'
import { createDefaultProjectLogoAssets, normalizeProjectLogoAssets } from './project/projectLogoAssets'
import { createDefaultProjectRatingBadge, normalizeProjectRatingBadge } from './project/projectRatingBadge'
import type { BackgroundImageSize, BackgroundOffset, LogoAssetLayout, ProjectLogoAssets, ProjectMetadata, ProjectRatingBadge, RatingBadgeLayout, SavedProject, SelectedDiscTemplateId, SteamBannerColors, SteamBannerLockupLayout } from './project/projectTypes'
import { readProjectFile, writeBinaryFile, writeProjectFile } from './tauri/fileSystem'
import { loadImage } from './export/canvasImage'
import { exportDiscLabelPngBytes } from './export/exportPng'
import { buildExportPreflightSummary } from './export/exportPreflight'
import defaultSteamBannerLockupUrl from './assets/steam-default-lockup.png'
import {
  DEFAULT_DISC_TEXT_SETTINGS,
  createDefaultDiscTextLayout,
  createDefaultDiscTextValues,
  getDefaultCopyrightCurvedLayout,
  getDefaultCopyrightStraightLayout,
  normalizeDiscTextLayout,
  normalizeDiscTextSettings,
  normalizeDiscTextValues,
  normalizeDiscTextWidth,
  type DiscTextAlignment,
  type DiscTextArcSide,
  type DiscTextKey,
  type DiscTextLayout,
  type DiscTextLayoutSettings,
  type DiscTextMode,
  type DiscTextSettings,
  type DiscTextValues,
  type SteamLogoPlacement,
} from './discText'

type TextDragState = {
  key: DiscTextKey
  pointerId: number
  startClientX: number
  startClientY: number
  startX: number
  startY: number
}

type LogoDragState = {
  logoKey: 'developer' | 'publisher'
  pointerId: number
  startClientX: number
  startClientY: number
  startX: number
  startY: number
}

type RatingBadgeDragState = {
  pointerId: number
  startClientX: number
  startClientY: number
  startX: number
  startY: number
}

type CustomDimensionKey =
  | 'outerDiameterMm'
  | 'physicalCenterHoleDiameterMm'
  | 'innerHoleDiameterMm'
  | 'printableDiameterMm'
  | 'safeDiameterMm'

type DragState = {
  pointerId: number
  startClientX: number
  startClientY: number
  startOffsetX: number
  startOffsetY: number
}

const DEFAULT_STEAM_BANNER_COLORS: SteamBannerColors = {
  gradientStart: '#2b475e',
  gradientEnd: '#1b2838',
  accent: '#2aabe1',
}
const DEFAULT_STEAM_BANNER_LOCKUP_IMAGE_URL = defaultSteamBannerLockupUrl
const DEFAULT_STEAM_BANNER_LOCKUP_LAYOUT: SteamBannerLockupLayout = {
  scale: 1,
  offsetX: 0,
  offsetY: 0,
}

function getSteamBannerStyle(colors: SteamBannerColors): CSSProperties {
  return {
    '--steam-banner-gradient-start': colors.gradientStart,
    '--steam-banner-gradient-end': colors.gradientEnd,
    '--steam-banner-accent': colors.accent,
  } as CSSProperties
}

function createCustomDiscTemplate(source: DiscTemplate = discTemplates.standardPrintableDisc): DiscTemplate {
  return normalizeCustomDiscTemplate({
    ...source,
    id: 'custom',
    name: 'Custom dimensions',
    geometryNote:
      'Custom dimensions are saved with the project. Safe zone is advisory only and does not crop exported artwork.',
    defaultZones: [],
  })
}

function getGuideInsetPercent(outerDiameterMm: number, guideDiameterMm: number) {
  return ((outerDiameterMm - guideDiameterMm) / 2 / outerDiameterMm) * 100
}

function readImageFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
        return
      }

      reject(new Error(`Could not read ${file.name} as an image.`))
    }

    reader.onerror = () => reject(new Error(`Could not read ${file.name}.`))
    reader.readAsDataURL(file)
  })
}

function getNaturalImageSize(image: HTMLImageElement): BackgroundImageSize {
  return {
    width: image.naturalWidth || image.width,
    height: image.naturalHeight || image.height,
  }
}

function clampLogoAssetLayoutToSafeZone(
  layout: LogoAssetLayout,
  selectedDiscTemplate: DiscTemplate,
): LogoAssetLayout {
  const point = clampLayoutPointToSafeZone(layout, selectedDiscTemplate)

  return {
    ...layout,
    x: point.x,
    y: point.y,
  }
}

function clampRatingBadgeLayoutToSafeZone(
  layout: RatingBadgeLayout,
  selectedDiscTemplate: DiscTemplate,
): RatingBadgeLayout {
  const point = clampLayoutPointToSafeZone(layout, selectedDiscTemplate)

  return {
    ...layout,
    x: point.x,
    y: point.y,
  }
}

function App() {
  const [selectedDiscTemplateId, setSelectedDiscTemplateId] =
    useState<SelectedDiscTemplateId>('standardPrintableDisc')
  const [customDiscTemplate, setCustomDiscTemplate] = useState<DiscTemplate>(() =>
    createCustomDiscTemplate(),
  )
  const [steamLogoPlacement, setSteamLogoPlacement] =
    useState<SteamLogoPlacement>('top')
  const [steamBannerColors, setSteamBannerColors] = useState<SteamBannerColors>(
    DEFAULT_STEAM_BANNER_COLORS,
  )
  const [steamBannerLockupImageUrl, setSteamBannerLockupImageUrl] = useState<
    string | null
  >(DEFAULT_STEAM_BANNER_LOCKUP_IMAGE_URL)
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
  const [backgroundScale, setBackgroundScale] = useState(1)
  const [backgroundOffset, setBackgroundOffset] = useState<BackgroundOffset>({
    x: 0,
    y: 0,
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
  const discPreviewRef = useRef<HTMLDivElement | null>(null)
  const selectedDiscTemplate =
    selectedDiscTemplateId === 'custom'
      ? customDiscTemplate
      : discTemplates[selectedDiscTemplateId]
  const isCustomDiscTemplate = selectedDiscTemplateId === 'custom'
  const steamBannerStyle = useMemo(
    () => getSteamBannerStyle(steamBannerColors),
    [steamBannerColors],
  )

  const backgroundPreviewSize = useMemo(() => {
    if (!backgroundImageSize || backgroundImageSize.width <= 0 || backgroundImageSize.height <= 0) {
      return {
        width: '100%',
        height: '100%',
      }
    }

    const aspectRatio = backgroundImageSize.width / backgroundImageSize.height

    if (aspectRatio >= 1) {
      return {
        width: `${aspectRatio * 100}%`,
        height: '100%',
      }
    }

    return {
      width: '100%',
      height: `${(1 / aspectRatio) * 100}%`,
    }
  }, [backgroundImageSize])

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

  function clampForegroundAssetLayoutsToTemplate(template: DiscTemplate) {
    setProjectLogoAssets((currentLogoAssets) => {
      const developerLogoLayout = clampLogoAssetLayoutToSafeZone(
        currentLogoAssets.developerLogoLayout,
        template,
      )
      const publisherLogoLayout = clampLogoAssetLayoutToSafeZone(
        currentLogoAssets.publisherLogoLayout,
        template,
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
      const layout = clampRatingBadgeLayoutToSafeZone(
        currentBadge.layout,
        template,
      )

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

  function createProjectSnapshot(): SavedProject {
    return {
      schemaVersion: '0.1.0',
      title: manualGameTitle,
      savedAt: new Date().toISOString(),
      game: {
        manualTitle: manualGameTitle,
        selectedSteamGame,
      },
      metadata: projectMetadata,
      logoAssets: projectLogoAssets,
      ratingBadge: projectRatingBadge,
      template: {
        type: 'disc',
        variant: selectedDiscTemplateId,
        customDimensions: selectedDiscTemplateId === 'custom' ? customDiscTemplate : null,
      },
      steamBackupLogo: {
        placement: steamLogoPlacement,
        bannerColors: steamBannerColors,
        lockupImageDataUrl: steamBannerLockupImageUrl,
        lockupImageSize: steamBannerLockupImageSize,
        lockupLayout: steamBannerLockupLayout,
      },
      export: {
        guides: exportGuides,
      },
      background: {
        scale: backgroundScale,
        offset: backgroundOffset,
        imageDataUrl: backgroundImageUrl,
        imageSize: backgroundImageSize,
        note:
          'MVP save state embeds the background image as a data URL. A more efficient .sbls package format can replace this later.',
      },
      discText: {
        settings: discTextSettings,
        values: discTextValues,
        layout: discTextLayout,
      },
    }
  }

  async function setBackgroundFromDataUrl(
    imageDataUrl: string,
    statusMessage: string,
    options: { clearSelectedArtwork?: boolean } = {},
  ) {
    const image = await loadImage(imageDataUrl)

    setBackgroundImageUrl(imageDataUrl)
    setBackgroundImageSize(getNaturalImageSize(image))
    setBackgroundScale(1)
    setBackgroundOffset({ x: 0, y: 0 })

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

      setSteamBannerLockupImageUrl(imageDataUrl)
      setSteamBannerLockupImageSize(getNaturalImageSize(image))
      announceStatus(`Using ${file.name} as the Steam banner lockup.`)
    } catch (error) {
      announceStatus(`Banner lockup import failed: ${String(error)}`)
    }
  }

  function handleClearSteamBannerLockup() {
    setSteamBannerLockupImageUrl(DEFAULT_STEAM_BANNER_LOCKUP_IMAGE_URL)
    setSteamBannerLockupImageSize(null)
    announceStatus('Reset Steam banner lockup image to the default asset.')
  }

  function handleSteamBannerLockupLayoutChange(
    field: keyof SteamBannerLockupLayout,
    value: number,
  ) {
    setSteamBannerLockupLayout((currentLayout) => ({
      ...currentLayout,
      [field]: value,
    }))
  }

  function handleResetSteamBannerLockupLayout() {
    setSteamBannerLockupLayout(DEFAULT_STEAM_BANNER_LOCKUP_LAYOUT)
    announceStatus('Reset Steam banner lockup layout to the default position.')
  }

  function handleSteamBannerColorChange(
    field: keyof SteamBannerColors,
    value: string,
  ) {
    setSteamBannerColors((currentColors) => ({
      ...currentColors,
      [field]: value,
    }))
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
        if (logoKey === 'developer') {
          const developerLogoLayout = clampLogoAssetLayoutToSafeZone(
            {
              ...currentLogoAssets.developerLogoLayout,
              enabled: true,
            },
            selectedDiscTemplate,
          )

          return {
            ...currentLogoAssets,
            developerLogoDataUrl: imageDataUrl,
            developerLogoSize: imageSize,
            developerLogoLayout,
          }
        }

        const publisherLogoLayout = clampLogoAssetLayoutToSafeZone(
          {
            ...currentLogoAssets.publisherLogoLayout,
            enabled: true,
          },
          selectedDiscTemplate,
        )

        return {
          ...currentLogoAssets,
          publisherLogoDataUrl: imageDataUrl,
          publisherLogoSize: imageSize,
          publisherLogoLayout,
        }
      })

      announceStatus(`Using ${file.name} as the ${logoKey} logo.`)
    } catch (error) {
      announceStatus(`Logo import failed: ${String(error)}`)
    }
  }

  function handleLogoAssetLayoutChange(
    logoKey: 'developer' | 'publisher',
    field: 'enabled' | 'scale' | 'x' | 'y',
    value: boolean | number,
  ) {
    setProjectLogoAssets((currentLogoAssets) => {
      if (logoKey === 'developer') {
        const developerLogoLayout = clampLogoAssetLayoutToSafeZone(
          {
            ...currentLogoAssets.developerLogoLayout,
            [field]: value,
          },
          selectedDiscTemplate,
        )

        return {
          ...currentLogoAssets,
          developerLogoLayout,
        }
      }

      const publisherLogoLayout = clampLogoAssetLayoutToSafeZone(
        {
          ...currentLogoAssets.publisherLogoLayout,
          [field]: value,
        },
        selectedDiscTemplate,
      )

      return {
        ...currentLogoAssets,
        publisherLogoLayout,
      }
    })
  }

  function handleClearLogoAsset(logoKey: 'developer' | 'publisher') {
    setProjectLogoAssets((currentLogoAssets) => {
      const defaults = createDefaultProjectLogoAssets()

      if (logoKey === 'developer') {
        return {
          ...currentLogoAssets,
          developerLogoDataUrl: null,
          developerLogoSize: null,
          developerLogoLayout: clampLogoAssetLayoutToSafeZone(
            defaults.developerLogoLayout,
            selectedDiscTemplate,
          ),
        }
      }

      return {
        ...currentLogoAssets,
        publisherLogoDataUrl: null,
        publisherLogoSize: null,
        publisherLogoLayout: clampLogoAssetLayoutToSafeZone(
          defaults.publisherLogoLayout,
          selectedDiscTemplate,
        ),
      }
    })

    announceStatus(`Cleared ${logoKey} logo asset.`)
  }

  function handleResetLogoAssetLayout(logoKey: 'developer' | 'publisher') {
    setProjectLogoAssets((currentLogoAssets) => {
      const defaults = createDefaultProjectLogoAssets()

      if (logoKey === 'developer') {
        return {
          ...currentLogoAssets,
          developerLogoLayout: clampLogoAssetLayoutToSafeZone(
            {
              ...defaults.developerLogoLayout,
              enabled: currentLogoAssets.developerLogoLayout.enabled,
            },
            selectedDiscTemplate,
          ),
        }
      }

      return {
        ...currentLogoAssets,
        publisherLogoLayout: clampLogoAssetLayoutToSafeZone(
          {
            ...defaults.publisherLogoLayout,
            enabled: currentLogoAssets.publisherLogoLayout.enabled,
          },
          selectedDiscTemplate,
        ),
      }
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

      setProjectRatingBadge((currentBadge) => ({
        ...currentBadge,
        source: 'custom',
        customImageDataUrl: imageDataUrl,
        customImageSize: getNaturalImageSize(image),
        layout: clampRatingBadgeLayoutToSafeZone(
          {
            ...currentBadge.layout,
            enabled: true,
          },
          selectedDiscTemplate,
        ),
      }))

      announceStatus(`Using ${file.name} as the rating badge.`)
    } catch (error) {
      announceStatus(`Rating badge import failed: ${String(error)}`)
    }
  }

  function handleRatingBadgeSourceChange(source: 'placeholder' | 'custom') {
    setProjectRatingBadge((currentBadge) => ({
      ...currentBadge,
      source,
    }))
  }

  function handleRatingBadgeLayoutChange(
    field: keyof ProjectRatingBadge['layout'],
    value: boolean | number,
  ) {
    setProjectRatingBadge((currentBadge) => ({
      ...currentBadge,
      layout: clampRatingBadgeLayoutToSafeZone(
        {
          ...currentBadge.layout,
          [field]: value,
        },
        selectedDiscTemplate,
      ),
    }))
  }

  function handleClearRatingBadgeImage() {
    setProjectRatingBadge((currentBadge) => ({
      ...currentBadge,
      source: 'placeholder',
      customImageDataUrl: null,
      customImageSize: null,
    }))

    announceStatus('Cleared custom rating badge image.')
  }

  function handleResetRatingBadgeLayout() {
    const defaults = createDefaultProjectRatingBadge()

    setProjectRatingBadge((currentBadge) => ({
      ...currentBadge,
      layout: clampRatingBadgeLayoutToSafeZone(
        {
          ...defaults.layout,
          enabled: currentBadge.layout.enabled,
        },
        selectedDiscTemplate,
      ),
    }))

    announceStatus('Reset rating badge layout.')
  }

  function handleResetSteamBannerColors() {
    setSteamBannerColors(DEFAULT_STEAM_BANNER_COLORS)
    announceStatus('Reset Steam banner colors to the default palette.')
  }

  function handleSteamLogoPlacementChange(placement: SteamLogoPlacement) {
    setSteamLogoPlacement(placement)

    const defaultLayout = createDefaultDiscTextLayout(placement)

    setDiscTextLayout((currentLayout) => ({
      ...currentLayout,
      title: defaultLayout.title,
      customNote: defaultLayout.customNote,
      copyright: defaultLayout.copyright,
    }))
  }

  function handleDiscTextToggle(key: DiscTextKey, checked: boolean) {
    setDiscTextSettings((currentSettings) => ({
      ...currentSettings,
      [key]: checked,
    }))
  }

  function handleDiscTextContentChange(key: DiscTextKey, value: string) {
    if (key === 'title') {
      setManualGameTitle(value)
      return
    }

    setDiscTextValues((currentValues) => ({
      ...currentValues,
      [key]: value,
    }))
  }

  function handleDiscTextLayoutChange(
    key: DiscTextKey,
    field: 'x' | 'y' | 'width' | 'scale' | 'arcDegrees',
    value: number,
  ) {
    setDiscTextLayout((currentLayout) => ({
      ...currentLayout,
      [key]: {
        ...currentLayout[key],
        [field]:
          field === 'width'
            ? normalizeDiscTextWidth(value, currentLayout[key].width)
            : value,
      },
    }))
  }

  function handleDiscTextAlignmentChange(key: DiscTextKey, align: DiscTextAlignment) {
    setDiscTextLayout((currentLayout) => ({
      ...currentLayout,
      [key]: {
        ...currentLayout[key],
        align,
      },
    }))
  }

  function handleDiscTextModeChange(key: DiscTextKey, mode: DiscTextMode) {
    setDiscTextLayout((currentLayout) => {
      if (key === 'copyright') {
        const defaultLayout =
          mode === 'curved'
            ? getDefaultCopyrightCurvedLayout(steamLogoPlacement)
            : getDefaultCopyrightStraightLayout(steamLogoPlacement)

        return {
          ...currentLayout,
          copyright: {
            ...currentLayout.copyright,
            ...defaultLayout,
            mode,
          },
        }
      }

      return {
        ...currentLayout,
        [key]: {
          ...currentLayout[key],
          mode,
        },
      }
    })
  }

  function handleDiscTextArcSideChange(key: DiscTextKey, arcSide: DiscTextArcSide) {
    setDiscTextLayout((currentLayout) => ({
      ...currentLayout,
      [key]: {
        ...currentLayout[key],
        arcSide,
      },
    }))
  }

  function handleResetDiscTextLayout(key: DiscTextKey) {
    const defaultLayout = createDefaultDiscTextLayout(steamLogoPlacement)

    setDiscTextLayout((currentLayout) => {
      if (key === 'copyright') {
        return {
          ...currentLayout,
          copyright:
            currentLayout.copyright.mode === 'curved'
              ? getDefaultCopyrightCurvedLayout(steamLogoPlacement)
              : getDefaultCopyrightStraightLayout(steamLogoPlacement),
        }
      }

      return {
        ...currentLayout,
        [key]: defaultLayout[key],
      }
    })
  }

  function getDiscTextInputValue(key: DiscTextKey) {
    if (key === 'title') {
      return manualGameTitle
    }

    return discTextValues[key]
  }

  function handleExportGuideToggle(guide: ExportGuideKey, checked: boolean) {
    setExportGuides((currentGuides) => ({
      ...currentGuides,
      [guide]: checked,
    }))
  }

  function handleProjectMetadataChange(field: keyof ProjectMetadata, value: string) {
    setProjectMetadata((currentMetadata) => ({
      ...currentMetadata,
      [field]: value,
    }))

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

    setSelectedDiscTemplateId('standardPrintableDisc')
    setCustomDiscTemplate(createCustomDiscTemplate())
    setSteamLogoPlacement('top')
    setSteamBannerColors(DEFAULT_STEAM_BANNER_COLORS)
    setSteamBannerLockupImageUrl(DEFAULT_STEAM_BANNER_LOCKUP_IMAGE_URL)
    setSteamBannerLockupImageSize(null)
    setSteamBannerLockupLayout(DEFAULT_STEAM_BANNER_LOCKUP_LAYOUT)
    setExportGuides(DEFAULT_EXPORT_GUIDES)
    setBackgroundImageUrl(null)
    setBackgroundImageSize(null)
    setBackgroundScale(1)
    setBackgroundOffset({ x: 0, y: 0 })
    setGameSearchQuery('')
    setManualGameTitle('Untitled Steam Backup Label')
    setProjectMetadata(createDefaultProjectMetadata())
    setProjectLogoAssets(createDefaultProjectLogoAssets())
    setProjectRatingBadge(createDefaultProjectRatingBadge())
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
      clampForegroundAssetLayoutsToTemplate(customDiscTemplate)
      announceStatus('Custom disc dimensions enabled. Edit the numeric fields below.')
      return
    }

    clampForegroundAssetLayoutsToTemplate(discTemplates[templateId])
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
      clampForegroundAssetLayoutsToTemplate(nextTemplate)
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

      const project = createProjectSnapshot()
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
        ? createCustomDiscTemplate(project.template.customDimensions)
        : createCustomDiscTemplate()
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
        ),
        publisherLogoLayout: clampLogoAssetLayoutToSafeZone(
          loadedLogoAssets.publisherLogoLayout,
          loadedSelectedDiscTemplate,
        ),
      })
      const loadedRatingBadge = normalizeProjectRatingBadge(project.ratingBadge)
      setProjectRatingBadge({
        ...loadedRatingBadge,
        layout: clampRatingBadgeLayoutToSafeZone(
          loadedRatingBadge.layout,
          loadedSelectedDiscTemplate,
        ),
      })
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
      setSteamBannerLockupImageUrl(
        project.steamBackupLogo.lockupImageDataUrl ?? DEFAULT_STEAM_BANNER_LOCKUP_IMAGE_URL,
      )
      setSteamBannerLockupImageSize(project.steamBackupLogo.lockupImageSize ?? null)
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
        normalizeDiscTextLayout(project.discText?.layout, project.steamBackupLogo.placement),
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
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: discTextLayout[key].x,
      startY: discTextLayout[key].y,
    }
  }

  function handleDiscTextPointerMove(event: PointerEvent<Element>) {
    const dragState = textDragStateRef.current
    const previewRect = discPreviewRef.current?.getBoundingClientRect()

    if (!dragState || dragState.pointerId !== event.pointerId || !previewRect) {
      return
    }

    event.stopPropagation()

    const deltaXPercent = ((event.clientX - dragState.startClientX) / previewRect.width) * 100
    const deltaYPercent = ((event.clientY - dragState.startClientY) / previewRect.height) * 100

    setDiscTextLayout((currentLayout) => {
      const currentTextLayout = currentLayout[dragState.key]
      const isCurvedCopyright =
        dragState.key === 'copyright' && currentTextLayout.mode === 'curved'

      return {
        ...currentLayout,
        [dragState.key]: {
          ...currentTextLayout,
          x: isCurvedCopyright
            ? clampNumber(dragState.startX + deltaXPercent, -60, 60)
            : clampNumber(dragState.startX + deltaXPercent, -35, 35),
          y: isCurvedCopyright
            ? clampNumber(dragState.startY + deltaYPercent, -8, 20)
            : clampNumber(dragState.startY + deltaYPercent, 8, 92),
        },
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
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: layout.x,
      startY: layout.y,
    }
  }

  function handleLogoAssetPointerMove(event: PointerEvent<Element>) {
    const dragState = logoDragStateRef.current
    const previewRect = discPreviewRef.current?.getBoundingClientRect()

    if (!dragState || dragState.pointerId !== event.pointerId || !previewRect) {
      return
    }

    event.stopPropagation()

    const deltaXPercent = ((event.clientX - dragState.startClientX) / previewRect.width) * 100
    const deltaYPercent = ((event.clientY - dragState.startClientY) / previewRect.height) * 100

    setProjectLogoAssets((currentLogoAssets) => {
      const nextPoint = clampLayoutPointToSafeZone(
        {
          x: dragState.startX + deltaXPercent,
          y: dragState.startY + deltaYPercent,
        },
        selectedDiscTemplate,
      )

      if (dragState.logoKey === 'developer') {
        return {
          ...currentLogoAssets,
          developerLogoLayout: {
            ...currentLogoAssets.developerLogoLayout,
            x: nextPoint.x,
            y: nextPoint.y,
          },
        }
      }

      return {
        ...currentLogoAssets,
        publisherLogoLayout: {
          ...currentLogoAssets.publisherLogoLayout,
          x: nextPoint.x,
          y: nextPoint.y,
        },
      }
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
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: projectRatingBadge.layout.x,
      startY: projectRatingBadge.layout.y,
    }
  }

  function handleRatingBadgePointerMove(event: PointerEvent<Element>) {
    const dragState = ratingBadgeDragStateRef.current
    const previewRect = discPreviewRef.current?.getBoundingClientRect()

    if (!dragState || dragState.pointerId !== event.pointerId || !previewRect) {
      return
    }

    event.stopPropagation()

    const deltaXPercent = ((event.clientX - dragState.startClientX) / previewRect.width) * 100
    const deltaYPercent = ((event.clientY - dragState.startClientY) / previewRect.height) * 100

    setProjectRatingBadge((currentBadge) => ({
      ...currentBadge,
      layout: {
        ...currentBadge.layout,
        ...clampLayoutPointToSafeZone(
          {
            x: dragState.startX + deltaXPercent,
            y: dragState.startY + deltaYPercent,
          },
          selectedDiscTemplate,
        ),
      },
    }))
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

  function getDiscTextPreviewTransform(_key: DiscTextKey, layout: DiscTextLayout) {
    if (layout.mode === 'straight') {
      return `translate(-50%, -50%) scale(${layout.scale})`
    }

    const horizontalTranslate =
      layout.align === 'left'
        ? '0'
        : layout.align === 'right'
          ? '-100%'
          : '-50%'

    return `translate(${horizontalTranslate}, -50%) scale(${layout.scale})`
  }

  function handleBackgroundUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    const reader = new FileReader()

    reader.onload = () => {
      const imageDataUrl = reader.result

      if (typeof imageDataUrl !== 'string') {
        announceStatus('Background image could not be loaded.')
        return
      }

      void setBackgroundFromDataUrl(
        imageDataUrl,
        'Background image loaded and will be embedded when saved.',
      )
    }

    reader.onerror = () => {
      announceStatus('Background image could not be read.')
    }

    reader.readAsDataURL(file)
  }

  function handleResetBackground() {
    setBackgroundScale(1)
    setBackgroundOffset({ x: 0, y: 0 })
  }

  function handleBackgroundPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!backgroundImageUrl) {
      return
    }

    event.currentTarget.setPointerCapture(event.pointerId)

    dragStateRef.current = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startOffsetX: backgroundOffset.x,
      startOffsetY: backgroundOffset.y,
    }
  }

  function handleBackgroundPointerMove(event: PointerEvent<HTMLDivElement>) {
    const dragState = dragStateRef.current

    if (!dragState || dragState.pointerId !== event.pointerId) {
      return
    }

    const deltaX = event.clientX - dragState.startClientX
    const deltaY = event.clientY - dragState.startClientY

    setBackgroundOffset({
      x: dragState.startOffsetX + deltaX,
      y: dragState.startOffsetY + deltaY,
    })
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
          setBackgroundScale={setBackgroundScale}
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
        />


        <TextPanel
          discTextSettings={discTextSettings}
          discTextLayout={discTextLayout}
          getDiscTextInputValue={getDiscTextInputValue}
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
        steamBannerStyle={steamBannerStyle}
        steamBannerLockupImageUrl={steamBannerLockupImageUrl}
        steamBannerLockupLayout={steamBannerLockupLayout}
        projectLogoAssets={projectLogoAssets}
        projectMetadata={projectMetadata}
        projectRatingBadge={projectRatingBadge}
        handleRatingBadgePointerDown={handleRatingBadgePointerDown}
        handleRatingBadgePointerMove={handleRatingBadgePointerMove}
        handleRatingBadgePointerUp={handleRatingBadgePointerUp}
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
