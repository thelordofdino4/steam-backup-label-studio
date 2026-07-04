import type { ReactNode } from 'react'
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
import {
  GroupedImageSlotSection,
  PrimaryImageSlotControls,
} from './CaseInsertTemplateImageSlotControls'

function CaseInsertArtworkFeatureSection({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <EditorFeaturePanel title={title}>{children}</EditorFeaturePanel>
  )
}

export function CaseInsertTemplateArtworkControls({
  paneId,
  templateState,
  actions,
  imageSources,
}: CaseInsertTemplateControlsProps) {
  return (
    <>
      <PrimaryImageSlotControls
        paneId={paneId}
        slotKey="background"
        slot={templateState.background}
        title="background"
        enableLabel="Show background art"
        uploadId={`${paneId}-background-upload`}
        isBackground
        imageSources={imageSources}
        actions={actions}
      />

      <CaseInsertArtworkFeatureSection
        title={CASE_INSERT_ARTWORK_SECTION_LABELS.gameLogo}
      >
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
      </CaseInsertArtworkFeatureSection>

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
    </>
  )
}
