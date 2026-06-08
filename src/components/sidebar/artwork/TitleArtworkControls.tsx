import { DISC_LAYOUT_CENTER_PERCENT } from '../../../disc/geometry'
import { getTitleArtworkLayoutSliderRanges } from '../../../layout/discElementSafeZone'
import {
  canRestoreTitleArtworkDefaultSteamLogo,
  canUseTitleArtwork,
  getTitleArtworkDefaultSteamLogo,
  shouldRenderTitleArtwork,
  TITLE_ARTWORK_SCALE_MAX,
  TITLE_ARTWORK_SCALE_MIN,
} from '../../../project/projectTitleArtwork'
import { EditorImageAssetStatusCard } from '../../editor/EditorImageAssetStatusCard'
import { EditorRangeField } from '../../editor/EditorRangeField'
import { formatTitleArtworkSize } from './helpers'
import type { ArtworkPanelProps } from './types'

export function TitleArtworkControls({
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

          <EditorImageAssetStatusCard
            cardClassName="title-artwork-status-card"
            emptyHint="No game logo image is selected yet. Importing a Steam game can seed the Steam CDN logo automatically, or upload a custom image here."
            fallbackLabel="Game logo image"
            formatSize={formatTitleArtworkSize}
            imageDataUrl={projectTitleArtwork.imageDataUrl}
            imageSize={projectTitleArtwork.imageSize}
            previewClassName="title-artwork-preview"
            statusText="source-label"
          />

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
            className="editor-control-grid"
            aria-label="Game logo fine tuning controls"
          >
            <EditorRangeField
              id="title-artwork-scale"
              label="Scale"
              min={TITLE_ARTWORK_SCALE_MIN}
              max={TITLE_ARTWORK_SCALE_MAX}
              step={0.01}
              value={projectTitleArtwork.layout.scale}
              disabled={!isRenderable}
              onInput={(value) =>
                handleTitleArtworkLayoutChange('scale', value)}
              onChange={(value) =>
                handleTitleArtworkLayoutChange('scale', value)}
            />

            <EditorRangeField
              id="title-artwork-x"
              label="X"
              min={xOffsetSliderRange.min}
              max={xOffsetSliderRange.max}
              step={0.1}
              value={xOffset}
              disabled={!isRenderable}
              onInput={(value) =>
                handleTitleArtworkLayoutChange(
                  'x',
                  DISC_LAYOUT_CENTER_PERCENT + value,
                )}
              onChange={(value) =>
                handleTitleArtworkLayoutChange(
                  'x',
                  DISC_LAYOUT_CENTER_PERCENT + value,
                )}
            />

            <EditorRangeField
              id="title-artwork-y"
              label="Y"
              min={sliderRanges.y.min}
              max={sliderRanges.y.max}
              step={0.1}
              value={projectTitleArtwork.layout.y}
              disabled={!isRenderable}
              onInput={(value) => handleTitleArtworkLayoutChange('y', value)}
              onChange={(value) => handleTitleArtworkLayoutChange('y', value)}
            />
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
