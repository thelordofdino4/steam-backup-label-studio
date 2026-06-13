import type { PointerEvent } from 'react'
import { createTitleArtworkRenderItem } from '../../project/projectTitleArtwork'
import type { ProjectTitleArtwork } from '../../project/projectTypes'
import {
  createPreviewEditableAttributes,
  createPreviewEditableElementId,
} from '../../editor/previewElementOverlay'
import { ContentBoundedImage } from './ContentBoundedImage'

export type TitleArtworkLayerProps = {
  projectTitleArtwork: ProjectTitleArtwork
  handleTitleArtworkPointerDown: (event: PointerEvent<Element>) => void
  handleTitleArtworkPointerMove: (event: PointerEvent<Element>) => void
  handleTitleArtworkPointerUp: (event: PointerEvent<Element>) => void
}

export function TitleArtworkLayer({
  projectTitleArtwork,
  handleTitleArtworkPointerDown,
  handleTitleArtworkPointerMove,
  handleTitleArtworkPointerUp,
}: TitleArtworkLayerProps) {
  const renderItem = createTitleArtworkRenderItem(projectTitleArtwork)

  if (!renderItem) {
    return null
  }

  return (
    <div className="disc-title-artwork-layer" aria-label="Game title artwork layer">
      <ContentBoundedImage
        className="disc-title-artwork"
        src={renderItem.imageDataUrl}
        alt="Game title artwork"
        imageSize={renderItem.imageSize}
        editableAttributes={createPreviewEditableAttributes({
          id: createPreviewEditableElementId('disc', 'title-artwork'),
          label: 'Game title artwork',
          kind: 'artwork',
        })}
        draggable={false}
        onPointerDown={handleTitleArtworkPointerDown}
        onPointerMove={handleTitleArtworkPointerMove}
        onPointerUp={handleTitleArtworkPointerUp}
        onPointerCancel={handleTitleArtworkPointerUp}
        style={{
          left: `${renderItem.layout.x}%`,
          top: `${renderItem.layout.y}%`,
          width: `${renderItem.unscaledBounds.halfWidth * 2}%`,
          height: `${renderItem.unscaledBounds.halfHeight * 2}%`,
          maxHeight: 'none',
          transform: `translate(-50%, -50%) scale(${renderItem.layout.scale})`,
        }}
      />
    </div>
  )
}
