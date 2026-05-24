import type { PointerEvent } from 'react'
import type { BackgroundOffset } from '../../project/projectTypes'

export type BackgroundPreviewSize = {
  width: string
  height: string
}

export type BackgroundLayerProps = {
  backgroundImageUrl: string | null
  backgroundPreviewSize: BackgroundPreviewSize
  backgroundOffset: BackgroundOffset
  backgroundScale: number
  handleBackgroundPointerDown: (event: PointerEvent<HTMLDivElement>) => void
  handleBackgroundPointerMove: (event: PointerEvent<HTMLDivElement>) => void
  handleBackgroundPointerUp: (event: PointerEvent<HTMLDivElement>) => void
}

export function BackgroundLayer({
  backgroundImageUrl,
  backgroundPreviewSize,
  backgroundOffset,
  backgroundScale,
  handleBackgroundPointerDown,
  handleBackgroundPointerMove,
  handleBackgroundPointerUp,
}: BackgroundLayerProps) {
  return (
    <>
      {backgroundImageUrl ? (
        <div
          className="background-image-layer"
          role="img"
          aria-label="Uploaded background image layer"
          onPointerDown={handleBackgroundPointerDown}
          onPointerMove={handleBackgroundPointerMove}
          onPointerUp={handleBackgroundPointerUp}
          onPointerCancel={handleBackgroundPointerUp}
        >
          <img
            src={backgroundImageUrl}
            alt=""
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
