import {
  type DiscTextAlignment,
  type DiscTextArcSide,
  type DiscTextKey,
  type DiscTextLayout,
  type DiscTextLayoutNumericField,
} from '../../discText/index.ts'
import {
  type DiscTextFontFamily,
  type DiscTextStyleField,
  type DiscTextStyleValue,
} from '../../discText/styles.ts'
import {
  contextualTextNumericValuesMatch,
  findMatchingContextualTextPreset,
} from '../../text/contextualTextControlViewModel.ts'
import type {
  DiscTextLayoutPreset,
} from '../../layout/presets.ts'
import type {
  InlinePreviewTextEditorSelectionRange,
} from './InlinePreviewTextEditor'

type DiscInlineTextRichTextCommand =
  | 'bold'
  | 'italic'
  | 'underline'
  | 'color'
  | 'bulletedList'
  | 'fontFamily'
  | 'fontSizePt'
type DiscInlineTextToggleCommand = Extract<
  DiscInlineTextRichTextCommand,
  'bold' | 'italic' | 'underline'
>
type DiscInlineTextToggleField =
  Extract<DiscTextStyleField, 'bold' | 'italic' | 'underline'>

export type DiscInlineTextChangeHandlerParams = {
  key: DiscTextKey
  onDiscTextLayoutChange: (
    key: DiscTextKey,
    field: DiscTextLayoutNumericField,
    value: number,
  ) => void
  onDiscTextRichTextCommand?: (
    key: DiscTextKey,
    command: DiscInlineTextRichTextCommand,
    selection: InlinePreviewTextEditorSelectionRange | undefined,
    value: boolean | number | string,
  ) => InlinePreviewTextEditorSelectionRange | void
  onDiscTextStyleChange: (
    key: DiscTextKey,
    field: DiscTextStyleField,
    value: DiscTextStyleValue,
  ) => void
}

export function getMatchingDiscLayoutPreset({
  layout,
  layoutPresets,
}: {
  layout: DiscTextLayout
  layoutPresets: readonly DiscTextLayoutPreset[]
}) {
  return findMatchingContextualTextPreset(layoutPresets, (preset) => {
    if (preset.layout.align && preset.layout.align !== layout.align) {
      return false
    }

    if (preset.layout.mode && preset.layout.mode !== layout.mode) {
      return false
    }

    return (['x', 'y', 'width', 'arcDegrees'] as const)
      .every((field) =>
          typeof preset.layout[field] === 'number'
            ? contextualTextNumericValuesMatch(
                preset.layout[field],
                layout[field],
              )
            : true,
      )
  })
}

export function hasInlineSelectionRange(
  selection: InlinePreviewTextEditorSelectionRange,
) {
  return selection.start !== selection.end
}

function hasSelectedInlineTextRange(
  selection: InlinePreviewTextEditorSelectionRange | undefined,
) {
  return Boolean(selection && hasInlineSelectionRange(selection))
}

export function createDiscInlineTextChangeHandlers({
  key,
  onDiscTextLayoutChange,
  onDiscTextRichTextCommand,
  onDiscTextStyleChange,
}: DiscInlineTextChangeHandlerParams) {
  const handleInlineToggleChange = (
    command: DiscInlineTextToggleCommand,
    field: DiscInlineTextToggleField,
    pressed: boolean,
    selection?: InlinePreviewTextEditorSelectionRange,
  ) => {
    if (hasSelectedInlineTextRange(selection)) {
      return onDiscTextRichTextCommand?.(key, command, selection, pressed)
    }

    onDiscTextStyleChange(key, field, pressed)
    return undefined
  }
  const handleInlineColorChange = (
    value: string,
    selection?: InlinePreviewTextEditorSelectionRange,
  ) => {
    if (hasSelectedInlineTextRange(selection)) {
      onDiscTextRichTextCommand?.(key, 'color', selection, value)
      return
    }

    onDiscTextStyleChange(key, 'color', value)
  }
  const handleInlineSizeChange = (
    value: number,
    selection?: InlinePreviewTextEditorSelectionRange,
  ) => {
    if (hasSelectedInlineTextRange(selection)) {
      onDiscTextRichTextCommand?.(key, 'fontSizePt', selection, value)
      return
    }

    onDiscTextLayoutChange(key, 'fontSizePt', value)
  }
  const handleInlineFontFamilyChange = (
    value: string,
    selection?: InlinePreviewTextEditorSelectionRange,
  ) => {
    if (hasSelectedInlineTextRange(selection)) {
      onDiscTextRichTextCommand?.(key, 'fontFamily', selection, value)
      return
    }

    onDiscTextStyleChange(key, 'fontFamily', value as DiscTextFontFamily)
  }
  const handleBulletedListChange = (
    pressed: boolean,
    selection?: InlinePreviewTextEditorSelectionRange,
  ) => {
    return onDiscTextRichTextCommand?.(
      key,
      'bulletedList',
      selection,
      pressed,
    )
  }

  return {
    handleBulletedListChange,
    handleInlineColorChange,
    handleInlineFontFamilyChange,
    handleInlineSizeChange,
    handleInlineToggleChange,
  }
}

export function applyDiscTextLayoutPreset({
  key,
  layoutPreset,
  onDiscTextAlignmentChange,
  onDiscTextArcSideChange,
  onDiscTextLayoutChange,
}: {
  key: DiscTextKey
  layoutPreset: DiscTextLayoutPreset
  onDiscTextAlignmentChange: (
    key: DiscTextKey,
    alignment: DiscTextAlignment,
  ) => void
  onDiscTextArcSideChange?: (
    key: DiscTextKey,
    arcSide: DiscTextArcSide,
  ) => void
  onDiscTextLayoutChange: (
    key: DiscTextKey,
    field: DiscTextLayoutNumericField,
    value: number,
  ) => void
}) {
  if (typeof layoutPreset.layout.x === 'number') {
    onDiscTextLayoutChange(key, 'x', layoutPreset.layout.x)
  }
  if (typeof layoutPreset.layout.y === 'number') {
    onDiscTextLayoutChange(key, 'y', layoutPreset.layout.y)
  }
  if (typeof layoutPreset.layout.width === 'number') {
    onDiscTextLayoutChange(key, 'width', layoutPreset.layout.width)
  }
  if (typeof layoutPreset.layout.arcDegrees === 'number') {
    onDiscTextLayoutChange(key, 'arcDegrees', layoutPreset.layout.arcDegrees)
  }
  if (layoutPreset.layout.align) {
    onDiscTextAlignmentChange(key, layoutPreset.layout.align)
  }
  if (layoutPreset.layout.arcSide && onDiscTextArcSideChange) {
    onDiscTextArcSideChange(key, layoutPreset.layout.arcSide)
  }
}
