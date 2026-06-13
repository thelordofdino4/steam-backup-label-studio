import type { PointerEvent } from 'react'
import {
  getRatingBadgeBoundsPercent,
} from '../../disc/geometry'
import {
  getRatingBadgePlaceholderRenderModel,
} from '../../assets/assetManifest'
import {
  shouldRenderSupplementalUskRatingBadge,
  shouldRenderRatingBadge,
  shouldUseCustomRatingBadgeImage,
  type RatingBadgeElementKey,
} from '../../project/projectRatingBadge'
import type { ProjectMetadata, ProjectRatingBadge, RatingBadgeLayout } from '../../project/projectTypes'
import {
  createPreviewEditableAttributes,
  createPreviewEditableElementId,
} from '../../editor/previewElementOverlay'
import { ContentBoundedImage } from './ContentBoundedImage'

export type RatingBadgeLayerProps = {
  projectMetadata: ProjectMetadata
  projectRatingBadge: ProjectRatingBadge
  handleRatingBadgePointerDown?: (
    event: PointerEvent<Element>,
    badgeKey?: RatingBadgeElementKey,
  ) => void
  handleRatingBadgePointerMove?: (event: PointerEvent<Element>) => void
  handleRatingBadgePointerUp?: (event: PointerEvent<Element>) => void
}

type RatingBadgeLayerItemProps = {
  ariaLabel: string
  metadata: Pick<ProjectMetadata, 'ratingSystem' | 'ratingValue'>
  layout: RatingBadgeLayout
  shouldUseCustomImage: boolean
  customImageDataUrl?: string | null
  customImageSize?: ProjectRatingBadge['customImageSize']
  badgeKey: RatingBadgeElementKey
  handleRatingBadgePointerDown?: RatingBadgeLayerProps['handleRatingBadgePointerDown']
  handleRatingBadgePointerMove?: RatingBadgeLayerProps['handleRatingBadgePointerMove']
  handleRatingBadgePointerUp?: RatingBadgeLayerProps['handleRatingBadgePointerUp']
}

function RatingBadgeLayerItem({
  ariaLabel,
  metadata,
  layout,
  shouldUseCustomImage,
  customImageDataUrl,
  customImageSize,
  badgeKey,
  handleRatingBadgePointerDown,
  handleRatingBadgePointerMove,
  handleRatingBadgePointerUp,
}: RatingBadgeLayerItemProps) {
  const placeholderRenderModel = getRatingBadgePlaceholderRenderModel(metadata)
  const unscaledBounds =
    shouldUseCustomImage && customImageSize
      ? getRatingBadgeBoundsPercent(customImageSize, 1)
      : getRatingBadgeBoundsPercent(placeholderRenderModel.imageSize, 1)
  const unscaledLayerSize = {
    width: `${unscaledBounds.halfWidth * 2}%`,
    height: `${unscaledBounds.halfHeight * 2}%`,
  }
  const fillLayerSize = {
    width: '100%',
    height: '100%',
    maxHeight: 'none',
  }
  return (
    <div
      className={[
        'disc-rating-badge-layer',
        shouldUseCustomImage && customImageSize?.contentShape
          ? 'disc-rating-badge-layer--content-shaped'
          : '',
        !shouldUseCustomImage && placeholderRenderModel.imageSize.contentShape
          ? 'disc-rating-badge-layer--content-shaped'
          : '',
      ].filter(Boolean).join(' ')}
      aria-label={ariaLabel}
      {...createPreviewEditableAttributes({
        id: createPreviewEditableElementId('disc', 'rating-badge', badgeKey),
        label: ariaLabel,
        kind: 'mark',
      })}
      style={{
        left: `${layout.x}%`,
        top: `${layout.y}%`,
        ...unscaledLayerSize,
        transform: `translate(-50%, -50%) scale(${layout.scale})`,
      }}
      onPointerDown={(event) => handleRatingBadgePointerDown?.(event, badgeKey)}
      onPointerMove={handleRatingBadgePointerMove}
      onPointerUp={handleRatingBadgePointerUp}
      onPointerCancel={handleRatingBadgePointerUp}
    >
      {shouldUseCustomImage ? (
        <ContentBoundedImage
          className="disc-rating-badge-image"
          src={customImageDataUrl ?? ''}
          alt="Rating badge"
          imageSize={customImageSize}
          draggable={false}
          style={fillLayerSize}
        />
      ) : (
        <>
          <ContentBoundedImage
            className="disc-rating-badge-image disc-placeholder-svg-image"
            src={placeholderRenderModel.imageUrl}
            alt={placeholderRenderModel.altLabel}
            imageSize={placeholderRenderModel.imageSize}
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

export function RatingBadgeLayer({
  projectMetadata,
  projectRatingBadge,
  handleRatingBadgePointerDown,
  handleRatingBadgePointerMove,
  handleRatingBadgePointerUp,
}: RatingBadgeLayerProps) {
  const shouldRenderPrimaryBadge = shouldRenderRatingBadge(
    projectMetadata,
    projectRatingBadge,
  )
  const shouldRenderUskBadge = shouldRenderSupplementalUskRatingBadge(
    projectMetadata,
    projectRatingBadge,
  )

  if (!shouldRenderPrimaryBadge && !shouldRenderUskBadge) {
    return null
  }

  const shouldUseCustomImage = shouldUseCustomRatingBadgeImage(projectRatingBadge)

  return (
    <>
      {shouldRenderPrimaryBadge ? (
        <RatingBadgeLayerItem
          ariaLabel="Rating badge layer"
          metadata={projectMetadata}
          layout={projectRatingBadge.layout}
          shouldUseCustomImage={shouldUseCustomImage}
          customImageDataUrl={projectRatingBadge.customImageDataUrl}
          customImageSize={projectRatingBadge.customImageSize}
          badgeKey="primary"
          handleRatingBadgePointerDown={handleRatingBadgePointerDown}
          handleRatingBadgePointerMove={handleRatingBadgePointerMove}
          handleRatingBadgePointerUp={handleRatingBadgePointerUp}
        />
      ) : null}
      {shouldRenderUskBadge ? (
        <RatingBadgeLayerItem
          ariaLabel="Additional USK rating badge layer"
          metadata={{
            ratingSystem: 'USK',
            ratingValue: projectRatingBadge.uskBadge.ratingValue,
          }}
          layout={projectRatingBadge.uskBadge.layout}
          shouldUseCustomImage={false}
          badgeKey="usk"
          handleRatingBadgePointerDown={handleRatingBadgePointerDown}
          handleRatingBadgePointerMove={handleRatingBadgePointerMove}
          handleRatingBadgePointerUp={handleRatingBadgePointerUp}
        />
      ) : null}
    </>
  )
}
