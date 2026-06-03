import { DISC_TEXT_KEYS } from '../discText/constants.ts'
import type { DiscTextKey, DiscTextLayout, DiscTextLayoutSettings } from '../discText/types'
import {
  DISC_LAYOUT_CENTER_PERCENT,
  clampNumber,
  clampLayoutPointToSafeZone,
  doesRectAvoidDiscCenterCircle,
  getAdditionalArtworkBoundsPercent,
  getInnerNoPrintRadiusPercent,
  getSafeZoneRadiusPercent,
  getLogoAssetBoundsPercent,
  getMediaMarkBoundsPercent,
  getMediaMarkPlaceholderBoundsPercent,
  getPlatformMarkBoundsPercent,
  getPlatformMarkPlaceholderBoundsPercent,
  getRatingBadgeBoundsPercent,
  getRatingBadgePlaceholderBoundsPercent,
  getStraightDiscTextBoundsPercent,
  getTechnicalMarkBoundsPercent,
  getTechnicalMarkPlaceholderBoundsPercent,
  getTitleArtworkBoundsPercent,
} from '../disc/geometry.ts'
import {
  getDiscTextFontString,
  getStraightDiscTextRenderLayout,
  getStraightDiscTextVisualBounds,
  type TextMeasureFunction,
} from '../discText/renderLayout.ts'
import { DISC_TEXT_RENDER_STYLES } from '../discText/styles.ts'
import { measureDiscTextWithBrowserCanvas } from '../discText/svgLayer.ts'
import { createDefaultProjectPlatformMarkAsset } from '../project/projectMediaMark.ts'
import { createDefaultProjectTechnicalMarkAsset } from '../project/projectTechnicalMarks.ts'
import type {
  AdditionalArtworkLayout,
  BackgroundImageSize,
  LogoAssetLayout,
  MediaMarkLayout,
  PlatformMarkLayout,
  ProjectAdditionalArtwork,
  ProjectAdditionalArtworkElement,
  ProjectAdditionalLogoAsset,
  ProjectLogoAssets,
  ProjectMediaMark,
  ProjectPlatformMarkAsset,
  ProjectPlatformMarks,
  ProjectRatingBadge,
  ProjectTechnicalMarkAsset,
  ProjectTechnicalMarks,
  ProjectTitleArtwork,
  RatingBadgeLayout,
  TechnicalMarkLayout,
  TitleArtworkLayout,
} from '../project/projectTypes'
import type { DiscTemplate } from '../types/template'

type TextVisualBoundsPercent = {
  centerOffsetX: number
  centerOffsetY: number
  halfWidth: number
  halfHeight: number
}

export type LayoutAxisRange = {
  min: number
  max: number
}

export type LayoutSliderRanges = {
  x: LayoutAxisRange
  y: LayoutAxisRange
}

export type StraightDiscTextLayoutSliderRanges = LayoutSliderRanges

const STRAIGHT_DISC_TEXT_LAYOUT_X_RANGE: LayoutAxisRange = { min: -50, max: 50 }
const STRAIGHT_DISC_TEXT_LAYOUT_Y_RANGE: LayoutAxisRange = { min: 0, max: 100 }
const SAFE_ZONE_LAYOUT_X_RANGE: LayoutAxisRange = { min: 0, max: 100 }
const SAFE_ZONE_LAYOUT_Y_RANGE: LayoutAxisRange = { min: 0, max: 100 }
const LAYOUT_SLIDER_STEP = 0.1

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

function constrainAxisRangeToInnerNoPrintSide(
  range: LayoutAxisRange,
  currentValue: number,
  centerValue: number,
  innerNoPrintRadius: number,
  bounds: { halfWidth: number; halfHeight: number },
  getPointForValue: (value: number) => { x: number; y: number },
  getAxisCoordinate: (point: { x: number; y: number }) => number,
): LayoutAxisRange {
  if (innerNoPrintRadius <= 0 || centerValue < range.min || centerValue > range.max) {
    return range
  }

  if (doesRectAvoidDiscCenterCircle(getPointForValue(centerValue), innerNoPrintRadius, bounds)) {
    return range
  }

  const currentPoint = getPointForValue(currentValue)
  const preferPositiveSide =
    getAxisCoordinate(currentPoint) >= DISC_LAYOUT_CENTER_PERCENT
  const edgeValue = preferPositiveSide ? range.max : range.min

  if (!doesRectAvoidDiscCenterCircle(getPointForValue(edgeValue), innerNoPrintRadius, bounds)) {
    return range
  }

  let unsafeValue = centerValue
  let safeValue = edgeValue

  for (let iteration = 0; iteration < 32; iteration += 1) {
    const mid = (unsafeValue + safeValue) / 2

    if (doesRectAvoidDiscCenterCircle(getPointForValue(mid), innerNoPrintRadius, bounds)) {
      safeValue = mid
    } else {
      unsafeValue = mid
    }
  }

  return clampLayoutAxisRange(
    preferPositiveSide
      ? { min: safeValue, max: range.max }
      : { min: range.min, max: safeValue },
    range,
  )
}

function constrainSliderRangesToInnerNoPrint(
  ranges: LayoutSliderRanges,
  layout: Pick<LogoAssetLayout, 'x' | 'y'>,
  selectedDiscTemplate: DiscTemplate,
  bounds: { halfWidth: number; halfHeight: number },
): LayoutSliderRanges {
  const innerNoPrintRadius = getInnerNoPrintRadiusPercent(selectedDiscTemplate)

  return {
    x: constrainAxisRangeToInnerNoPrintSide(
      ranges.x,
      layout.x,
      DISC_LAYOUT_CENTER_PERCENT,
      innerNoPrintRadius,
      bounds,
      (value) => ({ x: value, y: layout.y }),
      (point) => point.x,
    ),
    y: constrainAxisRangeToInnerNoPrintSide(
      ranges.y,
      layout.y,
      DISC_LAYOUT_CENTER_PERCENT,
      innerNoPrintRadius,
      bounds,
      (value) => ({ x: layout.x, y: value }),
      (point) => point.y,
    ),
  }
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
    Math.ceil(clampedRange.min / LAYOUT_SLIDER_STEP) *
    LAYOUT_SLIDER_STEP,
  )
  const max = normalizeSliderRangeValue(
    Math.floor(clampedRange.max / LAYOUT_SLIDER_STEP) *
    LAYOUT_SLIDER_STEP,
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

function getSafeZoneLayoutSliderRanges(
  layout: Pick<LogoAssetLayout, 'x' | 'y'>,
  selectedDiscTemplate: DiscTemplate,
  bounds: { halfWidth: number; halfHeight: number },
  axisBounds: LayoutSliderRanges = {
    x: SAFE_ZONE_LAYOUT_X_RANGE,
    y: SAFE_ZONE_LAYOUT_Y_RANGE,
  },
): LayoutSliderRanges {
  const safeZoneRadius = getSafeZoneRadiusPercent(selectedDiscTemplate)
  const visualDeltaX = layout.x - DISC_LAYOUT_CENTER_PERCENT
  const visualDeltaY = layout.y - DISC_LAYOUT_CENTER_PERCENT
  const xHalfTravel = getSafeAxisHalfTravel(
    safeZoneRadius,
    visualDeltaY,
    bounds.halfHeight,
    bounds.halfWidth,
  )
  const yHalfTravel = getSafeAxisHalfTravel(
    safeZoneRadius,
    visualDeltaX,
    bounds.halfWidth,
    bounds.halfHeight,
  )
  const outerRanges = {
    x: clampLayoutAxisRange(
      {
        min: DISC_LAYOUT_CENTER_PERCENT - xHalfTravel,
        max: DISC_LAYOUT_CENTER_PERCENT + xHalfTravel,
      },
      axisBounds.x,
    ),
    y: clampLayoutAxisRange(
      {
        min: DISC_LAYOUT_CENTER_PERCENT - yHalfTravel,
        max: DISC_LAYOUT_CENTER_PERCENT + yHalfTravel,
      },
      axisBounds.y,
    ),
  }

  return constrainSliderRangesToInnerNoPrint(
    outerRanges,
    layout,
    selectedDiscTemplate,
    bounds,
  )
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

  const outerRanges = {
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
  const innerNoPrintRadius = getInnerNoPrintRadiusPercent(selectedDiscTemplate)
  const xCenterValue = -visualBounds.centerOffsetX
  const yCenterValue = DISC_LAYOUT_CENTER_PERCENT - visualBounds.centerOffsetY

  return {
    x: constrainAxisRangeToInnerNoPrintSide(
      outerRanges.x,
      layout.x,
      xCenterValue,
      innerNoPrintRadius,
      visualBounds,
      (value) => ({
        x: DISC_LAYOUT_CENTER_PERCENT + value + visualBounds.centerOffsetX,
        y: visualCenter.y,
      }),
      (point) => point.x,
    ),
    y: constrainAxisRangeToInnerNoPrintSide(
      outerRanges.y,
      layout.y,
      yCenterValue,
      innerNoPrintRadius,
      visualBounds,
      (value) => ({
        x: visualCenter.x,
        y: value + visualBounds.centerOffsetY,
      }),
      (point) => point.y,
    ),
  }
}

export function getLogoAssetLayoutSliderRanges(
  layout: LogoAssetLayout,
  selectedDiscTemplate: DiscTemplate,
  imageSize: BackgroundImageSize | null,
): LayoutSliderRanges {
  return getSafeZoneLayoutSliderRanges(
    layout,
    selectedDiscTemplate,
    getLogoAssetBoundsPercent(imageSize, layout.scale),
  )
}

export function getTitleArtworkLayoutSliderRanges(
  titleArtwork: Pick<ProjectTitleArtwork, 'imageSize' | 'layout'>,
  selectedDiscTemplate: DiscTemplate,
): LayoutSliderRanges {
  const layout = titleArtwork.layout

  return getSafeZoneLayoutSliderRanges(
    layout,
    selectedDiscTemplate,
    getTitleArtworkBoundsPercent(titleArtwork.imageSize, layout.scale),
  )
}

export function getAdditionalArtworkLayoutSliderRanges(
  additionalArtworkElement: Pick<ProjectAdditionalArtworkElement, 'imageSize' | 'layout'>,
  selectedDiscTemplate: DiscTemplate,
): LayoutSliderRanges {
  const layout = additionalArtworkElement.layout

  return getSafeZoneLayoutSliderRanges(
    layout,
    selectedDiscTemplate,
    getAdditionalArtworkBoundsPercent(additionalArtworkElement.imageSize, layout.scale),
  )
}

export function getRatingBadgeLayoutSliderRanges(
  ratingBadge: Pick<ProjectRatingBadge, 'source' | 'customImageSize' | 'layout'>,
  selectedDiscTemplate: DiscTemplate,
): LayoutSliderRanges {
  const layout = ratingBadge.layout
  const bounds =
    ratingBadge.source === 'custom' && ratingBadge.customImageSize
      ? getRatingBadgeBoundsPercent(ratingBadge.customImageSize, layout.scale)
      : getRatingBadgePlaceholderBoundsPercent(layout.scale)

  return getSafeZoneLayoutSliderRanges(layout, selectedDiscTemplate, bounds)
}

export function getMediaMarkLayoutSliderRanges(
  mediaMark: Pick<ProjectMediaMark, 'source' | 'customImageSize' | 'layout'>,
  selectedDiscTemplate: DiscTemplate,
): LayoutSliderRanges {
  const layout = mediaMark.layout
  const bounds =
    mediaMark.source === 'custom' && mediaMark.customImageSize
      ? getMediaMarkBoundsPercent(mediaMark.customImageSize, layout.scale)
      : getMediaMarkPlaceholderBoundsPercent(layout.scale)

  return getSafeZoneLayoutSliderRanges(layout, selectedDiscTemplate, bounds)
}

export function getPlatformMarkLayoutSliderRanges(
  platformMark: Pick<ProjectPlatformMarkAsset, 'source' | 'customImageSize' | 'layout'>,
  selectedDiscTemplate: DiscTemplate,
): LayoutSliderRanges {
  const layout = platformMark.layout
  const bounds =
    platformMark.source === 'custom' && platformMark.customImageSize
      ? getPlatformMarkBoundsPercent(platformMark.customImageSize, layout.scale)
      : getPlatformMarkPlaceholderBoundsPercent(layout.scale)

  return getSafeZoneLayoutSliderRanges(layout, selectedDiscTemplate, bounds)
}

export function getTechnicalMarkLayoutSliderRanges(
  technicalMark: Pick<ProjectTechnicalMarkAsset, 'source' | 'customImageSize' | 'layout'>,
  selectedDiscTemplate: DiscTemplate,
): LayoutSliderRanges {
  const layout = technicalMark.layout
  const bounds =
    technicalMark.source === 'custom' && technicalMark.customImageSize
      ? getTechnicalMarkBoundsPercent(technicalMark.customImageSize, layout.scale)
      : getTechnicalMarkPlaceholderBoundsPercent(layout.scale)

  return getSafeZoneLayoutSliderRanges(layout, selectedDiscTemplate, bounds)
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

export function clampTitleArtworkLayoutToSafeZone(
  layout: TitleArtworkLayout,
  selectedDiscTemplate: DiscTemplate,
  imageSize: BackgroundImageSize | null,
): TitleArtworkLayout {
  const point = clampLayoutPointToSafeZone(
    layout,
    selectedDiscTemplate,
    getTitleArtworkBoundsPercent(imageSize, layout.scale),
  )

  return {
    ...layout,
    x: point.x,
    y: point.y,
  }
}

export function clampAdditionalArtworkElementLayoutToSafeZone(
  layout: AdditionalArtworkLayout,
  selectedDiscTemplate: DiscTemplate,
  imageSize: BackgroundImageSize | null,
): AdditionalArtworkLayout {
  const point = clampLayoutPointToSafeZone(
    layout,
    selectedDiscTemplate,
    getAdditionalArtworkBoundsPercent(imageSize, layout.scale),
  )

  return {
    ...layout,
    x: point.x,
    y: point.y,
  }
}

export function clampProjectTitleArtworkToSafeZone(
  titleArtwork: ProjectTitleArtwork,
  selectedDiscTemplate: DiscTemplate,
): ProjectTitleArtwork {
  return {
    ...titleArtwork,
    layout: clampTitleArtworkLayoutToSafeZone(
      titleArtwork.layout,
      selectedDiscTemplate,
      titleArtwork.imageSize,
    ),
  }
}

export function clampProjectAdditionalArtworkToSafeZone(
  additionalArtwork: ProjectAdditionalArtwork,
  selectedDiscTemplate: DiscTemplate,
): ProjectAdditionalArtwork {
  return {
    ...additionalArtwork,
    elements: additionalArtwork.elements.map((element) => ({
      ...element,
      layout: clampAdditionalArtworkElementLayoutToSafeZone(
        element.layout,
        selectedDiscTemplate,
        element.imageSize,
      ),
    })),
  }
}

function clampAdditionalLogoAssetsToSafeZone(
  logoAssets: ProjectAdditionalLogoAsset[],
  selectedDiscTemplate: DiscTemplate,
) {
  return logoAssets.map((logoAsset) => ({
    ...logoAsset,
    layout: clampLogoAssetLayoutToSafeZone(
      logoAsset.layout,
      selectedDiscTemplate,
      logoAsset.imageSize,
    ),
  }))
}

export function clampProjectLogoAssetsToSafeZone(
  logoAssets: ProjectLogoAssets,
  selectedDiscTemplate: DiscTemplate,
): ProjectLogoAssets {
  return {
    ...logoAssets,
    developerLogoLayout: clampLogoAssetLayoutToSafeZone(
      logoAssets.developerLogoLayout,
      selectedDiscTemplate,
      logoAssets.developerLogoSize,
    ),
    additionalDeveloperLogos: clampAdditionalLogoAssetsToSafeZone(
      logoAssets.additionalDeveloperLogos,
      selectedDiscTemplate,
    ),
    publisherLogoLayout: clampLogoAssetLayoutToSafeZone(
      logoAssets.publisherLogoLayout,
      selectedDiscTemplate,
      logoAssets.publisherLogoSize,
    ),
    additionalPublisherLogos: clampAdditionalLogoAssetsToSafeZone(
      logoAssets.additionalPublisherLogos,
      selectedDiscTemplate,
    ),
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

export function clampProjectRatingBadgeToSafeZone(
  ratingBadge: ProjectRatingBadge,
  selectedDiscTemplate: DiscTemplate,
): ProjectRatingBadge {
  return {
    ...ratingBadge,
    layout: clampRatingBadgeLayoutToSafeZone(ratingBadge, selectedDiscTemplate),
    uskBadge: {
      ...ratingBadge.uskBadge,
      layout: clampRatingBadgeLayoutToSafeZone(
        {
          source: 'placeholder',
          customImageSize: null,
          layout: ratingBadge.uskBadge.layout,
        },
        selectedDiscTemplate,
      ),
    },
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

export function clampTechnicalMarkLayoutToSafeZone(
  technicalMark: Pick<ProjectTechnicalMarkAsset, 'source' | 'customImageSize' | 'layout'>,
  selectedDiscTemplate: DiscTemplate,
): TechnicalMarkLayout {
  const layout = technicalMark.layout
  const bounds =
    technicalMark.source === 'custom' && technicalMark.customImageSize
      ? getTechnicalMarkBoundsPercent(technicalMark.customImageSize, layout.scale)
      : getTechnicalMarkPlaceholderBoundsPercent(layout.scale)
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

export function clampProjectTechnicalMarksToSafeZone(
  technicalMarks: ProjectTechnicalMarks,
  selectedDiscTemplate: DiscTemplate,
): ProjectTechnicalMarks {
  return {
    ...technicalMarks,
    assets: {
      ...technicalMarks.assets,
      ...Object.fromEntries(
        technicalMarks.values.map((value) => {
          const asset =
            technicalMarks.assets[value] ?? createDefaultProjectTechnicalMarkAsset(value)

          return [
            value,
            {
              ...asset,
              layout: clampTechnicalMarkLayoutToSafeZone(asset, selectedDiscTemplate),
            },
          ]
        }),
      ),
    } as ProjectTechnicalMarks['assets'],
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
