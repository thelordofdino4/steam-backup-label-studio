import {
  isCaseInsertLegalTextBlock,
} from '../../caseInsert/textContent'
import type {
  CaseInsertSpineControlsProps,
} from './CaseInsertSpineControls.types'
import {
  CaseInsertSpineTextControls,
} from './CaseInsertSpineTextControls'

export function CaseInsertSpineLegalInfoControls(
  props: CaseInsertSpineControlsProps,
) {
  return (
    <CaseInsertSpineTextControls
      {...props}
      includeTitle={false}
      textBlockFilter={isCaseInsertLegalTextBlock}
    />
  )
}
