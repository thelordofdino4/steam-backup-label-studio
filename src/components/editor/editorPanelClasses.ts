export type EditorPanelKind = 'workflow' | 'feature' | 'branding'

type EditorPanelClassOptions = {
  kind?: EditorPanelKind
  spacingTop?: boolean
  className?: string
}

function appendClassName(
  classNames: string[],
  className: string | undefined,
) {
  const extraClassNames = className?.trim()

  if (extraClassNames) classNames.push(extraClassNames)
}

export function getEditorPanelClassName({
  kind = 'workflow',
  spacingTop = false,
  className,
}: EditorPanelClassOptions = {}) {
  const classNames =
    kind === 'workflow'
      ? ['panel', 'collapsible-panel']
      : [
          kind === 'branding' ? 'branding-feature-card' : 'feature-section-card',
          'editor-nested-panel',
          'collapsible-panel',
        ]

  if (spacingTop) classNames.push('spacing-top')
  appendClassName(classNames, className)

  return classNames.join(' ')
}
