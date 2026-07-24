import {
  DISC_LAYOUT_CENTER_PERCENT,
  doesRectFitSafeAnnulus,
} from '../disc/geometry.ts'
import type {
  DiscContainRegionSizePolicyV1,
  DiscNormalizedRegion,
} from './discPresetDefinition.ts'
import { DISC_PRESET_OWNER_SCALE_MAX } from './discPresetDefinition.ts'

export const DISC_PRESET_CONTAIN_FIT_NORMALIZED_TOLERANCE = 0.000001

const ANNULUS_SCALE_SEARCH_ITERATIONS = 64

export type DiscCanonicalVisualBounds = Readonly<{
  centerOffsetXPercent: number
  centerOffsetYPercent: number
  widthPercent: number
  heightPercent: number
}>

export type DiscPresetContainFitTemplateGeometry = Readonly<{
  safeDiameterPercent: number
  innerNoPrintDiameterPercent: number
}>

export type FitVisualBoundsToDiscPresetRectangleInput = Readonly<{
  region: DiscNormalizedRegion
  boundsAtScaleOne: DiscCanonicalVisualBounds
  policy: DiscContainRegionSizePolicyV1
}>

export type FitVisualBoundsToDiscPresetRegionInput =
  FitVisualBoundsToDiscPresetRectangleInput & Readonly<{
  template: DiscPresetContainFitTemplateGeometry
}>

export type DiscPresetContainFitWarning =
  | Readonly<{
      kind: 'contain-fit-adjusted'
      reason: 'safe-annulus'
      requestedScale: number
      appliedScale: number
    }>
  | Readonly<{
      kind: 'contain-fit-unsupported'
      reason:
        | 'invalid-region'
        | 'invalid-canonical-bounds'
        | 'invalid-size-policy'
        | 'invalid-template-geometry'
        | 'center-cannot-fit-safe-annulus'
        | 'non-finite-result'
        | 'calculation-invalid'
    }>

export type FitVisualBoundsToDiscPresetRegionResult =
  | Readonly<{
      status: 'fit'
      x: number
      y: number
      scale: number
      fittedBounds: DiscCanonicalVisualBounds
      limitingAxis: 'horizontal' | 'vertical' | 'both' | 'capped'
      warnings: readonly DiscPresetContainFitWarning[]
    }>
  | Readonly<{
      status: 'unsupported'
      warnings: readonly DiscPresetContainFitWarning[]
    }>

export type FitVisualBoundsToDiscPresetRectangleResult =
  FitVisualBoundsToDiscPresetRegionResult

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isRegionValid(region: DiscNormalizedRegion | null | undefined) {
  if (
    !isFiniteNumber(region?.centerXPercent) ||
    !isFiniteNumber(region?.centerYPercent) ||
    !isFiniteNumber(region?.widthPercent) ||
    !isFiniteNumber(region?.heightPercent) ||
    region.widthPercent <= 0 ||
    region.heightPercent <= 0 ||
    region.widthPercent > 100 ||
    region.heightPercent > 100
  ) {
    return false
  }

  const halfWidth = region.widthPercent / 2
  const halfHeight = region.heightPercent / 2

  return (
    region.centerXPercent - halfWidth >=
      -DISC_PRESET_CONTAIN_FIT_NORMALIZED_TOLERANCE &&
    region.centerXPercent + halfWidth <=
      100 + DISC_PRESET_CONTAIN_FIT_NORMALIZED_TOLERANCE &&
    region.centerYPercent - halfHeight >=
      -DISC_PRESET_CONTAIN_FIT_NORMALIZED_TOLERANCE &&
    region.centerYPercent + halfHeight <=
      100 + DISC_PRESET_CONTAIN_FIT_NORMALIZED_TOLERANCE
  )
}

function areCanonicalBoundsValid(
  bounds: DiscCanonicalVisualBounds | null | undefined,
) {
  return (
    isFiniteNumber(bounds?.centerOffsetXPercent) &&
    isFiniteNumber(bounds?.centerOffsetYPercent) &&
    isFiniteNumber(bounds?.widthPercent) &&
    isFiniteNumber(bounds?.heightPercent) &&
    bounds.widthPercent > 0 &&
    bounds.heightPercent > 0
  )
}

function isPolicyValid(
  policy: DiscContainRegionSizePolicyV1 | null | undefined,
) {
  const insetPercent = policy?.insetPercent ?? 0

  return (
    policy?.mode === 'contain-region' &&
    typeof policy.allowUpscale === 'boolean' &&
    isFiniteNumber(insetPercent) &&
    insetPercent >= 0 &&
    insetPercent < 50 &&
    (policy.maximumScale === undefined ||
      (isFiniteNumber(policy.maximumScale) &&
        policy.maximumScale > 0 &&
        policy.maximumScale <= DISC_PRESET_OWNER_SCALE_MAX))
  )
}

function isTemplateGeometryValid(
  template: DiscPresetContainFitTemplateGeometry | null | undefined,
) {
  return (
    isFiniteNumber(template?.safeDiameterPercent) &&
    isFiniteNumber(template?.innerNoPrintDiameterPercent) &&
    template.safeDiameterPercent > 0 &&
    template.safeDiameterPercent <= 100 &&
    template.innerNoPrintDiameterPercent >= 0 &&
    template.innerNoPrintDiameterPercent < template.safeDiameterPercent
  )
}

function unsupported(
  reason: Extract<
    DiscPresetContainFitWarning,
    { kind: 'contain-fit-unsupported' }
  >['reason'],
): FitVisualBoundsToDiscPresetRegionResult {
  return Object.freeze({
    status: 'unsupported',
    warnings: Object.freeze([
      Object.freeze({
        kind: 'contain-fit-unsupported' as const,
        reason,
      }),
    ]),
  })
}

function createScaledBounds(
  boundsAtScaleOne: DiscCanonicalVisualBounds,
  scale: number,
): DiscCanonicalVisualBounds {
  return Object.freeze({
    centerOffsetXPercent: boundsAtScaleOne.centerOffsetXPercent * scale,
    centerOffsetYPercent: boundsAtScaleOne.centerOffsetYPercent * scale,
    widthPercent: boundsAtScaleOne.widthPercent * scale,
    heightPercent: boundsAtScaleOne.heightPercent * scale,
  })
}

function isFittedBoundsInsideRegion(
  region: DiscNormalizedRegion,
  fittedBounds: DiscCanonicalVisualBounds,
) {
  const fittedHalfWidth = fittedBounds.widthPercent / 2
  const fittedHalfHeight = fittedBounds.heightPercent / 2
  const regionHalfWidth = region.widthPercent / 2
  const regionHalfHeight = region.heightPercent / 2

  return (
    fittedHalfWidth <=
      regionHalfWidth + DISC_PRESET_CONTAIN_FIT_NORMALIZED_TOLERANCE &&
    fittedHalfHeight <=
      regionHalfHeight + DISC_PRESET_CONTAIN_FIT_NORMALIZED_TOLERANCE
  )
}

function doesScaleFitSafeAnnulus(
  region: DiscNormalizedRegion,
  boundsAtScaleOne: DiscCanonicalVisualBounds,
  scale: number,
  template: DiscPresetContainFitTemplateGeometry,
) {
  return doesRectFitSafeAnnulus(
    {
      x: region.centerXPercent,
      y: region.centerYPercent,
    },
    template.innerNoPrintDiameterPercent / 2,
    template.safeDiameterPercent / 2,
    {
      halfWidth: boundsAtScaleOne.widthPercent * scale / 2,
      halfHeight: boundsAtScaleOne.heightPercent * scale / 2,
    },
  )
}

function getLargestSafeAnnulusScale(
  region: DiscNormalizedRegion,
  boundsAtScaleOne: DiscCanonicalVisualBounds,
  requestedScale: number,
  template: DiscPresetContainFitTemplateGeometry,
) {
  if (doesScaleFitSafeAnnulus(
    region,
    boundsAtScaleOne,
    requestedScale,
    template,
  )) {
    return requestedScale
  }

  const centerDistance = Math.hypot(
    region.centerXPercent - DISC_LAYOUT_CENTER_PERCENT,
    region.centerYPercent - DISC_LAYOUT_CENTER_PERCENT,
  )
  const innerRadius = template.innerNoPrintDiameterPercent / 2
  const outerRadius = template.safeDiameterPercent / 2

  if (
    (innerRadius > 0 && centerDistance <= innerRadius) ||
    centerDistance >= outerRadius
  ) {
    return null
  }

  let low = 0
  let high = requestedScale

  for (let iteration = 0; iteration < ANNULUS_SCALE_SEARCH_ITERATIONS; iteration += 1) {
    const candidate = (low + high) / 2

    if (doesScaleFitSafeAnnulus(
      region,
      boundsAtScaleOne,
      candidate,
      template,
    )) {
      low = candidate
    } else {
      high = candidate
    }
  }

  return low > 0 ? low : null
}

function getLimitingAxis(
  availableWidth: number,
  availableHeight: number,
  fittedBounds: DiscCanonicalVisualBounds,
  wasCapped: boolean,
): 'horizontal' | 'vertical' | 'both' | 'capped' {
  if (wasCapped) return 'capped'

  const reachesHorizontalBoundary = Math.abs(
    fittedBounds.widthPercent - availableWidth,
  ) <= DISC_PRESET_CONTAIN_FIT_NORMALIZED_TOLERANCE
  const reachesVerticalBoundary = Math.abs(
    fittedBounds.heightPercent - availableHeight,
  ) <= DISC_PRESET_CONTAIN_FIT_NORMALIZED_TOLERANCE

  if (reachesHorizontalBoundary && reachesVerticalBoundary) return 'both'
  return reachesHorizontalBoundary ? 'horizontal' : 'vertical'
}

export function fitVisualBoundsToDiscPresetRegion(
  input: FitVisualBoundsToDiscPresetRegionInput,
): FitVisualBoundsToDiscPresetRegionResult {
  const rectangleFit = fitVisualBoundsToDiscPresetRectangle(input)

  if (rectangleFit.status === 'unsupported') return rectangleFit
  if (!isTemplateGeometryValid(input?.template)) {
    return unsupported('invalid-template-geometry')
  }

  const requestedScale = rectangleFit.scale
  const safeScale = getLargestSafeAnnulusScale(
    input.region,
    input.boundsAtScaleOne,
    requestedScale,
    input.template,
  )
  if (safeScale === null) {
    return unsupported('center-cannot-fit-safe-annulus')
  }

  const wasAnnulusAdjusted = safeScale < requestedScale
  const fittedBounds = createScaledBounds(input.boundsAtScaleOne, safeScale)
  const x = input.region.centerXPercent - fittedBounds.centerOffsetXPercent
  const y = input.region.centerYPercent - fittedBounds.centerOffsetYPercent
  const fittedCenterX = x + fittedBounds.centerOffsetXPercent
  const fittedCenterY = y + fittedBounds.centerOffsetYPercent
  const centerParityHolds =
    Math.abs(fittedCenterX - input.region.centerXPercent) <=
      DISC_PRESET_CONTAIN_FIT_NORMALIZED_TOLERANCE &&
    Math.abs(fittedCenterY - input.region.centerYPercent) <=
      DISC_PRESET_CONTAIN_FIT_NORMALIZED_TOLERANCE
  const annulusFitHolds = doesScaleFitSafeAnnulus(
    input.region,
    input.boundsAtScaleOne,
    safeScale,
    input.template,
  )

  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(safeScale)) {
    return unsupported('non-finite-result')
  }
  if (
    !centerParityHolds ||
    !isFittedBoundsInsideRegion(input.region, fittedBounds) ||
    !annulusFitHolds
  ) {
    return unsupported('calculation-invalid')
  }

  const warnings: readonly DiscPresetContainFitWarning[] = wasAnnulusAdjusted
    ? Object.freeze([
        Object.freeze({
          kind: 'contain-fit-adjusted' as const,
          reason: 'safe-annulus' as const,
          requestedScale,
          appliedScale: safeScale,
        }),
      ])
    : Object.freeze([])

  return Object.freeze({
    status: 'fit',
    x,
    y,
    scale: safeScale,
    fittedBounds,
    limitingAxis: wasAnnulusAdjusted
      ? 'capped'
      : rectangleFit.limitingAxis,
    warnings,
  })
}

export function fitVisualBoundsToDiscPresetRectangle(
  input: FitVisualBoundsToDiscPresetRectangleInput,
): FitVisualBoundsToDiscPresetRectangleResult {
  if (!isRegionValid(input?.region)) return unsupported('invalid-region')
  if (!areCanonicalBoundsValid(input?.boundsAtScaleOne)) {
    return unsupported('invalid-canonical-bounds')
  }
  if (!isPolicyValid(input?.policy)) return unsupported('invalid-size-policy')

  const insetFactor = 1 - 2 * ((input.policy.insetPercent ?? 0) / 100)
  const availableWidth = input.region.widthPercent * insetFactor
  const availableHeight = input.region.heightPercent * insetFactor
  const widthScale = availableWidth / input.boundsAtScaleOne.widthPercent
  const heightScale = availableHeight / input.boundsAtScaleOne.heightPercent
  const unconstrainedScale = Math.min(widthScale, heightScale)

  if (!Number.isFinite(unconstrainedScale) || unconstrainedScale <= 0) {
    return unsupported('non-finite-result')
  }

  let requestedScale = unconstrainedScale
  let wasCapped = false

  if (!input.policy.allowUpscale && requestedScale > 1) {
    requestedScale = 1
    wasCapped = true
  }
  if (
    input.policy.maximumScale !== undefined &&
    requestedScale > input.policy.maximumScale
  ) {
    requestedScale = input.policy.maximumScale
    wasCapped = true
  }

  const fittedBounds = createScaledBounds(input.boundsAtScaleOne, requestedScale)
  const x = input.region.centerXPercent - fittedBounds.centerOffsetXPercent
  const y = input.region.centerYPercent - fittedBounds.centerOffsetYPercent
  const fittedCenterX = x + fittedBounds.centerOffsetXPercent
  const fittedCenterY = y + fittedBounds.centerOffsetYPercent
  const centerParityHolds =
    Math.abs(fittedCenterX - input.region.centerXPercent) <=
      DISC_PRESET_CONTAIN_FIT_NORMALIZED_TOLERANCE &&
    Math.abs(fittedCenterY - input.region.centerYPercent) <=
      DISC_PRESET_CONTAIN_FIT_NORMALIZED_TOLERANCE

  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(requestedScale)) {
    return unsupported('non-finite-result')
  }
  if (
    !centerParityHolds ||
    !isFittedBoundsInsideRegion(input.region, fittedBounds)
  ) {
    return unsupported('calculation-invalid')
  }

  return Object.freeze({
    status: 'fit',
    x,
    y,
    scale: requestedScale,
    fittedBounds,
    limitingAxis: getLimitingAxis(
      availableWidth,
      availableHeight,
      fittedBounds,
      wasCapped,
    ),
    warnings: Object.freeze([]),
  })
}
