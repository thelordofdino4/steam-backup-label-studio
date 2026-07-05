import { BackgroundArtworkControls } from './artwork/BackgroundArtworkControls'
import { TitleArtworkControls } from './artwork/TitleArtworkControls'
import type { ArtworkPanelProps } from './artwork/types'
import { EditorFeaturePanel, EditorPanel } from '../editor/EditorPanel'

export type { ArtworkPanelProps } from './artwork/types'

export function ArtworkPanel(props: ArtworkPanelProps) {
  return (
    <EditorPanel title="Artwork">
      <BackgroundArtworkControls {...props} />
      <EditorFeaturePanel title="Game Logo">
        <TitleArtworkControls {...props} />
      </EditorFeaturePanel>
    </EditorPanel>
  )
}
