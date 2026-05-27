import {
  DISC_TEXT_KEYS,
  createSvgArcPath,
  getCopyrightArcSide,
  getCurvedPreviewLetterSpacing,
  getDiscTextContent,
  getLargeArcFlag,
  getReadableCurvedTextScale,
  type DiscTextLayout,
  type DiscTextLayoutSettings,
  type DiscTextSettings,
  type DiscTextValues,
  type SteamLogoPlacement,
} from '../discText'
import { layoutCurvedText, type CurvedTextLineLayout } from '../discText/curvedTextLayout'
import {
  getStraightDiscTextRenderLayout,
  type TextMeasureFunction,
} from '../discTextRenderLayout'
import { loadImage } from './canvasImage'

function escapeSvgText(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function createSvgDataUrl(svg: string) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

function getFallbackTextWidth(text: string, font: string) {
  const fontSizeMatch = font.match(/(\d+(?:\.\d+)?)px/)
  const fontSize = fontSizeMatch ? Number(fontSizeMatch[1]) : 1
  return Array.from(text).length * fontSize * 0.58
}

function splitLongTokenByMeasuredWidth(
  token: string,
  maxWidth: number,
  fontSize: number,
  letterSpacing: number,
  measureText: (text: string, fontSize: number) => number,
) {
  const chunks: string[] = []
  let currentChunk = ''

  for (const character of Array.from(token)) {
    const testChunk = `${currentChunk}${character}`

    if (measureText(testChunk, fontSize) + Math.max(0, Array.from(testChunk).length - 1) * letterSpacing <= maxWidth || !currentChunk) {
      currentChunk = testChunk
      continue
    }

    chunks.push(currentChunk)
    currentChunk = character
  }

  if (currentChunk) chunks.push(currentChunk)
  return chunks
}

function wrapMeasuredTextByWidth(
  text: string,
  maxWidth: number,
  fontSize: number,
  letterSpacing: number,
  measureText: (text: string, fontSize: number) => number,
) {
  const tokens = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let currentLine = ''

  for (const token of tokens) {
    const tokenWidth = measureText(token, fontSize) + Math.max(0, Array.from(token).length - 1) * letterSpacing
    const tokenParts = tokenWidth > maxWidth
      ? splitLongTokenByMeasuredWidth(token, maxWidth, fontSize, letterSpacing, measureText)
      : [token]

    for (const part of tokenParts) {
      const testLine = currentLine ? `${currentLine} ${part}` : part
      const testWidth = measureText(testLine, fontSize) + Math.max(0, Array.from(testLine).length - 1) * letterSpacing

      if (testWidth <= maxWidth || !currentLine) {
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

function getCurvedTextNaturalWidth(
  text: string,
  radius: number,
  fontSize: number,
  measureText: (text: string, fontSize: number) => number,
) {
  const characters = Array.from(text)
  const baseCharacterSpacing = Math.max(0.12, radius * 0.0036)
  const glyphWidth = characters.reduce((sum, character) => sum + measureText(character, fontSize), 0)
  return glyphWidth + Math.max(0, characters.length - 1) * baseCharacterSpacing
}

function getCurvedLineRadius(
  isTopArc: boolean,
  outerLineRadius: number,
  lineHeight: number,
  lineCount: number,
  index: number,
) {
  return isTopArc
    ? outerLineRadius - index * lineHeight
    : outerLineRadius - (lineCount - 1 - index) * lineHeight
}

function getMinimumVisibleCurvedLineRadius(
  isTopArc: boolean,
  outerLineRadius: number,
  lineHeight: number,
  lineCount: number,
  minimumDrawableRadius: number,
) {
  let minimumRadius = outerLineRadius

  for (let index = 0; index < lineCount; index += 1) {
    const lineRadius = getCurvedLineRadius(
      isTopArc,
      outerLineRadius,
      lineHeight,
      lineCount,
      index,
    )

    if (lineRadius > minimumDrawableRadius) {
      minimumRadius = Math.min(minimumRadius, lineRadius)
    }
  }

  return Math.max(1, minimumRadius)
}

function wrapTextForCurvedBlock(
  text: string,
  outerLineRadius: number,
  lineHeight: number,
  arcDegrees: number,
  fontSize: number,
  letterSpacing: number,
  isTopArc: boolean,
  minimumDrawableRadius: number,
  measureText: (text: string, fontSize: number) => number,
) {
  let lines = wrapMeasuredTextByWidth(
    text,
    outerLineRadius * ((arcDegrees * Math.PI) / 180),
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
      measuredWidth: getCurvedTextNaturalWidth(
        line,
        getCurvedLineRadius(isTopArc, outerLineRadius, lineHeight, lines.length, index),
        fontSize,
        measureText,
      ),
      radius: getCurvedLineRadius(isTopArc, outerLineRadius, lineHeight, lines.length, index),
    })),
  })

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const minimumLineRadius = getMinimumVisibleCurvedLineRadius(
      isTopArc,
      outerLineRadius,
      lineHeight,
      lines.length,
      minimumDrawableRadius,
    )
    const nextLines = wrapMeasuredTextByWidth(
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

function buildCurvedCopyrightSvgMarkup(
  text: string,
  placement: SteamLogoPlacement,
  layout: DiscTextLayout,
  safeZoneRadiusPercent: number,
  measureText: (text: string, fontSize: number) => number,
) {
  const isTopArc = getCopyrightArcSide(placement, layout) === 'top'
  const curvedScale = getReadableCurvedTextScale(layout.scale)
  const fontSize = 1.55 * curvedScale
  const lineHeight = fontSize * 1.38
  const outerLineRadius = Math.max(1, safeZoneRadiusPercent - layout.y * 0.18)
  const minimumDrawableRadius = safeZoneRadiusPercent * 0.35
  const letterSpacing = getCurvedPreviewLetterSpacing(layout.scale)
  const { lines, blockWindowDegrees } = wrapTextForCurvedBlock(
    text,
    outerLineRadius,
    lineHeight,
    layout.arcDegrees,
    fontSize,
    letterSpacing,
    isTopArc,
    minimumDrawableRadius,
    measureText,
  )
  const curvedLineLayout = layoutCurvedText({
    side: isTopArc ? 'top' : 'bottom',
    centerAngleDegrees: (isTopArc ? 270 : 90) + layout.x,
    arcDegrees: layout.arcDegrees,
    align: layout.align,
    blockWindowDegrees,
    lines: lines.map((line, index) => {
      const radius = getCurvedLineRadius(
        isTopArc,
        outerLineRadius,
        lineHeight,
        lines.length,
        index,
      )

      return {
        text: line,
        measuredWidth: getCurvedTextNaturalWidth(line, radius, fontSize, measureText),
        radius,
      }
    }),
  })
  const textAnchor = layout.align === 'left' ? 'start' : layout.align === 'right' ? 'end' : 'middle'
  const startOffset = layout.align === 'left' ? '0%' : layout.align === 'right' ? '100%' : '50%'

  return `
    <defs>
      ${curvedLineLayout.lines.map((lineLayout, index) => `
        <path id="copyright-path-${index}" d="${createSvgArcPath(
          50,
          50,
          lineLayout.radius,
          lineLayout.startAngleDegrees,
          lineLayout.endAngleDegrees,
          isTopArc ? 1 : 0,
          getLargeArcFlag(lineLayout.angleWidthDegrees),
        )}" />
      `).join('')}
    </defs>
    ${curvedLineLayout.lines.map((lineLayout, index) => `
      <text class="disc-export-text" dominant-baseline="middle" text-anchor="${textAnchor}" style="font-size:${fontSize}px; font-weight:650; letter-spacing:${letterSpacing}px;">
        <textPath href="#copyright-path-${index}" startOffset="${startOffset}" text-anchor="${textAnchor}">${escapeSvgText(lineLayout.text)}</textPath>
      </text>
    `).join('')}
  `
}

function buildDiscTextSvg(
  measureText: TextMeasureFunction,
  settings: DiscTextSettings,
  values: DiscTextValues,
  layoutSettings: DiscTextLayoutSettings,
  title: string,
  placement: SteamLogoPlacement,
  safeZoneRadiusPercent: number,
) {
  const textElements = DISC_TEXT_KEYS.map((key) => {
    if (!settings[key]) return ''

    const text = getDiscTextContent(key, values, title).trim()
    if (!text) return ''

    const layout = layoutSettings[key]

    if (key === 'copyright' && layout.mode === 'curved') {
      const curvedMeasureText = (line: string, fontSize: number) => measureText(line, `650 ${fontSize}px Arial`)
      return buildCurvedCopyrightSvgMarkup(text, placement, layout, safeZoneRadiusPercent, curvedMeasureText)
    }

    const straightTextLayout = getStraightDiscTextRenderLayout(key, text, layout, measureText)

    return straightTextLayout.lines.map((line) => `
      <text
        class="disc-export-text"
        dominant-baseline="middle"
        text-anchor="${straightTextLayout.textAnchor}"
        x="${line.x}"
        y="${line.y}"
        style="fill:${straightTextLayout.color}; font-family:${straightTextLayout.fontFamily}; font-size:${straightTextLayout.fontSize}px; font-weight:${straightTextLayout.fontWeight};"
      >${escapeSvgText(line.text)}</text>
    `).join('')
  }).join('')

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
      <defs>
        <filter id="disc-text-shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="0.31" stdDeviation="0.63" flood-color="rgba(0, 0, 0, 0.85)" />
          <feDropShadow dx="0" dy="0" stdDeviation="0.24" flood-color="rgba(0, 0, 0, 0.9)" />
        </filter>
      </defs>
      <style>
        .disc-export-text {
          filter: url(#disc-text-shadow);
          paint-order: stroke fill;
          stroke: rgba(0, 0, 0, 0.58);
          stroke-linejoin: round;
          stroke-width: 0.28px;
        }
      </style>
      ${textElements}
    </svg>
  `
}

export async function drawDiscTextElements(
  context: CanvasRenderingContext2D,
  discContentSize: number,
  discOrigin: number,
  settings: DiscTextSettings,
  values: DiscTextValues,
  layoutSettings: DiscTextLayoutSettings,
  title: string,
  placement: SteamLogoPlacement,
  safeZoneRadius: number,
) {
  const measureExportText: TextMeasureFunction = (text, font) => {
    const scaledFont = font.replace(/(\d+(?:\.\d+)?)px/g, (_, fontSize: string) => {
      return `${(Number(fontSize) / 100) * discContentSize}px`
    })
    context.font = scaledFont
    return (context.measureText(text).width / discContentSize) * 100
  }
  const safeZoneRadiusPercent = (safeZoneRadius / discContentSize) * 100
  const svg = buildDiscTextSvg(
    measureExportText,
    settings,
    values,
    layoutSettings,
    title,
    placement,
    safeZoneRadiusPercent,
  )
  const textLayerImage = await loadImage(createSvgDataUrl(svg))

  context.drawImage(textLayerImage, discOrigin, discOrigin, discContentSize, discContentSize)
}
