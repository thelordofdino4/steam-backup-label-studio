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
import {
  getDiscTextFontString,
  type TextMeasureFunction,
} from '../discTextRenderLayout'
import { DISC_TEXT_RENDER_STYLES } from '../discTextStyles'
import { measureDiscTextWithBrowserCanvas } from '../discTextSvgLayer'
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

function getStraightTextAnchorX(layout: DiscTextLayout) {
  const centerX = DISC_LAYOUT_CENTER_PERCENT + layout.x

  if (layout.align === 'left') {
    return centerX - layout.width / 2
  }

  if (layout.align === 'right') {
    return centerX + layout.width / 2
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
  const x = getStraightTextAnchorX(layout)
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
  const visualBounds = getMeasuredStraightTextVisualBounds(key, layout)
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
