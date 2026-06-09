import type { PointerEvent } from 'react'
import { getImageContentSize } from '../../image/imageContentBounds'
import {
  createAdditionalArtworkRenderItems,
  type AdditionalArtworkRenderItem,
} from '../../project/projectAdditionalArtwork'
import type { ProjectAdditionalArtwork } from '../../project/projectTypes'
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

function getFrameViewBox(renderItem: AdditionalArtworkRenderItem) {
  const contentSize = getImageContentSize(renderItem.imageSize)
  const width = 100
  const height =
    contentSize && contentSize.width > 0
      ? Math.max(1, 100 * (contentSize.height / contentSize.width))
      : 100

  return { width, height }
}

function AdditionalArtworkFrame({ renderItem }: { renderItem: AdditionalArtworkRenderItem }) {
  const frame = renderItem.frame

  if (!frame.enabled) {
    return null
  }

  const viewBox = getFrameViewBox(renderItem)
  const strokeWidth = Math.min(frame.width, viewBox.width, viewBox.height)
  const inset = strokeWidth / 2

  return (
    <svg
      className="disc-additional-artwork-frame"
      viewBox={`0 0 ${viewBox.width} ${viewBox.height}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      {frame.shape === 'circle' ? (
        <ellipse
          cx={viewBox.width / 2}
          cy={viewBox.height / 2}
          rx={Math.max(0, (viewBox.width - strokeWidth) / 2)}
          ry={Math.max(0, (viewBox.height - strokeWidth) / 2)}
          fill="none"
          stroke={frame.color}
          strokeWidth={strokeWidth}
        />
      ) : (
        <rect
          x={inset}
          y={inset}
          width={Math.max(0, viewBox.width - strokeWidth)}
          height={Math.max(0, viewBox.height - strokeWidth)}
          fill="none"
          stroke={frame.color}
          strokeWidth={strokeWidth}
        />
      )}
    </svg>
  )
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
            renderItem.frame.enabled && renderItem.frame.shape === 'circle'
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
          <AdditionalArtworkFrame renderItem={renderItem} />
        </div>
      ))}
    </div>
  )
}
