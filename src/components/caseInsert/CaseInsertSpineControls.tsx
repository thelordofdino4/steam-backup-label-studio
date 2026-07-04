import { CaseInsertWorkflowSection } from './CaseInsertWorkflowSection'
import {
  CaseInsertSpineArtworkControls,
} from './CaseInsertSpineArtworkControls'
import {
  CaseInsertSpineBrandingControls,
} from './CaseInsertSpineBrandingControls'
import {
  CaseInsertSpineTextControls,
} from './CaseInsertSpineTextControls'
import type {
  CaseInsertSpineControlsProps,
} from './CaseInsertSpineControls.types'

export type {
  CaseInsertSpineControlsProps,
} from './CaseInsertSpineControls.types'

export {
  CaseInsertSpineArtworkControls,
} from './CaseInsertSpineArtworkControls'
export {
  CaseInsertSpineBrandingControls,
} from './CaseInsertSpineBrandingControls'
export {
  CaseInsertSpineTextControls,
} from './CaseInsertSpineTextControls'

export function CaseInsertSpineWorkflowControls(
  props: CaseInsertSpineControlsProps,
) {
  return (
    <>
      <CaseInsertWorkflowSection title="Artwork" spacingTop={false}>
        <CaseInsertSpineArtworkControls {...props} />
      </CaseInsertWorkflowSection>
      <CaseInsertWorkflowSection title="Branding" variant="branding">
        <CaseInsertSpineBrandingControls {...props} />
      </CaseInsertWorkflowSection>
      <CaseInsertWorkflowSection title="Text">
        <CaseInsertSpineTextControls {...props} />
      </CaseInsertWorkflowSection>
    </>
  )
}
