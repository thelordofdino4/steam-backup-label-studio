import { useMemo, useState, type CSSProperties } from 'react'
import type {
  ContextualTextControlGroupId,
} from '../../text/contextualTextControlViewModel'
import type {
  InlinePreviewTextEditorCheckboxControl,
  InlinePreviewTextEditorColorControl,
  InlinePreviewTextEditorControls,
  InlinePreviewTextEditorNumberSelectControl,
  InlinePreviewTextEditorRangeControl,
  InlinePreviewTextEditorSelectControl,
  InlinePreviewTextEditorTextValueControl,
  InlinePreviewTextEditorToggleControl,
} from './inlinePreviewTextEditorContract'
import {
  CONTEXTUAL_TEXT_RIBBON_RESERVED_HEIGHT,
  CONTEXTUAL_TEXT_RIBBON_TABS,
  getContextualTextRibbonControlDescriptors,
} from './contextualTextRibbonModel'

export type ContextualTextRibbonHostProps = {
  active?: boolean
  controls?: InlinePreviewTextEditorControls
  label?: string
}

function RibbonSelectControl({
  control,
  id,
}: {
  control: InlinePreviewTextEditorSelectControl
  id: string
}) {
  return (
    <label className="contextual-text-ribbon-field">
      <span>{control.label}</span>
      <select
        aria-label={control.label}
        data-ribbon-control={id}
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

function RibbonRangeControl({
  control,
  id,
}: {
  control: InlinePreviewTextEditorRangeControl
  id: string
}) {
  return (
    <label className="contextual-text-ribbon-field contextual-text-ribbon-range">
      <span>{control.label}</span>
      <input
        aria-label={control.label}
        data-ribbon-control={id}
        max={control.max}
        min={control.min}
        step={control.step}
        type="range"
        value={control.value}
        onChange={(event) => control.onChange(Number(event.target.value))}
      />
      <output>{control.value}</output>
    </label>
  )
}

function RibbonNumberControl({
  control,
  id,
}: {
  control: InlinePreviewTextEditorNumberSelectControl
  id: string
}) {
  return (
    <label className="contextual-text-ribbon-field contextual-text-ribbon-number">
      <span>{control.label}</span>
      <input
        aria-label={control.label}
        data-ribbon-control={id}
        max={control.max}
        min={control.min}
        step={control.step}
        type="number"
        value={control.value}
        onChange={(event) => control.onChange(Number(event.target.value))}
      />
    </label>
  )
}

function RibbonCheckboxControl({
  control,
  id,
}: {
  control: InlinePreviewTextEditorCheckboxControl
  id: string
}) {
  return (
    <label className="contextual-text-ribbon-check">
      <input
        checked={control.checked}
        data-ribbon-control={id}
        type="checkbox"
        onChange={(event) => control.onChange(event.target.checked)}
      />
      <span>{control.label}</span>
    </label>
  )
}

function RibbonColorControl({
  control,
  id,
}: {
  control: InlinePreviewTextEditorColorControl
  id: string
}) {
  return (
    <label className="contextual-text-ribbon-field">
      <span>{control.label}</span>
      <input
        aria-label={control.label}
        data-ribbon-control={id}
        type="color"
        value={control.value}
        onChange={(event) => control.onChange(event.target.value)}
      />
    </label>
  )
}

function RibbonToggleControl({
  control,
  id,
}: {
  control: InlinePreviewTextEditorToggleControl
  id: string
}) {
  return (
    <button
      aria-pressed={control.pressed}
      className={[
        'contextual-text-ribbon-button',
        control.pressed ? 'is-active' : '',
      ].filter(Boolean).join(' ')}
      data-ribbon-control={id}
      type="button"
      onClick={() => control.onChange(!control.pressed)}
    >
      {control.label}
    </button>
  )
}

function RibbonTextValueControl({
  control,
  id,
}: {
  control: InlinePreviewTextEditorTextValueControl
  id: string
}) {
  return (
    <label className="contextual-text-ribbon-field contextual-text-ribbon-text">
      <span>{control.label}</span>
      <textarea
        aria-label={control.label}
        data-ribbon-control={id}
        placeholder={control.placeholder}
        value={control.value}
        onChange={(event) => control.onChange(event.target.value)}
      />
    </label>
  )
}

function RibbonAction({
  label,
  onClick,
  tone = 'neutral',
}: {
  label: string
  onClick: () => void
  tone?: 'danger' | 'neutral'
}) {
  return (
    <button
      className={[
        'contextual-text-ribbon-button',
        tone === 'danger' ? 'is-danger' : '',
      ].filter(Boolean).join(' ')}
      type="button"
      onClick={onClick}
    >
      {label}
    </button>
  )
}

function renderRibbonControls({
  activeTab,
  controls,
}: {
  activeTab: ContextualTextControlGroupId
  controls: InlinePreviewTextEditorControls
}) {
  if (activeTab === 'presets') {
    return (
      <>
        {controls.presets?.style ? (
          <RibbonSelectControl
            control={controls.presets.style}
            id="stylePreset"
          />
        ) : null}
        {controls.presets?.layout ? (
          <RibbonSelectControl
            control={controls.presets.layout}
            id="layoutPreset"
          />
        ) : null}
        {controls.presets?.onReset ? (
          <RibbonAction label="Reset presets" onClick={controls.presets.onReset} />
        ) : null}
      </>
    )
  }

  if (activeTab === 'text') {
    return (
      <>
        {controls.text?.textValue ? (
          <RibbonTextValueControl
            control={controls.text.textValue}
            id="textValue"
          />
        ) : null}
        {controls.text?.fontFamily ? (
          <RibbonSelectControl
            control={controls.text.fontFamily}
            id="fontFamily"
          />
        ) : null}
        {controls.text?.size ? (
          'options' in controls.text.size ? (
            <RibbonNumberControl control={controls.text.size} id="size" />
          ) : (
            <RibbonRangeControl control={controls.text.size} id="size" />
          )
        ) : null}
        {controls.text?.bold ? (
          <RibbonToggleControl control={controls.text.bold} id="bold" />
        ) : null}
        {controls.text?.italic ? (
          <RibbonToggleControl control={controls.text.italic} id="italic" />
        ) : null}
        {controls.text?.underline ? (
          <RibbonToggleControl
            control={controls.text.underline}
            id="underline"
          />
        ) : null}
        {controls.text?.bulletedList ? (
          <RibbonToggleControl
            control={controls.text.bulletedList}
            id="bulletedList"
          />
        ) : null}
        {controls.text?.alignment ? (
          <RibbonSelectControl
            control={controls.text.alignment}
            id="alignment"
          />
        ) : null}
      </>
    )
  }

  if (activeTab === 'art') {
    return (
      <>
        {controls.art?.color ? (
          <RibbonColorControl control={controls.art.color} id="color" />
        ) : null}
        {controls.art?.contrast ? (
          <RibbonSelectControl control={controls.art.contrast} id="contrast" />
        ) : null}
        {controls.art?.backgroundEnabled ? (
          <RibbonCheckboxControl
            control={controls.art.backgroundEnabled}
            id="backgroundEnabled"
          />
        ) : null}
        {controls.art?.backgroundColor ? (
          <RibbonColorControl
            control={controls.art.backgroundColor}
            id="backgroundColor"
          />
        ) : null}
        {controls.art?.backgroundOpacity ? (
          <RibbonRangeControl
            control={controls.art.backgroundOpacity}
            id="backgroundOpacity"
          />
        ) : null}
        {controls.art?.backgroundPadding ? (
          <RibbonRangeControl
            control={controls.art.backgroundPadding}
            id="backgroundPadding"
          />
        ) : null}
        {controls.art?.borderEnabled ? (
          <RibbonCheckboxControl
            control={controls.art.borderEnabled}
            id="borderEnabled"
          />
        ) : null}
        {controls.art?.borderColor ? (
          <RibbonColorControl
            control={controls.art.borderColor}
            id="borderColor"
          />
        ) : null}
        {controls.art?.borderRadius ? (
          <RibbonRangeControl
            control={controls.art.borderRadius}
            id="borderRadius"
          />
        ) : null}
      </>
    )
  }

  return (
    <>
      {controls.utilities?.respectVisualElements ? (
        <RibbonCheckboxControl
          control={controls.utilities.respectVisualElements}
          id="respectVisualElements"
        />
      ) : null}
      {controls.utilities?.width ? (
        <RibbonRangeControl control={controls.utilities.width} id="width" />
      ) : null}
      {controls.utilities?.x ? (
        <RibbonRangeControl control={controls.utilities.x} id="x" />
      ) : null}
      {controls.utilities?.y ? (
        <RibbonRangeControl control={controls.utilities.y} id="y" />
      ) : null}
      {controls.utilities?.lineSpacing ? (
        <RibbonRangeControl
          control={controls.utilities.lineSpacing}
          id="lineSpacing"
        />
      ) : null}
      {controls.utilities?.arcSide ? (
        <RibbonSelectControl
          control={controls.utilities.arcSide}
          id="arcSide"
        />
      ) : null}
      {controls.utilities?.arcDegrees ? (
        <RibbonRangeControl
          control={controls.utilities.arcDegrees}
          id="arcDegrees"
        />
      ) : null}
      {controls.utilities?.mode ? (
        <RibbonSelectControl control={controls.utilities.mode} id="mode" />
      ) : null}
      {controls.utilities?.htmlSource ? (
        <RibbonCheckboxControl
          control={controls.utilities.htmlSource}
          id="htmlSource"
        />
      ) : null}
      {controls.utilities?.resetLayout ? (
        <RibbonAction
          label="Reset layout"
          onClick={controls.utilities.resetLayout}
        />
      ) : null}
    </>
  )
}

export function ContextualTextRibbonTabStrip({
  activeTab,
  onActiveTabChange,
}: {
  activeTab: ContextualTextControlGroupId
  onActiveTabChange: (tab: ContextualTextControlGroupId) => void
}) {
  return (
    <div className="contextual-text-ribbon-tabs" role="tablist">
      {CONTEXTUAL_TEXT_RIBBON_TABS.map((tab) => (
        <button
          aria-selected={activeTab === tab.id}
          className={[
            'contextual-text-ribbon-tab',
            activeTab === tab.id ? 'is-active' : '',
          ].filter(Boolean).join(' ')}
          data-smoke-id={`contextual-text-ribbon-tab-${tab.id}`}
          key={tab.id}
          role="tab"
          type="button"
          onClick={() => onActiveTabChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

export function ContextualTextRibbonControlGroups({
  activeTab,
  controls,
}: {
  activeTab: ContextualTextControlGroupId
  controls: InlinePreviewTextEditorControls
}) {
  return (
    <div className="contextual-text-ribbon-controls">
      {renderRibbonControls({ activeTab, controls })}
    </div>
  )
}

export function ContextualTextRibbonActions({
  controls,
}: {
  controls?: InlinePreviewTextEditorControls
}) {
  return (
    <div className="contextual-text-ribbon-actions">
      {controls?.deleteAction ? (
        <RibbonAction
          label={controls.deleteAction.label ?? 'Delete'}
          onClick={controls.deleteAction.onDelete}
          tone="danger"
        />
      ) : null}
      <RibbonAction label="Done" onClick={() => undefined} />
    </div>
  )
}

export function ContextualTextRibbonHost({
  active = false,
  controls,
  label = 'Contextual text controls',
}: ContextualTextRibbonHostProps) {
  const [activeTab, setActiveTab] =
    useState<ContextualTextControlGroupId>('presets')
  const descriptors = useMemo(
    () => getContextualTextRibbonControlDescriptors(controls),
    [controls],
  )
  const hasControls = descriptors.length > 0
  const isVisible = active && hasControls

  return (
    <section
      aria-hidden={!isVisible}
      aria-label={label}
      className={[
        'contextual-text-ribbon-host',
        active ? 'is-active' : '',
        isVisible ? 'has-controls' : '',
      ].filter(Boolean).join(' ')}
      data-contextual-text-ribbon-active={active}
      data-contextual-text-ribbon-visible={isVisible}
      data-smoke-id="contextual-text-ribbon-host"
      style={{
        '--contextual-text-ribbon-reserved-height':
          `${CONTEXTUAL_TEXT_RIBBON_RESERVED_HEIGHT}px`,
      } as CSSProperties}
    >
      <div className="contextual-text-ribbon-shell">
        <ContextualTextRibbonTabStrip
          activeTab={activeTab}
          onActiveTabChange={setActiveTab}
        />
        {controls ? (
          <ContextualTextRibbonControlGroups
            activeTab={activeTab}
            controls={controls}
          />
        ) : (
          <div className="contextual-text-ribbon-controls" />
        )}
        <ContextualTextRibbonActions controls={controls} />
      </div>
    </section>
  )
}
