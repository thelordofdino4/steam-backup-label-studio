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
import { EditorMarkImageSourceControls } from '../../editor/EditorMarkImageSourceControls'
import { EditorStackedRangeField } from '../../editor/EditorRangeField'
import { formatLogoSize } from './helpers'
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
  const currentLabel = enabledValues.length > 0 ? enabledValues.map(getTechnicalMarkLabel).join(', ') : 'None selected'

  const toggleEnabled = (enabled: boolean) => {
    if (enabled) {
      const valuesToRestore = getTechnicalMarkValuesForRestore(projectTechnicalMarks, rememberedValues)
      valuesToRestore.forEach((value) => projectTechnicalMarks.values.includes(value) ? handleTechnicalMarkLayoutChange(value, 'enabled', true) : handleTechnicalMarkToggle(value, true))
      return
    }
    setRememberedValues(getTechnicalMarkValuesForRemember(projectTechnicalMarks))
    projectTechnicalMarks.values.forEach((value) => {
      getProjectTechnicalMarkAssetEntries(projectTechnicalMarks, value)
        .forEach(({ assetId }) =>
          handleTechnicalMarkLayoutChange(value, 'enabled', false, assetId))
    })
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
                <label key={option.value} className="field-label"><input type="checkbox" checked={enabledValues.includes(option.value)} onChange={(event) => handleTechnicalMarkToggle(option.value, event.target.checked)} /> {option.label}</label>
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
                <EditorMarkImageSourceControls
                  idPrefix={idPrefix}
                  source={asset.source}
                  sourceLabel="Mark source"
                  sourceSelectId={`technical-mark-source-${elementId}`}
                  builtInHint="Using a bundled generic mark."
                  customImageLabel="Custom technical image"
                  customImageDataUrl={asset.customImageDataUrl}
                  customImageSize={asset.customImageSize}
                  customActiveLabel={`Custom ${label} mark active`}
                  uploadId={`technical-mark-upload-${elementId}`}
                  uploadButtonLabel={`Choose custom ${label}`}
                  emptyCustomHint={`No custom ${label.toLowerCase()} technical image is selected yet. The bundled generic technical mark remains visible until you upload an image.`}
                  clearCustomLabel={`Clear custom ${label}`}
                  formatSize={formatLogoSize}
                  onSourceChange={(source) =>
                    handleTechnicalMarkSourceChange(
                      value,
                      source as TechnicalMarkSource,
                      assetId,
                    )}
                  onUpload={(event) =>
                    handleTechnicalMarkUpload(value, event, assetId)}
                  onClearCustomImage={() =>
                    handleClearTechnicalMarkImage(value, assetId)}
                >
                  {renderLayoutControls?.(value, label, asset, assetId)}
                  {entryIndex === entries.length - 1 ? (
                    <AddTechnicalMarkAssetButton
                      label={label}
                      onClick={() => handleAddTechnicalMarkAsset(value)}
                    />
                  ) : null}
                </EditorMarkImageSourceControls>
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
          { ...asset, value },
          selectedDiscTemplate,
        )
        const elementId = assetId ?? value

        return (
          <>
            <EditorStackedRangeField
              id={`technical-mark-scale-${elementId}`}
              label="Scale"
              min={0.25}
              max={2}
              step={0.01}
              value={asset.layout.scale}
              onInput={(nextValue) =>
                handleTechnicalMarkLayoutChange(
                  value,
                  'scale',
                  nextValue,
                  assetId,
                )}
              onChange={(nextValue) =>
                handleTechnicalMarkLayoutChange(
                  value,
                  'scale',
                  nextValue,
                  assetId,
                )}
            />
            <EditorStackedRangeField
              id={`technical-mark-x-${elementId}`}
              label="X position"
              min={sliderRanges.x.min}
              max={sliderRanges.x.max}
              step={0.1}
              value={asset.layout.x}
              onInput={(nextValue) =>
                handleTechnicalMarkLayoutChange(value, 'x', nextValue, assetId)}
              onChange={(nextValue) =>
                handleTechnicalMarkLayoutChange(value, 'x', nextValue, assetId)}
            />
            <EditorStackedRangeField
              id={`technical-mark-y-${elementId}`}
              label="Y position"
              min={sliderRanges.y.min}
              max={sliderRanges.y.max}
              step={0.1}
              value={asset.layout.y}
              onInput={(nextValue) =>
                handleTechnicalMarkLayoutChange(value, 'y', nextValue, assetId)}
              onChange={(nextValue) =>
                handleTechnicalMarkLayoutChange(value, 'y', nextValue, assetId)}
            />
            <button className="secondary-button" type="button" onClick={() => handleResetTechnicalMarkLayout(value, assetId)}>Reset {label} layout</button>
          </>
        )
      }}
    />
  )
}
