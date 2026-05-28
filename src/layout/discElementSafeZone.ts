import {
  DISC_TEXT_KEYS,
  type DiscTextKey,
  type DiscTextLayout,
  type DiscTextLayoutSettings,
} from '../discText.ts'
import {
  DISC_LAYOUT_CENTER_PERCENT,
  clampNumber,
  clampLayoutPointToSafeZone,
  getSafeZoneRadiusPercent,
  getLogoAssetBoundsPercent,
  getMediaMarkBoundsPercent,
  getMediaMarkPlaceholderBoundsPercent,
  getPlatformMarkBoundsPercent,
  getPlatformMarkPlaceholderBoundsPercent,
  getRatingBadgeBoundsPercent,
  getRatingBadgePlaceholderBoundsPercent,
  getStraightDiscTextBoundsPercent,
} from '../discGeometry.ts'
import {
  getDiscTextFontString,
  getStraightDiscTextRenderLayout,
  getStraightDiscTextVisualBounds,
  type TextMeasureFunction,
} from '../discTextRenderLayout.ts'
import { DISC_TEXT_RENDER_STYLES } from '../discTextStyles.ts'
import { measureDiscTextWithBrowserCanvas } from '../discTextSvgLayer.ts'
import { createDefaultProjectPlatformMarkAsset } from '../project/projectMediaMark.ts'
import type {
  BackgroundImageSize,
  LogoAssetLayout,
  MediaMarkLayout,
  PlatformMarkLayout,
  ProjectMediaMark,
  ProjectPlatformMarkAsset,
  ProjectPlatformMarks,
  ProjectRatingBadge,
  RatingBadgeLayout,
} from '../project/projectTypes'
import type { DiscTemplate } from '../types/template'

type TextVisualBoundsPercent = {
  centerOffsetX: number
  centerOffsetY: number
  halfWidth: number
  halfHeight: number
}

type LayoutAxisRange = {
  min: number
  max: number
}

export type StraightDiscTextLayoutSliderRanges = {
  x: LayoutAxisRange
  y: LayoutAxisRange
}

const STRAIGHT_DISC_TEXT_LAYOUT_X_RANGE: LayoutAxisRange = { min: -50, max: 50 }
const STRAIGHT_DISC_TEXT_LAYOUT_Y_RANGE: LayoutAxisRange = { min: 0, max: 100 }
const STRAIGHT_DISC_TEXT_LAYOUT_SLIDER_STEP = 0.1

function getFallbackTextVisualBounds(
  key: DiscTextKey,
  layout: DiscTextLayout,
): TextVisualBoundsPercent {
  return {
    centerOffsetX: 0,
    centerOffsetY: 0,
    ...getStraightDiscTextBoundsPercent(key, layout),
  }
}

function getStraightTextAnchorX(layout: DiscTextLayout, firstLineWidth: number) {
  const centerX = DISC_LAYOUT_CENTER_PERCENT + layout.x

  if (layout.align === 'left') {
    return centerX - firstLineWidth / 2
  }

  if (layout.align === 'right') {
    return centerX + firstLineWidth / 2
  }

  return centerX
}

function getLineHorizontalBounds(
  x: number,
  align: DiscTextLayout['align'],
  lineWidth: number,
) {
  if (align === 'left') {
    return {
      left: x,
      right: x + lineWidth,
    }
  }

  if (align === 'right') {
    return {
      left: x - lineWidth,
      right: x,
    }
  }

  return {
    left: x - lineWidth / 2,
    right: x + lineWidth / 2,
  }
}

function getRenderedStraightTextLines(key: DiscTextKey) {
  if (typeof document === 'undefined') {
    return []
  }

  return Array.from(
    document.querySelectorAll<SVGTextElement>(
      `.disc-text-render-text[data-disc-text-key="${key}"]`,
    ),
  )
    .map((textElement) => textElement.textContent?.trim() ?? '')
    .filter(Boolean)
}

function getMeasuredStraightTextVisualBounds(
  key: DiscTextKey,
  layout: DiscTextLayout,
  measureText: TextMeasureFunction = measureDiscTextWithBrowserCanvas,
): TextVisualBoundsPercent {
  const lines = getRenderedStraightTextLines(key)

  if (lines.length === 0) {
    return getFallbackTextVisualBounds(key, layout)
  }

  const renderStyle = DISC_TEXT_RENDER_STYLES[key]
  const fontSize = renderStyle.fontSizePercent * layout.scale
  const lineHeight = fontSize * 1.18
  const font = getDiscTextFontString(renderStyle.fontWeight, fontSize)
  const firstLineWidth = lines.length > 0 ? Math.max(0, measureText(lines[0], font)) : 0
  const x = getStraightTextAnchorX(layout, firstLineWidth)
  const firstLineY = layout.y - ((lines.length - 1) * lineHeight) / 2
  let left = Number.POSITIVE_INFINITY
  let right = Number.NEGATIVE_INFINITY

  for (const line of lines) {
    const lineWidth = Math.max(0, measureText(line, font))
    const horizontalBounds = getLineHorizontalBounds(x, layout.align, lineWidth)

    left = Math.min(left, horizontalBounds.left)
    right = Math.max(right, horizontalBounds.right)
  }

  if (!Number.isFinite(left) || !Number.isFinite(right)) {
    return getFallbackTextVisualBounds(key, layout)
  }

  const top = firstLineY - lineHeight / 2
  const bottom = firstLineY + (lines.length - 1) * lineHeight + lineHeight / 2
  const layoutAnchorX = DISC_LAYOUT_CENTER_PERCENT + layout.x
  const layoutAnchorY = layout.y
  const visualCenterX = (left + right) / 2
  const visualCenterY = (top + bottom) / 2

  return {
    centerOffsetX: visualCenterX - layoutAnchorX,
    centerOffsetY: visualCenterY - layoutAnchorY,
    halfWidth: (right - left) / 2,
    halfHeight: (bottom - top) / 2,
  }
}

function getMeasuredStraightTextVisualBoundsFromContent(
  key: DiscTextKey,
  text: string,
  layout: DiscTextLayout,
  measureText: TextMeasureFunction = measureDiscTextWithBrowserCanvas,
): TextVisualBoundsPercent {
  if (!text.trim()) {
    return getFallbackTextVisualBounds(key, layout)
  }

  const renderLayout = getStraightDiscTextRenderLayout(key, text, layout, measureText)

  if (renderLayout.lines.length === 0) {
    return getFallbackTextVisualBounds(key, layout)
  }

  const bounds = getStraightDiscTextVisualBounds(renderLayout, measureText)
  const layoutAnchorX = DISC_LAYOUT_CENTER_PERCENT + layout.x
  const layoutAnchorY = layout.y

  return {
    centerOffsetX: bounds.centerX - layoutAnchorX,
    centerOffsetY: bounds.centerY - layoutAnchorY,
    halfWidth: bounds.halfWidth,
    halfHeight: bounds.halfHeight,
  }
}

function getSafeAxisHalfTravel(
  safeZoneRadius: number,
  fixedAxisDelta: number,
  fixedAxisHalfSize: number,
  movingAxisHalfSize: number,
) {
  const fixedOuterDistance = Math.abs(fixedAxisDelta) + Math.max(0, fixedAxisHalfSize)
  const remainingDistance = Math.sqrt(
    Math.max(0, safeZoneRadius ** 2 - fixedOuterDistance ** 2),
  )

  return Math.max(0, remainingDistance - Math.max(0, movingAxisHalfSize))
}

function clampLayoutAxisRange(
  range: LayoutAxisRange,
  bounds: LayoutAxisRange,
): LayoutAxisRange {
  const clampedRange = {
    min: clampNumber(range.min, bounds.min, bounds.max),
    max: clampNumber(range.max, bounds.min, bounds.max),
  }
  const min = normalizeSliderRangeValue(
    Math.ceil(clampedRange.min / STRAIGHT_DISC_TEXT_LAYOUT_SLIDER_STEP) *
    STRAIGHT_DISC_TEXT_LAYOUT_SLIDER_STEP,
  )
  const max = normalizeSliderRangeValue(
    Math.floor(clampedRange.max / STRAIGHT_DISC_TEXT_LAYOUT_SLIDER_STEP) *
    STRAIGHT_DISC_TEXT_LAYOUT_SLIDER_STEP,
  )

  if (min <= max) {
    return { min, max }
  }

  const midpoint = normalizeSliderRangeValue((clampedRange.min + clampedRange.max) / 2)

  return {
    min: midpoint,
    max: midpoint,
  }
}

function normalizeSliderRangeValue(value: number) {
  const normalizedValue = Number(value.toFixed(4))

  return Object.is(normalizedValue, -0) ? 0 : normalizedValue
}

export function getStraightDiscTextLayoutSliderRanges(
  key: DiscTextKey,
  text: string,
  layout: DiscTextLayout,
  selectedDiscTemplate: DiscTemplate,
  measureText: TextMeasureFunction = measureDiscTextWithBrowserCanvas,
): StraightDiscTextLayoutSliderRanges {
  if (layout.mode !== 'straight') {
    return {
      x: STRAIGHT_DISC_TEXT_LAYOUT_X_RANGE,
      y: STRAIGHT_DISC_TEXT_LAYOUT_Y_RANGE,
    }
  }

  const safeZoneRadius = getSafeZoneRadiusPercent(selectedDiscTemplate)
  const visualBounds = getMeasuredStraightTextVisualBoundsFromContent(
    key,
    text,
    layout,
    measureText,
  )
  const visualCenter = {
    x: DISC_LAYOUT_CENTER_PERCENT + layout.x + visualBounds.centerOffsetX,
    y: layout.y + visualBounds.centerOffsetY,
  }
  const visualDeltaX = visualCenter.x - DISC_LAYOUT_CENTER_PERCENT
  const visualDeltaY = visualCenter.y - DISC_LAYOUT_CENTER_PERCENT
  const xHalfTravel = getSafeAxisHalfTravel(
    safeZoneRadius,
    visualDeltaY,
    visualBounds.halfHeight,
    visualBounds.halfWidth,
  )
  const yHalfTravel = getSafeAxisHalfTravel(
    safeZoneRadius,
    visualDeltaX,
    visualBounds.halfWidth,
    visualBounds.halfHeight,
  )

  return {
    x: clampLayoutAxisRange(
      {
        min: -xHalfTravel - visualBounds.centerOffsetX,
        max: xHalfTravel - visualBounds.centerOffsetX,
      },
      STRAIGHT_DISC_TEXT_LAYOUT_X_RANGE,
    ),
    y: clampLayoutAxisRange(
      {
        min: DISC_LAYOUT_CENTER_PERCENT - yHalfTravel - visualBounds.centerOffsetY,
        max: DISC_LAYOUT_CENTER_PERCENT + yHalfTravel - visualBounds.centerOffsetY,
      },
      STRAIGHT_DISC_TEXT_LAYOUT_Y_RANGE,
    ),
  }
}

export function clampLogoAssetLayoutToSafeZone(
  layout: LogoAssetLayout,
  selectedDiscTemplate: DiscTemplate,
  imageSize: BackgroundImageSize | null,
): LogoAssetLayout {
  const point = clampLayoutPointToSafeZone(
    layout,
    selectedDiscTemplate,
    getLogoAssetBoundsPercent(imageSize, layout.scale),
  )

  return {
    ...layout,
    x: point.x,
    y: point.y,
  }
}

export function clampRatingBadgeLayoutToSafeZone(
  ratingBadge: Pick<ProjectRatingBadge, 'source' | 'customImageSize' | 'layout'>,
  selectedDiscTemplate: DiscTemplate,
): RatingBadgeLayout {
  const layout = ratingBadge.layout
  const bounds =
    ratingBadge.source === 'custom' && ratingBadge.customImageSize
      ? getRatingBadgeBoundsPercent(ratingBadge.customImageSize, layout.scale)
      : getRatingBadgePlaceholderBoundsPercent(layout.scale)
  const point = clampLayoutPointToSafeZone(layout, selectedDiscTemplate, bounds)

  return {
    ...layout,
    x: point.x,
    y: point.y,
  }
}

export function clampMediaMarkLayoutToSafeZone(
  mediaMark: Pick<ProjectMediaMark, 'source' | 'customImageSize' | 'layout'>,
  selectedDiscTemplate: DiscTemplate,
): MediaMarkLayout {
  const layout = mediaMark.layout
  const bounds =
    mediaMark.source === 'custom' && mediaMark.customImageSize
      ? getMediaMarkBoundsPercent(mediaMark.customImageSize, layout.scale)
      : getMediaMarkPlaceholderBoundsPercent(layout.scale)
  const point = clampLayoutPointToSafeZone(layout, selectedDiscTemplate, bounds)

  return {
    ...layout,
    x: point.x,
    y: point.y,
  }
}

export function clampPlatformMarkLayoutToSafeZone(
  platformMark: Pick<ProjectPlatformMarkAsset, 'source' | 'customImageSize' | 'layout'>,
  selectedDiscTemplate: DiscTemplate,
): PlatformMarkLayout {
  const layout = platformMark.layout
  const bounds =
    platformMark.source === 'custom' && platformMark.customImageSize
      ? getPlatformMarkBoundsPercent(platformMark.customImageSize, layout.scale)
      : getPlatformMarkPlaceholderBoundsPercent(layout.scale)
  const point = clampLayoutPointToSafeZone(layout, selectedDiscTemplate, bounds)

  return {
    ...layout,
    x: point.x,
    y: point.y,
  }
}

export function clampProjectPlatformMarksToSafeZone(
  platformMarks: ProjectPlatformMarks,
  selectedDiscTemplate: DiscTemplate,
): ProjectPlatformMarks {
  return {
    ...platformMarks,
    assets: {
      ...platformMarks.assets,
      ...Object.fromEntries(
        platformMarks.values.map((value) => {
          const asset =
            platformMarks.assets[value] ?? createDefaultProjectPlatformMarkAsset(value)

          return [
            value,
            {
              ...asset,
              layout: clampPlatformMarkLayoutToSafeZone(asset, selectedDiscTemplate),
            },
          ]
        }),
      ),
    } as ProjectPlatformMarks['assets'],
  }
}

export function clampStraightDiscTextLayoutToSafeZone(
  key: DiscTextKey,
  layout: DiscTextLayout,
  selectedDiscTemplate: DiscTemplate,
  text?: string,
  measureText?: TextMeasureFunction,
): DiscTextLayout {
  if (layout.mode !== 'straight') {
    return layout
  }

  const layoutAnchor = {
    x: DISC_LAYOUT_CENTER_PERCENT + layout.x,
    y: layout.y,
  }
  const visualBounds =
    typeof text === 'string'
      ? getMeasuredStraightTextVisualBoundsFromContent(
          key,
          text,
          layout,
          measureText,
        )
      : getMeasuredStraightTextVisualBounds(key, layout, measureText)
  const visualCenter = {
    x: layoutAnchor.x + visualBounds.centerOffsetX,
    y: layoutAnchor.y + visualBounds.centerOffsetY,
  }
  const point = clampLayoutPointToSafeZone(
    visualCenter,
    selectedDiscTemplate,
    {
      halfWidth: visualBounds.halfWidth,
      halfHeight: visualBounds.halfHeight,
    },
  )

  return {
    ...layout,
    x: layout.x + point.x - visualCenter.x,
    y: layout.y + point.y - visualCenter.y,
  }
}

export function clampDiscTextLayoutToSafeZone(
  layout: DiscTextLayoutSettings,
  selectedDiscTemplate: DiscTemplate,
): DiscTextLayoutSettings {
  return DISC_TEXT_KEYS.reduce((nextLayout, key) => {
    nextLayout[key] = clampStraightDiscTextLayoutToSafeZone(
      key,
      layout[key],
      selectedDiscTemplate,
    )
    return nextLayout
  }, {} as DiscTextLayoutSettings)
}
