import assert from 'node:assert/strict'
import test from 'node:test'

import { createApplicationLifecycleCompositionRoot } from '../lifecycle/applicationLifecycleCompositionRoot.ts'
import { createApplicationMenuPlatformDescriptor } from './applicationMenuRegistry.ts'
import {
  createApplicationMenuRuntime,
  type ApplicationMenuRuntimeDiagnostic,
} from './applicationMenuRuntime.ts'
import type {
  ApplicationMenuInvocation,
  ApplicationMenuProjection,
  ApplicationMenuWindowState,
} from './applicationMenuTypes.ts'
import type { NativeApplicationMenuPort } from './nativeApplicationMenuPort.ts'

function flush() {
  return new Promise<void>((resolve) => setImmediate(resolve))
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

test('native runtime projects conservative state with monotonic generations and no dispatch', async () => {
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
    code: 'application-menu.invocation-unexpected',
    detail: 'menu.file.open',
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
