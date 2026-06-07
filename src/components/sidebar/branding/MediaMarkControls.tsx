import type { ReactNode } from 'react'
import { getMediaMarkLayoutSliderRanges } from '../../../layout/discElementSafeZone'
import {
  MEDIA_MARK_OPTIONS,
  MEDIA_MARK_THEME_OPTIONS,
  getMediaMarkLabel,
  mediaMarkSupportsTheme,
} from '../../../project/projectMediaMark'
import type { MediaMarkSource, MediaMarkTheme, MediaMarkValue } from '../../../project/projectTypes'
import { formatLogoSize, getNumericInputValue } from './helpers'
import type { BrandingPanelProps } from './types'

type MediaMarkSetupControlsProps = Pick<
  BrandingPanelProps,
  | 'projectMediaMark'
  | 'handleMediaMarkUpload'
  | 'handleMediaMarkValueChange'
  | 'handleMediaMarkSourceChange'
  | 'handleMediaMarkThemeChange'
  | 'handleMediaMarkLayoutChange'
  | 'handleClearMediaMarkImage'
> & {
  children?: ReactNode
}

export function MediaMarkSetupControls({
  projectMediaMark,
  handleMediaMarkUpload,
  handleMediaMarkValueChange,
  handleMediaMarkSourceChange,
  handleMediaMarkThemeChange,
  handleMediaMarkLayoutChange,
  handleClearMediaMarkImage,
  children,
}: MediaMarkSetupControlsProps) {
  const isEnabled = projectMediaMark.layout.enabled
  const isCustomMediaMarkSource = projectMediaMark.source === 'custom'
  const showsThemeControl = !isCustomMediaMarkSource &&
    mediaMarkSupportsTheme(projectMediaMark.value)

  return (
    <div className="logo-asset-card">
      <label className="field-label"><input type="checkbox" checked={isEnabled} onChange={(event) => handleMediaMarkLayoutChange('enabled', event.target.checked)} /> Show media format mark</label>
      {!isEnabled ? null : (
        <>
          <label className="field-label spacing-top" htmlFor="media-mark-value">Format</label>
          <select id="media-mark-value" value={projectMediaMark.value} onChange={(event) => handleMediaMarkValueChange(event.target.value as MediaMarkValue)}>
            {MEDIA_MARK_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <label className="field-label spacing-top" htmlFor="media-mark-source">Mark source</label>
          <select id="media-mark-source" value={projectMediaMark.source} onChange={(event) => handleMediaMarkSourceChange(event.target.value as MediaMarkSource)}>
            <option value="placeholder">Built-in generic</option>
            <option value="custom">Custom image</option>
          </select>
          {showsThemeControl ? (
            <>
              <label className="field-label spacing-top" htmlFor="media-mark-theme">Mark theme</label>
              <select id="media-mark-theme" value={projectMediaMark.theme} onChange={(event) => handleMediaMarkThemeChange(event.target.value as MediaMarkTheme)}>
                {MEDIA_MARK_THEME_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </>
          ) : null}
          <p className="hint">Current media mark: {getMediaMarkLabel(projectMediaMark.value)}.</p>
          {isCustomMediaMarkSource ? (
            <>
              <span className="field-label spacing-top">Custom mark image</span>
              <label className="secondary-button logo-upload-button" htmlFor="media-mark-upload">Choose custom mark</label>
              <input id="media-mark-upload" className="logo-file-input" type="file" accept="image/*" onChange={handleMediaMarkUpload} />
              {projectMediaMark.customImageDataUrl ? (
                <div className="selected-lockup-card logo-asset-status-card">
                  <img className="logo-asset-preview" src={projectMediaMark.customImageDataUrl} alt="" draggable={false} />
                  <span>Custom media mark active{formatLogoSize(projectMediaMark.customImageSize)}</span>
                </div>
              ) : <p className="hint">No custom media mark image is selected yet. The bundled generic mark remains visible until you upload an image.</p>}
            </>
          ) : <p className="hint">Using the built-in generic mark.</p>}
          {children}
          {isCustomMediaMarkSource && projectMediaMark.customImageDataUrl && <button className="secondary-button" type="button" onClick={handleClearMediaMarkImage}>Clear custom mark</button>}
        </>
      )}
    </div>
  )
}

export function MediaMarkControls({
  projectMediaMark,
  selectedDiscTemplate,
  handleMediaMarkLayoutChange,
  handleResetMediaMarkLayout,
  ...props
}: Pick<
  BrandingPanelProps,
  | 'projectMediaMark'
  | 'selectedDiscTemplate'
  | 'handleMediaMarkUpload'
  | 'handleMediaMarkValueChange'
  | 'handleMediaMarkSourceChange'
  | 'handleMediaMarkThemeChange'
  | 'handleMediaMarkLayoutChange'
  | 'handleClearMediaMarkImage'
  | 'handleResetMediaMarkLayout'
>) {
  const sliderRanges = getMediaMarkLayoutSliderRanges(
    projectMediaMark,
    selectedDiscTemplate,
  )

  return (
    <MediaMarkSetupControls
      {...props}
      projectMediaMark={projectMediaMark}
      handleMediaMarkLayoutChange={handleMediaMarkLayoutChange}
    >
      <label className="field-label spacing-top" htmlFor="media-mark-scale">Scale</label>
      <input id="media-mark-scale" type="range" min="0.25" max="2" step="0.01" value={projectMediaMark.layout.scale} onInput={(event) => handleMediaMarkLayoutChange('scale', getNumericInputValue(event))} onChange={(event) => handleMediaMarkLayoutChange('scale', getNumericInputValue(event))} />
      <label className="field-label spacing-top" htmlFor="media-mark-x">X position</label>
      <input id="media-mark-x" type="range" min={sliderRanges.x.min} max={sliderRanges.x.max} step="0.1" value={projectMediaMark.layout.x} onInput={(event) => handleMediaMarkLayoutChange('x', getNumericInputValue(event))} onChange={(event) => handleMediaMarkLayoutChange('x', getNumericInputValue(event))} />
      <label className="field-label spacing-top" htmlFor="media-mark-y">Y position</label>
      <input id="media-mark-y" type="range" min={sliderRanges.y.min} max={sliderRanges.y.max} step="0.1" value={projectMediaMark.layout.y} onInput={(event) => handleMediaMarkLayoutChange('y', getNumericInputValue(event))} onChange={(event) => handleMediaMarkLayoutChange('y', getNumericInputValue(event))} />
      <button className="secondary-button" type="button" onClick={handleResetMediaMarkLayout}>Reset media mark layout</button>
    </MediaMarkSetupControls>
  )
}
