import type { DiscTextKey, DiscTextLayout } from '../discText/types'
import { DISC_TEXT_RENDER_STYLES } from '../discText/styles.ts'
import { getResolvedDiscTextFontSizePercent } from '../discText/pointSize.ts'
import { getImageContentSize } from '../image/imageContentBounds.ts'
import type {
  NaturalSize,
  RenderBoundsPercent,
} from './geometryTypes.ts'

export const LOGO_BASE_WIDTH_RATIO = 0.18
export const LOGO_MAX_HEIGHT_RATIO = 0.1
export const TITLE_ARTWORK_BASE_WIDTH_RATIO = 0.38
export const TITLE_ARTWORK_MAX_HEIGHT_RATIO = 0.16
export const ADDITIONAL_ARTWORK_BASE_WIDTH_RATIO = 0.32
export const ADDITIONAL_ARTWORK_MAX_HEIGHT_RATIO = 0.32
export const RATING_BADGE_BASE_WIDTH_RATIO = 0.09
export const RATING_BADGE_BASE_HEIGHT_RATIO = 0.13
export const MEDIA_MARK_BASE_WIDTH_RATIO = 0.13
export const MEDIA_MARK_BASE_HEIGHT_RATIO = 0.08
export const PLATFORM_MARK_BASE_WIDTH_RATIO = 0.12
export const PLATFORM_MARK_BASE_HEIGHT_RATIO = 0.08
export const TECHNICAL_MARK_BASE_WIDTH_RATIO = 0.13
export const TECHNICAL_MARK_BASE_HEIGHT_RATIO = 0.08

export function getContainedAssetBoundsPercent(
  naturalSize: NaturalSize,
  baseWidthRatio: number,
  maxHeightRatio: number,
  scale: number,
): RenderBoundsPercent {
  const maxWidthPercent = baseWidthRatio * 100 * scale
  const maxHeightPercent = maxHeightRatio * 100 * scale

  if (!naturalSize) {
    return {
      halfWidth: maxWidthPercent / 2,
      halfHeight: maxHeightPercent / 2,
    }
  }

  const contentSize = getImageContentSize(naturalSize)

  if (!contentSize) {
    return {
      halfWidth: 0,
      halfHeight: 0,
    }
  }

  const aspectRatio = contentSize.width / contentSize.height
  let widthPercent = maxWidthPercent
  let heightPercent = widthPercent / aspectRatio

  if (heightPercent > maxHeightPercent) {
    heightPercent = maxHeightPercent
    widthPercent = heightPercent * aspectRatio
  }

  return {
    halfWidth: widthPercent / 2,
    halfHeight: heightPercent / 2,
  }
}

export function getLogoAssetBoundsPercent(naturalSize: NaturalSize, scale: number) {
  return getContainedAssetBoundsPercent(
    naturalSize,
    LOGO_BASE_WIDTH_RATIO,
    LOGO_MAX_HEIGHT_RATIO,
    scale,
  )
}

export function getTitleArtworkBoundsPercent(naturalSize: NaturalSize, scale: number) {
  return getContainedAssetBoundsPercent(
    naturalSize,
    TITLE_ARTWORK_BASE_WIDTH_RATIO,
    TITLE_ARTWORK_MAX_HEIGHT_RATIO,
    scale,
  )
}

export function getAdditionalArtworkBoundsPercent(naturalSize: NaturalSize, scale: number) {
  return getContainedAssetBoundsPercent(
    naturalSize,
    ADDITIONAL_ARTWORK_BASE_WIDTH_RATIO,
    ADDITIONAL_ARTWORK_MAX_HEIGHT_RATIO,
    scale,
  )
}

export function getRatingBadgeBoundsPercent(naturalSize: NaturalSize, scale: number) {
  return getContainedAssetBoundsPercent(
    naturalSize,
    RATING_BADGE_BASE_WIDTH_RATIO,
    RATING_BADGE_BASE_HEIGHT_RATIO,
    scale,
  )
}

export function getRatingBadgePlaceholderBoundsPercent(scale: number): RenderBoundsPercent {
  return {
    halfWidth: (RATING_BADGE_BASE_WIDTH_RATIO * 100 * scale) / 2,
    halfHeight: (RATING_BADGE_BASE_HEIGHT_RATIO * 100 * scale) / 2,
  }
}

export function getMediaMarkBoundsPercent(naturalSize: NaturalSize, scale: number) {
  return getContainedAssetBoundsPercent(
    naturalSize,
    MEDIA_MARK_BASE_WIDTH_RATIO,
    MEDIA_MARK_BASE_HEIGHT_RATIO,
    scale,
  )
}

export function getMediaMarkPlaceholderBoundsPercent(scale: number): RenderBoundsPercent {
  return {
    halfWidth: (MEDIA_MARK_BASE_WIDTH_RATIO * 100 * scale) / 2,
    halfHeight: (MEDIA_MARK_BASE_HEIGHT_RATIO * 100 * scale) / 2,
  }
}

export function getPlatformMarkBoundsPercent(naturalSize: NaturalSize, scale: number) {
  return getContainedAssetBoundsPercent(
    naturalSize,
    PLATFORM_MARK_BASE_WIDTH_RATIO,
    PLATFORM_MARK_BASE_HEIGHT_RATIO,
    scale,
  )
}

export function getPlatformMarkPlaceholderBoundsPercent(scale: number): RenderBoundsPercent {
  return {
    halfWidth: (PLATFORM_MARK_BASE_WIDTH_RATIO * 100 * scale) / 2,
    halfHeight: (PLATFORM_MARK_BASE_HEIGHT_RATIO * 100 * scale) / 2,
  }
}

export function getTechnicalMarkBoundsPercent(naturalSize: NaturalSize, scale: number) {
  return getContainedAssetBoundsPercent(
    naturalSize,
    TECHNICAL_MARK_BASE_WIDTH_RATIO,
    TECHNICAL_MARK_BASE_HEIGHT_RATIO,
    scale,
  )
}

export function getTechnicalMarkPlaceholderBoundsPercent(scale: number): RenderBoundsPercent {
  return {
    halfWidth: (TECHNICAL_MARK_BASE_WIDTH_RATIO * 100 * scale) / 2,
    halfHeight: (TECHNICAL_MARK_BASE_HEIGHT_RATIO * 100 * scale) / 2,
  }
}

export function getStraightDiscTextBoundsPercent(
  key: DiscTextKey,
  layout: DiscTextLayout,
): RenderBoundsPercent {
  const renderStyle = DISC_TEXT_RENDER_STYLES[key]
  const width = Number.isFinite(layout.width) ? Math.max(0, layout.width) : 0
  const lineHeight = getResolvedDiscTextFontSizePercent(layout, key) * 1.18

  return {
    halfWidth: width / 2,
    halfHeight: (lineHeight * renderStyle.maxLines) / 2,
  }
}
