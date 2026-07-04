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
} from '../../discText/pointSize.ts'
import {
  DISC_TEXT_CONTRAST_OPTIONS,
  DISC_TEXT_FONT_OPTIONS,
  DISC_TEXT_STYLE_PRESETS,
  type DiscTextContrastMode,
  type DiscTextStyleField,
  type DiscTextStyleSettings,
  type DiscTextStyleValue,
} from '../../discText/styles.ts'
import {
  getDiscTextLayoutPresetsForKey,
} from '../../layout/presets.ts'
import type { TextContentMode } from '../../text/htmlText.ts'
import {
  CONTEXTUAL_TEXT_ALIGNMENT_OPTIONS,
  CONTEXTUAL_TEXT_CONTROL_LABELS,
  CONTEXTUAL_TEXT_CUSTOM_PRESET_VALUE,
  createContextualTextPresetOptions,
  findMatchingContextualTextStylePreset,
  isContextualTextCustomPreset,
} from '../../text/contextualTextControlViewModel.ts'
import type {
  InlinePreviewTextEditorSelectionRange,
  InlinePreviewTextEditorControls,
  InlinePreviewTextEditorToggleState,
} from './InlinePreviewTextEditor'
import {
  applyDiscTextLayoutPreset,
  createDiscInlineTextChangeHandlers,
  getMatchingDiscLayoutPreset,
  hasInlineSelectionRange,
} from './discInlineTextEditorControlHelpers.ts'

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
    command: 'bold' | 'italic' | 'underline' | 'color' | 'bulletedList' | 'fontFamily' | 'fontSizePt',
    selection: InlinePreviewTextEditorSelectionRange | undefined,
    value: boolean | number | string,
  ) => InlinePreviewTextEditorSelectionRange | void
  getDiscTextRichTextCommandState?: (
    key: DiscTextKey,
    command: 'bold' | 'italic' | 'underline' | 'color' | 'bulletedList' | 'fontFamily' | 'fontSizePt',
    selection: InlinePreviewTextEditorSelectionRange,
  ) => 'active' | 'inactive' | 'mixed' | {
    state: 'active' | 'inactive' | 'mixed'
    value?: number | string
    }
  onDiscTextVisualAvoidanceChange: (
    key: DiscTextKey,
    avoidVisualElements: boolean,
  ) => void
  metadataSource?: NonNullable<InlinePreviewTextEditorControls['utilities']>['metadataSource']
  onResetDiscTextLayout: (key: DiscTextKey) => void
  onResetDiscTextStyle: (key: DiscTextKey) => void
  onSelectedDiscTextKeyChange: (key: DiscTextKey | null) => void
  style: DiscTextStyleSettings[DiscTextKey]
}

export type CurvedDiscTextEditorControlParams = Omit<
  DiscInlineTextEditorControlParams,
  | 'onDiscTextVisualAvoidanceChange'
> & {
  canChangeArcSide?: boolean
  onDiscTextArcSideChange: (
    key: DiscTextKey,
    arcSide: DiscTextArcSide,
  ) => void
}

type DiscTextRichCommandStateGetter =
  DiscInlineTextEditorControlParams['getDiscTextRichTextCommandState']

function getInlineSelectionCommandState({
  command,
  getDiscTextRichTextCommandState,
  key,
  selection,
}: {
  command: Parameters<NonNullable<DiscTextRichCommandStateGetter>>[1]
  getDiscTextRichTextCommandState: DiscTextRichCommandStateGetter
  key: DiscTextKey
  selection: InlinePreviewTextEditorSelectionRange | undefined
}) {
  if (!selection || !hasInlineSelectionRange(selection)) {
    return undefined
  }

  return getDiscTextRichTextCommandState?.(key, command, selection)
}

function getInlineSelectionToggleState({
  command,
  getDiscTextRichTextCommandState,
  key,
  selection,
}: {
  command: Parameters<NonNullable<DiscTextRichCommandStateGetter>>[1]
  getDiscTextRichTextCommandState: DiscTextRichCommandStateGetter
  key: DiscTextKey
  selection: InlinePreviewTextEditorSelectionRange | undefined
}): InlinePreviewTextEditorToggleState | undefined {
  if (!selection || !hasInlineSelectionRange(selection)) {
    return undefined
  }

  const state = getInlineSelectionCommandState({
    command,
    getDiscTextRichTextCommandState,
    key,
    selection,
  })

  return state
    ? typeof state === 'string' ? state : state.state
    : 'inactive'
}

function getInlineSelectionStringValue({
  command,
  getDiscTextRichTextCommandState,
  key,
  selection,
}: {
  command: Parameters<NonNullable<DiscTextRichCommandStateGetter>>[1]
  getDiscTextRichTextCommandState: DiscTextRichCommandStateGetter
  key: DiscTextKey
  selection: InlinePreviewTextEditorSelectionRange | undefined
}): { state: InlinePreviewTextEditorToggleState; value?: string } | undefined {
  if (!selection || !hasInlineSelectionRange(selection)) {
    return undefined
  }

  const state = getInlineSelectionCommandState({
    command,
    getDiscTextRichTextCommandState,
    key,
    selection,
  })

  return typeof state === 'string'
    ? { state }
    : state && typeof state.value === 'string'
      ? { state: state.state, value: state.value }
      : state
        ? { state: state.state }
        : { state: 'inactive' }
}

function getInlineSelectionNumberValue({
  command,
  getDiscTextRichTextCommandState,
  key,
  selection,
}: {
  command: Parameters<NonNullable<DiscTextRichCommandStateGetter>>[1]
  getDiscTextRichTextCommandState: DiscTextRichCommandStateGetter
  key: DiscTextKey
  selection: InlinePreviewTextEditorSelectionRange | undefined
}): { state: InlinePreviewTextEditorToggleState; value?: number } | undefined {
  if (!selection || !hasInlineSelectionRange(selection)) {
    return undefined
  }

  const state = getInlineSelectionCommandState({
    command,
    getDiscTextRichTextCommandState,
    key,
    selection,
  })

  return typeof state === 'string'
    ? { state }
    : state && typeof state.value === 'number'
      ? { state: state.state, value: state.value }
      : state
        ? { state: state.state }
        : { state: 'inactive' }
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
  metadataSource,
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
  const {
    handleBulletedListChange,
    handleInlineColorChange,
    handleInlineFontFamilyChange,
    handleInlineSizeChange,
    handleInlineToggleChange,
  } = createDiscInlineTextChangeHandlers({
    key,
    onDiscTextLayoutChange,
    onDiscTextRichTextCommand,
    onDiscTextStyleChange,
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
        getSelectionValue: (selection) =>
          getInlineSelectionStringValue({
            command: 'fontFamily',
            getDiscTextRichTextCommandState,
            key,
            selection,
          }),
        onChange: handleInlineFontFamilyChange,
      },
      size: {
        label: CONTEXTUAL_TEXT_CONTROL_LABELS.size,
        min: DISC_TEXT_POINT_SIZE_MIN,
        max: DISC_TEXT_POINT_SIZE_MAX,
        options: DISC_TEXT_POINT_SIZE_PRESETS,
        step: DISC_TEXT_POINT_SIZE_STEP,
        value: layout.fontSizePt,
        getSelectionValue: (selection) =>
          getInlineSelectionNumberValue({
            command: 'fontSizePt',
            getDiscTextRichTextCommandState,
            key,
            selection,
          }),
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
        getSelectionState: (selection) =>
          getInlineSelectionToggleState({
            command: 'bold',
            getDiscTextRichTextCommandState,
            key,
            selection,
          }),
        onChange: (pressed, selection) =>
          handleInlineToggleChange('bold', 'bold', pressed, selection),
      },
      italic: {
        label: CONTEXTUAL_TEXT_CONTROL_LABELS.italic,
        pressed: style.italic,
        getSelectionState: (selection) =>
          getInlineSelectionToggleState({
            command: 'italic',
            getDiscTextRichTextCommandState,
            key,
            selection,
          }),
        onChange: (pressed, selection) =>
          handleInlineToggleChange('italic', 'italic', pressed, selection),
      },
      underline: {
        label: CONTEXTUAL_TEXT_CONTROL_LABELS.underline,
        pressed: style.underline,
        getSelectionState: (selection) =>
          getInlineSelectionToggleState({
            command: 'underline',
            getDiscTextRichTextCommandState,
            key,
            selection,
          }),
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
        getSelectionValue: (selection) =>
          getInlineSelectionStringValue({
            command: 'color',
            getDiscTextRichTextCommandState,
            key,
            selection,
          }),
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
      backgroundColor: {
        label: CONTEXTUAL_TEXT_CONTROL_LABELS.backgroundColor,
        value: style.backgroundColor,
        onChange: (value) =>
          onDiscTextStyleChange(key, 'backgroundColor', value),
      },
      backgroundOpacity: {
        label: CONTEXTUAL_TEXT_CONTROL_LABELS.backgroundOpacity,
        min: 0,
        max: 1,
        step: 0.05,
        value: style.backgroundOpacity,
        onChange: (value) =>
          onDiscTextStyleChange(key, 'backgroundOpacity', value),
      },
      backgroundPadding: {
        label: CONTEXTUAL_TEXT_CONTROL_LABELS.backgroundPadding,
        min: 0,
        max: 4,
        step: 0.1,
        value: style.backgroundPadding,
        onChange: (value) =>
          onDiscTextStyleChange(key, 'backgroundPadding', value),
      },
      borderEnabled: {
        label: CONTEXTUAL_TEXT_CONTROL_LABELS.borderEnabled,
        checked: style.borderEnabled,
        onChange: (checked) =>
          onDiscTextStyleChange(key, 'borderEnabled', checked),
      },
      borderColor: {
        label: CONTEXTUAL_TEXT_CONTROL_LABELS.borderColor,
        value: style.borderColor,
        onChange: (value) =>
          onDiscTextStyleChange(key, 'borderColor', value),
      },
      borderRadius: {
        label: CONTEXTUAL_TEXT_CONTROL_LABELS.borderRadius,
        min: 0,
        max: 4,
        step: 0.1,
        value: style.borderRadius,
        onChange: (value) =>
          onDiscTextStyleChange(key, 'borderRadius', value),
      },
    },
    utilities: {
      metadataSource,
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
    },
    html: {
      source: {
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
  isHtmlSourceEnabled,
  onSelectedDiscTextKeyChange,
  onDiscTextEnabledChange,
  onDiscTextStyleChange,
  onApplyDiscTextStylePreset,
  onResetDiscTextStyle,
  onDiscTextLayoutChange,
  onDiscTextAlignmentChange,
  onDiscTextArcSideChange,
  onDiscTextContentModeChange,
  onResetDiscTextLayout,
  onDiscTextRichTextCommand,
  getDiscTextRichTextCommandState,
  canChangeArcSide = true,
  metadataSource,
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
  const {
    handleInlineColorChange,
    handleInlineFontFamilyChange,
    handleInlineSizeChange,
    handleInlineToggleChange,
  } = createDiscInlineTextChangeHandlers({
    key,
    onDiscTextLayoutChange,
    onDiscTextRichTextCommand,
    onDiscTextStyleChange,
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
      fontFamily: {
        label: CONTEXTUAL_TEXT_CONTROL_LABELS.fontFamily,
        options: DISC_TEXT_FONT_OPTIONS.map(({ label, value }) => ({
          label,
          value,
        })),
        value: style.fontFamily,
        getSelectionValue: (selection) =>
          getInlineSelectionStringValue({
            command: 'fontFamily',
            getDiscTextRichTextCommandState,
            key,
            selection,
          }),
        onChange: handleInlineFontFamilyChange,
      },
      size: {
        label: CONTEXTUAL_TEXT_CONTROL_LABELS.size,
        min: DISC_TEXT_POINT_SIZE_MIN,
        max: DISC_TEXT_POINT_SIZE_MAX,
        options: DISC_TEXT_POINT_SIZE_PRESETS,
        step: DISC_TEXT_POINT_SIZE_STEP,
        value: layout.fontSizePt,
        getSelectionValue: (selection) =>
          getInlineSelectionNumberValue({
            command: 'fontSizePt',
            getDiscTextRichTextCommandState,
            key,
            selection,
          }),
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
        getSelectionState: (selection) =>
          getInlineSelectionToggleState({
            command: 'bold',
            getDiscTextRichTextCommandState,
            key,
            selection,
          }),
        onChange: (pressed, selection) =>
          handleInlineToggleChange('bold', 'bold', pressed, selection),
      },
      italic: {
        label: CONTEXTUAL_TEXT_CONTROL_LABELS.italic,
        pressed: style.italic,
        getSelectionState: (selection) =>
          getInlineSelectionToggleState({
            command: 'italic',
            getDiscTextRichTextCommandState,
            key,
            selection,
          }),
        onChange: (pressed, selection) =>
          handleInlineToggleChange('italic', 'italic', pressed, selection),
      },
      underline: {
        label: CONTEXTUAL_TEXT_CONTROL_LABELS.underline,
        pressed: style.underline,
        getSelectionState: (selection) =>
          getInlineSelectionToggleState({
            command: 'underline',
            getDiscTextRichTextCommandState,
            key,
            selection,
          }),
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
        getSelectionValue: (selection) =>
          getInlineSelectionStringValue({
            command: 'color',
            getDiscTextRichTextCommandState,
            key,
            selection,
          }),
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
    },
    utilities: {
      metadataSource,
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
      ...(canChangeArcSide
        ? {
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
          }
        : {}),
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
    html: {
      source: {
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
