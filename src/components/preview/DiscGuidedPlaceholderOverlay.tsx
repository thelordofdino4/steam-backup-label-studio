import { useId } from 'react'
import type {
  DiscGuidedPlaceholderViewModel,
} from '../../guidedPresets/discGuidedPlaceholderViewModel'
import {
  DISC_GUIDED_PLACEHOLDER_LABEL_LINE_HEIGHT,
  getDiscGuidedPlaceholderLabelLines,
} from './discGuidedPlaceholderLabels.ts'

type DiscGuidedPlaceholderOverlayProps = {
  placeholders: readonly DiscGuidedPlaceholderViewModel[]
  physicalCenterHolePercent: number
}

type DiscGuidedPlaceholderVisualLayerProps = {
  layer: DiscGuidedPlaceholderViewModel['visualLayer']
  placeholders: readonly DiscGuidedPlaceholderViewModel[]
  physicalCenterHolePercent: number
}

function getGeometryBounds(
  geometry: DiscGuidedPlaceholderViewModel['visualGeometry'],
) {
  return {
    x: geometry.centerXPercent - geometry.widthPercent / 2,
    y: geometry.centerYPercent - geometry.heightPercent / 2,
  }
}

export function DiscGuidedPlaceholderVisualLayer({
  layer,
  placeholders,
  physicalCenterHolePercent,
}: DiscGuidedPlaceholderVisualLayerProps) {
  const maskId = `disc-guided-placeholder-${layer}-mask-${useId().replaceAll(':', '')}`

  if (placeholders.length === 0) {
    return null
  }

  return (
    <svg
      aria-hidden="true"
      className={`disc-guided-placeholder-overlay disc-guided-placeholder-overlay--${layer}`}
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
        {placeholders.map(({
          actionGeometry,
          label,
          lifecycle,
          slotId,
          visualGeometry,
        }) => {
          const visualBounds = getGeometryBounds(visualGeometry)
          const visualRotation = visualGeometry.rotationDegrees ?? 0
          const labelRotation = actionGeometry.rotationDegrees ?? 0
          const labelLines = getDiscGuidedPlaceholderLabelLines(label)
          const labelRowCount = labelLines.length +
            (lifecycle === 'suggested' ? 1 : 0)
          const firstLabelRowOffset =
            -((labelRowCount - 1) *
              DISC_GUIDED_PLACEHOLDER_LABEL_LINE_HEIGHT) / 2

          return (
            <g key={slotId} data-guided-slot-id={slotId}>
              <foreignObject
                x={visualBounds.x}
                y={visualBounds.y}
                width={visualGeometry.widthPercent}
                height={visualGeometry.heightPercent}
                transform={`rotate(${visualRotation} ${visualGeometry.centerXPercent} ${visualGeometry.centerYPercent})`}
              >
                <div
                  className={[
                    'disc-guided-placeholder-shape',
                    lifecycle === 'suggested'
                      ? 'disc-guided-placeholder-shape--suggested'
                      : '',
                  ].filter(Boolean).join(' ')}
                />
              </foreignObject>
              <text
                className="disc-guided-placeholder-label"
                x={actionGeometry.centerXPercent}
                y={actionGeometry.centerYPercent}
                transform={`rotate(${labelRotation} ${actionGeometry.centerXPercent} ${actionGeometry.centerYPercent})`}
              >
                {labelLines.map((line, index) => (
                  <tspan
                    key={line}
                    x={actionGeometry.centerXPercent}
                    dy={index === 0
                      ? firstLabelRowOffset
                      : DISC_GUIDED_PLACEHOLDER_LABEL_LINE_HEIGHT}
                  >
                    {line}
                  </tspan>
                ))}
                {lifecycle === 'suggested' ? (
                  <tspan
                    className="disc-guided-placeholder-suggested-label"
                    x={actionGeometry.centerXPercent}
                    dy={DISC_GUIDED_PLACEHOLDER_LABEL_LINE_HEIGHT}
                  >
                    Suggested
                  </tspan>
                ) : null}
              </text>
            </g>
          )
        })}
      </g>
    </svg>
  )
}

export function DiscGuidedPlaceholderOverlay({
  placeholders,
  physicalCenterHolePercent,
}: DiscGuidedPlaceholderOverlayProps) {
  if (placeholders.length === 0) {
    return null
  }

  const backgroundPlaceholders = placeholders.filter(
    ({ visualLayer }) => visualLayer === 'background',
  )
  const foregroundPlaceholders = placeholders.filter(
    ({ visualLayer }) => visualLayer === 'foreground',
  )

  return (
    <>
      <DiscGuidedPlaceholderVisualLayer
        layer="background"
        placeholders={backgroundPlaceholders}
        physicalCenterHolePercent={physicalCenterHolePercent}
      />
      <DiscGuidedPlaceholderVisualLayer
        layer="foreground"
        placeholders={foregroundPlaceholders}
        physicalCenterHolePercent={physicalCenterHolePercent}
      />
    </>
  )
}
