import { useRef, type ChangeEvent, type ReactNode } from 'react'
import type { LocalSteamScreenshotAsset } from '../../local/localArtwork'
import type { WebArtworkDiscoveryState } from '../../hooks/useWebArtworkDiscovery'
import type {
  ProjectCaseInsertImageSlot,
} from '../../project/projectTypes'
import type {
  SteamArtworkAsset,
  SteamImportedGame,
} from '../../steam/steamApi'
import type { RemoteLogoCandidate } from '../../steam/steamLogoCandidates'
import { ImageCandidatePreviewPicker } from '../sidebar/ImageCandidatePicker'
import {
  createLocalSteamScreenshotPickerItems,
  createSteamArtworkPickerItems,
  createWebArtworkPickerItems,
} from '../sidebar/artwork/helpers'

export type CaseInsertImageSourceCatalog = {
  selectedSteamGame: SteamImportedGame | null
  localSteamScreenshots: LocalSteamScreenshotAsset[]
  localSteamScreenshotThumbnails: Record<string, string>
  hasCheckedLocalSteamScreenshots: boolean
  isLocalSteamScreenshotsLoading: boolean
  onFindLocalSteamScreenshots: () => void | Promise<void>
  webArtworkDiscovery: WebArtworkDiscoveryState
  onFindWebArtworkCandidates: () => void | Promise<void>
}

export type CaseInsertImageSourceControlSource =
  | 'steam-artwork'
  | 'web-artwork'
  | 'local-steam-screenshot'
  | 'local-file'

export type CaseInsertImageSourceControlsProps = CaseInsertImageSourceCatalog & {
  uploadId: string
  title: string
  hasImage: boolean
  imageSource: ProjectCaseInsertImageSlot['imageSource']
  allowSteamArtwork?: boolean
  allowWebArtwork?: boolean
  allowLocalSteamScreenshots?: boolean
  onUpload: (event: ChangeEvent<HTMLInputElement>) => void | Promise<void>
  onUseSteamArtwork: (asset: SteamArtworkAsset) => void | Promise<void>
  onUseLocalSteamScreenshot: (
    asset: LocalSteamScreenshotAsset,
  ) => void | Promise<void>
  onUseWebArtworkCandidate: (
    candidate: RemoteLogoCandidate,
  ) => void | Promise<void>
  renderFineTuneControls?: (
    source: CaseInsertImageSourceControlSource,
    sectionLabel: string,
  ) => ReactNode
}

export function CaseInsertImageSourceControls({
  uploadId,
  title,
  hasImage,
  imageSource,
  allowSteamArtwork = true,
  allowWebArtwork = true,
  allowLocalSteamScreenshots = true,
  selectedSteamGame,
  localSteamScreenshots,
  localSteamScreenshotThumbnails,
  hasCheckedLocalSteamScreenshots,
  isLocalSteamScreenshotsLoading,
  onFindLocalSteamScreenshots,
  webArtworkDiscovery,
  onFindWebArtworkCandidates,
  onUpload,
  onUseSteamArtwork,
  onUseLocalSteamScreenshot,
  onUseWebArtworkCandidate,
  renderFineTuneControls,
}: CaseInsertImageSourceControlsProps) {
  const uploadInputRef = useRef<HTMLInputElement | null>(null)
  const steamArtwork = allowSteamArtwork ? selectedSteamGame?.artwork ?? [] : []
  const selectedSteamArtworkId =
    imageSource?.source === 'steam-artwork' ? imageSource.sourceId : null
  const selectedLocalSteamScreenshotId =
    imageSource?.source === 'local-steam-screenshot'
      ? imageSource.sourceId
      : null
  const selectedWebArtworkId =
    imageSource?.source === 'web-artwork' ? imageSource.sourceId : null
  const steamArtworkPickerItems = createSteamArtworkPickerItems(
    steamArtwork,
    selectedSteamArtworkId,
  )
  const localScreenshotPickerItems = createLocalSteamScreenshotPickerItems(
    localSteamScreenshots,
    localSteamScreenshotThumbnails,
    selectedLocalSteamScreenshotId,
  )
  const webArtworkPickerItems = createWebArtworkPickerItems(
    webArtworkDiscovery.candidates,
    selectedWebArtworkId,
  )
  const localFileActionLabel = title === 'background'
    ? hasImage ? 'Replace local image' : 'Choose local image'
    : hasImage ? `Replace ${title}` : `Choose ${title}`

  const selectSteamArtwork = (itemId: string) => {
    const asset = steamArtwork.find(
      (currentAsset) => currentAsset.id === itemId,
    )

    if (asset) {
      return onUseSteamArtwork(asset)
    }
  }

  const selectLocalSteamScreenshot = (itemId: string) => {
    const asset = localSteamScreenshots.find(
      (currentAsset) => currentAsset.id === itemId,
    )

    if (asset) {
      return onUseLocalSteamScreenshot(asset)
    }
  }

  const selectWebArtworkCandidate = (itemId: string) => {
    const candidate = webArtworkDiscovery.candidates.find(
      (currentCandidate) => currentCandidate.id === itemId,
    )

    if (candidate) {
      return onUseWebArtworkCandidate(candidate)
    }
  }

  return (
    <>
      {allowSteamArtwork ? (
        <details className="feature-section-card metadata-details collapsible-panel spacing-top">
          <summary className="panel-summary">Imported Steam artwork</summary>
          <div className="panel-content">
            {steamArtwork.length > 0 ? (
              <div className="artwork-import-section">
                <p className="hint">
                  Choose one of the imported Steam assets for {title}.
                </p>
                <ImageCandidatePreviewPicker
                  ariaLabel={`${title} imported Steam artwork previews`}
                  title={`${title} Steam Artwork`}
                  items={steamArtworkPickerItems}
                  selectLabel={`Use for ${title}`}
                  onSelect={selectSteamArtwork}
                />
              </div>
            ) : (
              <p className="hint">
                Import a Steam game to see Steam artwork here.
              </p>
            )}
            {renderFineTuneControls?.('steam-artwork', 'Imported Steam artwork')}
          </div>
        </details>
      ) : null}

      {allowWebArtwork ? (
        <details className="feature-section-card metadata-details collapsible-panel spacing-top">
          <summary className="panel-summary">Web artwork</summary>
          <div className="panel-content">
            <button
              className="secondary-button"
              type="button"
              disabled={webArtworkDiscovery.isLoading}
              onClick={() => void onFindWebArtworkCandidates()}
            >
              {webArtworkDiscovery.isLoading
                ? 'Finding web artwork...'
                : 'Find web artwork candidates'}
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

            {webArtworkPickerItems.length > 0 ? (
              <ImageCandidatePreviewPicker
                ariaLabel={`${title} web artwork candidate previews`}
                title={`${title} Web Artwork`}
                items={webArtworkPickerItems}
                disabled={webArtworkDiscovery.isLoading}
                selectLabel={`Use for ${title}`}
                onSelect={selectWebArtworkCandidate}
              />
            ) : null}
            {renderFineTuneControls?.('web-artwork', 'Web artwork')}
          </div>
        </details>
      ) : null}

      {allowLocalSteamScreenshots ? (
        <details className="feature-section-card metadata-details collapsible-panel spacing-top">
          <summary className="panel-summary">Local Steam screenshots</summary>
          <div className="panel-content">
            {!selectedSteamGame ? (
              <p className="hint">
                Select or import a Steam game first. If Steam screenshots are
                found for that game, they will appear here.
              </p>
            ) : (
              <button
                className="secondary-button"
                type="button"
                disabled={isLocalSteamScreenshotsLoading}
                onClick={() => void onFindLocalSteamScreenshots()}
              >
                {isLocalSteamScreenshotsLoading
                  ? 'Checking local screenshots...'
                  : hasCheckedLocalSteamScreenshots
                    ? 'Refresh local screenshots'
                    : 'Find local screenshots'}
              </button>
            )}

            {hasCheckedLocalSteamScreenshots &&
              !isLocalSteamScreenshotsLoading &&
              localSteamScreenshots.length === 0 ? (
                <p className="hint">No local Steam screenshots found.</p>
              ) : null}

            {localScreenshotPickerItems.length > 0 ? (
              <ImageCandidatePreviewPicker
                ariaLabel={`${title} local Steam screenshot previews`}
                title={`${title} Local Steam Screenshots`}
                items={localScreenshotPickerItems}
                selectLabel={`Use for ${title}`}
                onSelect={selectLocalSteamScreenshot}
              />
            ) : null}
            {renderFineTuneControls?.(
              'local-steam-screenshot',
              'Local Steam screenshots',
            )}
          </div>
        </details>
      ) : null}

      <details className="feature-section-card metadata-details collapsible-panel spacing-top">
        <summary className="panel-summary">Local file</summary>
        <div className="panel-content">
          <p className="hint">
            Choose an image from this computer when Steam, web, or screenshot
            sources do not have the artwork you want.
          </p>
          <button
            className="secondary-button"
            type="button"
            onClick={() => uploadInputRef.current?.click()}
          >
            {localFileActionLabel}
          </button>
          <input
            id={uploadId}
            ref={uploadInputRef}
            className="case-insert-file-input"
            type="file"
            accept="image/*"
            onChange={(event) => void onUpload(event)}
          />
          {renderFineTuneControls?.('local-file', 'Local file')}
        </div>
      </details>
    </>
  )
}
