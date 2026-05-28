import type { SteamBannerColors, SteamBannerLockupLayout } from '../project/projectTypes'
import type { SteamLogoPlacement } from '../discText'
import {
  getSteamBannerBandLayout,
  getSteamBannerLockupAspectRatio,
  getSteamBannerLockupRect,
  type SteamBannerRect,
} from '../steamBannerLayout'
import { getCanvasSafeImageSource, loadImage } from './canvasImage'

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

  const bannerLayout = getSteamBannerBandLayout(placement)

  if (!bannerLayout) {
    return
  }

  const mainBand = toExportRect(bannerLayout.mainBand, discContentSize, discOrigin)
  const accentBand = toExportRect(bannerLayout.accentBand, discContentSize, discOrigin)

  const gradient = context.createLinearGradient(0, mainBand.y, 0, mainBand.y + mainBand.height)
  gradient.addColorStop(0, colors.gradientStart)
  gradient.addColorStop(1, colors.gradientEnd)

  context.fillStyle = gradient
  context.fillRect(mainBand.x, mainBand.y, mainBand.width, mainBand.height)

  context.fillStyle = colors.accent
  context.fillRect(accentBand.x, accentBand.y, accentBand.width, accentBand.height)

  if (lockupImageDataUrl) {
    const canvasSafeLockupSource = await getCanvasSafeImageSource(lockupImageDataUrl)
    const lockupImage = await loadImage(canvasSafeLockupSource)
    const lockupAspectRatio = getSteamBannerLockupAspectRatio({
      width: lockupImage.naturalWidth || lockupImage.width,
      height: lockupImage.naturalHeight || lockupImage.height,
    })
    const lockupRect = getSteamBannerLockupRect(
      placement,
      lockupLayout,
      lockupAspectRatio,
    )

    if (!lockupRect) {
      return
    }

    const adjustedTarget = toExportRect(lockupRect, discContentSize, discOrigin)

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
  context.fillText('STEAM', discOrigin + discContentSize / 2, mainBand.y + mainBand.height / 2)
  context.restore()
}

function toExportRect(
  rect: SteamBannerRect,
  discContentSize: number,
  discOrigin: number,
): SteamBannerRect {
  return {
    x: discOrigin + rect.x * discContentSize,
    y: discOrigin + rect.y * discContentSize,
    width: rect.width * discContentSize,
    height: rect.height * discContentSize,
  }
}
