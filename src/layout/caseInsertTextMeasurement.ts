import type {
  ProjectCaseInsertTextAlign,
} from '../project/projectTypes.ts'
import type {
  RichTextRun,
} from '../text/htmlText.ts'
import {
  getRichTextRunResolvedFont,
} from '../text/richTextRunStyle.ts'
import {
  caseInsertFontSizePtToExportPx,
} from '../caseInsert/textSizing.ts'

export type CaseInsertTextMeasureFunction = (
  text: string,
  font: string,
) => number

export type CaseInsertTextInkMetrics = {
  actualBoundingBoxAscent: number
  actualBoundingBoxDescent: number
  actualBoundingBoxLeft: number
  actualBoundingBoxRight: number
  width: number
}

export type CaseInsertTextInkMeasureFunction = (
  text: string,
  font: string,
) => CaseInsertTextInkMetrics

export type CaseInsertTextRunFontOptions = {
  baseFontStyle: 'normal' | 'italic'
  baseFontWeight: number
  baseFontSizePt?: number
  fontFamily: string
  fontSizePx: number
  run: RichTextRun
}

export type CaseInsertRichTextMeasureOptions = {
  baseFontStyle: 'normal' | 'italic'
  baseFontWeight: number
  baseFontSizePt?: number
  fontFamily: string
  fontSizePx: number
  measureText: CaseInsertTextMeasureFunction
}

export const FALLBACK_FONT_STACK = '"Segoe UI", Arial, sans-serif'

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

function getFontSizeFromCanvasFont(font: string) {
  const fontSizeMatch = font.match(/(\d+(?:\.\d+)?)px/)

  return fontSizeMatch ? Number(fontSizeMatch[1]) : 1
}

export function createFallbackInkMetrics(
  text: string,
  font: string,
  width: number,
  includeOverhang = true,
): CaseInsertTextInkMetrics {
  const fontSize = getFontSizeFromCanvasFont(font)
  const horizontalOverhang = includeOverhang ? fontSize * 0.08 : 0

  return {
    actualBoundingBoxAscent: 0,
    actualBoundingBoxDescent: Math.max(1, fontSize),
    actualBoundingBoxLeft: text ? horizontalOverhang : 0,
    actualBoundingBoxRight: width + (text ? horizontalOverhang : 0),
    width,
  }
}

function normalizeInkMetrics(
  metrics: TextMetrics,
  text: string,
  font: string,
): CaseInsertTextInkMetrics {
  const fallback = createFallbackInkMetrics(text, font, metrics.width)
  const actualBoundingBoxLeft = Number.isFinite(metrics.actualBoundingBoxLeft)
    ? Math.max(0, metrics.actualBoundingBoxLeft)
    : fallback.actualBoundingBoxLeft
  const actualBoundingBoxRight = Number.isFinite(metrics.actualBoundingBoxRight)
    ? Math.max(metrics.width, metrics.actualBoundingBoxRight)
    : fallback.actualBoundingBoxRight
  const actualBoundingBoxAscent = Number.isFinite(metrics.actualBoundingBoxAscent)
    ? metrics.actualBoundingBoxAscent
    : fallback.actualBoundingBoxAscent
  const actualBoundingBoxDescent = Number.isFinite(metrics.actualBoundingBoxDescent)
    ? metrics.actualBoundingBoxDescent
    : fallback.actualBoundingBoxDescent

  return {
    actualBoundingBoxAscent,
    actualBoundingBoxDescent,
    actualBoundingBoxLeft,
    actualBoundingBoxRight,
    width: metrics.width,
  }
}

export const measureCaseInsertTextInkWithBrowserCanvas:
CaseInsertTextInkMeasureFunction = (text, font) => {
  const context = getCaseInsertTextMeasureContext()

  if (!context) {
    return createFallbackInkMetrics(
      text,
      font,
      measureCaseInsertTextWithBrowserCanvas(text, font),
    )
  }

  context.font = font
  context.textAlign = 'left'
  context.textBaseline = 'top'

  return normalizeInkMetrics(context.measureText(text), text, font)
}

export function getCanvasTextAlign(
  align: ProjectCaseInsertTextAlign,
): CanvasTextAlign {
  if (align === 'right') return 'right'
  if (align === 'center') return 'center'

  return 'left'
}

export function getCaseInsertTextFontString(
  fontWeight: number,
  fontSizePx: number,
  fontFamily = FALLBACK_FONT_STACK,
  fontStyle = 'normal',
) {
  const fontStylePrefix = fontStyle === 'italic' ? 'italic ' : ''

  return `${fontStylePrefix}${fontWeight} ${fontSizePx}px ${fontFamily}`
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

export function getCaseInsertTextRunFontString({
  baseFontStyle,
  baseFontWeight,
  fontFamily,
  baseFontSizePt,
  fontSizePx,
  run,
}: CaseInsertTextRunFontOptions) {
  const resolvedFont = getRichTextRunResolvedFont(run, {
    baseFontFamily: fontFamily,
    baseFontSizePt,
    baseFontSizePx: fontSizePx,
    baseFontStyle,
    baseFontWeight,
    pointToPx: caseInsertFontSizePtToExportPx,
  })

  return getCaseInsertTextFontString(
    resolvedFont.fontWeight,
    resolvedFont.fontSizePx,
    resolvedFont.fontFamily,
    resolvedFont.fontStyle,
  )
}

export function measureRichTextRun(
  run: RichTextRun,
  options: CaseInsertRichTextMeasureOptions,
) {
  return options.measureText(
    run.text,
    getCaseInsertTextRunFontString({
      baseFontStyle: options.baseFontStyle,
      baseFontWeight: options.baseFontWeight,
      baseFontSizePt: options.baseFontSizePt,
      fontFamily: options.fontFamily,
      fontSizePx: options.fontSizePx,
      run,
    }),
  )
}
