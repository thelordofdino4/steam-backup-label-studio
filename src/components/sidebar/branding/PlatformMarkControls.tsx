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
} from '../../../project/projectMediaMark'
import type { PlatformMarkSource, PlatformMarkTheme, PlatformMarkValue } from '../../../project/projectTypes'
import { formatLogoSize, getNumericInputValue } from './helpers'
import type { BrandingPanelProps } from './types'

export function PlatformMarkControls({
  projectPlatformMarks,
  selectedDiscTemplate,
  handlePlatformMarkToggle,
  handlePlatformMarkUpload,
  handlePlatformMarkSourceChange,
  handlePlatformMarkThemeChange,
  handlePlatformMarkLayoutChange,
  handleClearPlatformMarkImage,
  handleResetPlatformMarkLayout,
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
  const [rememberedValues, setRememberedValues] = useState<PlatformMarkValue[]>([])
  const enabledValues = getEnabledPlatformMarkValues(projectPlatformMarks)
  const isEnabled = enabledValues.length > 0
  const currentLabel = projectPlatformMarks.values.length > 0 ? projectPlatformMarks.values.map(getPlatformMarkLabel).join(', ') : 'None selected'
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
              {PLATFORM_MARK_OPTIONS.map((option) => (
                <label key={option.value} className="field-label"><input type="checkbox" checked={projectPlatformMarks.values.includes(option.value)} onChange={(event) => handlePlatformMarkToggle(option.value, event.target.checked)} /> {option.label}</label>
              ))}
            </div>
          </div>
          <p className="hint">Current operating system marks: {currentLabel}. Each selected operating system mark has its own image and layout.</p>
          {projectPlatformMarks.values.map((value) => {
            const asset = getProjectPlatformMarkAsset(projectPlatformMarks, value)
            const label = getPlatformMarkLabel(value)
            const uploadId = `platform-mark-upload-${value}`
            const isCustomPlatformMarkSource = asset.source === 'custom'
            const themeOptions = getPlatformMarkThemeOptions(value)
            const showsThemeControl =
              !isCustomPlatformMarkSource &&
              platformMarkSupportsTheme(value)
            const sliderRanges = getPlatformMarkLayoutSliderRanges(
              asset,
              selectedDiscTemplate,
            )
            return (
              <div key={value} className="logo-asset-card spacing-top">
                <span className="field-label">{label} operating system mark</span>
                <label className="field-label spacing-top" htmlFor={`platform-mark-source-${value}`}>Mark source</label>
                <select id={`platform-mark-source-${value}`} value={asset.source} onChange={(event) => handlePlatformMarkSourceChange(value, event.target.value as PlatformMarkSource)}>
                  <option value="placeholder">Built-in generic</option>
                  <option value="custom">Custom image</option>
                </select>
                {showsThemeControl ? (
                  <>
                    <label className="field-label spacing-top" htmlFor={`platform-mark-theme-${value}`}>Mark style</label>
                    <select id={`platform-mark-theme-${value}`} value={asset.theme} onChange={(event) => handlePlatformMarkThemeChange(value, event.target.value as PlatformMarkTheme)}>
                      {themeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </>
                ) : null}
                {isCustomPlatformMarkSource ? (
                  <>
                    <span className="field-label spacing-top">Custom operating system image</span>
                    <label className="secondary-button logo-upload-button" htmlFor={uploadId}>Choose custom {label}</label>
                    <input id={uploadId} className="logo-file-input" type="file" accept="image/*" onChange={(event) => handlePlatformMarkUpload(value, event)} />
                    {asset.customImageDataUrl ? (
                      <div className="selected-lockup-card logo-asset-status-card">
                        <img className="logo-asset-preview" src={asset.customImageDataUrl} alt="" draggable={false} />
                        <span>Custom {label} mark active{formatLogoSize(asset.customImageSize)}</span>
                      </div>
                    ) : <p className="hint">No custom {label} operating system image is selected yet. The bundled generic mark remains visible until you upload an image.</p>}
                  </>
                ) : <p className="hint">Using a bundled generic mark.</p>}
                <label className="field-label spacing-top" htmlFor={`platform-mark-scale-${value}`}>Scale</label>
                <input id={`platform-mark-scale-${value}`} type="range" min="0.25" max="2" step="0.01" value={asset.layout.scale} onInput={(event) => handlePlatformMarkLayoutChange(value, 'scale', getNumericInputValue(event))} onChange={(event) => handlePlatformMarkLayoutChange(value, 'scale', getNumericInputValue(event))} />
                <label className="field-label spacing-top" htmlFor={`platform-mark-x-${value}`}>X position</label>
                <input id={`platform-mark-x-${value}`} type="range" min={sliderRanges.x.min} max={sliderRanges.x.max} step="0.1" value={asset.layout.x} onInput={(event) => handlePlatformMarkLayoutChange(value, 'x', getNumericInputValue(event))} onChange={(event) => handlePlatformMarkLayoutChange(value, 'x', getNumericInputValue(event))} />
                <label className="field-label spacing-top" htmlFor={`platform-mark-y-${value}`}>Y position</label>
                <input id={`platform-mark-y-${value}`} type="range" min={sliderRanges.y.min} max={sliderRanges.y.max} step="0.1" value={asset.layout.y} onInput={(event) => handlePlatformMarkLayoutChange(value, 'y', getNumericInputValue(event))} onChange={(event) => handlePlatformMarkLayoutChange(value, 'y', getNumericInputValue(event))} />
                <button className="secondary-button" type="button" onClick={() => handleResetPlatformMarkLayout(value)}>Reset {label} layout</button>
                {isCustomPlatformMarkSource && asset.customImageDataUrl && <button className="secondary-button" type="button" onClick={() => handleClearPlatformMarkImage(value)}>Clear custom {label}</button>}
              </div>
            )
          })}
        </>
      )}
    </div>
  )
}
