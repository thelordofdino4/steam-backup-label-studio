import type {
  ProjectCaseInsertLayout,
  ProjectCaseInsertSteamBanner,
} from '../project/projectTypes.ts'
import type {
  CaseInsertPreviewLayout,
} from './caseInsertPreviewLayout.ts'
import type {
  JewelCasePixelRect,
  JewelCaseSpineSideId,
} from './jewelCaseLayout.ts'
import {
  getFiniteLayoutNumber,
  getPositiveFiniteLayoutNumber,
} from './layoutRangeMath.ts'

export type JewelCaseSteamBannerTarget =
  | { kind: 'cover' }
  | { kind: 'spine'; side: JewelCaseSpineSideId }

export type JewelCaseSteamBannerVisualLayout = {
  mainBand: JewelCasePixelRect
  accentBand: JewelCasePixelRect
  lockupRect: JewelCasePixelRect
  lockupRotationDegrees: number
}

const COVER_REFERENCE_WIDTH = 1414
const COVER_MAIN_HEIGHT = 155
const COVER_ACCENT_HEIGHT = 21
const COVER_LOCKUP_X = 54
const COVER_LOCKUP_Y = 20
const COVER_LOCKUP_WIDTH = 378
const COVER_LOCKUP_HEIGHT = 116

const SPINE_REFERENCE_WIDTH = 75
const SPINE_MAIN_HEIGHT = 156
const SPINE_ACCENT_HEIGHT = 20
const SPINE_LOCKUP_X = 9
const SPINE_LOCKUP_Y = 49
const SPINE_LOCKUP_SIZE = 57

function getRegionBounds(
  layout: CaseInsertPreviewLayout,
  regionId: 'front' | 'leftSpine' | 'rightSpine',
) {
  return layout.regions.find((region) => region.regionId === regionId)?.bounds ??
    null
}

function getTargetRegionBounds(
  target: JewelCaseSteamBannerTarget,
  layout: CaseInsertPreviewLayout,
) {
  return target.kind === 'cover'
    ? getRegionBounds(layout, 'front')
    : getRegionBounds(
        layout,
        target.side === 'left' ? 'leftSpine' : 'rightSpine',
      )
}

function scaleRectFromReference(
  reference: JewelCasePixelRect,
  scale: number,
): JewelCasePixelRect {
  return {
    x: reference.x * scale,
    y: reference.y * scale,
    width: reference.width * scale,
    height: reference.height * scale,
  }
}

function offsetRect(
  rect: JewelCasePixelRect,
  offset: Pick<JewelCasePixelRect, 'x' | 'y'>,
): JewelCasePixelRect {
  return {
    ...rect,
    x: rect.x + offset.x,
    y: rect.y + offset.y,
  }
}

function applyLockupLayout(
  baseRect: JewelCasePixelRect,
  layout: ProjectCaseInsertLayout,
): JewelCasePixelRect {
  const scale = getPositiveFiniteLayoutNumber(layout.scale, 1)
  const width = baseRect.width * scale
  const height = baseRect.height * scale
  const offsetX = getFiniteLayoutNumber(layout.x, 0)
  const offsetY = getFiniteLayoutNumber(layout.y, 0)
  const centerX = baseRect.x +
    baseRect.width / 2 +
    baseRect.width * (offsetX / 100)
  const centerY = baseRect.y +
    baseRect.height / 2 +
    baseRect.height * (offsetY / 100)

  return {
    x: centerX - width / 2,
    y: centerY - height / 2,
    width,
    height,
  }
}

function createCoverSteamBannerLayout(
  banner: ProjectCaseInsertSteamBanner,
  surface: JewelCasePixelRect,
): JewelCaseSteamBannerVisualLayout {
  const scale = surface.width / COVER_REFERENCE_WIDTH
  const mainBand = {
    x: surface.x,
    y: surface.y,
    width: surface.width,
    height: COVER_MAIN_HEIGHT * scale,
  }
  const accentBand = {
    x: surface.x,
    y: surface.y + mainBand.height,
    width: surface.width,
    height: COVER_ACCENT_HEIGHT * scale,
  }
  const baseLockupRect = offsetRect(
    scaleRectFromReference(
      {
        x: COVER_LOCKUP_X,
        y: COVER_LOCKUP_Y,
        width: COVER_LOCKUP_WIDTH,
        height: COVER_LOCKUP_HEIGHT,
      },
      scale,
    ),
    surface,
  )

  return {
    mainBand,
    accentBand,
    lockupRect: applyLockupLayout(baseLockupRect, banner.lockupLayout),
    lockupRotationDegrees: banner.lockupLayout.rotation,
  }
}

function createSpineSteamBannerLayout(
  banner: ProjectCaseInsertSteamBanner,
  spine: JewelCasePixelRect,
): JewelCaseSteamBannerVisualLayout {
  const scale = spine.width / SPINE_REFERENCE_WIDTH
  const mainBand = {
    x: spine.x,
    y: spine.y,
    width: spine.width,
    height: SPINE_MAIN_HEIGHT * scale,
  }
  const accentBand = {
    x: spine.x,
    y: spine.y + mainBand.height,
    width: spine.width,
    height: SPINE_ACCENT_HEIGHT * scale,
  }
  const baseLockupRect = offsetRect(
    scaleRectFromReference(
      {
        x: SPINE_LOCKUP_X,
        y: SPINE_LOCKUP_Y,
        width: SPINE_LOCKUP_SIZE,
        height: SPINE_LOCKUP_SIZE,
      },
      scale,
    ),
    spine,
  )

  return {
    mainBand,
    accentBand,
    lockupRect: applyLockupLayout(baseLockupRect, banner.lockupLayout),
    lockupRotationDegrees: banner.lockupLayout.rotation,
  }
}

export function getJewelCaseSteamBannerVisualLayout(
  banner: ProjectCaseInsertSteamBanner,
  target: JewelCaseSteamBannerTarget,
  layout: CaseInsertPreviewLayout,
): JewelCaseSteamBannerVisualLayout | null {
  if (!banner.enabled) {
    return null
  }

  if (target.kind === 'cover') {
    const surface = getRegionBounds(layout, 'front')

    return surface ? createCoverSteamBannerLayout(banner, surface) : null
  }

  const spine = getRegionBounds(
    layout,
    target.side === 'left' ? 'leftSpine' : 'rightSpine',
  )

  return spine ? createSpineSteamBannerLayout(banner, spine) : null
}

export function getJewelCaseSteamBannerOpenArtworkRegion(
  banner: ProjectCaseInsertSteamBanner,
  target: JewelCaseSteamBannerTarget,
  layout: CaseInsertPreviewLayout,
): JewelCasePixelRect | null {
  const region = getTargetRegionBounds(target, layout)

  if (!region) {
    return null
  }

  const bannerLayout = getJewelCaseSteamBannerVisualLayout(
    banner,
    target,
    layout,
  )

  if (!bannerLayout) {
    return region
  }

  const bannerBottom = Math.max(
    bannerLayout.mainBand.y + bannerLayout.mainBand.height,
    bannerLayout.accentBand.y + bannerLayout.accentBand.height,
  )
  const regionBottom = region.y + region.height
  const y = Math.min(regionBottom, Math.max(region.y, bannerBottom))

  return {
    x: region.x,
    y,
    width: region.width,
    height: Math.max(0, regionBottom - y),
  }
}
