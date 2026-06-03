import type { ChangeEvent } from 'react'
import type { LocalSteamScreenshotAsset } from '../../local/localArtwork'
import type {
  ProjectCaseInsertImageSlot,
} from '../../project/projectTypes'
import type {
  SteamArtworkAsset,
  SteamImportedGame,
} from '../../steam/steamApi'
import { ImageCandidatePreviewPicker } from '../sidebar/ImageCandidatePicker'
import {
  createLocalSteamScreenshotPickerItems,
  createSteamArtworkPickerItems,
} from '../sidebar/artwork/helpers'

export type CaseInsertImageSourceCatalog = {
  selectedSteamGame: SteamImportedGame | null
  localSteamScreenshots: LocalSteamScreenshotAsset[]
  localSteamScreenshotThumbnails: Record<string, string>
}

export type CaseInsertImageSourceControlsProps = CaseInsertImageSourceCatalog & {
  uploadId: string
  title: string
  hasImage: boolean
  imageSource: ProjectCaseInsertImageSlot['imageSource']
  onUpload: (event: ChangeEvent<HTMLInputElement>) => void | Promise<void>
  onUseSteamArtwork: (asset: SteamArtworkAsset) => void | Promise<void>
  onUseLocalSteamScreenshot: (
    asset: LocalSteamScreenshotAsset,
  ) => void | Promise<void>
}

export function CaseInsertImageSourceControls({
  uploadId,
  title,
  hasImage,
  imageSource,
  selectedSteamGame,
  localSteamScreenshots,
  localSteamScreenshotThumbnails,
  onUpload,
  onUseSteamArtwork,
  onUseLocalSteamScreenshot,
}: CaseInsertImageSourceControlsProps) {
  const steamArtwork = selectedSteamGame?.artwork ?? []
  const selectedSteamArtworkId =
    imageSource?.source === 'steam-artwork' ? imageSource.sourceId : null
  const selectedLocalSteamScreenshotId =
    imageSource?.source === 'local-steam-screenshot'
      ? imageSource.sourceId
      : null
  const steamArtworkPickerItems = createSteamArtworkPickerItems(
    steamArtwork,
    selectedSteamArtworkId,
  )
  const localScreenshotPickerItems = createLocalSteamScreenshotPickerItems(
    localSteamScreenshots,
    localSteamScreenshotThumbnails,
    selectedLocalSteamScreenshotId,
  )

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

  return (
    <>
      <span className="field-label spacing-top">Image source</span>
      <label className="secondary-button spacing-top" htmlFor={uploadId}>
        {hasImage ? `Replace ${title}` : `Choose ${title}`}
      </label>
      <input
        id={uploadId}
        className="case-insert-file-input"
        type="file"
        accept="image/*"
        onChange={(event) => void onUpload(event)}
      />

      {steamArtwork.length > 0 ? (
        <details className="metadata-details collapsible-panel spacing-top">
          <summary className="panel-summary">Use imported Steam artwork</summary>
          <div className="panel-content">
            <ImageCandidatePreviewPicker
              ariaLabel={`${title} imported Steam artwork previews`}
              title={`${title} Steam Artwork`}
              items={steamArtworkPickerItems}
              selectLabel={`Use for ${title}`}
              onSelect={selectSteamArtwork}
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
              selectLabel={`Use for ${title}`}
              onSelect={selectLocalSteamScreenshot}
            />
          </div>
        </details>
      ) : null}
    </>
  )
}
