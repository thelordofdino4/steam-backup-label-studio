import { open, save } from '@tauri-apps/plugin-dialog'
import { useMemo, useRef, useState, type ChangeEvent, type CSSProperties, type PointerEvent } from 'react'
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
  clampNumber,
  CUSTOM_OUTER_DIAMETER_MAX_MM,
  EXPORT_DPI,
  mmToPixels,
  normalizeCustomDiscTemplate,
} from './discGeometry'
import { DEFAULT_EXPORT_GUIDES, exportGuideModeToSelection, type ExportGuideKey, type ExportGuideSelection } from './exportGuides'
import './App.css'
import './layoutFix.css'
import { normalizeParsedProject } from './project/normalizeProject'
import type { BackgroundImageSize, BackgroundOffset, SavedProject, SelectedDiscTemplateId, SteamBannerColors } from './project/projectTypes'
import { readProjectFile, writeBinaryFile, writeProjectFile } from './tauri/fileSystem'
import { loadImage } from './export/canvasImage'
import { exportDiscLabelPngBytes } from './export/exportPng'
import defaultSteamBannerLockupUrl from './assets/steam-default-lockup.png'
import {
  DEFAULT_DISC_TEXT_SETTINGS,
  DISC_TEXT_KEYS,
  createDefaultDiscTextLayout,
  createDefaultDiscTextValues,
  getCopyrightArcSide,
  getCurvedPreviewLetterSpacing,
  getDefaultCopyrightCurvedLayout,
  getDefaultCopyrightStraightLayout,
  getDiscTextContent,
  getDiscTextLabel,
  getDiscTextPreviewClassName,
  getLargeArcFlag,
  getReadableCurvedTextScale,
  normalizeDiscTextLayout,
  normalizeDiscTextSettings,
  normalizeDiscTextValues,
  wrapPreviewTextByArcLength,
  createSvgArcPath,
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

type StatusToastKind = 'info' | 'success' | 'warning' | 'error' | 'steam' | 'artwork' | 'template' | 'export'

type StatusToast = {
  id: string
  message: string
  kind: StatusToastKind
  icon: string
}


const DEFAULT_STEAM_BANNER_COLORS: SteamBannerColors = {
  gradientStart: '#2b475e',
  gradientEnd: '#1b2838',
  accent: '#2aabe1',
}
const DEFAULT_STEAM_BANNER_LOCKUP_IMAGE_URL = defaultSteamBannerLockupUrl
function getSteamBannerStyle(colors: SteamBannerColors): CSSProperties {
  return {
    '--steam-banner-gradient-start': colors.gradientStart,
    '--steam-banner-gradient-end': colors.gradientEnd,
    '--steam-banner-accent': colors.accent,
  } as CSSProperties
}

function getStatusToastKind(message: string): StatusToastKind {
  const normalizedMessage = message.toLowerCase()

  if (normalizedMessage.includes('failed') || normalizedMessage.includes('could not')) {
    return 'error'
  }

  if (normalizedMessage.includes('cancelled')) {
    return 'warning'
  }

  if (normalizedMessage.includes('export')) {
    return 'export'
  }

  if (normalizedMessage.includes('steam') || normalizedMessage.includes('app id')) {
    return 'steam'
  }

  if (
    normalizedMessage.includes('background') ||
    normalizedMessage.includes('artwork') ||
    normalizedMessage.includes('image')
  ) {
    return 'artwork'
  }

  if (
    normalizedMessage.includes('template') ||
    normalizedMessage.includes('disc') ||
    normalizedMessage.includes('dimension')
  ) {
    return 'template'
  }

  if (normalizedMessage.includes('saved') || normalizedMessage.includes('loaded')) {
    return 'success'
  }

  return 'info'
}

function getStatusToastIcon(kind: StatusToastKind) {
  switch (kind) {
    case 'success':
      return '?'
    case 'warning':
      return '!'
    case 'error':
      return '×'
    case 'steam':
      return 'S'
    case 'artwork':
      return '?'
    case 'template':
      return '?'
    case 'export':
      return '?'
    default:
      return '•'
  }
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
  const [projectStatus, setProjectStatus] = useState(
    'No project file saved yet.',
  )
  const [statusToasts, setStatusToasts] = useState<StatusToast[]>([])
  const nextStatusToastIdRef = useRef(0)
  const [gameSearchQuery, setGameSearchQuery] = useState('')
  const [manualGameTitle, setManualGameTitle] = useState('Untitled Steam Backup Label')
  const [steamSearchResults, setSteamSearchResults] = useState<SteamSearchResult[]>([])
  const [selectedSteamGame, setSelectedSteamGame] = useState<SteamImportedGame | null>(null)
  const [isSteamSearchLoading, setIsSteamSearchLoading] = useState(false)
  const [isSteamImportLoading, setIsSteamImportLoading] = useState(false)
  const [selectedArtworkId, setSelectedArtworkId] = useState<string | null>(null)
  const [localSteamScreenshots, setLocalSteamScreenshots] = useState<
    LocalSteamScreenshotAsset[]
  >([])
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

  function announceStatus(message: string) {
    const kind = getStatusToastKind(message)
    const toastId = `status-toast-${nextStatusToastIdRef.current}`
    nextStatusToastIdRef.current += 1

    const toast: StatusToast = {
      id: toastId,
      message,
      kind,
      icon: getStatusToastIcon(kind),
    }

    setProjectStatus(message)
    setStatusToasts((currentToasts) => [...currentToasts, toast].slice(-5))

    window.setTimeout(() => {
      setStatusToasts((currentToasts) =>
        currentToasts.filter((currentToast) => currentToast.id !== toastId),
      )
    }, 3600)
  }

  function createProjectSnapshot(): SavedProject {
    return {
      schemaVersion: '0.1.0',
      title: manualGameTitle,
      savedAt: new Date().toISOString(),
      game: {
        manualTitle: manualGameTitle,
        selectedSteamGame,
      },
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
    field: 'x' | 'y' | 'scale' | 'arcDegrees',
    value: number,
  ) {
    setDiscTextLayout((currentLayout) => ({
      ...currentLayout,
      [key]: {
        ...currentLayout[key],
        [field]: value,
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

  function handleTemplateChange(templateId: SelectedDiscTemplateId) {
    setSelectedDiscTemplateId(templateId)

    if (templateId === 'custom') {
      announceStatus('Custom disc dimensions enabled. Edit the numeric fields below.')
      return
    }

    announceStatus(`Selected ${discTemplates[templateId].name}.`)
  }

  function handleCustomDimensionChange(field: CustomDimensionKey, value: string) {
    const numericValue = Number(value)

    if (!Number.isFinite(numericValue) || numericValue <= 0) {
      return
    }

    setCustomDiscTemplate((currentTemplate) => {
      const nextTemplate = {
        ...currentTemplate,
        [field]: numericValue,
      }

      return normalizeCustomDiscTemplate(nextTemplate)
    })
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
    setHasCheckedLocalSteamScreenshots(false)
    announceStatus(`Importing Steam App ID ${appId}...`)

    try {
      const importedGame = await importSteamApp(appId)
      setSelectedSteamGame(importedGame)
      setManualGameTitle(importedGame.title)
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

      setManualGameTitle(project.game?.manualTitle ?? project.title ?? 'Untitled Steam Backup Label')
      setSelectedSteamGame(project.game?.selectedSteamGame ?? null)
      setSelectedArtworkId(null)
      setLocalSteamScreenshots([])
      setHasCheckedLocalSteamScreenshots(false)

      if (savedTemplateId === 'custom') {
        setCustomDiscTemplate(
          project.template.customDimensions
            ? createCustomDiscTemplate(project.template.customDimensions)
            : createCustomDiscTemplate(),
        )
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

  function getDiscTextPreviewTransform(layout: DiscTextLayout) {
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

        <details className="panel collapsible-panel" open>
          <summary className="panel-summary">Project File</summary>
          <div className="panel-content">
          <div className="button-row">
            <button className="secondary-button" type="button" onClick={handleSaveProject}>
              Save Project
            </button>
            <button className="secondary-button" type="button" onClick={handleLoadProject}>
              Load Project
            </button>
            <button className="secondary-button" type="button" onClick={handleExportPng}>
              Export PNG
            </button>
          </div>
          <p className="hint">{projectStatus}</p>
          </div>
        </details>

        <details className="panel collapsible-panel" open>
          <summary className="panel-summary">Export Options</summary>
          <div className="panel-content">
          <p className="hint">
            Clean export is the default. Check only the guide marks you want included.
          </p>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={exportGuides.centerHole}
              onChange={(event) => handleExportGuideToggle('centerHole', event.target.checked)}
            />
            <span>Physical center hole guide</span>
          </label>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={exportGuides.outerEdge}
              onChange={(event) => handleExportGuideToggle('outerEdge', event.target.checked)}
            />
            <span>Outer cut/edge guide</span>
          </label>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={exportGuides.printableArea}
              onChange={(event) => handleExportGuideToggle('printableArea', event.target.checked)}
            />
            <span>Printable area guides</span>
          </label>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={exportGuides.safeZone}
              onChange={(event) => handleExportGuideToggle('safeZone', event.target.checked)}
            />
            <span>Safe zone guide</span>
          </label>
          </div>
        </details>

        <details className="panel collapsible-panel" open>
          <summary className="panel-summary">Game</summary>
          <div className="panel-content">
          <label className="field-label" htmlFor="game-title">
            Label title
          </label>
          <input
            id="game-title"
            type="text"
            value={manualGameTitle}
            onChange={(event) => setManualGameTitle(event.target.value)}
          />

          <label className="field-label spacing-top" htmlFor="game-search">
            Steam search
          </label>
          <input
            id="game-search"
            type="search"
            placeholder="Search by title or App ID"
            value={gameSearchQuery}
            onChange={(event) => setGameSearchQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                void handleSteamSearch()
              }
            }}
          />
          <button
            className="secondary-button"
            type="button"
            disabled={isSteamSearchLoading}
            onClick={handleSteamSearch}
          >
            {isSteamSearchLoading ? 'Searching...' : 'Search Steam'}
          </button>

          <div className="search-results">
            {steamSearchResults.map((game) => (
              <button
                className="search-result-button"
                key={game.appId}
                type="button"
                disabled={isSteamImportLoading}
                onClick={() => handleSteamImport(game.appId)}
              >
                <strong>{game.title}</strong>
                <span>
                  App ID {game.appId}
                  {game.price ? ` · ${game.price}` : ''}
                </span>
              </button>
            ))}
          </div>

          {selectedSteamGame && (
            <div className="selected-game-card">
              <h3>{selectedSteamGame.title}</h3>
              {selectedSteamGame.shortDescription && (
                <p>{selectedSteamGame.shortDescription}</p>
              )}
              <dl className="template-metrics">
                <div>
                  <dt>App ID</dt>
                  <dd>{selectedSteamGame.appId}</dd>
                </div>
                <div>
                  <dt>Developer</dt>
                  <dd>{selectedSteamGame.developer.join(', ') || 'Unknown'}</dd>
                </div>
                <div>
                  <dt>Publisher</dt>
                  <dd>{selectedSteamGame.publisher.join(', ') || 'Unknown'}</dd>
                </div>
                <div>
                  <dt>Release</dt>
                  <dd>{selectedSteamGame.releaseDate ?? 'Unknown'}</dd>
                </div>
              </dl>

              {selectedSteamGame.artwork.length > 0 && (
                <p className="hint">
                  Imported Steam artwork is available in the Artwork panel.
                </p>
              )}

            </div>
          )}

          </div>
        </details>

        <details className="panel collapsible-panel" open>
          <summary className="panel-summary">Template</summary>
          <div className="panel-content">
          <label className="field-label" htmlFor="disc-template">
            Disc type
          </label>
          <select
            id="disc-template"
            value={selectedDiscTemplateId}
            onChange={(event) =>
              handleTemplateChange(event.target.value as SelectedDiscTemplateId)
            }
          >
            {discTemplateOptions.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
            <option value="custom">Custom dimensions</option>
          </select>

          {isCustomDiscTemplate ? (
            <div className="custom-dimension-grid">
              <label className="custom-dimension-row">
                <span>Outer diameter</span>
                <input
                  type="number"
                  min="1"
                  max={CUSTOM_OUTER_DIAMETER_MAX_MM}
                  step="0.1"
                  value={customDiscTemplate.outerDiameterMm}
                  onChange={(event) =>
                    handleCustomDimensionChange('outerDiameterMm', event.target.value)
                  }
                />
                <span>mm</span>
              </label>
              <label className="custom-dimension-row">
                <span>Physical center hole</span>
                <input
                  type="number"
                  min="1"
                  max={customDiscTemplate.outerDiameterMm}
                  step="0.1"
                  value={customDiscTemplate.physicalCenterHoleDiameterMm}
                  onChange={(event) =>
                    handleCustomDimensionChange('physicalCenterHoleDiameterMm', event.target.value)
                  }
                />
                <span>mm</span>
              </label>
              <label className="custom-dimension-row">
                <span>Inner print boundary</span>
                <input
                  type="number"
                  min="1"
                  max={customDiscTemplate.outerDiameterMm}
                  step="0.1"
                  value={customDiscTemplate.innerHoleDiameterMm}
                  onChange={(event) =>
                    handleCustomDimensionChange('innerHoleDiameterMm', event.target.value)
                  }
                />
                <span>mm</span>
              </label>
              <label className="custom-dimension-row">
                <span>Outer print boundary</span>
                <input
                  type="number"
                  min="1"
                  max={customDiscTemplate.outerDiameterMm}
                  step="0.1"
                  value={customDiscTemplate.printableDiameterMm}
                  onChange={(event) =>
                    handleCustomDimensionChange('printableDiameterMm', event.target.value)
                  }
                />
                <span>mm</span>
              </label>
              <label className="custom-dimension-row">
                <span>Safe zone</span>
                <input
                  type="number"
                  min="1"
                  max={customDiscTemplate.outerDiameterMm}
                  step="0.1"
                  value={customDiscTemplate.safeDiameterMm}
                  onChange={(event) =>
                    handleCustomDimensionChange('safeDiameterMm', event.target.value)
                  }
                />
                <span>mm</span>
              </label>
            </div>
          ) : (
            <dl className="template-metrics">
              <div>
                <dt>Outer diameter</dt>
                <dd>{selectedDiscTemplate.outerDiameterMm} mm</dd>
              </div>
              <div>
                <dt>Physical center hole</dt>
                <dd>{selectedDiscTemplate.physicalCenterHoleDiameterMm} mm</dd>
              </div>
              <div>
                <dt>Inner print boundary</dt>
                <dd>{selectedDiscTemplate.innerHoleDiameterMm} mm</dd>
              </div>
              <div>
                <dt>Outer print boundary</dt>
                <dd>{selectedDiscTemplate.printableDiameterMm} mm</dd>
              </div>
              <div>
                <dt>Safe zone</dt>
                <dd>{selectedDiscTemplate.safeDiameterMm} mm</dd>
              </div>
            </dl>
          )}

          {selectedDiscTemplate.geometryNote && (
            <p className="hint">{selectedDiscTemplate.geometryNote}</p>
          )}
          </div>
        </details>

        <details className="panel collapsible-panel" open>
          <summary className="panel-summary">Artwork</summary>
          <div className="panel-content">
          {selectedSteamGame?.artwork.length ? (
            <div className="artwork-import-section">
              <h3 className="artwork-import-heading">Imported Steam artwork</h3>
              <p className="hint">
                Choose one of the imported Steam assets as the disc background.
              </p>

              <div className="search-results">
                {selectedSteamGame.artwork.map((asset) => (
                  <button
                    className="search-result-button"
                    key={asset.id}
                    type="button"
                    disabled={isArtworkLoading}
                    onClick={() => handleUseSteamArtwork(asset)}
                  >
                    <strong>{asset.label}</strong>
                    <span>
                      {asset.kind}{selectedArtworkId === asset.id ? ' · selected' : ''}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <p className="hint">
              Import a Steam game to see Steam artwork here, or upload a local image below.
            </p>
          )}

          <div className="local-steam-screenshot-section">
            <h3 className="artwork-import-heading">Local Steam screenshots</h3>

            {!selectedSteamGame ? (
              <p className="hint">
                Select or import a Steam game first. If Steam screenshots are found for that game, they will appear here.
              </p>
            ) : (
              <>
                <p className="hint">
                  Check your local Steam screenshot folder for {selectedSteamGame.title}.
                </p>

                <button
                  className="secondary-button"
                  type="button"
                  disabled={isLocalSteamScreenshotsLoading}
                  onClick={() => void handleFindLocalSteamScreenshots()}
                >
                  {isLocalSteamScreenshotsLoading ? 'Checking screenshots...' : 'Find local Steam screenshots'}
                </button>

                {hasCheckedLocalSteamScreenshots &&
                  !isLocalSteamScreenshotsLoading &&
                  localSteamScreenshots.length === 0 && (
                    <p className="hint">
                      No local Steam screenshots were found for this game.
                    </p>
                  )}

                {localSteamScreenshots.length > 0 && (
                  <>
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={() => void handleOpenLocalSteamScreenshotFolder()}
                    >
                      Open screenshot folder
                    </button>

                    <div className="search-results local-steam-screenshot-results">
                      {localSteamScreenshots.map((asset) => (
                        <button
                          className="search-result-button"
                          key={asset.id}
                          type="button"
                          onClick={() => void handleUseLocalSteamScreenshot(asset)}
                        >
                          <strong>{asset.label}</strong>
                          <span>
                            local screenshot{selectedArtworkId === asset.id ? ' · selected' : ''}
                          </span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </div>

          <label className="field-label" htmlFor="background-upload">
            Local image
          </label>
          <input
            id="background-upload"
            type="file"
            accept="image/*"
            onChange={handleBackgroundUpload}
          />

          <label className="field-label spacing-top" htmlFor="background-scale">
            Resize
          </label>
          <input
            id="background-scale"
            type="range"
            min="0.1"
            max="2"
            step="0.01"
            value={backgroundScale}
            disabled={!backgroundImageUrl}
            onChange={(event) => setBackgroundScale(Number(event.target.value))}
          />

          <button
            className="secondary-button"
            type="button"
            disabled={!backgroundImageUrl}
            onClick={() => {
              setBackgroundScale(1)
              setBackgroundOffset({ x: 0, y: 0 })
            }}
          >
            Reset background
          </button>

          <p className="hint">
            Upload an image, then drag it directly on the disc preview.
          </p>
          </div>
        </details>

        <details className="panel collapsible-panel" open>
          <summary className="panel-summary">Branding</summary>
          <div className="panel-content">
          <label className="field-label" htmlFor="steam-logo-placement">
            Placement
          </label>
          <select
            id="steam-logo-placement"
            value={steamLogoPlacement}
            onChange={(event) =>
              handleSteamLogoPlacementChange(event.target.value as SteamLogoPlacement)
            }
          >
            <option value="top">Top center</option>
            <option value="bottom">Bottom center</option>
            <option value="none">None</option>
          </select>

          <label className="field-label spacing-top" htmlFor="steam-banner-lockup-upload">
            Banner lockup image
          </label>
          <input
            id="steam-banner-lockup-upload"
            type="file"
            accept="image/*"
            onChange={handleSteamBannerLockupUpload}
          />

          {steamBannerLockupImageUrl ? (
            <div className="selected-lockup-card">
              <span>
                Banner lockup active
                {steamBannerLockupImageSize
                  ? ` · ${steamBannerLockupImageSize.width}×${steamBannerLockupImageSize.height}`
                  : ''}
              </span>
              <button
                className="secondary-button"
                type="button"
                onClick={handleClearSteamBannerLockup}
              >
                Reset to default lockup
              </button>
            </div>
          ) : (
            <p className="hint">
              Using the bundled default Steam banner lockup image. Upload a PNG to override it.
            </p>
          )}
          </div>
        </details>


        <details className="panel collapsible-panel" open>
          <summary className="panel-summary">Text</summary>
          <div className="panel-content">
          <p className="hint">
            Enable text elements, edit their values, and adjust their preset position and scale.
          </p>

          <div className="disc-text-control-list">
            {DISC_TEXT_KEYS.map((key) => {
              const layout = discTextLayout[key]

              return (
                <div className="disc-text-control" key={key}>
                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={discTextSettings[key]}
                      onChange={(event) => handleDiscTextToggle(key, event.target.checked)}
                    />
                    <span>{getDiscTextLabel(key)}</span>
                  </label>

                  <input
                    className="disc-text-input"
                    type="text"
                    value={getDiscTextInputValue(key)}
                    disabled={!discTextSettings[key]}
                    onChange={(event) => handleDiscTextContentChange(key, event.target.value)}
                  />

                  <div className="disc-text-layout-grid" aria-label={`${getDiscTextLabel(key)} layout controls`}>
                    <label>
                      <span>Scale</span>
                      <input
                        type="range"
                        min="0.5"
                        max="1.8"
                        step="0.01"
                        value={layout.scale}
                        disabled={!discTextSettings[key]}
                        onChange={(event) =>
                          handleDiscTextLayoutChange(key, 'scale', Number(event.target.value))
                        }
                      />
                    </label>

                    <label>
                      <span>{key === 'copyright' && layout.mode === 'curved' ? 'Angle' : 'X'}</span>
                      <input
                        type="range"
                        min={key === 'copyright' && layout.mode === 'curved' ? '-60' : '-20'}
                        max={key === 'copyright' && layout.mode === 'curved' ? '60' : '20'}
                        step="0.1"
                        value={layout.x}
                        disabled={!discTextSettings[key]}
                        onChange={(event) =>
                          handleDiscTextLayoutChange(key, 'x', Number(event.target.value))
                        }
                      />
                    </label>

                    <label>
                      <span>{key === 'copyright' && layout.mode === 'curved' ? 'Inset' : 'Y'}</span>
                      <input
                        type="range"
                        min={key === 'copyright' && layout.mode === 'curved' ? '-8' : '8'}
                        max={key === 'copyright' && layout.mode === 'curved' ? '20' : '92'}
                        step="0.1"
                        value={layout.y}
                        disabled={!discTextSettings[key]}
                        onChange={(event) =>
                          handleDiscTextLayoutChange(key, 'y', Number(event.target.value))
                        }
                      />
                    </label>

                    <label>
                      <span>Align</span>
                      <select
                        value={key === 'copyright' && layout.mode === 'curved' ? 'center' : layout.align}
                        disabled={!discTextSettings[key] || (key === 'copyright' && layout.mode === 'curved')}
                        onChange={(event) =>
                          handleDiscTextAlignmentChange(
                            key,
                            event.target.value as DiscTextAlignment,
                          )
                        }
                      >
                        <option value="left">Left</option>
                        <option value="center">Center</option>
                        <option value="right">Right</option>
                      </select>
                    </label>

                                        {key === 'copyright' && (
                      <>
                        <label>
                          <span>Mode</span>
                          <select
                            value={layout.mode}
                            disabled={!discTextSettings[key]}
                            onChange={(event) =>
                              handleDiscTextModeChange(
                                key,
                                event.target.value as DiscTextMode,
                              )
                            }
                          >
                            <option value="straight">Straight</option>
                            <option value="curved">Curved</option>
                          </select>
                        </label>

                        {layout.mode === 'curved' && (
                          <>
                            <label>
                              <span>Arc</span>
                              <input
                                type="range"
                                min="80"
                                max="320"
                                step="1"
                                value={layout.arcDegrees}
                                disabled={!discTextSettings[key]}
                                onChange={(event) =>
                                  handleDiscTextLayoutChange(
                                    key,
                                    'arcDegrees',
                                    Number(event.target.value),
                                  )
                                }
                              />
                            </label>

                            <label>
                              <span>Side</span>
                              <select
                                aria-label="Arc side"
                                value={layout.arcSide}
                                disabled={
                                  !discTextSettings[key] || steamLogoPlacement !== 'none'
                                }
                                onChange={(event) =>
                                  handleDiscTextArcSideChange(
                                    key,
                                    event.target.value as DiscTextArcSide,
                                  )
                                }
                              >
                                <option value="top">Top arc</option>
                                <option value="bottom">Bottom arc</option>
                              </select>
                            </label>
                          </>
                        )}
                      </>
                    )}
                  </div>

                  <button
                    className="secondary-button disc-text-reset-button"
                    type="button"
                    disabled={!discTextSettings[key]}
                    onClick={() => handleResetDiscTextLayout(key)}
                  >
                    Reset {getDiscTextLabel(key).toLowerCase()} position
                  </button>
                </div>
              )
            })}
          </div>
          </div>
        </details>

        <details className="panel collapsible-panel">
          <summary className="panel-summary">Guide Legend</summary>
          <div className="panel-content">
          <div className="guide-legend" aria-label="Disc guide legend">
            <div className="guide-legend-item">
              <span className="guide-swatch guide-swatch-outer" aria-hidden="true" />
              <div>
                <strong>Outer cut edge</strong>
                <p>The physical outside edge of the disc.</p>
              </div>
            </div>
            <div className="guide-legend-item">
              <span className="guide-swatch guide-swatch-print" aria-hidden="true" />
              <div>
                <strong>Printable area</strong>
                <p>The usable printed region between the inner and outer print boundaries.</p>
              </div>
            </div>
            <div className="guide-legend-item">
              <span className="guide-swatch guide-swatch-hub" aria-hidden="true" />
              <div>
                <strong>No-print hub</strong>
                <p>The striped center region between the physical hole and printable boundary.</p>
              </div>
            </div>
            <div className="guide-legend-item">
              <span className="guide-swatch guide-swatch-hole" aria-hidden="true" />
              <div>
                <strong>Physical center hole</strong>
                <p>The actual cut-out center hole that is blanked during export.</p>
              </div>
            </div>
            <div className="guide-legend-item">
              <span className="guide-swatch guide-swatch-safe" aria-hidden="true" />
              <div>
                <strong>Safe zone</strong>
                <p>An advisory boundary for keeping important text and logos away from edge drift.</p>
              </div>
            </div>
          </div>
          </div>
        </details>
      </aside>

      <section className="preview-area" aria-labelledby="disc-preview-title">
        <div className="preview-pane-label">
          <span>Live Preview</span>
          <strong id="disc-preview-title">Disc Preview</strong>
        </div>

        <div className="preview-toast-stack" aria-live="polite" aria-atomic="false">
          {statusToasts.map((toast) => (
            <div className={`preview-toast preview-toast-${toast.kind}`} key={toast.id}>
              <span className="preview-toast-message">{toast.message}</span>
              <span className="preview-toast-icon" aria-hidden="true">
                {toast.icon}
              </span>
            </div>
          ))}
        </div>

        <div
          ref={discPreviewRef}
          className="disc-preview"
          aria-label="Blank standard printable disc preview"
        >
          {backgroundImageUrl ? (
            <div
              className="background-image-layer"
              role="img"
              aria-label="Uploaded background image layer"
              onPointerDown={handleBackgroundPointerDown}
              onPointerMove={handleBackgroundPointerMove}
              onPointerUp={handleBackgroundPointerUp}
              onPointerCancel={handleBackgroundPointerUp}
            >
              <img
                src={backgroundImageUrl}
                alt=""
                draggable={false}
                style={{
                  width: backgroundPreviewSize.width,
                  height: backgroundPreviewSize.height,
                  transform: `translate(-50%, -50%) translate(${backgroundOffset.x}px, ${backgroundOffset.y}px) scale(${backgroundScale})`,
                }}
              />
            </div>
          ) : (
            <div className="empty-background-message">
              Upload a background image
            </div>
          )}

          {steamLogoPlacement !== 'none' && (
            <div
              className={`steam-brand-banner ${steamLogoPlacement}`}
              style={steamBannerStyle}
              aria-label="Steam brand banner"
            >
              {steamLogoPlacement === 'bottom' && <div className="steam-brand-banner-accent" />}
              <div className="steam-brand-banner-main">
                <div className="steam-brand-lockup" aria-label="Steam">
                  {steamBannerLockupImageUrl ? (
                    <img
                      src={steamBannerLockupImageUrl}
                      alt="Steam banner lockup"
                      draggable={false}
                    />
                  ) : (
                    <span>STEAM</span>
                  )}
                </div>
              </div>
              {steamLogoPlacement === 'top' && <div className="steam-brand-banner-accent" />}
            </div>
          )}

          <div className="disc-text-layer" aria-label="Disc text elements">
            {DISC_TEXT_KEYS.map((key) => {
              if (!discTextSettings[key]) {
                return null
              }

              const text = getDiscTextContent(key, discTextValues, manualGameTitle).trim()

              if (!text) {
                return null
              }

              const layout = discTextLayout[key]

              if (key === 'copyright' && layout.mode === 'curved') {
                const copyrightPathId = `copyright-safe-zone-path-${steamLogoPlacement}`
                const copyrightArcSide = getCopyrightArcSide(steamLogoPlacement, layout)
                const isTopArc = copyrightArcSide === 'top'
                const curvedScale = getReadableCurvedTextScale(layout.scale)
                const fontSize = 1.55 * curvedScale
                const safeZoneRadius =
                  (selectedDiscTemplate.safeDiameterMm / selectedDiscTemplate.outerDiameterMm) *
                  50
                const textRadius = Math.max(
                  1,
                  safeZoneRadius - layout.y * 0.18,
                )
                const arcCenterAngle = (isTopArc ? 270 : 90) + layout.x
                const arcHalf = layout.arcDegrees / 2
                const largeArcFlag = getLargeArcFlag(layout.arcDegrees)
                const lines = wrapPreviewTextByArcLength(
                  text,
                  textRadius,
                  layout.arcDegrees,
                  curvedScale,
                )
                const lineStep = 2.2 * curvedScale

                return (
                  <svg
                    className="disc-curved-text-svg"
                    key={key}
                    viewBox="0 0 100 100"
                    onPointerDown={(event) => handleDiscTextPointerDown(event, key)}
                    onPointerMove={handleDiscTextPointerMove}
                    onPointerUp={handleDiscTextPointerUp}
                    onPointerCancel={handleDiscTextPointerUp}
                  >
                    <defs>
                      {lines.map((_, index) => {
                        const lineRadius = isTopArc
                          ? textRadius - index * lineStep
                          : textRadius - (lines.length - 1 - index) * lineStep
                        const pathId = `${copyrightPathId}-${index}`

                        const path = isTopArc
                          ? createSvgArcPath(
                              50,
                              50,
                              lineRadius,
                              arcCenterAngle - arcHalf,
                              arcCenterAngle + arcHalf,
                              1,
                              largeArcFlag,
                            )
                          : createSvgArcPath(
                              50,
                              50,
                              lineRadius,
                              arcCenterAngle + arcHalf,
                              arcCenterAngle - arcHalf,
                              0,
                              largeArcFlag,
                            )

                        return <path id={pathId} d={path} key={pathId} />
                      })}
                    </defs>
                    {lines.map((line, index) => (
                      <text
                        className="disc-curved-text"
                        key={`${copyrightPathId}-line-${index}`}
                        dominantBaseline="middle"
                        style={{
                          fontSize: `${fontSize}px`,
                          letterSpacing: `${getCurvedPreviewLetterSpacing(layout.scale)}px`,
                        }}
                      >
                        <textPath
                          href={`#${copyrightPathId}-${index}`}
                          startOffset="50%"
                          textAnchor="middle"
                        >
                          {line}
                        </textPath>
                      </text>
                    ))}
                  </svg>
                )
              }
              return (
                <div
                  className={`disc-text-line ${getDiscTextPreviewClassName(key)}`}
                  key={key}
                  style={{
                    left: `${50 + layout.x}%`,
                    top: `${layout.y}%`,
                    textAlign: layout.align,
                    transform: getDiscTextPreviewTransform(layout),
                  }}
                  onPointerDown={(event) => handleDiscTextPointerDown(event, key)}
                  onPointerMove={handleDiscTextPointerMove}
                  onPointerUp={handleDiscTextPointerUp}
                  onPointerCancel={handleDiscTextPointerUp}
                >
                  {text}
                </div>
              )
            })}
          </div>

          <div
            className="hub-no-print-zone"
            style={{ width: `${innerPrintableBoundaryPercent}%` }}
          />
          <div
            className="printable-zone"
            style={{ inset: `${printableInsetPercent}%` }}
          />
          <div className="safe-zone" style={{ inset: `${safeInsetPercent}%` }} />
          <div
            className="inner-print-boundary"
            style={{ width: `${innerPrintableBoundaryPercent}%` }}
          />
          <div
            className="center-hole"
            style={{ width: `${physicalCenterHolePercent}%` }}
          />
        </div>
      </section>
    </main>
  )
}

export default App
