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
} from './index.ts'
import type { DiscTextAvoidanceRegion } from './avoidance.ts'
import { layoutCurvedText } from './curvedTextLayout.ts'
import {
  getDiscTextFontString,
  getStraightDiscTextRenderLayout,
  getStraightDiscTextVisualBounds,
  type TextMeasureFunction,
} from './renderLayout.ts'
import {
  getResolvedDiscTextRenderStyle,
  type DiscTextStyleInput,
} from './styles.ts'
import { escapeSvgAttribute, escapeSvgText } from '../utils/svg.ts'

export type DiscTextSvgLayerParams = {
  settings: DiscTextSettings
  values: DiscTextValues
  styles?: DiscTextStyleInput
  layoutSettings: DiscTextLayoutSettings
  title: string
  placement: SteamLogoPlacement
  safeZoneRadiusPercent: number
  measureText: TextMeasureFunction
  avoidanceRegions?: DiscTextAvoidanceRegion[]
  width: number | string
  height: number | string
  idPrefix?: string
}

type ResolvedDiscTextRenderStyle = ReturnType<typeof getResolvedDiscTextRenderStyle>

const DISC_TEXT_STROKE_COLOR = 'rgba(0, 0, 0, 0.58)'
const DISC_TEXT_STRAIGHT_STROKE_WIDTH = 0.28
const DISC_TEXT_CURVED_STROKE_WIDTH = 0.28
const DISC_TEXT_BOX_BORDER_WIDTH = 0.18

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
  font: string,
  fontSize: number,
  letterSpacing: number,
  measureText: TextMeasureFunction,
) {
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
  font: string,
  fontSize: number,
  letterSpacing: number,
  measureText: TextMeasureFunction,
) {
  const chunks: string[] = []
  let currentChunk = ''

  for (const character of Array.from(token)) {
    const testChunk = `${currentChunk}${character}`
    if (
      getCurvedLineWidth(testChunk, font, fontSize, letterSpacing, measureText) <= maxArcLength ||
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
  font: string,
  fontSize: number,
  letterSpacing: number,
  measureText: TextMeasureFunction,
) {
  const tokens = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let currentLine = ''

  for (const token of tokens) {
    const tokenParts =
      getCurvedLineWidth(token, font, fontSize, letterSpacing, measureText) > maxArcLength
        ? splitLongTokenForCurvedText(
            token,
            maxArcLength,
            font,
            fontSize,
            letterSpacing,
            measureText,
          )
        : [token]

    for (const part of tokenParts) {
      const testLine = currentLine ? `${currentLine} ${part}` : part
      if (
        getCurvedLineWidth(testLine, font, fontSize, letterSpacing, measureText) <= maxArcLength ||
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
  font: string,
  fontSize: number,
  letterSpacing: number,
  isTopArc: boolean,
  measureText: TextMeasureFunction,
) {
  let lines = wrapCurvedTextByMeasuredArcLength(
    text,
    textRadius * ((arcDegrees * Math.PI) / 180),
    font,
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
      measuredWidth: getCurvedLineWidth(line, font, fontSize, letterSpacing, measureText),
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
      font,
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

function hasDiscTextShadow(style: ResolvedDiscTextRenderStyle) {
  return style.contrast === 'shadow' || style.contrast === 'strokeShadow'
}

function hasDiscTextStroke(style: ResolvedDiscTextRenderStyle) {
  return style.contrast === 'stroke' || style.contrast === 'strokeShadow'
}

function buildTextStyleAttribute(
  style: ResolvedDiscTextRenderStyle,
  shadowFilterId: string,
  fontSize: number,
  fontWeight: number,
  strokeWidth: number,
  letterSpacing?: number,
) {
  const declarations = [
    `fill:${style.color}`,
    `font-family:${style.fontFamilyCss}`,
    `font-size:${fontSize}px`,
    `font-weight:${fontWeight}`,
    typeof letterSpacing === 'number' ? `letter-spacing:${letterSpacing}px` : '',
    hasDiscTextShadow(style) ? `filter:url(#${shadowFilterId})` : '',
    'paint-order:stroke fill',
    `stroke:${hasDiscTextStroke(style) ? DISC_TEXT_STROKE_COLOR : 'transparent'}`,
    `stroke-width:${hasDiscTextStroke(style) ? strokeWidth : 0}px`,
    'stroke-linejoin:round',
  ].filter(Boolean)

  return escapeSvgAttribute(declarations.join('; '))
}

function formatSvgNumber(value: number) {
  return Number(value.toFixed(3))
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
  shadowFilterId: string,
  styles?: DiscTextStyleInput,
) {
  const isTopArc = getCopyrightArcSide(placement, layout) === 'top'
  const renderStyle = getResolvedDiscTextRenderStyle(key, styles)
  const curvedScale = getReadableCurvedTextScale(layout.scale)
  const fontSize = 1.55 * curvedScale
  const font = getDiscTextFontString(
    renderStyle.fontWeight,
    fontSize,
    renderStyle.fontFamilyCanvas,
  )
  const textRadius = Math.max(1, safeZoneRadiusPercent - layout.y * 0.18)
  const arcCenterAngle = (isTopArc ? 270 : 90) + layout.x
  const lineStep = 2.2 * curvedScale
  const letterSpacing = getCurvedPreviewLetterSpacing(layout.scale)
  const { lines, blockWindowDegrees } = wrapCurvedTextBlock(
    text,
    textRadius,
    lineStep,
    layout.arcDegrees,
    font,
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
      measuredWidth: getCurvedLineWidth(
        line,
        font,
        fontSize,
        letterSpacing,
        measureText,
      ),
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
    const style = buildTextStyleAttribute(
      renderStyle,
      shadowFilterId,
      fontSize,
      renderStyle.fontWeight,
      DISC_TEXT_CURVED_STROKE_WIDTH,
      letterSpacing,
    )

    return `
      <text
        class="disc-text-render-text"
        dominant-baseline="middle"
        data-disc-text-key="${key}"
        style="${style}"
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
  shadowFilterId: string,
  styles?: DiscTextStyleInput,
  avoidanceRegions?: DiscTextAvoidanceRegion[],
) {
  const textAvoidanceRegions = avoidanceRegions?.filter(
    (region) => region.sourceDiscTextKey !== key,
  )
  const straightTextLayout = getStraightDiscTextRenderLayout(
    key,
    text,
    layout,
    measureText,
    styles,
    { avoidanceRegions: textAvoidanceRegions },
  )
  const textStyle = buildTextStyleAttribute(
    straightTextLayout.style,
    shadowFilterId,
    straightTextLayout.fontSize,
    straightTextLayout.fontWeight,
    DISC_TEXT_STRAIGHT_STROKE_WIDTH,
  )
  const boxMarkup = buildStraightTextBoxMarkup(key, straightTextLayout, measureText)

  const textMarkup = straightTextLayout.lines.map((line) => `
    <text
      class="disc-text-render-text"
      dominant-baseline="middle"
      data-disc-text-key="${key}"
      text-anchor="${straightTextLayout.textAnchor}"
      x="${line.x}"
      y="${line.y}"
      style="${textStyle}"
    >${escapeSvgText(line.text)}</text>
  `).join('')

  return `${boxMarkup}${textMarkup}`
}

function buildStraightTextBoxMarkup(
  key: DiscTextKey,
  straightTextLayout: ReturnType<typeof getStraightDiscTextRenderLayout>,
  measureText: TextMeasureFunction,
) {
  const style = straightTextLayout.style

  if (straightTextLayout.lines.length === 0) return ''
  if (!style.backgroundEnabled && !style.borderEnabled) return ''

  const bounds = getStraightDiscTextVisualBounds(straightTextLayout, measureText)
  const padding = style.backgroundPadding
  const x = bounds.centerX - bounds.halfWidth - padding
  const y = bounds.centerY - bounds.halfHeight - padding
  const width = bounds.halfWidth * 2 + padding * 2
  const height = bounds.halfHeight * 2 + padding * 2

  if (width <= 0 || height <= 0) return ''

  return `
    <rect
      class="disc-text-render-box"
      data-disc-text-key="${key}"
      x="${formatSvgNumber(x)}"
      y="${formatSvgNumber(y)}"
      width="${formatSvgNumber(width)}"
      height="${formatSvgNumber(height)}"
      rx="${formatSvgNumber(style.borderRadius)}"
      ry="${formatSvgNumber(style.borderRadius)}"
      fill="${style.backgroundEnabled ? escapeSvgAttribute(style.backgroundColor) : 'none'}"
      fill-opacity="${style.backgroundEnabled ? style.backgroundOpacity : 0}"
      stroke="${style.borderEnabled ? escapeSvgAttribute(style.borderColor) : 'none'}"
      stroke-width="${style.borderEnabled ? DISC_TEXT_BOX_BORDER_WIDTH : 0}"
    />
  `
}

export function buildDiscTextSvgLayer({
  settings,
  values,
  styles,
  layoutSettings,
  title,
  placement,
  safeZoneRadiusPercent,
  measureText,
  avoidanceRegions = [],
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
        shadowFilterId,
        styles,
      )
      pathDefs.push(curvedMarkup.defs)
      return curvedMarkup.body
    }

    return buildStraightTextMarkup(
      key,
      text,
      layout,
      measureText,
      shadowFilterId,
      styles,
      avoidanceRegions,
    )
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
          pointer-events: visiblePainted;
          user-select: none;
        }

        .disc-text-render-box {
          cursor: grab;
          pointer-events: visiblePainted;
          user-select: none;
        }

        .disc-text-render-text:active,
        .disc-text-render-box:active {
          cursor: grabbing;
        }
      </style>
      ${textElements}
    </svg>
  `
}
