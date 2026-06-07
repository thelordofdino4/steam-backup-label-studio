import { getAdditionalArtworkLayoutSliderRanges } from '../../../layout/discElementSafeZone'
import {
  ADDITIONAL_ARTWORK_FRAME_WIDTH_MAX,
  ADDITIONAL_ARTWORK_FRAME_WIDTH_MIN,
  ADDITIONAL_ARTWORK_SCALE_MAX,
  ADDITIONAL_ARTWORK_SCALE_MIN,
  canUseAdditionalArtworkElement,
  shouldRenderAdditionalArtworkElement,
} from '../../../project/projectAdditionalArtwork'
import type { ProjectAdditionalArtworkElement } from '../../../project/projectTypes'
import { PlusIcon } from '../PanelIcons'
import { RepeatedVisualElementCard } from '../RepeatedVisualElementCard'
import { ArtworkImageSourceControls } from './ArtworkImageSourceControls'
import {
  formatAdditionalArtworkSize,
  getNumericInputValue,
} from './helpers'
import type { ArtworkPanelProps } from './types'

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
  webArtworkDiscovery,
  localSteamScreenshots,
  localSteamScreenshotThumbnails,
  hasCheckedLocalSteamScreenshots,
  isLocalSteamScreenshotsLoading,
  selectedDiscTemplate,
  projectAdditionalArtwork,
  handleFindWebArtworkCandidates,
  handleAdditionalArtworkUpload,
  handleUseSteamArtworkAsAdditionalArtwork,
  handleUseWebArtworkCandidateAsAdditionalArtwork,
  handleFindLocalSteamScreenshots,
  handleOpenLocalSteamScreenshotFolder,
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
  | 'webArtworkDiscovery'
  | 'localSteamScreenshots'
  | 'localSteamScreenshotThumbnails'
  | 'hasCheckedLocalSteamScreenshots'
  | 'isLocalSteamScreenshotsLoading'
  | 'selectedDiscTemplate'
  | 'projectAdditionalArtwork'
  | 'handleFindWebArtworkCandidates'
  | 'handleAdditionalArtworkUpload'
  | 'handleUseSteamArtworkAsAdditionalArtwork'
  | 'handleUseWebArtworkCandidateAsAdditionalArtwork'
  | 'handleFindLocalSteamScreenshots'
  | 'handleOpenLocalSteamScreenshotFolder'
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
  const imageSource = {
    source: element.source,
    sourceId: element.sourceId,
  }
  const summary = [
    element.layout.enabled ? 'shown' : 'hidden',
    hasImage ? element.sourceLabel : 'no image',
    element.frame.enabled ? `${element.frame.shape} frame` : 'no frame',
  ].join(' · ')

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
          <ArtworkImageSourceControls
            selectedSteamGame={selectedSteamGame}
            localSteamScreenshots={localSteamScreenshots}
            localSteamScreenshotThumbnails={localSteamScreenshotThumbnails}
            hasCheckedLocalSteamScreenshots={hasCheckedLocalSteamScreenshots}
            isLocalSteamScreenshotsLoading={isLocalSteamScreenshotsLoading}
            onFindLocalSteamScreenshots={handleFindLocalSteamScreenshots}
            onOpenLocalSteamScreenshotFolder={
              handleOpenLocalSteamScreenshotFolder
            }
            webArtworkDiscovery={webArtworkDiscovery}
            onFindWebArtworkCandidates={handleFindWebArtworkCandidates}
            uploadId={uploadId}
            title={title}
            hasImage={hasImage}
            imageSource={imageSource}
            localFileActionLabel={
              hasImage ? 'Replace with local image' : 'Choose local image'
            }
            localFileHint="Choose a local image from this computer when Steam, web, or screenshot sources do not have the artwork you want."
            onUpload={(event) =>
              handleAdditionalArtworkUpload(element.id, event)}
            onUseSteamArtwork={(asset) =>
              handleUseSteamArtworkAsAdditionalArtwork(element.id, asset)}
            onUseLocalSteamScreenshot={(asset) =>
              handleUseLocalSteamScreenshotAsAdditionalArtwork(
                element.id,
                asset,
              )}
            onUseWebArtworkCandidate={(candidate) =>
              handleUseWebArtworkCandidateAsAdditionalArtwork(
                element.id,
                candidate,
              )}
          />

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

export function AdditionalArtworkControls(props: ArtworkPanelProps) {
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
