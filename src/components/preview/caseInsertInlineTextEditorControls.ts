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
import type {
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
}

type CaseInsertInlineTextEditorControlParams = {
  align?: ProjectCaseInsertTextAlign
  avoidVisualElements: boolean
  handlers: CaseInsertPreviewTextControlHandlers
  label: string
  layout: ProjectCaseInsertLayout
  layoutPresets?: readonly CaseInsertTextLayoutPreset[]
  scaleMax?: number
  scaleMin?: number
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
  onResetLayout?: () => void
}

const TEXT_ALIGNMENT_OPTIONS = [
  { value: 'left', label: 'Left' },
  { value: 'center', label: 'Center' },
  { value: 'right', label: 'Right' },
] as const

const CUSTOM_PRESET_OPTION = { label: 'Custom', value: 'custom' } as const

function numericValuesMatch(first: number | undefined, second: number) {
  return typeof first === 'number' && Math.abs(first - second) < 0.001
}

function getMatchingCaseInsertStylePreset(style: CaseInsertTextStyle) {
  return CASE_INSERT_TEXT_STYLE_PRESETS.find((preset) =>
    Object.entries(preset.style).every(([field, value]) =>
      style[field as keyof CaseInsertTextStyle] === value),
  )
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
  return layoutPresets.find((preset) => {
    if (preset.align && preset.align !== align) {
      return false
    }

    return Object.entries(preset.layout).every(([field, value]) =>
      numericValuesMatch(
        layout[field as keyof Pick<ProjectCaseInsertLayout, 'scale' | 'width' | 'x' | 'y'>],
        value,
      ),
    )
  })
}

export function createCaseInsertInlineTextEditorControls({
  align,
  avoidVisualElements,
  handlers,
  label,
  layout,
  layoutPresets = [],
  scaleMax = 1.8,
  scaleMin = 0.7,
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
  onResetLayout,
}: CaseInsertInlineTextEditorControlParams): InlinePreviewTextEditorControls {
  const matchingStylePreset = getMatchingCaseInsertStylePreset(style)
  const matchingLayoutPreset = getMatchingCaseInsertLayoutPreset({
    align,
    layout,
    layoutPresets,
  })

  return {
    presets: {
      style: {
        label: 'Style preset',
        options: [
          CUSTOM_PRESET_OPTION,
          ...CASE_INSERT_TEXT_STYLE_PRESETS.map(({ id, label }) => ({
            label,
            value: id,
          })),
        ],
        value: matchingStylePreset?.id ?? CUSTOM_PRESET_OPTION.value,
        onChange: (presetId) => {
          if (presetId !== CUSTOM_PRESET_OPTION.value) {
            handlers.onApplyStylePreset(target, presetId)
          }
        },
      },
      layout: layoutPresets.length > 0
        ? {
            label: 'Layout preset',
            options: [
              CUSTOM_PRESET_OPTION,
              ...layoutPresets.map(({ id, label }) => ({
                label,
                value: id,
              })),
            ],
            value: matchingLayoutPreset?.id ?? CUSTOM_PRESET_OPTION.value,
            onChange: (presetId) => {
              if (presetId !== CUSTOM_PRESET_OPTION.value) {
                handlers.onApplyLayoutPreset(target, presetId)
              }
            },
          }
        : undefined,
      onReset: () => handlers.onResetStyle(target),
    },
    text: {
      fontFamily: {
        label: 'Font',
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
        label: 'Size',
        min: scaleMin,
        max: scaleMax,
        step: 0.01,
        value: layout.scale,
        onChange: (value) => handlers.onLayoutChange(target, 'scale', value),
      },
      alignment: align
        ? {
            label: 'Align',
            options: TEXT_ALIGNMENT_OPTIONS,
            value: align,
            onChange: (value) =>
              handlers.onAlignChange(
                target,
                value as ProjectCaseInsertTextAlign,
              ),
          }
        : undefined,
      bold: {
        label: 'Bold',
        pressed: style.bold,
        onChange: (pressed) => handlers.onStyleChange(target, 'bold', pressed),
      },
      italic: {
        label: 'Italic',
        pressed: style.italic,
        onChange: (pressed) => handlers.onStyleChange(target, 'italic', pressed),
      },
      underline: {
        label: 'Underline',
        pressed: style.underline,
        onChange: (pressed) =>
          handlers.onStyleChange(target, 'underline', pressed),
      },
    },
    art: {
      color: {
        label: 'Color',
        value: style.color,
        onChange: (value) => handlers.onStyleChange(target, 'color', value),
      },
      contrast: {
        label: 'Contrast',
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
        label: 'Background',
        checked: style.backgroundEnabled,
        onChange: (checked) =>
          handlers.onStyleChange(target, 'backgroundEnabled', checked),
      },
      backgroundColor: style.backgroundEnabled
        ? {
            label: 'Fill',
            value: style.backgroundColor,
            onChange: (value) =>
              handlers.onStyleChange(target, 'backgroundColor', value),
          }
        : undefined,
      backgroundOpacity: style.backgroundEnabled
        ? {
            label: 'Opacity',
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
            label: 'Padding',
            min: 0,
            max: 4,
            step: 0.1,
            value: style.backgroundPadding,
            onChange: (value) =>
              handlers.onStyleChange(target, 'backgroundPadding', value),
          }
        : undefined,
      borderEnabled: style.backgroundEnabled
        ? {
            label: 'Border',
            checked: style.borderEnabled,
            onChange: (checked) =>
              handlers.onStyleChange(target, 'borderEnabled', checked),
          }
        : undefined,
      borderColor: style.backgroundEnabled && style.borderEnabled
        ? {
            label: 'Line',
            value: style.borderColor,
            onChange: (value) =>
              handlers.onStyleChange(target, 'borderColor', value),
          }
        : undefined,
      borderRadius: style.backgroundEnabled && style.borderEnabled
        ? {
            label: 'Radius',
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
        label: 'Respect visuals',
        checked: avoidVisualElements,
        onChange: (checked) =>
          handlers.onAvoidVisualElementsChange(target, checked),
      },
      width: {
        label: 'Width',
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
      markdownPlanned: true,
    },
    deleteAction: {
      label: 'Delete',
      ariaLabel: `Delete ${label}`,
      onDelete: () => {
        handlers.onEnabledChange(target, false)
        onDeleteComplete?.()
      },
    },
  }
}
