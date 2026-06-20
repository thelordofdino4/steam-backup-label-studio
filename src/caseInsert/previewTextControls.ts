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
  applyRichTextBulletedListCommand,
  applyRichTextInlineColorCommand,
  applyRichTextInlineFontSizePtCommand,
  applyRichTextInlineToggleCommand,
  applyRichTextListKeyboardCommand,
  getRichTextBulletedListState,
  getRichTextInlineToggleState,
  getRichTextSelectionColorState,
  getRichTextSelectionFontSizePtState,
  type PlainTextSelectionRange,
  type RichTextListKeyboardCommand,
  type RichTextAmbientInlineStyle,
  type RichTextInlineToggleCommand,
  type RichTextSelectionColorState,
  type RichTextSelectionNumberState,
  type RichTextSelectionStyleState,
} from '../text/richTextCommands.ts'
import {
  RICH_TEXT_BOLD_FONT_WEIGHT,
} from '../text/richTextWeights.ts'
import {
  getCaseInsertLayoutFontSizePt,
  getCaseInsertTextSizeRoleFromId,
} from './textSizing.ts'

type CaseInsertLayoutField = keyof ProjectCaseInsertLayout
export type CaseInsertPreviewRichTextCommand =
  | RichTextInlineToggleCommand
  | 'bulletedList'
  | 'color'
  | 'fontSizePt'

export type CaseInsertPreviewRichTextState =
  | RichTextSelectionStyleState
  | RichTextSelectionColorState
  | RichTextSelectionNumberState

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
      getCaseInsertLayoutFontSizePt(
        textBlock.layout,
        getCaseInsertTextSizeRoleFromId(textBlock.id),
      ),
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
  fontSizePt?: number,
): RichTextAmbientInlineStyle {
  return {
    bold: style.bold,
    boldFontWeight: RICH_TEXT_BOLD_FONT_WEIGHT,
    color: style.color,
    fontSizePt,
    italic: style.italic,
    normalFontWeight: Math.min(normalFontWeight, 400),
    underline: style.underline,
  }
}

function applyRichTextCommandToTextBlock(
  textBlock: ProjectJewelCaseState['spine']['left']['title'],
  command: CaseInsertPreviewRichTextCommand,
  selection: PlainTextSelectionRange | undefined,
  value: boolean | number | string,
  metadata?: ProjectMetadata,
) {
  const source = getTextBlockRichTextCommandSource(textBlock, metadata)
  const result = command === 'color'
    ? applyRichTextInlineColorCommand({
        ...source,
        color: String(value),
        selection,
      })
    : command === 'fontSizePt'
      ? applyRichTextInlineFontSizePtCommand({
          ...source,
          fontSizePt: Number(value),
          selection,
        })
    : command === 'bulletedList'
      ? applyRichTextBulletedListCommand({
          ...source,
          active: Boolean(value),
          selection,
        })
      : applyRichTextInlineToggleCommand({
          ...source,
          active: Boolean(value),
          command,
          selection,
        })

  if (!result) {
    return { textBlock }
  }

  return {
    selection: result.selection,
    textBlock: {
      ...textBlock,
      contentMode: 'html' as const,
      htmlSource: result.htmlSource,
      markdownSource: undefined,
      source: 'manual' as const,
      value: result.plainText,
    },
  }
}

function applyRichTextKeyboardCommandToTextBlock(
  textBlock: ProjectJewelCaseState['spine']['left']['title'],
  command: RichTextListKeyboardCommand,
  selection: PlainTextSelectionRange,
  metadata?: ProjectMetadata,
) {
  const source = getTextBlockRichTextCommandSource(textBlock, metadata)
  const result = applyRichTextListKeyboardCommand({
    ...source,
    command,
    selection,
  })

  if (!result) {
    return { textBlock }
  }

  return {
    selection: result.selection,
    textBlock: {
      ...textBlock,
      contentMode: 'html' as const,
      htmlSource: result.htmlSource,
      markdownSource: undefined,
      source: 'manual' as const,
      value: result.plainText,
    },
  }
}

function applyRichTextCommandToTextList(
  textList: ProjectCaseInsertTextList,
  command: CaseInsertPreviewRichTextCommand,
  selection: PlainTextSelectionRange | undefined,
  value: boolean | number | string,
) {
  const fallbackText = getCaseInsertPreviewTextListEditValue(textList)
  const source = {
    ambientStyle: getRichTextAmbientStyle(
      textList.style,
      600,
      getCaseInsertLayoutFontSizePt(
        textList.layout,
        getCaseInsertTextSizeRoleFromId(textList.id, 'trayMetadata'),
      ),
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
    : command === 'fontSizePt'
      ? applyRichTextInlineFontSizePtCommand({
          ...source,
          fontSizePt: Number(value),
          selection,
        })
    : command === 'bulletedList'
      ? applyRichTextBulletedListCommand({
          ...source,
          active: Boolean(value),
          selection,
        })
      : applyRichTextInlineToggleCommand({
          ...source,
          active: Boolean(value),
          command,
          selection,
        })

  if (!result) {
    return { textList }
  }

  return {
    selection: result.selection,
    textList: updateCaseInsertTextListContentMode(
      {
        ...textList,
        htmlSource: result.htmlSource,
        markdownSource: undefined,
      },
      'html',
      result.htmlSource,
    ),
  }
}

function applyRichTextKeyboardCommandToTextList(
  textList: ProjectCaseInsertTextList,
  command: RichTextListKeyboardCommand,
  selection: PlainTextSelectionRange,
) {
  const fallbackText = getCaseInsertPreviewTextListEditValue(textList)
  const result = applyRichTextListKeyboardCommand({
    ambientStyle: getRichTextAmbientStyle(
      textList.style,
      600,
      getCaseInsertLayoutFontSizePt(
        textList.layout,
        getCaseInsertTextSizeRoleFromId(textList.id, 'trayMetadata'),
      ),
    ),
    command,
    fallbackText,
    htmlSource: isHtmlTextEnabled(textList)
      ? getHtmlSource(textList, fallbackText)
      : undefined,
    selection,
  })

  if (!result) {
    return { textList }
  }

  return {
    selection: result.selection,
    textList: updateCaseInsertTextListContentMode(
      {
        ...textList,
        htmlSource: result.htmlSource,
        markdownSource: undefined,
      },
      'html',
      result.htmlSource,
    ),
  }
}

export function updateCaseInsertPreviewTextTargetRichTextCommand(
  caseInsert: ProjectJewelCaseState,
  target: CaseInsertPreviewTextTarget,
  command: CaseInsertPreviewRichTextCommand,
  selection: PlainTextSelectionRange | undefined,
  value: boolean | number | string,
  metadata?: ProjectMetadata,
) {
  let nextSelection: PlainTextSelectionRange | undefined

  switch (target.scope) {
    case 'templateTextBlock':
      return {
        caseInsert: updateCaseInsertTemplateTextBlock(
          caseInsert,
          target.paneId,
          target.textBlockId,
          (textBlock) => {
            const result = applyRichTextCommandToTextBlock(
              textBlock,
              command,
              selection,
              value,
              metadata,
            )
            nextSelection = result.selection
            return result.textBlock
          },
        ),
        selection: nextSelection,
      }
    case 'templateTextList':
      return {
        caseInsert: updateCaseInsertTemplateTextList(
          caseInsert,
          target.paneId,
          target.textListId,
          (textList) => {
            const result = applyRichTextCommandToTextList(
              textList,
              command,
              selection,
              value,
            )
            nextSelection = result.selection
            return result.textList
          },
        ),
        selection: nextSelection,
      }
    case 'spineTitle':
      return {
        caseInsert: updateProjectJewelCaseSpineSides(
          caseInsert,
          target.side,
          (spineSide) => {
            const result = applyRichTextCommandToTextBlock(
              spineSide.title,
              command,
              selection,
              value,
              metadata,
            )
            nextSelection = result.selection
            return {
              ...spineSide,
              title: result.textBlock,
            }
          },
        ),
        selection: nextSelection,
      }
    case 'spineTextBlock':
      return {
        caseInsert: updateSpinePreviewTextBlock(
          caseInsert,
          target,
          (textBlock) => {
            const result = applyRichTextCommandToTextBlock(
              textBlock,
              command,
              selection,
              value,
              metadata,
            )
            nextSelection = result.selection
            return result.textBlock
          },
        ),
        selection: nextSelection,
      }
  }
}

export function updateCaseInsertPreviewTextTargetRichTextKeyboardCommand(
  caseInsert: ProjectJewelCaseState,
  target: CaseInsertPreviewTextTarget,
  command: RichTextListKeyboardCommand,
  selection: PlainTextSelectionRange,
  metadata?: ProjectMetadata,
) {
  let nextSelection: PlainTextSelectionRange | undefined

  switch (target.scope) {
    case 'templateTextBlock':
      return {
        caseInsert: updateCaseInsertTemplateTextBlock(
          caseInsert,
          target.paneId,
          target.textBlockId,
          (textBlock) => {
            const result = applyRichTextKeyboardCommandToTextBlock(
              textBlock,
              command,
              selection,
              metadata,
            )
            nextSelection = result.selection
            return result.textBlock
          },
        ),
        selection: nextSelection,
      }
    case 'templateTextList':
      return {
        caseInsert: updateCaseInsertTemplateTextList(
          caseInsert,
          target.paneId,
          target.textListId,
          (textList) => {
            const result = applyRichTextKeyboardCommandToTextList(
              textList,
              command,
              selection,
            )
            nextSelection = result.selection
            return result.textList
          },
        ),
        selection: nextSelection,
      }
    case 'spineTitle':
      return {
        caseInsert: updateProjectJewelCaseSpineSides(
          caseInsert,
          target.side,
          (spineSide) => {
            const result = applyRichTextKeyboardCommandToTextBlock(
              spineSide.title,
              command,
              selection,
              metadata,
            )
            nextSelection = result.selection
            return {
              ...spineSide,
              title: result.textBlock,
            }
          },
        ),
        selection: nextSelection,
      }
    case 'spineTextBlock':
      return {
        caseInsert: updateSpinePreviewTextBlock(
          caseInsert,
          target,
          (textBlock) => {
            const result = applyRichTextKeyboardCommandToTextBlock(
              textBlock,
              command,
              selection,
              metadata,
            )
            nextSelection = result.selection
            return result.textBlock
          },
        ),
        selection: nextSelection,
      }
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
    : command === 'fontSizePt'
      ? getRichTextSelectionFontSizePtState({ ...source, selection })
    : command === 'bulletedList'
      ? getRichTextBulletedListState({ ...source, selection })
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
      getCaseInsertLayoutFontSizePt(
        textList.layout,
        getCaseInsertTextSizeRoleFromId(textList.id, 'trayMetadata'),
      ),
    ),
    fallbackText,
    htmlSource: isHtmlTextEnabled(textList)
      ? getHtmlSource(textList, fallbackText)
      : undefined,
  }

  return command === 'color'
    ? getRichTextSelectionColorState({ ...source, selection })
    : command === 'fontSizePt'
      ? getRichTextSelectionFontSizePtState({ ...source, selection })
    : command === 'bulletedList'
      ? getRichTextBulletedListState({ ...source, selection })
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
