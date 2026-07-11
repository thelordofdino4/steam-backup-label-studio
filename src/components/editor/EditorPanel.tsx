import type { ReactNode, Ref } from 'react'
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
}: EditorFeaturePanelProps) {
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
