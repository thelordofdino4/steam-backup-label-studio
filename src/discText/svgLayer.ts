import {
  DISC_TEXT_KEYS,
  createSvgArcPath,
  getCopyrightArcSide,
  getCurvedPreviewLetterSpacing,
  getDiscTextHtmlSource,
  getDiscTextContent,
  getLargeArcFlag,
  getReadableCurvedTextScale,
  isDiscTextHtmlEnabled,
  type DiscTextKey,
  type DiscTextLayout,
  type DiscTextLayoutSettings,
  type DiscTextHtmlSources,
  type DiscTextSettings,
  type DiscTextValues,
  type SteamLogoPlacement,
} from './index.ts'
import type { DiscTextAvoidanceRegion } from './avoidance.ts'
import { layoutCurvedText } from './curvedTextLayout.ts'
import {
  getDiscTextFontString,
  getStraightDiscTextRenderLayout,
  getStraightDiscTextVisualBounds,
  type TextMeasureFunction,
} from './renderLayout.ts'
import {
  getDiscTextDecoration,
  getDiscTextFontStyle,
  getResolvedDiscTextRenderStyle,
  type DiscTextStyleInput,
} from './styles.ts'
import { escapeSvgAttribute, escapeSvgText } from '../utils/svg.ts'
import {
  parseHtmlText,
  type RichTextDocument,
  type RichTextRun,
} from '../text/htmlText.ts'
import {
  RICH_TEXT_BOLD_FONT_WEIGHT,
} from '../text/richTextWeights.ts'
import { DISC_TEXT_KEY_ATTRIBUTE } from '../editor/previewEditableRegistry.ts'
import type { DiscTemplate } from '../types/template.ts'
import {
  discTextPointSizeToSvgPercent,
  getResolvedDiscTextFontSizePercent,
} from './pointSize.ts'

export type DiscTextSvgLayerParams = {
  settings: DiscTextSettings
  values: DiscTextValues
  htmlSources?: DiscTextHtmlSources
  styles?: DiscTextStyleInput
  layoutSettings: DiscTextLayoutSettings
  title: string
  placement: SteamLogoPlacement
  safeZoneRadiusPercent: number
  measureText: TextMeasureFunction
  avoidanceRegions?: DiscTextAvoidanceRegion[]
  width: number | string
  height: number | string
  idPrefix?: string
  hiddenTextKeys?: readonly DiscTextKey[]
  template?: DiscTemplate
}

type ResolvedDiscTextRenderStyle = ReturnType<typeof getResolvedDiscTextRenderStyle>

const DISC_TEXT_STROKE_COLOR = 'rgba(0, 0, 0, 0.58)'
const DISC_TEXT_STRAIGHT_STROKE_WIDTH = 0.28
const DISC_TEXT_CURVED_STROKE_WIDTH = 0.28
const DISC_TEXT_BOX_BORDER_WIDTH = 0.18
const DISC_TEXT_CURVED_PATH_MIN_PAINT_PADDING = 1.2
const DISC_TEXT_CURVED_PATH_PAINT_PADDING_FACTOR = 2.2
const DISC_TEXT_CURVED_UNDERLINE_OFFSET_FACTOR = 0.42
const DISC_TEXT_CURVED_UNDERLINE_STROKE_FACTOR = 0.08

let discTextMeasureContext: CanvasRenderingContext2D | null = null

function getDiscTextMeasureContext() {
  if (discTextMeasureContext) return discTextMeasureContext
  if (typeof document === 'undefined') return null

  discTextMeasureContext = document.createElement('canvas').getContext('2d')
  return discTextMeasureContext
}

export const measureDiscTextWithBrowserCanvas: TextMeasureFunction = (text, font) => {
  const context = getDiscTextMeasureContext()

  if (!context) {
    const fontSizeMatch = font.match(/(\d+(?:\.\d+)?)px/)
    const fontSize = fontSizeMatch ? Number(fontSizeMatch[1]) : 1
    return Array.from(text).length * fontSize * 0.58
  }

  context.font = font
  return context.measureText(text).width
}

function getFallbackCurvedLineWidth(line: string, fontSize: number, letterSpacing: number) {
  const averageCharacterWidth = fontSize * 0.68
  const characterCount = Array.from(line).length
  return characterCount * averageCharacterWidth + Math.max(0, characterCount - 1) * letterSpacing
}

function getCurvedLineWidth(
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

function getCurvedLinePathWidth(
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
      getCurvedLineWidth(testChunk, font, fontSize, letterSpacing, measureText) <= maxArcLength ||
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
      getCurvedLineWidth(token, font, fontSize, letterSpacing, measureText) > maxTextLength
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
        getCurvedLineWidth(testLine, font, fontSize, letterSpacing, measureText) <= maxTextLength ||
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

function getCurvedLineRadius(
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

function wrapCurvedTextBlock(
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
        radius: getCurvedLineRadius(isTopArc, textRadius, lineStep, lines.length, index),
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

function hasDiscTextShadow(style: ResolvedDiscTextRenderStyle) {
  return style.contrast === 'shadow' || style.contrast === 'strokeShadow'
}

function hasDiscTextStroke(style: ResolvedDiscTextRenderStyle) {
  return style.contrast === 'stroke' || style.contrast === 'strokeShadow'
}

function buildTextStyleAttribute(
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
    `stroke:${hasDiscTextStroke(style) ? DISC_TEXT_STROKE_COLOR : 'transparent'}`,
    `stroke-width:${hasDiscTextStroke(style) ? strokeWidth : 0}px`,
    'stroke-linejoin:round',
  ].filter(Boolean)

  return escapeSvgAttribute(declarations.join('; '))
}

function getCurvedUnderlineRadius(
  isTopArc: boolean,
  radius: number,
  fontSize: number,
) {
  const offset = fontSize * DISC_TEXT_CURVED_UNDERLINE_OFFSET_FACTOR
  return Math.max(1, isTopArc ? radius - offset : radius + offset)
}

function getCurvedUnderlineDeclarations({
  renderStyle,
  strokeWidth,
  shadowFilterId,
  includeShadowFilter,
}: {
  renderStyle: ResolvedDiscTextRenderStyle
  strokeWidth: number
  shadowFilterId: string
  includeShadowFilter: boolean
}) {
  return [
    'fill:none',
    `stroke:${renderStyle.color}`,
    'stroke-opacity:1',
    'opacity:1',
    `stroke-width:${formatSvgNumber(strokeWidth)}px`,
    'stroke-linecap:round',
    hasDiscTextShadow(renderStyle) && includeShadowFilter ? `filter:url(#${shadowFilterId})` : '',
  ].filter(Boolean)
}

function buildCurvedUnderlineMarkup({
  isTopArc,
  key,
  layout,
  renderStyle,
  fontSize,
  shadowFilterId,
  includeShadowFilter = false,
  className = 'disc-text-curved-underline',
}: {
  isTopArc: boolean
  key: DiscTextKey
  layout: ReturnType<typeof layoutCurvedText>
  renderStyle: ResolvedDiscTextRenderStyle
  fontSize: number
  shadowFilterId: string
  includeShadowFilter?: boolean
  className?: string
}) {
  if (!renderStyle.underline) return ''

  const strokeWidth = Math.max(
    0.08,
    fontSize * DISC_TEXT_CURVED_UNDERLINE_STROKE_FACTOR,
  )

  return layout.lines.map((lineLayout) => {
    if (lineLayout.angleWidthDegrees <= 0) return ''

    const radius = getCurvedUnderlineRadius(isTopArc, lineLayout.radius, fontSize)
    const path = createSvgArcPath(
      50,
      50,
      radius,
      lineLayout.startAngleDegrees,
      lineLayout.endAngleDegrees,
      isTopArc ? 1 : 0,
      getLargeArcFlag(lineLayout.angleWidthDegrees),
    )
    const declarations = getCurvedUnderlineDeclarations({
      renderStyle,
      strokeWidth,
      shadowFilterId,
      includeShadowFilter,
    })

    return `<path
      class="${className}"
      ${DISC_TEXT_KEY_ATTRIBUTE}="${key}"
      d="${escapeSvgAttribute(path)}"
      style="${escapeSvgAttribute(declarations.join('; '))}"
    />`
  }).join('')
}

function formatSvgNumber(value: number) {
  return Number(value.toFixed(3))
}

function getCurvedLineTextPathAnchor(): { startOffset: string; textAnchor: 'start' } {
  return { startOffset: '0%', textAnchor: 'start' }
}

type CurvedDiscTextPaintBox = {
  bottom: number
  left: number
  right: number
  top: number
}

export type CurvedDiscTextLineGeometry = {
  angleWidthDegrees: number
  centerAngleDegrees: number
  endAngleDegrees: number
  fontSize: number
  isTopArc: boolean
  letterSpacing: number
  radius: number
  startAngleDegrees: number
  text: string
}

function getArcPoint(radius: number, angleDegrees: number) {
  const radians = (angleDegrees * Math.PI) / 180

  return {
    x: 50 + Math.cos(radians) * radius,
    y: 50 + Math.sin(radians) * radius,
  }
}

function getCurvedLinePaintBox({
  fontSize,
  isTopArc,
  lineLayout,
  renderStyle,
}: {
  fontSize: number
  isTopArc: boolean
  lineLayout: ReturnType<typeof layoutCurvedText>['lines'][number]
  renderStyle: ResolvedDiscTextRenderStyle
}): CurvedDiscTextPaintBox | null {
  if (lineLayout.angleWidthDegrees <= 0) return null

  const shadowSlack = hasDiscTextShadow(renderStyle) ? 1.4 : 0
  const strokeSlack = hasDiscTextStroke(renderStyle)
    ? DISC_TEXT_CURVED_STROKE_WIDTH / 2
    : 0
  const underlineSlack = renderStyle.underline
    ? fontSize * (
        DISC_TEXT_CURVED_UNDERLINE_OFFSET_FACTOR +
        DISC_TEXT_CURVED_UNDERLINE_STROKE_FACTOR
      )
    : 0
  const radialSlack = Math.max(
    0.9,
    fontSize * 0.72,
    strokeSlack + shadowSlack + underlineSlack,
  )
  const sampleCount = Math.max(
    6,
    Math.ceil(lineLayout.angleWidthDegrees / 8),
  )
  const radii = [
    Math.max(1, lineLayout.radius - radialSlack),
    lineLayout.radius + radialSlack,
  ]
  const points = []

  for (let index = 0; index <= sampleCount; index += 1) {
    const angle =
      lineLayout.startAngleDegrees +
      (lineLayout.angleWidthDegrees * index) / sampleCount *
        (isTopArc ? 1 : -1)

    for (const radius of radii) {
      points.push(getArcPoint(radius, angle))
    }
  }

  return {
    bottom: Math.max(...points.map((point) => point.y)),
    left: Math.min(...points.map((point) => point.x)),
    right: Math.max(...points.map((point) => point.x)),
    top: Math.min(...points.map((point) => point.y)),
  }
}

export function getCurvedDiscTextPaintBoxes({
  key,
  text,
  placement,
  layout,
  safeZoneRadiusPercent,
  measureText,
  styles,
  template,
}: {
  key: DiscTextKey
  text: string
  placement: SteamLogoPlacement
  layout: DiscTextLayout
  safeZoneRadiusPercent: number
  measureText: TextMeasureFunction
  styles?: DiscTextStyleInput
  template?: DiscTemplate
}): CurvedDiscTextPaintBox[] {
  return getCurvedDiscTextLineGeometry({
    key,
    layout,
    measureText,
    placement,
    safeZoneRadiusPercent,
    styles,
    template,
    text,
  })
    .map((lineLayout) =>
      getCurvedLinePaintBox({
        fontSize: lineLayout.fontSize,
        isTopArc: lineLayout.isTopArc,
        lineLayout,
        renderStyle: getResolvedDiscTextRenderStyle(key, styles),
      }))
    .filter((box): box is CurvedDiscTextPaintBox => Boolean(box))
}

export function getCurvedDiscTextLineGeometry({
  key,
  text,
  placement,
  layout,
  safeZoneRadiusPercent,
  measureText,
  styles,
  template,
}: {
  key: DiscTextKey
  text: string
  placement: SteamLogoPlacement
  layout: DiscTextLayout
  safeZoneRadiusPercent: number
  measureText: TextMeasureFunction
  styles?: DiscTextStyleInput
  template?: DiscTemplate
}): CurvedDiscTextLineGeometry[] {
  const isTopArc = getCopyrightArcSide(placement, layout) === 'top'
  const renderStyle = getResolvedDiscTextRenderStyle(key, styles)
  const curvedScale = getReadableCurvedTextScale(layout.scale)
  const fontSize = getResolvedDiscTextFontSizePercent(layout, key, template)
  const font = getDiscTextFontString(
    renderStyle.fontWeight,
    fontSize,
    renderStyle.fontFamilyCanvas,
    getDiscTextFontStyle(renderStyle),
  )
  const textRadius = Math.max(1, safeZoneRadiusPercent - layout.y * 0.18)
  const arcCenterAngle = (isTopArc ? 270 : 90) + layout.x
  const lineStep = 2.2 * curvedScale
  const letterSpacing = getCurvedPreviewLetterSpacing(layout.scale)
  const { lines, blockWindowDegrees } = wrapCurvedTextBlock(
    text,
    textRadius,
    lineStep,
    layout.arcDegrees,
    font,
    fontSize,
    letterSpacing,
    isTopArc,
    measureText,
  )
  const curvedLineLayout = layoutCurvedText({
    side: isTopArc ? 'top' : 'bottom',
    centerAngleDegrees: arcCenterAngle,
    arcDegrees: layout.arcDegrees,
    align: layout.align,
    blockWindowDegrees,
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

  return curvedLineLayout.lines.map((lineLayout) => ({
    angleWidthDegrees: lineLayout.angleWidthDegrees,
    centerAngleDegrees: lineLayout.centerAngleDegrees,
    endAngleDegrees: lineLayout.endAngleDegrees,
    fontSize,
    isTopArc,
    letterSpacing,
    radius: lineLayout.radius,
    startAngleDegrees: lineLayout.startAngleDegrees,
    text: lineLayout.text,
  }))
}

function buildCurvedCopyrightMarkup(
  key: DiscTextKey,
  text: string,
  placement: SteamLogoPlacement,
  layout: DiscTextLayout,
  safeZoneRadiusPercent: number,
  measureText: TextMeasureFunction,
  idPrefix: string,
  shadowFilterId: string,
  curvedShadowFilterId: string,
  styles?: DiscTextStyleInput,
  template?: DiscTemplate,
) {
  const isTopArc = getCopyrightArcSide(placement, layout) === 'top'
  const renderStyle = getResolvedDiscTextRenderStyle(key, styles)
  const curvedScale = getReadableCurvedTextScale(layout.scale)
  const fontSize = getResolvedDiscTextFontSizePercent(layout, key, template)
  const font = getDiscTextFontString(
    renderStyle.fontWeight,
    fontSize,
    renderStyle.fontFamilyCanvas,
    getDiscTextFontStyle(renderStyle),
  )
  const textRadius = Math.max(1, safeZoneRadiusPercent - layout.y * 0.18)
  const arcCenterAngle = (isTopArc ? 270 : 90) + layout.x
  const lineStep = 2.2 * curvedScale
  const letterSpacing = getCurvedPreviewLetterSpacing(layout.scale)
  const { lines, blockWindowDegrees } = wrapCurvedTextBlock(
    text,
    textRadius,
    lineStep,
    layout.arcDegrees,
    font,
    fontSize,
    letterSpacing,
    isTopArc,
    measureText,
  )
  const curvedLineLayout = layoutCurvedText({
    side: isTopArc ? 'top' : 'bottom',
    centerAngleDegrees: arcCenterAngle,
    arcDegrees: layout.arcDegrees,
    align: layout.align,
    blockWindowDegrees,
    lines: lines.map((line, index) => ({
      text: line,
      measuredWidth: getCurvedLinePathWidth(
        line,
        font,
        fontSize,
        letterSpacing,
        measureText,
      ),
      radius: getCurvedLineRadius(isTopArc, textRadius, lineStep, lines.length, index),
    })),
  })
  const underlineLineLayout = layoutCurvedText({
    side: isTopArc ? 'top' : 'bottom',
    centerAngleDegrees: arcCenterAngle,
    arcDegrees: layout.arcDegrees,
    align: layout.align,
    blockWindowDegrees,
    lines: lines.map((line, index) => ({
      text: line,
      measuredWidth: getCurvedLineWidth(
        line,
        font,
        fontSize,
        letterSpacing,
        measureText,
      ),
      radius: getCurvedLineRadius(isTopArc, textRadius, lineStep, lines.length, index),
    })),
  })
  const textPathAnchor = getCurvedLineTextPathAnchor()
  const pathMarkup = curvedLineLayout.lines.map((lineLayout, index) => {
    const pathId = `${idPrefix}-${key}-path-${index}`
    const path = createSvgArcPath(
      50,
      50,
      lineLayout.radius,
      lineLayout.startAngleDegrees,
      lineLayout.endAngleDegrees,
      isTopArc ? 1 : 0,
      getLargeArcFlag(lineLayout.angleWidthDegrees),
    )

    return `<path id="${pathId}" d="${path}" />`
  }).join('')
  const buildCurvedTextMarkup = (
    className: string,
    textShadowFilterId: string,
    includeShadowFilter: boolean,
  ) => curvedLineLayout.lines.map((lineLayout, index) => {
    const pathId = `${idPrefix}-${key}-path-${index}`
    const style = buildTextStyleAttribute(
      renderStyle,
      textShadowFilterId,
      fontSize,
      renderStyle.fontWeight,
      DISC_TEXT_CURVED_STROKE_WIDTH,
      letterSpacing,
      { includeTextDecoration: false, includeShadowFilter },
    )

    return `
      <text
        class="${className}"
        dominant-baseline="middle"
        ${DISC_TEXT_KEY_ATTRIBUTE}="${key}"
        xml:space="preserve"
        style="${style}"
      >
        <textPath href="#${pathId}" xlink:href="#${pathId}" startOffset="${textPathAnchor.startOffset}" text-anchor="${textPathAnchor.textAnchor}">${escapeSvgText(lineLayout.text)}</textPath>
      </text>
    `
  }).join('')
  const hasShadow = hasDiscTextShadow(renderStyle)
  const shadowTextMarkup = hasShadow
    ? buildCurvedTextMarkup(
        'disc-text-render-text disc-text-curved-shadow',
        curvedShadowFilterId,
        true,
      )
    : ''
  const textMarkup = buildCurvedTextMarkup(
    'disc-text-render-text',
    shadowFilterId,
    false,
  )
  const shadowUnderlineMarkup = hasShadow
    ? buildCurvedUnderlineMarkup({
        isTopArc,
        key,
        layout: underlineLineLayout,
        renderStyle,
        fontSize,
        shadowFilterId: curvedShadowFilterId,
        includeShadowFilter: true,
        className: 'disc-text-curved-underline-shadow',
      })
    : ''
  const underlineMarkup = buildCurvedUnderlineMarkup({
    isTopArc,
    key,
    layout: underlineLineLayout,
    renderStyle,
    fontSize,
    shadowFilterId,
    includeShadowFilter: false,
  })

  return { defs: pathMarkup, body: `${shadowUnderlineMarkup}${shadowTextMarkup}${underlineMarkup}${textMarkup}` }
}

function buildStraightTextMarkup(
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

function buildStraightTextRunStyle(run: RichTextRun, template?: DiscTemplate) {
  const declarations = [
    run.bold ? `font-weight:${RICH_TEXT_BOLD_FONT_WEIGHT}` : '',
    run.italic ? 'font-style:italic' : '',
    run.underline ? 'text-decoration:underline' : '',
    run.color ? `fill:${run.color}` : '',
    run.fontFamily ? `font-family:${run.fontFamily}` : '',
    run.fontSizePt
      ? `font-size:${discTextPointSizeToSvgPercent(run.fontSizePt, template)}px`
      : '',
    run.fontSizePx ? `font-size:${run.fontSizePx}px` : '',
    run.fontWeight && !run.bold ? `font-weight:${run.fontWeight}` : '',
    run.fontStyle === 'italic' && !run.italic ? 'font-style:italic' : '',
    run.textDecoration === 'underline' && !run.underline
      ? 'text-decoration:underline'
      : '',
  ].filter(Boolean)

  return declarations.length > 0
    ? ` style="${escapeSvgAttribute(declarations.join('; '))}"`
    : ''
}

function buildStraightTextLineContent(
  runs: ReturnType<typeof getStraightDiscTextRenderLayout>['lines'][number]['runs'],
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
  straightTextLayout: ReturnType<typeof getStraightDiscTextRenderLayout>,
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

export function buildDiscTextSvgLayer({
  settings,
  values,
  htmlSources = {},
  styles,
  layoutSettings,
  title,
  placement,
  safeZoneRadiusPercent,
  measureText,
  avoidanceRegions = [],
  width,
  height,
  idPrefix = 'disc-text-layer',
  hiddenTextKeys = [],
  template,
}: DiscTextSvgLayerParams) {
  const shadowFilterId = `${idPrefix}-shadow`
  const curvedShadowFilterId = `${idPrefix}-curved-shadow-only`
  const hiddenTextKeySet = new Set(hiddenTextKeys)
  const pathDefs: string[] = []
  const textElements = DISC_TEXT_KEYS.map((key) => {
    if (!settings[key]) return ''

    const fallbackText = getDiscTextContent(key, values, title)
    const layout = layoutSettings[key]
    const htmlDocument =
      key === 'copyright' && layout.mode === 'curved'
        ? null
        : isDiscTextHtmlEnabled(htmlSources, key)
          ? parseHtmlText(
              getDiscTextHtmlSource(htmlSources, key, fallbackText),
            )
          : null
    const text = htmlDocument?.plainText ?? fallbackText
    if (!text.trim()) return ''

    if (key === 'copyright' && layout.mode === 'curved') {
      const curvedMarkup = buildCurvedCopyrightMarkup(
        key,
        text,
        placement,
        layout,
        safeZoneRadiusPercent,
        measureText,
        idPrefix,
        shadowFilterId,
        curvedShadowFilterId,
        styles,
        template,
      )
      pathDefs.push(curvedMarkup.defs)
      return curvedMarkup.body
    }

    return buildStraightTextMarkup(
      key,
      text,
      layout,
      measureText,
      shadowFilterId,
      styles,
      avoidanceRegions,
      hiddenTextKeySet.has(key),
      htmlDocument ?? undefined,
      template,
    )
  }).join('')

  return `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      xmlns:xlink="http://www.w3.org/1999/xlink"
      class="disc-text-svg-layer"
      width="${escapeSvgAttribute(String(width))}"
      height="${escapeSvgAttribute(String(height))}"
      viewBox="0 0 100 100"
      aria-label="Disc text elements"
    >
      <defs>
        <filter id="${shadowFilterId}" x="-30%" y="-30%" width="160%" height="160%" color-interpolation-filters="sRGB">
          <feDropShadow dx="0" dy="0.32" stdDeviation="0.62" flood-color="#000000" flood-opacity="0.85" />
          <feDropShadow dx="0" dy="0" stdDeviation="0.22" flood-color="#000000" flood-opacity="0.9" />
        </filter>
        <filter id="${curvedShadowFilterId}" x="-30%" y="-30%" width="160%" height="160%" color-interpolation-filters="sRGB">
          <feGaussianBlur in="SourceAlpha" stdDeviation="0.62" result="curved-shadow-blur-strong" />
          <feOffset in="curved-shadow-blur-strong" dx="0" dy="0.32" result="curved-shadow-offset-strong" />
          <feFlood flood-color="#000000" flood-opacity="0.85" result="curved-shadow-flood-strong" />
          <feComposite in="curved-shadow-flood-strong" in2="curved-shadow-offset-strong" operator="in" result="curved-shadow-strong" />
          <feGaussianBlur in="SourceAlpha" stdDeviation="0.22" result="curved-shadow-blur-tight" />
          <feFlood flood-color="#000000" flood-opacity="0.9" result="curved-shadow-flood-tight" />
          <feComposite in="curved-shadow-flood-tight" in2="curved-shadow-blur-tight" operator="in" result="curved-shadow-tight" />
          <feMerge>
            <feMergeNode in="curved-shadow-strong" />
            <feMergeNode in="curved-shadow-tight" />
          </feMerge>
        </filter>
        ${pathDefs.join('')}
      </defs>
      <style>
        .disc-text-svg-layer {
          display: block;
          overflow: visible;
        }

        .disc-text-render-text {
          alignment-baseline: middle;
          cursor: grab;
          pointer-events: visiblePainted;
          user-select: none;
        }

        .disc-text-render-box {
          cursor: grab;
          pointer-events: visiblePainted;
          user-select: none;
        }

        .disc-text-render-text:active,
        .disc-text-render-box:active {
          cursor: grabbing;
        }
      </style>
      ${textElements}
    </svg>
  `
}
