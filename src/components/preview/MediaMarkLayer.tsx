import type { PointerEvent } from 'react'
import {
  getMediaMarkBoundsPercent,
  getMediaMarkPlaceholderBoundsPercent,
} from '../../discGeometry'
import { getMediaMarkLabel } from '../../project/projectMediaMark'
import type { ProjectMediaMark } from '../../project/projectTypes'

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
  if (!projectMediaMark.layout.enabled) {
    return null
  }

  const shouldUseCustomImage =
    projectMediaMark.source === 'custom' && projectMediaMark.customImageDataUrl
  const unscaledBounds =
    shouldUseCustomImage && projectMediaMark.customImageSize
      ? getMediaMarkBoundsPercent(projectMediaMark.customImageSize, 1)
      : getMediaMarkPlaceholderBoundsPercent(1)
  const layerSize = {
    width: `${unscaledBounds.halfWidth * 2}%`,
    height: `${unscaledBounds.halfHeight * 2}%`,
  }
  const label = getMediaMarkLabel(projectMediaMark.value)

  return (
    <div
      className="disc-media-mark-layer"
      aria-label="Media mark layer"
      style={{
        left: `${projectMediaMark.layout.x}%`,
        top: `${projectMediaMark.layout.y}%`,
        ...layerSize,
        transform: `translate(-50%, -50%) scale(${projectMediaMark.layout.scale})`,
      }}
      onPointerDown={handleMediaMarkPointerDown}
      onPointerMove={handleMediaMarkPointerMove}
      onPointerUp={handleMediaMarkPointerUp}
      onPointerCancel={handleMediaMarkPointerUp}
    >
      {shouldUseCustomImage ? (
        <img
          className="disc-media-mark-image"
          src={projectMediaMark.customImageDataUrl ?? undefined}
          alt={label}
          draggable={false}
        />
      ) : (
        <div className="disc-media-mark-placeholder">
          <strong>{label}</strong>
          <span>Mark</span>
        </div>
      )}
    </div>
  )
}
