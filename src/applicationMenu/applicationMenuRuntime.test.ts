import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createApplicationLifecycleCompositionRoot,
  type ApplicationLifecycleCompositionRoot,
  type ApplicationLifecycleCompositionSnapshot,
} from '../lifecycle/applicationLifecycleCompositionRoot.ts'
import {
  APPLICATION_COMMAND_IDS,
  type ApplicationCommandDispatchResult,
} from '../lifecycle/applicationCommandTypes.ts'
import { createApplicationMenuPlatformDescriptor } from './applicationMenuRegistry.ts'
import {
  createApplicationMenuRuntime,
  type ApplicationMenuRuntimeDiagnostic,
} from './applicationMenuRuntime.ts'
import type {
  ApplicationMenuItemId,
  ApplicationMenuInvocation,
  ApplicationMenuProjection,
  ApplicationMenuWindowState,
} from './applicationMenuTypes.ts'
import type { NativeApplicationMenuPort } from './nativeApplicationMenuPort.ts'
import {
  EDITOR_WORKFLOW_IDS,
  type EditorNavigationIntent,
  type EditorWorkflowNavigationPort,
} from '../editor/editorNavigationRouter.ts'

function flush() {
  return new Promise<void>((resolve) => setImmediate(resolve))
}

function fakeWorkflowNavigation(
  onNavigate: (intent: EditorNavigationIntent) => void = () => {},
): EditorWorkflowNavigationPort {
  return Object.freeze({
    getCapabilities: () => Object.freeze(Object.fromEntries(
      EDITOR_WORKFLOW_IDS.map((workflowId) => [
        workflowId,
        Object.freeze({ canExecute: true }),
      ]),
    )) as ReturnType<EditorWorkflowNavigationPort['getCapabilities']>,
    navigate: async (intent) => {
      onNavigate(intent)
      return Object.freeze({
        status: 'completed',
        destination: intent.destination,
        focus: 'focused',
      })
    },
  })
}

function fakeLifecycle(
  dispatch: (
    commandId: string,
  ) => Promise<ApplicationCommandDispatchResult<void>>,
): ApplicationLifecycleCompositionRoot {
  const connected = new Set([
    'project.new-disc',
    'project.new-case',
    'project.open',
    'project.save',
    'project.save-as',
    'workspace.return-home',
    'project.resume',
    'export.png',
  ])
  const capabilities = Object.freeze(Object.fromEntries(
    APPLICATION_COMMAND_IDS.map((commandId) => [
      commandId,
      connected.has(commandId)
        ? Object.freeze({ canExecute: true })
        : Object.freeze({
            canExecute: false,
            reasonCode: 'application.command-owner-unimplemented',
          }),
    ]),
  )) as ApplicationLifecycleCompositionSnapshot['capabilities']
  const snapshot = Object.freeze({
    generation: 0,
    stateGeneration: 0,
    lifecycle: Object.freeze({
      activeSession: null,
      visibleWorkspace: 'home',
    }),
    busy: Object.freeze({ occupiedScopes: Object.freeze([]) }),
    capabilities,
  }) as ApplicationLifecycleCompositionSnapshot

  return {
    getSnapshot: () => snapshot,
    subscribe: () => () => {},
    dispatch,
  } as unknown as ApplicationLifecycleCompositionRoot
}

function fakeDiscLifecycle(
  dispatch: (
    commandId: string,
  ) => Promise<ApplicationCommandDispatchResult<void>>,
): ApplicationLifecycleCompositionRoot {
  const base = fakeLifecycle(dispatch)
  const baseSnapshot = base.getSnapshot()
  const snapshot = Object.freeze({
    ...baseSnapshot,
    lifecycle: Object.freeze({
      activeSession: Object.freeze({
        id: 'disc-session',
        kind: 'disc',
        lastEditorRoute: Object.freeze({ workspace: 'disc' }),
      }),
      visibleWorkspace: 'disc',
    }),
  }) as ApplicationLifecycleCompositionSnapshot
  return {
    ...base,
    getSnapshot: () => snapshot,
  } as ApplicationLifecycleCompositionRoot
}

function fakePort(
  projections: ApplicationMenuProjection[],
  onDispose: () => void,
): NativeApplicationMenuPort {
  const descriptor = createApplicationMenuPlatformDescriptor('windows')
  return {
    platformDescriptor: descriptor,
    windowLabel: 'main',
    bridgeInstanceId: 'bridge-1',
    installResult: {
      status: 'installed',
      platform: 'windows',
      windowLabel: 'main',
      bridgeInstanceId: 'bridge-1',
      itemCount: descriptor.items.length,
    },
    async applyProjection(projection) {
      projections.push(projection)
      return {
        status: 'applied',
        windowLabel: projection.windowLabel,
        generation: projection.generation,
      }
    },
    async dispose() {
      onDispose()
      return { status: 'disposed', windowLabel: 'main' }
    },
  }
}

test('browser fallback performs no native registration or projection', async () => {
  const lifecycle = createApplicationLifecycleCompositionRoot()
  let createCalls = 0
  const runtime = createApplicationMenuRuntime(lifecycle, {
    nativeAvailable: () => false,
    createNativePort: async () => {
      createCalls += 1
      return fakePort([], () => {})
    },
  })
  assert.equal(await runtime.start(), 'unavailable')
  assert.equal(await runtime.start(), 'unavailable')
  assert.equal(createCalls, 0)
  await runtime.dispose()
  lifecycle.dispose()
})

test('native runtime projects conservative state with monotonic generations before readiness', async () => {
  const lifecycle = createApplicationLifecycleCompositionRoot()
  const projections: ApplicationMenuProjection[] = []
  const diagnostics: ApplicationMenuRuntimeDiagnostic[] = []
  let invocationIngress: ((invocation: ApplicationMenuInvocation) => void) | null = null
  let windowListener: (() => void) | null = null
  let disposed = 0
  let windowState: ApplicationMenuWindowState = {
    windowLabel: 'main', live: true, maximized: false, fullscreen: false,
  }
  const runtime = createApplicationMenuRuntime(lifecycle, {
    nativeAvailable: () => true,
    createNativePort: async (ingress) => {
      invocationIngress = ingress
      return fakePort(projections, () => { disposed += 1 })
    },
    captureWindowState: async () => windowState,
    subscribeWindowState: async (listener) => {
      windowListener = listener
      return () => { windowListener = null }
    },
    onDiagnostic: (diagnostic) => diagnostics.push(diagnostic),
  })

  assert.equal(await runtime.start(), 'started')
  assert.equal(await runtime.start(), 'started')
  await flush()
  assert.equal(projections.length, 1)
  assert.equal(projections[0].generation, 0)
  assert.ok(projections[0].items.every((item) => !item.enabled))
  assert.equal(
    projections[0].items.find((item) =>
      item.itemId === 'menu.file.new-disc')?.unavailableReason,
    'application.command-owner-unimplemented',
  )
  assert.equal(
    projections[0].items.find((item) =>
      item.itemId === 'menu.file.save')?.unavailableReason,
    'project.no-active-session',
  )

  windowState = {
    windowLabel: 'main', live: true, maximized: true, fullscreen: true,
  }
  ;(windowListener as (() => void) | null)?.()
  await flush()
  assert.deepEqual(projections.map(({ generation }) => generation), [0, 1])
  assert.equal(
    projections[1].items.find((item) =>
      item.itemId === 'menu.window.toggle-maximize')?.label,
    'Restore',
  )
  assert.equal(
    projections[1].items.find((item) =>
      item.itemId === 'menu.window.toggle-fullscreen')?.label,
    'Exit Full Screen',
  )

  ;(invocationIngress as ((invocation: ApplicationMenuInvocation) => void) | null)?.({
    invocationId: 'menu-1',
    bridgeInstanceId: 'bridge-1',
    itemId: 'menu.file.open',
    windowLabel: 'main',
    projectionGeneration: 1,
  })
  assert.deepEqual(diagnostics.at(-1), {
    code: 'application-menu.invocation-rejected',
    detail: 'command-ingress-not-ready',
  })

  await runtime.dispose()
  await runtime.dispose()
  assert.equal(disposed, 1)
  assert.equal(windowListener, null)
  lifecycle.dispose()
})

test('start failure cleans up native registration and owned subscriptions', async () => {
  const lifecycle = createApplicationLifecycleCompositionRoot()
  let disposed = 0
  let lifecycleNotifications = 0
  const unsubscribeProbe = lifecycle.subscribe(() => {
    lifecycleNotifications += 1
  })
  const diagnostics: ApplicationMenuRuntimeDiagnostic[] = []
  const runtime = createApplicationMenuRuntime(lifecycle, {
    nativeAvailable: () => true,
    createNativePort: async () => fakePort([], () => { disposed += 1 }),
    subscribeWindowState: async () => {
      throw 'window subscription failed'
    },
    onDiagnostic: (diagnostic) => diagnostics.push(diagnostic),
  })
  assert.equal(await runtime.start(), 'failed')
  assert.equal(disposed, 1)
  assert.deepEqual(diagnostics.at(-1), {
    code: 'application-menu.start-failed',
    detail: 'window subscription failed',
  })
  unsubscribeProbe()
  assert.equal(lifecycleNotifications, 0)
  await runtime.dispose()
  lifecycle.dispose()
})

test('lifecycle readiness enables only authoritative connected capabilities and remounts safely', async () => {
  const projections: ApplicationMenuProjection[] = []
  const diagnostics: ApplicationMenuRuntimeDiagnostic[] = []
  let invocationIngress: ((invocation: ApplicationMenuInvocation) => void) | null = null
  let dispatchCalls = 0
  const lifecycle = fakeLifecycle(async (commandId) => {
    dispatchCalls += 1
    return {
      disposition: 'executed',
      commandId: commandId as 'project.open',
      result: { status: 'success', value: undefined },
    }
  })
  const runtime = createApplicationMenuRuntime(lifecycle, {
    nativeAvailable: () => true,
    createNativePort: async (ingress) => {
      invocationIngress = ingress
      return fakePort(projections, () => {})
    },
    captureWindowState: async () => ({
      windowLabel: 'main', live: true, maximized: false, fullscreen: false,
    }),
    subscribeWindowState: async () => () => {},
    onDiagnostic: (diagnostic) => diagnostics.push(diagnostic),
  })

  assert.equal(await runtime.start(), 'started')
  await flush()
  assert.ok(projections.at(-1)?.items.every((item) => !item.enabled))

  const firstDisconnect = runtime.connectCommandIngress({
    publishFeedback: () => {},
    workflowNavigation: fakeWorkflowNavigation(),
  })
  await flush()
  const ready = projections.at(-1)!
  const byId = new Map(ready.items.map((item) => [item.itemId, item]))
  for (const itemId of [
    'menu.file.new-disc',
    'menu.file.new-case',
    'menu.file.open',
    'menu.file.save',
    'menu.file.save-as',
    'menu.file.return-home',
    'menu.file.resume-project',
  ] as const) {
    assert.equal(byId.get(itemId)?.enabled, true, itemId)
  }
  assert.equal(byId.get('menu.file.export-png')?.enabled, true)
  assert.equal(byId.get('menu.file.close-project')?.enabled, false)
  assert.equal(byId.get('menu.file.close-window')?.enabled, false)
  assert.equal(byId.get('menu.file.quit')?.enabled, false)
  assert.ok(ready.items
    .filter((item) => !item.itemId.startsWith('menu.file.'))
    .every((item) => !item.enabled))

  const secondDisconnect = runtime.connectCommandIngress({
    publishFeedback: () => {},
    workflowNavigation: fakeWorkflowNavigation(),
  })
  await flush()
  const projectionCount = projections.length
  firstDisconnect()
  await flush()
  assert.equal(projections.length, projectionCount)

  secondDisconnect()
  await flush()
  assert.equal(
    projections.at(-1)?.items.find((item) =>
      item.itemId === 'menu.file.open')?.unavailableReason,
    'application-menu.semantic-routing-unavailable',
  )

  await runtime.dispose()
  ;(invocationIngress as ((invocation: ApplicationMenuInvocation) => void) | null)?.({
    invocationId: 'late-event',
    bridgeInstanceId: 'bridge-1',
    itemId: 'menu.file.open',
    windowLabel: 'main',
    projectionGeneration: ready.generation,
  })
  await flush()
  assert.equal(dispatchCalls, 0)
  assert.deepEqual(diagnostics.at(-1), {
    code: 'application-menu.invocation-rejected',
    detail: 'runtime-not-live',
  })
})

test('native lifecycle ingress dispatches once, rechecks results, publishes once, and rejects invalid envelopes', async () => {
  const projections: ApplicationMenuProjection[] = []
  const diagnostics: ApplicationMenuRuntimeDiagnostic[] = []
  const commandIds: string[] = []
  const publications: ApplicationCommandDispatchResult<unknown>[] = []
  let invocationIngress: ((invocation: ApplicationMenuInvocation) => void) | null = null
  let nextResult: ApplicationCommandDispatchResult<void> | null = null
  let rejectDispatch = false
  const lifecycle = fakeLifecycle(async (commandId) => {
    commandIds.push(commandId)
    if (rejectDispatch) throw new Error('synthetic dispatch rejection')
    return nextResult ?? {
      disposition: 'executed',
      commandId: commandId as 'project.open',
      result: { status: 'success', value: undefined },
    }
  })
  const runtime = createApplicationMenuRuntime(lifecycle, {
    nativeAvailable: () => true,
    createNativePort: async (ingress) => {
      invocationIngress = ingress
      return fakePort(projections, () => {})
    },
    captureWindowState: async () => ({
      windowLabel: 'main', live: true, maximized: false, fullscreen: false,
    }),
    subscribeWindowState: async () => () => {},
    onDiagnostic: (diagnostic) => diagnostics.push(diagnostic),
  })
  runtime.connectCommandIngress({
    publishFeedback: (dispatch) => publications.push(dispatch),
    workflowNavigation: fakeWorkflowNavigation(),
  })
  assert.equal(await runtime.start(), 'started')
  await flush()
  const generation = projections.at(-1)!.generation
  const invoke = (
    invocationId: string,
    itemId: ApplicationMenuInvocation['itemId'],
    overrides: Partial<ApplicationMenuInvocation> = {},
  ) => (invocationIngress as (invocation: ApplicationMenuInvocation) => void)({
    invocationId,
    bridgeInstanceId: 'bridge-1',
    itemId,
    windowLabel: 'main',
    projectionGeneration: generation,
    ...overrides,
  })

  const items = [
    'menu.file.new-disc',
    'menu.file.new-case',
    'menu.file.open',
    'menu.file.save',
    'menu.file.save-as',
    'menu.file.return-home',
    'menu.file.resume-project',
    'menu.file.export-png',
  ] as const
  items.forEach((itemId, index) => invoke(`allowed-${index}`, itemId))
  await flush()
  assert.deepEqual(commandIds, [
    'project.new-disc',
    'project.new-case',
    'project.open',
    'project.save',
    'project.save-as',
    'workspace.return-home',
    'project.resume',
    'export.png',
  ])
  assert.equal(publications.length, 8)

  invoke('allowed-0', 'menu.file.new-disc')
  invoke('stale', 'menu.file.open', { projectionGeneration: generation + 1 })
  invoke('wrong-window', 'menu.file.open', { windowLabel: 'other' })
  invoke('excluded-close', 'menu.file.close-project')
  await flush()
  assert.equal(commandIds.length, 8)
  assert.equal(publications.length, 8)
  assert.ok(diagnostics.some((diagnostic) =>
    diagnostic.code === 'application-menu.invocation-duplicate'))
  assert.ok(diagnostics.some((diagnostic) =>
    diagnostic.code === 'application-menu.invocation-rejected' &&
    diagnostic.detail === 'stale-projection'))
  assert.ok(diagnostics.some((diagnostic) =>
    diagnostic.code === 'application-menu.invocation-rejected' &&
    diagnostic.detail === 'bridge-or-window-mismatch'))
  assert.ok(diagnostics.some((diagnostic) =>
    diagnostic.code === 'application-menu.invocation-rejected' &&
    diagnostic.detail === 'lifecycle-command-not-connected'))

  nextResult = {
    disposition: 'not-executed',
    reason: 'disabled',
    commandId: 'project.save',
    userMessage: 'Save is unavailable now.',
  }
  invoke('disabled-save', 'menu.file.save')
  nextResult = {
    disposition: 'not-executed',
    reason: 'busy',
    commandId: 'project.save',
  }
  invoke('busy-save', 'menu.file.save')
  await flush()
  assert.deepEqual(publications.slice(-2).map((result) =>
    result.disposition === 'not-executed' ? result.reason : null), [
    'disabled',
    'busy',
  ])

  rejectDispatch = true
  nextResult = null
  invoke('async-rejection', 'menu.file.open')
  await flush()
  assert.ok(diagnostics.some((diagnostic) =>
    diagnostic.code === 'application-menu.invocation-unexpected' &&
    diagnostic.detail === 'synthetic dispatch rejection'))

  await runtime.dispose()
})

test('native Tools ingress resolves descriptors and navigates once without lifecycle dispatch or feedback', async () => {
  const projections: ApplicationMenuProjection[] = []
  const diagnostics: ApplicationMenuRuntimeDiagnostic[] = []
  const commandIds: string[] = []
  const navigations: EditorNavigationIntent[] = []
  const publications: ApplicationCommandDispatchResult<unknown>[] = []
  let invocationIngress: ((invocation: ApplicationMenuInvocation) => void) | null = null
  const lifecycle = fakeDiscLifecycle(async (commandId) => {
    commandIds.push(commandId)
    return {
      disposition: 'executed',
      commandId: commandId as 'project.open',
      result: { status: 'success', value: undefined },
    }
  })
  const runtime = createApplicationMenuRuntime(lifecycle, {
    nativeAvailable: () => true,
    createNativePort: async (ingress) => {
      invocationIngress = ingress
      return fakePort(projections, () => {})
    },
    captureWindowState: async () => ({
      windowLabel: 'main', live: true, maximized: false, fullscreen: false,
    }),
    subscribeWindowState: async () => () => {},
    onDiagnostic: (diagnostic) => diagnostics.push(diagnostic),
  })
  runtime.connectCommandIngress({
    publishFeedback: (dispatch) => publications.push(dispatch),
    workflowNavigation: fakeWorkflowNavigation((intent) => {
      navigations.push(intent)
    }),
  })
  assert.equal(await runtime.start(), 'started')
  await flush()
  const projection = projections.at(-1)!
  assert.ok([
    'menu.tools.game',
    'menu.tools.disc-template',
    'menu.tools.disc-layout-presets',
    'menu.tools.export-options',
  ].every((itemId) => projection.items.find((item) =>
    item.itemId === itemId)?.enabled))
  assert.equal(
    projection.items.find((item) =>
      item.itemId === 'menu.tools.case-layout-presets')?.enabled,
    false,
  )

  ;(invocationIngress as ((invocation: ApplicationMenuInvocation) => void))({
    invocationId: 'tools-game',
    bridgeInstanceId: 'bridge-1',
    itemId: 'menu.tools.game',
    windowLabel: 'main',
    projectionGeneration: projection.generation,
  })
  await flush()
  assert.equal(navigations.length, 1)
  assert.equal(navigations[0].workflowId, 'workflow.game')
  assert.equal(navigations[0].destination.controlId, 'control.game.query')
  assert.deepEqual(commandIds, [])
  assert.deepEqual(publications, [])
  assert.deepEqual(diagnostics, [])
  await runtime.dispose()
})

test('Windows WebView accelerators use the applied projection, shared ingress, cross-source deduplication, and owned teardown', async () => {
  const projections: ApplicationMenuProjection[] = []
  const diagnostics: ApplicationMenuRuntimeDiagnostic[] = []
  const commandIds: string[] = []
  const publications: ApplicationCommandDispatchResult<unknown>[] = []
  let nativeIngress: ((invocation: ApplicationMenuInvocation) => void) | null = null
  let webviewActivate: ((itemId: ApplicationMenuItemId) => boolean) | null = null
  let uninstallCalls = 0
  let now = 1_000
  const lifecycle = fakeLifecycle(async (commandId) => {
    commandIds.push(commandId)
    return {
      disposition: 'executed',
      commandId: commandId as 'project.open',
      result: { status: 'success', value: undefined },
    }
  })
  const runtime = createApplicationMenuRuntime(lifecycle, {
    nativeAvailable: () => true,
    createNativePort: async (ingress) => {
      nativeIngress = ingress
      return fakePort(projections, () => {})
    },
    captureWindowState: async () => ({
      windowLabel: 'main', live: true, maximized: false, fullscreen: false,
    }),
    subscribeWindowState: async () => () => {},
    installWindowsWebviewAccelerators: (_descriptor, activate) => {
      webviewActivate = activate
      return () => { uninstallCalls += 1 }
    },
    now: () => now,
    onDiagnostic: (diagnostic) => diagnostics.push(diagnostic),
  })
  runtime.connectCommandIngress({
    publishFeedback: (dispatch) => publications.push(dispatch),
    workflowNavigation: fakeWorkflowNavigation(),
  })

  assert.equal(await runtime.start(), 'started')
  await flush()
  const generation = projections.at(-1)!.generation
  const activate = webviewActivate as
    ((itemId: ApplicationMenuItemId) => boolean) | null
  assert.equal(activate?.('menu.file.open'), true)
  assert.equal(activate?.('menu.file.close-window'), false)
  await flush()
  assert.deepEqual(commandIds, ['project.open'])
  assert.equal(publications.length, 1)

  ;(nativeIngress as ((invocation: ApplicationMenuInvocation) => void) | null)?.({
    invocationId: 'native-same-keypress',
    bridgeInstanceId: 'bridge-1',
    itemId: 'menu.file.open',
    windowLabel: 'main',
    projectionGeneration: generation,
  })
  await flush()
  assert.deepEqual(commandIds, ['project.open'])
  assert.deepEqual(diagnostics.at(-1), {
    code: 'application-menu.invocation-duplicate',
    detail: 'cross-source-accelerator',
  })

  now += 101
  ;(nativeIngress as ((invocation: ApplicationMenuInvocation) => void) | null)?.({
    invocationId: 'native-later-activation',
    bridgeInstanceId: 'bridge-1',
    itemId: 'menu.file.open',
    windowLabel: 'main',
    projectionGeneration: generation,
  })
  await flush()
  assert.deepEqual(commandIds, ['project.open', 'project.open'])
  assert.equal(publications.length, 2)

  assert.equal(activate?.('menu.file.open'), true)
  await flush()
  assert.deepEqual(commandIds, ['project.open', 'project.open'])
  assert.deepEqual(diagnostics.at(-1), {
    code: 'application-menu.invocation-duplicate',
    detail: 'cross-source-accelerator',
  })

  now += 101
  assert.equal(activate?.('menu.file.open'), true)
  await flush()
  assert.deepEqual(commandIds, [
    'project.open',
    'project.open',
    'project.open',
  ])
  assert.equal(publications.length, 3)

  await runtime.dispose()
  assert.equal(uninstallCalls, 1)
  assert.equal(activate?.('menu.file.open'), false)
})
