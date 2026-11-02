import { APPLICATION_STARTUP_FAILURES, type ApplicationStartupStage } from './applicationStartup.ts'

/** Available even if React, lifecycle construction or the main application module fails. */
export function showApplicationStartupFailure(document: Document, stage: ApplicationStartupStage, report: string) {
  const root = document.getElementById('root') ?? document.body.appendChild(document.createElement('main'))
  const section = document.createElement('section')
  section.setAttribute('aria-label', 'SBLS startup diagnostics')
  const heading = document.createElement('h1')
  heading.textContent = 'Steam Backup Label Studio could not continue'
  heading.tabIndex = -1
  const message = document.createElement('p')
  message.textContent = APPLICATION_STARTUP_FAILURES[stage]
  const guidance = document.createElement('p')
  guidance.textContent = 'Unsaved changes may not be recoverable. Select the local report below and copy it with your usual keyboard shortcut when reporting the problem.'
  const label = document.createElement('label')
  label.textContent = 'Local diagnostic report'
  const textarea = document.createElement('textarea')
  textarea.readOnly = true
  textarea.rows = 16
  textarea.cols = 80
  textarea.value = report
  label.append(textarea)
  const select = document.createElement('button')
  select.type = 'button'
  select.textContent = 'Select report'
  select.addEventListener('click', () => { textarea.focus(); textarea.select() })
  section.append(heading, message, guidance, label, select)
  root.replaceChildren(section)
  heading.focus()
}
