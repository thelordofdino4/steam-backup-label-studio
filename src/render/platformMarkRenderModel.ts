import {
  getPlatformMarkBoundsPercent,
  getPlatformMarkPlaceholderBoundsPercent,
  type RenderBoundsPercent,
} from '../disc/geometry.ts'
import { getPlatformMarkPlaceholderImageUrl } from '../assets/assetManifest.ts'
import {
  getPlatformMarkLabel,
  getProjectPlatformMarkAsset,
} from '../project/projectPlatformMarks.ts'
import type {
  PlatformMarkLayout,
  PlatformMarkValue,
  ProjectPlatformMarkAsset,
  ProjectPlatformMarks,
} from '../project/projectTypes.ts'
import { hasCustomMarkImage } from './markImageSource.ts'

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
    const isCustomImage = hasCustomMarkImage(asset.source, customImageDataUrl)
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
