import type { PointerEvent } from 'react'
import { hasActiveImageContent } from '../../image/imageContentBounds'
import type { BackgroundImageSize } from '../../project/projectTypes'
import type { BackgroundImageLayout } from '../../image/backgroundImage'
import {
  createPreviewEditableAttributes,
  createPreviewEditableElementId,
} from '../../editor/previewElementOverlay'
import { ContentBoundedImage } from './ContentBoundedImage'

export type BackgroundLayerProps = {
  backgroundImageUrl: string | null
  backgroundImageSize: BackgroundImageSize | null
  layout: BackgroundImageLayout
  handleBackgroundPointerDown: (event: PointerEvent<HTMLDivElement>) => void
  handleBackgroundPointerMove: (event: PointerEvent<HTMLDivElement>) => void
  handleBackgroundPointerUp: (event: PointerEvent<HTMLDivElement>) => void
}

export function BackgroundLayer({
  backgroundImageUrl,
  backgroundImageSize,
  layout,
  handleBackgroundPointerDown,
  handleBackgroundPointerMove,
  handleBackgroundPointerUp,
}: BackgroundLayerProps) {
  return (
    <>
      {backgroundImageUrl && hasActiveImageContent(backgroundImageSize) ? (
        <div
          className="background-image-layer"
          role="img"
          aria-label="Uploaded background image layer"
          style={{
            left: layout.interactionRect.x,
            top: layout.interactionRect.y,
            width: layout.interactionRect.width,
            height: layout.interactionRect.height,
          }}
          {...createPreviewEditableAttributes({
            id: createPreviewEditableElementId('disc', 'background'),
            label: 'Background artwork',
            kind: 'background',
          })}
          onPointerDown={handleBackgroundPointerDown}
          onPointerMove={handleBackgroundPointerMove}
          onPointerUp={handleBackgroundPointerUp}
          onPointerCancel={handleBackgroundPointerUp}
        >
          <ContentBoundedImage
            src={backgroundImageUrl}
            alt=""
            imageSize={backgroundImageSize}
            draggable={false}
            style={{
              left: layout.contentRect.x,
              top: layout.contentRect.y,
              width: layout.contentRect.width,
              height: layout.contentRect.height,
            }}
          />
        </div>
      ) : (
        <div className="empty-background-message">
          Upload a background image
        </div>
      )}
    </>
  )
}
