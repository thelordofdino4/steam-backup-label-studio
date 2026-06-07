import type {
  CaseInsertPreviewGuideLayout,
  CaseInsertPreviewLayout,
} from '../layout/caseInsertPreviewLayout'
import type { JewelCaseGuideId } from '../templates/caseInsertTemplates'

function drawGuideRect(
  context: CanvasRenderingContext2D,
  guide: CaseInsertPreviewGuideLayout,
  lineWidth: number,
) {
  if (!guide.bounds) return

  context.strokeRect(
    guide.bounds.x + lineWidth / 2,
    guide.bounds.y + lineWidth / 2,
    Math.max(0, guide.bounds.width - lineWidth),
    Math.max(0, guide.bounds.height - lineWidth),
  )
}

function drawGuideLine(
  context: CanvasRenderingContext2D,
  guide: CaseInsertPreviewGuideLayout,
) {
  if (!guide.line) return

  context.beginPath()
  context.moveTo(guide.line.x1, guide.line.y1)
  context.lineTo(guide.line.x2, guide.line.y2)
  context.stroke()
}

function getGuideStrokeColor(guide: CaseInsertPreviewGuideLayout) {
  if (guide.type === 'foldLine' || guide.regionRole === 'spine') {
    return 'rgba(236, 72, 153, 0.95)'
  }
  if (guide.regionRole === 'safe') {
    return 'rgba(37, 99, 235, 0.95)'
  }
  if (guide.regionRole === 'bleed') {
    return 'rgba(239, 68, 68, 0.92)'
  }
  if (guide.regionRole === 'trim' || guide.regionRole === 'printable') {
    return 'rgba(245, 158, 11, 0.94)'
  }

  return 'rgba(148, 163, 184, 0.9)'
}

function getGuideDash(guide: CaseInsertPreviewGuideLayout, lineWidth: number) {
  if (guide.type === 'foldLine' || guide.regionRole === 'spine') {
    return [lineWidth * 1.4, lineWidth * 1.4]
  }
  if (guide.regionRole === 'safe' || guide.regionRole === 'bleed') {
    return [lineWidth * 2, lineWidth * 1.5]
  }

  return []
}

export function drawCaseInsertExportGuides(
  context: CanvasRenderingContext2D,
  layout: CaseInsertPreviewLayout,
  guideIds: readonly JewelCaseGuideId[],
) {
  const guideIdSet = new Set(guideIds)
  const selectedGuides = layout.guides.filter((guide) =>
    guideIdSet.has(guide.guideId))

  if (selectedGuides.length === 0) {
    return
  }

  const lineWidth = Math.max(
    4,
    Math.round(Math.min(layout.width, layout.height) * 0.003),
  )

  context.save()
  context.lineWidth = lineWidth

  for (const guide of selectedGuides) {
    context.strokeStyle = getGuideStrokeColor(guide)
    context.setLineDash(getGuideDash(guide, lineWidth))

    if (guide.line) {
      drawGuideLine(context, guide)
    } else {
      drawGuideRect(context, guide, lineWidth)
    }
  }

  context.restore()
}
