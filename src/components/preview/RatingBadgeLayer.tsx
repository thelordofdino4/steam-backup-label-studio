import type { PointerEvent } from 'react'
import {
  getRatingBadgeBoundsPercent,
  getRatingBadgePlaceholderBoundsPercent,
} from '../../discGeometry'
import type { ProjectMetadata, ProjectRatingBadge } from '../../project/projectTypes'

export type RatingBadgeLayerProps = {
  projectMetadata: ProjectMetadata
  projectRatingBadge: ProjectRatingBadge
  handleRatingBadgePointerDown?: (event: PointerEvent<Element>) => void
  handleRatingBadgePointerMove?: (event: PointerEvent<Element>) => void
  handleRatingBadgePointerUp?: (event: PointerEvent<Element>) => void
}

function getPlaceholderLabel(metadata: ProjectMetadata) {
  if (metadata.ratingSystem === 'none') {
    return ''
  }

  return metadata.ratingValue.trim() || metadata.ratingSystem
}

function getPlaceholderClass(metadata: ProjectMetadata) {
  if (metadata.ratingSystem === 'PEGI') {
    return 'rating-badge-placeholder rating-badge-placeholder-pegi'
  }

  if (metadata.ratingSystem === 'ESRB') {
    return 'rating-badge-placeholder rating-badge-placeholder-esrb'
  }

  return 'rating-badge-placeholder rating-badge-placeholder-custom'
}

export function RatingBadgeLayer({
  projectMetadata,
  projectRatingBadge,
  handleRatingBadgePointerDown,
  handleRatingBadgePointerMove,
  handleRatingBadgePointerUp,
}: RatingBadgeLayerProps) {
  if (!projectRatingBadge.layout.enabled || projectMetadata.ratingSystem === 'none') {
    return null
  }

  const placeholderLabel = getPlaceholderLabel(projectMetadata)
  const shouldUseCustomImage =
    projectRatingBadge.source === 'custom' && projectRatingBadge.customImageDataUrl
  const unscaledBounds =
    shouldUseCustomImage && projectRatingBadge.customImageSize
      ? getRatingBadgeBoundsPercent(projectRatingBadge.customImageSize, 1)
      : getRatingBadgePlaceholderBoundsPercent(1)
  const unscaledLayerSize = {
    width: `${unscaledBounds.halfWidth * 2}%`,
    height: `${unscaledBounds.halfHeight * 2}%`,
  }
  const fillLayerSize = {
    width: '100%',
    height: '100%',
    maxHeight: 'none',
  }
  const unscaledPlaceholderSize = {
    ...fillLayerSize,
    minHeight: '100%',
    boxSizing: 'border-box' as const,
  }

  return (
    <div
      className="disc-rating-badge-layer"
      aria-label="Rating badge layer"
      style={{
        left: `${projectRatingBadge.layout.x}%`,
        top: `${projectRatingBadge.layout.y}%`,
        ...unscaledLayerSize,
        transform: `translate(-50%, -50%) scale(${projectRatingBadge.layout.scale})`,
      }}
      onPointerDown={handleRatingBadgePointerDown}
      onPointerMove={handleRatingBadgePointerMove}
      onPointerUp={handleRatingBadgePointerUp}
      onPointerCancel={handleRatingBadgePointerUp}
    >
      {shouldUseCustomImage ? (
        <img
          className="disc-rating-badge-image"
          src={projectRatingBadge.customImageDataUrl ?? undefined}
          alt="Rating badge"
          draggable={false}
          style={fillLayerSize}
        />
      ) : (
        <div className={getPlaceholderClass(projectMetadata)} style={unscaledPlaceholderSize}>
          <span className="rating-badge-system">{projectMetadata.ratingSystem}</span>
          <strong>{placeholderLabel}</strong>
          <span className="rating-badge-placeholder-note">Placeholder</span>
        </div>
      )}
    </div>
  )
}
