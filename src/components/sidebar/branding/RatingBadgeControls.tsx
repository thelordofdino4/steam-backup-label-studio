import type { ReactNode, Ref, RefCallback } from 'react'
import { getDiscPresetScaleControlRange } from '../../../editor/discPresetScaleControlRange'
import { getRatingBadgeLayoutSliderRanges } from '../../../layout/discElementSafeZone'
import { RATING_BADGE_LAYOUT_PRESETS } from '../../../layout/presets'
import {
  formatRatingValueForSystem,
  getActiveRatingSystemForBadge,
  getRatingMetadataForSystemChange,
  getRatingValuesForSystem,
} from '../../../project/projectMetadata'
import type { GameRatingSystem, RatingBadgeSource } from '../../../project/projectTypes'
import { EditorStackedRangeField } from '../../editor/EditorRangeField'
import { EditorMarkImageSourceControls } from '../../editor/EditorMarkImageSourceControls'
import { OptionalFeatureSection } from '../../editor/OptionalFeatureSection'
import { formatLogoSize } from './helpers'
import type { BrandingPanelProps } from './types'

type RatingBadgeControlRefs = {
  enableControlRef?: Ref<HTMLInputElement>
  sourceControlRef?: Ref<HTMLSelectElement>
  systemControlRef?: Ref<HTMLSelectElement>
  valueControlRef?: RefCallback<HTMLInputElement | HTMLSelectElement>
}

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
} & RatingBadgeControlRefs

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
  enableControlRef,
  sourceControlRef,
  systemControlRef,
  valueControlRef,
}: RatingBadgeSetupControlsProps) {
  const fieldId = (id: string) => idPrefix ? `${idPrefix}-${id}` : id
  const isBadgeEnabled = projectRatingBadge.layout.enabled
  const activeRatingSystem = getActiveRatingSystemForBadge(projectMetadata.ratingSystem)
  const hasRatingValue = projectMetadata.ratingValue.trim().length > 0
  const ratingLabel = projectMetadata.ratingSystem === 'none' ? 'No rating selected' : `${projectMetadata.ratingSystem}${hasRatingValue ? ` ${projectMetadata.ratingValue}` : ''}`
  const shouldShowSupplementalUskControls = activeRatingSystem === 'PEGI'
  const isSupplementalUskBadgeEnabled = projectRatingBadge.uskBadge.layout.enabled

  return (
    <OptionalFeatureSection
      className="logo-asset-card"
      enabled={isBadgeEnabled}
      enableControlRef={enableControlRef}
      enableLabel="Show rating badge"
      onEnabledChange={handleRatingBadgeEnabledChange}
    >
      <label className="field-label spacing-top" htmlFor={fieldId('branding-rating-system')}>Rating system</label>
      <select ref={systemControlRef} id={fieldId('branding-rating-system')} value={activeRatingSystem} onChange={(event) => {
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
        <input ref={valueControlRef} id={fieldId('branding-rating-value')} type="text" value={projectMetadata.ratingValue} placeholder="Custom rating label..." onChange={(event) => handleProjectMetadataChange('ratingValue', event.target.value)} />
      ) : (
        <select ref={valueControlRef} id={fieldId('branding-rating-value')} value={projectMetadata.ratingValue} onChange={(event) => handleProjectMetadataChange('ratingValue', event.target.value)}>
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

      <EditorMarkImageSourceControls
        idPrefix={idPrefix}
        sourceControlRef={sourceControlRef}
        source={projectRatingBadge.source}
        sourceLabel="Badge source"
        sourceSelectId="rating-badge-source"
        builtInOptionLabel="Built-in artwork"
        builtInHint="Using the built-in rating artwork."
        customImageLabel="Custom badge image"
        customImageDataUrl={projectRatingBadge.customImageDataUrl}
        customImageSize={projectRatingBadge.customImageSize}
        customActiveLabel="Custom rating badge active"
        uploadId="rating-badge-upload"
        uploadButtonLabel="Choose custom badge"
        emptyCustomHint="No custom badge image is selected yet. The built-in rating artwork is used when a rating system and value are set."
        clearCustomLabel="Clear custom badge"
        formatSize={formatLogoSize}
        onSourceChange={(source) =>
          handleRatingBadgeSourceChange(source as RatingBadgeSource)}
        onUpload={handleRatingBadgeUpload}
        onClearCustomImage={handleClearRatingBadgeImage}
      >
        {children}
      </EditorMarkImageSourceControls>
    </OptionalFeatureSection>
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
> & RatingBadgeControlRefs) {
  const sliderRanges = getRatingBadgeLayoutSliderRanges(
    {
      ...projectRatingBadge,
      metadata: props.projectMetadata,
    },
    selectedDiscTemplate,
  )
  const supplementalUskSliderRanges = getRatingBadgeLayoutSliderRanges(
    {
      source: 'placeholder',
      customImageSize: null,
      layout: projectRatingBadge.uskBadge.layout,
      metadata: {
        ratingSystem: 'USK',
        ratingValue: projectRatingBadge.uskBadge.ratingValue,
      },
    },
    selectedDiscTemplate,
  )
  const ratingBadgeScaleControlRange = getDiscPresetScaleControlRange({
    currentScale: projectRatingBadge.layout.scale,
    nominalMin: 0.25,
    nominalMax: 2,
  })

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

          <EditorStackedRangeField
            id="usk-rating-badge-scale"
            label="USK scale"
            min={0.25}
            max={2}
            step={0.01}
            value={projectRatingBadge.uskBadge.layout.scale}
            onInput={(value) =>
              handleSupplementalUskRatingBadgeLayoutChange('scale', value)}
            onChange={(value) =>
              handleSupplementalUskRatingBadgeLayoutChange('scale', value)}
          />
          <EditorStackedRangeField
            id="usk-rating-badge-x"
            label="USK X position"
            min={supplementalUskSliderRanges.x.min}
            max={supplementalUskSliderRanges.x.max}
            step={0.1}
            value={projectRatingBadge.uskBadge.layout.x}
            onInput={(value) =>
              handleSupplementalUskRatingBadgeLayoutChange('x', value)}
            onChange={(value) =>
              handleSupplementalUskRatingBadgeLayoutChange('x', value)}
          />
          <EditorStackedRangeField
            id="usk-rating-badge-y"
            label="USK Y position"
            min={supplementalUskSliderRanges.y.min}
            max={supplementalUskSliderRanges.y.max}
            step={0.1}
            value={projectRatingBadge.uskBadge.layout.y}
            onInput={(value) =>
              handleSupplementalUskRatingBadgeLayoutChange('y', value)}
            onChange={(value) =>
              handleSupplementalUskRatingBadgeLayoutChange('y', value)}
          />
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

      <EditorStackedRangeField
        id="rating-badge-scale"
        label="Scale"
        min={ratingBadgeScaleControlRange.min}
        max={ratingBadgeScaleControlRange.max}
        step={0.01}
        value={projectRatingBadge.layout.scale}
        onInput={(value) => handleRatingBadgeLayoutChange('scale', value)}
        onChange={(value) => handleRatingBadgeLayoutChange('scale', value)}
      />
      <EditorStackedRangeField
        id="rating-badge-x"
        label="X position"
        min={sliderRanges.x.min}
        max={sliderRanges.x.max}
        step={0.1}
        value={projectRatingBadge.layout.x}
        onInput={(value) => handleRatingBadgeLayoutChange('x', value)}
        onChange={(value) => handleRatingBadgeLayoutChange('x', value)}
      />
      <EditorStackedRangeField
        id="rating-badge-y"
        label="Y position"
        min={sliderRanges.y.min}
        max={sliderRanges.y.max}
        step={0.1}
        value={projectRatingBadge.layout.y}
        onInput={(value) => handleRatingBadgeLayoutChange('y', value)}
        onChange={(value) => handleRatingBadgeLayoutChange('y', value)}
      />
      <button className="secondary-button" type="button" onClick={handleResetRatingBadgeLayout}>Reset rating badge layout</button>
    </RatingBadgeSetupControls>
  )
}
