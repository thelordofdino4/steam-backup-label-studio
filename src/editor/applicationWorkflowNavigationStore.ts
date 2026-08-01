import { hasApplicationModal } from './applicationModalState.ts'
import {
  completeEditorNavigationRequest,
  evaluateEditorNavigationIntent,
  projectEditorWorkflowCapabilities,
  type EditorDestination,
  type EditorFeatureOwnerId,
  type EditorNavigationEnvironment,
  type EditorNavigationIntent,
  type EditorNavigationRegistration,
  type EditorNavigationRequest,
  type EditorNavigationResult,
  type EditorPhysicalSurfaceId,
  type EditorRegisteredControlId,
  type EditorWorkflowId,
  type EditorWorkflowNavigationPort,
  type EditorWorkspaceId,
} from './editorNavigationRouter.ts'

export type ApplicationWorkflowNavigationEnvironment = Readonly<{
  sessionId: string | null
  workspaceId: EditorWorkspaceId | null
  surfaceId: EditorPhysicalSurfaceId | null
  lifecycleTransitionActive: boolean
  applicationModalActive: boolean
}>

export type ApplicationWorkflowActivePresentation = Readonly<{
  workflowId: EditorWorkflowId
  destination: EditorDestination
}>

export type ApplicationWorkflowNavigationSnapshot = Readonly<{
  generation: number
  activePresentation: ApplicationWorkflowActivePresentation | null
  pendingRequestId: number | null
}>

export type ApplicationWorkflowControlRegistration =
  EditorNavigationRegistration & Readonly<{
    getDetails(): HTMLDetailsElement | null
    getControl(): HTMLElement | null
  }>

type ClosingPresentation = Readonly<{
  workflowId: EditorWorkflowId
  restoreFocus: boolean
}>

type CancelScheduledCommit = () => void

function scheduleAfterCommittedPaint(callback: () => void): CancelScheduledCommit {
  if (
    typeof window !== 'undefined' &&
    typeof window.requestAnimationFrame === 'function' &&
    typeof MessageChannel !== 'undefined'
  ) {
    const channel = new MessageChannel()
    let cancelled = false
    channel.port1.onmessage = () => {
      channel.port1.close()
      channel.port2.close()
      if (!cancelled) callback()
    }
    let frameId = window.requestAnimationFrame(() => {
      frameId = window.requestAnimationFrame(() => {
        channel.port2.postMessage(null)
      })
    })
    return () => {
      cancelled = true
      window.cancelAnimationFrame(frameId)
      channel.port1.close()
      channel.port2.close()
    }
  }

  let cancelled = false
  queueMicrotask(() => {
    if (!cancelled) callback()
  })
  return () => { cancelled = true }
}

function registrationKey(registration: EditorNavigationRegistration) {
  return [
    registration.workflowId,
    registration.ownerId,
    registration.controlId,
  ].join('|')
}

function requestRegistrationKey(request: EditorNavigationRequest) {
  return registrationKey({
    workflowId: request.workflowId,
    ownerId: request.destination.ownerId,
    controlId: request.destination.controlId,
  })
}

function currentActiveElement(): HTMLElement | null {
  return typeof document !== 'undefined' &&
      document.activeElement instanceof HTMLElement
    ? document.activeElement
    : null
}

function elementIsUsable(element: HTMLElement | null): element is HTMLElement {
  return Boolean(
    element?.isConnected &&
    !element.hidden &&
    element.getAttribute('aria-hidden') !== 'true',
  )
}

function navigationEnvironmentChanged(
  previous: ApplicationWorkflowNavigationEnvironment,
  next: ApplicationWorkflowNavigationEnvironment,
): boolean {
  return previous.sessionId !== next.sessionId ||
    previous.workspaceId !== next.workspaceId ||
    previous.surfaceId !== next.surfaceId ||
    previous.lifecycleTransitionActive !== next.lifecycleTransitionActive ||
    previous.applicationModalActive !== next.applicationModalActive
}

export class ApplicationWorkflowNavigationStore {
  readonly menuPort: EditorWorkflowNavigationPort

  private environment: ApplicationWorkflowNavigationEnvironment
  private getFallbackFocus: () => HTMLElement | null
  private focusApplicationSurface: () => Promise<void>
  private onCapabilitiesChanged: () => void
  private snapshot: ApplicationWorkflowNavigationSnapshot = Object.freeze({
    generation: 0,
    activePresentation: null,
    pendingRequestId: null,
  })
  private readonly subscribers = new Set<() => void>()
  private readonly registrations =
    new Map<string, ApplicationWorkflowControlRegistration>()
  private hostContent: HTMLDivElement | null = null
  private pendingRequest: EditorNavigationRequest | null = null
  private pendingResolve: ((result: EditorNavigationResult) => void) | null = null
  private nextRequestId = 1
  private opener: HTMLElement | null = null
  private closingPresentation: ClosingPresentation | null = null
  private cancelScheduledCommit: CancelScheduledCommit | null = null

  constructor({
    environment,
    getFallbackFocus,
    focusApplicationSurface,
    onCapabilitiesChanged,
  }: Readonly<{
    environment: ApplicationWorkflowNavigationEnvironment
    getFallbackFocus: () => HTMLElement | null
    focusApplicationSurface: () => Promise<void>
    onCapabilitiesChanged: () => void
  }>) {
    this.environment = environment
    this.getFallbackFocus = getFallbackFocus
    this.focusApplicationSurface = focusApplicationSurface
    this.onCapabilitiesChanged = onCapabilitiesChanged
    this.menuPort = Object.freeze({
      getCapabilities: () => projectEditorWorkflowCapabilities(
        this.captureEnvironment(),
      ),
      navigate: (intent) => this.navigate(intent),
    })
  }

  readonly getSnapshot = () => this.snapshot

  readonly subscribe = (subscriber: () => void) => {
    this.subscribers.add(subscriber)
    return () => this.subscribers.delete(subscriber)
  }

  updateEnvironment({
    environment,
    getFallbackFocus,
    focusApplicationSurface,
    onCapabilitiesChanged,
  }: Readonly<{
    environment: ApplicationWorkflowNavigationEnvironment
    getFallbackFocus: () => HTMLElement | null
    focusApplicationSurface: () => Promise<void>
    onCapabilitiesChanged: () => void
  }>) {
    const changed = navigationEnvironmentChanged(this.environment, environment)
    const sessionOrWorkspaceChanged =
      this.environment.sessionId !== environment.sessionId ||
      this.environment.workspaceId !== environment.workspaceId
    this.environment = environment
    this.getFallbackFocus = getFallbackFocus
    this.focusApplicationSurface = focusApplicationSurface
    this.onCapabilitiesChanged = onCapabilitiesChanged
    if (
      sessionOrWorkspaceChanged ||
      environment.workspaceId === null
    ) {
      this.closeWithoutRestoration()
    }
    if (changed) this.onCapabilitiesChanged()
  }

  readonly setHostContent = (element: HTMLDivElement | null) => {
    if (this.hostContent === element) return
    this.hostContent = element
    if (!element) this.closeWithoutRestoration('host-not-ready')
    this.onCapabilitiesChanged()
  }

  getHostContent() {
    return this.hostContent
  }

  registerControl(registration: ApplicationWorkflowControlRegistration) {
    const key = registrationKey(registration)
    this.registrations.set(key, registration)
    this.onCapabilitiesChanged()
    return () => {
      if (this.registrations.get(key) !== registration) return
      this.registrations.delete(key)
      this.onCapabilitiesChanged()
    }
  }

  readonly closeActiveWorkflow = () => {
    const current = this.snapshot.activePresentation
    if (!current) return
    this.resolvePendingAsUnavailable('capability-disabled')
    this.closingPresentation = Object.freeze({
      workflowId: current.workflowId,
      restoreFocus: true,
    })
    this.setPresentation(null)
  }

  presentationCommitted(workflowId: EditorWorkflowId) {
    const request = this.pendingRequest
    if (!request || request.workflowId !== workflowId) return

    const readiness = evaluateEditorNavigationIntent(
      request,
      this.captureEnvironment(),
    )
    if (readiness.status !== 'ready') {
      this.resolvePending(readiness)
      return
    }

    const committedRegistration = this.registrations.get(
      requestRegistrationKey(request),
    )
    const committedControl = committedRegistration?.getControl() ?? null
    if (!committedRegistration || !elementIsUsable(committedControl)) {
      this.resolvePending(Object.freeze({
        status: 'unavailable',
        destination: request.destination,
        reason: 'owner-not-mounted',
      }))
      return
    }
    const details = committedRegistration.getDetails()
    if (details) details.open = true

    this.cancelScheduledCommit?.()
    this.cancelScheduledCommit = scheduleAfterCommittedPaint(() => {
      this.cancelScheduledCommit = null
      void this.completeCommittedRequest(request)
    })
  }

  private async completeCommittedRequest(request: EditorNavigationRequest) {
    if (this.pendingRequest?.requestId !== request.requestId) return

    const latestReadiness = evaluateEditorNavigationIntent(
      request,
      this.captureEnvironment(),
    )
    if (latestReadiness.status !== 'ready') {
      this.resolvePending(latestReadiness)
      return
    }

    const registration = this.registrations.get(
      requestRegistrationKey(request),
    )
    const control = registration?.getControl() ?? null
    if (!registration || !elementIsUsable(control)) {
      this.resolvePending(Object.freeze({
        status: 'unavailable',
        destination: request.destination,
        reason: 'owner-not-mounted',
      }))
      return
    }

    if (request.behavior === 'focus') {
      try {
        await this.focusApplicationSurface()
      } catch {
        this.resolvePending(Object.freeze({
          status: 'unavailable',
          destination: request.destination,
          reason: 'focus-unavailable',
        }))
        return
      }
      if (this.pendingRequest?.requestId !== request.requestId) return
      const focusControl = this.registrations.get(
        requestRegistrationKey(request),
      )?.getControl() ?? null
      if (!elementIsUsable(focusControl)) {
        this.resolvePending(Object.freeze({
          status: 'unavailable',
          destination: request.destination,
          reason: 'owner-not-mounted',
        }))
        return
      }
      focusControl.focus({ preventScroll: false })
      this.resolvePending(completeEditorNavigationRequest(request, 'focused'))
      return
    }

    this.resolvePending(completeEditorNavigationRequest(request, 'revealed'))
  }

  presentationReturned(workflowId: EditorWorkflowId) {
    const closing = this.closingPresentation
    if (!closing || closing.workflowId !== workflowId) return
    this.closingPresentation = null
    if (closing.restoreFocus) this.restoreFocus()
  }

  private captureEnvironment(): EditorNavigationEnvironment {
    return Object.freeze({
      ...this.environment,
      applicationModalActive:
        this.environment.applicationModalActive || hasApplicationModal(),
      hostReady: this.hostContent !== null,
      hiddenWorkflowIds: Object.freeze([]),
      registrations: Object.freeze([...this.registrations.values()].map(
        ({ workflowId, ownerId, controlId }) =>
          Object.freeze({ workflowId, ownerId, controlId }),
      )),
    })
  }

  private navigate(intent: EditorNavigationIntent) {
    const readiness = evaluateEditorNavigationIntent(
      intent,
      this.captureEnvironment(),
    )
    if (readiness.status !== 'ready') return Promise.resolve(readiness)

    this.resolvePendingAsUnavailable('capability-disabled')
    const request = Object.freeze({
      ...intent,
      requestId: this.nextRequestId,
    }) satisfies EditorNavigationRequest
    this.nextRequestId += 1
    if (this.snapshot.activePresentation === null) {
      this.opener = currentActiveElement()
    }
    const presentation = Object.freeze({
      workflowId: intent.workflowId,
      destination: intent.destination,
    })

    return new Promise<EditorNavigationResult>((resolve) => {
      this.pendingRequest = request
      this.pendingResolve = resolve
      this.setPresentation(presentation, request.requestId)
    })
  }

  private setPresentation(
    activePresentation: ApplicationWorkflowActivePresentation | null,
    pendingRequestId: number | null = null,
  ) {
    this.snapshot = Object.freeze({
      generation: this.snapshot.generation + 1,
      activePresentation,
      pendingRequestId,
    })
    for (const subscriber of this.subscribers) subscriber()
  }

  private resolvePending(result: EditorNavigationResult) {
    this.cancelScheduledCommit?.()
    this.cancelScheduledCommit = null
    const resolve = this.pendingResolve
    this.pendingRequest = null
    this.pendingResolve = null
    if (this.snapshot.pendingRequestId !== null) {
      this.snapshot = Object.freeze({
        ...this.snapshot,
        generation: this.snapshot.generation + 1,
        pendingRequestId: null,
      })
      for (const subscriber of this.subscribers) subscriber()
    }
    resolve?.(result)
  }

  private resolvePendingAsUnavailable(
    reason: 'capability-disabled' | 'host-not-ready',
  ) {
    if (!this.pendingRequest) return
    this.resolvePending(Object.freeze({
      status: 'unavailable',
      destination: this.pendingRequest.destination,
      reason,
    }))
  }

  private closeWithoutRestoration(
    pendingReason: 'capability-disabled' | 'host-not-ready' =
      'capability-disabled',
  ) {
    const current = this.snapshot.activePresentation
    if (!current) {
      this.resolvePendingAsUnavailable(pendingReason)
      return
    }
    this.resolvePendingAsUnavailable(pendingReason)
    this.closingPresentation = Object.freeze({
      workflowId: current.workflowId,
      restoreFocus: false,
    })
    this.opener = null
    this.setPresentation(null)
  }

  private restoreFocus() {
    const target = elementIsUsable(this.opener)
      ? this.opener
      : this.getFallbackFocus()
    this.opener = null
    if (elementIsUsable(target)) target.focus({ preventScroll: true })
  }
}

export type ApplicationWorkflowHostController = Readonly<{
  activePresentation: ApplicationWorkflowActivePresentation | null
  pendingRequestId: number | null
  getHostContent(): HTMLDivElement | null
  registerControl(
    registration: ApplicationWorkflowControlRegistration,
  ): () => void
  closeActiveWorkflow(): void
  presentationCommitted(workflowId: EditorWorkflowId): void
  presentationReturned(workflowId: EditorWorkflowId): void
}>

export type ApplicationWorkflowNavigationRouter = Readonly<{
  menuPort: EditorWorkflowNavigationPort
  controller: ApplicationWorkflowHostController
  hostContentRef(element: HTMLDivElement | null): void
}>

export type RegisteredWorkflowControlInput = Readonly<{
  workflowId: EditorWorkflowId
  ownerId: EditorFeatureOwnerId
  controlId: EditorRegisteredControlId
}>
