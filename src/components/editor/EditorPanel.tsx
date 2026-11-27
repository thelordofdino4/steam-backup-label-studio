import { useContext, type ReactNode, type Ref } from 'react'
import { EditorInspectorDepthContext } from './editorInspectorContext'
import { EditorInspectorSection } from './EditorInspectorSection'
import {
  getEditorPanelClassName,
  type EditorPanelKind,
} from './editorPanelClasses'

export type EditorPanelProps = {
  title: ReactNode
  children: ReactNode
  kind?: EditorPanelKind
  open?: boolean
  onOpenChange?: (open: boolean) => void
  detailsRef?: Ref<HTMLDetailsElement>
  summaryRef?: Ref<HTMLElement>
  spacingTop?: boolean
  className?: string
  headerActions?: ReactNode
}

type EditorFeaturePanelProps = Omit<EditorPanelProps, 'kind'> & {
  variant?: Extract<EditorPanelKind, 'feature' | 'branding'>
  inspectorSectionRef?: Ref<HTMLElement>
}

export function EditorPanel({
  title,
  children,
  kind = 'workflow',
  open,
  onOpenChange,
  detailsRef,
  summaryRef,
  spacingTop = false,
  className,
  headerActions,
}: EditorPanelProps) {
  return (
    <details
      ref={detailsRef}
      className={getEditorPanelClassName({ kind, spacingTop, className })}
      open={open}
      onToggle={(event) => onOpenChange?.(event.currentTarget.open)}
    >
      <summary ref={summaryRef} className="panel-summary">
        <span className="panel-summary-title">{title}</span>
        {headerActions ? (
          <span className="panel-summary-actions">{headerActions}</span>
        ) : null}
      </summary>
      <div className="panel-content">{children}</div>
    </details>
  )
}

export function EditorFeaturePanel({
  title,
  children,
  variant = 'feature',
  open,
  onOpenChange,
  detailsRef,
  summaryRef,
  spacingTop = true,
  className,
  headerActions,
  inspectorSectionRef,
}: EditorFeaturePanelProps) {
  const inspectorDepth = useContext(EditorInspectorDepthContext)

  // Explicit native details/summary refs retain their existing DOM contract.
  // Ordinary feature groups inside a role need no second expansion step.
  if (inspectorDepth !== null && !detailsRef && !summaryRef) {
    return (
      <EditorInspectorSection
        title={title}
        className={className}
        headerActions={headerActions}
        sectionRef={inspectorSectionRef}
      >
        {children}
      </EditorInspectorSection>
    )
  }

  return (
    <EditorPanel
      title={title}
      kind={variant}
      open={open}
      onOpenChange={onOpenChange}
      detailsRef={detailsRef}
      summaryRef={summaryRef}
      spacingTop={spacingTop}
      className={className}
      headerActions={headerActions}
    >
      {children}
    </EditorPanel>
  )
}
