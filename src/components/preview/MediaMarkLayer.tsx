import type { PointerEvent } from 'react'
import {
  getMediaMarkBoundsPercent,
  getMediaMarkPlaceholderBoundsPercent,
  getPlatformMarkBoundsPercent,
  getPlatformMarkPlaceholderBoundsPercent,
} from '../../discGeometry'
import { getMediaMarkLabel, getPlatformMarkLabel } from '../../project/projectMediaMark'
import type { PlatformMarkValue, ProjectMediaMark, ProjectPlatformMarks } from '../../project/projectTypes'

export type MediaMarkLayerProps = {
  projectMediaMark: ProjectMediaMark
  handleMediaMarkPointerDown?: (event: PointerEvent<Element>) => void
  handleMediaMarkPointerMove?: (event: PointerEvent<Element>) => void
  handleMediaMarkPointerUp?: (event: PointerEvent<Element>) => void
}

export type PlatformMarksLayerProps = {
  projectPlatformMarks: ProjectPlatformMarks
  handlePlatformMarkPointerDown?: (
    event: PointerEvent<Element>,
    value: PlatformMarkValue,
  ) => void
  handlePlatformMarkPointerMove?: (event: PointerEvent<Element>) => void
  handlePlatformMarkPointerUp?: (event: PointerEvent<Element>) => void
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
  handlePlatformMarkPointerDown,
  handlePlatformMarkPointerMove,
  handlePlatformMarkPointerUp,
}: PlatformMarksLayerProps) {
  const renderPlatformMark = (value: PlatformMarkValue) => {
    const asset = projectPlatformMarks.assets[value]

    if (!asset?.layout.enabled) {
      return null
    }

    const shouldUseCustomImage =
      asset.source === 'custom' && asset.customImageDataUrl
    const unscaledBounds =
      shouldUseCustomImage && asset.customImageSize
        ? getPlatformMarkBoundsPercent(asset.customImageSize, 1)
        : getPlatformMarkPlaceholderBoundsPercent(1)
    const layerSize = {
      width: `${unscaledBounds.halfWidth * 2}%`,
      height: `${unscaledBounds.halfHeight * 2}%`,
    }
    const label = getPlatformMarkLabel(value)

    return (
      <div
        key={value}
        className="disc-media-mark-layer disc-platform-mark-layer"
        aria-label={`${label} platform mark layer`}
        style={{
          left: `${asset.layout.x}%`,
          top: `${asset.layout.y}%`,
          ...layerSize,
          transform: `translate(-50%, -50%) scale(${asset.layout.scale})`,
        }}
        onPointerDown={(event) => handlePlatformMarkPointerDown?.(event, value)}
        onPointerMove={handlePlatformMarkPointerMove}
        onPointerUp={handlePlatformMarkPointerUp}
        onPointerCancel={handlePlatformMarkPointerUp}
      >
        {shouldUseCustomImage ? (
          <img
            className="disc-media-mark-image"
            src={asset.customImageDataUrl ?? undefined}
            alt={label}
            draggable={false}
          />
        ) : (
          <div className="disc-platform-mark-placeholder">
            <strong>{label}</strong>
          </div>
        )}
      </div>
    )
  }

  return <>{projectPlatformMarks.values.map(renderPlatformMark)}</>
}
