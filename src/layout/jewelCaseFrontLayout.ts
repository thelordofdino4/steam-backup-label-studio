import type {
  ProjectCaseInsertImageSlot,
  ProjectCaseInsertSteamBanner,
  ProjectCaseInsertTextBlock,
} from '../project/projectTypes.ts'
import { getImageContentSize } from '../image/imageContentBounds.ts'
import {
  getCaseInsertTextEffectiveFontWeight,
  getCaseInsertTextFontFamilyCanvas,
  getCaseInsertTextFontStyle,
} from '../caseInsert/textStyles.ts'
import {
  getCaseInsertTextPaintSlackPx,
  getCaseInsertTextLayoutPaddingRatio,
} from '../caseInsert/textRenderStyles.ts'
import {
  CASE_INSERT_TEXT_BLOCK_MAX_LINES,
  getCaseInsertTextLayoutWidth,
} from '../caseInsert/textLayout.ts'
import type { JewelCaseRegionId } from '../templates/caseInsertTemplates.ts'
import type { CaseInsertPreviewLayout } from './caseInsertPreviewLayout.ts'
import {
  CASE_INSERT_OFFSET_LAYOUT_RANGES,
  CASE_INSERT_PERCENT_LAYOUT_RANGES,
  getCenteredRectLayoutSliderRanges,
  type CaseInsertLayoutSliderRanges,
} from './caseInsertElementSafeZone.ts'
import {
  type CaseInsertTextAvoidanceRegion,
} from './caseInsertTextAvoidance.ts'
import {
  CASE_INSERT_COVER_DEVELOPER_LOGO_LAYOUT,
  CASE_INSERT_COVER_RATING_MARK_LAYOUT,
} from '../caseInsert/defaultBrandingLayouts.ts'
import {
  clampCaseInsertTextVisualLayoutToBounds,
  type CaseInsertTextVisualLine,
} from './caseInsertTextVisualLayout.ts'
import {
  getRenderableRichTextDocument,
  isHtmlTextEnabled,
} from '../text/htmlText.ts'
import {
  clampPixelRectToBounds,
  fitImageToJewelCaseRegion,
  type JewelCaseImageFitResult,
  type JewelCasePixelRect,
  type JewelCasePixelSize,
} from './jewelCaseLayout.ts'
import {
  getJewelCaseSteamBannerOpenArtworkRegion,
} from './jewelCaseSteamBannerLayout.ts'

export type JewelCaseFrontImageSlotRole =
  | 'titleArtwork'
  | 'calloutArtwork'
  | 'logo'
  | 'mark'

export type JewelCaseFrontTextBlockLayout = {
  bounds: JewelCasePixelRect
  reservedBounds: JewelCasePixelRect
  lines: CaseInsertTextVisualLine[]
  fontSizePx: number
  lineHeightPx: number
}

export type JewelCaseFrontTextBlockRole =
  | 'title'
  | 'subtitle'
  | 'callout'
  | 'legalText'

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
  logo: {
    x: CASE_INSERT_COVER_DEVELOPER_LOGO_LAYOUT.x,
    y: CASE_INSERT_COVER_DEVELOPER_LOGO_LAYOUT.y,
  },
  mark: {
    x: CASE_INSERT_COVER_RATING_MARK_LAYOUT.x,
    y: CASE_INSERT_COVER_RATING_MARK_LAYOUT.y,
  },
}

const textBlockConfigByRole: Record<
  JewelCaseFrontTextBlockRole,
  {
    widthRatio: number
    heightRatio: number
    minFontRatio: number
    targetFontRatio: number
    maxFontRatio: number
    defaultCenter: { x: number; y: number }
  }
> = {
  title: {
    widthRatio: 0.8,
    heightRatio: 0.14,
    minFontRatio: 0.028,
    targetFontRatio: 0.052,
    maxFontRatio: 0.078,
    defaultCenter: { x: 50, y: 34 },
  },
  subtitle: {
    widthRatio: 0.72,
    heightRatio: 0.08,
    minFontRatio: 0.018,
    targetFontRatio: 0.028,
    maxFontRatio: 0.044,
    defaultCenter: { x: 50, y: 45 },
  },
  callout: {
    widthRatio: 0.74,
    heightRatio: 0.12,
    minFontRatio: 0.022,
    targetFontRatio: 0.034,
    maxFontRatio: 0.056,
    defaultCenter: { x: 50, y: 82 },
  },
  legalText: {
    widthRatio: 0.86,
    heightRatio: 0.07,
    minFontRatio: 0.007,
    targetFontRatio: 0.011,
    maxFontRatio: 0.018,
    defaultCenter: { x: 50, y: 93 },
  },
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

function getImageSlotPreviewSize(
  slot: ProjectCaseInsertImageSlot,
  safeBounds: JewelCasePixelRect,
  role: JewelCaseFrontImageSlotRole,
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

export function getJewelCaseFrontPreviewRegionBounds(
  layout: CaseInsertPreviewLayout,
  regionId: JewelCaseRegionId = 'front',
) {
  return getRegionBounds(layout, regionId)
}

export function getJewelCaseFrontBackgroundFit(
  slot: ProjectCaseInsertImageSlot,
  layout: CaseInsertPreviewLayout,
  steamBanner?: ProjectCaseInsertSteamBanner,
): JewelCaseImageFitResult | null {
  const region = steamBanner
    ? getJewelCaseSteamBannerOpenArtworkRegion(
        steamBanner,
        { kind: 'cover' },
        layout,
      )
    : getJewelCaseFrontPreviewRegionBounds(layout, 'front')

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

export function getJewelCaseFrontBackgroundLayoutSliderRanges(
  slot: ProjectCaseInsertImageSlot,
  layout: CaseInsertPreviewLayout,
): CaseInsertLayoutSliderRanges {
  void slot
  void layout

  return CASE_INSERT_OFFSET_LAYOUT_RANGES
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
  const fittedRect = getImageSlotPreviewSize(slot, safeBounds, role)

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

export function getJewelCaseFrontImageSlotLayoutSliderRanges(
  slot: ProjectCaseInsertImageSlot,
  layout: CaseInsertPreviewLayout,
  role: JewelCaseFrontImageSlotRole,
): CaseInsertLayoutSliderRanges {
  const safeBounds = getJewelCaseFrontPreviewRegionBounds(layout, 'frontSafe')
  const renderedSize = safeBounds
    ? getImageSlotPreviewSize(slot, safeBounds, role)
    : null

  return safeBounds && renderedSize
    ? getCenteredRectLayoutSliderRanges(safeBounds, renderedSize)
    : CASE_INSERT_PERCENT_LAYOUT_RANGES
}

export function getJewelCaseFrontTextBlockRole(
  textBlock: Pick<ProjectCaseInsertTextBlock, 'id'>,
): JewelCaseFrontTextBlockRole {
  if (textBlock.id.endsWith('-subtitle-text')) return 'subtitle'
  if (textBlock.id.includes('legal') || textBlock.id.includes('copyright')) {
    return 'legalText'
  }
  if (textBlock.id.endsWith('-title-text')) return 'title'

  return 'callout'
}

export function getJewelCaseFrontTextBlockPreviewLayout(
  textBlock: ProjectCaseInsertTextBlock,
  layout: CaseInsertPreviewLayout,
  avoidanceRegions: CaseInsertTextAvoidanceRegion[] = [],
): JewelCaseFrontTextBlockLayout | null {
  const safeBounds = getJewelCaseFrontPreviewRegionBounds(layout, 'frontSafe')

  if (!safeBounds || !textBlock.enabled) {
    return null
  }

  const scale = normalizePositiveNumber(textBlock.layout.scale, 1)
  const config = textBlockConfigByRole[getJewelCaseFrontTextBlockRole(textBlock)]
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
  const role = getJewelCaseFrontTextBlockRole(textBlock)
  const requestedBounds = getCenteredRect(safeBounds, width, height, centerPercent)
  const lineHeightPx = fontSizePx * 1.14
  const { reservedBounds, visualLayout } = clampCaseInsertTextVisualLayoutToBounds(
    requestedBounds,
    safeBounds,
    {
      align: textBlock.align,
      avoidanceRegions: textBlock.avoidVisualElements
        ? avoidanceRegions
        : [],
      fontFamily: getCaseInsertTextFontFamilyCanvas(textBlock.style.fontFamily),
      fontSizePx,
      fontStyle: getCaseInsertTextFontStyle(textBlock.style),
      fontWeight: getCaseInsertTextEffectiveFontWeight(800, textBlock.style),
      lineHeightPx,
      maxLines: CASE_INSERT_TEXT_BLOCK_MAX_LINES,
      paddingRatio: getCaseInsertTextLayoutPaddingRatio(textBlock.style),
      paintSlackPx: getCaseInsertTextPaintSlackPx(textBlock.style, fontSizePx),
      richText: isHtmlTextEnabled(textBlock)
        ? getRenderableRichTextDocument(textBlock, textBlock.value)
        : undefined,
      text: textBlock.value,
      uppercase: role === 'title',
      verticalAlign: 'center',
    },
  )

  return {
    bounds: visualLayout.bounds,
    reservedBounds,
    lines: visualLayout.lines,
    fontSizePx,
    lineHeightPx,
  }
}
