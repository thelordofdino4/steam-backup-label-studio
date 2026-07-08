import {
  CaseInsertSpineControlSections,
} from './CaseInsertSpineControlSections'
import type {
  CaseInsertSpineControlsProps,
} from './CaseInsertSpineControls.types'
import {
  SpineGroupedImageSlotSection,
} from './CaseInsertSpineImageSlotControls'

export function CaseInsertSpineAdditionalArtworkControls({
  spine,
  actions,
  imageSources,
}: CaseInsertSpineControlsProps) {
  return (
    <CaseInsertSpineControlSections
      spine={spine}
      renderControls={({ side }) => {
        const state = spine[side]

        return (
          <SpineGroupedImageSlotSection
            side={side}
            featureEnabled={state.additionalArtworkEnabled}
            slots={state.artworkSlots}
            imageSources={imageSources}
            actions={actions}
          />
        )
      }}
    />
  )
}
