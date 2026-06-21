import type {
  InlinePreviewTextEditorControls,
} from './inlinePreviewTextEditorContract'
import { ContextualTextRibbonHost } from './ContextualTextRibbon'

export type PreviewHeaderProps = {
  contextualTextRibbonActive?: boolean
  contextualTextRibbonControls?: InlinePreviewTextEditorControls
  contextualTextRibbonSlotId?: string
  title: string
  titleId: string
}

export function PreviewHeader({
  contextualTextRibbonActive = false,
  contextualTextRibbonControls,
  contextualTextRibbonSlotId,
  title,
  titleId,
}: PreviewHeaderProps) {
  return (
    <header className="preview-header">
      <div className="preview-pane-label">
        <span>Live Preview</span>
        <strong id={titleId}>{title}</strong>
      </div>
      <ContextualTextRibbonHost
        active={contextualTextRibbonActive}
        controls={contextualTextRibbonControls}
        portalSlotId={contextualTextRibbonSlotId}
      />
    </header>
  )
}
