import {
  getEnabledCaseInsertMarkSlotForKind,
} from '../../caseInsert/brandingMarkPlacement'
import {
  getCaseInsertSpineMarkPlacementFields,
} from '../../caseInsert/brandingMarkPlacementFields'
import type { JewelCaseSpineSide } from '../../caseInsert/types'
import type { JewelCaseSpineEditorActions } from '../../hooks/useJewelCaseSpineEditor'
import type { ProjectCaseInsertImageSlot } from '../../project/projectTypes'
import { EditorFeaturePanel } from '../editor/EditorPanel'
import {
  CaseInsertMediaMarkSetupControls,
} from './CaseInsertBrandingSetupControls'
import { CaseInsertMarkPlacementControls } from './CaseInsertMarkPlacementControls'
import {
  CaseInsertSpineControlSections,
} from './CaseInsertSpineControlSections'
import type {
  CaseInsertSpineControlsProps,
} from './CaseInsertSpineControls.types'

function SpineMediaMarkPlacementControls({
  side,
  slot,
  actions,
}: {
  side: JewelCaseSpineSide
  slot: ProjectCaseInsertImageSlot | null
  actions: JewelCaseSpineEditorActions
}) {
  return (
    <CaseInsertMarkPlacementControls
      fields={slot ? getCaseInsertSpineMarkPlacementFields(side, slot) : []}
      idPrefix={`${side}-spine-media-mark`}
      slot={slot}
      resetLabel="Reset media mark layout"
      onLayoutChange={(field, value) => {
        if (!slot) return
        actions.handleSpineGroupedImageSlotLayoutChange(
          side,
          'markSlots',
          slot.id,
          field,
          value,
        )
      }}
      onResetLayout={() => {
        if (!slot) return
        actions.handleResetSpineGroupedImageSlotLayout(
          side,
          'markSlots',
          slot.id,
        )
      }}
    />
  )
}

export function CaseInsertSpineOptionalMediaFormatTypeControls({
  spine,
  actions,
  getBrandingControls,
}: CaseInsertSpineControlsProps) {
  return (
    <CaseInsertSpineControlSections
      spine={spine}
      renderControls={({ side }) => {
        const state = spine[side]
        const brandingControls = getBrandingControls(
          { type: 'spine', side },
          state,
        )

        return (
          <EditorFeaturePanel title="Media format mark" variant="branding">
            <CaseInsertMediaMarkSetupControls
              {...brandingControls}
              idPrefix={`${side}-spine-media`}
            >
              <SpineMediaMarkPlacementControls
                side={side}
                slot={getEnabledCaseInsertMarkSlotForKind(
                  state.markSlots,
                  'media',
                )}
                actions={actions}
              />
            </CaseInsertMediaMarkSetupControls>
          </EditorFeaturePanel>
        )
      }}
    />
  )
}
