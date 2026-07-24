import { useMemo, type PointerEvent } from 'react'
import {
  createPlatformMarkRenderModels,
  type PlatformMarkRenderModel,
} from '../../render/platformMarkRenderModel'
import type { PlatformMarkValue, ProjectPlatformMarks } from '../../project/projectTypes'
import {
  createPreviewEditableAttributes,
  createPreviewEditableElementId,
} from '../../editor/previewElementOverlay'
import { ContentBoundedImage } from './ContentBoundedImage'

export type PlatformMarksLayerProps = {
  projectPlatformMarks: ProjectPlatformMarks
  handlePlatformMarkPointerDown?: (
    event: PointerEvent<Element>,
    value: PlatformMarkValue,
  ) => void
  handlePlatformMarkPointerMove?: (event: PointerEvent<Element>) => void
  handlePlatformMarkPointerUp?: (event: PointerEvent<Element>) => void
}

export function PlatformMarksLayer({
  projectPlatformMarks,
  handlePlatformMarkPointerDown,
  handlePlatformMarkPointerMove,
  handlePlatformMarkPointerUp,
}: PlatformMarksLayerProps) {
  const renderModels = useMemo(
    () => createPlatformMarkRenderModels(projectPlatformMarks),
    [projectPlatformMarks],
  )

  const renderPlatformMark = (model: PlatformMarkRenderModel) => {
    const layerSize = {
      width: `${model.unscaledBounds.halfWidth * 2}%`,
      height: `${model.unscaledBounds.halfHeight * 2}%`,
    }

    return (
      <div
        key={model.value}
        className={[
          'disc-media-mark-layer',
          'disc-platform-mark-layer',
          model.contentShape ? 'disc-media-mark-layer--content-shaped' : '',
        ].filter(Boolean).join(' ')}
        aria-label={`${model.label} operating system mark layer`}
        {...createPreviewEditableAttributes({
          id: createPreviewEditableElementId(
            'disc',
            'platform-mark',
            model.value,
          ),
          label: `${model.label} operating system mark`,
          kind: 'mark',
        })}
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
        <ContentBoundedImage
          className={`disc-media-mark-image disc-canonical-visual-bounds-image${model.isPlaceholderImage ? ' disc-placeholder-svg-image' : ''}`}
          src={model.imageDataUrl}
          alt={model.alt}
          imageSize={model.imageSize}
          draggable={false}
        />
      </div>
    )
  }

  return <>{renderModels.map(renderPlatformMark)}</>
}
