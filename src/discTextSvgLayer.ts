import {
  DISC_TEXT_KEYS,
  createSvgArcPath,
  getCopyrightArcSide,
  getCurvedPreviewLetterSpacing,
  getDiscTextContent,
  getLargeArcFlag,
  getReadableCurvedTextScale,
  type DiscTextKey,
  type DiscTextLayout,
  type DiscTextLayoutSettings,
  type DiscTextSettings,
  type DiscTextValues,
  type SteamLogoPlacement,
} from './discText'
import { layoutCurvedText } from './discText/curvedTextLayout'
import {
  getStraightDiscTextRenderLayout,
  type TextMeasureFunction,
} from './discTextRenderLayout'
import { escapeSvgAttribute, escapeSvgText } from './svgUtils'

export type DiscTextSvgLayerParams = {
  settings: DiscTextSettings
  values: DiscTextValues
  layoutSettings: DiscTextLayoutSettings
  title: string
  placement: SteamLogoPlacement
  safeZoneRadiusPercent: number
  measureText: TextMeasureFunction
  width: number | string
  height: number | string
  idPrefix?: string
}

let discTextMeasureContext: CanvasRenderingContext2D | null = null

function getDiscTextMeasureContext() {
  if (discTextMeasureContext) return discTextMeasureContext
  if (typeof document === 'undefined') return null

  discTextMeasureContext = document.createElement('canvas').getContext('2d')
  return discTextMeasureContext
}

export const measureDiscTextWithBrowserCanvas: TextMeasureFunction = (text, font) => {
  const context = getDiscTextMeasureContext()

  if (!context) {
    const fontSizeMatch = font.match(/(\d+(?:\.\d+)?)px/)
    const fontSize = fontSizeMatch ? Number(fontSizeMatch[1]) : 1
    return Array.from(text).length * fontSize * 0.58
  }

  context.font = font
  return context.measureText(text).width
}

function getFallbackCurvedLineWidth(line: string, fontSize: number, letterSpacing: number) {
  const averageCharacterWidth = fontSize * 0.68
  const characterCount = Array.from(line).length
  return characterCount * averageCharacterWidth + Math.max(0, characterCount - 1) * letterSpacing
}

function getCurvedLineWidth(
  line: string,
  fontSize: number,
  letterSpacing: number,
  measureText: TextMeasureFunction,
) {
  const font = `650 ${fontSize}px Arial`
  const measuredWidth = measureText(line, font)
  const characterCount = Array.from(line).length

  if (!Number.isFinite(measuredWidth)) {
    return getFallbackCurvedLineWidth(line, fontSize, letterSpacing)
  }

  return measuredWidth + Math.max(0, characterCount - 1) * letterSpacing
}

function splitLongTokenForCurvedText(
  token: string,
  maxArcLength: number,
  fontSize: number,
  letterSpacing: number,
  measureText: TextMeasureFunction,
) {
  const chunks: string[] = []
  let currentChunk = ''

  for (const character of Array.from(token)) {
    const testChunk = `${currentChunk}${character}`
    if (
      getCurvedLineWidth(testChunk, fontSize, letterSpacing, measureText) <= maxArcLength ||
      !currentChunk
    ) {
      currentChunk = testChunk
      continue
    }

    chunks.push(currentChunk)
    currentChunk = character
  }

  if (currentChunk) chunks.push(currentChunk)
  return chunks
}

function wrapCurvedTextByMeasuredArcLength(
  text: string,
  maxArcLength: number,
  fontSize: number,
  letterSpacing: number,
  measureText: TextMeasureFunction,
) {
  const tokens = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let currentLine = ''

  for (const token of tokens) {
    const tokenParts =
      getCurvedLineWidth(token, fontSize, letterSpacing, measureText) > maxArcLength
        ? splitLongTokenForCurvedText(token, maxArcLength, fontSize, letterSpacing, measureText)
        : [token]

    for (const part of tokenParts) {
      const testLine = currentLine ? `${currentLine} ${part}` : part
      if (
        getCurvedLineWidth(testLine, fontSize, letterSpacing, measureText) <= maxArcLength ||
        !currentLine
      ) {
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

function getCurvedLineRadius(
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

function getMinimumCurvedLineRadius(
  isTopArc: boolean,
  textRadius: number,
  lineStep: number,
  lineCount: number,
) {
  let minimumRadius = textRadius

  for (let index = 0; index < lineCount; index += 1) {
    minimumRadius = Math.min(
      minimumRadius,
      getCurvedLineRadius(isTopArc, textRadius, lineStep, lineCount, index),
    )
  }

  return Math.max(1, minimumRadius)
}

function wrapCurvedTextBlock(
  text: string,
  textRadius: number,
  lineStep: number,
  arcDegrees: number,
  fontSize: number,
  letterSpacing: number,
  isTopArc: boolean,
  measureText: TextMeasureFunction,
) {
  let lines = wrapCurvedTextByMeasuredArcLength(
    text,
    textRadius * ((arcDegrees * Math.PI) / 180),
    fontSize,
    letterSpacing,
    measureText,
  )
  const centeredLayout = layoutCurvedText({
    side: isTopArc ? 'top' : 'bottom',
    centerAngleDegrees: 0,
    arcDegrees,
    align: 'center',
    lines: lines.map((line, index) => ({
      text: line,
      measuredWidth: getCurvedLineWidth(line, fontSize, letterSpacing, measureText),
      radius: getCurvedLineRadius(isTopArc, textRadius, lineStep, lines.length, index),
    })),
  })

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const minimumLineRadius = getMinimumCurvedLineRadius(
      isTopArc,
      textRadius,
      lineStep,
      lines.length,
    )
    const nextLines = wrapCurvedTextByMeasuredArcLength(
      text,
      minimumLineRadius * ((centeredLayout.blockWindowDegrees * Math.PI) / 180),
      fontSize,
      letterSpacing,
      measureText,
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

function getCurvedLineTextPathAnchor(
  align: DiscTextLayout['align'],
): { startOffset: string; textAnchor: 'start' | 'end' | 'middle' } {
  if (align === 'left') return { startOffset: '0%', textAnchor: 'start' }
  if (align === 'right') return { startOffset: '100%', textAnchor: 'end' }
  return { startOffset: '50%', textAnchor: 'middle' }
}

function buildCurvedCopyrightMarkup(
  key: DiscTextKey,
  text: string,
  placement: SteamLogoPlacement,
  layout: DiscTextLayout,
  safeZoneRadiusPercent: number,
  measureText: TextMeasureFunction,
  idPrefix: string,
) {
  const isTopArc = getCopyrightArcSide(placement, layout) === 'top'
  const curvedScale = getReadableCurvedTextScale(layout.scale)
  const fontSize = 1.55 * curvedScale
  const textRadius = Math.max(1, safeZoneRadiusPercent - layout.y * 0.18)
  const arcCenterAngle = (isTopArc ? 270 : 90) + layout.x
  const lineStep = 2.2 * curvedScale
  const letterSpacing = getCurvedPreviewLetterSpacing(layout.scale)
  const { lines, blockWindowDegrees } = wrapCurvedTextBlock(
    text,
    textRadius,
    lineStep,
    layout.arcDegrees,
    fontSize,
    letterSpacing,
    isTopArc,
    measureText,
  )
  const curvedLineLayout = layoutCurvedText({
    side: isTopArc ? 'top' : 'bottom',
    centerAngleDegrees: arcCenterAngle,
    arcDegrees: layout.arcDegrees,
    align: layout.align,
    blockWindowDegrees,
    lines: lines.map((line, index) => ({
      text: line,
      measuredWidth: getCurvedLineWidth(line, fontSize, letterSpacing, measureText),
      radius: getCurvedLineRadius(isTopArc, textRadius, lineStep, lines.length, index),
    })),
  })
  const textPathAnchor = getCurvedLineTextPathAnchor(layout.align)
  const pathMarkup = curvedLineLayout.lines.map((lineLayout, index) => {
    const pathId = `${idPrefix}-${key}-path-${index}`
    const path = createSvgArcPath(
      50,
      50,
      lineLayout.radius,
      lineLayout.startAngleDegrees,
      lineLayout.endAngleDegrees,
      isTopArc ? 1 : 0,
      getLargeArcFlag(lineLayout.angleWidthDegrees),
    )

    return `<path id="${pathId}" d="${path}" />`
  }).join('')
  const textMarkup = curvedLineLayout.lines.map((lineLayout, index) => {
    const pathId = `${idPrefix}-${key}-path-${index}`

    return `
      <text
        class="disc-text-render-text"
        dominant-baseline="middle"
        data-disc-text-key="${key}"
        style="fill:#d1d5db; font-family:Arial, sans-serif; font-size:${fontSize}px; font-weight:650; letter-spacing:${letterSpacing}px;"
      >
        <textPath href="#${pathId}" xlink:href="#${pathId}" startOffset="${textPathAnchor.startOffset}" text-anchor="${textPathAnchor.textAnchor}">${escapeSvgText(lineLayout.text)}</textPath>
      </text>
    `
  }).join('')

  return { defs: pathMarkup, body: textMarkup }
}

function buildStraightTextMarkup(
  key: DiscTextKey,
  text: string,
  layout: DiscTextLayout,
  measureText: TextMeasureFunction,
) {
  const straightTextLayout = getStraightDiscTextRenderLayout(key, text, layout, measureText)

  return straightTextLayout.lines.map((line) => `
    <text
      class="disc-text-render-text"
      dominant-baseline="middle"
      data-disc-text-key="${key}"
      text-anchor="${straightTextLayout.textAnchor}"
      x="${line.x}"
      y="${line.y}"
      style="fill:${straightTextLayout.color}; font-family:${straightTextLayout.fontFamily}; font-size:${straightTextLayout.fontSize}px; font-weight:${straightTextLayout.fontWeight};"
    >${escapeSvgText(line.text)}</text>
  `).join('')
}

export function buildDiscTextSvgLayer({
  settings,
  values,
  layoutSettings,
  title,
  placement,
  safeZoneRadiusPercent,
  measureText,
  width,
  height,
  idPrefix = 'disc-text-layer',
}: DiscTextSvgLayerParams) {
  const shadowFilterId = `${idPrefix}-shadow`
  const pathDefs: string[] = []
  const textElements = DISC_TEXT_KEYS.map((key) => {
    if (!settings[key]) return ''

    const text = getDiscTextContent(key, values, title).trim()
    if (!text) return ''

    const layout = layoutSettings[key]

    if (key === 'copyright' && layout.mode === 'curved') {
      const curvedMarkup = buildCurvedCopyrightMarkup(
        key,
        text,
        placement,
        layout,
        safeZoneRadiusPercent,
        measureText,
        idPrefix,
      )
      pathDefs.push(curvedMarkup.defs)
      return curvedMarkup.body
    }

    return buildStraightTextMarkup(key, text, layout, measureText)
  }).join('')

  return `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      xmlns:xlink="http://www.w3.org/1999/xlink"
      class="disc-text-svg-layer"
      width="${escapeSvgAttribute(String(width))}"
      height="${escapeSvgAttribute(String(height))}"
      viewBox="0 0 100 100"
      aria-label="Disc text elements"
    >
      <defs>
        <filter id="${shadowFilterId}" x="-30%" y="-30%" width="160%" height="160%" color-interpolation-filters="sRGB">
          <feDropShadow dx="0" dy="0.32" stdDeviation="0.62" flood-color="#000000" flood-opacity="0.85" />
          <feDropShadow dx="0" dy="0" stdDeviation="0.22" flood-color="#000000" flood-opacity="0.9" />
        </filter>
        ${pathDefs.join('')}
      </defs>
      <style>
        .disc-text-svg-layer {
          display: block;
          overflow: visible;
        }

        .disc-text-render-text {
          alignment-baseline: middle;
          cursor: grab;
          filter: url(#${shadowFilterId});
          paint-order: stroke fill;
          pointer-events: visiblePainted;
          stroke: rgba(0, 0, 0, 0.58);
          stroke-linejoin: round;
          stroke-width: 0.28px;
          user-select: none;
        }

        .disc-text-render-text:active {
          cursor: grabbing;
        }
      </style>
      ${textElements}
    </svg>
  `
}
