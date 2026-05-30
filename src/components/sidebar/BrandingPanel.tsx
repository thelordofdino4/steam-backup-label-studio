import { useState, type ChangeEvent } from 'react'
import type { SteamLogoPlacement } from '../../discText'
import {
  getLogoAssetLayoutSliderRanges,
  getMediaMarkLayoutSliderRanges,
  getPlatformMarkLayoutSliderRanges,
  getRatingBadgeLayoutSliderRanges,
  getTechnicalMarkLayoutSliderRanges,
} from '../../layout/discElementSafeZone'
import { RATING_BADGE_LAYOUT_PRESETS } from '../../layoutPresets'
import { MEDIA_MARK_OPTIONS, PLATFORM_MARK_OPTIONS, getEnabledPlatformMarkValues, getMediaMarkLabel, getPlatformMarkLabel, getPlatformMarkValuesForRemember, getPlatformMarkValuesForRestore, getProjectPlatformMarkAsset, getProjectPlatformMarkInference } from '../../project/projectMediaMark'
import { TECHNICAL_MARK_OPTIONS, getEnabledTechnicalMarkValues, getProjectTechnicalMarkAsset, getTechnicalMarkLabel, getTechnicalMarkValuesForRemember, getTechnicalMarkValuesForRestore } from '../../project/projectTechnicalMarks'
import { getActiveRatingSystemForBadge, getRatingMetadataForSystemChange, getRatingValuesForSystem } from '../../project/projectMetadata'
import type { LogoCandidateDiscoveryState } from '../../hooks/useLogoAssetDiscovery'
import type { BackgroundImageSize, GameRatingSystem, LogoAssetLayout, MediaMarkLayout, MediaMarkSource, MediaMarkValue, PlatformMarkLayout, PlatformMarkSource, PlatformMarkValue, ProjectAdditionalLogoAsset, ProjectLogoAssets, ProjectMediaMark, ProjectMetadata, ProjectPlatformMarks, ProjectRatingBadge, ProjectTechnicalMarks, RatingBadgeLayout, RatingBadgeSource, SteamBannerColors, SteamBannerLockupLayout, TechnicalMarkLayout, TechnicalMarkSource, TechnicalMarkValue } from '../../project/projectTypes'
import type { RemoteLogoCandidate } from '../../steam/steamLogoCandidates'
import { createSteamLogoPlacementMemory, getEnabledSteamLogoPlacement, getNextSteamLogoPlacementMemory } from '../../steamBanner'
import type { DiscTemplate } from '../../types/template'
import { PlusIcon } from './PanelIcons'
import { RepeatedVisualElementCard } from './RepeatedVisualElementCard'

export type BrandingPanelProps = {
  steamLogoPlacement: SteamLogoPlacement
  handleSteamLogoPlacementChange: (placement: SteamLogoPlacement) => void
  steamBannerLockupImageUrl: string | null
  steamBannerLockupImageSize: BackgroundImageSize | null
  steamBannerLockupLayout: SteamBannerLockupLayout
  steamBannerColors: SteamBannerColors
  projectLogoAssets: ProjectLogoAssets
  projectMetadata: ProjectMetadata
  projectRatingBadge: ProjectRatingBadge
  projectMediaMark: ProjectMediaMark
  projectPlatformMarks: ProjectPlatformMarks
  projectTechnicalMarks: ProjectTechnicalMarks
  selectedDiscTemplate: DiscTemplate
  handleProjectMetadataChange: (field: keyof ProjectMetadata, value: string) => void
  handleSteamBannerLockupUpload: (event: ChangeEvent<HTMLInputElement>) => void | Promise<void>
  handleClearSteamBannerLockup: () => void
  handleSteamBannerLockupLayoutChange: (field: keyof SteamBannerLockupLayout, value: number) => void
  handleResetSteamBannerLockupLayout: () => void
  handleSteamBannerColorChange: (field: keyof SteamBannerColors, value: string) => void
  handleResetSteamBannerColors: () => void
  handleLogoAssetUpload: (logoKey: 'developer' | 'publisher', event: ChangeEvent<HTMLInputElement>, additionalLogoId?: string) => void | Promise<void>
  logoCandidateDiscovery: LogoCandidateDiscoveryState
  handleFindLogoCandidates: (logoKey: 'developer' | 'publisher') => void | Promise<void>
  handleApplyLogoCandidate: (logoKey: 'developer' | 'publisher', candidate: RemoteLogoCandidate, additionalLogoId?: string) => void | Promise<void>
  handleLogoAssetLayoutChange: (logoKey: 'developer' | 'publisher', field: keyof LogoAssetLayout, value: boolean | number, additionalLogoId?: string) => void
  handleClearLogoAsset: (logoKey: 'developer' | 'publisher', additionalLogoId?: string) => void
  handleResetLogoAssetLayout: (logoKey: 'developer' | 'publisher', additionalLogoId?: string) => void
  handleAddAdditionalLogoAsset: (logoKey: 'developer' | 'publisher') => void
  handleAdditionalLogoAssetLabelChange: (logoKey: 'developer' | 'publisher', additionalLogoId: string, label: string) => void
  handleRemoveAdditionalLogoAsset: (logoKey: 'developer' | 'publisher', additionalLogoId: string) => void
  handleRatingBadgeUpload: (event: ChangeEvent<HTMLInputElement>) => void | Promise<void>
  handleRatingBadgeSourceChange: (source: RatingBadgeSource) => void
  handleRatingBadgeEnabledChange: (enabled: boolean) => void
  handleRatingBadgeLayoutChange: (field: keyof RatingBadgeLayout, value: boolean | number) => void
  handleClearRatingBadgeImage: () => void
  handleResetRatingBadgeLayout: () => void
  handleMediaMarkUpload: (event: ChangeEvent<HTMLInputElement>) => void | Promise<void>
  handleMediaMarkValueChange: (value: MediaMarkValue) => void
  handleMediaMarkSourceChange: (source: MediaMarkSource) => void
  handleMediaMarkLayoutChange: (field: keyof MediaMarkLayout, value: boolean | number) => void
  handleClearMediaMarkImage: () => void
  handleResetMediaMarkLayout: () => void
  handlePlatformMarkToggle: (value: PlatformMarkValue, enabled: boolean) => void
  handlePlatformMarkUpload: (value: PlatformMarkValue, event: ChangeEvent<HTMLInputElement>) => void | Promise<void>
  handlePlatformMarkSourceChange: (value: PlatformMarkValue, source: PlatformMarkSource) => void
  handlePlatformMarkLayoutChange: (platformValue: PlatformMarkValue, field: keyof PlatformMarkLayout, layoutValue: boolean | number) => void
  handleClearPlatformMarkImage: (value: PlatformMarkValue) => void
  handleResetPlatformMarkLayout: (value: PlatformMarkValue) => void
  handleTechnicalMarkToggle: (value: TechnicalMarkValue, enabled: boolean) => void
  handleTechnicalMarkUpload: (value: TechnicalMarkValue, event: ChangeEvent<HTMLInputElement>) => void | Promise<void>
  handleTechnicalMarkSourceChange: (value: TechnicalMarkValue, source: TechnicalMarkSource) => void
  handleTechnicalMarkLayoutChange: (technicalValue: TechnicalMarkValue, field: keyof TechnicalMarkLayout, layoutValue: boolean | number) => void
  handleTechnicalMarkLabelChange: (value: TechnicalMarkValue, label: string) => void
  handleClearTechnicalMarkImage: (value: TechnicalMarkValue) => void
  handleResetTechnicalMarkLayout: (value: TechnicalMarkValue) => void
}

type LogoKey = 'developer' | 'publisher'

const LOGO_ALIGNMENT_PRESETS = [
  { label: 'Top left', x: 22, y: 22 },
  { label: 'Top center', x: 50, y: 22 },
  { label: 'Top right', x: 78, y: 22 },
  { label: 'Left center', x: 22, y: 50 },
  { label: 'Right center', x: 78, y: 50 },
  { label: 'Bottom left', x: 22, y: 78 },
  { label: 'Bottom center', x: 50, y: 78 },
  { label: 'Bottom right', x: 78, y: 78 },
  { label: 'Stacked left upper', x: 22, y: 62 },
  { label: 'Stacked left lower', x: 22, y: 72 },
  { label: 'Stacked right upper', x: 78, y: 62 },
  { label: 'Stacked right lower', x: 78, y: 72 },
] as const

function formatLogoSize(size: BackgroundImageSize | null) {
  return size ? ` · ${size.width}×${size.height}` : ''
}

function getNumericInputValue(event: { currentTarget: HTMLInputElement }) {
  return Number(event.currentTarget.value)
}

function formatSourceKind(sourceKind: RemoteLogoCandidate['sourceKind']) {
  switch (sourceKind) {
    case 'steam-avatar':
      return 'Steam avatar'
    case 'steam-meta-image':
      return 'Steam metadata'
    case 'steam-img':
      return 'Steam image'
    case 'official-img':
      return 'Official image'
    case 'official-srcset':
      return 'Official srcset'
    case 'official-css-background':
      return 'Official CSS'
    case 'official-meta-image':
      return 'Official metadata'
    case 'favicon':
      return 'Favicon'
  }
}

function getSourceBadgeClass(sourceKind: RemoteLogoCandidate['sourceKind']) {
  return sourceKind.startsWith('steam-') ? 'logo-candidate-source-steam' : 'logo-candidate-source-official'
}

function formatCandidateDimensions(candidate: RemoteLogoCandidate) {
  return candidate.width && candidate.height ? ` · ${candidate.width}x${candidate.height}` : ''
}

function formatCandidateSourceStatus(discovery: LogoCandidateDiscoveryState[LogoKey]) {
  if (discovery.sourceStatuses.length === 0) return null

  return (
    <div className="logo-candidate-source-status-list">
      {discovery.sourceStatuses.map((sourceStatus) => (
        <p className="hint logo-candidate-source-status" key={`${sourceStatus.source}-${sourceStatus.label}`}>
          <strong>{sourceStatus.label}:</strong>{' '}
          {sourceStatus.status === 'searched'
            ? `${sourceStatus.candidateCount ?? 0} candidate${sourceStatus.candidateCount === 1 ? '' : 's'}`
            : sourceStatus.status === 'unavailable'
              ? 'not available'
              : 'blocked or unavailable'}
          {sourceStatus.detail ? ` · ${sourceStatus.detail}` : ''}
        </p>
      ))}
    </div>
  )
}

function LogoCandidateList({
  logoKey,
  label,
  discovery,
  handleFindLogoCandidates,
  handleApplyLogoCandidate,
}: {
  logoKey: LogoKey
  label: string
  discovery: LogoCandidateDiscoveryState[LogoKey]
  handleFindLogoCandidates: (logoKey: LogoKey) => void | Promise<void>
  handleApplyLogoCandidate: (candidate: RemoteLogoCandidate) => void | Promise<void>
}) {
  return (
    <div className="logo-candidate-discovery">
      <button
        className="secondary-button"
        type="button"
        disabled={discovery.isLoading || discovery.isApplying}
        onClick={() => handleFindLogoCandidates(logoKey)}
      >
        {discovery.isLoading ? 'Finding logo candidates...' : 'Find logo candidates'}
      </button>

      <p className="hint">
        Searches Steam fallback pages and best-effort official-site HTML/CSS for logo candidates. Manual upload remains the reliable fallback.
      </p>

      {discovery.error ? <p className="hint logo-candidate-error">{discovery.error}</p> : null}
      {formatCandidateSourceStatus(discovery)}

      {!discovery.isLoading && discovery.lastSearchedLabel && discovery.candidates.length === 0 && !discovery.error ? (
        <p className="hint">No logo candidates found for {discovery.lastSearchedLabel}. Manual upload is still available.</p>
      ) : null}

      {discovery.candidates.length > 0 ? (
        <div className="logo-candidate-list">
          {discovery.candidates.map((candidate) => (
            <div className="logo-candidate-row" key={candidate.id}>
              <img className="logo-candidate-preview" src={candidate.previewUrl ?? candidate.url} alt={candidate.alt ?? candidate.label} draggable={false} />
              <div className="logo-candidate-details">
                <span className="logo-candidate-title">{candidate.label}</span>
                <span className="logo-candidate-meta">
                  <span className={`logo-candidate-source-badge ${getSourceBadgeClass(candidate.sourceKind)}`}>{formatSourceKind(candidate.sourceKind)}</span>
                  {' '}{candidate.fileType.toUpperCase()} · score {candidate.score}{formatCandidateDimensions(candidate)}
                </span>
                {candidate.selector ? <span className="logo-candidate-selector">{candidate.selector}</span> : null}
                <span className="logo-candidate-reasons">{candidate.reasons.slice(0, 4).join(', ')}</span>
                <button
                  className="secondary-button"
                  type="button"
                  disabled={discovery.isApplying}
                  onClick={() => handleApplyLogoCandidate(candidate)}
                >
                  {discovery.isApplying ? 'Importing candidate...' : `Use as ${label.toLowerCase()} logo`}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function SteamBannerControls({
  steamLogoPlacement,
  steamBannerLockupImageUrl,
  steamBannerLockupLayout,
  steamBannerColors,
  handleSteamLogoPlacementChange,
  handleSteamBannerLockupUpload,
  handleClearSteamBannerLockup,
  handleSteamBannerLockupLayoutChange,
  handleResetSteamBannerLockupLayout,
  handleSteamBannerColorChange,
  handleResetSteamBannerColors,
}: Pick<
  BrandingPanelProps,
  | 'steamLogoPlacement'
  | 'steamBannerLockupImageUrl'
  | 'steamBannerLockupLayout'
  | 'steamBannerColors'
  | 'handleSteamLogoPlacementChange'
  | 'handleSteamBannerLockupUpload'
  | 'handleClearSteamBannerLockup'
  | 'handleSteamBannerLockupLayoutChange'
  | 'handleResetSteamBannerLockupLayout'
  | 'handleSteamBannerColorChange'
  | 'handleResetSteamBannerColors'
>) {
  const isEnabled = steamLogoPlacement !== 'none'
  const [lastPlacement, setLastPlacement] = useState<SteamLogoPlacement>(
    createSteamLogoPlacementMemory(steamLogoPlacement),
  )

  const toggleEnabled = (enabled: boolean) => {
    if (enabled) {
      handleSteamLogoPlacementChange(getEnabledSteamLogoPlacement(lastPlacement))
      return
    }

    setLastPlacement(getNextSteamLogoPlacementMemory(lastPlacement, steamLogoPlacement))
    handleSteamLogoPlacementChange('none')
  }

  const updatePlacement = (placement: SteamLogoPlacement) => {
    setLastPlacement(getNextSteamLogoPlacementMemory(lastPlacement, placement))
    handleSteamLogoPlacementChange(placement)
  }

  return (
    <div className="branding-feature-card">
      <label className="field-label">
        <input type="checkbox" checked={isEnabled} onChange={(event) => toggleEnabled(event.target.checked)} />
        Show Steam banner
      </label>

      {!isEnabled ? null : (
        <>
          <label className="field-label spacing-top" htmlFor="steam-logo-placement">Placement</label>
          <select id="steam-logo-placement" value={steamLogoPlacement} onChange={(event) => updatePlacement(event.target.value as SteamLogoPlacement)}>
            <option value="top">Top center</option>
            <option value="bottom">Bottom center</option>
          </select>

          <label className="field-label spacing-top" htmlFor="steam-banner-gradient-start">Gradient start</label>
          <input id="steam-banner-gradient-start" type="color" value={steamBannerColors.gradientStart} onChange={(event) => handleSteamBannerColorChange('gradientStart', event.target.value)} />

          <label className="field-label spacing-top" htmlFor="steam-banner-gradient-end">Gradient end</label>
          <input id="steam-banner-gradient-end" type="color" value={steamBannerColors.gradientEnd} onChange={(event) => handleSteamBannerColorChange('gradientEnd', event.target.value)} />

          <label className="field-label spacing-top" htmlFor="steam-banner-accent">Accent strip</label>
          <input id="steam-banner-accent" type="color" value={steamBannerColors.accent} onChange={(event) => handleSteamBannerColorChange('accent', event.target.value)} />

          <span className="field-label spacing-top">Banner lockup image</span>
          <label className="secondary-button logo-upload-button" htmlFor="steam-banner-lockup-upload">Choose banner lockup image</label>
          <input id="steam-banner-lockup-upload" className="logo-file-input" type="file" accept="image/*" onChange={handleSteamBannerLockupUpload} />

          {!steamBannerLockupImageUrl && (
            <p className="hint">Using the bundled default Steam banner lockup image. Upload a PNG to override it.</p>
          )}

          <label className="field-label spacing-top" htmlFor="steam-banner-lockup-scale">Lockup scale</label>
          <input id="steam-banner-lockup-scale" type="range" min="0.5" max="1.5" step="0.01" value={steamBannerLockupLayout.scale} onChange={(event) => handleSteamBannerLockupLayoutChange('scale', Number(event.target.value))} />

          <label className="field-label spacing-top" htmlFor="steam-banner-lockup-offset-x">Lockup X offset</label>
          <input id="steam-banner-lockup-offset-x" type="range" min="-20" max="20" step="0.1" value={steamBannerLockupLayout.offsetX} onChange={(event) => handleSteamBannerLockupLayoutChange('offsetX', Number(event.target.value))} />

          <label className="field-label spacing-top" htmlFor="steam-banner-lockup-offset-y">Lockup Y offset</label>
          <input id="steam-banner-lockup-offset-y" type="range" min="-20" max="20" step="0.1" value={steamBannerLockupLayout.offsetY} onChange={(event) => handleSteamBannerLockupLayoutChange('offsetY', Number(event.target.value))} />

          {steamBannerLockupImageUrl && <button className="secondary-button" type="button" onClick={handleClearSteamBannerLockup}>Reset to default lockup</button>}
          <button className="secondary-button" type="button" onClick={handleResetSteamBannerColors}>Reset banner colors</button>
          <button className="secondary-button" type="button" onClick={handleResetSteamBannerLockupLayout}>Reset lockup layout</button>
        </>
      )}
    </div>
  )
}

function LogoAssetControlBody({
  logoKey,
  label,
  imageDataUrl,
  imageSize,
  layout,
  uploadId,
  controlIdPrefix,
  additionalLogoId,
  selectedDiscTemplate,
  handleLogoAssetUpload,
  logoCandidateDiscovery,
  handleFindLogoCandidates,
  handleApplyLogoCandidate,
  handleLogoAssetLayoutChange,
  handleClearLogoAsset,
  handleResetLogoAssetLayout,
}: Pick<BrandingPanelProps, 'selectedDiscTemplate' | 'handleLogoAssetUpload' | 'logoCandidateDiscovery' | 'handleFindLogoCandidates' | 'handleApplyLogoCandidate' | 'handleLogoAssetLayoutChange' | 'handleClearLogoAsset' | 'handleResetLogoAssetLayout'> & { logoKey: LogoKey; label: string; imageDataUrl: string | null; imageSize: BackgroundImageSize | null; layout: LogoAssetLayout; uploadId: string; controlIdPrefix: string; additionalLogoId?: string }) {
  const hasLogoImage = Boolean(imageDataUrl)
  const sliderRanges = getLogoAssetLayoutSliderRanges(
    layout,
    selectedDiscTemplate,
    imageSize,
  )
  const updateLayout = (field: keyof LogoAssetLayout, value: boolean | number) =>
    handleLogoAssetLayoutChange(logoKey, field, value, additionalLogoId)

  return (
    <>
      <label className="secondary-button logo-upload-button" htmlFor={uploadId}>{hasLogoImage ? `Replace ${label.toLowerCase()} logo` : `Choose ${label.toLowerCase()} logo`}</label>
      <input id={uploadId} className="logo-file-input" type="file" accept="image/*" onChange={(event) => handleLogoAssetUpload(logoKey, event, additionalLogoId)} />

      <LogoCandidateList
        logoKey={logoKey}
        label={label}
        discovery={logoCandidateDiscovery[logoKey]}
        handleFindLogoCandidates={handleFindLogoCandidates}
        handleApplyLogoCandidate={(candidate) =>
          handleApplyLogoCandidate(logoKey, candidate, additionalLogoId)}
      />

      {hasLogoImage ? (
        <div className="selected-lockup-card logo-asset-status-card">
          <img className="logo-asset-preview" src={imageDataUrl ?? undefined} alt="" draggable={false} />
          <span>{label} logo active{formatLogoSize(imageSize)}</span>
        </div>
      ) : (
        <p className="hint">No {label.toLowerCase()} logo image is selected yet. A bundled generic logo is shown for placement; upload an image before export to render your actual logo.</p>
      )}

      <label className="field-label spacing-top" htmlFor={`${controlIdPrefix}-alignment-preset`}>Align logo</label>
      <select id={`${controlIdPrefix}-alignment-preset`} defaultValue="" onChange={(event) => {
        const preset = LOGO_ALIGNMENT_PRESETS.find((candidate) => candidate.label === event.target.value)
        if (!preset) return
        updateLayout('x', preset.x)
        updateLayout('y', preset.y)
        event.currentTarget.value = ''
      }}>
        <option value="">Choose preset...</option>
        {LOGO_ALIGNMENT_PRESETS.map((preset) => <option key={preset.label} value={preset.label}>{preset.label}</option>)}
      </select>

      <label className="field-label spacing-top" htmlFor={`${controlIdPrefix}-scale`}>Scale</label>
      <input id={`${controlIdPrefix}-scale`} type="range" min="0.25" max="2" step="0.01" value={layout.scale} onChange={(event) => updateLayout('scale', Number(event.target.value))} />

      <label className="field-label spacing-top" htmlFor={`${controlIdPrefix}-x`}>X position</label>
      <input id={`${controlIdPrefix}-x`} type="range" min={sliderRanges.x.min} max={sliderRanges.x.max} step="0.1" value={layout.x} onChange={(event) => updateLayout('x', Number(event.target.value))} />

      <label className="field-label spacing-top" htmlFor={`${controlIdPrefix}-y`}>Y position</label>
      <input id={`${controlIdPrefix}-y`} type="range" min={sliderRanges.y.min} max={sliderRanges.y.max} step="0.1" value={layout.y} onChange={(event) => updateLayout('y', Number(event.target.value))} />

      <button className="secondary-button" type="button" onClick={() => handleResetLogoAssetLayout(logoKey, additionalLogoId)}>Reset logo layout</button>
      {hasLogoImage && <button className="secondary-button" type="button" onClick={() => handleClearLogoAsset(logoKey, additionalLogoId)}>Clear logo</button>}
    </>
  )
}

function AdditionalLogoAssetControls({
  logoKey,
  label,
  logoAsset,
  additionalLogoIndex,
  handleLogoAssetLayoutChange,
  handleAdditionalLogoAssetLabelChange,
  handleRemoveAdditionalLogoAsset,
  ...props
}: Pick<BrandingPanelProps, 'selectedDiscTemplate' | 'handleLogoAssetUpload' | 'logoCandidateDiscovery' | 'handleFindLogoCandidates' | 'handleApplyLogoCandidate' | 'handleLogoAssetLayoutChange' | 'handleClearLogoAsset' | 'handleResetLogoAssetLayout' | 'handleAdditionalLogoAssetLabelChange' | 'handleRemoveAdditionalLogoAsset'> & { logoKey: LogoKey; label: string; logoAsset: ProjectAdditionalLogoAsset; additionalLogoIndex: number }) {
  const uploadId = `${logoKey}-additional-logo-${additionalLogoIndex + 1}`
  const additionalLabel = `Additional ${label.toLowerCase()}`
  const deleteLabel = `Delete ${additionalLabel} logo`
  const summary = [
    logoAsset.layout.enabled ? 'shown' : 'hidden',
    logoAsset.imageDataUrl ? 'custom image' : 'bundled generic',
    `scale ${logoAsset.layout.scale.toFixed(2)}`,
  ].join(' · ')

  return (
    <RepeatedVisualElementCard
      title={`${additionalLabel} ${additionalLogoIndex + 1}`}
      label={logoAsset.label}
      labelInputId={`${uploadId}-label`}
      enabled={logoAsset.layout.enabled}
      enableLabel={`Show ${additionalLabel} logo`}
      summary={summary}
      deleteLabel={deleteLabel}
      onEnabledChange={(enabled) =>
        handleLogoAssetLayoutChange(logoKey, 'enabled', enabled, logoAsset.id)}
      onLabelChange={(nextLabel) =>
        handleAdditionalLogoAssetLabelChange(logoKey, logoAsset.id, nextLabel)}
      onDelete={() => handleRemoveAdditionalLogoAsset(logoKey, logoAsset.id)}
    >
        <LogoAssetControlBody
          {...props}
          logoKey={logoKey}
          label={additionalLabel}
          imageDataUrl={logoAsset.imageDataUrl}
          imageSize={logoAsset.imageSize}
          layout={logoAsset.layout}
          uploadId={uploadId}
          controlIdPrefix={uploadId}
          additionalLogoId={logoAsset.id}
          handleLogoAssetLayoutChange={handleLogoAssetLayoutChange}
        />
    </RepeatedVisualElementCard>
  )
}

function LogoAssetControls({ logoKey, label, imageDataUrl, imageSize, layout, projectLogoAssets, handleLogoAssetLayoutChange, handleAddAdditionalLogoAsset, ...props }: Pick<BrandingPanelProps, 'selectedDiscTemplate' | 'projectLogoAssets' | 'handleLogoAssetUpload' | 'logoCandidateDiscovery' | 'handleFindLogoCandidates' | 'handleApplyLogoCandidate' | 'handleLogoAssetLayoutChange' | 'handleClearLogoAsset' | 'handleResetLogoAssetLayout' | 'handleAddAdditionalLogoAsset' | 'handleAdditionalLogoAssetLabelChange' | 'handleRemoveAdditionalLogoAsset'> & { logoKey: LogoKey; label: string; imageDataUrl: string | null; imageSize: BackgroundImageSize | null; layout: LogoAssetLayout }) {
  const uploadId = `${logoKey}-logo-upload`
  const additionalLogos = logoKey === 'developer'
    ? projectLogoAssets.additionalDeveloperLogos
    : projectLogoAssets.additionalPublisherLogos

  return (
    <div className="logo-asset-card">
      <label className="field-label">
        <input type="checkbox" checked={layout.enabled} onChange={(event) => handleLogoAssetLayoutChange(logoKey, 'enabled', event.target.checked)} />
        Show {label.toLowerCase()} logo
      </label>

      {!layout.enabled ? null : (
        <>
          <LogoAssetControlBody
            {...props}
            logoKey={logoKey}
            label={label}
            imageDataUrl={imageDataUrl}
            imageSize={imageSize}
            layout={layout}
            uploadId={uploadId}
            controlIdPrefix={`${logoKey}-logo`}
            handleLogoAssetLayoutChange={handleLogoAssetLayoutChange}
          />

          {additionalLogos.map((logoAsset, index) => (
            <AdditionalLogoAssetControls
              key={logoAsset.id}
              {...props}
              logoKey={logoKey}
              label={label}
              logoAsset={logoAsset}
              additionalLogoIndex={index}
              handleLogoAssetLayoutChange={handleLogoAssetLayoutChange}
            />
          ))}

          <button
            className="secondary-button icon-text-button"
            type="button"
            onClick={() => handleAddAdditionalLogoAsset(logoKey)}
          >
            <PlusIcon />
            <span>Add additional logo</span>
          </button>
        </>
      )}
    </div>
  )
}

function RatingBadgeControls({ projectMetadata, projectRatingBadge, selectedDiscTemplate, handleProjectMetadataChange, handleRatingBadgeUpload, handleRatingBadgeSourceChange, handleRatingBadgeEnabledChange, handleRatingBadgeLayoutChange, handleClearRatingBadgeImage, handleResetRatingBadgeLayout }: Pick<BrandingPanelProps, 'projectMetadata' | 'projectRatingBadge' | 'selectedDiscTemplate' | 'handleProjectMetadataChange' | 'handleRatingBadgeUpload' | 'handleRatingBadgeSourceChange' | 'handleRatingBadgeEnabledChange' | 'handleRatingBadgeLayoutChange' | 'handleClearRatingBadgeImage' | 'handleResetRatingBadgeLayout'>) {
  const isBadgeEnabled = projectRatingBadge.layout.enabled
  const activeRatingSystem = getActiveRatingSystemForBadge(projectMetadata.ratingSystem)
  const hasRatingValue = projectMetadata.ratingValue.trim().length > 0
  const ratingLabel = projectMetadata.ratingSystem === 'none' ? 'No rating selected' : `${projectMetadata.ratingSystem}${hasRatingValue ? ` ${projectMetadata.ratingValue}` : ''}`
  const isCustomBadgeSource = projectRatingBadge.source === 'custom'
  const sliderRanges = getRatingBadgeLayoutSliderRanges(
    projectRatingBadge,
    selectedDiscTemplate,
  )

  const applyRatingBadgePreset = (presetId: string) => {
    const preset = RATING_BADGE_LAYOUT_PRESETS.find((candidate) => candidate.id === presetId)
    if (!preset) return
    handleRatingBadgeLayoutChange('x', preset.x)
    handleRatingBadgeLayoutChange('y', preset.y)
    handleRatingBadgeLayoutChange('scale', preset.scale)
  }

  return (
    <div className="logo-asset-card">
      <label className="field-label"><input type="checkbox" checked={isBadgeEnabled} onChange={(event) => handleRatingBadgeEnabledChange(event.target.checked)} /> Show rating badge</label>
      {!isBadgeEnabled ? null : (
        <>
          <label className="field-label spacing-top" htmlFor="branding-rating-system">Rating system</label>
          <select id="branding-rating-system" value={activeRatingSystem} onChange={(event) => {
            const nextSystem = event.target.value as GameRatingSystem
            const nextMetadata = getRatingMetadataForSystemChange(projectMetadata, nextSystem)
            handleProjectMetadataChange('ratingSystem', nextMetadata.ratingSystem)
            handleProjectMetadataChange('ratingValue', nextMetadata.ratingValue)
          }}>
            <option value="ESRB">ESRB</option>
            <option value="PEGI">PEGI</option>
            <option value="custom">Custom</option>
          </select>

          <label className="field-label spacing-top" htmlFor="branding-rating-value">Rating value</label>
          {activeRatingSystem === 'custom' ? (
            <input id="branding-rating-value" type="text" value={projectMetadata.ratingValue} placeholder="Custom rating label..." onChange={(event) => handleProjectMetadataChange('ratingValue', event.target.value)} />
          ) : (
            <select id="branding-rating-value" value={projectMetadata.ratingValue} onChange={(event) => handleProjectMetadataChange('ratingValue', event.target.value)}>
              {getRatingValuesForSystem(activeRatingSystem).map((value) => <option key={value} value={value}>{activeRatingSystem === 'PEGI' ? `PEGI ${value}` : value}</option>)}
            </select>
          )}

          <p className="hint">Current metadata rating: {ratingLabel}. Rating values are manual for now.</p>
          {projectMetadata.ratingSystem === 'none' && (
            <p className="hint">No rating badge will render while the rating system is set to None.</p>
          )}
          {projectMetadata.ratingSystem !== 'none' && !hasRatingValue && (
            <p className="hint">Choose a rating value so the enabled badge has meaningful text.</p>
          )}

          <label className="field-label spacing-top" htmlFor="rating-badge-source">Badge source</label>
          <select id="rating-badge-source" value={projectRatingBadge.source} onChange={(event) => handleRatingBadgeSourceChange(event.target.value as RatingBadgeSource)}>
            <option value="placeholder">Built-in generic</option>
            <option value="custom">Custom image</option>
          </select>

          {isCustomBadgeSource ? (
            <>
              <span className="field-label spacing-top">Custom badge image</span>
              <label className="secondary-button logo-upload-button" htmlFor="rating-badge-upload">Choose custom badge</label>
              <input id="rating-badge-upload" className="logo-file-input" type="file" accept="image/*" onChange={handleRatingBadgeUpload} />

              {projectRatingBadge.customImageDataUrl ? (
                <div className="selected-lockup-card logo-asset-status-card">
                  <img className="logo-asset-preview" src={projectRatingBadge.customImageDataUrl} alt="" draggable={false} />
                  <span>Custom rating badge active{formatLogoSize(projectRatingBadge.customImageSize)}</span>
                </div>
              ) : <p className="hint">No custom badge image is selected yet. The bundled generic badge is used when a rating system and value are set.</p>}
            </>
          ) : <p className="hint">Using the built-in generic badge.</p>}

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
          {isCustomBadgeSource && projectRatingBadge.customImageDataUrl && <button className="secondary-button" type="button" onClick={handleClearRatingBadgeImage}>Clear custom badge</button>}
        </>
      )}
    </div>
  )
}

function MediaMarkControls({ projectMediaMark, selectedDiscTemplate, handleMediaMarkUpload, handleMediaMarkValueChange, handleMediaMarkSourceChange, handleMediaMarkLayoutChange, handleClearMediaMarkImage, handleResetMediaMarkLayout }: Pick<BrandingPanelProps, 'projectMediaMark' | 'selectedDiscTemplate' | 'handleMediaMarkUpload' | 'handleMediaMarkValueChange' | 'handleMediaMarkSourceChange' | 'handleMediaMarkLayoutChange' | 'handleClearMediaMarkImage' | 'handleResetMediaMarkLayout'>) {
  const isEnabled = projectMediaMark.layout.enabled
  const isCustomMediaMarkSource = projectMediaMark.source === 'custom'
  const sliderRanges = getMediaMarkLayoutSliderRanges(
    projectMediaMark,
    selectedDiscTemplate,
  )
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
          <label className="field-label spacing-top" htmlFor="media-mark-scale">Scale</label>
          <input id="media-mark-scale" type="range" min="0.25" max="2" step="0.01" value={projectMediaMark.layout.scale} onInput={(event) => handleMediaMarkLayoutChange('scale', getNumericInputValue(event))} onChange={(event) => handleMediaMarkLayoutChange('scale', getNumericInputValue(event))} />
          <label className="field-label spacing-top" htmlFor="media-mark-x">X position</label>
          <input id="media-mark-x" type="range" min={sliderRanges.x.min} max={sliderRanges.x.max} step="0.1" value={projectMediaMark.layout.x} onInput={(event) => handleMediaMarkLayoutChange('x', getNumericInputValue(event))} onChange={(event) => handleMediaMarkLayoutChange('x', getNumericInputValue(event))} />
          <label className="field-label spacing-top" htmlFor="media-mark-y">Y position</label>
          <input id="media-mark-y" type="range" min={sliderRanges.y.min} max={sliderRanges.y.max} step="0.1" value={projectMediaMark.layout.y} onInput={(event) => handleMediaMarkLayoutChange('y', getNumericInputValue(event))} onChange={(event) => handleMediaMarkLayoutChange('y', getNumericInputValue(event))} />
          <button className="secondary-button" type="button" onClick={handleResetMediaMarkLayout}>Reset media mark layout</button>
          {isCustomMediaMarkSource && projectMediaMark.customImageDataUrl && <button className="secondary-button" type="button" onClick={handleClearMediaMarkImage}>Clear custom mark</button>}
        </>
      )}
    </div>
  )
}

function PlatformMarkControls({ projectPlatformMarks, selectedDiscTemplate, handlePlatformMarkToggle, handlePlatformMarkUpload, handlePlatformMarkSourceChange, handlePlatformMarkLayoutChange, handleClearPlatformMarkImage, handleResetPlatformMarkLayout }: Pick<BrandingPanelProps, 'projectPlatformMarks' | 'selectedDiscTemplate' | 'handlePlatformMarkToggle' | 'handlePlatformMarkUpload' | 'handlePlatformMarkSourceChange' | 'handlePlatformMarkLayoutChange' | 'handleClearPlatformMarkImage' | 'handleResetPlatformMarkLayout'>) {
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

function TechnicalMarkControls({ projectTechnicalMarks, selectedDiscTemplate, handleTechnicalMarkToggle, handleTechnicalMarkUpload, handleTechnicalMarkSourceChange, handleTechnicalMarkLayoutChange, handleTechnicalMarkLabelChange, handleClearTechnicalMarkImage, handleResetTechnicalMarkLayout }: Pick<BrandingPanelProps, 'projectTechnicalMarks' | 'selectedDiscTemplate' | 'handleTechnicalMarkToggle' | 'handleTechnicalMarkUpload' | 'handleTechnicalMarkSourceChange' | 'handleTechnicalMarkLayoutChange' | 'handleTechnicalMarkLabelChange' | 'handleClearTechnicalMarkImage' | 'handleResetTechnicalMarkLayout'>) {
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
            const uploadId = `technical-mark-upload-${value}`
            const isCustomTechnicalMarkSource = asset.source === 'custom'
            const sliderRanges = getTechnicalMarkLayoutSliderRanges(
              asset,
              selectedDiscTemplate,
            )
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
                labelInputId={`technical-mark-label-${value}`}
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
                <label className="field-label spacing-top" htmlFor={`technical-mark-source-${value}`}>Mark source</label>
                <select id={`technical-mark-source-${value}`} value={asset.source} onChange={(event) => handleTechnicalMarkSourceChange(value, event.target.value as TechnicalMarkSource)}>
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
                <label className="field-label spacing-top" htmlFor={`technical-mark-scale-${value}`}>Scale</label>
                <input id={`technical-mark-scale-${value}`} type="range" min="0.25" max="2" step="0.01" value={asset.layout.scale} onInput={(event) => handleTechnicalMarkLayoutChange(value, 'scale', getNumericInputValue(event))} onChange={(event) => handleTechnicalMarkLayoutChange(value, 'scale', getNumericInputValue(event))} />
                <label className="field-label spacing-top" htmlFor={`technical-mark-x-${value}`}>X position</label>
                <input id={`technical-mark-x-${value}`} type="range" min={sliderRanges.x.min} max={sliderRanges.x.max} step="0.1" value={asset.layout.x} onInput={(event) => handleTechnicalMarkLayoutChange(value, 'x', getNumericInputValue(event))} onChange={(event) => handleTechnicalMarkLayoutChange(value, 'x', getNumericInputValue(event))} />
                <label className="field-label spacing-top" htmlFor={`technical-mark-y-${value}`}>Y position</label>
                <input id={`technical-mark-y-${value}`} type="range" min={sliderRanges.y.min} max={sliderRanges.y.max} step="0.1" value={asset.layout.y} onInput={(event) => handleTechnicalMarkLayoutChange(value, 'y', getNumericInputValue(event))} onChange={(event) => handleTechnicalMarkLayoutChange(value, 'y', getNumericInputValue(event))} />
                <button className="secondary-button" type="button" onClick={() => handleResetTechnicalMarkLayout(value)}>Reset {label} layout</button>
                {isCustomTechnicalMarkSource && asset.customImageDataUrl && <button className="secondary-button" type="button" onClick={() => handleClearTechnicalMarkImage(value)}>Clear custom {label}</button>}
              </RepeatedVisualElementCard>
            )
          })}
        </>
      )}
    </div>
  )
}

export function BrandingPanel(props: BrandingPanelProps) {
  const { projectLogoAssets } = props
  return (
    <details className="panel collapsible-panel">
      <summary className="panel-summary">Branding</summary>
      <div className="panel-content">
        <SteamBannerControls {...props} />
        <details className="branding-feature-card metadata-details collapsible-panel spacing-top">
          <summary className="panel-summary">Developer / publisher logos</summary>
          <div className="panel-content">
            <LogoAssetControls logoKey="developer" label="Developer" imageDataUrl={projectLogoAssets.developerLogoDataUrl} imageSize={projectLogoAssets.developerLogoSize} layout={projectLogoAssets.developerLogoLayout} {...props} />
            <LogoAssetControls logoKey="publisher" label="Publisher" imageDataUrl={projectLogoAssets.publisherLogoDataUrl} imageSize={projectLogoAssets.publisherLogoSize} layout={projectLogoAssets.publisherLogoLayout} {...props} />
          </div>
        </details>
        <details className="branding-feature-card metadata-details collapsible-panel spacing-top"><summary className="panel-summary">Rating badge</summary><div className="panel-content"><RatingBadgeControls {...props} /></div></details>
        <details className="branding-feature-card metadata-details collapsible-panel spacing-top"><summary className="panel-summary">Media format mark</summary><div className="panel-content"><MediaMarkControls {...props} /></div></details>
        <details className="branding-feature-card metadata-details collapsible-panel spacing-top"><summary className="panel-summary">Operating system marks</summary><div className="panel-content"><PlatformMarkControls {...props} /></div></details>
        <details className="branding-feature-card metadata-details collapsible-panel spacing-top"><summary className="panel-summary">Technical marks</summary><div className="panel-content"><TechnicalMarkControls {...props} /></div></details>
      </div>
    </details>
  )
}
