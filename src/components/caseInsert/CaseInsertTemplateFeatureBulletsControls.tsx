import {
  isCaseInsertFeatureBulletsTextList,
} from '../../caseInsert/textContent'
import type {
  CaseInsertTemplateControlsProps,
} from './CaseInsertTemplateControls.types'
import {
  CaseInsertTemplateTextControls,
} from './CaseInsertTemplateTextControls'

export function CaseInsertTemplateFeatureBulletsControls(
  props: CaseInsertTemplateControlsProps,
) {
  return (
    <CaseInsertTemplateTextControls
      {...props}
      textBlockFilter={() => false}
      textListFilter={isCaseInsertFeatureBulletsTextList}
    />
  )
}
