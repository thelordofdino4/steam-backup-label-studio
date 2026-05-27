import type { SteamBannerColors, SteamBannerLockupLayout } from '../project/projectTypes'
import type { SteamLogoPlacement } from '../discText'
import { getCanvasSafeImageSource, loadImage } from './canvasImage'

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


function applyLockupLayout(
  discContentSize: number,
  x: number,
  y: number,
  width: number,
  height: number,
  layout: SteamBannerLockupLayout,
) {
  const centerX = x + width / 2
  const centerY = y + height / 2
  const scaledWidth = width * layout.scale
  const scaledHeight = height * layout.scale
  const offsetX = discContentSize * (layout.offsetX / 100)
  const offsetY = discContentSize * (layout.offsetY / 100)

  return {
    x: centerX - scaledWidth / 2 + offsetX,
    y: centerY - scaledHeight / 2 + offsetY,
    width: scaledWidth,
    height: scaledHeight,
  }
}

export async function drawSteamBrandBanner(
  context: CanvasRenderingContext2D,
  discContentSize: number,
  discOrigin: number,
  placement: SteamLogoPlacement,
  colors: SteamBannerColors,
  lockupImageDataUrl: string | null,
  lockupLayout: SteamBannerLockupLayout,
) {
  if (placement === 'none') {
    return
  }

  const mainBandHeight =
    discContentSize * (STEAM_BANNER_MAIN_HEIGHT_AT_STANDARD_EXPORT / STANDARD_EXPORT_REFERENCE_SIZE)
  const accentBandHeight =
    discContentSize * (STEAM_BANNER_ACCENT_HEIGHT_AT_STANDARD_EXPORT / STANDARD_EXPORT_REFERENCE_SIZE)
  const accentOverlap =
    discContentSize *
    (STEAM_BANNER_ACCENT_OVERLAP_AT_STANDARD_EXPORT / STANDARD_EXPORT_REFERENCE_SIZE)

  let mainBandY = discOrigin
  let accentBandY = discOrigin + mainBandHeight - accentOverlap

  if (placement === 'bottom') {
    mainBandY = discOrigin + discContentSize - mainBandHeight
    accentBandY = mainBandY - (accentBandHeight - accentOverlap)
  }

  const gradient = context.createLinearGradient(0, mainBandY, 0, mainBandY + mainBandHeight)
  gradient.addColorStop(0, colors.gradientStart)
  gradient.addColorStop(1, colors.gradientEnd)

  context.fillStyle = gradient
  context.fillRect(discOrigin, mainBandY, discContentSize, mainBandHeight)

  context.fillStyle = colors.accent
  context.fillRect(discOrigin, accentBandY, discContentSize, accentBandHeight)

  if (lockupImageDataUrl) {
    const canvasSafeLockupSource = await getCanvasSafeImageSource(lockupImageDataUrl)
    const lockupImage = await loadImage(canvasSafeLockupSource)
    const naturalWidth = lockupImage.naturalWidth || lockupImage.width || 600
    const naturalHeight = lockupImage.naturalHeight || lockupImage.height || 160
    const lockupAspectRatio = naturalWidth / naturalHeight

    if (placement === 'bottom') {
      const targetX =
        discOrigin + discContentSize *
        (STEAM_BANNER_BOTTOM_LOCKUP_X_AT_STANDARD_EXPORT /
          STANDARD_LOCKUP_EXPORT_REFERENCE_SIZE)
      const targetY =
        discOrigin + discContentSize *
        (STEAM_BANNER_BOTTOM_LOCKUP_Y_AT_STANDARD_EXPORT /
          STANDARD_LOCKUP_EXPORT_REFERENCE_SIZE)
      const targetWidth =
        discContentSize *
        (STEAM_BANNER_BOTTOM_LOCKUP_WIDTH_AT_STANDARD_EXPORT /
          STANDARD_LOCKUP_EXPORT_REFERENCE_SIZE)
      const targetHeight =
        discContentSize *
        (STEAM_BANNER_BOTTOM_LOCKUP_HEIGHT_AT_STANDARD_EXPORT /
          STANDARD_LOCKUP_EXPORT_REFERENCE_SIZE)

      const adjustedTarget = applyLockupLayout(
        discContentSize,
        targetX,
        targetY,
        targetWidth,
        targetHeight,
        lockupLayout,
      )

      context.drawImage(
        lockupImage,
        adjustedTarget.x,
        adjustedTarget.y,
        adjustedTarget.width,
        adjustedTarget.height,
      )
      return
    }

    const lockupTop =
      discOrigin +
      discContentSize *
      (STEAM_BANNER_LOCKUP_TOP_AT_STANDARD_EXPORT / STANDARD_LOCKUP_EXPORT_REFERENCE_SIZE)
    const lockupBottom =
      discOrigin +
      discContentSize *
      (STEAM_BANNER_LOCKUP_BOTTOM_AT_STANDARD_EXPORT / STANDARD_LOCKUP_EXPORT_REFERENCE_SIZE)
    const lockupHeight = lockupBottom - lockupTop
    const lockupWidth = lockupHeight * lockupAspectRatio

    const lockupXOffset =
      discContentSize *
      (STEAM_BANNER_LOCKUP_X_OFFSET_AT_STANDARD_EXPORT /
        STANDARD_LOCKUP_EXPORT_REFERENCE_SIZE)

    const adjustedTarget = applyLockupLayout(
      discContentSize,
      discOrigin + discContentSize / 2 - lockupWidth / 2 + lockupXOffset,
      lockupTop,
      lockupWidth,
      lockupHeight,
      lockupLayout,
    )

    context.drawImage(
      lockupImage,
      adjustedTarget.x,
      adjustedTarget.y,
      adjustedTarget.width,
      adjustedTarget.height,
    )
    return
  }

  context.save()
  context.fillStyle = '#f9fafb'
  context.font = `bold ${Math.round(discContentSize * 0.04)}px Arial`
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.letterSpacing = `${Math.round(discContentSize * 0.004)}px`
  context.fillText('STEAM', discOrigin + discContentSize / 2, mainBandY + mainBandHeight / 2)
  context.restore()
}
