import {
  isCaseInsertLegalTextBlock,
} from '../../caseInsert/textContent'
import type {
  CaseInsertTemplateControlsProps,
} from './CaseInsertTemplateControls.types'
import {
  CaseInsertTemplateTextControls,
} from './CaseInsertTemplateTextControls'

export function CaseInsertTemplateLegalInfoControls(
  props: CaseInsertTemplateControlsProps,
) {
  return (
    <CaseInsertTemplateTextControls
      {...props}
      includeTextLists={false}
      textBlockFilter={isCaseInsertLegalTextBlock}
    />
  )
}
