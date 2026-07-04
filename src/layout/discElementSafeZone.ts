import { DISC_TEXT_KEYS } from '../discText/constants.ts'
import type { DiscTextKey, DiscTextLayout, DiscTextLayoutSettings } from '../discText/types'
import {
  DISC_LAYOUT_CENTER_PERCENT,
  clampLayoutPointToSafeZone,
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
  type RenderBoundsPercent,
  type RenderShapeFootprintPercent,
} from '../disc/geometry.ts'
import {
  type LayoutAxisRange as SharedLayoutAxisRange,
  type LayoutSliderRanges as SharedLayoutSliderRanges,
} from './layoutRangeMath.ts'
import {
  clampDiscSafeZoneLayoutAxisRange,
  constrainDiscAxisRangeToInnerNoPrintSide,
  getDiscSafeAxisHalfTravel,
  getRectSafeZoneLayoutSliderRanges,
  getShapeSafeZoneLayoutSliderRanges,
} from './discSafeZoneRangeMath.ts'
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
import { getResolvedDiscTextFontSizePercent } from '../discText/pointSize.ts'
import { measureDiscTextWithBrowserCanvas } from '../discText/svgLayer.ts'
import { DISC_TEXT_KEY_ATTRIBUTE } from '../editor/previewEditableRegistry.ts'
import { createDefaultProjectPlatformMarkAsset } from '../project/projectPlatformMarks.ts'
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
  ProjectMetadata,
  ProjectPlatformMarks,
  ProjectRatingBadge,
  ProjectTechnicalMarks,
  ProjectTitleArtwork,
  RatingBadgeLayout,
  TechnicalMarkLayout,
  TechnicalMarkValue,
  TitleArtworkLayout,
} from '../project/projectTypes'
import type { DiscTemplate } from '../types/template'
import {
  getMediaMarkSafeImageSize,
  getPlatformMarkSafeImageSize,
  getRatingBadgeSafeImageSize,
  getSafeImageShapeFootprint,
  getTechnicalMarkSafeImageSize,
  type MediaMarkSafeZoneInput,
  type PlatformMarkSafeZoneInput,
  type RatingBadgeSafeZoneInput,
  type TechnicalMarkSafeZoneInput,
} from './discElementSafeZoneImageSizing.ts'

type TextVisualBoundsPercent = {
  centerOffsetX: number
  centerOffsetY: number
  halfWidth: number
  halfHeight: number
}

type SafeZoneLayoutPoint = {
  x: number
  y: number
}

type SafeZoneMarkLayout = SafeZoneLayoutPoint & {
  scale: number
}

type SafeZoneMarkInput<TLayout extends SafeZoneMarkLayout> = {
  layout: TLayout
}

export type LayoutAxisRange = SharedLayoutAxisRange

export type LayoutSliderRanges = SharedLayoutSliderRanges

export type StraightDiscTextLayoutSliderRanges = LayoutSliderRanges

const STRAIGHT_DISC_TEXT_LAYOUT_X_RANGE: LayoutAxisRange = { min: -50, max: 50 }
const STRAIGHT_DISC_TEXT_LAYOUT_Y_RANGE: LayoutAxisRange = { min: 0, max: 100 }
const SAFE_ZONE_LAYOUT_X_RANGE: LayoutAxisRange = { min: 0, max: 100 }
const SAFE_ZONE_LAYOUT_Y_RANGE: LayoutAxisRange = { min: 0, max: 100 }

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
      `.disc-text-render-text[${DISC_TEXT_KEY_ATTRIBUTE}="${key}"]`,
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
  template?: DiscTemplate,
): TextVisualBoundsPercent {
  const lines = getRenderedStraightTextLines(key)

  if (lines.length === 0) {
    return getFallbackTextVisualBounds(key, layout)
  }

  const renderStyle = getResolvedDiscTextRenderStyle(key, styles)
  const fontSize = getResolvedDiscTextFontSizePercent(layout, key, template)
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
  template?: DiscTemplate,
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
    { template },
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

  return getRectSafeZoneLayoutSliderRanges(
    layout,
    selectedDiscTemplate,
    bounds,
    axisBounds,
  )
}

function clampLayoutWithSafeZonePoint<TLayout extends SafeZoneLayoutPoint>(
  layout: TLayout,
  selectedDiscTemplate: DiscTemplate,
  bounds: RenderBoundsPercent,
  shapeFootprint?: RenderShapeFootprintPercent | null,
): TLayout {
  const point = clampLayoutPointToSafeZone(
    layout,
    selectedDiscTemplate,
    bounds,
    shapeFootprint,
  )

  return {
    ...layout,
    x: point.x,
    y: point.y,
  }
}

function getSafeZoneMarkBounds<TInput extends SafeZoneMarkInput<SafeZoneMarkLayout>>(
  mark: TInput,
  getImageSize: (mark: TInput) => BackgroundImageSize | null,
  getImageBounds: (
    imageSize: BackgroundImageSize,
    scale: number,
  ) => RenderBoundsPercent,
  getPlaceholderBounds: (scale: number) => RenderBoundsPercent,
) {
  const imageSize = getImageSize(mark)
  const bounds = imageSize
    ? getImageBounds(imageSize, mark.layout.scale)
    : getPlaceholderBounds(mark.layout.scale)

  return { imageSize, bounds }
}

function getSafeZoneMarkLayoutSliderRanges<
  TInput extends SafeZoneMarkInput<SafeZoneMarkLayout>,
>(
  mark: TInput,
  selectedDiscTemplate: DiscTemplate,
  getImageSize: (mark: TInput) => BackgroundImageSize | null,
  getImageBounds: (
    imageSize: BackgroundImageSize,
    scale: number,
  ) => RenderBoundsPercent,
  getPlaceholderBounds: (scale: number) => RenderBoundsPercent,
): LayoutSliderRanges {
  const { imageSize, bounds } = getSafeZoneMarkBounds(
    mark,
    getImageSize,
    getImageBounds,
    getPlaceholderBounds,
  )

  return getSafeZoneLayoutSliderRanges(
    mark.layout,
    selectedDiscTemplate,
    bounds,
    undefined,
    getSafeImageShapeFootprint(imageSize, bounds),
  )
}

function clampSafeZoneMarkLayout<
  TLayout extends SafeZoneMarkLayout,
  TInput extends SafeZoneMarkInput<TLayout>,
>(
  mark: TInput,
  selectedDiscTemplate: DiscTemplate,
  getImageSize: (mark: TInput) => BackgroundImageSize | null,
  getImageBounds: (
    imageSize: BackgroundImageSize,
    scale: number,
  ) => RenderBoundsPercent,
  getPlaceholderBounds: (scale: number) => RenderBoundsPercent,
): TLayout {
  const { imageSize, bounds } = getSafeZoneMarkBounds(
    mark,
    getImageSize,
    getImageBounds,
    getPlaceholderBounds,
  )

  return clampLayoutWithSafeZonePoint(
    mark.layout,
    selectedDiscTemplate,
    bounds,
    getSafeImageShapeFootprint(imageSize, bounds),
  )
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
    selectedDiscTemplate,
  )
  const visualCenter = {
    x: DISC_LAYOUT_CENTER_PERCENT + layout.x + visualBounds.centerOffsetX,
    y: layout.y + visualBounds.centerOffsetY,
  }
  const visualDeltaX = visualCenter.x - DISC_LAYOUT_CENTER_PERCENT
  const visualDeltaY = visualCenter.y - DISC_LAYOUT_CENTER_PERCENT
  const xHalfTravel = getDiscSafeAxisHalfTravel(
    safeZoneRadius,
    visualDeltaY,
    visualBounds.halfHeight,
    visualBounds.halfWidth,
  )
  const yHalfTravel = getDiscSafeAxisHalfTravel(
    safeZoneRadius,
    visualDeltaX,
    visualBounds.halfWidth,
    visualBounds.halfHeight,
  )

  const outerRanges = {
    x: clampDiscSafeZoneLayoutAxisRange(
      {
        min: -xHalfTravel - visualBounds.centerOffsetX,
        max: xHalfTravel - visualBounds.centerOffsetX,
      },
      STRAIGHT_DISC_TEXT_LAYOUT_X_RANGE,
    ),
    y: clampDiscSafeZoneLayoutAxisRange(
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
    x: constrainDiscAxisRangeToInnerNoPrintSide(
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
    y: constrainDiscAxisRangeToInnerNoPrintSide(
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
  return getSafeZoneMarkLayoutSliderRanges(
    ratingBadge,
    selectedDiscTemplate,
    getRatingBadgeSafeImageSize,
    getRatingBadgeBoundsPercent,
    getRatingBadgePlaceholderBoundsPercent,
  )
}

export function getMediaMarkLayoutSliderRanges(
  mediaMark: MediaMarkSafeZoneInput,
  selectedDiscTemplate: DiscTemplate,
): LayoutSliderRanges {
  return getSafeZoneMarkLayoutSliderRanges(
    mediaMark,
    selectedDiscTemplate,
    getMediaMarkSafeImageSize,
    getMediaMarkBoundsPercent,
    getMediaMarkPlaceholderBoundsPercent,
  )
}

export function getPlatformMarkLayoutSliderRanges(
  platformMark: PlatformMarkSafeZoneInput,
  selectedDiscTemplate: DiscTemplate,
): LayoutSliderRanges {
  return getSafeZoneMarkLayoutSliderRanges(
    platformMark,
    selectedDiscTemplate,
    getPlatformMarkSafeImageSize,
    getPlatformMarkBoundsPercent,
    getPlatformMarkPlaceholderBoundsPercent,
  )
}

export function getTechnicalMarkLayoutSliderRanges(
  technicalMark: TechnicalMarkSafeZoneInput,
  selectedDiscTemplate: DiscTemplate,
): LayoutSliderRanges {
  return getSafeZoneMarkLayoutSliderRanges(
    technicalMark,
    selectedDiscTemplate,
    getTechnicalMarkSafeImageSize,
    getTechnicalMarkBoundsPercent,
    getTechnicalMarkPlaceholderBoundsPercent,
  )
}

export function clampLogoAssetLayoutToSafeZone(
  layout: LogoAssetLayout,
  selectedDiscTemplate: DiscTemplate,
  imageSize: BackgroundImageSize | null,
): LogoAssetLayout {
  const bounds = getLogoAssetBoundsPercent(imageSize, layout.scale)

  return clampLayoutWithSafeZonePoint(
    layout,
    selectedDiscTemplate,
    bounds,
    getSafeImageShapeFootprint(imageSize, bounds),
  )
}

export function clampTitleArtworkLayoutToSafeZone(
  layout: TitleArtworkLayout,
  selectedDiscTemplate: DiscTemplate,
  imageSize: BackgroundImageSize | null,
): TitleArtworkLayout {
  const bounds = getTitleArtworkBoundsPercent(imageSize, layout.scale)

  return clampLayoutWithSafeZonePoint(
    layout,
    selectedDiscTemplate,
    bounds,
    getSafeImageShapeFootprint(imageSize, bounds),
  )
}

export function clampAdditionalArtworkElementLayoutToSafeZone(
  layout: AdditionalArtworkLayout,
  selectedDiscTemplate: DiscTemplate,
  imageSize: BackgroundImageSize | null,
): AdditionalArtworkLayout {
  const bounds = getAdditionalArtworkBoundsPercent(imageSize, layout.scale)

  return clampLayoutWithSafeZonePoint(
    layout,
    selectedDiscTemplate,
    bounds,
    getSafeImageShapeFootprint(imageSize, bounds),
  )
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
  return clampSafeZoneMarkLayout(
    ratingBadge,
    selectedDiscTemplate,
    getRatingBadgeSafeImageSize,
    getRatingBadgeBoundsPercent,
    getRatingBadgePlaceholderBoundsPercent,
  )
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
  return clampSafeZoneMarkLayout(
    mediaMark,
    selectedDiscTemplate,
    getMediaMarkSafeImageSize,
    getMediaMarkBoundsPercent,
    getMediaMarkPlaceholderBoundsPercent,
  )
}

export function clampPlatformMarkLayoutToSafeZone(
  platformMark: PlatformMarkSafeZoneInput,
  selectedDiscTemplate: DiscTemplate,
): PlatformMarkLayout {
  return clampSafeZoneMarkLayout(
    platformMark,
    selectedDiscTemplate,
    getPlatformMarkSafeImageSize,
    getPlatformMarkBoundsPercent,
    getPlatformMarkPlaceholderBoundsPercent,
  )
}

export function clampTechnicalMarkLayoutToSafeZone(
  technicalMark: TechnicalMarkSafeZoneInput,
  selectedDiscTemplate: DiscTemplate,
): TechnicalMarkLayout {
  return clampSafeZoneMarkLayout(
    technicalMark,
    selectedDiscTemplate,
    getTechnicalMarkSafeImageSize,
    getTechnicalMarkBoundsPercent,
    getTechnicalMarkPlaceholderBoundsPercent,
  )
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
          selectedDiscTemplate,
        )
      : getMeasuredStraightTextVisualBounds(
          key,
          layout,
          measureText,
          styles,
          selectedDiscTemplate,
        )
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
