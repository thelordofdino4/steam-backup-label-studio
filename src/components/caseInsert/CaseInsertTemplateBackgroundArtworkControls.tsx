import type {
  CaseInsertTemplateControlsProps,
} from './CaseInsertTemplateControls.types'
import {
  PrimaryImageSlotControls,
} from './CaseInsertTemplateImageSlotControls'

export function CaseInsertTemplateBackgroundArtworkControls({
  paneId,
  templateState,
  actions,
  imageSources,
}: CaseInsertTemplateControlsProps) {
  return (
    <PrimaryImageSlotControls
      paneId={paneId}
      slotKey="background"
      slot={templateState.background}
      title="background"
      enableLabel="Show background image"
      uploadId={`${paneId}-background-upload`}
      isBackground
      imageSources={imageSources}
      actions={actions}
    />
  )
}
