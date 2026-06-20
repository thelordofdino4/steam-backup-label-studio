import {
  CURVED_COPYRIGHT_LAYOUT_X_MAX,
  CURVED_COPYRIGHT_LAYOUT_X_MIN,
  CURVED_COPYRIGHT_LAYOUT_Y_MAX,
  CURVED_COPYRIGHT_LAYOUT_Y_MIN,
  getDiscTextLabel,
  type DiscTextArcSide,
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
  DISC_TEXT_POINT_SIZE_MAX,
  DISC_TEXT_POINT_SIZE_MIN,
  DISC_TEXT_POINT_SIZE_PRESETS,
  DISC_TEXT_POINT_SIZE_STEP,
  getDefaultDiscTextPointSize,
} from '../../discText/pointSize.ts'
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
  onDiscTextArcSideChange?: (
    key: DiscTextKey,
    arcSide: DiscTextArcSide,
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
    command: 'bold' | 'italic' | 'underline' | 'color' | 'bulletedList' | 'fontSizePt',
    selection: InlinePreviewTextEditorSelectionRange | undefined,
    value: boolean | number | string,
  ) => InlinePreviewTextEditorSelectionRange | void
  getDiscTextRichTextCommandState?: (
    key: DiscTextKey,
    command: 'bold' | 'italic' | 'underline' | 'color' | 'bulletedList' | 'fontSizePt',
    selection: InlinePreviewTextEditorSelectionRange,
  ) => 'active' | 'inactive' | 'mixed' | {
    state: 'active' | 'inactive' | 'mixed'
    value?: number | string
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

export type CurvedDiscTextEditorControlParams = Omit<
  DiscInlineTextEditorControlParams,
  | 'getDiscTextRichTextCommandState'
  | 'isHtmlSourceEnabled'
  | 'onDiscTextContentModeChange'
  | 'onDiscTextRichTextCommand'
  | 'onDiscTextVisualAvoidanceChange'
> & {
  onDiscTextArcSideChange: (
    key: DiscTextKey,
    arcSide: DiscTextArcSide,
  ) => void
  onDiscTextValueChange: (key: DiscTextKey, value: string) => void
  textPlaceholder?: string
  textValue: string
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

    return (['x', 'y', 'width', 'scale', 'fontSizePt', 'arcDegrees'] as const)
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

function hasInlineSelectionRange(
  selection: InlinePreviewTextEditorSelectionRange,
) {
  return selection.start !== selection.end
}

function applyDiscTextLayoutPreset({
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
  if (typeof layoutPreset.layout.scale === 'number') {
    onDiscTextLayoutChange(key, 'scale', layoutPreset.layout.scale)
  }
  if (typeof layoutPreset.layout.arcDegrees === 'number') {
    onDiscTextLayoutChange(key, 'arcDegrees', layoutPreset.layout.arcDegrees)
  }
  if (typeof layoutPreset.layout.fontSizePt === 'number') {
    onDiscTextLayoutChange(key, 'fontSizePt', layoutPreset.layout.fontSizePt)
  } else if (typeof layoutPreset.layout.scale === 'number') {
    onDiscTextLayoutChange(
      key,
      'fontSizePt',
      getDefaultDiscTextPointSize(
        key,
        layoutPreset.layout.scale,
        undefined,
        layoutPreset.layout.mode ?? 'straight',
      ),
    )
  }
  if (layoutPreset.layout.align) {
    onDiscTextAlignmentChange(key, layoutPreset.layout.align)
  }
  if (layoutPreset.layout.arcSide && onDiscTextArcSideChange) {
    onDiscTextArcSideChange(key, layoutPreset.layout.arcSide)
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
      return onDiscTextRichTextCommand?.(key, command, selection, pressed)
    }

    onDiscTextStyleChange(key, field, pressed)
    return undefined
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
  const handleInlineSizeChange = (
    value: number,
    selection?: InlinePreviewTextEditorSelectionRange,
  ) => {
    if (selection && selection.start !== selection.end) {
      onDiscTextRichTextCommand?.(key, 'fontSizePt', selection, value)
      return
    }

    onDiscTextLayoutChange(key, 'fontSizePt', value)
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
        min: DISC_TEXT_POINT_SIZE_MIN,
        max: DISC_TEXT_POINT_SIZE_MAX,
        options: DISC_TEXT_POINT_SIZE_PRESETS,
        step: DISC_TEXT_POINT_SIZE_STEP,
        value: layout.fontSizePt,
        getSelectionValue: (selection) => {
          if (!hasInlineSelectionRange(selection)) return undefined

          const state = getDiscTextRichTextCommandState?.(
            key,
            'fontSizePt',
            selection,
          )
          return typeof state === 'string'
            ? { state }
            : state && typeof state.value === 'number'
              ? { state: state.state, value: state.value }
              : state
                ? { state: state.state }
                : { state: 'inactive' }
        },
        onChange: handleInlineSizeChange,
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
      bulletedList: {
        label: CONTEXTUAL_TEXT_CONTROL_LABELS.bulletedList,
        pressed: false,
        getSelectionState: (selection) => {
          const state = getDiscTextRichTextCommandState?.(
            key,
            'bulletedList',
            selection,
          )
          return typeof state === 'string' ? state : state?.state ?? 'inactive'
        },
        onChange: handleBulletedListChange,
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
            : state && typeof state.value === 'string'
              ? { state: state.state, value: state.value }
              : state
                ? { state: state.state }
                : { state: 'inactive' }
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

export function createCurvedDiscTextEditorControls({
  key,
  layout,
  style,
  textPlaceholder,
  textValue,
  onSelectedDiscTextKeyChange,
  onDiscTextEnabledChange,
  onDiscTextStyleChange,
  onApplyDiscTextStylePreset,
  onResetDiscTextStyle,
  onDiscTextLayoutChange,
  onDiscTextAlignmentChange,
  onDiscTextArcSideChange,
  onResetDiscTextLayout,
  onDiscTextValueChange,
}: CurvedDiscTextEditorControlParams): InlinePreviewTextEditorControls {
  const layoutPresets = getDiscTextLayoutPresetsForKey(key)
    .filter((preset) => preset.layout.mode === 'curved')
  const matchingStylePreset = findMatchingContextualTextStylePreset(
    style,
    DISC_TEXT_STYLE_PRESETS,
  )
  const matchingLayoutPreset = getMatchingDiscLayoutPreset({
    layout,
    layoutPresets,
  })

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
              if (isContextualTextCustomPreset(presetId)) return

              const layoutPreset = layoutPresets.find(
                (candidate) => candidate.id === presetId,
              )

              if (layoutPreset) {
                applyDiscTextLayoutPreset({
                  key,
                  layoutPreset,
                  onDiscTextAlignmentChange,
                  onDiscTextArcSideChange,
                  onDiscTextLayoutChange,
                })
              }
            },
          }
        : undefined,
      onReset: () => onResetDiscTextStyle(key),
    },
    text: {
      textValue: {
        label: getDiscTextLabel(key),
        value: textValue,
        placeholder: textPlaceholder,
        onChange: (value) => onDiscTextValueChange(key, value),
      },
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
        min: DISC_TEXT_POINT_SIZE_MIN,
        max: DISC_TEXT_POINT_SIZE_MAX,
        options: DISC_TEXT_POINT_SIZE_PRESETS,
        step: DISC_TEXT_POINT_SIZE_STEP,
        value: layout.fontSizePt,
        onChange: (value: number) =>
          onDiscTextLayoutChange(key, 'fontSizePt', value),
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
        onChange: (pressed) => onDiscTextStyleChange(key, 'bold', pressed),
      },
      italic: {
        label: CONTEXTUAL_TEXT_CONTROL_LABELS.italic,
        pressed: style.italic,
        onChange: (pressed) => onDiscTextStyleChange(key, 'italic', pressed),
      },
      underline: {
        label: CONTEXTUAL_TEXT_CONTROL_LABELS.underline,
        pressed: style.underline,
        onChange: (pressed) => onDiscTextStyleChange(key, 'underline', pressed),
      },
    },
    art: {
      color: {
        label: CONTEXTUAL_TEXT_CONTROL_LABELS.color,
        value: style.color,
        onChange: (value) => onDiscTextStyleChange(key, 'color', value),
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
    },
    utilities: {
      lineSpacing: {
        label: CONTEXTUAL_TEXT_CONTROL_LABELS.lineSpacing,
        min: 0.5,
        max: 1.8,
        step: 0.01,
        value: layout.scale,
        onChange: (value) => onDiscTextLayoutChange(key, 'scale', value),
      },
      x: {
        label: 'Angle',
        min: CURVED_COPYRIGHT_LAYOUT_X_MIN,
        max: CURVED_COPYRIGHT_LAYOUT_X_MAX,
        step: 0.1,
        value: layout.x,
        onChange: (value) => onDiscTextLayoutChange(key, 'x', value),
      },
      y: {
        label: 'Inset',
        min: CURVED_COPYRIGHT_LAYOUT_Y_MIN,
        max: CURVED_COPYRIGHT_LAYOUT_Y_MAX,
        step: 0.1,
        value: layout.y,
        onChange: (value) => onDiscTextLayoutChange(key, 'y', value),
      },
      arcSide: {
        label: CONTEXTUAL_TEXT_CONTROL_LABELS.arcSide,
        options: [
          { label: 'Top arc', value: 'top' },
          { label: 'Bottom arc', value: 'bottom' },
        ],
        value: layout.arcSide,
        onChange: (value) =>
          onDiscTextArcSideChange(key, value as DiscTextArcSide),
      },
      arcDegrees: {
        label: CONTEXTUAL_TEXT_CONTROL_LABELS.arcDegrees,
        min: 80,
        max: 320,
        step: 1,
        value: layout.arcDegrees,
        onChange: (value) =>
          onDiscTextLayoutChange(key, 'arcDegrees', value),
      },
      resetLayout: () => onResetDiscTextLayout(key),
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
