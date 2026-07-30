import { invoke, isTauri } from '@tauri-apps/api/core'
import { listen, type UnlistenFn } from '@tauri-apps/api/event'
import { getCurrentWindow } from '@tauri-apps/api/window'

import { createApplicationMenuPlatformDescriptor } from './applicationMenuRegistry.ts'
import type {
  ApplicationMenuInvocation,
  ApplicationMenuPlatformDescriptor,
  ApplicationMenuProjection,
} from './applicationMenuTypes.ts'
import {
  APPLICATION_MENU_NATIVE_COMMANDS,
  APPLICATION_MENU_NATIVE_EVENT,
  createNativeApplicationMenuDescriptor,
  createNativeApplicationMenuProjection,
  parseApplicationMenuInvocation,
  parseApplicationMenuPlatform,
  parseNativeApplicationMenuDisposeResult,
  parseNativeApplicationMenuInstallResult,
  parseNativeApplicationMenuProjectionResult,
  type NativeApplicationMenuDisposeResult,
  type NativeApplicationMenuInstallRequest,
  type NativeApplicationMenuInstallResult,
  type NativeApplicationMenuProjectionRequest,
  type NativeApplicationMenuProjectionResult,
} from './nativeApplicationMenuTransport.ts'

const MAX_REMEMBERED_INVOCATIONS = 512

export type NativeApplicationMenuDiagnostic = Readonly<{
  code:
    | 'application-menu.invocation-invalid'
    | 'application-menu.invocation-duplicate'
    | 'application-menu.dispose-failed'
  detail?: string
}>

export type NativeApplicationMenuInvoke = <Result>(
  command: string,
  args?: Record<string, unknown>,
) => Promise<Result>

export type NativeApplicationMenuListen = (
  eventName: string,
  handler: (payload: unknown) => void,
) => Promise<UnlistenFn>

export type NativeApplicationMenuPortDependencies = Readonly<{
  invokeCommand?: NativeApplicationMenuInvoke
  listenEvent?: NativeApplicationMenuListen
  getWindowLabel?: () => string
  createBridgeInstanceId?: () => string
  onDiagnostic?: (diagnostic: NativeApplicationMenuDiagnostic) => void
}>

export type NativeApplicationMenuPort = Readonly<{
  platformDescriptor: ApplicationMenuPlatformDescriptor
  windowLabel: string
  bridgeInstanceId: string
  installResult: NativeApplicationMenuInstallResult
  applyProjection(
    projection: ApplicationMenuProjection,
  ): Promise<NativeApplicationMenuProjectionResult>
  dispose(): Promise<NativeApplicationMenuDisposeResult>
}>

function defaultListen(
  eventName: string,
  handler: (payload: unknown) => void,
): Promise<UnlistenFn> {
  return listen<unknown>(eventName, (event) => handler(event.payload))
}

function defaultBridgeInstanceId(): string {
  return globalThis.crypto.randomUUID()
}

function requireIdentity(value: string, name: string): string {
  if (value.length === 0 || value.length > 128) {
    throw new Error(`${name} must contain between 1 and 128 characters.`)
  }
  return value
}

function assertProjectionMatchesPort(
  descriptor: ApplicationMenuPlatformDescriptor,
  windowLabel: string,
  projection: ApplicationMenuProjection,
) {
  if (projection.platform !== descriptor.platform) {
    throw new Error('Application-menu projection platform does not match.')
  }
  if (projection.windowLabel !== windowLabel) {
    throw new Error('Application-menu projection window does not match.')
  }
  const expectedIds = descriptor.items.map((item) => item.itemId)
  const actualIds = projection.items.map((item) => item.itemId)
  if (
    actualIds.length !== expectedIds.length ||
    actualIds.some((itemId, index) => itemId !== expectedIds[index])
  ) {
    throw new Error('Application-menu projection item set does not match.')
  }
}

function rememberInvocation(
  invocationId: string,
  remembered: Set<string>,
  order: string[],
): boolean {
  if (remembered.has(invocationId)) return false
  remembered.add(invocationId)
  order.push(invocationId)
  if (order.length > MAX_REMEMBERED_INVOCATIONS) {
    const expired = order.shift()
    if (expired !== undefined) remembered.delete(expired)
  }
  return true
}

async function cleanupFailedInstall(
  invokeCommand: NativeApplicationMenuInvoke,
  unlisten: UnlistenFn,
  windowLabel: string,
  bridgeInstanceId: string,
) {
  unlisten()
  try {
    await invokeCommand(APPLICATION_MENU_NATIVE_COMMANDS.dispose, {
      request: { windowLabel, bridgeInstanceId },
    })
  } catch {
    // The original install failure remains authoritative.
  }
}

export async function createNativeApplicationMenuPort(
  onInvocation: (invocation: ApplicationMenuInvocation) => void,
  dependencies: NativeApplicationMenuPortDependencies = {},
): Promise<NativeApplicationMenuPort> {
  const invokeCommand = dependencies.invokeCommand ?? invoke
  const listenEvent = dependencies.listenEvent ?? defaultListen
  const windowLabel = requireIdentity(
    (dependencies.getWindowLabel ?? (() => getCurrentWindow().label))(),
    'Application-menu window label',
  )
  const bridgeInstanceId = requireIdentity(
    (dependencies.createBridgeInstanceId ?? defaultBridgeInstanceId)(),
    'Application-menu bridge instance ID',
  )
  const platform = parseApplicationMenuPlatform(
    await invokeCommand<unknown>(APPLICATION_MENU_NATIVE_COMMANDS.platform),
  )
  const platformDescriptor = createApplicationMenuPlatformDescriptor(platform)
  const descriptor = createNativeApplicationMenuDescriptor(platformDescriptor)
  const rememberedInvocations = new Set<string>()
  const invocationOrder: string[] = []
  let disposed = false

  const unlisten = await listenEvent(APPLICATION_MENU_NATIVE_EVENT, (payload) => {
    let invocation: ApplicationMenuInvocation
    try {
      invocation = parseApplicationMenuInvocation(payload, {
        bridgeInstanceId,
        windowLabel,
      })
    } catch (error) {
      dependencies.onDiagnostic?.({
        code: 'application-menu.invocation-invalid',
        detail: error instanceof Error ? error.message : undefined,
      })
      return
    }
    if (!rememberInvocation(
      invocation.invocationId,
      rememberedInvocations,
      invocationOrder,
    )) {
      dependencies.onDiagnostic?.({
        code: 'application-menu.invocation-duplicate',
      })
      return
    }
    onInvocation(invocation)
  })

  const installRequest: NativeApplicationMenuInstallRequest = {
    windowLabel,
    bridgeInstanceId,
    descriptor,
  }
  let installResult: NativeApplicationMenuInstallResult
  try {
    installResult = parseNativeApplicationMenuInstallResult(
      await invokeCommand<unknown>(APPLICATION_MENU_NATIVE_COMMANDS.install, {
        request: installRequest,
      }),
      {
        platform,
        windowLabel,
        bridgeInstanceId,
        itemCount: descriptor.itemIds.length,
      },
    )
  } catch (error) {
    await cleanupFailedInstall(
      invokeCommand,
      unlisten,
      windowLabel,
      bridgeInstanceId,
    )
    throw error
  }

  return Object.freeze({
    platformDescriptor,
    windowLabel,
    bridgeInstanceId,
    installResult,
    async applyProjection(projection) {
      if (disposed) {
        throw new Error('The native application-menu port is disposed.')
      }
      assertProjectionMatchesPort(platformDescriptor, windowLabel, projection)
      const request: NativeApplicationMenuProjectionRequest = {
        bridgeInstanceId,
        projection: createNativeApplicationMenuProjection(projection),
      }
      return parseNativeApplicationMenuProjectionResult(
        await invokeCommand<unknown>(
          APPLICATION_MENU_NATIVE_COMMANDS.applyProjection,
          { request },
        ),
        windowLabel,
        projection.generation,
      )
    },
    async dispose() {
      if (disposed) {
        return Object.freeze({
          status: 'ignored',
          windowLabel,
          reason: 'not-installed',
        })
      }
      disposed = true
      unlisten()
      try {
        return parseNativeApplicationMenuDisposeResult(
          await invokeCommand<unknown>(APPLICATION_MENU_NATIVE_COMMANDS.dispose, {
            request: { windowLabel, bridgeInstanceId },
          }),
          windowLabel,
        )
      } catch (error) {
        dependencies.onDiagnostic?.({
          code: 'application-menu.dispose-failed',
          detail: error instanceof Error ? error.message : undefined,
        })
        throw error
      }
    },
  })
}

export function isNativeApplicationMenuAvailable(): boolean {
  return isTauri()
}
