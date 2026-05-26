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
import { layoutCurvedText } from '../../discText/curvedTextLayout'
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

function getEstimatedCurvedPreviewLineWidth(line: string, scale: number) {
  const averageCharacterWidth = Math.max(0.92, 1.28 * scale)
  return line.length * averageCharacterWidth
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
  const centeredLayout = layoutCurvedText({
    side: isTopArc ? 'top' : 'bottom',
    centerAngleDegrees: 0,
    arcDegrees,
    align: 'center',
    lines: lines.map((line, index) => ({
      text: line,
      measuredWidth: getEstimatedCurvedPreviewLineWidth(line, scale),
      radius: getCurvedPreviewLineRadius(isTopArc, textRadius, lineStep, lines.length, index),
    })),
  })

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
      centeredLayout.blockWindowDegrees,
      scale,
    )

    if (nextLines.join('\n') === lines.join('\n')) {
      return {
        lines,
        blockWindowDegrees: centeredLayout.blockWindowDegrees,
      }
    }

    lines = nextLines
  }

  return {
    lines,
    blockWindowDegrees: centeredLayout.blockWindowDegrees,
  }
}

function getTextAnchorForAlignment(align: DiscTextLayout['align']) {
  if (align === 'left') return 'start'
  if (align === 'right') return 'end'
  return 'middle'
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
          const lineStep = 2.2 * curvedScale
          const { lines, blockWindowDegrees } = wrapPreviewTextForCurvedBlock(
            text,
            textRadius,
            lineStep,
            layout.arcDegrees,
            curvedScale,
            isTopArc,
          )
          const curvedLineLayout = layoutCurvedText({
            side: isTopArc ? 'top' : 'bottom',
            centerAngleDegrees: arcCenterAngle,
            arcDegrees: layout.arcDegrees,
            align: layout.align,
            blockWindowDegrees,
            lines: lines.map((line, index) => ({
              text: line,
              measuredWidth: getEstimatedCurvedPreviewLineWidth(line, curvedScale),
              radius: getCurvedPreviewLineRadius(isTopArc, textRadius, lineStep, lines.length, index),
            })),
          })
          const largeArcFlag = getLargeArcFlag(curvedLineLayout.blockWindowDegrees)

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
                {curvedLineLayout.lines.map((lineLayout, index) => {
                  const pathId = `${copyrightPathId}-${index}`

                  const path = isTopArc
                    ? createSvgArcPath(
                        50,
                        50,
                        lineLayout.radius,
                        curvedLineLayout.blockStartAngleDegrees,
                        curvedLineLayout.blockEndAngleDegrees,
                        1,
                        largeArcFlag,
                      )
                    : createSvgArcPath(
                        50,
                        50,
                        lineLayout.radius,
                        curvedLineLayout.blockStartAngleDegrees,
                        curvedLineLayout.blockEndAngleDegrees,
                        0,
                        largeArcFlag,
                      )

                  return <path id={pathId} d={path} key={pathId} />
                })}
              </defs>
              {curvedLineLayout.lines.map((lineLayout, index) => (
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
                      startOffset={layout.align === 'left' ? '0%' : layout.align === 'right' ? '100%' : '50%'}
                      textAnchor={getTextAnchorForAlignment(layout.align)}
                    >
                      {lineLayout.text}
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
