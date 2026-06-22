import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type FocusEvent as ReactFocusEvent,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent as ReactPointerEvent,
  type SyntheticEvent,
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
  useContextualTextRibbonRegistration,
} from './contextualTextRibbonBridgeContext'
import {
  getContextualTextRibbonTabDisplayLabel,
} from './contextualTextRibbonModel'
import {
  getContextualTextRibbonOverflowState,
  getContextualTextRibbonScrollDeltaToReveal,
} from './contextualTextRibbonOverflow'
import {
  getRotatedLocalTextEdgePoint,
  isPointInTextEdgeGrabBand,
  isPrimaryMoveHandlePointer,
} from '../../interaction/textMoveHandleDrag'
import {
  INLINE_PREVIEW_TEXT_TARGET_ATTRIBUTE,
} from '../../editor/previewEditableRegistry'
import type {
  InlinePreviewTextEditorCheckboxControl,
  InlinePreviewTextEditorCaretFrame,
  InlinePreviewTextEditorColorControl,
  InlinePreviewTextEditorControls,
  InlinePreviewTextEditorGeometryAdapter,
  InlinePreviewTextEditorGeometryLine,
  InlinePreviewTextEditorInputMode,
  InlinePreviewTextEditorLine,
  InlinePreviewTextEditorNumberSelectControl,
  InlinePreviewTextEditorProps,
  InlinePreviewTextEditorRangeControl,
  InlinePreviewTextEditorSelectControl,
  InlinePreviewTextEditorSelectionFrame,
  InlinePreviewTextEditorSelectionRange,
  InlinePreviewTextEditorTextValueControl,
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
  InlinePreviewTextEditorGeometryAdapter,
  InlinePreviewTextEditorGeometryLine,
  InlinePreviewTextEditorInputMode,
  InlinePreviewTextEditorLine,
  InlinePreviewTextEditorOption,
  InlinePreviewTextEditorProps,
  InlinePreviewTextEditorRangeControl,
  InlinePreviewTextEditorSelectControl,
  InlinePreviewTextEditorSelectionRange,
  InlinePreviewTextEditorTextValueControl,
  InlinePreviewTextEditorTab,
  InlinePreviewTextEditorToggleState,
  InlinePreviewTextEditorToggleControl,
} from './inlinePreviewTextEditorContract'

export const INLINE_PREVIEW_TEXT_HOST_CLASS = 'inline-preview-text-host'
export const INLINE_PREVIEW_TEXT_LINE_INDEX_ATTRIBUTE =
  'data-inline-preview-text-line-index'

type InlineTextCaretFrame = {
  height: number
  left: number
  pathD?: string
  rotationDegrees?: number
  strokeWidth?: number
  top: number
  viewportHeight?: number
  viewportWidth?: number
}

type InlineTextSelectionFrame = {
  height: number
  left: number
  pathD?: string
  rotationDegrees?: number
  strokeWidth?: number
  top: number
  viewportHeight?: number
  viewportWidth?: number
  width: number
}

function normalizeExternalCaretFrame(
  frame: InlinePreviewTextEditorCaretFrame | null,
): InlineTextCaretFrame | null {
  return frame
}

function normalizeExternalSelectionFrames(
  frames: readonly InlinePreviewTextEditorSelectionFrame[],
): InlineTextSelectionFrame[] {
  return frames.map((frame) => ({ ...frame }))
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
const INLINE_TEXT_EDGE_GRAB_OUTER_BAND_PX = 8
const INLINE_TEXT_EDGE_GRAB_INWARD_TOLERANCE_PX = 2
const CONTEXTUAL_TEXT_RIBBON_ROW_SELECTOR =
  '.contextual-text-ribbon-control-row'
const CONTEXTUAL_TEXT_RIBBON_SCROLL_ITEM_SELECTOR =
  '.contextual-text-ribbon-group, .contextual-text-ribbon-command-button'

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

function getContextualTextRibbonScrollItem(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return null

  return target.closest<HTMLElement>(
    CONTEXTUAL_TEXT_RIBBON_SCROLL_ITEM_SELECTOR,
  )
}

function getContextualTextRibbonScrollRow(item: HTMLElement | null) {
  return item?.closest<HTMLElement>(CONTEXTUAL_TEXT_RIBBON_ROW_SELECTOR) ?? null
}

function getContextualTextRibbonAxisRect(element: HTMLElement) {
  const rect = element.getBoundingClientRect()

  return {
    left: rect.left,
    right: rect.right,
  }
}

function getInlineTextSmokeToken(label: string) {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'control'
}

function getInlineTextToggleDisplayLabel(label: string) {
  const token = getInlineTextSmokeToken(label)

  if (token === 'bold') return 'B'
  if (token === 'italic') return 'I'
  if (token === 'underline') return 'U'
  if (token === 'bulleted-list') return '•'

  return label
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

function isPointerInInlineTextEdgeGrabBand({
  clientX,
  clientY,
  host,
  rotationDegrees = 0,
}: {
  clientX: number
  clientY: number
  host: HTMLElement
  rotationDegrees?: number
}) {
  const rect = host.getBoundingClientRect()
  const width = host.offsetWidth || rect.width
  const height = host.offsetHeight || rect.height
  const point = getRotatedLocalTextEdgePoint({
    clientX,
    clientY,
    height,
    rect,
    rotationDegrees,
    width,
  })

  return isPointInTextEdgeGrabBand({
    height,
    inwardTolerancePx: INLINE_TEXT_EDGE_GRAB_INWARD_TOLERANCE_PX,
    outerBandPx: INLINE_TEXT_EDGE_GRAB_OUTER_BAND_PX,
    point,
    width,
  })
}

function renderInlinePreviewTextSelectControl(
  control: InlinePreviewTextEditorSelectControl | undefined,
  selection: InlinePreviewTextEditorSelectionRange,
) {
  if (!control) return null

  const selectionValue = control.getSelectionValue?.(selection)
  const isMixedSelection = selectionValue?.state === 'mixed'
  const value = selectionValue?.state === 'active' && selectionValue.value
    ? selectionValue.value
    : control.value

  return (
    <label className="contextual-text-ribbon-control contextual-text-ribbon-select-control">
      <span className="contextual-text-ribbon-control-label">
        {control.label}
      </span>
      <select
        data-smoke-id={`inline-text-select-${getInlineTextSmokeToken(control.label)}`}
        data-selection-state={selectionValue?.state}
        value={value}
        onChange={(event) =>
          control.onChange(
            event.target.value as typeof control.value,
            selection,
          )}
      >
        {isMixedSelection ? (
          <option value={value}>Mixed</option>
        ) : null}
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
    <label className="contextual-text-ribbon-control contextual-text-ribbon-range-control">
      <span className="contextual-text-ribbon-control-label">
        {control.label}
      </span>
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
  const holdAbortRef = useRef<AbortController | null>(null)
  const holdDirectionRef = useRef<-1 | 1 | null>(null)
  const holdRepeatTicksRef = useRef(0)
  const holdStartTimeRef = useRef<number | null>(null)
  const token = getInlineTextSmokeToken(control.label)
  const optionListId = `inline-text-options-${token}-${id}`
  const selectionValue = control.getSelectionValue?.(selection)
  const displayedValue = selectionValue?.state === 'active' &&
      typeof selectionValue.value === 'number'
    ? selectionValue.value
    : control.value
  const latestValueRef = useRef(displayedValue)
  const stepValueRef = useRef<((direction: -1 | 1) => void) | null>(null)
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
    const holdDirection = holdDirectionRef.current
    const holdStartTime = holdStartTimeRef.current

    if (holdDirection !== null && holdStartTime !== null) {
      const heldMs = Date.now() - holdStartTime
      const expectedRepeatTicks = Math.max(0, Math.floor((heldMs - 180) / 70))
      const missingRepeatTicks =
        expectedRepeatTicks - holdRepeatTicksRef.current

      for (let index = 0; index < missingRepeatTicks; index += 1) {
        stepValueRef.current?.(holdDirection)
      }
    }

    holdDirectionRef.current = null
    holdRepeatTicksRef.current = 0
    holdStartTimeRef.current = null
    holdAbortRef.current?.abort()
    holdAbortRef.current = null
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

  const keepNumberControlVisible = useCallback(() => {
    window.requestAnimationFrame(() => {
      const input = inputRef.current
      const field = input?.closest('.inline-preview-text-number-select-field')
      const menu = input?.closest('[data-smoke-id="inline-text-menu"]')

      if (!(field instanceof HTMLElement) || !(menu instanceof HTMLElement)) {
        return
      }

      const fieldRect = field.getBoundingClientRect()
      const menuRect = menu.getBoundingClientRect()
      const inset = 4

      if (fieldRect.top < menuRect.top + inset) {
        menu.scrollTop -= menuRect.top + inset - fieldRect.top
        return
      }

      if (fieldRect.bottom > menuRect.bottom - inset) {
        menu.scrollTop += fieldRect.bottom - (menuRect.bottom - inset)
      }
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
    keepNumberControlVisible()
  }, [config, control, draft, keepNumberControlVisible, selection])

  const updateDraft = useCallback((nextDraft: string) => {
    setDraft(nextDraft)
    const liveValue = getInlinePreviewPointSizeLiveValue(nextDraft, config)

    if (liveValue !== null && liveValue !== latestValueRef.current) {
      latestValueRef.current = liveValue
      control.onChange(liveValue, selection)
    }
    keepNumberControlVisible()
  }, [config, control, keepNumberControlVisible, selection])

  const selectValue = useCallback((value: number) => {
    latestValueRef.current = value
    control.onChange(value, selection)
    setDraft(formatInlinePreviewPointSizeValue(value))
    setOpen(false)
    focusInput()
    keepNumberControlVisible()
  }, [control, focusInput, keepNumberControlVisible, selection])

  const stepValue = useCallback((direction: -1 | 1) => {
    const currentInputValue = inputRef.current?.value
    const draftValue = currentInputValue === undefined
      ? null
      : parseInlinePreviewPointSizeDraft(currentInputValue)
    const nextValue = stepInlinePreviewPointSizeValue({
      ...config,
      direction,
      value: draftValue ?? latestValueRef.current,
    })

    latestValueRef.current = nextValue
    control.onChange(nextValue, selection)
    setDraft(formatInlinePreviewPointSizeValue(nextValue))
    keepNumberControlVisible()
  }, [config, control, keepNumberControlVisible, selection])

  useEffect(() => {
    stepValueRef.current = stepValue
  }, [stepValue])

  const startStepping = useCallback((direction: -1 | 1) => {
    clearHoldTimers()
    holdDirectionRef.current = direction
    holdRepeatTicksRef.current = 0
    holdStartTimeRef.current = Date.now()
    const abortController = new AbortController()
    holdAbortRef.current = abortController
    document.addEventListener('pointerup', clearHoldTimers, {
      signal: abortController.signal,
    })
    document.addEventListener('mouseup', clearHoldTimers, {
      signal: abortController.signal,
    })
    stepValue(direction)
    holdDelayRef.current = window.setTimeout(() => {
      holdIntervalRef.current = window.setInterval(() => {
        holdRepeatTicksRef.current += 1
        stepValue(direction)
      }, 70)
    }, 180)
  }, [clearHoldTimers, stepValue])

  const handleStepperPointerDown = useCallback((
    event: ReactPointerEvent<HTMLButtonElement>,
    direction: -1 | 1,
  ) => {
    keepInlineTextEditorFocus(event)
    event.currentTarget.setPointerCapture?.(event.pointerId)
    startStepping(direction)
  }, [startStepping])

  const handleStepperPointerEnd = useCallback((
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => {
    event.stopPropagation()
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    clearHoldTimers()
  }, [clearHoldTimers])

  const handleStepperMouseDownFallback = useCallback((
    event: MouseEvent<HTMLButtonElement>,
    direction: -1 | 1,
  ) => {
    event.preventDefault()
    event.stopPropagation()
    if (holdDirectionRef.current === null) {
      startStepping(direction)
    }
  }, [startStepping])

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

  useEffect(() => {
    latestValueRef.current = displayedValue
  }, [displayedValue])

  useEffect(() => clearHoldTimers, [clearHoldTimers])

  return (
    <label className="contextual-text-ribbon-control contextual-text-ribbon-point-size-control inline-preview-text-number-select-field">
      <span className="contextual-text-ribbon-control-label">
        {control.label}
      </span>
      <span className="contextual-text-ribbon-point-size inline-preview-text-number-select">
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
            keepNumberControlVisible()
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
            onLostPointerCapture={handleStepperPointerEnd}
            onMouseDown={(event) => handleStepperMouseDownFallback(event, 1)}
            onPointerCancel={handleStepperPointerEnd}
            onPointerDown={(event) => handleStepperPointerDown(event, 1)}
            onPointerUp={handleStepperPointerEnd}
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
            onLostPointerCapture={handleStepperPointerEnd}
            onMouseDown={(event) => handleStepperMouseDownFallback(event, -1)}
            onPointerCancel={handleStepperPointerEnd}
            onPointerDown={(event) => handleStepperPointerDown(event, -1)}
            onPointerUp={handleStepperPointerEnd}
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
    <label className="contextual-text-ribbon-toggle-check">
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
    <div className="contextual-text-ribbon-source-control">
      <label className="contextual-text-ribbon-toggle-check">
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
      <label className="contextual-text-ribbon-source-field">
        <span className="contextual-text-ribbon-control-label">Source</span>
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

function renderInlinePreviewTextValueControl(
  control: InlinePreviewTextEditorTextValueControl | undefined,
) {
  if (!control) return null

  return (
    <InlinePreviewTextValueTextarea
      control={control}
    />
  )
}

function InlinePreviewTextValueTextarea({
  control,
}: {
  control: InlinePreviewTextEditorTextValueControl
}) {
  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    event.stopPropagation()

    if (!isInlinePreviewTextSelectAllShortcut(event)) {
      return
    }

    event.preventDefault()
    event.currentTarget.select()
  }

  return (
    <label className="contextual-text-ribbon-source-field">
      <span className="contextual-text-ribbon-control-label">
        {control.label}
      </span>
      <textarea
        aria-label={control.label}
        className="inline-preview-text-value-textarea"
        data-smoke-id="inline-text-menu-value"
        value={control.value}
        placeholder={control.placeholder}
        spellCheck={false}
        onChange={(event) => control.onChange(event.target.value)}
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
        'contextual-text-ribbon-icon-button',
        isPressed ? 'is-active' : '',
        resolvedState === 'mixed' ? 'is-mixed' : '',
      ].filter(Boolean).join(' ')}
      aria-label={control.label}
      aria-pressed={resolvedState === 'mixed' ? 'mixed' : isPressed}
      data-smoke-id={`inline-text-toggle-${getInlineTextSmokeToken(control.label)}`}
      title={control.label}
      onClick={(event) => {
        event.stopPropagation()
        const nextSelection = control.onChange(!isPressed, selection)

        if (nextSelection) {
          onSelectionChange(nextSelection)
        }
      }}
      onPointerDown={keepInlineTextEditorFocus}
    >
      {getInlineTextToggleDisplayLabel(control.label)}
    </button>
  )
}

function renderInlinePreviewTextColorControl(
  control: InlinePreviewTextEditorColorControl | undefined,
  selection: InlinePreviewTextEditorSelectionRange,
) {
  if (!control) return null

  return (
    <InlinePreviewTextColorControl
      control={control}
      selection={selection}
    />
  )
}

function getInlineTextSelectionKey(
  selection: InlinePreviewTextEditorSelectionRange,
) {
  return `${selection.start}:${selection.end}`
}

function InlinePreviewTextColorControl({
  control,
  selection,
}: {
  control: InlinePreviewTextEditorColorControl
  selection: InlinePreviewTextEditorSelectionRange
}) {
  const selectionSnapshotRef =
    useRef<InlinePreviewTextEditorSelectionRange>(selection)
  const lastAppliedRef = useRef<string | null>(null)

  const selectionColor = control.getSelectionValue?.(selection)
  const value = selectionColor?.value ?? control.value
  const captureSelection = useCallback(() => {
    selectionSnapshotRef.current = selection
  }, [selection])
  const applyColor = useCallback((nextValue: string) => {
    const selectedRange = selectionSnapshotRef.current ?? selection
    const applyKey = `${nextValue}:${getInlineTextSelectionKey(selectedRange)}`

    if (lastAppliedRef.current === applyKey) {
      return
    }

    lastAppliedRef.current = applyKey
    control.onChange(nextValue, selectedRange)
  }, [control, selection])

  return (
    <label className="contextual-text-ribbon-control contextual-text-ribbon-color-control">
      <span className="contextual-text-ribbon-control-label">
        {control.label}
      </span>
      <input
        data-smoke-id={`inline-text-color-${getInlineTextSmokeToken(control.label)}`}
        type="color"
        value={value}
        data-selection-state={selectionColor?.state}
        onBlur={() => {
          lastAppliedRef.current = null
        }}
        onChange={(event) => applyColor(event.currentTarget.value)}
        onClick={stopInlineTextEditorClick}
        onFocus={captureSelection}
        onInput={(event) => applyColor(event.currentTarget.value)}
        onPointerDownCapture={captureSelection}
        onPointerDown={stopInlineTextEditorPointer}
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
      <div className="contextual-text-ribbon-control-row">
        <span className="contextual-text-ribbon-empty-control">
          No controls available
        </span>
      </div>
    )
  }

  if (activeTab === 'presets') {
    return (
      <div className="contextual-text-ribbon-control-row">
        <div className="contextual-text-ribbon-group contextual-text-ribbon-group--presets">
          {renderInlinePreviewTextSelectControl(controls.presets?.style, selection)}
          {renderInlinePreviewTextSelectControl(controls.presets?.layout, selection)}
        </div>
        {!controls.presets?.style && !controls.presets?.layout ? (
          <span className="contextual-text-ribbon-empty-control">
            Style presets unavailable
          </span>
        ) : null}
        {controls.presets?.onReset ? (
          <button
            type="button"
            className="contextual-text-ribbon-command-button"
            onClick={controls.presets.onReset}
          >
            Reset
          </button>
        ) : null}
      </div>
    )
  }

  if (activeTab === 'text') {
    return (
      <div className="contextual-text-ribbon-control-row">
        {controls.text?.textValue ? (
          <div className="contextual-text-ribbon-group contextual-text-ribbon-group--source">
            {renderInlinePreviewTextValueControl(controls.text.textValue)}
          </div>
        ) : null}
        <div className="contextual-text-ribbon-group contextual-text-ribbon-group--font">
          {renderInlinePreviewTextSelectControl(controls.text?.fontFamily, selection)}
          {renderInlinePreviewTextSizeControl(controls.text?.size, selection)}
        </div>
        {controls.text?.bold ||
        controls.text?.italic ||
        controls.text?.underline ||
        controls.text?.bulletedList ? (
          <div className="contextual-text-ribbon-group contextual-text-ribbon-group--format">
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
        <div className="contextual-text-ribbon-group contextual-text-ribbon-group--paragraph">
          {renderInlinePreviewTextSelectControl(controls.text?.alignment, selection)}
        </div>
      </div>
    )
  }

  if (activeTab === 'art') {
    return (
      <div className="contextual-text-ribbon-control-row">
        <div className="contextual-text-ribbon-group contextual-text-ribbon-group--paint">
          {renderInlinePreviewTextColorControl(controls.art?.color, selection)}
          {renderInlinePreviewTextSelectControl(controls.art?.contrast, selection)}
        </div>
        <div className="contextual-text-ribbon-group contextual-text-ribbon-group--backplate">
          {renderInlinePreviewTextCheckboxControl(controls.art?.backgroundEnabled)}
          {renderInlinePreviewTextColorControl(
            controls.art?.backgroundColor,
            selection,
          )}
          {renderInlinePreviewTextRangeControl(controls.art?.backgroundOpacity)}
          {renderInlinePreviewTextRangeControl(controls.art?.backgroundPadding)}
        </div>
        <div className="contextual-text-ribbon-group contextual-text-ribbon-group--border">
          {renderInlinePreviewTextCheckboxControl(controls.art?.borderEnabled)}
          {renderInlinePreviewTextColorControl(controls.art?.borderColor, selection)}
          {renderInlinePreviewTextRangeControl(controls.art?.borderRadius)}
        </div>
      </div>
    )
  }

  return (
    <div className="contextual-text-ribbon-control-row">
      <div className="contextual-text-ribbon-group contextual-text-ribbon-group--layout">
        {renderInlinePreviewTextCheckboxControl(
          controls.utilities?.respectVisualElements,
        )}
        {renderInlinePreviewTextRangeControl(controls.utilities?.width)}
        {renderInlinePreviewTextRangeControl(controls.utilities?.x)}
        {renderInlinePreviewTextRangeControl(controls.utilities?.y)}
      </div>
      <div className="contextual-text-ribbon-group contextual-text-ribbon-group--curved">
        {renderInlinePreviewTextSelectControl(controls.utilities?.mode, selection)}
        {renderInlinePreviewTextRangeControl(controls.utilities?.lineSpacing)}
        {renderInlinePreviewTextSelectControl(controls.utilities?.arcSide, selection)}
        {renderInlinePreviewTextRangeControl(controls.utilities?.arcDegrees)}
      </div>
      {controls.utilities?.htmlSource ? (
        <div className="contextual-text-ribbon-group contextual-text-ribbon-group--source">
          {renderInlinePreviewHtmlSourceControl({
            control: controls.utilities.htmlSource,
            sourceDraftIdentity,
            sourceInitialValue,
            sourceMode,
            onSourceDraftChange,
            onSourceDraftCommit,
          })}
        </div>
      ) : null}
      {controls.utilities?.resetLayout ? (
        <button
          type="button"
          className="contextual-text-ribbon-command-button"
          onClick={controls.utilities.resetLayout}
        >
          Reset
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
  geometryAdapter,
  geometryLines,
  host,
  lines,
  rotationDegrees,
}: {
  caretValue: string
  clientX: number
  clientY: number
  geometryAdapter?: InlinePreviewTextEditorGeometryAdapter
  geometryLines?: InlinePreviewTextEditorGeometryLine[]
  host: Element
  lines: InlinePreviewTextEditorLine[]
  rotationDegrees?: number
}) {
  if (geometryAdapter) {
    const hostRect = host.getBoundingClientRect()
    const hostSize = getHostLocalSize(host, hostRect)
    const geometryOffset = geometryAdapter.getOffsetForClientPoint({
      clientX,
      clientY,
      hostHeight: hostSize.height,
      hostRect,
      hostWidth: hostSize.width,
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
  geometryAdapter,
  geometryLines,
  host,
  lines,
  selection,
}: {
  caretValue: string
  geometryAdapter?: InlinePreviewTextEditorGeometryAdapter
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

  if (geometryAdapter) {
    const hostSize = getHostLocalSize(host, hostRect)

    return normalizeExternalSelectionFrames(
      geometryAdapter.getSelectionFrames({
        caretValue,
        hostHeight: hostSize.height,
        hostRect,
        hostWidth: hostSize.width,
        lines,
        selection: {
          end: selection.end,
          start: selection.start,
        },
      }),
    )
  }

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
  geometryAdapter,
  geometryLines,
  host,
  lines,
  selectionFocus,
}: {
  caretValue: string
  geometryAdapter?: InlinePreviewTextEditorGeometryAdapter
  geometryLines?: InlinePreviewTextEditorGeometryLine[]
  host: Element
  lines: InlinePreviewTextEditorLine[]
  selectionFocus: number
}): InlineTextCaretFrame | null {
  const hostRect = host.getBoundingClientRect()
  const hostSize = getHostLocalSize(host, hostRect)

  if (geometryAdapter) {
    return normalizeExternalCaretFrame(
      geometryAdapter.getCaretFrame({
        caretValue,
        hostHeight: hostSize.height,
        hostRect,
        hostWidth: hostSize.width,
        lines,
        selectionFocus,
      }),
    )
  }
  const { lineIndex, offset } = getInlinePreviewTextCaretLineOffset({
    caretIndex: selectionFocus,
    caretValue,
    lines,
  })
  const geometryLine = geometryLines?.[lineIndex]

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
  geometryAdapter,
  geometryLines,
  lines,
  rotationDegrees,
  targetKey,
  value,
  textareaStyle,
  sourceMode = false,
  suppressCanvasInput = false,
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
  const moveEdgeRef = useRef<HTMLDivElement | null>(null)
  const [ribbonMenuElement, setRibbonMenuElement] =
    useState<HTMLDivElement | null>(null)
  const activeMoveHandlePointerIdRef = useRef<number | null>(null)
  const activeMoveEdgePointerIdRef = useRef<number | null>(null)
  const controlPointerStartedAtRef = useRef<number | null>(null)
  const controlPointerStartedInsideRef = useRef(false)
  const adapterSelectionAnchorRef = useRef(value.length)
  const adapterSelectionPointerIdRef = useRef<number | null>(null)
  const adapterSelectionCaptureElementRef = useRef<Element | null>(null)
  const pendingSelectionRef =
    useRef<InlinePreviewTextEditorSelectionRange | null>(null)
  const [caretFrame, setCaretFrame] = useState<InlineTextCaretFrame | null>(null)
  const [selection, setSelection] = useState<InlineTextSelectionState>(() =>
    getCollapsedSelectionState(value.length),
  )
  const [selectionFrames, setSelectionFrames] = useState<
    InlineTextSelectionFrame[]
  >([])
  const [activeTab, setActiveTab] =
    useState<InlinePreviewTextEditorTab>('text')
  const [isMoveHandleDragging, setIsMoveHandleDragging] = useState(false)
  const sourceDraftIdentity = sourceMode
    ? `${targetKey}:html-source`
    : `${targetKey}:wysiwyg`

  const updateSourceDraft = useCallback((nextDraft: string) => {
    onValueChange(nextDraft, { sourceMode: true })
  }, [onValueChange])

  const commitSourceDraft = useCallback(() => {
    if (sourceMode) {
      const sourceTextarea =
        menuRef.current?.querySelector<HTMLTextAreaElement>(
          '.inline-preview-text-source-textarea',
        )
      onValueChange(sourceTextarea?.value ?? value, { sourceMode: true })
    }
  }, [onValueChange, sourceMode, value])

  const setRibbonMenuRef = useCallback((element: HTMLDivElement | null) => {
    menuRef.current = element
    setRibbonMenuElement(element)
  }, [])

  const updateRibbonOverflowStates = useCallback(() => {
    const menu = menuRef.current

    if (!menu) return

    const activeElement = document.activeElement
    const rows = menu.querySelectorAll<HTMLElement>(
      CONTEXTUAL_TEXT_RIBBON_ROW_SELECTOR,
    )

    rows.forEach((row) => {
      const rowRect = getContextualTextRibbonAxisRect(row)
      const items = row.querySelectorAll<HTMLElement>(
        CONTEXTUAL_TEXT_RIBBON_SCROLL_ITEM_SELECTOR,
      )

      items.forEach((item) => {
        const itemHasFocus =
          activeElement instanceof Node && item.contains(activeElement)

        if (itemHasFocus) {
          item.dataset.ribbonOverflowState = 'fully-visible'
          return
        }

        item.dataset.ribbonOverflowState =
          getContextualTextRibbonOverflowState({
            itemRect: getContextualTextRibbonAxisRect(item),
            rowRect,
          })
      })
    })
  }, [])

  const scheduleRibbonOverflowStateUpdate = useCallback(() => {
    window.requestAnimationFrame(updateRibbonOverflowStates)
  }, [updateRibbonOverflowStates])

  const revealRibbonScrollItem = useCallback((target: EventTarget | null) => {
    const item = getContextualTextRibbonScrollItem(target)
    const row = getContextualTextRibbonScrollRow(item)

    if (!item || !row) {
      scheduleRibbonOverflowStateUpdate()
      return
    }

    const delta = getContextualTextRibbonScrollDeltaToReveal({
      itemRect: getContextualTextRibbonAxisRect(item),
      rowRect: getContextualTextRibbonAxisRect(row),
    })

    if (delta !== 0) {
      row.scrollLeft += delta
    }

    scheduleRibbonOverflowStateUpdate()
  }, [scheduleRibbonOverflowStateUpdate])

  const handleRibbonControlInteraction = useCallback(
    (event: SyntheticEvent<Element>) => {
      revealRibbonScrollItem(event.target)
    },
    [revealRibbonScrollItem],
  )

  const handleRibbonPointerDown = useCallback(
    (event: ReactPointerEvent<Element>) => {
      revealRibbonScrollItem(event.target)
      stopInlineTextEditorPointer(event)
    },
    [revealRibbonScrollItem],
  )

  useLayoutEffect(() => {
    if (!ribbonMenuElement) {
      return undefined
    }

    let frame: number | null = null
    const schedule = () => {
      if (frame !== null) return

      frame = window.requestAnimationFrame(() => {
        frame = null
        updateRibbonOverflowStates()
      })
    }
    const rows = Array.from(
      ribbonMenuElement.querySelectorAll<HTMLElement>(
        CONTEXTUAL_TEXT_RIBBON_ROW_SELECTOR,
      ),
    )
    const resizeObserver =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(schedule)

    schedule()
    resizeObserver?.observe(ribbonMenuElement)
    rows.forEach((row) => {
      row.addEventListener('scroll', schedule, { passive: true })
      resizeObserver?.observe(row)
      row
        .querySelectorAll<HTMLElement>(
          CONTEXTUAL_TEXT_RIBBON_SCROLL_ITEM_SELECTOR,
        )
        .forEach((item) => resizeObserver?.observe(item))
    })

    return () => {
      rows.forEach((row) => row.removeEventListener('scroll', schedule))
      resizeObserver?.disconnect()

      if (frame !== null) {
        window.cancelAnimationFrame(frame)
      }
    }
  }, [
    activeTab,
    editorControls,
    ribbonMenuElement,
    sourceMode,
    updateRibbonOverflowStates,
    value,
  ])

  const getInlineControlRoots = useCallback(() => {
    const elements: HTMLElement[] = []

    if (tabsRef.current) elements.push(tabsRef.current)
    if (menuRef.current) elements.push(menuRef.current)
    if (moveHandleRef.current) elements.push(moveHandleRef.current)
    if (moveEdgeRef.current) elements.push(moveEdgeRef.current)

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
    if (activeMoveHandlePointerIdRef.current !== null) {
      return
    }
    if (
      controlPointerStartedAtRef.current !== null &&
      Date.now() - controlPointerStartedAtRef.current < 500
    ) {
      return
    }

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
      if (controlPointerStartedInsideRef.current) {
        controlPointerStartedAtRef.current = Date.now()
      }
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
    if (typeof document === 'undefined') {
      return undefined
    }

    const handleDocumentMovePointerMove = (
      event: globalThis.PointerEvent,
    ) => {
      if (activeMoveHandlePointerIdRef.current !== event.pointerId) {
        return
      }
      event.preventDefault()
      event.stopPropagation()
      onMoveHandlePointerMove(event as never)
    }
    const handleDocumentMovePointerEnd = (
      event: globalThis.PointerEvent,
    ) => {
      if (activeMoveHandlePointerIdRef.current !== event.pointerId) {
        return
      }

      activeMoveHandlePointerIdRef.current = null
      activeMoveEdgePointerIdRef.current = null
      setIsMoveHandleDragging(false)
      onMoveHandlePointerUp(event as never)
    }

    document.addEventListener(
      'pointermove',
      handleDocumentMovePointerMove,
      true,
    )
    document.addEventListener('pointerup', handleDocumentMovePointerEnd, true)
    document.addEventListener(
      'pointercancel',
      handleDocumentMovePointerEnd,
      true,
    )

    return () => {
      document.removeEventListener(
        'pointermove',
        handleDocumentMovePointerMove,
        true,
      )
      document.removeEventListener(
        'pointerup',
        handleDocumentMovePointerEnd,
        true,
      )
      document.removeEventListener(
        'pointercancel',
        handleDocumentMovePointerEnd,
        true,
      )
    }
  }, [onMoveHandlePointerMove, onMoveHandlePointerUp])

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

    if (geometryAdapter || geometryLines) {
      setCaretFrame(
        getGeometryCaretFrame({
          caretValue,
          geometryAdapter,
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
              geometryAdapter,
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
            geometryAdapter,
            geometryLines,
            host,
            lines,
            selection,
          })
        : [],
    )
  }, [
    caretValue,
    geometryAdapter,
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
        geometryAdapter,
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
        geometryAdapter,
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

      const captureElement = event.currentTarget instanceof Element
        ? event.currentTarget
        : host
      adapterSelectionCaptureElementRef.current = captureElement

      if (captureElement.setPointerCapture) {
        captureElement.setPointerCapture(event.pointerId)
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

      const captureElement = adapterSelectionCaptureElementRef.current
      if (captureElement?.releasePointerCapture) {
        try {
          captureElement.releasePointerCapture(event.pointerId)
        } catch {
          // Some browsers release capture before pointerup if the pointer leaves.
        }
      }

      adapterSelectionPointerIdRef.current = null
      adapterSelectionCaptureElementRef.current = null
    }

    const interactionElements = Array.from(new Set([
      host,
      ...(geometryAdapter?.getInteractionElements?.() ?? []),
    ]))
    const adapterPointerDownListener = handleAdapterPointerDown as EventListener
    const adapterPointerMoveListener = handleAdapterPointerMove as EventListener
    const adapterPointerUpListener = handleAdapterPointerUp as EventListener

    for (const element of interactionElements) {
      element.addEventListener('pointerdown', adapterPointerDownListener)
      element.addEventListener('pointermove', adapterPointerMoveListener)
      element.addEventListener('pointerup', adapterPointerUpListener)
      element.addEventListener('pointercancel', adapterPointerUpListener)
    }
    document.addEventListener('pointermove', adapterPointerMoveListener)
    document.addEventListener('pointerup', adapterPointerUpListener)
    document.addEventListener('pointercancel', adapterPointerUpListener)

    return () => {
      for (const element of interactionElements) {
        element.removeEventListener('pointerdown', adapterPointerDownListener)
        element.removeEventListener('pointermove', adapterPointerMoveListener)
        element.removeEventListener('pointerup', adapterPointerUpListener)
        element.removeEventListener('pointercancel', adapterPointerUpListener)
      }
      document.removeEventListener('pointermove', adapterPointerMoveListener)
      document.removeEventListener('pointerup', adapterPointerUpListener)
      document.removeEventListener('pointercancel', adapterPointerUpListener)
    }
  }, [
    caretValue,
    geometryAdapter,
    geometryLines,
    inputMode,
    lines,
    rotationDegrees,
    targetKey,
  ])

  const handleMoveEdgePointerRelease = (
    event: ReactPointerEvent<HTMLSpanElement>,
  ) => {
    event.stopPropagation()

    if (activeMoveHandlePointerIdRef.current === event.pointerId) {
      activeMoveHandlePointerIdRef.current = null
      activeMoveEdgePointerIdRef.current = null
      setIsMoveHandleDragging(false)
      onMoveHandlePointerUp(event)
    }
  }
  useEffect(() => {
    const edgeRing = moveEdgeRef.current

    if (!edgeRing) {
      return undefined
    }

    const getHost = () =>
      edgeRing.closest<HTMLElement>(`.${INLINE_PREVIEW_TEXT_HOST_CLASS}`)
    const updateEdgeGrabCursor = (event: globalThis.PointerEvent) => {
      const target = event.target
      const host = getHost()
      const isEdgeHit =
        target instanceof Element &&
        Boolean(target.closest('.inline-preview-text-edge-move-hit')) &&
        host !== null &&
        isPointerInInlineTextEdgeGrabBand({
          clientX: event.clientX,
          clientY: event.clientY,
          host,
          rotationDegrees,
        })

      edgeRing.toggleAttribute('data-edge-grab-active', isEdgeHit)
    }
    const clearEdgeGrabCursor = () => {
      edgeRing.removeAttribute('data-edge-grab-active')
    }
    const handleEdgeRingPointerDown = (
      event: globalThis.PointerEvent,
    ) => {
      const target = event.target
      const isMoveHandle = target instanceof Element &&
        Boolean(target.closest('.inline-preview-text-move-handle'))
      const isEdgeHit = target instanceof Element &&
        Boolean(target.closest('.inline-preview-text-edge-move-hit'))
      const host = getHost()

      if (
        (!isMoveHandle && !isEdgeHit) ||
        !isPrimaryMoveHandlePointer(event)
      ) {
        return
      }
      if (
        isEdgeHit &&
        (!host || !isPointerInInlineTextEdgeGrabBand({
          clientX: event.clientX,
          clientY: event.clientY,
          host,
          rotationDegrees,
        }))
      ) {
        return
      }

      event.preventDefault()
      event.stopPropagation()
      controlPointerStartedInsideRef.current = true
      controlPointerStartedAtRef.current = Date.now()
      activeMoveHandlePointerIdRef.current = event.pointerId
      activeMoveEdgePointerIdRef.current = isEdgeHit ? event.pointerId : null
      setIsMoveHandleDragging(true)
      onMoveHandlePointerDown(event as never)
    }

    edgeRing.addEventListener('pointermove', updateEdgeGrabCursor)
    edgeRing.addEventListener('pointerleave', clearEdgeGrabCursor)
    edgeRing.addEventListener('pointerdown', handleEdgeRingPointerDown)

    return () => {
      edgeRing.removeEventListener('pointermove', updateEdgeGrabCursor)
      edgeRing.removeEventListener('pointerleave', clearEdgeGrabCursor)
      edgeRing.removeEventListener('pointerdown', handleEdgeRingPointerDown)
    }
  }, [onMoveHandlePointerDown, rotationDegrees])
  const deleteAction = editorControls?.deleteAction
  const deleteLabel = deleteAction?.label ?? 'Delete'
  const deleteAriaLabel = deleteAction?.ariaLabel ?? deleteLabel
  const moveHandleControl = (
    <button
      ref={moveHandleRef}
      className={[
        'inline-preview-text-move-handle',
        isMoveHandleDragging ? 'is-dragging' : '',
      ].filter(Boolean).join(' ')}
      data-smoke-id="inline-text-move-handle"
      type="button"
      onClick={stopInlineTextEditorClick}
    >
      Move
    </button>
  )
  const ribbonControls = useMemo(() => (
    <>
      <div
        ref={tabsRef}
        className="contextual-text-ribbon-tabs"
        data-smoke-id="inline-text-tabs"
        onClick={stopInlineTextEditorClick}
        onPointerDown={keepInlineTextEditorFocus}
      >
        {INLINE_TEXT_EDITOR_TABS.map((tab) => (
          <button
            key={tab.id}
            className={[
              'contextual-text-ribbon-tab',
              activeTab === tab.id ? 'is-active' : '',
            ].filter(Boolean).join(' ')}
            data-smoke-id={`inline-text-tab-${tab.id}`}
            title={tab.label}
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              setActiveTab(tab.id)
            }}
          >
            {getContextualTextRibbonTabDisplayLabel(tab.id)}
          </button>
        ))}
      </div>
      <div
        ref={setRibbonMenuRef}
        className="contextual-text-ribbon-controls"
        data-smoke-id="inline-text-menu"
        onClick={stopInlineTextEditorClick}
        onChangeCapture={handleRibbonControlInteraction}
        onFocusCapture={handleRibbonControlInteraction}
        onInputCapture={handleRibbonControlInteraction}
        onPointerDown={handleRibbonPointerDown}
        onWheelCapture={handleRibbonControlInteraction}
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
        <div className="contextual-text-ribbon-actions">
          {deleteAction ? (
            <button
              type="button"
              className="contextual-text-ribbon-action contextual-text-ribbon-action--danger inline-preview-text-delete-button"
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
            className="contextual-text-ribbon-action inline-preview-text-done-button"
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
  ), [
    activeTab,
    applyInlineTextSelectionRange,
    commitSourceDraft,
    deleteAction,
    deleteAriaLabel,
    deleteLabel,
    editorControls,
    handleRibbonControlInteraction,
    handleRibbonPointerDown,
    onDone,
    selection,
    setRibbonMenuRef,
    sourceDraftIdentity,
    sourceMode,
    updateSourceDraft,
    value,
  ])

  useContextualTextRibbonRegistration({
    content: ribbonControls,
    targetKey,
  })

  const hasVisibleSelection =
    inputMode === 'adapter' && selection.start !== selection.end
  const shouldRenderCanvasInput = !sourceMode && !suppressCanvasInput
  const moveEdgeControl = (
    <div
      ref={moveEdgeRef}
      aria-hidden="true"
      className={[
        'inline-preview-text-edge-move-ring',
        isMoveHandleDragging ? 'is-dragging' : '',
      ].filter(Boolean).join(' ')}
      data-smoke-id="inline-text-edge-move-ring"
    >
      {[
        'top',
        'right',
        'bottom',
        'left',
        'top-left',
        'top-right',
        'bottom-right',
        'bottom-left',
      ].map((edge) => (
        <span
          key={edge}
          className={[
            'inline-preview-text-edge-move-hit',
            `inline-preview-text-edge-move-hit--${edge}`,
          ].join(' ')}
          data-smoke-id={`inline-text-edge-move-${edge}`}
          onPointerUp={handleMoveEdgePointerRelease}
          onPointerCancel={handleMoveEdgePointerRelease}
          onLostPointerCapture={handleMoveEdgePointerRelease}
          onClick={stopInlineTextEditorClick}
        />
      ))}
      {moveHandleControl}
    </div>
  )
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
      {shouldRenderCanvasInput ? (
        inputMode === 'adapter' && typeof document !== 'undefined'
          ? createPortal(textareaElement, document.body)
          : textareaElement
      ) : null}
      {moveEdgeControl}
      {shouldRenderCanvasInput ? selectionFrames.map((frame, index) => (
        frame.pathD ? (
          <svg
            key={`${index}-${frame.pathD}`}
            aria-hidden="true"
            className="inline-preview-text-selection inline-preview-text-selection--path"
            data-smoke-id="inline-text-selection-path"
            style={{
              height: frame.viewportHeight ?? frame.height,
              left: 0,
              top: 0,
              width: frame.viewportWidth ?? frame.width,
            }}
            viewBox={`0 0 ${frame.viewportWidth ?? frame.width} ${frame.viewportHeight ?? frame.height}`}
          >
            <path
              className="inline-preview-text-selection-path"
              d={frame.pathD}
              pathLength={1}
              strokeWidth={frame.strokeWidth ?? frame.height}
            />
          </svg>
        ) : (
          <span
            key={`${index}-${frame.left}-${frame.width}`}
            aria-hidden="true"
            className="inline-preview-text-selection"
            style={{
              height: frame.height,
              left: frame.left,
              top: frame.top,
              transform:
                typeof frame.rotationDegrees === 'number'
                  ? `rotate(${frame.rotationDegrees}deg)`
                  : undefined,
              width: frame.width,
            }}
          />
        )
      )) : null}
      {caretFrame && !hasVisibleSelection && shouldRenderCanvasInput ? (
        caretFrame.pathD ? (
          <svg
            aria-hidden="true"
            className="inline-preview-text-caret inline-preview-text-caret--path"
            data-smoke-id="inline-text-caret-path"
            style={{
              height: caretFrame.viewportHeight ?? caretFrame.height,
              left: 0,
              top: 0,
              width: caretFrame.viewportWidth ?? caretFrame.height,
            }}
            viewBox={`0 0 ${caretFrame.viewportWidth ?? caretFrame.height} ${caretFrame.viewportHeight ?? caretFrame.height}`}
          >
            <path
              className="inline-preview-text-caret-path"
              d={caretFrame.pathD}
              strokeWidth={caretFrame.strokeWidth ?? 2}
            />
          </svg>
        ) : (
          <span
            aria-hidden="true"
            className="inline-preview-text-caret"
            style={{
              height: caretFrame.height,
              left: caretFrame.left,
              top: caretFrame.top,
              transform:
                typeof caretFrame.rotationDegrees === 'number'
                  ? `rotate(${caretFrame.rotationDegrees}deg)`
                  : undefined,
            }}
          />
        )
      ) : null}
    </>
  )
}
