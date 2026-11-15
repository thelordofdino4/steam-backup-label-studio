import { invoke, isTauri } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { getCurrentWindow } from '@tauri-apps/api/window'
import type { NativeTerminationKind } from '../app/appNativeTerminationCommand.ts'

export const NATIVE_TERMINATION_EVENT = 'application-termination://requested'
export { isTauri as isNativeTerminationAvailable }
export type NativeTerminationPort = Readonly<{
  commit(kind: NativeTerminationKind): Promise<void>
  dispose(): Promise<void>
}>
type Invoke = (command: string, args: Record<string, unknown>) => Promise<unknown>
type Listen = (event: string, handler: (payload: unknown) => void) => Promise<() => void>
export type NativeTerminationPortDependencies = Readonly<{
  invokeCommand?: Invoke
  listenEvent?: Listen
  windowLabel?: string
  bridgeId?: string
}>

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
function requireSuccess(value: unknown) {
  if (!record(value) || value.status !== 'success') throw new Error('Invalid native termination response.')
}

export async function createNativeTerminationPort(
  onRequest: (kind: NativeTerminationKind) => void,
  dependencies: NativeTerminationPortDependencies = {},
): Promise<NativeTerminationPort> {
  const windowLabel = dependencies.windowLabel ?? getCurrentWindow().label
  const bridgeId = dependencies.bridgeId ?? crypto.randomUUID()
  if (windowLabel !== 'main' || !bridgeId || bridgeId.length > 128 || bridgeId.includes('\0')) {
    throw new Error('Invalid native termination identity.')
  }
  const invokeCommand = dependencies.invokeCommand ?? invoke
  const listenEvent = dependencies.listenEvent ?? ((name, handler) => listen<unknown>(name, (event) => handler(event.payload)))
  let disposed = false
  let installed = false
  let lastSequence = 0
  const unlisten = await listenEvent(NATIVE_TERMINATION_EVENT, (payload) => {
    if (disposed || !installed || !record(payload) || payload.bridgeId !== bridgeId || payload.windowLabel !== windowLabel ||
      !Number.isSafeInteger(payload.sequence) || (payload.sequence as number) <= lastSequence ||
      (payload.kind !== 'close-window' && payload.kind !== 'quit')) return
    lastSequence = payload.sequence as number
    onRequest(payload.kind)
  })
  try {
    requireSuccess(await invokeCommand('install_native_termination', { bridgeId }))
    installed = true
  } catch (error) {
    unlisten()
    throw error
  }
  return Object.freeze({
    async commit(kind) {
      if (disposed) throw new Error('The native termination bridge is disposed.')
      requireSuccess(await invokeCommand('commit_native_termination', { request: { bridgeId, kind } }))
    },
    async dispose() {
      if (disposed) return
      disposed = true
      unlisten()
      requireSuccess(await invokeCommand('dispose_native_termination', { bridgeId }))
    },
  })
}
