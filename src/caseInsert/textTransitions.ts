import type {
  ProjectCaseInsertLayout,
  ProjectCaseInsertTextBlock,
  ProjectCaseInsertTextList,
  ProjectCaseInsertTextSource,
} from '../project/projectTypes.ts'
import { normalizeTextListItems } from './normalization.ts'
import {
  applyCaseInsertTextBlockLayoutPreset,
  applyCaseInsertTextListLayoutPreset,
  type CaseInsertTextLayoutSurface,
} from './textLayout.ts'
import {
  applyCaseInsertTextStylePreset,
  getCaseInsertTextBlockStyleRole,
  getCaseInsertTextListStyleRole,
  resetCaseInsertTextStyle,
  updateCaseInsertTextStyleField,
  type CaseInsertTextStyleField,
  type CaseInsertTextStyleValue,
} from './textStyles.ts'
import type { CaseInsertLayoutField, CaseInsertLayoutPoint } from './types.ts'

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
  source: ProjectCaseInsertTextSource = textBlock.source,
): ProjectCaseInsertTextBlock {
  return {
    ...textBlock,
    value,
    source,
  }
}

export function setCaseInsertTextBlockAvoidVisualElements(
  textBlock: ProjectCaseInsertTextBlock,
  avoidVisualElements: boolean,
): ProjectCaseInsertTextBlock {
  return {
    ...textBlock,
    avoidVisualElements,
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

export function updateCaseInsertTextBlockLayoutPosition(
  textBlock: ProjectCaseInsertTextBlock,
  point: CaseInsertLayoutPoint,
): ProjectCaseInsertTextBlock {
  return updateCaseInsertTextBlockLayout(textBlock, {
    ...textBlock.layout,
    x: point.x,
    y: point.y,
  })
}

export function applyCaseInsertTextBlockPresetLayout(
  surface: CaseInsertTextLayoutSurface,
  textBlock: ProjectCaseInsertTextBlock,
  presetId: string,
): ProjectCaseInsertTextBlock {
  return applyCaseInsertTextBlockLayoutPreset(surface, textBlock, presetId)
}

export function updateCaseInsertTextBlockStyleField(
  textBlock: ProjectCaseInsertTextBlock,
  field: CaseInsertTextStyleField,
  value: CaseInsertTextStyleValue,
): ProjectCaseInsertTextBlock {
  return {
    ...textBlock,
    style: updateCaseInsertTextStyleField(
      getCaseInsertTextBlockStyleRole(textBlock),
      textBlock.style,
      field,
      value,
    ),
  }
}

export function applyCaseInsertTextBlockStylePreset(
  textBlock: ProjectCaseInsertTextBlock,
  presetId: string,
): ProjectCaseInsertTextBlock {
  return {
    ...textBlock,
    style: applyCaseInsertTextStylePreset(
      getCaseInsertTextBlockStyleRole(textBlock),
      textBlock.style,
      presetId,
    ),
  }
}

export function resetCaseInsertTextBlockStyle(
  textBlock: ProjectCaseInsertTextBlock,
): ProjectCaseInsertTextBlock {
  return {
    ...textBlock,
    style: resetCaseInsertTextStyle(
      getCaseInsertTextBlockStyleRole(textBlock),
    ),
  }
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

export function setCaseInsertTextListAvoidVisualElements(
  textList: ProjectCaseInsertTextList,
  avoidVisualElements: boolean,
): ProjectCaseInsertTextList {
  return {
    ...textList,
    avoidVisualElements,
  }
}

export function updateCaseInsertTextListLayout(
  textList: ProjectCaseInsertTextList,
  layout: ProjectCaseInsertLayout,
): ProjectCaseInsertTextList {
  return {
    ...textList,
    layout,
  }
}

export function updateCaseInsertTextListLayoutPosition(
  textList: ProjectCaseInsertTextList,
  point: CaseInsertLayoutPoint,
): ProjectCaseInsertTextList {
  return updateCaseInsertTextListLayout(textList, {
    ...textList.layout,
    x: point.x,
    y: point.y,
  })
}

export function applyCaseInsertTextListPresetLayout(
  surface: Extract<CaseInsertTextLayoutSurface, 'cover' | 'tray'>,
  textList: ProjectCaseInsertTextList,
  presetId: string,
): ProjectCaseInsertTextList {
  return applyCaseInsertTextListLayoutPreset(surface, textList, presetId)
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

export function updateCaseInsertTextListStyleField(
  textList: ProjectCaseInsertTextList,
  field: CaseInsertTextStyleField,
  value: CaseInsertTextStyleValue,
): ProjectCaseInsertTextList {
  return {
    ...textList,
    style: updateCaseInsertTextStyleField(
      getCaseInsertTextListStyleRole(textList),
      textList.style,
      field,
      value,
    ),
  }
}

export function applyCaseInsertTextListStylePreset(
  textList: ProjectCaseInsertTextList,
  presetId: string,
): ProjectCaseInsertTextList {
  return {
    ...textList,
    style: applyCaseInsertTextStylePreset(
      getCaseInsertTextListStyleRole(textList),
      textList.style,
      presetId,
    ),
  }
}

export function resetCaseInsertTextListStyle(
  textList: ProjectCaseInsertTextList,
): ProjectCaseInsertTextList {
  return {
    ...textList,
    style: resetCaseInsertTextStyle(
      getCaseInsertTextListStyleRole(textList),
    ),
  }
}
