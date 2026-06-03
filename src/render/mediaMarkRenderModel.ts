import {
  getMediaMarkBoundsPercent,
  getMediaMarkPlaceholderBoundsPercent,
  getPlatformMarkBoundsPercent,
  getPlatformMarkPlaceholderBoundsPercent,
  type RenderBoundsPercent,
} from '../disc/geometry.ts'
import {
  getMediaMarkPlaceholderImageUrl,
  getPlatformMarkPlaceholderImageUrl,
} from '../assets/assetManifest.ts'
import {
  getMediaMarkLabel,
  getPlatformMarkLabel,
  getProjectPlatformMarkAsset,
} from '../project/projectMediaMark.ts'
import type {
  MediaMarkLayout,
  PlatformMarkLayout,
  PlatformMarkValue,
  ProjectMediaMark,
  ProjectPlatformMarkAsset,
  ProjectPlatformMarks,
} from '../project/projectTypes.ts'

export type MediaMarkRenderModel = {
  imageDataUrl: string
  isPlaceholderImage: boolean
  label: string
  alt: string
  layout: MediaMarkLayout
  unscaledBounds: RenderBoundsPercent
  scaledBounds: RenderBoundsPercent
}

export type PlatformMarkRenderModel = {
  value: PlatformMarkValue
  asset: ProjectPlatformMarkAsset
  imageDataUrl: string
  isPlaceholderImage: boolean
  label: string
  alt: string
  layout: PlatformMarkLayout
  unscaledBounds: RenderBoundsPercent
  scaledBounds: RenderBoundsPercent
}

function hasCustomImage(
  source: 'placeholder' | 'custom',
  imageDataUrl: string | null,
): imageDataUrl is string {
  return source === 'custom' && Boolean(imageDataUrl)
}

export function createMediaMarkRenderModel(
  mediaMark: ProjectMediaMark,
): MediaMarkRenderModel | null {
  if (!mediaMark.layout.enabled) {
    return null
  }

  const label = getMediaMarkLabel(mediaMark.value)
  const customImageDataUrl = mediaMark.customImageDataUrl
  const isCustomImage = hasCustomImage(
    mediaMark.source,
    customImageDataUrl,
  )
  const getBounds = (scale: number) =>
    isCustomImage && mediaMark.customImageSize
      ? getMediaMarkBoundsPercent(mediaMark.customImageSize, scale)
      : getMediaMarkPlaceholderBoundsPercent(scale)

  return {
    imageDataUrl: isCustomImage
      ? customImageDataUrl
      : getMediaMarkPlaceholderImageUrl(mediaMark.value, mediaMark.theme),
    isPlaceholderImage: !isCustomImage,
    label,
    alt: isCustomImage ? label : `${label} generic media mark`,
    layout: mediaMark.layout,
    unscaledBounds: getBounds(1),
    scaledBounds: getBounds(mediaMark.layout.scale),
  }
}

export function createPlatformMarkRenderModels(
  platformMarks: ProjectPlatformMarks,
): PlatformMarkRenderModel[] {
  return platformMarks.values.flatMap((value) => {
    const asset = getProjectPlatformMarkAsset(platformMarks, value)

    if (!asset.layout.enabled) {
      return []
    }

    const label = getPlatformMarkLabel(value)
    const customImageDataUrl = asset.customImageDataUrl
    const isCustomImage = hasCustomImage(asset.source, customImageDataUrl)
    const getBounds = (scale: number) =>
      isCustomImage && asset.customImageSize
        ? getPlatformMarkBoundsPercent(asset.customImageSize, scale)
        : getPlatformMarkPlaceholderBoundsPercent(scale)

    return [{
      value,
      asset,
      imageDataUrl: isCustomImage
        ? customImageDataUrl
        : getPlatformMarkPlaceholderImageUrl(value, asset.theme),
      isPlaceholderImage: !isCustomImage,
      label,
      alt: isCustomImage ? label : `${label} generic operating system mark`,
      layout: asset.layout,
      unscaledBounds: getBounds(1),
      scaledBounds: getBounds(asset.layout.scale),
    }]
  })
}
