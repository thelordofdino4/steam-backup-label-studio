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
import type { DiscTextAvoidanceRegion } from '../../discText/avoidance'
import {
  getDiscTextFontFamilyCss,
  type DiscTextStyleSettings,
} from '../../discText/styles'
import type { TextMeasureFunction } from '../../discText/renderLayout'
import {
  InlinePreviewTextEditor,
  INLINE_PREVIEW_TEXT_HOST_CLASS,
  INLINE_PREVIEW_TEXT_LINE_INDEX_ATTRIBUTE,
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
const DISC_INLINE_TEXT_STROKE_COLOR = 'rgba(0, 0, 0, 0.58)'
const DISC_INLINE_TEXT_STROKE_WIDTH = 0.28

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

function getDiscInlineEditorTextShadow(
  style: ReturnType<typeof getStraightDiscTextRenderLayout>['style'],
) {
  return style.contrast === 'shadow' || style.contrast === 'strokeShadow'
    ? '0 0.32cqw 0.62cqw rgba(0, 0, 0, 0.85), 0 0 0.22cqw rgba(0, 0, 0, 0.9)'
    : 'none'
}

function getDiscInlineEditorTextStroke(
  style: ReturnType<typeof getStraightDiscTextRenderLayout>['style'],
) {
  return style.contrast === 'stroke' || style.contrast === 'strokeShadow'
    ? `${DISC_INLINE_TEXT_STROKE_WIDTH}cqw ${DISC_INLINE_TEXT_STROKE_COLOR}`
    : '0 transparent'
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
    color: renderLayout.color,
    fontFamily: renderLayout.fontFamily,
    fontSize: `${renderLayout.fontSize}cqw`,
    fontWeight: renderLayout.fontWeight,
    lineHeight: `${renderLayout.lineHeight}cqw`,
    paintOrder: 'stroke fill',
    textAlign: renderLayout.align,
    textShadow: getDiscInlineEditorTextShadow(renderLayout.style),
    WebkitTextStroke: getDiscInlineEditorTextStroke(renderLayout.style),
  } satisfies CSSProperties
}

function getLineStyle({
  bounds,
  line,
  renderLayout,
}: {
  bounds: DiscInlineEditorBounds
  line: ReturnType<typeof getStraightDiscTextRenderLayout>['lines'][number]
  renderLayout: ReturnType<typeof getStraightDiscTextRenderLayout>
}) {
  const hostLeft = bounds.centerX - bounds.halfWidth
  const hostTop = bounds.centerY - bounds.halfHeight
  const hostWidth = Math.max(0.01, bounds.halfWidth * 2)
  const hostHeight = Math.max(0.01, bounds.halfHeight * 2)
  const anchorOffset =
    renderLayout.textAnchor === 'middle'
      ? '-50%'
      : renderLayout.textAnchor === 'end'
        ? '-100%'
        : '0'

  return {
    left: `${((line.x - hostLeft) / hostWidth) * 100}%`,
    top: `${((line.y - renderLayout.lineHeight / 2 - hostTop) / hostHeight) * 100}%`,
    height: `${renderLayout.lineHeight}cqw`,
    transform: `translateX(${anchorOffset})`,
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
            {renderLayout.lines.map((line, index) => (
              <span
                key={`${key}-${index}-${line.text}`}
                className="disc-inline-text-line"
                {...{ [INLINE_PREVIEW_TEXT_LINE_INDEX_ATTRIBUTE]: index }}
                style={getLineStyle({
                  bounds,
                  line,
                  renderLayout,
                })}
              >
                {line.text}
              </span>
            ))}
            <InlinePreviewTextEditor
              ariaLabel={`Edit ${getDiscTextLabel(key)}`}
              caretValue={text}
              lines={renderLayout.lines}
              targetKey={`disc:${key}`}
              value={text}
              textareaStyle={{
                fontFamily: getDiscTextFontFamilyCss(
                  discTextStyles[key].fontFamily,
                ),
                textAlign: renderLayout.align,
              }}
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
