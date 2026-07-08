import {
  isCaseInsertAdditionalTextBlock,
} from '../../caseInsert/textContent'
import type {
  CaseInsertTemplateControlsProps,
} from './CaseInsertTemplateControls.types'
import {
  CaseInsertTemplateTextControls,
} from './CaseInsertTemplateTextControls'

export function CaseInsertTemplateAdditionalTextControls(
  props: CaseInsertTemplateControlsProps,
) {
  return (
    <CaseInsertTemplateTextControls
      {...props}
      includeTextLists={false}
      textBlockFilter={isCaseInsertAdditionalTextBlock}
    />
  )
}
