import { CaseInsertWorkflowSection } from './CaseInsertWorkflowSection'
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
  CaseInsertTemplateTextControls,
} from './CaseInsertTemplateTextControls'

export function CaseInsertTemplateWorkflowControls(
  props: CaseInsertTemplateControlsProps,
) {
  return (
    <>
      <CaseInsertWorkflowSection title="Text" spacingTop={false}>
        <CaseInsertTemplateTextControls {...props} />
      </CaseInsertWorkflowSection>
    </>
  )
}
