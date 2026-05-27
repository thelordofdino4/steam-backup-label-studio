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

  const point = clampLayoutPointToSafeZone(
    {
      x: DISC_LAYOUT_CENTER_PERCENT + layout.x,
      y: layout.y,
    },
    selectedDiscTemplate,
    getStraightDiscTextBoundsPercent(key, layout),
  )

  return {
    ...layout,
    x: point.x - DISC_LAYOUT_CENTER_PERCENT,
    y: point.y,
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
