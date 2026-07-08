import {
  CaseInsertSpineControlSections,
} from './CaseInsertSpineControlSections'
import type {
  CaseInsertSpineControlsProps,
} from './CaseInsertSpineControls.types'
import {
  SpineImageSlotControls,
} from './CaseInsertSpineImageSlotControls'

export function CaseInsertSpineBackgroundArtworkControls({
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
          <SpineImageSlotControls
            side={side}
            slotKey="background"
            slot={state.background}
            title={`${label} background`}
            enableLabel="Show background image"
            uploadId={`${side}-spine-background-upload`}
            isBackground
            imageSources={imageSources}
            actions={actions}
          />
        )
      }}
    />
  )
}
