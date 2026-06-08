import type { ReactNode } from 'react'
import { useState } from 'react'
import { getPlatformMarkLayoutSliderRanges } from '../../../layout/discElementSafeZone'
import {
  PLATFORM_MARK_OPTIONS,
  getEnabledPlatformMarkValues,
  getPlatformMarkLabel,
  getPlatformMarkThemeOptions,
  getPlatformMarkValuesForRemember,
  getPlatformMarkValuesForRestore,
  getProjectPlatformMarkAsset,
  getProjectPlatformMarkInference,
  platformMarkSupportsTheme,
} from '../../../project/projectPlatformMarks'
import type {
  PlatformMarkSource,
  PlatformMarkTheme,
  PlatformMarkValue,
  ProjectPlatformMarkAsset,
} from '../../../project/projectTypes'
import { EditorMarkImageSourceControls } from '../../editor/EditorMarkImageSourceControls'
import { EditorStackedRangeField } from '../../editor/EditorRangeField'
import { formatLogoSize } from './helpers'
import type { BrandingPanelProps } from './types'

type PlatformMarkSetupControlsProps = Pick<
  BrandingPanelProps,
  | 'projectPlatformMarks'
  | 'handlePlatformMarkToggle'
  | 'handlePlatformMarkUpload'
  | 'handlePlatformMarkSourceChange'
  | 'handlePlatformMarkThemeChange'
  | 'handlePlatformMarkLayoutChange'
  | 'handleClearPlatformMarkImage'
> & {
  renderLayoutControls?: (
    value: PlatformMarkValue,
    label: string,
    asset: ProjectPlatformMarkAsset,
  ) => ReactNode
  idPrefix?: string
}

export function PlatformMarkSetupControls({
  projectPlatformMarks,
  handlePlatformMarkToggle,
  handlePlatformMarkUpload,
  handlePlatformMarkSourceChange,
  handlePlatformMarkThemeChange,
  handlePlatformMarkLayoutChange,
  handleClearPlatformMarkImage,
  renderLayoutControls,
  idPrefix,
}: PlatformMarkSetupControlsProps) {
  const fieldId = (id: string) => idPrefix ? `${idPrefix}-${id}` : id
  const [rememberedValues, setRememberedValues] = useState<PlatformMarkValue[]>([])
  const enabledValues = getEnabledPlatformMarkValues(projectPlatformMarks)
  const isEnabled = enabledValues.length > 0
  const currentLabel = enabledValues.length > 0
    ? enabledValues.map(getPlatformMarkLabel).join(', ')
    : 'None selected'
  const inference = getProjectPlatformMarkInference(projectPlatformMarks)
  const shouldShowInferenceHint = inference.source !== 'none'

  const toggleEnabled = (enabled: boolean) => {
    if (enabled) {
      const valuesToRestore = getPlatformMarkValuesForRestore(projectPlatformMarks, rememberedValues)
      valuesToRestore.forEach((value) => projectPlatformMarks.values.includes(value) ? handlePlatformMarkLayoutChange(value, 'enabled', true) : handlePlatformMarkToggle(value, true))
      return
    }
    setRememberedValues(getPlatformMarkValuesForRemember(projectPlatformMarks))
    projectPlatformMarks.values.forEach((value) => handlePlatformMarkLayoutChange(value, 'enabled', false))
  }

  return (
    <div>
      <label className="field-label"><input type="checkbox" checked={isEnabled} onChange={(event) => toggleEnabled(event.target.checked)} /> Show operating system marks</label>
      {shouldShowInferenceHint ? <p className="hint">{inference.message}</p> : null}
      {!isEnabled ? null : (
        <>
          <div className="platform-mark-selection-group spacing-top">
            <span className="field-label">Operating systems</span>
            <div className="disc-mark-checkbox-list">
              {PLATFORM_MARK_OPTIONS.map((option) => {
                const checked = enabledValues.includes(option.value)

                return (
                  <label key={option.value} className="field-label"><input type="checkbox" checked={checked} onChange={(event) => handlePlatformMarkToggle(option.value, event.target.checked)} /> {option.label}</label>
                )
              })}
            </div>
          </div>
          <p className="hint">Current operating system marks: {currentLabel}. Each selected operating system mark has its own image and layout.</p>
          {enabledValues.map((value) => {
            const asset = getProjectPlatformMarkAsset(projectPlatformMarks, value)
            const label = getPlatformMarkLabel(value)
            const isCustomPlatformMarkSource = asset.source === 'custom'
            const themeOptions = getPlatformMarkThemeOptions(value)
            const showsThemeControl =
              !isCustomPlatformMarkSource &&
              platformMarkSupportsTheme(value)
            return (
              <div key={value} className="logo-asset-card spacing-top">
                <span className="field-label">{label} operating system mark</span>
                <EditorMarkImageSourceControls
                  idPrefix={idPrefix}
                  source={asset.source}
                  sourceLabel="Mark source"
                  sourceSelectId={`platform-mark-source-${value}`}
                  builtInHint="Using a bundled generic mark."
                  customImageLabel="Custom operating system image"
                  customImageDataUrl={asset.customImageDataUrl}
                  customImageSize={asset.customImageSize}
                  customActiveLabel={`Custom ${label} mark active`}
                  uploadId={`platform-mark-upload-${value}`}
                  uploadButtonLabel={`Choose custom ${label}`}
                  emptyCustomHint={`No custom ${label} operating system image is selected yet. The bundled generic mark remains visible until you upload an image.`}
                  clearCustomLabel={`Clear custom ${label}`}
                  formatSize={formatLogoSize}
                  onSourceChange={(source) =>
                    handlePlatformMarkSourceChange(
                      value,
                      source as PlatformMarkSource,
                    )}
                  onUpload={(event) => handlePlatformMarkUpload(value, event)}
                  onClearCustomImage={() => handleClearPlatformMarkImage(value)}
                  sourceDetails={showsThemeControl ? (
                    <>
                      <label className="field-label spacing-top" htmlFor={fieldId(`platform-mark-theme-${value}`)}>Mark style</label>
                      <select id={fieldId(`platform-mark-theme-${value}`)} value={asset.theme} onChange={(event) => handlePlatformMarkThemeChange(value, event.target.value as PlatformMarkTheme)}>
                        {themeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                    </>
                  ) : null}
                >
                  {renderLayoutControls?.(value, label, asset)}
                </EditorMarkImageSourceControls>
              </div>
            )
          })}
        </>
      )}
    </div>
  )
}

export function PlatformMarkControls({
  projectPlatformMarks,
  selectedDiscTemplate,
  handlePlatformMarkLayoutChange,
  handleResetPlatformMarkLayout,
  ...props
}: Pick<
  BrandingPanelProps,
  | 'projectPlatformMarks'
  | 'selectedDiscTemplate'
  | 'handlePlatformMarkToggle'
  | 'handlePlatformMarkUpload'
  | 'handlePlatformMarkSourceChange'
  | 'handlePlatformMarkThemeChange'
  | 'handlePlatformMarkLayoutChange'
  | 'handleClearPlatformMarkImage'
  | 'handleResetPlatformMarkLayout'
>) {
  return (
    <PlatformMarkSetupControls
      {...props}
      projectPlatformMarks={projectPlatformMarks}
      handlePlatformMarkLayoutChange={handlePlatformMarkLayoutChange}
      renderLayoutControls={(value, label, asset) => {
        const sliderRanges = getPlatformMarkLayoutSliderRanges(
          asset,
          selectedDiscTemplate,
        )

        return (
          <>
            <EditorStackedRangeField
              id={`platform-mark-scale-${value}`}
              label="Scale"
              min={0.25}
              max={2}
              step={0.01}
              value={asset.layout.scale}
              onInput={(nextValue) =>
                handlePlatformMarkLayoutChange(value, 'scale', nextValue)}
              onChange={(nextValue) =>
                handlePlatformMarkLayoutChange(value, 'scale', nextValue)}
            />
            <EditorStackedRangeField
              id={`platform-mark-x-${value}`}
              label="X position"
              min={sliderRanges.x.min}
              max={sliderRanges.x.max}
              step={0.1}
              value={asset.layout.x}
              onInput={(nextValue) =>
                handlePlatformMarkLayoutChange(value, 'x', nextValue)}
              onChange={(nextValue) =>
                handlePlatformMarkLayoutChange(value, 'x', nextValue)}
            />
            <EditorStackedRangeField
              id={`platform-mark-y-${value}`}
              label="Y position"
              min={sliderRanges.y.min}
              max={sliderRanges.y.max}
              step={0.1}
              value={asset.layout.y}
              onInput={(nextValue) =>
                handlePlatformMarkLayoutChange(value, 'y', nextValue)}
              onChange={(nextValue) =>
                handlePlatformMarkLayoutChange(value, 'y', nextValue)}
            />
            <button className="secondary-button" type="button" onClick={() => handleResetPlatformMarkLayout(value)}>Reset {label} layout</button>
          </>
        )
      }}
    />
  )
}
