import type {
  ProjectCaseInsertLayout,
  ProjectCaseInsertTextBlock,
  ProjectCaseInsertTextList,
} from '../project/projectTypes.ts'
import { normalizeTextListItems } from './normalization.ts'
import type { CaseInsertLayoutField } from './types.ts'

export function setCaseInsertTextBlockEnabled(
  textBlock: ProjectCaseInsertTextBlock,
  enabled: boolean,
): ProjectCaseInsertTextBlock {
  return {
    ...textBlock,
    enabled,
  }
}

export function updateCaseInsertTextBlockValue(
  textBlock: ProjectCaseInsertTextBlock,
  value: string,
): ProjectCaseInsertTextBlock {
  return {
    ...textBlock,
    value,
  }
}

export function updateCaseInsertTextBlockLayout(
  textBlock: ProjectCaseInsertTextBlock,
  layout: ProjectCaseInsertLayout,
): ProjectCaseInsertTextBlock {
  return {
    ...textBlock,
    layout,
  }
}

export function updateCaseInsertTextBlockLayoutField(
  textBlock: ProjectCaseInsertTextBlock,
  field: CaseInsertLayoutField,
  value: number,
): ProjectCaseInsertTextBlock {
  return updateCaseInsertTextBlockLayout(textBlock, {
    ...textBlock.layout,
    [field]: value,
  })
}

export function setCaseInsertTextListEnabled(
  textList: ProjectCaseInsertTextList,
  enabled: boolean,
): ProjectCaseInsertTextList {
  return {
    ...textList,
    enabled,
  }
}

export function setCaseInsertTextListItems(
  textList: ProjectCaseInsertTextList,
  items: string[],
): ProjectCaseInsertTextList {
  return {
    ...textList,
    items: normalizeTextListItems(items, textList.items),
  }
}

export function addCaseInsertTextListItem(
  textList: ProjectCaseInsertTextList,
  value = '',
): ProjectCaseInsertTextList {
  return {
    ...textList,
    enabled: true,
    items: [...textList.items, value],
  }
}

export function updateCaseInsertTextListItem(
  textList: ProjectCaseInsertTextList,
  index: number,
  value: string,
): ProjectCaseInsertTextList {
  if (index < 0 || index >= textList.items.length) {
    return textList
  }

  return {
    ...textList,
    items: textList.items.map((item, currentIndex) =>
      currentIndex === index ? value : item,
    ),
  }
}

export function removeCaseInsertTextListItem(
  textList: ProjectCaseInsertTextList,
  index: number,
): ProjectCaseInsertTextList {
  if (index < 0 || index >= textList.items.length) {
    return textList
  }

  return {
    ...textList,
    items: textList.items.filter((_, currentIndex) => currentIndex !== index),
  }
}
