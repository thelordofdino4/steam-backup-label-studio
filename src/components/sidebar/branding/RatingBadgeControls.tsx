import type { ReactNode } from 'react'
import { getRatingBadgeLayoutSliderRanges } from '../../../layout/discElementSafeZone'
import { RATING_BADGE_LAYOUT_PRESETS } from '../../../layout/presets'
import {
  formatRatingValueForSystem,
  getActiveRatingSystemForBadge,
  getRatingMetadataForSystemChange,
  getRatingValuesForSystem,
} from '../../../project/projectMetadata'
import type { GameRatingSystem, RatingBadgeSource } from '../../../project/projectTypes'
import { formatLogoSize, getNumericInputValue } from './helpers'
import type { BrandingPanelProps } from './types'

type RatingBadgeSetupControlsProps = Pick<
  BrandingPanelProps,
  | 'projectMetadata'
  | 'projectRatingBadge'
  | 'handleProjectMetadataChange'
  | 'handleProjectMetadataFieldsChange'
  | 'handleRatingBadgeUpload'
  | 'handleRatingBadgeSourceChange'
  | 'handleRatingBadgeEnabledChange'
  | 'handleSupplementalUskRatingBadgeEnabledChange'
  | 'handleSupplementalUskRatingBadgeValueChange'
  | 'handleClearRatingBadgeImage'
> & {
  children?: ReactNode
  renderSupplementalUskLayoutControls?: () => ReactNode
  idPrefix?: string
}

export function RatingBadgeSetupControls({
  projectMetadata,
  projectRatingBadge,
  handleProjectMetadataChange,
  handleProjectMetadataFieldsChange,
  handleRatingBadgeUpload,
  handleRatingBadgeSourceChange,
  handleRatingBadgeEnabledChange,
  handleSupplementalUskRatingBadgeEnabledChange,
  handleSupplementalUskRatingBadgeValueChange,
  handleClearRatingBadgeImage,
  children,
  renderSupplementalUskLayoutControls,
  idPrefix,
}: RatingBadgeSetupControlsProps) {
  const fieldId = (id: string) => idPrefix ? `${idPrefix}-${id}` : id
  const isBadgeEnabled = projectRatingBadge.layout.enabled
  const activeRatingSystem = getActiveRatingSystemForBadge(projectMetadata.ratingSystem)
  const hasRatingValue = projectMetadata.ratingValue.trim().length > 0
  const ratingLabel = projectMetadata.ratingSystem === 'none' ? 'No rating selected' : `${projectMetadata.ratingSystem}${hasRatingValue ? ` ${projectMetadata.ratingValue}` : ''}`
  const isCustomBadgeSource = projectRatingBadge.source === 'custom'
  const shouldShowSupplementalUskControls = activeRatingSystem === 'PEGI'
  const isSupplementalUskBadgeEnabled = projectRatingBadge.uskBadge.layout.enabled

  return (
    <div className="logo-asset-card">
      <label className="field-label"><input type="checkbox" checked={isBadgeEnabled} onChange={(event) => handleRatingBadgeEnabledChange(event.target.checked)} /> Show rating badge</label>
      {!isBadgeEnabled ? null : (
        <>
          <label className="field-label spacing-top" htmlFor={fieldId('branding-rating-system')}>Rating system</label>
          <select id={fieldId('branding-rating-system')} value={activeRatingSystem} onChange={(event) => {
            const nextSystem = event.target.value as GameRatingSystem
            const nextMetadata = getRatingMetadataForSystemChange(projectMetadata, nextSystem)
            handleProjectMetadataFieldsChange(nextMetadata)
          }}>
            <option value="ESRB">ESRB</option>
            <option value="PEGI">PEGI</option>
            <option value="USK">USK</option>
            <option value="custom">Custom</option>
          </select>

          <label className="field-label spacing-top" htmlFor={fieldId('branding-rating-value')}>Rating value</label>
          {activeRatingSystem === 'custom' ? (
            <input id={fieldId('branding-rating-value')} type="text" value={projectMetadata.ratingValue} placeholder="Custom rating label..." onChange={(event) => handleProjectMetadataChange('ratingValue', event.target.value)} />
          ) : (
            <select id={fieldId('branding-rating-value')} value={projectMetadata.ratingValue} onChange={(event) => handleProjectMetadataChange('ratingValue', event.target.value)}>
              {getRatingValuesForSystem(activeRatingSystem).map((value) => (
                <option key={value} value={value}>
                  {formatRatingValueForSystem(activeRatingSystem, value)}
                </option>
              ))}
            </select>
          )}

          {shouldShowSupplementalUskControls ? (
            <div className="platform-mark-selection-group spacing-top">
              <label className="field-label">
                <input type="checkbox" checked={isSupplementalUskBadgeEnabled} onChange={(event) => handleSupplementalUskRatingBadgeEnabledChange(event.target.checked)} />
                Show additional USK badge
              </label>

              {!isSupplementalUskBadgeEnabled ? null : (
                <>
                  <label className="field-label spacing-top" htmlFor={fieldId('branding-usk-rating-value')}>USK rating value</label>
                  <select id={fieldId('branding-usk-rating-value')} value={projectRatingBadge.uskBadge.ratingValue} onChange={(event) => handleSupplementalUskRatingBadgeValueChange(event.target.value)}>
                    {getRatingValuesForSystem('USK').map((value) => (
                      <option key={value} value={value}>
                        {formatRatingValueForSystem('USK', value)}
                      </option>
                    ))}
                  </select>
                  {renderSupplementalUskLayoutControls?.()}
                </>
              )}
            </div>
          ) : null}

          <p className="hint">Current metadata rating: {ratingLabel}. Rating values are manual for now.</p>
          {projectMetadata.ratingSystem === 'none' && (
            <p className="hint">No rating badge will render while the rating system is set to None.</p>
          )}
          {projectMetadata.ratingSystem !== 'none' && !hasRatingValue && (
            <p className="hint">Choose a rating value so the enabled badge has meaningful text.</p>
          )}

          <label className="field-label spacing-top" htmlFor={fieldId('rating-badge-source')}>Badge source</label>
          <select id={fieldId('rating-badge-source')} value={projectRatingBadge.source} onChange={(event) => handleRatingBadgeSourceChange(event.target.value as RatingBadgeSource)}>
            <option value="placeholder">Built-in artwork</option>
            <option value="custom">Custom image</option>
          </select>

          {isCustomBadgeSource ? (
            <>
              <span className="field-label spacing-top">Custom badge image</span>
              <label className="secondary-button logo-upload-button" htmlFor={fieldId('rating-badge-upload')}>Choose custom badge</label>
              <input id={fieldId('rating-badge-upload')} className="logo-file-input" type="file" accept="image/*" onChange={handleRatingBadgeUpload} />

              {projectRatingBadge.customImageDataUrl ? (
                <div className="selected-lockup-card logo-asset-status-card">
                  <img className="logo-asset-preview" src={projectRatingBadge.customImageDataUrl} alt="" draggable={false} />
                  <span>Custom rating badge active{formatLogoSize(projectRatingBadge.customImageSize)}</span>
                </div>
              ) : <p className="hint">No custom badge image is selected yet. The bundled rating artwork is used when a rating system and value are set.</p>}
            </>
          ) : <p className="hint">Using the built-in rating artwork.</p>}

          {children}
          {isCustomBadgeSource && projectRatingBadge.customImageDataUrl && <button className="secondary-button" type="button" onClick={handleClearRatingBadgeImage}>Clear custom badge</button>}
        </>
      )}
    </div>
  )
}

export function RatingBadgeControls({
  projectRatingBadge,
  selectedDiscTemplate,
  handleRatingBadgeLayoutChange,
  handleSupplementalUskRatingBadgeLayoutChange,
  handleResetRatingBadgeLayout,
  handleResetSupplementalUskRatingBadgeLayout,
  ...props
}: Pick<
  BrandingPanelProps,
  | 'projectMetadata'
  | 'projectRatingBadge'
  | 'selectedDiscTemplate'
  | 'handleProjectMetadataChange'
  | 'handleProjectMetadataFieldsChange'
  | 'handleRatingBadgeUpload'
  | 'handleRatingBadgeSourceChange'
  | 'handleRatingBadgeEnabledChange'
  | 'handleRatingBadgeLayoutChange'
  | 'handleSupplementalUskRatingBadgeEnabledChange'
  | 'handleSupplementalUskRatingBadgeValueChange'
  | 'handleSupplementalUskRatingBadgeLayoutChange'
  | 'handleClearRatingBadgeImage'
  | 'handleResetRatingBadgeLayout'
  | 'handleResetSupplementalUskRatingBadgeLayout'
>) {
  const sliderRanges = getRatingBadgeLayoutSliderRanges(
    projectRatingBadge,
    selectedDiscTemplate,
  )
  const supplementalUskSliderRanges = getRatingBadgeLayoutSliderRanges(
    {
      source: 'placeholder',
      customImageSize: null,
      layout: projectRatingBadge.uskBadge.layout,
    },
    selectedDiscTemplate,
  )

  const applyRatingBadgePreset = (presetId: string) => {
    const preset = RATING_BADGE_LAYOUT_PRESETS.find((candidate) => candidate.id === presetId)
    if (!preset) return
    handleRatingBadgeLayoutChange('x', preset.x)
    handleRatingBadgeLayoutChange('y', preset.y)
    handleRatingBadgeLayoutChange('scale', preset.scale)
  }

  const applySupplementalUskBadgePreset = (presetId: string) => {
    const preset = RATING_BADGE_LAYOUT_PRESETS.find((candidate) => candidate.id === presetId)
    if (!preset) return
    handleSupplementalUskRatingBadgeLayoutChange('x', preset.x)
    handleSupplementalUskRatingBadgeLayoutChange('y', preset.y)
    handleSupplementalUskRatingBadgeLayoutChange('scale', preset.scale)
  }

  return (
    <RatingBadgeSetupControls
      {...props}
      projectRatingBadge={projectRatingBadge}
      renderSupplementalUskLayoutControls={() => (
        <>
          <label className="field-label spacing-top" htmlFor="usk-rating-badge-layout-preset">USK layout preset</label>
          <select id="usk-rating-badge-layout-preset" defaultValue="" onChange={(event) => {
            applySupplementalUskBadgePreset(event.target.value)
            event.currentTarget.value = ''
          }}>
            <option value="">Choose preset...</option>
            {RATING_BADGE_LAYOUT_PRESETS.map((preset) => <option key={preset.id} value={preset.id}>{preset.label}</option>)}
          </select>

          <label className="field-label spacing-top" htmlFor="usk-rating-badge-scale">USK scale</label>
          <input id="usk-rating-badge-scale" type="range" min="0.25" max="2" step="0.01" value={projectRatingBadge.uskBadge.layout.scale} onInput={(event) => handleSupplementalUskRatingBadgeLayoutChange('scale', getNumericInputValue(event))} onChange={(event) => handleSupplementalUskRatingBadgeLayoutChange('scale', getNumericInputValue(event))} />
          <label className="field-label spacing-top" htmlFor="usk-rating-badge-x">USK X position</label>
          <input id="usk-rating-badge-x" type="range" min={supplementalUskSliderRanges.x.min} max={supplementalUskSliderRanges.x.max} step="0.1" value={projectRatingBadge.uskBadge.layout.x} onInput={(event) => handleSupplementalUskRatingBadgeLayoutChange('x', getNumericInputValue(event))} onChange={(event) => handleSupplementalUskRatingBadgeLayoutChange('x', getNumericInputValue(event))} />
          <label className="field-label spacing-top" htmlFor="usk-rating-badge-y">USK Y position</label>
          <input id="usk-rating-badge-y" type="range" min={supplementalUskSliderRanges.y.min} max={supplementalUskSliderRanges.y.max} step="0.1" value={projectRatingBadge.uskBadge.layout.y} onInput={(event) => handleSupplementalUskRatingBadgeLayoutChange('y', getNumericInputValue(event))} onChange={(event) => handleSupplementalUskRatingBadgeLayoutChange('y', getNumericInputValue(event))} />
          <button className="secondary-button" type="button" onClick={handleResetSupplementalUskRatingBadgeLayout}>Reset USK badge layout</button>
        </>
      )}
    >
      <label className="field-label spacing-top" htmlFor="rating-badge-layout-preset">Layout preset</label>
      <select id="rating-badge-layout-preset" defaultValue="" onChange={(event) => {
        applyRatingBadgePreset(event.target.value)
        event.currentTarget.value = ''
      }}>
        <option value="">Choose preset...</option>
        {RATING_BADGE_LAYOUT_PRESETS.map((preset) => <option key={preset.id} value={preset.id}>{preset.label}</option>)}
      </select>

      <label className="field-label spacing-top" htmlFor="rating-badge-scale">Scale</label>
      <input id="rating-badge-scale" type="range" min="0.25" max="2" step="0.01" value={projectRatingBadge.layout.scale} onInput={(event) => handleRatingBadgeLayoutChange('scale', getNumericInputValue(event))} onChange={(event) => handleRatingBadgeLayoutChange('scale', getNumericInputValue(event))} />
      <label className="field-label spacing-top" htmlFor="rating-badge-x">X position</label>
      <input id="rating-badge-x" type="range" min={sliderRanges.x.min} max={sliderRanges.x.max} step="0.1" value={projectRatingBadge.layout.x} onInput={(event) => handleRatingBadgeLayoutChange('x', getNumericInputValue(event))} onChange={(event) => handleRatingBadgeLayoutChange('x', getNumericInputValue(event))} />
      <label className="field-label spacing-top" htmlFor="rating-badge-y">Y position</label>
      <input id="rating-badge-y" type="range" min={sliderRanges.y.min} max={sliderRanges.y.max} step="0.1" value={projectRatingBadge.layout.y} onInput={(event) => handleRatingBadgeLayoutChange('y', getNumericInputValue(event))} onChange={(event) => handleRatingBadgeLayoutChange('y', getNumericInputValue(event))} />
      <button className="secondary-button" type="button" onClick={handleResetRatingBadgeLayout}>Reset rating badge layout</button>
    </RatingBadgeSetupControls>
  )
}
