import type { DiscRolePresetRole } from '../layout/discRolePresets.ts'
import {
  createInitialEditorRoleFocusState,
  reduceEditorRoleFocus,
  type DiscRoleFocusTargetId,
  type EditorRoleFocusRequest,
  type EditorRoleFocusState,
} from './editorRoleFocus.ts'

export type EditorRoleFocusRequestInput = Omit<
  EditorRoleFocusRequest,
  'requestId'
>

export type EditorRolePanelRegistration = {
  detailsElement: () => HTMLDetailsElement | null
  summaryElement: () => HTMLElement | null
}

export type EditorRoleFocusTargetRegistration = {
  element: () => HTMLElement | null
  openAncestors?: readonly (() => void)[]
  fallbackFocusTarget?: DiscRoleFocusTargetId
}

export type EditorRoleFocusProcessingOutcome =
  | 'no-pending-request'
  | 'role-revealed'
  | 'target-focused'
  | 'role-summary-fallback'
  | 'unavailable'

export type EditorRoleFocusController = {
  state: EditorRoleFocusState
  requestRoleFocus: (
    input: EditorRoleFocusRequestInput,
  ) => EditorRoleFocusRequest
  setRoleOpen: (roleId: DiscRolePresetRole, open: boolean) => void
  isRoleOpen: (roleId: DiscRolePresetRole) => boolean
  registerRolePanel: (
    roleId: DiscRolePresetRole,
    registration: EditorRolePanelRegistration,
  ) => () => void
  registerFocusTarget: (
    focusTarget: DiscRoleFocusTargetId,
    registration: EditorRoleFocusTargetRegistration,
  ) => () => void
}

type EditorRoleFocusControllerActions = Omit<
  EditorRoleFocusController,
  'state'
>

export type EditorRoleFocusControllerStore =
  EditorRoleFocusControllerActions & {
    getSnapshot: () => EditorRoleFocusState
    subscribe: (listener: () => void) => () => void
    processPendingRequest: () => EditorRoleFocusProcessingOutcome
  }

type RegistrationEntry<TRegistration> = {
  registration: TRegistration
}

function resolveElement<TElement extends HTMLElement>(
  getter: () => TElement | null,
) {
  try {
    return getter()
  } catch {
    return null
  }
}

function invokeWithoutThrow(callback: () => void) {
  try {
    callback()
  } catch {
    // A failed optional registration must not strand a pending request.
  }
}

function focusElement(element: HTMLElement) {
  try {
    element.focus({ preventScroll: true })
  } catch {
    // The reveal attempt still runs when focus is unavailable.
  }
}

function revealElement(element: HTMLElement) {
  try {
    element.scrollIntoView({ block: 'nearest', behavior: 'auto' })
    return true
  } catch {
    return false
  }
}

export function createEditorRoleFocusControllerStore():
  EditorRoleFocusControllerStore {
  let state = createInitialEditorRoleFocusState()
  let nextRequestId = 1
  const listeners = new Set<() => void>()
  const roleRegistrations = new Map<
    DiscRolePresetRole,
    RegistrationEntry<EditorRolePanelRegistration>
  >()
  const focusTargetRegistrations = new Map<
    DiscRoleFocusTargetId,
    RegistrationEntry<EditorRoleFocusTargetRegistration>
  >()

  function emitChange() {
    for (const listener of [...listeners]) {
      listener()
    }
  }

  function applyState(nextState: EditorRoleFocusState) {
    if (nextState === state) return

    state = nextState
    emitChange()
  }

  function requestRoleFocus(
    input: EditorRoleFocusRequestInput,
  ): EditorRoleFocusRequest {
    if (!Number.isSafeInteger(nextRequestId) || nextRequestId <= 0) {
      throw new RangeError('Editor role-focus request IDs are exhausted.')
    }

    const request: EditorRoleFocusRequest = {
      requestId: nextRequestId,
      surfaceId: input.surfaceId,
      behavior: input.behavior,
      destination: input.destination,
      ...(input.ownerTarget ? { ownerTarget: input.ownerTarget } : {}),
    }
    nextRequestId += 1

    const result = reduceEditorRoleFocus(state, {
      type: 'request',
      request,
    })

    if (result.outcome !== 'accepted') {
      throw new TypeError(`Editor role-focus request was ${result.outcome}.`)
    }

    applyState(result.state)
    return request
  }

  function setRoleOpen(roleId: DiscRolePresetRole, open: boolean) {
    const result = reduceEditorRoleFocus(state, {
      type: 'set-role-open',
      roleId,
      open,
    })
    applyState(result.state)
  }

  function isRoleOpen(roleId: DiscRolePresetRole) {
    return state.openRoleIds.has(roleId)
  }

  function registerRolePanel(
    roleId: DiscRolePresetRole,
    registration: EditorRolePanelRegistration,
  ) {
    const entry = { registration }
    roleRegistrations.set(roleId, entry)

    return () => {
      if (roleRegistrations.get(roleId) === entry) {
        roleRegistrations.delete(roleId)
      }
    }
  }

  function registerFocusTarget(
    focusTarget: DiscRoleFocusTargetId,
    registration: EditorRoleFocusTargetRegistration,
  ) {
    const entry = { registration }
    focusTargetRegistrations.set(focusTarget, entry)

    return () => {
      if (focusTargetRegistrations.get(focusTarget) === entry) {
        focusTargetRegistrations.delete(focusTarget)
      }
    }
  }

  function revealRole(roleId: DiscRolePresetRole) {
    const registration = roleRegistrations.get(roleId)?.registration

    if (!registration) return false

    const summary = resolveElement(registration.summaryElement)
    const details = summary
      ? null
      : resolveElement(registration.detailsElement)
    const revealTarget = summary ?? details

    return revealTarget ? revealElement(revealTarget) : false
  }

  function focusRoleSummary(roleId: DiscRolePresetRole) {
    const registration = roleRegistrations.get(roleId)?.registration

    if (!registration) return false

    const summary = resolveElement(registration.summaryElement)
    const details = summary
      ? null
      : resolveElement(registration.detailsElement)
    const revealTarget = summary ?? details

    if (!revealTarget) return false
    if (summary) focusElement(summary)
    revealElement(revealTarget)
    return true
  }

  function resolveFocusTarget(startTarget: DiscRoleFocusTargetId) {
    const visitedTargets = new Set<DiscRoleFocusTargetId>()
    let focusTarget: DiscRoleFocusTargetId | undefined = startTarget

    while (focusTarget && !visitedTargets.has(focusTarget)) {
      visitedTargets.add(focusTarget)
      const registration: EditorRoleFocusTargetRegistration | undefined =
        focusTargetRegistrations.get(focusTarget)?.registration

      if (!registration) return null

      for (const openAncestor of registration.openAncestors ?? []) {
        invokeWithoutThrow(openAncestor)
      }

      const element = resolveElement(registration.element)

      if (element) return element
      focusTarget = registration.fallbackFocusTarget
    }

    return null
  }

  function consumeRequest(requestId: number) {
    const result = reduceEditorRoleFocus(state, {
      type: 'consume',
      requestId,
    })
    applyState(result.state)
  }

  function processPendingRequest(): EditorRoleFocusProcessingOutcome {
    const request = state.pendingRequest

    if (!request) return 'no-pending-request'

    let outcome: EditorRoleFocusProcessingOutcome

    if (request.behavior === 'reveal') {
      outcome = revealRole(request.destination.roleId)
        ? 'role-revealed'
        : 'unavailable'
    } else {
      const focusTarget = resolveFocusTarget(request.destination.focusTarget)

      if (focusTarget) {
        focusElement(focusTarget)
        revealElement(focusTarget)
        outcome = 'target-focused'
      } else {
        outcome = focusRoleSummary(request.destination.roleId)
          ? 'role-summary-fallback'
          : 'unavailable'
      }
    }

    consumeRequest(request.requestId)
    return outcome
  }

  return {
    getSnapshot: () => state,
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    requestRoleFocus,
    setRoleOpen,
    isRoleOpen,
    registerRolePanel,
    registerFocusTarget,
    processPendingRequest,
  }
}
