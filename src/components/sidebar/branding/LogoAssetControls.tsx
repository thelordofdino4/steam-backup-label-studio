import { useCallback, useMemo } from 'react'
import { getLogoAssetLayoutSliderRanges } from '../../../layout/discElementSafeZone'
import { getProjectImageAssetStatus } from '../../../project/projectAssetStatus'
import { getLogoAssetSource } from '../../../project/projectLogoAssets'
import type {
  BackgroundImageSize,
  LogoAssetLayout,
  ProjectAdditionalLogoAsset,
  ProjectImageAssetProvenance,
} from '../../../project/projectTypes'
import type { RemoteLogoCandidate } from '../../../steam/steamLogoCandidates'
import {
  ImageCandidatePreviewPicker,
  type ImageCandidatePickerItem,
} from '../ImageCandidatePicker'
import { PlusIcon } from '../PanelIcons'
import { RepeatedVisualElementCard } from '../RepeatedVisualElementCard'
import { formatLogoSize } from './helpers'
import type { BrandingPanelProps, LogoKey } from './types'

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

function formatCandidateDimensions(candidate: RemoteLogoCandidate) {
  return candidate.width && candidate.height ? ` · ${candidate.width}x${candidate.height}` : ''
}

function createLogoCandidatePickerItems(
  candidates: RemoteLogoCandidate[],
): ImageCandidatePickerItem[] {
  return candidates.map((candidate) => ({
    id: candidate.id,
    title: candidate.label,
    subtitle: `${formatSourceKind(candidate.sourceKind)} · ${candidate.fileType.toUpperCase()} · score ${candidate.score}${formatCandidateDimensions(candidate)}`,
    details: [
      ...(candidate.selector ? [`Selector: ${candidate.selector}`] : []),
      ...candidate.reasons.slice(0, 3),
    ],
    imageUrl: candidate.previewUrl ?? candidate.url,
    imageFit: 'contain',
  }))
}

function formatCandidateSourceStatus(
  discovery: BrandingPanelProps['logoCandidateDiscovery'][LogoKey],
) {
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
  discovery: BrandingPanelProps['logoCandidateDiscovery'][LogoKey]
  handleFindLogoCandidates: (logoKey: LogoKey) => void | Promise<void>
  handleApplyLogoCandidate: (candidate: RemoteLogoCandidate) => void | Promise<void>
}) {
  const pickerItems = useMemo(
    () => createLogoCandidatePickerItems(discovery.candidates),
    [discovery.candidates],
  )
  const selectLogoCandidate = useCallback((itemId: string) => {
    const candidate = discovery.candidates.find(
      (currentCandidate) => currentCandidate.id === itemId,
    )

    if (candidate) return handleApplyLogoCandidate(candidate)
  }, [discovery.candidates, handleApplyLogoCandidate])

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
        <ImageCandidatePreviewPicker
          ariaLabel={`${label} logo candidate previews`}
          title={`${label} Logo Candidates`}
          items={pickerItems}
          disabled={discovery.isApplying}
          selectLabel={`Use as ${label.toLowerCase()} logo`}
          onSelect={selectLogoCandidate}
        />
      ) : null}
    </div>
  )
}

function LogoAssetControlBody({
  logoKey,
  label,
  imageDataUrl,
  imageSource,
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
}: Pick<
  BrandingPanelProps,
  | 'selectedDiscTemplate'
  | 'handleLogoAssetUpload'
  | 'logoCandidateDiscovery'
  | 'handleFindLogoCandidates'
  | 'handleApplyLogoCandidate'
  | 'handleLogoAssetLayoutChange'
  | 'handleClearLogoAsset'
  | 'handleResetLogoAssetLayout'
> & {
  logoKey: LogoKey
  label: string
  imageDataUrl: string | null
  imageSource: ProjectImageAssetProvenance | null
  imageSize: BackgroundImageSize | null
  layout: LogoAssetLayout
  uploadId: string
  controlIdPrefix: string
  additionalLogoId?: string
}) {
  const hasLogoImage = Boolean(imageDataUrl)
  const logoStatus = getProjectImageAssetStatus({
    imageDataUrl,
    provenance: imageSource,
    fallbackLabel: `${label} logo image`,
  })
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
          <span>{logoStatus.summary}{formatLogoSize(imageSize)}</span>
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
}: Pick<
  BrandingPanelProps,
  | 'selectedDiscTemplate'
  | 'handleLogoAssetUpload'
  | 'logoCandidateDiscovery'
  | 'handleFindLogoCandidates'
  | 'handleApplyLogoCandidate'
  | 'handleLogoAssetLayoutChange'
  | 'handleClearLogoAsset'
  | 'handleResetLogoAssetLayout'
  | 'handleAdditionalLogoAssetLabelChange'
  | 'handleRemoveAdditionalLogoAsset'
> & {
  logoKey: LogoKey
  label: string
  logoAsset: ProjectAdditionalLogoAsset
  additionalLogoIndex: number
}) {
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
          imageSource={logoAsset.imageSource ?? null}
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

export function LogoAssetControls({
  logoKey,
  label,
  imageDataUrl,
  imageSize,
  layout,
  projectLogoAssets,
  handleLogoAssetLayoutChange,
  handleAddAdditionalLogoAsset,
  ...props
}: Pick<
  BrandingPanelProps,
  | 'selectedDiscTemplate'
  | 'projectLogoAssets'
  | 'handleLogoAssetUpload'
  | 'logoCandidateDiscovery'
  | 'handleFindLogoCandidates'
  | 'handleApplyLogoCandidate'
  | 'handleLogoAssetLayoutChange'
  | 'handleClearLogoAsset'
  | 'handleResetLogoAssetLayout'
  | 'handleAddAdditionalLogoAsset'
  | 'handleAdditionalLogoAssetLabelChange'
  | 'handleRemoveAdditionalLogoAsset'
> & {
  logoKey: LogoKey
  label: string
  imageDataUrl: string | null
  imageSize: BackgroundImageSize | null
  layout: LogoAssetLayout
}) {
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
            imageSource={getLogoAssetSource(projectLogoAssets, logoKey)}
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
