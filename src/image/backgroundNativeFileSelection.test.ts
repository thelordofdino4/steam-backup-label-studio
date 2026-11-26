import assert from 'node:assert/strict'
import test from 'node:test'
import { selectNativeBackgroundFile } from './backgroundNativeFileSelection.ts'
import { createProjectAsyncWork } from '../lifecycle/projectAsyncWork.ts'
import { createApplicationLifecycleStateStore } from '../lifecycle/applicationLifecycleStateStore.ts'
import { createNewProjectSession, returnProjectSessionHome } from '../lifecycle/projectSession.ts'
import { createBlankDiscSavedProject } from '../project/blankDiscProject.ts'

function fixture() {
  const owner = createApplicationLifecycleStateStore({ initialState: createNewProjectSession({
    sessionId: 'picker-project',
    project: createBlankDiscSavedProject(),
  }) })
  const work = createProjectAsyncWork(owner.getSnapshot)
  return { owner, work }
}

const selected = new File([new Uint8Array([1])], 'fixture.png', { type: 'image/png' })
const unexpected = () => assert.fail('unexpected callback')

test('Cancel and read errors preserve any earlier still-current background import', async () => {
  const { work } = fixture()
  const prior = work.begin('background-artwork')
  await selectNativeBackgroundFile(work, async () => null, unexpected, unexpected)
  assert.equal(work.isCurrent(prior), true)
  const failure = Error('read failed')
  const reports: unknown[] = []
  await selectNativeBackgroundFile(work, async () => { throw failure }, unexpected, e => reports.push(e))
  assert.deepEqual(reports, [failure])
  assert.equal(work.isCurrent(prior), true)
})

test('A deliberate successful selection can start the usual import while still on the same Disc', async () => {
  const { work } = fixture()
  const prior = work.begin('background-artwork')
  const transferred: File[] = []
  await selectNativeBackgroundFile(work, async () => selected, file => {
    assert.equal(work.isCurrent(prior), true, 'opening the picker alone did not supersede')
    work.begin('background-artwork')
    transferred.push(file)
  }, unexpected)
  assert.deepEqual(transferred, [selected])
  assert.equal(work.isCurrent(prior), false, 'the accepted selection starts the normal latest import')
})

test('Returning Home while either picker result is pending drops selection and failure feedback', async () => {
  for (const shouldFail of [false,true]) {
    const { owner, work } = fixture()
    const pending = Promise.withResolvers<File>()
    const outcome = selectNativeBackgroundFile(work, () => pending.promise, unexpected, unexpected)
    assert.equal(owner.commitTransition(owner.getSnapshot().generation, returnProjectSessionHome).status, 'committed')
    if (shouldFail) pending.reject(Error('read failed'))
    else pending.resolve(selected)
    await outcome
  }
})
