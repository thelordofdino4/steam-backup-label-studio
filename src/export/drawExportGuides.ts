import type { DiscTemplate } from '../types/template'
import type { ExportGuideSelection } from '../exportGuides'

export function drawExportGuideCircle(
  context: CanvasRenderingContext2D,
  center: number,
  radius: number,
  options: { color: string; lineWidth: number; dashed?: boolean },
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

export function drawOuterDiscExportOutline(context: CanvasRenderingContext2D, center: number, outerRadius: number, outlineWidth: number) {
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

export function drawStripedHubGuide(context: CanvasRenderingContext2D, exportSize: number, center: number, physicalCenterHoleRadius: number, innerPrintableBoundaryRadius: number, lineWidth: number) {
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

export function drawExportGuides(context: CanvasRenderingContext2D, exportSize: number, center: number, outerRadius: number, physicalCenterHoleRadius: number, innerPrintableBoundaryRadius: number, selectedDiscTemplate: DiscTemplate, exportGuides: ExportGuideSelection) {
  const baseLineWidth = Math.max(4, exportSize * 0.003)
  const outerGuideRadius = outerRadius - baseLineWidth / 2
  const printableRadius = (selectedDiscTemplate.printableDiameterMm / selectedDiscTemplate.outerDiameterMm) * outerRadius
  const safeRadius = (selectedDiscTemplate.safeDiameterMm / selectedDiscTemplate.outerDiameterMm) * outerRadius
  if (exportGuides.printableArea) {
    drawStripedHubGuide(context, exportSize, center, physicalCenterHoleRadius, innerPrintableBoundaryRadius, baseLineWidth)
    drawExportGuideCircle(context, center, printableRadius, { color: 'rgba(34, 197, 94, 0.95)', lineWidth: baseLineWidth, dashed: true })
    drawExportGuideCircle(context, center, innerPrintableBoundaryRadius, { color: 'rgba(34, 197, 94, 0.95)', lineWidth: baseLineWidth, dashed: true })
  }
  if (exportGuides.outerEdge) {
    drawExportGuideCircle(context, center, outerGuideRadius, { color: 'rgba(239, 68, 68, 0.95)', lineWidth: baseLineWidth, dashed: true })
    drawExportGuideCircle(context, center, physicalCenterHoleRadius + baseLineWidth / 2, { color: 'rgba(239, 68, 68, 0.95)', lineWidth: baseLineWidth, dashed: true })
  }
  if (exportGuides.safeZone) {
    drawExportGuideCircle(context, center, safeRadius, { color: 'rgba(37, 99, 235, 0.95)', lineWidth: baseLineWidth, dashed: true })
  }
  if (exportGuides.centerHole) {
    drawExportGuideCircle(context, center, physicalCenterHoleRadius + baseLineWidth / 2, { color: 'rgba(239, 68, 68, 0.95)', lineWidth: baseLineWidth, dashed: true })
  }
}
