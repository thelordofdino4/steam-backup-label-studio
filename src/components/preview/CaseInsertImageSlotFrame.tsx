import type {
  ProjectCaseInsertImageSlot,
} from '../../project/projectTypes'
import type {
  ArtworkFrameMaterialPreviewLightOverride,
} from './ArtworkFrameMaterialLightEditorOverlay'
import {
  getActiveArtworkFrameMaterialLightOverride,
} from '../../render/artworkFrameMaterialLightEditor'
import { ArtworkFrameOverlay } from './ArtworkFrameOverlay'

export function CaseInsertImageSlotFrame({
  materialLightOverride = null,
  slot,
}: {
  materialLightOverride?: ArtworkFrameMaterialPreviewLightOverride | null
  slot: ProjectCaseInsertImageSlot
}) {
  const activeLightOverride =
    getActiveArtworkFrameMaterialLightOverride(materialLightOverride)

  return (
    <ArtworkFrameOverlay
      className="case-insert-image-slot-frame"
      frame={slot.frame}
      imageDataUrl={slot.imageDataUrl}
      imageSize={slot.imageSize}
      materialLightVector={activeLightOverride?.lightVector ?? null}
      materialQualityMode={activeLightOverride?.qualityMode ?? 'full'}
      patternId={`case-insert-image-slot-frame-${slot.id}`}
    />
  )
}
