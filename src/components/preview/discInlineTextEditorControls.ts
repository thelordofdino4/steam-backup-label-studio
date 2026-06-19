import {
  getDiscTextLabel,
  type DiscTextAlignment,
  type DiscTextKey,
  type DiscTextLayout,
  type DiscTextLayoutNumericField,
} from '../../discText/index.ts'
import {
  DISC_TEXT_WIDTH_MAX,
  DISC_TEXT_WIDTH_MIN,
} from '../../discText/constants.ts'
import {
  DISC_TEXT_CONTRAST_OPTIONS,
  DISC_TEXT_FONT_OPTIONS,
  DISC_TEXT_STYLE_PRESETS,
  type DiscTextContrastMode,
  type DiscTextFontFamily,
  type DiscTextStyleField,
  type DiscTextStyleSettings,
  type DiscTextStyleValue,
} from '../../discText/styles.ts'
import {
  getDiscTextLayoutPresetsForKey,
  type DiscTextLayoutPreset,
} from '../../layout/presets.ts'
import type { TextContentMode } from '../../text/htmlText.ts'
import {
  CONTEXTUAL_TEXT_ALIGNMENT_OPTIONS,
  CONTEXTUAL_TEXT_CONTROL_LABELS,
  CONTEXTUAL_TEXT_CUSTOM_PRESET_VALUE,
  createContextualTextPresetOptions,
  contextualTextNumericValuesMatch,
  findMatchingContextualTextPreset,
  findMatchingContextualTextStylePreset,
  isContextualTextCustomPreset,
} from '../../text/contextualTextControlViewModel.ts'
import type {
  InlinePreviewTextEditorSelectionRange,
  InlinePreviewTextEditorControls,
} from './InlinePreviewTextEditor'

export type DiscInlineTextEditorControlParams = {
  isHtmlSourceEnabled: boolean
  key: DiscTextKey
  layout: DiscTextLayout
  onApplyDiscTextStylePreset: (key: DiscTextKey, presetId: string) => void
  onDiscTextAlignmentChange: (
    key: DiscTextKey,
    alignment: DiscTextAlignment,
  ) => void
  onDiscTextContentModeChange: (
    key: DiscTextKey,
    contentMode: TextContentMode,
  ) => void
  onDiscTextEnabledChange: (key: DiscTextKey, enabled: boolean) => void
  onDiscTextLayoutChange: (
    key: DiscTextKey,
    field: DiscTextLayoutNumericField,
    value: number,
  ) => void
  onDiscTextStyleChange: (
    key: DiscTextKey,
    field: DiscTextStyleField,
    value: DiscTextStyleValue,
  ) => void
  onDiscTextRichTextCommand?: (
    key: DiscTextKey,
    command: 'bold' | 'italic' | 'underline' | 'color',
    selection: InlinePreviewTextEditorSelectionRange | undefined,
    value: boolean | string,
  ) => void
  getDiscTextRichTextCommandState?: (
    key: DiscTextKey,
    command: 'bold' | 'italic' | 'underline' | 'color',
    selection: InlinePreviewTextEditorSelectionRange,
  ) => 'active' | 'inactive' | 'mixed' | {
    state: 'active' | 'inactive' | 'mixed'
    value?: string
  }
  onDiscTextVisualAvoidanceChange: (
    key: DiscTextKey,
    avoidVisualElements: boolean,
  ) => void
  onResetDiscTextLayout: (key: DiscTextKey) => void
  onResetDiscTextStyle: (key: DiscTextKey) => void
  onSelectedDiscTextKeyChange: (key: DiscTextKey | null) => void
  style: DiscTextStyleSettings[DiscTextKey]
}

function getMatchingDiscLayoutPreset({
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

    return (['x', 'y', 'width', 'scale', 'arcDegrees'] as const).every(
      (field) =>
        typeof preset.layout[field] === 'number'
          ? contextualTextNumericValuesMatch(
              preset.layout[field],
              layout[field],
            )
          : true,
    )
  })
}

function hasInlineSelectionRange(
  selection: InlinePreviewTextEditorSelectionRange,
) {
  return selection.start !== selection.end
}

function applyDiscTextLayoutPreset({
  key,
  layoutPreset,
  onDiscTextAlignmentChange,
  onDiscTextLayoutChange,
}: {
  key: DiscTextKey
  layoutPreset: DiscTextLayoutPreset
  onDiscTextAlignmentChange: (
    key: DiscTextKey,
    alignment: DiscTextAlignment,
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
  if (typeof layoutPreset.layout.scale === 'number') {
    onDiscTextLayoutChange(key, 'scale', layoutPreset.layout.scale)
  }
  if (layoutPreset.layout.align) {
    onDiscTextAlignmentChange(key, layoutPreset.layout.align)
  }
}

export function createDiscInlineTextEditorControls({
  key,
  layout,
  style,
  onSelectedDiscTextKeyChange,
  onDiscTextEnabledChange,
  onDiscTextStyleChange,
  onApplyDiscTextStylePreset,
  onResetDiscTextStyle,
  onDiscTextLayoutChange,
  onDiscTextAlignmentChange,
  onDiscTextVisualAvoidanceChange,
  onResetDiscTextLayout,
  isHtmlSourceEnabled,
  onDiscTextContentModeChange,
  onDiscTextRichTextCommand,
  getDiscTextRichTextCommandState,
}: DiscInlineTextEditorControlParams): InlinePreviewTextEditorControls {
  const layoutPresets = getDiscTextLayoutPresetsForKey(key)
    .filter((preset) => preset.layout.mode !== 'curved')
  const matchingStylePreset = findMatchingContextualTextStylePreset(
    style,
    DISC_TEXT_STYLE_PRESETS,
  )
  const matchingLayoutPreset = getMatchingDiscLayoutPreset({
    layout,
    layoutPresets,
  })

  const handleInlineToggleChange = (
    command: 'bold' | 'italic' | 'underline',
    field: Extract<DiscTextStyleField, 'bold' | 'italic' | 'underline'>,
    pressed: boolean,
    selection?: InlinePreviewTextEditorSelectionRange,
  ) => {
    if (selection && selection.start !== selection.end) {
      onDiscTextRichTextCommand?.(key, command, selection, pressed)
      return
    }

    onDiscTextStyleChange(key, field, pressed)
  }
  const handleInlineColorChange = (
    value: string,
    selection?: InlinePreviewTextEditorSelectionRange,
  ) => {
    if (selection && selection.start !== selection.end) {
      onDiscTextRichTextCommand?.(key, 'color', selection, value)
      return
    }

    onDiscTextStyleChange(key, 'color', value)
  }

  return {
    presets: {
      style: {
        label: CONTEXTUAL_TEXT_CONTROL_LABELS.stylePreset,
        options: createContextualTextPresetOptions(DISC_TEXT_STYLE_PRESETS),
        value: matchingStylePreset?.id ?? CONTEXTUAL_TEXT_CUSTOM_PRESET_VALUE,
        onChange: (presetId) => {
          if (!isContextualTextCustomPreset(presetId)) {
            onApplyDiscTextStylePreset(key, presetId)
          }
        },
      },
      layout: layoutPresets.length > 0
        ? {
            label: CONTEXTUAL_TEXT_CONTROL_LABELS.layoutPreset,
            options: createContextualTextPresetOptions(layoutPresets),
            value:
              matchingLayoutPreset?.id ?? CONTEXTUAL_TEXT_CUSTOM_PRESET_VALUE,
            onChange: (presetId) => {
              if (isContextualTextCustomPreset(presetId)) {
                return
              }

              const layoutPreset = layoutPresets.find(
                (candidate) => candidate.id === presetId,
              )

              if (layoutPreset) {
                applyDiscTextLayoutPreset({
                  key,
                  layoutPreset,
                  onDiscTextAlignmentChange,
                  onDiscTextLayoutChange,
                })
              }
            },
          }
        : undefined,
      onReset: () => onResetDiscTextStyle(key),
    },
    text: {
      fontFamily: {
        label: CONTEXTUAL_TEXT_CONTROL_LABELS.fontFamily,
        options: DISC_TEXT_FONT_OPTIONS.map(({ label, value }) => ({
          label,
          value,
        })),
        value: style.fontFamily,
        onChange: (value) =>
          onDiscTextStyleChange(key, 'fontFamily', value as DiscTextFontFamily),
      },
      size: {
        label: CONTEXTUAL_TEXT_CONTROL_LABELS.size,
        min: 0.5,
        max: 1.8,
        step: 0.01,
        value: layout.scale,
        onChange: (value) => onDiscTextLayoutChange(key, 'scale', value),
      },
      alignment: {
        label: CONTEXTUAL_TEXT_CONTROL_LABELS.alignment,
        options: CONTEXTUAL_TEXT_ALIGNMENT_OPTIONS,
        value: layout.align,
        onChange: (value) =>
          onDiscTextAlignmentChange(key, value as DiscTextAlignment),
      },
      bold: {
        label: CONTEXTUAL_TEXT_CONTROL_LABELS.bold,
        pressed: style.bold,
        getSelectionState: (selection) => {
          if (!hasInlineSelectionRange(selection)) return undefined

          const state = getDiscTextRichTextCommandState?.(
            key,
            'bold',
            selection,
          )
          return typeof state === 'string' ? state : state?.state ?? 'inactive'
        },
        onChange: (pressed, selection) =>
          handleInlineToggleChange('bold', 'bold', pressed, selection),
      },
      italic: {
        label: CONTEXTUAL_TEXT_CONTROL_LABELS.italic,
        pressed: style.italic,
        getSelectionState: (selection) => {
          if (!hasInlineSelectionRange(selection)) return undefined

          const state = getDiscTextRichTextCommandState?.(
            key,
            'italic',
            selection,
          )
          return typeof state === 'string' ? state : state?.state ?? 'inactive'
        },
        onChange: (pressed, selection) =>
          handleInlineToggleChange('italic', 'italic', pressed, selection),
      },
      underline: {
        label: CONTEXTUAL_TEXT_CONTROL_LABELS.underline,
        pressed: style.underline,
        getSelectionState: (selection) => {
          if (!hasInlineSelectionRange(selection)) return undefined

          const state = getDiscTextRichTextCommandState?.(
            key,
            'underline',
            selection,
          )
          return typeof state === 'string' ? state : state?.state ?? 'inactive'
        },
        onChange: (pressed, selection) =>
          handleInlineToggleChange(
            'underline',
            'underline',
            pressed,
            selection,
          ),
      },
    },
    art: {
      color: {
        label: CONTEXTUAL_TEXT_CONTROL_LABELS.color,
        value: style.color,
        getSelectionValue: (selection) => {
          if (!hasInlineSelectionRange(selection)) return undefined

          const state = getDiscTextRichTextCommandState?.(
            key,
            'color',
            selection,
          )
          return typeof state === 'string'
            ? { state }
            : state ?? { state: 'inactive' }
        },
        onChange: handleInlineColorChange,
      },
      contrast: {
        label: CONTEXTUAL_TEXT_CONTROL_LABELS.contrast,
        options: DISC_TEXT_CONTRAST_OPTIONS.map(({ label, value }) => ({
          label,
          value,
        })),
        value: style.contrast,
        onChange: (value) =>
          onDiscTextStyleChange(key, 'contrast', value as DiscTextContrastMode),
      },
      backgroundEnabled: {
        label: CONTEXTUAL_TEXT_CONTROL_LABELS.backgroundEnabled,
        checked: style.backgroundEnabled,
        onChange: (checked) =>
          onDiscTextStyleChange(key, 'backgroundEnabled', checked),
      },
      backgroundColor: style.backgroundEnabled
        ? {
            label: CONTEXTUAL_TEXT_CONTROL_LABELS.backgroundColor,
            value: style.backgroundColor,
            onChange: (value) =>
              onDiscTextStyleChange(key, 'backgroundColor', value),
          }
        : undefined,
      backgroundOpacity: style.backgroundEnabled
        ? {
            label: CONTEXTUAL_TEXT_CONTROL_LABELS.backgroundOpacity,
            min: 0,
            max: 1,
            step: 0.05,
            value: style.backgroundOpacity,
            onChange: (value) =>
              onDiscTextStyleChange(key, 'backgroundOpacity', value),
          }
        : undefined,
      backgroundPadding: style.backgroundEnabled
        ? {
            label: CONTEXTUAL_TEXT_CONTROL_LABELS.backgroundPadding,
            min: 0,
            max: 4,
            step: 0.1,
            value: style.backgroundPadding,
            onChange: (value) =>
              onDiscTextStyleChange(key, 'backgroundPadding', value),
          }
        : undefined,
      borderEnabled: style.backgroundEnabled
        ? {
            label: CONTEXTUAL_TEXT_CONTROL_LABELS.borderEnabled,
            checked: style.borderEnabled,
            onChange: (checked) =>
              onDiscTextStyleChange(key, 'borderEnabled', checked),
          }
        : undefined,
      borderColor: style.backgroundEnabled && style.borderEnabled
        ? {
            label: CONTEXTUAL_TEXT_CONTROL_LABELS.borderColor,
            value: style.borderColor,
            onChange: (value) =>
              onDiscTextStyleChange(key, 'borderColor', value),
          }
        : undefined,
      borderRadius: style.backgroundEnabled && style.borderEnabled
        ? {
            label: CONTEXTUAL_TEXT_CONTROL_LABELS.borderRadius,
            min: 0,
            max: 4,
            step: 0.1,
            value: style.borderRadius,
            onChange: (value) =>
              onDiscTextStyleChange(key, 'borderRadius', value),
          }
        : undefined,
    },
    utilities: {
      respectVisualElements: {
        label: CONTEXTUAL_TEXT_CONTROL_LABELS.respectVisualElements,
        checked: layout.avoidVisualElements,
        onChange: (checked) =>
          onDiscTextVisualAvoidanceChange(key, checked),
      },
      width: {
        label: CONTEXTUAL_TEXT_CONTROL_LABELS.width,
        min: DISC_TEXT_WIDTH_MIN,
        max: DISC_TEXT_WIDTH_MAX,
        step: 1,
        value: layout.width,
        onChange: (value) => onDiscTextLayoutChange(key, 'width', value),
      },
      x: {
        label: CONTEXTUAL_TEXT_CONTROL_LABELS.x,
        min: -50,
        max: 50,
        step: 0.1,
        value: layout.x,
        onChange: (value) => onDiscTextLayoutChange(key, 'x', value),
      },
      y: {
        label: CONTEXTUAL_TEXT_CONTROL_LABELS.y,
        min: 0,
        max: 100,
        step: 0.1,
        value: layout.y,
        onChange: (value) => onDiscTextLayoutChange(key, 'y', value),
      },
      resetLayout: () => onResetDiscTextLayout(key),
      htmlSource: {
        label: CONTEXTUAL_TEXT_CONTROL_LABELS.htmlSource,
        checked: isHtmlSourceEnabled,
        onChange: (checked) =>
          onDiscTextContentModeChange(key, checked ? 'html' : 'plain'),
      },
    },
    deleteAction: {
      label: CONTEXTUAL_TEXT_CONTROL_LABELS.delete,
      ariaLabel: `Delete ${getDiscTextLabel(key)}`,
      onDelete: () => {
        onDiscTextEnabledChange(key, false)
        onSelectedDiscTextKeyChange(null)
      },
    },
  }
}
