import {
  CASE_INSERT_ARTWORK_SECTION_LABELS,
} from '../../caseInsert/artworkPanelSections'
import { EditorFeaturePanel } from '../editor/EditorPanel'
import { CaseInsertTitleArtworkControls } from './CaseInsertTitleArtworkControls'
import {
  CaseInsertSpineControlSections,
} from './CaseInsertSpineControlSections'
import {
  getSpineImageSlotPlacementFields,
} from './CaseInsertSpineControlPlacement'
import type {
  CaseInsertSpineControlsProps,
} from './CaseInsertSpineControls.types'
import {
  SpineGroupedImageSlotSection,
  SpineImageSlotControls,
} from './CaseInsertSpineImageSlotControls'

export function CaseInsertSpineArtworkControls({
  spine,
  actions,
  imageSources,
}: CaseInsertSpineControlsProps) {
  return (
    <CaseInsertSpineControlSections
      spine={spine}
      renderControls={({ side, label }) => {
        const state = spine[side]

        return (
          <>
          <SpineImageSlotControls
            side={side}
            slotKey="background"
            slot={state.background}
            title={`${label} background`}
            enableLabel="Show spine background artwork"
            uploadId={`${side}-spine-background-upload`}
            isBackground
            imageSources={imageSources}
            actions={actions}
          />
          <EditorFeaturePanel title={CASE_INSERT_ARTWORK_SECTION_LABELS.gameLogo}>
            <CaseInsertTitleArtworkControls
              slot={state.titleArtwork}
              uploadId={`${side}-spine-title-artwork-upload`}
              fields={getSpineImageSlotPlacementFields(
                side,
                state.titleArtwork,
                'titleArtwork',
              )}
              helpText="This is the game title/logo artwork on the spine. Steam import can seed the best available Steam title/logo artwork; Game title text stays independently available in the Text tab."
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
          <SpineGroupedImageSlotSection
            side={side}
            featureEnabled={state.additionalArtworkEnabled}
            slots={state.artworkSlots}
            imageSources={imageSources}
            actions={actions}
          />
          </>
        )
      }}
    />
  )
}
