import {
  isCaseInsertGameDescriptionTextBlock,
} from '../../caseInsert/textContent'
import type {
  CaseInsertTemplateControlsProps,
} from './CaseInsertTemplateControls.types'
import {
  CaseInsertTemplateTextControls,
} from './CaseInsertTemplateTextControls'

export function CaseInsertTemplateGameDescriptionTextControls(
  props: CaseInsertTemplateControlsProps,
) {
  return (
    <CaseInsertTemplateTextControls
      {...props}
      includeTextLists={false}
      textBlockFilter={isCaseInsertGameDescriptionTextBlock}
    />
  )
}
