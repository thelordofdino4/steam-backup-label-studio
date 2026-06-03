import type { ReactNode } from 'react'
import type { ArtworkPanelProps } from './types'

export function LocalFileArtworkControls({
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
