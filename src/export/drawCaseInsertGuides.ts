import type {
  CaseInsertPreviewGuideLayout,
  CaseInsertPreviewLayout,
} from '../layout/caseInsertPreviewLayout'
import type { JewelCaseGuideId } from '../templates/caseInsertTemplates'
import {
  getCaseInsertGuideStyle,
} from '../caseInsert/guideStyles'

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

  context.save()

  for (const guide of selectedGuides) {
    const style = getCaseInsertGuideStyle(guide, layout)

    context.lineWidth = style.lineWidth
    context.strokeStyle = style.strokeColor
    context.setLineDash([...style.dash])

    if (guide.line) {
      drawGuideLine(context, guide)
    } else {
      drawGuideRect(context, guide, style.lineWidth)
    }
  }

  context.restore()
}
