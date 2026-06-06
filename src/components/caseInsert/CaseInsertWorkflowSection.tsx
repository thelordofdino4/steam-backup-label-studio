import type { ReactNode } from 'react'

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
  const cardClassName =
    variant === 'branding' ? 'branding-feature-card' : 'feature-section-card'

  return (
    <details
      className={`${cardClassName} metadata-details collapsible-panel${spacingTop ? ' spacing-top' : ''}`}
    >
      <summary className="panel-summary">{title}</summary>
      <div className="panel-content">{children}</div>
    </details>
  )
}
