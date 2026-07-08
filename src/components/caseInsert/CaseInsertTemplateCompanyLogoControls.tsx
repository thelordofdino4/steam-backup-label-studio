import {
  getCaseInsertAdditionalLogoSlotsForKey,
  getCaseInsertPrimaryLogoSlot,
  getCaseInsertUnassignedAdditionalLogoSlots,
} from '../../caseInsert/brandingLogoSlots'
import { EditorFeaturePanel } from '../editor/EditorPanel'
import { CaseInsertLogoSlotControls } from './CaseInsertLogoSlotControls'
import {
  getTemplateGroupedImagePlacementFields,
  TEMPLATE_OVERLAY_PLACEMENT_FIELDS,
} from './CaseInsertTemplateControlPlacement'
import type {
  CaseInsertTemplateControlsProps,
} from './CaseInsertTemplateControls.types'
import {
  GroupedImageSlotList,
} from './CaseInsertTemplateImageSlotControls'

export function CaseInsertTemplateCompanyLogoControls({
  paneId,
  templateState,
  actions,
  imageSources,
  logoCandidateDiscovery,
  handleFindLogoCandidates,
}: CaseInsertTemplateControlsProps) {
  const developerLogoSlot = getCaseInsertPrimaryLogoSlot(
    templateState,
    'developer',
  )
  const publisherLogoSlot = getCaseInsertPrimaryLogoSlot(
    templateState,
    'publisher',
  )
  const additionalDeveloperLogoSlots =
    getCaseInsertAdditionalLogoSlotsForKey(templateState, 'developer')
  const additionalPublisherLogoSlots =
    getCaseInsertAdditionalLogoSlotsForKey(templateState, 'publisher')
  const unassignedAdditionalLogoSlots =
    getCaseInsertUnassignedAdditionalLogoSlots(templateState)

  return (
    <EditorFeaturePanel title="Developer / publisher logos" variant="branding">
      <CaseInsertLogoSlotControls
        paneId={paneId}
        logoKey="developer"
        slot={developerLogoSlot}
        uploadId={`${paneId}-developer-logo-upload`}
        fields={developerLogoSlot
          ? getTemplateGroupedImagePlacementFields(
              paneId,
              'logoSlots',
              developerLogoSlot,
            )
          : TEMPLATE_OVERLAY_PLACEMENT_FIELDS}
        logoCandidateDiscovery={logoCandidateDiscovery}
        handleFindLogoCandidates={handleFindLogoCandidates}
        onUseLogoCandidate={(logoKey, candidate) =>
          actions.handleUseLogoCandidate(paneId, logoKey, candidate)}
        onEnabledChange={(enabled) =>
          actions.handlePrimaryLogoSlotEnabledChange(
            paneId,
            'developer',
            enabled,
          )}
        onUpload={(event) =>
          actions.handlePrimaryLogoSlotUpload(
            paneId,
            'developer',
            event,
          )}
        onLayoutChange={(field, value) =>
          actions.handlePrimaryLogoSlotLayoutChange(
            paneId,
            'developer',
            field,
            value,
          )}
        onResetLayout={() =>
          actions.handleResetPrimaryLogoSlotLayout(paneId, 'developer')}
        onClearImage={() =>
          actions.handleClearPrimaryLogoSlot(paneId, 'developer')}
      >
        <EditorFeaturePanel title="Additional developer logos">
          <GroupedImageSlotList
            paneId={paneId}
            emptyHint="No additional developer logos."
            addLabel="Add additional logo"
            slotKey="logoSlots"
            slots={additionalDeveloperLogoSlots}
            imageSources={imageSources}
            actions={actions}
            onAddSlot={() =>
              actions.handleAddAdditionalLogoSlot(paneId, 'developer')}
          />
        </EditorFeaturePanel>
      </CaseInsertLogoSlotControls>

      <CaseInsertLogoSlotControls
        paneId={paneId}
        logoKey="publisher"
        slot={publisherLogoSlot}
        uploadId={`${paneId}-publisher-logo-upload`}
        fields={publisherLogoSlot
          ? getTemplateGroupedImagePlacementFields(
              paneId,
              'logoSlots',
              publisherLogoSlot,
            )
          : TEMPLATE_OVERLAY_PLACEMENT_FIELDS}
        logoCandidateDiscovery={logoCandidateDiscovery}
        handleFindLogoCandidates={handleFindLogoCandidates}
        onUseLogoCandidate={(logoKey, candidate) =>
          actions.handleUseLogoCandidate(paneId, logoKey, candidate)}
        onEnabledChange={(enabled) =>
          actions.handlePrimaryLogoSlotEnabledChange(
            paneId,
            'publisher',
            enabled,
          )}
        onUpload={(event) =>
          actions.handlePrimaryLogoSlotUpload(
            paneId,
            'publisher',
            event,
          )}
        onLayoutChange={(field, value) =>
          actions.handlePrimaryLogoSlotLayoutChange(
            paneId,
            'publisher',
            field,
            value,
          )}
        onResetLayout={() =>
          actions.handleResetPrimaryLogoSlotLayout(paneId, 'publisher')}
        onClearImage={() =>
          actions.handleClearPrimaryLogoSlot(paneId, 'publisher')}
      >
        <EditorFeaturePanel title="Additional publisher logos">
          <GroupedImageSlotList
            paneId={paneId}
            emptyHint="No additional publisher logos."
            addLabel="Add additional logo"
            slotKey="logoSlots"
            slots={additionalPublisherLogoSlots}
            imageSources={imageSources}
            actions={actions}
            onAddSlot={() =>
              actions.handleAddAdditionalLogoSlot(paneId, 'publisher')}
          />
        </EditorFeaturePanel>
      </CaseInsertLogoSlotControls>

      {unassignedAdditionalLogoSlots.length > 0 ? (
        <EditorFeaturePanel title="Unassigned additional logos">
          <GroupedImageSlotList
            paneId={paneId}
            emptyHint="No unassigned additional logos."
            addLabel="Add additional logo"
            slotKey="logoSlots"
            slots={unassignedAdditionalLogoSlots}
            imageSources={imageSources}
            actions={actions}
            showAddButton={false}
          />
        </EditorFeaturePanel>
      ) : null}
    </EditorFeaturePanel>
  )
}
