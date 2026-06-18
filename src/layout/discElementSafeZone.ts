import { DISC_TEXT_KEYS } from '../discText/constants.ts'
import type { DiscTextKey, DiscTextLayout, DiscTextLayoutSettings } from '../discText/types'
import {
  DISC_LAYOUT_CENTER_PERCENT,
  clampNumber,
  clampShapeToSafeAnnulus,
  clampLayoutPointToSafeZone,
  doesShapeFitSafeAnnulus,
  doesRectAvoidDiscCenterCircle,
  getAdditionalArtworkBoundsPercent,
  getImageContentShapeFootprintPercent,
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
  type RenderBoundsPercent,
  type RenderShapeFootprintPercent,
} from '../disc/geometry.ts'
import {
  getMediaMarkPlaceholderImageSize,
  getPlatformMarkPlaceholderImageSize,
  getRatingBadgePlaceholderImageSize,
  getTechnicalMarkPlaceholderImageSize,
} from '../assets/assetManifest.ts'
import {
  getDiscTextFontString,
  getStraightDiscTextRenderLayout,
  getStraightDiscTextVisualBounds,
  type TextMeasureFunction,
} from '../discText/renderLayout.ts'
import {
  getDiscTextFontStyle,
  getResolvedDiscTextRenderStyle,
  type DiscTextStyleInput,
} from '../discText/styles.ts'
import { measureDiscTextWithBrowserCanvas } from '../discText/svgLayer.ts'
import { createDefaultProjectPlatformMarkAsset } from '../project/projectPlatformMarks.ts'
import { createDefaultProjectTechnicalMarkAsset } from '../project/projectTechnicalMarks.ts'
import type {
  AdditionalArtworkLayout,
  BackgroundImageSize,
  LogoAssetLayout,
  MediaMarkLayout,
  PlatformMarkLayout,
  PlatformMarkTheme,
  PlatformMarkValue,
  ProjectAdditionalArtwork,
  ProjectAdditionalArtworkElement,
  ProjectAdditionalLogoAsset,
  ProjectLogoAssets,
  ProjectMediaMark,
  ProjectMetadata,
  ProjectPlatformMarkAsset,
  ProjectPlatformMarks,
  ProjectRatingBadge,
  ProjectTechnicalMarkAsset,
  ProjectTechnicalMarks,
  ProjectTitleArtwork,
  RatingBadgeLayout,
  TechnicalMarkLayout,
  TechnicalMarkValue,
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
  styles?: DiscTextStyleInput,
): TextVisualBoundsPercent {
  const lines = getRenderedStraightTextLines(key)

  if (lines.length === 0) {
    return getFallbackTextVisualBounds(key, layout)
  }

  const renderStyle = getResolvedDiscTextRenderStyle(key, styles)
  const fontSize = renderStyle.fontSizePercent * layout.scale
  const lineHeight = fontSize * 1.18
  const font = getDiscTextFontString(
    renderStyle.fontWeight,
    fontSize,
    renderStyle.fontFamilyCanvas,
    getDiscTextFontStyle(renderStyle),
  )
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
  styles?: DiscTextStyleInput,
): TextVisualBoundsPercent {
  if (!text.trim()) {
    return getFallbackTextVisualBounds(key, layout)
  }

  const renderLayout = getStraightDiscTextRenderLayout(
    key,
    text,
    layout,
    measureText,
    styles,
  )

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
  bounds: RenderBoundsPercent,
  axisBounds: LayoutSliderRanges = {
    x: SAFE_ZONE_LAYOUT_X_RANGE,
    y: SAFE_ZONE_LAYOUT_Y_RANGE,
  },
  shapeFootprint?: RenderShapeFootprintPercent | null,
): LayoutSliderRanges {
  if (shapeFootprint?.loops.length) {
    return getShapeSafeZoneLayoutSliderRanges(
      layout,
      selectedDiscTemplate,
      shapeFootprint,
      axisBounds,
    )
  }

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

function getSafeImageShapeFootprint(
  imageSize: BackgroundImageSize | null,
  bounds: RenderBoundsPercent,
) {
  return getImageContentShapeFootprintPercent(imageSize, bounds)
}

type MediaMarkSafeZoneInput = Pick<
  ProjectMediaMark,
  'source' | 'customImageSize' | 'layout'
> & Partial<Pick<ProjectMediaMark, 'value' | 'theme'>>

type PlatformMarkSafeZoneInput = Pick<
  ProjectPlatformMarkAsset,
  'source' | 'customImageSize' | 'layout'
> & {
  value?: PlatformMarkValue
  theme?: PlatformMarkTheme
}

type TechnicalMarkSafeZoneInput = Pick<
  ProjectTechnicalMarkAsset,
  'source' | 'customImageSize' | 'layout'
> & {
  value?: TechnicalMarkValue
}

type RatingBadgeSafeZoneInput = Pick<
  ProjectRatingBadge,
  'source' | 'customImageSize' | 'layout'
> & {
  metadata?: Pick<ProjectMetadata, 'ratingSystem' | 'ratingValue'> | null
}

function getMediaMarkSafeImageSize(
  mediaMark: Pick<
    MediaMarkSafeZoneInput,
    'source' | 'customImageSize' | 'value' | 'theme'
  >,
) {
  if (mediaMark.source === 'custom' && mediaMark.customImageSize) {
    return mediaMark.customImageSize
  }

  return mediaMark.value
    ? getMediaMarkPlaceholderImageSize(mediaMark.value, mediaMark.theme)
    : null
}

function getPlatformMarkSafeImageSize(
  platformMark: Pick<
    PlatformMarkSafeZoneInput,
    'source' | 'customImageSize' | 'value' | 'theme'
  >,
) {
  if (platformMark.source === 'custom' && platformMark.customImageSize) {
    return platformMark.customImageSize
  }

  return platformMark.value
    ? getPlatformMarkPlaceholderImageSize(
        platformMark.value,
        platformMark.theme,
      )
    : null
}

function getTechnicalMarkSafeImageSize(
  technicalMark: Pick<
    TechnicalMarkSafeZoneInput,
    'source' | 'customImageSize' | 'value'
  >,
) {
  if (technicalMark.source === 'custom' && technicalMark.customImageSize) {
    return technicalMark.customImageSize
  }

  return technicalMark.value
    ? getTechnicalMarkPlaceholderImageSize(technicalMark.value)
    : null
}

function getRatingBadgeSafeImageSize(
  ratingBadge: Pick<
    RatingBadgeSafeZoneInput,
    'source' | 'customImageSize' | 'metadata'
  >,
) {
  if (ratingBadge.source === 'custom' && ratingBadge.customImageSize) {
    return ratingBadge.customImageSize
  }

  return ratingBadge.metadata
    ? getRatingBadgePlaceholderImageSize(ratingBadge.metadata)
    : null
}

function getShapeSafeAxisRange(
  axis: 'x' | 'y',
  layout: Pick<LogoAssetLayout, 'x' | 'y'>,
  clampedPoint: { x: number; y: number },
  selectedDiscTemplate: DiscTemplate,
  shapeFootprint: RenderShapeFootprintPercent,
  axisBounds: LayoutAxisRange,
) {
  const innerNoPrintRadius = getInnerNoPrintRadiusPercent(selectedDiscTemplate)
  const safeZoneRadius = getSafeZoneRadiusPercent(selectedDiscTemplate)
  const fixedAxis = axis === 'x' ? 'y' : 'x'
  const fixedValue = layout[fixedAxis]
  const getPoint = (value: number) => ({
    x: axis === 'x' ? value : fixedValue,
    y: axis === 'y' ? value : fixedValue,
  })
  const isSafe = (value: number) =>
    doesShapeFitSafeAnnulus(
      getPoint(value),
      innerNoPrintRadius,
      safeZoneRadius,
      shapeFootprint,
    )
  const requestedValue = layout[axis]
  const clampedValue = clampedPoint[axis]
  const centerValue = isSafe(requestedValue)
    ? requestedValue
    : clampNumber(clampedValue, axisBounds.min, axisBounds.max)

  if (!isSafe(centerValue)) {
    return axisBounds
  }

  const findLower = () => {
    if (isSafe(axisBounds.min)) {
      return axisBounds.min
    }

    let unsafeValue = axisBounds.min
    let safeValue = centerValue

    for (let iteration = 0; iteration < 36; iteration += 1) {
      const mid = (unsafeValue + safeValue) / 2

      if (isSafe(mid)) {
        safeValue = mid
      } else {
        unsafeValue = mid
      }
    }

    return safeValue
  }
  const findUpper = () => {
    if (isSafe(axisBounds.max)) {
      return axisBounds.max
    }

    let safeValue = centerValue
    let unsafeValue = axisBounds.max

    for (let iteration = 0; iteration < 36; iteration += 1) {
      const mid = (safeValue + unsafeValue) / 2

      if (isSafe(mid)) {
        safeValue = mid
      } else {
        unsafeValue = mid
      }
    }

    return safeValue
  }

  return clampLayoutAxisRange(
    {
      min: findLower(),
      max: findUpper(),
    },
    axisBounds,
  )
}

function getShapeSafeZoneLayoutSliderRanges(
  layout: Pick<LogoAssetLayout, 'x' | 'y'>,
  selectedDiscTemplate: DiscTemplate,
  shapeFootprint: RenderShapeFootprintPercent,
  axisBounds: LayoutSliderRanges,
): LayoutSliderRanges {
  const clampedPoint = clampShapeToSafeAnnulus(
    layout,
    getInnerNoPrintRadiusPercent(selectedDiscTemplate),
    getSafeZoneRadiusPercent(selectedDiscTemplate),
    shapeFootprint,
  )

  return {
    x: getShapeSafeAxisRange(
      'x',
      layout,
      clampedPoint,
      selectedDiscTemplate,
      shapeFootprint,
      axisBounds.x,
    ),
    y: getShapeSafeAxisRange(
      'y',
      layout,
      clampedPoint,
      selectedDiscTemplate,
      shapeFootprint,
      axisBounds.y,
    ),
  }
}

export function getStraightDiscTextLayoutSliderRanges(
  key: DiscTextKey,
  text: string,
  layout: DiscTextLayout,
  selectedDiscTemplate: DiscTemplate,
  measureText: TextMeasureFunction = measureDiscTextWithBrowserCanvas,
  styles?: DiscTextStyleInput,
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
    styles,
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
  const bounds = getLogoAssetBoundsPercent(imageSize, layout.scale)

  return getSafeZoneLayoutSliderRanges(
    layout,
    selectedDiscTemplate,
    bounds,
    undefined,
    getSafeImageShapeFootprint(imageSize, bounds),
  )
}

export function getTitleArtworkLayoutSliderRanges(
  titleArtwork: Pick<ProjectTitleArtwork, 'imageSize' | 'layout'>,
  selectedDiscTemplate: DiscTemplate,
): LayoutSliderRanges {
  const layout = titleArtwork.layout
  const bounds = getTitleArtworkBoundsPercent(titleArtwork.imageSize, layout.scale)

  return getSafeZoneLayoutSliderRanges(
    layout,
    selectedDiscTemplate,
    bounds,
    undefined,
    getSafeImageShapeFootprint(titleArtwork.imageSize, bounds),
  )
}

export function getAdditionalArtworkLayoutSliderRanges(
  additionalArtworkElement: Pick<ProjectAdditionalArtworkElement, 'imageSize' | 'layout'>,
  selectedDiscTemplate: DiscTemplate,
): LayoutSliderRanges {
  const layout = additionalArtworkElement.layout
  const bounds = getAdditionalArtworkBoundsPercent(
    additionalArtworkElement.imageSize,
    layout.scale,
  )

  return getSafeZoneLayoutSliderRanges(
    layout,
    selectedDiscTemplate,
    bounds,
    undefined,
    getSafeImageShapeFootprint(additionalArtworkElement.imageSize, bounds),
  )
}

export function getRatingBadgeLayoutSliderRanges(
  ratingBadge: RatingBadgeSafeZoneInput,
  selectedDiscTemplate: DiscTemplate,
): LayoutSliderRanges {
  const layout = ratingBadge.layout
  const imageSize = getRatingBadgeSafeImageSize(ratingBadge)
  const bounds = imageSize
    ? getRatingBadgeBoundsPercent(imageSize, layout.scale)
    : getRatingBadgePlaceholderBoundsPercent(layout.scale)

  return getSafeZoneLayoutSliderRanges(
    layout,
    selectedDiscTemplate,
    bounds,
    undefined,
    getSafeImageShapeFootprint(imageSize, bounds),
  )
}

export function getMediaMarkLayoutSliderRanges(
  mediaMark: MediaMarkSafeZoneInput,
  selectedDiscTemplate: DiscTemplate,
): LayoutSliderRanges {
  const layout = mediaMark.layout
  const imageSize = getMediaMarkSafeImageSize(mediaMark)
  const bounds = imageSize
    ? getMediaMarkBoundsPercent(imageSize, layout.scale)
    : getMediaMarkPlaceholderBoundsPercent(layout.scale)

  return getSafeZoneLayoutSliderRanges(
    layout,
    selectedDiscTemplate,
    bounds,
    undefined,
    getSafeImageShapeFootprint(imageSize, bounds),
  )
}

export function getPlatformMarkLayoutSliderRanges(
  platformMark: PlatformMarkSafeZoneInput,
  selectedDiscTemplate: DiscTemplate,
): LayoutSliderRanges {
  const layout = platformMark.layout
  const imageSize = getPlatformMarkSafeImageSize(platformMark)
  const bounds = imageSize
    ? getPlatformMarkBoundsPercent(imageSize, layout.scale)
    : getPlatformMarkPlaceholderBoundsPercent(layout.scale)

  return getSafeZoneLayoutSliderRanges(
    layout,
    selectedDiscTemplate,
    bounds,
    undefined,
    getSafeImageShapeFootprint(imageSize, bounds),
  )
}

export function getTechnicalMarkLayoutSliderRanges(
  technicalMark: TechnicalMarkSafeZoneInput,
  selectedDiscTemplate: DiscTemplate,
): LayoutSliderRanges {
  const layout = technicalMark.layout
  const imageSize = getTechnicalMarkSafeImageSize(technicalMark)
  const bounds = imageSize
    ? getTechnicalMarkBoundsPercent(imageSize, layout.scale)
    : getTechnicalMarkPlaceholderBoundsPercent(layout.scale)

  return getSafeZoneLayoutSliderRanges(
    layout,
    selectedDiscTemplate,
    bounds,
    undefined,
    getSafeImageShapeFootprint(imageSize, bounds),
  )
}

export function clampLogoAssetLayoutToSafeZone(
  layout: LogoAssetLayout,
  selectedDiscTemplate: DiscTemplate,
  imageSize: BackgroundImageSize | null,
): LogoAssetLayout {
  const bounds = getLogoAssetBoundsPercent(imageSize, layout.scale)
  const point = clampLayoutPointToSafeZone(
    layout,
    selectedDiscTemplate,
    bounds,
    getSafeImageShapeFootprint(imageSize, bounds),
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
  const bounds = getTitleArtworkBoundsPercent(imageSize, layout.scale)
  const point = clampLayoutPointToSafeZone(
    layout,
    selectedDiscTemplate,
    bounds,
    getSafeImageShapeFootprint(imageSize, bounds),
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
  const bounds = getAdditionalArtworkBoundsPercent(imageSize, layout.scale)
  const point = clampLayoutPointToSafeZone(
    layout,
    selectedDiscTemplate,
    bounds,
    getSafeImageShapeFootprint(imageSize, bounds),
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
  ratingBadge: RatingBadgeSafeZoneInput,
  selectedDiscTemplate: DiscTemplate,
): RatingBadgeLayout {
  const layout = ratingBadge.layout
  const imageSize = getRatingBadgeSafeImageSize(ratingBadge)
  const bounds = imageSize
    ? getRatingBadgeBoundsPercent(imageSize, layout.scale)
    : getRatingBadgePlaceholderBoundsPercent(layout.scale)
  const point = clampLayoutPointToSafeZone(
    layout,
    selectedDiscTemplate,
    bounds,
    getSafeImageShapeFootprint(imageSize, bounds),
  )

  return {
    ...layout,
    x: point.x,
    y: point.y,
  }
}

export function clampProjectRatingBadgeToSafeZone(
  ratingBadge: ProjectRatingBadge,
  selectedDiscTemplate: DiscTemplate,
  metadata?: Pick<ProjectMetadata, 'ratingSystem' | 'ratingValue'> | null,
): ProjectRatingBadge {
  return {
    ...ratingBadge,
    layout: clampRatingBadgeLayoutToSafeZone(
      {
        ...ratingBadge,
        metadata,
      },
      selectedDiscTemplate,
    ),
    uskBadge: {
      ...ratingBadge.uskBadge,
      layout: clampRatingBadgeLayoutToSafeZone(
        {
          source: 'placeholder',
          customImageSize: null,
          layout: ratingBadge.uskBadge.layout,
          metadata: {
            ratingSystem: 'USK',
            ratingValue: ratingBadge.uskBadge.ratingValue,
          },
        },
        selectedDiscTemplate,
      ),
    },
  }
}

export function clampMediaMarkLayoutToSafeZone(
  mediaMark: MediaMarkSafeZoneInput,
  selectedDiscTemplate: DiscTemplate,
): MediaMarkLayout {
  const layout = mediaMark.layout
  const imageSize = getMediaMarkSafeImageSize(mediaMark)
  const bounds = imageSize
    ? getMediaMarkBoundsPercent(imageSize, layout.scale)
    : getMediaMarkPlaceholderBoundsPercent(layout.scale)
  const point = clampLayoutPointToSafeZone(
    layout,
    selectedDiscTemplate,
    bounds,
    getSafeImageShapeFootprint(imageSize, bounds),
  )

  return {
    ...layout,
    x: point.x,
    y: point.y,
  }
}

export function clampPlatformMarkLayoutToSafeZone(
  platformMark: PlatformMarkSafeZoneInput,
  selectedDiscTemplate: DiscTemplate,
): PlatformMarkLayout {
  const layout = platformMark.layout
  const imageSize = getPlatformMarkSafeImageSize(platformMark)
  const bounds = imageSize
    ? getPlatformMarkBoundsPercent(imageSize, layout.scale)
    : getPlatformMarkPlaceholderBoundsPercent(layout.scale)
  const point = clampLayoutPointToSafeZone(
    layout,
    selectedDiscTemplate,
    bounds,
    getSafeImageShapeFootprint(imageSize, bounds),
  )

  return {
    ...layout,
    x: point.x,
    y: point.y,
  }
}

export function clampTechnicalMarkLayoutToSafeZone(
  technicalMark: TechnicalMarkSafeZoneInput,
  selectedDiscTemplate: DiscTemplate,
): TechnicalMarkLayout {
  const layout = technicalMark.layout
  const imageSize = getTechnicalMarkSafeImageSize(technicalMark)
  const bounds = imageSize
    ? getTechnicalMarkBoundsPercent(imageSize, layout.scale)
    : getTechnicalMarkPlaceholderBoundsPercent(layout.scale)
  const point = clampLayoutPointToSafeZone(
    layout,
    selectedDiscTemplate,
    bounds,
    getSafeImageShapeFootprint(imageSize, bounds),
  )

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
              layout: clampPlatformMarkLayoutToSafeZone(
                { ...asset, value },
                selectedDiscTemplate,
              ),
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
  const additionalAssets = Object.fromEntries(
    Object.entries(technicalMarks.additionalAssets ?? {}).map(([value, assets]) => {
      const technicalValue = value as TechnicalMarkValue

      return [
        technicalValue,
        assets.map((asset) => ({
          ...asset,
          layout: clampTechnicalMarkLayoutToSafeZone(
            { ...asset, value: technicalValue },
            selectedDiscTemplate,
          ),
        })),
      ]
    }),
  ) as ProjectTechnicalMarks['additionalAssets']

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
              layout: clampTechnicalMarkLayoutToSafeZone(
                { ...asset, value },
                selectedDiscTemplate,
              ),
            },
          ]
        }),
      ),
    } as ProjectTechnicalMarks['assets'],
    additionalAssets,
  }
}

export function clampStraightDiscTextLayoutToSafeZone(
  key: DiscTextKey,
  layout: DiscTextLayout,
  selectedDiscTemplate: DiscTemplate,
  text?: string,
  measureText?: TextMeasureFunction,
  styles?: DiscTextStyleInput,
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
          styles,
        )
      : getMeasuredStraightTextVisualBounds(key, layout, measureText, styles)
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
