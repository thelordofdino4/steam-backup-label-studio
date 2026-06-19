import type {
  ProjectCaseInsertLayout,
  ProjectCaseInsertTextAlign,
  ProjectCaseInsertTextList,
  ProjectJewelCaseState,
  ProjectMetadata,
} from '../project/projectTypes.ts'
import {
  getJewelCaseSpineSideScopedId,
  updateProjectJewelCaseSpineSides,
} from './jewelCaseTransitions.ts'
import type { CaseInsertPreviewTextTarget } from './previewTextSelection.ts'
import {
  updateCaseInsertTemplateTextBlock,
  updateCaseInsertTemplateTextList,
} from './templateSurfaceTransitions.ts'
import {
  applyCaseInsertTextBlockStylePreset,
  applyCaseInsertTextBlockPresetLayout,
  applyCaseInsertTextListPresetLayout,
  applyCaseInsertTextListStylePreset,
  resetCaseInsertTextBlockStyle,
  resetCaseInsertTextListStyle,
  setCaseInsertTextBlockAvoidVisualElements,
  setCaseInsertTextBlockEnabled,
  setCaseInsertTextListAvoidVisualElements,
  setCaseInsertTextListEnabled,
  updateCaseInsertTextBlockLayoutField,
  updateCaseInsertTextBlockContentMode,
  updateCaseInsertTextBlockStyleField,
  updateCaseInsertTextListContentMode,
  updateCaseInsertTextListStyleField,
} from './textTransitions.ts'
import {
  getCaseInsertPreviewTextEditValue,
  getCaseInsertPreviewTextListEditValue,
} from './previewTextEditing.ts'
import type {
  CaseInsertTextStyleField,
  CaseInsertTextStyleValue,
} from './textStyles.ts'
import {
  getCaseInsertTextBlockStyleRole,
  getCaseInsertTextStyleRoleBaseFontWeight,
} from './textStyles.ts'
import {
  getHtmlSource,
  isHtmlTextEnabled,
  type TextContentMode,
} from '../text/htmlText.ts'
import {
  applyRichTextInlineColorCommand,
  applyRichTextInlineToggleCommand,
  getRichTextInlineToggleState,
  getRichTextSelectionColorState,
  type PlainTextSelectionRange,
  type RichTextAmbientInlineStyle,
  type RichTextInlineToggleCommand,
  type RichTextSelectionColorState,
  type RichTextSelectionStyleState,
} from '../text/richTextCommands.ts'

type CaseInsertLayoutField = keyof ProjectCaseInsertLayout
export type CaseInsertPreviewRichTextCommand =
  | RichTextInlineToggleCommand
  | 'color'

export type CaseInsertPreviewRichTextState =
  | RichTextSelectionStyleState
  | RichTextSelectionColorState

function updateSpinePreviewTextBlock(
  caseInsert: ProjectJewelCaseState,
  target: Extract<CaseInsertPreviewTextTarget, { scope: 'spineTextBlock' }>,
  updater: (
    textBlock: ProjectJewelCaseState['spine']['left']['textBlocks'][number],
  ) => ProjectJewelCaseState['spine']['left']['textBlocks'][number],
) {
  return updateProjectJewelCaseSpineSides(
    caseInsert,
    target.side,
    (spineSide, side) => {
      const targetTextBlockId = getJewelCaseSpineSideScopedId(
        side,
        target.textBlockId,
      )

      return {
        ...spineSide,
        textBlocks: spineSide.textBlocks.map((textBlock) =>
          textBlock.id === targetTextBlockId
            ? updater(textBlock)
            : textBlock),
      }
    },
  )
}

export function setCaseInsertPreviewTextTargetEnabled(
  caseInsert: ProjectJewelCaseState,
  target: CaseInsertPreviewTextTarget,
  enabled: boolean,
) {
  switch (target.scope) {
    case 'templateTextBlock':
      return updateCaseInsertTemplateTextBlock(
        caseInsert,
        target.paneId,
        target.textBlockId,
        (textBlock) => setCaseInsertTextBlockEnabled(textBlock, enabled),
      )
    case 'templateTextList':
      return updateCaseInsertTemplateTextList(
        caseInsert,
        target.paneId,
        target.textListId,
        (textList) => setCaseInsertTextListEnabled(textList, enabled),
      )
    case 'spineTitle':
      return updateProjectJewelCaseSpineSides(
        caseInsert,
        target.side,
        (spineSide) => ({
          ...spineSide,
          title: setCaseInsertTextBlockEnabled(spineSide.title, enabled),
        }),
      )
    case 'spineTextBlock':
      return updateSpinePreviewTextBlock(
        caseInsert,
        target,
        (textBlock) => setCaseInsertTextBlockEnabled(textBlock, enabled),
      )
  }
}

export function updateCaseInsertPreviewTextTargetStyleField(
  caseInsert: ProjectJewelCaseState,
  target: CaseInsertPreviewTextTarget,
  field: CaseInsertTextStyleField,
  value: CaseInsertTextStyleValue,
) {
  switch (target.scope) {
    case 'templateTextBlock':
      return updateCaseInsertTemplateTextBlock(
        caseInsert,
        target.paneId,
        target.textBlockId,
        (textBlock) =>
          updateCaseInsertTextBlockStyleField(textBlock, field, value),
      )
    case 'templateTextList':
      return updateCaseInsertTemplateTextList(
        caseInsert,
        target.paneId,
        target.textListId,
        (textList) =>
          updateCaseInsertTextListStyleField(textList, field, value),
      )
    case 'spineTitle':
      return updateProjectJewelCaseSpineSides(
        caseInsert,
        target.side,
        (spineSide) => ({
          ...spineSide,
          title: updateCaseInsertTextBlockStyleField(
            spineSide.title,
            field,
            value,
          ),
        }),
      )
    case 'spineTextBlock':
      return updateSpinePreviewTextBlock(
        caseInsert,
        target,
        (textBlock) =>
          updateCaseInsertTextBlockStyleField(textBlock, field, value),
      )
  }
}

function getTextBlockRichTextCommandSource(
  textBlock: ProjectJewelCaseState['spine']['left']['title'],
  metadata?: ProjectMetadata,
) {
  const fallbackText = getCaseInsertPreviewTextEditValue(textBlock, metadata)
  const normalFontWeight = getCaseInsertTextStyleRoleBaseFontWeight(
    getCaseInsertTextBlockStyleRole(textBlock),
  )

  return {
    ambientStyle: getRichTextAmbientStyle(
      textBlock.style,
      normalFontWeight,
    ),
    fallbackText,
    htmlSource: isHtmlTextEnabled(textBlock)
      ? getHtmlSource(textBlock, fallbackText)
      : undefined,
  }
}

function getRichTextAmbientStyle(
  style: ProjectJewelCaseState['spine']['left']['title']['style'],
  normalFontWeight: number,
): RichTextAmbientInlineStyle {
  return {
    bold: style.bold,
    boldFontWeight: 900,
    color: style.color,
    italic: style.italic,
    normalFontWeight,
    underline: style.underline,
  }
}

function applyRichTextCommandToTextBlock(
  textBlock: ProjectJewelCaseState['spine']['left']['title'],
  command: CaseInsertPreviewRichTextCommand,
  selection: PlainTextSelectionRange | undefined,
  value: boolean | string,
  metadata?: ProjectMetadata,
) {
  const source = getTextBlockRichTextCommandSource(textBlock, metadata)
  const result = command === 'color'
    ? applyRichTextInlineColorCommand({
        ...source,
        color: String(value),
        selection,
      })
    : applyRichTextInlineToggleCommand({
        ...source,
        active: Boolean(value),
        command,
        selection,
      })

  if (!result) {
    return textBlock
  }

  return {
    ...textBlock,
    contentMode: 'html' as const,
    htmlSource: result.htmlSource,
    markdownSource: undefined,
    source: 'manual' as const,
    value: result.plainText,
  }
}

function applyRichTextCommandToTextList(
  textList: ProjectCaseInsertTextList,
  command: CaseInsertPreviewRichTextCommand,
  selection: PlainTextSelectionRange | undefined,
  value: boolean | string,
) {
  const fallbackText = getCaseInsertPreviewTextListEditValue(textList)
  const source = {
    ambientStyle: getRichTextAmbientStyle(
      textList.style,
      600,
    ),
    fallbackText,
    htmlSource: isHtmlTextEnabled(textList)
      ? getHtmlSource(textList, fallbackText)
      : undefined,
  }
  const result = command === 'color'
    ? applyRichTextInlineColorCommand({
        ...source,
        color: String(value),
        selection,
      })
    : applyRichTextInlineToggleCommand({
        ...source,
        active: Boolean(value),
        command,
        selection,
      })

  if (!result) {
    return textList
  }

  return updateCaseInsertTextListContentMode(
    {
      ...textList,
      htmlSource: result.htmlSource,
      markdownSource: undefined,
    },
    'html',
    result.htmlSource,
  )
}

export function updateCaseInsertPreviewTextTargetRichTextCommand(
  caseInsert: ProjectJewelCaseState,
  target: CaseInsertPreviewTextTarget,
  command: CaseInsertPreviewRichTextCommand,
  selection: PlainTextSelectionRange | undefined,
  value: boolean | string,
  metadata?: ProjectMetadata,
) {
  switch (target.scope) {
    case 'templateTextBlock':
      return updateCaseInsertTemplateTextBlock(
        caseInsert,
        target.paneId,
        target.textBlockId,
        (textBlock) =>
          applyRichTextCommandToTextBlock(
            textBlock,
            command,
            selection,
            value,
            metadata,
          ),
      )
    case 'templateTextList':
      return updateCaseInsertTemplateTextList(
        caseInsert,
        target.paneId,
        target.textListId,
        (textList) =>
          applyRichTextCommandToTextList(textList, command, selection, value),
      )
    case 'spineTitle':
      return updateProjectJewelCaseSpineSides(
        caseInsert,
        target.side,
        (spineSide) => ({
          ...spineSide,
          title: applyRichTextCommandToTextBlock(
            spineSide.title,
            command,
            selection,
            value,
            metadata,
          ),
        }),
      )
    case 'spineTextBlock':
      return updateSpinePreviewTextBlock(
        caseInsert,
        target,
        (textBlock) =>
          applyRichTextCommandToTextBlock(
            textBlock,
            command,
            selection,
            value,
            metadata,
          ),
      )
  }
}

function getRichTextCommandStateForTextBlock(
  textBlock: ProjectJewelCaseState['spine']['left']['title'],
  command: CaseInsertPreviewRichTextCommand,
  selection: PlainTextSelectionRange | undefined,
  metadata?: ProjectMetadata,
): CaseInsertPreviewRichTextState {
  const source = getTextBlockRichTextCommandSource(textBlock, metadata)

  return command === 'color'
    ? getRichTextSelectionColorState({ ...source, selection })
    : getRichTextInlineToggleState({ ...source, command, selection })
}

function getRichTextCommandStateForTextList(
  textList: ProjectCaseInsertTextList,
  command: CaseInsertPreviewRichTextCommand,
  selection: PlainTextSelectionRange | undefined,
): CaseInsertPreviewRichTextState {
  const fallbackText = getCaseInsertPreviewTextListEditValue(textList)
  const source = {
    ambientStyle: getRichTextAmbientStyle(
      textList.style,
      600,
    ),
    fallbackText,
    htmlSource: isHtmlTextEnabled(textList)
      ? getHtmlSource(textList, fallbackText)
      : undefined,
  }

  return command === 'color'
    ? getRichTextSelectionColorState({ ...source, selection })
    : getRichTextInlineToggleState({ ...source, command, selection })
}

export function getCaseInsertPreviewTextTargetRichTextCommandState(
  caseInsert: ProjectJewelCaseState,
  target: CaseInsertPreviewTextTarget,
  command: CaseInsertPreviewRichTextCommand,
  selection: PlainTextSelectionRange | undefined,
  metadata?: ProjectMetadata,
): CaseInsertPreviewRichTextState {
  switch (target.scope) {
    case 'templateTextBlock': {
      const textBlock = caseInsert.templates[target.paneId].textBlocks.find(
        (candidate) => candidate.id === target.textBlockId,
      )
      return textBlock
        ? getRichTextCommandStateForTextBlock(
            textBlock,
            command,
            selection,
            metadata,
          )
        : 'inactive'
    }
    case 'templateTextList':
      {
        const textList = caseInsert.templates[target.paneId].textLists.find(
          (candidate) => candidate.id === target.textListId,
        )
        return textList
          ? getRichTextCommandStateForTextList(textList, command, selection)
          : 'inactive'
      }
    case 'spineTitle':
      return getRichTextCommandStateForTextBlock(
        caseInsert.spine[target.side].title,
        command,
        selection,
        metadata,
      )
    case 'spineTextBlock': {
      const targetTextBlockId = getJewelCaseSpineSideScopedId(
        target.side,
        target.textBlockId,
      )
      const textBlock = caseInsert.spine[target.side].textBlocks.find(
        (candidate) => candidate.id === targetTextBlockId,
      )
      return textBlock
        ? getRichTextCommandStateForTextBlock(
            textBlock,
            command,
            selection,
            metadata,
          )
        : 'inactive'
    }
  }
}

export function updateCaseInsertPreviewTextTargetContentMode(
  caseInsert: ProjectJewelCaseState,
  target: CaseInsertPreviewTextTarget,
  contentMode: TextContentMode,
  metadata?: ProjectMetadata,
) {
  switch (target.scope) {
    case 'templateTextBlock':
      return updateCaseInsertTemplateTextBlock(
        caseInsert,
        target.paneId,
        target.textBlockId,
        (textBlock) =>
          updateCaseInsertTextBlockContentMode(
            textBlock,
            contentMode,
            getCaseInsertPreviewTextEditValue(textBlock, metadata),
          ),
      )
    case 'templateTextList':
      return updateCaseInsertTemplateTextList(
        caseInsert,
        target.paneId,
        target.textListId,
        (textList) =>
          updateCaseInsertTextListContentMode(
            textList,
            contentMode,
            getCaseInsertPreviewTextListEditValue(textList),
          ),
      )
    case 'spineTitle':
      return updateProjectJewelCaseSpineSides(
        caseInsert,
        target.side,
        (spineSide) => ({
          ...spineSide,
          title: updateCaseInsertTextBlockContentMode(
            spineSide.title,
            contentMode,
            getCaseInsertPreviewTextEditValue(spineSide.title, metadata),
          ),
        }),
      )
    case 'spineTextBlock':
      return updateSpinePreviewTextBlock(
        caseInsert,
        target,
        (textBlock) =>
          updateCaseInsertTextBlockContentMode(
            textBlock,
            contentMode,
            getCaseInsertPreviewTextEditValue(textBlock, metadata),
          ),
      )
  }
}

export function applyCaseInsertPreviewTextTargetStylePreset(
  caseInsert: ProjectJewelCaseState,
  target: CaseInsertPreviewTextTarget,
  presetId: string,
) {
  switch (target.scope) {
    case 'templateTextBlock':
      return updateCaseInsertTemplateTextBlock(
        caseInsert,
        target.paneId,
        target.textBlockId,
        (textBlock) =>
          applyCaseInsertTextBlockStylePreset(textBlock, presetId),
      )
    case 'templateTextList':
      return updateCaseInsertTemplateTextList(
        caseInsert,
        target.paneId,
        target.textListId,
        (textList) =>
          applyCaseInsertTextListStylePreset(textList, presetId),
      )
    case 'spineTitle':
      return updateProjectJewelCaseSpineSides(
        caseInsert,
        target.side,
        (spineSide) => ({
          ...spineSide,
          title: applyCaseInsertTextBlockStylePreset(
            spineSide.title,
            presetId,
          ),
        }),
      )
    case 'spineTextBlock':
      return updateSpinePreviewTextBlock(
        caseInsert,
        target,
        (textBlock) => applyCaseInsertTextBlockStylePreset(textBlock, presetId),
      )
  }
}

export function applyCaseInsertPreviewTextTargetLayoutPreset(
  caseInsert: ProjectJewelCaseState,
  target: CaseInsertPreviewTextTarget,
  presetId: string,
) {
  switch (target.scope) {
    case 'templateTextBlock':
      return updateCaseInsertTemplateTextBlock(
        caseInsert,
        target.paneId,
        target.textBlockId,
        (textBlock) =>
          applyCaseInsertTextBlockPresetLayout(
            target.paneId,
            textBlock,
            presetId,
          ),
      )
    case 'templateTextList':
      return updateCaseInsertTemplateTextList(
        caseInsert,
        target.paneId,
        target.textListId,
        (textList) =>
          applyCaseInsertTextListPresetLayout(
            target.paneId,
            textList,
            presetId,
          ),
      )
    case 'spineTitle':
      return updateProjectJewelCaseSpineSides(
        caseInsert,
        target.side,
        (spineSide) => ({
          ...spineSide,
          title: applyCaseInsertTextBlockPresetLayout(
            'spine',
            spineSide.title,
            presetId,
          ),
        }),
      )
    case 'spineTextBlock':
      return updateSpinePreviewTextBlock(
        caseInsert,
        target,
        (textBlock) =>
          applyCaseInsertTextBlockPresetLayout('spine', textBlock, presetId),
      )
  }
}

export function resetCaseInsertPreviewTextTargetStyle(
  caseInsert: ProjectJewelCaseState,
  target: CaseInsertPreviewTextTarget,
) {
  switch (target.scope) {
    case 'templateTextBlock':
      return updateCaseInsertTemplateTextBlock(
        caseInsert,
        target.paneId,
        target.textBlockId,
        resetCaseInsertTextBlockStyle,
      )
    case 'templateTextList':
      return updateCaseInsertTemplateTextList(
        caseInsert,
        target.paneId,
        target.textListId,
        resetCaseInsertTextListStyle,
      )
    case 'spineTitle':
      return updateProjectJewelCaseSpineSides(
        caseInsert,
        target.side,
        (spineSide) => ({
          ...spineSide,
          title: resetCaseInsertTextBlockStyle(spineSide.title),
        }),
      )
    case 'spineTextBlock':
      return updateSpinePreviewTextBlock(
        caseInsert,
        target,
        resetCaseInsertTextBlockStyle,
      )
  }
}

export function updateCaseInsertPreviewTextTargetLayoutField(
  caseInsert: ProjectJewelCaseState,
  target: CaseInsertPreviewTextTarget,
  field: CaseInsertLayoutField,
  value: number,
) {
  switch (target.scope) {
    case 'templateTextBlock':
      return updateCaseInsertTemplateTextBlock(
        caseInsert,
        target.paneId,
        target.textBlockId,
        (textBlock) =>
          updateCaseInsertTextBlockLayoutField(textBlock, field, value),
      )
    case 'templateTextList':
      return updateCaseInsertTemplateTextList(
        caseInsert,
        target.paneId,
        target.textListId,
        (textList) => ({
          ...textList,
          layout: {
            ...textList.layout,
            [field]: value,
          },
        }),
      )
    case 'spineTitle':
      return updateProjectJewelCaseSpineSides(
        caseInsert,
        target.side,
        (spineSide) => ({
          ...spineSide,
          title: updateCaseInsertTextBlockLayoutField(
            spineSide.title,
            field,
            value,
          ),
        }),
      )
    case 'spineTextBlock':
      return updateSpinePreviewTextBlock(
        caseInsert,
        target,
        (textBlock) =>
          updateCaseInsertTextBlockLayoutField(textBlock, field, value),
      )
  }
}

export function updateCaseInsertPreviewTextTargetAlign(
  caseInsert: ProjectJewelCaseState,
  target: CaseInsertPreviewTextTarget,
  align: ProjectCaseInsertTextAlign,
) {
  switch (target.scope) {
    case 'templateTextBlock':
      return updateCaseInsertTemplateTextBlock(
        caseInsert,
        target.paneId,
        target.textBlockId,
        (textBlock) => ({ ...textBlock, align }),
      )
    case 'spineTitle':
      return updateProjectJewelCaseSpineSides(
        caseInsert,
        target.side,
        (spineSide) => ({
          ...spineSide,
          title: { ...spineSide.title, align },
        }),
      )
    case 'spineTextBlock':
      return updateSpinePreviewTextBlock(
        caseInsert,
        target,
        (textBlock) => ({ ...textBlock, align }),
      )
    case 'templateTextList':
      return caseInsert
  }
}

export function updateCaseInsertPreviewTextTargetAvoidVisualElements(
  caseInsert: ProjectJewelCaseState,
  target: CaseInsertPreviewTextTarget,
  avoidVisualElements: boolean,
) {
  switch (target.scope) {
    case 'templateTextBlock':
      return updateCaseInsertTemplateTextBlock(
        caseInsert,
        target.paneId,
        target.textBlockId,
        (textBlock) => setCaseInsertTextBlockAvoidVisualElements(
          textBlock,
          avoidVisualElements,
        ),
      )
    case 'templateTextList':
      return updateCaseInsertTemplateTextList(
        caseInsert,
        target.paneId,
        target.textListId,
        (textList) => setCaseInsertTextListAvoidVisualElements(
          textList,
          avoidVisualElements,
        ),
      )
    case 'spineTitle':
      return updateProjectJewelCaseSpineSides(
        caseInsert,
        target.side,
        (spineSide) => ({
          ...spineSide,
          title: setCaseInsertTextBlockAvoidVisualElements(
            spineSide.title,
            avoidVisualElements,
          ),
        }),
      )
    case 'spineTextBlock':
      return updateSpinePreviewTextBlock(
        caseInsert,
        target,
        (textBlock) => setCaseInsertTextBlockAvoidVisualElements(
          textBlock,
          avoidVisualElements,
        ),
      )
  }
}
