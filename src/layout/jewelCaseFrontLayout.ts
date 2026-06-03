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
} from './jewelCaseLayout.ts'

export type JewelCaseFrontImageSlotRole =
  | 'titleArtwork'
  | 'calloutArtwork'
  | 'logo'
  | 'mark'

export type JewelCaseFrontTextBlockLayout = {
  bounds: JewelCasePixelRect
  fontSizePx: number
  lineHeightPx: number
}

const imageSlotWidthRatioByRole: Record<JewelCaseFrontImageSlotRole, number> = {
  titleArtwork: 0.72,
  calloutArtwork: 0.36,
  logo: 0.2,
  mark: 0.16,
}

const imageSlotFallbackCenterByRole: Record<
  JewelCaseFrontImageSlotRole,
  { x: number; y: number }
> = {
  titleArtwork: { x: 50, y: 24 },
  calloutArtwork: { x: 50, y: 62 },
  logo: { x: 20, y: 84 },
  mark: { x: 82, y: 84 },
}

const CALLOUT_TEXT_WIDTH_RATIO = 0.74
const CALLOUT_TEXT_HEIGHT_RATIO = 0.12
const CALLOUT_TEXT_MIN_FONT_RATIO = 0.022
const CALLOUT_TEXT_TARGET_FONT_RATIO = 0.034
const CALLOUT_TEXT_MAX_FONT_RATIO = 0.056
const CALLOUT_TEXT_DEFAULT_CENTER = { x: 50, y: 82 }

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function normalizePositiveNumber(value: number, fallback: number) {
  return Number.isFinite(value) && value > 0 ? value : fallback
}

function normalizePercent(value: number, fallback: number) {
  return Number.isFinite(value) ? clampNumber(value, 0, 100) : fallback
}

function getRegionBounds(
  layout: CaseInsertPreviewLayout,
  regionId: JewelCaseRegionId,
) {
  return layout.regions.find((region) => region.regionId === regionId)?.bounds ?? null
}

function getCenteredRect(
  bounds: JewelCasePixelRect,
  width: number,
  height: number,
  centerPercent: { x: number; y: number },
): JewelCasePixelRect {
  const centerX = bounds.x + bounds.width * centerPercent.x / 100
  const centerY = bounds.y + bounds.height * centerPercent.y / 100

  return {
    x: centerX - width / 2,
    y: centerY - height / 2,
    width,
    height,
  }
}

export function getJewelCaseFrontPreviewRegionBounds(
  layout: CaseInsertPreviewLayout,
  regionId: JewelCaseRegionId = 'front',
) {
  return getRegionBounds(layout, regionId)
}

export function getJewelCaseFrontBackgroundFit(
  slot: ProjectCaseInsertImageSlot,
  layout: CaseInsertPreviewLayout,
): JewelCaseImageFitResult | null {
  const region = getJewelCaseFrontPreviewRegionBounds(layout, 'front')

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

export function getJewelCaseFrontImageSlotPreviewRect(
  slot: ProjectCaseInsertImageSlot,
  layout: CaseInsertPreviewLayout,
  role: JewelCaseFrontImageSlotRole,
): JewelCasePixelRect | null {
  const safeBounds = getJewelCaseFrontPreviewRegionBounds(layout, 'frontSafe')

  if (!safeBounds || !slot.enabled || !slot.imageDataUrl || !slot.imageSize) {
    return null
  }

  const fallbackCenter = imageSlotFallbackCenterByRole[role]
  const centerPercent = {
    x: normalizePercent(slot.layout.x, fallbackCenter.x),
    y: normalizePercent(slot.layout.y, fallbackCenter.y),
  }
  const scale = normalizePositiveNumber(slot.layout.scale, 1)
  const aspectRatio = slot.imageSize.width / slot.imageSize.height
  const maxWidth = safeBounds.width * imageSlotWidthRatioByRole[role] * scale
  const width = Math.min(maxWidth, safeBounds.width)
  const height = width / aspectRatio
  const fittedRect = height > safeBounds.height
    ? {
        width: safeBounds.height * aspectRatio,
        height: safeBounds.height,
      }
    : { width, height }

  return clampPixelRectToBounds(
    getCenteredRect(
      safeBounds,
      fittedRect.width,
      fittedRect.height,
      centerPercent,
    ),
    safeBounds,
  )
}

export function getJewelCaseFrontTextBlockPreviewLayout(
  textBlock: ProjectCaseInsertTextBlock,
  layout: CaseInsertPreviewLayout,
): JewelCaseFrontTextBlockLayout | null {
  const safeBounds = getJewelCaseFrontPreviewRegionBounds(layout, 'frontSafe')

  if (!safeBounds || !textBlock.enabled || !textBlock.value.trim()) {
    return null
  }

  const scale = normalizePositiveNumber(textBlock.layout.scale, 1)
  const centerPercent = {
    x: normalizePercent(textBlock.layout.x, CALLOUT_TEXT_DEFAULT_CENTER.x),
    y: normalizePercent(textBlock.layout.y, CALLOUT_TEXT_DEFAULT_CENTER.y),
  }
  const width = safeBounds.width * CALLOUT_TEXT_WIDTH_RATIO
  const height = safeBounds.height * CALLOUT_TEXT_HEIGHT_RATIO * scale
  const fontSizePx = clampNumber(
    safeBounds.width * CALLOUT_TEXT_TARGET_FONT_RATIO * scale,
    safeBounds.width * CALLOUT_TEXT_MIN_FONT_RATIO,
    safeBounds.width * CALLOUT_TEXT_MAX_FONT_RATIO,
  )
  const bounds = clampPixelRectToBounds(
    getCenteredRect(safeBounds, width, height, centerPercent),
    safeBounds,
  )

  return {
    bounds,
    fontSizePx,
    lineHeightPx: fontSizePx * 1.14,
  }
}
