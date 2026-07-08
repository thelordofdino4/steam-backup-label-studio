import {
  CASE_INSERT_ARTWORK_SECTION_LABELS,
} from '../../caseInsert/artworkPanelSections'
import type {
  CaseInsertTemplateControlsProps,
} from './CaseInsertTemplateControls.types'
import {
  GroupedImageSlotSection,
} from './CaseInsertTemplateImageSlotControls'

export function CaseInsertTemplateAdditionalArtworkControls({
  paneId,
  templateState,
  actions,
  imageSources,
}: CaseInsertTemplateControlsProps) {
  if (paneId !== 'cover') {
    return null
  }

  return (
    <GroupedImageSlotSection
      paneId={paneId}
      title={CASE_INSERT_ARTWORK_SECTION_LABELS.additionalArtwork}
      featureEnabled={templateState.additionalArtworkEnabled}
      onFeatureEnabledChange={(enabled) =>
        actions.handleAdditionalArtworkEnabledChange(paneId, enabled)}
      emptyHint="No additional artwork elements."
      addLabel="Add artwork element"
      slotKey="artworkSlots"
      slots={templateState.artworkSlots}
      imageSources={imageSources}
      actions={actions}
    />
  )
}
