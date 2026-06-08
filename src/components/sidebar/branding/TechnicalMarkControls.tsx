import type { ReactNode } from 'react'
import { useState } from 'react'
import { getTechnicalMarkLayoutSliderRanges } from '../../../layout/discElementSafeZone'
import {
  TECHNICAL_MARK_OPTIONS,
  getEnabledTechnicalMarkValues,
  getProjectTechnicalMarkAssetEntries,
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
import { PlusIcon } from '../PanelIcons'
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
  | 'handleAddTechnicalMarkAsset'
  | 'handleRemoveTechnicalMarkAsset'
> & {
  renderLayoutControls?: (
    value: TechnicalMarkValue,
    label: string,
    asset: ProjectTechnicalMarkAsset,
    assetId?: string | null,
  ) => ReactNode
  idPrefix?: string
}

function AddTechnicalMarkAssetButton({
  label,
  onClick,
}: {
  label: string
  onClick: () => void
}) {
  return (
    <button
      className="secondary-button icon-text-button spacing-top"
      type="button"
      onClick={onClick}
    >
      <PlusIcon />
      <span>Add another {label.toLowerCase()} technical mark</span>
    </button>
  )
}

export function TechnicalMarkSetupControls({
  projectTechnicalMarks,
  handleTechnicalMarkToggle,
  handleTechnicalMarkUpload,
  handleTechnicalMarkSourceChange,
  handleTechnicalMarkLayoutChange,
  handleTechnicalMarkLabelChange,
  handleClearTechnicalMarkImage,
  handleAddTechnicalMarkAsset,
  handleRemoveTechnicalMarkAsset,
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
          {projectTechnicalMarks.values.flatMap((value) => {
            const label = getTechnicalMarkLabel(value)
            const entries = getProjectTechnicalMarkAssetEntries(
              projectTechnicalMarks,
              value,
            )

            return entries.map((entry, entryIndex) => {
            const { asset, assetId } = entry
            const elementId = assetId ?? value
            const uploadId = fieldId(`technical-mark-upload-${elementId}`)
            const isCustomTechnicalMarkSource = asset.source === 'custom'
            const title = entry.isPrimary
              ? `${label} technical mark`
              : `${label} technical mark ${entry.index + 1}`
            const summary = [
              asset.layout.enabled ? 'shown' : 'hidden',
              isCustomTechnicalMarkSource && asset.customImageDataUrl
                ? 'custom image'
                : 'bundled generic',
              `scale ${asset.layout.scale.toFixed(2)}`,
            ].join(' · ')
            return (
              <RepeatedVisualElementCard
                key={elementId}
                title={title}
                label={asset.label}
                labelInputId={fieldId(`technical-mark-label-${elementId}`)}
                enabled={asset.layout.enabled}
                enableLabel={`Show ${title.toLowerCase()}`}
                summary={summary}
                deleteLabel={entry.isPrimary
                  ? `Remove ${label.toLowerCase()} technical mark`
                  : `Delete ${title.toLowerCase()}`}
                onEnabledChange={(enabled) =>
                  handleTechnicalMarkLayoutChange(value, 'enabled', enabled, assetId)}
                onLabelChange={(nextLabel) =>
                  handleTechnicalMarkLabelChange(value, nextLabel, assetId)}
                onDelete={() => {
                  if (entry.isPrimary || !assetId) {
                    handleTechnicalMarkToggle(value, false)
                    return
                  }

                  handleRemoveTechnicalMarkAsset(value, assetId)
                }}
              >
                <label className="field-label spacing-top" htmlFor={fieldId(`technical-mark-source-${elementId}`)}>Mark source</label>
                <select id={fieldId(`technical-mark-source-${elementId}`)} value={asset.source} onChange={(event) => handleTechnicalMarkSourceChange(value, event.target.value as TechnicalMarkSource, assetId)}>
                  <option value="placeholder">Built-in generic</option>
                  <option value="custom">Custom image</option>
                </select>
                {isCustomTechnicalMarkSource ? (
                  <>
                    <span className="field-label spacing-top">Custom technical image</span>
                    <label className="secondary-button logo-upload-button" htmlFor={uploadId}>Choose custom {label}</label>
                    <input id={uploadId} className="logo-file-input" type="file" accept="image/*" onChange={(event) => handleTechnicalMarkUpload(value, event, assetId)} />
                    {asset.customImageDataUrl ? (
                      <div className="selected-lockup-card logo-asset-status-card">
                        <img className="logo-asset-preview" src={asset.customImageDataUrl} alt="" draggable={false} />
                        <span>Custom {label} mark active{formatLogoSize(asset.customImageSize)}</span>
                      </div>
                    ) : <p className="hint">No custom {label.toLowerCase()} technical image is selected yet. The bundled generic technical mark remains visible until you upload an image.</p>}
                  </>
                ) : <p className="hint">Using a bundled generic mark.</p>}
                {renderLayoutControls?.(value, label, asset, assetId)}
                {entryIndex === entries.length - 1 ? (
                  <AddTechnicalMarkAssetButton
                    label={label}
                    onClick={() => handleAddTechnicalMarkAsset(value)}
                  />
                ) : null}
                {isCustomTechnicalMarkSource && asset.customImageDataUrl && <button className="secondary-button" type="button" onClick={() => handleClearTechnicalMarkImage(value, assetId)}>Clear custom {label}</button>}
              </RepeatedVisualElementCard>
            )
            })
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
  | 'handleAddTechnicalMarkAsset'
  | 'handleRemoveTechnicalMarkAsset'
>) {
  return (
    <TechnicalMarkSetupControls
      {...props}
      projectTechnicalMarks={projectTechnicalMarks}
      handleTechnicalMarkLayoutChange={handleTechnicalMarkLayoutChange}
      renderLayoutControls={(value, label, asset, assetId) => {
        const sliderRanges = getTechnicalMarkLayoutSliderRanges(
          asset,
          selectedDiscTemplate,
        )
        const elementId = assetId ?? value

        return (
          <>
            <label className="field-label spacing-top" htmlFor={`technical-mark-scale-${elementId}`}>Scale</label>
            <input id={`technical-mark-scale-${elementId}`} type="range" min="0.25" max="2" step="0.01" value={asset.layout.scale} onInput={(event) => handleTechnicalMarkLayoutChange(value, 'scale', getNumericInputValue(event), assetId)} onChange={(event) => handleTechnicalMarkLayoutChange(value, 'scale', getNumericInputValue(event), assetId)} />
            <label className="field-label spacing-top" htmlFor={`technical-mark-x-${elementId}`}>X position</label>
            <input id={`technical-mark-x-${elementId}`} type="range" min={sliderRanges.x.min} max={sliderRanges.x.max} step="0.1" value={asset.layout.x} onInput={(event) => handleTechnicalMarkLayoutChange(value, 'x', getNumericInputValue(event), assetId)} onChange={(event) => handleTechnicalMarkLayoutChange(value, 'x', getNumericInputValue(event), assetId)} />
            <label className="field-label spacing-top" htmlFor={`technical-mark-y-${elementId}`}>Y position</label>
            <input id={`technical-mark-y-${elementId}`} type="range" min={sliderRanges.y.min} max={sliderRanges.y.max} step="0.1" value={asset.layout.y} onInput={(event) => handleTechnicalMarkLayoutChange(value, 'y', getNumericInputValue(event), assetId)} onChange={(event) => handleTechnicalMarkLayoutChange(value, 'y', getNumericInputValue(event), assetId)} />
            <button className="secondary-button" type="button" onClick={() => handleResetTechnicalMarkLayout(value, assetId)}>Reset {label} layout</button>
          </>
        )
      }}
    />
  )
}
