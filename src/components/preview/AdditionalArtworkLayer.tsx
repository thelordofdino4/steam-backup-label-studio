import type { PointerEvent } from 'react'
import {
  createAdditionalArtworkRenderItems,
} from '../../project/projectAdditionalArtwork'
import type { ProjectAdditionalArtwork } from '../../project/projectTypes'
import { ArtworkFrameOverlay } from './ArtworkFrameOverlay'
import { ContentBoundedImage } from './ContentBoundedImage'

export type AdditionalArtworkLayerProps = {
  projectAdditionalArtwork: ProjectAdditionalArtwork
  handleAdditionalArtworkPointerDown: (
    event: PointerEvent<Element>,
    elementId: string,
  ) => void
  handleAdditionalArtworkPointerMove: (event: PointerEvent<Element>) => void
  handleAdditionalArtworkPointerUp: (event: PointerEvent<Element>) => void
}

export function AdditionalArtworkLayer({
  projectAdditionalArtwork,
  handleAdditionalArtworkPointerDown,
  handleAdditionalArtworkPointerMove,
  handleAdditionalArtworkPointerUp,
}: AdditionalArtworkLayerProps) {
  const renderItems = createAdditionalArtworkRenderItems(projectAdditionalArtwork)

  if (renderItems.length === 0) {
    return null
  }

  return (
    <div className="disc-additional-artwork-layer" aria-label="Additional artwork layer">
      {renderItems.map((renderItem) => (
        <div
          className={[
            'disc-additional-artwork',
            renderItem.frame.enabled &&
              renderItem.frame.shape === 'circle' &&
              !renderItem.contentShape
              ? 'disc-additional-artwork--circle'
              : '',
            renderItem.contentBounds ? 'disc-additional-artwork--content-bounded' : '',
            renderItem.contentShape ? 'disc-additional-artwork--content-shaped' : '',
          ].filter(Boolean).join(' ')}
          key={renderItem.id}
          onPointerDown={(event) =>
            handleAdditionalArtworkPointerDown(event, renderItem.id)}
          onPointerMove={handleAdditionalArtworkPointerMove}
          onPointerUp={handleAdditionalArtworkPointerUp}
          onPointerCancel={handleAdditionalArtworkPointerUp}
          style={{
            left: `${renderItem.layout.x}%`,
            top: `${renderItem.layout.y}%`,
            width: `${renderItem.unscaledBounds.halfWidth * 2}%`,
            height: `${renderItem.unscaledBounds.halfHeight * 2}%`,
            maxHeight: 'none',
            transform: `translate(-50%, -50%) scale(${renderItem.layout.scale})`,
          }}
        >
          <ContentBoundedImage
            className="disc-additional-artwork-image"
            src={renderItem.imageDataUrl}
            alt={`${renderItem.sourceLabel} additional artwork`}
            imageSize={renderItem.imageSize}
            draggable={false}
          />
          <ArtworkFrameOverlay
            className="disc-additional-artwork-frame"
            frame={renderItem.frame}
            imageSize={renderItem.imageSize}
            patternId={`disc-additional-artwork-frame-${renderItem.id}`}
          />
        </div>
      ))}
    </div>
  )
}
