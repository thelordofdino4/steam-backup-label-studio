import {
  DISC_LAYOUT_CENTER_PERCENT,
  clampShapeToSafeAnnulus,
  doesRectAvoidDiscCenterCircle,
  doesShapeFitSafeAnnulus,
  getInnerNoPrintRadiusPercent,
  getSafeZoneRadiusPercent,
  type RenderBoundsPercent,
  type RenderShapeFootprintPercent,
} from '../disc/geometry.ts'
import type { DiscTemplate } from '../types/template.ts'
import {
  clampLayoutNumber,
  clampSteppedLayoutAxisRange,
  type LayoutAxisRange,
  type LayoutSliderRanges,
} from './layoutRangeMath.ts'

const DISC_SAFE_ZONE_LAYOUT_SLIDER_STEP = 0.1

type LayoutPoint = {
  x: number
  y: number
}

export function clampDiscSafeZoneLayoutAxisRange(
  range: LayoutAxisRange,
  bounds: LayoutAxisRange,
): LayoutAxisRange {
  return clampSteppedLayoutAxisRange(range, bounds, {
    step: DISC_SAFE_ZONE_LAYOUT_SLIDER_STEP,
  })
}

export function getDiscSafeAxisHalfTravel(
  safeZoneRadius: number,
  fixedAxisDelta: number,
  fixedAxisHalfSize: number,
  movingAxisHalfSize: number,
) {
  const fixedOuterDistance = Math.abs(fixedAxisDelta) +
    Math.max(0, fixedAxisHalfSize)
  const remainingDistance = Math.sqrt(
    Math.max(0, safeZoneRadius ** 2 - fixedOuterDistance ** 2),
  )

  return Math.max(0, remainingDistance - Math.max(0, movingAxisHalfSize))
}

export function constrainDiscAxisRangeToInnerNoPrintSide(
  range: LayoutAxisRange,
  currentValue: number,
  centerValue: number,
  innerNoPrintRadius: number,
  bounds: { halfWidth: number; halfHeight: number },
  getPointForValue: (value: number) => LayoutPoint,
  getAxisCoordinate: (point: LayoutPoint) => number,
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

  return clampDiscSafeZoneLayoutAxisRange(
    preferPositiveSide
      ? { min: safeValue, max: range.max }
      : { min: range.min, max: safeValue },
    range,
  )
}

export function constrainDiscSliderRangesToInnerNoPrint(
  ranges: LayoutSliderRanges,
  layout: LayoutPoint,
  selectedDiscTemplate: DiscTemplate,
  bounds: { halfWidth: number; halfHeight: number },
): LayoutSliderRanges {
  const innerNoPrintRadius = getInnerNoPrintRadiusPercent(selectedDiscTemplate)

  return {
    x: constrainDiscAxisRangeToInnerNoPrintSide(
      ranges.x,
      layout.x,
      DISC_LAYOUT_CENTER_PERCENT,
      innerNoPrintRadius,
      bounds,
      (value) => ({ x: value, y: layout.y }),
      (point) => point.x,
    ),
    y: constrainDiscAxisRangeToInnerNoPrintSide(
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

function getShapeSafeAxisRange(
  axis: 'x' | 'y',
  layout: LayoutPoint,
  clampedPoint: LayoutPoint,
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
    : clampLayoutNumber(clampedValue, axisBounds.min, axisBounds.max)

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

  return clampDiscSafeZoneLayoutAxisRange(
    {
      min: findLower(),
      max: findUpper(),
    },
    axisBounds,
  )
}

export function getShapeSafeZoneLayoutSliderRanges(
  layout: LayoutPoint,
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

export function getRectSafeZoneLayoutSliderRanges(
  layout: LayoutPoint,
  selectedDiscTemplate: DiscTemplate,
  bounds: RenderBoundsPercent,
  axisBounds: LayoutSliderRanges,
): LayoutSliderRanges {
  const safeZoneRadius = getSafeZoneRadiusPercent(selectedDiscTemplate)
  const visualDeltaX = layout.x - DISC_LAYOUT_CENTER_PERCENT
  const visualDeltaY = layout.y - DISC_LAYOUT_CENTER_PERCENT
  const xHalfTravel = getDiscSafeAxisHalfTravel(
    safeZoneRadius,
    visualDeltaY,
    bounds.halfHeight,
    bounds.halfWidth,
  )
  const yHalfTravel = getDiscSafeAxisHalfTravel(
    safeZoneRadius,
    visualDeltaX,
    bounds.halfWidth,
    bounds.halfHeight,
  )
  const outerRanges = {
    x: clampDiscSafeZoneLayoutAxisRange(
      {
        min: DISC_LAYOUT_CENTER_PERCENT - xHalfTravel,
        max: DISC_LAYOUT_CENTER_PERCENT + xHalfTravel,
      },
      axisBounds.x,
    ),
    y: clampDiscSafeZoneLayoutAxisRange(
      {
        min: DISC_LAYOUT_CENTER_PERCENT - yHalfTravel,
        max: DISC_LAYOUT_CENTER_PERCENT + yHalfTravel,
      },
      axisBounds.y,
    ),
  }

  return constrainDiscSliderRangesToInnerNoPrint(
    outerRanges,
    layout,
    selectedDiscTemplate,
    bounds,
  )
}
