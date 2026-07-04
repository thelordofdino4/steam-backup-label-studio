import {
  CASE_INSERT_TRAY_DEFAULT_DISC_TEXT_LAYOUTS,
  CASE_INSERT_TRAY_DEFAULT_STEAM_TEXT_BLOCK_LAYOUTS,
  CASE_INSERT_TRAY_DEFAULT_STEAM_TEXT_LIST_LAYOUTS,
} from './defaultImportLayouts.ts'
import {
  getCanonicalCaseInsertTextBlockId,
} from './textContent.ts'
import {
  addCaseInsertTextListItem,
  applyCaseInsertTextListPresetLayout,
  applyCaseInsertTextListStylePreset,
  removeCaseInsertTextListItem,
  resetCaseInsertTextListStyle,
  setCaseInsertTextListAvoidVisualElements,
  setCaseInsertTextListEnabled,
  updateCaseInsertTextListItem,
  updateCaseInsertTextListStyleField,
} from './textTransitions.ts'
import {
  updateCaseInsertTemplateTextList,
} from './templateSurfaceTransitions.ts'
import type {
  CaseInsertTemplatePaneId,
} from './templateSurfaces.ts'
import type {
  CaseInsertTextStyleField,
  CaseInsertTextStyleValue,
} from './textStyles.ts'
import type {
  ProjectCaseInsertLayout,
  ProjectCaseInsertTextAlign,
  ProjectCaseInsertTextBlock,
  ProjectCaseInsertTextList,
  ProjectJewelCaseState,
} from '../project/projectTypes.ts'

const defaultCaseInsertTemplateTextBlockLayouts: Record<
  string,
  ProjectCaseInsertLayout
> = {
  'cover-title-text': { scale: 1, width: 80, x: 50, y: 34, rotation: 0 },
  'cover-subtitle-text': { scale: 1, width: 72, x: 50, y: 45, rotation: 0 },
  'cover-disc-number': { scale: 0.9, width: 42, x: 18, y: 82, rotation: 0 },
  'cover-backup-date': { scale: 0.86, width: 48, x: 50, y: 86, rotation: 0 },
  'cover-steam-app-id': { scale: 0.82, width: 48, x: 82, y: 82, rotation: 0 },
  'cover-developer-text': { scale: 0.84, width: 48, x: 22, y: 88, rotation: 0 },
  'cover-publisher-text': { scale: 0.84, width: 48, x: 78, y: 88, rotation: 0 },
  'cover-install-notes': { scale: 0.9, width: 58, x: 50, y: 74, rotation: 0 },
  'cover-custom-note': { scale: 1, width: 74, x: 50, y: 82, rotation: 0 },
  'cover-copyright-text': { scale: 1, width: 86, x: 50, y: 93, rotation: 0 },
  'tray-title-text': CASE_INSERT_TRAY_DEFAULT_DISC_TEXT_LAYOUTS.title.layout,
  'tray-subtitle-text': CASE_INSERT_TRAY_DEFAULT_DISC_TEXT_LAYOUTS.subtitle.layout,
  'tray-disc-number': CASE_INSERT_TRAY_DEFAULT_DISC_TEXT_LAYOUTS.discNumber.layout,
  'tray-backup-date': CASE_INSERT_TRAY_DEFAULT_DISC_TEXT_LAYOUTS.backupDate.layout,
  'tray-steam-app-id': CASE_INSERT_TRAY_DEFAULT_DISC_TEXT_LAYOUTS.appId.layout,
  'tray-developer-text': CASE_INSERT_TRAY_DEFAULT_DISC_TEXT_LAYOUTS.developer.layout,
  'tray-publisher-text': CASE_INSERT_TRAY_DEFAULT_DISC_TEXT_LAYOUTS.publisher.layout,
  'tray-install-notes': CASE_INSERT_TRAY_DEFAULT_DISC_TEXT_LAYOUTS.installNotes.layout,
  'tray-custom-note': CASE_INSERT_TRAY_DEFAULT_DISC_TEXT_LAYOUTS.customNote.layout,
  'tray-copyright-text': CASE_INSERT_TRAY_DEFAULT_DISC_TEXT_LAYOUTS.copyright.layout,
  'tray-description':
    CASE_INSERT_TRAY_DEFAULT_STEAM_TEXT_BLOCK_LAYOUTS['tray-description'].layout,
  'tray-minimum-requirements':
    CASE_INSERT_TRAY_DEFAULT_STEAM_TEXT_BLOCK_LAYOUTS[
      'tray-minimum-requirements'
    ].layout,
  'tray-recommended-requirements':
    CASE_INSERT_TRAY_DEFAULT_STEAM_TEXT_BLOCK_LAYOUTS[
      'tray-recommended-requirements'
    ].layout,
}

const defaultCaseInsertTemplateTextListLayouts: Record<
  string,
  ProjectCaseInsertLayout
> = {
  'tray-feature-bullets':
    CASE_INSERT_TRAY_DEFAULT_STEAM_TEXT_LIST_LAYOUTS['tray-feature-bullets'].layout,
}

export function getDefaultCaseInsertTemplateTextBlockLayout(
  textBlockId: string,
) {
  return defaultCaseInsertTemplateTextBlockLayouts[
    getCanonicalCaseInsertTextBlockId(textBlockId)
  ]
}

export function getDefaultCaseInsertTemplateTextListLayout(
  textListId: string,
) {
  return defaultCaseInsertTemplateTextListLayouts[textListId]
}

export function setCaseInsertTemplateTextBlockAlign(
  textBlock: ProjectCaseInsertTextBlock,
  align: ProjectCaseInsertTextAlign,
): ProjectCaseInsertTextBlock {
  return {
    ...textBlock,
    align,
  }
}

export function resetCaseInsertTemplateTextBlockLayout(
  textBlock: ProjectCaseInsertTextBlock,
  layout: ProjectCaseInsertLayout,
): ProjectCaseInsertTextBlock {
  return {
    ...textBlock,
    layout,
  }
}

export function updateCaseInsertTemplateTextListLayoutField(
  textList: ProjectCaseInsertTextList,
  field: keyof ProjectCaseInsertLayout,
  value: number,
): ProjectCaseInsertTextList {
  return {
    ...textList,
    layout: {
      ...textList.layout,
      [field]: value,
    },
  }
}

export function resetCaseInsertTemplateTextListLayout(
  textList: ProjectCaseInsertTextList,
  layout: ProjectCaseInsertLayout,
): ProjectCaseInsertTextList {
  return {
    ...textList,
    layout,
  }
}

export function setCaseInsertTemplateTextListEnabled(
  state: ProjectJewelCaseState,
  paneId: CaseInsertTemplatePaneId,
  textListId: string,
  enabled: boolean,
) {
  return updateCaseInsertTemplateTextList(
    state,
    paneId,
    textListId,
    (textList) => setCaseInsertTextListEnabled(textList, enabled),
  )
}

export function addCaseInsertTemplateTextListItem(
  state: ProjectJewelCaseState,
  paneId: CaseInsertTemplatePaneId,
  textListId: string,
) {
  return updateCaseInsertTemplateTextList(
    state,
    paneId,
    textListId,
    addCaseInsertTextListItem,
  )
}

export function updateCaseInsertTemplateTextListItemValue(
  state: ProjectJewelCaseState,
  paneId: CaseInsertTemplatePaneId,
  textListId: string,
  index: number,
  value: string,
) {
  return updateCaseInsertTemplateTextList(
    state,
    paneId,
    textListId,
    (textList) => updateCaseInsertTextListItem(textList, index, value),
  )
}

export function setCaseInsertTemplateTextListAvoidVisualElements(
  state: ProjectJewelCaseState,
  paneId: CaseInsertTemplatePaneId,
  textListId: string,
  avoidVisualElements: boolean,
) {
  return updateCaseInsertTemplateTextList(
    state,
    paneId,
    textListId,
    (textList) => setCaseInsertTextListAvoidVisualElements(
      textList,
      avoidVisualElements,
    ),
  )
}

export function removeCaseInsertTemplateTextListItem(
  state: ProjectJewelCaseState,
  paneId: CaseInsertTemplatePaneId,
  textListId: string,
  index: number,
) {
  return updateCaseInsertTemplateTextList(
    state,
    paneId,
    textListId,
    (textList) => removeCaseInsertTextListItem(textList, index),
  )
}

export function updateCaseInsertTemplateTextListLayoutValue(
  state: ProjectJewelCaseState,
  paneId: CaseInsertTemplatePaneId,
  textListId: string,
  field: keyof ProjectCaseInsertLayout,
  value: number,
) {
  return updateCaseInsertTemplateTextList(
    state,
    paneId,
    textListId,
    (textList) =>
      updateCaseInsertTemplateTextListLayoutField(textList, field, value),
  )
}

export function applyCaseInsertTemplateTextListLayoutPreset(
  state: ProjectJewelCaseState,
  paneId: CaseInsertTemplatePaneId,
  textListId: string,
  presetId: string,
) {
  return updateCaseInsertTemplateTextList(
    state,
    paneId,
    textListId,
    (textList) =>
      applyCaseInsertTextListPresetLayout(paneId, textList, presetId),
  )
}

export function resetCaseInsertTemplateTextListDefaultLayout(
  state: ProjectJewelCaseState,
  paneId: CaseInsertTemplatePaneId,
  textListId: string,
) {
  const layout = getDefaultCaseInsertTemplateTextListLayout(textListId)

  if (!layout) {
    return state
  }

  return updateCaseInsertTemplateTextList(
    state,
    paneId,
    textListId,
    (textList) => resetCaseInsertTemplateTextListLayout(textList, layout),
  )
}

export function updateCaseInsertTemplateTextListStyleValue(
  state: ProjectJewelCaseState,
  paneId: CaseInsertTemplatePaneId,
  textListId: string,
  field: CaseInsertTextStyleField,
  value: CaseInsertTextStyleValue,
) {
  return updateCaseInsertTemplateTextList(
    state,
    paneId,
    textListId,
    (textList) =>
      updateCaseInsertTextListStyleField(textList, field, value),
  )
}

export function applyCaseInsertTemplateTextListStylePreset(
  state: ProjectJewelCaseState,
  paneId: CaseInsertTemplatePaneId,
  textListId: string,
  presetId: string,
) {
  return updateCaseInsertTemplateTextList(
    state,
    paneId,
    textListId,
    (textList) =>
      applyCaseInsertTextListStylePreset(textList, presetId),
  )
}

export function resetCaseInsertTemplateTextListDefaultStyle(
  state: ProjectJewelCaseState,
  paneId: CaseInsertTemplatePaneId,
  textListId: string,
) {
  return updateCaseInsertTemplateTextList(
    state,
    paneId,
    textListId,
    resetCaseInsertTextListStyle,
  )
}
