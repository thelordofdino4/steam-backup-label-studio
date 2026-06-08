import type {
  ProjectCaseInsertTextAlign,
} from '../project/projectTypes.ts'
import type {
  JewelCasePixelRect,
} from './jewelCaseLayout.ts'
import {
  getCaseInsertTextAvoidanceGap,
  inflateCaseInsertTextAvoidanceRect,
  type CaseInsertTextAvoidanceRegion,
} from './caseInsertTextAvoidance.ts'

export type CaseInsertTextMeasureFunction = (
  text: string,
  font: string,
) => number

export type CaseInsertTextVisualLayout = {
  bounds: JewelCasePixelRect
  contentBounds: JewelCasePixelRect
  font: string
  lines: CaseInsertTextVisualLine[]
  padding: number
}

export type CaseInsertTextVisualLine = {
  text: string
  left: number
  right: number
  x: number
  y: number
  width: number
}

export type CaseInsertTextVisualLayoutOptions = {
  align: ProjectCaseInsertTextAlign
  avoidanceRegions?: CaseInsertTextAvoidanceRegion[]
  boundsLimit?: JewelCasePixelRect
  fontFamily?: string
  fontSizePx: number
  fontWeight?: number
  lineHeightPx: number
  maxAvoidanceExtraLines?: number
  maxLines?: number
  measureText?: CaseInsertTextMeasureFunction
  paddingRatio?: number
  text: string
  uppercase?: boolean
  verticalAlign?: 'center' | 'top'
}

const FALLBACK_FONT_STACK = '"Segoe UI", Arial, sans-serif'
const AVOIDANCE_WRAP_MAX_ATTEMPTS = 6
const DEFAULT_AVOIDANCE_EXTRA_LINES = 6

let caseInsertTextMeasureContext: CanvasRenderingContext2D | null = null

function getCaseInsertTextMeasureContext() {
  if (caseInsertTextMeasureContext) return caseInsertTextMeasureContext
  if (typeof document === 'undefined') return null

  caseInsertTextMeasureContext = document.createElement('canvas').getContext('2d')
  return caseInsertTextMeasureContext
}

export const measureCaseInsertTextWithBrowserCanvas:
CaseInsertTextMeasureFunction = (text, font) => {
  const context = getCaseInsertTextMeasureContext()

  if (!context) {
    const fontSizeMatch = font.match(/(\d+(?:\.\d+)?)px/)
    const fontSize = fontSizeMatch ? Number(fontSizeMatch[1]) : 1
    return Array.from(text).length * fontSize * 0.58
  }

  context.font = font
  return context.measureText(text).width
}

function getCanvasTextAlign(align: ProjectCaseInsertTextAlign): CanvasTextAlign {
  if (align === 'right') return 'right'
  if (align === 'center') return 'center'

  return 'left'
}

function getTextAlignX(
  rect: JewelCasePixelRect,
  align: ProjectCaseInsertTextAlign,
  padding: number,
) {
  if (align === 'right') return rect.x + rect.width - padding
  if (align === 'center') return rect.x + rect.width / 2

  return rect.x + padding
}

function getLineHorizontalBounds(
  anchorX: number,
  align: ProjectCaseInsertTextAlign,
  width: number,
) {
  if (align === 'right') {
    return {
      left: anchorX - width,
      right: anchorX,
    }
  }

  if (align === 'center') {
    return {
      left: anchorX - width / 2,
      right: anchorX + width / 2,
    }
  }

  return {
    left: anchorX,
    right: anchorX + width,
  }
}

function doVerticalRangesOverlap(
  top: number,
  bottom: number,
  region: JewelCasePixelRect,
) {
  return bottom >= region.y && top <= region.y + region.height
}

function rectsOverlap(
  a: JewelCasePixelRect,
  b: JewelCasePixelRect,
) {
  return a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
}

function splitLongTokenByMeasuredWidth(
  token: string,
  maxWidth: number,
  font: string,
  measureText: CaseInsertTextMeasureFunction,
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

function wrapLine(
  line: string,
  maxWidth: number,
  font: string,
  measureText: CaseInsertTextMeasureFunction,
) {
  const words = line.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let currentLine = ''

  for (const word of words) {
    const wordParts = measureText(word, font) > maxWidth
      ? splitLongTokenByMeasuredWidth(word, maxWidth, font, measureText)
      : [word]

    for (const wordPart of wordParts) {
      const candidate = currentLine ? `${currentLine} ${wordPart}` : wordPart

      if (
        currentLine &&
        measureText(candidate, font) > maxWidth
      ) {
        lines.push(currentLine)
        currentLine = wordPart
      } else {
        currentLine = candidate
      }
    }
  }

  if (currentLine) {
    lines.push(currentLine)
  }

  return lines.length > 0 ? lines : ['']
}

export function wrapCaseInsertTextLines(
  text: string,
  maxWidth: number,
  font: string,
  measureText: CaseInsertTextMeasureFunction = measureCaseInsertTextWithBrowserCanvas,
) {
  return text
    .replace(/\r\n/g, '\n')
    .split('\n')
    .flatMap((line) => wrapLine(line, maxWidth, font, measureText))
}

export function textValueToCaseInsertRenderValue(
  value: string,
  uppercase = false,
) {
  return uppercase ? value.toLocaleUpperCase() : value
}

export function getCaseInsertTextFontString(
  fontWeight: number,
  fontSizePx: number,
  fontFamily = FALLBACK_FONT_STACK,
) {
  return `${fontWeight} ${fontSizePx}px ${fontFamily}`
}

export function getCaseInsertTextPaddingPx(
  fontSizePx: number,
  paddingRatio = 0.55,
) {
  if (paddingRatio <= 0) return 0

  return Math.max(
    2,
    Math.round(fontSizePx * paddingRatio),
  )
}

type CaseInsertTextLineSegment = {
  left: number
  right: number
  y: number
}

function subtractRegionFromSegments(
  segments: Array<Omit<CaseInsertTextLineSegment, 'y'>>,
  region: JewelCasePixelRect,
) {
  return segments.flatMap((segment) => {
    const regionRight = region.x + region.width

    if (regionRight <= segment.left || region.x >= segment.right) {
      return [segment]
    }

    return [
      { left: segment.left, right: Math.min(region.x, segment.right) },
      { left: Math.max(regionRight, segment.left), right: segment.right },
    ].filter((candidate) => candidate.right - candidate.left > 1)
  })
}

function getPreferredSegment(
  segments: Array<Omit<CaseInsertTextLineSegment, 'y'>>,
  align: ProjectCaseInsertTextAlign,
  baseSegment: Omit<CaseInsertTextLineSegment, 'y'>,
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

function getTextLayoutStartY({
  reservedBounds,
  padding,
  innerHeight,
  lineCount,
  lineHeightPx,
  verticalAlign,
}: {
  reservedBounds: JewelCasePixelRect
  padding: number
  innerHeight: number
  lineCount: number
  lineHeightPx: number
  verticalAlign?: 'center' | 'top'
}) {
  const contentHeight = Math.max(1, lineCount) * lineHeightPx

  if (verticalAlign === 'top') {
    return reservedBounds.y + padding
  }

  if (contentHeight > innerHeight) {
    return reservedBounds.y + reservedBounds.height / 2 - contentHeight / 2
  }

  return reservedBounds.y + padding + Math.max(
    0,
    (innerHeight - contentHeight) / 2,
  )
}

function normalizeMaxLineCount(value: number | undefined) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : null
}

function getAvoidanceLineSegments({
  reservedBounds,
  padding,
  innerHeight,
  lineCount,
  lineHeightPx,
  align,
  verticalAlign,
  avoidanceRegions,
}: {
  reservedBounds: JewelCasePixelRect
  padding: number
  innerHeight: number
  lineCount: number
  lineHeightPx: number
  align: ProjectCaseInsertTextAlign
  verticalAlign?: 'center' | 'top'
  avoidanceRegions: CaseInsertTextAvoidanceRegion[]
}): CaseInsertTextLineSegment[] {
  const marginPx = getCaseInsertTextAvoidanceGap(reservedBounds)
  const blockers = avoidanceRegions.map((region) =>
    inflateCaseInsertTextAvoidanceRect(region.bounds, marginPx))
  const baseSegment = {
    left: reservedBounds.x + padding,
    right: reservedBounds.x + reservedBounds.width - padding,
  }
  const startY = getTextLayoutStartY({
    reservedBounds,
    padding,
    innerHeight,
    lineCount,
    lineHeightPx,
    verticalAlign,
  })

  return Array.from({ length: Math.max(1, lineCount) }, (_, index) => {
    const y = startY + index * lineHeightPx
    const overlappingRegions = blockers.filter((region) =>
      doVerticalRangesOverlap(y, y + lineHeightPx, region))
    const availableSegments = overlappingRegions.reduce(
      (segments, region) => subtractRegionFromSegments(segments, region),
      [baseSegment],
    )
    const preferredSegment = getPreferredSegment(
      availableSegments,
      align,
      baseSegment,
    )

    return {
      ...preferredSegment,
      y,
    }
  })
}

function getLineSegmentAnchorX(
  segment: CaseInsertTextLineSegment,
  align: ProjectCaseInsertTextAlign,
) {
  if (align === 'left') return segment.left
  if (align === 'right') return segment.right

  return (segment.left + segment.right) / 2
}

function splitLongTokenByLineSegments(
  token: string,
  lineSegments: CaseInsertTextLineSegment[],
  currentLineIndex: number,
  font: string,
  measureText: CaseInsertTextMeasureFunction,
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

function appendWrappedSourceLineBySegments({
  sourceLine,
  lines,
  lineSegments,
  font,
  maxLines,
  measureText,
}: {
  sourceLine: string
  lines: string[]
  lineSegments: CaseInsertTextLineSegment[]
  font: string
  maxLines: number
  measureText: CaseInsertTextMeasureFunction
}) {
  const tokens = sourceLine.split(/\s+/).filter(Boolean)
  let currentLine = ''

  if (tokens.length === 0) {
    if (lines.length < maxLines) lines.push('')
    return
  }

  for (const token of tokens) {
    const currentSegment = lineSegments[
      Math.min(lines.length, lineSegments.length - 1)
    ]
    const currentMaxWidth = currentSegment
      ? currentSegment.right - currentSegment.left
      : 1
    const tokenParts = measureText(token, font) > currentMaxWidth
      ? splitLongTokenByLineSegments(
          token,
          lineSegments,
          lines.length,
          font,
          measureText,
        )
      : [token]

    for (const tokenPart of tokenParts) {
      const lineSegment = lineSegments[
        Math.min(lines.length, lineSegments.length - 1)
      ]
      const maxWidth = lineSegment ? lineSegment.right - lineSegment.left : 1
      const candidate = currentLine
        ? `${currentLine} ${tokenPart}`
        : tokenPart

      if (measureText(candidate, font) <= maxWidth || !currentLine) {
        currentLine = candidate
        continue
      }

      lines.push(currentLine)
      currentLine = tokenPart

      if (lines.length >= maxLines) {
        return
      }
    }
  }

  if (currentLine && lines.length < maxLines) {
    lines.push(currentLine)
  }
}

function wrapCaseInsertTextLinesBySegments(
  text: string,
  lineSegments: CaseInsertTextLineSegment[],
  font: string,
  maxLines: number,
  measureText: CaseInsertTextMeasureFunction,
) {
  const lines: string[] = []

  for (const sourceLine of text.replace(/\r\n/g, '\n').split('\n')) {
    appendWrappedSourceLineBySegments({
      sourceLine,
      lines,
      lineSegments,
      font,
      maxLines,
      measureText,
    })

    if (lines.length >= maxLines) break
  }

  return lines.length > 0 ? lines : ['']
}

function wrapCaseInsertTextLinesWithAvoidance({
  text,
  reservedBounds,
  padding,
  innerHeight,
  lineHeightPx,
  align,
  verticalAlign,
  font,
  maxLines,
  measureText,
  avoidanceRegions,
}: {
  text: string
  reservedBounds: JewelCasePixelRect
  padding: number
  innerHeight: number
  lineHeightPx: number
  align: ProjectCaseInsertTextAlign
  verticalAlign?: 'center' | 'top'
  font: string
  maxLines: number
  measureText: CaseInsertTextMeasureFunction
  avoidanceRegions: CaseInsertTextAvoidanceRegion[]
}) {
  let lines = wrapCaseInsertTextLines(
    text,
    Math.max(1, reservedBounds.width - padding * 2),
    font,
    measureText,
  ).slice(0, maxLines)
  const initialLineCount = lines.length
  const baseLineSegments = getAvoidanceLineSegments({
    reservedBounds,
    padding,
    innerHeight,
    lineCount: Math.max(1, lines.length),
    lineHeightPx,
    align,
    verticalAlign,
    avoidanceRegions: [],
  })
  const initialLineRects = lines.map((line, index) => {
    const segment = baseLineSegments[index] ??
      baseLineSegments[baseLineSegments.length - 1]
    const anchorX = segment
      ? getLineSegmentAnchorX(segment, align)
      : getTextAlignX(reservedBounds, align, padding)
    const lineWidth = Math.max(0, measureText(line, font))
    const horizontalBounds = getLineHorizontalBounds(
      anchorX,
      align,
      lineWidth,
    )

    return {
      x: horizontalBounds.left,
      y: segment?.y ?? reservedBounds.y + padding,
      width: Math.max(1, horizontalBounds.right - horizontalBounds.left),
      height: lineHeightPx,
    }
  })
  const marginPx = getCaseInsertTextAvoidanceGap(reservedBounds)
  const relevantAvoidanceRegions = avoidanceRegions.filter((region) => {
    const inflatedBounds = inflateCaseInsertTextAvoidanceRect(
      region.bounds,
      marginPx,
    )

    return initialLineRects.some((lineRect) =>
      rectsOverlap(lineRect, inflatedBounds))
  })

  if (relevantAvoidanceRegions.length === 0) {
    return {
      lineSegments: baseLineSegments,
      lines,
    }
  }

  for (let attempt = 0; attempt < AVOIDANCE_WRAP_MAX_ATTEMPTS; attempt += 1) {
    const lineSegments = getAvoidanceLineSegments({
      reservedBounds,
      padding,
      innerHeight,
      lineCount: Math.max(1, lines.length),
      lineHeightPx,
      align,
      verticalAlign,
      avoidanceRegions: relevantAvoidanceRegions,
    })
    const nextLines = wrapCaseInsertTextLinesBySegments(
      text,
      lineSegments,
      font,
      maxLines,
      measureText,
    )

    if (nextLines.join('\n') === lines.join('\n')) {
      return {
        lineSegments,
        lines,
      }
    }

    if (nextLines.length < lines.length && lines.length > initialLineCount) {
      return {
        lineSegments,
        lines,
      }
    }

    lines = nextLines
  }

  return {
    lineSegments: getAvoidanceLineSegments({
      reservedBounds,
      padding,
      innerHeight,
      lineCount: Math.max(1, lines.length),
      lineHeightPx,
      align,
      verticalAlign,
      avoidanceRegions: relevantAvoidanceRegions,
    }),
    lines,
  }
}

export function getCaseInsertTextVisualLayout(
  reservedBounds: JewelCasePixelRect,
  options: CaseInsertTextVisualLayoutOptions,
): CaseInsertTextVisualLayout {
  const measureText = options.measureText ?? measureCaseInsertTextWithBrowserCanvas
  const fontWeight = options.fontWeight ?? 600
  const font = getCaseInsertTextFontString(
    fontWeight,
    options.fontSizePx,
    options.fontFamily,
  )
  const padding = getCaseInsertTextPaddingPx(
    options.fontSizePx,
    options.paddingRatio,
  )
  const innerWidth = Math.max(1, reservedBounds.width - padding * 2)
  const innerHeight = Math.max(1, reservedBounds.height - padding * 2)
  const renderedText = textValueToCaseInsertRenderValue(
    options.text,
    options.uppercase,
  )
  const baseMaxLineCount = Math.max(
    1,
    Math.floor(innerHeight / options.lineHeightPx),
  )
  const styleMaxLineCount = normalizeMaxLineCount(options.maxLines)
  const baseLineBudget = styleMaxLineCount
    ? Math.max(baseMaxLineCount, styleMaxLineCount)
    : baseMaxLineCount
  const avoidanceRegions = options.avoidanceRegions ?? []
  const maxLineCount = baseLineBudget + (
    avoidanceRegions.length > 0
      ? options.maxAvoidanceExtraLines ?? DEFAULT_AVOIDANCE_EXTRA_LINES
      : 0
  )
  const avoidanceResult = avoidanceRegions.length > 0
    ? wrapCaseInsertTextLinesWithAvoidance({
        text: renderedText,
        reservedBounds,
        padding,
        innerHeight,
        lineHeightPx: options.lineHeightPx,
        align: options.align,
        verticalAlign: options.verticalAlign,
        font,
        maxLines: maxLineCount,
        measureText,
        avoidanceRegions,
      })
    : null
  const lines = avoidanceResult?.lines ?? wrapCaseInsertTextLines(
    renderedText,
    innerWidth,
    font,
    measureText,
  )
  const visibleLines = lines.slice(0, maxLineCount)
  const contentHeight = visibleLines.length * options.lineHeightPx
  const startY = getTextLayoutStartY({
    reservedBounds,
    padding,
    innerHeight,
    lineCount: visibleLines.length,
    lineHeightPx: options.lineHeightPx,
    verticalAlign: options.verticalAlign,
  })
  const anchorX = getTextAlignX(reservedBounds, options.align, padding)
  let left = Number.POSITIVE_INFINITY
  let right = Number.NEGATIVE_INFINITY
  const visualLines = visibleLines.map((line, index) => {
    const lineWidth = Math.max(0, measureText(line, font))
    const lineSegment = avoidanceResult?.lineSegments[index]
    const lineX = lineSegment
      ? getLineSegmentAnchorX(lineSegment, options.align)
      : anchorX
    const lineY = lineSegment?.y ?? startY + index * options.lineHeightPx
    const horizontalBounds = getLineHorizontalBounds(
      lineX,
      options.align,
      lineWidth,
    )

    left = Math.min(left, horizontalBounds.left)
    right = Math.max(right, horizontalBounds.right)

    return {
      text: line,
      left: horizontalBounds.left,
      right: horizontalBounds.right,
      x: lineX,
      y: lineY,
      width: lineWidth,
    }
  })

  if (!Number.isFinite(left) || !Number.isFinite(right)) {
    left = anchorX
    right = anchorX
  }

  const contentBounds = {
    x: left,
    y: startY,
    width: Math.max(1, right - left),
    height: Math.max(1, contentHeight),
  }
  const boundsLimit = options.boundsLimit ?? reservedBounds
  const visualLeft = Math.max(
    boundsLimit.x,
    contentBounds.x - padding,
  )
  const visualTop = Math.max(
    boundsLimit.y,
    contentBounds.y - padding,
  )
  const visualRight = Math.min(
    boundsLimit.x + boundsLimit.width,
    contentBounds.x + contentBounds.width + padding,
  )
  const visualBottom = Math.min(
    boundsLimit.y + boundsLimit.height,
    contentBounds.y + contentBounds.height + padding,
  )
  const visualBounds = {
    x: visualLeft,
    y: visualTop,
    width: Math.max(1, visualRight - visualLeft),
    height: Math.max(1, visualBottom - visualTop),
  }

  return {
    bounds: visualBounds,
    contentBounds,
    font,
    lines: visualLines,
    padding,
  }
}

export { getCanvasTextAlign }
