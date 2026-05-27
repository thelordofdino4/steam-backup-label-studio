import type { DiscTextAlignment, DiscTextKey, DiscTextLayout } from './discText'
import { DISC_TEXT_RENDER_STYLES } from './discTextStyles'

export type TextMeasureFunction = (text: string, font: string) => number

export type StraightDiscTextLineLayout = {
  text: string
  x: number
  y: number
}

export type StraightDiscTextRenderLayout = {
  align: DiscTextAlignment
  color: string
  fontFamily: string
  fontSize: number
  fontWeight: number
  lineHeight: number
  maxWidth: number
  textAnchor: 'start' | 'middle' | 'end'
  lines: StraightDiscTextLineLayout[]
}

export function getDiscTextFontString(fontWeight: number, fontSize: number) {
  return `${fontWeight} ${fontSize}px Arial`
}

function splitLongTokenByMeasuredWidth(
  token: string,
  maxWidth: number,
  font: string,
  measureText: TextMeasureFunction,
) {
  const chunks: string[] = []
  let currentChunk = ''

  for (const character of Array.from(token)) {
    const testChunk = `${currentChunk}${character}`

    if (measureText(testChunk, font) <= maxWidth || !currentChunk) {
      currentChunk = testChunk
      continue
    }

    chunks.push(currentChunk)
    currentChunk = character
  }

  if (currentChunk) chunks.push(currentChunk)
  return chunks
}

export function wrapMeasuredTextLines(
  text: string,
  maxWidth: number,
  font: string,
  maxLines: number,
  measureText: TextMeasureFunction,
) {
  const tokens = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let currentLine = ''

  for (const token of tokens) {
    const tokenParts = measureText(token, font) > maxWidth
      ? splitLongTokenByMeasuredWidth(token, maxWidth, font, measureText)
      : [token]

    for (const part of tokenParts) {
      const testLine = currentLine ? `${currentLine} ${part}` : part

      if (measureText(testLine, font) <= maxWidth || !currentLine) {
        currentLine = testLine
        continue
      }

      lines.push(currentLine)
      currentLine = part

      if (lines.length >= maxLines) {
        return lines
      }
    }
  }

  if (currentLine && lines.length < maxLines) lines.push(currentLine)
  return lines
}

function getTextAnchor(align: DiscTextAlignment): StraightDiscTextRenderLayout['textAnchor'] {
  if (align === 'left') return 'start'
  if (align === 'right') return 'end'
  return 'middle'
}

function getAnchorX(layout: DiscTextLayout) {
  const centerX = 50 + layout.x

  if (layout.align === 'left') return centerX - layout.width / 2
  if (layout.align === 'right') return centerX + layout.width / 2
  return centerX
}

export function getStraightDiscTextRenderLayout(
  key: DiscTextKey,
  text: string,
  layout: DiscTextLayout,
  measureText: TextMeasureFunction,
): StraightDiscTextRenderLayout {
  const renderStyle = DISC_TEXT_RENDER_STYLES[key]
  const fontSize = renderStyle.fontSizePercent * layout.scale
  const lineHeight = fontSize * 1.18
  const font = getDiscTextFontString(renderStyle.fontWeight, fontSize)
  const lines = wrapMeasuredTextLines(
    text,
    layout.width,
    font,
    renderStyle.maxLines,
    measureText,
  )
  const firstLineY = layout.y - ((lines.length - 1) * lineHeight) / 2
  const x = getAnchorX(layout)

  return {
    align: layout.align,
    color: renderStyle.color,
    fontFamily: 'Arial, sans-serif',
    fontSize,
    fontWeight: renderStyle.fontWeight,
    lineHeight,
    maxWidth: layout.width,
    textAnchor: getTextAnchor(layout.align),
    lines: lines.map((line, index) => ({
      text: line,
      x,
      y: firstLineY + index * lineHeight,
    })),
  }
}
