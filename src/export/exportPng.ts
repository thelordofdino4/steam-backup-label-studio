import type { DiscTextLayoutSettings, DiscTextHtmlSources, DiscTextSettings, DiscTextValues, SteamLogoPlacement } from '../discText/index'
import type { DiscTextStyleSettings } from '../discText/styles'
import { mmToPixels } from '../disc/geometry'
import type { ExportGuideSelection } from './exportGuides'
import type { BackgroundImageSize, ProjectAdditionalArtwork, ProjectDiscNumberArtwork, ProjectLogoAssets, ProjectMediaMark, ProjectMetadata, ProjectPlatformMarks, ProjectRatingBadge, ProjectTechnicalMarks, ProjectTitleArtwork, SteamBannerColors, SteamBannerLockupLayout } from '../project/projectTypes'
import { resolveMetadataBoundDiscTextValues, type DiscTextValueSources } from '../project/metadataDiscText'
import type { DiscTemplate } from '../types/template'
import {
  canvasToPngBytes,
  drawImageContent,
  getCanvasImageContentSize,
  loadCanvasSafeImage,
} from './canvasImage'
import { drawDiscTextElements } from './drawDiscText'
import { drawExportGuides, drawOuterDiscExportOutline } from './drawExportGuides'
import { drawSteamBrandBanner } from './drawSteamBanner'
import { drawLogoAssets } from './drawLogoAssets'
import { drawRatingBadge } from './drawRatingBadge'
import { drawMediaMark } from './drawMediaMark'
import { drawPlatformMarks } from './drawPlatformMarks'
import { drawTechnicalMarks } from './drawTechnicalMarks'
import { drawTitleArtwork } from './drawTitleArtwork'
import { drawAdditionalArtwork } from './drawAdditionalArtwork'
import { createDiscTextOccupiedRegions } from '../layout/discTextOccupiedRegions'
import { measureDiscTextWithBrowserCanvas } from '../discText/svgLayer'
import {
  DISC_EDITOR_CLIPPED_EXPORT_LAYER_ORDER,
  DISC_EDITOR_POST_CLIP_EXPORT_LAYER_ORDER,
  type DiscEditorClippedExportLayerId,
  type DiscEditorPostClipExportLayerId,
} from '../editor/layerOrder'

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
  backgroundImageSize: BackgroundImageSize | null
  backgroundScale: number
  backgroundOffset: { x: number; y: number }
  previewSize: number
  steamLogoPlacement: SteamLogoPlacement
  steamBannerColors: SteamBannerColors
  steamBannerLockupImageUrl: string | null
  steamBannerLockupImageSize?: BackgroundImageSize | null
  steamBannerLockupLayout: SteamBannerLockupLayout
  steamBannerUseTextFallback: boolean
  steamBannerFallbackText: string
  projectLogoAssets: ProjectLogoAssets
  projectTitleArtwork: ProjectTitleArtwork
  projectDiscNumberArtwork: ProjectDiscNumberArtwork
  projectAdditionalArtwork: ProjectAdditionalArtwork
  projectMetadata: ProjectMetadata
  projectRatingBadge: ProjectRatingBadge
  projectMediaMark: ProjectMediaMark
  projectPlatformMarks: ProjectPlatformMarks
  projectTechnicalMarks: ProjectTechnicalMarks
  discTextSettings: DiscTextSettings
  discTextValues: DiscTextValues
  discTextValueSources: DiscTextValueSources
  discTextHtmlSources: DiscTextHtmlSources
  discTextStyles: DiscTextStyleSettings
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
    params.discTextValueSources,
  )
  const discTextOccupiedRegions = createDiscTextOccupiedRegions({
    projectTitleArtwork: params.projectTitleArtwork,
    projectLogoAssets: params.projectLogoAssets,
    projectAdditionalArtwork: params.projectAdditionalArtwork,
    projectMetadata: params.projectMetadata,
    projectRatingBadge: params.projectRatingBadge,
    projectMediaMark: params.projectMediaMark,
    projectPlatformMarks: params.projectPlatformMarks,
    projectTechnicalMarks: params.projectTechnicalMarks,
    projectDiscNumberArtwork: params.projectDiscNumberArtwork,
    discTextSettings: params.discTextSettings,
    discTextValues: metadataBoundDiscTextValues,
    discTextHtmlSources: params.discTextHtmlSources,
    discTextLayout: params.discTextLayout,
    discTextStyles: params.discTextStyles,
    discTextTitle: params.manualGameTitle,
    measureText: measureDiscTextWithBrowserCanvas,
  })

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

    const image = await loadCanvasSafeImage(
      params.backgroundImageUrl,
      'background artwork image',
    )
    const offsetScale = discContentSize / params.previewSize
    const contentSize = getCanvasImageContentSize(image, params.backgroundImageSize)

    if (!contentSize) {
      return
    }

    const coverScale = Math.max(
      discContentSize / contentSize.width,
      discContentSize / contentSize.height,
    )
    const drawScale = coverScale * params.backgroundScale
    const drawWidth = contentSize.width * drawScale
    const drawHeight = contentSize.height * drawScale
    const drawX = center - drawWidth / 2 + params.backgroundOffset.x * offsetScale
    const drawY = center - drawHeight / 2 + params.backgroundOffset.y * offsetScale
    drawImageContent(
      context,
      image,
      params.backgroundImageSize,
      {
        x: drawX,
        y: drawY,
        width: drawWidth,
        height: drawHeight,
      },
    )
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
    'additional-artwork': () =>
      drawAdditionalArtwork(
        context,
        discContentSize,
        discOrigin,
        params.projectAdditionalArtwork,
      ),
    'steam-banner': () =>
      drawSteamBrandBanner(
        context,
        discContentSize,
        discOrigin,
        params.steamLogoPlacement,
        params.steamBannerColors,
        params.steamBannerLockupImageUrl,
        params.steamBannerLockupImageSize ?? null,
        params.steamBannerLockupLayout,
        params.steamBannerUseTextFallback,
        params.steamBannerFallbackText,
      ),
    'title-artwork': () =>
      drawTitleArtwork(
        context,
        discContentSize,
        discOrigin,
        params.projectTitleArtwork,
      ),
    'logo-assets': () => drawLogoAssets(context, discContentSize, discOrigin, params.projectLogoAssets),
    'rating-badge': () =>
      drawRatingBadge(
        context,
        discContentSize,
        discOrigin,
        params.projectMetadata,
        params.projectRatingBadge,
      ),
    'media-mark': () => drawMediaMark(context, discContentSize, discOrigin, params.projectMediaMark),
    'platform-marks': () =>
      drawPlatformMarks(context, discContentSize, discOrigin, params.projectPlatformMarks),
    'technical-marks': () =>
      drawTechnicalMarks(context, discContentSize, discOrigin, params.projectTechnicalMarks),
    'disc-text': () =>
      drawDiscTextElements(
        context,
        discContentSize,
        discOrigin,
        params.discTextSettings,
        metadataBoundDiscTextValues,
        params.discTextStyles,
        params.projectDiscNumberArtwork,
        params.discTextLayout,
        params.manualGameTitle,
        params.discTextHtmlSources,
        params.steamLogoPlacement,
        safeZoneRadius,
        discTextOccupiedRegions,
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
