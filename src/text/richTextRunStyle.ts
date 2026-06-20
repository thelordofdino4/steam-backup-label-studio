import type { RichTextRun } from './htmlText.ts'
import {
  RICH_TEXT_BOLD_FONT_WEIGHT,
} from './richTextWeights.ts'

export type RichTextRunFontStyle = 'normal' | 'italic'

export type RichTextRunStyleContext = {
  baseColor?: string
  baseFontFamily?: string
  baseFontSizePt?: number
  baseFontSizePx: number
  baseFontStyle?: RichTextRunFontStyle
  baseFontWeight?: number
  fallbackColor?: string
  pointToPx?: (pointSizePt: number) => number
}

export type ResolvedRichTextRunFont = {
  fontFamily?: string
  fontSizePx: number
  fontStyle: RichTextRunFontStyle
  fontWeight: number
}

export type ResolvedRichTextRunCanvasStyle = ResolvedRichTextRunFont & {
  backgroundColor?: string
  color: string
  underline: boolean
}

export type RichTextRunDomStyle = {
  backgroundColor?: string
  color?: string
  fontFamily?: string
  fontSize?: string
  fontStyle?: RichTextRunFontStyle
  fontWeight?: number
  textDecorationLine?: 'none' | 'underline'
}

const DEFAULT_FONT_STYLE: RichTextRunFontStyle = 'normal'
const DEFAULT_FONT_WEIGHT = 600
const DEFAULT_FALLBACK_COLOR = '#f8fafc'

export function getRenderableRichTextRuns<T extends RichTextRun>(runs?: T[]) {
  return runs?.filter((run) => run.text) ?? []
}

export function richTextRunHasVisualStyle(run: RichTextRun) {
  return Boolean(
    run.bold ||
    run.italic ||
    run.underline ||
    run.color ||
    run.backgroundColor ||
    run.fontFamily ||
    run.fontSizePt ||
    run.fontSizePx ||
    run.fontWeight ||
    run.fontStyle ||
    run.textDecoration,
  )
}

export function richTextRunsHaveVisualStyles(runs: RichTextRun[]) {
  return runs.some(richTextRunHasVisualStyle)
}

export function getRichTextRunFontWeight(
  run: RichTextRun,
  baseFontWeight = DEFAULT_FONT_WEIGHT,
) {
  return run.fontWeight ??
    (run.bold ? RICH_TEXT_BOLD_FONT_WEIGHT : baseFontWeight)
}

export function getRichTextRunFontStyle(
  run: RichTextRun,
  baseFontStyle: RichTextRunFontStyle = DEFAULT_FONT_STYLE,
) {
  return run.fontStyle ?? (run.italic ? 'italic' : baseFontStyle)
}

export function getRichTextRunTextDecorationLine(run: RichTextRun) {
  if (run.textDecoration === 'underline' || run.underline) {
    return 'underline'
  }

  return run.textDecoration
}

export function getRichTextRunResolvedFont(
  run: RichTextRun,
  context: RichTextRunStyleContext,
): ResolvedRichTextRunFont {
  const fontSizePx = typeof run.fontSizePt === 'number'
    ? context.pointToPx?.(run.fontSizePt) ??
      (context.baseFontSizePt
        ? context.baseFontSizePx * run.fontSizePt / context.baseFontSizePt
        : context.baseFontSizePx)
    : run.fontSizePx ?? context.baseFontSizePx

  return {
    fontFamily: run.fontFamily ?? context.baseFontFamily,
    fontSizePx,
    fontStyle: getRichTextRunFontStyle(run, context.baseFontStyle),
    fontWeight: getRichTextRunFontWeight(run, context.baseFontWeight),
  }
}

export function getRichTextRunCanvasStyle(
  run: RichTextRun,
  context: RichTextRunStyleContext,
): ResolvedRichTextRunCanvasStyle {
  return {
    ...getRichTextRunResolvedFont(run, context),
    backgroundColor: run.backgroundColor,
    color: run.color ?? context.baseColor ?? context.fallbackColor ??
      DEFAULT_FALLBACK_COLOR,
    underline: run.underline || run.textDecoration === 'underline',
  }
}

export function getRichTextRunDomStyle(
  run: RichTextRun,
  baseFontSizePx: number,
  baseFontSizePt?: number,
): RichTextRunDomStyle {
  const fontSize = typeof run.fontSizePt === 'number' && baseFontSizePt
    ? `${run.fontSizePt / baseFontSizePt}em`
    : run.fontSizePx
      ? `${run.fontSizePx / baseFontSizePx}em`
      : undefined

  return {
    backgroundColor: run.backgroundColor,
    color: run.color,
    fontFamily: run.fontFamily,
    fontSize,
    fontStyle: run.fontStyle ?? (run.italic ? 'italic' : undefined),
    fontWeight: run.fontWeight ??
      (run.bold ? RICH_TEXT_BOLD_FONT_WEIGHT : undefined),
    textDecorationLine: getRichTextRunTextDecorationLine(run),
  }
}
