import {
  DEFAULT_CASE_INSERT_TEMPLATE_TYPE,
  type SupportedCaseInsertTemplateType,
} from '../editor/editorTypes.ts'
import type { BackgroundImageSize } from '../project/projectTypes.ts'
import {
  clampLayoutNumber,
  getPositiveFiniteLayoutNumber,
} from './layoutRangeMath.ts'
import {
  getImageContentBounds,
  getImageContentSize,
  isEmptyImageContentBounds,
} from '../image/imageContentBounds.ts'
import {
  getCaseInsertTemplate,
  getCaseInsertTemplateRegion,
  type JewelCaseRegionId,
  type JewelCaseSurfaceId,
} from '../templates/caseInsertTemplates.ts'
import {
  DEFAULT_TEMPLATE_EXPORT_DPI,
  getTemplateSurface,
  getTemplateSurfaceExportPixelSize,
  mmToTemplatePixels,
} from '../templates/templateModel.ts'
import type { TemplateRect, TemplateSurface } from '../types/template.ts'

export type JewelCasePixelSize = {
  width: number
  height: number
}

export type JewelCasePixelRect = JewelCasePixelSize & {
  x: number
  y: number
}

export type JewelCaseRegionPixelBounds = JewelCasePixelRect & {
  regionId: JewelCaseRegionId
  surfaceId: JewelCaseSurfaceId
}

export type JewelCasePixelBoundsOptions = {
  templateId?: SupportedCaseInsertTemplateType
  dpi?: number
  surfaceSize?: JewelCasePixelSize
}

export type JewelCaseRegionLayout = {
  regionId: JewelCaseRegionId
  surfaceId: JewelCaseSurfaceId
  bounds: JewelCaseRegionPixelBounds
  safeRegionId: JewelCaseRegionId
  safeBounds: JewelCaseRegionPixelBounds
}

export type JewelCaseSpineSideId = 'left' | 'right'

export type JewelCaseRectOverflow = {
  left: number
  top: number
  right: number
  bottom: number
}

export type JewelCaseSafePlacementResult = {
  regionId: JewelCaseRegionId
  safeRegionId: JewelCaseRegionId
  safeBounds: JewelCaseRegionPixelBounds
  rect: JewelCasePixelRect
  clampedRect: JewelCasePixelRect
  overflow: JewelCaseRectOverflow
  isUnsafe: boolean
  clampedRectIsUnsafe: boolean
}

export type JewelCaseImageFitMode = 'cover' | 'contain' | 'scale' | 'crop'

export type JewelCaseCropOffset = {
  x: number
  y: number
}

export type JewelCaseImageFitInput = {
  imageSize: JewelCasePixelSize | null
  region: JewelCasePixelRect
  fit: JewelCaseImageFitMode
  scale?: number
  offset?: Partial<JewelCaseCropOffset>
}

export type JewelCaseImageFitResult = {
  fit: JewelCaseImageFitMode
  region: JewelCasePixelRect
  imageRect: JewelCasePixelRect
  visibleRect: JewelCasePixelRect
  sourceRect: JewelCasePixelRect
  scale: number
  cropOffset: JewelCaseCropOffset
  isCropped: boolean
  hasEmptySpace: boolean
}

export type JewelCaseScreenshotSlotLayout = {
  id: string
  index: number
  regionId: 'backPanelSafe'
  bounds: JewelCasePixelRect
  safeBounds: JewelCaseRegionPixelBounds
}

export type JewelCaseSpineTextLayout = {
  side: JewelCaseSpineSideId
  regionId: 'leftSpineSafe' | 'rightSpineSafe'
  surfaceId: 'back'
  bounds: JewelCaseRegionPixelBounds
  rotationDegrees: number
  writingMode: 'vertical'
  maxLineWidthPx: number
  minReadableFontSizePx: number
  recommendedFontSizePx: number
  maxFontSizePx: number
  lineHeightPx: number
}

export type JewelCaseMinimumImageResolution = {
  regionId: JewelCaseRegionId
  surfaceId: JewelCaseSurfaceId
  widthPx: number
  heightPx: number
  dpi: number
  qualityScale: number
}

const DEFAULT_SCREENSHOT_ASPECT_RATIO = 16 / 9
const DEFAULT_SCREENSHOT_SLOT_COUNT = 3
const SCREENSHOT_SLOT_COLUMN_LIMIT = 3
const SCREENSHOT_SLOT_HORIZONTAL_GAP_RATIO = 0.025
const SCREENSHOT_SLOT_VERTICAL_GAP_RATIO = 0.025
const SCREENSHOT_SLOT_TOP_OFFSET_RATIO = 0.08
const SCREENSHOT_SLOT_SINGLE_ROW_HEIGHT_RATIO = 0.3
const SCREENSHOT_SLOT_MULTI_ROW_HEIGHT_RATIO = 0.46
const SPINE_TEXT_WIDTH_FILL_RATIO = 0.68
const SPINE_TEXT_MIN_FONT_PX_AT_300_DPI = 10
const SPINE_TEXT_TARGET_FONT_PX_AT_300_DPI = 32
const EPSILON = 0.000001

const safeRegionByRegionId: Record<JewelCaseRegionId, JewelCaseRegionId> = {
  frontBleed: 'frontSafe',
  frontTrim: 'frontSafe',
  front: 'frontSafe',
  frontSafe: 'frontSafe',
  backBleed: 'backSafe',
  backTrim: 'backSafe',
  back: 'backSafe',
  backSafe: 'backSafe',
  backPanel: 'backPanelSafe',
  backPanelSafe: 'backPanelSafe',
  leftSpine: 'leftSpineSafe',
  leftSpineSafe: 'leftSpineSafe',
  rightSpine: 'rightSpineSafe',
  rightSpineSafe: 'rightSpineSafe',
}

function getTemplateId(templateId?: SupportedCaseInsertTemplateType) {
  return templateId ?? DEFAULT_CASE_INSERT_TEMPLATE_TYPE
}

function getDpi(dpi?: number) {
  return getPositiveFiniteLayoutNumber(dpi, DEFAULT_TEMPLATE_EXPORT_DPI)
}

function toRegionPixelBounds(
  regionId: JewelCaseRegionId,
  surfaceId: JewelCaseSurfaceId,
  bounds: JewelCasePixelRect,
): JewelCaseRegionPixelBounds {
  return {
    regionId,
    surfaceId,
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
  }
}

export function templateRectToExportPixelRect(
  rect: TemplateRect,
  dpi = DEFAULT_TEMPLATE_EXPORT_DPI,
): JewelCasePixelRect {
  return {
    x: mmToTemplatePixels(rect.xMm, dpi),
    y: mmToTemplatePixels(rect.yMm, dpi),
    width: mmToTemplatePixels(rect.widthMm, dpi),
    height: mmToTemplatePixels(rect.heightMm, dpi),
  }
}

export function templateRectToSurfacePixelRect(
  rect: TemplateRect,
  surface: TemplateSurface,
  surfaceSize: JewelCasePixelSize,
): JewelCasePixelRect {
  const scaleX = surface.widthMm > 0 ? surfaceSize.width / surface.widthMm : 0
  const scaleY = surface.heightMm > 0 ? surfaceSize.height / surface.heightMm : 0

  return {
    x: rect.xMm * scaleX,
    y: rect.yMm * scaleY,
    width: rect.widthMm * scaleX,
    height: rect.heightMm * scaleY,
  }
}

export function getJewelCaseSurfaceExportSize(
  surfaceId: JewelCaseSurfaceId,
  options: Pick<JewelCasePixelBoundsOptions, 'templateId' | 'dpi'> = {},
): JewelCasePixelSize | null {
  const exportSize = getTemplateSurfaceExportPixelSize(
    getCaseInsertTemplate(getTemplateId(options.templateId)),
    surfaceId,
    getDpi(options.dpi),
  )

  return exportSize
    ? { width: exportSize.widthPx, height: exportSize.heightPx }
    : null
}

export function getJewelCaseRegionPixelBounds(
  regionId: JewelCaseRegionId,
  options: JewelCasePixelBoundsOptions = {},
): JewelCaseRegionPixelBounds | null {
  const templateId = getTemplateId(options.templateId)
  const template = getCaseInsertTemplate(templateId)
  const region = getCaseInsertTemplateRegion(templateId, regionId)

  if (!region?.surfaceId) {
    return null
  }

  const surfaceId = region.surfaceId as JewelCaseSurfaceId
  const bounds = options.surfaceSize
    ? (() => {
        const surface = getTemplateSurface(template, surfaceId)

        return surface
          ? templateRectToSurfacePixelRect(
              region.bounds,
              surface,
              options.surfaceSize as JewelCasePixelSize,
            )
          : null
      })()
    : templateRectToExportPixelRect(region.bounds, getDpi(options.dpi))

  return bounds ? toRegionPixelBounds(regionId, surfaceId, bounds) : null
}

export function getJewelCaseRegionExportBounds(
  regionId: JewelCaseRegionId,
  options: Pick<JewelCasePixelBoundsOptions, 'templateId' | 'dpi'> = {},
): JewelCaseRegionPixelBounds | null {
  return getJewelCaseRegionPixelBounds(regionId, options)
}

export function getJewelCaseRegionPreviewBounds(
  regionId: JewelCaseRegionId,
  surfaceSize: JewelCasePixelSize,
  options: Pick<JewelCasePixelBoundsOptions, 'templateId'> = {},
): JewelCaseRegionPixelBounds | null {
  return getJewelCaseRegionPixelBounds(regionId, {
    ...options,
    surfaceSize,
  })
}

export function getJewelCaseSafeRegionId(
  regionId: JewelCaseRegionId,
): JewelCaseRegionId {
  return safeRegionByRegionId[regionId]
}

export function getJewelCaseSafeRegionPixelBounds(
  regionId: JewelCaseRegionId,
  options: JewelCasePixelBoundsOptions = {},
): JewelCaseRegionPixelBounds | null {
  return getJewelCaseRegionPixelBounds(
    getJewelCaseSafeRegionId(regionId),
    options,
  )
}

export function getJewelCaseRegionLayout(
  regionId: JewelCaseRegionId,
  options: JewelCasePixelBoundsOptions = {},
): JewelCaseRegionLayout | null {
  const bounds = getJewelCaseRegionPixelBounds(regionId, options)
  const safeRegionId = getJewelCaseSafeRegionId(regionId)
  const safeBounds = getJewelCaseRegionPixelBounds(safeRegionId, options)

  if (!bounds || !safeBounds) {
    return null
  }

  return {
    regionId,
    surfaceId: bounds.surfaceId,
    bounds,
    safeRegionId,
    safeBounds,
  }
}

export function getJewelCaseFrontLayout(
  options: JewelCasePixelBoundsOptions = {},
) {
  return getJewelCaseRegionLayout('front', options)
}

export function getJewelCaseBackLayout(
  options: JewelCasePixelBoundsOptions = {},
) {
  return getJewelCaseRegionLayout('back', options)
}

export function getJewelCaseBackPanelLayout(
  options: JewelCasePixelBoundsOptions = {},
) {
  return getJewelCaseRegionLayout('backPanel', options)
}

export function getJewelCaseSpineLayout(
  side: JewelCaseSpineSideId,
  options: JewelCasePixelBoundsOptions = {},
) {
  return getJewelCaseRegionLayout(
    side === 'left' ? 'leftSpine' : 'rightSpine',
    options,
  )
}

export function getPixelRectRight(rect: JewelCasePixelRect) {
  return rect.x + rect.width
}

export function getPixelRectBottom(rect: JewelCasePixelRect) {
  return rect.y + rect.height
}

export function getPixelRectOverflow(
  rect: JewelCasePixelRect,
  bounds: JewelCasePixelRect,
): JewelCaseRectOverflow {
  return {
    left: Math.max(0, bounds.x - rect.x),
    top: Math.max(0, bounds.y - rect.y),
    right: Math.max(0, getPixelRectRight(rect) - getPixelRectRight(bounds)),
    bottom: Math.max(0, getPixelRectBottom(rect) - getPixelRectBottom(bounds)),
  }
}

export function isPixelRectInsideBounds(
  rect: JewelCasePixelRect,
  bounds: JewelCasePixelRect,
) {
  const overflow = getPixelRectOverflow(rect, bounds)

  return (
    overflow.left <= EPSILON &&
    overflow.top <= EPSILON &&
    overflow.right <= EPSILON &&
    overflow.bottom <= EPSILON
  )
}

export function clampPixelRectToBounds(
  rect: JewelCasePixelRect,
  bounds: JewelCasePixelRect,
): JewelCasePixelRect {
  const x = rect.width > bounds.width
    ? bounds.x + (bounds.width - rect.width) / 2
    : clampLayoutNumber(rect.x, bounds.x, getPixelRectRight(bounds) - rect.width)
  const y = rect.height > bounds.height
    ? bounds.y + (bounds.height - rect.height) / 2
    : clampLayoutNumber(
        rect.y,
        bounds.y,
        getPixelRectBottom(bounds) - rect.height,
      )

  return {
    ...rect,
    x,
    y,
  }
}

export function evaluateJewelCaseSafePlacement(
  rect: JewelCasePixelRect,
  regionId: JewelCaseRegionId,
  options: JewelCasePixelBoundsOptions = {},
): JewelCaseSafePlacementResult | null {
  const safeRegionId = getJewelCaseSafeRegionId(regionId)
  const safeBounds = getJewelCaseRegionPixelBounds(safeRegionId, options)

  if (!safeBounds) {
    return null
  }

  const clampedRect = clampPixelRectToBounds(rect, safeBounds)

  return {
    regionId,
    safeRegionId,
    safeBounds,
    rect,
    clampedRect,
    overflow: getPixelRectOverflow(rect, safeBounds),
    isUnsafe: !isPixelRectInsideBounds(rect, safeBounds),
    clampedRectIsUnsafe: !isPixelRectInsideBounds(clampedRect, safeBounds),
  }
}

export function intersectPixelRects(
  a: JewelCasePixelRect,
  b: JewelCasePixelRect,
): JewelCasePixelRect | null {
  const x = Math.max(a.x, b.x)
  const y = Math.max(a.y, b.y)
  const right = Math.min(getPixelRectRight(a), getPixelRectRight(b))
  const bottom = Math.min(getPixelRectBottom(a), getPixelRectBottom(b))
  const width = right - x
  const height = bottom - y

  return width > 0 && height > 0
    ? { x, y, width, height }
    : null
}

function hasPositiveSize<T extends JewelCasePixelSize>(
  size: T | null | undefined,
): size is T {
  return Boolean(size && size.width > 0 && size.height > 0)
}

function normalizeCropOffset(offset?: Partial<JewelCaseCropOffset>) {
  return {
    x: clampLayoutNumber(offset?.x ?? 0, -1, 1),
    y: clampLayoutNumber(offset?.y ?? 0, -1, 1),
  }
}

export function getJewelCaseImageRegionHeightFitScale({
  imageSize,
  region,
  fit = 'cover',
}: {
  imageSize: JewelCasePixelSize | null
  region: JewelCasePixelSize
  fit?: JewelCaseImageFitMode
}) {
  const sourceSize = getImageContentSize(imageSize as BackgroundImageSize | null)

  if (!hasPositiveSize(sourceSize) || !hasPositiveSize(region)) {
    return null
  }

  const containScale = Math.min(
    region.width / sourceSize.width,
    region.height / sourceSize.height,
  )
  const coverScale = Math.max(
    region.width / sourceSize.width,
    region.height / sourceSize.height,
  )
  const baseScale = fit === 'cover' || fit === 'crop'
    ? coverScale
    : containScale
  const heightScale = region.height / sourceSize.height

  return heightScale / baseScale
}

export function fitImageToJewelCaseRegion({
  imageSize,
  region,
  fit,
  scale,
  offset,
}: JewelCaseImageFitInput): JewelCaseImageFitResult | null {
  const sourceSize = getImageContentSize(imageSize as BackgroundImageSize | null)

  if (!hasPositiveSize(sourceSize) || !hasPositiveSize(region)) {
    return null
  }

  const contentBounds = getImageContentBounds(imageSize as BackgroundImageSize | null)
  const sourceOrigin = contentBounds && !isEmptyImageContentBounds(contentBounds)
    ? {
        x: contentBounds.x,
        y: contentBounds.y,
      }
    : {
        x: 0,
        y: 0,
      }
  const containScale = Math.min(
    region.width / sourceSize.width,
    region.height / sourceSize.height,
  )
  const coverScale = Math.max(
    region.width / sourceSize.width,
    region.height / sourceSize.height,
  )
  const baseScale = fit === 'cover' || fit === 'crop'
    ? coverScale
    : containScale
  const manualScale = getPositiveFiniteLayoutNumber(scale, 1)
  const fittedScale = baseScale * manualScale
  const width = sourceSize.width * fittedScale
  const height = sourceSize.height * fittedScale
  const cropOffset = normalizeCropOffset(offset)
  const travelX = (region.width + width) / 2
  const travelY = (region.height + height) / 2
  const imageRect = {
    x: region.x + (region.width - width) / 2 + cropOffset.x * travelX,
    y: region.y + (region.height - height) / 2 + cropOffset.y * travelY,
    width,
    height,
  }
  const visibleRect = intersectPixelRects(imageRect, region) ?? {
    x: region.x,
    y: region.y,
    width: 0,
    height: 0,
  }
  const sourceRect = {
    x:
      sourceOrigin.x +
      clampLayoutNumber(
        (visibleRect.x - imageRect.x) / fittedScale,
        0,
        sourceSize.width,
      ),
    y:
      sourceOrigin.y +
      clampLayoutNumber(
        (visibleRect.y - imageRect.y) / fittedScale,
        0,
        sourceSize.height,
      ),
    width: clampLayoutNumber(
      visibleRect.width / fittedScale,
      0,
      sourceSize.width,
    ),
    height: clampLayoutNumber(
      visibleRect.height / fittedScale,
      0,
      sourceSize.height,
    ),
  }

  return {
    fit,
    region: { ...region },
    imageRect,
    visibleRect,
    sourceRect,
    scale: fittedScale,
    cropOffset,
    isCropped:
      sourceRect.width < sourceSize.width - EPSILON ||
      sourceRect.height < sourceSize.height - EPSILON,
    hasEmptySpace:
      imageRect.width < region.width - EPSILON ||
      imageRect.height < region.height - EPSILON,
  }
}

export function getDefaultJewelCaseBackScreenshotSlotLayouts(
  options: JewelCasePixelBoundsOptions & { count?: number } = {},
): JewelCaseScreenshotSlotLayout[] {
  const requestedCount =
    typeof options.count === 'number' &&
    Number.isFinite(options.count) &&
    options.count >= 0
      ? Math.floor(options.count)
      : DEFAULT_SCREENSHOT_SLOT_COUNT
  const count = Math.max(0, requestedCount)
  const safeBounds = getJewelCaseRegionPixelBounds('backPanelSafe', options)

  if (!safeBounds || count === 0) {
    return []
  }

  const columns = Math.min(SCREENSHOT_SLOT_COLUMN_LIMIT, count)
  const rows = Math.ceil(count / columns)
  const gapX = safeBounds.width * SCREENSHOT_SLOT_HORIZONTAL_GAP_RATIO
  const gapY = safeBounds.height * SCREENSHOT_SLOT_VERTICAL_GAP_RATIO
  const slotWidth = (safeBounds.width - gapX * (columns - 1)) / columns
  const maxStackHeightRatio = rows === 1
    ? SCREENSHOT_SLOT_SINGLE_ROW_HEIGHT_RATIO
    : SCREENSHOT_SLOT_MULTI_ROW_HEIGHT_RATIO
  const maxSlotHeight =
    (safeBounds.height * maxStackHeightRatio - gapY * (rows - 1)) / rows
  const slotHeight = Math.min(slotWidth / DEFAULT_SCREENSHOT_ASPECT_RATIO, maxSlotHeight)
  const startY = safeBounds.y + safeBounds.height * SCREENSHOT_SLOT_TOP_OFFSET_RATIO

  return Array.from({ length: count }, (_, index) => {
    const row = Math.floor(index / columns)
    const column = index % columns
    const slotsInRow = row === rows - 1 ? count - row * columns : columns
    const rowWidth = slotsInRow * slotWidth + gapX * (slotsInRow - 1)
    const rowX = safeBounds.x + (safeBounds.width - rowWidth) / 2

    return {
      id: `back-screenshot-${index + 1}`,
      index,
      regionId: 'backPanelSafe',
      bounds: {
        x: rowX + column * (slotWidth + gapX),
        y: startY + row * (slotHeight + gapY),
        width: slotWidth,
        height: slotHeight,
      },
      safeBounds,
    }
  })
}

export function getJewelCaseSpineTextLayout(
  side: JewelCaseSpineSideId,
  options: JewelCasePixelBoundsOptions = {},
): JewelCaseSpineTextLayout | null {
  const regionId = side === 'left' ? 'leftSpineSafe' : 'rightSpineSafe'
  const bounds = getJewelCaseRegionPixelBounds(regionId, options)

  if (!bounds) {
    return null
  }

  const exportBounds = options.surfaceSize
    ? getJewelCaseRegionExportBounds(regionId)
    : null
  const dpiScale = exportBounds
    ? bounds.height / exportBounds.height
    : getDpi(options.dpi) / DEFAULT_TEMPLATE_EXPORT_DPI
  const minReadableFontSizePx = Math.max(
    1,
    Math.round(SPINE_TEXT_MIN_FONT_PX_AT_300_DPI * dpiScale),
  )
  const maxFontSizePx = Math.max(
    minReadableFontSizePx,
    Math.floor(bounds.width * SPINE_TEXT_WIDTH_FILL_RATIO),
  )
  const recommendedFontSizePx = clampLayoutNumber(
    Math.round(SPINE_TEXT_TARGET_FONT_PX_AT_300_DPI * dpiScale),
    minReadableFontSizePx,
    maxFontSizePx,
  )

  return {
    side,
    regionId,
    surfaceId: 'back',
    bounds,
    rotationDegrees: side === 'left' ? -90 : 90,
    writingMode: 'vertical',
    maxLineWidthPx: bounds.height,
    minReadableFontSizePx,
    recommendedFontSizePx,
    maxFontSizePx,
    lineHeightPx: Math.round(recommendedFontSizePx * 1.1),
  }
}

export function estimateJewelCaseRegionMinimumImageResolution(
  regionId: JewelCaseRegionId,
  options: Pick<JewelCasePixelBoundsOptions, 'templateId' | 'dpi'> & {
    qualityScale?: number
  } = {},
): JewelCaseMinimumImageResolution | null {
  const dpi = getDpi(options.dpi)
  const qualityScale = getPositiveFiniteLayoutNumber(options.qualityScale, 1)
  const bounds = getJewelCaseRegionExportBounds(regionId, {
    templateId: options.templateId,
    dpi,
  })

  return bounds
    ? {
        regionId,
        surfaceId: bounds.surfaceId,
        widthPx: Math.ceil(bounds.width * qualityScale),
        heightPx: Math.ceil(bounds.height * qualityScale),
        dpi,
        qualityScale,
      }
    : null
}
