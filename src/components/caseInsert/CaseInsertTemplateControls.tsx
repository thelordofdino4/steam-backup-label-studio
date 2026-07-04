import { CaseInsertWorkflowSection } from './CaseInsertWorkflowSection'
import {
  CaseInsertTemplateArtworkControls,
} from './CaseInsertTemplateArtworkControls'
import {
  CaseInsertTemplateBrandingControls,
} from './CaseInsertTemplateBrandingControls'
import {
  CaseInsertTemplateTextControls,
} from './CaseInsertTemplateTextControls'
import type {
  CaseInsertTemplateControlsProps,
} from './CaseInsertTemplateControls.types'

export type {
  CaseInsertTemplateControlsProps,
} from './CaseInsertTemplateControls.types'

export {
  CaseInsertTemplateArtworkControls,
} from './CaseInsertTemplateArtworkControls'
export {
  CaseInsertTemplateBrandingControls,
} from './CaseInsertTemplateBrandingControls'
export {
  CaseInsertTemplateTextControls,
} from './CaseInsertTemplateTextControls'

export function CaseInsertTemplateWorkflowControls(
  props: CaseInsertTemplateControlsProps,
) {
  return (
    <>
      <CaseInsertWorkflowSection title="Artwork" spacingTop={false}>
        <CaseInsertTemplateArtworkControls {...props} />
      </CaseInsertWorkflowSection>
      <CaseInsertWorkflowSection title="Branding" variant="branding">
        <CaseInsertTemplateBrandingControls {...props} />
      </CaseInsertWorkflowSection>
      <CaseInsertWorkflowSection title="Text">
        <CaseInsertTemplateTextControls {...props} />
      </CaseInsertWorkflowSection>
    </>
  )
}
