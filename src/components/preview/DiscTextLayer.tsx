import type { PointerEvent } from 'react'
import {
  DISC_TEXT_KEYS,
  createSvgArcPath,
  getCopyrightArcSide,
  getCurvedPreviewLetterSpacing,
  getDiscTextContent,
  getDiscTextPreviewClassName,
  getLargeArcFlag,
  getReadableCurvedTextScale,
  wrapPreviewTextByArcLength,
  type DiscTextKey,
  type DiscTextLayout,
  type DiscTextLayoutSettings,
  type DiscTextSettings,
  type DiscTextValues,
  type SteamLogoPlacement,
} from '../../discText'
import { resolveMetadataBoundDiscTextValues } from '../../project/metadataDiscText'
import type { ProjectMetadata } from '../../project/projectTypes'
import type { DiscTemplate } from '../../types/template'

export type DiscTextLayerProps = {
  discTextSettings: DiscTextSettings
  discTextValues: DiscTextValues
  projectMetadata: ProjectMetadata
  manualGameTitle: string
  discTextLayout: DiscTextLayoutSettings
  steamLogoPlacement: SteamLogoPlacement
  selectedDiscTemplate: DiscTemplate
  getDiscTextPreviewTransform: (key: DiscTextKey, layout: DiscTextLayout) => string
  handleDiscTextPointerDown: (event: PointerEvent<Element>, key: DiscTextKey) => void
  handleDiscTextPointerMove: (event: PointerEvent<Element>) => void
  handleDiscTextPointerUp: (event: PointerEvent<Element>) => void
}

export function DiscTextLayer({
  discTextSettings,
  discTextValues,
  projectMetadata,
  manualGameTitle,
  discTextLayout,
  steamLogoPlacement,
  selectedDiscTemplate,
  getDiscTextPreviewTransform,
  handleDiscTextPointerDown,
  handleDiscTextPointerMove,
  handleDiscTextPointerUp,
}: DiscTextLayerProps) {
  const metadataBoundDiscTextValues = resolveMetadataBoundDiscTextValues(
    discTextValues,
    projectMetadata,
  )

  return (
    <div className="disc-text-layer" aria-label="Disc text elements">
      {DISC_TEXT_KEYS.map((key) => {
        if (!discTextSettings[key]) {
          return null
        }

        const text = getDiscTextContent(
          key,
          metadataBoundDiscTextValues,
          manualGameTitle,
        ).trim()

        if (!text) {
          return null
        }

        const layout = discTextLayout[key]

        if (key === 'copyright' && layout.mode === 'curved') {
          const copyrightPathId = `copyright-safe-zone-path-${steamLogoPlacement}`
          const copyrightArcSide = getCopyrightArcSide(steamLogoPlacement, layout)
          const isTopArc = copyrightArcSide === 'top'
          const curvedScale = getReadableCurvedTextScale(layout.scale)
          const fontSize = 1.55 * curvedScale
          const safeZoneRadius =
            (selectedDiscTemplate.safeDiameterMm / selectedDiscTemplate.outerDiameterMm) *
            50
          const textRadius = Math.max(
            1,
            safeZoneRadius - layout.y * 0.18,
          )
          const arcCenterAngle = (isTopArc ? 270 : 90) + layout.x
          const arcHalf = layout.arcDegrees / 2
          const largeArcFlag = getLargeArcFlag(layout.arcDegrees)
          const lines = wrapPreviewTextByArcLength(
            text,
            textRadius,
            layout.arcDegrees,
            curvedScale,
          )
          const lineStep = 2.2 * curvedScale

          return (
            <svg
              className="disc-curved-text-svg"
              key={key}
              viewBox="0 0 100 100"
              onPointerDown={(event) => handleDiscTextPointerDown(event, key)}
              onPointerMove={handleDiscTextPointerMove}
              onPointerUp={handleDiscTextPointerUp}
              onPointerCancel={handleDiscTextPointerUp}
            >
              <defs>
                {lines.map((_, index) => {
                  const lineRadius = isTopArc
                    ? textRadius - index * lineStep
                    : textRadius - (lines.length - 1 - index) * lineStep
                  const pathId = `${copyrightPathId}-${index}`

                  const path = isTopArc
                    ? createSvgArcPath(
                        50,
                        50,
                        lineRadius,
                        arcCenterAngle - arcHalf,
                        arcCenterAngle + arcHalf,
                        1,
                        largeArcFlag,
                      )
                    : createSvgArcPath(
                        50,
                        50,
                        lineRadius,
                        arcCenterAngle + arcHalf,
                        arcCenterAngle - arcHalf,
                        0,
                        largeArcFlag,
                      )

                  return <path id={pathId} d={path} key={pathId} />
                })}
              </defs>
              {lines.map((line, index) => (
                <text
                  className="disc-curved-text"
                  key={`${copyrightPathId}-line-${index}`}
                  dominantBaseline="middle"
                  style={{
                    fontSize: `${fontSize}px`,
                    letterSpacing: `${getCurvedPreviewLetterSpacing(layout.scale)}px`,
                  }}
                >
                  <textPath
                    href={`#${copyrightPathId}-${index}`}
                    startOffset="50%"
                    textAnchor="middle"
                  >
                    {line}
                  </textPath>
                </text>
              ))}
            </svg>
          )
        }
        return (
          <div
            className={`disc-text-line ${getDiscTextPreviewClassName(key)}`}
            key={key}
            style={{
              left: `${50 + layout.x}%`,
              top: `${layout.y}%`,
              width: `${layout.width}%`,
              maxWidth: `${layout.width}%`,
              textAlign: layout.align,
              transform: getDiscTextPreviewTransform(key, layout),
            }}
            onPointerDown={(event) => handleDiscTextPointerDown(event, key)}
            onPointerMove={handleDiscTextPointerMove}
            onPointerUp={handleDiscTextPointerUp}
            onPointerCancel={handleDiscTextPointerUp}
          >
            {text}
          </div>
        )
      })}
    </div>
  )
}
