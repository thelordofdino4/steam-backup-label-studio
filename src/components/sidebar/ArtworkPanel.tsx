import type { ChangeEvent } from 'react'
import type { LocalSteamScreenshotAsset } from '../../local/localArtwork'
import type { SteamArtworkAsset, SteamImportedGame } from '../../steam/steamApi'

export type ArtworkPanelProps = {
  selectedSteamGame: SteamImportedGame | null
  selectedArtworkId: string | null
  isArtworkLoading: boolean
  handleUseSteamArtwork: (asset: SteamArtworkAsset) => void | Promise<void>
  localSteamScreenshots: LocalSteamScreenshotAsset[]
  localSteamScreenshotThumbnails: Record<string, string>
  hasCheckedLocalSteamScreenshots: boolean
  isLocalSteamScreenshotsLoading: boolean
  handleFindLocalSteamScreenshots: () => void | Promise<void>
  handleOpenLocalSteamScreenshotFolder: () => void | Promise<void>
  handleUseLocalSteamScreenshot: (asset: LocalSteamScreenshotAsset) => void | Promise<void>
  handleBackgroundUpload: (event: ChangeEvent<HTMLInputElement>) => void
  backgroundScale: number
  handleBackgroundScaleChange: (value: number) => void
  backgroundImageUrl: string | null
  handleResetBackground: () => void
}

function formatArtworkKind(kind: SteamArtworkAsset['kind']) {
  switch (kind) {
    case 'header':
      return 'Header'
    case 'capsule':
      return 'Capsule'
    case 'background':
      return 'Background'
    case 'logo':
      return 'Logo'
    case 'screenshot':
      return 'Screenshot'
    case 'library':
      return 'Library artwork'
    default:
      return kind
  }
}

function formatModifiedDate(modifiedUnixSeconds?: number) {
  if (!modifiedUnixSeconds) {
    return null
  }

  return new Date(modifiedUnixSeconds * 1000).toLocaleDateString()
}

export function ArtworkPanel({
  selectedSteamGame,
  selectedArtworkId,
  isArtworkLoading,
  handleUseSteamArtwork,
  localSteamScreenshots,
  localSteamScreenshotThumbnails,
  hasCheckedLocalSteamScreenshots,
  isLocalSteamScreenshotsLoading,
  handleFindLocalSteamScreenshots,
  handleOpenLocalSteamScreenshotFolder,
  handleUseLocalSteamScreenshot,
  handleBackgroundUpload,
  backgroundScale,
  handleBackgroundScaleChange,
  backgroundImageUrl,
  handleResetBackground,
}: ArtworkPanelProps) {
  return (
    <details className="panel collapsible-panel" open>
      <summary className="panel-summary">Artwork</summary>
      <div className="panel-content">
      {selectedSteamGame?.artwork.length ? (
        <div className="artwork-import-section">
          <h3 className="artwork-import-heading">Imported Steam artwork</h3>
          <p className="hint">
            Choose one of the imported Steam assets as the disc background.
          </p>

          <div className="search-results">
            {selectedSteamGame.artwork.map((asset) => (
              <button
                className="search-result-button artwork-asset-button"
                key={asset.id}
                type="button"
                disabled={isArtworkLoading}
                onClick={() => handleUseSteamArtwork(asset)}
              >
                <img
                  className="artwork-asset-thumbnail"
                  src={asset.url}
                  alt=""
                  loading="lazy"
                  draggable={false}
                />
                <span className="artwork-asset-copy">
                  <strong>{asset.label}</strong>
                  <span>
                    Source: Steam online · Type: {formatArtworkKind(asset.kind)}
                    {selectedArtworkId === asset.id ? ' · selected' : ''}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <p className="hint">
          Import a Steam game to see Steam artwork here, or upload a local image below.
        </p>
      )}

      <div className="local-steam-screenshot-section">
        <h3 className="artwork-import-heading">Local Steam screenshots</h3>

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
              {isLocalSteamScreenshotsLoading ? 'Checking screenshots...' : 'Find local Steam screenshots'}
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

                <div className="search-results local-steam-screenshot-results">
                  {localSteamScreenshots.map((asset) => {
                    const modifiedDate = formatModifiedDate(asset.modifiedUnixSeconds)

                    return (
                      <button
                        className="search-result-button artwork-asset-button"
                        key={asset.id}
                        type="button"
                        onClick={() => void handleUseLocalSteamScreenshot(asset)}
                      >
                        {localSteamScreenshotThumbnails[asset.id] ? (
                          <img
                            className="artwork-asset-thumbnail"
                            src={localSteamScreenshotThumbnails[asset.id]}
                            alt=""
                            draggable={false}
                          />
                        ) : (
                          <span className="artwork-asset-thumbnail artwork-asset-thumbnail-placeholder">
                            Local
                          </span>
                        )}
                        <span className="artwork-asset-copy">
                          <strong>{asset.label}</strong>
                          <span>
                            Source: Local Steam screenshots · Type: Local screenshot
                            {modifiedDate ? ` · Modified: ${modifiedDate}` : ''}
                            {selectedArtworkId === asset.id ? ' · selected' : ''}
                          </span>
                        </span>
                      </button>
                    )
                  })}
                </div>
              </>
            )}
          </>
        )}
      </div>

      <label className="field-label" htmlFor="background-upload">
        Local image
      </label>
      <input
        id="background-upload"
        type="file"
        accept="image/*"
        onChange={handleBackgroundUpload}
      />

      <p className="hint">
        {backgroundImageUrl
          ? 'A background image is selected. Drag it directly on the disc preview or resize it below.'
          : 'No background image is selected. Export still works as a blank disc label with any enabled branding, marks, or text.'}
      </p>

      <label className="field-label spacing-top" htmlFor="background-scale">
        Resize background
      </label>
      <input
        id="background-scale"
        type="range"
        min="0.1"
        max="2"
        step="0.01"
        value={backgroundScale}
        disabled={!backgroundImageUrl}
        onChange={(event) => handleBackgroundScaleChange(Number(event.target.value))}
      />

      {!backgroundImageUrl && (
        <p className="hint">
          Background resize and reset controls unlock after you select Steam artwork, a local Steam screenshot, or a local image.
        </p>
      )}

      <button
        className="secondary-button"
        type="button"
        disabled={!backgroundImageUrl}
        onClick={handleResetBackground}
      >
        Reset background
      </button>
      </div>
    </details>
  )
}
