import type {
  CaseInsertPreviewGuideLayout,
  CaseInsertPreviewLayout,
} from '../../layout/caseInsertPreviewLayout'
import type { JewelCasePixelRect } from '../../layout/jewelCaseLayout'
import {
  formatCaseInsertGuideDash,
  getCaseInsertGuideStyle,
} from '../../caseInsert/guideStyles'

export type CaseInsertGuideOverlayProps = {
  layout: CaseInsertPreviewLayout
}

type CaseInsertGuideStrokeProps = {
  fill: 'none'
  stroke: string
  strokeDasharray: string | undefined
  strokeLinecap: 'butt'
  strokeWidth: number
}

function getInsetRect(
  rect: JewelCasePixelRect,
  lineWidth: number,
) {
  return {
    x: rect.x + lineWidth / 2,
    y: rect.y + lineWidth / 2,
    width: Math.max(0, rect.width - lineWidth),
    height: Math.max(0, rect.height - lineWidth),
  }
}

function getGuideStrokeProps(
  guide: CaseInsertPreviewGuideLayout,
  layout: CaseInsertPreviewLayout,
): CaseInsertGuideStrokeProps {
  const style = getCaseInsertGuideStyle(guide, layout)

  return {
    fill: 'none',
    stroke: style.strokeColor,
    strokeDasharray: formatCaseInsertGuideDash(style.dash),
    strokeLinecap: 'butt',
    strokeWidth: style.lineWidth,
  }
}

export function CaseInsertGuideOverlay({ layout }: CaseInsertGuideOverlayProps) {
  return (
    <div className="case-insert-guide-layer" aria-hidden="true">
      <svg
        className="case-insert-guide-svg"
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        preserveAspectRatio="none"
      >
        {layout.guides.map((guide) => {
          const strokeProps = getGuideStrokeProps(guide, layout)

          if (guide.bounds) {
            const rect = getInsetRect(guide.bounds, strokeProps.strokeWidth)

            return (
              <rect
                className={[
                  'case-insert-guide-rect',
                  `case-insert-guide-${guide.type}`,
                  guide.regionRole ? `case-insert-guide-role-${guide.regionRole}` : '',
                ].filter(Boolean).join(' ')}
                key={guide.guideId}
                x={rect.x}
                y={rect.y}
                width={rect.width}
                height={rect.height}
                {...strokeProps}
              />
            )
          }

          if (guide.line) {
            return (
              <line
                className={[
                  'case-insert-guide-line',
                  `case-insert-guide-line-${guide.line.orientation}`,
                  `case-insert-guide-${guide.type}`,
                ].join(' ')}
                key={guide.guideId}
                x1={guide.line.x1}
                y1={guide.line.y1}
                x2={guide.line.x2}
                y2={guide.line.y2}
                {...strokeProps}
              />
            )
          }

          return null
        })}
      </svg>
    </div>
  )
}
