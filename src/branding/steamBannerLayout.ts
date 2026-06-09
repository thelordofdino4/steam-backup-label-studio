import type { SteamLogoPlacement } from '../discText/index'
import type { BackgroundImageSize, SteamBannerLockupLayout } from '../project/projectTypes'
import { getImageContentSize } from '../image/imageContentBounds.ts'

export type SteamBannerRect = {
  x: number
  y: number
  width: number
  height: number
}

export type SteamBannerBandLayout = {
  mainBand: SteamBannerRect
  accentBand: SteamBannerRect
}

const STEAM_BANNER_MAIN_HEIGHT_AT_STANDARD_EXPORT = 200
const STEAM_BANNER_ACCENT_HEIGHT_AT_STANDARD_EXPORT = 20
const STEAM_BANNER_ACCENT_OVERLAP_AT_STANDARD_EXPORT = 3
const STANDARD_EXPORT_REFERENCE_SIZE = 1417

const STANDARD_LOCKUP_EXPORT_REFERENCE_SIZE = 1423
const STEAM_BANNER_LOCKUP_TOP_AT_STANDARD_EXPORT = 53
const STEAM_BANNER_LOCKUP_BOTTOM_AT_STANDARD_EXPORT = 170
const STEAM_BANNER_LOCKUP_X_OFFSET_AT_STANDARD_EXPORT = 0.5
const STEAM_BANNER_BOTTOM_LOCKUP_X_AT_STANDARD_EXPORT = 518
const STEAM_BANNER_BOTTOM_LOCKUP_Y_AT_STANDARD_EXPORT = 1253
const STEAM_BANNER_BOTTOM_LOCKUP_WIDTH_AT_STANDARD_EXPORT = 388
const STEAM_BANNER_BOTTOM_LOCKUP_HEIGHT_AT_STANDARD_EXPORT = 117

const DEFAULT_STEAM_BANNER_LOCKUP_ASPECT_RATIO =
  STEAM_BANNER_BOTTOM_LOCKUP_WIDTH_AT_STANDARD_EXPORT /
  STEAM_BANNER_BOTTOM_LOCKUP_HEIGHT_AT_STANDARD_EXPORT

export function getSteamBannerLockupAspectRatio(
  imageSize: BackgroundImageSize | null | undefined,
): number {
  const contentSize = getImageContentSize(imageSize)

  if (!contentSize) {
    return DEFAULT_STEAM_BANNER_LOCKUP_ASPECT_RATIO
  }

  return contentSize.width / contentSize.height
}

export function getSteamBannerBandLayout(
  placement: SteamLogoPlacement,
): SteamBannerBandLayout | null {
  if (placement === 'none') {
    return null
  }

  const mainBandHeight =
    STEAM_BANNER_MAIN_HEIGHT_AT_STANDARD_EXPORT / STANDARD_EXPORT_REFERENCE_SIZE
  const accentBandHeight =
    STEAM_BANNER_ACCENT_HEIGHT_AT_STANDARD_EXPORT / STANDARD_EXPORT_REFERENCE_SIZE
  const accentOverlap =
    STEAM_BANNER_ACCENT_OVERLAP_AT_STANDARD_EXPORT / STANDARD_EXPORT_REFERENCE_SIZE

  const mainBandY = placement === 'bottom' ? 1 - mainBandHeight : 0
  const accentBandY =
    placement === 'bottom'
      ? mainBandY - (accentBandHeight - accentOverlap)
      : mainBandY + mainBandHeight - accentOverlap

  return {
    mainBand: {
      x: 0,
      y: mainBandY,
      width: 1,
      height: mainBandHeight,
    },
    accentBand: {
      x: 0,
      y: accentBandY,
      width: 1,
      height: accentBandHeight,
    },
  }
}

export function getSteamBannerLockupRect(
  placement: SteamLogoPlacement,
  layout: SteamBannerLockupLayout,
  lockupAspectRatio: number,
): SteamBannerRect | null {
  if (placement === 'none') {
    return null
  }

  const baseRect =
    placement === 'bottom'
      ? getBottomSteamBannerLockupRect(lockupAspectRatio)
      : getTopSteamBannerLockupRect(lockupAspectRatio)

  return applyLockupLayout(baseRect, layout)
}

function getTopSteamBannerLockupRect(lockupAspectRatio: number): SteamBannerRect {
  const lockupTop =
    STEAM_BANNER_LOCKUP_TOP_AT_STANDARD_EXPORT /
    STANDARD_LOCKUP_EXPORT_REFERENCE_SIZE
  const lockupBottom =
    STEAM_BANNER_LOCKUP_BOTTOM_AT_STANDARD_EXPORT /
    STANDARD_LOCKUP_EXPORT_REFERENCE_SIZE
  const lockupHeight = lockupBottom - lockupTop
  const lockupWidth = lockupHeight * lockupAspectRatio
  const lockupXOffset =
    STEAM_BANNER_LOCKUP_X_OFFSET_AT_STANDARD_EXPORT /
    STANDARD_LOCKUP_EXPORT_REFERENCE_SIZE

  return {
    x: 0.5 - lockupWidth / 2 + lockupXOffset,
    y: lockupTop,
    width: lockupWidth,
    height: lockupHeight,
  }
}

function getBottomSteamBannerLockupRect(lockupAspectRatio: number): SteamBannerRect {
  const referenceRect = {
    x:
      STEAM_BANNER_BOTTOM_LOCKUP_X_AT_STANDARD_EXPORT /
      STANDARD_LOCKUP_EXPORT_REFERENCE_SIZE,
    y:
      STEAM_BANNER_BOTTOM_LOCKUP_Y_AT_STANDARD_EXPORT /
      STANDARD_LOCKUP_EXPORT_REFERENCE_SIZE,
    width:
      STEAM_BANNER_BOTTOM_LOCKUP_WIDTH_AT_STANDARD_EXPORT /
      STANDARD_LOCKUP_EXPORT_REFERENCE_SIZE,
    height:
      STEAM_BANNER_BOTTOM_LOCKUP_HEIGHT_AT_STANDARD_EXPORT /
      STANDARD_LOCKUP_EXPORT_REFERENCE_SIZE,
  }
  const lockupWidth = referenceRect.height * lockupAspectRatio
  const lockupCenterX = referenceRect.x + referenceRect.width / 2

  return {
    x: lockupCenterX - lockupWidth / 2,
    y: referenceRect.y,
    width: lockupWidth,
    height: referenceRect.height,
  }
}

function applyLockupLayout(
  rect: SteamBannerRect,
  layout: SteamBannerLockupLayout,
): SteamBannerRect {
  const centerX = rect.x + rect.width / 2
  const centerY = rect.y + rect.height / 2
  const scaledWidth = rect.width * layout.scale
  const scaledHeight = rect.height * layout.scale
  const offsetX = rect.width * (layout.offsetX / 100)
  const offsetY = rect.height * (layout.offsetY / 100)

  return {
    x: centerX - scaledWidth / 2 + offsetX,
    y: centerY - scaledHeight / 2 + offsetY,
    width: scaledWidth,
    height: scaledHeight,
  }
}
