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
import {
  plainTextToRichTextDocument,
  transformRichTextDocument,
  type RichTextDocument,
} from '../text/htmlText.ts'
import {
  caseInsertExportPxToFontSizePt,
} from '../caseInsert/textSizing.ts'
import {
  clampReservedBoundsToVisualBounds,
} from './caseInsertTextBounds.ts'
import {
  getAvoidanceLineSegments,
  getLineSegmentAnchorX,
  getTextLayoutStartY,
  normalizeMaxLineCount,
  rectsOverlap,
} from './caseInsertTextSegments.ts'
import {
  wrapRichTextDocumentLines,
  wrapRichTextDocumentLinesBySegments,
} from './caseInsertTextRichWrapping.ts'
import {
  wrapCaseInsertTextLines,
  wrapCaseInsertTextLinesBySegments,
} from './caseInsertTextWrapping.ts'
import {
  FALLBACK_FONT_STACK,
  createFallbackInkMetrics,
  getCaseInsertTextFontString,
  getCaseInsertTextPaddingPx,
  getCaseInsertTextRunFontString,
  measureCaseInsertTextInkWithBrowserCanvas,
  measureCaseInsertTextWithBrowserCanvas,
  type CaseInsertTextInkMeasureFunction,
  type CaseInsertTextInkMetrics,
  type CaseInsertTextMeasureFunction,
} from './caseInsertTextMeasurement.ts'

export {
  getCanvasTextAlign,
  getCaseInsertTextFontString,
  getCaseInsertTextPaddingPx,
  measureCaseInsertTextInkWithBrowserCanvas,
  measureCaseInsertTextWithBrowserCanvas,
} from './caseInsertTextMeasurement.ts'
export {
  wrapCaseInsertTextLines,
} from './caseInsertTextWrapping.ts'
export type {
  CaseInsertTextInkMeasureFunction,
  CaseInsertTextInkMetrics,
  CaseInsertTextMeasureFunction,
} from './caseInsertTextMeasurement.ts'

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
  runs?: CaseInsertTextVisualRun[]
  x: number
  y: number
  width: number
}

export type CaseInsertTextVisualRun = {
  text: string
  bold?: boolean
  italic?: boolean
  underline?: boolean
  color?: string
  backgroundColor?: string
  fontFamily?: string
  fontSizePx?: number
  fontWeight?: number
  fontStyle?: 'normal' | 'italic'
  textDecoration?: 'none' | 'underline'
  left: number
  width: number
}

type CaseInsertTextInkBounds = {
  bottom: number
  left: number
  right: number
  top: number
}

export type CaseInsertTextVisualLayoutOptions = {
  align: ProjectCaseInsertTextAlign
  avoidanceRegions?: CaseInsertTextAvoidanceRegion[]
  boundsLimit?: JewelCasePixelRect
  fontFamily?: string
  fontSizePx: number
  fontStyle?: 'normal' | 'italic'
  fontWeight?: number
  lineHeightPx: number
  maxAvoidanceExtraLines?: number
  maxLines?: number
  measureText?: CaseInsertTextMeasureFunction
  measureTextInk?: CaseInsertTextInkMeasureFunction
  paddingRatio?: number
  paintSlackPx?: number
  richText?: RichTextDocument
  text: string
  uppercase?: boolean
  verticalAlign?: 'center' | 'top'
  clampVisualBounds?: boolean
}

const AVOIDANCE_WRAP_MAX_ATTEMPTS = 6
const DEFAULT_AVOIDANCE_EXTRA_LINES = 6

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

function getInkBoundsFromMetrics({
  lineHeightPx,
  lineTop,
  metrics,
  originX,
}: {
  lineHeightPx: number
  lineTop: number
  metrics: CaseInsertTextInkMetrics
  originX: number
}) {
  const left = originX - Math.max(0, metrics.actualBoundingBoxLeft)
  const right = originX + Math.max(metrics.width, metrics.actualBoundingBoxRight)
  const top = Math.min(
    lineTop,
    lineTop - Math.max(0, metrics.actualBoundingBoxAscent),
  )
  const bottom = Math.max(
    lineTop + lineHeightPx,
    lineTop + Math.max(0, metrics.actualBoundingBoxDescent),
  )

  return { bottom, left, right, top }
}

function createEmptyInkBounds(anchorX: number, lineTop: number, lineHeightPx: number) {
  return {
    bottom: lineTop + lineHeightPx,
    left: anchorX,
    right: anchorX + 1,
    top: lineTop,
  }
}

function unionInkBounds(
  current: CaseInsertTextInkBounds | null,
  next: CaseInsertTextInkBounds,
) {
  return current
    ? {
        bottom: Math.max(current.bottom, next.bottom),
        left: Math.min(current.left, next.left),
        right: Math.max(current.right, next.right),
        top: Math.min(current.top, next.top),
      }
    : next
}

export function textValueToCaseInsertRenderValue(
  value: string,
  uppercase = false,
) {
  return uppercase ? value.toLocaleUpperCase() : value
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

function wrapRichTextDocumentWithAvoidance({
  document,
  reservedBounds,
  padding,
  innerHeight,
  lineHeightPx,
  align,
  verticalAlign,
  maxLines,
  avoidanceRegions,
  options,
}: {
  document: RichTextDocument
  reservedBounds: JewelCasePixelRect
  padding: number
  innerHeight: number
  lineHeightPx: number
  align: ProjectCaseInsertTextAlign
  verticalAlign?: 'center' | 'top'
  maxLines: number
  avoidanceRegions: CaseInsertTextAvoidanceRegion[]
  options: {
    baseFontStyle: 'normal' | 'italic'
    baseFontWeight: number
    fontFamily: string
    fontSizePx: number
    measureText: CaseInsertTextMeasureFunction
  }
}) {
  let lines = wrapRichTextDocumentLines(
    document,
    Math.max(1, reservedBounds.width - padding * 2),
    maxLines,
    options,
  )
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
    const horizontalBounds = getLineHorizontalBounds(anchorX, align, line.width)

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
    const nextLines = wrapRichTextDocumentLinesBySegments(
      document,
      lineSegments,
      maxLines,
      options,
    )

    if (nextLines.map((line) => line.text).join('\n') ===
      lines.map((line) => line.text).join('\n')) {
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
  const measureTextInk = options.measureTextInk ??
    (options.measureText
      ? (text: string, runFont: string) =>
          createFallbackInkMetrics(
            text,
            runFont,
            measureText(text, runFont),
            false,
          )
      : measureCaseInsertTextInkWithBrowserCanvas)
  const fontWeight = options.fontWeight ?? 600
  const fontFamily = options.fontFamily ?? FALLBACK_FONT_STACK
  const fontStyle = options.fontStyle ?? 'normal'
  const font = getCaseInsertTextFontString(
    fontWeight,
    options.fontSizePx,
    fontFamily,
    fontStyle,
  )
  const padding = getCaseInsertTextPaddingPx(
    options.fontSizePx,
    options.paddingRatio,
  )
  const innerWidth = Math.max(1, reservedBounds.width - padding * 2)
  const innerHeight = Math.max(1, reservedBounds.height - padding * 2)
  const sourceDocument = options.richText ??
    plainTextToRichTextDocument(options.text)
  const renderedDocument = options.uppercase
    ? transformRichTextDocument(
        sourceDocument,
        (text) => text.toLocaleUpperCase(),
      )
    : sourceDocument
  const renderedText = renderedDocument.plainText
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
  const richOptions = {
    baseFontStyle: fontStyle,
    baseFontWeight: fontWeight,
    baseFontSizePt: caseInsertExportPxToFontSizePt(options.fontSizePx),
    fontFamily,
    fontSizePx: options.fontSizePx,
    measureText,
  }
  const richAvoidanceResult = options.richText && avoidanceRegions.length > 0
    ? wrapRichTextDocumentWithAvoidance({
        document: renderedDocument,
        reservedBounds,
        padding,
        innerHeight,
        lineHeightPx: options.lineHeightPx,
        align: options.align,
        verticalAlign: options.verticalAlign,
        maxLines: maxLineCount,
        avoidanceRegions,
        options: richOptions,
      })
    : null
  const avoidanceResult = !options.richText && avoidanceRegions.length > 0
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
  const richLines = richAvoidanceResult?.lines ??
    (options.richText
      ? wrapRichTextDocumentLines(
          renderedDocument,
          innerWidth,
          maxLineCount,
          richOptions,
        )
      : null)
  const lines = richLines?.map((line) => line.text) ??
    avoidanceResult?.lines ??
    wrapCaseInsertTextLines(
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
  const inkBoundsState: { value: CaseInsertTextInkBounds | null } = {
    value: null,
  }
  const visualLines = visibleLines.map((line, index) => {
    const richLine = richLines?.[index]
    const lineWidth = richLine
      ? richLine.width
      : Math.max(0, measureText(line, font))
    const lineSegment =
      richAvoidanceResult?.lineSegments[index] ??
      avoidanceResult?.lineSegments[index]
    const lineX = lineSegment
      ? getLineSegmentAnchorX(lineSegment, options.align)
      : anchorX
    const lineY = lineSegment?.y ?? startY + index * options.lineHeightPx
    const horizontalBounds = getLineHorizontalBounds(
      lineX,
      options.align,
      lineWidth,
    )
    const logicalLineStart = horizontalBounds.left
    let lineInkBounds = richLine
      ? null
      : getInkBoundsFromMetrics({
          lineHeightPx: options.lineHeightPx,
          lineTop: lineY,
          metrics: measureTextInk(line, font),
          originX: logicalLineStart,
        })

    left = Math.min(left, horizontalBounds.left)
    right = Math.max(right, horizontalBounds.right)

    const runStart = horizontalBounds.left
    let runLeft = runStart
    const runs = richLine?.runs.map((run) => {
      const visualRun = {
        text: run.text,
        bold: run.bold,
        italic: run.italic,
        underline: run.underline,
        color: run.color,
        backgroundColor: run.backgroundColor,
        fontFamily: run.fontFamily,
        fontSizePt: run.fontSizePt,
        fontSizePx: run.fontSizePx,
        fontWeight: run.fontWeight,
        fontStyle: run.fontStyle,
        textDecoration: run.textDecoration,
        left: runLeft,
        width: run.width,
      }

      lineInkBounds = unionInkBounds(
        lineInkBounds,
        getInkBoundsFromMetrics({
          lineHeightPx: options.lineHeightPx,
          lineTop: lineY,
          metrics: measureTextInk(
            run.text,
            getCaseInsertTextRunFontString({
              baseFontStyle: fontStyle,
              baseFontWeight: fontWeight,
              baseFontSizePt: caseInsertExportPxToFontSizePt(options.fontSizePx),
              fontFamily,
              fontSizePx: options.fontSizePx,
              run,
            }),
          ),
          originX: runLeft,
        }),
      )
      runLeft += run.width
      return visualRun
    })

    inkBoundsState.value = unionInkBounds(
      inkBoundsState.value,
      lineInkBounds ?? createEmptyInkBounds(
        logicalLineStart,
        lineY,
        options.lineHeightPx,
      ),
    )

    return {
      text: line,
      left: horizontalBounds.left,
      right: horizontalBounds.right,
      ...(runs ? { runs } : {}),
      x: lineX,
      y: lineY,
      width: lineWidth,
    }
  })

  if (!Number.isFinite(left) || !Number.isFinite(right)) {
    left = anchorX
    right = anchorX
  }

  const inkBounds = inkBoundsState.value
  const contentBounds = {
    x: inkBounds?.left ?? left,
    y: inkBounds?.top ?? startY,
    width: Math.max(1, (inkBounds?.right ?? right) - (inkBounds?.left ?? left)),
    height: Math.max(
      1,
      (inkBounds?.bottom ?? startY + contentHeight) - (inkBounds?.top ?? startY),
    ),
  }
  const boundsLimit = options.boundsLimit ?? reservedBounds
  const visualSlack = padding + Math.max(0, options.paintSlackPx ?? 0)
  const rawVisualLeft = contentBounds.x - visualSlack
  const rawVisualTop = contentBounds.y - visualSlack
  const rawVisualRight = contentBounds.x + contentBounds.width + visualSlack
  const rawVisualBottom = contentBounds.y + contentBounds.height + visualSlack
  const visualLeft = options.clampVisualBounds === false
    ? rawVisualLeft
    : Math.max(boundsLimit.x, rawVisualLeft)
  const visualTop = options.clampVisualBounds === false
    ? rawVisualTop
    : Math.max(boundsLimit.y, rawVisualTop)
  const visualRight = options.clampVisualBounds === false
    ? rawVisualRight
    : Math.min(boundsLimit.x + boundsLimit.width, rawVisualRight)
  const visualBottom = options.clampVisualBounds === false
    ? rawVisualBottom
    : Math.min(boundsLimit.y + boundsLimit.height, rawVisualBottom)
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

export function clampCaseInsertTextVisualLayoutToBounds(
  reservedBounds: JewelCasePixelRect,
  boundsLimit: JewelCasePixelRect,
  options: CaseInsertTextVisualLayoutOptions,
): {
  reservedBounds: JewelCasePixelRect
  visualLayout: CaseInsertTextVisualLayout
} {
  const initialLayout = getCaseInsertTextVisualLayout(
    reservedBounds,
    {
      ...options,
      boundsLimit,
      clampVisualBounds: false,
    },
  )
  const clampedReservedBounds = clampReservedBoundsToVisualBounds({
    boundsLimit,
    reservedBounds,
    visualBounds: initialLayout.bounds,
  })

  return {
    reservedBounds: clampedReservedBounds,
    visualLayout: getCaseInsertTextVisualLayout(
      clampedReservedBounds,
      {
        ...options,
        boundsLimit,
        clampVisualBounds: true,
      },
    ),
  }
}
