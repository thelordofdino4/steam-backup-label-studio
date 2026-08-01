import {
  createContext,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from 'react'

import {
  ApplicationWorkflowNavigationStore,
  type ApplicationWorkflowNavigationEnvironment,
  type ApplicationWorkflowHostController,
  type ApplicationWorkflowNavigationRouter,
  type RegisteredWorkflowControlInput,
} from '../../editor/applicationWorkflowNavigationStore.ts'

class RegisteredControlElements<Element extends HTMLElement> {
  private details: HTMLDetailsElement | null = null
  private control: Element | null = null

  readonly detailsRef = (element: HTMLDetailsElement | null) => {
    this.details = element
  }

  readonly controlRef = (element: Element | null) => {
    this.control = element
  }

  readonly getDetails = () => this.details

  readonly getControl = () => this.control
}

export const ApplicationWorkflowHostContext =
  createContext<ApplicationWorkflowHostController | null>(null)

export function useApplicationWorkflowNavigationRouter({
  environment,
  getFallbackFocus,
  focusApplicationSurface,
  onCapabilitiesChanged,
}: Readonly<{
  environment: ApplicationWorkflowNavigationEnvironment
  getFallbackFocus: () => HTMLElement | null
  focusApplicationSurface: () => Promise<void>
  onCapabilitiesChanged: () => void
}>): ApplicationWorkflowNavigationRouter {
  const [store] = useState(() => new ApplicationWorkflowNavigationStore({
    environment,
    getFallbackFocus,
    focusApplicationSurface,
    onCapabilitiesChanged,
  }))
  const snapshot = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot,
  )

  useLayoutEffect(() => {
    store.updateEnvironment({
      environment,
      getFallbackFocus,
      focusApplicationSurface,
      onCapabilitiesChanged,
    })
  }, [
    environment,
    environment.applicationModalActive,
    environment.lifecycleTransitionActive,
    environment.sessionId,
    environment.surfaceId,
    environment.workspaceId,
    focusApplicationSurface,
    getFallbackFocus,
    onCapabilitiesChanged,
    store,
  ])

  const actions = useMemo(() => Object.freeze({
    getHostContent: () => store.getHostContent(),
    registerControl: (
      registration: Parameters<typeof store.registerControl>[0],
    ) => store.registerControl(registration),
    closeActiveWorkflow: store.closeActiveWorkflow,
    presentationCommitted: (workflowId: Parameters<
      typeof store.presentationCommitted
    >[0]) => store.presentationCommitted(workflowId),
    presentationReturned: (workflowId: Parameters<
      typeof store.presentationReturned
    >[0]) => store.presentationReturned(workflowId),
  }), [store])

  return useMemo(() => Object.freeze({
    menuPort: store.menuPort,
    hostContentRef: store.setHostContent,
    controller: Object.freeze({
      ...actions,
      activePresentation: snapshot.activePresentation,
      pendingRequestId: snapshot.pendingRequestId,
    }),
  }), [actions, snapshot, store.menuPort, store.setHostContent])
}

export function useRegisteredWorkflowNavigationControl<
  Element extends HTMLElement,
>({
  workflowId,
  ownerId,
  controlId,
}: RegisteredWorkflowControlInput) {
  const controller = useContext(ApplicationWorkflowHostContext)
  const elements = useMemo(() => new RegisteredControlElements<Element>(), [])
  const registerControl = controller?.registerControl

  useLayoutEffect(() => {
    if (!registerControl) return
    return registerControl(Object.freeze({
      workflowId,
      ownerId,
      controlId,
      getDetails: elements.getDetails,
      getControl: elements.getControl,
    }))
  }, [controlId, elements, ownerId, registerControl, workflowId])

  return {
    detailsRef: elements.detailsRef,
    controlRef: elements.controlRef,
  }
}
