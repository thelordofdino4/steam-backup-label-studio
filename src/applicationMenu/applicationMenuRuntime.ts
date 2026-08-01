import { getCurrentWindow } from '@tauri-apps/api/window'

import type {
  ApplicationLifecycleCompositionRoot,
  ApplicationLifecycleCompositionSnapshot,
} from '../lifecycle/applicationLifecycleCompositionRoot.ts'
import type {
  ApplicationCommandCapability,
  ApplicationCommandDispatchResult,
} from '../lifecycle/applicationCommandTypes.ts'
import type {
  EditorWorkflowNavigationPort,
} from '../editor/editorNavigationRouter.ts'
import { EDITOR_WORKFLOW_IDS } from '../editor/editorNavigationRouter.ts'
import {
  dispatchApplicationMenuCommand,
} from './applicationMenuLifecycleRouting.ts'
import {
  resolveApplicationMenuWorkflow,
} from './applicationMenuWorkflowRouting.ts'
import { projectApplicationMenuCapabilities } from './applicationMenuProjection.ts'
import {
  getApplicationMenuItemDescriptor,
} from './applicationMenuRegistry.ts'
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
  type ApplicationMenuProjection,
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
import {
  installWindowsWebviewApplicationMenuAccelerators,
  type WindowsWebviewApplicationMenuAcceleratorInstaller,
} from './windowsWebviewApplicationMenuAccelerators.ts'

const SEMANTIC_ROUTING_UNAVAILABLE = Object.freeze({
  canExecute: false,
  reasonCode: 'application-menu.semantic-routing-unavailable',
} as const satisfies ApplicationCommandCapability)

const ENABLED_CAPABILITY = Object.freeze({
  canExecute: true,
} as const satisfies ApplicationCommandCapability)

const MAX_REMEMBERED_RUNTIME_INVOCATIONS = 512
const CROSS_SOURCE_ACCELERATOR_DEDUPLICATION_MS = 100

const OWNER_UNAVAILABLE = Object.freeze({
  canExecute: false,
  reasonCode: 'application-menu.owner-unavailable',
} as const satisfies ApplicationCommandCapability)

export type ApplicationMenuRuntimeDiagnostic =
  | NativeApplicationMenuDiagnostic
  | Readonly<{
      code:
        | 'application-menu.start-failed'
        | 'application-menu.projection-failed'
        | 'application-menu.invocation-rejected'
        | 'application-menu.invocation-unexpected'
        | 'application-menu.feedback-failed'
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
  installWindowsWebviewAccelerators?:
    WindowsWebviewApplicationMenuAcceleratorInstaller
  now?: () => number
  onDiagnostic?: (diagnostic: ApplicationMenuRuntimeDiagnostic) => void
}>

export type ApplicationMenuCommandIngressDependencies = Readonly<{
  publishFeedback(
    dispatch: ApplicationCommandDispatchResult<unknown>,
  ): void
  workflowNavigation: EditorWorkflowNavigationPort
}>

export type ApplicationMenuRuntimeStartResult =
  | 'started'
  | 'unavailable'
  | 'failed'
  | 'disposed'

export type ApplicationMenuRuntime = Readonly<{
  start(): Promise<ApplicationMenuRuntimeStartResult>
  connectCommandIngress(
    dependencies: ApplicationMenuCommandIngressDependencies,
  ): () => void
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
  commandIngress: ApplicationMenuCommandIngressDependencies | null,
): ApplicationMenuOwnerCapabilities {
  const commandIngressReady = commandIngress !== null
  return Object.freeze({
    lifecycle,
    exportPng: lifecycle['export.png'],
    workflowNavigation: commandIngress?.workflowNavigation.getCapabilities() ??
      mappedCapabilities<ApplicationMenuWorkflowId>(
        EDITOR_WORKFLOW_IDS,
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
      lifecycle: commandIngressReady
        ? ENABLED_CAPABILITY
        : SEMANTIC_ROUTING_UNAVAILABLE,
      export: commandIngressReady
        ? ENABLED_CAPABILITY
        : SEMANTIC_ROUTING_UNAVAILABLE,
      'workflow-navigation': commandIngressReady
        ? ENABLED_CAPABILITY
        : SEMANTIC_ROUTING_UNAVAILABLE,
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
      return 'case-spine'
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
  const installWindowsWebviewAccelerators =
    dependencies.installWindowsWebviewAccelerators ??
    ((descriptor, activate) =>
      installWindowsWebviewApplicationMenuAccelerators(descriptor, activate))
  const now = dependencies.now ?? Date.now

  let startPromise: Promise<ApplicationMenuRuntimeStartResult> | null = null
  let nativePort: NativeApplicationMenuPort | null = null
  let unsubscribeLifecycle: (() => void) | null = null
  let unsubscribeWindow: (() => void) | null = null
  let uninstallWindowsWebviewAccelerators: (() => void) | null = null
  let disposed = false
  let nextGeneration = 0
  let appliedProjectionGeneration: number | null = null
  let appliedProjection: ApplicationMenuProjection | null = null
  let commandIngress: Readonly<{
    connectionId: number
    dependencies: ApplicationMenuCommandIngressDependencies
  }> | null = null
  let nextConnectionId = 1
  let nextWebviewInvocationId = 1
  let latestPresentationActivation: Readonly<{
    at: number
    itemId: ApplicationMenuInvocation['itemId']
    source: 'native' | 'windows-webview'
  }> | null = null
  const rememberedRuntimeInvocations = new Set<string>()
  const runtimeInvocationOrder: string[] = []

  function reportProjectionFailure(error: unknown) {
    onDiagnostic({
      code: 'application-menu.projection-failed',
      detail: errorDetail(error),
    })
  }

  function rejectInvocation(detail: string) {
    onDiagnostic({
      code: 'application-menu.invocation-rejected',
      detail,
    })
  }

  function rememberRuntimeInvocation(invocationId: string): boolean {
    if (rememberedRuntimeInvocations.has(invocationId)) return false
    rememberedRuntimeInvocations.add(invocationId)
    runtimeInvocationOrder.push(invocationId)
    if (runtimeInvocationOrder.length > MAX_REMEMBERED_RUNTIME_INVOCATIONS) {
      const expired = runtimeInvocationOrder.shift()
      if (expired !== undefined) rememberedRuntimeInvocations.delete(expired)
    }
    return true
  }

  function handleInvocation(
    invocation: ApplicationMenuInvocation,
    source: 'native' | 'windows-webview' = 'native',
  ): boolean {
    const port = nativePort
    if (disposed || !port) {
      rejectInvocation('runtime-not-live')
      return false
    }
    if (
      invocation.bridgeInstanceId !== port.bridgeInstanceId ||
      invocation.windowLabel !== port.windowLabel
    ) {
      rejectInvocation('bridge-or-window-mismatch')
      return false
    }
    if (!rememberRuntimeInvocation(invocation.invocationId)) {
      onDiagnostic({ code: 'application-menu.invocation-duplicate' })
      return false
    }
    if (
      appliedProjectionGeneration === null ||
      invocation.projectionGeneration !== appliedProjectionGeneration
    ) {
      rejectInvocation('stale-projection')
      return false
    }

    const ingress = commandIngress
    if (!ingress) {
      rejectInvocation('command-ingress-not-ready')
      return false
    }

    const activation = Object.freeze({
      at: now(),
      itemId: invocation.itemId,
      source,
    })
    if (
      latestPresentationActivation !== null &&
      latestPresentationActivation.source !== source &&
      latestPresentationActivation.itemId === activation.itemId &&
      activation.at - latestPresentationActivation.at >= 0 &&
      activation.at - latestPresentationActivation.at <=
        CROSS_SOURCE_ACCELERATOR_DEDUPLICATION_MS
    ) {
      onDiagnostic({
        code: 'application-menu.invocation-duplicate',
        detail: 'cross-source-accelerator',
      })
      return true
    }
    latestPresentationActivation = activation

    let descriptor
    try {
      descriptor = getApplicationMenuItemDescriptor(invocation.itemId)
    } catch (error) {
      rejectInvocation(errorDetail(error) ?? 'unknown-item')
      return false
    }

    if (descriptor.eventRoutingOwner === 'editor-navigation-router') {
      const resolution = resolveApplicationMenuWorkflow(
        invocation.itemId,
        physicalTargetFor(lifecycle.getSnapshot()),
      )
      if (resolution.status === 'rejected') {
        rejectInvocation(resolution.reason)
        return false
      }
      void ingress.dependencies.workflowNavigation.navigate(resolution.intent)
        .then((result) => {
          if (
            disposed ||
            commandIngress?.connectionId !== ingress.connectionId
          ) {
            rejectInvocation('command-ingress-replaced')
            return
          }
          if (result.status === 'completed') return
          rejectInvocation(
            'reason' in result ? result.reason : result.status,
          )
        })
        .catch((error) => {
          if (!disposed) {
            onDiagnostic({
              code: 'application-menu.invocation-unexpected',
              detail: errorDetail(error),
            })
          }
        })
      return true
    }

    void dispatchApplicationMenuCommand(invocation.itemId, lifecycle)
      .then((result) => {
        if (result.status === 'rejected') {
          rejectInvocation(result.reason)
          return
        }
        if (
          disposed ||
          commandIngress?.connectionId !== ingress.connectionId
        ) {
          rejectInvocation('command-ingress-replaced')
          return
        }
        try {
          ingress.dependencies.publishFeedback(result.dispatch)
        } catch (error) {
          onDiagnostic({
            code: 'application-menu.feedback-failed',
            detail: errorDetail(error),
          })
        }
      })
      .catch((error) => {
        if (!disposed) {
          onDiagnostic({
            code: 'application-menu.invocation-unexpected',
            detail: errorDetail(error),
          })
        }
      })
    return true
  }

  function handleWindowsWebviewAccelerator(
    itemId: ApplicationMenuInvocation['itemId'],
  ): boolean {
    const port = nativePort
    const projection = appliedProjection
    if (
      disposed ||
      !port ||
      !commandIngress ||
      port.platformDescriptor.platform !== 'windows' ||
      projection === null ||
      projection.generation !== appliedProjectionGeneration ||
      projection.items.find((item) => item.itemId === itemId)?.enabled !== true
    ) {
      return false
    }

    const invocationId = `windows-webview-${nextWebviewInvocationId}`
    nextWebviewInvocationId += 1
    return handleInvocation(Object.freeze({
      invocationId,
      bridgeInstanceId: port.bridgeInstanceId,
      itemId,
      windowLabel: port.windowLabel,
      projectionGeneration: projection.generation,
    }), 'windows-webview')
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
          capabilities: productionOwnerCapabilities(
            snapshot.capabilities,
            commandIngress?.dependencies ?? null,
          ),
        },
      ))
      .then(async (projection) => ({
        projection,
        result: disposed
          ? undefined
          : await port.applyProjection(projection),
      }))
      .then(({ projection, result }) => {
        if (
          !disposed &&
          nativePort === port &&
          result?.status === 'applied'
        ) {
          appliedProjectionGeneration = result.generation
          appliedProjection = projection
        }
      })
      .catch((error) => {
        if (!disposed) reportProjectionFailure(error)
      })
  }

  async function start(): Promise<ApplicationMenuRuntimeStartResult> {
    if (disposed) return 'disposed'
    if (!nativeAvailable()) return 'unavailable'
    try {
      const port = await createNativePort((invocation) => {
        handleInvocation(invocation, 'native')
      })
      if (disposed) {
        await port.dispose()
        return 'disposed'
      }
      nativePort = port
      appliedProjectionGeneration = null
      appliedProjection = null
      if (port.platformDescriptor.platform === 'windows') {
        uninstallWindowsWebviewAccelerators =
          installWindowsWebviewAccelerators(
            port.platformDescriptor,
            handleWindowsWebviewAccelerator,
          )
      }
      unsubscribeLifecycle = lifecycle.subscribe(projectLatestSnapshot)
      unsubscribeWindow = await subscribeWindowState(projectLatestSnapshot)
      if (disposed) {
        unsubscribeWindow()
        unsubscribeWindow = null
        unsubscribeLifecycle()
        unsubscribeLifecycle = null
        uninstallWindowsWebviewAccelerators?.()
        uninstallWindowsWebviewAccelerators = null
        await port.dispose()
        nativePort = null
        appliedProjectionGeneration = null
        appliedProjection = null
        return 'disposed'
      }
      projectLatestSnapshot()
      return 'started'
    } catch (error) {
      unsubscribeWindow?.()
      unsubscribeWindow = null
      unsubscribeLifecycle?.()
      unsubscribeLifecycle = null
      uninstallWindowsWebviewAccelerators?.()
      uninstallWindowsWebviewAccelerators = null
      const port = nativePort
      nativePort = null
      appliedProjectionGeneration = null
      appliedProjection = null
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
    connectCommandIngress(ingressDependencies) {
      if (disposed) {
        throw new Error('The application menu runtime is disposed.')
      }
      const connection = Object.freeze({
        connectionId: nextConnectionId,
        dependencies: ingressDependencies,
      })
      nextConnectionId += 1
      commandIngress = connection
      projectLatestSnapshot()
      return () => {
        if (commandIngress !== connection) return
        commandIngress = null
        projectLatestSnapshot()
      }
    },
    async dispose() {
      if (disposed) return
      disposed = true
      commandIngress = null
      unsubscribeLifecycle?.()
      unsubscribeLifecycle = null
      unsubscribeWindow?.()
      unsubscribeWindow = null
      uninstallWindowsWebviewAccelerators?.()
      uninstallWindowsWebviewAccelerators = null
      const port = nativePort
      nativePort = null
      appliedProjectionGeneration = null
      appliedProjection = null
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
