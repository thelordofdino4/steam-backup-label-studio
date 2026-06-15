import type {
  ProjectCaseInsertImageSlot,
  ProjectCaseInsertTextBlock,
  ProjectCaseInsertTextList,
} from '../project/projectTypes.ts'
import { getImageContentSize } from '../image/imageContentBounds.ts'
import {
  getCaseInsertTextFontFamilyCanvas,
} from '../caseInsert/textStyles.ts'
import {
  getCaseInsertTextLayoutPaddingRatio,
} from '../caseInsert/textRenderStyles.ts'
import {
  CASE_INSERT_TEXT_BLOCK_MAX_LINES,
  CASE_INSERT_TEXT_LIST_MAX_LINES,
  getCaseInsertTextLayoutWidth,
} from '../caseInsert/textLayout.ts'
import type { JewelCaseRegionId } from '../templates/caseInsertTemplates.ts'
import type { CaseInsertPreviewLayout } from './caseInsertPreviewLayout.ts'
import {
  CASE_INSERT_OFFSET_LAYOUT_RANGES,
  CASE_INSERT_PERCENT_LAYOUT_RANGES,
  getCenteredRectLayoutSliderRanges,
  getImageFitOffsetLayoutSliderRanges,
  type CaseInsertLayoutSliderRanges,
} from './caseInsertElementSafeZone.ts'
import {
  type CaseInsertTextAvoidanceRegion,
} from './caseInsertTextAvoidance.ts'
import {
  getCaseInsertTextVisualLayout,
  type CaseInsertTextVisualLine,
} from './caseInsertTextVisualLayout.ts'
import {
  clampPixelRectToBounds,
  fitImageToJewelCaseRegion,
  getDefaultJewelCaseBackScreenshotSlotLayouts,
  type JewelCaseImageFitResult,
  type JewelCasePixelRect,
  type JewelCasePixelSize,
} from './jewelCaseLayout.ts'

export type JewelCaseBackImageSlotRole = 'artwork' | 'logo' | 'mark'

export type JewelCaseBackTextBlockRole =
  | 'description'
  | 'minimumRequirements'
  | 'recommendedRequirements'
  | 'legalText'

export type JewelCaseBackTextBlockLayout = {
  bounds: JewelCasePixelRect
  reservedBounds: JewelCasePixelRect
  lines: CaseInsertTextVisualLine[]
  fontSizePx: number
  lineHeightPx: number
}

export type JewelCaseBackTextListLayout = JewelCaseBackTextBlockLayout & {
  items: string[]
}

const imageSlotWidthRatioByRole: Record<JewelCaseBackImageSlotRole, number> = {
  artwork: 0.24,
  logo: 0.16,
  mark: 0.13,
}

const imageSlotFallbackCenterByRole: Record<
  JewelCaseBackImageSlotRole,
  { x: number; y: number }
> = {
  artwork: { x: 50, y: 62 },
  logo: { x: 18, y: 88 },
  mark: { x: 84, y: 88 },
}

const textBlockConfigByRole: Record<
  JewelCaseBackTextBlockRole,
  {
    widthRatio: number
    heightRatio: number
    minFontRatio: number
    targetFontRatio: number
    maxFontRatio: number
    defaultCenter: { x: number; y: number }
  }
> = {
  description: {
    widthRatio: 0.82,
    heightRatio: 0.22,
    minFontRatio: 0.012,
    targetFontRatio: 0.018,
    maxFontRatio: 0.03,
    defaultCenter: { x: 50, y: 50 },
  },
  minimumRequirements: {
    widthRatio: 0.4,
    heightRatio: 0.13,
    minFontRatio: 0.009,
    targetFontRatio: 0.012,
    maxFontRatio: 0.02,
    defaultCenter: { x: 28, y: 81 },
  },
  recommendedRequirements: {
    widthRatio: 0.4,
    heightRatio: 0.13,
    minFontRatio: 0.009,
    targetFontRatio: 0.012,
    maxFontRatio: 0.02,
    defaultCenter: { x: 72, y: 81 },
  },
  legalText: {
    widthRatio: 0.88,
    heightRatio: 0.08,
    minFontRatio: 0.007,
    targetFontRatio: 0.009,
    maxFontRatio: 0.014,
    defaultCenter: { x: 50, y: 93 },
  },
}

const featureBulletsConfig = {
  widthRatio: 0.42,
  heightRatio: 0.24,
  minFontRatio: 0.011,
  targetFontRatio: 0.016,
  maxFontRatio: 0.026,
  defaultCenter: { x: 28, y: 31 },
}

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

function getBackSurfaceBounds(layout: CaseInsertPreviewLayout) {
  return layout.surfaces.find(({ surfaceId }) => surfaceId === 'back')?.bounds ?? null
}

function offsetRect(
  rect: JewelCasePixelRect,
  offset: { x: number; y: number },
): JewelCasePixelRect {
  return {
    x: rect.x + offset.x,
    y: rect.y + offset.y,
    width: rect.width,
    height: rect.height,
  }
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

function getBackImageSlotPreviewSize(
  slot: ProjectCaseInsertImageSlot,
  safeBounds: JewelCasePixelRect,
  role: JewelCaseBackImageSlotRole,
): JewelCasePixelSize | null {
  const contentSize = getImageContentSize(slot.imageSize)

  if (!contentSize) {
    return null
  }

  const scale = normalizePositiveNumber(slot.layout.scale, 1)
  const aspectRatio = contentSize.width / contentSize.height
  const maxWidth = safeBounds.width * imageSlotWidthRatioByRole[role] * scale
  const width = Math.min(maxWidth, safeBounds.width)
  const height = width / aspectRatio

  return height > safeBounds.height
    ? {
        width: safeBounds.height * aspectRatio,
        height: safeBounds.height,
      }
    : { width, height }
}

function getTextLayoutFromConfig(
  textBlock: ProjectCaseInsertTextBlock,
  layout: CaseInsertPreviewLayout,
  config: typeof textBlockConfigByRole[JewelCaseBackTextBlockRole],
  avoidanceRegions: CaseInsertTextAvoidanceRegion[] = [],
): JewelCaseBackTextBlockLayout | null {
  const safeBounds = getJewelCaseBackPreviewRegionBounds(layout, 'backPanelSafe')

  if (!safeBounds || !textBlock.enabled) {
    return null
  }

  const scale = normalizePositiveNumber(textBlock.layout.scale, 1)
  const centerPercent = {
    x: normalizePercent(textBlock.layout.x, config.defaultCenter.x),
    y: normalizePercent(textBlock.layout.y, config.defaultCenter.y),
  }
  const width = safeBounds.width *
    getCaseInsertTextLayoutWidth(textBlock.layout, config.widthRatio * 100) /
    100
  const height = safeBounds.height * config.heightRatio * scale
  const fontSizePx = clampNumber(
    safeBounds.width * config.targetFontRatio * scale,
    safeBounds.width * config.minFontRatio,
    safeBounds.width * config.maxFontRatio,
  )
  const clampedBounds = clampPixelRectToBounds(
    getCenteredRect(safeBounds, width, height, centerPercent),
    safeBounds,
  )
  const lineHeightPx = fontSizePx * 1.22
  const visualLayout = getCaseInsertTextVisualLayout(
    clampedBounds,
    {
      align: textBlock.align,
      avoidanceRegions: textBlock.avoidVisualElements
        ? avoidanceRegions
        : [],
      boundsLimit: safeBounds,
      fontFamily: getCaseInsertTextFontFamilyCanvas(textBlock.style.fontFamily),
      fontSizePx,
      fontWeight: textBlock.id.includes('legal') ||
          textBlock.id.includes('copyright')
        ? 500
        : 600,
      lineHeightPx,
      maxLines: CASE_INSERT_TEXT_BLOCK_MAX_LINES,
      paddingRatio: getCaseInsertTextLayoutPaddingRatio(textBlock.style),
      text: textBlock.value,
      verticalAlign: 'center',
    },
  )

  return {
    bounds: visualLayout.bounds,
    reservedBounds: clampedBounds,
    lines: visualLayout.lines,
    fontSizePx,
    lineHeightPx,
  }
}

export function getJewelCaseBackPreviewRegionBounds(
  layout: CaseInsertPreviewLayout,
  regionId: JewelCaseRegionId = 'backPanel',
) {
  return getRegionBounds(layout, regionId)
}

export function getJewelCaseBackBackgroundFit(
  slot: ProjectCaseInsertImageSlot,
  layout: CaseInsertPreviewLayout,
): JewelCaseImageFitResult | null {
  const region = getJewelCaseBackPreviewRegionBounds(layout, 'back')

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

export function getJewelCaseBackBackgroundLayoutSliderRanges(
  slot: ProjectCaseInsertImageSlot,
  layout: CaseInsertPreviewLayout,
): CaseInsertLayoutSliderRanges {
  void slot
  void layout

  return CASE_INSERT_OFFSET_LAYOUT_RANGES
}

export function getJewelCaseBackScreenshotFrameRect(
  layout: CaseInsertPreviewLayout,
  index: number,
  count: number,
): JewelCasePixelRect | null {
  const backSurface = getBackSurfaceBounds(layout)

  if (!backSurface) {
    return null
  }

  const screenshotLayouts = getDefaultJewelCaseBackScreenshotSlotLayouts({
    templateId: layout.templateId,
    surfaceSize: {
      width: backSurface.width,
      height: backSurface.height,
    },
    count,
  })
  const screenshotLayout = screenshotLayouts[index]

  return screenshotLayout
    ? offsetRect(screenshotLayout.bounds, backSurface)
    : null
}

export function getJewelCaseBackScreenshotFit(
  slot: ProjectCaseInsertImageSlot,
  layout: CaseInsertPreviewLayout,
  index: number,
  count: number,
): JewelCaseImageFitResult | null {
  const frame = getJewelCaseBackScreenshotFrameRect(layout, index, count)

  if (!frame || !slot.enabled || !slot.imageDataUrl) {
    return null
  }

  return fitImageToJewelCaseRegion({
    imageSize: slot.imageSize,
    region: frame,
    fit: slot.fit,
    scale: slot.layout.scale,
    offset: {
      x: slot.layout.x / 100,
      y: slot.layout.y / 100,
    },
  })
}

export function getJewelCaseBackScreenshotLayoutSliderRanges(
  slot: ProjectCaseInsertImageSlot,
  layout: CaseInsertPreviewLayout,
  index: number,
  count: number,
): CaseInsertLayoutSliderRanges {
  const frame = getJewelCaseBackScreenshotFrameRect(layout, index, count)

  if (!frame || !slot.enabled || !slot.imageDataUrl) {
    return CASE_INSERT_OFFSET_LAYOUT_RANGES
  }

  return getImageFitOffsetLayoutSliderRanges(
    fitImageToJewelCaseRegion({
      imageSize: slot.imageSize,
      region: frame,
      fit: slot.fit,
      scale: slot.layout.scale,
      offset: { x: 0, y: 0 },
    }),
  )
}

export function getJewelCaseBackImageSlotPreviewRect(
  slot: ProjectCaseInsertImageSlot,
  layout: CaseInsertPreviewLayout,
  role: JewelCaseBackImageSlotRole,
): JewelCasePixelRect | null {
  const safeBounds = getJewelCaseBackPreviewRegionBounds(layout, 'backPanelSafe')

  if (!safeBounds || !slot.enabled || !slot.imageDataUrl || !slot.imageSize) {
    return null
  }

  const fallbackCenter = imageSlotFallbackCenterByRole[role]
  const centerPercent = {
    x: normalizePercent(slot.layout.x, fallbackCenter.x),
    y: normalizePercent(slot.layout.y, fallbackCenter.y),
  }
  const fittedRect = getBackImageSlotPreviewSize(slot, safeBounds, role)

  if (!fittedRect) {
    return null
  }

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

export function getJewelCaseBackImageSlotLayoutSliderRanges(
  slot: ProjectCaseInsertImageSlot,
  layout: CaseInsertPreviewLayout,
  role: JewelCaseBackImageSlotRole,
): CaseInsertLayoutSliderRanges {
  const safeBounds = getJewelCaseBackPreviewRegionBounds(layout, 'backPanelSafe')
  const renderedSize = safeBounds
    ? getBackImageSlotPreviewSize(slot, safeBounds, role)
    : null

  return safeBounds && renderedSize
    ? getCenteredRectLayoutSliderRanges(safeBounds, renderedSize)
    : CASE_INSERT_PERCENT_LAYOUT_RANGES
}

export function getJewelCaseBackTextBlockPreviewLayout(
  textBlock: ProjectCaseInsertTextBlock,
  layout: CaseInsertPreviewLayout,
  role: JewelCaseBackTextBlockRole,
  avoidanceRegions: CaseInsertTextAvoidanceRegion[] = [],
): JewelCaseBackTextBlockLayout | null {
  return getTextLayoutFromConfig(
    textBlock,
    layout,
    textBlockConfigByRole[role],
    avoidanceRegions,
  )
}

export function getJewelCaseBackTextListPreviewLayout(
  textList: ProjectCaseInsertTextList,
  layout: CaseInsertPreviewLayout,
  avoidanceRegions: CaseInsertTextAvoidanceRegion[] = [],
): JewelCaseBackTextListLayout | null {
  const safeBounds = getJewelCaseBackPreviewRegionBounds(layout, 'backPanelSafe')
  const items = textList.items.map((item) => item.trim()).filter(Boolean)

  if (!safeBounds || !textList.enabled || items.length === 0) {
    return null
  }

  const scale = normalizePositiveNumber(textList.layout.scale, 1)
  const centerPercent = {
    x: normalizePercent(textList.layout.x, featureBulletsConfig.defaultCenter.x),
    y: normalizePercent(textList.layout.y, featureBulletsConfig.defaultCenter.y),
  }
  const width = safeBounds.width *
    getCaseInsertTextLayoutWidth(
      textList.layout,
      featureBulletsConfig.widthRatio * 100,
    ) /
    100
  const height = safeBounds.height * featureBulletsConfig.heightRatio * scale
  const fontSizePx = clampNumber(
    safeBounds.width * featureBulletsConfig.targetFontRatio * scale,
    safeBounds.width * featureBulletsConfig.minFontRatio,
    safeBounds.width * featureBulletsConfig.maxFontRatio,
  )
  const clampedBounds = clampPixelRectToBounds(
    getCenteredRect(safeBounds, width, height, centerPercent),
    safeBounds,
  )
  const lineHeightPx = fontSizePx * 1.24
  const visualLayout = getCaseInsertTextVisualLayout(
    clampedBounds,
    {
      align: 'left',
      avoidanceRegions: textList.avoidVisualElements
        ? avoidanceRegions
        : [],
      boundsLimit: safeBounds,
      fontFamily: getCaseInsertTextFontFamilyCanvas(textList.style.fontFamily),
      fontSizePx,
      fontWeight: 600,
      lineHeightPx,
      maxLines: CASE_INSERT_TEXT_LIST_MAX_LINES,
      paddingRatio: getCaseInsertTextLayoutPaddingRatio(textList.style),
      text: items.map((item) => `• ${item}`).join('\n'),
      verticalAlign: 'center',
    },
  )

  return {
    bounds: visualLayout.bounds,
    reservedBounds: clampedBounds,
    lines: visualLayout.lines,
    fontSizePx,
    lineHeightPx,
    items,
  }
}
