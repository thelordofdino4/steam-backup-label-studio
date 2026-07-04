import {
  getDiscTextHtmlSource,
  isDiscTextHtmlEnabled,
  type DiscTextHtmlSources,
  type DiscTextKey,
  type DiscTextLayout,
} from './index.ts'
import {
  DISC_TEXT_RENDER_STYLES,
  type DiscTextStyleSettings,
} from './styles.ts'
import {
  RICH_TEXT_BOLD_FONT_WEIGHT,
} from '../text/richTextWeights.ts'
import {
  applyRichTextBulletedListCommand,
  applyRichTextInlineColorCommand,
  applyRichTextInlineFontFamilyCommand,
  applyRichTextInlineFontSizePtCommand,
  applyRichTextInlineToggleCommand,
  applyRichTextListKeyboardCommand,
  getRichTextBulletedListState,
  getRichTextInlineToggleState,
  getRichTextSelectionColorState,
  getRichTextSelectionFontFamilyState,
  getRichTextSelectionFontSizePtState,
  type PlainTextSelectionRange,
  type RichTextAmbientInlineStyle,
  type RichTextInlineToggleCommand,
  type RichTextListKeyboardCommand,
  type RichTextSelectionColorState,
  type RichTextSelectionNumberState,
  type RichTextSelectionStringState,
  type RichTextSelectionStyleState,
} from '../text/richTextCommands.ts'

export type DiscTextRichTextCommand =
  | RichTextInlineToggleCommand
  | 'bulletedList'
  | 'color'
  | 'fontFamily'
  | 'fontSizePt'

export type DiscTextRichTextCommandState =
  | RichTextSelectionStyleState
  | RichTextSelectionColorState
  | RichTextSelectionNumberState
  | RichTextSelectionStringState

export type DiscTextRichTextSource = {
  ambientStyle: RichTextAmbientInlineStyle
  fallbackText: string
  htmlSource?: string
}

const DISC_TEXT_INLINE_RENDERED_PREFIXES: Partial<Record<DiscTextKey, string>> = {
  appId: 'Steam App ID ',
  backupDate: 'Backed up ',
  developer: 'Developer: ',
  publisher: 'Publisher: ',
}

export function getDiscTextInlineStorageValue(
  key: DiscTextKey,
  value: string,
) {
  const prefix = DISC_TEXT_INLINE_RENDERED_PREFIXES[key]

  return prefix && value.startsWith(prefix)
    ? value.slice(prefix.length)
    : value
}

export function getDiscTextRichTextAmbientStyle(
  key: DiscTextKey,
  styles: DiscTextStyleSettings,
  layout?: DiscTextLayout,
): RichTextAmbientInlineStyle {
  return {
    bold: styles[key].bold,
    boldFontWeight: RICH_TEXT_BOLD_FONT_WEIGHT,
    color: styles[key].color,
    fontFamily: styles[key].fontFamily,
    fontSizePt: layout?.fontSizePt,
    italic: styles[key].italic,
    normalFontWeight: Math.min(DISC_TEXT_RENDER_STYLES[key].fontWeight, 400),
    underline: styles[key].underline,
  }
}

export function createDiscTextRichTextSource({
  currentText,
  htmlSources,
  key,
  layout,
  styles,
}: {
  currentText: string
  htmlSources: DiscTextHtmlSources
  key: DiscTextKey
  layout?: DiscTextLayout
  styles: DiscTextStyleSettings
}): DiscTextRichTextSource {
  return {
    ambientStyle: getDiscTextRichTextAmbientStyle(
      key,
      styles,
      layout,
    ),
    fallbackText: currentText,
    htmlSource: isDiscTextHtmlEnabled(htmlSources, key)
      ? getDiscTextHtmlSource(htmlSources, key, currentText)
      : undefined,
  }
}

export function applyDiscTextRichTextCommandToSource({
  command,
  selection,
  source,
  value,
}: {
  command: DiscTextRichTextCommand
  selection: PlainTextSelectionRange | undefined
  source: DiscTextRichTextSource
  value: boolean | number | string
}) {
  return command === 'color'
    ? applyRichTextInlineColorCommand({
        ...source,
        color: String(value),
        selection,
      })
    : command === 'fontFamily'
      ? applyRichTextInlineFontFamilyCommand({
          ...source,
          fontFamily: String(value),
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

export function applyDiscTextRichTextKeyboardCommandToSource({
  command,
  selection,
  source,
}: {
  command: RichTextListKeyboardCommand
  selection: PlainTextSelectionRange
  source: DiscTextRichTextSource
}) {
  return applyRichTextListKeyboardCommand({
    ...source,
    command,
    selection,
  })
}

export function getDiscTextRichTextCommandStateFromSource({
  command,
  selection,
  source,
}: {
  command: DiscTextRichTextCommand
  selection: PlainTextSelectionRange | undefined
  source: DiscTextRichTextSource
}): DiscTextRichTextCommandState {
  return command === 'color'
    ? getRichTextSelectionColorState({ ...source, selection })
    : command === 'fontFamily'
      ? getRichTextSelectionFontFamilyState({ ...source, selection })
    : command === 'fontSizePt'
      ? getRichTextSelectionFontSizePtState({ ...source, selection })
    : command === 'bulletedList'
      ? getRichTextBulletedListState({ ...source, selection })
      : getRichTextInlineToggleState({ ...source, command, selection })
}
