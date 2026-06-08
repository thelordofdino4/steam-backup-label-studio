import {
  CASE_INSERT_TEXT_CONTRAST_OPTIONS,
  CASE_INSERT_TEXT_FONT_OPTIONS,
  CASE_INSERT_TEXT_STYLE_PRESETS,
  getCaseInsertTextSourceLabel,
  type CaseInsertTextContrastMode,
  type CaseInsertTextFontFamily,
  type CaseInsertTextStyle,
  type CaseInsertTextStyleField,
  type CaseInsertTextStyleValue,
} from '../../caseInsert/textStyles'
import type {
  ProjectCaseInsertTextSource,
} from '../../project/projectTypes'

export type CaseInsertTextStyleControlsProps = {
  idPrefix: string
  label: string
  style: CaseInsertTextStyle
  source?: ProjectCaseInsertTextSource
  avoidVisualElements?: boolean
  onStyleChange: (
    field: CaseInsertTextStyleField,
    value: CaseInsertTextStyleValue,
  ) => void
  onAvoidVisualElementsChange?: (avoidVisualElements: boolean) => void
  onApplyStylePreset: (presetId: string) => void
}

export function CaseInsertTextOptionalStyleControls({
  idPrefix,
  label,
  style,
  avoidVisualElements,
  onAvoidVisualElementsChange,
  onStyleChange,
}: Omit<CaseInsertTextStyleControlsProps, 'onApplyStylePreset' | 'source'>) {
  return (
    <div
      className="disc-text-control-group disc-text-optional-checkboxes"
      aria-label={`${label} optional controls`}
    >
      {onAvoidVisualElementsChange ? (
        <label className="checkbox-row">
          <input
            id={`${idPrefix}-avoid-visual-elements`}
            type="checkbox"
            checked={Boolean(avoidVisualElements)}
            onChange={(event) =>
              onAvoidVisualElementsChange(event.target.checked)}
          />
          <span>Respect visual elements</span>
        </label>
      ) : null}

      <label className="checkbox-row">
        <input
          id={`${idPrefix}-background-enabled`}
          type="checkbox"
          checked={style.backgroundEnabled}
          onChange={(event) =>
            onStyleChange('backgroundEnabled', event.target.checked)}
        />
        <span>Block background</span>
      </label>

      {style.backgroundEnabled ? (
        <label className="checkbox-row disc-text-nested-checkbox">
          <input
            id={`${idPrefix}-border-enabled`}
            type="checkbox"
            checked={style.borderEnabled}
            onChange={(event) =>
              onStyleChange('borderEnabled', event.target.checked)}
          />
          <span>Border</span>
        </label>
      ) : null}
    </div>
  )
}

export function CaseInsertTextSourceControls({
  label,
  source,
  isMetadataBacked = false,
  isManualOverride = false,
  onUseMetadataValue,
}: Pick<CaseInsertTextStyleControlsProps, 'label' | 'source'> & {
  isMetadataBacked?: boolean
  isManualOverride?: boolean
  onUseMetadataValue?: () => void
}) {
  if (!source || !isMetadataBacked) {
    return null
  }

  const sourceLabel = isManualOverride
    ? source === 'steam'
      ? getCaseInsertTextSourceLabel(source)
      : 'Manual override'
    : getCaseInsertTextSourceLabel('metadata')

  return (
    <div
      className="disc-text-control-group"
      aria-label={`${label} source controls`}
    >
      <div className="disc-text-source-row">
        <span>{sourceLabel}</span>
        {isManualOverride && onUseMetadataValue ? (
          <button
            className="secondary-button disc-text-source-button"
            type="button"
            onClick={onUseMetadataValue}
          >
            Use Game metadata value
          </button>
        ) : null}
      </div>
    </div>
  )
}

export function CaseInsertTextStyleControls({
  idPrefix,
  label,
  style,
  onApplyStylePreset,
  onStyleChange,
}: CaseInsertTextStyleControlsProps) {
  return (
    <div
      className="disc-text-control-group"
      aria-label={`${label} type and style controls`}
    >
      <div className="disc-text-style-grid">
        <label>
          <span>Style preset</span>
          <select
            id={`${idPrefix}-style-preset`}
            defaultValue=""
            onChange={(event) => {
              if (event.target.value) {
                onApplyStylePreset(event.target.value)
              }
              event.currentTarget.value = ''
            }}
          >
            <option value="">Choose preset...</option>
            {CASE_INSERT_TEXT_STYLE_PRESETS.map((preset) => (
              <option key={preset.id} value={preset.id}>{preset.label}</option>
            ))}
          </select>
        </label>

        <label>
          <span>Font</span>
          <select
            id={`${idPrefix}-font-family`}
            value={style.fontFamily}
            onChange={(event) =>
              onStyleChange(
                'fontFamily',
                event.target.value as CaseInsertTextFontFamily,
              )}
          >
            {CASE_INSERT_TEXT_FONT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>

        <label>
          <span>Color</span>
          <input
            id={`${idPrefix}-text-color`}
            type="color"
            value={style.color}
            onChange={(event) => onStyleChange('color', event.target.value)}
          />
        </label>

        <label>
          <span>Contrast</span>
          <select
            id={`${idPrefix}-contrast`}
            value={style.contrast}
            onChange={(event) =>
              onStyleChange(
                'contrast',
                event.target.value as CaseInsertTextContrastMode,
              )}
          >
            {CASE_INSERT_TEXT_CONTRAST_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>

        {style.backgroundEnabled ? (
          <label>
            <span>Fill</span>
            <input
              id={`${idPrefix}-background-color`}
              type="color"
              value={style.backgroundColor}
              onChange={(event) =>
                onStyleChange('backgroundColor', event.target.value)}
            />
          </label>
        ) : null}

        {style.backgroundEnabled && style.borderEnabled ? (
          <label>
            <span>Line</span>
            <input
              id={`${idPrefix}-border-color`}
              type="color"
              value={style.borderColor}
              onChange={(event) =>
                onStyleChange('borderColor', event.target.value)}
            />
          </label>
        ) : null}
      </div>
    </div>
  )
}

export function CaseInsertTextBackgroundFineTuneControls({
  idPrefix,
  style,
  onStyleChange,
}: Pick<
  CaseInsertTextStyleControlsProps,
  'idPrefix' | 'style' | 'onStyleChange'
>) {
  if (!style.backgroundEnabled) {
    return null
  }

  return (
    <>
      <label>
        <span>Opacity</span>
        <input
          id={`${idPrefix}-background-opacity`}
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={style.backgroundOpacity}
          onChange={(event) =>
            onStyleChange('backgroundOpacity', Number(event.target.value))}
        />
      </label>

      <label>
        <span>Padding</span>
        <input
          id={`${idPrefix}-background-padding`}
          type="range"
          min="0"
          max="4"
          step="0.1"
          value={style.backgroundPadding}
          onChange={(event) =>
            onStyleChange('backgroundPadding', Number(event.target.value))}
        />
      </label>

      {style.borderEnabled ? (
        <label>
          <span>Radius</span>
          <input
            id={`${idPrefix}-border-radius`}
            type="range"
            min="0"
            max="4"
            step="0.1"
            value={style.borderRadius}
            onChange={(event) =>
              onStyleChange('borderRadius', Number(event.target.value))}
          />
        </label>
      ) : null}
    </>
  )
}
