import {
  DISC_TEXT_KEYS,
  type DiscTextKey,
  type DiscTextLayout,
  type DiscTextLayoutSettings,
} from '../discText'
import {
  DISC_LAYOUT_CENTER_PERCENT,
  clampLayoutPointToSafeZone,
  getLogoAssetBoundsPercent,
  getMediaMarkBoundsPercent,
  getMediaMarkPlaceholderBoundsPercent,
  getPlatformMarkBoundsPercent,
  getPlatformMarkPlaceholderBoundsPercent,
  getRatingBadgeBoundsPercent,
  getRatingBadgePlaceholderBoundsPercent,
  getStraightDiscTextBoundsPercent,
} from '../discGeometry'
import { createDefaultProjectPlatformMarkAsset } from '../project/projectMediaMark'
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

function getRenderedStraightTextVisualBounds(
  key: DiscTextKey,
  layout: DiscTextLayout,
): TextVisualBoundsPercent {
  const fallbackBounds = getFallbackTextVisualBounds(key, layout)

  if (typeof document === 'undefined') {
    return fallbackBounds
  }

  const textElements = Array.from(
    document.querySelectorAll<SVGGraphicsElement>(
      `.disc-text-render-text[data-disc-text-key="${key}"]`,
    ),
  )

  if (textElements.length === 0) {
    return fallbackBounds
  }

  let left = Number.POSITIVE_INFINITY
  let right = Number.NEGATIVE_INFINITY
  let top = Number.POSITIVE_INFINITY
  let bottom = Number.NEGATIVE_INFINITY

  for (const textElement of textElements) {
    try {
      const box = textElement.getBBox()

      if (box.width <= 0 || box.height <= 0) {
        continue
      }

      left = Math.min(left, box.x)
      right = Math.max(right, box.x + box.width)
      top = Math.min(top, box.y)
      bottom = Math.max(bottom, box.y + box.height)
    } catch {
      return fallbackBounds
    }
  }

  if (
    !Number.isFinite(left) ||
    !Number.isFinite(right) ||
    !Number.isFinite(top) ||
    !Number.isFinite(bottom)
  ) {
    return fallbackBounds
  }

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
): DiscTextLayout {
  if (layout.mode !== 'straight') {
    return layout
  }

  const layoutAnchor = {
    x: DISC_LAYOUT_CENTER_PERCENT + layout.x,
    y: layout.y,
  }
  const visualBounds = getRenderedStraightTextVisualBounds(key, layout)
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
