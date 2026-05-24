import type { SteamBannerColors } from '../project/projectTypes'
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

export async function drawSteamBrandBanner(
  context: CanvasRenderingContext2D,
  exportSize: number,
  placement: SteamLogoPlacement,
  colors: SteamBannerColors,
  lockupImageDataUrl: string | null,
) {
  if (placement === 'none') {
    return
  }

  const mainBandHeight =
    exportSize * (STEAM_BANNER_MAIN_HEIGHT_AT_STANDARD_EXPORT / STANDARD_EXPORT_REFERENCE_SIZE)
  const accentBandHeight =
    exportSize * (STEAM_BANNER_ACCENT_HEIGHT_AT_STANDARD_EXPORT / STANDARD_EXPORT_REFERENCE_SIZE)
  const accentOverlap =
    exportSize *
    (STEAM_BANNER_ACCENT_OVERLAP_AT_STANDARD_EXPORT / STANDARD_EXPORT_REFERENCE_SIZE)

  let mainBandY = 0
  let accentBandY = mainBandHeight - accentOverlap

  if (placement === 'bottom') {
    mainBandY = exportSize - mainBandHeight
    accentBandY = mainBandY - (accentBandHeight - accentOverlap)
  }

  const gradient = context.createLinearGradient(0, mainBandY, 0, mainBandY + mainBandHeight)
  gradient.addColorStop(0, colors.gradientStart)
  gradient.addColorStop(1, colors.gradientEnd)

  context.fillStyle = gradient
  context.fillRect(0, mainBandY, exportSize, mainBandHeight)

  context.fillStyle = colors.accent
  context.fillRect(0, accentBandY, exportSize, accentBandHeight)

  if (lockupImageDataUrl) {
    const canvasSafeLockupSource = await getCanvasSafeImageSource(lockupImageDataUrl)
    const lockupImage = await loadImage(canvasSafeLockupSource)
    const naturalWidth = lockupImage.naturalWidth || lockupImage.width || 600
    const naturalHeight = lockupImage.naturalHeight || lockupImage.height || 160
    const lockupAspectRatio = naturalWidth / naturalHeight

    if (placement === 'bottom') {
      const targetX =
        exportSize *
        (STEAM_BANNER_BOTTOM_LOCKUP_X_AT_STANDARD_EXPORT /
          STANDARD_LOCKUP_EXPORT_REFERENCE_SIZE)
      const targetY =
        exportSize *
        (STEAM_BANNER_BOTTOM_LOCKUP_Y_AT_STANDARD_EXPORT /
          STANDARD_LOCKUP_EXPORT_REFERENCE_SIZE)
      const targetWidth =
        exportSize *
        (STEAM_BANNER_BOTTOM_LOCKUP_WIDTH_AT_STANDARD_EXPORT /
          STANDARD_LOCKUP_EXPORT_REFERENCE_SIZE)
      const targetHeight =
        exportSize *
        (STEAM_BANNER_BOTTOM_LOCKUP_HEIGHT_AT_STANDARD_EXPORT /
          STANDARD_LOCKUP_EXPORT_REFERENCE_SIZE)

      context.drawImage(
        lockupImage,
        targetX,
        targetY,
        targetWidth,
        targetHeight,
      )
      return
    }

    const lockupTop =
      exportSize *
      (STEAM_BANNER_LOCKUP_TOP_AT_STANDARD_EXPORT / STANDARD_LOCKUP_EXPORT_REFERENCE_SIZE)
    const lockupBottom =
      exportSize *
      (STEAM_BANNER_LOCKUP_BOTTOM_AT_STANDARD_EXPORT / STANDARD_LOCKUP_EXPORT_REFERENCE_SIZE)
    const lockupHeight = lockupBottom - lockupTop
    const lockupWidth = lockupHeight * lockupAspectRatio

    const lockupXOffset =
      exportSize *
      (STEAM_BANNER_LOCKUP_X_OFFSET_AT_STANDARD_EXPORT /
        STANDARD_LOCKUP_EXPORT_REFERENCE_SIZE)

    context.drawImage(
      lockupImage,
      exportSize / 2 - lockupWidth / 2 + lockupXOffset,
      lockupTop,
      lockupWidth,
      lockupHeight,
    )
    return
  }

  context.save()
  context.fillStyle = '#f9fafb'
  context.font = `bold ${Math.round(exportSize * 0.04)}px Arial`
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.letterSpacing = `${Math.round(exportSize * 0.004)}px`
  context.fillText('STEAM', exportSize / 2, mainBandY + mainBandHeight / 2)
  context.restore()
}
