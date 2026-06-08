import {
  getMediaMarkBoundsPercent,
  getMediaMarkPlaceholderBoundsPercent,
} from '../disc/geometry.ts'
import { getMediaMarkPlaceholderImageUrl } from '../assets/assetManifest.ts'
import {
  isOptionalLayoutFeatureEnabled,
} from '../editor/optionalVisualFeature.ts'
import {
  resolveMarkImageSource,
} from '../editor/markImageSource.ts'
import { getMediaMarkLabel } from '../project/projectMediaMark.ts'
import type {
  MediaMarkLayout,
  ProjectMediaMark,
} from '../project/projectTypes.ts'
import {
  createPercentPositionedImageRenderArtifact,
  type PercentPositionedImageRenderArtifact,
} from './imageRenderArtifact.ts'

export type MediaMarkRenderModel =
  PercentPositionedImageRenderArtifact<MediaMarkLayout>

export function createMediaMarkRenderModel(
  mediaMark: ProjectMediaMark,
): MediaMarkRenderModel | null {
  if (!isOptionalLayoutFeatureEnabled(mediaMark)) {
    return null
  }

  const label = getMediaMarkLabel(mediaMark.value)
  const resolvedImage = resolveMarkImageSource({
    source: mediaMark.source,
    customImageDataUrl: mediaMark.customImageDataUrl,
    customImageSize: mediaMark.customImageSize,
    builtInImageDataUrl: getMediaMarkPlaceholderImageUrl(
      mediaMark.value,
      mediaMark.theme,
    ),
  })
  const getBounds = (scale: number) =>
    resolvedImage.isCustomImage && resolvedImage.imageSize
      ? getMediaMarkBoundsPercent(resolvedImage.imageSize, scale)
      : getMediaMarkPlaceholderBoundsPercent(scale)

  return createPercentPositionedImageRenderArtifact({
    imageDataUrl: resolvedImage.imageDataUrl,
    isPlaceholderImage: resolvedImage.isBuiltInFallback,
    label,
    alt: resolvedImage.isCustomImage ? label : `${label} generic media mark`,
    layout: mediaMark.layout,
    unscaledBounds: getBounds(1),
    scaledBounds: getBounds(mediaMark.layout.scale),
  })
}
