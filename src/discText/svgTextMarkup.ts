import type { DiscTextAvoidanceRegion } from './avoidance.ts'
import type { DiscTextKey, DiscTextLayout } from './index.ts'
import {
  getStraightDiscTextRenderLayout,
  getStraightDiscTextVisualBounds,
  type StraightDiscTextRenderLayout,
  type StraightDiscTextRunLayout,
  type TextMeasureFunction,
} from './renderLayout.ts'
import {
  getDiscTextDecoration,
  getDiscTextFontStyle,
  getResolvedDiscTextRenderStyle,
  type DiscTextStyleInput,
} from './styles.ts'
import {
  DISC_TEXT_BOX_BORDER_WIDTH,
  DISC_TEXT_STRAIGHT_STROKE_COLOR,
  DISC_TEXT_STRAIGHT_STROKE_WIDTH,
  hasStraightDiscTextShadow,
  hasStraightDiscTextStroke,
} from './straightTextPaintGeometry.ts'
import { discTextPointSizeToSvgPercent } from './pointSize.ts'
import { DISC_TEXT_KEY_ATTRIBUTE } from '../editor/previewEditableRegistry.ts'
import type { RichTextDocument, RichTextRun } from '../text/htmlText.ts'
import { RICH_TEXT_BOLD_FONT_WEIGHT } from '../text/richTextWeights.ts'
import type { DiscTemplate } from '../types/template.ts'
import { escapeSvgAttribute, escapeSvgText } from '../utils/svg.ts'

export type ResolvedDiscTextRenderStyle =
  ReturnType<typeof getResolvedDiscTextRenderStyle>

export function hasDiscTextShadow(style: ResolvedDiscTextRenderStyle) {
  return hasStraightDiscTextShadow(style)
}

export function hasDiscTextStroke(style: ResolvedDiscTextRenderStyle) {
  return hasStraightDiscTextStroke(style)
}

export function formatSvgNumber(value: number) {
  return Number(value.toFixed(3))
}

export function buildTextStyleAttribute(
  style: ResolvedDiscTextRenderStyle,
  shadowFilterId: string,
  fontSize: number,
  fontWeight: number,
  strokeWidth: number,
  letterSpacing?: number,
  options: { includeTextDecoration?: boolean; includeShadowFilter?: boolean } = {},
) {
  const includeTextDecoration = options.includeTextDecoration ?? true
  const includeShadowFilter = options.includeShadowFilter ?? true
  const declarations = [
    `fill:${style.color}`,
    `font-family:${style.fontFamilyCss}`,
    `font-size:${fontSize}px`,
    `font-style:${getDiscTextFontStyle(style)}`,
    `font-weight:${fontWeight}`,
    includeTextDecoration ? `text-decoration:${getDiscTextDecoration(style)}` : '',
    typeof letterSpacing === 'number' ? `letter-spacing:${letterSpacing}px` : '',
    hasDiscTextShadow(style) && includeShadowFilter ? `filter:url(#${shadowFilterId})` : '',
    'paint-order:stroke fill',
    `stroke:${hasDiscTextStroke(style) ? DISC_TEXT_STRAIGHT_STROKE_COLOR : 'transparent'}`,
    `stroke-width:${hasDiscTextStroke(style) ? strokeWidth : 0}px`,
    'stroke-linejoin:round',
  ].filter(Boolean)

  return escapeSvgAttribute(declarations.join('; '))
}

export function buildStraightTextMarkup(
  key: DiscTextKey,
  text: string,
  layout: DiscTextLayout,
  measureText: TextMeasureFunction,
  shadowFilterId: string,
  styles?: DiscTextStyleInput,
  avoidanceRegions?: DiscTextAvoidanceRegion[],
  hideText = false,
  richText?: RichTextDocument,
  template?: DiscTemplate,
) {
  const textAvoidanceRegions = avoidanceRegions?.filter(
    (region) => region.sourceDiscTextKey !== key,
  )
  const straightTextLayout = getStraightDiscTextRenderLayout(
    key,
    text,
    layout,
    measureText,
    styles,
    { avoidanceRegions: textAvoidanceRegions, richText, template },
  )
  const textStyle = buildTextStyleAttribute(
    straightTextLayout.style,
    shadowFilterId,
    straightTextLayout.fontSize,
    straightTextLayout.fontWeight,
    DISC_TEXT_STRAIGHT_STROKE_WIDTH,
  )
  const boxMarkup = buildStraightTextBoxMarkup(key, straightTextLayout, measureText)

  const textMarkup = hideText ? '' : straightTextLayout.lines.map((line) => `
    <text
      class="disc-text-render-text"
      dominant-baseline="middle"
      ${DISC_TEXT_KEY_ATTRIBUTE}="${key}"
      text-anchor="${straightTextLayout.textAnchor}"
      xml:space="preserve"
      x="${line.x}"
      y="${line.y}"
      style="${textStyle}"
    >${buildStraightTextLineContent(line.runs, line.text, template)}</text>
  `).join('')

  return `${boxMarkup}${textMarkup}`
}

export function buildStraightTextRunStyle(
  run: RichTextRun,
  template?: DiscTemplate,
) {
  const declarations = [
    run.bold ? `font-weight:${RICH_TEXT_BOLD_FONT_WEIGHT}` : '',
    run.italic ? 'font-style:italic' : '',
    run.underline ? 'text-decoration:underline' : '',
    run.color ? `fill:${run.color}` : '',
    run.fontFamily ? `font-family:${run.fontFamily}` : '',
    run.fontSizePx
      ? `font-size:${run.fontSizePx}px`
      : run.fontSizePt
        ? `font-size:${discTextPointSizeToSvgPercent(run.fontSizePt, template)}px`
        : '',
    run.fontWeight && !run.bold ? `font-weight:${run.fontWeight}` : '',
    run.fontStyle && !run.italic ? `font-style:${run.fontStyle}` : '',
    run.textDecoration === 'underline' && !run.underline
      ? 'text-decoration:underline'
      : '',
  ].filter(Boolean)

  return declarations.length > 0
    ? ` style="${escapeSvgAttribute(declarations.join('; '))}"`
    : ''
}

export function buildStraightTextLineContent(
  runs: readonly StraightDiscTextRunLayout[] | undefined,
  fallbackText: string,
  template?: DiscTemplate,
) {
  const visibleRuns = runs?.filter((run) => run.text)
  const hasStyledRuns = visibleRuns?.some((run) =>
    run.bold ||
    run.italic ||
    run.underline ||
    run.color ||
    run.fontFamily ||
    run.fontSizePt ||
    run.fontSizePx ||
    run.fontWeight ||
    run.fontStyle ||
    run.textDecoration)

  if (!visibleRuns || !hasStyledRuns) {
    return escapeSvgText(fallbackText)
  }

  return visibleRuns.map((run) =>
    `<tspan${buildStraightTextRunStyle(run, template)}>${escapeSvgText(run.text)}</tspan>`,
  ).join('')
}

function buildStraightTextBoxMarkup(
  key: DiscTextKey,
  straightTextLayout: StraightDiscTextRenderLayout,
  measureText: TextMeasureFunction,
) {
  const style = straightTextLayout.style

  if (straightTextLayout.lines.length === 0) return ''
  if (!style.backgroundEnabled && !style.borderEnabled) return ''

  const bounds = getStraightDiscTextVisualBounds(straightTextLayout, measureText)
  const padding = style.backgroundPadding
  const x = bounds.centerX - bounds.halfWidth - padding
  const y = bounds.centerY - bounds.halfHeight - padding
  const width = bounds.halfWidth * 2 + padding * 2
  const height = bounds.halfHeight * 2 + padding * 2

  if (width <= 0 || height <= 0) return ''

  return `
    <rect
      class="disc-text-render-box"
      ${DISC_TEXT_KEY_ATTRIBUTE}="${key}"
      x="${formatSvgNumber(x)}"
      y="${formatSvgNumber(y)}"
      width="${formatSvgNumber(width)}"
      height="${formatSvgNumber(height)}"
      rx="${formatSvgNumber(style.borderRadius)}"
      ry="${formatSvgNumber(style.borderRadius)}"
      fill="${style.backgroundEnabled ? escapeSvgAttribute(style.backgroundColor) : 'none'}"
      fill-opacity="${style.backgroundEnabled ? style.backgroundOpacity : 0}"
      stroke="${style.borderEnabled ? escapeSvgAttribute(style.borderColor) : 'none'}"
      stroke-width="${style.borderEnabled ? DISC_TEXT_BOX_BORDER_WIDTH : 0}"
    />
  `
}
