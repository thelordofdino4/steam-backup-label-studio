import assert from 'node:assert/strict'
import test from 'node:test'
import { setImmediate } from 'node:timers/promises'
import { createApplicationLifecycleRuntime } from './applicationLifecycleRuntime.ts'
import { createApplicationLifecycleCompositionRoot } from '../lifecycle/applicationLifecycleCompositionRoot.ts'
import { createEmptyApplicationLifecycleState, createLoadedProjectSession, createNewProjectSession, selectIsActiveProjectDirty, type ApplicationLifecycleState } from '../lifecycle/projectSession.ts'
import { createBlankDiscSavedProject } from '../project/blankDiscProject.ts'
import { createBlankJewelCaseSavedProject } from '../project/caseInsertProjectAdapters.ts'
import type { SavedProject } from '../project/projectTypes.ts'
import type { ProjectReplacementDecision } from './appProjectReplacementGuard.ts'
import type { NativeTerminationKind } from './appNativeTerminationCommand.ts'
import type { ApplicationCommandDispatchResult } from '../lifecycle/applicationCommandTypes.ts'
import type { ApplicationProjectSaveRuntimeDependencies } from './appProjectSaveCommand.ts'

function blank(kind: 'disc' | 'caseInsert'): SavedProject {
  return kind === 'disc' ? createBlankDiscSavedProject() : createBlankJewelCaseSavedProject()
}
function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => { resolve = done })
  return { promise, resolve }
}
async function harness(options: {
  state?: ApplicationLifecycleState
  decisions?: ProjectReplacementDecision[]
  prompt?: () => Promise<ProjectReplacementDecision>
  prepare?: () => void
  commit?: () => Promise<void>
  save?: ApplicationProjectSaveRuntimeDependencies
  available?: boolean
} = {}) {
  let nativeRequest!: (kind: NativeTerminationKind) => void
  const commits: NativeTerminationKind[] = []
  const feedback: ApplicationCommandDispatchResult<unknown>[] = []
  let creates = 0, disposals = 0, prompts = 0, prepares = 0, restores = 0
  let modal = false
  const decisions = [...(options.decisions ?? [])]
  const runtime = createApplicationLifecycleRuntime({
    createRoot: (configuration) => createApplicationLifecycleCompositionRoot({ ...configuration, initialState: options.state ?? createEmptyApplicationLifecycleState() }),
    nativeTermination: {
      nativeAvailable: () => options.available ?? true,
      modalActive: () => modal,
      prepareInteraction: () => { prepares++; options.prepare?.(); return () => { restores++ } },
      createPort: async (onRequest) => {
        creates++
        nativeRequest = onRequest
        return { commit: async (kind) => { commits.push(kind); await options.commit?.() }, dispose: async () => { disposals++ } }
      },
    },
  })
  runtime.updateProjectReplacementDependencies({ promptForReplacementDecision: async () => { prompts++; return options.prompt ? options.prompt() : decisions.shift() ?? 'cancel' } })
  if (options.save) runtime.updateProjectSaveDependencies(options.save)
  const disconnect = runtime.connectNativeTerminationIngress((result) => { feedback.push(result) })
  await setImmediate()
  return { runtime, commits, feedback, disconnect, nativeRequest: (kind: NativeTerminationKind) => nativeRequest(kind),
    setModal(value: boolean) { modal = value; runtime.root.refreshCommandCapabilities() },
    counts: () => ({ creates, disposals, prompts, prepares, restores }) }
}
function status(result: ApplicationCommandDispatchResult<unknown>) {
  assert.equal(result.disposition, 'executed')
  if (result.disposition !== 'executed') throw new Error('Expected execution')
  return result.result.status
}
function edit(runtime: ReturnType<typeof createApplicationLifecycleRuntime>) {
  const session = runtime.root.getLifecycleState().activeSession!
  const project = structuredClone(session.project)
  project.title = 'Newer revision'
  if (project.game) project.game.manualTitle = 'Newer revision'
  runtime.root.synchronizeCurrentProject({ sessionId: session.id, kind: session.kind, project })
}

for (const kind of ['disc', 'caseInsert'] as const) {
  for (const command of ['application.close-window', 'application.quit'] as const) {
    test(`${command}: clean ${kind} closes without false warning and preserves session until native handoff`, async () => {
      const state = createLoadedProjectSession({ sessionId: 'clean', project: blank(kind), currentPath: 'saved.sbls', persistenceFormat: 'sbls-package-v1' })
      const h = await harness({ state })
      const before = h.runtime.root.getLifecycleState()
      assert.equal(status(await h.runtime.root.dispatch(command)), 'success')
      assert.deepEqual(h.commits, [command === 'application.quit' ? 'quit' : 'close-window'])
      assert.equal(h.counts().prompts, 0)
      assert.equal(h.runtime.root.getLifecycleState(), before)
      assert.equal((await h.runtime.root.dispatch(command)).disposition, 'not-executed')
      h.runtime.dispose()
    })
    test(`${command}: dirty ${kind} Cancel preserves content/path/baseline; Discard retries once`, async () => {
      const state = createNewProjectSession({ sessionId: 'dirty', project: blank(kind) })
      const h = await harness({ state, decisions: ['cancel', 'discard'] })
      const before = h.runtime.root.getLifecycleState()
      assert.equal(status(await h.runtime.root.dispatch(command)), 'declined')
      assert.equal(h.runtime.root.getLifecycleState(), before)
      assert.deepEqual(h.commits, [])
      assert.equal(h.counts().prepares, 0)
      assert.equal(status(await h.runtime.root.dispatch(command)), 'success')
      assert.equal(h.counts().prompts, 2)
      assert.equal(h.commits.length, 1)
      assert.equal(selectIsActiveProjectDirty(h.runtime.root.getLifecycleState()), true)
      h.runtime.dispose()
    })
  }
  test(`Save before ${kind} Quit uses the existing persistence owner and adopts clean baseline`, async () => {
    let writes = 0
    const h = await harness({ state: createNewProjectSession({ sessionId: 'save', project: blank(kind) }), decisions: ['save'],
      save: { saveDialog: async () => 'saved.sbls', packageWrite: { encodeAndWrite: async () => { writes++; return { status: 'success' } } } } })
    assert.equal(status(await h.runtime.root.dispatch('application.quit')), 'success')
    assert.equal(writes, 1)
    assert.equal(selectIsActiveProjectDirty(h.runtime.root.getLifecycleState()), false)
    assert.equal(h.runtime.root.getLifecycleState().activeSession?.currentPath, 'saved.sbls')
    assert.deepEqual(h.commits, ['quit'])
    h.runtime.dispose()
  })
  test(`${kind} Save cancellation/failure never reaches native termination`, async () => {
    for (const mode of ['cancel', 'failure'] as const) {
      const h = await harness({ state: createNewProjectSession({ sessionId: 'keep', project: blank(kind) }), decisions: ['save'],
        save: { saveDialog: async () => mode === 'cancel' ? null : 'saved.sbls', packageWrite: { encodeAndWrite: async () => { throw new Error('write failed') } } } })
      const before = h.runtime.root.getLifecycleState()
      assert.equal(status(await h.runtime.root.dispatch('application.close-window')), mode === 'cancel' ? 'cancelled' : 'failure')
      assert.equal(h.runtime.root.getLifecycleState(), before)
      assert.deepEqual(h.commits, [])
      assert.deepEqual(h.runtime.root.getBusyState().occupiedScopes, [])
      h.runtime.dispose()
    }
  })
  test(`${kind} Save of R while content advances to R+1 re-prompts and Cancel retains newer dirty content`, async () => {
    const writing = deferred<void>(), release = deferred<void>()
    const h = await harness({ state: createNewProjectSession({ sessionId: 'advance', project: blank(kind) }), decisions: ['save', 'cancel'],
      save: { saveDialog: async () => 'saved.sbls', packageWrite: { encodeAndWrite: async () => { writing.resolve(); await release.promise; return { status: 'success' } } } } })
    const pending = h.runtime.root.dispatch('application.quit')
    await writing.promise
    edit(h.runtime)
    release.resolve()
    assert.equal(status(await pending), 'declined')
    assert.equal(h.counts().prompts, 2)
    assert.equal(selectIsActiveProjectDirty(h.runtime.root.getLifecycleState()), true)
    assert.equal(h.runtime.root.getLifecycleState().activeSession?.project.title, 'Newer revision')
    assert.notEqual(h.runtime.root.getLifecycleState().activeSession?.cleanBaseline?.exactSnapshot.title, 'Newer revision')
    assert.deepEqual(h.commits, [])
    h.runtime.dispose()
  })
}

test('no project can close; disconnected/unsupported runtimes cannot authorize native actions', async () => {
  const h = await harness()
  assert.equal(status(await h.runtime.root.dispatch('application.close-window')), 'success')
  assert.equal(h.counts().prompts, 0)
  h.runtime.dispose()
  const unavailable = await harness({ available: false })
  assert.equal((await unavailable.runtime.root.dispatch('application.quit')).disposition, 'not-executed')
  assert.equal(unavailable.counts().creates, 0)
  unavailable.runtime.dispose()
})

test('native repeated Close/Quit and menu dispatch cannot create duplicate prompts; cancellation releases scopes', async () => {
  const decision = deferred<ProjectReplacementDecision>()
  const h = await harness({ state: createNewProjectSession({ sessionId: 'repeat', project: blank('disc') }), prompt: () => decision.promise })
  h.nativeRequest('close-window')
  h.nativeRequest('quit')
  await setImmediate()
  assert.equal(h.counts().prompts, 1)
  assert.equal((await h.runtime.root.dispatch('application.quit')).disposition, 'not-executed')
  decision.resolve('cancel')
  await setImmediate()
  assert.equal(h.feedback.length, 1)
  assert.equal(status(h.feedback[0]), 'declined')
  assert.deepEqual(h.runtime.root.getBusyState().occupiedScopes, [])
  h.runtime.dispose()
})

test('custom modal and an in-flight Open reject native termination without a second dialog', async () => {
  const h = await harness()
  h.setModal(true)
  h.nativeRequest('quit')
  await setImmediate()
  assert.equal(h.feedback[0].disposition, 'not-executed')
  h.setModal(false)
  const release = deferred<void>(), entered = deferred<void>()
  h.runtime.updateProjectOpenDependencies({ stageCandidate: async () => { entered.resolve(); await release.promise; return { status: 'cancelled', reason: 'file-dialog-dismissed' } }, prepareEditorAggregateApply: () => { throw new Error('unreachable') } })
  const opening = h.runtime.root.dispatch('project.open')
  await entered.promise
  h.nativeRequest('close-window')
  await setImmediate()
  assert.equal(h.feedback[1].disposition, 'not-executed')
  assert.equal(h.counts().prompts, 0)
  assert.deepEqual(h.commits, [])
  release.resolve()
  await opening
  h.runtime.dispose()
})

test('revision changed during final UI flush aborts handoff and restores interaction', async () => {
  const h = await harness({ state: createNewProjectSession({ sessionId: 'flush', project: blank('disc') }), decisions: ['discard'], prepare: () => advance() })
  const advance = () => edit(h.runtime)
  const result = await h.runtime.root.dispatch('application.quit')
  assert.equal(status(result), 'failure')
  if (result.disposition === 'executed' && result.result.status === 'failure') assert.equal(result.result.error.code, 'application.termination-stale-session')
  assert.equal(h.counts().restores, 1)
  assert.deepEqual(h.commits, [])
  h.runtime.dispose()
})

test('failed handoff restores interaction/capabilities and allows a later attempt', async () => {
  let fail = true
  const h = await harness({ commit: async () => { if (fail) throw new Error('native failure') } })
  assert.equal(status(await h.runtime.root.dispatch('application.close-window')), 'failure')
  assert.equal(h.counts().restores, 1)
  fail = false
  assert.equal(status(await h.runtime.root.dispatch('application.close-window')), 'success')
  assert.equal(h.counts().restores, 1)
  h.runtime.dispose()
})

test('StrictMode-like feedback reconnect reuses one native port and app disposal removes it once', async () => {
  const h = await harness()
  h.disconnect()
  const feedback: unknown[] = []
  h.runtime.connectNativeTerminationIngress((result) => feedback.push(result))
  await setImmediate()
  assert.equal(h.counts().creates, 1)
  h.nativeRequest('quit')
  await setImmediate()
  assert.equal(feedback.length, 1)
  assert.equal(h.feedback.length, 0)
  h.runtime.dispose()
  h.runtime.dispose()
  await setImmediate()
  h.nativeRequest('quit')
  assert.equal(h.counts().disposals, 1)
  assert.equal(feedback.length, 1)
})

for (const kind of ['disc', 'caseInsert'] as const) {
  test(`Home retains dirty ${kind} session under the same close guard`, async () => {
    const state = { ...createNewProjectSession({ sessionId: 'retained', project: blank(kind) }), visibleWorkspace: 'home' as const }
    const h = await harness({ state, decisions: ['cancel'] })
    const before = h.runtime.root.getLifecycleState()
    assert.equal(status(await h.runtime.root.dispatch('application.quit')), 'declined')
    assert.equal(h.runtime.root.getLifecycleState(), before)
    assert.deepEqual(h.commits, [])
    h.runtime.dispose()
  })
}

test('teardown during a dirty guard invalidates handoff even after Discard', async () => {
  const decision = deferred<ProjectReplacementDecision>()
  const h = await harness({ state: createNewProjectSession({ sessionId: 'teardown', project: blank('disc') }), prompt: () => decision.promise })
  const pending = h.runtime.root.dispatch('application.quit')
  await setImmediate()
  h.disconnect()
  decision.resolve('discard')
  assert.equal(status(await pending), 'failure')
  assert.equal(h.counts().prepares, 0)
  assert.deepEqual(h.commits, [])
  h.runtime.dispose()
})
