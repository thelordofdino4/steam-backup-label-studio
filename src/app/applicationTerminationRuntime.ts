import type { ApplicationCommandDispatchResult } from '../lifecycle/applicationCommandTypes.ts'
import type { ApplicationLifecycleCompositionRoot } from '../lifecycle/applicationLifecycleCompositionRoot.ts'
import type { ApplicationTerminationCapabilities } from '../lifecycle/lifecycleCommandCapabilities.ts'
import { hasApplicationModal } from '../editor/applicationModalState.ts'
import {
  createNativeTerminationPort, isNativeTerminationAvailable, NativeTerminationRejectedError,
  NativeTerminationOutcomeUncertainError, type NativeTerminationPort,
} from '../tauri/nativeTermination.ts'
import { onceAsyncCleanup } from '../utils/onceAsyncCleanup.ts'
import { createApplicationTerminationFailure, type ApplicationTerminationFailureCode } from './applicationTerminationFailure.ts'
import type { NativeTerminationHandoff, NativeTerminationKind } from './appNativeTerminationCommand.ts'
import { prepareNativeTerminationInteraction } from './nativeTerminationInteraction.ts'

export type NativeTerminationFeedback = (result: ApplicationCommandDispatchResult<unknown>) => void
export type ApplicationTerminationRuntimeDependencies = Readonly<{
  nativeAvailable?: () => boolean
  createPort?: (onRequest: (kind: NativeTerminationKind) => void) => Promise<NativeTerminationPort>
  modalActive?: () => boolean
  prepareInteraction?: () => () => void
  onDiagnostic?: (error: unknown) => void
}>

/** Application-scoped event adapter. The root/guard remain the only command and project owners. */
export function createApplicationTerminationRuntime(
  getRoot: () => ApplicationLifecycleCompositionRoot,
  dependencies: ApplicationTerminationRuntimeDependencies = {},
  retirePendingProjectWork: () => void = () => {},
) {
  const modalActive = dependencies.modalActive ?? hasApplicationModal
  function diagnostic(code: ApplicationTerminationFailureCode, cause: unknown) {
    const error = createApplicationTerminationFailure(code, cause)
    try {
      if (dependencies.onDiagnostic) dependencies.onDiagnostic(error)
      else console.error(error.code)
    } catch { /* Diagnostics cannot break close protection. */ }
  }
  let port: NativeTerminationPort | null = null
  let startPromise: Promise<void> | null = null
  let feedback: NativeTerminationFeedback | null = null
  type Lease = { status: 'captured' | 'prepared' | 'committing' | 'committed' | 'uncertain' | 'retired' }
  let activeLease: Lease | null = null
  let nativeDispatchPending = false
  let disposed = false

  const current = () => !disposed && port !== null && feedback !== null && activeLease === null
  function refresh() { if (!disposed) getRoot().refreshCommandCapabilities() }

  async function onRequest(kind: NativeTerminationKind) {
    if (disposed || nativeDispatchPending || !feedback) return
    nativeDispatchPending = true
    try {
      const result = await getRoot().dispatch(kind === 'quit' ? 'application.quit' : 'application.close-window')
      feedback?.(result)
    } catch (error) { diagnostic('application.termination-dispatch-failed', error) }
    finally { nativeDispatchPending = false }
  }

  function start(): Promise<void> {
    if (startPromise) return startPromise
    startPromise = (async () => {
      try {
        if (!(dependencies.nativeAvailable ?? isNativeTerminationAvailable)()) return
      } catch (error) { diagnostic('application.termination-availability-failed', error); return }
      try {
        const created = await (dependencies.createPort ?? createNativeTerminationPort)((kind) => { void onRequest(kind) })
        if (disposed) {
          try { await created.dispose() } catch (error) { diagnostic('application.termination-dispose-failed', error) }
          return
        }
        port = created
        refresh()
      } catch (error) { diagnostic('application.termination-install-failed', error) }
    })()
    return startPromise
  }

  const dispose = onceAsyncCleanup(async () => {
    disposed = true
    feedback = null
    const activePort = port
    port = null
    try { await activePort?.dispose() } catch (error) { diagnostic('application.termination-dispose-failed', error) }
    // A late installation disposes itself. Do not finish cleanup before it.
    await startPromise
  })

  return Object.freeze({
    isHandoffPending: () => disposed || activeLease !== null,
    capabilities(): ApplicationTerminationCapabilities {
      const state = current() && !modalActive() ? 'available' : 'unavailable'
      return Object.freeze({ closeWindow: state, quit: state })
    },
    handoff(): NativeTerminationHandoff | null {
      const activePort = port
      if (!current() || !activePort) return null
      const lease: Lease = { status: 'captured' }
      let restoreInteraction: (() => void) | null = null
      const isCurrent = () => !disposed && feedback !== null && port === activePort &&
        ((lease.status === 'captured' && activeLease === null) ||
          (lease.status === 'prepared' && activeLease === lease))
      function restore() {
        if (activeLease !== lease || lease.status !== 'prepared') return
        lease.status = 'retired'
        activeLease = null
        try { restoreInteraction?.() } finally { refresh() }
      }
      return Object.freeze({
        isCurrent,
        prepare() {
          if (!isCurrent() || lease.status !== 'captured') throw new Error('The native close preparation is stale.')
          // Block admission before notifying invalidation observers. Retiring
          // this lease never makes old or during-handoff requests current again.
          activeLease = lease
          lease.status = 'prepared'
          try {
            retirePendingProjectWork()
            restoreInteraction = (dependencies.prepareInteraction ?? prepareNativeTerminationInteraction)()
            refresh()
            return restore
          } catch (error) {
            restore()
            throw error
          }
        },
        async commit(kind) {
          if (!isCurrent() || lease.status !== 'prepared') throw new NativeTerminationRejectedError()
          lease.status = 'committing'
          refresh()
          try {
            await activePort.commit(kind)
            lease.status = 'committed'
          } catch (error) {
            if (error instanceof NativeTerminationRejectedError) {
              lease.status = 'prepared'
              throw error
            }
            // A lost IPC response does not prove the native close was not
            // queued. Never reopen editing while it may still be authorized.
            lease.status = 'uncertain'
            throw new NativeTerminationOutcomeUncertainError(error)
          }
        },
      })
    },
    connect(publishFeedback: NativeTerminationFeedback): () => void {
      if (disposed) throw new Error('The native termination runtime is disposed.')
      feedback = publishFeedback
      void start()
      refresh()
      return () => { if (feedback === publishFeedback) { feedback = null; refresh() } }
    },
    dispose,
  })
}
