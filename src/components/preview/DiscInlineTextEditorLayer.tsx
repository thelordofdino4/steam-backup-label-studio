import type { CSSProperties, PointerEvent } from 'react'
import {
  DISC_TEXT_KEYS,
  getDiscTextContent,
  getDiscTextLabel,
  isCurvedCopyrightDiscTextLayout,
  type DiscTextKey,
  type DiscTextLayout,
  type DiscTextLayoutSettings,
  type DiscTextSettings,
  type DiscTextValues,
} from '../../discText/index'
import {
  getStraightDiscTextRenderLayout,
  getStraightDiscTextVisualBounds,
} from '../../discText/renderLayout'
import { getDiscInlineTextEditorGeometryLines } from '../../discText/inlineEditorGeometry'
import type { DiscTextAvoidanceRegion } from '../../discText/avoidance'
import type { DiscTextStyleSettings } from '../../discText/styles'
import type { TextMeasureFunction } from '../../discText/renderLayout'
import {
  InlinePreviewTextEditor,
  INLINE_PREVIEW_TEXT_HOST_CLASS,
} from './InlinePreviewTextEditor'

export type DiscInlineTextEditorLayerProps = {
  discTextSettings: DiscTextSettings
  discTextValues: DiscTextValues
  discTextStyles: DiscTextStyleSettings
  discTextLayout: DiscTextLayoutSettings
  title: string
  selectedDiscTextKey: DiscTextKey | null
  avoidanceRegions: DiscTextAvoidanceRegion[]
  measureText: TextMeasureFunction
  onSelectedDiscTextKeyChange: (key: DiscTextKey | null) => void
  onDiscTextValueChange: (key: DiscTextKey, value: string) => void
  onDiscTextEditComplete: (key: DiscTextKey) => void
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

function getDiscInlineEditorMenuPlacement(bounds: DiscInlineEditorBounds) {
  return bounds.centerY + bounds.halfHeight + 18 > 100 ? 'above' : 'below'
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
  discTextStyles,
  discTextLayout,
  title,
  selectedDiscTextKey,
  avoidanceRegions,
  measureText,
  onSelectedDiscTextKeyChange,
  onDiscTextValueChange,
  onDiscTextEditComplete,
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
        const textAvoidanceRegions = avoidanceRegions.filter(
          (region) => region.sourceDiscTextKey !== key,
        )
        const renderLayout = getStraightDiscTextRenderLayout(
          key,
          text,
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
        const isEmptyText = text.trim().length === 0

        return (
          <div
            key={key}
            className={[
              'disc-inline-text-host',
              INLINE_PREVIEW_TEXT_HOST_CLASS,
              'is-editing',
              isEmptyText ? 'is-empty' : '',
            ].filter(Boolean).join(' ')}
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
              caretValue={text}
              geometryLines={geometryLines}
              lines={renderLayout.lines}
              targetKey={`disc:${key}`}
              value={text}
              menuPlacement={getDiscInlineEditorMenuPlacement(bounds)}
              onValueChange={(value) =>
                onDiscTextValueChange(
                  key,
                  getDiscInlineEditorRawValue(key, value),
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
