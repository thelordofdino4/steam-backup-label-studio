import assert from 'node:assert/strict'
import test from 'node:test'
import { setImmediate } from 'node:timers/promises'
import { createApplicationTerminationRuntime } from './applicationTerminationRuntime.ts'
import { createNativeTerminationPort, NativeTerminationRejectedError, type NativeTerminationPort } from '../tauri/nativeTermination.ts'
import { createApplicationLifecycleRuntime } from './applicationLifecycleRuntime.ts'
import { createApplicationLifecycleCompositionRoot } from '../lifecycle/applicationLifecycleCompositionRoot.ts'
import { createEmptyApplicationLifecycleState, createLoadedProjectSession, createNewProjectSession, type ApplicationLifecycleState } from '../lifecycle/projectSession.ts'
import { createBlankJewelCaseSavedProject } from '../project/caseInsertProjectAdapters.ts'
import { createBlankDiscSavedProject } from '../project/blankDiscProject.ts'
import type { ProjectReplacementDecision } from './appProjectReplacementGuard.ts'

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => { resolve = done })
  return { promise, resolve }
}
async function harness(state: ApplicationLifecycleState, decision: ProjectReplacementDecision = 'discard', uncertainFailure = false) {
  const entered = deferred<void>(), release = deferred<void>()
  let prepares = 0, commits = 0, prompts = 0, restores = 0
  const runtime = createApplicationLifecycleRuntime({
    createRoot: (configuration) => createApplicationLifecycleCompositionRoot({ ...configuration, initialState: state }),
    nativeTermination: {
      nativeAvailable: () => true,
      modalActive: () => false,
      prepareInteraction: () => { prepares++; return () => { restores++ } },
      createPort: async () => ({
        commit: async () => { commits++; entered.resolve(); await release.promise; throw uncertainFailure ? new Error('uncertain native transport failure') : new NativeTerminationRejectedError() },
        dispose: async () => {},
      }),
    },
  })
  runtime.updateProjectReplacementDependencies({ promptForReplacementDecision: async () => { prompts++; return decision } })
  runtime.connectNativeTerminationIngress(() => {})
  await setImmediate()
  return { runtime, entered, release, prepares: () => prepares, commits: () => commits, prompts: () => prompts, restores: () => restores }
}
function clean() {
  return createLoadedProjectSession({ sessionId: 'ownership', project: createBlankDiscSavedProject(), currentPath: 'saved.sbls', persistenceFormat: 'sbls-package-v1' })
}

test('Close final handoff retires old import authority while native commit is pending', async () => {
  const h = await harness(clean())
  const work = h.runtime.projectAsyncWork
  const old = work.begin('background-artwork')
  const pending = h.runtime.root.dispatch('application.close-window')
  await h.entered.promise
  try {
    assert.equal(work.isCurrent(old), false, 'old import must lose authority before native commit')
  } finally {
    h.release.resolve()
    await pending
    h.runtime.dispose()
  }
})

for (const command of ['application.close-window', 'application.quit'] as const) {
  for (const mode of ['clean', 'dirty', 'empty'] as const) {
    test(`${command}: ${mode} final barrier denies reentrant and pending work permanently after native failure`, async () => {
      const state = mode === 'empty' ? createEmptyApplicationLifecycleState() : mode === 'dirty'
        ? createNewProjectSession({ sessionId: 'ownership', project: createBlankDiscSavedProject() }) : clean()
      const h = await harness(state)
      const work = h.runtime.projectAsyncWork
      let writes = 0
      const failed = work.begin('image:failed-owner')
      if (mode !== 'empty') assert.throws(() => work.commit(failed, () => { throw new Error('owner failed') }), /owner failed/)
      const oldImport = work.begin('background-artwork')
      const oldProposal = work.begin('artwork-discovery')
      const oldContinuation = work.captureSessionContinuation()
      let observed = false
      let reentrantRequest: ReturnType<typeof work.begin> | undefined
      let reentrantContinuation: ReturnType<typeof work.captureSessionContinuation> | undefined
      let reentrantCurrent: boolean | undefined
      let reentrantContinuationCurrent: boolean | undefined
      const unsubscribe = work.subscribe(() => {
        if (observed) return
        observed = true
        reentrantRequest = work.begin('title-artwork')
        reentrantContinuation = work.captureSessionContinuation()
        reentrantCurrent = work.isCurrent(reentrantRequest)
        reentrantContinuationCurrent = work.isSessionContinuationCurrent(reentrantContinuation)
      })
      const pending = h.runtime.root.dispatch(command)
      await h.entered.promise
      // Capture the complete boundary before asserting, so a failed oracle still
      // releases the deferred transport and cannot contaminate another test.
      const observedBeforeNativeCommit = observed
      const during = work.begin('steam-metadata')
      const duringContinuation = work.captureSessionContinuation()
      const atHandoff = {
        observed: observedBeforeNativeCommit, reentrantCurrent, reentrantContinuationCurrent,
        oldImport: work.commit(oldImport, () => { writes++ }),
        oldProposal: work.publish(oldProposal, () => { writes++ }),
        failedFeedback: work.publish(failed, () => { writes++ }),
        oldContinuation: work.isSessionContinuationCurrent(oldContinuation),
        during: work.isCurrent(during),
        duringContinuation: work.isSessionContinuationCurrent(duringContinuation),
      }
      unsubscribe()
      h.release.resolve()
      const result = await pending
      try {
        assert.equal(result.disposition, 'executed')
        if (result.disposition === 'executed') assert.equal(result.result.status, 'failure')
        assert.equal(h.restores(), 1)
        assert.deepEqual(atHandoff, {
          observed: true, reentrantCurrent: false, reentrantContinuationCurrent: false,
          oldImport: false, oldProposal: false, failedFeedback: false,
          oldContinuation: false, during: false, duringContinuation: false,
        })
        assert.ok(reentrantRequest)
        assert.ok(reentrantContinuation)
        assert.equal(work.commit(reentrantRequest, () => { writes++ }), false)
        assert.equal(work.isSessionContinuationCurrent(reentrantContinuation), false)
        assert.equal(work.commit(oldImport, () => { writes++ }), false)
        assert.equal(work.publish(oldProposal, () => { writes++ }), false)
        assert.equal(work.publish(failed, () => { writes++ }), false)
        assert.equal(work.publish(during, () => { writes++ }), false)
        assert.equal(work.isSessionContinuationCurrent(oldContinuation), false)
        assert.equal(work.isSessionContinuationCurrent(duringContinuation), false)
        assert.equal(writes, 0)
        // No project has no mutation authority even after admission reopens.
        if (mode !== 'empty') {
          const fresh = work.begin('background-artwork')
          assert.equal(work.commit(fresh, () => { writes++ }), true)
          assert.equal(work.isSessionContinuationCurrent(work.captureSessionContinuation()), true)
          assert.equal(writes, 1)
        }
      } finally { h.runtime.dispose() }
    })
  }
  test(`${command}: Cancel preserves unrelated imports, proposals, failure feedback and continuations`, async () => {
    const h = await harness(createNewProjectSession({ sessionId: 'cancel', project: createBlankDiscSavedProject() }), 'cancel')
    const work = h.runtime.projectAsyncWork
    const failed = work.begin('image:failure')
    assert.throws(() => work.commit(failed, () => { throw new Error('owner failed') }), /owner failed/)
    const proposal = work.begin('artwork-discovery')
    const request = work.begin('background-artwork')
    const continuation = work.captureSessionContinuation()
    let writes = 0
    try {
      const result = await h.runtime.root.dispatch(command)
      assert.equal(result.disposition, 'executed')
      if (result.disposition === 'executed') assert.equal(result.result.status, 'declined')
      assert.equal(h.prepares(), 0)
      assert.equal(work.isSessionContinuationCurrent(continuation), true)
      assert.equal(work.publish(failed, () => { writes++ }), true)
      assert.equal(work.publish(proposal, () => { writes++ }), true)
      assert.equal(work.commit(request, () => { writes++ }), true)
      assert.equal(writes, 3)
    } finally { h.runtime.dispose() }
  })
}


test('termination runtime disposal waits for delayed installation and shares completion with concurrent callers', async () => {
  const install = deferred<NativeTerminationPort>(), cleanup = deferred<void>()
  const root = createApplicationLifecycleCompositionRoot()
  let disposals = 0
  const termination = createApplicationTerminationRuntime(() => root, {
    nativeAvailable: () => true, createPort: () => install.promise,
  })
  termination.connect(() => {})
  const first = termination.dispose(), second = termination.dispose()
  let settled = false
  void first.then(() => { settled = true })
  await setImmediate()
  const settledBeforeInstall = settled
  install.resolve({ commit: async () => {}, dispose: async () => { disposals++; await cleanup.promise } })
  await setImmediate()
  const settledBeforeCleanup = settled
  cleanup.resolve()
  await Promise.all([first, second])
  try {
    assert.equal(first, second, 'concurrent disposal must return the same completion promise')
    assert.equal(settledBeforeInstall, false)
    assert.equal(settledBeforeCleanup, false)
    assert.equal(disposals, 1)
    assert.equal(termination.handoff(), null)
  } finally { root.dispose() }
})

test('native port disposal shares its promise through synchronous reentrant unlisten and concurrent callers', async () => {
  const cleanup = deferred<void>()
  let reentrant: Promise<void> | undefined
  let unlistens = 0, disposals = 0
  const port = await createNativeTerminationPort(() => {}, {
    windowLabel: 'main', bridgeId: 'ownership-test',
    listenEvent: async () => () => { unlistens++; reentrant = port.dispose() },
    invokeCommand: async (command) => {
      if (command === 'dispose_native_termination') { disposals++; await cleanup.promise }
      return { status: 'success' }
    },
  })
  const first = port.dispose(), second = port.dispose()
  await setImmediate()
  let settled = false
  void second.then(() => { settled = true })
  await setImmediate()
  const settledBeforeCleanup = settled
  cleanup.resolve()
  await Promise.all([first, second, reentrant])
  assert.equal(first, second)
  assert.equal(first, reentrant)
  assert.equal(settledBeforeCleanup, false)
  assert.equal(unlistens, 1)
  assert.equal(disposals, 1)
})


function cleanCase() {
  return createLoadedProjectSession({ sessionId: 'case-ownership', project: createBlankJewelCaseSavedProject(), currentPath: 'case.sbls', persistenceFormat: 'sbls-package-v1' })
}
function advanceCase(runtime: ReturnType<typeof createApplicationLifecycleRuntime>) {
  const session = runtime.root.getLifecycleState().activeSession!
  const project = structuredClone(session.project)
  project.title = 'Finished continuous edit'
  if (project.game) project.game.manualTitle = 'Finished continuous edit'
  runtime.root.synchronizeCurrentProject({ sessionId: session.id, kind: session.kind, project })
}

for (const command of ['application.close-window', 'application.quit'] as const) {
  test(`${command}: finishing a Case edit precedes dirty guard and Cancel preserves fresh authority`, async () => {
    const h = await harness(cleanCase(), 'cancel')
    h.release.resolve()
    let finishes = 0
    h.runtime.updateCaseInsertContinuousEditPort({ finish: () => {
      finishes++
      advanceCase(h.runtime)
      return { status: 'success', value: undefined }
    } })
    try {
      const result = await h.runtime.root.dispatch(command)
      assert.equal(result.disposition, 'executed')
      if (result.disposition === 'executed') assert.equal(result.result.status, 'declined')
      assert.ok(finishes > 0)
      assert.equal(h.prompts(), 1)
      assert.equal(h.prepares(), 0)
      assert.equal(h.commits(), 0)
      assert.equal(h.runtime.root.getLifecycleState().activeSession?.project.title, 'Finished continuous edit')
      const work = h.runtime.projectAsyncWork
      assert.equal(work.commit(work.begin('background-artwork'), () => {}), true)
    } finally { await h.runtime.dispose() }
  })

  for (const boundary of ['before-guard', 'final-finish', 'stale-final'] as const) {
    test(`${command}: Case ${boundary} failure prevents native commit and permits fresh work`, async () => {
      const h = await harness(cleanCase())
      h.release.resolve()
      const work = h.runtime.projectAsyncWork
      const old = work.begin('background-artwork')
      const continuation = work.captureSessionContinuation()
      h.runtime.updateCaseInsertContinuousEditPort({ finish: () => {
        if (boundary === 'before-guard' || (boundary === 'final-finish' && h.prepares() > 0)) throw new Error('finish failed')
        if (boundary === 'stale-final' && h.prepares() > 0) advanceCase(h.runtime)
        return { status: 'success', value: undefined }
      } })
      try {
        const result = await h.runtime.root.dispatch(command)
        assert.equal(result.disposition, 'executed')
        if (result.disposition === 'executed') {
          assert.equal(result.result.status, 'failure')
          if (result.result.status === 'failure') assert.equal(result.result.error.code,
            boundary === 'stale-final' ? 'application.termination-stale-session' : 'case.continuous-edit-finish-failed')
        }
        assert.equal(h.commits(), 0)
        assert.equal(h.prompts(), 0)
        assert.equal(h.prepares(), boundary === 'before-guard' ? 0 : 1)
        assert.equal(work.isCurrent(old), boundary === 'before-guard')
        assert.equal(work.isSessionContinuationCurrent(continuation), boundary === 'before-guard')
        assert.equal(work.commit(work.begin('background-artwork'), () => {}), true)
      } finally { await h.runtime.dispose() }
    })
  }
}

for (const command of ['application.close-window', 'application.quit'] as const) {
  test(`${command}: guarded Save captures the finished Case edit before native handoff`, async () => {
    const h = await harness(cleanCase(), 'save')
    let finished = false
    let savedTitle: string | undefined
    h.runtime.updateCaseInsertContinuousEditPort({ finish: () => {
      if (!finished) { finished = true; advanceCase(h.runtime) }
      return { status: 'success', value: undefined }
    } })
    h.runtime.updateProjectSaveDependencies({
      saveDialog: async () => 'case.sbls',
      packageWrite: { encodeAndWrite: async (request) => {
        savedTitle = request.normalizedProject.title
        return { status: 'success' }
      } },
    })
    h.release.resolve()
    try {
      const result = await h.runtime.root.dispatch(command)
      assert.equal(result.disposition, 'executed')
      assert.equal(savedTitle, 'Finished continuous edit')
      assert.equal(h.prompts(), 1)
      assert.equal(h.commits(), 1)
      assert.equal(h.runtime.root.getLifecycleState().activeSession?.cleanBaseline?.exactSnapshot.title, savedTitle)
    } finally { await h.runtime.dispose() }
  })
}



test('uncertain native transport failure keeps admission closed and never restores interaction', async () => {
  const h = await harness(clean(), 'discard', true)
  const work = h.runtime.projectAsyncWork
  const old = work.begin('background-artwork')
  const oldContinuation = work.captureSessionContinuation()
  const pending = h.runtime.root.dispatch('application.quit')
  await h.entered.promise
  const during = work.begin('title-artwork')
  const duringContinuation = work.captureSessionContinuation()
  h.release.resolve()
  await pending
  try {
    assert.equal(h.restores(), 0)
    assert.equal(work.commit(old, () => {}), false)
    assert.equal(work.publish(during, () => {}), false)
    assert.equal(work.isSessionContinuationCurrent(oldContinuation), false)
    assert.equal(work.isSessionContinuationCurrent(duringContinuation), false)
    assert.equal(work.commit(work.begin('steam-game'), () => {}), false)
    assert.equal(work.isSessionContinuationCurrent(work.captureSessionContinuation()), false)
    assert.equal((await h.runtime.root.dispatch('application.close-window')).disposition, 'not-executed')
    assert.equal(h.commits(), 1)
  } finally { await h.runtime.dispose() }
})

test('lifecycle disposal shares completion with reentrant and concurrent disposal callers', async () => {
  const cleanup = deferred<void>()
  let reentrant: Promise<void> | undefined
  let disposals = 0
  const runtime = createApplicationLifecycleRuntime({ nativeTermination: {
    nativeAvailable: () => true,
    createPort: async () => ({
      commit: async () => {},
      dispose: async () => { disposals++; reentrant = runtime.dispose(); await cleanup.promise },
    }),
  } })
  runtime.connectNativeTerminationIngress(() => {})
  await setImmediate()
  const first = runtime.dispose(), second = runtime.dispose()
  await setImmediate()
  let settled = false
  void second.then(() => { settled = true })
  await setImmediate()
  const settledBeforeCleanup = settled
  cleanup.resolve()
  await Promise.all([first, second, reentrant])
  assert.equal(first, second)
  assert.equal(first, reentrant)
  assert.equal(settledBeforeCleanup, false)
  assert.equal(disposals, 1)
})

test('failed preparation retires its lease and stale restoration cannot reopen a newer handoff', async () => {
  const root = createApplicationLifecycleCompositionRoot()
  let fail = true, retired = 0, restored = 0
  const runtime = createApplicationTerminationRuntime(() => root, {
    nativeAvailable: () => true,
    modalActive: () => false,
    createPort: async () => ({ commit: async () => {}, dispose: async () => {} }),
    prepareInteraction: () => {
      if (fail) throw new Error('prepare failed')
      return () => { restored++ }
    },
  }, () => { retired++ })
  runtime.connect(() => {})
  await setImmediate()
  try {
    const failed = runtime.handoff()!
    assert.throws(failed.prepare, /prepare failed/)
    assert.equal(runtime.isHandoffPending(), false)
    assert.equal(failed.isCurrent(), false)
    await assert.rejects(failed.commit('quit'), NativeTerminationRejectedError)
    fail = false
    const first = runtime.handoff()!
    const restoreFirst = first.prepare()
    restoreFirst()
    assert.equal(first.isCurrent(), false)
    const second = runtime.handoff()!
    const restoreSecond = second.prepare()
    restoreFirst()
    assert.equal(runtime.isHandoffPending(), true)
    assert.equal(second.isCurrent(), true)
    restoreSecond()
    assert.equal(runtime.isHandoffPending(), false)
    assert.equal(restored, 2)
    assert.equal(retired, 3)
  } finally { await runtime.dispose(); root.dispose() }
})
