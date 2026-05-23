import { invoke } from '@tauri-apps/api/core'
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
import { discTemplates, discTemplateOptions, type DiscTemplateId } from './templates/discTemplates'
import type { DiscTemplate } from './types/template'
import './App.css'
import './layoutFix.css'
import defaultSteamBannerLockupUrl from './assets/steam-default-lockup.png'

type SteamLogoPlacement = 'top' | 'bottom' | 'none'

type SteamBannerColors = {
  gradientStart: string
  gradientEnd: string
  accent: string
}
type ExportGuideMode = 'none' | 'centerHole' | 'outerEdge' | 'printableArea' | 'safeZone' | 'all'
type ExportGuideKey = 'centerHole' | 'outerEdge' | 'printableArea' | 'safeZone'
type ExportGuideSelection = Record<ExportGuideKey, boolean>
type SelectedDiscTemplateId = DiscTemplateId | 'custom'
type CustomDimensionKey =
  | 'outerDiameterMm'
  | 'physicalCenterHoleDiameterMm'
  | 'innerHoleDiameterMm'
  | 'printableDiameterMm'
  | 'safeDiameterMm'

type BackgroundOffset = {
  x: number
  y: number
}

type BackgroundImageSize = {
  width: number
  height: number
}

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

type SavedProject = {
  schemaVersion: '0.1.0'
  title: string
  savedAt: string
  game: {
    manualTitle: string
    selectedSteamGame: SteamImportedGame | null
  }
  template: {
    type: 'disc'
    variant: SelectedDiscTemplateId
    customDimensions?: DiscTemplate | null
  }
  steamBackupLogo: {
    placement: SteamLogoPlacement
    bannerColors?: SteamBannerColors
    lockupImageDataUrl?: string | null
    lockupImageSize?: BackgroundImageSize | null
  }
  export?: {
    guideMode?: ExportGuideMode
    guides?: ExportGuideSelection
  }
  background: {
    scale: number
    offset: BackgroundOffset
    imageDataUrl: string | null
    imageSize?: BackgroundImageSize | null
    note: string
  }
}

const EXPORT_DPI = 300
const MM_PER_INCH = 25.4
const CUSTOM_OUTER_DIAMETER_MAX_MM = 305
const STEAM_BANNER_MAIN_HEIGHT_AT_STANDARD_EXPORT = 200
const STEAM_BANNER_ACCENT_HEIGHT_AT_STANDARD_EXPORT = 20
const STEAM_BANNER_ACCENT_OVERLAP_AT_STANDARD_EXPORT = 3
const STANDARD_EXPORT_REFERENCE_SIZE = 1417
const STANDARD_LOCKUP_EXPORT_REFERENCE_SIZE = 1423
const STEAM_BANNER_LOCKUP_TOP_AT_STANDARD_EXPORT = 53
const STEAM_BANNER_LOCKUP_BOTTOM_AT_STANDARD_EXPORT = 170
const STEAM_BANNER_LOCKUP_X_OFFSET_AT_STANDARD_EXPORT = 0.5
const DEFAULT_STEAM_BANNER_COLORS: SteamBannerColors = {
  gradientStart: '#2b475e',
  gradientEnd: '#1b2838',
  accent: '#2aabe1',
}
const DEFAULT_STEAM_BANNER_LOCKUP_IMAGE_URL = defaultSteamBannerLockupUrl
const DEFAULT_EXPORT_GUIDES: ExportGuideSelection = {
  centerHole: false,
  outerEdge: false,
  printableArea: false,
  safeZone: false,
}

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

function clampNumber(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function normalizeCustomDiscTemplate(template: DiscTemplate): DiscTemplate {
  const outerDiameterMm = clampNumber(
    template.outerDiameterMm,
    1,
    CUSTOM_OUTER_DIAMETER_MAX_MM,
  )

  return {
    ...template,
    outerDiameterMm,
    physicalCenterHoleDiameterMm: clampNumber(
      template.physicalCenterHoleDiameterMm,
      1,
      outerDiameterMm,
    ),
    innerHoleDiameterMm: clampNumber(template.innerHoleDiameterMm, 1, outerDiameterMm),
    printableDiameterMm: clampNumber(template.printableDiameterMm, 1, outerDiameterMm),
    safeDiameterMm: clampNumber(template.safeDiameterMm, 1, outerDiameterMm),
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

function mmToPixels(mm: number) {
  return Math.round((mm / MM_PER_INCH) * EXPORT_DPI)
}

function canvasToPngBytes(canvas: HTMLCanvasElement) {
  return new Promise<number[]>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Could not create PNG blob.'))
        return
      }

      blob
        .arrayBuffer()
        .then((buffer) => resolve(Array.from(new Uint8Array(buffer))))
        .catch(reject)
    }, 'image/png')
  })
}

function loadImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()

    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Could not load background image.'))

    image.src = source
  })
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

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
        return
      }

      reject(new Error('Could not convert image asset to a data URL.'))
    }

    reader.onerror = () => reject(new Error('Could not convert image asset to a data URL.'))
    reader.readAsDataURL(blob)
  })
}

async function getCanvasSafeImageSource(source: string) {
  if (source.startsWith('data:')) {
    return source
  }

  const response = await fetch(source)

  if (!response.ok) {
    throw new Error(`Could not load image asset for export: ${response.status}`)
  }

  return blobToDataUrl(await response.blob())
}

function getNaturalImageSize(image: HTMLImageElement): BackgroundImageSize {
  return {
    width: image.naturalWidth || image.width,
    height: image.naturalHeight || image.height,
  }
}

function exportGuideModeToSelection(mode: ExportGuideMode = 'none'): ExportGuideSelection {
  if (mode === 'all') {
    return {
      centerHole: true,
      outerEdge: true,
      printableArea: true,
      safeZone: true,
    }
  }

  return {
    centerHole: mode === 'centerHole',
    outerEdge: mode === 'outerEdge',
    printableArea: mode === 'printableArea',
    safeZone: mode === 'safeZone',
  }
}

function drawExportGuideCircle(
  context: CanvasRenderingContext2D,
  center: number,
  radius: number,
  options: {
    color: string
    lineWidth: number
    dashed?: boolean
  },
) {
  context.save()
  context.strokeStyle = options.color
  context.lineWidth = options.lineWidth

  if (options.dashed) {
    context.setLineDash([options.lineWidth * 1.2, options.lineWidth * 1.6])
    context.lineCap = 'round'
  }

  context.beginPath()
  context.arc(center, center, radius, 0, Math.PI * 2)
  context.stroke()
  context.restore()
}

function drawOuterDiscExportOutline(
  context: CanvasRenderingContext2D,
  center: number,
  outerRadius: number,
  outlineWidth: number,
) {
  // Slight inward overlap covers canvas clipping anti-alias pixels at the disc edge.
  // The outer edge still extends by the requested outline width.
  const innerOverlapPx = 1.25
  const strokeWidth = outlineWidth + innerOverlapPx
  const strokeRadius = outerRadius + (outlineWidth - innerOverlapPx) / 2

  context.save()
  context.beginPath()
  context.arc(center, center, strokeRadius, 0, Math.PI * 2)
  context.strokeStyle = '#000000'
  context.lineWidth = strokeWidth
  context.stroke()
  context.restore()
}

async function drawSteamBrandBanner(
  context: CanvasRenderingContext2D,
  exportSize: number,
  placement: SteamLogoPlacement,
  colors: SteamBannerColors,
  lockupImageDataUrl: string | null,
) {
  if (placement === 'none') {
    return
  }

  const mainBandHeight =
    exportSize * (STEAM_BANNER_MAIN_HEIGHT_AT_STANDARD_EXPORT / STANDARD_EXPORT_REFERENCE_SIZE)
  const accentBandHeight =
    exportSize * (STEAM_BANNER_ACCENT_HEIGHT_AT_STANDARD_EXPORT / STANDARD_EXPORT_REFERENCE_SIZE)
  const accentOverlap =
    exportSize *
    (STEAM_BANNER_ACCENT_OVERLAP_AT_STANDARD_EXPORT / STANDARD_EXPORT_REFERENCE_SIZE)

  let mainBandY = 0
  let accentBandY = mainBandHeight - accentOverlap

  if (placement === 'bottom') {
    mainBandY = exportSize - mainBandHeight
    accentBandY = mainBandY - (accentBandHeight - accentOverlap)
  }

  const gradient = context.createLinearGradient(0, mainBandY, 0, mainBandY + mainBandHeight)
  gradient.addColorStop(0, colors.gradientStart)
  gradient.addColorStop(1, colors.gradientEnd)

  context.fillStyle = gradient
  context.fillRect(0, mainBandY, exportSize, mainBandHeight)

  context.fillStyle = colors.accent
  context.fillRect(0, accentBandY, exportSize, accentBandHeight)

  if (lockupImageDataUrl) {
    const canvasSafeLockupSource = await getCanvasSafeImageSource(lockupImageDataUrl)
    const lockupImage = await loadImage(canvasSafeLockupSource)
    const naturalWidth = lockupImage.naturalWidth || lockupImage.width || 600
    const naturalHeight = lockupImage.naturalHeight || lockupImage.height || 160
    const lockupAspectRatio = naturalWidth / naturalHeight
    const lockupTop =
      exportSize *
      (STEAM_BANNER_LOCKUP_TOP_AT_STANDARD_EXPORT / STANDARD_LOCKUP_EXPORT_REFERENCE_SIZE)
    const lockupBottom =
      exportSize *
      (STEAM_BANNER_LOCKUP_BOTTOM_AT_STANDARD_EXPORT / STANDARD_LOCKUP_EXPORT_REFERENCE_SIZE)
    const lockupHeight = lockupBottom - lockupTop
    const lockupWidth = lockupHeight * lockupAspectRatio

    const lockupXOffset =
      exportSize *
      (STEAM_BANNER_LOCKUP_X_OFFSET_AT_STANDARD_EXPORT /
        STANDARD_LOCKUP_EXPORT_REFERENCE_SIZE)

    context.drawImage(
      lockupImage,
      exportSize / 2 - lockupWidth / 2 + lockupXOffset,
      placement === 'top'
        ? lockupTop
        : exportSize - lockupBottom,
      lockupWidth,
      lockupHeight,
    )
    return
  }

  // Fallback text remains only for projects without a supplied lockup image.
  context.save()
  context.fillStyle = '#f9fafb'
  context.font = `bold ${Math.round(exportSize * 0.04)}px Arial`
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.letterSpacing = `${Math.round(exportSize * 0.004)}px`
  context.fillText('STEAM', exportSize / 2, mainBandY + mainBandHeight / 2)
  context.restore()
}

function drawStripedHubGuide(
  context: CanvasRenderingContext2D,
  exportSize: number,
  center: number,
  physicalCenterHoleRadius: number,
  innerPrintableBoundaryRadius: number,
  lineWidth: number,
) {
  context.save()
  context.beginPath()
  context.arc(center, center, innerPrintableBoundaryRadius, 0, Math.PI * 2)
  context.arc(center, center, physicalCenterHoleRadius, 0, Math.PI * 2, true)
  context.clip('evenodd')

  context.fillStyle = 'rgba(107, 114, 128, 0.48)'
  context.fillRect(0, 0, exportSize, exportSize)

  const stripeWidth = Math.max(6, lineWidth * 1.6)
  context.strokeStyle = 'rgba(17, 24, 39, 0.62)'
  context.lineWidth = stripeWidth

  for (let offset = -exportSize; offset <= exportSize * 2; offset += stripeWidth * 2) {
    context.beginPath()
    context.moveTo(offset, 0)
    context.lineTo(offset + exportSize, exportSize)
    context.stroke()
  }

  context.restore()
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

  const dragStateRef = useRef<DragState | null>(null)
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
    const toast: StatusToast = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      message,
      kind,
      icon: getStatusToastIcon(kind),
    }

    setProjectStatus(message)
    setStatusToasts((currentToasts) => [...currentToasts, toast].slice(-5))

    window.setTimeout(() => {
      setStatusToasts((currentToasts) =>
        currentToasts.filter((currentToast) => currentToast.id !== toast.id),
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
      await invoke('write_project_file', {
        path,
        contents: JSON.stringify(project, null, 2),
      })

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

      const contents = await invoke<string>('read_project_file', {
        path: selected,
      })
      const project = JSON.parse(contents) as SavedProject
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

  function drawExportGuides(
    context: CanvasRenderingContext2D,
    exportSize: number,
    center: number,
    outerRadius: number,
    physicalCenterHoleRadius: number,
    innerPrintableBoundaryRadius: number,
  ) {
    const baseLineWidth = Math.max(4, exportSize * 0.003)
    const outerGuideRadius = outerRadius - baseLineWidth / 2
    const printableRadius =
      (selectedDiscTemplate.printableDiameterMm / selectedDiscTemplate.outerDiameterMm) * outerRadius
    const safeRadius =
      (selectedDiscTemplate.safeDiameterMm / selectedDiscTemplate.outerDiameterMm) * outerRadius

    if (exportGuides.printableArea) {
      drawStripedHubGuide(
        context,
        exportSize,
        center,
        physicalCenterHoleRadius,
        innerPrintableBoundaryRadius,
        baseLineWidth,
      )
      drawExportGuideCircle(context, center, printableRadius, {
        color: 'rgba(34, 197, 94, 0.95)',
        lineWidth: baseLineWidth,
        dashed: true,
      })
      drawExportGuideCircle(context, center, innerPrintableBoundaryRadius, {
        color: 'rgba(34, 197, 94, 0.95)',
        lineWidth: baseLineWidth,
        dashed: true,
      })
    }

    if (exportGuides.outerEdge) {
      drawExportGuideCircle(context, center, outerGuideRadius, {
        color: 'rgba(239, 68, 68, 0.95)',
        lineWidth: baseLineWidth,
        dashed: true,
      })
      drawExportGuideCircle(context, center, physicalCenterHoleRadius + baseLineWidth / 2, {
        color: 'rgba(239, 68, 68, 0.95)',
        lineWidth: baseLineWidth,
        dashed: true,
      })
    }

    if (exportGuides.safeZone) {
      drawExportGuideCircle(context, center, safeRadius, {
        color: 'rgba(37, 99, 235, 0.95)',
        lineWidth: baseLineWidth,
        dashed: true,
      })
    }

    if (exportGuides.centerHole) {
      drawExportGuideCircle(context, center, physicalCenterHoleRadius + baseLineWidth / 2, {
        color: 'rgba(239, 68, 68, 0.95)',
        lineWidth: baseLineWidth,
        dashed: true,
      })
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

      const discContentSize = mmToPixels(selectedDiscTemplate.outerDiameterMm)
      const exportOutlineWidth = 3
      const exportSize = discContentSize + exportOutlineWidth * 2
      const canvas = document.createElement('canvas')
      canvas.width = exportSize
      canvas.height = exportSize

      const context = canvas.getContext('2d')

      if (!context) {
        throw new Error('Could not create PNG export canvas.')
      }

      const center = exportSize / 2
      const outerRadius = discContentSize / 2
      const physicalCenterHoleRadius =
        (selectedDiscTemplate.physicalCenterHoleDiameterMm /
          selectedDiscTemplate.outerDiameterMm) *
        outerRadius
      const innerPrintableBoundaryRadius =
        (selectedDiscTemplate.innerHoleDiameterMm /
          selectedDiscTemplate.outerDiameterMm) *
        outerRadius

      context.clearRect(0, 0, exportSize, exportSize)

      context.save()
      context.beginPath()
      context.arc(center, center, outerRadius, 0, Math.PI * 2)
      context.clip()

      context.fillStyle = '#e5e7eb'
      context.fillRect(0, 0, exportSize, exportSize)

      if (backgroundImageUrl) {
        const image = await loadImage(backgroundImageUrl)
        const previewSize =
          discPreviewRef.current?.getBoundingClientRect().width ?? exportSize
        const offsetScale = discContentSize / previewSize
        const coverScale = Math.max(
          discContentSize / image.width,
          discContentSize / image.height,
        )
        const drawScale = coverScale * backgroundScale
        const drawWidth = image.width * drawScale
        const drawHeight = image.height * drawScale
        const drawX =
          center - drawWidth / 2 + backgroundOffset.x * offsetScale
        const drawY =
          center - drawHeight / 2 + backgroundOffset.y * offsetScale

        context.drawImage(image, drawX, drawY, drawWidth, drawHeight)
      }

      await drawSteamBrandBanner(
        context,
        exportSize,
        steamLogoPlacement,
        steamBannerColors,
        steamBannerLockupImageUrl,
      )

      context.restore()

      drawOuterDiscExportOutline(context, center, outerRadius, exportOutlineWidth)

      context.save()
      context.globalCompositeOperation = 'destination-out'
      context.beginPath()
      context.arc(center, center, physicalCenterHoleRadius, 0, Math.PI * 2)
      context.fill()
      context.restore()

      drawExportGuides(
        context,
        exportSize,
        center,
        outerRadius,
        physicalCenterHoleRadius,
        innerPrintableBoundaryRadius,
      )

      const pngBytes = await canvasToPngBytes(canvas)

      await invoke('write_binary_file', {
        path,
        bytes: pngBytes,
      })

      announceStatus(
        `Exported ${exportSize} × ${exportSize}px PNG at ${EXPORT_DPI} DPI.`,
      )
    } catch (error) {
      announceStatus(`Export failed: ${String(error)}`)
    }
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
              setSteamLogoPlacement(event.target.value as SteamLogoPlacement)
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
