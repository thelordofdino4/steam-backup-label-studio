import type {
  ProjectCaseInsertImageSlot,
  ProjectCaseInsertTextBlock,
} from '../project/projectTypes.ts'
import {
  CASE_INSERT_DEFAULT_IMPORTED_SPINE_TITLE_ARTWORK_LAYOUT,
} from '../caseInsert/defaultImportLayouts.ts'
import {
  getCaseInsertTextBlockStyleRole,
  getCaseInsertTextFontFamilyCanvas,
  getCaseInsertTextStyleRoleMaxLines,
} from '../caseInsert/textStyles.ts'
import {
  getCaseInsertTextLayoutPaddingRatio,
} from '../caseInsert/textRenderStyles.ts'
import {
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
import type { CaseInsertTextAvoidanceRegion } from './caseInsertTextAvoidance.ts'
import {
  getCaseInsertTextVisualLayout,
  type CaseInsertTextVisualLine,
} from './caseInsertTextVisualLayout.ts'
import {
  clampPixelRectToBounds,
  fitImageToJewelCaseRegion,
  type JewelCaseImageFitResult,
  type JewelCasePixelRect,
  type JewelCaseSpineSideId,
} from './jewelCaseLayout.ts'

export type JewelCaseSpineOverlayRole =
  | 'titleArtwork'
  | 'artwork'
  | 'logo'
  | 'mark'

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
  lines: CaseInsertTextVisualLine[]
  reservedBoundingRect: JewelCasePixelRect
  textBounds: JewelCasePixelRect
}

const SPINE_TITLE_WIDTH_RATIO = 0.92
const SPINE_TITLE_HEIGHT_RATIO = 0.86
const SPINE_TITLE_FONT_MIN_PX = 10
const SPINE_TITLE_FONT_TARGET_PX = 32
const SPINE_TITLE_FONT_FILL_RATIO = 0.68

const spineOverlayConfig = {
  titleArtwork: {
    widthBasis: 'length',
    widthRatio: 0.42,
    heightRatio: 0.82,
    defaultCenter: {
      x: CASE_INSERT_DEFAULT_IMPORTED_SPINE_TITLE_ARTWORK_LAYOUT.x,
      y: CASE_INSERT_DEFAULT_IMPORTED_SPINE_TITLE_ARTWORK_LAYOUT.y,
    },
  },
  artwork: {
    widthBasis: 'width',
    widthRatio: 0.82,
    heightRatio: 0.82,
    defaultCenter: { x: 50, y: 72 },
  },
  logo: {
    widthBasis: 'width',
    widthRatio: 0.82,
    heightRatio: 0.82,
    defaultCenter: { x: 50, y: 88 },
  },
  mark: {
    widthBasis: 'width',
    widthRatio: 0.82,
    heightRatio: 0.82,
    defaultCenter: { x: 50, y: 82 },
  },
} as const satisfies Record<
  JewelCaseSpineOverlayRole,
  {
    widthBasis: 'length' | 'width'
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

function getDefaultSpineOverlayRotation(
  role: JewelCaseSpineOverlayRole,
) {
  return role === 'titleArtwork'
    ? CASE_INSERT_DEFAULT_IMPORTED_SPINE_TITLE_ARTWORK_LAYOUT.rotation
    : 0
}

function rotatePoint(
  point: { x: number; y: number },
  rotationDegrees: number,
) {
  const rotationRadians = rotationDegrees * Math.PI / 180

  return {
    x: point.x * Math.cos(rotationRadians) - point.y * Math.sin(rotationRadians),
    y: point.x * Math.sin(rotationRadians) + point.y * Math.cos(rotationRadians),
  }
}

function getRectCorners(rect: JewelCasePixelRect) {
  return [
    { x: rect.x, y: rect.y },
    { x: rect.x + rect.width, y: rect.y },
    { x: rect.x + rect.width, y: rect.y + rect.height },
    { x: rect.x, y: rect.y + rect.height },
  ]
}

function getBoundingRectFromPoints(points: Array<{ x: number; y: number }>) {
  const xs = points.map((point) => point.x)
  const ys = points.map((point) => point.y)
  const left = Math.min(...xs)
  const right = Math.max(...xs)
  const top = Math.min(...ys)
  const bottom = Math.max(...ys)

  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
  }
}

function transformGlobalRectToLocal(
  rect: JewelCasePixelRect,
  center: { x: number; y: number },
  rotationDegrees: number,
): JewelCasePixelRect {
  return getBoundingRectFromPoints(
    getRectCorners(rect).map((corner) =>
      rotatePoint(
        {
          x: corner.x - center.x,
          y: corner.y - center.y,
        },
        -rotationDegrees,
      )),
  )
}

function transformAvoidanceRegionsToLocal(
  regions: CaseInsertTextAvoidanceRegion[],
  center: { x: number; y: number },
  rotationDegrees: number,
): CaseInsertTextAvoidanceRegion[] {
  return regions.map((region) => ({
    ...region,
    bounds: transformGlobalRectToLocal(
      region.bounds,
      center,
      rotationDegrees,
    ),
  }))
}

function offsetTextVisualLines(
  lines: CaseInsertTextVisualLine[],
  offset: { x: number; y: number },
): CaseInsertTextVisualLine[] {
  return lines.map((line) => ({
    ...line,
    left: line.left - offset.x,
    right: line.right - offset.x,
    x: line.x - offset.x,
    y: line.y - offset.y,
  }))
}

function rotationSwapsAxes(rotationDegrees: number) {
  const normalized = Math.abs(((rotationDegrees % 180) + 180) % 180)

  return normalized > 45 && normalized < 135
}

function getTransformedBoundingSize({
  height,
  rotationDegrees,
  width,
}: {
  height: number
  rotationDegrees: number
  width: number
}) {
  const swapsAxes = rotationSwapsAxes(rotationDegrees)

  return {
    width: swapsAxes ? height : width,
    height: swapsAxes ? width : height,
  }
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
  const boundingSize = getTransformedBoundingSize({
    height,
    rotationDegrees,
    width,
  })
  const requestedCenter = {
    x: safeBounds.x + safeBounds.width * centerPercent.x / 100,
    y: safeBounds.y + safeBounds.height * centerPercent.y / 100,
  }
  const boundingRect = {
    x: requestedCenter.x - boundingSize.width / 2,
    y: requestedCenter.y - boundingSize.height / 2,
    width: boundingSize.width,
    height: boundingSize.height,
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

export function getJewelCaseSpineBackgroundLayoutSliderRanges(
  side: JewelCaseSpineSideId,
  slot: ProjectCaseInsertImageSlot,
  layout: CaseInsertPreviewLayout,
): CaseInsertLayoutSliderRanges {
  const fit = getJewelCaseSpineBackgroundFit(side, slot, layout)

  return fit
    ? getImageFitOffsetLayoutSliderRanges(fit)
    : CASE_INSERT_OFFSET_LAYOUT_RANGES
}

export function getJewelCaseSpineTitlePreviewLayout(
  side: JewelCaseSpineSideId,
  title: ProjectCaseInsertTextBlock,
  layout: CaseInsertPreviewLayout,
  avoidanceRegions: CaseInsertTextAvoidanceRegion[] = [],
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
    width: safeBounds.height *
      getCaseInsertTextLayoutWidth(
        title.layout,
        SPINE_TITLE_WIDTH_RATIO * 100,
      ) /
      100,
    height: safeBounds.width * SPINE_TITLE_HEIGHT_RATIO,
    rotationDegrees,
    centerPercent: {
      x: normalizePercent(title.layout.x, 50),
      y: normalizePercent(title.layout.y, 50),
    },
  })
  const isTitleText = title.id.endsWith('-title-text')
  const localReservedBounds = {
    x: -box.width / 2,
    y: -box.height / 2,
    width: box.width,
    height: box.height,
  }
  const localVisualLayout = getCaseInsertTextVisualLayout(
    localReservedBounds,
    {
      align: title.align,
      avoidanceRegions: title.avoidVisualElements
        ? transformAvoidanceRegionsToLocal(
            avoidanceRegions,
            box.center,
            box.rotationDegrees,
          )
        : [],
      boundsLimit: localReservedBounds,
      fontFamily: getCaseInsertTextFontFamilyCanvas(title.style.fontFamily),
      fontSizePx,
      fontWeight: isTitleText ? 800 : 600,
      lineHeightPx: fontSizePx * 1.1,
      maxLines: getCaseInsertTextStyleRoleMaxLines(
        getCaseInsertTextBlockStyleRole(title),
      ),
      paddingRatio: getCaseInsertTextLayoutPaddingRatio(title.style),
      text: title.value,
      uppercase: isTitleText,
      verticalAlign: 'center',
    },
  )
  const localVisualBounds = localVisualLayout.bounds
  const localVisualCenter = {
    x: localVisualBounds.x + localVisualBounds.width / 2,
    y: localVisualBounds.y + localVisualBounds.height / 2,
  }
  const rotationRadians = box.rotationDegrees * Math.PI / 180
  const visualCenter = {
    x: box.center.x +
      localVisualCenter.x * Math.cos(rotationRadians) -
      localVisualCenter.y * Math.sin(rotationRadians),
    y: box.center.y +
      localVisualCenter.x * Math.sin(rotationRadians) +
      localVisualCenter.y * Math.cos(rotationRadians),
  }
  const visualBoundingSize = getTransformedBoundingSize({
    height: localVisualBounds.height,
    rotationDegrees: box.rotationDegrees,
    width: localVisualBounds.width,
  })
  const visualBox = {
    ...box,
    center: visualCenter,
    width: localVisualBounds.width,
    height: localVisualBounds.height,
    boundingRect: {
      x: visualCenter.x - visualBoundingSize.width / 2,
      y: visualCenter.y - visualBoundingSize.height / 2,
      width: visualBoundingSize.width,
      height: visualBoundingSize.height,
    },
  }
  const textBounds = {
    x: -localVisualBounds.width / 2,
    y: -localVisualBounds.height / 2,
    width: localVisualBounds.width,
    height: localVisualBounds.height,
  }

  return {
    ...visualBox,
    fontSizePx,
    lineHeightPx: fontSizePx * 1.1,
    lines: offsetTextVisualLines(localVisualLayout.lines, localVisualCenter),
    reservedBoundingRect: box.boundingRect,
    textBounds,
  }
}

function getSpineImageSlotRenderSize(
  side: JewelCaseSpineSideId,
  slot: ProjectCaseInsertImageSlot,
  layout: CaseInsertPreviewLayout,
  role: JewelCaseSpineOverlayRole,
) {
  const safeBounds = getSpineSafeBounds(side, layout)
  const config = spineOverlayConfig[role]

  if (!safeBounds) {
    return null
  }

  const scale = normalizePositiveNumber(slot.layout.scale, 1)
  const rotationDegrees = normalizeRotationDegrees(
    slot.layout.rotation,
    getDefaultSpineOverlayRotation(role),
  )
  const widthBasis = config.widthBasis === 'length'
    ? safeBounds.height
    : safeBounds.width
  const width = widthBasis * config.widthRatio * scale
  const height = safeBounds.width * config.heightRatio * scale

  return {
    safeBounds,
    width,
    height,
    rotationDegrees,
    boundingSize: getTransformedBoundingSize({
      height,
      rotationDegrees,
      width,
    }),
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

  if (!safeBounds || !slot.enabled || !slot.imageDataUrl) {
    return null
  }

  const renderSize = getSpineImageSlotRenderSize(side, slot, layout, role)

  if (!renderSize) {
    return null
  }

  return getClampedTransformedBoxLayout({
    safeBounds,
    width: renderSize.width,
    height: renderSize.height,
    rotationDegrees: renderSize.rotationDegrees,
    centerPercent: {
      x: normalizePercent(slot.layout.x, config.defaultCenter.x),
      y: normalizePercent(slot.layout.y, config.defaultCenter.y),
    },
  })
}

export function getJewelCaseSpineImageSlotLayoutSliderRanges(
  side: JewelCaseSpineSideId,
  slot: ProjectCaseInsertImageSlot,
  layout: CaseInsertPreviewLayout,
  role: JewelCaseSpineOverlayRole,
): CaseInsertLayoutSliderRanges {
  const renderSize = getSpineImageSlotRenderSize(side, slot, layout, role)

  return renderSize
    ? getCenteredRectLayoutSliderRanges(
        renderSize.safeBounds,
        renderSize.boundingSize,
      )
    : CASE_INSERT_PERCENT_LAYOUT_RANGES
}
