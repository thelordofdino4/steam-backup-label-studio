import type { RichTextRun } from './htmlText.ts'
import {
  RICH_TEXT_BOLD_FONT_WEIGHT,
} from './richTextWeights.ts'

export type RichTextRunFontStyle = 'normal' | 'italic'

export type RichTextRunStyleContext = {
  baseColor?: string
  baseFontFamily?: string
  baseFontSizePx: number
  baseFontStyle?: RichTextRunFontStyle
  baseFontWeight?: number
  fallbackColor?: string
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
  return {
    fontFamily: run.fontFamily ?? context.baseFontFamily,
    fontSizePx: run.fontSizePx ?? context.baseFontSizePx,
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
): RichTextRunDomStyle {
  return {
    backgroundColor: run.backgroundColor,
    color: run.color,
    fontFamily: run.fontFamily,
    fontSize: run.fontSizePx
      ? `${run.fontSizePx / baseFontSizePx}em`
      : undefined,
    fontStyle: run.fontStyle ?? (run.italic ? 'italic' : undefined),
    fontWeight: run.fontWeight ??
      (run.bold ? RICH_TEXT_BOLD_FONT_WEIGHT : undefined),
    textDecorationLine: getRichTextRunTextDecorationLine(run),
  }
}
