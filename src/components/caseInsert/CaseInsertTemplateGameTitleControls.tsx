import {
  CASE_INSERT_ARTWORK_SECTION_LABELS,
} from '../../caseInsert/artworkPanelSections'
import { EditorFeaturePanel } from '../editor/EditorPanel'
import { CaseInsertTitleArtworkControls } from './CaseInsertTitleArtworkControls'
import {
  CaseInsertTemplateGameTitleTextControls,
} from './CaseInsertTemplateGameTitleTextControls'
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
  ...props
}: CaseInsertTemplateControlsProps) {
  return (
    <>
      <EditorFeaturePanel title={CASE_INSERT_ARTWORK_SECTION_LABELS.gameLogo}>
        <CaseInsertTitleArtworkControls
          slot={templateState.titleArtwork}
          uploadId={`${paneId}-title-artwork-upload`}
          fields={getTemplatePrimaryImagePlacementFields(
            paneId,
            'titleArtwork',
            templateState.titleArtwork,
          )}
          helpText="This is the game title/logo artwork on the case insert. Steam import can seed the best available Steam title/logo artwork; title text fallback stays independently editable in this Game Title panel."
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
      <EditorFeaturePanel title="Game title text">
        <CaseInsertTemplateGameTitleTextControls
          paneId={paneId}
          templateState={templateState}
          actions={actions}
          {...props}
        />
      </EditorFeaturePanel>
    </>
  )
}
