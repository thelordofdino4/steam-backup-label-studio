import type {
  ProjectCaseInsertImageSlot,
} from '../../project/projectTypes'

function getFrameViewBox(slot: ProjectCaseInsertImageSlot) {
  const width = 100
  const height =
    slot.imageSize && slot.imageSize.width > 0
      ? Math.max(1, 100 * (slot.imageSize.height / slot.imageSize.width))
      : 100

  return { width, height }
}

export function CaseInsertImageSlotFrame({
  slot,
}: {
  slot: ProjectCaseInsertImageSlot
}) {
  const frame = slot.frame

  if (!frame.enabled) {
    return null
  }

  const viewBox = getFrameViewBox(slot)
  const strokeWidth = Math.min(frame.width, viewBox.width, viewBox.height)
  const inset = strokeWidth / 2

  return (
    <svg
      className="case-insert-image-slot-frame"
      viewBox={`0 0 ${viewBox.width} ${viewBox.height}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      {frame.shape === 'circle' ? (
        <ellipse
          cx={viewBox.width / 2}
          cy={viewBox.height / 2}
          rx={Math.max(0, (viewBox.width - strokeWidth) / 2)}
          ry={Math.max(0, (viewBox.height - strokeWidth) / 2)}
          fill="none"
          stroke={frame.color}
          strokeWidth={strokeWidth}
        />
      ) : (
        <rect
          x={inset}
          y={inset}
          width={Math.max(0, viewBox.width - strokeWidth)}
          height={Math.max(0, viewBox.height - strokeWidth)}
          fill="none"
          stroke={frame.color}
          strokeWidth={strokeWidth}
        />
      )}
    </svg>
  )
}
