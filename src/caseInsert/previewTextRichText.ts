import type {
  ProjectCaseInsertTextBlock,
  ProjectCaseInsertTextList,
  ProjectMetadata,
} from '../project/projectTypes.ts'
import {
  getHtmlSource,
  isHtmlTextEnabled,
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
  type RichTextAmbientInlineStyle,
  type RichTextInlineToggleCommand,
  type RichTextListKeyboardCommand,
  type RichTextSelectionColorState,
  type RichTextSelectionNumberState,
  type RichTextSelectionStyleState,
} from '../text/richTextCommands.ts'
import {
  RICH_TEXT_BOLD_FONT_WEIGHT,
} from '../text/richTextWeights.ts'
import {
  getCaseInsertPreviewTextEditValue,
  getCaseInsertPreviewTextListEditValue,
} from './previewTextEditing.ts'
import {
  updateCaseInsertTextListContentMode,
} from './textTransitions.ts'
import {
  getCaseInsertTextBlockStyleRole,
  getCaseInsertTextStyleRoleBaseFontWeight,
} from './textStyles.ts'
import {
  getCaseInsertLayoutFontSizePt,
  getCaseInsertTextSizeRoleFromId,
} from './textSizing.ts'

export type CaseInsertPreviewRichTextCommand =
  | RichTextInlineToggleCommand
  | 'bulletedList'
  | 'color'
  | 'fontSizePt'

export type CaseInsertPreviewRichTextState =
  | RichTextSelectionStyleState
  | RichTextSelectionColorState
  | RichTextSelectionNumberState

type CaseInsertRichTextCommandSource = {
  ambientStyle: RichTextAmbientInlineStyle
  fallbackText: string
  htmlSource?: string
}

function getTextBlockRichTextCommandSource(
  textBlock: ProjectCaseInsertTextBlock,
  metadata?: ProjectMetadata,
): CaseInsertRichTextCommandSource {
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

function getTextListRichTextCommandSource(
  textList: ProjectCaseInsertTextList,
): CaseInsertRichTextCommandSource {
  const fallbackText = getCaseInsertPreviewTextListEditValue(textList)

  return {
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
}

function getRichTextAmbientStyle(
  style: ProjectCaseInsertTextBlock['style'],
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

function applyRichTextCommandToSource(
  source: CaseInsertRichTextCommandSource,
  command: CaseInsertPreviewRichTextCommand,
  selection: PlainTextSelectionRange | undefined,
  value: boolean | number | string,
) {
  return command === 'color'
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
}

function getRichTextCommandStateForSource(
  source: CaseInsertRichTextCommandSource,
  command: CaseInsertPreviewRichTextCommand,
  selection: PlainTextSelectionRange | undefined,
): CaseInsertPreviewRichTextState {
  return command === 'color'
    ? getRichTextSelectionColorState({ ...source, selection })
    : command === 'fontSizePt'
      ? getRichTextSelectionFontSizePtState({ ...source, selection })
    : command === 'bulletedList'
      ? getRichTextBulletedListState({ ...source, selection })
      : getRichTextInlineToggleState({ ...source, command, selection })
}

export function applyRichTextCommandToTextBlock(
  textBlock: ProjectCaseInsertTextBlock,
  command: CaseInsertPreviewRichTextCommand,
  selection: PlainTextSelectionRange | undefined,
  value: boolean | number | string,
  metadata?: ProjectMetadata,
) {
  const result = applyRichTextCommandToSource(
    getTextBlockRichTextCommandSource(textBlock, metadata),
    command,
    selection,
    value,
  )

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

export function applyRichTextKeyboardCommandToTextBlock(
  textBlock: ProjectCaseInsertTextBlock,
  command: RichTextListKeyboardCommand,
  selection: PlainTextSelectionRange,
  metadata?: ProjectMetadata,
) {
  const result = applyRichTextListKeyboardCommand({
    ...getTextBlockRichTextCommandSource(textBlock, metadata),
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

export function applyRichTextCommandToTextList(
  textList: ProjectCaseInsertTextList,
  command: CaseInsertPreviewRichTextCommand,
  selection: PlainTextSelectionRange | undefined,
  value: boolean | number | string,
) {
  const result = applyRichTextCommandToSource(
    getTextListRichTextCommandSource(textList),
    command,
    selection,
    value,
  )

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

export function applyRichTextKeyboardCommandToTextList(
  textList: ProjectCaseInsertTextList,
  command: RichTextListKeyboardCommand,
  selection: PlainTextSelectionRange,
) {
  const result = applyRichTextListKeyboardCommand({
    ...getTextListRichTextCommandSource(textList),
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

export function getRichTextCommandStateForTextBlock(
  textBlock: ProjectCaseInsertTextBlock,
  command: CaseInsertPreviewRichTextCommand,
  selection: PlainTextSelectionRange | undefined,
  metadata?: ProjectMetadata,
): CaseInsertPreviewRichTextState {
  return getRichTextCommandStateForSource(
    getTextBlockRichTextCommandSource(textBlock, metadata),
    command,
    selection,
  )
}

export function getRichTextCommandStateForTextList(
  textList: ProjectCaseInsertTextList,
  command: CaseInsertPreviewRichTextCommand,
  selection: PlainTextSelectionRange | undefined,
): CaseInsertPreviewRichTextState {
  return getRichTextCommandStateForSource(
    getTextListRichTextCommandSource(textList),
    command,
    selection,
  )
}
