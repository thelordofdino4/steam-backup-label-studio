import assert from 'node:assert/strict'
import test from 'node:test'
import {
  clampLogoAssetLayoutToSafeZone,
  clampMediaMarkLayoutToSafeZone,
  clampPlatformMarkLayoutToSafeZone,
  clampProjectLogoAssetsToSafeZone,
  clampRatingBadgeLayoutToSafeZone,
  clampStraightDiscTextLayoutToSafeZone,
  clampTechnicalMarkLayoutToSafeZone,
  getRatingBadgeLayoutSliderRanges,
  getStraightDiscTextLayoutSliderRanges,
} from './discElementSafeZone.ts'
import { discTemplates } from '../templates/discTemplates.ts'
import {
  DISC_LAYOUT_CENTER_PERCENT,
  buildCustomDiscTemplate,
  getInnerNoPrintRadiusPercent,
  getLogoAssetBoundsPercent,
  getMediaMarkPlaceholderBoundsPercent,
  getPlatformMarkPlaceholderBoundsPercent,
  getRatingBadgeBoundsPercent,
  getRatingBadgePlaceholderBoundsPercent,
  getTechnicalMarkPlaceholderBoundsPercent,
  type RenderBoundsPercent,
} from '../disc/geometry.ts'
import {
  getStraightDiscTextRenderLayout,
  getStraightDiscTextVisualBounds,
} from '../discText/renderLayout.ts'
import type { DiscTextLayout } from '../discText/index.ts'
import type {
  LogoAssetLayout,
  MediaMarkLayout,
  PlatformMarkLayout,
  RatingBadgeLayout,
  TechnicalMarkLayout,
} from '../project/projectTypes.ts'
import {
  addAdditionalLogoAsset,
  createDefaultProjectLogoAssets,
} from '../project/projectLogoAssets.ts'
import type { DiscTemplate } from '../types/template.ts'

function assertApproximatelyEqual(actual: number, expected: number) {
  assert.ok(
    Math.abs(actual - expected) < 0.000001,
    `Expected ${actual} to approximately equal ${expected}`,
  )
}

function measureText(text: string, font: string) {
  const fontSizeMatch = font.match(/(\d+(?:\.\d+)?)px/)
  const fontSize = fontSizeMatch ? Number(fontSizeMatch[1]) : 1

  return text.length * fontSize * 0.55
}

function titleLayout(layout: Partial<DiscTextLayout> = {}): DiscTextLayout {
  return {
    x: 0,
    y: 50,
    width: 80,
    scale: 1,
    align: 'center',
    mode: 'straight',
    arcDegrees: 210,
    arcSide: 'bottom',
    avoidVisualElements: false,
    ...layout,
  }
}

function artworkLayout(
  layout: Partial<LogoAssetLayout> = {},
): LogoAssetLayout {
  return {
    enabled: true,
    x: 50,
    y: 50,
    scale: 1,
    ...layout,
  }
}

function getRectInnerClearance(
  point: { x: number; y: number },
  bounds: RenderBoundsPercent,
  template: DiscTemplate,
) {
  const deltaX = point.x - DISC_LAYOUT_CENTER_PERCENT
  const deltaY = point.y - DISC_LAYOUT_CENTER_PERCENT
  const nearestX = Math.max(0, Math.abs(deltaX) - bounds.halfWidth)
  const nearestY = Math.max(0, Math.abs(deltaY) - bounds.halfHeight)

  return Math.hypot(nearestX, nearestY) - getInnerNoPrintRadiusPercent(template)
}

function assertRectAvoidsInnerNoPrintArea(
  point: { x: number; y: number },
  bounds: RenderBoundsPercent,
  template: DiscTemplate,
) {
  assert.ok(
    getRectInnerClearance(point, bounds, template) >= -0.000001,
    `Expected ${JSON.stringify(point)} with ${JSON.stringify(bounds)} to avoid inner no-print radius ${getInnerNoPrintRadiusPercent(template)}`,
  )
}

test('movable artwork clamps out of the standard inner no-print area', () => {
  const template = discTemplates.standardPrintableDisc
  const logo = clampLogoAssetLayoutToSafeZone(artworkLayout(), template, null)
  const ratingBadge = {
    source: 'placeholder' as const,
    customImageSize: null,
    layout: artworkLayout() as RatingBadgeLayout,
  }
  const rating = clampRatingBadgeLayoutToSafeZone(ratingBadge, template)
  const mediaMark = {
    source: 'placeholder' as const,
    customImageSize: null,
    layout: artworkLayout() as MediaMarkLayout,
  }
  const media = clampMediaMarkLayoutToSafeZone(mediaMark, template)
  const platformMark = {
    source: 'placeholder' as const,
    customImageSize: null,
    layout: artworkLayout() as PlatformMarkLayout,
  }
  const platform = clampPlatformMarkLayoutToSafeZone(platformMark, template)
  const technicalMark = {
    source: 'placeholder' as const,
    customImageSize: null,
    layout: artworkLayout() as TechnicalMarkLayout,
  }
  const technical = clampTechnicalMarkLayoutToSafeZone(technicalMark, template)

  assertRectAvoidsInnerNoPrintArea(
    logo,
    getLogoAssetBoundsPercent(null, logo.scale),
    template,
  )
  assertRectAvoidsInnerNoPrintArea(
    rating,
    getRatingBadgePlaceholderBoundsPercent(rating.scale),
    template,
  )
  assertRectAvoidsInnerNoPrintArea(
    media,
    getMediaMarkPlaceholderBoundsPercent(media.scale),
    template,
  )
  assertRectAvoidsInnerNoPrintArea(
    platform,
    getPlatformMarkPlaceholderBoundsPercent(platform.scale),
    template,
  )
  assertRectAvoidsInnerNoPrintArea(
    technical,
    getTechnicalMarkPlaceholderBoundsPercent(technical.scale),
    template,
  )
})

test('project logo safe-zone clamp includes additional logos', () => {
  const template = discTemplates.standardPrintableDisc
  const logoAssets = addAdditionalLogoAsset(
    {
      ...createDefaultProjectLogoAssets(template),
      developerLogoLayout: artworkLayout({ x: 22, y: 62 }),
    },
    'developer',
    template,
  )
  const additionalLogoId = logoAssets.additionalDeveloperLogos[0]!.id
  const clampedLogoAssets = clampProjectLogoAssetsToSafeZone(
    {
      ...logoAssets,
      additionalDeveloperLogos: logoAssets.additionalDeveloperLogos.map((logoAsset) =>
        logoAsset.id === additionalLogoId
          ? {
              ...logoAsset,
              layout: artworkLayout({ x: 50, y: 50 }),
            }
          : logoAsset,
      ),
    },
    template,
  )
  const additionalLogo = clampedLogoAssets.additionalDeveloperLogos[0]!

  assertRectAvoidsInnerNoPrintArea(
    additionalLogo.layout,
    getLogoAssetBoundsPercent(null, additionalLogo.layout.scale),
    template,
  )
})

test('rating badge placeholder and custom image clamps avoid the inner no-print area', () => {
  const template = discTemplates.standardPrintableDisc
  const placeholderBadge = {
    source: 'placeholder' as const,
    customImageSize: null,
    layout: artworkLayout() as RatingBadgeLayout,
  }
  const customBadge = {
    source: 'custom' as const,
    customImageSize: { width: 220, height: 80 },
    layout: artworkLayout() as RatingBadgeLayout,
  }
  const placeholder = clampRatingBadgeLayoutToSafeZone(placeholderBadge, template)
  const custom = clampRatingBadgeLayoutToSafeZone(customBadge, template)

  assertRectAvoidsInnerNoPrintArea(
    placeholder,
    getRatingBadgePlaceholderBoundsPercent(placeholder.scale),
    template,
  )
  assertRectAvoidsInnerNoPrintArea(
    custom,
    getRatingBadgeBoundsPercent(customBadge.customImageSize, custom.scale),
    template,
  )
})

test('straight text clamps out of the inner no-print area', () => {
  const template = discTemplates.standardPrintableDisc
  const clamped = clampStraightDiscTextLayoutToSafeZone(
    'title',
    titleLayout({ width: 44 }),
    template,
    'CENTER TITLE',
    measureText,
  )
  const renderLayout = getStraightDiscTextRenderLayout(
    'title',
    'CENTER TITLE',
    clamped,
    measureText,
  )
  const visualBounds = getStraightDiscTextVisualBounds(renderLayout, measureText)

  assertRectAvoidsInnerNoPrintArea(
    { x: visualBounds.centerX, y: visualBounds.centerY },
    { halfWidth: visualBounds.halfWidth, halfHeight: visualBounds.halfHeight },
    template,
  )
})

test('rating badge slider range excludes center-hub positions when the fixed axis crosses the hub', () => {
  const template = discTemplates.standardPrintableDisc
  const badge = {
    source: 'placeholder' as const,
    customImageSize: null,
    layout: artworkLayout({ x: 78, y: 50 }) as RatingBadgeLayout,
  }
  const ranges = getRatingBadgeLayoutSliderRanges(badge, template)
  const bounds = getRatingBadgePlaceholderBoundsPercent(badge.layout.scale)

  assert.ok(ranges.x.min > DISC_LAYOUT_CENTER_PERCENT)
  assertRectAvoidsInnerNoPrintArea(
    { x: ranges.x.min, y: badge.layout.y },
    bounds,
    template,
  )
  assertRectAvoidsInnerNoPrintArea(
    { x: ranges.x.max, y: badge.layout.y },
    bounds,
    template,
  )
})

test('straight text slider range excludes center-hub positions when the fixed axis crosses the hub', () => {
  const template = discTemplates.standardPrintableDisc
  const text = 'CENTER TITLE'
  const clamped = clampStraightDiscTextLayoutToSafeZone(
    'title',
    titleLayout({ width: 44 }),
    template,
    text,
    measureText,
  )
  const ranges = getStraightDiscTextLayoutSliderRanges(
    'title',
    text,
    clamped,
    template,
    measureText,
  )
  const sliderLayout = {
    ...clamped,
    y: ranges.y.min,
  }
  const renderLayout = getStraightDiscTextRenderLayout(
    'title',
    text,
    sliderLayout,
    measureText,
  )
  const visualBounds = getStraightDiscTextVisualBounds(renderLayout, measureText)

  assert.ok(ranges.y.min > DISC_LAYOUT_CENTER_PERCENT)
  assertRectAvoidsInnerNoPrintArea(
    { x: visualBounds.centerX, y: visualBounds.centerY },
    { halfWidth: visualBounds.halfWidth, halfHeight: visualBounds.halfHeight },
    template,
  )
})

test('custom inner print boundary expands the exclusion region', () => {
  const standardTemplate = discTemplates.standardPrintableDisc
  const customTemplate = buildCustomDiscTemplate(standardTemplate, {
    innerHoleDiameterMm: 60,
  })
  const badge = {
    source: 'placeholder' as const,
    customImageSize: null,
    layout: artworkLayout() as RatingBadgeLayout,
  }
  const standard = clampRatingBadgeLayoutToSafeZone(badge, standardTemplate)
  const custom = clampRatingBadgeLayoutToSafeZone(badge, customTemplate)
  const standardDistance = Math.hypot(
    standard.x - DISC_LAYOUT_CENTER_PERCENT,
    standard.y - DISC_LAYOUT_CENTER_PERCENT,
  )
  const customDistance = Math.hypot(
    custom.x - DISC_LAYOUT_CENTER_PERCENT,
    custom.y - DISC_LAYOUT_CENTER_PERCENT,
  )

  assert.ok(customDistance > standardDistance)
  assertRectAvoidsInnerNoPrintArea(
    custom,
    getRatingBadgePlaceholderBoundsPercent(custom.scale),
    customTemplate,
  )
})

test('inner no-print clamp preserves already safe artwork placement', () => {
  const template = discTemplates.standardPrintableDisc
  const badge = {
    source: 'placeholder' as const,
    customImageSize: null,
    layout: artworkLayout({ x: 78, y: 50 }) as RatingBadgeLayout,
  }
  const clamped = clampRatingBadgeLayoutToSafeZone(badge, template)

  assertApproximatelyEqual(clamped.x, badge.layout.x)
  assertApproximatelyEqual(clamped.y, badge.layout.y)
})

test('default platform mark layouts clamp away from larger no-print hubs', () => {
  const template = discTemplates.lightScribeDisc
  const platformMark = {
    source: 'placeholder' as const,
    customImageSize: null,
    layout: artworkLayout({ x: 50, y: 70 }) as PlatformMarkLayout,
  }
  const clamped = clampPlatformMarkLayoutToSafeZone(platformMark, template)

  assertRectAvoidsInnerNoPrintArea(
    clamped,
    getPlatformMarkPlaceholderBoundsPercent(clamped.scale),
    template,
  )
})

test('default technical mark layouts clamp away from larger no-print hubs', () => {
  const template = discTemplates.lightScribeDisc
  const technicalMark = {
    source: 'placeholder' as const,
    customImageSize: null,
    layout: artworkLayout({ x: 50, y: 70 }) as TechnicalMarkLayout,
  }
  const clamped = clampTechnicalMarkLayoutToSafeZone(technicalMark, template)

  assertRectAvoidsInnerNoPrintArea(
    clamped,
    getTechnicalMarkPlaceholderBoundsPercent(clamped.scale),
    template,
  )
})
