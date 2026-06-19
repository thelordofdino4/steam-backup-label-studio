import type { CaseInsertTemplatePaneId } from './templateSurfaces'
import type { JewelCaseSpineSide } from './types'
import {
  createCaseInsertInlineTextTargetKey,
} from '../editor/previewEditableRegistry.ts'

export type CaseInsertPreviewTextTarget =
  | {
      scope: 'templateTextBlock'
      paneId: CaseInsertTemplatePaneId
      textBlockId: string
    }
  | {
      scope: 'templateTextList'
      paneId: CaseInsertTemplatePaneId
      textListId: string
    }
  | {
      scope: 'spineTitle'
      side: JewelCaseSpineSide
    }
  | {
      scope: 'spineTextBlock'
      side: JewelCaseSpineSide
      textBlockId: string
    }

export function caseInsertPreviewTextTargetsMatch(
  left: CaseInsertPreviewTextTarget | null,
  right: CaseInsertPreviewTextTarget | null,
) {
  if (!left || !right || left.scope !== right.scope) {
    return false
  }

  switch (left.scope) {
    case 'templateTextBlock':
      return right.scope === 'templateTextBlock' &&
        left.paneId === right.paneId &&
        left.textBlockId === right.textBlockId
    case 'templateTextList':
      return right.scope === 'templateTextList' &&
        left.paneId === right.paneId &&
        left.textListId === right.textListId
    case 'spineTitle':
      return right.scope === 'spineTitle' && left.side === right.side
    case 'spineTextBlock':
      return right.scope === 'spineTextBlock' &&
        left.side === right.side &&
        left.textBlockId === right.textBlockId
    default:
      return false
  }
}

export function getCaseInsertPreviewTextTargetKey(
  target: CaseInsertPreviewTextTarget,
) {
  return createCaseInsertInlineTextTargetKey(target)
}
