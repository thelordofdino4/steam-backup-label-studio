import { useMemo, type PointerEvent } from 'react'
import {
  createTechnicalMarkRenderModels,
  type TechnicalMarkRenderModel,
} from '../../render/technicalMarkRenderModel'
import type { ProjectTechnicalMarks, TechnicalMarkValue } from '../../project/projectTypes'
import {
  createPreviewEditableAttributes,
  createPreviewEditableElementId,
} from '../../editor/previewElementOverlay'
import { ContentBoundedImage } from './ContentBoundedImage'

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
        className={[
          'disc-media-mark-layer',
          'disc-technical-mark-layer',
          model.contentShape ? 'disc-media-mark-layer--content-shaped' : '',
        ].filter(Boolean).join(' ')}
        aria-label={`${model.label} technical mark layer`}
        {...createPreviewEditableAttributes({
          id: createPreviewEditableElementId('disc', 'technical-mark', model.key),
          label: `${model.label} technical mark`,
          kind: 'mark',
        })}
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

  return <>{renderModels.map(renderTechnicalMark)}</>
}
