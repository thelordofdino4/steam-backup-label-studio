import type { BackgroundImageSize, SteamBannerColors, SteamBannerLockupLayout } from '../project/projectTypes'
import type { SteamLogoPlacement } from '../discText/index.ts'
import {
  getSteamBannerBandLayout,
  getSteamBannerLockupAspectRatio,
  getSteamBannerLockupRect,
  type SteamBannerRect,
} from '../branding/steamBannerLayout.ts'
import {
  getSteamBannerFallbackTextFontSizeForHeight,
  normalizeSteamBannerFallbackText,
  shouldRenderSteamBannerTextFallback,
} from '../branding/steamBannerDefaults.ts'
import {
  drawImageContent,
  getCanvasImageContentSize,
  loadCanvasSafeImage,
} from './canvasImage.ts'

type SteamBannerImageLoader = typeof loadCanvasSafeImage

export async function drawSteamBrandBanner(
  context: CanvasRenderingContext2D,
  discContentSize: number,
  discOrigin: number,
  placement: SteamLogoPlacement,
  colors: SteamBannerColors,
  lockupImageDataUrl: string | null,
  lockupImageSize: BackgroundImageSize | null,
  lockupLayout: SteamBannerLockupLayout,
  useTextFallback: boolean,
  fallbackText: string,
  imageLoader: SteamBannerImageLoader = loadCanvasSafeImage,
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

  const shouldDrawText = shouldRenderSteamBannerTextFallback(
    useTextFallback,
    lockupImageDataUrl,
  )
  const lockupRect = getSteamBannerLockupRect(
    placement,
    lockupLayout,
    getSteamBannerLockupAspectRatio(null),
  )

  if (!shouldDrawText && lockupImageDataUrl) {
    try {
      const lockupImage = await imageLoader(
        lockupImageDataUrl,
        'Steam banner lockup image',
      )
      const contentSize = getCanvasImageContentSize(lockupImage, lockupImageSize)
      const lockupAspectRatio = getSteamBannerLockupAspectRatio(contentSize)
      const imageLockupRect = getSteamBannerLockupRect(
        placement,
        lockupLayout,
        lockupAspectRatio,
      )

      if (imageLockupRect) {
        const adjustedTarget = toExportRect(imageLockupRect, discContentSize, discOrigin)

        if (drawImageContent(
          context,
          lockupImage,
          lockupImageSize,
          adjustedTarget,
        )) {
          return
        }
      }
    } catch {
      // Preserve export when a saved/custom lockup URL goes stale; draw the text fallback instead.
    }
  }

  if (!lockupRect) {
    return
  }

  const adjustedTarget = toExportRect(lockupRect, discContentSize, discOrigin)
  drawTextLockup(
    context,
    normalizeSteamBannerFallbackText(fallbackText),
    adjustedTarget,
  )
}

function drawTextLockup(
  context: CanvasRenderingContext2D,
  text: string,
  target: SteamBannerRect,
) {
  context.save()
  context.fillStyle = '#f9fafb'
  context.shadowColor = 'rgba(0, 0, 0, 0.35)'
  context.shadowBlur = Math.max(6, target.height * 0.08)
  context.shadowOffsetY = Math.max(2, target.height * 0.02)
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.letterSpacing = '0px'

  const maxWidth = target.width * 0.96
  const maxHeight = target.height * 0.72
  const baseFontSize = Math.round(
    getSteamBannerFallbackTextFontSizeForHeight(text, target.height, 10),
  )
  context.font = `900 ${baseFontSize}px Arial`

  const measuredWidth = Math.max(context.measureText(text).width, 1)
  const fontScale = Math.min(1, maxWidth / measuredWidth, maxHeight / baseFontSize)
  const fontSize = Math.max(10, Math.floor(baseFontSize * fontScale))
  context.font = `900 ${fontSize}px Arial`
  context.fillText(text, target.x + target.width / 2, target.y + target.height / 2, maxWidth)
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
