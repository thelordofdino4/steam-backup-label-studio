import type { PointerEvent } from 'react'
import {
  getMediaMarkBoundsPercent,
  getMediaMarkPlaceholderBoundsPercent,
  getPlatformMarkGroupBoundsPercent,
  getPlatformMarkGroupPlaceholderBoundsPercent,
} from '../../discGeometry'
import { getMediaMarkLabel, getPlatformMarkLabel } from '../../project/projectMediaMark'
import type { ProjectMediaMark, ProjectPlatformMarks } from '../../project/projectTypes'

export type MediaMarkLayerProps = {
  projectMediaMark: ProjectMediaMark
  handleMediaMarkPointerDown?: (event: PointerEvent<Element>) => void
  handleMediaMarkPointerMove?: (event: PointerEvent<Element>) => void
  handleMediaMarkPointerUp?: (event: PointerEvent<Element>) => void
}

export type PlatformMarksLayerProps = {
  projectPlatformMarks: ProjectPlatformMarks
  handlePlatformMarksPointerDown?: (event: PointerEvent<Element>) => void
  handlePlatformMarksPointerMove?: (event: PointerEvent<Element>) => void
  handlePlatformMarksPointerUp?: (event: PointerEvent<Element>) => void
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
          <span>Media</span>
        </div>
      )}
    </div>
  )
}

export function PlatformMarksLayer({
  projectPlatformMarks,
  handlePlatformMarksPointerDown,
  handlePlatformMarksPointerMove,
  handlePlatformMarksPointerUp,
}: PlatformMarksLayerProps) {
  if (!projectPlatformMarks.layout.enabled) {
    return null
  }

  const shouldUseCustomImage =
    projectPlatformMarks.source === 'custom' && projectPlatformMarks.customImageDataUrl

  if (!shouldUseCustomImage && projectPlatformMarks.values.length === 0) {
    return null
  }

  const unscaledBounds =
    shouldUseCustomImage && projectPlatformMarks.customImageSize
      ? getPlatformMarkGroupBoundsPercent(projectPlatformMarks.customImageSize, 1)
      : getPlatformMarkGroupPlaceholderBoundsPercent(projectPlatformMarks.values.length, 1)
  const layerSize = {
    width: `${unscaledBounds.halfWidth * 2}%`,
    height: `${unscaledBounds.halfHeight * 2}%`,
  }
  const label =
    projectPlatformMarks.values.length > 0
      ? projectPlatformMarks.values.map(getPlatformMarkLabel).join(', ')
      : 'Platform marks'

  return (
    <div
      className="disc-media-mark-layer disc-platform-marks-layer"
      aria-label="Platform marks layer"
      style={{
        left: `${projectPlatformMarks.layout.x}%`,
        top: `${projectPlatformMarks.layout.y}%`,
        ...layerSize,
        transform: `translate(-50%, -50%) scale(${projectPlatformMarks.layout.scale})`,
      }}
      onPointerDown={handlePlatformMarksPointerDown}
      onPointerMove={handlePlatformMarksPointerMove}
      onPointerUp={handlePlatformMarksPointerUp}
      onPointerCancel={handlePlatformMarksPointerUp}
    >
      {shouldUseCustomImage ? (
        <img
          className="disc-media-mark-image"
          src={projectPlatformMarks.customImageDataUrl ?? undefined}
          alt={label}
          draggable={false}
        />
      ) : (
        <div className="disc-media-mark-placeholder disc-platform-marks-placeholder">
          {projectPlatformMarks.values.map((value) => (
            <strong key={value}>{getPlatformMarkLabel(value)}</strong>
          ))}
        </div>
      )}
    </div>
  )
}
