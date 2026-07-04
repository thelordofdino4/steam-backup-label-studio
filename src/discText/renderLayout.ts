import type { DiscTextAlignment, DiscTextKey, DiscTextLayout } from './types'
import type { DiscTextAvoidanceRegion } from './avoidance.ts'
import {
  getDiscTextFontStyle,
  getResolvedDiscTextRenderStyle,
  type DiscTextStyleInput,
} from './styles.ts'
import {
  plainTextToRichTextDocument,
  type RichTextDocument,
} from '../text/htmlText.ts'
import type { DiscTemplate } from '../types/template.ts'
import {
  getResolvedDiscTextFontSizePercent,
} from './pointSize.ts'
import {
  getDiscTextFontString,
  getDiscTextRunFontString,
  wrapMeasuredTextLines,
  wrapMeasuredTextLinesBySegments,
  wrapRichTextDocumentLines,
  wrapRichTextDocumentLinesBySegments,
  type TextMeasureFunction,
} from './straightTextWrapping.ts'

export {
  getDiscTextFontString,
  getDiscTextRunFontString,
  wrapMeasuredTextLines,
}
export type { TextMeasureFunction } from './straightTextWrapping.ts'

export type StraightDiscTextLineLayout = {
  text: string
  runs?: StraightDiscTextRunLayout[]
  width: number
  x: number
  y: number
}

export type StraightDiscTextRunLayout = {
  text: string
  bold?: boolean
  italic?: boolean
  underline?: boolean
  color?: string
  backgroundColor?: string
  font: string
  fontFamily?: string
  fontSizePt?: number
  fontSizePx?: number
  fontWeight?: number
  fontStyle?: 'normal' | 'italic'
  textDecoration?: 'none' | 'underline'
  width: number
}

export type StraightDiscTextRenderLayout = {
  align: DiscTextAlignment
  color: string
  fontFamily: string
  font: string
  fontSize: number
  fontStyle: string
  fontWeight: number
  lineHeight: number
  maxWidth: number
  style: ReturnType<typeof getResolvedDiscTextRenderStyle>
  textAnchor: 'start' | 'middle' | 'end'
  lines: StraightDiscTextLineLayout[]
}

export type StraightDiscTextRenderOptions = {
  avoidanceRegions?: DiscTextAvoidanceRegion[]
  richText?: RichTextDocument
  template?: DiscTemplate
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

function wrapRichTextDocumentWithAvoidance(
  document: RichTextDocument,
  layout: DiscTextLayout,
  lineHeight: number,
  maxLines: number,
  regions: DiscTextAvoidanceRegion[],
  options: {
    baseFontStyle: string
    baseFontWeight: number
    fontFamily: string
    fontSize: number
    measureText: TextMeasureFunction
    template?: DiscTemplate
  },
) {
  let lines = wrapRichTextDocumentLines(
    document,
    layout.width,
    maxLines,
    options,
  )

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const lineSegments = getAvoidanceLineSegments(
      layout,
      Math.max(1, lines.length),
      lineHeight,
      regions,
    )
    const nextLines = wrapRichTextDocumentLinesBySegments(
      document,
      lineSegments,
      maxLines,
      options,
    )

    if (
      nextLines.map((line) => line.text).join('\n') ===
      lines.map((line) => line.text).join('\n')
    ) {
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

export function getStraightDiscTextLineVisualBounds(
  line: StraightDiscTextLineLayout,
  layout: StraightDiscTextRenderLayout,
  measureText: TextMeasureFunction,
) {
  const lineWidth = Math.max(0, line.width ?? measureText(line.text, layout.font))
  const horizontalBounds = getLineHorizontalBounds(
    line,
    layout.textAnchor,
    lineWidth,
  )

  return {
    bottom: line.y + layout.lineHeight / 2,
    left: horizontalBounds.left,
    right: horizontalBounds.right,
    top: line.y - layout.lineHeight / 2,
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

  let left = Number.POSITIVE_INFINITY
  let right = Number.NEGATIVE_INFINITY
  let top = Number.POSITIVE_INFINITY
  let bottom = Number.NEGATIVE_INFINITY

  for (const line of layout.lines) {
    const lineBounds = getStraightDiscTextLineVisualBounds(
      line,
      layout,
      measureText,
    )

    left = Math.min(left, lineBounds.left)
    right = Math.max(right, lineBounds.right)
    top = Math.min(top, lineBounds.top)
    bottom = Math.max(bottom, lineBounds.bottom)
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
  const fontSize = getResolvedDiscTextFontSizePercent(
    layout,
    key,
    options.template,
  )
  const lineHeight = fontSize * 1.18
  const font = getDiscTextFontString(
    renderStyle.fontWeight,
    fontSize,
    renderStyle.fontFamilyCanvas,
    getDiscTextFontStyle(renderStyle),
  )
  const avoidanceRegions = layout.avoidVisualElements
    ? options.avoidanceRegions ?? []
    : []
  const maxLines = Number.POSITIVE_INFINITY
  const sourceDocument = options.richText ??
    plainTextToRichTextDocument(text)
  const renderedDocument = sourceDocument
  const richOptions = {
    baseFontStyle: getDiscTextFontStyle(renderStyle),
    baseFontWeight: renderStyle.fontWeight,
    fontFamily: renderStyle.fontFamilyCanvas,
    fontSize,
    measureText,
    template: options.template,
  }
  const richAvoidanceResult = options.richText && avoidanceRegions.length > 0
    ? wrapRichTextDocumentWithAvoidance(
        renderedDocument,
        layout,
        lineHeight,
        maxLines,
        avoidanceRegions,
        richOptions,
      )
    : null
  const avoidanceResult = !options.richText && avoidanceRegions.length > 0
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
  const richLines = richAvoidanceResult?.lines ??
    (options.richText
      ? wrapRichTextDocumentLines(
          renderedDocument,
          layout.width,
          maxLines,
          richOptions,
        )
      : null)
  const plainLines = avoidanceResult?.lines ?? (
    richLines ? null : wrapMeasuredTextLines(
      text,
      layout.width,
      font,
      maxLines,
      measureText,
    )
  )
  const lines = richLines ?? plainLines ?? []
  const firstLineY = layout.y - ((lines.length - 1) * lineHeight) / 2
  const firstLineWidth = lines.length > 0
    ? typeof lines[0] === 'string'
      ? Math.max(0, measureText(lines[0], font))
      : lines[0].width
    : 0
  const x = getAnchorX(layout, firstLineWidth)
  const lineSegments = richAvoidanceResult?.lineSegments ??
    avoidanceResult?.lineSegments

  return {
    align: layout.align,
    color: renderStyle.color,
    fontFamily: renderStyle.fontFamilyCss,
    font,
    fontSize,
    fontStyle: getDiscTextFontStyle(renderStyle),
    fontWeight: renderStyle.fontWeight,
    lineHeight,
    maxWidth: layout.width,
    style: renderStyle,
    textAnchor: getTextAnchor(layout.align),
    lines: lines.map((line, index) => {
      const lineText = typeof line === 'string' ? line : line.text
      const lineWidth = typeof line === 'string'
        ? Math.max(0, measureText(line, font))
        : line.width
      const lineSegment = lineSegments?.[index]
      const segmentX = lineSegment
        ? getLineSegmentAnchorX(lineSegment, layout.align)
        : x
      const runs = typeof line === 'string'
        ? undefined
        : line.runs.map((run) => ({
            text: run.text,
            bold: run.bold,
            italic: run.italic,
            underline: run.underline,
            color: run.color,
            backgroundColor: run.backgroundColor,
            font: getDiscTextRunFontString({
              baseFontStyle: getDiscTextFontStyle(renderStyle),
              baseFontWeight: renderStyle.fontWeight,
              fontFamily: renderStyle.fontFamilyCanvas,
              fontSize,
              run,
              template: options.template,
            }),
            fontFamily: run.fontFamily,
            fontSizePt: run.fontSizePt,
            fontSizePx: run.fontSizePx,
            fontWeight: run.fontWeight,
            fontStyle: run.fontStyle,
            textDecoration: run.textDecoration,
            width: run.width,
          }))

      return {
        text: lineText,
        ...(runs ? { runs } : {}),
        width: lineWidth,
        x: segmentX,
        y: lineSegment?.y ?? firstLineY + index * lineHeight,
      }
    }),
  }
}
