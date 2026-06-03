import type { ReactNode } from 'react'
import type { RemoteLogoCandidate } from '../../../steam/steamLogoCandidates'
import {
  ImageCandidatePreviewPicker,
  type ImageCandidatePickerItem,
} from '../ImageCandidatePicker'
import type { ArtworkPanelProps } from './types'

function formatWebArtworkSourceKind(sourceKind: RemoteLogoCandidate['sourceKind']) {
  switch (sourceKind) {
    case 'official-img':
      return 'Official site image'
    case 'official-srcset':
      return 'Official srcset'
    case 'official-css-background':
      return 'Official CSS image'
    case 'official-meta-image':
      return 'Official metadata image'
    case 'steam-meta-image':
      return 'Steam metadata image'
    case 'steam-img':
      return 'Steam page image'
    case 'steam-avatar':
      return 'Steam creator image'
    case 'favicon':
      return 'Site icon'
    default:
      return sourceKind
  }
}

function formatCandidateDimensions(candidate: RemoteLogoCandidate) {
  return candidate.width && candidate.height ? ` · ${candidate.width} x ${candidate.height}px` : ''
}

export function WebArtworkCandidateControls({
  webArtworkDiscovery,
  handleFindWebArtworkCandidates,
  handleUseWebArtworkCandidate,
  fineTuneControls,
}: Pick<
  ArtworkPanelProps,
  | 'webArtworkDiscovery'
  | 'handleFindWebArtworkCandidates'
  | 'handleUseWebArtworkCandidate'
> & {
  fineTuneControls: ReactNode
}) {
  const pickerItems: ImageCandidatePickerItem[] = webArtworkDiscovery.candidates.map(
    (candidate) => ({
      id: candidate.id,
      title: candidate.label,
      subtitle: `Source: ${formatWebArtworkSourceKind(candidate.sourceKind)}${formatCandidateDimensions(candidate)}`,
      details: candidate.reasons.slice(0, 3),
      imageUrl: candidate.previewUrl ?? candidate.url,
      imageFit: 'cover',
    }),
  )
  const selectWebArtworkCandidate = (itemId: string) => {
    const candidate = webArtworkDiscovery.candidates.find(
      (currentCandidate) => currentCandidate.id === itemId,
    )

    if (candidate) return handleUseWebArtworkCandidate(candidate)
  }

  return (
    <details className="feature-section-card metadata-details collapsible-panel spacing-top">
      <summary className="panel-summary">Web artwork</summary>
      <div className="panel-content">
        <div className="artwork-import-section">
          <button
            className="secondary-button"
            type="button"
            disabled={webArtworkDiscovery.isLoading || webArtworkDiscovery.isApplying}
            onClick={() => void handleFindWebArtworkCandidates()}
          >
            {webArtworkDiscovery.isLoading ? 'Finding web artwork...' : 'Find web artwork candidates'}
          </button>

          {webArtworkDiscovery.error ? (
            <p className="hint logo-candidate-error">{webArtworkDiscovery.error}</p>
          ) : null}

          {webArtworkDiscovery.hasSearched &&
            !webArtworkDiscovery.isLoading &&
            webArtworkDiscovery.candidates.length === 0 &&
            !webArtworkDiscovery.error ? (
              <p className="hint">No web artwork candidates found.</p>
            ) : null}

          {webArtworkDiscovery.candidates.length > 0 ? (
            <ImageCandidatePreviewPicker
              ariaLabel="Web artwork candidate previews"
              title="Web Artwork Candidates"
              items={pickerItems}
              disabled={webArtworkDiscovery.isApplying}
              selectLabel="Use as background"
              onSelect={selectWebArtworkCandidate}
            />
          ) : null}
          {fineTuneControls}
        </div>
      </div>
    </details>
  )
}
