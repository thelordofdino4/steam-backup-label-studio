import type {
  ProjectCaseInsertImageSlot,
} from '../../project/projectTypes'
import { ArtworkFrameOverlay } from './ArtworkFrameOverlay'

export function CaseInsertImageSlotFrame({
  slot,
  viewportSize,
}: {
  slot: ProjectCaseInsertImageSlot
  viewportSize?: { width: number; height: number }
}) {
  return (
    <ArtworkFrameOverlay
      className="case-insert-image-slot-frame"
      frame={slot.frame}
      imageSize={viewportSize ?? slot.imageSize}
      patternId={`case-insert-image-slot-frame-${slot.id}`}
    />
  )
}
