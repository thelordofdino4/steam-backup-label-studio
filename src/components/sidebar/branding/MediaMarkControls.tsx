import type { ReactNode } from 'react'
import { getMediaMarkLayoutSliderRanges } from '../../../layout/discElementSafeZone'
import {
  MEDIA_MARK_OPTIONS,
  MEDIA_MARK_THEME_OPTIONS,
  getMediaMarkLabel,
  mediaMarkSupportsTheme,
} from '../../../project/projectMediaMark'
import type { MediaMarkSource, MediaMarkTheme, MediaMarkValue } from '../../../project/projectTypes'
import { EditorMarkImageSourceControls } from '../../editor/EditorMarkImageSourceControls'
import { EditorStackedRangeField } from '../../editor/EditorRangeField'
import { formatLogoSize } from './helpers'
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
  idPrefix?: string
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
  idPrefix,
}: MediaMarkSetupControlsProps) {
  const fieldId = (id: string) => idPrefix ? `${idPrefix}-${id}` : id
  const isEnabled = projectMediaMark.layout.enabled
  const isCustomMediaMarkSource = projectMediaMark.source === 'custom'
  const showsThemeControl = !isCustomMediaMarkSource &&
    mediaMarkSupportsTheme(projectMediaMark.value)

  return (
    <div className="logo-asset-card">
      <label className="field-label"><input type="checkbox" checked={isEnabled} onChange={(event) => handleMediaMarkLayoutChange('enabled', event.target.checked)} /> Show media format mark</label>
      {!isEnabled ? null : (
        <>
          <label className="field-label spacing-top" htmlFor={fieldId('media-mark-value')}>Format</label>
          <select id={fieldId('media-mark-value')} value={projectMediaMark.value} onChange={(event) => handleMediaMarkValueChange(event.target.value as MediaMarkValue)}>
            {MEDIA_MARK_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <EditorMarkImageSourceControls
            idPrefix={idPrefix}
            source={projectMediaMark.source}
            sourceLabel="Mark source"
            sourceSelectId="media-mark-source"
            builtInHint="Using the built-in generic mark."
            customImageLabel="Custom mark image"
            customImageDataUrl={projectMediaMark.customImageDataUrl}
            customImageSize={projectMediaMark.customImageSize}
            customActiveLabel="Custom media mark active"
            uploadId="media-mark-upload"
            uploadButtonLabel="Choose custom mark"
            emptyCustomHint="No custom media mark image is selected yet. The built-in mark remains visible until you upload an image."
            clearCustomLabel="Clear custom mark"
            formatSize={formatLogoSize}
            onSourceChange={(source) =>
              handleMediaMarkSourceChange(source as MediaMarkSource)}
            onUpload={handleMediaMarkUpload}
            onClearCustomImage={handleClearMediaMarkImage}
            sourceDetails={(
              <>
                {showsThemeControl ? (
                  <>
                    <label className="field-label spacing-top" htmlFor={fieldId('media-mark-theme')}>Mark theme</label>
                    <select id={fieldId('media-mark-theme')} value={projectMediaMark.theme} onChange={(event) => handleMediaMarkThemeChange(event.target.value as MediaMarkTheme)}>
                      {MEDIA_MARK_THEME_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </>
                ) : null}
                <p className="hint">Current media mark: {getMediaMarkLabel(projectMediaMark.value)}.</p>
              </>
            )}
          >
          {children}
          </EditorMarkImageSourceControls>
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
      <EditorStackedRangeField
        id="media-mark-scale"
        label="Scale"
        min={0.25}
        max={2}
        step={0.01}
        value={projectMediaMark.layout.scale}
        onInput={(value) => handleMediaMarkLayoutChange('scale', value)}
        onChange={(value) => handleMediaMarkLayoutChange('scale', value)}
      />
      <EditorStackedRangeField
        id="media-mark-x"
        label="X position"
        min={sliderRanges.x.min}
        max={sliderRanges.x.max}
        step={0.1}
        value={projectMediaMark.layout.x}
        onInput={(value) => handleMediaMarkLayoutChange('x', value)}
        onChange={(value) => handleMediaMarkLayoutChange('x', value)}
      />
      <EditorStackedRangeField
        id="media-mark-y"
        label="Y position"
        min={sliderRanges.y.min}
        max={sliderRanges.y.max}
        step={0.1}
        value={projectMediaMark.layout.y}
        onInput={(value) => handleMediaMarkLayoutChange('y', value)}
        onChange={(value) => handleMediaMarkLayoutChange('y', value)}
      />
      <button className="secondary-button" type="button" onClick={handleResetMediaMarkLayout}>Reset media mark layout</button>
    </MediaMarkSetupControls>
  )
}
