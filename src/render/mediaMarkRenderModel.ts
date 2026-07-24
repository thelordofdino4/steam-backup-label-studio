import {
  getMediaMarkBoundsPercent,
  getMediaMarkPlaceholderBoundsPercent,
} from '../disc/geometry.ts'
import {
  getMediaMarkPlaceholderImageSize,
  getMediaMarkPlaceholderImageUrl,
} from '../assets/assetManifest.ts'
import {
  isOptionalLayoutFeatureEnabled,
} from '../editor/optionalVisualFeature.ts'
import {
  resolveMarkImageSource,
} from '../editor/markImageSource.ts'
import { getImageContentSize } from '../image/imageContentBounds.ts'
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

function resolveMediaMarkVisual(mediaMark: ProjectMediaMark) {
  const label = getMediaMarkLabel(mediaMark.value)
  const resolvedImage = resolveMarkImageSource({
    source: mediaMark.source,
    customImageDataUrl: mediaMark.customImageDataUrl,
    customImageSize: mediaMark.customImageSize,
    builtInImageDataUrl: getMediaMarkPlaceholderImageUrl(
      mediaMark.value,
      mediaMark.theme,
    ),
    builtInImageSize: getMediaMarkPlaceholderImageSize(
      mediaMark.value,
      mediaMark.theme,
    ),
  })
  const getBounds = (scale: number) =>
    resolvedImage.imageSize
      ? getMediaMarkBoundsPercent(resolvedImage.imageSize, scale)
      : getMediaMarkPlaceholderBoundsPercent(scale)

  return {
    label,
    resolvedImage,
    unscaledBounds: getBounds(1),
    scaledBounds: getBounds(mediaMark.layout.scale),
  }
}

export function getMediaMarkCanonicalVisualBounds(
  mediaMark: ProjectMediaMark,
) {
  const visual = resolveMediaMarkVisual(mediaMark)

  if (!getImageContentSize(visual.resolvedImage.imageSize)) {
    return null
  }

  return visual.unscaledBounds.halfWidth > 0 &&
    visual.unscaledBounds.halfHeight > 0
    ? visual.unscaledBounds
    : null
}

export function createMediaMarkRenderModel(
  mediaMark: ProjectMediaMark,
): MediaMarkRenderModel | null {
  if (!isOptionalLayoutFeatureEnabled(mediaMark)) {
    return null
  }

  const {
    label,
    resolvedImage,
    unscaledBounds,
    scaledBounds,
  } = resolveMediaMarkVisual(mediaMark)

  return createPercentPositionedImageRenderArtifact({
    imageDataUrl: resolvedImage.imageDataUrl,
    imageSize: resolvedImage.imageSize,
    isPlaceholderImage: resolvedImage.isBuiltInFallback,
    label,
    alt: resolvedImage.isCustomImage ? label : `${label} generic media mark`,
    layout: mediaMark.layout,
    unscaledBounds,
    scaledBounds,
  })
}
