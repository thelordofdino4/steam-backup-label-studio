import { useCallback, useMemo, type ReactNode } from 'react'
import type { SteamArtworkAsset } from '../../../steam/steamApi'
import { EditorFeaturePanel } from '../../editor/EditorPanel'
import { ImageCandidatePreviewPicker } from '../ImageCandidatePicker'
import { createSteamArtworkPickerItems } from './helpers'
import type { ArtworkPanelProps } from './types'

const EMPTY_STEAM_ARTWORK: SteamArtworkAsset[] = []

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
  const artwork = selectedSteamGame?.artwork ?? EMPTY_STEAM_ARTWORK
  const pickerItems = useMemo(
    () => createSteamArtworkPickerItems(artwork, selectedArtworkId),
    [artwork, selectedArtworkId],
  )
  const selectSteamArtwork = useCallback((itemId: string) => {
    const asset = artwork.find((currentAsset) => currentAsset.id === itemId)

    if (asset) return handleUseSteamArtwork(asset)
  }, [artwork, handleUseSteamArtwork])

  return (
    <EditorFeaturePanel title="Imported Steam artwork">
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
    </EditorFeaturePanel>
  )
}
