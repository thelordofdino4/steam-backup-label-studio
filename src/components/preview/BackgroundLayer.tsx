import type { PointerEvent } from 'react'
import { hasActiveImageContent } from '../../image/imageContentBounds'
import type { BackgroundImageSize, BackgroundOffset } from '../../project/projectTypes'
import {
  createPreviewEditableAttributes,
  createPreviewEditableElementId,
} from '../../editor/previewElementOverlay'
import { ContentBoundedImage } from './ContentBoundedImage'

export type BackgroundPreviewSize = {
  width: string
  height: string
}

export type BackgroundLayerProps = {
  backgroundImageUrl: string | null
  backgroundImageSize: BackgroundImageSize | null
  backgroundPreviewSize: BackgroundPreviewSize
  backgroundOffset: BackgroundOffset
  backgroundScale: number
  handleBackgroundPointerDown: (event: PointerEvent<HTMLDivElement>) => void
  handleBackgroundPointerMove: (event: PointerEvent<HTMLDivElement>) => void
  handleBackgroundPointerUp: (event: PointerEvent<HTMLDivElement>) => void
}

export function BackgroundLayer({
  backgroundImageUrl,
  backgroundImageSize,
  backgroundPreviewSize,
  backgroundOffset,
  backgroundScale,
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
              width: backgroundPreviewSize.width,
              height: backgroundPreviewSize.height,
              transform: `translate(-50%, -50%) translate(${backgroundOffset.x}px, ${backgroundOffset.y}px) scale(${backgroundScale})`,
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
