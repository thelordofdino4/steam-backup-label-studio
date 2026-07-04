import { layoutCurvedText } from './curvedTextLayout.ts'
import {
  getDiscTextFontString,
  type TextMeasureFunction,
} from './renderLayout.ts'
import {
  getDiscTextFontStyle,
  type getResolvedDiscTextRenderStyle,
} from './styles.ts'
import { discTextPointSizeToSvgPercent } from './pointSize.ts'
import {
  mergeAdjacentRichTextRuns,
  type RichTextDocument,
  type RichTextRun,
} from '../text/htmlText.ts'
import { RICH_TEXT_BOLD_FONT_WEIGHT } from '../text/richTextWeights.ts'
import type { DiscTemplate } from '../types/template.ts'

const DISC_TEXT_CURVED_PATH_MIN_PAINT_PADDING = 1.2
const DISC_TEXT_CURVED_PATH_PAINT_PADDING_FACTOR = 2.2

type ResolvedDiscTextRenderStyle = ReturnType<typeof getResolvedDiscTextRenderStyle>

export type CurvedDiscTextRunLayout = RichTextRun & {
  width: number
}

export type CurvedDiscTextRichLine = {
  runs: CurvedDiscTextRunLayout[]
  text: string
  width: number
}

export type CurvedDiscTextBoundaryProgress = {
  offset: number
  progress: number
}

function getFallbackCurvedLineWidth(
  line: string,
  fontSize: number,
  letterSpacing: number,
) {
  const averageCharacterWidth = fontSize * 0.68
  const characterCount = Array.from(line).length

  return characterCount * averageCharacterWidth +
    Math.max(0, characterCount - 1) * letterSpacing
}

export function getCurvedLineWidth(
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

function getCurvedTextPathPaintPadding(fontSize: number, letterSpacing: number) {
  return Math.max(
    DISC_TEXT_CURVED_PATH_MIN_PAINT_PADDING,
    fontSize * DISC_TEXT_CURVED_PATH_PAINT_PADDING_FACTOR,
    Math.max(0, letterSpacing) * 6,
  )
}

function getCurvedTextUsableArcLength(
  maxArcLength: number,
  fontSize: number,
  letterSpacing: number,
) {
  return Math.max(
    1,
    maxArcLength - getCurvedTextPathPaintPadding(fontSize, letterSpacing),
  )
}

export function getCurvedLinePathWidth(
  line: string,
  font: string,
  fontSize: number,
  letterSpacing: number,
  measureText: TextMeasureFunction,
) {
  return getCurvedLineWidth(
    line,
    font,
    fontSize,
    letterSpacing,
    measureText,
  ) + getCurvedTextPathPaintPadding(fontSize, letterSpacing)
}

function getCurvedRichRunFontSize(
  run: RichTextRun,
  baseFontSize: number,
  template?: DiscTemplate,
) {
  return typeof run.fontSizePt === 'number'
    ? discTextPointSizeToSvgPercent(run.fontSizePt, template)
    : run.fontSizePx ?? baseFontSize
}

function getCurvedRichRunFontString({
  baseFontSize,
  renderStyle,
  run,
  template,
}: {
  baseFontSize: number
  renderStyle: ResolvedDiscTextRenderStyle
  run: RichTextRun
  template?: DiscTemplate
}) {
  return getDiscTextFontString(
    run.fontWeight ??
      (run.bold ? RICH_TEXT_BOLD_FONT_WEIGHT : renderStyle.fontWeight),
    getCurvedRichRunFontSize(run, baseFontSize, template),
    run.fontFamily ?? renderStyle.fontFamilyCanvas,
    run.fontStyle ?? (run.italic ? 'italic' : getDiscTextFontStyle(renderStyle)),
  )
}

function measureCurvedRichRun({
  baseFontSize,
  letterSpacing,
  measureText,
  renderStyle,
  run,
  template,
}: {
  baseFontSize: number
  letterSpacing: number
  measureText: TextMeasureFunction
  renderStyle: ResolvedDiscTextRenderStyle
  run: RichTextRun
  template?: DiscTemplate
}) {
  const font = getCurvedRichRunFontString({
    baseFontSize,
    renderStyle,
    run,
    template,
  })
  const characterCount = Array.from(run.text).length
  const measuredWidth = measureText(run.text, font)
  const fallbackWidth = getFallbackCurvedLineWidth(
    run.text,
    getCurvedRichRunFontSize(run, baseFontSize, template),
    letterSpacing,
  )

  return (Number.isFinite(measuredWidth) ? measuredWidth : fallbackWidth) +
    Math.max(0, characterCount - 1) * letterSpacing
}

function sliceRichRunsByRange(
  runs: readonly RichTextRun[],
  start: number,
  end: number,
) {
  const slicedRuns: RichTextRun[] = []
  let runStart = 0

  for (const run of runs) {
    const runEnd = runStart + run.text.length
    const sliceStart = Math.max(start, runStart)
    const sliceEnd = Math.min(end, runEnd)

    if (sliceStart < sliceEnd) {
      slicedRuns.push({
        ...run,
        text: run.text.slice(sliceStart - runStart, sliceEnd - runStart),
      })
    }

    runStart = runEnd
  }

  return mergeAdjacentRichTextRuns(slicedRuns)
}

export function getCurvedRichLines({
  baseFontSize,
  document,
  fallbackLines,
  letterSpacing,
  measureText,
  renderStyle,
  template,
}: {
  baseFontSize: number
  document?: RichTextDocument
  fallbackLines: readonly string[]
  letterSpacing: number
  measureText: TextMeasureFunction
  renderStyle: ResolvedDiscTextRenderStyle
  template?: DiscTemplate
}): CurvedDiscTextRichLine[] {
  const flatRuns = document
    ? document.lines.flatMap((line, index) => [
        ...(index > 0 ? [{ text: '\n' } satisfies RichTextRun] : []),
        ...line.runs,
      ])
    : []
  let cursor = 0

  return fallbackLines.map((line) => {
    const plainText = document?.plainText ?? ''
    const start = document
      ? Math.max(cursor, plainText.indexOf(line, cursor))
      : -1
    const end = start >= 0 ? start + line.length : -1
    cursor = end >= 0 ? end : cursor
    const sourceRuns = start >= 0 && end >= start
      ? sliceRichRunsByRange(flatRuns, start, end)
      : [{ text: line } satisfies RichTextRun]
    const runs = sourceRuns.map((run) => ({
      ...run,
      width: measureCurvedRichRun({
        baseFontSize,
        letterSpacing,
        measureText,
        renderStyle,
        run,
        template,
      }),
    }))
    const width = runs.reduce((total, run) => total + run.width, 0)

    return { runs, text: line, width }
  })
}

function getGraphemeSegments(text: string) {
  if (
    typeof Intl !== 'undefined' &&
    'Segmenter' in Intl
  ) {
    const SegmenterConstructor = Intl.Segmenter
    const segmenter = new SegmenterConstructor(undefined, {
      granularity: 'grapheme',
    })

    return Array.from(segmenter.segment(text), (segment) => ({
      end: segment.index + segment.segment.length,
      segment: segment.segment,
      start: segment.index,
    }))
  }

  const segments: { end: number; segment: string; start: number }[] = []
  let offset = 0

  for (const segment of Array.from(text)) {
    segments.push({
      end: offset + segment.length,
      segment,
      start: offset,
    })
    offset += segment.length
  }

  return segments
}

function measureCurvedTextWithoutLetterSpacing({
  font,
  fontSize,
  measureText,
  text,
}: {
  font: string
  fontSize: number
  measureText: TextMeasureFunction
  text: string
}) {
  const measuredWidth = measureText(text, font)

  if (Number.isFinite(measuredWidth)) {
    return measuredWidth
  }

  return Array.from(text).length * fontSize * 0.68
}

export function getCurvedRichLineBoundaryProgresses({
  baseFontSize,
  letterSpacing,
  line,
  linePathLength,
  measureText,
  renderStyle,
  template,
}: {
  baseFontSize: number
  letterSpacing: number
  line: CurvedDiscTextRichLine
  linePathLength: number
  measureText: TextMeasureFunction
  renderStyle: ResolvedDiscTextRenderStyle
  template?: DiscTemplate
}): readonly CurvedDiscTextBoundaryProgress[] {
  const totalSegments = getGraphemeSegments(line.text).length
  const pathLength = Math.max(1, linePathLength)
  const boundaries: CurvedDiscTextBoundaryProgress[] = [{
    offset: 0,
    progress: 0,
  }]
  let lineOffset = 0
  let measuredLinePrefix = 0
  let segmentIndex = 0

  for (const run of line.runs) {
    const runSegments = getGraphemeSegments(run.text)
    const fontSize = getCurvedRichRunFontSize(run, baseFontSize, template)
    const font = getCurvedRichRunFontString({
      baseFontSize,
      renderStyle,
      run,
      template,
    })

    for (let index = 0; index < runSegments.length; index += 1) {
      const segment = runSegments[index]
      const boundarySegmentIndex = segmentIndex + index + 1
      const boundaryOffset = lineOffset + segment.end
      const measuredRunPrefix = measureCurvedTextWithoutLetterSpacing({
        font,
        fontSize,
        measureText,
        text: run.text.slice(0, segment.end),
      })
      const letterSpacingWidth =
        Math.min(boundarySegmentIndex, Math.max(0, totalSegments - 1)) *
          letterSpacing
      const boundaryDistance =
        measuredLinePrefix + measuredRunPrefix + letterSpacingWidth

      boundaries.push({
        offset: boundaryOffset,
        progress: Math.min(1, Math.max(0, boundaryDistance / pathLength)),
      })
    }

    measuredLinePrefix += measureCurvedTextWithoutLetterSpacing({
      font,
      fontSize,
      measureText,
      text: run.text,
    })
    segmentIndex += runSegments.length
    lineOffset += run.text.length
  }

  const finalBoundary = boundaries[boundaries.length - 1]
  if (!finalBoundary || finalBoundary.offset < line.text.length) {
    boundaries.push({
      offset: line.text.length,
      progress: Math.min(1, Math.max(0, line.width / pathLength)),
    })
  }

  return boundaries
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
      getCurvedLineWidth(testChunk, font, fontSize, letterSpacing, measureText) <=
        maxArcLength ||
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
  const maxTextLength = getCurvedTextUsableArcLength(
    maxArcLength,
    fontSize,
    letterSpacing,
  )

  for (const token of tokens) {
    const tokenParts =
      getCurvedLineWidth(token, font, fontSize, letterSpacing, measureText) >
        maxTextLength
        ? splitLongTokenForCurvedText(
            token,
            maxTextLength,
            font,
            fontSize,
            letterSpacing,
            measureText,
          )
        : [token]

    for (const part of tokenParts) {
      const testLine = currentLine ? `${currentLine} ${part}` : part
      if (
        getCurvedLineWidth(testLine, font, fontSize, letterSpacing, measureText) <=
          maxTextLength ||
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

export function getCurvedLineRadius(
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

export function wrapCurvedTextBlock(
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
  const getCenteredLayout = () =>
    layoutCurvedText({
      side: isTopArc ? 'top' : 'bottom',
      centerAngleDegrees: 0,
      arcDegrees,
      align: 'center',
      lines: lines.map((line, index) => ({
        text: line,
        measuredWidth: getCurvedLinePathWidth(
          line,
          font,
          fontSize,
          letterSpacing,
          measureText,
        ),
        radius: getCurvedLineRadius(
          isTopArc,
          textRadius,
          lineStep,
          lines.length,
          index,
        ),
      })),
    })

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const centeredLayout = getCenteredLayout()
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

  const centeredLayout = getCenteredLayout()

  return {
    lines,
    blockWindowDegrees: centeredLayout.blockWindowDegrees,
  }
}
