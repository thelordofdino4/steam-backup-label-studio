import type {
  ProjectCaseInsertTextBlock,
} from '../../project/projectTypes'
import type {
  CaseInsertTemplateControlsProps,
} from './CaseInsertTemplateControls.types'
import {
  CaseInsertTemplateTextControls,
} from './CaseInsertTemplateTextControls'

function isTemplateGameTitleTextBlock(
  paneId: CaseInsertTemplateControlsProps['paneId'],
  textBlock: ProjectCaseInsertTextBlock,
) {
  return textBlock.id === `${paneId}-title-text`
}

export function CaseInsertTemplateGameTitleTextControls(
  props: CaseInsertTemplateControlsProps,
) {
  return (
    <CaseInsertTemplateTextControls
      {...props}
      includeTextLists={false}
      textBlockFilter={(textBlock) =>
        isTemplateGameTitleTextBlock(props.paneId, textBlock)}
    />
  )
}

