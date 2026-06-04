import { useCallback, useMemo, type ReactNode } from 'react'
import { ImageCandidatePreviewPicker } from '../ImageCandidatePicker'
import { createLocalSteamScreenshotPickerItems } from './helpers'
import type { ArtworkPanelProps } from './types'

export function LocalScreenshotControls({
  selectedSteamGame,
  selectedArtworkId,
  localSteamScreenshots,
  localSteamScreenshotThumbnails,
  hasCheckedLocalSteamScreenshots,
  isLocalSteamScreenshotsLoading,
  handleFindLocalSteamScreenshots,
  handleOpenLocalSteamScreenshotFolder,
  handleUseLocalSteamScreenshot,
  fineTuneControls,
}: Pick<
  ArtworkPanelProps,
  | 'selectedSteamGame'
  | 'selectedArtworkId'
  | 'localSteamScreenshots'
  | 'localSteamScreenshotThumbnails'
  | 'hasCheckedLocalSteamScreenshots'
  | 'isLocalSteamScreenshotsLoading'
  | 'handleFindLocalSteamScreenshots'
  | 'handleOpenLocalSteamScreenshotFolder'
  | 'handleUseLocalSteamScreenshot'
> & {
  fineTuneControls: ReactNode
}) {
  const pickerItems = useMemo(
    () => createLocalSteamScreenshotPickerItems(
      localSteamScreenshots,
      localSteamScreenshotThumbnails,
      selectedArtworkId,
    ),
    [
      localSteamScreenshotThumbnails,
      localSteamScreenshots,
      selectedArtworkId,
    ],
  )
  const selectLocalSteamScreenshot = useCallback((itemId: string) => {
    const asset = localSteamScreenshots.find(
      (currentAsset) => currentAsset.id === itemId,
    )

    if (asset) return handleUseLocalSteamScreenshot(asset)
  }, [handleUseLocalSteamScreenshot, localSteamScreenshots])

  return (
    <details className="feature-section-card metadata-details collapsible-panel spacing-top">
      <summary className="panel-summary">Local Steam screenshots</summary>
      <div className="panel-content">
        {!selectedSteamGame ? (
          <p className="hint">
            Select or import a Steam game first. If Steam screenshots are found for that game, they will appear here.
          </p>
        ) : (
          <>
            <p className="hint">
              Check your local Steam screenshot folder for {selectedSteamGame.title}.
            </p>

            <button
              className="secondary-button"
              type="button"
              disabled={isLocalSteamScreenshotsLoading}
              onClick={() => void handleFindLocalSteamScreenshots()}
            >
              {isLocalSteamScreenshotsLoading
                ? 'Checking screenshots...'
                : 'Find local Steam screenshots'}
            </button>

            {hasCheckedLocalSteamScreenshots &&
              !isLocalSteamScreenshotsLoading &&
              localSteamScreenshots.length === 0 && (
                <p className="hint">
                  No local Steam screenshots were found for this game.
                </p>
              )}

            {localSteamScreenshots.length > 0 && (
              <>
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => void handleOpenLocalSteamScreenshotFolder()}
                >
                  Open screenshot folder
                </button>

                <ImageCandidatePreviewPicker
                  ariaLabel="Local Steam screenshot previews"
                  title="Local Steam Screenshots"
                  items={pickerItems}
                  selectLabel="Use as background"
                  onSelect={selectLocalSteamScreenshot}
                />
              </>
            )}
          </>
        )}
        {fineTuneControls}
      </div>
    </details>
  )
}
