import {
  CASE_INSERT_TEXT_STROKE_COLOR,
  caseInsertTextUsesShadow,
  caseInsertTextUsesStroke,
  getCaseInsertTextBackgroundColor,
  getCaseInsertTextBorderColor,
  getCaseInsertTextLayoutPaddingRatio,
} from '../caseInsert/textRenderStyles'
import {
  getCaseInsertTextDecoration,
  getCaseInsertTextEffectiveFontWeight,
  getCaseInsertTextFontFamilyCanvas,
  getCaseInsertTextFontStyle,
  type CaseInsertTextStyle,
} from '../caseInsert/textStyles'
import {
  caseInsertExportPxToFontSizePt,
  caseInsertFontSizePtToExportPx,
} from '../caseInsert/textSizing'
import {
  getCanvasTextAlign,
} from '../layout/caseInsertTextVisualLayout'
import type { JewelCasePixelRect } from '../layout/jewelCaseLayout'
import type {
  ProjectCaseInsertTextAlign,
} from '../project/projectTypes'
import {
  getRenderableRichTextRuns,
  getRichTextRunCanvasStyle,
  richTextRunsHaveVisualStyles,
  type RichTextRunStyleContext,
} from '../text/richTextRunStyle'

const FONT_STACK = '"Segoe UI", Arial, sans-serif'

export function getCaseInsertTextCanvasOptions(style: CaseInsertTextStyle) {
  return {
    color: style.color,
    fontFamily: getCaseInsertTextFontFamilyCanvas(style.fontFamily),
    background: style.backgroundEnabled
      ? getCaseInsertTextBackgroundColor(style)
      : undefined,
    border: style.backgroundEnabled && style.borderEnabled
      ? getCaseInsertTextBorderColor(style)
      : undefined,
    fontStyle: getCaseInsertTextFontStyle(style),
    shadow: caseInsertTextUsesShadow(style),
    stroke: caseInsertTextUsesStroke(style),
    underline: getCaseInsertTextDecoration(style) === 'underline',
    paddingRatio: getCaseInsertTextLayoutPaddingRatio(style),
  }
}

export function drawComputedTextLayout(
  context: CanvasRenderingContext2D,
  textLayout: {
    bounds: JewelCasePixelRect
    fontSizePx: number
    lineHeightPx: number
    lines: Array<{
      text: string
      runs?: Array<{
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
      }>
      width: number
      x: number
      y: number
    }>
  },
  options: {
    align: ProjectCaseInsertTextAlign
    weight?: number
    color?: string
    fontFamily?: string
    fontStyle?: string
    background?: string
    border?: string
    shadow?: boolean
    stroke?: boolean
    underline?: boolean
  },
) {
  context.save()
  const richTextRunStyleContext: RichTextRunStyleContext = {
    baseColor: options.color,
    baseFontFamily: options.fontFamily,
    baseFontSizePt: caseInsertExportPxToFontSizePt(textLayout.fontSizePx),
    baseFontSizePx: textLayout.fontSizePx,
    baseFontStyle: options.fontStyle === 'italic' ? 'italic' : 'normal',
    baseFontWeight: options.weight,
    pointToPx: caseInsertFontSizePtToExportPx,
  }
  const baseFont = getCaseInsertTextCanvasFont({
    fontFamily: options.fontFamily,
    fontSizePx: textLayout.fontSizePx,
    fontStyle: options.fontStyle,
    weight: options.weight,
  })

  context.font = baseFont
  context.textAlign = getCanvasTextAlign(options.align)
  context.textBaseline = 'top'

  if (options.background) {
    context.fillStyle = options.background
    context.fillRect(
      textLayout.bounds.x,
      textLayout.bounds.y,
      textLayout.bounds.width,
      textLayout.bounds.height,
    )
  }

  if (options.border) {
    context.strokeStyle = options.border
    context.lineWidth = Math.max(1, Math.round(textLayout.fontSizePx * 0.08))
    context.strokeRect(
      textLayout.bounds.x,
      textLayout.bounds.y,
      textLayout.bounds.width,
      textLayout.bounds.height,
    )
  }

  context.fillStyle = options.color ?? '#f8fafc'

  if (options.shadow) {
    context.shadowColor = 'rgba(0, 0, 0, 0.8)'
    context.shadowBlur = Math.max(3, textLayout.fontSizePx * 0.18)
    context.shadowOffsetY = Math.max(1, textLayout.fontSizePx * 0.04)
  }

  textLayout.lines.forEach((line) => {
    const runs = getRenderableRichTextRuns(line.runs)
    const hasStyledRuns = richTextRunsHaveVisualStyles(runs)

    if (hasStyledRuns) {
      for (const run of runs) {
        const runStyle = getRichTextRunCanvasStyle(
          run,
          richTextRunStyleContext,
        )
        if (!runStyle.backgroundColor) continue

        context.save()
        context.fillStyle = runStyle.backgroundColor
        context.fillRect(
          run.left,
          line.y,
          run.width,
          textLayout.lineHeightPx,
        )
        context.restore()
      }
    }

    if (options.stroke) {
      context.save()
      context.shadowColor = 'transparent'
      context.strokeStyle = CASE_INSERT_TEXT_STROKE_COLOR
      context.lineJoin = 'round'
      context.lineWidth = Math.max(1, textLayout.fontSizePx * 0.08)
      if (hasStyledRuns) {
        context.textAlign = 'left'
        for (const run of runs) {
          const runStyle = getRichTextRunCanvasStyle(
            run,
            richTextRunStyleContext,
          )
          context.font = getCaseInsertTextCanvasFont({
            fontFamily: runStyle.fontFamily,
            fontSizePx: runStyle.fontSizePx,
            fontStyle: runStyle.fontStyle,
            weight: runStyle.fontWeight,
          })
          context.strokeText(run.text, run.left, line.y)
        }
      } else {
        context.font = baseFont
        context.textAlign = getCanvasTextAlign(options.align)
        context.strokeText(line.text, line.x, line.y)
      }
      context.restore()
    }

    if (hasStyledRuns) {
      context.textAlign = 'left'
      for (const run of runs) {
        const runStyle = getRichTextRunCanvasStyle(
          run,
          richTextRunStyleContext,
        )
        context.font = getCaseInsertTextCanvasFont({
          fontFamily: runStyle.fontFamily,
          fontSizePx: runStyle.fontSizePx,
          fontStyle: runStyle.fontStyle,
          weight: runStyle.fontWeight,
        })
        context.fillStyle = runStyle.color
        context.fillText(run.text, run.left, line.y)
        if (runStyle.underline) {
          const underlineY = line.y + runStyle.fontSizePx * 0.92

          context.save()
          context.strokeStyle = runStyle.color
          context.lineWidth = Math.max(
            1,
            runStyle.fontSizePx * 0.06,
          )
          context.beginPath()
          context.moveTo(run.left, underlineY)
          context.lineTo(run.left + run.width, underlineY)
          context.stroke()
          context.restore()
        }
      }
      context.fillStyle = options.color ?? '#f8fafc'
    } else {
      context.font = baseFont
      context.textAlign = getCanvasTextAlign(options.align)
      context.fillText(line.text, line.x, line.y)
    }

    if (options.underline) {
      const underlineY = line.y + textLayout.fontSizePx * 0.92
      const underlineStartX = options.align === 'right'
        ? line.x - line.width
        : options.align === 'center'
          ? line.x - line.width / 2
          : line.x
      const underlineEndX = options.align === 'right'
        ? line.x
        : options.align === 'center'
          ? line.x + line.width / 2
          : line.x + line.width

      context.save()
      context.strokeStyle = options.color ?? '#f8fafc'
      context.lineWidth = Math.max(1, textLayout.fontSizePx * 0.06)
      context.beginPath()
      context.moveTo(underlineStartX, underlineY)
      context.lineTo(underlineEndX, underlineY)
      context.stroke()
      context.restore()
    }
  })
  context.restore()
}

function getCaseInsertTextCanvasFont({
  fontFamily,
  fontSizePx,
  fontStyle,
  weight,
}: {
  fontFamily?: string
  fontSizePx: number
  fontStyle?: string
  weight?: number
}) {
  const fontStylePrefix = fontStyle === 'italic' ? 'italic ' : ''

  return `${fontStylePrefix}${weight ?? 600} ${fontSizePx}px ${
    fontFamily ?? FONT_STACK
  }`
}

export { getCaseInsertTextEffectiveFontWeight }
