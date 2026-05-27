import type { DiscTextLayoutSettings, DiscTextSettings, DiscTextValues, SteamLogoPlacement } from '../discText'
import { mmToPixels } from '../discGeometry'
import type { ExportGuideSelection } from '../exportGuides'
import type { ProjectLogoAssets, ProjectMediaMark, ProjectMetadata, ProjectPlatformMarks, ProjectRatingBadge, SteamBannerColors, SteamBannerLockupLayout } from '../project/projectTypes'
import { resolveMetadataBoundDiscTextValues } from '../project/metadataDiscText'
import type { DiscTemplate } from '../types/template'
import { canvasToPngBytes, loadImage } from './canvasImage'
import { drawDiscTextElements } from './drawDiscText'
import { drawExportGuides, drawOuterDiscExportOutline } from './drawExportGuides'
import { drawSteamBrandBanner } from './drawSteamBanner'
import { drawLogoAssets } from './drawLogoAssets'
import { drawRatingBadge } from './drawRatingBadge'
import { drawMediaMark, drawPlatformMarks } from './drawMediaMark'
import {
  DISC_EDITOR_CLIPPED_EXPORT_LAYER_ORDER,
  DISC_EDITOR_POST_CLIP_EXPORT_LAYER_ORDER,
  type DiscEditorClippedExportLayerId,
  type DiscEditorPostClipExportLayerId,
} from '../layerOrder'

type ClippedExportLayerRenderer = Record<
  DiscEditorClippedExportLayerId,
  () => void | Promise<void>
>

type PostClipExportLayerRenderer = Record<
  DiscEditorPostClipExportLayerId,
  () => void | Promise<void>
>

export async function exportDiscLabelPngBytes(params: {
  selectedDiscTemplate: DiscTemplate
  backgroundImageUrl: string | null
  backgroundScale: number
  backgroundOffset: { x: number; y: number }
  previewSize: number
  steamLogoPlacement: SteamLogoPlacement
  steamBannerColors: SteamBannerColors
  steamBannerLockupImageUrl: string | null
  steamBannerLockupLayout: SteamBannerLockupLayout
  projectLogoAssets: ProjectLogoAssets
  projectMetadata: ProjectMetadata
  projectRatingBadge: ProjectRatingBadge
  projectMediaMark: ProjectMediaMark
  projectPlatformMarks: ProjectPlatformMarks
  discTextSettings: DiscTextSettings
  discTextValues: DiscTextValues
  discTextLayout: DiscTextLayoutSettings
  manualGameTitle: string
  exportGuides: ExportGuideSelection
}) {
  const exportOutlineWidth = 3
  const discContentSize = mmToPixels(params.selectedDiscTemplate.outerDiameterMm)
  const exportSize = discContentSize + exportOutlineWidth * 2
  const canvas = document.createElement('canvas')
  canvas.width = exportSize
  canvas.height = exportSize
  const rawContext = canvas.getContext('2d')
  if (!rawContext) throw new Error('Could not create PNG export canvas.')
  const context = rawContext
  const metadataBoundDiscTextValues = resolveMetadataBoundDiscTextValues(
    params.discTextValues,
    params.projectMetadata,
  )

  const discOrigin = exportOutlineWidth
  const center = exportSize / 2
  const outerRadius = discContentSize / 2
  const physicalCenterHoleRadius =
    (params.selectedDiscTemplate.physicalCenterHoleDiameterMm / params.selectedDiscTemplate.outerDiameterMm) * outerRadius
  const innerPrintableBoundaryRadius =
    (params.selectedDiscTemplate.innerHoleDiameterMm / params.selectedDiscTemplate.outerDiameterMm) * outerRadius
  const safeZoneRadius =
    (params.selectedDiscTemplate.safeDiameterMm / params.selectedDiscTemplate.outerDiameterMm) * outerRadius

  async function drawBackgroundArtwork() {
    if (!params.backgroundImageUrl) {
      return
    }

    const image = await loadImage(params.backgroundImageUrl)
    const offsetScale = discContentSize / params.previewSize
    const coverScale = Math.max(discContentSize / image.width, discContentSize / image.height)
    const drawScale = coverScale * params.backgroundScale
    const drawWidth = image.width * drawScale
    const drawHeight = image.height * drawScale
    const drawX = center - drawWidth / 2 + params.backgroundOffset.x * offsetScale
    const drawY = center - drawHeight / 2 + params.backgroundOffset.y * offsetScale
    context.drawImage(image, drawX, drawY, drawWidth, drawHeight)
  }

  context.clearRect(0, 0, exportSize, exportSize)
  context.save()
  context.beginPath()
  context.arc(center, center, outerRadius, 0, Math.PI * 2)
  context.clip()

  const clippedExportLayerRenderers: ClippedExportLayerRenderer = {
    'disc-base-fill': () => {
      context.fillStyle = '#e5e7eb'
      context.fillRect(0, 0, exportSize, exportSize)
    },
    'background-artwork': drawBackgroundArtwork,
    'steam-banner': () =>
      drawSteamBrandBanner(
        context,
        exportSize,
        params.steamLogoPlacement,
        params.steamBannerColors,
        params.steamBannerLockupImageUrl,
        params.steamBannerLockupLayout,
      ),
    'logo-assets': () => drawLogoAssets(context, exportSize, params.projectLogoAssets),
    'rating-badge': () => drawRatingBadge(context, exportSize, params.projectMetadata, params.projectRatingBadge),
    'media-mark': () => drawMediaMark(context, exportSize, params.projectMediaMark),
    'platform-marks': () => drawPlatformMarks(context, exportSize, params.projectPlatformMarks),
    'disc-text': () =>
      drawDiscTextElements(
        context,
        discContentSize,
        discOrigin,
        params.discTextSettings,
        metadataBoundDiscTextValues,
        params.discTextLayout,
        params.manualGameTitle,
        params.steamLogoPlacement,
        safeZoneRadius,
      ),
  }

  for (const layerId of DISC_EDITOR_CLIPPED_EXPORT_LAYER_ORDER) {
    await clippedExportLayerRenderers[layerId]()
  }

  context.restore()

  const postClipExportLayerRenderers: PostClipExportLayerRenderer = {
    'export-outline': () => drawOuterDiscExportOutline(context, center, outerRadius, exportOutlineWidth),
    'physical-center-hole-cutout': () => {
      context.save()
      context.globalCompositeOperation = 'destination-out'
      context.beginPath()
      context.arc(center, center, physicalCenterHoleRadius, 0, Math.PI * 2)
      context.fill()
      context.restore()
    },
    'export-guides': () =>
      drawExportGuides(
        context,
        exportSize,
        center,
        outerRadius,
        physicalCenterHoleRadius,
        innerPrintableBoundaryRadius,
        params.selectedDiscTemplate,
        params.exportGuides,
      ),
  }

  for (const layerId of DISC_EDITOR_POST_CLIP_EXPORT_LAYER_ORDER) {
    await postClipExportLayerRenderers[layerId]()
  }

  const bytes = await canvasToPngBytes(canvas)
  return { bytes, width: exportSize, height: exportSize }
}
