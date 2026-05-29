import type { ChangeEvent } from 'react'
import {
  BACKGROUND_SCALE_MAX,
  BACKGROUND_SCALE_MIN,
} from '../../backgroundImage'
import type {
  BackgroundOffsetField,
  BackgroundOffsetSliderRanges,
} from '../../backgroundImage'
import { DISC_LAYOUT_CENTER_PERCENT } from '../../discGeometry'
import type { WebArtworkDiscoveryState } from '../../hooks/useWebArtworkDiscovery'
import { getTitleArtworkLayoutSliderRanges } from '../../layout/discElementSafeZone'
import type { LocalSteamScreenshotAsset } from '../../local/localArtwork'
import {
  canUseTitleArtwork,
  shouldRenderTitleArtwork,
  TITLE_ARTWORK_SCALE_MAX,
  TITLE_ARTWORK_SCALE_MIN,
  type TitleArtworkLayoutField,
} from '../../project/projectTitleArtwork'
import type {
  BackgroundOffset,
  ProjectTitleArtwork,
} from '../../project/projectTypes'
import type { RemoteLogoCandidate } from '../../steam/steamLogoCandidates'
import type { SteamArtworkAsset, SteamImportedGame } from '../../steam/steamApi'
import type { DiscTemplate } from '../../types/template'

export type ArtworkPanelProps = {
  selectedSteamGame: SteamImportedGame | null
  selectedArtworkId: string | null
  isArtworkLoading: boolean
  handleUseSteamArtwork: (asset: SteamArtworkAsset) => void | Promise<void>
  webArtworkDiscovery: WebArtworkDiscoveryState
  handleFindWebArtworkCandidates: () => void | Promise<void>
  handleUseWebArtworkCandidate: (candidate: RemoteLogoCandidate) => void | Promise<void>
  localSteamScreenshots: LocalSteamScreenshotAsset[]
  localSteamScreenshotThumbnails: Record<string, string>
  hasCheckedLocalSteamScreenshots: boolean
  isLocalSteamScreenshotsLoading: boolean
  handleFindLocalSteamScreenshots: () => void | Promise<void>
  handleOpenLocalSteamScreenshotFolder: () => void | Promise<void>
  handleUseLocalSteamScreenshot: (
    asset: LocalSteamScreenshotAsset,
  ) => void | Promise<void>
  handleBackgroundUpload: (event: ChangeEvent<HTMLInputElement>) => void
  isBackgroundArtworkEnabled: boolean
  handleBackgroundArtworkEnabledChange: (enabled: boolean) => void
  backgroundScale: number
  backgroundOffset: BackgroundOffset
  backgroundOffsetSliderRanges: BackgroundOffsetSliderRanges
  handleBackgroundScaleChange: (value: number) => void
  handleBackgroundOffsetChange: (
    field: BackgroundOffsetField,
    value: number,
  ) => void
  backgroundImageUrl: string | null
  handleResetBackground: () => void
  canFitBackgroundToSteamBannerOpenArea: boolean
  backgroundFitButtonLabel: string
  handleFitBackgroundToSteamBannerOpenArea: () => void
  projectTitleArtwork: ProjectTitleArtwork
  selectedDiscTemplate: DiscTemplate
  handleTitleArtworkLayoutChange: (
    field: TitleArtworkLayoutField,
    value: boolean | number,
  ) => void
  handleResetTitleArtworkLayout: () => void
  handleTitleArtworkUpload: (event: ChangeEvent<HTMLInputElement>) => void | Promise<void>
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

function formatModifiedDate(modifiedUnixSeconds?: number) {
  if (!modifiedUnixSeconds) {
    return null
  }

  return new Date(modifiedUnixSeconds * 1000).toLocaleDateString()
}

function formatTitleArtworkSize(size: ProjectTitleArtwork['imageSize']) {
  return size ? ` (${size.width} x ${size.height}px)` : ''
}

function getNumericInputValue(event: { currentTarget: HTMLInputElement }) {
  return Number(event.currentTarget.value)
}

function WebArtworkCandidateSection({
  webArtworkDiscovery,
  handleFindWebArtworkCandidates,
  handleUseWebArtworkCandidate,
}: Pick<
  ArtworkPanelProps,
  | 'webArtworkDiscovery'
  | 'handleFindWebArtworkCandidates'
  | 'handleUseWebArtworkCandidate'
>) {
  return (
    <details className="metadata-details collapsible-panel spacing-top">
      <summary className="panel-summary">Web artwork</summary>
      <div className="panel-content">
        <div className="artwork-import-section">
          <button
            className="secondary-button"
            type="button"
            disabled={webArtworkDiscovery.isLoading || webArtworkDiscovery.isApplying}
            onClick={() => void handleFindWebArtworkCandidates()}
          >
            {webArtworkDiscovery.isLoading ? 'Finding web artwork...' : 'Import web artwork'}
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
            <div className="search-results">
              {webArtworkDiscovery.candidates.map((candidate) => (
                <button
                  className="search-result-button artwork-asset-button"
                  key={candidate.id}
                  type="button"
                  disabled={webArtworkDiscovery.isApplying}
                  onClick={() => void handleUseWebArtworkCandidate(candidate)}
                >
                  <img
                    className="artwork-asset-thumbnail"
                    src={candidate.previewUrl ?? candidate.url}
                    alt=""
                    loading="lazy"
                    draggable={false}
                  />
                  <span className="artwork-asset-copy">
                    <strong>{candidate.label}</strong>
                    <span>
                      Source: {formatWebArtworkSourceKind(candidate.sourceKind)}
                      {formatCandidateDimensions(candidate)}
                    </span>
                    <span>{candidate.reasons.slice(0, 3).join(', ')}</span>
                  </span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </details>
  )
}

function ImportedSteamArtworkSection({
  selectedSteamGame,
  selectedArtworkId,
  isArtworkLoading,
  handleUseSteamArtwork,
}: Pick<
  ArtworkPanelProps,
  | 'selectedSteamGame'
  | 'selectedArtworkId'
  | 'isArtworkLoading'
  | 'handleUseSteamArtwork'
>) {
  return (
    <details className="metadata-details collapsible-panel spacing-top">
      <summary className="panel-summary">Imported Steam artwork</summary>
      <div className="panel-content">
        {selectedSteamGame?.artwork.length ? (
          <div className="artwork-import-section">
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
      </div>
    </details>
  )
}

function LocalSteamScreenshotSection({
  selectedSteamGame,
  selectedArtworkId,
  localSteamScreenshots,
  localSteamScreenshotThumbnails,
  hasCheckedLocalSteamScreenshots,
  isLocalSteamScreenshotsLoading,
  handleFindLocalSteamScreenshots,
  handleOpenLocalSteamScreenshotFolder,
  handleUseLocalSteamScreenshot,
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
>) {
  return (
    <details className="metadata-details collapsible-panel spacing-top">
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

                <div className="search-results local-steam-screenshot-results">
                  {localSteamScreenshots.map((asset) => {
                    const modifiedDate = formatModifiedDate(
                      asset.modifiedUnixSeconds,
                    )

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
    </details>
  )
}

function LocalArtworkSection({
  handleBackgroundUpload,
}: Pick<ArtworkPanelProps, 'handleBackgroundUpload'>) {
  return (
    <details className="metadata-details collapsible-panel spacing-top">
      <summary className="panel-summary">Local artwork</summary>
      <div className="panel-content">
        <div className="artwork-import-section">
          <input
            id="background-upload"
            type="file"
            accept="image/*"
            onChange={handleBackgroundUpload}
          />
        </div>
      </div>
    </details>
  )
}

function BackgroundArtworkControls(props: ArtworkPanelProps) {
  const {
    isBackgroundArtworkEnabled,
    handleBackgroundArtworkEnabledChange,
    handleBackgroundUpload,
    backgroundScale,
    backgroundOffset,
    backgroundOffsetSliderRanges,
    handleBackgroundScaleChange,
    handleBackgroundOffsetChange,
    backgroundImageUrl,
    handleResetBackground,
    canFitBackgroundToSteamBannerOpenArea,
    backgroundFitButtonLabel,
    handleFitBackgroundToSteamBannerOpenArea,
  } = props
  const hasBackgroundImage = Boolean(backgroundImageUrl)

  return (
    <div className="logo-asset-card artwork-feature-card">
      <label className="field-label">
        <input
          type="checkbox"
          checked={isBackgroundArtworkEnabled}
          onChange={(event) =>
            handleBackgroundArtworkEnabledChange(event.target.checked)}
        />
        Show background art
      </label>

      {!isBackgroundArtworkEnabled ? null : (
        <>
          <ImportedSteamArtworkSection {...props} />
          <WebArtworkCandidateSection {...props} />
          <LocalSteamScreenshotSection {...props} />
          <LocalArtworkSection handleBackgroundUpload={handleBackgroundUpload} />

          <p className="hint">
            {backgroundImageUrl
              ? 'A background image is selected. Drag it directly on the disc preview or tune it below.'
              : 'No background image is selected. Export still works as a blank disc label with any enabled branding, marks, or text.'}
          </p>

          <div
            className="disc-text-layout-grid"
            aria-label="Background artwork fine tuning controls"
          >
            <label>
              <span>Scale</span>
              <input
                id="background-scale"
                type="range"
                min={BACKGROUND_SCALE_MIN}
                max={BACKGROUND_SCALE_MAX}
                step="0.01"
                value={backgroundScale}
                disabled={!hasBackgroundImage}
                onInput={(event) =>
                  handleBackgroundScaleChange(getNumericInputValue(event))}
                onChange={(event) =>
                  handleBackgroundScaleChange(getNumericInputValue(event))}
              />
            </label>

            <label>
              <span>X</span>
              <input
                id="background-offset-x"
                type="range"
                min={backgroundOffsetSliderRanges.x.min}
                max={backgroundOffsetSliderRanges.x.max}
                step="0.1"
                value={backgroundOffset.x}
                disabled={!hasBackgroundImage}
                onInput={(event) =>
                  handleBackgroundOffsetChange(
                    'x',
                    getNumericInputValue(event),
                  )}
                onChange={(event) =>
                  handleBackgroundOffsetChange(
                    'x',
                    getNumericInputValue(event),
                  )}
              />
            </label>

            <label>
              <span>Y</span>
              <input
                id="background-offset-y"
                type="range"
                min={backgroundOffsetSliderRanges.y.min}
                max={backgroundOffsetSliderRanges.y.max}
                step="0.1"
                value={backgroundOffset.y}
                disabled={!hasBackgroundImage}
                onInput={(event) =>
                  handleBackgroundOffsetChange(
                    'y',
                    getNumericInputValue(event),
                  )}
                onChange={(event) =>
                  handleBackgroundOffsetChange(
                    'y',
                    getNumericInputValue(event),
                  )}
              />
            </label>
          </div>

          {!hasBackgroundImage && (
            <p className="hint">
              Background scale, X/Y position, and reset controls unlock after you select Steam artwork, a local Steam screenshot, or a local image.
            </p>
          )}

          <button
            className="secondary-button"
            type="button"
            disabled={!canFitBackgroundToSteamBannerOpenArea}
            onClick={handleFitBackgroundToSteamBannerOpenArea}
          >
            {backgroundFitButtonLabel}
          </button>

          <button
            className="secondary-button"
            type="button"
            disabled={!hasBackgroundImage}
            onClick={handleResetBackground}
          >
            Reset background
          </button>
        </>
      )}
    </div>
  )
}

function GameLogoArtworkControls({
  projectTitleArtwork,
  selectedDiscTemplate,
  handleTitleArtworkLayoutChange,
  handleResetTitleArtworkLayout,
  handleTitleArtworkUpload,
}: Pick<
  ArtworkPanelProps,
  | 'projectTitleArtwork'
  | 'selectedDiscTemplate'
  | 'handleTitleArtworkLayoutChange'
  | 'handleResetTitleArtworkLayout'
  | 'handleTitleArtworkUpload'
>) {
  const hasTitleArtwork = canUseTitleArtwork(projectTitleArtwork)
  const isFeatureEnabled = projectTitleArtwork.layout.enabled
  const isRenderable = shouldRenderTitleArtwork(projectTitleArtwork)
  const sliderRanges = getTitleArtworkLayoutSliderRanges(
    projectTitleArtwork,
    selectedDiscTemplate,
  )
  const xOffset = projectTitleArtwork.layout.x - DISC_LAYOUT_CENTER_PERCENT
  const xOffsetSliderRange = {
    min: sliderRanges.x.min - DISC_LAYOUT_CENTER_PERCENT,
    max: sliderRanges.x.max - DISC_LAYOUT_CENTER_PERCENT,
  }

  return (
    <div className="logo-asset-card title-artwork-control">
      <label className="field-label">
        <input
          type="checkbox"
          checked={isFeatureEnabled}
          onChange={(event) =>
            handleTitleArtworkLayoutChange('enabled', event.target.checked)}
        />
        Show game logo
      </label>

      {!isFeatureEnabled ? null : (
        <>
          <span className="field-label spacing-top">Game logo image</span>
          <label
            className="secondary-button logo-upload-button"
            htmlFor="title-artwork-upload"
          >
            {hasTitleArtwork ? 'Replace game logo image' : 'Choose game logo image'}
          </label>
          <input
            id="title-artwork-upload"
            className="logo-file-input"
            type="file"
            accept="image/*"
            onChange={handleTitleArtworkUpload}
          />

          {hasTitleArtwork ? (
            <div className="selected-lockup-card logo-asset-status-card title-artwork-status-card">
              <img
                className="logo-asset-preview title-artwork-preview"
                src={projectTitleArtwork.imageDataUrl ?? undefined}
                alt=""
                draggable={false}
              />
              <span>
                {projectTitleArtwork.sourceLabel}
                {formatTitleArtworkSize(projectTitleArtwork.imageSize)}
              </span>
            </div>
          ) : (
            <p className="hint">
              No game logo image is selected yet. Importing a Steam game can seed the Steam CDN logo automatically, or upload a custom image here.
            </p>
          )}

          <p className="hint">
            Rendered Game title text stays independently available in the Text tab.
          </p>

          <div
            className="disc-text-layout-grid"
            aria-label="Game logo fine tuning controls"
          >
            <label>
              <span>Scale</span>
              <input
                type="range"
                min={TITLE_ARTWORK_SCALE_MIN}
                max={TITLE_ARTWORK_SCALE_MAX}
                step="0.01"
                value={projectTitleArtwork.layout.scale}
                disabled={!isRenderable}
                onInput={(event) =>
                  handleTitleArtworkLayoutChange(
                    'scale',
                    getNumericInputValue(event),
                  )}
                onChange={(event) =>
                  handleTitleArtworkLayoutChange(
                    'scale',
                    getNumericInputValue(event),
                  )}
              />
            </label>

            <label>
              <span>X</span>
              <input
                type="range"
                min={xOffsetSliderRange.min}
                max={xOffsetSliderRange.max}
                step="0.1"
                value={xOffset}
                disabled={!isRenderable}
                onInput={(event) =>
                  handleTitleArtworkLayoutChange(
                    'x',
                    DISC_LAYOUT_CENTER_PERCENT + getNumericInputValue(event),
                  )}
                onChange={(event) =>
                  handleTitleArtworkLayoutChange(
                    'x',
                    DISC_LAYOUT_CENTER_PERCENT + getNumericInputValue(event),
                  )}
              />
            </label>

            <label>
              <span>Y</span>
              <input
                type="range"
                min={sliderRanges.y.min}
                max={sliderRanges.y.max}
                step="0.1"
                value={projectTitleArtwork.layout.y}
                disabled={!isRenderable}
                onInput={(event) =>
                  handleTitleArtworkLayoutChange(
                    'y',
                    getNumericInputValue(event),
                  )}
                onChange={(event) =>
                  handleTitleArtworkLayoutChange(
                    'y',
                    getNumericInputValue(event),
                  )}
              />
            </label>
          </div>

          <button
            className="secondary-button"
            type="button"
            disabled={!isRenderable}
            onClick={handleResetTitleArtworkLayout}
          >
            Reset game logo layout
          </button>
        </>
      )}
    </div>
  )
}

export function ArtworkPanel(props: ArtworkPanelProps) {
  return (
    <details className="panel collapsible-panel">
      <summary className="panel-summary">Artwork</summary>
      <div className="panel-content">
        <BackgroundArtworkControls {...props} />
        <GameLogoArtworkControls {...props} />
      </div>
    </details>
  )
}
