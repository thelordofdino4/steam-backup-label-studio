import { useId } from 'react'
import type {
  DiscGuidedPlaceholderViewModel,
} from '../../guidedPresets/discGuidedPlaceholderViewModel'

type DiscGuidedPlaceholderOverlayProps = {
  placeholders: readonly DiscGuidedPlaceholderViewModel[]
  physicalCenterHolePercent: number
}

export function DiscGuidedPlaceholderOverlay({
  placeholders,
  physicalCenterHolePercent,
}: DiscGuidedPlaceholderOverlayProps) {
  const maskId = `disc-guided-placeholder-mask-${useId().replaceAll(':', '')}`

  if (placeholders.length === 0) {
    return null
  }

  return (
    <svg
      aria-hidden="true"
      className="disc-guided-placeholder-overlay"
      focusable="false"
      viewBox="0 0 100 100"
    >
      <defs>
        <mask
          id={maskId}
          maskUnits="userSpaceOnUse"
          x="0"
          y="0"
          width="100"
          height="100"
        >
          <rect x="0" y="0" width="100" height="100" fill="black" />
          <circle cx="50" cy="50" r="50" fill="white" />
          <circle
            cx="50"
            cy="50"
            r={physicalCenterHolePercent / 2}
            fill="black"
          />
        </mask>
      </defs>

      <g mask={`url(#${maskId})`}>
        {placeholders.map(({ slotId, label, geometry }) => {
          const x = geometry.centerXPercent - geometry.widthPercent / 2
          const y = geometry.centerYPercent - geometry.heightPercent / 2
          const rotation = geometry.rotationDegrees ?? 0

          return (
            <g
              key={slotId}
              transform={`rotate(${rotation} ${geometry.centerXPercent} ${geometry.centerYPercent})`}
            >
              <rect
                className="disc-guided-placeholder-shape"
                x={x}
                y={y}
                width={geometry.widthPercent}
                height={geometry.heightPercent}
              />
              <text
                className="disc-guided-placeholder-label"
                x={geometry.centerXPercent}
                y={geometry.centerYPercent}
              >
                {label}
              </text>
            </g>
          )
        })}
      </g>
    </svg>
  )
}
