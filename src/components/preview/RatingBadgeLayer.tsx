import type { PointerEvent } from 'react'
import {
  getRatingBadgeBoundsPercent,
  getRatingBadgePlaceholderBoundsPercent,
} from '../../discGeometry'
import {
  getRatingBadgePlaceholderRenderModel,
} from '../../discPlaceholderAssets'
import {
  shouldRenderRatingBadge,
  shouldUseCustomRatingBadgeImage,
} from '../../project/projectRatingBadge'
import type { ProjectMetadata, ProjectRatingBadge } from '../../project/projectTypes'

export type RatingBadgeLayerProps = {
  projectMetadata: ProjectMetadata
  projectRatingBadge: ProjectRatingBadge
  handleRatingBadgePointerDown?: (event: PointerEvent<Element>) => void
  handleRatingBadgePointerMove?: (event: PointerEvent<Element>) => void
  handleRatingBadgePointerUp?: (event: PointerEvent<Element>) => void
}

export function RatingBadgeLayer({
  projectMetadata,
  projectRatingBadge,
  handleRatingBadgePointerDown,
  handleRatingBadgePointerMove,
  handleRatingBadgePointerUp,
}: RatingBadgeLayerProps) {
  if (!shouldRenderRatingBadge(projectMetadata, projectRatingBadge)) {
    return null
  }

  const shouldUseCustomImage = shouldUseCustomRatingBadgeImage(projectRatingBadge)
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
  const placeholderRenderModel = getRatingBadgePlaceholderRenderModel(projectMetadata)

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
        <>
          <img
            className="disc-rating-badge-image disc-placeholder-svg-image"
            src={placeholderRenderModel.imageUrl}
            alt={placeholderRenderModel.altLabel}
            draggable={false}
            style={fillLayerSize}
          />
          {placeholderRenderModel.overlayLabel ? (
            <svg
              className="disc-rating-badge-text-overlay"
              viewBox="0 0 90 130"
              aria-hidden="true"
              focusable="false"
            >
              <text
                x="45"
                y="66"
                fill={placeholderRenderModel.textColor}
                textAnchor="middle"
                dominantBaseline="middle"
                fontFamily="Arial, sans-serif"
                fontSize="36"
                fontWeight="900"
              >
                {placeholderRenderModel.overlayLabel}
              </text>
            </svg>
          ) : null}
        </>
      )}
    </div>
  )
}
