import type {
  ProjectCaseInsertImageSlot,
  ProjectCaseInsertSteamBanner,
  ProjectCaseInsertTextBlock,
} from '../project/projectTypes.ts'
import { getImageContentSize } from '../image/imageContentBounds.ts'
import {
  CASE_INSERT_DEFAULT_IMPORTED_SPINE_TITLE_ARTWORK_LAYOUT,
} from '../caseInsert/defaultImportLayouts.ts'
import {
  getCaseInsertTextEffectiveFontWeight,
  getCaseInsertTextFontFamilyCanvas,
  getCaseInsertTextFontStyle,
} from '../caseInsert/textStyles.ts'
import {
  getCaseInsertTextLayoutPaddingRatio,
} from '../caseInsert/textRenderStyles.ts'
import {
  CASE_INSERT_TEXT_BLOCK_MAX_LINES,
  getCaseInsertTextLayoutWidth,
} from '../caseInsert/textLayout.ts'
import {
  getCaseInsertLayoutFontSizePx,
} from '../caseInsert/textSizing.ts'
import type { JewelCaseRegionId } from '../templates/caseInsertTemplates.ts'
import type { CaseInsertPreviewLayout } from './caseInsertPreviewLayout.ts'
import {
  CASE_INSERT_OFFSET_LAYOUT_RANGES,
  CASE_INSERT_PERCENT_LAYOUT_RANGES,
  getCenteredRectLayoutSliderRanges,
  getOffsetRectLayoutSliderRanges,
  type CaseInsertLayoutSliderRanges,
} from './caseInsertElementSafeZone.ts'
import {
  getFiniteLayoutNumber,
  getPositiveFiniteLayoutNumber,
  normalizePercentLayoutValue,
} from './layoutRangeMath.ts'
import type { CaseInsertTextAvoidanceRegion } from './caseInsertTextAvoidance.ts'
import {
  getCaseInsertTextVisualLayout,
  type CaseInsertTextVisualLine,
} from './caseInsertTextVisualLayout.ts'
import {
  boxLayoutOffsetIsZero,
  clampTransformedBoxLayoutToBounds,
  getLocalTransformedBoxBounds,
  getTransformedBoundingSize,
  getTransformedBoxLayout,
  getTransformedBoxLayoutOffset,
  getVisualBoxFromLocalBounds,
  offsetTransformedBoxLayout,
  transformAvoidanceRegionsToLocal,
  type JewelCaseSpineBoxLayout,
} from './jewelCaseSpineTransform.ts'
import {
  getRenderableRichTextDocument,
  isHtmlTextEnabled,
} from '../text/htmlText.ts'
import {
  fitImageToJewelCaseRegion,
  type JewelCaseImageFitResult,
  type JewelCasePixelRect,
  type JewelCaseSpineSideId,
} from './jewelCaseLayout.ts'
import {
  getJewelCaseSteamBannerOpenArtworkRegion,
} from './jewelCaseSteamBannerLayout.ts'
import type {
  JewelCaseGuideId,
} from '../templates/caseInsertTemplates.ts'

export type JewelCaseSpineOverlayRole =
  | 'titleArtwork'
  | 'artwork'
  | 'logo'
  | 'mark'

export type {
  JewelCaseSpineBoxLayout,
} from './jewelCaseSpineTransform.ts'

export type JewelCaseSpineTitlePreviewLayout = JewelCaseSpineBoxLayout & {
  fontSizePx: number
  lineHeightPx: number
  lines: CaseInsertTextVisualLine[]
  reservedBoundingRect: JewelCasePixelRect
  textBounds: JewelCasePixelRect
}

const SPINE_TITLE_WIDTH_RATIO = 0.92
const SPINE_TITLE_HEIGHT_RATIO = 0.86

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

function normalizeRotationDegrees(value: number, fallback: number) {
  return getFiniteLayoutNumber(value, fallback)
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

function getSpineSafeGuideId(side: JewelCaseSpineSideId): JewelCaseGuideId {
  return side === 'left' ? 'leftSpineSafeBounds' : 'rightSpineSafeBounds'
}

function getSpineSafeBounds(
  side: JewelCaseSpineSideId,
  layout: CaseInsertPreviewLayout,
) {
  return layout.guides.find(
    ({ guideId }) => guideId === getSpineSafeGuideId(side),
  )?.bounds ?? getRegionBounds(layout, getSpineRegionId(side, true))
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
  return clampTransformedBoxLayoutToBounds(
    getTransformedBoxLayout({
      safeBounds,
      width,
      height,
      rotationDegrees,
      centerPercent,
    }),
    safeBounds,
  )
}

function getSpineTextLocalVisualLayout({
  avoidanceRegions,
  box,
  fontSizePx,
  title,
}: {
  avoidanceRegions: CaseInsertTextAvoidanceRegion[]
  box: JewelCaseSpineBoxLayout
  fontSizePx: number
  title: ProjectCaseInsertTextBlock
}) {
  const isTitleText = title.id.endsWith('-title-text')
  const localReservedBounds = getLocalTransformedBoxBounds(box)

  return getCaseInsertTextVisualLayout(
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
      fontStyle: getCaseInsertTextFontStyle(title.style),
      fontWeight: getCaseInsertTextEffectiveFontWeight(
        isTitleText ? 800 : 600,
        title.style,
      ),
      lineHeightPx: fontSizePx * 1.1,
      maxLines: CASE_INSERT_TEXT_BLOCK_MAX_LINES,
      paddingRatio: getCaseInsertTextLayoutPaddingRatio(title.style),
      richText: isHtmlTextEnabled(title)
        ? getRenderableRichTextDocument(title, title.value)
        : undefined,
      text: title.value,
      uppercase: isTitleText,
      verticalAlign: 'center',
    },
  )
}

function getClampedSpineTextVisualPlacement({
  avoidanceRegions,
  fontSizePx,
  requestedBox,
  safeBounds,
  title,
}: {
  avoidanceRegions: CaseInsertTextAvoidanceRegion[]
  fontSizePx: number
  requestedBox: JewelCaseSpineBoxLayout
  safeBounds: JewelCasePixelRect
  title: ProjectCaseInsertTextBlock
}) {
  let reservedBox = requestedBox
  let localVisualLayout = getSpineTextLocalVisualLayout({
    avoidanceRegions,
    box: reservedBox,
    fontSizePx,
    title,
  })
  let visualBox = getVisualBoxFromLocalBounds(reservedBox, localVisualLayout.bounds)

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const clampedVisualBox = clampTransformedBoxLayoutToBounds(
      visualBox,
      safeBounds,
    )
    const clampOffset = getTransformedBoxLayoutOffset(
      visualBox,
      clampedVisualBox,
    )

    visualBox = clampedVisualBox

    if (boxLayoutOffsetIsZero(clampOffset)) {
      break
    }

    reservedBox = offsetTransformedBoxLayout(reservedBox, clampOffset)

    if (!title.avoidVisualElements) {
      break
    }

    localVisualLayout = getSpineTextLocalVisualLayout({
      avoidanceRegions,
      box: reservedBox,
      fontSizePx,
      title,
    })
    visualBox = getVisualBoxFromLocalBounds(
      reservedBox,
      localVisualLayout.bounds,
    )
  }

  const finalVisualBox = clampTransformedBoxLayoutToBounds(visualBox, safeBounds)
  const finalClampOffset = getTransformedBoxLayoutOffset(
    visualBox,
    finalVisualBox,
  )

  if (!boxLayoutOffsetIsZero(finalClampOffset)) {
    reservedBox = offsetTransformedBoxLayout(reservedBox, finalClampOffset)
  }

  return { localVisualLayout, reservedBox, visualBox: finalVisualBox }
}

function getSpineTextLayoutRequest(
  side: JewelCaseSpineSideId,
  title: ProjectCaseInsertTextBlock,
  layout: CaseInsertPreviewLayout,
) {
  const safeBounds = getSpineSafeBounds(side, layout)

  if (!safeBounds || !title.enabled) {
    return null
  }

  const rotationDegrees = normalizeRotationDegrees(
    title.layout.rotation,
    getDefaultSpineRotation(side),
  )
  const fontSizePx = getCaseInsertLayoutFontSizePx(
    title.layout,
    title.id.includes('legal') || title.id.includes('copyright')
      ? 'spineLegal'
      : title.id.endsWith('-title-text')
        ? 'spineTitle'
        : 'spineSecondary',
  )
  const requestedBox = getTransformedBoxLayout({
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
      x: normalizePercentLayoutValue(title.layout.x, 50),
      y: normalizePercentLayoutValue(title.layout.y, 50),
    },
  })

  return {
    fontSizePx,
    requestedBox,
    safeBounds,
  }
}

export function getJewelCaseSpineBackgroundFit(
  side: JewelCaseSpineSideId,
  slot: ProjectCaseInsertImageSlot,
  layout: CaseInsertPreviewLayout,
  steamBanner?: ProjectCaseInsertSteamBanner,
): JewelCaseImageFitResult | null {
  const region = steamBanner
    ? getJewelCaseSteamBannerOpenArtworkRegion(
        steamBanner,
        { kind: 'spine', side },
        layout,
      )
    : getRegionBounds(layout, getSpineRegionId(side))

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
  void side
  void slot
  void layout

  return CASE_INSERT_OFFSET_LAYOUT_RANGES
}

export function getJewelCaseSpineTitlePreviewLayout(
  side: JewelCaseSpineSideId,
  title: ProjectCaseInsertTextBlock,
  layout: CaseInsertPreviewLayout,
  avoidanceRegions: CaseInsertTextAvoidanceRegion[] = [],
): JewelCaseSpineTitlePreviewLayout | null {
  const request = getSpineTextLayoutRequest(side, title, layout)

  if (!request) {
    return null
  }

  const { fontSizePx, requestedBox, safeBounds } = request
  const { localVisualLayout, reservedBox, visualBox } =
    getClampedSpineTextVisualPlacement({
      avoidanceRegions,
      fontSizePx,
      requestedBox,
      safeBounds,
      title,
    })
  const localVisualBounds = localVisualLayout.bounds
  const localVisualCenter = {
    x: localVisualBounds.x + localVisualBounds.width / 2,
    y: localVisualBounds.y + localVisualBounds.height / 2,
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
    reservedBoundingRect: reservedBox.boundingRect,
    textBounds,
  }
}

export function getJewelCaseSpineTextLayoutSliderRanges(
  side: JewelCaseSpineSideId,
  title: ProjectCaseInsertTextBlock,
  layout: CaseInsertPreviewLayout,
  avoidanceRegions: CaseInsertTextAvoidanceRegion[] = [],
): CaseInsertLayoutSliderRanges {
  const request = getSpineTextLayoutRequest(side, title, layout)

  if (!request) {
    return CASE_INSERT_PERCENT_LAYOUT_RANGES
  }

  const localVisualLayout = getSpineTextLocalVisualLayout({
    avoidanceRegions,
    box: request.requestedBox,
    fontSizePx: request.fontSizePx,
    title,
  })
  const visualBox = getVisualBoxFromLocalBounds(
    request.requestedBox,
    localVisualLayout.bounds,
  )

  return getOffsetRectLayoutSliderRanges(request.safeBounds, {
    x: visualBox.boundingRect.x - request.requestedBox.center.x,
    y: visualBox.boundingRect.y - request.requestedBox.center.y,
    width: visualBox.boundingRect.width,
    height: visualBox.boundingRect.height,
  })
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

  const scale = getPositiveFiniteLayoutNumber(slot.layout.scale, 1)
  const contentSize = getImageContentSize(slot.imageSize)
  const rotationDegrees = normalizeRotationDegrees(
    slot.layout.rotation,
    getDefaultSpineOverlayRotation(role),
  )
  const widthBasis = config.widthBasis === 'length'
    ? safeBounds.height
    : safeBounds.width
  const maxWidth = widthBasis * config.widthRatio * scale
  const maxHeight = safeBounds.width * config.heightRatio * scale
  const aspectRatio = contentSize
    ? contentSize.width / contentSize.height
    : maxWidth / maxHeight
  let width = maxWidth
  let height = width / aspectRatio

  if (height > maxHeight) {
    height = maxHeight
    width = height * aspectRatio
  }

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
      x: normalizePercentLayoutValue(slot.layout.x, config.defaultCenter.x),
      y: normalizePercentLayoutValue(slot.layout.y, config.defaultCenter.y),
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
