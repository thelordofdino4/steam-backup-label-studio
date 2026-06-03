import {
  BACKGROUND_SCALE_MAX,
  BACKGROUND_SCALE_MIN,
  clampBackgroundOffsetToImageBounds,
  getBackgroundDrawSize,
} from '../image/backgroundImage.ts'
import { clampNumber } from '../disc/geometry.ts'
import type { SteamLogoPlacement } from '../discText/types'
import type {
  BackgroundImageSize,
  BackgroundOffset,
} from '../project/projectTypes.ts'
import { getSteamBannerBandLayout } from '../branding/steamBannerLayout.ts'

export type BackgroundFitToSteamBannerResult = {
  scale: number
  offset: BackgroundOffset
}

type BackgroundFitToSteamBannerParams = {
  imageSize: BackgroundImageSize | null
  previewSize: number
  steamLogoPlacement: SteamLogoPlacement
}

function getOpenArtworkBand(steamLogoPlacement: SteamLogoPlacement) {
  if (steamLogoPlacement === 'none') {
    return {
      top: 0,
      bottom: 1,
    }
  }

  const bannerLayout = getSteamBannerBandLayout(steamLogoPlacement)

  if (!bannerLayout) {
    return null
  }

  if (steamLogoPlacement === 'top') {
    const bannerBottom = Math.max(
      bannerLayout.mainBand.y + bannerLayout.mainBand.height,
      bannerLayout.accentBand.y + bannerLayout.accentBand.height,
    )

    return {
      top: bannerBottom,
      bottom: 1,
    }
  }

  const bannerTop = Math.min(
    bannerLayout.mainBand.y,
    bannerLayout.accentBand.y,
  )

  return {
    top: 0,
    bottom: bannerTop,
  }
}

export function getBackgroundFitToSteamBannerOpenArea({
  imageSize,
  previewSize,
  steamLogoPlacement,
}: BackgroundFitToSteamBannerParams): BackgroundFitToSteamBannerResult | null {
  const openBand = getOpenArtworkBand(steamLogoPlacement)
  const size = Number.isFinite(previewSize) && previewSize > 0 ? previewSize : 0

  if (!openBand || !imageSize || size <= 0) {
    return null
  }

  const baseDrawSize = getBackgroundDrawSize(imageSize, 1, size)
  const openHeight = Math.max(0, openBand.bottom - openBand.top)
  const targetHeight = openHeight * size

  if (baseDrawSize.height <= 0 || targetHeight <= 0) {
    return null
  }

  const scale = clampNumber(
    targetHeight / baseDrawSize.height,
    BACKGROUND_SCALE_MIN,
    BACKGROUND_SCALE_MAX,
  )
  const offsetY = ((openBand.top + openBand.bottom) / 2 - 0.5) * size
  const offset = clampBackgroundOffsetToImageBounds(
    {
      x: 0,
      y: offsetY,
    },
    imageSize,
    scale,
    size,
  )

  return {
    scale,
    offset,
  }
}
