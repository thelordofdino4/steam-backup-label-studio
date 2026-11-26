import assert from 'node:assert/strict'
import test from 'node:test'

import type { ApplicationMenuProjection } from './applicationMenuTypes.ts'
import {
  createNativeApplicationMenuPort,
  type NativeApplicationMenuDiagnostic,
} from './nativeApplicationMenuPort.ts'
import {
  APPLICATION_MENU_NATIVE_COMMANDS,
  APPLICATION_MENU_NATIVE_EVENT,
} from './nativeApplicationMenuTransport.ts'

function projection(
  port: Awaited<ReturnType<typeof createNativeApplicationMenuPort>>,
  generation = 0,
): ApplicationMenuProjection {
  return {
    generation,
    platform: port.platformDescriptor.platform,
    windowLabel: port.windowLabel,
    workspace: 'home',
    items: port.platformDescriptor.items.map((item) => ({
      itemId: item.itemId,
      enabled: false,
      checked: false,
      visible: true,
      unavailableReason: 'application-menu.semantic-routing-unavailable',
    })),
  }
}

test('the port installs once, projects exact state, forwards events once, and tears down once', async () => {
  const calls: { command: string, args?: Record<string, unknown> }[] = []
  const diagnostics: NativeApplicationMenuDiagnostic[] = []
  const invocations: unknown[] = []
  let eventHandler: ((payload: unknown) => void) | null = null
  let unlistenCalls = 0
  const invokeCommand = async <Result>(
    command: string,
    args?: Record<string, unknown>,
  ): Promise<Result> => {
    calls.push({ command, args })
    if (command === APPLICATION_MENU_NATIVE_COMMANDS.platform) {
      return 'windows' as Result
    }
    if (command === APPLICATION_MENU_NATIVE_COMMANDS.install) {
      const request = args?.request as {
        windowLabel: string
        bridgeInstanceId: string
        descriptor: { itemIds: unknown[] }
      }
      return {
        status: 'installed',
        platform: 'windows',
        windowLabel: request.windowLabel,
        bridgeInstanceId: request.bridgeInstanceId,
        itemCount: request.descriptor.itemIds.length,
      } as Result
    }
    if (command === APPLICATION_MENU_NATIVE_COMMANDS.applyProjection) {
      const request = args?.request as {
        projection: { windowLabel: string, generation: number }
      }
      return {
        status: 'applied',
        windowLabel: request.projection.windowLabel,
        generation: request.projection.generation,
      } as Result
    }
    if (command === APPLICATION_MENU_NATIVE_COMMANDS.dispose) {
      return { status: 'disposed', windowLabel: 'main' } as Result
    }
    throw new Error(`Unexpected command: ${command}`)
  }

  const port = await createNativeApplicationMenuPort(
    (invocation) => invocations.push(invocation),
    {
      invokeCommand,
      listenEvent: async (eventName, handler) => {
        assert.equal(eventName, APPLICATION_MENU_NATIVE_EVENT)
        eventHandler = handler
        return () => { unlistenCalls += 1 }
      },
      getWindowLabel: () => 'main',
      createBridgeInstanceId: () => 'bridge-1',
      onDiagnostic: (diagnostic) => diagnostics.push(diagnostic),
    },
  )

  assert.deepEqual(calls.map(({ command }) => command), [
    APPLICATION_MENU_NATIVE_COMMANDS.platform,
    APPLICATION_MENU_NATIVE_COMMANDS.install,
  ])
  assert.equal(port.installResult.status, 'installed')
  assert.ok(eventHandler)

  await port.applyProjection(projection(port, 2))
  const projectionRequest = calls.at(-1)?.args?.request as {
    projection: { items: Record<string, unknown>[] }
  }
  assert.deepEqual(Object.keys(projectionRequest.projection.items[0]).toSorted(), [
    'checked', 'enabled', 'itemId',
  ])

  const event = {
    invocationId: 'menu-0001',
    bridgeInstanceId: 'bridge-1',
    itemId: 'menu.file.open',
    windowLabel: 'main',
    projectionGeneration: 2,
  }
  const deliver = eventHandler as (payload: unknown) => void
  deliver(event)
  deliver(event)
  deliver({ ...event, invocationId: 'foreign', windowLabel: 'other' })
  deliver({ ...event, invocationId: 'unknown', itemId: 'menu.unknown' })
  assert.deepEqual(invocations, [event])
  assert.deepEqual(diagnostics.map(({ code }) => code), [
    'application-menu.invocation-duplicate',
    'application-menu.invocation-invalid',
    'application-menu.invocation-invalid',
  ])

  const beforeInvalid = calls.length
  await assert.rejects(() => port.applyProjection({
    ...projection(port, 3),
    windowLabel: 'other',
  }), /window does not match/)
  await assert.rejects(() => port.applyProjection({
    ...projection(port, 3),
    platform: 'linux',
  }), /platform does not match/)
  const reordered = projection(port, 3)
  await assert.rejects(() => port.applyProjection({
    ...reordered,
    items: reordered.items.toReversed(),
  }), /item set does not match/)
  assert.equal(calls.length, beforeInvalid)

  assert.equal((await port.dispose()).status, 'disposed')
  assert.deepEqual(await port.dispose(), {
    status: 'ignored', windowLabel: 'main', reason: 'not-installed',
  })
  assert.equal(unlistenCalls, 1)
  assert.equal(calls.filter(({ command }) =>
    command === APPLICATION_MENU_NATIVE_COMMANDS.dispose).length, 1)
})

test('a failed install removes the listener and requests bridge-scoped cleanup', async () => {
  let unlistenCalls = 0
  const commands: string[] = []
  await assert.rejects(() => createNativeApplicationMenuPort(() => {}, {
    invokeCommand: async <Result>(command: string): Promise<Result> => {
      commands.push(command)
      if (command === APPLICATION_MENU_NATIVE_COMMANDS.platform) {
        return 'windows' as Result
      }
      if (command === APPLICATION_MENU_NATIVE_COMMANDS.install) {
        return { invalid: true } as Result
      }
      return { status: 'disposed', windowLabel: 'main' } as Result
    },
    listenEvent: async () => () => { unlistenCalls += 1 },
    getWindowLabel: () => 'main',
    createBridgeInstanceId: () => 'failed-bridge',
  }), /install response is invalid/)
  assert.equal(unlistenCalls, 1)
  assert.deepEqual(commands, [
    APPLICATION_MENU_NATIVE_COMMANDS.platform,
    APPLICATION_MENU_NATIVE_COMMANDS.install,
    APPLICATION_MENU_NATIVE_COMMANDS.dispose,
  ])
})
