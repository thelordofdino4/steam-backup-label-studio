import {
  getCaseInsertAdditionalLogoSlotsForKey,
  getCaseInsertPrimaryLogoSlot,
  getCaseInsertUnassignedAdditionalLogoSlots,
} from '../../caseInsert/brandingLogoSlots'
import { EditorFeaturePanel } from '../editor/EditorPanel'
import { PlusIcon } from '../sidebar/PanelIcons'
import { CaseInsertLogoSlotControls } from './CaseInsertLogoSlotControls'
import {
  CaseInsertSpineControlSections,
} from './CaseInsertSpineControlSections'
import {
  getSpineImageSlotPlacementFields,
  SPINE_OVERLAY_PLACEMENT_FIELDS,
} from './CaseInsertSpineControlPlacement'
import type {
  CaseInsertSpineControlsProps,
} from './CaseInsertSpineControls.types'
import {
  SpineGroupedImageSlotControls,
} from './CaseInsertSpineImageSlotControls'

export function CaseInsertSpineCompanyLogoControls({
  spine,
  actions,
  imageSources,
  logoCandidateDiscovery,
  handleFindLogoCandidates,
}: CaseInsertSpineControlsProps) {
  return (
    <CaseInsertSpineControlSections
      spine={spine}
      renderControls={({ side }) => {
        const state = spine[side]
        const developerLogoSlot = getCaseInsertPrimaryLogoSlot(
          state,
          'developer',
        )
        const publisherLogoSlot = getCaseInsertPrimaryLogoSlot(
          state,
          'publisher',
        )
        const additionalDeveloperLogoSlots =
          getCaseInsertAdditionalLogoSlotsForKey(state, 'developer')
        const additionalPublisherLogoSlots =
          getCaseInsertAdditionalLogoSlotsForKey(state, 'publisher')
        const unassignedAdditionalLogoSlots =
          getCaseInsertUnassignedAdditionalLogoSlots(state)

        return (
          <EditorFeaturePanel title="Developer / publisher logos" variant="branding">
            <CaseInsertLogoSlotControls
              paneId="spine"
              logoKey="developer"
              slot={developerLogoSlot}
              uploadId={`${side}-spine-developer-logo-upload`}
              fields={developerLogoSlot
                ? getSpineImageSlotPlacementFields(
                    side,
                    developerLogoSlot,
                    'logo',
                  )
                : SPINE_OVERLAY_PLACEMENT_FIELDS}
              logoCandidateDiscovery={logoCandidateDiscovery}
              handleFindLogoCandidates={handleFindLogoCandidates}
              onUseLogoCandidate={(logoKey, candidate) =>
                actions.handleUseSpineLogoCandidate(
                  side,
                  logoKey,
                  candidate,
                )}
              onEnabledChange={(enabled) =>
                actions.handleSpinePrimaryLogoSlotEnabledChange(
                  side,
                  'developer',
                  enabled,
                )}
              onUpload={(event) =>
                actions.handleSpinePrimaryLogoSlotUpload(
                  side,
                  'developer',
                  event,
                )}
              onLayoutChange={(field, value) =>
                actions.handleSpinePrimaryLogoSlotLayoutChange(
                  side,
                  'developer',
                  field,
                  value,
                )}
              onResetLayout={() =>
                actions.handleResetSpinePrimaryLogoSlotLayout(
                  side,
                  'developer',
                )}
              onClearImage={() =>
                actions.handleClearSpinePrimaryLogoSlot(side, 'developer')}
            >
              <EditorFeaturePanel title="Additional developer logos">
                {additionalDeveloperLogoSlots.length === 0 ? (
                  <p className="hint">No additional developer logos.</p>
                ) : null}
                {additionalDeveloperLogoSlots.map((slot, index) => (
                  <SpineGroupedImageSlotControls
                    key={slot.id}
                    side={side}
                    slotKey="logoSlots"
                    slot={slot}
                    uploadId={`${side}-spine-developer-logo-${slot.id}-${index + 1}-upload`}
                    imageSources={imageSources}
                    actions={actions}
                  />
                ))}
                <button
                  className="secondary-button icon-text-button spacing-top"
                  type="button"
                  onClick={() =>
                    actions.handleAddSpineAdditionalLogoSlot(
                      side,
                      'developer',
                    )}
                >
                  <PlusIcon />
                  <span>Add additional logo</span>
                </button>
              </EditorFeaturePanel>
            </CaseInsertLogoSlotControls>

            <CaseInsertLogoSlotControls
              paneId="spine"
              logoKey="publisher"
              slot={publisherLogoSlot}
              uploadId={`${side}-spine-publisher-logo-upload`}
              fields={publisherLogoSlot
                ? getSpineImageSlotPlacementFields(
                    side,
                    publisherLogoSlot,
                    'logo',
                  )
                : SPINE_OVERLAY_PLACEMENT_FIELDS}
              logoCandidateDiscovery={logoCandidateDiscovery}
              handleFindLogoCandidates={handleFindLogoCandidates}
              onUseLogoCandidate={(logoKey, candidate) =>
                actions.handleUseSpineLogoCandidate(
                  side,
                  logoKey,
                  candidate,
                )}
              onEnabledChange={(enabled) =>
                actions.handleSpinePrimaryLogoSlotEnabledChange(
                  side,
                  'publisher',
                  enabled,
                )}
              onUpload={(event) =>
                actions.handleSpinePrimaryLogoSlotUpload(
                  side,
                  'publisher',
                  event,
                )}
              onLayoutChange={(field, value) =>
                actions.handleSpinePrimaryLogoSlotLayoutChange(
                  side,
                  'publisher',
                  field,
                  value,
                )}
              onResetLayout={() =>
                actions.handleResetSpinePrimaryLogoSlotLayout(
                  side,
                  'publisher',
                )}
              onClearImage={() =>
                actions.handleClearSpinePrimaryLogoSlot(side, 'publisher')}
            >
              <EditorFeaturePanel title="Additional publisher logos">
                {additionalPublisherLogoSlots.length === 0 ? (
                  <p className="hint">No additional publisher logos.</p>
                ) : null}
                {additionalPublisherLogoSlots.map((slot, index) => (
                  <SpineGroupedImageSlotControls
                    key={slot.id}
                    side={side}
                    slotKey="logoSlots"
                    slot={slot}
                    uploadId={`${side}-spine-publisher-logo-${slot.id}-${index + 1}-upload`}
                    imageSources={imageSources}
                    actions={actions}
                  />
                ))}
                <button
                  className="secondary-button icon-text-button spacing-top"
                  type="button"
                  onClick={() =>
                    actions.handleAddSpineAdditionalLogoSlot(
                      side,
                      'publisher',
                    )}
                >
                  <PlusIcon />
                  <span>Add additional logo</span>
                </button>
              </EditorFeaturePanel>
            </CaseInsertLogoSlotControls>

            {unassignedAdditionalLogoSlots.length > 0 ? (
              <EditorFeaturePanel title="Unassigned additional logos">
                {unassignedAdditionalLogoSlots.map((slot, index) => (
                  <SpineGroupedImageSlotControls
                    key={slot.id}
                    side={side}
                    slotKey="logoSlots"
                    slot={slot}
                    uploadId={`${side}-spine-logo-${slot.id}-${index + 1}-upload`}
                    imageSources={imageSources}
                    actions={actions}
                  />
                ))}
              </EditorFeaturePanel>
            ) : null}
          </EditorFeaturePanel>
        )
      }}
    />
  )
}
