import { useMemo, type PointerEvent } from 'react'
import { createMediaMarkRenderModel } from '../../render/mediaMarkRenderModel'
import type { ProjectMediaMark } from '../../project/projectTypes'
import {
  createPreviewEditableAttributes,
  createPreviewEditableElementId,
} from '../../editor/previewElementOverlay'
import { ContentBoundedImage } from './ContentBoundedImage'

export type MediaMarkLayerProps = {
  projectMediaMark: ProjectMediaMark
  handleMediaMarkPointerDown?: (event: PointerEvent<Element>) => void
  handleMediaMarkPointerMove?: (event: PointerEvent<Element>) => void
  handleMediaMarkPointerUp?: (event: PointerEvent<Element>) => void
}

export function MediaMarkLayer({
  projectMediaMark,
  handleMediaMarkPointerDown,
  handleMediaMarkPointerMove,
  handleMediaMarkPointerUp,
}: MediaMarkLayerProps) {
  const model = useMemo(
    () => createMediaMarkRenderModel(projectMediaMark),
    [projectMediaMark],
  )

  if (!model) {
    return null
  }

  const layerSize = {
    width: `${model.unscaledBounds.halfWidth * 2}%`,
    height: `${model.unscaledBounds.halfHeight * 2}%`,
  }

  return (
    <div
      className={[
        'disc-media-mark-layer',
        model.contentShape ? 'disc-media-mark-layer--content-shaped' : '',
      ].filter(Boolean).join(' ')}
      aria-label="Media mark layer"
      {...createPreviewEditableAttributes({
        id: createPreviewEditableElementId('disc', 'media-mark'),
        label: 'Media mark',
        kind: 'mark',
      })}
      style={{
        left: `${model.layout.x}%`,
        top: `${model.layout.y}%`,
        ...layerSize,
        transform: `translate(-50%, -50%) scale(${model.layout.scale})`,
      }}
      onPointerDown={handleMediaMarkPointerDown}
      onPointerMove={handleMediaMarkPointerMove}
      onPointerUp={handleMediaMarkPointerUp}
      onPointerCancel={handleMediaMarkPointerUp}
    >
      <ContentBoundedImage
        className={`disc-media-mark-image${model.isPlaceholderImage ? ' disc-placeholder-svg-image' : ''}`}
        src={model.imageDataUrl}
        alt={model.alt}
        imageSize={model.imageSize}
        draggable={false}
      />
    </div>
  )
}
