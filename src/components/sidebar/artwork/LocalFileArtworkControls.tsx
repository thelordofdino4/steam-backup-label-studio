import type { ReactNode, Ref } from 'react'
import { EditorFeaturePanel } from '../../editor/EditorPanel'
import type { ArtworkPanelProps } from './types'

export function LocalFileArtworkControls({
  handleBackgroundUpload,
  fineTuneControls,
  open,
  onOpenChange,
  uploadControlRef,
}: Pick<ArtworkPanelProps, 'handleBackgroundUpload'> & {
  fineTuneControls: ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  uploadControlRef?: Ref<HTMLInputElement>
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
          <label className="secondary-button logo-upload-button" htmlFor="background-upload">
            Choose local image
          </label>
          <input
            ref={uploadControlRef}
            id="background-upload"
            className="logo-file-input"
            type="file"
            accept="image/*"
            onChange={handleBackgroundUpload}
          />
          {fineTuneControls}
        </div>
    </EditorFeaturePanel>
  )
}
