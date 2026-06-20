import type { DiscTemplate } from '../types/template'
import type { BackgroundImageSize } from '../project/projectTypes.ts'
import type { DiscTextKey, DiscTextLayout } from '../discText/types'
import { DISC_TEXT_RENDER_STYLES } from '../discText/styles.ts'
import { getResolvedDiscTextFontSizePercent } from '../discText/pointSize.ts'
import { getImageContentSize } from '../image/imageContentBounds.ts'
import {
  getImageContentShapeLoops,
  getImageContentShapeSafetyOutset,
} from '../image/imageContentShape.ts'

export const EXPORT_DPI = 300
export const MM_PER_INCH = 25.4
export const CUSTOM_OUTER_DIAMETER_MAX_MM = 305
export const DISC_LAYOUT_CENTER_PERCENT = 50
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

export type LayoutPoint = {
  x: number
  y: number
}

export type RenderBoundsPercent = {
  halfWidth: number
  halfHeight: number
}

export type RenderShapeFootprintPercent = {
  loops: LayoutPoint[][]
  safetyOutset: number
}

export type NaturalSize = BackgroundImageSize | null

export function clampNumber(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

export function mmToPixels(mm: number) {
  return Math.round((mm / MM_PER_INCH) * EXPORT_DPI)
}

export function getSafeZoneRadiusPercent(template: DiscTemplate) {
  if (template.outerDiameterMm <= 0) {
    return 0
  }

  return (template.safeDiameterMm / template.outerDiameterMm) * DISC_LAYOUT_CENTER_PERCENT
}

export function getInnerNoPrintRadiusPercent(template: DiscTemplate) {
  if (template.outerDiameterMm <= 0) {
    return 0
  }

  const innerNoPrintDiameterMm = Math.max(
    0,
    template.physicalCenterHoleDiameterMm,
    template.innerHoleDiameterMm,
  )

  return clampNumber(
    (innerNoPrintDiameterMm / template.outerDiameterMm) * DISC_LAYOUT_CENTER_PERCENT,
    0,
    getSafeZoneRadiusPercent(template),
  )
}

export function getRectDistanceFromDiscCenter(
  point: LayoutPoint,
  bounds: RenderBoundsPercent,
) {
  const x = Number.isFinite(point.x) ? point.x : DISC_LAYOUT_CENTER_PERCENT
  const y = Number.isFinite(point.y) ? point.y : DISC_LAYOUT_CENTER_PERCENT
  const halfWidth = Math.max(0, bounds.halfWidth)
  const halfHeight = Math.max(0, bounds.halfHeight)
  const deltaX = x - DISC_LAYOUT_CENTER_PERCENT
  const deltaY = y - DISC_LAYOUT_CENTER_PERCENT
  const nearestX = Math.max(0, Math.abs(deltaX) - halfWidth)
  const nearestY = Math.max(0, Math.abs(deltaY) - halfHeight)

  return Math.hypot(nearestX, nearestY)
}

export function doesRectAvoidDiscCenterCircle(
  point: LayoutPoint,
  radiusPercent: number,
  bounds: RenderBoundsPercent,
) {
  return getRectDistanceFromDiscCenter(point, bounds) >= Math.max(0, radiusPercent) - 0.000001
}

export function doesRectFitInsideDiscCircle(
  point: LayoutPoint,
  radiusPercent: number,
  bounds: RenderBoundsPercent,
) {
  const x = Number.isFinite(point.x) ? point.x : DISC_LAYOUT_CENTER_PERCENT
  const y = Number.isFinite(point.y) ? point.y : DISC_LAYOUT_CENTER_PERCENT
  const halfWidth = Math.max(0, bounds.halfWidth)
  const halfHeight = Math.max(0, bounds.halfHeight)
  const farthestX = Math.abs(x - DISC_LAYOUT_CENTER_PERCENT) + halfWidth
  const farthestY = Math.abs(y - DISC_LAYOUT_CENTER_PERCENT) + halfHeight

  return Math.hypot(farthestX, farthestY) <= Math.max(0, radiusPercent) + 0.000001
}

export function doesRectFitSafeAnnulus(
  point: LayoutPoint,
  innerRadiusPercent: number,
  outerRadiusPercent: number,
  bounds: RenderBoundsPercent,
) {
  const outerRadius = Math.max(0, outerRadiusPercent)
  const innerRadius = clampNumber(Math.max(0, innerRadiusPercent), 0, outerRadius)

  return (
    doesRectFitInsideDiscCircle(point, outerRadius, bounds) &&
    doesRectAvoidDiscCenterCircle(point, innerRadius, bounds)
  )
}

export function doesRectFitTemplateSafeAnnulus(
  point: LayoutPoint,
  template: DiscTemplate,
  bounds: RenderBoundsPercent,
) {
  return doesRectFitSafeAnnulus(
    point,
    getInnerNoPrintRadiusPercent(template),
    getSafeZoneRadiusPercent(template),
    bounds,
  )
}

function getSquaredDistanceToSegment(point: LayoutPoint, start: LayoutPoint, end: LayoutPoint) {
  const dx = end.x - start.x
  const dy = end.y - start.y

  if (dx === 0 && dy === 0) {
    return (point.x - start.x) ** 2 + (point.y - start.y) ** 2
  }

  const t = clampNumber(
    ((point.x - start.x) * dx + (point.y - start.y) * dy) / (dx * dx + dy * dy),
    0,
    1,
  )
  const projectedX = start.x + dx * t
  const projectedY = start.y + dy * t

  return (point.x - projectedX) ** 2 + (point.y - projectedY) ** 2
}

function isPointInsideLoop(point: LayoutPoint, loop: LayoutPoint[]) {
  let inside = false

  for (let index = 0, previousIndex = loop.length - 1; index < loop.length; previousIndex = index, index += 1) {
    const current = loop[index]
    const previous = loop[previousIndex]
    const crosses =
      current.y > point.y !== previous.y > point.y &&
      point.x <
        ((previous.x - current.x) * (point.y - current.y)) /
          (previous.y - current.y) +
          current.x

    if (crosses) {
      inside = !inside
    }
  }

  return inside
}

function isPointInsideShape(point: LayoutPoint, loops: LayoutPoint[][]) {
  return loops.reduce(
    (inside, loop) => inside !== isPointInsideLoop(point, loop),
    false,
  )
}

function getAbsoluteShapeLoops(
  point: LayoutPoint,
  footprint: RenderShapeFootprintPercent,
) {
  return footprint.loops.map((loop) =>
    loop.map((localPoint) => ({
      x: point.x + localPoint.x,
      y: point.y + localPoint.y,
    })),
  )
}

function getShapeMaxLocalRadius(footprint: RenderShapeFootprintPercent) {
  return footprint.loops.reduce(
    (maxRadius, loop) =>
      Math.max(
        maxRadius,
        ...loop.map((point) =>
          Math.hypot(point.x, point.y) + footprint.safetyOutset),
      ),
    0,
  )
}

export function doesShapeFitInsideDiscCircle(
  point: LayoutPoint,
  radiusPercent: number,
  footprint: RenderShapeFootprintPercent,
) {
  const radius = Math.max(0, radiusPercent)
  const effectiveRadius = radius - Math.max(0, footprint.safetyOutset)
  const radiusSquared = effectiveRadius ** 2
  const loops = getAbsoluteShapeLoops(point, footprint)

  if (effectiveRadius < 0) {
    return false
  }

  return loops.every((loop) =>
    loop.every((shapePoint) =>
      (shapePoint.x - DISC_LAYOUT_CENTER_PERCENT) ** 2 +
        (shapePoint.y - DISC_LAYOUT_CENTER_PERCENT) ** 2 <=
        radiusSquared + 0.000001),
  )
}

export function doesShapeAvoidDiscCenterCircle(
  point: LayoutPoint,
  radiusPercent: number,
  footprint: RenderShapeFootprintPercent,
) {
  const radius = Math.max(0, radiusPercent) + Math.max(0, footprint.safetyOutset)

  if (radius <= 0) {
    return true
  }

  const center = {
    x: DISC_LAYOUT_CENTER_PERCENT,
    y: DISC_LAYOUT_CENTER_PERCENT,
  }
  const loops = getAbsoluteShapeLoops(point, footprint)

  if (isPointInsideShape(center, loops)) {
    return false
  }

  const minDistanceSquared = loops.reduce(
    (minDistance, loop) => {
      let nextMinDistance = minDistance

      for (let index = 0; index < loop.length; index += 1) {
        nextMinDistance = Math.min(
          nextMinDistance,
          getSquaredDistanceToSegment(
            center,
            loop[index],
            loop[(index + 1) % loop.length],
          ),
        )
      }

      return nextMinDistance
    },
    Number.POSITIVE_INFINITY,
  )

  return minDistanceSquared >= (radius - 0.000001) ** 2
}

export function doesShapeFitSafeAnnulus(
  point: LayoutPoint,
  innerRadiusPercent: number,
  outerRadiusPercent: number,
  footprint: RenderShapeFootprintPercent,
) {
  const outerRadius = Math.max(0, outerRadiusPercent)
  const innerRadius = clampNumber(Math.max(0, innerRadiusPercent), 0, outerRadius)

  return (
    doesShapeFitInsideDiscCircle(point, outerRadius, footprint) &&
    doesShapeAvoidDiscCenterCircle(point, innerRadius, footprint)
  )
}

export function getGuideInsetPercent(outerDiameterMm: number, guideDiameterMm: number) {
  return ((outerDiameterMm - guideDiameterMm) / 2 / outerDiameterMm) * 100
}

export function clampPointToSafeCircle(point: LayoutPoint, safeZoneRadiusPercent: number): LayoutPoint {
  const x = Number.isFinite(point.x) ? point.x : DISC_LAYOUT_CENTER_PERCENT
  const y = Number.isFinite(point.y) ? point.y : DISC_LAYOUT_CENTER_PERCENT
  const radius = Math.max(0, safeZoneRadiusPercent)
  const deltaX = x - DISC_LAYOUT_CENTER_PERCENT
  const deltaY = y - DISC_LAYOUT_CENTER_PERCENT
  const distance = Math.hypot(deltaX, deltaY)

  if (distance <= radius || distance === 0) {
    return { x, y }
  }

  const scale = radius / distance

  return {
    x: DISC_LAYOUT_CENTER_PERCENT + deltaX * scale,
    y: DISC_LAYOUT_CENTER_PERCENT + deltaY * scale,
  }
}

export function clampPointToSafeAnnulus(
  point: LayoutPoint,
  innerRadiusPercent: number,
  outerRadiusPercent: number,
): LayoutPoint {
  const x = Number.isFinite(point.x) ? point.x : DISC_LAYOUT_CENTER_PERCENT
  const y = Number.isFinite(point.y) ? point.y : DISC_LAYOUT_CENTER_PERCENT
  const outerRadius = Math.max(0, outerRadiusPercent)
  const innerRadius = clampNumber(Math.max(0, innerRadiusPercent), 0, outerRadius)
  const deltaX = x - DISC_LAYOUT_CENTER_PERCENT
  const deltaY = y - DISC_LAYOUT_CENTER_PERCENT
  const distance = Math.hypot(deltaX, deltaY)

  if (outerRadius === 0) {
    return {
      x: DISC_LAYOUT_CENTER_PERCENT,
      y: DISC_LAYOUT_CENTER_PERCENT,
    }
  }

  if (distance >= innerRadius && distance <= outerRadius) {
    return { x, y }
  }

  const targetDistance = distance < innerRadius ? innerRadius : outerRadius

  if (distance === 0) {
    return {
      x: DISC_LAYOUT_CENTER_PERCENT,
      y: DISC_LAYOUT_CENTER_PERCENT + targetDistance,
    }
  }

  const scale = targetDistance / distance

  return {
    x: DISC_LAYOUT_CENTER_PERCENT + deltaX * scale,
    y: DISC_LAYOUT_CENTER_PERCENT + deltaY * scale,
  }
}

function getMaxRectCenterDistanceInsideCircle(
  outerRadius: number,
  halfWidth: number,
  halfHeight: number,
  unitX: number,
  unitY: number,
) {
  const projectedBounds = Math.abs(unitX) * halfWidth + Math.abs(unitY) * halfHeight
  const remainingRadiusSquared = Math.max(
    0,
    outerRadius ** 2 -
    halfWidth ** 2 -
    halfHeight ** 2 +
    projectedBounds ** 2,
  )

  return Math.max(0, -projectedBounds + Math.sqrt(remainingRadiusSquared))
}

function getRectNearestDistanceFromCenter(
  distance: number,
  halfWidth: number,
  halfHeight: number,
  unitX: number,
  unitY: number,
) {
  const nearestX = Math.max(0, Math.abs(unitX) * distance - halfWidth)
  const nearestY = Math.max(0, Math.abs(unitY) * distance - halfHeight)

  return Math.hypot(nearestX, nearestY)
}

function getMinRectCenterDistanceOutsideCircle(
  innerRadius: number,
  halfWidth: number,
  halfHeight: number,
  unitX: number,
  unitY: number,
) {
  if (innerRadius <= 0) {
    return 0
  }

  const upperDistance = innerRadius + Math.hypot(halfWidth, halfHeight)

  if (
    getRectNearestDistanceFromCenter(
      upperDistance,
      halfWidth,
      halfHeight,
      unitX,
      unitY,
    ) < innerRadius
  ) {
    return upperDistance
  }

  let low = 0
  let high = upperDistance

  for (let iteration = 0; iteration < 32; iteration += 1) {
    const mid = (low + high) / 2

    if (
      getRectNearestDistanceFromCenter(
        mid,
        halfWidth,
        halfHeight,
        unitX,
        unitY,
      ) < innerRadius
    ) {
      low = mid
    } else {
      high = mid
    }
  }

  return high
}

export function clampRectToSafeCircle(
  point: LayoutPoint,
  safeZoneRadiusPercent: number,
  bounds: RenderBoundsPercent,
): LayoutPoint {
  const x = Number.isFinite(point.x) ? point.x : DISC_LAYOUT_CENTER_PERCENT
  const y = Number.isFinite(point.y) ? point.y : DISC_LAYOUT_CENTER_PERCENT
  const safeZoneRadius = Math.max(0, safeZoneRadiusPercent)
  const halfWidth = Math.max(0, bounds.halfWidth)
  const halfHeight = Math.max(0, bounds.halfHeight)

  if (halfWidth === 0 && halfHeight === 0) {
    return clampPointToSafeCircle({ x, y }, safeZoneRadius)
  }

  const cornerRadius = Math.hypot(halfWidth, halfHeight)

  if (cornerRadius >= safeZoneRadius) {
    return {
      x: DISC_LAYOUT_CENTER_PERCENT,
      y: DISC_LAYOUT_CENTER_PERCENT,
    }
  }

  const deltaX = x - DISC_LAYOUT_CENTER_PERCENT
  const deltaY = y - DISC_LAYOUT_CENTER_PERCENT
  const distance = Math.hypot(deltaX, deltaY)

  if (distance === 0) {
    return { x, y }
  }

  const maxDistance = getMaxRectCenterDistanceInsideCircle(
    safeZoneRadius,
    halfWidth,
    halfHeight,
    deltaX / distance,
    deltaY / distance,
  )

  if (distance <= maxDistance) {
    return { x, y }
  }

  const scale = maxDistance / distance

  return {
    x: DISC_LAYOUT_CENTER_PERCENT + deltaX * scale,
    y: DISC_LAYOUT_CENTER_PERCENT + deltaY * scale,
  }
}

export function clampRectToSafeAnnulus(
  point: LayoutPoint,
  innerRadiusPercent: number,
  outerRadiusPercent: number,
  bounds: RenderBoundsPercent,
): LayoutPoint {
  const x = Number.isFinite(point.x) ? point.x : DISC_LAYOUT_CENTER_PERCENT
  const y = Number.isFinite(point.y) ? point.y : DISC_LAYOUT_CENTER_PERCENT
  const outerRadius = Math.max(0, outerRadiusPercent)
  const innerRadius = clampNumber(Math.max(0, innerRadiusPercent), 0, outerRadius)
  const halfWidth = Math.max(0, bounds.halfWidth)
  const halfHeight = Math.max(0, bounds.halfHeight)

  if (halfWidth === 0 && halfHeight === 0) {
    return clampPointToSafeAnnulus({ x, y }, innerRadius, outerRadius)
  }

  const cornerRadius = Math.hypot(halfWidth, halfHeight)

  if (cornerRadius >= outerRadius) {
    return clampPointToSafeAnnulus({ x, y }, innerRadius, outerRadius)
  }

  const deltaX = x - DISC_LAYOUT_CENTER_PERCENT
  const deltaY = y - DISC_LAYOUT_CENTER_PERCENT
  const distance = Math.hypot(deltaX, deltaY)
  const unitX = distance === 0 ? 0 : deltaX / distance
  const unitY = distance === 0 ? 1 : deltaY / distance
  const maxDistance = getMaxRectCenterDistanceInsideCircle(
    outerRadius,
    halfWidth,
    halfHeight,
    unitX,
    unitY,
  )
  const minDistance = getMinRectCenterDistanceOutsideCircle(
    innerRadius,
    halfWidth,
    halfHeight,
    unitX,
    unitY,
  )
  const hasAnnularFit = minDistance <= maxDistance

  if (hasAnnularFit && distance >= minDistance && distance <= maxDistance) {
    return { x, y }
  }

  if (!hasAnnularFit) {
    return clampPointToSafeAnnulus({ x, y }, innerRadius, outerRadius)
  }

  const targetDistance = clampNumber(
    distance === 0 ? minDistance : distance,
    minDistance,
    maxDistance,
  )

  return {
    x: DISC_LAYOUT_CENTER_PERCENT + unitX * targetDistance,
    y: DISC_LAYOUT_CENTER_PERCENT + unitY * targetDistance,
  }
}

export function clampShapeToSafeAnnulus(
  point: LayoutPoint,
  innerRadiusPercent: number,
  outerRadiusPercent: number,
  footprint: RenderShapeFootprintPercent,
): LayoutPoint {
  const x = Number.isFinite(point.x) ? point.x : DISC_LAYOUT_CENTER_PERCENT
  const y = Number.isFinite(point.y) ? point.y : DISC_LAYOUT_CENTER_PERCENT
  const outerRadius = Math.max(0, outerRadiusPercent)
  const innerRadius = clampNumber(Math.max(0, innerRadiusPercent), 0, outerRadius)

  if (footprint.loops.length === 0) {
    return clampPointToSafeAnnulus({ x, y }, innerRadius, outerRadius)
  }

  const deltaX = x - DISC_LAYOUT_CENTER_PERCENT
  const deltaY = y - DISC_LAYOUT_CENTER_PERCENT
  const distance = Math.hypot(deltaX, deltaY)
  const unitX = distance === 0 ? 0 : deltaX / distance
  const unitY = distance === 0 ? 1 : deltaY / distance
  const pointAtDistance = (nextDistance: number) => ({
    x: DISC_LAYOUT_CENTER_PERCENT + unitX * nextDistance,
    y: DISC_LAYOUT_CENTER_PERCENT + unitY * nextDistance,
  })
  const maxSearchDistance = outerRadius + getShapeMaxLocalRadius(footprint)

  if (
    maxSearchDistance <= 0 ||
    !doesShapeFitInsideDiscCircle(pointAtDistance(0), outerRadius, footprint)
  ) {
    return clampPointToSafeAnnulus({ x, y }, innerRadius, outerRadius)
  }

  let outerLow = 0
  let outerHigh = maxSearchDistance

  for (let iteration = 0; iteration < 36; iteration += 1) {
    const mid = (outerLow + outerHigh) / 2

    if (doesShapeFitInsideDiscCircle(pointAtDistance(mid), outerRadius, footprint)) {
      outerLow = mid
    } else {
      outerHigh = mid
    }
  }

  const maxDistance = outerLow
  let minDistance = 0

  if (!doesShapeAvoidDiscCenterCircle(pointAtDistance(0), innerRadius, footprint)) {
    if (!doesShapeAvoidDiscCenterCircle(pointAtDistance(maxDistance), innerRadius, footprint)) {
      return clampPointToSafeAnnulus({ x, y }, innerRadius, outerRadius)
    }

    let innerLow = 0
    let innerHigh = maxDistance

    for (let iteration = 0; iteration < 36; iteration += 1) {
      const mid = (innerLow + innerHigh) / 2

      if (doesShapeAvoidDiscCenterCircle(pointAtDistance(mid), innerRadius, footprint)) {
        innerHigh = mid
      } else {
        innerLow = mid
      }
    }

    minDistance = innerHigh
  }

  const targetDistance = clampNumber(
    distance === 0 ? minDistance : distance,
    minDistance,
    maxDistance,
  )
  const clampedPoint = pointAtDistance(targetDistance)

  return doesShapeFitSafeAnnulus(
    clampedPoint,
    innerRadius,
    outerRadius,
    footprint,
  )
    ? clampedPoint
    : clampPointToSafeAnnulus({ x, y }, innerRadius, outerRadius)
}

export function clampLayoutPointToSafeZone(
  point: LayoutPoint,
  template: DiscTemplate,
  bounds?: RenderBoundsPercent,
  shapeFootprint?: RenderShapeFootprintPercent | null,
): LayoutPoint {
  const safeZoneRadius = getSafeZoneRadiusPercent(template)
  const innerNoPrintRadius = getInnerNoPrintRadiusPercent(template)

  if (shapeFootprint?.loops.length) {
    return clampShapeToSafeAnnulus(
      point,
      innerNoPrintRadius,
      safeZoneRadius,
      shapeFootprint,
    )
  }

  if (bounds) {
    return clampRectToSafeAnnulus(point, innerNoPrintRadius, safeZoneRadius, bounds)
  }

  return clampPointToSafeAnnulus(point, innerNoPrintRadius, safeZoneRadius)
}

export function canClampRectToTemplateSafeAnnulus(
  point: LayoutPoint,
  template: DiscTemplate,
  bounds: RenderBoundsPercent,
) {
  return doesRectFitTemplateSafeAnnulus(
    clampLayoutPointToSafeZone(point, template, bounds),
    template,
    bounds,
  )
}

export function canClampShapeToTemplateSafeAnnulus(
  point: LayoutPoint,
  template: DiscTemplate,
  footprint: RenderShapeFootprintPercent,
) {
  return doesShapeFitSafeAnnulus(
    clampLayoutPointToSafeZone(point, template, undefined, footprint),
    getInnerNoPrintRadiusPercent(template),
    getSafeZoneRadiusPercent(template),
    footprint,
  )
}

export function getImageContentShapeFootprintPercent(
  naturalSize: NaturalSize,
  bounds: RenderBoundsPercent,
): RenderShapeFootprintPercent | null {
  const loops = getImageContentShapeLoops(naturalSize)
  const safetyOutset = getImageContentShapeSafetyOutset(naturalSize)

  if (
    loops.length === 0 ||
    safetyOutset == null ||
    bounds.halfWidth <= 0 ||
    bounds.halfHeight <= 0
  ) {
    return null
  }

  const contentSize = getImageContentSize(naturalSize)

  if (!contentSize || contentSize.width <= 0 || contentSize.height <= 0) {
    return null
  }

  return {
    safetyOutset: Math.max(
      (safetyOutset / contentSize.width) * bounds.halfWidth * 2,
      (safetyOutset / contentSize.height) * bounds.halfHeight * 2,
    ),
    loops: loops
      .map((loop) =>
        loop.map((point) => ({
          x: (point.x / contentSize.width - 0.5) * bounds.halfWidth * 2,
          y: (point.y / contentSize.height - 0.5) * bounds.halfHeight * 2,
        })),
      )
      .filter((loop) => loop.length >= 3),
  }
}

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

export function normalizeCustomDiscTemplate(template: DiscTemplate): DiscTemplate {
  const outerDiameterMm = clampNumber(template.outerDiameterMm, 20, CUSTOM_OUTER_DIAMETER_MAX_MM)
  const physicalCenterHoleDiameterMm = clampNumber(template.physicalCenterHoleDiameterMm, 0, outerDiameterMm - 1)
  const innerHoleDiameterMm = clampNumber(template.innerHoleDiameterMm, physicalCenterHoleDiameterMm, outerDiameterMm - 1)
  const printableDiameterMm = clampNumber(template.printableDiameterMm, innerHoleDiameterMm, outerDiameterMm)
  const safeDiameterMm = clampNumber(template.safeDiameterMm, innerHoleDiameterMm, printableDiameterMm)

  return {
    ...template,
    outerDiameterMm,
    physicalCenterHoleDiameterMm,
    innerHoleDiameterMm,
    printableDiameterMm,
    safeDiameterMm,
  }
}

export function buildCustomDiscTemplate(
  source: DiscTemplate,
  dimensions?: Partial<DiscTemplate>,
): DiscTemplate {
  return normalizeCustomDiscTemplate({
    ...source,
    ...dimensions,
    id: 'custom',
    name: 'Custom dimensions',
    geometryNote:
      'Custom dimensions are saved with the project. Safe zone is advisory only and does not crop exported artwork.',
    defaultZones: [],
  })
}
