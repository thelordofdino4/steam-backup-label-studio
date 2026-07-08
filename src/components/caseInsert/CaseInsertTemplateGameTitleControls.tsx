import {
  CASE_INSERT_ARTWORK_SECTION_LABELS,
} from '../../caseInsert/artworkPanelSections'
import { EditorFeaturePanel } from '../editor/EditorPanel'
import { CaseInsertTitleArtworkControls } from './CaseInsertTitleArtworkControls'
import {
  getTemplatePrimaryImagePlacementFields,
} from './CaseInsertTemplateControlPlacement'
import type {
  CaseInsertTemplateControlsProps,
} from './CaseInsertTemplateControls.types'

export function CaseInsertTemplateGameTitleControls({
  paneId,
  templateState,
  actions,
}: CaseInsertTemplateControlsProps) {
  return (
    <EditorFeaturePanel title={CASE_INSERT_ARTWORK_SECTION_LABELS.gameLogo}>
      <CaseInsertTitleArtworkControls
        slot={templateState.titleArtwork}
        uploadId={`${paneId}-title-artwork-upload`}
        fields={getTemplatePrimaryImagePlacementFields(
          paneId,
          'titleArtwork',
          templateState.titleArtwork,
        )}
        helpText="This is the game title/logo artwork on the case insert. Steam import can seed the best available Steam title/logo artwork; template text stays independently available in the Text tab."
        onEnabledChange={(enabled) =>
          actions.handleImageSlotEnabledChange(
            paneId,
            'titleArtwork',
            enabled,
          )}
        onUpload={(event) =>
          actions.handleImageSlotUpload(
            paneId,
            'titleArtwork',
            templateState.titleArtwork.label,
            event,
          )}
        onLayoutChange={(field, value) =>
          actions.handleImageSlotLayoutChange(
            paneId,
            'titleArtwork',
            field,
            value,
          )}
        onResetLayout={() =>
          actions.handleResetImageSlotLayout(paneId, 'titleArtwork')}
        onRestoreDefault={() =>
          actions.handleRestoreTitleArtworkDefault(paneId)}
      />
    </EditorFeaturePanel>
  )
}
