import type { PointerEvent } from 'react'
import {
  createMediaMarkRenderModel,
  createPlatformMarkRenderModels,
  type PlatformMarkRenderModel,
} from '../../mediaMarkRenderModel'
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
  const model = createMediaMarkRenderModel(projectMediaMark)

  if (!model) {
    return null
  }

  const layerSize = {
    width: `${model.unscaledBounds.halfWidth * 2}%`,
    height: `${model.unscaledBounds.halfHeight * 2}%`,
  }

  return (
    <div
      className="disc-media-mark-layer"
      aria-label="Media mark layer"
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
      <img
        className={`disc-media-mark-image${model.isPlaceholderImage ? ' disc-placeholder-svg-image' : ''}`}
        src={model.imageDataUrl}
        alt={model.alt}
        draggable={false}
      />
    </div>
  )
}

export function PlatformMarksLayer({
  projectPlatformMarks,
  handlePlatformMarkPointerDown,
  handlePlatformMarkPointerMove,
  handlePlatformMarkPointerUp,
}: PlatformMarksLayerProps) {
  const renderPlatformMark = (model: PlatformMarkRenderModel) => {
    const layerSize = {
      width: `${model.unscaledBounds.halfWidth * 2}%`,
      height: `${model.unscaledBounds.halfHeight * 2}%`,
    }

    return (
      <div
        key={model.value}
        className="disc-media-mark-layer disc-platform-mark-layer"
        aria-label={`${model.label} platform mark layer`}
        style={{
          left: `${model.layout.x}%`,
          top: `${model.layout.y}%`,
          ...layerSize,
          transform: `translate(-50%, -50%) scale(${model.layout.scale})`,
        }}
        onPointerDown={(event) => handlePlatformMarkPointerDown?.(event, model.value)}
        onPointerMove={handlePlatformMarkPointerMove}
        onPointerUp={handlePlatformMarkPointerUp}
        onPointerCancel={handlePlatformMarkPointerUp}
      >
        <img
          className={`disc-media-mark-image${model.isPlaceholderImage ? ' disc-placeholder-svg-image' : ''}`}
          src={model.imageDataUrl}
          alt={model.alt}
          draggable={false}
        />
      </div>
    )
  }

  return <>{createPlatformMarkRenderModels(projectPlatformMarks).map(renderPlatformMark)}</>
}
