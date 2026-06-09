import {
  getPlatformMarkBoundsPercent,
  getPlatformMarkPlaceholderBoundsPercent,
} from '../disc/geometry.ts'
import {
  getPlatformMarkPlaceholderImageSize,
  getPlatformMarkPlaceholderImageUrl,
} from '../assets/assetManifest.ts'
import {
  isOptionalVisualFeatureEnabled,
} from '../editor/optionalVisualFeature.ts'
import {
  resolveMarkImageSource,
} from '../editor/markImageSource.ts'
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
import {
  createPercentPositionedImageRenderArtifact,
  type PercentPositionedImageRenderArtifact,
} from './imageRenderArtifact.ts'

export type PlatformMarkRenderModel = PercentPositionedImageRenderArtifact<
  PlatformMarkLayout,
  {
  value: PlatformMarkValue
  asset: ProjectPlatformMarkAsset
  }
>

export function createPlatformMarkRenderModels(
  platformMarks: ProjectPlatformMarks,
): PlatformMarkRenderModel[] {
  return platformMarks.values.flatMap((value) => {
    const asset = getProjectPlatformMarkAsset(platformMarks, value)

    if (!isOptionalVisualFeatureEnabled(asset.layout)) {
      return []
    }

    const label = getPlatformMarkLabel(value)
    const resolvedImage = resolveMarkImageSource({
      source: asset.source,
      customImageDataUrl: asset.customImageDataUrl,
      customImageSize: asset.customImageSize,
      builtInImageDataUrl: getPlatformMarkPlaceholderImageUrl(
        value,
        asset.theme,
      ),
      builtInImageSize: getPlatformMarkPlaceholderImageSize(
        value,
        asset.theme,
      ),
    })
    const getBounds = (scale: number) =>
      resolvedImage.imageSize
        ? getPlatformMarkBoundsPercent(resolvedImage.imageSize, scale)
        : getPlatformMarkPlaceholderBoundsPercent(scale)

    const model = createPercentPositionedImageRenderArtifact({
      value,
      asset,
      imageDataUrl: resolvedImage.imageDataUrl,
      imageSize: resolvedImage.imageSize,
      isPlaceholderImage: resolvedImage.isBuiltInFallback,
      label,
      alt: resolvedImage.isCustomImage
        ? label
        : `${label} generic operating system mark`,
      layout: asset.layout,
      unscaledBounds: getBounds(1),
      scaledBounds: getBounds(asset.layout.scale),
    })

    return model ? [model] : []
  })
}
