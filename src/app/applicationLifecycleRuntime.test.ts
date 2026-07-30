import assert from 'node:assert/strict'
import test from 'node:test'
import type {
  ApplicationLifecycleCompositionRoot,
  ApplicationLifecycleCompositionRootOptions,
} from '../lifecycle/applicationLifecycleCompositionRoot.ts'
import {
  createApplicationLifecycleRuntime,
} from './applicationLifecycleRuntime.ts'

function fakeRoot(onDispose: () => void): ApplicationLifecycleCompositionRoot {
  return {
    getLifecycleState: () => ({ activeSession: null, visibleWorkspace: 'home' }),
    getStateSnapshot: () => ({
      generation: 0,
      state: { activeSession: null, visibleWorkspace: 'home' },
    }),
    getBusyState: () => ({ generation: 0, occupiedScopes: [] }),
    getLifecycleCommandCapabilities: () => ({} as never),
    getSnapshot: () => ({} as never),
    dispatch: async () => ({ disposition: 'not-executed', reason: 'unknown-command' }),
    synchronizeCurrentProject: () => 'no-op',
    subscribe: () => () => {},
    listRegisteredCommandIds: () => [],
    dispose: onDispose,
  }
}

test('one application runtime creates one root, dependency updates reuse it, and disposal is once', () => {
  let createCount = 0
  let disposeCount = 0
  let capturedOptions: ApplicationLifecycleCompositionRootOptions | undefined
  const runtime = createApplicationLifecycleRuntime({
    createRoot(options) {
      createCount += 1
      capturedOptions = options
      return fakeRoot(() => disposeCount += 1)
    },
  })
  const root = runtime.root

  runtime.updateProjectOpenDependencies({
    stageCandidate: async () => ({ status: 'cancelled', reason: 'first' }),
    prepareEditorAggregateApply: () => {
      throw new Error('not reached')
    },
  })
  runtime.updateProjectOpenDependencies({
    stageCandidate: async () => ({ status: 'cancelled', reason: 'second' }),
    prepareEditorAggregateApply: () => {
      throw new Error('not reached')
    },
  })

  assert.equal(createCount, 1)
  assert.equal(runtime.root, root)
  assert.equal(capturedOptions?.ports?.openProject?.availability, 'implemented')
  assert.equal(capturedOptions?.ports?.newDisc?.availability, 'implemented')
  assert.equal(capturedOptions?.ports?.newCase?.availability, 'implemented')
  runtime.dispose()
  runtime.dispose()
  assert.equal(disposeCount, 1)
  assert.throws(
    () => runtime.updateProjectOpenDependencies({
      stageCandidate: async () => ({ status: 'cancelled', reason: 'late' }),
      prepareEditorAggregateApply: () => {
        throw new Error('not reached')
      },
    }),
    /disposed/,
  )
})

test('Open reads current dependency-ref values rather than first-render closures', async () => {
  const calls: string[] = []
  const runtime = createApplicationLifecycleRuntime()
  runtime.updateProjectOpenDependencies({
    stageCandidate: async () => {
      calls.push('first')
      return { status: 'cancelled', reason: 'first-render' }
    },
    prepareEditorAggregateApply: () => {
      throw new Error('not reached')
    },
  })
  runtime.updateProjectOpenDependencies({
    stageCandidate: async () => {
      calls.push('current')
      return { status: 'cancelled', reason: 'current-render' }
    },
    prepareEditorAggregateApply: () => {
      throw new Error('not reached')
    },
  })

  const result = await runtime.root.dispatch('project.open')
  assert.equal(result.disposition, 'executed')
  if (result.disposition === 'executed') {
    assert.deepEqual(result.result, {
      status: 'cancelled',
      reason: 'current-render',
    })
  }
  assert.deepEqual(calls, ['current'])
  runtime.dispose()
})

test('separate application runtimes isolate the production New and Open owners', async () => {
  const first = createApplicationLifecycleRuntime()
  const second = createApplicationLifecycleRuntime()
  for (const [runtime, reason] of [
    [first, 'first'],
    [second, 'second'],
  ] as const) {
    runtime.updateProjectOpenDependencies({
      stageCandidate: async () => ({ status: 'cancelled', reason }),
      prepareEditorAggregateApply: () => {
        throw new Error('not reached')
      },
    })
  }

  assert.notEqual(first.root, second.root)
  const capabilities = first.root.getLifecycleCommandCapabilities()
  assert.equal(capabilities['project.open'].canExecute, true)
  assert.equal(capabilities['project.new-disc'].canExecute, true)
  assert.equal(capabilities['project.new-case'].canExecute, true)
  for (const id of first.root.listRegisteredCommandIds()) {
    if (!['project.open', 'project.new-disc', 'project.new-case'].includes(id)) {
      assert.equal(capabilities[id].canExecute, false, id)
    }
  }

  first.dispose()
  const result = await second.root.dispatch('project.open')
  assert.equal(result.disposition, 'executed')
  if (result.disposition === 'executed') {
    assert.equal(result.result.status, 'cancelled')
    if (result.result.status === 'cancelled') {
      assert.equal(result.result.reason, 'second')
    }
  }
  second.dispose()
})

test('repeated Open activation cannot enter two dialogs and releases scopes after cancellation', async () => {
  let releaseStage: (() => void) | undefined
  const gate = new Promise<void>((resolve) => {
    releaseStage = resolve
  })
  let stageCount = 0
  const runtime = createApplicationLifecycleRuntime()
  runtime.updateProjectOpenDependencies({
    stageCandidate: async () => {
      stageCount += 1
      await gate
      return { status: 'cancelled', reason: 'file-dialog-dismissed' }
    },
    prepareEditorAggregateApply: () => {
      throw new Error('not reached')
    },
  })

  const first = runtime.root.dispatch('project.open')
  const repeated = await runtime.root.dispatch('project.open')
  assert.equal(repeated.disposition, 'not-executed')
  assert.equal(stageCount, 1)
  releaseStage?.()
  await first
  assert.deepEqual(runtime.root.getBusyState().occupiedScopes, [])
  runtime.dispose()
})
