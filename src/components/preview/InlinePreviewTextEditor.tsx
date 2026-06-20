import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
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
  isInlinePreviewTextEditorPlacementLockTarget,
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
  getInlinePreviewTextLockedControlLayout,
  type InlinePreviewTextControlLayout,
  type InlinePreviewTextAnchor,
  type InlinePreviewTextControlSizes,
  type InlinePreviewTextEditorMenuPlacement,
  type InlinePreviewTextObstacle,
  type InlinePreviewTextRect,
  type InlinePreviewTextSize,
} from './inlinePreviewTextEditorPositioning'
import {
  getInlinePreviewTextGeometryOffsetForClientPoint,
} from './inlinePreviewTextEditorTransform'
import {
  formatInlinePreviewPointSizeValue,
  getInlinePreviewPointSizeCommitValue,
  getInlinePreviewPointSizeLiveValue,
  getNearestInlinePreviewPointSizeOptionIndex,
  parseInlinePreviewPointSizeDraft,
  stepInlinePreviewPointSizeValue,
} from './inlinePreviewPointSizeControl'
import {
  CONTEXTUAL_TEXT_CONTROL_GROUPS,
} from '../../text/contextualTextControlViewModel'
import {
  createPreviewEditableElementId,
  INLINE_PREVIEW_TEXT_TARGET_ATTRIBUTE,
  PREVIEW_EDITABLE_ID_ATTRIBUTE,
} from '../../editor/previewEditableRegistry'
import type {
  InlinePreviewTextEditorCheckboxControl,
  InlinePreviewTextEditorColorControl,
  InlinePreviewTextEditorControls,
  InlinePreviewTextEditorGeometryLine,
  InlinePreviewTextEditorInputMode,
  InlinePreviewTextEditorLine,
  InlinePreviewTextEditorNumberSelectControl,
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
  obstacles: InlinePreviewTextObstacle[]
  previousPlacement?: InlinePreviewTextEditorMenuPlacement
  previewRect: InlinePreviewTextRect
  workspaceRect: InlinePreviewTextRect
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
const INLINE_PREVIEW_OBSTACLE_SELECTOR = [
  '.preview-guide-legend-panel',
  '.preview-design-check-panel',
  '.preview-element-outline',
].join(',')

const INLINE_TEXT_DEFAULT_CONTROL_SIZES: InlinePreviewTextControlSizes = {
  menu: { height: 178, width: 520 },
  moveHandle: { height: 32, width: 60 },
  tabs: { height: 46, width: 520 },
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

function shouldKeepInlineTextPlacementLockedWhileFocused(target: unknown) {
  if (
    typeof HTMLInputElement !== 'undefined' &&
    target instanceof HTMLInputElement
  ) {
    return !['checkbox', 'color', 'range'].includes(target.type)
  }

  return (
    typeof HTMLTextAreaElement !== 'undefined' &&
      target instanceof HTMLTextAreaElement
  ) || (
    typeof HTMLSelectElement !== 'undefined' &&
      target instanceof HTMLSelectElement
  )
}

function getInlineTextSmokeToken(label: string) {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'control'
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

function getInlineTextPreviewWorkspace(surface: Element | null) {
  return (
    surface?.closest<HTMLElement>('.preview-area') ??
    surface?.closest<HTMLElement>('.preview-workspace') ??
    null
  )
}

function getViewportInlineTextRect(): InlinePreviewTextRect {
  if (typeof window === 'undefined') {
    return {
      bottom: 0,
      left: 0,
      right: 0,
      top: 0,
    }
  }

  return {
    bottom: window.innerHeight,
    left: 0,
    right: window.innerWidth,
    top: 0,
  }
}

function getPreviewEditableIdForInlineTextTargetKey(targetKey: string) {
  const parts = targetKey.split(':')

  if (parts[0] === 'disc' && parts[1]) {
    return `disc-text:${parts[1]}`
  }

  if (parts[0] === 'templateTextBlock' && parts[1] && parts[2]) {
    return createPreviewEditableElementId(
      'case',
      parts[1],
      'text-block',
      parts[2],
    )
  }

  if (parts[0] === 'templateTextList' && parts[1] && parts[2]) {
    return createPreviewEditableElementId(
      'case',
      parts[1],
      'text-list',
      parts[2],
    )
  }

  if (parts[0] === 'spineTitle' && parts[1]) {
    return createPreviewEditableElementId('case', 'spine', parts[1], 'title')
  }

  if (parts[0] === 'spineTextBlock' && parts[1] && parts[2]) {
    return createPreviewEditableElementId(
      'case',
      'spine',
      parts[1],
      'text-block',
      parts[2],
    )
  }

  return null
}

function getInlineTextObstacleRects(
  workspace: Element | null,
  activePreviewEditableId: string | null,
): InlinePreviewTextObstacle[] {
  if (!workspace) return []

  return Array.from(
    workspace.querySelectorAll<HTMLElement>(INLINE_PREVIEW_OBSTACLE_SELECTOR),
  ).flatMap((element, index) => {
    const outlineId = element.getAttribute('data-preview-element-outline-id')

    if (outlineId && outlineId === activePreviewEditableId) {
      return []
    }

    return [{
      id:
        element.getAttribute('aria-label') ??
        outlineId ??
        `${element.className}-${index}`,
      rect: rectToInlineTextRect(element.getBoundingClientRect()),
    }]
  })
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
    first.previousPlacement === second.previousPlacement &&
    areInlineTextRectsEqual(first.previewRect, second.previewRect) &&
    areInlineTextRectsEqual(first.workspaceRect, second.workspaceRect) &&
    first.obstacles.length === second.obstacles.length &&
    first.obstacles.every((obstacle, index) => {
      const nextObstacle = second.obstacles[index]
      return (
        obstacle.id === nextObstacle.id &&
        areInlineTextRectsEqual(obstacle.rect, nextObstacle.rect)
      )
    })
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
        data-smoke-id={`inline-text-select-${getInlineTextSmokeToken(control.label)}`}
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
        data-smoke-id={`inline-text-range-${getInlineTextSmokeToken(control.label)}`}
        type="range"
        min={control.min}
        max={control.max}
        step={control.step}
        value={control.value}
        onChange={(event) => handleChange(event.target.value)}
      />
      <input
        aria-label={control.label}
        data-smoke-id={`inline-text-number-${getInlineTextSmokeToken(control.label)}`}
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

function InlinePreviewTextNumberSelectControl({
  control,
  selection,
}: {
  control: InlinePreviewTextEditorNumberSelectControl
  selection: InlinePreviewTextEditorSelectionRange
}) {
  const id = useId()
  const inputRef = useRef<HTMLInputElement | null>(null)
  const holdDelayRef = useRef<number | null>(null)
  const holdIntervalRef = useRef<number | null>(null)
  const token = getInlineTextSmokeToken(control.label)
  const optionListId = `inline-text-options-${token}-${id}`
  const selectionValue = control.getSelectionValue?.(selection)
  const displayedValue = selectionValue?.state === 'active' &&
      typeof selectionValue.value === 'number'
    ? selectionValue.value
    : control.value
  const latestValueRef = useRef(displayedValue)
  const isMixedSelection = selectionValue?.state === 'mixed'
  const controlValueText = formatInlinePreviewPointSizeValue(displayedValue)
  const [activeOptionIndex, setActiveOptionIndex] = useState(() =>
    getNearestInlinePreviewPointSizeOptionIndex({
      draft: controlValueText,
      options: control.options,
      value: displayedValue,
    }))
  const [draft, setDraft] = useState(() =>
    controlValueText)
  const [focused, setFocused] = useState(false)
  const [open, setOpen] = useState(false)
  const renderedDraft = focused
    ? draft
    : isMixedSelection
      ? 'Mixed'
      : controlValueText

  const config = useMemo(() => ({
    max: control.max,
    min: control.min,
    step: control.step,
  }), [control.max, control.min, control.step])

  const clearHoldTimers = useCallback(() => {
    if (holdDelayRef.current !== null) {
      window.clearTimeout(holdDelayRef.current)
      holdDelayRef.current = null
    }
    if (holdIntervalRef.current !== null) {
      window.clearInterval(holdIntervalRef.current)
      holdIntervalRef.current = null
    }
  }, [])

  const focusInput = useCallback(() => {
    window.requestAnimationFrame(() => {
      inputRef.current?.focus({ preventScroll: true })
    })
  }, [])

  const commitDraft = useCallback((nextDraft = draft) => {
    const nextValue = getInlinePreviewPointSizeCommitValue({
      ...config,
      currentValue: latestValueRef.current,
      draft: nextDraft,
    })

    latestValueRef.current = nextValue
    control.onChange(nextValue, selection)
    setDraft(formatInlinePreviewPointSizeValue(nextValue))
    setOpen(false)
  }, [config, control, draft, selection])

  const updateDraft = useCallback((nextDraft: string) => {
    setDraft(nextDraft)
    const liveValue = getInlinePreviewPointSizeLiveValue(nextDraft, config)

    if (liveValue !== null && liveValue !== latestValueRef.current) {
      latestValueRef.current = liveValue
      control.onChange(liveValue, selection)
    }
  }, [config, control, selection])

  const selectValue = useCallback((value: number) => {
    latestValueRef.current = value
    control.onChange(value, selection)
    setDraft(formatInlinePreviewPointSizeValue(value))
    setOpen(false)
    focusInput()
  }, [control, focusInput, selection])

  const stepValue = useCallback((direction: -1 | 1) => {
    const draftValue = parseInlinePreviewPointSizeDraft(
      inputRef.current?.value ?? draft,
    )
    const nextValue = stepInlinePreviewPointSizeValue({
      ...config,
      direction,
      value: draftValue ?? latestValueRef.current,
    })

    latestValueRef.current = nextValue
    control.onChange(nextValue, selection)
    setDraft(formatInlinePreviewPointSizeValue(nextValue))
  }, [config, control, draft, selection])

  const startStepping = useCallback((direction: -1 | 1) => {
    clearHoldTimers()
    stepValue(direction)
    holdDelayRef.current = window.setTimeout(() => {
      holdIntervalRef.current = window.setInterval(() => {
        stepValue(direction)
      }, 70)
    }, 320)
  }, [clearHoldTimers, stepValue])

  const openOptions = useCallback(() => {
    setActiveOptionIndex(
      getNearestInlinePreviewPointSizeOptionIndex({
        draft: inputRef.current?.value ?? renderedDraft,
        options: control.options,
        value: latestValueRef.current,
      }),
    )
    setOpen(true)
  }, [control.options, renderedDraft])

  useEffect(() => clearHoldTimers, [clearHoldTimers])

  useEffect(() => {
    latestValueRef.current = displayedValue
  }, [displayedValue])

  return (
    <label className="inline-preview-text-control-field inline-preview-text-number-select-field">
      <span>{control.label}</span>
      <span className="inline-preview-text-number-select">
        <input
          ref={inputRef}
          aria-activedescendant={
            open
              ? `${optionListId}-option-${control.options[activeOptionIndex]}`
              : undefined
          }
          aria-controls={optionListId}
          aria-expanded={open}
          aria-label={control.label}
          autoComplete="off"
          data-smoke-id={`inline-text-number-${token}`}
          data-selection-state={selectionValue?.state}
          inputMode="decimal"
          max={control.max}
          min={control.min}
          role="combobox"
          step={control.step}
          type="text"
          value={renderedDraft}
          onBlur={(event) => {
            setFocused(false)
            commitDraft(event.currentTarget.value)
          }}
          onChange={(event) => updateDraft(event.target.value)}
          onClick={stopInlineTextEditorClick}
          onFocus={() => {
            setDraft(isMixedSelection ? '' : controlValueText)
            setFocused(true)
          }}
          onKeyDown={(event) => {
            event.stopPropagation()

            if (event.key === 'Enter') {
              event.preventDefault()
              if (open) {
                selectValue(control.options[activeOptionIndex])
                return
              }
              commitDraft(event.currentTarget.value)
              return
            }

            if (event.key === 'Escape') {
              event.preventDefault()
              setOpen(false)
              setDraft(formatInlinePreviewPointSizeValue(latestValueRef.current))
              return
            }

            if (event.key === 'ArrowDown') {
              event.preventDefault()
              if (open || event.altKey) {
                if (!open) {
                  openOptions()
                  return
                }
                setActiveOptionIndex((currentIndex) =>
                  Math.min(control.options.length - 1, currentIndex + 1))
                return
              }
              stepValue(-1)
              return
            }

            if (event.key === 'ArrowUp') {
              event.preventDefault()
              if (open) {
                setActiveOptionIndex((currentIndex) =>
                  Math.max(0, currentIndex - 1))
                return
              }
              stepValue(1)
            }
          }}
          onWheel={(event) => {
            if (document.activeElement !== event.currentTarget) {
              return
            }
            event.preventDefault()
            event.stopPropagation()
            stepValue(event.deltaY < 0 ? 1 : -1)
          }}
        />
        <span className="inline-preview-text-number-buttons">
          <button
            type="button"
            aria-label={`Increase ${control.label}`}
            className="inline-preview-text-number-step"
            data-smoke-id={`inline-text-number-step-up-${token}`}
            onClick={stopInlineTextEditorClick}
            onKeyDown={(event) => {
              event.stopPropagation()
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                stepValue(1)
              }
            }}
            onPointerCancel={clearHoldTimers}
            onPointerDown={(event) => {
              keepInlineTextEditorFocus(event)
              startStepping(1)
            }}
            onPointerLeave={clearHoldTimers}
            onPointerUp={clearHoldTimers}
          >
            +
          </button>
          <button
            type="button"
            aria-label={`Decrease ${control.label}`}
            className="inline-preview-text-number-step"
            data-smoke-id={`inline-text-number-step-down-${token}`}
            onClick={stopInlineTextEditorClick}
            onKeyDown={(event) => {
              event.stopPropagation()
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                stepValue(-1)
              }
            }}
            onPointerCancel={clearHoldTimers}
            onPointerDown={(event) => {
              keepInlineTextEditorFocus(event)
              startStepping(-1)
            }}
            onPointerLeave={clearHoldTimers}
            onPointerUp={clearHoldTimers}
          >
            -
          </button>
          <button
            type="button"
            aria-label={`${control.label} presets`}
            className="inline-preview-text-number-preset-button"
            data-smoke-id={`inline-text-number-options-${token}`}
            aria-expanded={open}
            onClick={(event) => {
              event.stopPropagation()
              if (open) {
                setOpen(false)
                return
              }
              openOptions()
              focusInput()
            }}
            onPointerDown={keepInlineTextEditorFocus}
          >
            ▾
          </button>
        </span>
        {open ? (
          <span
            id={optionListId}
            className="inline-preview-text-number-options"
            data-smoke-id={`inline-text-number-options-list-${token}`}
            role="listbox"
          >
            {control.options.map((option, index) => (
              <button
                key={option}
                id={`${optionListId}-option-${option}`}
                type="button"
                aria-selected={index === activeOptionIndex}
                className={[
                  'inline-preview-text-number-option',
                  index === activeOptionIndex ? 'is-active' : '',
                ].filter(Boolean).join(' ')}
                data-smoke-id={`inline-text-number-option-${token}-${option}`}
                role="option"
                onClick={(event) => {
                  event.stopPropagation()
                  selectValue(option)
                }}
                onPointerDown={keepInlineTextEditorFocus}
              >
                {option}
              </button>
            ))}
          </span>
        ) : null}
      </span>
    </label>
  )
}

function renderInlinePreviewTextNumberSelectControl(
  control: InlinePreviewTextEditorNumberSelectControl | undefined,
  selection: InlinePreviewTextEditorSelectionRange,
) {
  return control
    ? (
        <InlinePreviewTextNumberSelectControl
          control={control}
          selection={selection}
        />
      )
    : null
}

function renderInlinePreviewTextSizeControl(
  control:
    | InlinePreviewTextEditorNumberSelectControl
    | InlinePreviewTextEditorRangeControl
    | undefined,
  selection: InlinePreviewTextEditorSelectionRange,
) {
  if (!control) return null

  return 'options' in control
    ? renderInlinePreviewTextNumberSelectControl(control, selection)
    : renderInlinePreviewTextRangeControl(control)
}

function renderInlinePreviewTextCheckboxControl(
  control: InlinePreviewTextEditorCheckboxControl | undefined,
) {
  if (!control) return null

  return (
    <label className="inline-preview-text-checkbox-field">
      <input
        data-smoke-id={`inline-text-checkbox-${getInlineTextSmokeToken(control.label)}`}
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
          data-smoke-id={`inline-text-checkbox-${getInlineTextSmokeToken(control.label)}`}
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
          data-smoke-id="inline-text-html-source"
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
      data-smoke-id={`inline-text-toggle-${getInlineTextSmokeToken(control.label)}`}
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
        data-smoke-id={`inline-text-color-${getInlineTextSmokeToken(control.label)}`}
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
        {renderInlinePreviewTextSizeControl(controls.text?.size, selection)}
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
  hostHeight,
}: {
  geometryLine: InlinePreviewTextEditorGeometryLine
  hostHeight: number
}) {
  const top = geometryLine.topRatio * hostHeight
  const height = Math.max(1, geometryLine.heightRatio * hostHeight)

  return {
    bottom: top + height,
    height,
    top,
  }
}

function getHostLocalSize(host: Element, hostRect: DOMRect) {
  const htmlHost = host instanceof HTMLElement ? host : null
  const width = htmlHost?.offsetWidth || hostRect.width
  const height = htmlHost?.offsetHeight || hostRect.height

  return {
    height: Math.max(1, height),
    width: Math.max(1, width),
  }
}

function getPointerSelectionStart({
  caretValue,
  clientX,
  clientY,
  geometryLines,
  host,
  lines,
  rotationDegrees,
}: {
  caretValue: string
  clientX: number
  clientY: number
  geometryLines?: InlinePreviewTextEditorGeometryLine[]
  host: Element
  lines: InlinePreviewTextEditorLine[]
  rotationDegrees?: number
}) {
  if (geometryLines) {
    const hostRect = host.getBoundingClientRect()
    const hostSize = getHostLocalSize(host, hostRect)
    const geometryOffset = getInlinePreviewTextGeometryOffsetForClientPoint({
      clientX,
      clientY,
      geometryLines,
      hostHeight: hostSize.height,
      hostRect,
      hostWidth: hostSize.width,
      rotationDegrees,
    })

    if (!geometryOffset) {
      return null
    }

    return getInlinePreviewTextCaretIndexForLineOffset({
      caretValue,
      lineIndex: geometryOffset.lineIndex,
      lines,
      offset: geometryOffset.offset,
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

      const hostSize = getHostLocalSize(host, hostRect)
      const lineFrame = getGeometryLineFrame({
        geometryLine,
        hostHeight: hostSize.height,
      })
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
      const width = Math.abs(endRatio - startRatio) * hostSize.width

      if (width <= 0) {
        return []
      }

      return [
        {
          height: lineFrame.height,
          left: leftRatio * hostSize.width,
          top: lineFrame.top,
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
  const hostSize = getHostLocalSize(host, hostRect)
  const { lineIndex, offset } = getInlinePreviewTextCaretLineOffset({
    caretIndex: selectionFocus,
    caretValue,
    lines,
  })
  const geometryLine = geometryLines[lineIndex]

  if (!geometryLine) {
    return null
  }

  const frame = getGeometryLineFrame({
    geometryLine,
    hostHeight: hostSize.height,
  })
  const caretXRatio =
    geometryLine.caretXRatios[
      Math.max(0, Math.min(offset, geometryLine.caretXRatios.length - 1))
    ] ?? 0

  return {
    height: frame.height,
    left: caretXRatio * hostSize.width,
    top: frame.top,
  }
}

export function InlinePreviewTextEditor({
  ariaLabel,
  caretValue,
  controls: editorControls,
  inputMode = 'overlay',
  geometryLines,
  lines,
  rotationDegrees,
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
  const previousControlPlacementRef =
    useRef<InlinePreviewTextEditorMenuPlacement | undefined>(undefined)
  const latestControlLayoutRef =
    useRef<InlinePreviewTextControlLayout | null>(null)
  const controlPlacementLockRef =
    useRef<{
      inputMode: InlinePreviewTextEditorInputMode
      layout: InlinePreviewTextControlLayout
      targetKey: string
    } | null>(null)
  const controlFocusPlacementLockRef = useRef(false)
  const controlPointerPlacementLockRef = useRef(false)
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
  const [controlPlacementLock, setControlPlacementLock] =
    useState<{
      inputMode: InlinePreviewTextEditorInputMode
      layout: InlinePreviewTextControlLayout
      targetKey: string
    } | null>(null)
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

  const beginControlPlacementLock = useCallback((
    reason: 'focus' | 'pointer',
  ) => {
    if (reason === 'focus') {
      controlFocusPlacementLockRef.current = true
    } else {
      controlPointerPlacementLockRef.current = true
    }

    const layout = latestControlLayoutRef.current

    if (!layout || controlPlacementLockRef.current) {
      return
    }

    const nextLock = { inputMode, layout, targetKey }
    controlPlacementLockRef.current = nextLock
    setControlPlacementLock(nextLock)
  }, [inputMode, targetKey])

  const releaseControlPlacementLock = useCallback((
    reason?: 'all' | 'focus' | 'pointer',
  ) => {
    if (!reason || reason === 'all' || reason === 'focus') {
      controlFocusPlacementLockRef.current = false
    }
    if (!reason || reason === 'all' || reason === 'pointer') {
      controlPointerPlacementLockRef.current = false
    }
    if (
      controlFocusPlacementLockRef.current ||
      controlPointerPlacementLockRef.current
    ) {
      return
    }
    if (!controlPlacementLockRef.current) {
      return
    }

    controlPlacementLockRef.current = null
    setControlPlacementLock(null)
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
          rotationDegrees,
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
    previousControlPlacementRef.current = undefined
    controlPlacementLockRef.current = null
    controlFocusPlacementLockRef.current = false
    controlPointerPlacementLockRef.current = false
  }, [inputMode, targetKey])

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
      releaseControlPlacementLock('pointer')
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
  }, [getInlineControlRoots, releaseControlPlacementLock])

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
      const previewSurface = getInlineTextPreviewSurface(currentHost)
      const previewRect = previewSurface?.getBoundingClientRect() ?? rect
      const workspace = getInlineTextPreviewWorkspace(previewSurface)
      const activePreviewEditableId =
        currentHost.getAttribute(PREVIEW_EDITABLE_ID_ATTRIBUTE) ??
        getPreviewEditableIdForInlineTextTargetKey(targetKey)
      const workspaceRect = workspace
        ? rectToInlineTextRect(workspace.getBoundingClientRect())
        : getViewportInlineTextRect()

      const nextControlFrame = {
        anchor: {
          bottom: rect.bottom,
          centerX: rect.left + rect.width / 2,
          centerY: rect.top + rect.height / 2,
          right: rect.right,
          top: rect.top,
        },
        obstacles: getInlineTextObstacleRects(
          workspace,
          activePreviewEditableId,
        ),
        previousPlacement: previousControlPlacementRef.current,
        previewRect: rectToInlineTextRect(previewRect),
        workspaceRect,
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
    const previewWorkspace = getInlineTextPreviewWorkspace(previewSurface)
    if (previewWorkspace && previewWorkspace !== host) {
      resizeObserver?.observe(previewWorkspace)
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
    rotationDegrees,
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
        rotationDegrees,
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
        rotationDegrees,
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
  }, [caretValue, geometryLines, inputMode, lines, rotationDegrees, targetKey])

  const unlockedControlLayout = controlFrame
    ? getInlinePreviewTextControlLayout({
        anchor: controlFrame.anchor,
        obstacles: controlFrame.obstacles,
        previousPlacement: controlFrame.previousPlacement,
        previewRect: controlFrame.previewRect,
        requestedMenuPlacement: menuPlacement,
        sizes: controlSizes,
        workspaceRect: controlFrame.workspaceRect,
      })
    : null
  const lockedControlLayout =
    controlPlacementLock?.targetKey === targetKey &&
      controlPlacementLock.inputMode === inputMode
      ? controlPlacementLock.layout
      : null
  const controlLayout =
    lockedControlLayout && controlFrame
      ? getInlinePreviewTextLockedControlLayout({
        layout: lockedControlLayout,
        sizes: controlSizes,
        workspaceRect: controlFrame.workspaceRect,
      })
      : unlockedControlLayout
  const controlLayoutPlacement = controlLayout?.menu.placement

  useLayoutEffect(() => {
    if (!controlLayoutPlacement) return

    previousControlPlacementRef.current = controlLayoutPlacement
  }, [controlLayoutPlacement])

  useLayoutEffect(() => {
    latestControlLayoutRef.current = controlLayout
  }, [controlLayout])

  const resolvedMenuPlacement = controlLayoutPlacement ?? menuPlacement
  const isControlPlacementLocked = Boolean(lockedControlLayout)
  const handleControlPointerDownCapture = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    if (!isInlinePreviewTextEditorPlacementLockTarget(event.target)) {
      return
    }

    beginControlPlacementLock('pointer')
  }
  const handleControlFocusCapture = (
    event: ReactFocusEvent<HTMLDivElement>,
  ) => {
    if (
      !isInlinePreviewTextEditorPlacementLockTarget(event.target) ||
      !shouldKeepInlineTextPlacementLockedWhileFocused(event.target)
    ) {
      return
    }

    beginControlPlacementLock('focus')
  }
  const handleControlBlurCapture = (
    event: ReactFocusEvent<HTMLDivElement>,
  ) => {
    if (!isInlinePreviewTextEditorPlacementLockTarget(event.target)) {
      return
    }

    if (isInlinePreviewTextEditorPlacementLockTarget(event.relatedTarget)) {
      return
    }

    releaseControlPlacementLock('focus')
  }
  const handleControlKeyDownCapture = (
    event: KeyboardEvent<HTMLDivElement>,
  ) => {
    if (
      !isInlinePreviewTextEditorPlacementLockTarget(event.target) ||
      (event.key !== 'Enter' && event.key !== 'Escape')
    ) {
      return
    }

    window.requestAnimationFrame(() => releaseControlPlacementLock('focus'))
  }
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
        data-inline-placement-mode={controlLayout?.mode}
        data-inline-placement={resolvedMenuPlacement}
        data-inline-placement-locked={isControlPlacementLocked}
        data-smoke-id="inline-text-tabs"
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
            data-smoke-id={`inline-text-tab-${tab.id}`}
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
        data-inline-placement-mode={controlLayout?.mode}
        data-inline-placement={resolvedMenuPlacement}
        data-inline-placement-locked={isControlPlacementLocked}
        data-smoke-id="inline-text-move-handle"
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
        data-inline-placement-mode={controlLayout?.mode}
        data-inline-placement={resolvedMenuPlacement}
        data-inline-placement-locked={isControlPlacementLocked}
        data-smoke-id="inline-text-menu"
        onClick={stopInlineTextEditorClick}
        onBlurCapture={handleControlBlurCapture}
        onFocusCapture={handleControlFocusCapture}
        onKeyDownCapture={handleControlKeyDownCapture}
        onPointerDownCapture={handleControlPointerDownCapture}
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
              data-smoke-id="inline-text-delete"
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
          data-smoke-id="inline-text-done"
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
      data-smoke-id="inline-text-input"
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
