import { useState, type CSSProperties, type PointerEvent } from 'react'
import {
  DISC_TEXT_KEYS,
  getDiscTextContent,
  getDiscTextHtmlSource,
  getDiscTextLabel,
  isDiscTextHtmlEnabled,
  isCurvedCopyrightDiscTextLayout,
  type DiscTextAlignment,
  type DiscTextKey,
  type DiscTextLayout,
  type DiscTextLayoutNumericField,
  type DiscTextLayoutSettings,
  type DiscTextHtmlSources,
  type DiscTextSettings,
  type DiscTextValues,
} from '../../discText/index'
import {
  type DiscTextStyleField,
  type DiscTextStyleSettings,
  type DiscTextStyleValue,
} from '../../discText/styles'
import {
  getStraightDiscTextRenderLayout,
  getStraightDiscTextVisualBounds,
} from '../../discText/renderLayout'
import { getDiscInlineTextEditorGeometryLines } from '../../discText/inlineEditorGeometry'
import type { DiscTextAvoidanceRegion } from '../../discText/avoidance'
import type { TextMeasureFunction } from '../../discText/renderLayout'
import {
  parseHtmlText,
  type TextContentMode,
} from '../../text/htmlText'
import {
  InlinePreviewTextEditor,
  INLINE_PREVIEW_TEXT_HOST_CLASS,
} from './InlinePreviewTextEditor'
import {
  createInlinePreviewTextTargetAttributes,
  createDiscInlineTextTargetKey,
} from '../../editor/previewEditableRegistry'
import {
  createDiscInlineTextEditorControls,
} from './discInlineTextEditorControls'

export type DiscInlineTextEditorLayerProps = {
  discTextSettings: DiscTextSettings
  discTextValues: DiscTextValues
  discTextHtmlSources: DiscTextHtmlSources
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
  onDiscTextRichTextCommand: (
    key: DiscTextKey,
    command: 'bold' | 'italic' | 'underline' | 'color' | 'bulletedList',
    selection: { end: number; start: number } | undefined,
    value: boolean | string,
  ) => { end: number; start: number } | void
  getDiscTextRichTextCommandState: (
    key: DiscTextKey,
    command: 'bold' | 'italic' | 'underline' | 'color' | 'bulletedList',
    selection: { end: number; start: number },
  ) => 'active' | 'inactive' | 'mixed' | {
    state: 'active' | 'inactive' | 'mixed'
    value?: string
  }
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
  discTextHtmlSources,
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
  onDiscTextRichTextCommand,
  getDiscTextRichTextCommandState,
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
  const [htmlSourceEditorKey, setHtmlSourceEditorKey] =
    useState<DiscTextKey | null>(null)

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
        const hasHtmlSource = isDiscTextHtmlEnabled(discTextHtmlSources, key)
        const isHtmlSourceEditing = htmlSourceEditorKey === key
        const editValue = isHtmlSourceEditing
          ? getDiscTextHtmlSource(discTextHtmlSources, key, text)
          : hasHtmlSource
            ? parseHtmlText(
                getDiscTextHtmlSource(discTextHtmlSources, key, text),
              ).plainText
            : text
        const renderedText = hasHtmlSource
          ? parseHtmlText(
              getDiscTextHtmlSource(discTextHtmlSources, key, text),
            ).plainText
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
        const targetKey = createDiscInlineTextTargetKey(key)
        const controls = createDiscInlineTextEditorControls({
          key,
          layout,
          style: discTextStyles[key],
          onSelectedDiscTextKeyChange,
          onDiscTextEnabledChange,
          onDiscTextStyleChange,
          onDiscTextRichTextCommand,
          getDiscTextRichTextCommandState,
          onApplyDiscTextStylePreset,
          onResetDiscTextStyle,
          onDiscTextLayoutChange,
          onDiscTextAlignmentChange,
          onDiscTextVisualAvoidanceChange,
          onResetDiscTextLayout,
          isHtmlSourceEnabled: isHtmlSourceEditing,
          onDiscTextContentModeChange: (nextKey, contentMode) => {
            if (contentMode === 'html') {
              onDiscTextContentModeChange(nextKey, contentMode)
              setHtmlSourceEditorKey(nextKey)
              return
            }

            setHtmlSourceEditorKey(null)
          },
        })

        return (
          <div
            key={key}
            className={[
              'disc-inline-text-host',
              INLINE_PREVIEW_TEXT_HOST_CLASS,
              'is-editing',
              isHtmlSourceEditing ? 'is-html-source' : '',
              isEmptyText ? 'is-empty' : '',
            ].filter(Boolean).join(' ')}
            {...createInlinePreviewTextTargetAttributes(targetKey)}
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
              inputMode="adapter"
              lines={renderLayout.lines}
              sourceMode={isHtmlSourceEditing}
              targetKey={targetKey}
              value={editValue}
              menuPlacement="below"
              onValueChange={(value) =>
                onDiscTextValueChange(
                  key,
                  isHtmlSourceEditing
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
                setHtmlSourceEditorKey(null)
              }}
            />
          </div>
        )
      })}
    </>
  )
}
