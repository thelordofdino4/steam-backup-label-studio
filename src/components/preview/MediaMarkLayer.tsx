import type { PointerEvent } from 'react'
import {
  getMediaMarkBoundsPercent,
  getMediaMarkPlaceholderBoundsPercent,
  getPlatformMarkGroupBoundsPercent,
  getPlatformMarkGroupPlaceholderBoundsPercent,
  PLATFORM_MARK_BASE_HEIGHT_RATIO,
  PLATFORM_MARK_BASE_WIDTH_RATIO,
  PLATFORM_MARK_GAP_RATIO,
  PLATFORM_MARK_MAX_COLUMNS,
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
  const columns = Math.min(
    PLATFORM_MARK_MAX_COLUMNS,
    Math.max(1, projectPlatformMarks.values.length),
  )
  const rows = Math.ceil(
    Math.max(1, projectPlatformMarks.values.length) / PLATFORM_MARK_MAX_COLUMNS,
  )
  const groupWidthRatio =
    PLATFORM_MARK_BASE_WIDTH_RATIO * columns +
    PLATFORM_MARK_GAP_RATIO * Math.max(0, columns - 1)
  const groupHeightRatio =
    PLATFORM_MARK_BASE_HEIGHT_RATIO * rows +
    PLATFORM_MARK_GAP_RATIO * Math.max(0, rows - 1)
  const boxWidthPercent = (PLATFORM_MARK_BASE_WIDTH_RATIO / groupWidthRatio) * 100
  const boxHeightPercent = (PLATFORM_MARK_BASE_HEIGHT_RATIO / groupHeightRatio) * 100
  const gapXPercent = (PLATFORM_MARK_GAP_RATIO / groupWidthRatio) * 100
  const gapYPercent = (PLATFORM_MARK_GAP_RATIO / groupHeightRatio) * 100

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
        <div className="disc-platform-marks-placeholder">
          {projectPlatformMarks.values.map((value, index) => {
            const column = index % PLATFORM_MARK_MAX_COLUMNS
            const row = Math.floor(index / PLATFORM_MARK_MAX_COLUMNS)

            return (
              <div
                key={value}
                className="disc-platform-mark-placeholder"
                style={{
                  left: `${column * (boxWidthPercent + gapXPercent)}%`,
                  top: `${row * (boxHeightPercent + gapYPercent)}%`,
                  width: `${boxWidthPercent}%`,
                  height: `${boxHeightPercent}%`,
                }}
              >
                <strong>{getPlatformMarkLabel(value)}</strong>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
