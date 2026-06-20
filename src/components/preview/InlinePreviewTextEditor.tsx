import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent as ReactFocusEvent,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { createPortal } from 'react-dom'
import {
  isInlinePreviewTextSelectAllShortcut,
} from './inlinePreviewTextEditorInput'
import {
  getInlinePreviewHtmlSourceDraftStatus,
} from './inlinePreviewTextEditorSource'
import {
  isInlinePreviewTextEditorControlEvent,
  shouldKeepInlinePreviewTextEditorOpenOnBlur,
  type InlinePreviewTextEditorControlRoot,
} from './inlinePreviewTextEditorInteraction'
import { TrashIcon } from '../sidebar/PanelIcons'
import {
  getInlinePreviewTextCaretIndexForLineOffset,
  getInlinePreviewTextCaretLineOffset,
  getInlinePreviewTextSelectionLineOffsets,
} from './inlinePreviewTextEditorCaret'
import {
  getInlinePreviewTextControlLayout,
  type InlinePreviewTextAnchor,
  type InlinePreviewTextControlSizes,
  type InlinePreviewTextRect,
  type InlinePreviewTextSize,
} from './inlinePreviewTextEditorPositioning'
import {
  CONTEXTUAL_TEXT_CONTROL_GROUPS,
} from '../../text/contextualTextControlViewModel'
import {
  INLINE_PREVIEW_TEXT_TARGET_ATTRIBUTE,
} from '../../editor/previewEditableRegistry'
import type {
  InlinePreviewTextEditorCheckboxControl,
  InlinePreviewTextEditorColorControl,
  InlinePreviewTextEditorControls,
  InlinePreviewTextEditorGeometryLine,
  InlinePreviewTextEditorInputMode,
  InlinePreviewTextEditorLine,
  InlinePreviewTextEditorProps,
  InlinePreviewTextEditorRangeControl,
  InlinePreviewTextEditorSelectControl,
  InlinePreviewTextEditorSelectionRange,
  InlinePreviewTextEditorTab,
  InlinePreviewTextEditorToggleState,
  InlinePreviewTextEditorToggleControl,
} from './inlinePreviewTextEditorContract'

export {
  INLINE_PREVIEW_TEXT_TARGET_ATTRIBUTE,
} from '../../editor/previewEditableRegistry'

export type {
  InlinePreviewTextEditorCheckboxControl,
  InlinePreviewTextEditorColorControl,
  InlinePreviewTextEditorControls,
  InlinePreviewTextEditorGeometryLine,
  InlinePreviewTextEditorInputMode,
  InlinePreviewTextEditorLine,
  InlinePreviewTextEditorOption,
  InlinePreviewTextEditorProps,
  InlinePreviewTextEditorRangeControl,
  InlinePreviewTextEditorSelectControl,
  InlinePreviewTextEditorSelectionRange,
  InlinePreviewTextEditorTab,
  InlinePreviewTextEditorToggleState,
  InlinePreviewTextEditorToggleControl,
} from './inlinePreviewTextEditorContract'

export const INLINE_PREVIEW_TEXT_HOST_CLASS = 'inline-preview-text-host'
export const INLINE_PREVIEW_TEXT_LINE_INDEX_ATTRIBUTE =
  'data-inline-preview-text-line-index'

type InlineTextControlFrame = {
  anchor: InlinePreviewTextAnchor
  previewRect: InlinePreviewTextRect
}

type InlineTextCaretFrame = {
  height: number
  left: number
  top: number
}

type InlineTextSelectionFrame = {
  height: number
  left: number
  top: number
  width: number
}

type InlineTextSelectionState = {
  end: number
  focus: number
  start: number
}

function getInlineTextSelectionRange(
  selection: InlineTextSelectionState,
): InlinePreviewTextEditorSelectionRange {
  return {
    end: selection.end,
    start: selection.start,
  }
}

function getInlineTextSelectionStateFromRange(
  selection: InlinePreviewTextEditorSelectionRange,
  valueLength: number,
): InlineTextSelectionState {
  const start = Math.max(0, Math.min(selection.start, valueLength))
  const end = Math.max(0, Math.min(selection.end, valueLength))

  return {
    end,
    focus: end,
    start,
  }
}

const INLINE_TEXT_EDITOR_TABS = CONTEXTUAL_TEXT_CONTROL_GROUPS

const INLINE_PREVIEW_SURFACE_SELECTOR = '.case-insert-preview, .disc-preview'

const INLINE_TEXT_DEFAULT_CONTROL_SIZES: InlinePreviewTextControlSizes = {
  menu: { height: 48, width: 76 },
  moveHandle: { height: 28, width: 48 },
  tabs: { height: 56, width: 340 },
}

function stopInlineTextEditorClick(event: MouseEvent<Element>) {
  event.stopPropagation()
}

function keepInlineTextEditorFocus(event: ReactPointerEvent<Element>) {
  event.preventDefault()
  event.stopPropagation()
}

function stopInlineTextEditorPointer(event: ReactPointerEvent<Element>) {
  event.stopPropagation()
}

function rectToInlineTextRect(rect: DOMRect): InlinePreviewTextRect {
  return {
    bottom: rect.bottom,
    left: rect.left,
    right: rect.right,
    top: rect.top,
  }
}

function getInlineTextPreviewSurface(host: Element) {
  return host.closest<HTMLElement>(INLINE_PREVIEW_SURFACE_SELECTOR)
}

function getInlineTextControlSize(
  element: Element | null,
  fallback: InlinePreviewTextSize,
): InlinePreviewTextSize {
  if (!element) return fallback

  const rect = element.getBoundingClientRect()

  if (rect.width <= 0 || rect.height <= 0) {
    return fallback
  }

  return {
    height: rect.height,
    width: rect.width,
  }
}

function getCssPixelValue(style: CSSStyleDeclaration, propertyName: string) {
  const value = Number.parseFloat(style.getPropertyValue(propertyName))

  return Number.isFinite(value) ? value : 0
}

function getInlineTextMenuControlSize(
  element: HTMLElement | null,
  fallback: InlinePreviewTextSize,
): InlinePreviewTextSize {
  if (!element) return fallback

  const rect = element.getBoundingClientRect()

  if (rect.width <= 0 || rect.height <= 0) {
    return fallback
  }

  const style = window.getComputedStyle(element)
  const controlGrid = element.querySelector<HTMLElement>(
    '.inline-preview-text-control-grid',
  )
  const actions = element.querySelector<HTMLElement>(
    '.inline-preview-text-menu-actions',
  )
  const controlGridHeight =
    controlGrid && controlGrid.scrollHeight > 0
      ? controlGrid.scrollHeight
      : 0
  const actionsRect = actions?.getBoundingClientRect()
  const actionsHeight = actionsRect && actionsRect.height > 0
    ? actionsRect.height
    : 0
  const rowGap =
    controlGrid && actions
      ? getCssPixelValue(style, 'row-gap') ||
        getCssPixelValue(style, 'gap')
      : 0
  const boxHeight =
    getCssPixelValue(style, 'padding-top') +
    getCssPixelValue(style, 'padding-bottom') +
    getCssPixelValue(style, 'border-top-width') +
    getCssPixelValue(style, 'border-bottom-width')
  const intrinsicHeight =
    controlGridHeight > 0 || actionsHeight > 0
      ? controlGridHeight + rowGap + actionsHeight + boxHeight
      : 0

  return {
    height: Math.max(rect.height, element.scrollHeight, intrinsicHeight),
    width: rect.width,
  }
}

function areInlineTextSizesEqual(
  first: InlinePreviewTextSize,
  second: InlinePreviewTextSize,
) {
  return (
    Math.abs(first.height - second.height) < 0.5 &&
    Math.abs(first.width - second.width) < 0.5
  )
}

function areInlineTextRectsEqual(
  first: InlinePreviewTextRect,
  second: InlinePreviewTextRect,
) {
  return (
    Math.abs(first.bottom - second.bottom) < 0.5 &&
    Math.abs(first.left - second.left) < 0.5 &&
    Math.abs(first.right - second.right) < 0.5 &&
    Math.abs(first.top - second.top) < 0.5
  )
}

function areInlineTextAnchorsEqual(
  first: InlinePreviewTextAnchor,
  second: InlinePreviewTextAnchor,
) {
  return (
    Math.abs(first.bottom - second.bottom) < 0.5 &&
    Math.abs(first.centerX - second.centerX) < 0.5 &&
    Math.abs(first.centerY - second.centerY) < 0.5 &&
    Math.abs(first.right - second.right) < 0.5 &&
    Math.abs(first.top - second.top) < 0.5
  )
}

function areInlineTextControlFramesEqual(
  first: InlineTextControlFrame | null,
  second: InlineTextControlFrame | null,
) {
  if (first === second) return true
  if (!first || !second) return false

  return (
    areInlineTextAnchorsEqual(first.anchor, second.anchor) &&
    areInlineTextRectsEqual(first.previewRect, second.previewRect)
  )
}

function areInlineTextControlSizesEqual(
  first: InlinePreviewTextControlSizes,
  second: InlinePreviewTextControlSizes,
) {
  return (
    areInlineTextSizesEqual(first.menu, second.menu) &&
    areInlineTextSizesEqual(first.moveHandle, second.moveHandle) &&
    areInlineTextSizesEqual(first.tabs, second.tabs)
  )
}

function getLineSpan(host: Element, lineIndex: number) {
  return host.querySelector<HTMLElement>(
    `[${INLINE_PREVIEW_TEXT_LINE_INDEX_ATTRIBUTE}="${lineIndex}"]`,
  )
}

function getInlinePreviewTextHostForTarget({
  inputMode,
  targetKey,
  textarea,
}: {
  inputMode: InlinePreviewTextEditorInputMode
  targetKey: string
  textarea: HTMLTextAreaElement | null
}) {
  if (inputMode === 'overlay') {
    return textarea?.closest<HTMLElement>(
      `.${INLINE_PREVIEW_TEXT_HOST_CLASS}`,
    ) ?? null
  }

  if (typeof document === 'undefined') {
    return null
  }

  const candidates = Array.from(
    document.querySelectorAll<HTMLElement>(
      `[${INLINE_PREVIEW_TEXT_TARGET_ATTRIBUTE}]`,
    ),
  )

  return candidates.find((candidate) =>
    candidate.getAttribute(INLINE_PREVIEW_TEXT_TARGET_ATTRIBUTE) === targetKey,
  ) ?? null
}

function renderInlinePreviewTextSelectControl(
  control: InlinePreviewTextEditorSelectControl | undefined,
) {
  if (!control) return null

  return (
    <label className="inline-preview-text-control-field">
      <span>{control.label}</span>
      <select
        value={control.value}
        onChange={(event) => control.onChange(event.target.value)}
      >
        {control.options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}

function renderInlinePreviewTextRangeControl(
  control: InlinePreviewTextEditorRangeControl | undefined,
) {
  if (!control) return null

  const handleChange = (value: string) => {
    const nextValue = Number(value)
    if (Number.isFinite(nextValue)) {
      control.onChange(nextValue)
    }
  }

  return (
    <label className="inline-preview-text-control-field inline-preview-text-range-field">
      <span>{control.label}</span>
      <input
        type="range"
        min={control.min}
        max={control.max}
        step={control.step}
        value={control.value}
        onChange={(event) => handleChange(event.target.value)}
      />
      <input
        aria-label={control.label}
        type="number"
        min={control.min}
        max={control.max}
        step={control.step}
        value={Number(control.value.toFixed(2))}
        onChange={(event) => handleChange(event.target.value)}
      />
    </label>
  )
}

function renderInlinePreviewTextCheckboxControl(
  control: InlinePreviewTextEditorCheckboxControl | undefined,
) {
  if (!control) return null

  return (
    <label className="inline-preview-text-checkbox-field">
      <input
        type="checkbox"
        checked={control.checked}
        onChange={(event) => control.onChange(event.target.checked)}
      />
      <span>{control.label}</span>
    </label>
  )
}

function renderInlinePreviewHtmlSourceControl({
  control,
  sourceDraftIdentity,
  sourceInitialValue,
  sourceMode,
  onSourceDraftChange,
  onSourceDraftCommit,
}: {
  control: InlinePreviewTextEditorCheckboxControl | undefined
  sourceDraftIdentity: string
  sourceInitialValue: string
  sourceMode: boolean
  onSourceDraftChange: (value: string) => void
  onSourceDraftCommit: () => void
}) {
  if (!control) return null

  return (
    <div className="inline-preview-text-source-control">
      <label className="inline-preview-text-checkbox-field">
        <input
          type="checkbox"
          checked={control.checked}
          onChange={(event) => {
            const checked = event.target.checked
            if (!checked) {
              onSourceDraftCommit()
            }
            control.onChange(checked)
          }}
        />
        <span>{control.label}</span>
      </label>
      {sourceMode ? (
        <InlinePreviewHtmlSourceTextarea
          key={sourceDraftIdentity}
          initialValue={sourceInitialValue}
          onDraftChange={onSourceDraftChange}
        />
      ) : null}
    </div>
  )
}

function InlinePreviewHtmlSourceTextarea({
  initialValue,
  onDraftChange,
}: {
  initialValue: string
  onDraftChange: (value: string) => void
}) {
  const initialStatus = getInlinePreviewHtmlSourceDraftStatus(initialValue)
  const [draft, setDraft] = useState(initialValue)
  const [message, setMessage] = useState(initialStatus.message)

  const handleChange = (nextDraft: string) => {
    setDraft(nextDraft)
    setMessage(getInlinePreviewHtmlSourceDraftStatus(nextDraft).message)
    onDraftChange(nextDraft)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    event.stopPropagation()

    if (!isInlinePreviewTextSelectAllShortcut(event)) {
      return
    }

    event.preventDefault()
    event.currentTarget.select()
  }

  return (
    <>
      <label className="inline-preview-text-source-field">
        <span>Source</span>
        <textarea
          aria-label="HTML source editor"
          className="inline-preview-text-source-textarea"
          value={draft}
          spellCheck={false}
          onChange={(event) => handleChange(event.target.value)}
          onClick={stopInlineTextEditorClick}
          onKeyDown={handleKeyDown}
          onKeyUp={(event) => event.stopPropagation()}
          onPaste={(event) => event.stopPropagation()}
          onCopy={(event) => event.stopPropagation()}
          onCut={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
          onPointerUp={(event) => event.stopPropagation()}
          onSelect={(event) => event.stopPropagation()}
        />
      </label>
      {message ? (
        <p className="inline-preview-text-source-message">
          {message}
        </p>
      ) : null}
    </>
  )
}

function renderInlinePreviewTextToggleControl(
  control: InlinePreviewTextEditorToggleControl | undefined,
  selection: InlinePreviewTextEditorSelectionRange,
  onSelectionChange: (selection: InlinePreviewTextEditorSelectionRange) => void,
) {
  if (!control) return null

  const selectionState = control.getSelectionState?.(selection)
  const resolvedState: InlinePreviewTextEditorToggleState = selectionState ??
    (control.pressed ? 'active' : 'inactive')
  const isPressed = resolvedState === 'active'

  return (
    <button
      type="button"
      className={[
        'inline-preview-text-format-toggle',
        isPressed ? 'is-active' : '',
        resolvedState === 'mixed' ? 'is-mixed' : '',
      ].filter(Boolean).join(' ')}
      aria-pressed={resolvedState === 'mixed' ? 'mixed' : isPressed}
      onClick={(event) => {
        event.stopPropagation()
        const nextSelection = control.onChange(!isPressed, selection)

        if (nextSelection) {
          onSelectionChange(nextSelection)
        }
      }}
      onPointerDown={keepInlineTextEditorFocus}
    >
      {control.label}
    </button>
  )
}

function renderInlinePreviewTextColorControl(
  control: InlinePreviewTextEditorColorControl | undefined,
  selection: InlinePreviewTextEditorSelectionRange,
) {
  if (!control) return null

  const selectionColor = control.getSelectionValue?.(selection)
  const value = selectionColor?.value ?? control.value

  return (
    <label className="inline-preview-text-control-field">
      <span>{control.label}</span>
      <input
        type="color"
        value={value}
        data-selection-state={selectionColor?.state}
        onChange={(event) => control.onChange(event.target.value, selection)}
      />
    </label>
  )
}

function InlinePreviewTextEditorMenuContent({
  activeTab,
  controls,
  sourceDraftIdentity,
  sourceInitialValue,
  sourceMode,
  onSourceDraftChange,
  onSourceDraftCommit,
  onSelectionChange,
  selection,
}: {
  activeTab: InlinePreviewTextEditorTab
  controls?: InlinePreviewTextEditorControls
  selection: InlinePreviewTextEditorSelectionRange
  sourceDraftIdentity: string
  sourceInitialValue: string
  sourceMode: boolean
  onSourceDraftChange: (value: string) => void
  onSourceDraftCommit: () => void
  onSelectionChange: (selection: InlinePreviewTextEditorSelectionRange) => void
}) {
  if (!controls) {
    return (
      <div className="inline-preview-text-control-grid">
        <span className="inline-preview-text-planned-control">
          No controls available
        </span>
      </div>
    )
  }

  if (activeTab === 'presets') {
    return (
      <div className="inline-preview-text-control-grid">
        {renderInlinePreviewTextSelectControl(controls.presets?.style)}
        {renderInlinePreviewTextSelectControl(controls.presets?.layout)}
        {!controls.presets?.style && !controls.presets?.layout ? (
          <span className="inline-preview-text-planned-control">
            Style presets unavailable
          </span>
        ) : null}
        {controls.presets?.onReset ? (
          <button
            type="button"
            className="secondary-button inline-preview-text-control-button"
            onClick={controls.presets.onReset}
          >
            Reset style
          </button>
        ) : null}
      </div>
    )
  }

  if (activeTab === 'text') {
    return (
      <div className="inline-preview-text-control-grid">
        {renderInlinePreviewTextSelectControl(controls.text?.fontFamily)}
        {renderInlinePreviewTextRangeControl(controls.text?.size)}
        {renderInlinePreviewTextSelectControl(controls.text?.alignment)}
        {controls.text?.bold ||
        controls.text?.italic ||
        controls.text?.underline ||
        controls.text?.bulletedList ? (
          <div className="inline-preview-text-format-row">
            {renderInlinePreviewTextToggleControl(
              controls.text.bold,
              selection,
              onSelectionChange,
            )}
            {renderInlinePreviewTextToggleControl(
              controls.text.italic,
              selection,
              onSelectionChange,
            )}
            {renderInlinePreviewTextToggleControl(
              controls.text.underline,
              selection,
              onSelectionChange,
            )}
            {renderInlinePreviewTextToggleControl(
              controls.text.bulletedList,
              selection,
              onSelectionChange,
            )}
          </div>
        ) : null}
        {controls.text?.unsupported?.length ? (
          <div className="inline-preview-text-planned-row">
            {controls.text.unsupported.map((label) => (
              <button
                key={label}
                type="button"
                className="inline-preview-text-planned-control"
                disabled
                title={`${label} is not supported in the contextual editor yet`}
              >
                {label} unsupported
              </button>
            ))}
          </div>
        ) : null}
      </div>
    )
  }

  if (activeTab === 'art') {
    return (
      <div className="inline-preview-text-control-grid">
        {renderInlinePreviewTextColorControl(controls.art?.color, selection)}
        {renderInlinePreviewTextSelectControl(controls.art?.contrast)}
        {renderInlinePreviewTextCheckboxControl(controls.art?.backgroundEnabled)}
        {renderInlinePreviewTextColorControl(
          controls.art?.backgroundColor,
          selection,
        )}
        {renderInlinePreviewTextRangeControl(controls.art?.backgroundOpacity)}
        {renderInlinePreviewTextRangeControl(controls.art?.backgroundPadding)}
        {renderInlinePreviewTextCheckboxControl(controls.art?.borderEnabled)}
        {renderInlinePreviewTextColorControl(controls.art?.borderColor, selection)}
        {renderInlinePreviewTextRangeControl(controls.art?.borderRadius)}
      </div>
    )
  }

  return (
    <div className="inline-preview-text-control-grid">
      {renderInlinePreviewTextCheckboxControl(
        controls.utilities?.respectVisualElements,
      )}
      {renderInlinePreviewTextRangeControl(controls.utilities?.width)}
      {renderInlinePreviewTextRangeControl(controls.utilities?.x)}
      {renderInlinePreviewTextRangeControl(controls.utilities?.y)}
      {renderInlinePreviewTextSelectControl(controls.utilities?.mode)}
      {renderInlinePreviewHtmlSourceControl({
        control: controls.utilities?.htmlSource,
        sourceDraftIdentity,
        sourceInitialValue,
        sourceMode,
        onSourceDraftChange,
        onSourceDraftCommit,
      })}
      {renderInlinePreviewTextSelectControl(controls.utilities?.arcSide)}
      {renderInlinePreviewTextRangeControl(controls.utilities?.arcDegrees)}
      {controls.utilities?.resetLayout ? (
        <button
          type="button"
          className="secondary-button inline-preview-text-control-button"
          onClick={controls.utilities.resetLayout}
        >
          Reset layout
        </button>
      ) : null}
    </div>
  )
}

function getTextRangeBoundary(
  lineSpan: HTMLElement,
  offset: number,
  lineRect: DOMRect,
) {
  if (
    typeof document === 'undefined'
  ) {
    return offset <= 0 ? lineRect.left : lineRect.right
  }

  const textNodes = getLineTextNodes(lineSpan)
  const textLength = getLineTextLength(textNodes)
  const rangeOffset = Math.max(0, Math.min(offset, textLength))

  if (rangeOffset === 0) {
    return lineRect.left
  }

  if (textNodes.length === 0) {
    return offset <= 0 ? lineRect.left : lineRect.right
  }

  let currentOffset = 0
  let endNode = textNodes[textNodes.length - 1]
  let endOffset = endNode.textContent?.length ?? 0

  for (const textNode of textNodes) {
    const nodeLength = textNode.textContent?.length ?? 0

    if (rangeOffset <= currentOffset + nodeLength) {
      endNode = textNode
      endOffset = rangeOffset - currentOffset
      break
    }

    currentOffset += nodeLength
  }

  const range = document.createRange()
  range.setStart(textNodes[0], 0)
  range.setEnd(endNode, endOffset)

  const rects = Array.from(range.getClientRects())
  const lastRect = rects[rects.length - 1]
  const rangeRect = lastRect ?? range.getBoundingClientRect()
  const boundary =
    rangeRect.width > 0 || rangeRect.height > 0
      ? rangeRect.right
      : lineRect.right

  range.detach()

  return boundary
}

function getLineTextNodes(lineSpan: HTMLElement) {
  const ownerDocument = lineSpan.ownerDocument
  const walker = ownerDocument.createTreeWalker(
    lineSpan,
    NodeFilter.SHOW_TEXT,
  )
  const textNodes: Text[] = []
  let currentNode = walker.nextNode()

  while (currentNode) {
    if (currentNode.textContent) {
      textNodes.push(currentNode as Text)
    }
    currentNode = walker.nextNode()
  }

  return textNodes
}

function getLineTextLength(textNodes: readonly Text[]) {
  return textNodes.reduce(
    (length, textNode) => length + (textNode.textContent?.length ?? 0),
    0,
  )
}

function clampTextNodeOffset(textNode: Text, offset: number) {
  const textLength = textNode.textContent?.length ?? 0

  return Math.max(0, Math.min(offset, textLength))
}

function getElementTextOffset(lineSpan: HTMLElement, element: Element, offset: number) {
  let textOffset = 0
  const childNodes = Array.from(element.childNodes)
  const clampedOffset = Math.max(0, Math.min(offset, childNodes.length))

  for (let index = 0; index < clampedOffset; index += 1) {
    textOffset += childNodes[index].textContent?.length ?? 0
  }

  if (element !== lineSpan) {
    let ancestor: Node | null = element

    while (ancestor?.parentNode && ancestor.parentNode !== lineSpan) {
      const parent: ParentNode = ancestor.parentNode
      const siblings: Node[] = Array.from(parent.childNodes)
      const ancestorIndex = siblings.findIndex((sibling) => sibling === ancestor)

      for (let index = 0; index < ancestorIndex; index += 1) {
        textOffset += siblings[index].textContent?.length ?? 0
      }

      ancestor = parent
    }

    if (ancestor?.parentNode === lineSpan) {
      const siblings: Node[] = Array.from(lineSpan.childNodes)
      const ancestorIndex = siblings.findIndex((sibling) => sibling === ancestor)

      for (let index = 0; index < ancestorIndex; index += 1) {
        textOffset += siblings[index].textContent?.length ?? 0
      }
    }
  }

  return Math.max(0, Math.min(textOffset, lineSpan.textContent?.length ?? 0))
}

function getTextNodeCaretOffset({
  lineSpan,
  offset,
  offsetNode,
}: {
  lineSpan: HTMLElement
  offset: number
  offsetNode: Node | null
}) {
  const textNodes = getLineTextNodes(lineSpan)
  let textOffset = 0

  for (const textNode of textNodes) {
    if (offsetNode === textNode) {
      return textOffset + clampTextNodeOffset(textNode, offset)
    }
    textOffset += textNode.textContent?.length ?? 0
  }

  if (offsetNode instanceof Element && lineSpan.contains(offsetNode)) {
    return getElementTextOffset(lineSpan, offsetNode, offset)
  }

  return null
}

function getCaretTextOffsetFromPoint(
  lineSpan: HTMLElement,
  clientX: number,
  clientY: number,
) {
  if (typeof document === 'undefined') {
    return null
  }

  const ownerDocument = lineSpan.ownerDocument
  const caretPositionFromPoint = ownerDocument.caretPositionFromPoint

  if (caretPositionFromPoint) {
    const position = caretPositionFromPoint.call(
      ownerDocument,
      clientX,
      clientY,
    )
    const offset = position
      ? getTextNodeCaretOffset({
          lineSpan,
          offset: position.offset,
          offsetNode: position.offsetNode,
        })
      : null

    if (offset !== null) {
      return offset
    }
  }

  const documentWithCaretRange = ownerDocument as Document & {
    caretRangeFromPoint?: (x: number, y: number) => Range | null
  }
  const caretRangeFromPoint = documentWithCaretRange.caretRangeFromPoint

  if (!caretRangeFromPoint) {
    return null
  }

  const range = caretRangeFromPoint.call(ownerDocument, clientX, clientY)
  const offset = range
    ? getTextNodeCaretOffset({
        lineSpan,
        offset: range.startOffset,
        offsetNode: range.startContainer,
      })
    : null

  range?.detach()

  return offset
}

function getNearestTextOffset(
  lineSpan: HTMLElement,
  clientX: number,
  clientY: number,
) {
  const caretOffset = getCaretTextOffsetFromPoint(lineSpan, clientX, clientY)

  if (caretOffset !== null) {
    return caretOffset
  }

  const lineRect = lineSpan.getBoundingClientRect()
  const textLength = getLineTextLength(getLineTextNodes(lineSpan))
  let nearestOffset = 0
  let nearestDistance = Math.abs(clientX - lineRect.left)

  for (let offset = 1; offset <= textLength; offset += 1) {
    const boundary = getTextRangeBoundary(lineSpan, offset, lineRect)
    const distance = Math.abs(clientX - boundary)

    if (distance <= nearestDistance) {
      nearestOffset = offset
      nearestDistance = distance
    }
  }

  return nearestOffset
}

function getNearestLineSpan({
  clientY,
  host,
  lines,
}: {
  clientY: number
  host: Element
  lines: InlinePreviewTextEditorLine[]
}) {
  let nearestLineSpan: HTMLElement | null = null
  let nearestLineIndex = 0
  let nearestDistance = Number.POSITIVE_INFINITY

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const lineSpan = getLineSpan(host, lineIndex)

    if (!lineSpan) {
      continue
    }

    const rect = lineSpan.getBoundingClientRect()
    const distance =
      clientY >= rect.top && clientY <= rect.bottom
        ? 0
        : Math.min(
            Math.abs(clientY - rect.top),
            Math.abs(clientY - rect.bottom),
          )

    if (distance < nearestDistance) {
      nearestDistance = distance
      nearestLineIndex = lineIndex
      nearestLineSpan = lineSpan
    }
  }

  if (!nearestLineSpan) {
    return null
  }

  return {
    lineIndex: nearestLineIndex,
    lineSpan: nearestLineSpan,
  }
}

function getGeometryLineFrame({
  geometryLine,
  hostRect,
}: {
  geometryLine: InlinePreviewTextEditorGeometryLine
  hostRect: DOMRect
}) {
  const top = hostRect.top + geometryLine.topRatio * hostRect.height
  const height = Math.max(1, geometryLine.heightRatio * hostRect.height)

  return {
    bottom: top + height,
    height,
    top,
  }
}

function getNearestGeometryLine({
  clientY,
  geometryLines,
  host,
}: {
  clientY: number
  geometryLines: InlinePreviewTextEditorGeometryLine[]
  host: Element
}) {
  const hostRect = host.getBoundingClientRect()
  let nearestLineIndex = 0
  let nearestDistance = Number.POSITIVE_INFINITY

  for (let lineIndex = 0; lineIndex < geometryLines.length; lineIndex += 1) {
    const frame = getGeometryLineFrame({
      geometryLine: geometryLines[lineIndex],
      hostRect,
    })
    const distance =
      clientY >= frame.top && clientY <= frame.bottom
        ? 0
        : Math.min(
            Math.abs(clientY - frame.top),
            Math.abs(clientY - frame.bottom),
          )

    if (distance < nearestDistance) {
      nearestDistance = distance
      nearestLineIndex = lineIndex
    }
  }

  if (geometryLines.length === 0) {
    return null
  }

  return {
    line: geometryLines[nearestLineIndex],
    lineIndex: nearestLineIndex,
  }
}

function getNearestGeometryTextOffset({
  clientX,
  geometryLine,
  host,
}: {
  clientX: number
  geometryLine: InlinePreviewTextEditorGeometryLine
  host: Element
}) {
  const hostRect = host.getBoundingClientRect()
  const caretXs = geometryLine.caretXRatios.map(
    (ratio) => hostRect.left + ratio * hostRect.width,
  )
  let nearestOffset = 0
  let nearestDistance = Number.POSITIVE_INFINITY

  for (let offset = 0; offset < caretXs.length; offset += 1) {
    const distance = Math.abs(clientX - caretXs[offset])

    if (distance <= nearestDistance) {
      nearestOffset = offset
      nearestDistance = distance
    }
  }

  return nearestOffset
}

function getPointerSelectionStart({
  caretValue,
  clientX,
  clientY,
  geometryLines,
  host,
  lines,
}: {
  caretValue: string
  clientX: number
  clientY: number
  geometryLines?: InlinePreviewTextEditorGeometryLine[]
  host: Element
  lines: InlinePreviewTextEditorLine[]
}) {
  if (geometryLines) {
    const nearestGeometryLine = getNearestGeometryLine({
      clientY,
      geometryLines,
      host,
    })

    if (!nearestGeometryLine) {
      return null
    }

    return getInlinePreviewTextCaretIndexForLineOffset({
      caretValue,
      lineIndex: nearestGeometryLine.lineIndex,
      lines,
      offset: getNearestGeometryTextOffset({
        clientX,
        geometryLine: nearestGeometryLine.line,
        host,
      }),
    })
  }

  const nearestLine = getNearestLineSpan({ clientY, host, lines })

  if (!nearestLine) {
    return null
  }

  return getInlinePreviewTextCaretIndexForLineOffset({
    caretValue,
    lineIndex: nearestLine.lineIndex,
    lines,
    offset: getNearestTextOffset(nearestLine.lineSpan, clientX, clientY),
  })
}

function getTextSelectionFrames({
  caretValue,
  geometryLines,
  host,
  lines,
  selection,
}: {
  caretValue: string
  geometryLines?: InlinePreviewTextEditorGeometryLine[]
  host: Element
  lines: InlinePreviewTextEditorLine[]
  selection: InlineTextSelectionState
}) {
  const lineOffsets = getInlinePreviewTextSelectionLineOffsets({
    caretValue,
    lines,
    selectionEnd: selection.end,
    selectionStart: selection.start,
  })
  const hostRect = host.getBoundingClientRect()

  return lineOffsets.flatMap((lineOffset) => {
    if (geometryLines) {
      const geometryLine = geometryLines[lineOffset.lineIndex]

      if (!geometryLine) {
        return []
      }

      const lineFrame = getGeometryLineFrame({ geometryLine, hostRect })
      const startRatio =
        geometryLine.caretXRatios[
          Math.max(
            0,
            Math.min(
              lineOffset.startOffset,
              geometryLine.caretXRatios.length - 1,
            ),
          )
        ] ?? 0
      const endRatio =
        geometryLine.caretXRatios[
          Math.max(
            0,
            Math.min(lineOffset.endOffset, geometryLine.caretXRatios.length - 1),
          )
        ] ?? startRatio
      const leftRatio = Math.min(startRatio, endRatio)
      const width = Math.abs(endRatio - startRatio) * hostRect.width

      if (width <= 0) {
        return []
      }

      return [
        {
          height: lineFrame.height,
          left: leftRatio * hostRect.width,
          top: lineFrame.top - hostRect.top,
          width,
        } satisfies InlineTextSelectionFrame,
      ]
    }

    const lineSpan = getLineSpan(host, lineOffset.lineIndex)

    if (!lineSpan) {
      return []
    }

    const lineRect = lineSpan.getBoundingClientRect()
    const startBoundary = getTextRangeBoundary(
      lineSpan,
      lineOffset.startOffset,
      lineRect,
    )
    const endBoundary = getTextRangeBoundary(
      lineSpan,
      lineOffset.endOffset,
      lineRect,
    )
    const left = Math.min(startBoundary, endBoundary)
    const width = Math.abs(endBoundary - startBoundary)

    if (width <= 0) {
      return []
    }

    return [
      {
        height: Math.max(1, lineRect.height),
        left: left - hostRect.left,
        top: lineRect.top - hostRect.top,
        width,
      } satisfies InlineTextSelectionFrame,
    ]
  })
}

function getTextareaSelectionState(textarea: HTMLTextAreaElement) {
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const focus = textarea.selectionDirection === 'backward' ? start : end

  return { end, focus, start } satisfies InlineTextSelectionState
}

function getCollapsedSelectionState(
  caretIndex: number,
): InlineTextSelectionState {
  return {
    end: caretIndex,
    focus: caretIndex,
    start: caretIndex,
  }
}

function getGeometryCaretFrame({
  caretValue,
  geometryLines,
  host,
  lines,
  selectionFocus,
}: {
  caretValue: string
  geometryLines: InlinePreviewTextEditorGeometryLine[]
  host: Element
  lines: InlinePreviewTextEditorLine[]
  selectionFocus: number
}): InlineTextCaretFrame | null {
  const hostRect = host.getBoundingClientRect()
  const { lineIndex, offset } = getInlinePreviewTextCaretLineOffset({
    caretIndex: selectionFocus,
    caretValue,
    lines,
  })
  const geometryLine = geometryLines[lineIndex]

  if (!geometryLine) {
    return null
  }

  const frame = getGeometryLineFrame({ geometryLine, hostRect })
  const caretXRatio =
    geometryLine.caretXRatios[
      Math.max(0, Math.min(offset, geometryLine.caretXRatios.length - 1))
    ] ?? 0

  return {
    height: frame.height,
    left: caretXRatio * hostRect.width,
    top: frame.top - hostRect.top,
  }
}

export function InlinePreviewTextEditor({
  ariaLabel,
  caretValue,
  controls: editorControls,
  inputMode = 'overlay',
  geometryLines,
  lines,
  targetKey,
  value,
  textareaStyle,
  sourceMode = false,
  menuPlacement,
  onValueChange,
  onMoveHandlePointerDown,
  onMoveHandlePointerMove,
  onMoveHandlePointerUp,
  onRichTextKeyboardCommand,
  onDone,
}: InlinePreviewTextEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const tabsRef = useRef<HTMLDivElement | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const moveHandleRef = useRef<HTMLButtonElement | null>(null)
  const controlPointerStartedInsideRef = useRef(false)
  const adapterSelectionAnchorRef = useRef(value.length)
  const adapterSelectionPointerIdRef = useRef<number | null>(null)
  const pendingSelectionRef =
    useRef<InlinePreviewTextEditorSelectionRange | null>(null)
  const [caretFrame, setCaretFrame] = useState<InlineTextCaretFrame | null>(null)
  const [selection, setSelection] = useState<InlineTextSelectionState>(() =>
    getCollapsedSelectionState(value.length),
  )
  const [selectionFrames, setSelectionFrames] = useState<
    InlineTextSelectionFrame[]
  >([])
  const [controlFrame, setControlFrame] =
    useState<InlineTextControlFrame | null>(null)
  const controlFrameRef = useRef<InlineTextControlFrame | null>(null)
  const [controlSizes, setControlSizes] =
    useState<InlinePreviewTextControlSizes>(
      INLINE_TEXT_DEFAULT_CONTROL_SIZES,
    )
  const [activeTab, setActiveTab] =
    useState<InlinePreviewTextEditorTab>('text')
  const sourceDraftIdentity = sourceMode
    ? `${targetKey}:html-source`
    : `${targetKey}:wysiwyg`

  const updateSourceDraft = (nextDraft: string) => {
    onValueChange(nextDraft, { sourceMode: true })
  }

  const commitSourceDraft = () => {
    if (sourceMode) {
      const sourceTextarea =
        menuRef.current?.querySelector<HTMLTextAreaElement>(
          '.inline-preview-text-source-textarea',
        )
      onValueChange(sourceTextarea?.value ?? value, { sourceMode: true })
    }
  }

  const getInlineControlRoots = useCallback(() => {
    const elements: HTMLElement[] = []

    if (tabsRef.current) elements.push(tabsRef.current)
    if (menuRef.current) elements.push(menuRef.current)
    if (moveHandleRef.current) elements.push(moveHandleRef.current)

    return elements.map((element) => ({
      contains: (target: unknown) =>
        target instanceof Node && element.contains(target),
    } satisfies InlinePreviewTextEditorControlRoot))
  }, [])

  const updateSelectionStart = () => {
    const textarea = textareaRef.current

    if (!textarea) {
      return
    }

    setSelection(getTextareaSelectionState(textarea))
  }

  const applyInlineTextSelectionRange = useCallback(
    (nextSelection: InlinePreviewTextEditorSelectionRange) => {
      pendingSelectionRef.current = nextSelection

      const textarea = textareaRef.current
      const valueLength = textarea?.value.length ?? value.length
      const nextSelectionState = getInlineTextSelectionStateFromRange(
        nextSelection,
        valueLength,
      )

      if (textarea) {
        textarea.focus({ preventScroll: true })
        textarea.setSelectionRange(
          nextSelectionState.start,
          nextSelectionState.end,
          'forward',
        )
      }

      adapterSelectionAnchorRef.current = nextSelectionState.focus
      setSelection(nextSelectionState)
    },
    [value.length],
  )

  const handleInlineTextEditorKeyDown = (
    event: KeyboardEvent<HTMLTextAreaElement>,
  ) => {
    event.stopPropagation()

    if (!sourceMode && onRichTextKeyboardCommand) {
      const command =
        event.key === 'Enter'
          ? event.shiftKey ? 'shiftEnter' : 'enter'
          : event.key === 'Backspace'
            ? 'backspace'
            : null

      if (command) {
        const nextSelection = onRichTextKeyboardCommand(
          command,
          getInlineTextSelectionRange(selection),
        )

        if (nextSelection) {
          event.preventDefault()
          applyInlineTextSelectionRange(nextSelection)
          return
        }
      }
    }

    if (!isInlinePreviewTextSelectAllShortcut(event)) {
      return
    }

    event.preventDefault()

    const textarea = event.currentTarget
    textarea.setSelectionRange(0, textarea.value.length, 'forward')
    setSelection({
      end: textarea.value.length,
      focus: textarea.value.length,
      start: 0,
    })
  }

  const handleInlineTextEditorPointerDown = (
    event: ReactPointerEvent<HTMLTextAreaElement>,
  ) => {
    const textarea = event.currentTarget
    const host = textarea.closest(`.${INLINE_PREVIEW_TEXT_HOST_CLASS}`)
    const nextSelectionStart = host
      ? getPointerSelectionStart({
          caretValue,
          clientX: event.clientX,
          clientY: event.clientY,
          geometryLines,
          host,
          lines,
        })
      : null

    event.stopPropagation()

    if (nextSelectionStart === null) {
      return
    }

    event.preventDefault()
    textarea.focus({ preventScroll: true })
    textarea.setSelectionRange(
      nextSelectionStart,
      nextSelectionStart,
      'forward',
    )
    setSelection(getCollapsedSelectionState(nextSelectionStart))
  }

  const handleInlineTextEditorBlur = (
    event: ReactFocusEvent<HTMLTextAreaElement>,
  ) => {
    if (
      shouldKeepInlinePreviewTextEditorOpenOnBlur({
        pointerStartedInsideControls: controlPointerStartedInsideRef.current,
        relatedTarget: event.relatedTarget,
        roots: getInlineControlRoots(),
      })
    ) {
      return
    }

    onDone()
  }

  useEffect(() => {
    if (typeof document === 'undefined') {
      return undefined
    }

    const handleDocumentPointerDown = (event: globalThis.PointerEvent) => {
      controlPointerStartedInsideRef.current =
        isInlinePreviewTextEditorControlEvent({
          composedPath: event.composedPath?.(),
          roots: getInlineControlRoots(),
          target: event.target,
        })
    }
    const handleDocumentPointerEnd = () => {
      controlPointerStartedInsideRef.current = false
    }

    document.addEventListener('pointerdown', handleDocumentPointerDown, true)
    document.addEventListener('pointerup', handleDocumentPointerEnd, true)
    document.addEventListener('pointercancel', handleDocumentPointerEnd, true)

    return () => {
      document.removeEventListener(
        'pointerdown',
        handleDocumentPointerDown,
        true,
      )
      document.removeEventListener('pointerup', handleDocumentPointerEnd, true)
      document.removeEventListener(
        'pointercancel',
        handleDocumentPointerEnd,
        true,
      )
    }
  }, [getInlineControlRoots])

  useEffect(() => {
    const textarea = textareaRef.current

    if (!textarea || sourceMode) {
      return
    }

    textarea.focus({ preventScroll: true })
    textarea.setSelectionRange(textarea.value.length, textarea.value.length)
    adapterSelectionAnchorRef.current = textarea.value.length
    adapterSelectionPointerIdRef.current = null
    setSelection(getCollapsedSelectionState(textarea.value.length))
  }, [sourceMode, targetKey])

  useLayoutEffect(() => {
    const pendingSelection = pendingSelectionRef.current

    if (!pendingSelection || sourceMode) {
      return
    }

    const textarea = textareaRef.current
    const valueLength = textarea?.value.length ?? value.length
    const nextSelectionState = getInlineTextSelectionStateFromRange(
      pendingSelection,
      valueLength,
    )

    pendingSelectionRef.current = null

    if (textarea) {
      textarea.focus({ preventScroll: true })
      textarea.setSelectionRange(
        nextSelectionState.start,
        nextSelectionState.end,
        'forward',
      )
    }

    adapterSelectionAnchorRef.current = nextSelectionState.focus
    setSelection(nextSelectionState)
  }, [sourceMode, targetKey, value])

  useLayoutEffect(() => {
    const textarea = textareaRef.current
    const getCurrentHost = () =>
      getInlinePreviewTextHostForTarget({
        inputMode,
        targetKey,
        textarea,
      })
    const host = getCurrentHost()

    if (!host) {
      controlFrameRef.current = null
      setControlFrame(null)
      return
    }

    let frameRequestId: number | null = null
    let isFrameTrackingActive = true

    const updateControlFrame = () => {
      const currentHost = getCurrentHost()

      if (!currentHost) {
        if (controlFrameRef.current !== null) {
          controlFrameRef.current = null
          setControlFrame(null)
        }
        return
      }

      const rect = currentHost.getBoundingClientRect()
      const previewRect =
        getInlineTextPreviewSurface(currentHost)?.getBoundingClientRect() ??
        rect

      const nextControlFrame = {
        anchor: {
          bottom: rect.bottom,
          centerX: rect.left + rect.width / 2,
          centerY: rect.top + rect.height / 2,
          right: rect.right,
          top: rect.top,
        },
        previewRect: rectToInlineTextRect(previewRect),
      }

      if (
        areInlineTextControlFramesEqual(
          controlFrameRef.current,
          nextControlFrame,
        )
      ) {
        return
      }

      controlFrameRef.current = nextControlFrame
      setControlFrame(nextControlFrame)
    }

    const updateControlFrameOnAnimationFrame = () => {
      if (!isFrameTrackingActive) {
        return
      }

      updateControlFrame()
      frameRequestId = window.requestAnimationFrame(
        updateControlFrameOnAnimationFrame,
      )
    }

    updateControlFrame()
    if (
      typeof window.requestAnimationFrame === 'function' &&
      typeof window.cancelAnimationFrame === 'function'
    ) {
      frameRequestId = window.requestAnimationFrame(
        updateControlFrameOnAnimationFrame,
      )
    }

    const resizeObserver =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(updateControlFrame)

    resizeObserver?.observe(host)
    const previewSurface = getInlineTextPreviewSurface(host)
    if (previewSurface && previewSurface !== host) {
      resizeObserver?.observe(previewSurface)
    }
    window.addEventListener('resize', updateControlFrame)
    window.addEventListener('scroll', updateControlFrame, true)

    return () => {
      isFrameTrackingActive = false
      if (frameRequestId !== null) {
        window.cancelAnimationFrame(frameRequestId)
      }
      resizeObserver?.disconnect()
      window.removeEventListener('resize', updateControlFrame)
      window.removeEventListener('scroll', updateControlFrame, true)
    }
  }, [inputMode, menuPlacement, targetKey, value])

  useLayoutEffect(() => {
    if (!controlFrame) return

    const updateControlSizes = () => {
      const nextControlSizes = {
        menu: getInlineTextMenuControlSize(
          menuRef.current,
          INLINE_TEXT_DEFAULT_CONTROL_SIZES.menu,
        ),
        moveHandle: getInlineTextControlSize(
          moveHandleRef.current,
          INLINE_TEXT_DEFAULT_CONTROL_SIZES.moveHandle,
        ),
        tabs: getInlineTextControlSize(
          tabsRef.current,
          INLINE_TEXT_DEFAULT_CONTROL_SIZES.tabs,
        ),
      }

      setControlSizes((currentControlSizes) =>
        areInlineTextControlSizesEqual(
          currentControlSizes,
          nextControlSizes,
        )
          ? currentControlSizes
          : nextControlSizes,
      )
    }

    updateControlSizes()

    const resizeObserver =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(updateControlSizes)

    if (tabsRef.current) resizeObserver?.observe(tabsRef.current)
    if (menuRef.current) resizeObserver?.observe(menuRef.current)
    if (moveHandleRef.current) resizeObserver?.observe(moveHandleRef.current)
    window.addEventListener('resize', updateControlSizes)

    return () => {
      resizeObserver?.disconnect()
      window.removeEventListener('resize', updateControlSizes)
    }
  }, [activeTab, controlFrame, menuPlacement, targetKey, value])

  useLayoutEffect(() => {
    const textarea = textareaRef.current
    const host = getInlinePreviewTextHostForTarget({
      inputMode,
      targetKey,
      textarea,
    })

    if (!host) {
      setCaretFrame(null)
      setSelectionFrames([])
      return
    }

    const hostRect = host.getBoundingClientRect()

    if (geometryLines) {
      setCaretFrame(
        getGeometryCaretFrame({
          caretValue,
          geometryLines,
          host,
          lines,
          selectionFocus: selection.focus,
        }) ?? {
          height: hostRect.height,
          left: 0,
          top: 0,
        },
      )
      setSelectionFrames(
        inputMode === 'adapter'
          ? getTextSelectionFrames({
              caretValue,
              geometryLines,
              host,
              lines,
              selection,
            })
          : [],
      )
      return
    }

    const { lineIndex, offset } = getInlinePreviewTextCaretLineOffset({
      caretIndex: selection.focus,
      caretValue,
      lines,
    })
    const lineSpan = getLineSpan(host, lineIndex)

    if (!lineSpan) {
      setCaretFrame({
        height: hostRect.height,
        left: 0,
        top: 0,
      })
      setSelectionFrames([])
      return
    }

    const lineRect = lineSpan.getBoundingClientRect()
    let caretLeft = offset <= 0 ? lineRect.left : lineRect.right

    if (offset > 0) {
      caretLeft = getTextRangeBoundary(lineSpan, offset, lineRect)
    }

    setCaretFrame({
      height: Math.max(1, lineRect.height),
      left: caretLeft - hostRect.left,
      top: lineRect.top - hostRect.top,
    })
    setSelectionFrames(
      inputMode === 'adapter'
        ? getTextSelectionFrames({
            caretValue,
            geometryLines,
            host,
            lines,
            selection,
          })
        : [],
    )
  }, [
    caretValue,
    geometryLines,
    inputMode,
    lines,
    selection,
    targetKey,
    value,
  ])

  useLayoutEffect(() => {
    if (inputMode !== 'adapter') {
      return
    }

    const textarea = textareaRef.current
    const host = getInlinePreviewTextHostForTarget({
      inputMode,
      targetKey,
      textarea,
    })

    if (!textarea || !host) {
      return
    }

    const setAdapterPointerSelection = (
      event: globalThis.PointerEvent,
      anchor: number,
    ) => {
      const nextSelectionFocus = getPointerSelectionStart({
        caretValue,
        clientX: event.clientX,
        clientY: event.clientY,
        geometryLines,
        host,
        lines,
      })

      if (nextSelectionFocus === null) {
        return
      }

      const start = Math.min(anchor, nextSelectionFocus)
      const end = Math.max(anchor, nextSelectionFocus)
      const direction = nextSelectionFocus < anchor ? 'backward' : 'forward'

      textarea.focus({ preventScroll: true })
      textarea.setSelectionRange(start, end, direction)
      setSelection({
        end,
        focus: nextSelectionFocus,
        start,
      })
    }

    const handleAdapterPointerDown = (event: globalThis.PointerEvent) => {
      if (event.button !== 0) {
        return
      }

      const nextSelectionFocus = getPointerSelectionStart({
        caretValue,
        clientX: event.clientX,
        clientY: event.clientY,
        geometryLines,
        host,
        lines,
      })

      if (nextSelectionFocus === null) {
        return
      }

      event.preventDefault()
      event.stopPropagation()
      adapterSelectionAnchorRef.current = nextSelectionFocus
      adapterSelectionPointerIdRef.current = event.pointerId

      if (host instanceof HTMLElement && host.setPointerCapture) {
        host.setPointerCapture(event.pointerId)
      }

      textarea.focus({ preventScroll: true })
      textarea.setSelectionRange(
        nextSelectionFocus,
        nextSelectionFocus,
        'forward',
      )
      setSelection(getCollapsedSelectionState(nextSelectionFocus))
    }

    const handleAdapterPointerMove = (event: globalThis.PointerEvent) => {
      if (adapterSelectionPointerIdRef.current !== event.pointerId) {
        return
      }

      event.preventDefault()
      event.stopPropagation()
      setAdapterPointerSelection(event, adapterSelectionAnchorRef.current)
    }

    const handleAdapterPointerUp = (event: globalThis.PointerEvent) => {
      if (adapterSelectionPointerIdRef.current !== event.pointerId) {
        return
      }

      event.preventDefault()
      event.stopPropagation()

      if (host instanceof HTMLElement && host.releasePointerCapture) {
        try {
          host.releasePointerCapture(event.pointerId)
        } catch {
          // Some browsers release capture before pointerup if the pointer leaves.
        }
      }

      adapterSelectionPointerIdRef.current = null
    }

    host.addEventListener('pointerdown', handleAdapterPointerDown)
    host.addEventListener('pointermove', handleAdapterPointerMove)
    host.addEventListener('pointerup', handleAdapterPointerUp)
    host.addEventListener('pointercancel', handleAdapterPointerUp)

    return () => {
      host.removeEventListener('pointerdown', handleAdapterPointerDown)
      host.removeEventListener('pointermove', handleAdapterPointerMove)
      host.removeEventListener('pointerup', handleAdapterPointerUp)
      host.removeEventListener('pointercancel', handleAdapterPointerUp)
    }
  }, [caretValue, geometryLines, inputMode, lines, targetKey])

  const controlLayout = controlFrame
    ? getInlinePreviewTextControlLayout({
        anchor: controlFrame.anchor,
        previewRect: controlFrame.previewRect,
        requestedMenuPlacement: menuPlacement,
        sizes: controlSizes,
      })
    : null
  const resolvedMenuPlacement = controlLayout?.menu.placement ?? menuPlacement
  const tabsStyle = controlLayout
    ? ({
        left: controlLayout.tabs.left,
        maxWidth: controlLayout.tabs.maxWidth,
        top: controlLayout.tabs.top,
        transform: 'none',
      } satisfies CSSProperties)
    : undefined
  const menuStyle = controlLayout
    ? ({
        left: controlLayout.menu.left,
        '--inline-preview-text-menu-max-height': `${controlLayout.menu.maxHeight}px`,
        maxWidth: controlLayout.menu.maxWidth,
        top: controlLayout.menu.top,
        transform: 'none',
      } as CSSProperties)
    : undefined
  const moveHandleStyle = controlLayout
    ? ({
        left: controlLayout.moveHandle.left,
        top: controlLayout.moveHandle.top,
        transform: 'none',
      } satisfies CSSProperties)
    : undefined
  const deleteAction = editorControls?.deleteAction
  const deleteLabel = deleteAction?.label ?? 'Delete'
  const deleteAriaLabel = deleteAction?.ariaLabel ?? deleteLabel
  const controls = controlFrame ? (
    <>
      <div
        ref={tabsRef}
        className="inline-preview-text-tabs"
        onClick={stopInlineTextEditorClick}
        onPointerDown={keepInlineTextEditorFocus}
        style={tabsStyle}
      >
        {INLINE_TEXT_EDITOR_TABS.map((tab) => (
          <button
            key={tab.id}
            className={[
              'inline-preview-text-tab',
              activeTab === tab.id ? 'is-active' : '',
            ].filter(Boolean).join(' ')}
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              setActiveTab(tab.id)
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <button
        ref={moveHandleRef}
        className="inline-preview-text-move-handle"
        type="button"
        onPointerDown={(event) => {
          event.preventDefault()
          onMoveHandlePointerDown(event)
        }}
        onPointerMove={onMoveHandlePointerMove}
        onPointerUp={onMoveHandlePointerUp}
        onClick={stopInlineTextEditorClick}
        style={moveHandleStyle}
      >
        Move
      </button>

      <div
        ref={menuRef}
        className={[
          'inline-preview-text-menu',
          `inline-preview-text-menu--${resolvedMenuPlacement}`,
        ].join(' ')}
        onClick={stopInlineTextEditorClick}
        onPointerDown={stopInlineTextEditorPointer}
        style={menuStyle}
      >
        <InlinePreviewTextEditorMenuContent
          activeTab={activeTab}
          controls={editorControls}
          selection={getInlineTextSelectionRange(selection)}
          sourceDraftIdentity={sourceDraftIdentity}
          sourceInitialValue={value}
          sourceMode={sourceMode}
          onSourceDraftChange={updateSourceDraft}
          onSourceDraftCommit={commitSourceDraft}
          onSelectionChange={applyInlineTextSelectionRange}
        />
        <div className="inline-preview-text-menu-actions">
          {deleteAction ? (
            <button
              type="button"
              className="secondary-button icon-text-button inline-preview-text-delete-button"
              aria-label={deleteAriaLabel}
              title={deleteAriaLabel}
              onClick={(event) => {
                event.stopPropagation()
                deleteAction.onDelete()
              }}
              onPointerDown={keepInlineTextEditorFocus}
            >
              <TrashIcon />
              <span>{deleteLabel}</span>
            </button>
          ) : null}
        <button
          type="button"
          className="secondary-button inline-preview-text-done-button"
          onClick={(event) => {
            event.stopPropagation()
            commitSourceDraft()
            onDone()
          }}
          onPointerDown={keepInlineTextEditorFocus}
        >
          Done
        </button>
        </div>
      </div>
    </>
  ) : null

  const hasVisibleSelection =
    inputMode === 'adapter' && selection.start !== selection.end
  const textareaElement = (
    <textarea
      ref={textareaRef}
      aria-label={ariaLabel}
      className={[
        'inline-preview-textarea',
        inputMode === 'adapter'
          ? 'inline-preview-textarea--adapter'
          : '',
      ].filter(Boolean).join(' ')}
      value={value}
      spellCheck={false}
      style={inputMode === 'overlay' ? textareaStyle : undefined}
      onChange={(event) => {
        onValueChange(event.target.value, { sourceMode: false })
        setSelection(getTextareaSelectionState(event.target))
      }}
      onClick={(event) => {
        stopInlineTextEditorClick(event)
        updateSelectionStart()
      }}
      onKeyDown={handleInlineTextEditorKeyDown}
      onKeyUp={updateSelectionStart}
      onBlur={handleInlineTextEditorBlur}
      onPointerDown={
        inputMode === 'overlay' && !sourceMode
          ? handleInlineTextEditorPointerDown
          : undefined
      }
      onPointerUp={updateSelectionStart}
      onSelect={updateSelectionStart}
    />
  )

  return (
    <>
      {!sourceMode ? (
        inputMode === 'adapter' && typeof document !== 'undefined'
          ? createPortal(textareaElement, document.body)
          : textareaElement
      ) : null}
      {!sourceMode ? selectionFrames.map((frame, index) => (
        <span
          key={`${index}-${frame.left}-${frame.width}`}
          aria-hidden="true"
          className="inline-preview-text-selection"
          style={{
            height: frame.height,
            left: frame.left,
            top: frame.top,
            width: frame.width,
          }}
        />
      )) : null}
      {caretFrame && !hasVisibleSelection && !sourceMode ? (
        <span
          aria-hidden="true"
          className="inline-preview-text-caret"
          style={{
            height: caretFrame.height,
            left: caretFrame.left,
            top: caretFrame.top,
          }}
        />
      ) : null}
      {controls ? createPortal(controls, document.body) : null}
    </>
  )
}
