import type { DiscTextLayoutSettings, DiscTextSettings, DiscTextValues, SteamLogoPlacement } from '../discText'
import { mmToPixels } from '../discGeometry'
import type { ExportGuideSelection } from '../exportGuides'
import type { SteamBannerColors, SteamBannerLockupLayout } from '../project/projectTypes'
import type { DiscTemplate } from '../types/template'
import { canvasToPngBytes, loadImage } from './canvasImage'
import { drawDiscTextElements } from './drawDiscText'
import { drawExportGuides, drawOuterDiscExportOutline } from './drawExportGuides'
import { drawSteamBrandBanner } from './drawSteamBanner'

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
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Could not create PNG export canvas.')

  const center = exportSize / 2
  const outerRadius = discContentSize / 2
  const physicalCenterHoleRadius =
    (params.selectedDiscTemplate.physicalCenterHoleDiameterMm / params.selectedDiscTemplate.outerDiameterMm) * outerRadius
  const innerPrintableBoundaryRadius =
    (params.selectedDiscTemplate.innerHoleDiameterMm / params.selectedDiscTemplate.outerDiameterMm) * outerRadius
  const safeZoneRadius =
    (params.selectedDiscTemplate.safeDiameterMm / params.selectedDiscTemplate.outerDiameterMm) * outerRadius

  context.clearRect(0, 0, exportSize, exportSize)
  context.save(); context.beginPath(); context.arc(center, center, outerRadius, 0, Math.PI * 2); context.clip()
  context.fillStyle = '#e5e7eb'
  context.fillRect(0, 0, exportSize, exportSize)

  if (params.backgroundImageUrl) {
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

  await drawSteamBrandBanner(
    context,
    exportSize,
    params.steamLogoPlacement,
    params.steamBannerColors,
    params.steamBannerLockupImageUrl,
    params.steamBannerLockupLayout,
  )
  drawDiscTextElements(context, exportSize, params.discTextSettings, params.discTextValues, params.discTextLayout, params.manualGameTitle, params.steamLogoPlacement, safeZoneRadius)
  context.restore()

  drawOuterDiscExportOutline(context, center, outerRadius, exportOutlineWidth)

  context.save(); context.globalCompositeOperation = 'destination-out'; context.beginPath(); context.arc(center, center, physicalCenterHoleRadius, 0, Math.PI * 2); context.fill(); context.restore()

  drawExportGuides(context, exportSize, center, outerRadius, physicalCenterHoleRadius, innerPrintableBoundaryRadius, params.selectedDiscTemplate, params.exportGuides)

  const bytes = await canvasToPngBytes(canvas)
  return { bytes, width: exportSize, height: exportSize }
}
