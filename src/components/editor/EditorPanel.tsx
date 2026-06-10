import type { ReactNode } from 'react'
import {
  getEditorPanelClassName,
  type EditorPanelKind,
} from './editorPanelClasses'

type EditorPanelProps = {
  title: ReactNode
  children: ReactNode
  kind?: EditorPanelKind
  open?: boolean
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
  spacingTop = false,
  className,
  headerActions,
}: EditorPanelProps) {
  return (
    <details
      className={getEditorPanelClassName({ kind, spacingTop, className })}
      open={open}
    >
      <summary className="panel-summary">
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
  spacingTop = true,
  className,
  headerActions,
}: EditorFeaturePanelProps) {
  return (
    <EditorPanel
      title={title}
      kind={variant}
      open={open}
      spacingTop={spacingTop}
      className={className}
      headerActions={headerActions}
    >
      {children}
    </EditorPanel>
  )
}
