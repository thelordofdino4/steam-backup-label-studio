import type { CSSProperties, PointerEvent } from 'react'
import {
  DISC_TEXT_KEYS,
  getDiscTextContent,
  getDiscTextMarkdownSource,
  getDiscTextLabel,
  isDiscTextMarkdownEnabled,
  isCurvedCopyrightDiscTextLayout,
  type DiscTextAlignment,
  type DiscTextKey,
  type DiscTextLayout,
  type DiscTextLayoutNumericField,
  type DiscTextLayoutSettings,
  type DiscTextMarkdownSources,
  type DiscTextSettings,
  type DiscTextValues,
} from '../../discText/index'
import {
  DISC_TEXT_WIDTH_MAX,
  DISC_TEXT_WIDTH_MIN,
} from '../../discText/constants'
import {
  getStraightDiscTextRenderLayout,
  getStraightDiscTextVisualBounds,
} from '../../discText/renderLayout'
import { getDiscInlineTextEditorGeometryLines } from '../../discText/inlineEditorGeometry'
import type { DiscTextAvoidanceRegion } from '../../discText/avoidance'
import {
  DISC_TEXT_CONTRAST_OPTIONS,
  DISC_TEXT_FONT_OPTIONS,
  DISC_TEXT_STYLE_PRESETS,
  type DiscTextContrastMode,
  type DiscTextFontFamily,
  type DiscTextStyleField,
  type DiscTextStyleSettings,
  type DiscTextStyleValue,
} from '../../discText/styles'
import {
  getDiscTextLayoutPresetsForKey,
  type DiscTextLayoutPreset,
} from '../../layout/presets'
import type { TextMeasureFunction } from '../../discText/renderLayout'
import {
  parseMarkdownText,
  type TextContentMode,
} from '../../text/markdownText'
import {
  InlinePreviewTextEditor,
  INLINE_PREVIEW_TEXT_HOST_CLASS,
  INLINE_PREVIEW_TEXT_TARGET_ATTRIBUTE,
  type InlinePreviewTextEditorControls,
} from './InlinePreviewTextEditor'

export type DiscInlineTextEditorLayerProps = {
  discTextSettings: DiscTextSettings
  discTextValues: DiscTextValues
  discTextMarkdownSources: DiscTextMarkdownSources
  discTextStyles: DiscTextStyleSettings
  discTextLayout: DiscTextLayoutSettings
  title: string
  selectedDiscTextKey: DiscTextKey | null
  avoidanceRegions: DiscTextAvoidanceRegion[]
  measureText: TextMeasureFunction
  onSelectedDiscTextKeyChange: (key: DiscTextKey | null) => void
  onDiscTextEnabledChange: (key: DiscTextKey, enabled: boolean) => void
  onDiscTextValueChange: (key: DiscTextKey, value: string) => void
  onDiscTextContentModeChange: (
    key: DiscTextKey,
    contentMode: TextContentMode,
  ) => void
  onDiscTextEditComplete: (key: DiscTextKey) => void
  onDiscTextStyleChange: (
    key: DiscTextKey,
    field: DiscTextStyleField,
    value: DiscTextStyleValue,
  ) => void
  onApplyDiscTextStylePreset: (key: DiscTextKey, presetId: string) => void
  onResetDiscTextStyle: (key: DiscTextKey) => void
  onDiscTextLayoutChange: (
    key: DiscTextKey,
    field: DiscTextLayoutNumericField,
    value: number,
  ) => void
  onDiscTextAlignmentChange: (
    key: DiscTextKey,
    alignment: DiscTextAlignment,
  ) => void
  onDiscTextVisualAvoidanceChange: (
    key: DiscTextKey,
    avoidVisualElements: boolean,
  ) => void
  onResetDiscTextLayout: (key: DiscTextKey) => void
  onMoveHandlePointerDown: (
    event: PointerEvent<Element>,
    key: DiscTextKey,
  ) => void
  onMoveHandlePointerMove: (event: PointerEvent<Element>) => void
  onMoveHandlePointerUp: (event: PointerEvent<Element>) => void
}

type DiscInlineEditorBounds = {
  centerX: number
  centerY: number
  halfWidth: number
  halfHeight: number
}

const DISC_INLINE_EDITOR_MIN_WIDTH_PERCENT = 4

const DISC_TEXT_RENDERED_PREFIXES: Partial<Record<DiscTextKey, string>> = {
  backupDate: 'Backed up ',
  appId: 'Steam App ID ',
  developer: 'Developer: ',
  publisher: 'Publisher: ',
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

function getMatchingDiscStylePreset(style: DiscTextStyleSettings[DiscTextKey]) {
  return DISC_TEXT_STYLE_PRESETS.find((preset) =>
    Object.entries(preset.style).every(([field, value]) =>
      style[field as keyof DiscTextStyleSettings[DiscTextKey]] === value),
  )
}

function getMatchingDiscLayoutPreset({
  layout,
  layoutPresets,
}: {
  layout: DiscTextLayout
  layoutPresets: readonly DiscTextLayoutPreset[]
}) {
  return layoutPresets.find((preset) => {
    if (preset.layout.align && preset.layout.align !== layout.align) {
      return false
    }

    if (preset.layout.mode && preset.layout.mode !== layout.mode) {
      return false
    }

    return (['x', 'y', 'width', 'scale', 'arcDegrees'] as const).every(
      (field) =>
        typeof preset.layout[field] === 'number'
          ? numericValuesMatch(preset.layout[field], layout[field])
          : true,
    )
  })
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

function getDiscInlineEditorRawValue(key: DiscTextKey, value: string) {
  const prefix = DISC_TEXT_RENDERED_PREFIXES[key]

  if (prefix && value.startsWith(prefix)) {
    return value.slice(prefix.length)
  }

  return value
}

function getDiscInlineEditorBounds(
  layout: DiscTextLayout,
  renderLayout: ReturnType<typeof getStraightDiscTextRenderLayout>,
  measureText: TextMeasureFunction,
): DiscInlineEditorBounds {
  if (renderLayout.lines.length > 0) {
    return getStraightDiscTextVisualBounds(renderLayout, measureText)
  }

  return {
    centerX: 50 + layout.x,
    centerY: layout.y,
    halfWidth: Math.max(
      DISC_INLINE_EDITOR_MIN_WIDTH_PERCENT / 2,
      Math.min(layout.width / 2, DISC_INLINE_EDITOR_MIN_WIDTH_PERCENT),
    ),
    halfHeight: renderLayout.lineHeight / 2,
  }
}

function createDiscInlineTextEditorControls({
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
  isMarkdownEnabled,
  onDiscTextContentModeChange,
}: {
  key: DiscTextKey
  layout: DiscTextLayout
  style: DiscTextStyleSettings[DiscTextKey]
  onSelectedDiscTextKeyChange: (key: DiscTextKey | null) => void
  onDiscTextEnabledChange: (key: DiscTextKey, enabled: boolean) => void
  onDiscTextStyleChange: (
    key: DiscTextKey,
    field: DiscTextStyleField,
    value: DiscTextStyleValue,
  ) => void
  onApplyDiscTextStylePreset: (key: DiscTextKey, presetId: string) => void
  onResetDiscTextStyle: (key: DiscTextKey) => void
  onDiscTextLayoutChange: (
    key: DiscTextKey,
    field: DiscTextLayoutNumericField,
    value: number,
  ) => void
  onDiscTextAlignmentChange: (
    key: DiscTextKey,
    alignment: DiscTextAlignment,
  ) => void
  onDiscTextVisualAvoidanceChange: (
    key: DiscTextKey,
    avoidVisualElements: boolean,
  ) => void
  onResetDiscTextLayout: (key: DiscTextKey) => void
  isMarkdownEnabled: boolean
  onDiscTextContentModeChange: (
    key: DiscTextKey,
    contentMode: TextContentMode,
  ) => void
}): InlinePreviewTextEditorControls {
  const layoutPresets = getDiscTextLayoutPresetsForKey(key)
    .filter((preset) => preset.layout.mode !== 'curved')
  const matchingStylePreset = getMatchingDiscStylePreset(style)
  const matchingLayoutPreset = getMatchingDiscLayoutPreset({
    layout,
    layoutPresets,
  })

  return {
    presets: {
      style: {
        label: 'Style preset',
        options: [
          CUSTOM_PRESET_OPTION,
          ...DISC_TEXT_STYLE_PRESETS.map(({ id, label }) => ({
            label,
            value: id,
          })),
        ],
        value: matchingStylePreset?.id ?? CUSTOM_PRESET_OPTION.value,
        onChange: (presetId) => {
          if (presetId !== CUSTOM_PRESET_OPTION.value) {
            onApplyDiscTextStylePreset(key, presetId)
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
              if (presetId === CUSTOM_PRESET_OPTION.value) {
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
        label: 'Font',
        options: DISC_TEXT_FONT_OPTIONS.map(({ label, value }) => ({
          label,
          value,
        })),
        value: style.fontFamily,
        onChange: (value) =>
          onDiscTextStyleChange(key, 'fontFamily', value as DiscTextFontFamily),
      },
      size: {
        label: 'Size',
        min: 0.5,
        max: 1.8,
        step: 0.01,
        value: layout.scale,
        onChange: (value) => onDiscTextLayoutChange(key, 'scale', value),
      },
      alignment: {
        label: 'Align',
        options: TEXT_ALIGNMENT_OPTIONS,
        value: layout.align,
        onChange: (value) =>
          onDiscTextAlignmentChange(key, value as DiscTextAlignment),
      },
      bold: {
        label: 'Bold',
        pressed: style.bold,
        onChange: (pressed) =>
          onDiscTextStyleChange(key, 'bold', pressed),
      },
      italic: {
        label: 'Italic',
        pressed: style.italic,
        onChange: (pressed) =>
          onDiscTextStyleChange(key, 'italic', pressed),
      },
      underline: {
        label: 'Underline',
        pressed: style.underline,
        onChange: (pressed) =>
          onDiscTextStyleChange(key, 'underline', pressed),
      },
    },
    art: {
      color: {
        label: 'Color',
        value: style.color,
        onChange: (value) => onDiscTextStyleChange(key, 'color', value),
      },
      contrast: {
        label: 'Contrast',
        options: DISC_TEXT_CONTRAST_OPTIONS.map(({ label, value }) => ({
          label,
          value,
        })),
        value: style.contrast,
        onChange: (value) =>
          onDiscTextStyleChange(key, 'contrast', value as DiscTextContrastMode),
      },
      backgroundEnabled: {
        label: 'Background',
        checked: style.backgroundEnabled,
        onChange: (checked) =>
          onDiscTextStyleChange(key, 'backgroundEnabled', checked),
      },
      backgroundColor: style.backgroundEnabled
        ? {
            label: 'Fill',
            value: style.backgroundColor,
            onChange: (value) =>
              onDiscTextStyleChange(key, 'backgroundColor', value),
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
              onDiscTextStyleChange(key, 'backgroundOpacity', value),
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
              onDiscTextStyleChange(key, 'backgroundPadding', value),
          }
        : undefined,
      borderEnabled: style.backgroundEnabled
        ? {
            label: 'Border',
            checked: style.borderEnabled,
            onChange: (checked) =>
              onDiscTextStyleChange(key, 'borderEnabled', checked),
          }
        : undefined,
      borderColor: style.backgroundEnabled && style.borderEnabled
        ? {
            label: 'Line',
            value: style.borderColor,
            onChange: (value) =>
              onDiscTextStyleChange(key, 'borderColor', value),
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
              onDiscTextStyleChange(key, 'borderRadius', value),
          }
        : undefined,
    },
    utilities: {
      respectVisualElements: {
        label: 'Respect visuals',
        checked: layout.avoidVisualElements,
        onChange: (checked) =>
          onDiscTextVisualAvoidanceChange(key, checked),
      },
      width: {
        label: 'Width',
        min: DISC_TEXT_WIDTH_MIN,
        max: DISC_TEXT_WIDTH_MAX,
        step: 1,
        value: layout.width,
        onChange: (value) => onDiscTextLayoutChange(key, 'width', value),
      },
      x: {
        label: 'X',
        min: -50,
        max: 50,
        step: 0.1,
        value: layout.x,
        onChange: (value) => onDiscTextLayoutChange(key, 'x', value),
      },
      y: {
        label: 'Y',
        min: 0,
        max: 100,
        step: 0.1,
        value: layout.y,
        onChange: (value) => onDiscTextLayoutChange(key, 'y', value),
      },
      resetLayout: () => onResetDiscTextLayout(key),
      markdown: {
        label: 'Markdown',
        checked: isMarkdownEnabled,
        onChange: (checked) =>
          onDiscTextContentModeChange(key, checked ? 'markdown' : 'plain'),
      },
    },
    deleteAction: {
      label: 'Delete',
      ariaLabel: `Delete ${getDiscTextLabel(key)}`,
      onDelete: () => {
        onDiscTextEnabledChange(key, false)
        onSelectedDiscTextKeyChange(null)
      },
    },
  }
}

function getHostStyle({
  bounds,
  renderLayout,
}: {
  bounds: DiscInlineEditorBounds
  renderLayout: ReturnType<typeof getStraightDiscTextRenderLayout>
}) {
  const width = Math.max(0.01, bounds.halfWidth * 2)
  const height = Math.max(0.01, bounds.halfHeight * 2)

  return {
    left: `${bounds.centerX - width / 2}%`,
    top: `${bounds.centerY - height / 2}%`,
    width: `${width}%`,
    height: `${height}%`,
    fontSize: `${renderLayout.fontSize}cqw`,
    lineHeight: `${renderLayout.lineHeight}cqw`,
  } satisfies CSSProperties
}

export function DiscInlineTextEditorLayer({
  discTextSettings,
  discTextValues,
  discTextMarkdownSources,
  discTextStyles,
  discTextLayout,
  title,
  selectedDiscTextKey,
  avoidanceRegions,
  measureText,
  onSelectedDiscTextKeyChange,
  onDiscTextEnabledChange,
  onDiscTextValueChange,
  onDiscTextContentModeChange,
  onDiscTextEditComplete,
  onDiscTextStyleChange,
  onApplyDiscTextStylePreset,
  onResetDiscTextStyle,
  onDiscTextLayoutChange,
  onDiscTextAlignmentChange,
  onDiscTextVisualAvoidanceChange,
  onResetDiscTextLayout,
  onMoveHandlePointerDown,
  onMoveHandlePointerMove,
  onMoveHandlePointerUp,
}: DiscInlineTextEditorLayerProps) {
  return (
    <>
      {DISC_TEXT_KEYS.map((key) => {
        const layout = discTextLayout[key]
        const isSelected = selectedDiscTextKey === key

        if (!isSelected || !discTextSettings[key]) {
          return null
        }

        if (isCurvedCopyrightDiscTextLayout(key, layout)) {
          return null
        }

        const text = getDiscTextContent(key, discTextValues, title)
        const isMarkdownEditing = isDiscTextMarkdownEnabled(
          discTextMarkdownSources,
          key,
        )
        const editValue = isMarkdownEditing
          ? getDiscTextMarkdownSource(discTextMarkdownSources, key, text)
          : text
        const renderedText = isMarkdownEditing
          ? parseMarkdownText(editValue).plainText
          : text
        const textAvoidanceRegions = avoidanceRegions.filter(
          (region) => region.sourceDiscTextKey !== key,
        )
        const renderLayout = getStraightDiscTextRenderLayout(
          key,
          renderedText,
          layout,
          measureText,
          discTextStyles,
          { avoidanceRegions: textAvoidanceRegions },
        )
        const bounds = getDiscInlineEditorBounds(
          layout,
          renderLayout,
          measureText,
        )
        const hostStyle = getHostStyle({ bounds, renderLayout })
        const geometryLines = getDiscInlineTextEditorGeometryLines({
          bounds,
          measureText,
          renderLayout,
        })
        const isEmptyText = renderedText.trim().length === 0
        const targetKey = `disc:${key}`
        const controls = createDiscInlineTextEditorControls({
          key,
          layout,
          style: discTextStyles[key],
          onSelectedDiscTextKeyChange,
          onDiscTextEnabledChange,
          onDiscTextStyleChange,
          onApplyDiscTextStylePreset,
          onResetDiscTextStyle,
          onDiscTextLayoutChange,
          onDiscTextAlignmentChange,
          onDiscTextVisualAvoidanceChange,
          onResetDiscTextLayout,
          isMarkdownEnabled: isMarkdownEditing,
          onDiscTextContentModeChange,
        })

        return (
          <div
            key={key}
            className={[
              'disc-inline-text-host',
              INLINE_PREVIEW_TEXT_HOST_CLASS,
              'is-editing',
              isMarkdownEditing ? 'is-markdown-source' : '',
              isEmptyText ? 'is-empty' : '',
            ].filter(Boolean).join(' ')}
            {...{ [INLINE_PREVIEW_TEXT_TARGET_ATTRIBUTE]: targetKey }}
            style={hostStyle}
            onPointerDown={(event) => {
              event.preventDefault()
              event.stopPropagation()
              onSelectedDiscTextKeyChange(key)
            }}
            onClick={(event) => {
              event.preventDefault()
              event.stopPropagation()
              onSelectedDiscTextKeyChange(key)
            }}
          >
            <InlinePreviewTextEditor
              ariaLabel={`Edit ${getDiscTextLabel(key)}`}
              caretValue={editValue}
              controls={controls}
              geometryLines={geometryLines}
              inputMode={isMarkdownEditing ? 'overlay' : 'adapter'}
              lines={renderLayout.lines}
              sourceMode={isMarkdownEditing}
              targetKey={targetKey}
              value={editValue}
              menuPlacement="below"
              onValueChange={(value) =>
                onDiscTextValueChange(
                  key,
                  isMarkdownEditing
                    ? value
                    : getDiscInlineEditorRawValue(key, value),
                )}
              onMoveHandlePointerDown={(event) =>
                onMoveHandlePointerDown(event, key)}
              onMoveHandlePointerMove={onMoveHandlePointerMove}
              onMoveHandlePointerUp={onMoveHandlePointerUp}
              onDone={() => {
                onDiscTextEditComplete(key)
                onSelectedDiscTextKeyChange(null)
              }}
            />
          </div>
        )
      })}
    </>
  )
}
