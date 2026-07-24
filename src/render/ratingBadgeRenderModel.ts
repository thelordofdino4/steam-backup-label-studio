import { getRatingBadgePlaceholderRenderModel } from '../assets/assetManifest.ts'
import { getRatingBadgeBoundsPercent } from '../disc/geometry.ts'
import { getImageContentSize } from '../image/imageContentBounds.ts'
import {
  shouldUseCustomRatingBadgeImage,
} from '../project/projectRatingBadge.ts'
import type {
  ProjectMetadata,
  ProjectRatingBadge,
  RatingBadgeLayout,
} from '../project/projectTypes.ts'
import {
  createPercentPositionedImageRenderArtifact,
  type PercentPositionedImageRenderArtifact,
} from './imageRenderArtifact.ts'

type PrimaryRatingBadgeRenderDetails = {
  isCustomImage: boolean
  overlayLabel: string | null
  textColor: string
}

export type PrimaryRatingBadgeRenderModel =
  PercentPositionedImageRenderArtifact<
    RatingBadgeLayout,
    PrimaryRatingBadgeRenderDetails
  >

export function createPrimaryRatingBadgeRenderModel(
  metadata: Pick<ProjectMetadata, 'ratingSystem' | 'ratingValue'>,
  ratingBadge: ProjectRatingBadge,
): PrimaryRatingBadgeRenderModel | null {
  if (metadata.ratingSystem === 'none') {
    return null
  }

  const placeholder = getRatingBadgePlaceholderRenderModel(metadata)
  const isCustomImage = shouldUseCustomRatingBadgeImage(ratingBadge)
  const imageDataUrl = isCustomImage
    ? ratingBadge.customImageDataUrl
    : placeholder.imageUrl
  const imageSize = isCustomImage
    ? ratingBadge.customImageSize
    : placeholder.imageSize
  const boundsImageSize = imageSize ?? placeholder.imageSize

  return createPercentPositionedImageRenderArtifact({
    imageDataUrl,
    imageSize,
    isPlaceholderImage: !isCustomImage,
    label: 'Rating badge',
    alt: isCustomImage ? 'Rating badge' : placeholder.altLabel,
    layout: ratingBadge.layout,
    unscaledBounds: getRatingBadgeBoundsPercent(boundsImageSize, 1),
    scaledBounds: getRatingBadgeBoundsPercent(
      boundsImageSize,
      ratingBadge.layout.scale,
    ),
    isCustomImage,
    overlayLabel: isCustomImage ? null : placeholder.overlayLabel,
    textColor: placeholder.textColor,
  })
}

export function getPrimaryRatingBadgeCanonicalVisualBounds(
  metadata: Pick<ProjectMetadata, 'ratingSystem' | 'ratingValue'>,
  ratingBadge: ProjectRatingBadge,
) {
  const model = createPrimaryRatingBadgeRenderModel(metadata, ratingBadge)

  if (!model || !getImageContentSize(model.imageSize)) {
    return null
  }

  return model.unscaledBounds.halfWidth > 0 &&
    model.unscaledBounds.halfHeight > 0
    ? model.unscaledBounds
    : null
}
