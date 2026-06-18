import type {
  ContextualTextControlId,
} from '../text/contextualTextControlViewModel.ts'
import {
  getContextualTextTargetCapability,
  hasContextualTextControlEquivalent,
  isContextualTextControlSupportedForTarget,
} from '../text/contextualTextControlViewModel.ts'

const CASE_INSERT_TEXT_TARGET_ID = 'caseInsertRectangularText'

export function getCaseInsertTextSidebarTargetCapability() {
  return getContextualTextTargetCapability(CASE_INSERT_TEXT_TARGET_ID)
}

export function shouldShowCaseInsertTextSidebarControl(
  controlId: ContextualTextControlId,
) {
  const target = getCaseInsertTextSidebarTargetCapability()

  if (!target.supportsContextualEditor) {
    return true
  }

  if (!hasContextualTextControlEquivalent(controlId)) {
    return true
  }

  return !isContextualTextControlSupportedForTarget(
    CASE_INSERT_TEXT_TARGET_ID,
    controlId,
  )
}
