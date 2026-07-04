import assert from 'node:assert/strict'
import test from 'node:test'
import {
  clampPlatformMarkLayoutToSafeZone,
  clampTitleArtworkLayoutToSafeZone,
  getTitleArtworkLayoutSliderRanges,
} from './discElementSafeZone.ts'
import { discTemplates } from '../templates/discTemplates.ts'
import {
  DISC_LAYOUT_CENTER_PERCENT,
  doesShapeFitSafeAnnulus,
  getImageContentShapeFootprintPercent,
  getInnerNoPrintRadiusPercent,
  getPlatformMarkBoundsPercent,
  getSafeZoneRadiusPercent,
  getTitleArtworkBoundsPercent,
  type RenderBoundsPercent,
} from '../disc/geometry.ts'
import type { DiscTemplate } from '../types/template.ts'
import type {
  BackgroundImageSize,
  LogoAssetLayout,
} from '../project/projectTypes.ts'
import {
  createDefaultProjectPlatformMarkAsset,
} from '../project/projectPlatformMarks.ts'
import {
  getPlatformMarkPlaceholderImageSize,
} from '../assets/assetManifest.ts'

function assertApproximatelyEqual(actual: number, expected: number) {
  assert.ok(
    Math.abs(actual - expected) < 0.000001,
    `Expected ${actual} to approximately equal ${expected}`,
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
