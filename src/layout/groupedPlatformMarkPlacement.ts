import { getPlatformMarkPlaceholderImageSize } from '../assets/assetManifest.ts'
import {
  doesRectAvoidDiscCenterCircle,
  getInnerNoPrintRadiusPercent,
  getPlatformMarkBoundsPercent,
  getSafeZoneRadiusPercent,
  type RenderBoundsPercent,
} from '../disc/geometry.ts'
import { isOptionalVisualFeatureEnabled } from '../editor/optionalVisualFeature.ts'
import { hasCustomMarkImage } from '../editor/markImageSource.ts'
import { hasActiveImageContent } from '../image/imageContentBounds.ts'
import {
  getProjectPlatformMarkAsset,
  PLATFORM_MARK_OPTIONS,
} from '../project/projectPlatformMarks.ts'
import type {
  BackgroundImageSize,
  PlatformMarkValue,
  ProjectPlatformMarkAsset,
  ProjectPlatformMarks,
} from '../project/projectTypes.ts'
import type { DiscTemplate } from '../types/template.ts'
import { clampPlatformMarkLayoutToSafeZone } from './discElementSafeZone.ts'

const DEFAULT_GAP_PERCENT = 1.5
const DEFAULT_MINIMUM_SCALE = 0.25
const SCALE_SEARCH_ITERATIONS = 32
const EPSILON = 0.000001
const CANONICAL_PLATFORM_MARK_VALUES = Object.freeze(
  PLATFORM_MARK_OPTIONS.map(({ value }) => value),
)

export type DiscNormalizedRegion = Readonly<{
  centerXPercent: number
  centerYPercent: number
  widthPercent: number
  heightPercent: number
}>

export type GroupedPlatformMarkPlacementIgnoredReason =
  | 'disabled'
  | 'invalid-layout'
  | 'unrenderable'

export type GroupedPlatformMarkPlacementIgnoredMark = Readonly<{
  value: PlatformMarkValue
  reason: GroupedPlatformMarkPlacementIgnoredReason
}>

export type GroupedPlatformMarkLayoutUpdate = Readonly<{
  value: PlatformMarkValue
  x: number
  y: number
  scale: number
}>

export type GroupedPlatformMarkPlacementResult = Readonly<{
  status:
    | 'placed'
    | 'no-eligible-marks'
    | 'invalid-region'
    | 'cannot-fit'
  updates: readonly GroupedPlatformMarkLayoutUpdate[]
  ignoredMarks: readonly GroupedPlatformMarkPlacementIgnoredMark[]
}>

export type GroupedPlatformMarkPlacementInput = Readonly<{
  platformMarks: ProjectPlatformMarks
  region: DiscNormalizedRegion
  template: DiscTemplate
  gapPercent?: number
  preferredScale?: number
  minimumScale?: number
}>

type EligibleMark = Readonly<{
  value: PlatformMarkValue
  asset: ProjectPlatformMarkAsset
  imageSize: BackgroundImageSize
  usesCustomImage: boolean
}>

type PositionedMark = Readonly<{
  mark: EligibleMark
  bounds: RenderBoundsPercent
  x: number
  y: number
  scale: number
}>

const EMPTY_UPDATES = Object.freeze([]) as readonly GroupedPlatformMarkLayoutUpdate[]
const EMPTY_IGNORED_MARKS = Object.freeze(
  [],
) as readonly GroupedPlatformMarkPlacementIgnoredMark[]

function freezeResult(
  status: GroupedPlatformMarkPlacementResult['status'],
  updates: readonly GroupedPlatformMarkLayoutUpdate[] = EMPTY_UPDATES,
  ignoredMarks: readonly GroupedPlatformMarkPlacementIgnoredMark[] =
    EMPTY_IGNORED_MARKS,
): GroupedPlatformMarkPlacementResult {
  return Object.freeze({
    status,
    updates: Object.freeze(updates.map((update) => Object.freeze(update))),
    ignoredMarks: Object.freeze(
      ignoredMarks.map((ignoredMark) => Object.freeze(ignoredMark)),
    ),
  })
}

function isFinitePositive(value: number) {
  return Number.isFinite(value) && value > 0
}

function isValidRegion(region: DiscNormalizedRegion, template: DiscTemplate) {
  if (
    !Number.isFinite(region.centerXPercent) ||
    !Number.isFinite(region.centerYPercent) ||
    !isFinitePositive(region.widthPercent) ||
    !isFinitePositive(region.heightPercent)
  ) {
    return false
  }

  const halfWidth = region.widthPercent / 2
  const halfHeight = region.heightPercent / 2
  const left = region.centerXPercent - halfWidth
  const right = region.centerXPercent + halfWidth
  const top = region.centerYPercent - halfHeight
  const bottom = region.centerYPercent + halfHeight

  if (
    left < 0 ||
    right > 100 ||
    top < 0 ||
    bottom > 100
  ) {
    return false
  }

  const deltaX = Math.abs(region.centerXPercent - 50)
  const deltaY = Math.abs(region.centerYPercent - 50)
  const nearestX = Math.max(0, deltaX - halfWidth)
  const nearestY = Math.max(0, deltaY - halfHeight)
  const nearestDistance = Math.hypot(nearestX, nearestY)
  const farthestDistance = Math.hypot(
    deltaX + halfWidth,
    deltaY + halfHeight,
  )

  return nearestDistance <= getSafeZoneRadiusPercent(template) + EPSILON &&
    farthestDistance >= getInnerNoPrintRadiusPercent(template) - EPSILON
}

function getPhysicalCenterHoleRadiusPercent(template: DiscTemplate) {
  if (!isFinitePositive(template.outerDiameterMm)) return 0

  return Math.max(0, template.physicalCenterHoleDiameterMm) /
    template.outerDiameterMm * 50
}

function getRenderableImageSize(
  value: PlatformMarkValue,
  asset: ProjectPlatformMarkAsset,
) {
  const usesCustomImage = hasCustomMarkImage(
    asset.source,
    asset.customImageDataUrl,
  )
  const imageSize = usesCustomImage
    ? asset.customImageSize
    : getPlatformMarkPlaceholderImageSize(value, asset.theme)

  return imageSize &&
      isFinitePositive(imageSize.width) &&
      isFinitePositive(imageSize.height) &&
      hasActiveImageContent(imageSize)
    ? { imageSize, usesCustomImage }
    : null
}

function collectEligibleMarks(
  platformMarks: ProjectPlatformMarks,
  template: DiscTemplate,
) {
  const selectedValues = new Set(platformMarks.values)
  const eligibleMarks: EligibleMark[] = []
  const ignoredMarks: GroupedPlatformMarkPlacementIgnoredMark[] = []

  for (const value of CANONICAL_PLATFORM_MARK_VALUES) {
    if (!selectedValues.has(value)) continue

    const asset = getProjectPlatformMarkAsset(platformMarks, value, template)

    if (!isOptionalVisualFeatureEnabled(asset.layout)) {
      ignoredMarks.push({ value, reason: 'disabled' })
      continue
    }

    if (!isFinitePositive(asset.layout.scale)) {
      ignoredMarks.push({ value, reason: 'invalid-layout' })
      continue
    }

    const renderableImage = getRenderableImageSize(value, asset)

    if (!renderableImage) {
      ignoredMarks.push({ value, reason: 'unrenderable' })
      continue
    }

    eligibleMarks.push({
      value,
      asset,
      ...renderableImage,
    })
  }

  return { eligibleMarks, ignoredMarks }
}

function getBounds(mark: EligibleMark, scale: number) {
  return getPlatformMarkBoundsPercent(mark.imageSize, scale)
}

function createRows(marks: readonly EligibleMark[], rowCounts: readonly number[]) {
  let start = 0

  return rowCounts.map((count) => {
    const row = marks.slice(start, start + count)
    start += count
    return row
  })
}

function buildCenteredRows({
  gapPercent,
  marks,
  region,
  rowCounts,
  scale,
}: {
  gapPercent: number
  marks: readonly EligibleMark[]
  region: DiscNormalizedRegion
  rowCounts: readonly number[]
  scale: number
}) {
  const rows = createRows(marks, rowCounts)
  const rowMetrics = rows.map((row) => {
    const bounds = row.map((mark) => getBounds(mark, scale))
    const width = bounds.reduce(
      (total, itemBounds) => total + itemBounds.halfWidth * 2,
      0,
    ) + gapPercent * Math.max(0, row.length - 1)
    const height = Math.max(
      0,
      ...bounds.map((itemBounds) => itemBounds.halfHeight * 2),
    )

    return { row, bounds, width, height }
  })
  const totalHeight = rowMetrics.reduce(
    (total, row) => total + row.height,
    0,
  ) + gapPercent * Math.max(0, rowMetrics.length - 1)

  if (
    totalHeight > region.heightPercent + EPSILON ||
    rowMetrics.some((row) => row.width > region.widthPercent + EPSILON)
  ) {
    return null
  }

  const positioned: PositionedMark[] = []
  let rowTop = region.centerYPercent - totalHeight / 2

  for (const rowMetric of rowMetrics) {
    const y = rowTop + rowMetric.height / 2
    let itemLeft = region.centerXPercent - rowMetric.width / 2

    rowMetric.row.forEach((mark, index) => {
      const bounds = rowMetric.bounds[index]
      const x = itemLeft + bounds.halfWidth

      positioned.push({ mark, bounds, x, y, scale })
      itemLeft += bounds.halfWidth * 2 + gapPercent
    })
    rowTop += rowMetric.height + gapPercent
  }

  return positioned
}

function getVerticalOffsetCandidates(
  positioned: readonly PositionedMark[],
  region: DiscNormalizedRegion,
  innerRadius: number,
) {
  const groupTop = Math.min(
    ...positioned.map(({ bounds, y }) => y - bounds.halfHeight),
  )
  const groupBottom = Math.max(
    ...positioned.map(({ bounds, y }) => y + bounds.halfHeight),
  )
  const minOffset = region.centerYPercent - region.heightPercent / 2 - groupTop
  const maxOffset = region.centerYPercent + region.heightPercent / 2 - groupBottom
  let downwardOffset = 0
  let upwardOffset = 0

  for (const { bounds, x, y } of positioned) {
    const horizontalDistance = Math.max(
      0,
      Math.abs(x - 50) - bounds.halfWidth,
    )

    if (horizontalDistance >= innerRadius) continue

    const verticalClearance = Math.sqrt(
      Math.max(0, innerRadius ** 2 - horizontalDistance ** 2),
    )
    downwardOffset = Math.max(
      downwardOffset,
      50 + bounds.halfHeight + verticalClearance - y,
    )
    upwardOffset = Math.max(
      upwardOffset,
      y - (50 - bounds.halfHeight - verticalClearance),
    )
  }

  const candidates = [
    0,
    Math.min(maxOffset, Math.max(minOffset, downwardOffset)),
    Math.min(maxOffset, Math.max(minOffset, -upwardOffset)),
    maxOffset,
    minOffset,
  ]

  return candidates.filter((offset, index) =>
    Number.isFinite(offset) &&
    offset >= minOffset - EPSILON &&
    offset <= maxOffset + EPSILON &&
    candidates.findIndex((candidate) =>
      Math.abs(candidate - offset) <= EPSILON,
    ) === index,
  )
}

function isInsideRegion(
  positioned: PositionedMark,
  region: DiscNormalizedRegion,
) {
  const left = region.centerXPercent - region.widthPercent / 2
  const right = region.centerXPercent + region.widthPercent / 2
  const top = region.centerYPercent - region.heightPercent / 2
  const bottom = region.centerYPercent + region.heightPercent / 2

  return positioned.x - positioned.bounds.halfWidth >= left - EPSILON &&
    positioned.x + positioned.bounds.halfWidth <= right + EPSILON &&
    positioned.y - positioned.bounds.halfHeight >= top - EPSILON &&
    positioned.y + positioned.bounds.halfHeight <= bottom + EPSILON
}

function hasRequiredGap(
  first: PositionedMark,
  second: PositionedMark,
  gapPercent: number,
) {
  const horizontalGap = Math.max(
    second.x - second.bounds.halfWidth -
      (first.x + first.bounds.halfWidth),
    first.x - first.bounds.halfWidth -
      (second.x + second.bounds.halfWidth),
  )
  const verticalGap = Math.max(
    second.y - second.bounds.halfHeight -
      (first.y + first.bounds.halfHeight),
    first.y - first.bounds.halfHeight -
      (second.y + second.bounds.halfHeight),
  )

  return horizontalGap >= gapPercent - EPSILON ||
    verticalGap >= gapPercent - EPSILON
}

function validatePlacement(
  positioned: readonly PositionedMark[],
  region: DiscNormalizedRegion,
  template: DiscTemplate,
  gapPercent: number,
) {
  const physicalHoleRadius = getPhysicalCenterHoleRadiusPercent(template)

  for (const item of positioned) {
    if (
      !isInsideRegion(item, region) ||
      !doesRectAvoidDiscCenterCircle(
        { x: item.x, y: item.y },
        physicalHoleRadius,
        item.bounds,
      )
    ) {
      return false
    }
  }

  for (let index = 0; index < positioned.length; index += 1) {
    for (let nextIndex = index + 1; nextIndex < positioned.length; nextIndex += 1) {
      if (!hasRequiredGap(positioned[index], positioned[nextIndex], gapPercent)) {
        return false
      }
    }
  }

  return true
}

function clampPlacement(
  positioned: readonly PositionedMark[],
  template: DiscTemplate,
) {
  return positioned.map((item) => {
    const layout = clampPlatformMarkLayoutToSafeZone(
      {
        source: item.mark.usesCustomImage ? 'custom' : 'placeholder',
        customImageSize: item.mark.usesCustomImage
          ? item.mark.imageSize
          : null,
        theme: item.mark.asset.theme,
        value: item.mark.value,
        layout: {
          ...item.mark.asset.layout,
          x: item.x,
          y: item.y,
          scale: item.scale,
        },
      },
      template,
    )

    return {
      ...item,
      x: layout.x,
      y: layout.y,
      scale: layout.scale,
      bounds: getBounds(item.mark, layout.scale),
    }
  })
}

function tryPlacementAtScale({
  gapPercent,
  marks,
  region,
  rowCounts,
  scale,
  template,
}: {
  gapPercent: number
  marks: readonly EligibleMark[]
  region: DiscNormalizedRegion
  rowCounts: readonly number[]
  scale: number
  template: DiscTemplate
}) {
  const centered = buildCenteredRows({
    gapPercent,
    marks,
    region,
    rowCounts,
    scale,
  })

  if (!centered) return null

  const offsets = getVerticalOffsetCandidates(
    centered,
    region,
    getInnerNoPrintRadiusPercent(template),
  )

  for (const offset of offsets) {
    const shifted = centered.map((item) => ({
      ...item,
      y: item.y + offset,
    }))
    const clamped = clampPlacement(shifted, template)

    if (validatePlacement(clamped, region, template, gapPercent)) {
      return clamped
    }
  }

  return null
}

function findLargestPlacement({
  gapPercent,
  marks,
  minimumScale,
  preferredScale,
  region,
  rowCounts,
  template,
}: {
  gapPercent: number
  marks: readonly EligibleMark[]
  minimumScale: number
  preferredScale: number
  region: DiscNormalizedRegion
  rowCounts: readonly number[]
  template: DiscTemplate
}) {
  const preferredPlacement = tryPlacementAtScale({
    gapPercent,
    marks,
    region,
    rowCounts,
    scale: preferredScale,
    template,
  })

  if (preferredPlacement) return preferredPlacement

  let bestPlacement = tryPlacementAtScale({
    gapPercent,
    marks,
    region,
    rowCounts,
    scale: minimumScale,
    template,
  })

  if (!bestPlacement) return null

  let low = minimumScale
  let high = preferredScale

  for (let iteration = 0; iteration < SCALE_SEARCH_ITERATIONS; iteration += 1) {
    const scale = (low + high) / 2
    const placement = tryPlacementAtScale({
      gapPercent,
      marks,
      region,
      rowCounts,
      scale,
      template,
    })

    if (placement) {
      low = scale
      bestPlacement = placement
    } else {
      high = scale
    }
  }

  return bestPlacement
}

function toUpdates(positioned: readonly PositionedMark[]) {
  return positioned.map(({ mark, scale, x, y }) => ({
    value: mark.value,
    x,
    y,
    scale,
  }))
}

export function placeGroupedPlatformMarks({
  gapPercent = DEFAULT_GAP_PERCENT,
  minimumScale = DEFAULT_MINIMUM_SCALE,
  platformMarks,
  preferredScale,
  region,
  template,
}: GroupedPlatformMarkPlacementInput): GroupedPlatformMarkPlacementResult {
  if (
    !isValidRegion(region, template) ||
    !Number.isFinite(gapPercent) ||
    gapPercent < 0 ||
    (preferredScale !== undefined && !isFinitePositive(preferredScale)) ||
    !isFinitePositive(minimumScale)
  ) {
    return freezeResult('invalid-region')
  }

  const { eligibleMarks, ignoredMarks } = collectEligibleMarks(
    platformMarks,
    template,
  )

  if (eligibleMarks.length === 0) {
    return freezeResult('no-eligible-marks', EMPTY_UPDATES, ignoredMarks)
  }

  const resolvedPreferredScale = preferredScale ?? Math.min(
    ...eligibleMarks.map(({ asset }) => asset.layout.scale),
  )
  const resolvedMinimumScale = Math.min(minimumScale, resolvedPreferredScale)
  const oneRow = [eligibleMarks.length]
  const oneRowPlacement = findLargestPlacement({
    gapPercent,
    marks: eligibleMarks,
    minimumScale: resolvedMinimumScale,
    preferredScale: resolvedPreferredScale,
    region,
    rowCounts: oneRow,
    template,
  })

  if (oneRowPlacement?.[0]?.scale === resolvedPreferredScale) {
    return freezeResult('placed', toUpdates(oneRowPlacement), ignoredMarks)
  }

  const twoRows = eligibleMarks.length > 1
    ? [Math.ceil(eligibleMarks.length / 2), Math.floor(eligibleMarks.length / 2)]
    : null
  const twoRowPlacement = twoRows
    ? findLargestPlacement({
        gapPercent,
        marks: eligibleMarks,
        minimumScale: resolvedMinimumScale,
        preferredScale: resolvedPreferredScale,
        region,
        rowCounts: twoRows,
        template,
      })
    : null
  const placement = !oneRowPlacement
    ? twoRowPlacement
    : !twoRowPlacement ||
        oneRowPlacement[0].scale >= twoRowPlacement[0].scale - EPSILON
      ? oneRowPlacement
      : twoRowPlacement

  return placement
    ? freezeResult('placed', toUpdates(placement), ignoredMarks)
    : freezeResult('cannot-fit', EMPTY_UPDATES, ignoredMarks)
}
