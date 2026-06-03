import type { ReactNode } from 'react'
import { ImageCandidatePreviewPicker } from '../ImageCandidatePicker'
import { createSteamArtworkPickerItems } from './helpers'
import type { ArtworkPanelProps } from './types'

export function SteamArtworkControls({
  selectedSteamGame,
  selectedArtworkId,
  isArtworkLoading,
  handleUseSteamArtwork,
  fineTuneControls,
}: Pick<
  ArtworkPanelProps,
  | 'selectedSteamGame'
  | 'selectedArtworkId'
  | 'isArtworkLoading'
  | 'handleUseSteamArtwork'
> & {
  fineTuneControls: ReactNode
}) {
  const artwork = selectedSteamGame?.artwork ?? []
  const pickerItems = createSteamArtworkPickerItems(artwork, selectedArtworkId)
  const selectSteamArtwork = (itemId: string) => {
    const asset = artwork.find((currentAsset) => currentAsset.id === itemId)

    if (asset) return handleUseSteamArtwork(asset)
  }

  return (
    <details className="feature-section-card metadata-details collapsible-panel spacing-top">
      <summary className="panel-summary">Imported Steam artwork</summary>
      <div className="panel-content">
        {selectedSteamGame?.artwork.length ? (
          <div className="artwork-import-section">
            <p className="hint">
              Choose one of the imported Steam assets as the disc background.
            </p>

            <ImageCandidatePreviewPicker
              ariaLabel="Imported Steam artwork previews"
              title="Imported Steam Artwork"
              items={pickerItems}
              disabled={isArtworkLoading}
              selectLabel="Use as background"
              onSelect={selectSteamArtwork}
            />
          </div>
        ) : (
          <p className="hint">
            Import a Steam game to see Steam artwork here, or upload a local image below.
          </p>
        )}
        {fineTuneControls}
      </div>
    </details>
  )
}
