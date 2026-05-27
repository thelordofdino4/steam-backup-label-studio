import type { CSSProperties, PointerEvent } from 'react'
import {
  DISC_TEXT_KEYS,
  createSvgArcPath,
  getCopyrightArcSide,
  getCurvedPreviewLetterSpacing,
  getDiscTextContent,
  getDiscTextPreviewClassName,
  getLargeArcFlag,
  getReadableCurvedTextScale,
  type DiscTextKey,
  type DiscTextLayout,
  type DiscTextLayoutSettings,
  type DiscTextSettings,
  type DiscTextValues,
  type SteamLogoPlacement,
} from '../../discText'
import { layoutCurvedText, type CurvedTextLineLayout } from '../../discText/curvedTextLayout'
import { DISC_TEXT_RENDER_STYLES } from '../../discTextStyles'
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

let curvedPreviewMeasureContext: CanvasRenderingContext2D | null = null

function getCurvedPreviewMeasureContext() {
  if (curvedPreviewMeasureContext) return curvedPreviewMeasureContext
  if (typeof document === 'undefined') return null

  curvedPreviewMeasureContext = document.createElement('canvas').getContext('2d')
  return curvedPreviewMeasureContext
}

function getFallbackCurvedPreviewLineWidth(line: string, fontSize: number, letterSpacing: number) {
  const averageCharacterWidth = fontSize * 0.68
  const characterCount = Array.from(line).length
  return characterCount * averageCharacterWidth + Math.max(0, characterCount - 1) * letterSpacing
}

function getCurvedPreviewLineWidth(line: string, fontSize: number, letterSpacing: number) {
  const context = getCurvedPreviewMeasureContext()
  if (!context) return getFallbackCurvedPreviewLineWidth(line, fontSize, letterSpacing)

  context.font = `650 ${fontSize}px Arial`
  const characterCount = Array.from(line).length
  return context.measureText(line).width + Math.max(0, characterCount - 1) * letterSpacing
}

function splitLongTokenForCurvedPreview(
  token: string,
  maxArcLength: number,
  fontSize: number,
  letterSpacing: number,
) {
  const chunks: string[] = []
  let currentChunk = ''

  for (const character of Array.from(token)) {
    const testChunk = `${currentChunk}${character}`
    if (getCurvedPreviewLineWidth(testChunk, fontSize, letterSpacing) <= maxArcLength || !currentChunk) {
      currentChunk = testChunk
      continue
    }

    chunks.push(currentChunk)
    currentChunk = character
  }

  if (currentChunk) chunks.push(currentChunk)
  return chunks
}

function wrapPreviewTextByMeasuredArcLength(
  text: string,
  maxArcLength: number,
  fontSize: number,
  letterSpacing: number,
) {
  const tokens = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let currentLine = ''

  for (const token of tokens) {
    const tokenParts = getCurvedPreviewLineWidth(token, fontSize, letterSpacing) > maxArcLength
      ? splitLongTokenForCurvedPreview(token, maxArcLength, fontSize, letterSpacing)
      : [token]

    for (const part of tokenParts) {
      const testLine = currentLine ? `${currentLine} ${part}` : part
      if (getCurvedPreviewLineWidth(testLine, fontSize, letterSpacing) <= maxArcLength || !currentLine) {
        currentLine = testLine
        continue
      }

      lines.push(currentLine)
      currentLine = part
    }
  }

  if (currentLine) lines.push(currentLine)
  return lines
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
  fontSize: number,
  letterSpacing: number,
  isTopArc: boolean,
) {
  let lines = wrapPreviewTextByMeasuredArcLength(
    text,
    textRadius * ((arcDegrees * Math.PI) / 180),
    fontSize,
    letterSpacing,
  )
  const centeredLayout = layoutCurvedText({
    side: isTopArc ? 'top' : 'bottom',
    centerAngleDegrees: 0,
    arcDegrees,
    align: 'center',
    lines: lines.map((line, index) => ({
      text: line,
      measuredWidth: getCurvedPreviewLineWidth(line, fontSize, letterSpacing),
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
    const nextLines = wrapPreviewTextByMeasuredArcLength(
      text,
      minimumLineRadius * ((centeredLayout.blockWindowDegrees * Math.PI) / 180),
      fontSize,
      letterSpacing,
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

function getCurvedLinePath(lineLayout: CurvedTextLineLayout, isTopArc: boolean) {
  return createSvgArcPath(
    50,
    50,
    lineLayout.radius,
    lineLayout.startAngleDegrees,
    lineLayout.endAngleDegrees,
    isTopArc ? 1 : 0,
    getLargeArcFlag(lineLayout.angleWidthDegrees),
  )
}

function getCurvedLineTextPathAnchor(
  align: DiscTextLayout['align'],
): { startOffset: string; textAnchor: 'start' | 'end' | 'middle' } {
  if (align === 'left') return { startOffset: '0%', textAnchor: 'start' }
  if (align === 'right') return { startOffset: '100%', textAnchor: 'end' }
  return { startOffset: '50%', textAnchor: 'middle' }
}

function getStraightPreviewTextStyle(key: DiscTextKey): CSSProperties {
  const renderStyle = DISC_TEXT_RENDER_STYLES[key]

  return {
    color: renderStyle.color,
    display: '-webkit-box',
    fontFamily: 'Arial, sans-serif',
    fontSize: `clamp(7px, ${renderStyle.fontSizePercent}cqw, 34px)`,
    fontWeight: renderStyle.fontWeight,
    WebkitBoxOrient: 'vertical',
    WebkitLineClamp: renderStyle.maxLines,
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
          const lineStep = 2.2 * curvedScale
          const letterSpacing = getCurvedPreviewLetterSpacing(layout.scale)
          const { lines, blockWindowDegrees } = wrapPreviewTextForCurvedBlock(
            text,
            textRadius,
            lineStep,
            layout.arcDegrees,
            fontSize,
            letterSpacing,
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
              measuredWidth: getCurvedPreviewLineWidth(line, fontSize, letterSpacing),
              radius: getCurvedPreviewLineRadius(isTopArc, textRadius, lineStep, lines.length, index),
            })),
          })
          const textPathAnchor = getCurvedLineTextPathAnchor(layout.align)

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
                  const path = getCurvedLinePath(lineLayout, isTopArc)

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
                      letterSpacing: `${letterSpacing}px`,
                    }}
                  >
                    <textPath
                      href={`#${copyrightPathId}-${index}`}
                      startOffset={textPathAnchor.startOffset}
                      textAnchor={textPathAnchor.textAnchor}
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
              ...getStraightPreviewTextStyle(key),
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
