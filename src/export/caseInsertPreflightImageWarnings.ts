import {
  getCaseInsertLogoSlotRenderInfo,
} from '../caseInsert/brandingLogoSlots.ts'
import {
  isOptionalVisualFeatureEnabled,
  shouldRenderOptionalVisualFeature,
} from '../editor/optionalVisualFeature.ts'
import type {
  JewelCaseImageFitResult,
  JewelCasePixelRect,
} from '../layout/jewelCaseLayout.ts'
import type {
  ProjectCaseInsertImageSlot,
} from '../project/projectTypes.ts'
import {
  buildLayoutValueWarnings,
  buildUpscaleWarnings,
  createMissingImageSizeWarning,
  createMissingImageWarning,
  createUnresolvedFitWarning,
  createUnresolvedPlacementWarning,
} from './preflightWarnings.ts'

export type EdgeWarningOptions = {
  regionLabel: string
}

const SAFE_EDGE_WARNING_MIN_PX = 8
const SAFE_EDGE_WARNING_RATIO = 0.015

export function getRenderedLogoSlotWarnings(params: {
  slot: ProjectCaseInsertImageSlot
  label: string
  rect: JewelCasePixelRect | null
  safeBounds: JewelCasePixelRect | null
  edge?: EdgeWarningOptions
}) {
  const { slot, label, rect } = params
  const renderInfo = getCaseInsertLogoSlotRenderInfo(slot)
  const warnings = getLogoSlotDataWarnings(label, slot, renderInfo)

  warnings.push(...buildLayoutValueWarnings(label, slot.layout))

  if (!isOptionalVisualFeatureEnabled(slot) || !renderInfo) {
    return warnings
  }

  if (!rect) {
    warnings.push(createUnresolvedPlacementWarning(label))
    return warnings
  }

  warnings.push(...buildUpscaleWarnings(label, renderInfo.imageSize, rect))

  if (params.safeBounds && params.edge) {
    warnings.push(
      ...getSafeEdgeWarnings(label, rect, params.safeBounds, params.edge),
    )
  }

  return warnings
}

export function getRenderedImageSlotWarnings(params: {
  slot: ProjectCaseInsertImageSlot
  label: string
  rect: JewelCasePixelRect | null
  safeBounds: JewelCasePixelRect | null
  edge?: EdgeWarningOptions
}) {
  const { slot, label, rect } = params
  const warnings = getImageSlotDataWarnings(label, slot)
  const imageSize = slot.imageSize

  warnings.push(...buildLayoutValueWarnings(label, slot.layout))

  if (
    !shouldRenderOptionalVisualFeature(
      slot,
      Boolean(slot.imageDataUrl && imageSize),
    ) ||
    !imageSize
  ) {
    return warnings
  }

  if (!rect) {
    warnings.push(createUnresolvedPlacementWarning(label))
    return warnings
  }

  warnings.push(...buildUpscaleWarnings(label, imageSize, rect))

  if (params.safeBounds && params.edge) {
    warnings.push(...getSafeEdgeWarnings(label, rect, params.safeBounds, params.edge))
  }

  return warnings
}

export function getSpineLogoSlotWarnings(params: {
  slot: ProjectCaseInsertImageSlot
  label: string
  layout: { width: number; height: number } | null
}) {
  const renderInfo = getCaseInsertLogoSlotRenderInfo(params.slot)
  const warnings = getLogoSlotDataWarnings(
    params.label,
    params.slot,
    renderInfo,
  )

  warnings.push(...buildLayoutValueWarnings(params.label, params.slot.layout))

  if (
    !isOptionalVisualFeatureEnabled(params.slot) ||
    !renderInfo ||
    !params.layout
  ) {
    return warnings
  }

  warnings.push(
    ...buildUpscaleWarnings(params.label, renderInfo.imageSize, {
      width: params.layout.width,
      height: params.layout.height,
    }),
  )

  return warnings
}

export function getSpineImageSlotWarnings(params: {
  slot: ProjectCaseInsertImageSlot
  label: string
  layout: { width: number; height: number } | null
  hasTextFallback: boolean
}) {
  const warnings = getImageSlotDataWarnings(
    params.label,
    params.slot,
    params.hasTextFallback,
  )

  warnings.push(...buildLayoutValueWarnings(params.label, params.slot.layout))

  if (
    !isOptionalVisualFeatureEnabled(params.slot) ||
    !params.slot.imageDataUrl ||
    !params.slot.imageSize ||
    !params.layout
  ) {
    return warnings
  }

  warnings.push(
    ...buildUpscaleWarnings(params.label, params.slot.imageSize, {
      width: params.layout.width,
      height: params.layout.height,
    }),
  )

  return warnings
}

export function getImageFitWarnings(
  label: string,
  slot: ProjectCaseInsertImageSlot,
  fit: JewelCaseImageFitResult | null,
  options: {
    allowEmptySpaceWarning?: boolean
    warnMissingImage?: boolean
  } = {},
) {
  const warnings = getImageSlotDataWarnings(
    label,
    slot,
    false,
    { warnMissingImage: options.warnMissingImage },
  )
  const imageSize = slot.imageSize

  warnings.push(...buildLayoutValueWarnings(label, slot.layout))

  if (
    !shouldRenderOptionalVisualFeature(
      slot,
      Boolean(slot.imageDataUrl && imageSize),
    ) ||
    !imageSize
  ) {
    return warnings
  }

  if (!fit) {
    warnings.push(createUnresolvedFitWarning(label))
    return warnings
  }

  warnings.push(...buildUpscaleWarnings(label, imageSize, fit.visibleRect))

  if (options.allowEmptySpaceWarning && fit.hasEmptySpace) {
    warnings.push(
      `${label} does not cover its print region; blank paper will remain visible.`,
    )
  }

  return warnings
}

export function getImageSlotDataWarnings(
  label: string,
  slot: ProjectCaseInsertImageSlot,
  hasTextFallback = false,
  options: {
    warnMissingImage?: boolean
  } = {},
) {
  if (!isOptionalVisualFeatureEnabled(slot)) {
    return []
  }

  if (!slot.imageDataUrl) {
    if (options.warnMissingImage === false) {
      return []
    }

    return hasTextFallback
      ? [`${label} has no image selected; text fallback will export instead.`]
      : [createMissingImageWarning(label)]
  }

  if (!slot.imageSize) {
    return [createMissingImageSizeWarning(label)]
  }

  return []
}

function getLogoSlotDataWarnings(
  label: string,
  slot: ProjectCaseInsertImageSlot,
  renderInfo: ReturnType<typeof getCaseInsertLogoSlotRenderInfo>,
) {
  if (!isOptionalVisualFeatureEnabled(slot)) {
    return []
  }

  if (!renderInfo) {
    return [createMissingImageWarning(label)]
  }

  if (renderInfo.isBundledFallback) {
    return []
  }

  if (!slot.imageSize) {
    return [createMissingImageSizeWarning(label)]
  }

  return []
}

export function getSafeEdgeWarnings(
  label: string,
  rect: JewelCasePixelRect,
  safeBounds: JewelCasePixelRect,
  options: EdgeWarningOptions,
) {
  const threshold = Math.max(
    SAFE_EDGE_WARNING_MIN_PX,
    Math.min(safeBounds.width, safeBounds.height) * SAFE_EDGE_WARNING_RATIO,
  )
  const closeEdges = [
    safeBounds.x + threshold >= rect.x ? 'left' : '',
    safeBounds.y + threshold >= rect.y ? 'top' : '',
    safeBounds.x + safeBounds.width - threshold <= rect.x + rect.width
      ? 'right'
      : '',
    safeBounds.y + safeBounds.height - threshold <= rect.y + rect.height
      ? 'bottom'
      : '',
  ].filter(Boolean)

  if (closeEdges.length === 0) {
    return []
  }

  return [
    `${label} is very close to the ${closeEdges.join('/')} edge of the ${options.regionLabel}; inspect trim and fold clearance before printing.`,
  ]
}
