import { createApplicationCommandDiagnostics } from '../diagnostics/applicationCommandDiagnostics.ts'
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
import {
  createLoadedProjectSession,
  isProjectSessionDirty,
} from '../lifecycle/projectSession.ts'
import {
  createBlankJewelCaseSavedProject,
} from '../project/caseInsertProjectAdapters.ts'
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
    stage: 'window-subscription',
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

test('native Case Layout Presets invocation only reveals and focuses; it cannot create slots or dirty the project', async () => {
  const root = createApplicationLifecycleCompositionRoot({
    initialState: createLoadedProjectSession({
      sessionId: 'case-preset-menu-nonmutating',
      currentPath: 'C:\\projects\\case-menu.sbls',
      persistenceFormat: 'sbls-package-v1',
      project: createBlankJewelCaseSavedProject('Case Menu'),
    }),
  })
  const sourceState = root.getLifecycleState()
  assert.ok(sourceState.activeSession?.kind === 'caseInsert')
  if (sourceState.activeSession?.kind !== 'caseInsert') {
    throw new Error('Expected a Case project session.')
  }
  assert.equal(isProjectSessionDirty(sourceState.activeSession), false)
  assert.deepEqual(
    sourceState.activeSession.project.caseInsert.templates.tray.artworkSlots,
    [],
  )

  const projections: ApplicationMenuProjection[] = []
  const diagnostics: ApplicationMenuRuntimeDiagnostic[] = []
  const commandIds: string[] = []
  const navigations: EditorNavigationIntent[] = []
  const publications: ApplicationCommandDispatchResult<unknown>[] = []
  let invocationIngress: ((invocation: ApplicationMenuInvocation) => void) | null = null
  const lifecycle = Object.freeze({
    getSnapshot: root.getSnapshot,
    subscribe: root.subscribe,
    dispatch: async <Value = void>(commandId: string, input?: unknown) => {
      commandIds.push(commandId)
      return root.dispatch<Value>(commandId, input)
    },
  }) as unknown as ApplicationLifecycleCompositionRoot
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
  assert.equal(
    projection.items.find((item) =>
      item.itemId === 'menu.tools.case-layout-presets')?.enabled,
    true,
  )
  ;(invocationIngress as ((invocation: ApplicationMenuInvocation) => void))({
    invocationId: 'tools-case-layout-presets',
    bridgeInstanceId: 'bridge-1',
    itemId: 'menu.tools.case-layout-presets',
    windowLabel: 'main',
    projectionGeneration: projection.generation,
  })
  await flush()

  assert.equal(navigations.length, 1)
  assert.deepEqual(navigations[0], {
    workflowId: 'workflow.case-layout-presets',
    behavior: 'focus',
    destination: {
      kind: 'domain-area',
      workspaceId: 'workspace.case',
      surfaceId: 'surface.case.front',
      areaId: 'area.layout-presets.case',
      ownerId: 'owner.case-layout-presets',
      controlId: 'control.case-layout-presets.selector',
    },
  })
  assert.deepEqual(commandIds, [])
  assert.deepEqual(publications, [])
  assert.deepEqual(diagnostics, [])
  assert.strictEqual(root.getLifecycleState(), sourceState)
  const after = root.getLifecycleState().activeSession
  assert.ok(after?.kind === 'caseInsert')
  if (after?.kind !== 'caseInsert') {
    throw new Error('Expected a Case project session.')
  }
  assert.equal(isProjectSessionDirty(after), false)
  assert.deepEqual(after.project.caseInsert.templates.tray.artworkSlots, [])

  await runtime.dispose()
  root.dispose()
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

for (const failedStage of ['native-availability', 'native-port', 'windows-accelerators', 'lifecycle-subscription', 'window-subscription'] as const) {
  test(`startup diagnostics retain the failed ${failedStage} prerequisite without private exception text`, async () => {
    let time = 0
    const diagnostics = createApplicationCommandDiagnostics({ now: () => time })
    const root = createApplicationLifecycleCompositionRoot()
    const fail = () => { time = 40; throw new Error('private-user-path-and-token') }
    const lifecycle = failedStage === 'lifecycle-subscription' ? { ...root, subscribe: fail } : root
    let nativeDisposals = 0
    let acceleratorDisposals = 0
    const runtime = createApplicationMenuRuntime(lifecycle, {
      nativeAvailable: () => failedStage === 'native-availability' ? fail() : true,
      createNativePort: async () => failedStage === 'native-port' ? fail() : fakePort([], () => { nativeDisposals += 1 }),
      installWindowsWebviewAccelerators: () => {
        if (failedStage === 'windows-accelerators') fail()
        return () => { acceleratorDisposals += 1 }
      },
      subscribeWindowState: async () => {
        if (failedStage === 'window-subscription') fail()
        return () => {}
      },
      observeStartup: diagnostics.observeMenuStartup,
      onDiagnostic: diagnostics.recordMenuDiagnostic,
    })
    assert.equal(await runtime.start(), 'failed')
    assert.equal(await runtime.start(), 'failed')
    const records = diagnostics.snapshot().records
    assert.equal(records.length, 2)
    assert.equal(records[0].event, 'startup')
    assert.equal(records[0].status, 'failed')
    assert.equal(records[0].stage, failedStage)
    assert.equal(records[0].elapsedMs, 40)
    assert.equal(records[1].diagnosticCode, 'application-menu.start-failed')
    assert.equal(records[1].stage, failedStage)
    assert.doesNotMatch(diagnostics.toJson(), /private|token|detail|message/)
    assert.equal(nativeDisposals, ['native-availability', 'native-port'].includes(failedStage) ? 0 : 1)
    assert.equal(acceleratorDisposals, ['lifecycle-subscription', 'window-subscription'].includes(failedStage) ? 1 : 0)
    await runtime.dispose()
    root.dispose()
  })
}

test('a pending prerequisite shows elapsed time and disposal does not become a false startup failure', async () => {
  let time = 5
  const diagnostics = createApplicationCommandDiagnostics({ now: () => time })
  const root = createApplicationLifecycleCompositionRoot()
  let releaseWindow: ((unsubscribe: () => void) => void) | undefined
  let unsubscribed = 0
  const runtime = createApplicationMenuRuntime(root, {
    nativeAvailable: () => true,
    createNativePort: async () => fakePort([], () => {}),
    installWindowsWebviewAccelerators: () => () => {},
    subscribeWindowState: () => new Promise(resolve => { releaseWindow = resolve }),
    observeStartup: diagnostics.observeMenuStartup,
    onDiagnostic: diagnostics.recordMenuDiagnostic,
  })
  const pending = runtime.start()
  await flush()
  time = 105
  assert.equal(diagnostics.snapshot().records[0].status, 'running')
  assert.equal(diagnostics.snapshot().records[0].stage, 'window-subscription')
  assert.equal(diagnostics.snapshot().records[0].elapsedMs, 100)
  await runtime.dispose()
  releaseWindow!(() => { unsubscribed += 1 })
  assert.equal(await pending, 'disposed')
  assert.equal(unsubscribed, 1)
  assert.equal(diagnostics.snapshot().records.length, 1)
  assert.equal(diagnostics.snapshot().records[0].status, 'disposed')
  root.dispose()
})

test('unavailable native runtime is observed once without a false failure', async () => {
  const diagnostics = createApplicationCommandDiagnostics()
  const root = createApplicationLifecycleCompositionRoot()
  const runtime = createApplicationMenuRuntime(root, {
    nativeAvailable: () => false,
    observeStartup: diagnostics.observeMenuStartup,
    onDiagnostic: diagnostics.recordMenuDiagnostic,
  })
  assert.equal(await runtime.start(), 'unavailable')
  assert.equal(await runtime.start(), 'unavailable')
  assert.equal(diagnostics.snapshot().records.length, 1)
  assert.equal(diagnostics.snapshot().records[0].status, 'unavailable')
  assert.equal(diagnostics.snapshot().records[0].stage, 'native-availability')
  await runtime.dispose()
  root.dispose()
})

for (const phase of ['begin', 'stage', 'complete', 'diagnostic'] as const) {
  test(`a throwing ${phase} observer cannot replace the menu startup outcome`, async () => {
    const root = createApplicationLifecycleCompositionRoot()
    const fail = () => { throw new Error('observer-failed') }
    const runtime = createApplicationMenuRuntime(root, {
      nativeAvailable: () => { throw new Error('original-native-probe') },
      observeStartup: () => {
        if (phase === 'begin') fail()
        return { stage: phase === 'stage' ? fail : () => {}, complete: phase === 'complete' ? fail : () => {} }
      },
      onDiagnostic: phase === 'diagnostic' ? fail : () => {},
    })
    assert.equal(await runtime.start(), 'failed')
    await runtime.dispose()
    root.dispose()
  })
}

for (const failedStage of ['projection-window-state', 'projection-capabilities', 'projection-native-apply'] as const) {
  test(`projection failure identifies ${failedStage} after runtime start without publishing raw detail`, async () => {
    const diagnostics = createApplicationCommandDiagnostics()
    const root = createApplicationLifecycleCompositionRoot()
    const fail = () => { throw new Error('private-projection-path') }
    const port = fakePort([], () => {})
    const runtime = createApplicationMenuRuntime(root, {
      nativeAvailable: () => true,
      createNativePort: async () => ({ ...port, applyProjection: async projection => failedStage === 'projection-native-apply' ? fail() : port.applyProjection(projection) }),
      captureWindowState: async () => failedStage === 'projection-window-state' ? fail() : { windowLabel: 'main', live: true, maximized: false, fullscreen: false },
      subscribeWindowState: async () => () => {},
      installWindowsWebviewAccelerators: () => () => {},
      observeStartup: diagnostics.observeMenuStartup,
      onDiagnostic: diagnostics.recordMenuDiagnostic,
    })
    if (failedStage === 'projection-capabilities') {
      runtime.connectCommandIngress({
        publishFeedback: () => {},
        workflowNavigation: { ...fakeWorkflowNavigation(), getCapabilities: fail },
      })
    }
    assert.equal(await runtime.start(), 'started')
    await flush()
    const records = diagnostics.snapshot().records
    assert.equal(records[0].status, 'started')
    assert.equal(records[0].stage, 'initial-projection')
    assert.equal(records[1].diagnosticCode, 'application-menu.projection-failed')
    assert.equal(records[1].stage, failedStage)
    assert.doesNotMatch(diagnostics.toJson(), /private|wrong-window|detail|message/)
    await runtime.dispose()
    root.dispose()
  })
}


test('Help routes only to its informational owner and rechecks stale capability without dispatching project commands', async () => {
  const root = createApplicationLifecycleCompositionRoot()
  const before = root.getLifecycleState()
  const projections: ApplicationMenuProjection[] = []
  let receive: ((invocation: ApplicationMenuInvocation) => void) | undefined
  let opened = 0
  let blocked = false
  let feedback = 0
  const runtime = createApplicationMenuRuntime(root, {
    nativeAvailable: () => true,
    createNativePort: async ingress => { receive = ingress; return fakePort(projections, () => {}) },
    captureWindowState: async () => ({ windowLabel: 'main', live: true, maximized: false, fullscreen: false }),
    subscribeWindowState: async () => () => {},
    installWindowsWebviewAccelerators: () => () => {},
    onDiagnostic: () => {},
  })
  runtime.connectCommandIngress({
    publishFeedback: () => { feedback += 1 },
    workflowNavigation: fakeWorkflowNavigation(),
    informational: {
      getCapabilities: () => ({
        'help.open-documentation': blocked ? { canExecute: false, reasonCode: 'application-help.modal-active' } : { canExecute: true },
        'help.show-about': { canExecute: false, reasonCode: 'application-menu.owner-unavailable' },
      }),
      invoke: operation => { assert.equal(operation, 'help.open-documentation'); opened += 1; return true },
    },
  })
  await runtime.start()
  await flush()
  const projection = projections.at(-1)!
  assert.equal(projection.items.find(item => item.itemId === 'menu.help.documentation')?.enabled, true)
  assert.equal(projection.items.find(item => item.itemId === 'menu.help.about')?.enabled, false)
  assert.equal(projection.items.some(item => item.itemId === 'menu.help.report-issue'), false)
  const invocation = { invocationId: 'help-1', bridgeInstanceId: 'bridge-1', windowLabel: 'main', itemId: 'menu.help.documentation', projectionGeneration: projection.generation } as const
  receive!(invocation)
  receive!(invocation)
  assert.equal(opened, 1)
  blocked = true
  receive!({ ...invocation, invocationId: 'help-2' })
  receive!({ ...invocation, invocationId: 'help-3', itemId: 'menu.help.about' })
  assert.equal(opened, 1)
  assert.equal(feedback, 0)
  assert.equal(root.getLifecycleState(), before)
  assert.deepEqual(root.getBusyState().occupiedScopes, [])
  await runtime.dispose()
  root.dispose()
})


test('Tools dismiss informational presentation before delegating to the existing navigation owner', async () => {
  const order: string[] = []
  const root = fakeDiscLifecycle(async () => { throw new Error('unexpected lifecycle dispatch') })
  const projections: ApplicationMenuProjection[] = []
  let receive: ((invocation: ApplicationMenuInvocation) => void) | undefined
  const runtime = createApplicationMenuRuntime(root, {
    nativeAvailable: () => true,
    createNativePort: async ingress => { receive = ingress; return fakePort(projections, () => {}) },
    captureWindowState: async () => ({ windowLabel: 'main', live: true, maximized: false, fullscreen: false }),
    subscribeWindowState: async () => () => {},
    installWindowsWebviewAccelerators: () => () => {},
    onDiagnostic: () => {},
  })
  runtime.connectCommandIngress({
    publishFeedback: () => { throw new Error('unexpected command feedback') },
    workflowNavigation: fakeWorkflowNavigation(() => { order.push('navigate') }),
    informational: {
      getCapabilities: () => ({ 'help.open-documentation': { canExecute: true }, 'help.show-about': { canExecute: false, reasonCode: 'unavailable' } }),
      invoke: () => true,
      dismissForNavigation: () => { order.push('dismiss-help') },
    },
  })
  await runtime.start()
  await flush()
  receive!({ invocationId: 'tools-after-help', bridgeInstanceId: 'bridge-1', windowLabel: 'main', itemId: 'menu.tools.game', projectionGeneration: projections.at(-1)!.generation })
  await flush()
  assert.deepEqual(order, ['dismiss-help', 'navigate'])
  await runtime.dispose()
})
