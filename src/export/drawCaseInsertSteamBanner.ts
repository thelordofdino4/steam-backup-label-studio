import {
  getSteamBannerFallbackTextFontSizeForHeight,
  normalizeSteamBannerFallbackText,
  shouldRenderSteamBannerTextFallback,
} from '../branding/steamBannerDefaults.ts'
import type {
  CaseInsertPreviewLayout,
} from '../layout/caseInsertPreviewLayout.ts'
import {
  getJewelCaseSteamBannerVisualLayout,
  type JewelCaseSteamBannerTarget,
} from '../layout/jewelCaseSteamBannerLayout.ts'
import type {
  JewelCasePixelRect,
} from '../layout/jewelCaseLayout.ts'
import type {
  BackgroundImageSize,
  ProjectCaseInsertSteamBanner,
} from '../project/projectTypes.ts'
import {
  drawImageContent,
  getCanvasImageContentSize,
  loadCanvasSafeImage,
} from './canvasImage.ts'

type CaseInsertSteamBannerImageLoader = typeof loadCanvasSafeImage

export async function drawCaseInsertSteamBanner(
  context: CanvasRenderingContext2D,
  banner: ProjectCaseInsertSteamBanner,
  target: JewelCaseSteamBannerTarget,
  layout: CaseInsertPreviewLayout,
  imageLoader: CaseInsertSteamBannerImageLoader = loadCanvasSafeImage,
) {
  const bannerLayout = getJewelCaseSteamBannerVisualLayout(
    banner,
    target,
    layout,
  )

  if (!bannerLayout) {
    return
  }

  drawBannerBands(context, banner, bannerLayout.mainBand, bannerLayout.accentBand)

  const shouldDrawText = shouldRenderSteamBannerTextFallback(
    banner.useTextFallback,
    banner.lockupImageDataUrl,
  )
  const shouldTintBuiltInSpineIcon =
    target.kind === 'spine' &&
    !shouldDrawText &&
    banner.lockupImageSource?.source === 'built-in'

  if (!shouldDrawText && banner.lockupImageDataUrl) {
    try {
      const image = await imageLoader(
        banner.lockupImageDataUrl,
        target.kind === 'spine'
          ? 'Steam spine banner icon'
          : 'Steam case banner lockup',
      )

      if (drawLockupImage(
        context,
        image,
        bannerLayout.lockupRect,
        bannerLayout.lockupRotationDegrees,
        shouldTintBuiltInSpineIcon,
        banner.lockupImageSize,
      )) {
        return
      }
    } catch {
      // Keep exports resilient if a custom banner image goes stale.
    }
  }

  drawTextLockup(
    context,
    normalizeSteamBannerFallbackText(banner.fallbackText),
    bannerLayout.lockupRect,
    bannerLayout.lockupRotationDegrees,
  )
}

function drawBannerBands(
  context: CanvasRenderingContext2D,
  banner: ProjectCaseInsertSteamBanner,
  mainBand: JewelCasePixelRect,
  accentBand: JewelCasePixelRect,
) {
  context.save()
  const gradient = context.createLinearGradient(
    mainBand.x,
    mainBand.y,
    mainBand.x,
    mainBand.y + mainBand.height,
  )

  gradient.addColorStop(0, banner.colors.gradientStart)
  gradient.addColorStop(1, banner.colors.gradientEnd)

  context.fillStyle = gradient
  context.fillRect(mainBand.x, mainBand.y, mainBand.width, mainBand.height)
  context.fillStyle = banner.colors.accent
  context.fillRect(
    accentBand.x,
    accentBand.y,
    accentBand.width,
    accentBand.height,
  )
  context.restore()
}

function getContainedImageRect(
  image: CanvasImageSource & { width: number; height: number },
  target: Pick<JewelCasePixelRect, 'width' | 'height'>,
  imageSize: BackgroundImageSize | null,
) {
  const contentSize = getCanvasImageContentSize(image, imageSize)

  if (!contentSize) {
    return null
  }

  const scale = Math.min(
    target.width / contentSize.width,
    target.height / contentSize.height,
  )
  const drawWidth = contentSize.width * scale
  const drawHeight = contentSize.height * scale

  return {
    x: -drawWidth / 2,
    y: -drawHeight / 2,
    width: drawWidth,
    height: drawHeight,
  }
}

function createTintedImageCanvas(
  image: CanvasImageSource & { width: number; height: number },
  imageSize: BackgroundImageSize | null,
  width: number,
  height: number,
) {
  const canvas = document.createElement('canvas')
  const roundedWidth = Math.max(1, Math.ceil(width))
  const roundedHeight = Math.max(1, Math.ceil(height))

  canvas.width = roundedWidth
  canvas.height = roundedHeight

  const context = canvas.getContext('2d')

  if (!context) {
    return null
  }

  drawImageContent(context, image, imageSize, {
    x: 0,
    y: 0,
    width: roundedWidth,
    height: roundedHeight,
  })
  context.globalCompositeOperation = 'source-in'
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, roundedWidth, roundedHeight)

  return canvas
}

function drawLockupImage(
  context: CanvasRenderingContext2D,
  image: CanvasImageSource & { width: number; height: number },
  rect: JewelCasePixelRect,
  rotationDegrees: number,
  tintWhite: boolean,
  imageSize: BackgroundImageSize | null,
) {
  const containedRect = getContainedImageRect(image, rect, imageSize)

  if (!containedRect) {
    return false
  }

  const imageToDraw = tintWhite
    ? createTintedImageCanvas(
        image,
        imageSize,
        containedRect.width,
        containedRect.height,
      )
    : image

  context.save()
  context.translate(rect.x + rect.width / 2, rect.y + rect.height / 2)
  context.rotate(rotationDegrees * Math.PI / 180)

  if (imageToDraw) {
    drawImageContent(
      context,
      imageToDraw,
      null,
      containedRect,
    )
  }

  context.restore()
  return Boolean(imageToDraw)
}

function drawTextLockup(
  context: CanvasRenderingContext2D,
  text: string,
  rect: JewelCasePixelRect,
  rotationDegrees: number,
) {
  context.save()
  context.translate(rect.x + rect.width / 2, rect.y + rect.height / 2)
  context.rotate(rotationDegrees * Math.PI / 180)
  context.fillStyle = '#ffffff'
  context.shadowColor = 'rgba(0, 0, 0, 0.35)'
  context.shadowBlur = Math.max(4, rect.height * 0.08)
  context.shadowOffsetY = Math.max(1, rect.height * 0.02)
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.letterSpacing = '0px'

  const maxWidth = rect.width * 0.96
  const maxHeight = rect.height * 0.72
  const baseFontSize = Math.round(
    getSteamBannerFallbackTextFontSizeForHeight(text, rect.height, 8),
  )
  context.font = `900 ${baseFontSize}px Arial`

  const measuredWidth = Math.max(context.measureText(text).width, 1)
  const fontScale = Math.min(1, maxWidth / measuredWidth, maxHeight / baseFontSize)
  const fontSize = Math.max(8, Math.floor(baseFontSize * fontScale))
  context.font = `900 ${fontSize}px Arial`
  context.fillText(text, 0, 0, maxWidth)
  context.restore()
}
