import type {
  ProjectCaseInsertImageSlot,
  ProjectCaseInsertTextBlock,
} from '../project/projectTypes.ts'
import type { JewelCaseRegionId } from '../templates/caseInsertTemplates.ts'
import type { CaseInsertPreviewLayout } from './caseInsertPreviewLayout.ts'
import {
  clampPixelRectToBounds,
  fitImageToJewelCaseRegion,
  type JewelCaseImageFitResult,
  type JewelCasePixelRect,
  type JewelCaseSpineSideId,
} from './jewelCaseLayout.ts'

export type JewelCaseSpineOverlayRole = 'branding' | 'logo'

export type JewelCaseSpineBoxLayout = {
  center: {
    x: number
    y: number
  }
  width: number
  height: number
  rotationDegrees: number
  boundingRect: JewelCasePixelRect
}

export type JewelCaseSpineTitlePreviewLayout = JewelCaseSpineBoxLayout & {
  fontSizePx: number
  lineHeightPx: number
}

const SPINE_TITLE_WIDTH_RATIO = 0.92
const SPINE_TITLE_HEIGHT_RATIO = 0.86
const SPINE_TITLE_FONT_MIN_PX = 10
const SPINE_TITLE_FONT_TARGET_PX = 32
const SPINE_TITLE_FONT_FILL_RATIO = 0.68

const spineOverlayConfig = {
  branding: {
    widthRatio: 0.24,
    heightRatio: 0.74,
    defaultCenter: { x: 50, y: 14 },
  },
  logo: {
    widthRatio: 0.82,
    heightRatio: 0.82,
    defaultCenter: { x: 50, y: 88 },
  },
} as const satisfies Record<
  JewelCaseSpineOverlayRole,
  {
    widthRatio: number
    heightRatio: number
    defaultCenter: { x: number; y: number }
  }
>

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function normalizePositiveNumber(value: number, fallback: number) {
  return Number.isFinite(value) && value > 0 ? value : fallback
}

function normalizePercent(value: number, fallback: number) {
  return Number.isFinite(value) ? clampNumber(value, 0, 100) : fallback
}

function normalizeRotationDegrees(value: number, fallback: number) {
  return Number.isFinite(value) ? value : fallback
}

function getDefaultSpineRotation(side: JewelCaseSpineSideId) {
  return side === 'left' ? -90 : 90
}

function rotationSwapsAxes(rotationDegrees: number) {
  const normalized = Math.abs(((rotationDegrees % 180) + 180) % 180)

  return normalized > 45 && normalized < 135
}

function getRegionBounds(
  layout: CaseInsertPreviewLayout,
  regionId: JewelCaseRegionId,
) {
  return layout.regions.find((region) => region.regionId === regionId)?.bounds ?? null
}

function getSpineRegionId(
  side: JewelCaseSpineSideId,
  safe = false,
): JewelCaseRegionId {
  if (side === 'left') {
    return safe ? 'leftSpineSafe' : 'leftSpine'
  }

  return safe ? 'rightSpineSafe' : 'rightSpine'
}

function getSpineSafeBounds(
  side: JewelCaseSpineSideId,
  layout: CaseInsertPreviewLayout,
) {
  return getRegionBounds(layout, getSpineRegionId(side, true))
}

function getClampedTransformedBoxLayout({
  safeBounds,
  width,
  height,
  rotationDegrees,
  centerPercent,
}: {
  safeBounds: JewelCasePixelRect
  width: number
  height: number
  rotationDegrees: number
  centerPercent: { x: number; y: number }
}): JewelCaseSpineBoxLayout {
  const swapsAxes = rotationSwapsAxes(rotationDegrees)
  const boundingWidth = swapsAxes ? height : width
  const boundingHeight = swapsAxes ? width : height
  const requestedCenter = {
    x: safeBounds.x + safeBounds.width * centerPercent.x / 100,
    y: safeBounds.y + safeBounds.height * centerPercent.y / 100,
  }
  const boundingRect = {
    x: requestedCenter.x - boundingWidth / 2,
    y: requestedCenter.y - boundingHeight / 2,
    width: boundingWidth,
    height: boundingHeight,
  }
  const clampedBoundingRect = clampPixelRectToBounds(boundingRect, safeBounds)

  return {
    center: {
      x: clampedBoundingRect.x + clampedBoundingRect.width / 2,
      y: clampedBoundingRect.y + clampedBoundingRect.height / 2,
    },
    width,
    height,
    rotationDegrees,
    boundingRect: clampedBoundingRect,
  }
}

export function getJewelCaseSpineBackgroundFit(
  side: JewelCaseSpineSideId,
  slot: ProjectCaseInsertImageSlot,
  layout: CaseInsertPreviewLayout,
): JewelCaseImageFitResult | null {
  const region = getRegionBounds(layout, getSpineRegionId(side))

  if (!region || !slot.enabled || !slot.imageDataUrl) {
    return null
  }

  return fitImageToJewelCaseRegion({
    imageSize: slot.imageSize,
    region,
    fit: slot.fit,
    scale: slot.layout.scale,
    offset: {
      x: slot.layout.x / 100,
      y: slot.layout.y / 100,
    },
  })
}

export function getJewelCaseSpineTitlePreviewLayout(
  side: JewelCaseSpineSideId,
  title: ProjectCaseInsertTextBlock,
  layout: CaseInsertPreviewLayout,
): JewelCaseSpineTitlePreviewLayout | null {
  const safeBounds = getSpineSafeBounds(side, layout)

  if (!safeBounds || !title.enabled || !title.value.trim()) {
    return null
  }

  const scale = normalizePositiveNumber(title.layout.scale, 1)
  const rotationDegrees = normalizeRotationDegrees(
    title.layout.rotation,
    getDefaultSpineRotation(side),
  )
  const fontSizePx = clampNumber(
    SPINE_TITLE_FONT_TARGET_PX * scale,
    SPINE_TITLE_FONT_MIN_PX,
    safeBounds.width * SPINE_TITLE_FONT_FILL_RATIO,
  )
  const box = getClampedTransformedBoxLayout({
    safeBounds,
    width: safeBounds.height * SPINE_TITLE_WIDTH_RATIO,
    height: safeBounds.width * SPINE_TITLE_HEIGHT_RATIO,
    rotationDegrees,
    centerPercent: {
      x: normalizePercent(title.layout.x, 50),
      y: normalizePercent(title.layout.y, 50),
    },
  })

  return {
    ...box,
    fontSizePx,
    lineHeightPx: fontSizePx * 1.1,
  }
}

export function getJewelCaseSpineImageSlotPreviewLayout(
  side: JewelCaseSpineSideId,
  slot: ProjectCaseInsertImageSlot,
  layout: CaseInsertPreviewLayout,
  role: JewelCaseSpineOverlayRole,
): JewelCaseSpineBoxLayout | null {
  const safeBounds = getSpineSafeBounds(side, layout)
  const config = spineOverlayConfig[role]
  const canRenderFallback = role === 'branding'

  if (!safeBounds || !slot.enabled || (!canRenderFallback && !slot.imageDataUrl)) {
    return null
  }

  const scale = normalizePositiveNumber(slot.layout.scale, 1)
  const rotationDegrees = normalizeRotationDegrees(
    slot.layout.rotation,
    role === 'branding' ? getDefaultSpineRotation(side) : 0,
  )

  return getClampedTransformedBoxLayout({
    safeBounds,
    width: (role === 'logo' ? safeBounds.width : safeBounds.height) *
      config.widthRatio *
      scale,
    height: safeBounds.width * config.heightRatio * scale,
    rotationDegrees,
    centerPercent: {
      x: normalizePercent(slot.layout.x, config.defaultCenter.x),
      y: normalizePercent(slot.layout.y, config.defaultCenter.y),
    },
  })
}
