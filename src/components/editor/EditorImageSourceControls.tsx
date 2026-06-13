import { useCallback, type ChangeEvent, type ReactNode } from 'react'
import type { WebArtworkDiscoveryState } from '../../hooks/useWebArtworkDiscovery'
import type { LocalSteamScreenshotAsset } from '../../local/localArtwork'
import type { ProjectImageAssetSource } from '../../project/projectTypes'
import type { RemoteLogoCandidate } from '../../steam/steamLogoCandidates'
import type {
  SteamArtworkAsset,
  SteamImportedGame,
} from '../../steam/steamApi'
import { ImageCandidatePreviewPicker } from '../sidebar/ImageCandidatePicker'
import { EditorFeaturePanel } from './EditorPanel'
import {
  createEditorLocalSteamScreenshotPickerItems,
  createEditorSteamArtworkPickerItems,
  createEditorWebArtworkPickerItems,
} from './editorImageSourcePickerItems'
import type { ImageCandidateTarget } from '../../editor/imageCandidateRanking'

const EMPTY_STEAM_ARTWORK: SteamArtworkAsset[] = []

export type EditorImageSourceControlSource =
  | 'steam-artwork'
  | 'web-artwork'
  | 'local-steam-screenshot'
  | 'local-file'

export type EditorImageSourceCatalog = {
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

export type EditorImageSourceSelection = {
  source?: ProjectImageAssetSource | string | null
  sourceId?: string | null
} | null | undefined

export type EditorImageSourceControlsProps = EditorImageSourceCatalog & {
  uploadId: string
  title: string
  hasImage: boolean
  imageSource: EditorImageSourceSelection
  allowSteamArtwork?: boolean
  allowWebArtwork?: boolean
  allowLocalSteamScreenshots?: boolean
  localFileActionLabel?: string
  localFileHint?: string
  imageCandidateTarget?: ImageCandidateTarget
  onUpload: (event: ChangeEvent<HTMLInputElement>) => void | Promise<void>
  onUseSteamArtwork: (asset: SteamArtworkAsset) => void | Promise<void>
  onUseLocalSteamScreenshot: (
    asset: LocalSteamScreenshotAsset,
  ) => void | Promise<void>
  onUseWebArtworkCandidate: (
    candidate: RemoteLogoCandidate,
  ) => void | Promise<void>
  renderFineTuneControls?: (
    source: EditorImageSourceControlSource,
    sectionLabel: string,
  ) => ReactNode
}

const EDITOR_IMAGE_SOURCE_PANEL_LABELS:
Record<EditorImageSourceControlSource, string> = {
  'steam-artwork': 'Imported Steam artwork',
  'web-artwork': 'Web artwork',
  'local-steam-screenshot': 'Local Steam screenshots',
  'local-file': 'Local file',
}

function getSelectedEditorImageSourceId(
  imageSource: EditorImageSourceSelection,
  source: EditorImageSourceControlSource,
) {
  return imageSource?.source === source ? imageSource.sourceId ?? null : null
}

function getLocalFileActionLabel(title: string, hasImage: boolean) {
  const target = title.trim() || 'artwork'

  return hasImage ? `Replace ${target}` : `Choose ${target}`
}

function getDefaultImageCandidateTarget(title: string): ImageCandidateTarget {
  const normalizedTitle = title.toLocaleLowerCase()

  if (normalizedTitle.includes('logo') || normalizedTitle.includes('title')) {
    return 'logo'
  }

  if (normalizedTitle.includes('background')) {
    return 'background'
  }

  return 'supportingArtwork'
}

export function EditorImageSourceControls({
  uploadId,
  title,
  hasImage,
  imageSource,
  allowSteamArtwork = true,
  allowWebArtwork = true,
  allowLocalSteamScreenshots = true,
  imageCandidateTarget,
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
}: EditorImageSourceControlsProps) {
  const target = title.trim() || 'artwork'
  const targetLabel = target.toLocaleLowerCase()
  const rankingTarget =
    imageCandidateTarget ?? getDefaultImageCandidateTarget(target)
  const steamArtwork = allowSteamArtwork
    ? selectedSteamGame?.artwork ?? EMPTY_STEAM_ARTWORK
    : EMPTY_STEAM_ARTWORK
  const selectedSteamArtworkId = getSelectedEditorImageSourceId(
    imageSource,
    'steam-artwork',
  )
  const selectedWebArtworkId = getSelectedEditorImageSourceId(
    imageSource,
    'web-artwork',
  )
  const selectedLocalSteamScreenshotId = getSelectedEditorImageSourceId(
    imageSource,
    'local-steam-screenshot',
  )
  const steamArtworkPickerItems = createEditorSteamArtworkPickerItems(
    steamArtwork,
    selectedSteamArtworkId,
    rankingTarget,
  )
  const webArtworkPickerItems = createEditorWebArtworkPickerItems(
    webArtworkDiscovery.candidates,
    selectedWebArtworkId,
    rankingTarget,
  )
  const localScreenshotPickerItems = createEditorLocalSteamScreenshotPickerItems(
    localSteamScreenshots,
    localSteamScreenshotThumbnails,
    selectedLocalSteamScreenshotId,
    rankingTarget,
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
        <EditorFeaturePanel title={EDITOR_IMAGE_SOURCE_PANEL_LABELS['steam-artwork']}>
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
            EDITOR_IMAGE_SOURCE_PANEL_LABELS['steam-artwork'],
          )}
        </EditorFeaturePanel>
      ) : null}

      {allowWebArtwork ? (
        <EditorFeaturePanel title={EDITOR_IMAGE_SOURCE_PANEL_LABELS['web-artwork']}>
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
              EDITOR_IMAGE_SOURCE_PANEL_LABELS['web-artwork'],
            )}
          </div>
        </EditorFeaturePanel>
      ) : null}

      {allowLocalSteamScreenshots ? (
        <EditorFeaturePanel
          title={EDITOR_IMAGE_SOURCE_PANEL_LABELS['local-steam-screenshot']}
        >
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
              EDITOR_IMAGE_SOURCE_PANEL_LABELS['local-steam-screenshot'],
            )}
          </div>
        </EditorFeaturePanel>
      ) : null}

      <EditorFeaturePanel title={EDITOR_IMAGE_SOURCE_PANEL_LABELS['local-file']}>
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
            EDITOR_IMAGE_SOURCE_PANEL_LABELS['local-file'],
          )}
        </div>
      </EditorFeaturePanel>
    </>
  )
}
