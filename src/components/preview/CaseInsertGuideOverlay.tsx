import type {
  CaseInsertPreviewGuideLayout,
  CaseInsertPreviewLayout,
} from '../../layout/caseInsertPreviewLayout'
import type { JewelCasePixelRect } from '../../layout/jewelCaseLayout'

export type CaseInsertGuideOverlayProps = {
  layout: CaseInsertPreviewLayout
}

function getRectStyle(rect: JewelCasePixelRect, layout: CaseInsertPreviewLayout) {
  return {
    left: `${rect.x / layout.width * 100}%`,
    top: `${rect.y / layout.height * 100}%`,
    width: `${rect.width / layout.width * 100}%`,
    height: `${rect.height / layout.height * 100}%`,
  }
}

function getLineStyle(
  guide: CaseInsertPreviewGuideLayout,
  layout: CaseInsertPreviewLayout,
) {
  const line = guide.line

  if (!line) {
    return {}
  }

  const isVertical = line.orientation === 'vertical'
  const x = Math.min(line.x1, line.x2)
  const y = Math.min(line.y1, line.y2)
  const width = Math.abs(line.x2 - line.x1)
  const height = Math.abs(line.y2 - line.y1)

  return {
    left: `${x / layout.width * 100}%`,
    top: `${y / layout.height * 100}%`,
    width: isVertical ? 0 : `${width / layout.width * 100}%`,
    height: isVertical ? `${height / layout.height * 100}%` : 0,
  }
}

export function CaseInsertGuideOverlay({ layout }: CaseInsertGuideOverlayProps) {
  return (
    <div className="case-insert-guide-layer" aria-hidden="true">
      {layout.guides.map((guide) => {
        if (guide.bounds) {
          return (
            <div
              className={[
                'case-insert-guide-rect',
                `case-insert-guide-${guide.type}`,
                guide.regionRole ? `case-insert-guide-role-${guide.regionRole}` : '',
              ].filter(Boolean).join(' ')}
              key={guide.guideId}
              style={getRectStyle(guide.bounds, layout)}
            />
          )
        }

        if (guide.line) {
          return (
            <div
              className={[
                'case-insert-guide-line',
                `case-insert-guide-line-${guide.line.orientation}`,
                `case-insert-guide-${guide.type}`,
              ].join(' ')}
              key={guide.guideId}
              style={getLineStyle(guide, layout)}
            />
          )
        }

        return null
      })}
    </div>
  )
}
