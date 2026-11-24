import { IMPORTED_IMAGE_ACCEPT } from '../../../image/importedImagePolicy'
import type { ReactNode, RefCallback } from 'react'
import { canUseNativeDiscBackgroundPicker } from '../../../tauri/discBackgroundPicker.ts'
import { EditorFeaturePanel } from '../../editor/EditorPanel'
import type { ArtworkPanelProps } from './types'

export function LocalFileArtworkControls({
  handleBackgroundUpload,
  handlePickNativeBackgroundFile,
  fineTuneControls,
  open,
  onOpenChange,
  uploadControlRef,
}: Pick<ArtworkPanelProps, 'handleBackgroundUpload' | 'handlePickNativeBackgroundFile'> & {
  fineTuneControls: ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  uploadControlRef?: RefCallback<HTMLInputElement | HTMLButtonElement>
}) {
  return (
    <EditorFeaturePanel
      title="Local file"
      open={open}
      onOpenChange={onOpenChange}
    >
        <div className="artwork-import-section">
          <p className="hint">
            Choose an image from this computer when Steam, web, or screenshot sources do not have the artwork you want. Local files become the current disc background.
          </p>
          {canUseNativeDiscBackgroundPicker() ? (
            <button
              ref={uploadControlRef}
              type="button"
              className="secondary-button logo-upload-button"
              onClick={() => void handlePickNativeBackgroundFile()}
            >
              Choose local image
            </button>
          ) : (
            <>
              <label className="secondary-button logo-upload-button" htmlFor="background-upload">
                Choose local image
              </label>
              <input
                ref={uploadControlRef}
                id="background-upload"
                className="logo-file-input"
                type="file"
                accept={IMPORTED_IMAGE_ACCEPT}
                onChange={handleBackgroundUpload}
              />
            </>
          )}
          {fineTuneControls}
        </div>
    </EditorFeaturePanel>
  )
}
