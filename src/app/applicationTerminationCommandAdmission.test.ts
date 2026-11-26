import assert from 'node:assert/strict'
import test from 'node:test'
import { setImmediate } from 'node:timers/promises'
import { createApplicationLifecycleRuntime } from './applicationLifecycleRuntime.ts'
import { createApplicationLifecycleCompositionRoot } from '../lifecycle/applicationLifecycleCompositionRoot.ts'
import { createLoadedProjectSession } from '../lifecycle/projectSession.ts'
import { createBlankJewelCaseSavedProject } from '../project/caseInsertProjectAdapters.ts'
import { NativeTerminationRejectedError } from './applicationTerminationFailure.ts'

for (const outcome of ['success', 'uncertain', 'rejected'] as const) {
  for (const command of ['application.close-window', 'application.quit'] as const) {
    test(`${command} ${outcome} retains or restores every semantic command admission`, async () => {
      let opens = 0
      const runtime = createApplicationLifecycleRuntime({
        createRoot: options => createApplicationLifecycleCompositionRoot({ ...options,
          initialState: createLoadedProjectSession({ sessionId: 'command-gate',
            project: createBlankJewelCaseSavedProject(), currentPath: 'case.sbls',
            persistenceFormat: 'sbls-package-v1' }),
        }),
        nativeTermination: {
          nativeAvailable: () => true, modalActive: () => false,
          prepareInteraction: () => () => {},
          createPort: async () => ({
            async commit() {
              if (outcome === 'uncertain') throw new Error('IPC response lost')
              if (outcome === 'rejected') throw new NativeTerminationRejectedError()
            },
            dispose: async () => {},
          }),
        },
      })
      runtime.updateProjectOpenDependencies({
        stageCandidate: async () => { opens++; return { status: 'cancelled', reason: 'file-dialog-dismissed' } },
        prepareEditorAggregateApply: () => { throw new Error('no candidate') },
      })
      runtime.connectNativeTerminationIngress(() => {})
      await setImmediate()
      try {
        const before = runtime.root.getLifecycleState()
        await runtime.root.dispatch(command)
        const capabilities = runtime.root.getApplicationCommandCapabilities()
        if (outcome === 'rejected') {
          assert.equal(capabilities['project.open'].canExecute, true)
          assert.equal((await runtime.root.dispatch('project.open')).disposition, 'executed')
          assert.equal(opens, 1)
        } else {
          // The native menu is outside inert DOM; all semantic ingress must
          // remain disabled even after the termination dispatch releases busy.
          for (const id of runtime.root.listRegisteredCommandIds()) {
            assert.equal(capabilities[id].canExecute, false, `${id} capability reopened`)
            const result = await runtime.root.dispatch(id)
            assert.equal(result.disposition, 'not-executed', `${id} dispatched during native handoff`)
            if (result.disposition === 'not-executed') assert.equal(result.reason, 'disabled')
          }
          assert.equal(opens, 0)
          assert.equal(runtime.root.getLifecycleState(), before)
        }
      } finally { await runtime.dispose() }
    })
  }
}
