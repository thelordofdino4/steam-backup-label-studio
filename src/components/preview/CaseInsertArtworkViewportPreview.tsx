import type { PointerEventHandler } from 'react'
import type { CaseInsertPreviewLayout } from '../../layout/caseInsertPreviewLayout'
import type { ProjectCaseInsertImageSlot } from '../../project/projectTypes'
import type {
  CaseInsertArtworkViewportRenderArtifact,
} from '../../render/caseInsertArtworkViewportRenderArtifact'
import { CaseInsertImageSlotFrame } from './CaseInsertImageSlotFrame'
import {
  getCaseInsertArtworkViewportPreviewBasisStyle,
  getCaseInsertArtworkViewportPreviewClassNames,
  getCaseInsertArtworkViewportPreviewDestinationStyle,
  getCaseInsertArtworkViewportPreviewOuterStyle,
  getCaseInsertArtworkViewportPreviewSourceStyle,
} from './caseInsertArtworkViewportPreviewGeometry'

type CaseInsertArtworkViewportPreviewProps = {
  artifact: CaseInsertArtworkViewportRenderArtifact
  editableAttributes: Record<string, string>
  layout: CaseInsertPreviewLayout
  onPointerCancel?: PointerEventHandler<Element>
  onPointerDown?: PointerEventHandler<Element>
  onPointerMove?: PointerEventHandler<Element>
  onPointerUp?: PointerEventHandler<Element>
  slot: ProjectCaseInsertImageSlot
}

/** Thin DOM adapter over the shared numeric viewport artifact. */
export function CaseInsertArtworkViewportPreview({
  artifact,
  editableAttributes,
  layout,
  onPointerCancel,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  slot,
}: CaseInsertArtworkViewportPreviewProps) {
  const circle = slot.frame.enabled && slot.frame.shape === 'circle'
  const classNames = getCaseInsertArtworkViewportPreviewClassNames(artifact)

  return (
    <div
      className={classNames.basis}
      style={getCaseInsertArtworkViewportPreviewBasisStyle(artifact, layout)}
    >
      <div
        className={classNames.viewport}
        {...editableAttributes}
        onPointerCancel={onPointerCancel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        style={getCaseInsertArtworkViewportPreviewOuterStyle(artifact)}
      >
        <div
          className={[
            'case-insert-artwork-viewport-clip',
            circle ? 'case-insert-artwork-viewport-clip--circle' : '',
          ].filter(Boolean).join(' ')}
        >
          <div
            className="case-insert-artwork-viewport-sample"
            style={getCaseInsertArtworkViewportPreviewDestinationStyle(artifact)}
          >
            <img
              alt={artifact.alt}
              className="case-insert-artwork-viewport-image"
              draggable={false}
              src={artifact.imageDataUrl}
              style={getCaseInsertArtworkViewportPreviewSourceStyle(artifact)}
            />
          </div>
        </div>
        <CaseInsertImageSlotFrame
          slot={slot}
          viewportSize={{
            width: artifact.localFrameRect.width,
            height: artifact.localFrameRect.height,
          }}
        />
      </div>
    </div>
  )
}
