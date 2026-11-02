import { useCallback, useContext, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { ApplicationLifecycleRuntimeContext } from './applicationLifecycleRuntimeContext.ts'
import { publishApplicationFeedbackIntent, type ApplicationCommandFeedbackPublicationDependencies } from './appApplicationCommandFeedback.ts'
import { hasApplicationModal } from '../editor/applicationModalState.ts'
import { applicationHelpCapability } from '../help/applicationHelpCapability.ts'
import { ApplicationHelpPanel } from '../help/ApplicationHelpPanel.tsx'
import type { ApplicationMenuInformationalPort } from '../applicationMenu/applicationMenuInformationalPort.ts'

function usable(element: HTMLElement | null): element is HTMLElement {
  return element !== null && element.isConnected && !element.closest('[hidden], [inert], [aria-hidden="true"]') &&
    !element.matches(':disabled') && element.getClientRects().length > 0
}

/** Owns informational presentation, report snapshots and focus; never project state. */
export function useApplicationHelp({ getFallbackFocus, announceStatus, setHomeStatusMessage, modalActive, closeWorkflow }: ApplicationCommandFeedbackPublicationDependencies & Readonly<{
  getFallbackFocus(): HTMLElement | null
  modalActive: boolean
  closeWorkflow?(): void
}>) {
  const runtime = useContext(ApplicationLifecycleRuntimeContext)
  if (!runtime) throw new Error('ApplicationLifecycleBoundary is required.')
  const [view, setView] = useState<Readonly<{ request: number, report: string, status: string }> | null>(null)
  const headingRef = useRef<HTMLHeadingElement | null>(null)
  const lastHeadingRef = useRef<HTMLHeadingElement | null>(null)
  const reportRef = useRef<HTMLTextAreaElement | null>(null)
  const openerRef = useRef<HTMLElement | null>(null)
  const openRef = useRef(false)
  const requestRef = useRef(0)
  const fallbackRef = useRef(getFallbackFocus)
  useLayoutEffect(() => { fallbackRef.current = getFallbackFocus }, [getFallbackFocus])
  const capability = useCallback(() => applicationHelpCapability(hasApplicationModal(), runtime.root.getBusyState().occupiedScopes), [runtime])
  const publishFailure = useCallback(() => {
    publishApplicationFeedbackIntent({ kind: 'error', message: 'Help could not be opened. Try again.', deduplicationKey: 'application-help.open-failed' }, { announceStatus, setHomeStatusMessage })
  }, [announceStatus, setHomeStatusMessage])
  const restoreFocus = useCallback(() => {
    const target = usable(openerRef.current) ? openerRef.current : fallbackRef.current()
    openerRef.current = null
    if (usable(target)) target.focus({ preventScroll: true })
  }, [])
  const close = useCallback(() => { openRef.current = false; setView(null) }, [])
  const open = useCallback(() => {
    if (!capability().canExecute) return false
    const wasOpen = openRef.current
    if (!wasOpen) openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    try {
      const report = runtime.diagnostics.toJson()
      closeWorkflow?.()
      openRef.current = true
      requestRef.current += 1
      setView({ request: requestRef.current, report, status: '' })
      return true
    } catch {
      if (!wasOpen) restoreFocus()
      publishFailure()
      return false
    }
  }, [capability, closeWorkflow, publishFailure, restoreFocus, runtime])
  const request = view?.request
  useLayoutEffect(() => {
    if (request === undefined) return
    const heading = headingRef.current
    if (!heading) { close(); publishFailure(); restoreFocus(); return }
    heading.focus({ preventScroll: true })
    return () => { if (!openRef.current) restoreFocus() }
  }, [close, publishFailure, request, restoreFocus])
  useLayoutEffect(() => {
    if (openRef.current && headingRef.current && lastHeadingRef.current !== headingRef.current) {
      headingRef.current.focus({ preventScroll: true })
    }
    lastHeadingRef.current = headingRef.current
  })
  useLayoutEffect(() => () => { openRef.current = false; restoreFocus() }, [restoreFocus])
  const refresh = useCallback(() => {
    try {
      const report = runtime.diagnostics.toJson()
      setView(current => current ? { ...current, report, status: 'Report refreshed.' } : null)
    } catch {
      setView(current => current ? { ...current, status: 'The report could not be refreshed. Try again.' } : null)
    }
  }, [runtime])
  const selectReport = useCallback(() => {
    reportRef.current?.focus()
    reportRef.current?.select()
  }, [])
  // A changed modal projection reconnects the menu; invoke always rechecks live state.
  const menuPort = useMemo<ApplicationMenuInformationalPort>(() => ({
    getCapabilities: () => ({
      'help.open-documentation': modalActive ? { canExecute: false, reasonCode: 'application-help.modal-active' } : capability(),
      'help.show-about': { canExecute: false, reasonCode: 'application-menu.owner-unavailable' },
    }),
    dismissForNavigation: close,
    invoke: operation => operation === 'help.open-documentation' && open(),
  }), [capability, close, modalActive, open])
  return {
    menuPort, open, canOpen: !modalActive && capability().canExecute,
    surface: view ? <ApplicationHelpPanel report={view.report} status={view.status} headingRef={headingRef} reportRef={reportRef} onClose={close} onRefresh={refresh} onSelectReport={selectReport} /> : null,
  }
}
