import { getCurrentWindow } from '@tauri-apps/api/window'

import type {
  ApplicationLifecycleCompositionRoot,
  ApplicationLifecycleCompositionSnapshot,
} from '../lifecycle/applicationLifecycleCompositionRoot.ts'
import type { ApplicationCommandCapability } from '../lifecycle/applicationCommandTypes.ts'
import { projectApplicationMenuCapabilities } from './applicationMenuProjection.ts'
import {
  APPLICATION_MENU_FOCUSED_EDIT_OPERATION_IDS,
  APPLICATION_MENU_INFORMATIONAL_OPERATION_IDS,
  APPLICATION_MENU_NATIVE_WINDOW_OPERATION_IDS,
  type ApplicationMenuFocusedEditOperationId,
  type ApplicationMenuInformationalOperationId,
  type ApplicationMenuInvocation,
  type ApplicationMenuNativeWindowOperationId,
  type ApplicationMenuOwnerCapabilities,
  type ApplicationMenuPhysicalProjectTarget,
  type ApplicationMenuWindowState,
  type ApplicationMenuWorkflowId,
  type ApplicationMenuWorkspace,
} from './applicationMenuTypes.ts'
import {
  createNativeApplicationMenuPort,
  isNativeApplicationMenuAvailable,
  type NativeApplicationMenuDiagnostic,
  type NativeApplicationMenuPort,
} from './nativeApplicationMenuPort.ts'

const SEMANTIC_ROUTING_UNAVAILABLE = Object.freeze({
  canExecute: false,
  reasonCode: 'application-menu.semantic-routing-unavailable',
} as const satisfies ApplicationCommandCapability)

const OWNER_UNAVAILABLE = Object.freeze({
  canExecute: false,
  reasonCode: 'application-menu.owner-unavailable',
} as const satisfies ApplicationCommandCapability)

const WORKFLOW_IDS = Object.freeze([
  'workflow.game',
  'workflow.disc-template',
  'workflow.disc-layout-presets',
  'workflow.export-options',
] as const satisfies readonly ApplicationMenuWorkflowId[])

export type ApplicationMenuRuntimeDiagnostic =
  | NativeApplicationMenuDiagnostic
  | Readonly<{
      code:
        | 'application-menu.start-failed'
        | 'application-menu.projection-failed'
        | 'application-menu.invocation-unexpected'
      detail?: string
    }>

export type ApplicationMenuInvocationIngress = (
  invocation: ApplicationMenuInvocation,
) => void

export type ApplicationMenuRuntimeDependencies = Readonly<{
  nativeAvailable?: () => boolean
  createNativePort?: (
    ingress: ApplicationMenuInvocationIngress,
  ) => Promise<NativeApplicationMenuPort>
  captureWindowState?: (windowLabel: string) => Promise<ApplicationMenuWindowState>
  subscribeWindowState?: (
    listener: () => void,
  ) => Promise<() => void>
  invocationIngress?: ApplicationMenuInvocationIngress
  onDiagnostic?: (diagnostic: ApplicationMenuRuntimeDiagnostic) => void
}>

export type ApplicationMenuRuntimeStartResult =
  | 'started'
  | 'unavailable'
  | 'failed'
  | 'disposed'

export type ApplicationMenuRuntime = Readonly<{
  start(): Promise<ApplicationMenuRuntimeStartResult>
  dispose(): Promise<void>
}>

function mappedCapabilities<Key extends string>(
  keys: readonly Key[],
  capability: ApplicationCommandCapability,
): Readonly<Record<Key, ApplicationCommandCapability>> {
  return Object.freeze(Object.fromEntries(
    keys.map((key) => [key, capability]),
  )) as Readonly<Record<Key, ApplicationCommandCapability>>
}

function productionOwnerCapabilities(
  lifecycle: ApplicationLifecycleCompositionSnapshot['capabilities'],
): ApplicationMenuOwnerCapabilities {
  return Object.freeze({
    lifecycle,
    exportPng: OWNER_UNAVAILABLE,
    workflowNavigation: mappedCapabilities<ApplicationMenuWorkflowId>(
      WORKFLOW_IDS,
      OWNER_UNAVAILABLE,
    ),
    focusedEdit: mappedCapabilities<ApplicationMenuFocusedEditOperationId>(
      APPLICATION_MENU_FOCUSED_EDIT_OPERATION_IDS,
      OWNER_UNAVAILABLE,
    ),
    nativeWindow: mappedCapabilities<ApplicationMenuNativeWindowOperationId>(
      APPLICATION_MENU_NATIVE_WINDOW_OPERATION_IDS,
      OWNER_UNAVAILABLE,
    ),
    informational: mappedCapabilities<ApplicationMenuInformationalOperationId>(
      APPLICATION_MENU_INFORMATIONAL_OPERATION_IDS,
      OWNER_UNAVAILABLE,
    ),
    exclusiveBoundaries: Object.freeze({
      lifecycle: SEMANTIC_ROUTING_UNAVAILABLE,
      export: SEMANTIC_ROUTING_UNAVAILABLE,
      'workflow-navigation': SEMANTIC_ROUTING_UNAVAILABLE,
      'focused-edit': SEMANTIC_ROUTING_UNAVAILABLE,
      'native-window': SEMANTIC_ROUTING_UNAVAILABLE,
      informational: SEMANTIC_ROUTING_UNAVAILABLE,
    }),
  })
}

function workspaceFor(
  snapshot: ApplicationLifecycleCompositionSnapshot,
): ApplicationMenuWorkspace {
  return snapshot.lifecycle.visibleWorkspace === 'caseInsert'
    ? 'case'
    : snapshot.lifecycle.visibleWorkspace
}

function physicalTargetFor(
  snapshot: ApplicationLifecycleCompositionSnapshot,
): ApplicationMenuPhysicalProjectTarget | null {
  const session = snapshot.lifecycle.activeSession
  if (!session || snapshot.lifecycle.visibleWorkspace === 'home') return null
  if (session.kind === 'disc') return 'disc'
  switch (session.lastEditorRoute.workspace === 'caseInsert'
    ? session.lastEditorRoute.surface
    : null) {
    case 'front':
      return 'case-cover'
    case 'back':
      return 'case-tray'
    case 'spine':
      // The current lifecycle route intentionally retains a combined Spine
      // identity. Do not guess left versus right for a future workflow owner.
      return null
    default:
      return null
  }
}

async function captureProductionWindowState(
  windowLabel: string,
): Promise<ApplicationMenuWindowState> {
  const window = getCurrentWindow()
  if (window.label !== windowLabel) {
    throw new Error('The active Tauri window label changed unexpectedly.')
  }
  const [maximized, fullscreen] = await Promise.all([
    window.isMaximized(),
    window.isFullscreen(),
  ])
  return Object.freeze({
    windowLabel,
    live: true,
    maximized,
    fullscreen,
  })
}

function subscribeProductionWindowState(
  listener: () => void,
): Promise<() => void> {
  return getCurrentWindow().onResized(listener)
}

function errorDetail(error: unknown): string | undefined {
  if (error instanceof Error) return error.message
  return typeof error === 'string' ? error : undefined
}

export function createApplicationMenuRuntime(
  lifecycle: ApplicationLifecycleCompositionRoot,
  dependencies: ApplicationMenuRuntimeDependencies = {},
): ApplicationMenuRuntime {
  const onDiagnostic = dependencies.onDiagnostic ?? ((diagnostic) => {
    console.error(diagnostic.code, diagnostic.detail ?? '')
  })
  const nativeAvailable = dependencies.nativeAvailable ??
    isNativeApplicationMenuAvailable
  const createNativePort = dependencies.createNativePort ??
    ((ingress) => createNativeApplicationMenuPort(ingress, {
      onDiagnostic,
    }))
  const captureWindowState = dependencies.captureWindowState ??
    captureProductionWindowState
  const subscribeWindowState = dependencies.subscribeWindowState ??
    subscribeProductionWindowState
  const invocationIngress = dependencies.invocationIngress ?? ((invocation) => {
    onDiagnostic({
      code: 'application-menu.invocation-unexpected',
      detail: invocation.itemId,
    })
  })

  let startPromise: Promise<ApplicationMenuRuntimeStartResult> | null = null
  let nativePort: NativeApplicationMenuPort | null = null
  let unsubscribeLifecycle: (() => void) | null = null
  let unsubscribeWindow: (() => void) | null = null
  let disposed = false
  let nextGeneration = 0

  function reportProjectionFailure(error: unknown) {
    onDiagnostic({
      code: 'application-menu.projection-failed',
      detail: errorDetail(error),
    })
  }

  function projectLatestSnapshot() {
    const port = nativePort
    if (!port || disposed) return
    const generation = nextGeneration
    nextGeneration += 1
    const snapshot = lifecycle.getSnapshot()
    void captureWindowState(port.windowLabel)
      .then((window) => projectApplicationMenuCapabilities(
        port.platformDescriptor,
        {
          generation,
          platform: port.platformDescriptor.platform,
          window,
          ...(snapshot.lifecycle.activeSession
            ? { sessionId: snapshot.lifecycle.activeSession.id }
            : {}),
          workspace: workspaceFor(snapshot),
          physicalProjectTarget: physicalTargetFor(snapshot),
          capabilities: productionOwnerCapabilities(snapshot.capabilities),
        },
      ))
      .then((projection) => disposed
        ? undefined
        : port.applyProjection(projection))
      .catch((error) => {
        if (!disposed) reportProjectionFailure(error)
      })
  }

  async function start(): Promise<ApplicationMenuRuntimeStartResult> {
    if (disposed) return 'disposed'
    if (!nativeAvailable()) return 'unavailable'
    try {
      const port = await createNativePort(invocationIngress)
      if (disposed) {
        await port.dispose()
        return 'disposed'
      }
      nativePort = port
      unsubscribeLifecycle = lifecycle.subscribe(projectLatestSnapshot)
      unsubscribeWindow = await subscribeWindowState(projectLatestSnapshot)
      if (disposed) {
        unsubscribeWindow()
        unsubscribeWindow = null
        unsubscribeLifecycle()
        unsubscribeLifecycle = null
        await port.dispose()
        nativePort = null
        return 'disposed'
      }
      projectLatestSnapshot()
      return 'started'
    } catch (error) {
      unsubscribeWindow?.()
      unsubscribeWindow = null
      unsubscribeLifecycle?.()
      unsubscribeLifecycle = null
      const port = nativePort
      nativePort = null
      if (port) {
        try {
          await port.dispose()
        } catch {
          // The port reports its own disposal diagnostic.
        }
      }
      onDiagnostic({
        code: 'application-menu.start-failed',
        detail: errorDetail(error),
      })
      return 'failed'
    }
  }

  return Object.freeze({
    start() {
      startPromise ??= start()
      return startPromise
    },
    async dispose() {
      if (disposed) return
      disposed = true
      unsubscribeLifecycle?.()
      unsubscribeLifecycle = null
      unsubscribeWindow?.()
      unsubscribeWindow = null
      const port = nativePort
      nativePort = null
      if (port) {
        try {
          await port.dispose()
        } catch {
          // The native port already reported a safe diagnostic.
        }
      }
    },
  })
}
