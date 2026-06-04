import {
  getMediaMarkBoundsPercent,
  getMediaMarkPlaceholderBoundsPercent,
  type RenderBoundsPercent,
} from '../disc/geometry.ts'
import { getMediaMarkPlaceholderImageUrl } from '../assets/assetManifest.ts'
import { getMediaMarkLabel } from '../project/projectMediaMark.ts'
import type {
  MediaMarkLayout,
  ProjectMediaMark,
} from '../project/projectTypes.ts'
import { hasCustomMarkImage } from './markImageSource.ts'

export type MediaMarkRenderModel = {
  imageDataUrl: string
  isPlaceholderImage: boolean
  label: string
  alt: string
  layout: MediaMarkLayout
  unscaledBounds: RenderBoundsPercent
  scaledBounds: RenderBoundsPercent
}

export function createMediaMarkRenderModel(
  mediaMark: ProjectMediaMark,
): MediaMarkRenderModel | null {
  if (!mediaMark.layout.enabled) {
    return null
  }

  const label = getMediaMarkLabel(mediaMark.value)
  const customImageDataUrl = mediaMark.customImageDataUrl
  const isCustomImage = hasCustomMarkImage(
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
