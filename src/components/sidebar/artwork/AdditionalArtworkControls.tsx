import type { Ref } from 'react'
import { getAdditionalArtworkLayoutSliderRanges } from '../../../layout/discElementSafeZone'
import {
  ADDITIONAL_ARTWORK_SCALE_MAX,
  ADDITIONAL_ARTWORK_SCALE_MIN,
  canUseAdditionalArtworkElement,
  shouldRenderAdditionalArtworkElement,
} from '../../../project/projectAdditionalArtwork'
import {
  createRepeatedArtworkSummary,
} from '../../../editor/repeatedArtwork'
import type { ProjectAdditionalArtworkElement } from '../../../project/projectTypes'
import { EditorArtworkFrameControls } from '../../editor/EditorArtworkFrameControls'
import { OptionalFeatureSection } from '../../editor/OptionalFeatureSection'
import { EditorRangeField } from '../../editor/EditorRangeField'
import { PlusIcon } from '../PanelIcons'
import { RepeatedVisualElementCard } from '../RepeatedVisualElementCard'
import { ArtworkImageSourceControls } from './ArtworkImageSourceControls'
import { formatAdditionalArtworkSize } from './helpers'
import type { ArtworkPanelProps } from './types'

function AddAdditionalArtworkButton({
  controlRef,
  onClick,
}: {
  controlRef?: Ref<HTMLButtonElement>
  onClick: () => void
}) {
  return (
    <button
      ref={controlRef}
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
> & {
  element: ProjectAdditionalArtworkElement
  elementIndex: number
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
  const summary = createRepeatedArtworkSummary({
    enabled: element.layout.enabled,
    imageSummary: hasImage ? element.sourceLabel : 'no image',
    frame: element.frame,
  })

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
            <div className="editor-asset-status-card logo-asset-status-card">
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

          <EditorArtworkFrameControls
            frame={element.frame}
            idPrefix={`additional-artwork-${element.id}`}
            onFrameChange={(field, value) =>
              handleAdditionalArtworkFrameChange(element.id, field, value)}
            onResetFrame={() =>
              handleResetAdditionalArtworkElementFrame(element.id)}
          />

          <div
            className="editor-control-grid"
            aria-label={`${title} fine tuning controls`}
          >
            <EditorRangeField
              id={`additional-artwork-${element.id}-scale`}
              label="Scale"
              min={ADDITIONAL_ARTWORK_SCALE_MIN}
              max={ADDITIONAL_ARTWORK_SCALE_MAX}
              step={0.01}
              value={element.layout.scale}
              disabled={!isRenderable}
              onInput={(value) =>
                handleAdditionalArtworkLayoutChange(
                  element.id,
                  'scale',
                  value,
                )}
              onChange={(value) =>
                handleAdditionalArtworkLayoutChange(
                  element.id,
                  'scale',
                  value,
                )}
            />

            <EditorRangeField
              id={`additional-artwork-${element.id}-x`}
              label="X"
              min={sliderRanges.x.min}
              max={sliderRanges.x.max}
              step={0.1}
              value={element.layout.x}
              disabled={!isRenderable}
              onInput={(value) =>
                handleAdditionalArtworkLayoutChange(element.id, 'x', value)}
              onChange={(value) =>
                handleAdditionalArtworkLayoutChange(element.id, 'x', value)}
            />

            <EditorRangeField
              id={`additional-artwork-${element.id}-y`}
              label="Y"
              min={sliderRanges.y.min}
              max={sliderRanges.y.max}
              step={0.1}
              value={element.layout.y}
              disabled={!isRenderable}
              onInput={(value) =>
                handleAdditionalArtworkLayoutChange(element.id, 'y', value)}
              onChange={(value) =>
                handleAdditionalArtworkLayoutChange(element.id, 'y', value)}
            />
          </div>

          <button
            className="secondary-button"
            type="button"
            onClick={() => handleResetAdditionalArtworkElementLayout(element.id)}
          >
            Reset {title.toLowerCase()} layout
          </button>
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
    </>
  )
}

export type AdditionalArtworkControlsProps = ArtworkPanelProps & {
  addControlRef?: Ref<HTMLButtonElement>
  enableControlRef?: Ref<HTMLInputElement>
}

export function AdditionalArtworkControls({
  addControlRef,
  enableControlRef,
  ...props
}: AdditionalArtworkControlsProps) {
  const {
    projectAdditionalArtwork,
    handleAdditionalArtworkEnabledChange,
    handleAddAdditionalArtworkElement,
  } = props
  const isEnabled = projectAdditionalArtwork.enabled
  const hasArtworkElements = projectAdditionalArtwork.elements.length > 0

  return (
    <OptionalFeatureSection
      className="feature-control-body additional-artwork-control"
      enabled={isEnabled}
      enableControlRef={enableControlRef}
      enableLabel="Show additional artwork"
      onEnabledChange={handleAdditionalArtworkEnabledChange}
    >
      <AddAdditionalArtworkButton
        controlRef={addControlRef}
        onClick={handleAddAdditionalArtworkElement}
      />

      {!hasArtworkElements ? (
        <p className="hint">
          Add a disc-surface image for characters, screenshots, key art, or other extra artwork.
        </p>
      ) : null}

      {projectAdditionalArtwork.elements.map((element, index) => (
        <AdditionalArtworkElementControls
          key={element.id}
          {...props}
          element={element}
          elementIndex={index}
        />
      ))}
    </OptionalFeatureSection>
  )
}
