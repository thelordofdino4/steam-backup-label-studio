import type { RefObject } from 'react'
import { APPLICATION_HELP_SECTIONS } from './applicationHelpResource.ts'
import '../styles/app-help.css'

export function ApplicationHelpPanel({ report, status, headingRef, reportRef, onClose, onRefresh, onSelectReport }: Readonly<{
  report: string
  status: string
  headingRef: RefObject<HTMLHeadingElement | null>
  reportRef: RefObject<HTMLTextAreaElement | null>
  onClose(): void
  onRefresh(): void
  onSelectReport(): void
}>) {
  return (
    <section className="application-workflow-host application-help" aria-labelledby="application-help-heading" role="region"
      onKeyDown={event => { if (event.key === 'Escape' && !event.defaultPrevented) { event.preventDefault(); event.stopPropagation(); onClose() } }}>
      <header className="application-workflow-host-header">
        <h2 id="application-help-heading" ref={headingRef} tabIndex={-1}>Steam Backup Label Studio Help</h2>
        <button className="icon-button application-workflow-host-close" type="button" aria-label="Close Help" onClick={onClose}>×</button>
      </header>
      <div className="application-workflow-host-content">
        {APPLICATION_HELP_SECTIONS.map(section => <section key={section.heading}><h3>{section.heading}</h3><p>{section.text}</p></section>)}
        <section aria-labelledby="application-help-report-heading">
          <h3 id="application-help-report-heading">Local diagnostics</h3>
          <p id="application-help-report-description">This report contains recent operation outcomes, menu readiness and timings. It excludes project content, filenames and paths. Nothing is sent automatically. Select the report and copy it with your keyboard to include it in a bug report.</p>
          <label htmlFor="application-help-report">Diagnostic report</label>
          <textarea id="application-help-report" aria-describedby="application-help-report-description" ref={reportRef} value={report} readOnly rows={10} spellCheck={false} />
          <div className="application-help-actions">
            <button type="button" onClick={onSelectReport}>Select report</button>
            <button type="button" onClick={onRefresh}>Refresh report</button>
          </div>
          <p role="status" aria-live="polite" aria-atomic="true">{status}</p>
        </section>
      </div>
    </section>
  )
}
