import {
  getMediaMarkPlaceholderImageSize,
  getPlatformMarkPlaceholderImageSize,
  getRatingBadgePlaceholderImageSize,
  getTechnicalMarkPlaceholderImageSize,
} from '../assets/assetManifest.ts'
import {
  getImageContentShapeFootprintPercent,
  type RenderBoundsPercent,
} from '../disc/geometry.ts'
import type {
  BackgroundImageSize,
  PlatformMarkTheme,
  PlatformMarkValue,
  ProjectMediaMark,
  ProjectMetadata,
  ProjectPlatformMarkAsset,
  ProjectRatingBadge,
  ProjectTechnicalMarkAsset,
  TechnicalMarkValue,
} from '../project/projectTypes.ts'

export type MediaMarkSafeZoneInput = Pick<
  ProjectMediaMark,
  'source' | 'customImageSize' | 'layout'
> & Partial<Pick<ProjectMediaMark, 'value' | 'theme'>>

export type PlatformMarkSafeZoneInput = Pick<
  ProjectPlatformMarkAsset,
  'source' | 'customImageSize' | 'layout'
> & {
  value?: PlatformMarkValue
  theme?: PlatformMarkTheme
}

export type TechnicalMarkSafeZoneInput = Pick<
  ProjectTechnicalMarkAsset,
  'source' | 'customImageSize' | 'layout'
> & {
  value?: TechnicalMarkValue
}

export type RatingBadgeSafeZoneInput = Pick<
  ProjectRatingBadge,
  'source' | 'customImageSize' | 'layout'
> & {
  metadata?: Pick<ProjectMetadata, 'ratingSystem' | 'ratingValue'> | null
}

export function getSafeImageShapeFootprint(
  imageSize: BackgroundImageSize | null,
  bounds: RenderBoundsPercent,
) {
  return getImageContentShapeFootprintPercent(imageSize, bounds)
}

export function getMediaMarkSafeImageSize(
  mediaMark: Pick<
    MediaMarkSafeZoneInput,
    'source' | 'customImageSize' | 'value' | 'theme'
  >,
) {
  if (mediaMark.source === 'custom' && mediaMark.customImageSize) {
    return mediaMark.customImageSize
  }

  return mediaMark.value
    ? getMediaMarkPlaceholderImageSize(mediaMark.value, mediaMark.theme)
    : null
}

export function getPlatformMarkSafeImageSize(
  platformMark: Pick<
    PlatformMarkSafeZoneInput,
    'source' | 'customImageSize' | 'value' | 'theme'
  >,
) {
  if (platformMark.source === 'custom' && platformMark.customImageSize) {
    return platformMark.customImageSize
  }

  return platformMark.value
    ? getPlatformMarkPlaceholderImageSize(
        platformMark.value,
        platformMark.theme,
      )
    : null
}

export function getTechnicalMarkSafeImageSize(
  technicalMark: Pick<
    TechnicalMarkSafeZoneInput,
    'source' | 'customImageSize' | 'value'
  >,
) {
  if (technicalMark.source === 'custom' && technicalMark.customImageSize) {
    return technicalMark.customImageSize
  }

  return technicalMark.value
    ? getTechnicalMarkPlaceholderImageSize(technicalMark.value)
    : null
}

export function getRatingBadgeSafeImageSize(
  ratingBadge: Pick<
    RatingBadgeSafeZoneInput,
    'source' | 'customImageSize' | 'metadata'
  >,
) {
  if (ratingBadge.source === 'custom' && ratingBadge.customImageSize) {
    return ratingBadge.customImageSize
  }

  return ratingBadge.metadata
    ? getRatingBadgePlaceholderImageSize(ratingBadge.metadata)
    : null
}
