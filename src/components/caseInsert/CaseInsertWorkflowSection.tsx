import type { ReactNode } from 'react'
import { EditorFeaturePanel } from '../editor/EditorPanel'

type CaseInsertWorkflowSectionVariant = 'feature' | 'branding'

type CaseInsertWorkflowSectionProps = {
  title: string
  children: ReactNode
  variant?: CaseInsertWorkflowSectionVariant
  spacingTop?: boolean
}

export function CaseInsertWorkflowSection({
  title,
  children,
  variant = 'feature',
  spacingTop = true,
}: CaseInsertWorkflowSectionProps) {
  return (
    <EditorFeaturePanel
      title={title}
      variant={variant}
      spacingTop={spacingTop}
      className="case-insert-workflow-section"
    >
      {children}
    </EditorFeaturePanel>
  )
}
