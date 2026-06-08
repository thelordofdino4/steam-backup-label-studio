import { useCallback, useMemo, type ReactNode } from 'react'
import {
  ImageCandidatePreviewPicker,
} from '../ImageCandidatePicker'
import { EditorFeaturePanel } from '../../editor/EditorPanel'
import type { ArtworkPanelProps } from './types'
import { createWebArtworkPickerItems } from './helpers'

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
  const pickerItems = useMemo(
    () => createWebArtworkPickerItems(webArtworkDiscovery.candidates),
    [webArtworkDiscovery.candidates],
  )
  const selectWebArtworkCandidate = useCallback((itemId: string) => {
    const candidate = webArtworkDiscovery.candidates.find(
      (currentCandidate) => currentCandidate.id === itemId,
    )

    if (candidate) return handleUseWebArtworkCandidate(candidate)
  }, [handleUseWebArtworkCandidate, webArtworkDiscovery.candidates])

  return (
    <EditorFeaturePanel title="Web artwork">
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
    </EditorFeaturePanel>
  )
}
