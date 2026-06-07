import type { ProjectCaseInsertImageSlot } from '../../project/projectTypes'
import { formatAdditionalArtworkSize } from '../sidebar/artwork/helpers'

export function CaseInsertImageSlotStatusCard({
  slot,
  emptyHint,
}: {
  slot: ProjectCaseInsertImageSlot
  emptyHint: string
}) {
  if (!slot.imageDataUrl) {
    return <p className="hint">{emptyHint}</p>
  }

  return (
    <div className="selected-lockup-card logo-asset-status-card">
      <img
        className="logo-asset-preview additional-artwork-preview"
        src={slot.imageDataUrl}
        alt=""
        draggable={false}
      />
      <span>
        {slot.imageSource?.sourceLabel ?? slot.label}
        {formatAdditionalArtworkSize(slot.imageSize)}
      </span>
    </div>
  )
}
