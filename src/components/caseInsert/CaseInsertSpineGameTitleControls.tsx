import {
  CASE_INSERT_ARTWORK_SECTION_LABELS,
} from '../../caseInsert/artworkPanelSections'
import { EditorFeaturePanel } from '../editor/EditorPanel'
import { CaseInsertTitleArtworkControls } from './CaseInsertTitleArtworkControls'
import {
  CaseInsertSpineControlSections,
} from './CaseInsertSpineControlSections'
import {
  CaseInsertSpineTitleTextControl,
} from './CaseInsertSpineTextControls'
import {
  getSpineImageSlotPlacementFields,
} from './CaseInsertSpineControlPlacement'
import type {
  CaseInsertSpineControlsProps,
} from './CaseInsertSpineControls.types'

export function CaseInsertSpineGameTitleControls({
  spine,
  actions,
  onSelectedTextTargetChange,
}: CaseInsertSpineControlsProps) {
  return (
    <CaseInsertSpineControlSections
      spine={spine}
      renderControls={({ side }) => {
        const state = spine[side]

        return (
          <>
            <EditorFeaturePanel title={CASE_INSERT_ARTWORK_SECTION_LABELS.gameLogo}>
              <CaseInsertTitleArtworkControls
                slot={state.titleArtwork}
                uploadId={`${side}-spine-title-artwork-upload`}
                fields={getSpineImageSlotPlacementFields(
                  side,
                  state.titleArtwork,
                  'titleArtwork',
                )}
                helpText="This is the game title/logo artwork on the spine. Steam import can seed the best available Steam title/logo artwork; game title text fallback stays independently editable in this role panel."
                onEnabledChange={(enabled) =>
                  actions.handleSpineImageSlotEnabledChange(
                    side,
                    'titleArtwork',
                    enabled,
                  )}
                onUpload={(event) =>
                  actions.handleSpineImageSlotUpload(
                    side,
                    'titleArtwork',
                    state.titleArtwork.label,
                    event,
                  )}
                onLayoutChange={(field, value) =>
                  actions.handleSpineImageSlotLayoutChange(
                    side,
                    'titleArtwork',
                    field,
                    value,
                  )}
                onResetLayout={() =>
                  actions.handleResetSpineImageSlotLayout(side, 'titleArtwork')}
                onRestoreDefault={() =>
                  actions.handleRestoreSpineTitleArtworkDefault(side)}
              />
            </EditorFeaturePanel>
            <EditorFeaturePanel title="Game title text">
              <CaseInsertSpineTitleTextControl
                side={side}
                title={state.title}
                actions={actions}
                onSelectedTextTargetChange={onSelectedTextTargetChange}
              />
            </EditorFeaturePanel>
          </>
        )
      }}
    />
  )
}
