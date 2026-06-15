import type { DiscTextAlignment, DiscTextKey, DiscTextLayout } from './types'
import type { DiscTextAvoidanceRegion } from './avoidance.ts'
import {
  getResolvedDiscTextRenderStyle,
  type DiscTextStyleInput,
} from './styles.ts'

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
  font: string
  fontSize: number
  fontWeight: number
  lineHeight: number
  maxWidth: number
  style: ReturnType<typeof getResolvedDiscTextRenderStyle>
  textAnchor: 'start' | 'middle' | 'end'
  lines: StraightDiscTextLineLayout[]
}

export type StraightDiscTextRenderOptions = {
  avoidanceRegions?: DiscTextAvoidanceRegion[]
}

type DiscTextLineSegment = {
  left: number
  right: number
  y: number
}

export type StraightDiscTextVisualBounds = {
  centerX: number
  centerY: number
  halfWidth: number
  halfHeight: number
}

export function getDiscTextFontString(
  fontWeight: number,
  fontSize: number,
  fontFamily = 'Arial, sans-serif',
) {
  return `${fontWeight} ${fontSize}px ${fontFamily}`
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

function splitLineIntoMeasuredTokens(line: string) {
  return line.match(/\s+|\S+/g) ?? []
}

function getLineBeforeWrappedToken(currentLine: string, nextTokenPart: string) {
  if (!/\S/.test(nextTokenPart)) return currentLine

  const withoutTrailingWhitespace = currentLine.replace(/\s+$/, '')
  return withoutTrailingWhitespace || currentLine
}

function getLineAfterWrappedTokenPart(tokenPart: string) {
  return /^\s+$/.test(tokenPart) ? '' : tokenPart
}

function appendTokenPartToLine(currentLine: string, tokenPart: string) {
  return `${currentLine}${tokenPart}`
}

export function wrapMeasuredTextLines(
  text: string,
  maxWidth: number,
  font: string,
  maxLines: number,
  measureText: TextMeasureFunction,
) {
  const lines: string[] = []

  if (text.length === 0) {
    return lines
  }

  for (const sourceLine of text.replace(/\r\n/g, '\n').split('\n')) {
    appendWrappedMeasuredTextSourceLine({
      sourceLine,
      lines,
      maxWidth,
      font,
      maxLines,
      measureText,
    })

    if (lines.length >= maxLines) {
      break
    }
  }

  return lines
}

function appendWrappedMeasuredTextSourceLine({
  sourceLine,
  lines,
  maxWidth,
  font,
  maxLines,
  measureText,
}: {
  sourceLine: string
  lines: string[]
  maxWidth: number
  font: string
  maxLines: number
  measureText: TextMeasureFunction
}) {
  const tokens = splitLineIntoMeasuredTokens(sourceLine)
  let currentLine = ''

  if (tokens.length === 0) {
    if (lines.length < maxLines) {
      lines.push('')
    }

    return
  }

  for (const token of tokens) {
    const tokenParts = measureText(token, font) > maxWidth
      ? splitLongTokenByMeasuredWidth(token, maxWidth, font, measureText)
      : [token]

    for (const part of tokenParts) {
      const testLine = appendTokenPartToLine(currentLine, part)

      if (measureText(testLine, font) <= maxWidth || !currentLine) {
        currentLine = testLine
        continue
      }

      lines.push(getLineBeforeWrappedToken(currentLine, part))
      currentLine = getLineAfterWrappedTokenPart(part)

      if (lines.length >= maxLines) {
        return
      }
    }
  }

  if (currentLine && lines.length < maxLines) lines.push(currentLine)
}

function getBaseTextSegment(layout: DiscTextLayout) {
  const centerX = 50 + layout.x
  const halfWidth = layout.width / 2

  return {
    left: centerX - halfWidth,
    right: centerX + halfWidth,
  }
}

function doVerticalRangesOverlap(
  top: number,
  bottom: number,
  region: DiscTextAvoidanceRegion,
) {
  return bottom >= region.top && top <= region.bottom
}

function subtractRegionFromSegments(
  segments: Array<Omit<DiscTextLineSegment, 'y'>>,
  region: DiscTextAvoidanceRegion,
) {
  return segments.flatMap((segment) => {
    if (region.right <= segment.left || region.left >= segment.right) {
      return [segment]
    }

    return [
      { left: segment.left, right: Math.min(region.left, segment.right) },
      { left: Math.max(region.right, segment.left), right: segment.right },
    ].filter((candidate) => candidate.right - candidate.left > 1)
  })
}

function getPreferredSegment(
  segments: Array<Omit<DiscTextLineSegment, 'y'>>,
  align: DiscTextAlignment,
  baseSegment: Omit<DiscTextLineSegment, 'y'>,
) {
  if (segments.length === 0) {
    return baseSegment
  }

  if (align === 'left') {
    return segments[0] ?? baseSegment
  }

  if (align === 'right') {
    return segments[segments.length - 1] ?? baseSegment
  }

  const centerX = (baseSegment.left + baseSegment.right) / 2
  const containingCenter = segments.find(
    (segment) => segment.left <= centerX && segment.right >= centerX,
  )

  if (containingCenter) {
    return containingCenter
  }

  return segments.reduce((bestSegment, segment) => {
    const bestWidth = bestSegment.right - bestSegment.left
    const segmentWidth = segment.right - segment.left

    if (segmentWidth !== bestWidth) {
      return segmentWidth > bestWidth ? segment : bestSegment
    }

    const bestCenter = (bestSegment.left + bestSegment.right) / 2
    const segmentCenter = (segment.left + segment.right) / 2

    return Math.abs(segmentCenter - centerX) < Math.abs(bestCenter - centerX)
      ? segment
      : bestSegment
  }, segments[0] ?? baseSegment)
}

function getAvoidanceLineSegments(
  layout: DiscTextLayout,
  lineCount: number,
  lineHeight: number,
  regions: DiscTextAvoidanceRegion[],
): DiscTextLineSegment[] {
  const baseSegment = getBaseTextSegment(layout)
  const firstLineY = layout.y - ((lineCount - 1) * lineHeight) / 2

  return Array.from({ length: Math.max(1, lineCount) }, (_, index) => {
    const y = firstLineY + index * lineHeight
    const top = y - lineHeight / 2
    const bottom = y + lineHeight / 2
    const overlappingRegions = regions.filter((region) =>
      doVerticalRangesOverlap(top, bottom, region),
    )
    const availableSegments = overlappingRegions.reduce(
      (segments, region) => subtractRegionFromSegments(segments, region),
      [baseSegment],
    )
    const preferredSegment = getPreferredSegment(
      availableSegments,
      layout.align,
      baseSegment,
    )

    return {
      ...preferredSegment,
      y,
    }
  })
}

function splitLongTokenByLineSegments(
  token: string,
  lineSegments: DiscTextLineSegment[],
  currentLineIndex: number,
  font: string,
  measureText: TextMeasureFunction,
) {
  const chunks: string[] = []
  let currentChunk = ''
  let lineIndex = currentLineIndex

  for (const character of Array.from(token)) {
    const segment = lineSegments[Math.min(lineIndex, lineSegments.length - 1)]
    const maxWidth = segment ? segment.right - segment.left : 1
    const testChunk = `${currentChunk}${character}`

    if (measureText(testChunk, font) <= maxWidth || !currentChunk) {
      currentChunk = testChunk
      continue
    }

    chunks.push(currentChunk)
    currentChunk = character
    lineIndex += 1
  }

  if (currentChunk) chunks.push(currentChunk)
  return chunks
}

function wrapMeasuredTextLinesBySegments(
  text: string,
  lineSegments: DiscTextLineSegment[],
  font: string,
  maxLines: number,
  measureText: TextMeasureFunction,
) {
  const lines: string[] = []

  if (text.length === 0) {
    return lines
  }

  for (const sourceLine of text.replace(/\r\n/g, '\n').split('\n')) {
    appendWrappedMeasuredTextSourceLineBySegments({
      sourceLine,
      lines,
      lineSegments,
      font,
      maxLines,
      measureText,
    })

    if (lines.length >= maxLines) {
      break
    }
  }

  return lines
}

function appendWrappedMeasuredTextSourceLineBySegments({
  sourceLine,
  lines,
  lineSegments,
  font,
  maxLines,
  measureText,
}: {
  sourceLine: string
  lines: string[]
  lineSegments: DiscTextLineSegment[]
  font: string
  maxLines: number
  measureText: TextMeasureFunction
}) {
  const tokens = splitLineIntoMeasuredTokens(sourceLine)
  let currentLine = ''

  if (tokens.length === 0) {
    if (lines.length < maxLines) {
      lines.push('')
    }

    return
  }

  for (const token of tokens) {
    const currentSegment = lineSegments[Math.min(lines.length, lineSegments.length - 1)]
    const currentMaxWidth = currentSegment ? currentSegment.right - currentSegment.left : 1
    const tokenParts = measureText(token, font) > currentMaxWidth
      ? splitLongTokenByLineSegments(
          token,
          lineSegments,
          lines.length,
          font,
          measureText,
        )
      : [token]

    for (const part of tokenParts) {
      const lineSegment = lineSegments[Math.min(lines.length, lineSegments.length - 1)]
      const maxWidth = lineSegment ? lineSegment.right - lineSegment.left : 1
      const testLine = appendTokenPartToLine(currentLine, part)

      if (measureText(testLine, font) <= maxWidth || !currentLine) {
        currentLine = testLine
        continue
      }

      lines.push(getLineBeforeWrappedToken(currentLine, part))
      currentLine = getLineAfterWrappedTokenPart(part)

      if (lines.length >= maxLines) {
        return
      }
    }
  }

  if (currentLine && lines.length < maxLines) lines.push(currentLine)
}

function wrapMeasuredTextLinesWithAvoidance(
  text: string,
  layout: DiscTextLayout,
  lineHeight: number,
  font: string,
  maxLines: number,
  measureText: TextMeasureFunction,
  regions: DiscTextAvoidanceRegion[],
) {
  let lines = wrapMeasuredTextLines(text, layout.width, font, maxLines, measureText)

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const lineSegments = getAvoidanceLineSegments(
      layout,
      Math.max(1, lines.length),
      lineHeight,
      regions,
    )
    const nextLines = wrapMeasuredTextLinesBySegments(
      text,
      lineSegments,
      font,
      maxLines,
      measureText,
    )

    if (nextLines.join('\n') === lines.join('\n')) {
      return {
        lines,
        lineSegments,
      }
    }

    lines = nextLines
  }

  return {
    lines,
    lineSegments: getAvoidanceLineSegments(
      layout,
      Math.max(1, lines.length),
      lineHeight,
      regions,
    ),
  }
}

function getTextAnchor(align: DiscTextAlignment): StraightDiscTextRenderLayout['textAnchor'] {
  if (align === 'left') return 'start'
  if (align === 'right') return 'end'
  return 'middle'
}

function getAnchorX(layout: DiscTextLayout, firstLineWidth: number) {
  const centerX = 50 + layout.x

  if (layout.align === 'left') return centerX - firstLineWidth / 2
  if (layout.align === 'right') return centerX + firstLineWidth / 2
  return centerX
}

function getLineSegmentAnchorX(
  segment: DiscTextLineSegment,
  align: DiscTextAlignment,
) {
  if (align === 'left') return segment.left
  if (align === 'right') return segment.right
  return (segment.left + segment.right) / 2
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

  const font = layout.font
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
  styles?: DiscTextStyleInput,
  options: StraightDiscTextRenderOptions = {},
): StraightDiscTextRenderLayout {
  const renderStyle = getResolvedDiscTextRenderStyle(key, styles)
  const fontSize = renderStyle.fontSizePercent * layout.scale
  const lineHeight = fontSize * 1.18
  const font = getDiscTextFontString(
    renderStyle.fontWeight,
    fontSize,
    renderStyle.fontFamilyCanvas,
  )
  const avoidanceRegions = layout.avoidVisualElements
    ? options.avoidanceRegions ?? []
    : []
  const maxLines = Number.POSITIVE_INFINITY
  const avoidanceResult = avoidanceRegions.length > 0
    ? wrapMeasuredTextLinesWithAvoidance(
        text,
        layout,
        lineHeight,
        font,
        maxLines,
        measureText,
        avoidanceRegions,
      )
    : null
  const lines = avoidanceResult?.lines ?? wrapMeasuredTextLines(
    text,
    layout.width,
    font,
    maxLines,
    measureText,
  )
  const firstLineY = layout.y - ((lines.length - 1) * lineHeight) / 2
  const firstLineWidth = lines.length > 0 ? Math.max(0, measureText(lines[0], font)) : 0
  const x = getAnchorX(layout, firstLineWidth)
  const lineSegments = avoidanceResult?.lineSegments

  return {
    align: layout.align,
    color: renderStyle.color,
    fontFamily: renderStyle.fontFamilyCss,
    font,
    fontSize,
    fontWeight: renderStyle.fontWeight,
    lineHeight,
    maxWidth: layout.width,
    style: renderStyle,
    textAnchor: getTextAnchor(layout.align),
    lines: lines.map((line, index) => {
      const lineSegment = lineSegments?.[index]
      const segmentX = lineSegment
        ? getLineSegmentAnchorX(lineSegment, layout.align)
        : x

      return {
        text: line,
        x: segmentX,
        y: lineSegment?.y ?? firstLineY + index * lineHeight,
      }
    }),
  }
}
