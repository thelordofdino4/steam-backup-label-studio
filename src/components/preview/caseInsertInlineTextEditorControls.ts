import {
  CASE_INSERT_TEXT_CONTRAST_OPTIONS,
  CASE_INSERT_TEXT_FONT_OPTIONS,
  CASE_INSERT_TEXT_STYLE_PRESETS,
  type CaseInsertTextContrastMode,
  type CaseInsertTextFontFamily,
  type CaseInsertTextStyle,
  type CaseInsertTextStyleField,
  type CaseInsertTextStyleValue,
} from '../../caseInsert/textStyles.ts'
import {
  CASE_INSERT_TEXT_WIDTH_MAX,
  CASE_INSERT_TEXT_WIDTH_MIN,
  type CaseInsertTextLayoutPreset,
  DEFAULT_CASE_INSERT_TEXT_WIDTH,
  getCaseInsertTextLayoutWidth,
} from '../../caseInsert/textLayout.ts'
import type {
  CaseInsertPreviewTextTarget,
} from '../../caseInsert/previewTextSelection'
import type {
  ProjectCaseInsertLayout,
  ProjectCaseInsertTextAlign,
} from '../../project/projectTypes'
import type { LegacyTextContentMode, TextContentMode } from '../../text/htmlText'
import {
  CASE_INSERT_TEXT_FONT_SIZE_PT_MAX,
  CASE_INSERT_TEXT_FONT_SIZE_PT_MIN,
  CASE_INSERT_TEXT_FONT_SIZE_PT_PRESETS,
  getCaseInsertLayoutFontSizePt,
  getDefaultCaseInsertFontSizePt,
  type CaseInsertTextSizeRole,
} from '../../caseInsert/textSizing.ts'
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

export type CaseInsertPreviewTextControlHandlers = {
  onEnabledChange: (
    target: CaseInsertPreviewTextTarget,
    enabled: boolean,
  ) => void
  onStyleChange: (
    target: CaseInsertPreviewTextTarget,
    field: CaseInsertTextStyleField,
    value: CaseInsertTextStyleValue,
  ) => void
  onApplyStylePreset: (
    target: CaseInsertPreviewTextTarget,
    presetId: string,
  ) => void
  onApplyLayoutPreset: (
    target: CaseInsertPreviewTextTarget,
    presetId: string,
  ) => void
  onResetStyle: (target: CaseInsertPreviewTextTarget) => void
  onResetLayout: (target: CaseInsertPreviewTextTarget) => void
  onLayoutChange: (
    target: CaseInsertPreviewTextTarget,
    field: keyof ProjectCaseInsertLayout,
    value: number,
  ) => void
  onAlignChange: (
    target: CaseInsertPreviewTextTarget,
    align: ProjectCaseInsertTextAlign,
  ) => void
  onAvoidVisualElementsChange: (
    target: CaseInsertPreviewTextTarget,
    avoidVisualElements: boolean,
  ) => void
  onContentModeChange: (
    target: CaseInsertPreviewTextTarget,
    contentMode: TextContentMode,
  ) => void
  onRichTextCommand?: (
    target: CaseInsertPreviewTextTarget,
    command: 'bold' | 'italic' | 'underline' | 'color' | 'bulletedList' | 'fontSizePt',
    selection: InlinePreviewTextEditorSelectionRange | undefined,
    value: boolean | number | string,
  ) => InlinePreviewTextEditorSelectionRange | void
  onRichTextKeyboardCommand?: (
    target: CaseInsertPreviewTextTarget,
    command: 'enter' | 'shiftEnter' | 'backspace',
    selection: InlinePreviewTextEditorSelectionRange,
  ) => InlinePreviewTextEditorSelectionRange | null | void
  getRichTextCommandState?: (
    target: CaseInsertPreviewTextTarget,
    command: 'bold' | 'italic' | 'underline' | 'color' | 'bulletedList' | 'fontSizePt',
    selection: InlinePreviewTextEditorSelectionRange,
  ) => 'active' | 'inactive' | 'mixed' | {
    state: 'active' | 'inactive' | 'mixed'
    value?: number | string
  }
}

type CaseInsertInlineTextEditorControlParams = {
  align?: ProjectCaseInsertTextAlign
  avoidVisualElements: boolean
  handlers: CaseInsertPreviewTextControlHandlers
  label: string
  layout: ProjectCaseInsertLayout
  layoutPresets?: readonly CaseInsertTextLayoutPreset[]
  contentMode?: LegacyTextContentMode
  htmlSourceActive?: boolean
  fontSizeRole?: CaseInsertTextSizeRole
  style: CaseInsertTextStyle
  target: CaseInsertPreviewTextTarget
  widthFallback?: number
  xLabel?: string
  xMax?: number
  xMin?: number
  xStep?: number
  yLabel?: string
  yMax?: number
  yMin?: number
  yStep?: number
  onDeleteComplete?: () => void
  onHtmlSourceActiveChange?: (active: boolean) => void
  onResetLayout?: () => void
}

function getMatchingCaseInsertLayoutPreset({
  align,
  layout,
  layoutPresets,
}: {
  align?: ProjectCaseInsertTextAlign
  layout: ProjectCaseInsertLayout
  layoutPresets: readonly CaseInsertTextLayoutPreset[]
}) {
  return findMatchingContextualTextPreset(layoutPresets, (preset) => {
    if (preset.align && preset.align !== align) {
      return false
    }

    return Object.entries(preset.layout).every(([field, value]) =>
      contextualTextNumericValuesMatch(
        layout[
          field as keyof Pick<
            ProjectCaseInsertLayout,
            'fontSizePt' | 'scale' | 'width' | 'x' | 'y'
          >
        ],
        value,
      ),
    )
  })
}

function hasInlineSelectionRange(
  selection: InlinePreviewTextEditorSelectionRange,
) {
  return selection.start !== selection.end
}

export function createCaseInsertInlineTextEditorControls({
  align,
  avoidVisualElements,
  handlers,
  label,
  layout,
  layoutPresets = [],
  contentMode = 'plain',
  htmlSourceActive = contentMode === 'html',
  fontSizeRole = 'coverCallout',
  style,
  target,
  widthFallback = DEFAULT_CASE_INSERT_TEXT_WIDTH,
  xLabel = 'X',
  xMax = 100,
  xMin = 0,
  xStep = 1,
  yLabel = 'Y',
  yMax = 100,
  yMin = 0,
  yStep = 1,
  onDeleteComplete,
  onHtmlSourceActiveChange,
  onResetLayout,
}: CaseInsertInlineTextEditorControlParams): InlinePreviewTextEditorControls {
  const matchingStylePreset = findMatchingContextualTextStylePreset(
    style,
    CASE_INSERT_TEXT_STYLE_PRESETS,
  )
  const matchingLayoutPreset = getMatchingCaseInsertLayoutPreset({
    align,
    layout,
    layoutPresets,
  })
  const fontSizePt = getCaseInsertLayoutFontSizePt(layout, fontSizeRole)

  const handleInlineToggleChange = (
    command: 'bold' | 'italic' | 'underline',
    field: Extract<CaseInsertTextStyleField, 'bold' | 'italic' | 'underline'>,
    pressed: boolean,
    selection?: InlinePreviewTextEditorSelectionRange,
  ) => {
    if (selection && selection.start !== selection.end) {
      return handlers.onRichTextCommand?.(target, command, selection, pressed)
    }

    handlers.onStyleChange(target, field, pressed)
    return undefined
  }
  const handleInlineColorChange = (
    value: string,
    selection?: InlinePreviewTextEditorSelectionRange,
  ) => {
    if (selection && selection.start !== selection.end) {
      handlers.onRichTextCommand?.(target, 'color', selection, value)
      return
    }

    handlers.onStyleChange(target, 'color', value)
  }
  const handleInlineSizeChange = (
    value: number,
    selection?: InlinePreviewTextEditorSelectionRange,
  ) => {
    if (selection && selection.start !== selection.end) {
      handlers.onRichTextCommand?.(target, 'fontSizePt', selection, value)
      return
    }

    handlers.onLayoutChange(
      target,
      'fontSizePt',
      value || getDefaultCaseInsertFontSizePt(fontSizeRole),
    )
  }
  const handleBulletedListChange = (
    pressed: boolean,
    selection?: InlinePreviewTextEditorSelectionRange,
  ) => {
    return handlers.onRichTextCommand?.(
      target,
      'bulletedList',
      selection,
      pressed,
    )
  }

  return {
    presets: {
      style: {
        label: CONTEXTUAL_TEXT_CONTROL_LABELS.stylePreset,
        options: createContextualTextPresetOptions(
          CASE_INSERT_TEXT_STYLE_PRESETS,
        ),
        value: matchingStylePreset?.id ?? CONTEXTUAL_TEXT_CUSTOM_PRESET_VALUE,
        onChange: (presetId) => {
          if (!isContextualTextCustomPreset(presetId)) {
            handlers.onApplyStylePreset(target, presetId)
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
              if (!isContextualTextCustomPreset(presetId)) {
                handlers.onApplyLayoutPreset(target, presetId)
              }
            },
          }
        : undefined,
      onReset: () => handlers.onResetStyle(target),
    },
    text: {
      fontFamily: {
        label: CONTEXTUAL_TEXT_CONTROL_LABELS.fontFamily,
        options: CASE_INSERT_TEXT_FONT_OPTIONS.map(({ label, value }) => ({
          label,
          value,
        })),
        value: style.fontFamily,
        onChange: (value) =>
          handlers.onStyleChange(
            target,
            'fontFamily',
            value as CaseInsertTextFontFamily,
          ),
      },
      size: {
        label: 'Font size (pt)',
        min: CASE_INSERT_TEXT_FONT_SIZE_PT_MIN,
        max: CASE_INSERT_TEXT_FONT_SIZE_PT_MAX,
        options: CASE_INSERT_TEXT_FONT_SIZE_PT_PRESETS,
        step: 0.25,
        value: fontSizePt,
        getSelectionValue: (selection) => {
          if (!hasInlineSelectionRange(selection)) return undefined

          const state = handlers.getRichTextCommandState?.(
            target,
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
      alignment: align
        ? {
            label: CONTEXTUAL_TEXT_CONTROL_LABELS.alignment,
            options: CONTEXTUAL_TEXT_ALIGNMENT_OPTIONS,
            value: align,
            onChange: (value) =>
              handlers.onAlignChange(
                target,
                value as ProjectCaseInsertTextAlign,
              ),
          }
        : undefined,
      bold: {
        label: CONTEXTUAL_TEXT_CONTROL_LABELS.bold,
        pressed: style.bold,
        getSelectionState: (selection) => {
          if (!hasInlineSelectionRange(selection)) return undefined

          const state = handlers.getRichTextCommandState?.(
            target,
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

          const state = handlers.getRichTextCommandState?.(
            target,
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

          const state = handlers.getRichTextCommandState?.(
            target,
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
          const state = handlers.getRichTextCommandState?.(
            target,
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

          const state = handlers.getRichTextCommandState?.(
            target,
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
        options: CASE_INSERT_TEXT_CONTRAST_OPTIONS.map(({ label, value }) => ({
          label,
          value,
        })),
        value: style.contrast,
        onChange: (value) =>
          handlers.onStyleChange(
            target,
            'contrast',
            value as CaseInsertTextContrastMode,
          ),
      },
      backgroundEnabled: {
        label: CONTEXTUAL_TEXT_CONTROL_LABELS.backgroundEnabled,
        checked: style.backgroundEnabled,
        onChange: (checked) =>
          handlers.onStyleChange(target, 'backgroundEnabled', checked),
      },
      backgroundColor: style.backgroundEnabled
        ? {
            label: CONTEXTUAL_TEXT_CONTROL_LABELS.backgroundColor,
            value: style.backgroundColor,
            onChange: (value) =>
              handlers.onStyleChange(target, 'backgroundColor', value),
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
              handlers.onStyleChange(target, 'backgroundOpacity', value),
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
              handlers.onStyleChange(target, 'backgroundPadding', value),
          }
        : undefined,
      borderEnabled: {
        label: CONTEXTUAL_TEXT_CONTROL_LABELS.borderEnabled,
        checked: style.borderEnabled,
        disabled: !style.backgroundEnabled,
        disabledReason: 'Enable Background before editing the border.',
        onChange: (checked) =>
          handlers.onStyleChange(target, 'borderEnabled', checked),
      },
      borderColor: style.backgroundEnabled && style.borderEnabled
        ? {
            label: CONTEXTUAL_TEXT_CONTROL_LABELS.borderColor,
            value: style.borderColor,
            onChange: (value) =>
              handlers.onStyleChange(target, 'borderColor', value),
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
              handlers.onStyleChange(target, 'borderRadius', value),
          }
        : undefined,
    },
    utilities: {
      respectVisualElements: {
        label: CONTEXTUAL_TEXT_CONTROL_LABELS.respectVisualElements,
        checked: avoidVisualElements,
        onChange: (checked) =>
          handlers.onAvoidVisualElementsChange(target, checked),
      },
      width: {
        label: CONTEXTUAL_TEXT_CONTROL_LABELS.width,
        min: CASE_INSERT_TEXT_WIDTH_MIN,
        max: CASE_INSERT_TEXT_WIDTH_MAX,
        step: 1,
        value: getCaseInsertTextLayoutWidth(layout, widthFallback),
        onChange: (value) => handlers.onLayoutChange(target, 'width', value),
      },
      x: {
        label: xLabel,
        min: xMin,
        max: xMax,
        step: xStep,
        value: layout.x,
        onChange: (value) => handlers.onLayoutChange(target, 'x', value),
      },
      y: {
        label: yLabel,
        min: yMin,
        max: yMax,
        step: yStep,
        value: layout.y,
        onChange: (value) => handlers.onLayoutChange(target, 'y', value),
      },
      resetLayout: onResetLayout,
    },
    html: {
      source: {
        label: CONTEXTUAL_TEXT_CONTROL_LABELS.htmlSource,
        checked: htmlSourceActive,
        onChange: (checked) => {
          if (checked) {
            if (contentMode !== 'html') {
              handlers.onContentModeChange(target, 'html')
            }
            onHtmlSourceActiveChange?.(true)
            return
          }

          if (onHtmlSourceActiveChange) {
            onHtmlSourceActiveChange(false)
            return
          }

          handlers.onContentModeChange(target, 'plain')
        },
      },
    },
    deleteAction: {
      label: CONTEXTUAL_TEXT_CONTROL_LABELS.delete,
      ariaLabel: `Delete ${label}`,
      onDelete: () => {
        handlers.onEnabledChange(target, false)
        onDeleteComplete?.()
      },
    },
  }
}
