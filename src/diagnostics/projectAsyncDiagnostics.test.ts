import assert from 'node:assert/strict'
import test from 'node:test'
import { createApplicationCommandDiagnostics } from './applicationCommandDiagnostics.ts'
import { createProjectAsyncWork, type ProjectAsyncObserver } from '../lifecycle/projectAsyncWork.ts'
import { createApplicationLifecycleStateStore } from '../lifecycle/applicationLifecycleStateStore.ts'
import { createNewProjectSession, returnProjectSessionHome } from '../lifecycle/projectSession.ts'
import { createBlankDiscSavedProject } from '../project/blankDiscProject.ts'
import { imageImportFailure, ImageImportError } from '../image/imageImportFailure.ts'
import { ImportedImagePolicyError } from '../image/importedImagePolicy.ts'
import { discoveryOutcome } from '../steam/discoveryFailure.ts'

function fixture(observer?: ProjectAsyncObserver) {
  let time = 10
  const diagnostics = createApplicationCommandDiagnostics({ now: () => time })
  const store = createApplicationLifecycleStateStore({ initialState: createNewProjectSession({
    sessionId: 'private-session', project: createBlankDiscSavedProject(),
  }) })
  const work = createProjectAsyncWork(store.getSnapshot, observer ?? diagnostics.observeProjectAsync)
  store.subscribe(work.observeLifecycle)
  return { diagnostics, store, work, tick: () => { time += 25 } }
}

test('image validation keeps safe codec provenance and timing without retaining paths, source IDs or bytes', () => {
  const { work, diagnostics, tick } = fixture()
  const request = work.begin('image:private-slot-id')
  tick()
  const cause = { code: 'project.package.asset-type-invalid', stage: 'asset-validation', message: 'private-path', data: 'private-bytes' }
  const error = new ImportedImagePolicyError('Convert to PNG.', cause)
  let message = ''
  assert.equal(work.fail(request, imageImportFailure(error), failure => { message = failure.userMessage }), true)
  assert.equal(message, 'Convert to PNG.')
  const record = diagnostics.snapshot().records[0]
  assert.equal(record.workflowId, 'image.import')
  assert.equal(record.status, 'failure')
  assert.equal(record.failureCode, 'image.validation-failed')
  assert.equal(record.causeCode, cause.code)
  assert.equal(record.stage, 'asset-validation')
  assert.equal(record.elapsedMs, 25)
  assert.doesNotMatch(diagnostics.toJson(), /private|Convert|data:|sessionId|lane/)
  assert.equal(error.cause, cause)
})

for (const reason of ['newer', 'home', 'invalidate', 'dispose', 'competing-commit'] as const) {
  test(`${reason} cancels timing and suppresses a stale image failure`, () => {
    const { work, store, diagnostics, tick } = fixture()
    const request = work.begin('background-artwork')
    tick()
    if (reason === 'newer') work.begin('background-artwork')
    if (reason === 'home') store.commitTransition(store.getSnapshot().generation, returnProjectSessionHome)
    if (reason === 'invalidate') work.invalidateAll()
    if (reason === 'dispose') work.dispose()
    if (reason === 'competing-commit') work.commit(work.begin('title-artwork'), () => {})
    assert.equal(diagnostics.snapshot().records[0].status, 'cancelled')
    assert.equal(work.fail(request, imageImportFailure(Error('private')), () => { assert.fail('stale feedback') }), false)
    tick()
    assert.equal(diagnostics.snapshot().records[0].elapsedMs, 25)
  })
}

test('throwing observers cannot change mutation or failure feedback authority', () => {
  for (const observer of [() => { throw Error('private') }, () => ({ stage() { throw Error('private') }, complete() { throw Error('private') } })]) {
    const { work } = fixture(observer)
    let commits = 0
    assert.equal(work.commit(work.begin('image:test'), () => { commits++ }), true)
    const request = work.begin('image:test')
    assert.equal(work.fail(request, imageImportFailure(null), () => { commits++ }), true)
    assert.equal(work.commit(request, () => { commits++ }), false)
    assert.equal(commits, 2)
  }
})

test('synchronous owner failure remains failure after its one permitted feedback completion', () => {
  const { work, diagnostics } = fixture()
  const request = work.begin('image:test')
  const original = Error('private-apply')
  assert.throws(() => work.commit(request, () => { throw original }), error => error === original)
  assert.equal(work.fail(request, imageImportFailure(original), () => {}), true)
  assert.equal(work.fail(request, imageImportFailure(original), () => {}), false)
  assert.equal(diagnostics.snapshot().records[0].failureCode, 'project.async-apply-failed')
  assert.equal(diagnostics.snapshot().records[0].stage, 'apply')
})

test('usable discovery candidates survive a partial provider failure without recording full success', () => {
  const { work, diagnostics } = fixture()
  const image = work.begin('image:test')
  const discovery = work.begin('logo-discovery:private-key')
  let candidates = 0
  work.publish(discovery, () => { candidates = 2 }, discoveryOutcome([{ status: 'searched' }, { status: 'error' }]))
  assert.equal(candidates, 2)
  assert.equal(work.isCurrent(image), true)
  assert.equal(diagnostics.snapshot().records[1].failureCode, 'discovery.provider-failed')
  assert.doesNotMatch(diagnostics.toJson(), /private/)
  assert.equal(discoveryOutcome([{ status: 'unavailable' }]).status, 'success')
})

test('derived reconciliation and already-observed Steam requests do not duplicate records', () => {
  const { work, diagnostics } = fixture()
  work.begin('steam-game')
  work.begin('image:case-branding-reconciliation')
  assert.deepEqual(diagnostics.snapshot().records, [])
  assert.equal(imageImportFailure(new ImageImportError('image.decode-failed')).code, 'image.decode-failed')
  assert.doesNotMatch(imageImportFailure(Error('private')).userMessage, /private/)
})
