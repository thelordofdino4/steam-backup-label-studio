import type {
  CaseInsertPreviewGuideLayout,
  CaseInsertPreviewLayout,
} from '../layout/caseInsertPreviewLayout.ts'

export type CaseInsertGuideStyle = {
  dash: readonly number[]
  lineWidth: number
  strokeColor: string
}

export function getCaseInsertGuideLineWidth(
  layout: Pick<CaseInsertPreviewLayout, 'width' | 'height'>,
) {
  return Math.max(
    4,
    Math.round(Math.min(layout.width, layout.height) * 0.003),
  )
}

export function getCaseInsertGuideStyle(
  guide: CaseInsertPreviewGuideLayout,
  layout: Pick<CaseInsertPreviewLayout, 'width' | 'height'>,
): CaseInsertGuideStyle {
  const lineWidth = getCaseInsertGuideLineWidth(layout)

  if (guide.type === 'foldLine' || guide.regionRole === 'spine') {
    return {
      dash: [lineWidth * 1.4, lineWidth * 1.4],
      lineWidth,
      strokeColor: 'rgba(236, 72, 153, 0.95)',
    }
  }

  if (guide.regionRole === 'safe') {
    return {
      dash: [lineWidth * 2, lineWidth * 1.5],
      lineWidth,
      strokeColor: 'rgba(37, 99, 235, 0.95)',
    }
  }

  if (guide.regionRole === 'bleed') {
    return {
      dash: [lineWidth * 2, lineWidth * 1.5],
      lineWidth,
      strokeColor: 'rgba(239, 68, 68, 0.92)',
    }
  }

  if (guide.regionRole === 'trim' || guide.regionRole === 'printable') {
    return {
      dash: [],
      lineWidth,
      strokeColor: 'rgba(245, 158, 11, 0.94)',
    }
  }

  return {
    dash: [],
    lineWidth,
    strokeColor: 'rgba(148, 163, 184, 0.9)',
  }
}

export function formatCaseInsertGuideDash(
  dash: readonly number[],
) {
  return dash.length > 0 ? dash.join(' ') : undefined
}
