import { useContext, useId, type ReactNode, type Ref } from 'react'
import { EditorInspectorDepthContext } from './editorInspectorContext'
import './EditorInspectorSection.css'

export function EditorInspectorSection({
  title,
  children,
  className,
  headerActions,
  sectionRef,
}: {
  title: ReactNode
  children: ReactNode
  className?: string
  headerActions?: ReactNode
  sectionRef?: Ref<HTMLElement>
}) {
  const depth = useContext(EditorInspectorDepthContext) ?? 0
  const titleId = useId()
  const Heading = `h${Math.min(3 + depth, 6)}` as 'h3' | 'h4' | 'h5' | 'h6'

  return (
    <section
      ref={sectionRef}
      className={['editor-inspector-section', className].filter(Boolean).join(' ')}
      aria-labelledby={titleId}
    >
      <div className="editor-inspector-section-heading">
        <Heading id={titleId}>{title}</Heading>
        {headerActions}
      </div>
      <EditorInspectorDepthContext.Provider value={depth + 1}>
        {children}
      </EditorInspectorDepthContext.Provider>
    </section>
  )
}
