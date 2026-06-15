import assert from 'node:assert/strict'
import test from 'node:test'
import {
  clampLogoAssetLayoutToSafeZone,
  clampMediaMarkLayoutToSafeZone,
  clampProjectLogoAssetsToSafeZone,
  clampPlatformMarkLayoutToSafeZone,
  clampRatingBadgeLayoutToSafeZone,
  clampStraightDiscTextLayoutToSafeZone,
  clampTechnicalMarkLayoutToSafeZone,
  clampTitleArtworkLayoutToSafeZone,
  getLogoAssetLayoutSliderRanges,
  getMediaMarkLayoutSliderRanges,
  getPlatformMarkLayoutSliderRanges,
  getRatingBadgeLayoutSliderRanges,
  getStraightDiscTextLayoutSliderRanges,
  getTechnicalMarkLayoutSliderRanges,
  getTitleArtworkLayoutSliderRanges,
} from './discElementSafeZone.ts'
import { discTemplates } from '../templates/discTemplates.ts'
import {
  DISC_LAYOUT_CENTER_PERCENT,
  buildCustomDiscTemplate,
  doesRectFitSafeAnnulus,
  doesShapeFitSafeAnnulus,
  getImageContentShapeFootprintPercent,
  getInnerNoPrintRadiusPercent,
  getLogoAssetBoundsPercent,
  getMediaMarkPlaceholderBoundsPercent,
  getPlatformMarkPlaceholderBoundsPercent,
  getPlatformMarkBoundsPercent,
  getRatingBadgeBoundsPercent,
  getRatingBadgePlaceholderBoundsPercent,
  getSafeZoneRadiusPercent,
  getTechnicalMarkPlaceholderBoundsPercent,
  getTitleArtworkBoundsPercent,
  type RenderBoundsPercent,
} from '../disc/geometry.ts'
import {
  getStraightDiscTextRenderLayout,
  getStraightDiscTextVisualBounds,
} from '../discText/renderLayout.ts'
import type { DiscTextLayout } from '../discText/index.ts'
import type {
  BackgroundImageSize,
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
import {
  createDefaultProjectPlatformMarkAsset,
} from '../project/projectPlatformMarks.ts'
import {
  getPlatformMarkPlaceholderImageSize,
} from '../assets/assetManifest.ts'
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

function rangeWidth(range: { min: number; max: number }) {
  return range.max - range.min
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

function getSourcePixelPointPercent(
  imageSize: BackgroundImageSize,
  point: { x: number; y: number },
  bounds: RenderBoundsPercent,
) {
  const contentBounds = imageSize.contentBounds ?? {
    x: 0,
    y: 0,
    width: imageSize.width,
    height: imageSize.height,
  }

  return {
    x:
      ((point.x - contentBounds.x) / contentBounds.width - 0.5) *
      bounds.halfWidth *
      2,
    y:
      ((point.y - contentBounds.y) / contentBounds.height - 0.5) *
      bounds.halfHeight *
      2,
  }
}

function assertSourcePixelFitsSafeZone(
  layout: Pick<LogoAssetLayout, 'x' | 'y'>,
  imageSize: BackgroundImageSize,
  point: { x: number; y: number },
  bounds: RenderBoundsPercent,
  template: DiscTemplate,
) {
  const localPoint = getSourcePixelPointPercent(imageSize, point, bounds)
  const absolutePoint = {
    x: layout.x + localPoint.x,
    y: layout.y + localPoint.y,
  }
  const distance = Math.hypot(
    absolutePoint.x - DISC_LAYOUT_CENTER_PERCENT,
    absolutePoint.y - DISC_LAYOUT_CENTER_PERCENT,
  )

  assert.ok(
    distance <= getSafeZoneRadiusPercent(template) + 0.000001,
    `Expected source pixel ${JSON.stringify(point)} to fit safe zone after clamp; distance ${distance}`,
  )
}

test('straight text slider ranges shrink as rendered scale grows', () => {
  const template = discTemplates.standardPrintableDisc
  const text = 'VERY WIDE TITLE TEXT'
  const small = getStraightDiscTextLayoutSliderRanges(
    'title',
    text,
    titleLayout({ y: 19.5, scale: 0.75 }),
    template,
    measureText,
  )
  const large = getStraightDiscTextLayoutSliderRanges(
    'title',
    text,
    titleLayout({ y: 19.5, scale: 1.8 }),
    template,
    measureText,
  )

  assert.ok(large.x.max < small.x.max)
  assert.ok(large.x.min > small.x.min)
  assert.ok(large.y.max < small.y.max)
  assert.ok(large.y.min > small.y.min)
})

test('straight text slider ranges narrow the free axis near the safe-zone edge', () => {
  const template = discTemplates.standardPrintableDisc
  const text = 'SAFE ZONE TITLE'
  const centered = getStraightDiscTextLayoutSliderRanges(
    'title',
    text,
    titleLayout({ x: 0 }),
    template,
    measureText,
  )
  const nearRightEdge = getStraightDiscTextLayoutSliderRanges(
    'title',
    text,
    titleLayout({ x: 30 }),
    template,
    measureText,
  )

  assert.ok(nearRightEdge.y.max - nearRightEdge.y.min < centered.y.max - centered.y.min)
})

test('straight text safe-zone clamp matches the computed slider edge', () => {
  const template = discTemplates.standardPrintableDisc
  const text = 'SAFE ZONE TITLE'
  const layout = titleLayout({ scale: 1.4 })
  const ranges = getStraightDiscTextLayoutSliderRanges(
    'title',
    text,
    layout,
    template,
    measureText,
  )
  const clamped = clampStraightDiscTextLayoutToSafeZone(
    'title',
    { ...layout, x: ranges.x.max },
    template,
    text,
    measureText,
  )

  assertApproximatelyEqual(clamped.x, ranges.x.max)
})

test('straight text safe-zone clamp uses rendered text pixels instead of configured width', () => {
  const template = discTemplates.standardPrintableDisc
  const text = 'HI'
  const requestedNarrow = titleLayout({ x: 40, y: 20, width: 20, scale: 1 })
  const requestedWide = titleLayout({ x: 40, y: 20, width: 80, scale: 1 })
  const narrowClamp = clampStraightDiscTextLayoutToSafeZone(
    'title',
    requestedNarrow,
    template,
    text,
    measureText,
  )
  const wideClamp = clampStraightDiscTextLayoutToSafeZone(
    'title',
    requestedWide,
    template,
    text,
    measureText,
  )
  const renderLayout = getStraightDiscTextRenderLayout(
    'title',
    text,
    wideClamp,
    measureText,
  )
  const visualBounds = getStraightDiscTextVisualBounds(renderLayout, measureText)

  assertApproximatelyEqual(wideClamp.x, narrowClamp.x)
  assert.ok(
    doesRectFitSafeAnnulus(
      { x: visualBounds.centerX, y: visualBounds.centerY },
      getInnerNoPrintRadiusPercent(template),
      getSafeZoneRadiusPercent(template),
      { halfWidth: visualBounds.halfWidth, halfHeight: visualBounds.halfHeight },
    ),
  )
})

test('straight text slider ranges are aligned to the native slider step', () => {
  const template = discTemplates.standardPrintableDisc
  const ranges = getStraightDiscTextLayoutSliderRanges(
    'title',
    'SAFE ZONE TITLE',
    titleLayout({ y: 19.5 }),
    template,
    measureText,
  )

  for (const value of [ranges.x.min, ranges.x.max, ranges.y.min, ranges.y.max]) {
    assertApproximatelyEqual(value * 10, Math.round(value * 10))
  }
})

test('artwork and placeholder slider ranges shrink as rendered scale grows', () => {
  const template = discTemplates.standardPrintableDisc
  const logoSmall = getLogoAssetLayoutSliderRanges(
    artworkLayout({ scale: 0.75 }),
    template,
    null,
  )
  const logoLarge = getLogoAssetLayoutSliderRanges(
    artworkLayout({ scale: 1.8 }),
    template,
    null,
  )
  const ratingSmall = getRatingBadgeLayoutSliderRanges(
    {
      source: 'placeholder',
      customImageSize: null,
      layout: artworkLayout({ scale: 0.75 }) as RatingBadgeLayout,
    },
    template,
  )
  const ratingLarge = getRatingBadgeLayoutSliderRanges(
    {
      source: 'placeholder',
      customImageSize: null,
      layout: artworkLayout({ scale: 1.8 }) as RatingBadgeLayout,
    },
    template,
  )
  const mediaSmall = getMediaMarkLayoutSliderRanges(
    {
      source: 'placeholder',
      customImageSize: null,
      layout: artworkLayout({ scale: 0.75 }) as MediaMarkLayout,
    },
    template,
  )
  const mediaLarge = getMediaMarkLayoutSliderRanges(
    {
      source: 'placeholder',
      customImageSize: null,
      layout: artworkLayout({ scale: 1.8 }) as MediaMarkLayout,
    },
    template,
  )
  const platformSmall = getPlatformMarkLayoutSliderRanges(
    {
      source: 'placeholder',
      customImageSize: null,
      layout: artworkLayout({ scale: 0.75 }) as PlatformMarkLayout,
    },
    template,
  )
  const platformLarge = getPlatformMarkLayoutSliderRanges(
    {
      source: 'placeholder',
      customImageSize: null,
      layout: artworkLayout({ scale: 1.8 }) as PlatformMarkLayout,
    },
    template,
  )
  const technicalSmall = getTechnicalMarkLayoutSliderRanges(
    {
      source: 'placeholder',
      customImageSize: null,
      layout: artworkLayout({ scale: 0.75 }) as TechnicalMarkLayout,
    },
    template,
  )
  const technicalLarge = getTechnicalMarkLayoutSliderRanges(
    {
      source: 'placeholder',
      customImageSize: null,
      layout: artworkLayout({ scale: 1.8 }) as TechnicalMarkLayout,
    },
    template,
  )

  for (const [small, large] of [
    [logoSmall, logoLarge],
    [ratingSmall, ratingLarge],
    [mediaSmall, mediaLarge],
    [platformSmall, platformLarge],
    [technicalSmall, technicalLarge],
  ]) {
    assert.ok(rangeWidth(large.x) < rangeWidth(small.x))
    assert.ok(rangeWidth(large.y) < rangeWidth(small.y))
  }
})

test('rating badge slider edge remains inside the authoritative safe-zone clamp', () => {
  const template = discTemplates.standardPrintableDisc
  const badge = {
    source: 'placeholder' as const,
    customImageSize: null,
    layout: artworkLayout({ scale: 1.7 }) as RatingBadgeLayout,
  }
  const ranges = getRatingBadgeLayoutSliderRanges(badge, template)
  const clamped = clampRatingBadgeLayoutToSafeZone(
    {
      ...badge,
      layout: {
        ...badge.layout,
        x: ranges.x.max,
      },
    },
    template,
  )

  assertApproximatelyEqual(clamped.x, ranges.x.max)
})

test('custom artwork slider ranges use uploaded image aspect ratio', () => {
  const template = discTemplates.standardPrintableDisc
  const tallBadge = getRatingBadgeLayoutSliderRanges(
    {
      source: 'custom',
      customImageSize: { width: 50, height: 200 },
      layout: artworkLayout() as RatingBadgeLayout,
    },
    template,
  )
  const wideBadge = getRatingBadgeLayoutSliderRanges(
    {
      source: 'custom',
      customImageSize: { width: 200, height: 50 },
      layout: artworkLayout() as RatingBadgeLayout,
    },
    template,
  )

  assert.ok(rangeWidth(tallBadge.x) > rangeWidth(wideBadge.x))
  assert.ok(rangeWidth(tallBadge.y) < rangeWidth(wideBadge.y))
})

test('alpha-contour artwork clamps against its shape instead of its rectangular box', () => {
  const template = discTemplates.standardPrintableDisc
  const layout = artworkLayout({ x: 90, y: 90 })
  const rectangularImageSize = { width: 100, height: 100 }
  const diamondImageSize = {
    width: 100,
    height: 100,
    contentShape: {
      width: 100,
      height: 100,
      path: 'M50 0 L100 50 L50 100 L0 50 Z',
      fillRule: 'evenodd' as const,
      safetyOutset: 0,
    },
  }
  const rectangular = clampTitleArtworkLayoutToSafeZone(
    layout,
    template,
    rectangularImageSize,
  )
  const shaped = clampTitleArtworkLayoutToSafeZone(
    layout,
    template,
    diamondImageSize,
  )
  const rectangularDistance = Math.hypot(
    rectangular.x - DISC_LAYOUT_CENTER_PERCENT,
    rectangular.y - DISC_LAYOUT_CENTER_PERCENT,
  )
  const shapedDistance = Math.hypot(
    shaped.x - DISC_LAYOUT_CENTER_PERCENT,
    shaped.y - DISC_LAYOUT_CENTER_PERCENT,
  )
  const bounds = getTitleArtworkBoundsPercent(diamondImageSize, layout.scale)
  const footprint = getImageContentShapeFootprintPercent(diamondImageSize, bounds)

  assert.ok(footprint)
  assert.ok(
    shapedDistance > rectangularDistance + 1,
    `Expected shaped artwork distance ${shapedDistance} to exceed rectangular distance ${rectangularDistance}`,
  )
  assert.ok(
    doesShapeFitSafeAnnulus(
      shaped,
      getInnerNoPrintRadiusPercent(template),
      getSafeZoneRadiusPercent(template),
      footprint,
    ),
  )
})

test('alpha-contour artwork slider ranges use the traced shape near diagonal safe-zone edges', () => {
  const template = discTemplates.standardPrintableDisc
  const layout = artworkLayout({ x: 80, y: 80 })
  const rectangularImageSize = { width: 100, height: 100 }
  const diamondImageSize = {
    width: 100,
    height: 100,
    contentShape: {
      width: 100,
      height: 100,
      path: 'M50 0 L100 50 L50 100 L0 50 Z',
      fillRule: 'evenodd' as const,
      safetyOutset: 0,
    },
  }
  const rectangularRanges = getTitleArtworkLayoutSliderRanges(
    { imageSize: rectangularImageSize, layout },
    template,
  )
  const shapedRanges = getTitleArtworkLayoutSliderRanges(
    { imageSize: diamondImageSize, layout },
    template,
  )

  assert.ok(shapedRanges.x.max > rectangularRanges.x.max)
  assert.ok(shapedRanges.y.max > rectangularRanges.y.max)
})

test('built-in Windows platform mark clamps against bundled contour metadata', () => {
  const template = discTemplates.standardPrintableDisc
  const asset = createDefaultProjectPlatformMarkAsset('windows')
  const requestedAsset = {
    ...asset,
    layout: artworkLayout({ x: 90, y: 90 }),
  }
  const genericPlaceholder = clampPlatformMarkLayoutToSafeZone(
    requestedAsset,
    template,
  )
  const builtInWindows = clampPlatformMarkLayoutToSafeZone(
    {
      ...requestedAsset,
      value: 'windows' as const,
    },
    template,
  )
  const genericDistance = Math.hypot(
    genericPlaceholder.x - DISC_LAYOUT_CENTER_PERCENT,
    genericPlaceholder.y - DISC_LAYOUT_CENTER_PERCENT,
  )
  const builtInDistance = Math.hypot(
    builtInWindows.x - DISC_LAYOUT_CENTER_PERCENT,
    builtInWindows.y - DISC_LAYOUT_CENTER_PERCENT,
  )
  const imageSize = getPlatformMarkPlaceholderImageSize('windows', 'windows11')
  const bounds = getPlatformMarkBoundsPercent(imageSize, builtInWindows.scale)
  const footprint = getImageContentShapeFootprintPercent(imageSize, bounds)

  assert.ok(imageSize.contentShape)
  assert.ok(footprint)
  assert.ok(
    builtInDistance > genericDistance + 1,
    `Expected Windows contour distance ${builtInDistance} to exceed placeholder distance ${genericDistance}`,
  )
  assert.ok(
    doesShapeFitSafeAnnulus(
      builtInWindows,
      getInnerNoPrintRadiusPercent(template),
      getSafeZoneRadiusPercent(template),
      footprint,
    ),
  )
})

test('simplified contour safety outset keeps noisy title artwork pixels inside the safe zone', () => {
  const template = discTemplates.standardPrintableDisc
  const layout = artworkLayout({ x: 0, y: 100 })
  const warframeLikeImageSize: BackgroundImageSize = {
    width: 640,
    height: 360,
    contentBounds: { x: 39, y: 130, width: 280, height: 178 },
    contentShape: {
      width: 280,
      height: 178,
      path: 'M0 0 L280 0 L280 154 L0 154 Z',
      fillRule: 'evenodd',
      safetyOutset: 24,
    },
  }
  const clamped = clampTitleArtworkLayoutToSafeZone(
    layout,
    template,
    warframeLikeImageSize,
  )
  const bounds = getTitleArtworkBoundsPercent(
    warframeLikeImageSize,
    clamped.scale,
  )
  const protrudingLowerLeftPixel = { x: 39, y: 307 }

  assertSourcePixelFitsSafeZone(
    clamped,
    warframeLikeImageSize,
    protrudingLowerLeftPixel,
    bounds,
    template,
  )
})

test('legacy contours without safety outset fall back to active rectangle clamping', () => {
  const template = discTemplates.standardPrintableDisc
  const layout = artworkLayout({ x: 0, y: 100 })
  const legacyImageSize: BackgroundImageSize = {
    width: 640,
    height: 360,
    contentBounds: { x: 39, y: 130, width: 280, height: 178 },
    contentShape: {
      width: 280,
      height: 178,
      path: 'M70 10 L270 10 L270 140 L70 140 Z',
      fillRule: 'evenodd',
    },
  }
  const clamped = clampTitleArtworkLayoutToSafeZone(
    layout,
    template,
    legacyImageSize,
  )
  const bounds = getTitleArtworkBoundsPercent(legacyImageSize, clamped.scale)
  const rectangular = clampTitleArtworkLayoutToSafeZone(
    layout,
    template,
    {
      width: legacyImageSize.width,
      height: legacyImageSize.height,
      contentBounds: legacyImageSize.contentBounds,
    },
  )

  assertApproximatelyEqual(clamped.x, rectangular.x)
  assertApproximatelyEqual(clamped.y, rectangular.y)
  assertSourcePixelFitsSafeZone(
    clamped,
    legacyImageSize,
    { x: 39, y: 307 },
    bounds,
    template,
  )
})

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
