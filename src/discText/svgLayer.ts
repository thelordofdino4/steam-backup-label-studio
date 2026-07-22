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
  DISC_TEXT_CURVED_STROKE_WIDTH,
  DISC_TEXT_CURVED_UNDERLINE_STROKE_FACTOR,
  getCurvedLinePaintBox,
  getCurvedLinePaintSegmentBoxes,
  getCurvedUnderlineRadius,
  type CurvedDiscTextPaintBox,
} from './curvedTextPaintGeometry.ts'
import {
  getCurvedLinePathWidth,
  getCurvedLineRadius,
  getCurvedLineWidth,
  getCurvedRichLineBoundaryProgresses,
  getCurvedRichLines,
  wrapCurvedTextBlock,
  type CurvedDiscTextBoundaryProgress,
  type CurvedDiscTextRichLine,
  type CurvedDiscTextRunLayout,
} from './curvedTextWrapping.ts'
import {
  getDiscTextFontString,
  type TextMeasureFunction,
} from './renderLayout.ts'
import {
  getDiscTextFontStyle,
  getResolvedDiscTextRenderStyle,
  type DiscTextStyleInput,
} from './styles.ts'
import {
  buildStraightTextMarkup,
  buildTextStyleAttribute,
  formatSvgNumber,
  hasDiscTextShadow,
  type ResolvedDiscTextRenderStyle,
} from './svgTextMarkup.ts'
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

export { measureDiscTextWithBrowserCanvas } from './measurement.ts'

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

function isRichRunUnderlined(run: RichTextRun, renderStyle: ResolvedDiscTextRenderStyle) {
  if (run.textDecoration) return run.textDecoration === 'underline'
  return Boolean(run.underline || renderStyle.underline)
}

function buildCurvedRunUnderlineMarkup({
  className,
  fontSize,
  includeShadowFilter,
  isTopArc,
  key,
  lineLayout,
  renderStyle,
  richLine,
  shadowFilterId,
}: {
  className: string
  fontSize: number
  includeShadowFilter: boolean
  isTopArc: boolean
  key: DiscTextKey
  lineLayout: ReturnType<typeof layoutCurvedText>['lines'][number]
  renderStyle: ResolvedDiscTextRenderStyle
  richLine: CurvedDiscTextRichLine
  shadowFilterId: string
}) {
  if (lineLayout.angleWidthDegrees <= 0 || richLine.width <= 0) return ''

  const strokeWidth = Math.max(
    0.08,
    fontSize * DISC_TEXT_CURVED_UNDERLINE_STROKE_FACTOR,
  )
  const declarations = getCurvedUnderlineDeclarations({
    renderStyle,
    strokeWidth,
    shadowFilterId,
    includeShadowFilter,
  })
  const radius = getCurvedUnderlineRadius(isTopArc, lineLayout.radius, fontSize)
  let runStartRatio = 0

  return richLine.runs.map((run) => {
    const runRatio = run.width / richLine.width
    const segmentStartRatio = runStartRatio
    const segmentEndRatio = runStartRatio + runRatio
    runStartRatio = segmentEndRatio

    if (!isRichRunUnderlined(run, renderStyle)) return ''

    const startDelta = lineLayout.angleWidthDegrees * segmentStartRatio
    const endDelta = lineLayout.angleWidthDegrees * segmentEndRatio
    const startAngle = isTopArc
      ? lineLayout.startAngleDegrees + startDelta
      : lineLayout.startAngleDegrees - startDelta
    const endAngle = isTopArc
      ? lineLayout.startAngleDegrees + endDelta
      : lineLayout.startAngleDegrees - endDelta
    const angleWidth = Math.abs(endDelta - startDelta)

    if (angleWidth <= 0) return ''

    const path = createSvgArcPath(
      50,
      50,
      radius,
      startAngle,
      endAngle,
      isTopArc ? 1 : 0,
      getLargeArcFlag(angleWidth),
    )

    return `<path
      class="${className}"
      ${DISC_TEXT_KEY_ATTRIBUTE}="${key}"
      d="${escapeSvgAttribute(path)}"
      style="${escapeSvgAttribute(declarations.join('; '))}"
    />`
  }).join('')
}

function getCurvedLineTextPathAnchor(): { startOffset: string; textAnchor: 'start' } {
  return { startOffset: '0%', textAnchor: 'start' }
}

export type CurvedDiscTextLineGeometry = {
  angleWidthDegrees: number
  boundaryProgresses?: readonly CurvedDiscTextBoundaryProgress[]
  centerAngleDegrees: number
  endAngleDegrees: number
  fontSize: number
  isTopArc: boolean
  letterSpacing: number
  radius: number
  startAngleDegrees: number
  text: string
}

export function getCurvedDiscTextPaintBoxes({
  key,
  text,
  placement,
  layout,
  safeZoneRadiusPercent,
  measureText,
  richText,
  styles,
  template,
}: {
  key: DiscTextKey
  text: string
  placement: SteamLogoPlacement
  layout: DiscTextLayout
  safeZoneRadiusPercent: number
  measureText: TextMeasureFunction
  richText?: RichTextDocument
  styles?: DiscTextStyleInput
  template?: DiscTemplate
}): CurvedDiscTextPaintBox[] {
  return getCurvedDiscTextLineGeometry({
    key,
    layout,
    measureText,
    placement,
    richText,
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

export function getCurvedDiscTextPaintCollisionBoxes({
  key,
  text,
  placement,
  layout,
  safeZoneRadiusPercent,
  measureText,
  richText,
  styles,
  template,
}: {
  key: DiscTextKey
  text: string
  placement: SteamLogoPlacement
  layout: DiscTextLayout
  safeZoneRadiusPercent: number
  measureText: TextMeasureFunction
  richText?: RichTextDocument
  styles?: DiscTextStyleInput
  template?: DiscTemplate
}): CurvedDiscTextPaintBox[] {
  const renderStyle = getResolvedDiscTextRenderStyle(key, styles)

  return getCurvedDiscTextLineGeometry({
    key,
    layout,
    measureText,
    placement,
    richText,
    safeZoneRadiusPercent,
    styles,
    template,
    text,
  }).flatMap((lineLayout) =>
    getCurvedLinePaintSegmentBoxes({
      fontSize: lineLayout.fontSize,
      isTopArc: lineLayout.isTopArc,
      lineLayout,
      renderStyle,
    }))
}

export function getCurvedDiscTextLineGeometry({
  key,
  text,
  placement,
  layout,
  safeZoneRadiusPercent,
  measureText,
  richText,
  styles,
  template,
}: {
  key: DiscTextKey
  text: string
  placement: SteamLogoPlacement
  layout: DiscTextLayout
  safeZoneRadiusPercent: number
  measureText: TextMeasureFunction
  richText?: RichTextDocument
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
  const richLines = getCurvedRichLines({
    baseFontSize: fontSize,
    document: richText,
    fallbackLines: lines,
    letterSpacing,
    measureText,
    renderStyle,
    template,
  })
  const curvedLineLayout = layoutCurvedText({
    side: isTopArc ? 'top' : 'bottom',
    centerAngleDegrees: arcCenterAngle,
    arcDegrees: layout.arcDegrees,
    align: layout.align,
    blockWindowDegrees,
    lines: richLines.map((line, index) => ({
      text: line.text,
      measuredWidth: getCurvedLinePathWidth(
        line.text,
        font,
        fontSize,
        letterSpacing,
        measureText,
      ) + Math.max(0, line.width - getCurvedLineWidth(
        line.text,
        font,
        fontSize,
        letterSpacing,
        measureText,
      )),
      radius: getCurvedLineRadius(
        isTopArc,
        textRadius,
        lineStep,
        lines.length,
        index,
      ),
    })),
  })

  return curvedLineLayout.lines.map((lineLayout, index) => {
    const linePathLength =
      lineLayout.radius * (lineLayout.angleWidthDegrees * Math.PI / 180)

    return {
      angleWidthDegrees: lineLayout.angleWidthDegrees,
      boundaryProgresses: getCurvedRichLineBoundaryProgresses({
        baseFontSize: fontSize,
        letterSpacing,
        line: richLines[index] ?? { runs: [], text: lineLayout.text, width: 0 },
        linePathLength,
        measureText,
        renderStyle,
        template,
      }),
      centerAngleDegrees: lineLayout.centerAngleDegrees,
      endAngleDegrees: lineLayout.endAngleDegrees,
      fontSize,
      isTopArc,
      letterSpacing,
      radius: lineLayout.radius,
      startAngleDegrees: lineLayout.startAngleDegrees,
      text: lineLayout.text,
    }
  })
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
  richText?: RichTextDocument,
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
  const richLines = getCurvedRichLines({
    baseFontSize: fontSize,
    document: richText,
    fallbackLines: lines,
    letterSpacing,
    measureText,
    renderStyle,
    template,
  })
  const curvedLineLayout = layoutCurvedText({
    side: isTopArc ? 'top' : 'bottom',
    centerAngleDegrees: arcCenterAngle,
    arcDegrees: layout.arcDegrees,
    align: layout.align,
    blockWindowDegrees,
    lines: richLines.map((line, index) => ({
      text: line.text,
      measuredWidth: getCurvedLinePathWidth(
        line.text,
        font,
        fontSize,
        letterSpacing,
        measureText,
      ) + Math.max(0, line.width - getCurvedLineWidth(
        line.text,
        font,
        fontSize,
        letterSpacing,
        measureText,
      )),
      radius: getCurvedLineRadius(isTopArc, textRadius, lineStep, lines.length, index),
    })),
  })
  const underlineLineLayout = layoutCurvedText({
    side: isTopArc ? 'top' : 'bottom',
    centerAngleDegrees: arcCenterAngle,
    arcDegrees: layout.arcDegrees,
    align: layout.align,
    blockWindowDegrees,
    lines: richLines.map((line, index) => ({
      text: line.text,
      measuredWidth: line.width,
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
  const buildCurvedRunStyle = (run: CurvedDiscTextRunLayout) => {
    const declarations = [
      run.color ? `fill:${run.color}` : '',
      run.fontFamily ? `font-family:${run.fontFamily}` : '',
      run.fontSizePt
        ? `font-size:${discTextPointSizeToSvgPercent(run.fontSizePt, template)}px`
        : '',
      run.fontSizePx ? `font-size:${run.fontSizePx}px` : '',
      run.fontWeight && !run.bold ? `font-weight:${run.fontWeight}` : '',
      run.bold ? `font-weight:${RICH_TEXT_BOLD_FONT_WEIGHT}` : '',
      run.fontStyle === 'italic' && !run.italic ? 'font-style:italic' : '',
      run.italic ? 'font-style:italic' : '',
    ].filter(Boolean)

    return declarations.length > 0
      ? ` style="${escapeSvgAttribute(declarations.join('; '))}"`
      : ''
  }
  const buildCurvedLineContent = (
    richLine: CurvedDiscTextRichLine | undefined,
    fallbackText: string,
  ) => {
    const runs = richLine?.runs.filter((run) => run.text) ?? []
    const hasStyledRuns = runs.some((run) =>
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

    if (!hasStyledRuns) {
      return escapeSvgText(fallbackText)
    }

    return runs.map((run) =>
      `<tspan${buildCurvedRunStyle(run)}>${escapeSvgText(run.text)}</tspan>`,
    ).join('')
  }
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
        <textPath href="#${pathId}" xlink:href="#${pathId}" startOffset="${textPathAnchor.startOffset}" text-anchor="${textPathAnchor.textAnchor}">${buildCurvedLineContent(richLines[index], lineLayout.text)}</textPath>
      </text>
    `
  }).join('')
  const buildCurvedRichUnderlineMarkup = (
    className: string,
    textShadowFilterId: string,
    includeShadowFilter: boolean,
  ) => curvedLineLayout.lines.map((lineLayout, index) =>
    buildCurvedRunUnderlineMarkup({
      className,
      fontSize,
      includeShadowFilter,
      isTopArc,
      key,
      lineLayout,
      renderStyle,
      richLine: richLines[index],
      shadowFilterId: textShadowFilterId,
    }),
  ).join('')
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
  const hasRunUnderline = richText
    ? richLines.some((line) =>
        line.runs.some((run) => isRichRunUnderlined(run, renderStyle)))
    : false
  const shadowUnderlineMarkup = hasShadow
    ? hasRunUnderline
      ? buildCurvedRichUnderlineMarkup(
          'disc-text-curved-underline-shadow',
          curvedShadowFilterId,
          true,
        )
      : buildCurvedUnderlineMarkup({
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
  const underlineMarkup = hasRunUnderline
    ? buildCurvedRichUnderlineMarkup(
        'disc-text-curved-underline',
        shadowFilterId,
        false,
      )
    : buildCurvedUnderlineMarkup({
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
    const htmlDocument = isDiscTextHtmlEnabled(htmlSources, key)
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
        htmlDocument ?? undefined,
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
