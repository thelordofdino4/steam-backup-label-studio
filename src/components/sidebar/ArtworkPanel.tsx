import { AdditionalArtworkControls } from './artwork/AdditionalArtworkControls'
import { BackgroundArtworkControls } from './artwork/BackgroundArtworkControls'
import { TitleArtworkControls } from './artwork/TitleArtworkControls'
import type { ArtworkPanelProps } from './artwork/types'

export type { ArtworkPanelProps } from './artwork/types'

export function ArtworkPanel(props: ArtworkPanelProps) {
  return (
    <details className="panel collapsible-panel">
      <summary className="panel-summary">Artwork</summary>
      <div className="panel-content">
        <BackgroundArtworkControls {...props} />
        <details className="feature-section-card metadata-details collapsible-panel spacing-top">
          <summary className="panel-summary">Game Logo</summary>
          <div className="panel-content">
            <TitleArtworkControls {...props} />
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
