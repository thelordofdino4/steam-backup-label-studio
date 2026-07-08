import {
  isCaseInsertAdditionalTextBlock,
} from '../../caseInsert/textContent'
import type {
  CaseInsertSpineControlsProps,
} from './CaseInsertSpineControls.types'
import {
  CaseInsertSpineTextControls,
} from './CaseInsertSpineTextControls'

export function CaseInsertSpineAdditionalTextControls(
  props: CaseInsertSpineControlsProps,
) {
  return (
    <CaseInsertSpineTextControls
      {...props}
      includeTitle={false}
      textBlockFilter={isCaseInsertAdditionalTextBlock}
    />
  )
}
