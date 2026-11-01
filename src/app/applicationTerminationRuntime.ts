import type { ApplicationCommandDispatchResult } from '../lifecycle/applicationCommandTypes.ts'
import type { ApplicationLifecycleCompositionRoot } from '../lifecycle/applicationLifecycleCompositionRoot.ts'
import type { ApplicationTerminationCapabilities } from '../lifecycle/lifecycleCommandCapabilities.ts'
import { hasApplicationModal } from '../editor/applicationModalState.ts'
import {
  createNativeTerminationPort, isNativeTerminationAvailable, type NativeTerminationPort,
} from '../tauri/nativeTermination.ts'
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
) {
  const modalActive = dependencies.modalActive ?? hasApplicationModal
  function diagnostic(error: unknown) {
    try { (dependencies.onDiagnostic ?? console.error)(error) } catch { /* Diagnostics cannot break close protection. */ }
  }
  let port: NativeTerminationPort | null = null
  let startPromise: Promise<void> | null = null
  let feedback: NativeTerminationFeedback | null = null
  let handoffStarted = false
  let nativeDispatchPending = false
  let disposed = false

  const current = () => !disposed && port !== null && feedback !== null && !handoffStarted
  function refresh() { if (!disposed) getRoot().refreshCommandCapabilities() }

  async function onRequest(kind: NativeTerminationKind) {
    if (disposed || nativeDispatchPending || !feedback) return
    nativeDispatchPending = true
    try {
      const result = await getRoot().dispatch(kind === 'quit' ? 'application.quit' : 'application.close-window')
      feedback?.(result)
    } catch (error) { diagnostic(error) }
    finally { nativeDispatchPending = false }
  }

  function start(): Promise<void> {
    if (startPromise) return startPromise
    startPromise = (async () => {
      if (!(dependencies.nativeAvailable ?? isNativeTerminationAvailable)()) return
      try {
        const created = await (dependencies.createPort ?? createNativeTerminationPort)((kind) => { void onRequest(kind) })
        if (disposed) { await created.dispose(); return }
        port = created
        refresh()
      } catch (error) { diagnostic(error) }
    })()
    return startPromise
  }

  return Object.freeze({
    capabilities(): ApplicationTerminationCapabilities {
      const state = current() && !modalActive() ? 'available' : 'unavailable'
      return Object.freeze({ closeWindow: state, quit: state })
    },
    handoff(): NativeTerminationHandoff | null {
      const activePort = port
      if (!current() || !activePort) return null
      return Object.freeze({
        isCurrent: () => current() && port === activePort,
        prepare: dependencies.prepareInteraction ?? prepareNativeTerminationInteraction,
        async commit(kind) {
          if (!current() || port !== activePort) throw new Error('The native termination connection changed.')
          handoffStarted = true
          refresh()
          try { await activePort.commit(kind) }
          catch (error) { handoffStarted = false; refresh(); throw error }
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
    async dispose() {
      if (disposed) return
      disposed = true
      feedback = null
      const activePort = port
      port = null
      try { await activePort?.dispose() } catch (error) { diagnostic(error) }
    },
  })
}
