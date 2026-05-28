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

export type StraightDiscTextVisualBounds = {
  centerX: number
  centerY: number
  halfWidth: number
  halfHeight: number
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

function getLineHorizontalBounds(
  line: StraightDiscTextLineLayout,
  textAnchor: StraightDiscTextRenderLayout['textAnchor'],
  lineWidth: number,
) {
  if (textAnchor === 'start') {
    return {
      left: line.x,
      right: line.x + lineWidth,
    }
  }

  if (textAnchor === 'end') {
    return {
      left: line.x - lineWidth,
      right: line.x,
    }
  }

  return {
    left: line.x - lineWidth / 2,
    right: line.x + lineWidth / 2,
  }
}

export function getStraightDiscTextVisualBounds(
  layout: StraightDiscTextRenderLayout,
  measureText: TextMeasureFunction,
): StraightDiscTextVisualBounds {
  if (layout.lines.length === 0) {
    return {
      centerX: 50,
      centerY: 50,
      halfWidth: 0,
      halfHeight: 0,
    }
  }

  const font = getDiscTextFontString(layout.fontWeight, layout.fontSize)
  let left = Number.POSITIVE_INFINITY
  let right = Number.NEGATIVE_INFINITY
  let top = Number.POSITIVE_INFINITY
  let bottom = Number.NEGATIVE_INFINITY

  for (const line of layout.lines) {
    const lineWidth = Math.max(0, measureText(line.text, font))
    const horizontalBounds = getLineHorizontalBounds(
      line,
      layout.textAnchor,
      lineWidth,
    )

    left = Math.min(left, horizontalBounds.left)
    right = Math.max(right, horizontalBounds.right)
    top = Math.min(top, line.y - layout.lineHeight / 2)
    bottom = Math.max(bottom, line.y + layout.lineHeight / 2)
  }

  return {
    centerX: (left + right) / 2,
    centerY: (top + bottom) / 2,
    halfWidth: (right - left) / 2,
    halfHeight: (bottom - top) / 2,
  }
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
