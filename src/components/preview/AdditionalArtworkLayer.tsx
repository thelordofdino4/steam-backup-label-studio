import type { PointerEvent } from 'react'
import { createAdditionalArtworkRenderItems } from '../../project/projectAdditionalArtwork'
import type { ProjectAdditionalArtwork } from '../../project/projectTypes'

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
        <img
          className="disc-additional-artwork"
          key={renderItem.id}
          src={renderItem.imageDataUrl}
          alt={`${renderItem.sourceLabel} additional artwork`}
          draggable={false}
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
        />
      ))}
    </div>
  )
}
