import { StrictMode, useCallback, useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { ApplicationLifecycleBoundary } from '../../app/ApplicationLifecycleBoundary.tsx'
import { createApplicationLifecycleRuntime } from '../../app/applicationLifecycleRuntime.ts'
import { useApplicationHelp } from '../../app/useApplicationHelp.tsx'
import { HomeScreen } from '../home/HomeScreen.tsx'
import type { CommandBusyScope } from '../../lifecycle/applicationCommandTypes.ts'
import '../../styles/app-workflow-host.css'

const runtime = createApplicationLifecycleRuntime()
let reportFails = false
let closeFails = false
let busyScopes: readonly CommandBusyScope[] = []
const connected = {
  ...runtime,
  root: { ...runtime.root, getBusyState: () => ({ occupiedScopes: busyScopes }) },
  diagnostics: { ...runtime.diagnostics, toJson: () => { if (reportFails) throw new Error('private-report-path'); return runtime.diagnostics.toJson() } },
}
const finish = runtime.diagnostics.observeExecution({ commandId: 'project.open', operationId: 'application-command-1' })!
finish({ status: 'failure', error: { code: 'project.read-failed', userMessage: 'private-user-message', diagnosticMessage: 'private-path', cause: 'private-token', recoverable: true } })

declare global {
  interface Window {
    __applicationHelpHarness?: {
      invoke(): boolean
      setModal(value: boolean): void
      setReportFailure(value: boolean): void
      setCloseFailure(value: boolean): void
      setBusy(value: boolean): void
      addCommand(): void
      removeOpener(): void
      moveSurface(): void
      getMessages(): readonly string[]
      getLifecycle(): unknown
    }
  }
}
export function Harness() {
  const [modal, setModal] = useState(false)
  const [showHome, setShowHome] = useState(true)
  const [move, setMove] = useState(false)
  const messages = useRef<string[]>([])
  const fallback = useRef<HTMLHeadingElement | null>(null)
  const announceStatus = useCallback((message: string) => { messages.current.push(message); return true }, [])
  const setHomeStatusMessage = useCallback(() => {}, [])
  const getFallbackFocus = useCallback(() => fallback.current, [])
  const closeWorkflow = useCallback(() => { if (closeFails) { fallback.current?.focus(); throw new Error('private-close-detail') } }, [])
  const help = useApplicationHelp({ getFallbackFocus, announceStatus, setHomeStatusMessage, modalActive: modal, closeWorkflow })
  useEffect(() => {
    window.__applicationHelpHarness = {
      invoke: () => help.menuPort.invoke('help.open-documentation'),
      setModal,
      setReportFailure: value => { reportFails = value },
      setCloseFailure: value => { closeFails = value },
      setBusy: value => { busyScopes = value ? ['dialog.project-file'] : [] },
      addCommand: () => { runtime.diagnostics.observeExecution({ commandId: 'project.save', operationId: 'application-command-2' })!({ status: 'success', value: undefined }) },
      removeOpener: () => setShowHome(false),
      moveSurface: () => setMove(true),
      getMessages: () => messages.current,
      getLifecycle: () => runtime.root.getLifecycleState(),
    }
    return () => { delete window.__applicationHelpHarness }
  }, [help.menuPort])
  return <>
    <h1 ref={fallback} tabIndex={-1} id="help-fallback">Workspace heading</h1>
    {showHome ? <HomeScreen onLoadProject={() => {}} onNewDisc={() => {}} onNewCaseInsert={() => {}} onResumeProject={() => {}} resumeProject={null} onOpenHelp={help.open} helpDisabled={!help.canOpen} /> : null}
    {modal ? <div role="dialog" aria-modal="true">Existing modal</div> : null}
    {move ? <div>{help.surface}</div> : help.surface}
  </>
}
createRoot(document.getElementById('root')!).render(<ApplicationLifecycleBoundary runtime={connected}><StrictMode><Harness /></StrictMode></ApplicationLifecycleBoundary>)
