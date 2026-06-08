import { useMemo, type PointerEvent } from 'react'
import {
  createTechnicalMarkRenderModels,
  type TechnicalMarkRenderModel,
} from '../../render/technicalMarkRenderModel'
import type { ProjectTechnicalMarks, TechnicalMarkValue } from '../../project/projectTypes'

export type TechnicalMarksLayerProps = {
  projectTechnicalMarks: ProjectTechnicalMarks
  handleTechnicalMarkPointerDown?: (
    event: PointerEvent<Element>,
    value: TechnicalMarkValue,
    assetId?: string | null,
  ) => void
  handleTechnicalMarkPointerMove?: (event: PointerEvent<Element>) => void
  handleTechnicalMarkPointerUp?: (event: PointerEvent<Element>) => void
}

export function TechnicalMarksLayer({
  projectTechnicalMarks,
  handleTechnicalMarkPointerDown,
  handleTechnicalMarkPointerMove,
  handleTechnicalMarkPointerUp,
}: TechnicalMarksLayerProps) {
  const renderModels = useMemo(
    () => createTechnicalMarkRenderModels(projectTechnicalMarks),
    [projectTechnicalMarks],
  )

  const renderTechnicalMark = (model: TechnicalMarkRenderModel) => {
    const layerSize = {
      width: `${model.unscaledBounds.halfWidth * 2}%`,
      height: `${model.unscaledBounds.halfHeight * 2}%`,
    }

    return (
      <div
        key={model.key}
        className="disc-media-mark-layer disc-technical-mark-layer"
        aria-label={`${model.label} technical mark layer`}
        style={{
          left: `${model.layout.x}%`,
          top: `${model.layout.y}%`,
          ...layerSize,
          transform: `translate(-50%, -50%) scale(${model.layout.scale})`,
        }}
        onPointerDown={(event) =>
          handleTechnicalMarkPointerDown?.(event, model.value, model.assetId)}
        onPointerMove={handleTechnicalMarkPointerMove}
        onPointerUp={handleTechnicalMarkPointerUp}
        onPointerCancel={handleTechnicalMarkPointerUp}
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

  return <>{renderModels.map(renderTechnicalMark)}</>
}
