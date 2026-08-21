import type { ApplicationCommandCapability } from '../lifecycle/applicationCommandTypes.ts'

export const EDITOR_WORKFLOW_IDS = Object.freeze([
  'workflow.game',
  'workflow.disc-template',
  'workflow.disc-layout-presets',
  'workflow.case-layout-presets',
  'workflow.export-options',
] as const)

export type EditorWorkflowId = typeof EDITOR_WORKFLOW_IDS[number]

export type EditorWorkspaceId = 'workspace.disc' | 'workspace.case'

export type EditorPhysicalSurfaceId =
  | 'surface.disc'
  | 'surface.case.front'
  | 'surface.case.back'
  | 'surface.case.spine'
  | 'surface.case.spine.left'
  | 'surface.case.spine.right'

export type EditorDestinationSurfaceId = Exclude<
  EditorPhysicalSurfaceId,
  'surface.case.spine'
>

export type EditorDomainAreaId =
  | 'area.game'
  | 'area.template.disc'
  | 'area.layout-presets.disc'
  | 'area.layout-presets.case'
  | 'area.export'

export type EditorFeatureOwnerId =
  | 'owner.game.search'
  | 'owner.disc-template'
  | 'owner.disc-layout-presets'
  | 'owner.case-layout-presets'
  | 'owner.export.disc-guides'
  | 'owner.export.case-guides'

export type EditorRegisteredControlId =
  | 'control.game.query'
  | 'control.disc-template.selector'
  | 'control.disc-layout-presets.selector'
  | 'control.case-layout-presets.selector'
  | 'control.export.disc.center-hole'
  | 'control.export.case.cover-trim'
  | 'control.export.case.tray-trim'

export type EditorDestination = Readonly<{
  kind: 'domain-area'
  workspaceId: EditorWorkspaceId
  surfaceId: EditorDestinationSurfaceId
  areaId: EditorDomainAreaId
  ownerId: EditorFeatureOwnerId
  controlId: EditorRegisteredControlId
}>

export type EditorNavigationBehavior = 'reveal' | 'focus'

export type EditorNavigationIntent = Readonly<{
  workflowId: EditorWorkflowId
  behavior: EditorNavigationBehavior
  destination: EditorDestination
}>

export type EditorNavigationRequest = EditorNavigationIntent & Readonly<{
  requestId: number
}>

export type EditorNavigationResult =
  | Readonly<{
      status: 'completed'
      destination: EditorDestination
      focus: 'focused' | 'revealed' | 'not-requested'
    }>
  | Readonly<{
      status: 'unavailable'
      destination: EditorDestination
      reason:
        | 'no-active-session'
        | 'owner-not-mounted'
        | 'host-not-ready'
        | 'capability-disabled'
        | 'focus-unavailable'
    }>
  | Readonly<{
      status: 'invalid'
      reason:
        | 'unknown-destination'
        | 'invalid-owner-control'
        | 'invalid-relationship'
    }>
  | Readonly<{
      status: 'hidden'
      destination: EditorDestination
      reason: 'feature-disabled' | 'selection-required'
      fallback?: EditorDestination
    }>
  | Readonly<{
      status: 'editor-incompatible'
      destination: EditorDestination
      actualWorkspaceId: EditorWorkspaceId
    }>

export type EditorNavigationRegistration = Readonly<{
  workflowId: EditorWorkflowId
  ownerId: EditorFeatureOwnerId
  controlId: EditorRegisteredControlId
}>

export type EditorNavigationEnvironment = Readonly<{
  sessionId: string | null
  workspaceId: EditorWorkspaceId | null
  surfaceId: EditorPhysicalSurfaceId | null
  hostReady: boolean
  lifecycleTransitionActive: boolean
  applicationModalActive: boolean
  hiddenWorkflowIds: readonly EditorWorkflowId[]
  registrations: readonly EditorNavigationRegistration[]
}>

export type EditorNavigationReadiness =
  | Readonly<{ status: 'ready' }>
  | Exclude<EditorNavigationResult, { status: 'completed' }>

export type EditorWorkflowNavigationPort = Readonly<{
  getCapabilities(): Readonly<Record<
    EditorWorkflowId,
    ApplicationCommandCapability
  >>
  navigate(intent: EditorNavigationIntent): Promise<EditorNavigationResult>
}>

function invalid(
  reason: Extract<EditorNavigationResult, { status: 'invalid' }>['reason'],
): EditorNavigationReadiness {
  return Object.freeze({ status: 'invalid', reason })
}

function isWorkspaceSurfaceRelationshipValid(
  destination: EditorDestination,
): boolean {
  return destination.workspaceId === 'workspace.disc'
    ? destination.surfaceId === 'surface.disc'
    : destination.surfaceId.startsWith('surface.case.')
}

export function validateEditorNavigationDestination(
  intent: EditorNavigationIntent,
): EditorNavigationReadiness {
  const { workflowId, destination } = intent
  if (destination.kind !== 'domain-area') {
    return invalid('unknown-destination')
  }
  if (!isWorkspaceSurfaceRelationshipValid(destination)) {
    return invalid('invalid-relationship')
  }

  switch (workflowId) {
    case 'workflow.game':
      return destination.areaId === 'area.game' &&
          destination.ownerId === 'owner.game.search' &&
          destination.controlId === 'control.game.query'
        ? Object.freeze({ status: 'ready' })
        : invalid('invalid-owner-control')
    case 'workflow.disc-template':
      return destination.workspaceId === 'workspace.disc' &&
          destination.surfaceId === 'surface.disc' &&
          destination.areaId === 'area.template.disc' &&
          destination.ownerId === 'owner.disc-template' &&
          destination.controlId === 'control.disc-template.selector'
        ? Object.freeze({ status: 'ready' })
        : invalid('invalid-owner-control')
    case 'workflow.disc-layout-presets':
      return destination.workspaceId === 'workspace.disc' &&
          destination.surfaceId === 'surface.disc' &&
          destination.areaId === 'area.layout-presets.disc' &&
          destination.ownerId === 'owner.disc-layout-presets' &&
          destination.controlId === 'control.disc-layout-presets.selector'
        ? Object.freeze({ status: 'ready' })
        : invalid('invalid-owner-control')
    case 'workflow.case-layout-presets':
      return destination.workspaceId === 'workspace.case' &&
          destination.areaId === 'area.layout-presets.case' &&
          destination.ownerId === 'owner.case-layout-presets' &&
          destination.controlId === 'control.case-layout-presets.selector'
        ? Object.freeze({ status: 'ready' })
        : invalid('invalid-owner-control')
    case 'workflow.export-options':
      if (destination.areaId !== 'area.export') {
        return invalid('invalid-owner-control')
      }
      if (destination.workspaceId === 'workspace.disc') {
        return destination.surfaceId === 'surface.disc' &&
            destination.ownerId === 'owner.export.disc-guides' &&
            destination.controlId === 'control.export.disc.center-hole'
          ? Object.freeze({ status: 'ready' })
          : invalid('invalid-owner-control')
      }
      if (destination.ownerId !== 'owner.export.case-guides') {
        return invalid('invalid-owner-control')
      }
      if (destination.surfaceId === 'surface.case.front') {
        return destination.controlId === 'control.export.case.cover-trim'
          ? Object.freeze({ status: 'ready' })
          : invalid('invalid-owner-control')
      }
      return destination.controlId === 'control.export.case.tray-trim'
        ? Object.freeze({ status: 'ready' })
        : invalid('invalid-owner-control')
    default:
      return invalid('invalid-relationship')
  }
}

function isCurrentSurface(
  requested: EditorDestinationSurfaceId,
  actual: EditorPhysicalSurfaceId,
): boolean {
  if (requested === actual) return true
  return actual === 'surface.case.spine' &&
    (requested === 'surface.case.spine.left' ||
      requested === 'surface.case.spine.right')
}

function isRegistered(
  intent: EditorNavigationIntent,
  registrations: readonly EditorNavigationRegistration[],
): boolean {
  return registrations.some((registration) =>
    registration.workflowId === intent.workflowId &&
    registration.ownerId === intent.destination.ownerId &&
    registration.controlId === intent.destination.controlId)
}

export function evaluateEditorNavigationIntent(
  intent: EditorNavigationIntent,
  environment: EditorNavigationEnvironment,
): EditorNavigationReadiness {
  const validation = validateEditorNavigationDestination(intent)
  if (validation.status !== 'ready') return validation

  if (!environment.sessionId || !environment.workspaceId) {
    return Object.freeze({
      status: 'unavailable',
      destination: intent.destination,
      reason: 'no-active-session',
    })
  }
  if (intent.destination.workspaceId !== environment.workspaceId) {
    return Object.freeze({
      status: 'editor-incompatible',
      destination: intent.destination,
      actualWorkspaceId: environment.workspaceId,
    })
  }
  if (
    !environment.surfaceId ||
    !isCurrentSurface(intent.destination.surfaceId, environment.surfaceId)
  ) {
    return Object.freeze({
      status: 'unavailable',
      destination: intent.destination,
      reason: 'capability-disabled',
    })
  }
  if (environment.hiddenWorkflowIds.includes(intent.workflowId)) {
    return Object.freeze({
      status: 'hidden',
      destination: intent.destination,
      reason: 'feature-disabled',
    })
  }
  if (
    environment.lifecycleTransitionActive ||
    environment.applicationModalActive
  ) {
    return Object.freeze({
      status: 'unavailable',
      destination: intent.destination,
      reason: 'capability-disabled',
    })
  }
  if (!environment.hostReady) {
    return Object.freeze({
      status: 'unavailable',
      destination: intent.destination,
      reason: 'host-not-ready',
    })
  }
  if (!isRegistered(intent, environment.registrations)) {
    return Object.freeze({
      status: 'unavailable',
      destination: intent.destination,
      reason: 'owner-not-mounted',
    })
  }
  return Object.freeze({ status: 'ready' })
}

export function projectEditorWorkflowCapabilities(
  environment: EditorNavigationEnvironment,
): Readonly<Record<EditorWorkflowId, ApplicationCommandCapability>> {
  return Object.freeze(Object.fromEntries(EDITOR_WORKFLOW_IDS.map(
    (workflowId) => {
      let reasonCode: string | null = null
      if (!environment.sessionId || !environment.workspaceId) {
        reasonCode = 'workflow.no-active-editor'
      } else if (
        environment.lifecycleTransitionActive ||
        environment.applicationModalActive
      ) {
        reasonCode = 'workflow.navigation-blocked'
      } else if (!environment.hostReady) {
        reasonCode = 'workflow.host-not-ready'
      } else if (environment.hiddenWorkflowIds.includes(workflowId)) {
        reasonCode = 'workflow.hidden'
      } else if (!environment.registrations.some(
        (registration) => registration.workflowId === workflowId,
      )) {
        reasonCode = 'workflow.owner-not-mounted'
      }

      return [workflowId, reasonCode === null
        ? Object.freeze({ canExecute: true })
        : Object.freeze({ canExecute: false, reasonCode })]
    },
  ))) as Readonly<Record<EditorWorkflowId, ApplicationCommandCapability>>
}

export function completeEditorNavigationRequest(
  request: EditorNavigationRequest,
  focus: 'focused' | 'revealed' | 'not-requested',
): Extract<EditorNavigationResult, { status: 'completed' }> {
  return Object.freeze({
    status: 'completed',
    destination: request.destination,
    focus,
  })
}
