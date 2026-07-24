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
  type RatingBadgeElementKey,
} from '../../project/projectRatingBadge'
import type { ProjectMetadata, ProjectRatingBadge, RatingBadgeLayout } from '../../project/projectTypes'
import {
  createPrimaryRatingBadgeRenderModel,
} from '../../render/ratingBadgeRenderModel.ts'
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
  visual: {
    imageDataUrl: string
    imageSize?: ProjectRatingBadge['customImageSize']
    isCustomImage: boolean
    isPlaceholderImage: boolean
    layout: RatingBadgeLayout
    overlayLabel: string | null
    textColor: string
    alt: string
    unscaledBounds: {
      halfWidth: number
      halfHeight: number
    }
  }
  badgeKey: RatingBadgeElementKey
  handleRatingBadgePointerDown?: RatingBadgeLayerProps['handleRatingBadgePointerDown']
  handleRatingBadgePointerMove?: RatingBadgeLayerProps['handleRatingBadgePointerMove']
  handleRatingBadgePointerUp?: RatingBadgeLayerProps['handleRatingBadgePointerUp']
}

function RatingBadgeLayerItem({
  ariaLabel,
  visual,
  badgeKey,
  handleRatingBadgePointerDown,
  handleRatingBadgePointerMove,
  handleRatingBadgePointerUp,
}: RatingBadgeLayerItemProps) {
  const unscaledLayerSize = {
    width: `${visual.unscaledBounds.halfWidth * 2}%`,
    height: `${visual.unscaledBounds.halfHeight * 2}%`,
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
        visual.imageSize?.contentShape
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
        left: `${visual.layout.x}%`,
        top: `${visual.layout.y}%`,
        ...unscaledLayerSize,
        transform: `translate(-50%, -50%) scale(${visual.layout.scale})`,
      }}
      onPointerDown={(event) => handleRatingBadgePointerDown?.(event, badgeKey)}
      onPointerMove={handleRatingBadgePointerMove}
      onPointerUp={handleRatingBadgePointerUp}
      onPointerCancel={handleRatingBadgePointerUp}
    >
      <ContentBoundedImage
        className={[
          'disc-rating-badge-image',
          badgeKey === 'primary'
            ? 'disc-canonical-visual-bounds-image'
            : '',
          visual.isPlaceholderImage ? 'disc-placeholder-svg-image' : '',
        ].filter(Boolean).join(' ')}
        src={visual.imageDataUrl}
        alt={visual.alt}
        imageSize={visual.imageSize}
        draggable={false}
        style={fillLayerSize}
      />
      {visual.overlayLabel ? (
        <svg
          className="disc-rating-badge-text-overlay"
          viewBox="0 0 90 130"
          aria-hidden="true"
          focusable="false"
        >
          <text
            x="45"
            y="66"
            fill={visual.textColor}
            textAnchor="middle"
            dominantBaseline="middle"
            fontFamily="Arial, sans-serif"
            fontSize="36"
            fontWeight="900"
          >
            {visual.overlayLabel}
          </text>
        </svg>
      ) : null}
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

  const primaryVisual = createPrimaryRatingBadgeRenderModel(
    projectMetadata,
    projectRatingBadge,
  )
  const uskPlaceholder = getRatingBadgePlaceholderRenderModel({
    ratingSystem: 'USK',
    ratingValue: projectRatingBadge.uskBadge.ratingValue,
  })
  const uskVisual = {
    imageDataUrl: uskPlaceholder.imageUrl,
    imageSize: uskPlaceholder.imageSize,
    isCustomImage: false,
    isPlaceholderImage: true,
    layout: projectRatingBadge.uskBadge.layout,
    overlayLabel: uskPlaceholder.overlayLabel,
    textColor: uskPlaceholder.textColor,
    alt: uskPlaceholder.altLabel,
    unscaledBounds: getRatingBadgeBoundsPercent(
      uskPlaceholder.imageSize,
      1,
    ),
  }

  return (
    <>
      {shouldRenderPrimaryBadge && primaryVisual ? (
        <RatingBadgeLayerItem
          ariaLabel="Rating badge layer"
          visual={primaryVisual}
          badgeKey="primary"
          handleRatingBadgePointerDown={handleRatingBadgePointerDown}
          handleRatingBadgePointerMove={handleRatingBadgePointerMove}
          handleRatingBadgePointerUp={handleRatingBadgePointerUp}
        />
      ) : null}
      {shouldRenderUskBadge ? (
        <RatingBadgeLayerItem
          ariaLabel="Additional USK rating badge layer"
          visual={uskVisual}
          badgeKey="usk"
          handleRatingBadgePointerDown={handleRatingBadgePointerDown}
          handleRatingBadgePointerMove={handleRatingBadgePointerMove}
          handleRatingBadgePointerUp={handleRatingBadgePointerUp}
        />
      ) : null}
    </>
  )
}
