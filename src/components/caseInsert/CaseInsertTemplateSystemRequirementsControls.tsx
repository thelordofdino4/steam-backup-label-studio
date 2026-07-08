import {
  isCaseInsertSystemRequirementsTextBlock,
} from '../../caseInsert/textContent'
import type {
  CaseInsertTemplateControlsProps,
} from './CaseInsertTemplateControls.types'
import {
  CaseInsertTemplateTextControls,
} from './CaseInsertTemplateTextControls'

export function CaseInsertTemplateSystemRequirementsControls(
  props: CaseInsertTemplateControlsProps,
) {
  return (
    <CaseInsertTemplateTextControls
      {...props}
      includeTextLists={false}
      textBlockFilter={isCaseInsertSystemRequirementsTextBlock}
    />
  )
}
