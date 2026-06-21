import { ContextualTextRibbonHost } from './ContextualTextRibbon'
import { useContextualTextRibbonContent } from './contextualTextRibbonBridgeContext'

export type PreviewHeaderProps = {
  contextualTextRibbonActive?: boolean
  title: string
  titleId: string
}

export function PreviewHeader({
  contextualTextRibbonActive = false,
  title,
  titleId,
}: PreviewHeaderProps) {
  const contextualTextRibbonContent = useContextualTextRibbonContent()

  return (
    <header className="preview-header">
      <div className="preview-pane-label">
        <span>Live Preview</span>
        <strong id={titleId}>{title}</strong>
      </div>
      <ContextualTextRibbonHost
        active={contextualTextRibbonActive && Boolean(contextualTextRibbonContent)}
      >
        {contextualTextRibbonContent}
      </ContextualTextRibbonHost>
    </header>
  )
}
