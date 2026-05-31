import type { ChangeEvent, ReactNode } from 'react'
import {
  BACKGROUND_SCALE_MAX,
  BACKGROUND_SCALE_MIN,
} from '../../backgroundImage'
import type {
  BackgroundOffsetField,
  BackgroundOffsetSliderRanges,
} from '../../backgroundImage'
import {
  canTuneBackgroundArtworkSource,
  type ActiveBackgroundArtworkSource,
  type BackgroundArtworkSource,
  type PersistedBackgroundArtworkSource,
  resolveActiveBackgroundArtworkSource,
} from '../../backgroundArtworkSource'
import { DISC_LAYOUT_CENTER_PERCENT } from '../../discGeometry'
import type { WebArtworkDiscoveryState } from '../../hooks/useWebArtworkDiscovery'
import {
  getAdditionalArtworkLayoutSliderRanges,
  getTitleArtworkLayoutSliderRanges,
} from '../../layout/discElementSafeZone'
import type { LocalSteamScreenshotAsset } from '../../local/localArtwork'
import {
  ADDITIONAL_ARTWORK_SCALE_MAX,
  ADDITIONAL_ARTWORK_SCALE_MIN,
  ADDITIONAL_ARTWORK_FRAME_WIDTH_MAX,
  ADDITIONAL_ARTWORK_FRAME_WIDTH_MIN,
  canUseAdditionalArtworkElement,
  shouldRenderAdditionalArtworkElement,
  type AdditionalArtworkFrameField,
  type AdditionalArtworkLayoutField,
} from '../../project/projectAdditionalArtwork'
import {
  canRestoreTitleArtworkDefaultSteamLogo,
  canUseTitleArtwork,
  getTitleArtworkDefaultSteamLogo,
  shouldRenderTitleArtwork,
  TITLE_ARTWORK_SCALE_MAX,
  TITLE_ARTWORK_SCALE_MIN,
  type TitleArtworkLayoutField,
} from '../../project/projectTitleArtwork'
import type {
  BackgroundOffset,
  ProjectImageAssetProvenance,
  ProjectAdditionalArtwork,
  ProjectAdditionalArtworkElement,
  ProjectTitleArtwork,
} from '../../project/projectTypes'
import { getProjectImageAssetStatus } from '../../project/projectAssetStatus'
import type { RemoteLogoCandidate } from '../../steam/steamLogoCandidates'
import type { SteamArtworkAsset, SteamImportedGame } from '../../steam/steamApi'
import type { DiscTemplate } from '../../types/template'
import {
  ImageCandidatePreviewPicker,
  type ImageCandidatePickerItem,
} from './ImageCandidatePicker'
import { PlusIcon } from './PanelIcons'
import { RepeatedVisualElementCard } from './RepeatedVisualElementCard'

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
  backgroundImageSource: ProjectImageAssetProvenance | null
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
  handleRestoreTitleArtworkDefault: () => void
  handleTitleArtworkUpload: (event: ChangeEvent<HTMLInputElement>) => void | Promise<void>
  projectAdditionalArtwork: ProjectAdditionalArtwork
  handleAdditionalArtworkEnabledChange: (enabled: boolean) => void
  handleAddAdditionalArtworkElement: () => void
  handleAdditionalArtworkUpload: (
    elementId: string,
    event: ChangeEvent<HTMLInputElement>,
  ) => void | Promise<void>
  handleUseSteamArtworkAsAdditionalArtwork: (
    elementId: string,
    asset: SteamArtworkAsset,
  ) => void | Promise<void>
  handleUseLocalSteamScreenshotAsAdditionalArtwork: (
    elementId: string,
    asset: LocalSteamScreenshotAsset,
  ) => void | Promise<void>
  handleAdditionalArtworkLayoutChange: (
    elementId: string,
    field: AdditionalArtworkLayoutField,
    value: boolean | number,
  ) => void
  handleAdditionalArtworkLabelChange: (elementId: string, label: string) => void
  handleAdditionalArtworkFrameChange: (
    elementId: string,
    field: AdditionalArtworkFrameField,
    value: boolean | number | string,
  ) => void
  handleResetAdditionalArtworkElementLayout: (elementId: string) => void
  handleResetAdditionalArtworkElementFrame: (elementId: string) => void
  handleClearAdditionalArtworkElementImage: (elementId: string) => void
  handleRemoveAdditionalArtworkElement: (elementId: string) => void
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

function formatAdditionalArtworkSize(
  size: ProjectAdditionalArtworkElement['imageSize'],
) {
  return size ? ` (${size.width} x ${size.height}px)` : ''
}

function createSteamArtworkPickerItems(
  assets: SteamArtworkAsset[],
  selectedArtworkId?: string | null,
): ImageCandidatePickerItem[] {
  return assets.map((asset) => ({
    id: asset.id,
    title: asset.label,
    subtitle: `Source: Steam online · Type: ${formatArtworkKind(asset.kind)}`,
    imageUrl: asset.url,
    imageFit: 'cover',
    isSelected: selectedArtworkId === asset.id,
  }))
}

function createLocalSteamScreenshotPickerItems(
  assets: LocalSteamScreenshotAsset[],
  thumbnails: Record<string, string>,
  selectedArtworkId?: string | null,
): ImageCandidatePickerItem[] {
  return assets.map((asset) => {
    const modifiedDate = formatModifiedDate(asset.modifiedUnixSeconds)

    return {
      id: asset.id,
      title: asset.label,
      subtitle: 'Source: Local Steam screenshots · Type: Local screenshot',
      details: modifiedDate ? [`Modified: ${modifiedDate}`] : undefined,
      imageUrl: thumbnails[asset.id] ?? null,
      imageFit: 'cover',
      placeholderLabel: 'Local',
      isSelected: selectedArtworkId === asset.id,
    }
  })
}

function getNumericInputValue(event: { currentTarget: HTMLInputElement }) {
  return Number(event.currentTarget.value)
}

const BACKGROUND_SOURCE_LABELS: Record<ActiveBackgroundArtworkSource, string> = {
  'steam-artwork': 'Imported Steam artwork',
  'web-artwork': 'Web artwork',
  'local-steam-screenshot': 'Local Steam screenshot',
  'local-file': 'Local file',
  none: 'No source',
}

function getPersistedBackgroundArtworkSource(
  imageSource: ProjectImageAssetProvenance | null,
): PersistedBackgroundArtworkSource | null {
  if (!imageSource) return null

  switch (imageSource.source) {
    case 'steam-artwork':
    case 'web-artwork':
    case 'local-steam-screenshot':
      return imageSource.source
    case 'uploaded':
    case 'embedded':
      return imageSource.source
    default:
      return null
  }
}

function BackgroundArtworkFineTuneControls({
  source,
  idPrefix,
  sectionLabel,
  backgroundArtworkSource,
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
}: Pick<
  ArtworkPanelProps,
  | 'backgroundScale'
  | 'backgroundOffset'
  | 'backgroundOffsetSliderRanges'
  | 'handleBackgroundScaleChange'
  | 'handleBackgroundOffsetChange'
  | 'backgroundImageUrl'
  | 'handleResetBackground'
  | 'canFitBackgroundToSteamBannerOpenArea'
  | 'backgroundFitButtonLabel'
  | 'handleFitBackgroundToSteamBannerOpenArea'
> & {
  backgroundArtworkSource: ActiveBackgroundArtworkSource
  source: BackgroundArtworkSource
  idPrefix: string
  sectionLabel: string
}) {
  const hasBackgroundImage = Boolean(backgroundImageUrl)
  const canTune = canTuneBackgroundArtworkSource(
    backgroundArtworkSource,
    source,
    hasBackgroundImage,
  )
  const activeSourceLabel = BACKGROUND_SOURCE_LABELS[backgroundArtworkSource]
  const statusMessage = !hasBackgroundImage
    ? `Choose ${sectionLabel.toLowerCase()} to unlock scale, X/Y position, fit, and reset controls here.`
    : canTune
      ? `These controls adjust the current background from ${sectionLabel.toLowerCase()}.`
      : `Inactive while ${activeSourceLabel.toLowerCase()} controls the current background. Choose ${sectionLabel.toLowerCase()} to enable these controls.`

  return (
    <fieldset
      className="background-source-layout-controls"
      disabled={!canTune}
      aria-label={`${sectionLabel} background fine tuning controls`}
    >
      <legend>Placement</legend>
      <p className="hint">{statusMessage}</p>

      <div className="disc-text-layout-grid">
        <label>
          <span>Scale</span>
          <input
            id={`${idPrefix}-background-scale`}
            type="range"
            min={BACKGROUND_SCALE_MIN}
            max={BACKGROUND_SCALE_MAX}
            step="0.01"
            value={backgroundScale}
            onInput={(event) =>
              handleBackgroundScaleChange(getNumericInputValue(event))}
            onChange={(event) =>
              handleBackgroundScaleChange(getNumericInputValue(event))}
          />
        </label>

        <label>
          <span>X</span>
          <input
            id={`${idPrefix}-background-offset-x`}
            type="range"
            min={backgroundOffsetSliderRanges.x.min}
            max={backgroundOffsetSliderRanges.x.max}
            step="0.1"
            value={backgroundOffset.x}
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
            id={`${idPrefix}-background-offset-y`}
            type="range"
            min={backgroundOffsetSliderRanges.y.min}
            max={backgroundOffsetSliderRanges.y.max}
            step="0.1"
            value={backgroundOffset.y}
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
        onClick={handleResetBackground}
      >
        Reset background
      </button>
    </fieldset>
  )
}

function WebArtworkCandidateSection({
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

function ImportedSteamArtworkSection({
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
  const pickerItems = createLocalSteamScreenshotPickerItems(
    localSteamScreenshots,
    localSteamScreenshotThumbnails,
    selectedArtworkId,
  )
  const selectLocalSteamScreenshot = (itemId: string) => {
    const asset = localSteamScreenshots.find(
      (currentAsset) => currentAsset.id === itemId,
    )

    if (asset) return handleUseLocalSteamScreenshot(asset)
  }

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

function LocalArtworkSection({
  handleBackgroundUpload,
  fineTuneControls,
}: Pick<ArtworkPanelProps, 'handleBackgroundUpload'> & {
  fineTuneControls: ReactNode
}) {
  return (
    <details className="feature-section-card metadata-details collapsible-panel spacing-top">
      <summary className="panel-summary">Local file</summary>
      <div className="panel-content">
        <div className="artwork-import-section">
          <p className="hint">
            Choose an image from this computer when Steam, web, or screenshot sources do not have the artwork you want. Local files become the current disc background.
          </p>
          <label className="secondary-button logo-upload-button" htmlFor="background-upload">
            Choose local image
          </label>
          <input
            id="background-upload"
            className="logo-file-input"
            type="file"
            accept="image/*"
            onChange={handleBackgroundUpload}
          />
          {fineTuneControls}
        </div>
      </div>
    </details>
  )
}

function BackgroundArtworkControls(props: ArtworkPanelProps) {
  const {
    isBackgroundArtworkEnabled,
    handleBackgroundArtworkEnabledChange,
    backgroundImageUrl,
    backgroundImageSource,
    selectedArtworkId,
    selectedSteamGame,
    webArtworkDiscovery,
    localSteamScreenshots,
  } = props
  const backgroundStatus = getProjectImageAssetStatus({
    imageDataUrl: backgroundImageUrl,
    provenance: backgroundImageSource,
    fallbackLabel: 'No background image selected',
  })
  const backgroundArtworkSource = resolveActiveBackgroundArtworkSource({
    backgroundImageUrl,
    persistedSource: getPersistedBackgroundArtworkSource(backgroundImageSource),
    selectedArtworkId,
    steamArtwork: selectedSteamGame?.artwork ?? [],
    webArtworkCandidates: webArtworkDiscovery.candidates,
    localSteamScreenshots,
  })
  const renderFineTuneControls = (
    source: BackgroundArtworkSource,
    idPrefix: string,
    sectionLabel: string,
  ) => !isBackgroundArtworkEnabled ? null : (
    <BackgroundArtworkFineTuneControls
      {...props}
      backgroundArtworkSource={backgroundArtworkSource}
      source={source}
      idPrefix={idPrefix}
      sectionLabel={sectionLabel}
    />
  )

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

      <p className="hint">
        Current background: {backgroundStatus.summary}. {backgroundStatus.availabilityLabel}
        {!isBackgroundArtworkEnabled ? ' Background art is hidden from preview and export.' : ''}
      </p>
      <ImportedSteamArtworkSection
        {...props}
        fineTuneControls={renderFineTuneControls(
          'steam-artwork',
          'steam-artwork',
          'Imported Steam artwork',
        )}
      />
      <WebArtworkCandidateSection
        {...props}
        fineTuneControls={renderFineTuneControls(
          'web-artwork',
          'web-artwork',
          'Web artwork',
        )}
      />
      <LocalSteamScreenshotSection
        {...props}
        fineTuneControls={renderFineTuneControls(
          'local-steam-screenshot',
          'local-steam-screenshot',
          'Local Steam screenshot',
        )}
      />
      <LocalArtworkSection
        {...props}
        fineTuneControls={renderFineTuneControls(
          'local-file',
          'local-file',
          'Local file',
        )}
      />
    </div>
  )
}

function GameLogoArtworkControls({
  projectTitleArtwork,
  selectedDiscTemplate,
  handleTitleArtworkLayoutChange,
  handleResetTitleArtworkLayout,
  handleRestoreTitleArtworkDefault,
  handleTitleArtworkUpload,
}: Pick<
  ArtworkPanelProps,
  | 'projectTitleArtwork'
  | 'selectedDiscTemplate'
  | 'handleTitleArtworkLayoutChange'
  | 'handleResetTitleArtworkLayout'
  | 'handleRestoreTitleArtworkDefault'
  | 'handleTitleArtworkUpload'
>) {
  const hasTitleArtwork = canUseTitleArtwork(projectTitleArtwork)
  const isFeatureEnabled = projectTitleArtwork.layout.enabled
  const isRenderable = shouldRenderTitleArtwork(projectTitleArtwork)
  const defaultSteamLogo = getTitleArtworkDefaultSteamLogo(projectTitleArtwork)
  const canRestoreDefaultSteamLogo =
    canRestoreTitleArtworkDefaultSteamLogo(projectTitleArtwork)
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
    <div className="feature-control-body title-artwork-control">
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

          {canRestoreDefaultSteamLogo ? (
            <button
              className="secondary-button"
              type="button"
              onClick={handleRestoreTitleArtworkDefault}
            >
              Restore Steam default game logo
            </button>
          ) : null}

          {defaultSteamLogo ? (
            <p className="hint">Steam default: {defaultSteamLogo.sourceLabel}.</p>
          ) : null}

          <p className="hint">
            This is the game title/logo artwork on the disc face, not the Steam banner lockup in Branding. Steam import can seed the Steam CDN logo when available; rendered title text stays independently available in the Text tab as the fallback.
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

function AddAdditionalArtworkButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      className="secondary-button icon-text-button"
      type="button"
      onClick={onClick}
    >
      <PlusIcon />
      <span>Add artwork element</span>
    </button>
  )
}

function AdditionalArtworkElementControls({
  element,
  elementIndex,
  selectedSteamGame,
  localSteamScreenshots,
  localSteamScreenshotThumbnails,
  selectedDiscTemplate,
  projectAdditionalArtwork,
  handleAdditionalArtworkUpload,
  handleUseSteamArtworkAsAdditionalArtwork,
  handleUseLocalSteamScreenshotAsAdditionalArtwork,
  handleAdditionalArtworkLayoutChange,
  handleAdditionalArtworkLabelChange,
  handleAdditionalArtworkFrameChange,
  handleResetAdditionalArtworkElementLayout,
  handleResetAdditionalArtworkElementFrame,
  handleClearAdditionalArtworkElementImage,
  handleRemoveAdditionalArtworkElement,
  handleAddAdditionalArtworkElement,
  showAddButton,
}: Pick<
  ArtworkPanelProps,
  | 'selectedSteamGame'
  | 'localSteamScreenshots'
  | 'localSteamScreenshotThumbnails'
  | 'selectedDiscTemplate'
  | 'projectAdditionalArtwork'
  | 'handleAdditionalArtworkUpload'
  | 'handleUseSteamArtworkAsAdditionalArtwork'
  | 'handleUseLocalSteamScreenshotAsAdditionalArtwork'
  | 'handleAdditionalArtworkLayoutChange'
  | 'handleAdditionalArtworkLabelChange'
  | 'handleAdditionalArtworkFrameChange'
  | 'handleResetAdditionalArtworkElementLayout'
  | 'handleResetAdditionalArtworkElementFrame'
  | 'handleClearAdditionalArtworkElementImage'
  | 'handleRemoveAdditionalArtworkElement'
  | 'handleAddAdditionalArtworkElement'
> & {
  element: ProjectAdditionalArtworkElement
  elementIndex: number
  showAddButton: boolean
}) {
  const hasImage = canUseAdditionalArtworkElement(element)
  const isRenderable = shouldRenderAdditionalArtworkElement(
    projectAdditionalArtwork,
    element,
  )
  const sliderRanges = getAdditionalArtworkLayoutSliderRanges(
    element,
    selectedDiscTemplate,
  )
  const uploadId = `additional-artwork-upload-${element.id}`
  const title = `Artwork ${elementIndex + 1}`
  const deleteLabel = `Delete ${title.toLowerCase()}`
  const summary = [
    element.layout.enabled ? 'shown' : 'hidden',
    hasImage ? element.sourceLabel : 'no image',
    element.frame.enabled ? `${element.frame.shape} frame` : 'no frame',
  ].join(' · ')
  const steamArtwork = selectedSteamGame?.artwork ?? []
  const steamArtworkPickerItems = createSteamArtworkPickerItems(steamArtwork)
  const localScreenshotPickerItems = createLocalSteamScreenshotPickerItems(
    localSteamScreenshots,
    localSteamScreenshotThumbnails,
  )
  const selectSteamArtworkForElement = (itemId: string) => {
    const asset = steamArtwork.find(
      (currentAsset) => currentAsset.id === itemId,
    )

    if (asset) {
      return handleUseSteamArtworkAsAdditionalArtwork(
        element.id,
        asset,
      )
    }
  }
  const selectLocalSteamScreenshotForElement = (itemId: string) => {
    const asset = localSteamScreenshots.find(
      (currentAsset) => currentAsset.id === itemId,
    )

    if (asset) {
      return handleUseLocalSteamScreenshotAsAdditionalArtwork(
        element.id,
        asset,
      )
    }
  }

  return (
    <>
      <RepeatedVisualElementCard
        title={title}
        label={element.label}
        labelInputId={`additional-artwork-label-${element.id}`}
        enabled={element.layout.enabled}
        enableLabel={`Show ${title.toLowerCase()}`}
        summary={summary}
        deleteLabel={deleteLabel}
        onEnabledChange={(enabled) =>
          handleAdditionalArtworkLayoutChange(element.id, 'enabled', enabled)}
        onLabelChange={(nextLabel) =>
          handleAdditionalArtworkLabelChange(element.id, nextLabel)}
        onDelete={() => handleRemoveAdditionalArtworkElement(element.id)}
      >
        <>
          <span className="field-label spacing-top">Image source</span>
          <label
            className="secondary-button logo-upload-button"
            htmlFor={uploadId}
          >
            {hasImage ? 'Replace with local image' : 'Choose local image'}
          </label>
          <input
            id={uploadId}
            className="logo-file-input"
            type="file"
            accept="image/*"
            onChange={(event) =>
              void handleAdditionalArtworkUpload(element.id, event)}
          />

          {selectedSteamGame?.artwork.length ? (
            <details className="metadata-details collapsible-panel spacing-top">
              <summary className="panel-summary">Use imported Steam artwork</summary>
              <div className="panel-content">
                <ImageCandidatePreviewPicker
                  ariaLabel={`${title} imported Steam artwork previews`}
                  title={`${title} Steam Artwork`}
                  items={steamArtworkPickerItems}
                  selectLabel={`Use for ${title.toLowerCase()}`}
                  onSelect={selectSteamArtworkForElement}
                />
              </div>
            </details>
          ) : null}

          {localSteamScreenshots.length > 0 ? (
            <details className="metadata-details collapsible-panel spacing-top">
              <summary className="panel-summary">Use local Steam screenshot</summary>
              <div className="panel-content">
                <ImageCandidatePreviewPicker
                  ariaLabel={`${title} local Steam screenshot previews`}
                  title={`${title} Local Steam Screenshots`}
                  items={localScreenshotPickerItems}
                  selectLabel={`Use for ${title.toLowerCase()}`}
                  onSelect={selectLocalSteamScreenshotForElement}
                />
              </div>
            </details>
          ) : null}

          {hasImage ? (
            <div className="selected-lockup-card logo-asset-status-card">
              <img
                className="logo-asset-preview additional-artwork-preview"
                src={element.imageDataUrl ?? undefined}
                alt=""
                draggable={false}
              />
              <span>
                {element.sourceLabel}
                {formatAdditionalArtworkSize(element.imageSize)}
              </span>
            </div>
          ) : (
            <p className="hint">
              No image is selected yet. Upload a local image or use an imported Steam artwork source.
            </p>
          )}

          <div className="additional-artwork-frame-controls">
            <label className="field-label">
              <input
                type="checkbox"
                checked={element.frame.enabled}
                onChange={(event) =>
                  handleAdditionalArtworkFrameChange(
                    element.id,
                    'enabled',
                    event.target.checked,
                  )}
              />
              Show border/frame
            </label>

            {element.frame.enabled ? (
              <div className="disc-text-layout-grid">
                <label>
                  <span>Shape</span>
                  <select
                    value={element.frame.shape}
                    onChange={(event) =>
                      handleAdditionalArtworkFrameChange(
                        element.id,
                        'shape',
                        event.target.value,
                      )}
                  >
                    <option value="rectangle">Rectangle</option>
                    <option value="circle">Circle / oval</option>
                  </select>
                </label>

                <label>
                  <span>Color</span>
                  <input
                    type="color"
                    value={element.frame.color}
                    onChange={(event) =>
                      handleAdditionalArtworkFrameChange(
                        element.id,
                        'color',
                        event.target.value,
                      )}
                  />
                </label>

                <label>
                  <span>Width</span>
                  <input
                    type="range"
                    min={ADDITIONAL_ARTWORK_FRAME_WIDTH_MIN}
                    max={ADDITIONAL_ARTWORK_FRAME_WIDTH_MAX}
                    step="0.25"
                    value={element.frame.width}
                    onInput={(event) =>
                      handleAdditionalArtworkFrameChange(
                        element.id,
                        'width',
                        getNumericInputValue(event),
                      )}
                    onChange={(event) =>
                      handleAdditionalArtworkFrameChange(
                        element.id,
                        'width',
                        getNumericInputValue(event),
                      )}
                  />
                </label>

                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => handleResetAdditionalArtworkElementFrame(element.id)}
                >
                  Reset frame
                </button>
              </div>
            ) : null}
          </div>

          <div
            className="disc-text-layout-grid"
            aria-label={`${title} fine tuning controls`}
          >
            <label>
              <span>Scale</span>
              <input
                type="range"
                min={ADDITIONAL_ARTWORK_SCALE_MIN}
                max={ADDITIONAL_ARTWORK_SCALE_MAX}
                step="0.01"
                value={element.layout.scale}
                disabled={!isRenderable}
                onInput={(event) =>
                  handleAdditionalArtworkLayoutChange(
                    element.id,
                    'scale',
                    getNumericInputValue(event),
                  )}
                onChange={(event) =>
                  handleAdditionalArtworkLayoutChange(
                    element.id,
                    'scale',
                    getNumericInputValue(event),
                  )}
              />
            </label>

            <label>
              <span>X</span>
              <input
                type="range"
                min={sliderRanges.x.min}
                max={sliderRanges.x.max}
                step="0.1"
                value={element.layout.x}
                disabled={!isRenderable}
                onInput={(event) =>
                  handleAdditionalArtworkLayoutChange(
                    element.id,
                    'x',
                    getNumericInputValue(event),
                  )}
                onChange={(event) =>
                  handleAdditionalArtworkLayoutChange(
                    element.id,
                    'x',
                    getNumericInputValue(event),
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
                value={element.layout.y}
                disabled={!isRenderable}
                onInput={(event) =>
                  handleAdditionalArtworkLayoutChange(
                    element.id,
                    'y',
                    getNumericInputValue(event),
                  )}
                onChange={(event) =>
                  handleAdditionalArtworkLayoutChange(
                    element.id,
                    'y',
                    getNumericInputValue(event),
                  )}
              />
            </label>
          </div>

          <button
            className="secondary-button"
            type="button"
            onClick={() => handleResetAdditionalArtworkElementLayout(element.id)}
          >
            Reset {title.toLowerCase()} layout
          </button>
          {showAddButton ? (
            <AddAdditionalArtworkButton onClick={handleAddAdditionalArtworkElement} />
          ) : null}
          {hasImage ? (
            <button
              className="secondary-button"
              type="button"
              onClick={() => handleClearAdditionalArtworkElementImage(element.id)}
            >
              Clear {title.toLowerCase()} image
            </button>
          ) : null}
        </>
      </RepeatedVisualElementCard>
      {showAddButton && !element.layout.enabled ? (
        <AddAdditionalArtworkButton onClick={handleAddAdditionalArtworkElement} />
      ) : null}
    </>
  )
}

function AdditionalArtworkControls(props: ArtworkPanelProps) {
  const {
    projectAdditionalArtwork,
    handleAdditionalArtworkEnabledChange,
    handleAddAdditionalArtworkElement,
  } = props
  const isEnabled = projectAdditionalArtwork.enabled
  const hasArtworkElements = projectAdditionalArtwork.elements.length > 0

  return (
    <div className="feature-control-body additional-artwork-control">
      <label className="field-label">
        <input
          type="checkbox"
          checked={isEnabled}
          onChange={(event) =>
            handleAdditionalArtworkEnabledChange(event.target.checked)}
        />
        Show additional artwork
      </label>

      {!isEnabled ? null : (
        <>
          {!hasArtworkElements ? (
            <>
              <AddAdditionalArtworkButton onClick={handleAddAdditionalArtworkElement} />

              <p className="hint">
                Add a disc-surface image for characters, screenshots, key art, or other extra artwork.
              </p>
            </>
          ) : null}

          {projectAdditionalArtwork.elements.map((element, index) => (
            <AdditionalArtworkElementControls
              key={element.id}
              {...props}
              element={element}
              elementIndex={index}
              showAddButton={index === projectAdditionalArtwork.elements.length - 1}
            />
          ))}
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
        <details className="feature-section-card metadata-details collapsible-panel spacing-top">
          <summary className="panel-summary">Game Logo</summary>
          <div className="panel-content">
            <GameLogoArtworkControls {...props} />
          </div>
        </details>
        <details className="feature-section-card metadata-details collapsible-panel spacing-top">
          <summary className="panel-summary">Additional Artwork</summary>
          <div className="panel-content">
            <AdditionalArtworkControls {...props} />
          </div>
        </details>
      </div>
    </details>
  )
}
