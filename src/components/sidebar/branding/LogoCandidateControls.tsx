import { useCallback, useMemo } from 'react'
import type { LogoCandidateDiscoverySlot } from '../../../hooks/useLogoAssetDiscovery'
import type { LogoAssetKey } from '../../../project/projectLogoAssets'
import type { RemoteLogoCandidate } from '../../../steam/steamLogoCandidates'
import {
  ImageCandidatePreviewPicker,
  type ImageCandidatePickerItem,
} from '../ImageCandidatePicker'

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
  discovery: LogoCandidateDiscoverySlot,
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

export function LogoCandidateControls({
  logoKey,
  label,
  discovery,
  helpText = 'Searches Steam fallback pages and best-effort official-site HTML/CSS for logo candidates. Manual upload remains the reliable fallback.',
  selectLabel,
  handleFindLogoCandidates,
  handleApplyLogoCandidate,
}: {
  logoKey: LogoAssetKey
  label: string
  discovery: LogoCandidateDiscoverySlot
  helpText?: string
  selectLabel?: string
  handleFindLogoCandidates: (logoKey: LogoAssetKey) => void | Promise<void>
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

      <p className="hint">{helpText}</p>

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
          selectLabel={selectLabel ?? `Use as ${label.toLowerCase()} logo`}
          onSelect={selectLogoCandidate}
        />
      ) : null}
    </div>
  )
}
