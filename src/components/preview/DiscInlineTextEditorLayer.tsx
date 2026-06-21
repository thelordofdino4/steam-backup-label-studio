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
  type SteamLogoPlacement,
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
import {
  getCurvedDiscTextEditorBounds,
  getCurvedDiscTextEditorBoundsFromPaintBoxes,
  getCurvedDiscTextCaretFrame,
  getCurvedDiscTextOffsetForClientPoint,
  getCurvedDiscTextSelectionFrames,
} from '../../discText/curvedInlineEditorGeometry'
import {
  getCurvedDiscTextLineGeometry,
  getCurvedDiscTextPaintBoxes,
} from '../../discText/svgLayer'
import {
  getRenderedCurvedDiscTextGeometry,
  getRenderedCurvedDiscTextOffsetForClientPoint,
} from '../../discText/curvedRenderedTextBoundaries'
import type { DiscTextAvoidanceRegion } from '../../discText/avoidance'
import type { TextMeasureFunction } from '../../discText/renderLayout'
import {
  parseHtmlText,
  type TextContentMode,
} from '../../text/htmlText'
import {
  InlinePreviewTextEditor,
  INLINE_PREVIEW_TEXT_HOST_CLASS,
  type InlinePreviewTextEditorGeometryAdapter,
} from './InlinePreviewTextEditor'
import {
  createInlinePreviewTextTargetAttributes,
  createDiscInlineTextTargetKey,
} from '../../editor/previewEditableRegistry'
import {
  createDiscInlineTextEditorControls,
  createCurvedDiscTextEditorControls,
} from './discInlineTextEditorControls'
import type { DiscTemplate } from '../../types/template'

export type DiscInlineTextEditorLayerProps = {
  discTextSettings: DiscTextSettings
  discTextValues: DiscTextValues
  discTextHtmlSources: DiscTextHtmlSources
  discTextStyles: DiscTextStyleSettings
  discTextLayout: DiscTextLayoutSettings
  title: string
  steamLogoPlacement: SteamLogoPlacement
  selectedDiscTextKey: DiscTextKey | null
  selectedDiscTemplate: DiscTemplate
  avoidanceRegions: DiscTextAvoidanceRegion[]
  measureText: TextMeasureFunction
  onSelectedDiscTextKeyChange: (key: DiscTextKey | null) => void
  onDiscTextEnabledChange: (key: DiscTextKey, enabled: boolean) => void
  onDiscTextValueChange: (
    key: DiscTextKey,
    value: string,
    options?: { sourceMode?: boolean },
  ) => void
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
    command:
      | 'bold'
      | 'italic'
      | 'underline'
      | 'color'
      | 'bulletedList'
      | 'fontFamily'
      | 'fontSizePt',
    selection: { end: number; start: number } | undefined,
    value: boolean | number | string,
  ) => { end: number; start: number } | void
  onDiscTextRichTextKeyboardCommand: (
    key: DiscTextKey,
    command: 'enter' | 'shiftEnter' | 'backspace',
    selection: { end: number; start: number },
  ) => { end: number; start: number } | null | void
  getDiscTextRichTextCommandState: (
    key: DiscTextKey,
    command:
      | 'bold'
      | 'italic'
      | 'underline'
      | 'color'
      | 'bulletedList'
      | 'fontFamily'
      | 'fontSizePt',
    selection: { end: number; start: number },
  ) => 'active' | 'inactive' | 'mixed' | {
    state: 'active' | 'inactive' | 'mixed'
    value?: number | string
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
  onDiscTextArcSideChange: (
    key: DiscTextKey,
    arcSide: DiscTextLayout['arcSide'],
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
  ribbonSlotId?: string
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

function getBoundsHostStyle(bounds: DiscInlineEditorBounds) {
  const width = Math.max(0.01, bounds.halfWidth * 2)
  const height = Math.max(0.01, bounds.halfHeight * 2)

  return {
    left: `${bounds.centerX - width / 2}%`,
    top: `${bounds.centerY - height / 2}%`,
    width: `${width}%`,
    height: `${height}%`,
  } satisfies CSSProperties
}

export function DiscInlineTextEditorLayer({
  discTextSettings,
  discTextValues,
  discTextHtmlSources,
  discTextStyles,
  discTextLayout,
  title,
  steamLogoPlacement,
  selectedDiscTextKey,
  selectedDiscTemplate,
  avoidanceRegions,
  measureText,
  onSelectedDiscTextKeyChange,
  onDiscTextEnabledChange,
  onDiscTextValueChange,
  onDiscTextContentModeChange,
  onDiscTextEditComplete,
  onDiscTextStyleChange,
  onDiscTextRichTextCommand,
  onDiscTextRichTextKeyboardCommand,
  getDiscTextRichTextCommandState,
  onApplyDiscTextStylePreset,
  onResetDiscTextStyle,
  onDiscTextLayoutChange,
  onDiscTextAlignmentChange,
  onDiscTextArcSideChange,
  onDiscTextVisualAvoidanceChange,
  onResetDiscTextLayout,
  onMoveHandlePointerDown,
  onMoveHandlePointerMove,
  onMoveHandlePointerUp,
  ribbonSlotId,
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

        const text = getDiscTextContent(key, discTextValues, title)
        const hasHtmlSource = isDiscTextHtmlEnabled(discTextHtmlSources, key)
        const htmlDocument = hasHtmlSource
          ? parseHtmlText(getDiscTextHtmlSource(discTextHtmlSources, key, text))
          : null
        const renderedText = htmlDocument?.plainText ?? text

        if (isCurvedCopyrightDiscTextLayout(key, layout)) {
          const curvedPaintBoxInput = {
            key,
            layout,
            measureText,
            placement: steamLogoPlacement,
            richText: htmlDocument ?? undefined,
            safeZoneRadiusPercent:
              (selectedDiscTemplate.safeDiameterMm /
                selectedDiscTemplate.outerDiameterMm) * 50,
            styles: discTextStyles,
            template: selectedDiscTemplate,
            text: renderedText,
          }
          const fallbackBounds = getCurvedDiscTextEditorBounds({
            layout,
            placement: steamLogoPlacement,
            safeZoneRadiusPercent:
              (selectedDiscTemplate.safeDiameterMm /
                  selectedDiscTemplate.outerDiameterMm) * 50,
            template: selectedDiscTemplate,
          })
          const paintBounds = getCurvedDiscTextEditorBoundsFromPaintBoxes({
            boxes: getCurvedDiscTextPaintBoxes(curvedPaintBoxInput),
          })
          const bounds = paintBounds ?? fallbackBounds
          const controls = createCurvedDiscTextEditorControls({
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
            onDiscTextArcSideChange,
            onResetDiscTextLayout,
            onDiscTextRichTextCommand,
            getDiscTextRichTextCommandState,
          })
          const targetKey = createDiscInlineTextTargetKey(key)
          const curvedLineGeometry = getCurvedDiscTextLineGeometry({
            key,
            layout,
            measureText,
            placement: steamLogoPlacement,
            richText: htmlDocument ?? undefined,
            safeZoneRadiusPercent:
              (selectedDiscTemplate.safeDiameterMm /
                selectedDiscTemplate.outerDiameterMm) * 50,
            styles: discTextStyles,
            template: selectedDiscTemplate,
            text: renderedText,
          })
          const curvedLines = curvedLineGeometry.length > 0
            ? curvedLineGeometry.map((line) => ({ text: line.text }))
            : [{ text }]
          const curvedGeometry = {
            bounds,
            lines: curvedLineGeometry,
          }
          const geometryAdapter: InlinePreviewTextEditorGeometryAdapter = {
            getInteractionElements: () => {
              if (typeof document === 'undefined') {
                return []
              }

              return Array.from(
                document.querySelectorAll(
                  `[data-smoke-id="disc-text-layer-hit-target"] text[data-disc-text-key="${key}"]`,
                ),
              )
            },
            getOffsetForClientPoint: ({
              clientX,
              clientY,
              hostHeight,
              hostRect,
              hostWidth,
            }) =>
              getRenderedCurvedDiscTextOffsetForClientPoint({
                clientX,
                clientY,
                geometry: curvedGeometry,
                key,
              }) ?? getCurvedDiscTextOffsetForClientPoint({
                clientX,
                clientY,
                geometry: curvedGeometry,
                hostHeight,
                hostRect,
                hostWidth,
              }),
            getCaretFrame: ({
              caretValue,
              hostHeight,
              hostWidth,
              lines,
              selectionFocus,
            }) =>
              getCurvedDiscTextCaretFrame({
                caretValue,
                geometry:
                  getRenderedCurvedDiscTextGeometry({
                    geometry: curvedGeometry,
                    key,
                  }) ?? curvedGeometry,
                hostHeight,
                hostWidth,
                lines,
                selectionFocus,
              }),
            getSelectionFrames: ({
              caretValue,
              hostHeight,
              hostWidth,
              lines,
              selection,
            }) =>
              getCurvedDiscTextSelectionFrames({
                caretValue,
                geometry:
                  getRenderedCurvedDiscTextGeometry({
                    geometry: curvedGeometry,
                    key,
                  }) ?? curvedGeometry,
                hostHeight,
                hostWidth,
                lines,
                selection,
              }),
          }

          return (
            <div
              key={key}
              className={[
                'disc-inline-text-host',
                'disc-inline-text-host--curved',
                INLINE_PREVIEW_TEXT_HOST_CLASS,
                'is-editing',
                renderedText.trim().length === 0 ? 'is-empty' : '',
              ].filter(Boolean).join(' ')}
              data-smoke-id={`disc-inline-text-${key}`}
              {...createInlinePreviewTextTargetAttributes(targetKey)}
              style={getBoundsHostStyle(bounds)}
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
                caretValue={renderedText}
                controls={controls}
                geometryAdapter={geometryAdapter}
                inputMode="adapter"
                lines={curvedLines}
                targetKey={targetKey}
                value={renderedText}
                ribbonSlotId={ribbonSlotId}
                onValueChange={(value) => onDiscTextValueChange(key, value)}
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
        }

        const isHtmlSourceEditing = htmlSourceEditorKey === key
        const editValue = isHtmlSourceEditing
          ? getDiscTextHtmlSource(discTextHtmlSources, key, text)
          : hasHtmlSource
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
          { avoidanceRegions: textAvoidanceRegions, template: selectedDiscTemplate },
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
            data-smoke-id={`disc-inline-text-${key}`}
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
              ribbonSlotId={ribbonSlotId}
              onValueChange={(value, options) =>
                onDiscTextValueChange(
                  key,
                  isHtmlSourceEditing
                    ? value
                    : hasHtmlSource
                      ? value
                      : getDiscInlineEditorRawValue(key, value),
                  options,
                )}
              onMoveHandlePointerDown={(event) =>
                onMoveHandlePointerDown(event, key)}
              onMoveHandlePointerMove={onMoveHandlePointerMove}
              onMoveHandlePointerUp={onMoveHandlePointerUp}
              onRichTextKeyboardCommand={(command, selection) =>
                onDiscTextRichTextKeyboardCommand(key, command, selection)}
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
