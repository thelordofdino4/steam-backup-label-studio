import {
  Children,
  Fragment,
  isValidElement,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import {
  isInlinePreviewTextSelectAllShortcut,
} from './inlinePreviewTextEditorInput'
import {
  getInlinePreviewHtmlSourceDraftStatus,
} from './inlinePreviewTextEditorSource'
import {
  CONTEXTUAL_TEXT_RIBBON_GROUP_WIDTHS,
  type ContextualTextRibbonWidthProfile,
} from './contextualTextRibbonModel'
import type {
  InlinePreviewTextEditorCheckboxControl,
  InlinePreviewTextEditorControls,
  InlinePreviewTextEditorRangeControl,
  InlinePreviewTextEditorSelectControl,
  InlinePreviewTextEditorSelectionRange,
  InlinePreviewTextEditorToggleControl,
  InlinePreviewTextEditorToggleState,
} from './inlinePreviewTextEditorContract'

const CONTEXTUAL_TEXT_RIBBON_FIELD_MIN_CH = 12
export const CONTEXTUAL_TEXT_RIBBON_COMPACT_FIELD_MIN_CH = 9
const CONTEXTUAL_TEXT_RIBBON_FIELD_MAX_CH = 18
const CONTEXTUAL_TEXT_RIBBON_FIELD_LABEL_BREATHING_CH = 2

export type InlinePreviewTextRangeValuePresentation = {
  ariaValueText: (value: number) => string
  inputMax: number
  inputMin: number
  inputStep: number
  inputValue: (value: number) => number
  output: (value: number) => string
  parseInput: (value: number) => number
  title: string
}

export function stopInlineTextEditorClick(event: MouseEvent<Element>) {
  event.stopPropagation()
}

export function keepInlineTextEditorFocus(event: ReactPointerEvent<Element>) {
  event.preventDefault()
  event.stopPropagation()
}

export function stopInlineTextEditorPointer(
  event: ReactPointerEvent<Element>,
) {
  event.stopPropagation()
}

export function getInlineTextSmokeToken(label: string) {
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
  if (token === 'bulleted-list') return renderInlinePreviewTextBulletedListIcon()

  return label
}

function renderInlinePreviewTextBulletedListIcon() {
  return (
    <svg
      aria-hidden="true"
      className="contextual-text-ribbon-list-icon"
      focusable="false"
      viewBox="0 0 24 24"
    >
      <circle cx="5" cy="7" r="1.7" />
      <circle cx="5" cy="12" r="1.7" />
      <circle cx="5" cy="17" r="1.7" />
      <path d="M9 7h10" />
      <path d="M9 12h10" />
      <path d="M9 17h10" />
    </svg>
  )
}

export function isRenderableRibbonNode(node: ReactNode): boolean {
  return Children.toArray(node).some((child) => {
    if (
      child === null ||
      child === undefined ||
      typeof child === 'boolean'
    ) {
      return false
    }

    if (typeof child === 'string') return child.trim().length > 0
    if (typeof child === 'number') return true

    if (
      isValidElement<{ children?: ReactNode }>(child) &&
      child.type === Fragment
    ) {
      return isRenderableRibbonNode(child.props.children)
    }

    return true
  })
}

export function renderContextualTextRibbonGroup({
  children,
  className = '',
  headerControls,
  id,
  label,
  size = CONTEXTUAL_TEXT_RIBBON_GROUP_WIDTHS[id],
}: {
  children: ReactNode
  className?: string
  headerControls?: ReactNode
  id: string
  label: string
  size?: ContextualTextRibbonWidthProfile
}) {
  if (!isRenderableRibbonNode(children) && !isRenderableRibbonNode(headerControls)) {
    return null
  }

  const sizeStyle = size
    ? {
      '--contextual-text-ribbon-group-max-width': `${size.max}px`,
      '--contextual-text-ribbon-group-min-width': `${size.min}px`,
      '--contextual-text-ribbon-group-preferred-width':
        `${size.preferred}px`,
    } as CSSProperties
    : undefined

  return (
    <div
      aria-label={label}
      className={[
        'contextual-text-ribbon-group',
        `contextual-text-ribbon-group--${id}`,
        className,
      ].filter(Boolean).join(' ')}
      data-ribbon-group-grows={size?.grows || undefined}
      data-ribbon-group-fit={size?.fit}
      data-ribbon-group-max-width={size?.max}
      data-ribbon-group-min-width={size?.min}
      data-ribbon-group-preferred-width={size?.preferred}
      data-ribbon-group-row-span={size?.rowSpan}
      data-ribbon-group={id}
      style={sizeStyle}
    >
      <span className="contextual-text-ribbon-group-header">
        <span className="contextual-text-ribbon-group-label">{label}</span>
        {isRenderableRibbonNode(headerControls) ? (
          <span className="contextual-text-ribbon-group-header-controls">
            {headerControls}
          </span>
        ) : null}
      </span>
      <span className="contextual-text-ribbon-group-body">
        {children}
      </span>
    </div>
  )
}

export function renderContextualTextRibbonCardResetButton({
  ariaLabel,
  onClick,
}: {
  ariaLabel: string
  onClick?: () => void
}) {
  if (!onClick) return null

  return (
    <span
      className="contextual-text-ribbon-card-reset-slot"
      data-ribbon-card-reset
    >
      <button
        type="button"
        className="contextual-text-ribbon-command-button contextual-text-ribbon-card-reset-button"
        onClick={onClick}
        aria-label={ariaLabel}
      >
        Reset
      </button>
    </span>
  )
}

export function renderContextualTextRibbonRow({
  children,
  className = '',
  emptyLabel,
}: {
  children: ReactNode
  className?: string
  emptyLabel: string
}) {
  return (
    <div
      className={[
        'contextual-text-ribbon-control-row',
        className,
      ].filter(Boolean).join(' ')}
    >
      {isRenderableRibbonNode(children) ? (
        children
      ) : (
        <span className="contextual-text-ribbon-empty-control">
          {emptyLabel}
        </span>
      )}
    </div>
  )
}

export function renderInlinePreviewTextSelectControl(
  control: InlinePreviewTextEditorSelectControl | undefined,
  selection: InlinePreviewTextEditorSelectionRange,
  displayLabel = control?.label,
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
        {displayLabel}
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

export function getContextualTextRibbonMatchedFieldWidthCh(
  controls: Array<InlinePreviewTextEditorSelectControl | undefined>,
  minCh = CONTEXTUAL_TEXT_RIBBON_FIELD_MIN_CH,
) {
  const widestLabelLength = controls.reduce((maxLength, control) => {
    if (!control) return maxLength

    return Math.max(
      maxLength,
      ...control.options.map((option) => option.label.length),
    )
  }, 0)

  return Math.min(
    CONTEXTUAL_TEXT_RIBBON_FIELD_MAX_CH,
    Math.max(
      minCh,
      widestLabelLength + CONTEXTUAL_TEXT_RIBBON_FIELD_LABEL_BREATHING_CH,
    ),
  )
}

export function getContextualTextRibbonRangeValueWidthCss(
  controls: Array<InlinePreviewTextEditorRangeControl | undefined>,
) {
  const valueLength = (value: number) =>
    Number(value.toFixed(2)).toString().length
  const widestValueLength = controls.reduce((maxLength, control) => {
    if (!control) return maxLength

    return Math.max(
      maxLength,
      valueLength(control.min),
      valueLength(control.max),
      valueLength(control.value),
    )
  }, 0)
  const fieldCh = Math.min(7, Math.max(4, widestValueLength + 1))

  return `calc(${fieldCh}ch + 12px)`
}

export function renderInlinePreviewTextRangeControl(
  control: InlinePreviewTextEditorRangeControl | undefined,
  options: {
    disabled?: boolean
    presentation?: InlinePreviewTextRangeValuePresentation
  } = {},
) {
  if (!control) return null

  const disabled = Boolean(options.disabled)
  const presentation = options.presentation
  const formattedValue = presentation?.output(control.value)
  const displayedInputValue = presentation
    ? presentation.inputValue(control.value)
    : Number(control.value.toFixed(2))
  const handleChange = (value: string) => {
    if (disabled) return
    const parsedValue = Number(value)
    const parsedDomainValue = presentation
      ? presentation.parseInput(parsedValue)
      : parsedValue
    const nextValue = Math.min(
      control.max,
      Math.max(control.min, parsedDomainValue),
    )
    if (Number.isFinite(parsedDomainValue)) {
      control.onChange(nextValue)
    }
  }

  return (
    <label
      className={[
        'contextual-text-ribbon-control contextual-text-ribbon-range-control',
        disabled ? 'is-disabled' : '',
      ].filter(Boolean).join(' ')}
    >
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
        disabled={disabled}
        aria-label={control.label}
        aria-valuetext={presentation?.ariaValueText(control.value)}
        title={presentation?.title}
        onChange={(event) => handleChange(event.target.value)}
      />
      <input
        aria-label={`${control.label}: ${formattedValue ?? displayedInputValue}`}
        className="contextual-text-ribbon-range-value-input"
        data-smoke-id={`inline-text-value-${getInlineTextSmokeToken(control.label)}`}
        type="number"
        min={presentation?.inputMin ?? control.min}
        max={presentation?.inputMax ?? control.max}
        step={presentation?.inputStep ?? control.step}
        value={displayedInputValue}
        disabled={disabled}
        title={presentation?.title}
        onChange={(event) => handleChange(event.target.value)}
      />
      {presentation ? (
        <span
          aria-hidden="true"
          className="contextual-text-ribbon-range-unit"
          title={presentation.title}
        >
          {formattedValue?.replace(String(displayedInputValue), '')}
        </span>
      ) : null}
    </label>
  )
}

function formatInlinePreviewTextCompactNumber(value: number) {
  return Number(value.toFixed(2)).toLocaleString('en-US', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  })
}

export function getInlinePreviewTextOpacityPresentation(): InlinePreviewTextRangeValuePresentation {
  return {
    ariaValueText: (value) => `${Math.round(value * 100)} percent opacity`,
    inputMax: 100,
    inputMin: 0,
    inputStep: 1,
    inputValue: (value) => Math.round(value * 100),
    output: (value) => `${Math.round(value * 100)}%`,
    parseInput: (value) => value / 100,
    title: 'Opacity percentage',
  }
}

export function getInlinePreviewTextCqwPresentation(
  label: string,
): InlinePreviewTextRangeValuePresentation {
  return {
    ariaValueText: (value) =>
      `${formatInlinePreviewTextCompactNumber(value)} container query width units ${label.toLowerCase()}`,
    inputMax: 999,
    inputMin: 0,
    inputStep: 0.1,
    inputValue: (value) => Number(value.toFixed(2)),
    output: (value) => `${formatInlinePreviewTextCompactNumber(value)}cqw`,
    parseInput: (value) => value,
    title: `${label} in renderer cqw units`,
  }
}

export function renderInlinePreviewTextCheckboxControl(
  control: InlinePreviewTextEditorCheckboxControl | undefined,
) {
  if (!control) return null

  return (
    <label
      className={[
        'contextual-text-ribbon-toggle-check',
        control.disabled ? 'is-disabled' : '',
      ].filter(Boolean).join(' ')}
      title={control.disabledReason}
    >
      <input
        data-smoke-id={`inline-text-checkbox-${getInlineTextSmokeToken(control.label)}`}
        type="checkbox"
        aria-disabled={control.disabled || undefined}
        checked={control.checked}
        disabled={control.disabled}
        onChange={(event) => {
          if (!control.disabled) {
            control.onChange(event.target.checked)
          }
        }}
      />
      <span>{control.label}</span>
    </label>
  )
}

function renderInlinePreviewTextFeatureToggleControl({
  ariaLabel,
  control,
}: {
  ariaLabel: string
  control: InlinePreviewTextEditorCheckboxControl | undefined
}) {
  if (!control) return null

  return (
    <label
      className={[
        'contextual-text-ribbon-toggle-check',
        'contextual-text-ribbon-feature-toggle',
        control.disabled ? 'is-disabled' : '',
      ].filter(Boolean).join(' ')}
      title={control.disabledReason}
    >
      <input
        data-smoke-id={`inline-text-checkbox-${getInlineTextSmokeToken(control.label)}`}
        type="checkbox"
        aria-label={ariaLabel}
        aria-disabled={control.disabled || undefined}
        checked={control.checked}
        disabled={control.disabled}
        onChange={(event) => {
          if (!control.disabled) {
            control.onChange(event.target.checked)
          }
        }}
      />
    </label>
  )
}

export function renderInlinePreviewTextMetadataSourceControl(
  control: NonNullable<
    InlinePreviewTextEditorControls['utilities']
  >['metadataSource'],
) {
  if (!control) return null

  return (
    <span
      className={[
        'contextual-text-ribbon-metadata-source',
        `contextual-text-ribbon-metadata-source--${control.status}`,
      ].join(' ')}
      data-smoke-id="inline-text-metadata-source"
    >
      <span className="contextual-text-ribbon-metadata-status">
        {control.statusLabel}
      </span>
      {control.onAction && control.actionLabel ? (
        <button
          type="button"
          className="contextual-text-ribbon-card-reset-button contextual-text-ribbon-metadata-action"
          data-smoke-id="inline-text-use-metadata-source"
          onClick={(event) => {
            event.stopPropagation()
            control.onAction?.()
          }}
          onPointerDown={keepInlineTextEditorFocus}
        >
          {control.actionLabel}
        </button>
      ) : null}
    </span>
  )
}

export function renderInlinePreviewTextArtisticFeatureGroup({
  children,
  id,
  label,
  toggle,
}: {
  children: ReactNode
  id: 'background' | 'border'
  label: string
  toggle: InlinePreviewTextEditorCheckboxControl | undefined
}) {
  if (!toggle && !isRenderableRibbonNode(children)) return null

  return renderContextualTextRibbonGroup({
    id,
    label,
    className:
      `contextual-text-ribbon-group--${id === 'background' ? 'backplate' : 'border'} contextual-text-ribbon-group--artistic-feature contextual-text-ribbon-group--span-rows`,
    headerControls: renderInlinePreviewTextFeatureToggleControl({
      ariaLabel: `Enable ${label.toLowerCase()}`,
      control: toggle,
    }),
    children,
  })
}

function renderInlinePreviewHtmlSourceControl({
  control,
  isCurvedText,
  sourceDraft,
  onSourceDraftChange,
}: {
  control: InlinePreviewTextEditorCheckboxControl | undefined
  isCurvedText: boolean
  sourceDraft: string
  onSourceDraftChange: (value: string) => void
}) {
  if (!control) return null

  const status = getInlinePreviewHtmlSourceDraftStatus(sourceDraft, {
    curvedText: isCurvedText,
  })

  return (
    <div className="contextual-text-ribbon-source-control is-source-mode-active">
      <div className="contextual-text-ribbon-source-status">
        <span>{control.checked ? 'HTML source active' : 'HTML source ready'}</span>
        <span>Preview updates live</span>
        {status.message ? (
          <span className="contextual-text-ribbon-source-validation">
            {status.message}
          </span>
        ) : null}
      </div>
      {renderInlinePreviewHtmlSourceTextarea({
        draft: sourceDraft,
        onDraftChange: onSourceDraftChange,
      })}
    </div>
  )
}

export function renderInlinePreviewHtmlSourcePanel({
  control,
  isCurvedText,
  sourceDraft,
  onSourceDraftChange,
}: {
  control: InlinePreviewTextEditorCheckboxControl | undefined
  isCurvedText: boolean
  sourceDraft: string
  onSourceDraftChange: (value: string) => void
}) {
  if (!control) return null

  const size = CONTEXTUAL_TEXT_RIBBON_GROUP_WIDTHS.source

  return (
    <div
      aria-label="HTML source"
      className="contextual-text-ribbon-html-panel"
      data-ribbon-group="source"
      data-ribbon-group-grows={size.grows || undefined}
      data-ribbon-group-max-width={size.max}
      data-ribbon-group-min-width={size.min}
      data-ribbon-group-preferred-width={size.preferred}
      data-ribbon-group-row-span="2"
      data-ribbon-fill-row="true"
      data-ribbon-html-panel
    >
      {renderInlinePreviewHtmlSourceControl({
        control,
        isCurvedText,
        sourceDraft,
        onSourceDraftChange,
      })}
    </div>
  )
}

function renderInlinePreviewHtmlSourceTextarea({
  draft,
  onDraftChange,
}: {
  draft: string
  onDraftChange: (value: string) => void
}) {
  const handleChange = (nextDraft: string) => {
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
    <label className="contextual-text-ribbon-source-field">
      <span className="contextual-text-ribbon-control-label">Source</span>
      <textarea
        aria-label="HTML source editor"
        className="inline-preview-text-source-textarea"
        data-smoke-id="inline-text-html-source"
        value={draft}
        wrap="off"
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
  )
}

export function renderInlinePreviewTextToggleControl(
  control: InlinePreviewTextEditorToggleControl | undefined,
  selection: InlinePreviewTextEditorSelectionRange,
  getCommandSelection: () => InlinePreviewTextEditorSelectionRange,
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
        const nextSelection = control.onChange(
          !isPressed,
          getCommandSelection(),
        )

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
