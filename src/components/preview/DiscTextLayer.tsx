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
  type DiscTextAlignment,
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

function getCurvedTextPathAlignment(
  align: DiscTextAlignment,
  windowPercent: number,
): { startOffset: string; textAnchor: 'start' | 'middle' | 'end' } {
  if (align === 'left') {
    return { startOffset: `${50 - windowPercent / 2}%`, textAnchor: 'start' }
  }

  if (align === 'right') {
    return { startOffset: `${50 + windowPercent / 2}%`, textAnchor: 'end' }
  }

  return { startOffset: '50%', textAnchor: 'middle' }
}

function getEstimatedCurvedPreviewLineWidth(line: string, scale: number) {
  const averageCharacterWidth = Math.max(0.92, 1.28 * scale)
  return line.length * averageCharacterWidth
}

function getSharedCurvedPreviewWindowAngle(
  lines: string[],
  isTopArc: boolean,
  textRadius: number,
  lineStep: number,
  arcDegrees: number,
  scale: number,
) {
  if (lines.length === 0) {
    return (arcDegrees * Math.PI) / 180
  }

  const firstLineRadius = getCurvedPreviewLineRadius(
    isTopArc,
    textRadius,
    lineStep,
    lines.length,
    0,
  )
  const firstLineWidth = getEstimatedCurvedPreviewLineWidth(lines[0], scale)
  const rawArcAngle = (arcDegrees * Math.PI) / 180

  return Math.min(rawArcAngle, firstLineWidth / firstLineRadius)
}

function getCurvedPreviewLineRadius(
  isTopArc: boolean,
  textRadius: number,
  lineStep: number,
  lineCount: number,
  index: number,
) {
  const lineRadius = isTopArc
    ? textRadius - index * lineStep
    : textRadius - (lineCount - 1 - index) * lineStep

  return Math.max(1, lineRadius)
}

function getMinimumCurvedPreviewLineRadius(
  isTopArc: boolean,
  textRadius: number,
  lineStep: number,
  lineCount: number,
) {
  let minimumRadius = textRadius

  for (let index = 0; index < lineCount; index += 1) {
    minimumRadius = Math.min(
      minimumRadius,
      getCurvedPreviewLineRadius(isTopArc, textRadius, lineStep, lineCount, index),
    )
  }

  return Math.max(1, minimumRadius)
}

function wrapPreviewTextForCurvedBlock(
  text: string,
  textRadius: number,
  lineStep: number,
  arcDegrees: number,
  scale: number,
  isTopArc: boolean,
) {
  let lines = wrapPreviewTextByArcLength(text, textRadius, arcDegrees, scale)
  const sharedWindowAngle = getSharedCurvedPreviewWindowAngle(
    lines,
    isTopArc,
    textRadius,
    lineStep,
    arcDegrees,
    scale,
  )

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const minimumLineRadius = getMinimumCurvedPreviewLineRadius(
      isTopArc,
      textRadius,
      lineStep,
      lines.length,
    )
    const nextLines = wrapPreviewTextByArcLength(
      text,
      minimumLineRadius,
      (sharedWindowAngle * 180) / Math.PI,
      scale,
    )

    if (nextLines.join('\n') === lines.join('\n')) {
      return {
        lines,
        sharedWindowAngle,
      }
    }

    lines = nextLines
  }

  return {
    lines,
    sharedWindowAngle,
  }
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
          const lineStep = 2.2 * curvedScale
          const { lines, sharedWindowAngle } = wrapPreviewTextForCurvedBlock(
            text,
            textRadius,
            lineStep,
            layout.arcDegrees,
            curvedScale,
            isTopArc,
          )
          const sharedWindowPercent = Math.min(
            100,
            (sharedWindowAngle / ((layout.arcDegrees * Math.PI) / 180)) * 100,
          )

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
                  const lineRadius = getCurvedPreviewLineRadius(
                    isTopArc,
                    textRadius,
                    lineStep,
                    lines.length,
                    index,
                  )
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
              {lines.map((line, index) => {
                const textPathAlignment = getCurvedTextPathAlignment(
                  layout.align,
                  sharedWindowPercent,
                )

                return (
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
                      startOffset={textPathAlignment.startOffset}
                      textAnchor={textPathAlignment.textAnchor}
                    >
                      {line}
                    </textPath>
                  </text>
                )
              })}
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
