import { CaseInsertWorkflowSection } from './CaseInsertWorkflowSection'
import {
  CaseInsertSpineBrandingControls,
} from './CaseInsertSpineBrandingControls'
import type {
  CaseInsertSpineControlsProps,
} from './CaseInsertSpineControls.types'

export type {
  CaseInsertSpineControlsProps,
} from './CaseInsertSpineControls.types'

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
      <CaseInsertWorkflowSection
        title="Branding"
        spacingTop={false}
        variant="branding"
      >
        <CaseInsertSpineBrandingControls {...props} />
      </CaseInsertWorkflowSection>
    </>
  )
}
