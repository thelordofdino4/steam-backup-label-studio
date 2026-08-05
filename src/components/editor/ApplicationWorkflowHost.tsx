import {
  useContext,
  useLayoutEffect,
  useState,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'

import type { EditorWorkflowId } from '../../editor/editorNavigationRouter.ts'
import type {
  ApplicationWorkflowHostController,
} from '../../editor/applicationWorkflowNavigationStore.ts'
import {
  ApplicationWorkflowHostContext,
} from './applicationWorkflowNavigation.ts'

const WORKFLOW_HEADINGS: Readonly<Record<EditorWorkflowId, string>> =
  Object.freeze({
    'workflow.game': 'Game',
    'workflow.disc-template': 'Disc Template',
    'workflow.disc-layout-presets': 'Disc Layout Presets',
    'workflow.case-layout-presets': 'Case Layout Presets',
    'workflow.export-options': 'Export Options',
  })

export function ApplicationWorkflowHostBoundary({
  controller,
  hostContentRef,
  children,
}: Readonly<{
  controller: ApplicationWorkflowHostController
  hostContentRef: (element: HTMLDivElement | null) => void
  children: ReactNode
}>) {
  const activeWorkflowId =
    controller.activePresentation?.workflowId ?? null
  const heading = activeWorkflowId === null
    ? 'Application workflow'
    : WORKFLOW_HEADINGS[activeWorkflowId]

  return (
    <ApplicationWorkflowHostContext.Provider value={controller}>
      {children}
      <section
        aria-labelledby="application-workflow-host-heading"
        className="application-workflow-host"
        data-smoke-id="application-workflow-host"
        hidden={activeWorkflowId === null}
        role="region"
      >
        <header className="application-workflow-host-header">
          <h2 id="application-workflow-host-heading">{heading}</h2>
          <button
            aria-label={`Close ${heading}`}
            className="icon-button application-workflow-host-close"
            type="button"
            onClick={controller.closeActiveWorkflow}
          >
            <span aria-hidden="true">×</span>
          </button>
        </header>
        <div
          className="application-workflow-host-content"
          ref={hostContentRef}
        />
      </section>
    </ApplicationWorkflowHostContext.Provider>
  )
}

export function WorkflowPresentationOutlet({
  workflowId,
  children,
}: Readonly<{
  workflowId: EditorWorkflowId
  children: ReactNode
}>) {
  const controller = useContext(ApplicationWorkflowHostContext)
  if (!controller) {
    throw new Error('ApplicationWorkflowHostBoundary is required.')
  }
  const [sidebarSlot, setSidebarSlot] = useState<HTMLDivElement | null>(null)
  const [container] = useState(() => {
    const element = document.createElement('div')
    element.className = 'workflow-presentation-container'
    element.dataset.workflowId = workflowId
    return element
  })
  const isActive =
    controller.activePresentation?.workflowId === workflowId

  useLayoutEffect(() => {
    const target = isActive
      ? controller.getHostContent()
      : sidebarSlot
    if (!target) return
    target.appendChild(container)
    if (isActive) {
      controller.presentationCommitted(workflowId)
    } else {
      controller.presentationReturned(workflowId)
    }
  }, [
    container,
    isActive,
    controller,
    controller.pendingRequestId,
    sidebarSlot,
    workflowId,
  ])

  useLayoutEffect(() => () => container.remove(), [container])

  return (
    <div
      className="workflow-presentation-sidebar-slot"
      data-workflow-sidebar-slot={workflowId}
      ref={setSidebarSlot}
    >
      {createPortal(children, container)}
    </div>
  )
}
