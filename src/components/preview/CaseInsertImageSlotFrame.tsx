import type {
  ProjectCaseInsertImageSlot,
} from '../../project/projectTypes'
import { ArtworkFrameOverlay } from './ArtworkFrameOverlay'

export function CaseInsertImageSlotFrame({
  slot,
}: {
  slot: ProjectCaseInsertImageSlot
}) {
  return (
    <ArtworkFrameOverlay
      className="case-insert-image-slot-frame"
      frame={slot.frame}
      imageSize={slot.imageSize}
      patternId={`case-insert-image-slot-frame-${slot.id}`}
    />
  )
}
