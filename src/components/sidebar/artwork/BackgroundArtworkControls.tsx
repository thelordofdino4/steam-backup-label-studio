import type { ReactNode, Ref } from 'react'
import {
  BACKGROUND_SCALE_MAX,
  BACKGROUND_SCALE_MIN,
} from '../../../image/backgroundImage'
import {
  canTuneBackgroundArtworkSource,
  type ActiveBackgroundArtworkSource,
  type BackgroundArtworkSource,
  type PersistedBackgroundArtworkSource,
  resolveActiveBackgroundArtworkSource,
} from '../../../image/backgroundArtworkSource'
import { getProjectImageAssetStatus } from '../../../project/projectAssetStatus'
import type { ProjectImageAssetProvenance } from '../../../project/projectTypes'
import { EditorRangeField } from '../../editor/EditorRangeField'
import { LocalFileArtworkControls } from './LocalFileArtworkControls'
import { LocalScreenshotControls } from './LocalScreenshotControls'
import { SteamArtworkControls } from './SteamArtworkControls'
import type { ArtworkPanelProps } from './types'

type BackgroundArtworkControlsProps = ArtworkPanelProps & {
  enableControlRef?: Ref<HTMLInputElement>
  localFilePanelOpen?: boolean
  localUploadControlRef?: Ref<HTMLInputElement>
  onLocalFilePanelOpenChange?: (open: boolean) => void
}
import { WebArtworkCandidateControls } from './WebArtworkCandidateControls'

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

      <div className="editor-control-grid">
        <EditorRangeField
          id={`${idPrefix}-background-scale`}
          label="Scale"
          min={BACKGROUND_SCALE_MIN}
          max={BACKGROUND_SCALE_MAX}
          step={0.01}
          value={backgroundScale}
          onInput={handleBackgroundScaleChange}
          onChange={handleBackgroundScaleChange}
        />

        <EditorRangeField
          id={`${idPrefix}-background-offset-x`}
          label="X"
          min={backgroundOffsetSliderRanges.x.min}
          max={backgroundOffsetSliderRanges.x.max}
          step={0.1}
          value={backgroundOffset.x}
          onInput={(value) => handleBackgroundOffsetChange('x', value)}
          onChange={(value) => handleBackgroundOffsetChange('x', value)}
        />

        <EditorRangeField
          id={`${idPrefix}-background-offset-y`}
          label="Y"
          min={backgroundOffsetSliderRanges.y.min}
          max={backgroundOffsetSliderRanges.y.max}
          step={0.1}
          value={backgroundOffset.y}
          onInput={(value) => handleBackgroundOffsetChange('y', value)}
          onChange={(value) => handleBackgroundOffsetChange('y', value)}
        />
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

export function BackgroundArtworkControls(props: BackgroundArtworkControlsProps) {
  const {
    isBackgroundArtworkEnabled,
    handleBackgroundArtworkEnabledChange,
    backgroundImageUrl,
    backgroundImageSource,
    selectedArtworkId,
    selectedSteamGame,
    webArtworkDiscovery,
    localSteamScreenshots,
    enableControlRef,
    localFilePanelOpen,
    localUploadControlRef,
    onLocalFilePanelOpenChange,
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
  ): ReactNode => !isBackgroundArtworkEnabled ? null : (
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
          ref={enableControlRef}
          type="checkbox"
          checked={isBackgroundArtworkEnabled}
          onChange={(event) =>
            handleBackgroundArtworkEnabledChange(event.target.checked)}
        />
        Show background image
      </label>

      <p className="hint">
        Current background: {backgroundStatus.summary}. {backgroundStatus.availabilityLabel}
        {!isBackgroundArtworkEnabled ? ' Background image is hidden from preview and export.' : ''}
      </p>
      <SteamArtworkControls
        {...props}
        fineTuneControls={renderFineTuneControls(
          'steam-artwork',
          'steam-artwork',
          'Imported Steam artwork',
        )}
      />
      <WebArtworkCandidateControls
        {...props}
        fineTuneControls={renderFineTuneControls(
          'web-artwork',
          'web-artwork',
          'Web artwork',
        )}
      />
      <LocalScreenshotControls
        {...props}
        fineTuneControls={renderFineTuneControls(
          'local-steam-screenshot',
          'local-steam-screenshot',
          'Local Steam screenshot',
        )}
      />
      <LocalFileArtworkControls
        {...props}
        open={localFilePanelOpen}
        onOpenChange={onLocalFilePanelOpenChange}
        uploadControlRef={localUploadControlRef}
        fineTuneControls={renderFineTuneControls(
          'local-file',
          'local-file',
          'Local file',
        )}
      />
    </div>
  )
}
