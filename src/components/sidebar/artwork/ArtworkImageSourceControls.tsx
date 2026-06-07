import { useCallback, useMemo, type ChangeEvent, type ReactNode } from 'react'
import type { WebArtworkDiscoveryState } from '../../../hooks/useWebArtworkDiscovery'
import type { LocalSteamScreenshotAsset } from '../../../local/localArtwork'
import type { ProjectImageAssetSource } from '../../../project/projectTypes'
import type { RemoteLogoCandidate } from '../../../steam/steamLogoCandidates'
import type {
  SteamArtworkAsset,
  SteamImportedGame,
} from '../../../steam/steamApi'
import { ImageCandidatePreviewPicker } from '../ImageCandidatePicker'
import {
  createLocalSteamScreenshotPickerItems,
  createSteamArtworkPickerItems,
  createWebArtworkPickerItems,
} from './helpers'

const EMPTY_STEAM_ARTWORK: SteamArtworkAsset[] = []

export type ArtworkImageSourceControlSource =
  | 'steam-artwork'
  | 'web-artwork'
  | 'local-steam-screenshot'
  | 'local-file'

export type ArtworkImageSourceCatalog = {
  selectedSteamGame: SteamImportedGame | null
  localSteamScreenshots: LocalSteamScreenshotAsset[]
  localSteamScreenshotThumbnails: Record<string, string>
  hasCheckedLocalSteamScreenshots: boolean
  isLocalSteamScreenshotsLoading: boolean
  onFindLocalSteamScreenshots: () => void | Promise<void>
  onOpenLocalSteamScreenshotFolder: () => void | Promise<void>
  webArtworkDiscovery: WebArtworkDiscoveryState
  onFindWebArtworkCandidates: () => void | Promise<void>
}

export type ArtworkImageSourceSelection = {
  source?: ProjectImageAssetSource | string | null
  sourceId?: string | null
} | null | undefined

export type ArtworkImageSourceControlsProps = ArtworkImageSourceCatalog & {
  uploadId: string
  title: string
  hasImage: boolean
  imageSource: ArtworkImageSourceSelection
  allowSteamArtwork?: boolean
  allowWebArtwork?: boolean
  allowLocalSteamScreenshots?: boolean
  localFileActionLabel?: string
  localFileHint?: string
  onUpload: (event: ChangeEvent<HTMLInputElement>) => void | Promise<void>
  onUseSteamArtwork: (asset: SteamArtworkAsset) => void | Promise<void>
  onUseLocalSteamScreenshot: (
    asset: LocalSteamScreenshotAsset,
  ) => void | Promise<void>
  onUseWebArtworkCandidate: (
    candidate: RemoteLogoCandidate,
  ) => void | Promise<void>
  renderFineTuneControls?: (
    source: ArtworkImageSourceControlSource,
    sectionLabel: string,
  ) => ReactNode
}

const ARTWORK_SOURCE_PANEL_LABELS:
Record<ArtworkImageSourceControlSource, string> = {
  'steam-artwork': 'Imported Steam artwork',
  'web-artwork': 'Web artwork',
  'local-steam-screenshot': 'Local Steam screenshots',
  'local-file': 'Local file',
}

function getSelectedSourceId(
  imageSource: ArtworkImageSourceSelection,
  source: ArtworkImageSourceControlSource,
) {
  return imageSource?.source === source ? imageSource.sourceId ?? null : null
}

function getLocalFileActionLabel(title: string, hasImage: boolean) {
  const target = title.trim() || 'artwork'

  return hasImage ? `Replace ${target}` : `Choose ${target}`
}

export function ArtworkImageSourceControls({
  uploadId,
  title,
  hasImage,
  imageSource,
  allowSteamArtwork = true,
  allowWebArtwork = true,
  allowLocalSteamScreenshots = true,
  localFileActionLabel,
  localFileHint = 'Choose an image from this computer when Steam, web, or screenshot sources do not have the artwork you want.',
  selectedSteamGame,
  localSteamScreenshots,
  localSteamScreenshotThumbnails,
  hasCheckedLocalSteamScreenshots,
  isLocalSteamScreenshotsLoading,
  onFindLocalSteamScreenshots,
  onOpenLocalSteamScreenshotFolder,
  webArtworkDiscovery,
  onFindWebArtworkCandidates,
  onUpload,
  onUseSteamArtwork,
  onUseLocalSteamScreenshot,
  onUseWebArtworkCandidate,
  renderFineTuneControls,
}: ArtworkImageSourceControlsProps) {
  const target = title.trim() || 'artwork'
  const targetLabel = target.toLocaleLowerCase()
  const steamArtwork = allowSteamArtwork
    ? selectedSteamGame?.artwork ?? EMPTY_STEAM_ARTWORK
    : EMPTY_STEAM_ARTWORK
  const selectedSteamArtworkId = getSelectedSourceId(
    imageSource,
    'steam-artwork',
  )
  const selectedWebArtworkId = getSelectedSourceId(imageSource, 'web-artwork')
  const selectedLocalSteamScreenshotId = getSelectedSourceId(
    imageSource,
    'local-steam-screenshot',
  )
  const steamArtworkPickerItems = useMemo(
    () => createSteamArtworkPickerItems(steamArtwork, selectedSteamArtworkId),
    [selectedSteamArtworkId, steamArtwork],
  )
  const webArtworkPickerItems = useMemo(
    () => createWebArtworkPickerItems(
      webArtworkDiscovery.candidates,
      selectedWebArtworkId,
    ),
    [selectedWebArtworkId, webArtworkDiscovery.candidates],
  )
  const localScreenshotPickerItems = useMemo(
    () => createLocalSteamScreenshotPickerItems(
      localSteamScreenshots,
      localSteamScreenshotThumbnails,
      selectedLocalSteamScreenshotId,
    ),
    [
      localSteamScreenshots,
      localSteamScreenshotThumbnails,
      selectedLocalSteamScreenshotId,
    ],
  )
  const selectSteamArtwork = useCallback((itemId: string) => {
    const asset = steamArtwork.find(
      (currentAsset) => currentAsset.id === itemId,
    )

    if (asset) return onUseSteamArtwork(asset)
  }, [onUseSteamArtwork, steamArtwork])
  const selectWebArtworkCandidate = useCallback((itemId: string) => {
    const candidate = webArtworkDiscovery.candidates.find(
      (currentCandidate) => currentCandidate.id === itemId,
    )

    if (candidate) return onUseWebArtworkCandidate(candidate)
  }, [onUseWebArtworkCandidate, webArtworkDiscovery.candidates])
  const selectLocalSteamScreenshot = useCallback((itemId: string) => {
    const asset = localSteamScreenshots.find(
      (currentAsset) => currentAsset.id === itemId,
    )

    if (asset) return onUseLocalSteamScreenshot(asset)
  }, [localSteamScreenshots, onUseLocalSteamScreenshot])

  return (
    <>
      {allowSteamArtwork ? (
        <details className="feature-section-card metadata-details collapsible-panel spacing-top">
          <summary className="panel-summary">
            {ARTWORK_SOURCE_PANEL_LABELS['steam-artwork']}
          </summary>
          <div className="panel-content">
            {steamArtwork.length > 0 ? (
              <div className="artwork-import-section">
                <p className="hint">
                  Choose one of the imported Steam assets for {targetLabel}.
                </p>
                <ImageCandidatePreviewPicker
                  ariaLabel={`${target} imported Steam artwork previews`}
                  title={`${target} Steam Artwork`}
                  items={steamArtworkPickerItems}
                  selectLabel={`Use for ${targetLabel}`}
                  onSelect={selectSteamArtwork}
                />
              </div>
            ) : (
              <p className="hint">
                Import a Steam game to see Steam artwork here.
              </p>
            )}
            {renderFineTuneControls?.(
              'steam-artwork',
              ARTWORK_SOURCE_PANEL_LABELS['steam-artwork'],
            )}
          </div>
        </details>
      ) : null}

      {allowWebArtwork ? (
        <details className="feature-section-card metadata-details collapsible-panel spacing-top">
          <summary className="panel-summary">
            {ARTWORK_SOURCE_PANEL_LABELS['web-artwork']}
          </summary>
          <div className="panel-content">
            <div className="artwork-import-section">
              <button
                className="secondary-button"
                type="button"
                disabled={
                  webArtworkDiscovery.isLoading ||
                  webArtworkDiscovery.isApplying
                }
                onClick={() => void onFindWebArtworkCandidates()}
              >
                {webArtworkDiscovery.isLoading
                  ? 'Finding web artwork...'
                  : 'Find web artwork candidates'}
              </button>

              {webArtworkDiscovery.error ? (
                <p className="hint logo-candidate-error">
                  {webArtworkDiscovery.error}
                </p>
              ) : null}

              {webArtworkDiscovery.hasSearched &&
                !webArtworkDiscovery.isLoading &&
                webArtworkDiscovery.candidates.length === 0 &&
                !webArtworkDiscovery.error ? (
                  <p className="hint">No web artwork candidates found.</p>
                ) : null}

              {webArtworkPickerItems.length > 0 ? (
                <ImageCandidatePreviewPicker
                  ariaLabel={`${target} web artwork candidate previews`}
                  title={`${target} Web Artwork`}
                  items={webArtworkPickerItems}
                  disabled={webArtworkDiscovery.isApplying}
                  selectLabel={`Use for ${targetLabel}`}
                  onSelect={selectWebArtworkCandidate}
                />
              ) : null}
              {renderFineTuneControls?.(
                'web-artwork',
                ARTWORK_SOURCE_PANEL_LABELS['web-artwork'],
              )}
            </div>
          </div>
        </details>
      ) : null}

      {allowLocalSteamScreenshots ? (
        <details className="feature-section-card metadata-details collapsible-panel spacing-top">
          <summary className="panel-summary">
            {ARTWORK_SOURCE_PANEL_LABELS['local-steam-screenshot']}
          </summary>
          <div className="panel-content">
            <div className="artwork-import-section">
              {!selectedSteamGame ? (
                <p className="hint">
                  Select or import a Steam game first. If Steam screenshots are
                  found for that game, they will appear here.
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
                    onClick={() => void onFindLocalSteamScreenshots()}
                  >
                    {isLocalSteamScreenshotsLoading
                      ? 'Checking screenshots...'
                      : 'Find local Steam screenshots'}
                  </button>
                </>
              )}

              {hasCheckedLocalSteamScreenshots &&
                !isLocalSteamScreenshotsLoading &&
                localSteamScreenshots.length === 0 ? (
                  <p className="hint">No local Steam screenshots found.</p>
                ) : null}

              {localScreenshotPickerItems.length > 0 ? (
                <>
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => void onOpenLocalSteamScreenshotFolder()}
                  >
                    Open screenshot folder
                  </button>

                  <ImageCandidatePreviewPicker
                    ariaLabel={`${target} local Steam screenshot previews`}
                    title={`${target} Local Steam Screenshots`}
                    items={localScreenshotPickerItems}
                    selectLabel={`Use for ${targetLabel}`}
                    onSelect={selectLocalSteamScreenshot}
                  />
                </>
              ) : null}
              {renderFineTuneControls?.(
                'local-steam-screenshot',
                ARTWORK_SOURCE_PANEL_LABELS['local-steam-screenshot'],
              )}
            </div>
          </div>
        </details>
      ) : null}

      <details className="feature-section-card metadata-details collapsible-panel spacing-top">
        <summary className="panel-summary">
          {ARTWORK_SOURCE_PANEL_LABELS['local-file']}
        </summary>
        <div className="panel-content">
          <div className="artwork-import-section">
            <p className="hint">{localFileHint}</p>
            <label className="secondary-button logo-upload-button" htmlFor={uploadId}>
              {localFileActionLabel ?? getLocalFileActionLabel(target, hasImage)}
            </label>
            <input
              id={uploadId}
              className="logo-file-input"
              type="file"
              accept="image/*"
              onChange={(event) => void onUpload(event)}
            />
            {renderFineTuneControls?.(
              'local-file',
              ARTWORK_SOURCE_PANEL_LABELS['local-file'],
            )}
          </div>
        </div>
      </details>
    </>
  )
}
