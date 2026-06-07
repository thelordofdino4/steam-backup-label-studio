import type { ReactNode } from 'react'
import { useState } from 'react'
import { getTechnicalMarkLayoutSliderRanges } from '../../../layout/discElementSafeZone'
import {
  TECHNICAL_MARK_OPTIONS,
  getEnabledTechnicalMarkValues,
  getProjectTechnicalMarkAsset,
  getTechnicalMarkLabel,
  getTechnicalMarkValuesForRemember,
  getTechnicalMarkValuesForRestore,
} from '../../../project/projectTechnicalMarks'
import type {
  ProjectTechnicalMarkAsset,
  TechnicalMarkSource,
  TechnicalMarkValue,
} from '../../../project/projectTypes'
import { RepeatedVisualElementCard } from '../RepeatedVisualElementCard'
import { formatLogoSize, getNumericInputValue } from './helpers'
import type { BrandingPanelProps } from './types'

type TechnicalMarkSetupControlsProps = Pick<
  BrandingPanelProps,
  | 'projectTechnicalMarks'
  | 'handleTechnicalMarkToggle'
  | 'handleTechnicalMarkUpload'
  | 'handleTechnicalMarkSourceChange'
  | 'handleTechnicalMarkLayoutChange'
  | 'handleTechnicalMarkLabelChange'
  | 'handleClearTechnicalMarkImage'
> & {
  renderLayoutControls?: (
    value: TechnicalMarkValue,
    label: string,
    asset: ProjectTechnicalMarkAsset,
  ) => ReactNode
  idPrefix?: string
}

export function TechnicalMarkSetupControls({
  projectTechnicalMarks,
  handleTechnicalMarkToggle,
  handleTechnicalMarkUpload,
  handleTechnicalMarkSourceChange,
  handleTechnicalMarkLayoutChange,
  handleTechnicalMarkLabelChange,
  handleClearTechnicalMarkImage,
  renderLayoutControls,
  idPrefix,
}: TechnicalMarkSetupControlsProps) {
  const fieldId = (id: string) => idPrefix ? `${idPrefix}-${id}` : id
  const [rememberedValues, setRememberedValues] = useState<TechnicalMarkValue[]>([])
  const enabledValues = getEnabledTechnicalMarkValues(projectTechnicalMarks)
  const isEnabled = enabledValues.length > 0
  const currentLabel = projectTechnicalMarks.values.length > 0 ? projectTechnicalMarks.values.map(getTechnicalMarkLabel).join(', ') : 'None selected'

  const toggleEnabled = (enabled: boolean) => {
    if (enabled) {
      const valuesToRestore = getTechnicalMarkValuesForRestore(projectTechnicalMarks, rememberedValues)
      valuesToRestore.forEach((value) => projectTechnicalMarks.values.includes(value) ? handleTechnicalMarkLayoutChange(value, 'enabled', true) : handleTechnicalMarkToggle(value, true))
      return
    }
    setRememberedValues(getTechnicalMarkValuesForRemember(projectTechnicalMarks))
    projectTechnicalMarks.values.forEach((value) => handleTechnicalMarkLayoutChange(value, 'enabled', false))
  }

  return (
    <div>
      <label className="field-label"><input type="checkbox" checked={isEnabled} onChange={(event) => toggleEnabled(event.target.checked)} /> Show technical marks</label>
      {!isEnabled ? null : (
        <>
          <div className="platform-mark-selection-group spacing-top">
            <span className="field-label">Technical mark types</span>
            <div className="disc-mark-checkbox-list">
              {TECHNICAL_MARK_OPTIONS.map((option) => (
                <label key={option.value} className="field-label"><input type="checkbox" checked={projectTechnicalMarks.values.includes(option.value)} onChange={(event) => handleTechnicalMarkToggle(option.value, event.target.checked)} /> {option.label}</label>
              ))}
            </div>
          </div>
          <p className="hint">Current technical marks: {currentLabel}. Each selected technical mark has its own image and layout.</p>
          {projectTechnicalMarks.values.map((value) => {
            const asset = getProjectTechnicalMarkAsset(projectTechnicalMarks, value)
            const label = getTechnicalMarkLabel(value)
            const uploadId = fieldId(`technical-mark-upload-${value}`)
            const isCustomTechnicalMarkSource = asset.source === 'custom'
            const summary = [
              asset.layout.enabled ? 'shown' : 'hidden',
              isCustomTechnicalMarkSource && asset.customImageDataUrl
                ? 'custom image'
                : 'bundled generic',
              `scale ${asset.layout.scale.toFixed(2)}`,
            ].join(' · ')
            return (
              <RepeatedVisualElementCard
                key={value}
                title={`${label} technical mark`}
                label={asset.label}
                labelInputId={fieldId(`technical-mark-label-${value}`)}
                enabled={asset.layout.enabled}
                enableLabel={`Show ${label.toLowerCase()} technical mark`}
                summary={summary}
                deleteLabel={`Remove ${label.toLowerCase()} technical mark`}
                onEnabledChange={(enabled) =>
                  handleTechnicalMarkLayoutChange(value, 'enabled', enabled)}
                onLabelChange={(nextLabel) =>
                  handleTechnicalMarkLabelChange(value, nextLabel)}
                onDelete={() => handleTechnicalMarkToggle(value, false)}
              >
                <label className="field-label spacing-top" htmlFor={fieldId(`technical-mark-source-${value}`)}>Mark source</label>
                <select id={fieldId(`technical-mark-source-${value}`)} value={asset.source} onChange={(event) => handleTechnicalMarkSourceChange(value, event.target.value as TechnicalMarkSource)}>
                  <option value="placeholder">Built-in generic</option>
                  <option value="custom">Custom image</option>
                </select>
                {isCustomTechnicalMarkSource ? (
                  <>
                    <span className="field-label spacing-top">Custom technical image</span>
                    <label className="secondary-button logo-upload-button" htmlFor={uploadId}>Choose custom {label}</label>
                    <input id={uploadId} className="logo-file-input" type="file" accept="image/*" onChange={(event) => handleTechnicalMarkUpload(value, event)} />
                    {asset.customImageDataUrl ? (
                      <div className="selected-lockup-card logo-asset-status-card">
                        <img className="logo-asset-preview" src={asset.customImageDataUrl} alt="" draggable={false} />
                        <span>Custom {label} mark active{formatLogoSize(asset.customImageSize)}</span>
                      </div>
                    ) : <p className="hint">No custom {label.toLowerCase()} technical image is selected yet. The bundled generic technical mark remains visible until you upload an image.</p>}
                  </>
                ) : <p className="hint">Using a bundled generic mark.</p>}
                {renderLayoutControls?.(value, label, asset)}
                {isCustomTechnicalMarkSource && asset.customImageDataUrl && <button className="secondary-button" type="button" onClick={() => handleClearTechnicalMarkImage(value)}>Clear custom {label}</button>}
              </RepeatedVisualElementCard>
            )
          })}
        </>
      )}
    </div>
  )
}

export function TechnicalMarkControls({
  projectTechnicalMarks,
  selectedDiscTemplate,
  handleTechnicalMarkLayoutChange,
  handleResetTechnicalMarkLayout,
  ...props
}: Pick<
  BrandingPanelProps,
  | 'projectTechnicalMarks'
  | 'selectedDiscTemplate'
  | 'handleTechnicalMarkToggle'
  | 'handleTechnicalMarkUpload'
  | 'handleTechnicalMarkSourceChange'
  | 'handleTechnicalMarkLayoutChange'
  | 'handleTechnicalMarkLabelChange'
  | 'handleClearTechnicalMarkImage'
  | 'handleResetTechnicalMarkLayout'
>) {
  return (
    <TechnicalMarkSetupControls
      {...props}
      projectTechnicalMarks={projectTechnicalMarks}
      handleTechnicalMarkLayoutChange={handleTechnicalMarkLayoutChange}
      renderLayoutControls={(value, label, asset) => {
        const sliderRanges = getTechnicalMarkLayoutSliderRanges(
          asset,
          selectedDiscTemplate,
        )

        return (
          <>
            <label className="field-label spacing-top" htmlFor={`technical-mark-scale-${value}`}>Scale</label>
            <input id={`technical-mark-scale-${value}`} type="range" min="0.25" max="2" step="0.01" value={asset.layout.scale} onInput={(event) => handleTechnicalMarkLayoutChange(value, 'scale', getNumericInputValue(event))} onChange={(event) => handleTechnicalMarkLayoutChange(value, 'scale', getNumericInputValue(event))} />
            <label className="field-label spacing-top" htmlFor={`technical-mark-x-${value}`}>X position</label>
            <input id={`technical-mark-x-${value}`} type="range" min={sliderRanges.x.min} max={sliderRanges.x.max} step="0.1" value={asset.layout.x} onInput={(event) => handleTechnicalMarkLayoutChange(value, 'x', getNumericInputValue(event))} onChange={(event) => handleTechnicalMarkLayoutChange(value, 'x', getNumericInputValue(event))} />
            <label className="field-label spacing-top" htmlFor={`technical-mark-y-${value}`}>Y position</label>
            <input id={`technical-mark-y-${value}`} type="range" min={sliderRanges.y.min} max={sliderRanges.y.max} step="0.1" value={asset.layout.y} onInput={(event) => handleTechnicalMarkLayoutChange(value, 'y', getNumericInputValue(event))} onChange={(event) => handleTechnicalMarkLayoutChange(value, 'y', getNumericInputValue(event))} />
            <button className="secondary-button" type="button" onClick={() => handleResetTechnicalMarkLayout(value)}>Reset {label} layout</button>
          </>
        )
      }}
    />
  )
}
