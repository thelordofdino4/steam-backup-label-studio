import type { DiscRolePresetRole } from '../layout/discRolePresets.ts'
import {
  createInitialEditorRoleFocusState,
  getEditorRoleFocusTargetIdentity,
  normalizeEditorRoleFocusTargetIdentity,
  reduceEditorRoleFocus,
  type DiscRoleFocusTargetId,
  type DiscRoleSectionAlignmentTarget,
  type DiscSectionStartRoleFocusDestination,
  type EditorRoleFocusRequest,
  type EditorRoleFocusState,
  type EditorRoleFocusTargetIdentity,
  type EditorRoleFocusTargetIdentityInput,
} from './editorRoleFocus.ts'

export type EditorRoleFocusRequestInput =
  EditorRoleFocusRequest extends infer Request
    ? Request extends EditorRoleFocusRequest
      ? Omit<Request, 'requestId'>
      : never
    : never

export type EditorRolePanelRegistration = {
  detailsElement: () => HTMLDetailsElement | null
  summaryElement: () => HTMLElement | null
}

export type EditorRoleFocusTargetRegistration = {
  element: () => HTMLElement | null
  openAncestors?: readonly (() => void)[]
}

export type EditorRoleSectionAlignmentTargetRegistration = {
  element: () => HTMLElement | null
}

export type EditorRoleFocusProcessingOutcome =
  | 'no-pending-request'
  | 'role-revealed'
  | 'target-focused'
  | 'role-summary-fallback'
  | 'section-alignment-target-unavailable'
  | 'section-focus-target-unavailable'
  | 'section-target-conflict'
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
    identity: EditorRoleFocusTargetIdentityInput,
    registration: EditorRoleFocusTargetRegistration,
  ) => () => void
  registerFocusTargetFallback: (
    identity: EditorRoleFocusTargetIdentityInput,
    fallbackIdentity: EditorRoleFocusTargetIdentityInput,
  ) => () => void
  registerSectionAlignmentTarget: (
    target: DiscRoleSectionAlignmentTarget,
    registration: EditorRoleSectionAlignmentTargetRegistration,
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

type IdentityRegistrationMap<TRegistration> = Map<
  DiscRoleFocusTargetId,
  Map<string | null, RegistrationEntry<TRegistration>>
>

function getIdentityElementId(identity: EditorRoleFocusTargetIdentity) {
  return 'elementId' in identity ? identity.elementId : null
}

function identitiesMatch(
  first: EditorRoleFocusTargetIdentity,
  second: EditorRoleFocusTargetIdentity,
) {
  return first.focusTarget === second.focusTarget &&
    getIdentityElementId(first) === getIdentityElementId(second)
}

function getIdentityRegistration<TRegistration>(
  registrations: IdentityRegistrationMap<TRegistration>,
  identity: EditorRoleFocusTargetIdentity,
) {
  return registrations
    .get(identity.focusTarget)
    ?.get(getIdentityElementId(identity))
}

function setIdentityRegistration<TRegistration>(
  registrations: IdentityRegistrationMap<TRegistration>,
  identity: EditorRoleFocusTargetIdentity,
  entry: RegistrationEntry<TRegistration>,
) {
  let targetRegistrations = registrations.get(identity.focusTarget)

  if (!targetRegistrations) {
    targetRegistrations = new Map()
    registrations.set(identity.focusTarget, targetRegistrations)
  }

  targetRegistrations.set(getIdentityElementId(identity), entry)
}

function deleteIdentityRegistration<TRegistration>(
  registrations: IdentityRegistrationMap<TRegistration>,
  identity: EditorRoleFocusTargetIdentity,
  entry: RegistrationEntry<TRegistration>,
) {
  const targetRegistrations = registrations.get(identity.focusTarget)
  const elementId = getIdentityElementId(identity)

  if (targetRegistrations?.get(elementId) !== entry) return

  targetRegistrations.delete(elementId)

  if (targetRegistrations.size === 0) {
    registrations.delete(identity.focusTarget)
  }
}

function requireTargetIdentity(
  input: EditorRoleFocusTargetIdentityInput,
) {
  const identity = normalizeEditorRoleFocusTargetIdentity(input)

  if (!identity) {
    throw new TypeError('Invalid editor role-focus target identity.')
  }

  return identity
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

function revealElement(
  element: HTMLElement,
  block: ScrollLogicalPosition = 'nearest',
) {
  try {
    element.scrollIntoView({ block, behavior: 'auto' })
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
  const focusTargetRegistrations:
    IdentityRegistrationMap<EditorRoleFocusTargetRegistration> = new Map()
  const focusTargetFallbackRegistrations:
    IdentityRegistrationMap<EditorRoleFocusTargetIdentity> = new Map()
  const sectionAlignmentTargetRegistrations = new Map<
    DiscRoleSectionAlignmentTarget,
    RegistrationEntry<EditorRoleSectionAlignmentTargetRegistration>
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

    const request = {
      requestId: nextRequestId,
      surfaceId: input.surfaceId,
      behavior: input.behavior,
      destination: input.destination,
      ...(input.scrollAlignment
        ? { scrollAlignment: input.scrollAlignment }
        : {}),
      ...(input.ownerTarget ? { ownerTarget: input.ownerTarget } : {}),
    } as EditorRoleFocusRequest
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
    identityInput: EditorRoleFocusTargetIdentityInput,
    registration: EditorRoleFocusTargetRegistration,
  ) {
    const identity = requireTargetIdentity(identityInput)
    const entry = { registration }
    setIdentityRegistration(focusTargetRegistrations, identity, entry)

    return () => {
      deleteIdentityRegistration(focusTargetRegistrations, identity, entry)
    }
  }

  function registerFocusTargetFallback(
    identityInput: EditorRoleFocusTargetIdentityInput,
    fallbackIdentityInput: EditorRoleFocusTargetIdentityInput,
  ) {
    const identity = requireTargetIdentity(identityInput)
    const fallbackIdentity = requireTargetIdentity(fallbackIdentityInput)

    if (identitiesMatch(identity, fallbackIdentity)) {
      throw new TypeError('Editor role-focus fallback cannot target itself.')
    }

    if ('elementId' in fallbackIdentity &&
      (!('elementId' in identity) ||
        identity.elementId !== fallbackIdentity.elementId)) {
      throw new TypeError(
        'Editor role-focus fallback cannot cross repeatable identities.',
      )
    }

    const visited: EditorRoleFocusTargetIdentity[] = []
    let currentIdentity: EditorRoleFocusTargetIdentity | undefined =
      fallbackIdentity

    while (currentIdentity) {
      if (identitiesMatch(currentIdentity, identity) ||
        visited.some((visitedIdentity) =>
          identitiesMatch(visitedIdentity, currentIdentity!))) {
        throw new TypeError('Editor role-focus fallback cycle detected.')
      }

      visited.push(currentIdentity)
      currentIdentity = getIdentityRegistration(
        focusTargetFallbackRegistrations,
        currentIdentity,
      )?.registration
    }

    const entry = { registration: fallbackIdentity }
    setIdentityRegistration(
      focusTargetFallbackRegistrations,
      identity,
      entry,
    )

    return () => {
      deleteIdentityRegistration(
        focusTargetFallbackRegistrations,
        identity,
        entry,
      )
    }
  }

  function registerSectionAlignmentTarget(
    target: DiscRoleSectionAlignmentTarget,
    registration: EditorRoleSectionAlignmentTargetRegistration,
  ) {
    if (sectionAlignmentTargetRegistrations.has(target)) {
      throw new TypeError(
        `Duplicate editor section-alignment target: ${target}`,
      )
    }

    const entry = { registration }
    sectionAlignmentTargetRegistrations.set(target, entry)

    return () => {
      if (sectionAlignmentTargetRegistrations.get(target) === entry) {
        sectionAlignmentTargetRegistrations.delete(target)
      }
    }
  }

  function getRoleRevealTarget(roleId: DiscRolePresetRole) {
    const registration = roleRegistrations.get(roleId)?.registration

    if (!registration) return null

    const summary = resolveElement(registration.summaryElement)
    const details = summary
      ? null
      : resolveElement(registration.detailsElement)

    return summary ?? details
  }

  function revealRole(
    roleId: DiscRolePresetRole,
    block: ScrollLogicalPosition = 'nearest',
  ) {
    const revealTarget = getRoleRevealTarget(roleId)

    return revealTarget ? revealElement(revealTarget, block) : false
  }

  function focusRoleSummary(
    roleId: DiscRolePresetRole,
    block: ScrollLogicalPosition = 'nearest',
  ) {
    const registration = roleRegistrations.get(roleId)?.registration

    if (!registration) return false

    const summary = resolveElement(registration.summaryElement)
    const details = summary
      ? null
      : resolveElement(registration.detailsElement)
    const revealTarget = summary ?? details

    if (!revealTarget) return false
    if (summary) focusElement(summary)
    revealElement(revealTarget, block)
    return true
  }

  function resolveFocusTarget(startIdentity: EditorRoleFocusTargetIdentity) {
    const visitedIdentities: EditorRoleFocusTargetIdentity[] = []
    let identity: EditorRoleFocusTargetIdentity | undefined = startIdentity

    while (identity && !visitedIdentities.some((visitedIdentity) =>
      identitiesMatch(visitedIdentity, identity!))) {
      visitedIdentities.push(identity)
      const registration = getIdentityRegistration(
        focusTargetRegistrations,
        identity,
      )?.registration

      if (registration) {
        for (const openAncestor of registration.openAncestors ?? []) {
          invokeWithoutThrow(openAncestor)
        }

        const element = resolveElement(registration.element)

        if (element) return element
      }

      identity = getIdentityRegistration(
        focusTargetFallbackRegistrations,
        identity,
      )?.registration
    }

    return null
  }

  function resolveSectionAlignmentTarget(
    destination: DiscSectionStartRoleFocusDestination,
  ) {
    const registration = sectionAlignmentTargetRegistrations
      .get(destination.sectionAlignmentTarget)?.registration

    return registration
      ? resolveElement(registration.element)
      : null
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
    const roleStart = request.scrollAlignment === 'role-start'

    if (request.behavior === 'reveal') {
      outcome = revealRole(
        request.destination.roleId,
        roleStart ? 'start' : 'nearest',
      )
        ? 'role-revealed'
        : 'unavailable'
    } else {
      const focusTarget = resolveFocusTarget(
        getEditorRoleFocusTargetIdentity(request.destination),
      )

      if (request.scrollAlignment === 'section-start') {
        const sectionTarget = resolveSectionAlignmentTarget(
          request.destination,
        )

        if (!sectionTarget) {
          outcome = 'section-alignment-target-unavailable'
        } else if (!focusTarget) {
          outcome = 'section-focus-target-unavailable'
        } else if (sectionTarget === focusTarget) {
          outcome = 'section-target-conflict'
        } else {
          revealElement(sectionTarget, 'start')
          focusElement(focusTarget)
          revealElement(sectionTarget, 'start')
          outcome = 'target-focused'
        }
      } else if (focusTarget) {
        focusElement(focusTarget)

        if (roleStart) {
          revealRole(request.destination.roleId, 'start')
        } else {
          revealElement(focusTarget)
        }
        outcome = 'target-focused'
      } else {
        outcome = focusRoleSummary(
          request.destination.roleId,
          roleStart ? 'start' : 'nearest',
        )
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
    registerFocusTargetFallback,
    registerSectionAlignmentTarget,
    processPendingRequest,
  }
}
