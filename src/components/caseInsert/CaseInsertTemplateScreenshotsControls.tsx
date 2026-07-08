import type {
  CaseInsertTemplateControlsProps,
} from './CaseInsertTemplateControls.types'
import {
  GroupedImageSlotSection,
} from './CaseInsertTemplateImageSlotControls'

export function CaseInsertTemplateScreenshotsControls({
  paneId,
  templateState,
  actions,
  imageSources,
}: CaseInsertTemplateControlsProps) {
  if (paneId !== 'tray') {
    return null
  }

  return (
    <GroupedImageSlotSection
      paneId={paneId}
      title="Screenshots"
      featureEnabled={templateState.additionalArtworkEnabled}
      onFeatureEnabledChange={(enabled) =>
        actions.handleAdditionalArtworkEnabledChange(paneId, enabled)}
      enableLabel="Show screenshots"
      emptyHint="No screenshot or supporting-art slots."
      addLabel="Add screenshot/supporting art"
      slotKey="artworkSlots"
      slots={templateState.artworkSlots}
      imageSources={imageSources}
      actions={actions}
    />
  )
}
