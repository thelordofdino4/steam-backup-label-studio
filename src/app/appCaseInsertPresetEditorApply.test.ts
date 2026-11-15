import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import {
  createNewProjectSession,
} from '../lifecycle/projectSession.ts'
import {
  createBlankDiscSavedProject,
} from '../project/blankDiscProject.ts'
import {
  createBlankJewelCaseSavedProject,
} from '../project/caseInsertProjectAdapters.ts'
import type { ProjectJewelCaseState } from '../project/projectTypes.ts'
import {
  createApplicationCaseInsertPresetEditorApplyPort,
} from './appCaseInsertPresetEditorApply.ts'

test('committed Case installation applies the exact lifecycle aggregate in one batch', () => {
  const state = createNewProjectSession({
    sessionId: 'case-preset-editor-apply',
    project: createBlankJewelCaseSavedProject('Committed Case'),
  })
  let batchCount = 0
  const events: string[] = []
  let applied: ProjectJewelCaseState | null = null
  const port = createApplicationCaseInsertPresetEditorApplyPort({
    batchReactUpdates(apply) {
      batchCount += 1
      events.push('batch:start')
      apply()
      events.push('batch:end')
    },
    setProjectJewelCase(project) {
      events.push('editor:set')
      applied = project
    },
  })
  const result = port.commitLifecycleAndApply(() => {
    events.push('lifecycle:commit')
    return {
      status: 'committed',
      snapshot: { generation: 1, state },
    }
  })

  assert.equal(result.status, 'committed')
  assert.equal(batchCount, 1)
  assert.deepEqual(events, [
    'batch:start',
    'lifecycle:commit',
    'editor:set',
    'batch:end',
  ])
  assert.ok(state.activeSession?.kind === 'caseInsert')
  if (state.activeSession?.kind === 'caseInsert') {
    assert.equal(applied, state.activeSession.project.caseInsert)
  }
})

test('production App wires the Case preset lifecycle/editor adapter', () => {
  const appSource = readFileSync(
    fileURLToPath(new URL('./App.tsx', import.meta.url)),
    'utf8',
  )

  assert.match(
    appSource,
    /caseInsertPresetEditorApply:\s*createApplicationCaseInsertPresetEditorApplyPort\(\{/,
  )
  assert.match(
    appSource,
    /batchReactUpdates:\s*\(apply\) => unstable_batchedUpdates\(apply\)/,
  )
  assert.match(appSource, /setProjectJewelCase,/)
})

test('stale and no-op lifecycle results never modify the Case editor', () => {
  const state = createNewProjectSession({
    sessionId: 'case-preset-editor-no-op',
    project: createBlankJewelCaseSavedProject('Unchanged Case'),
  })
  let applyCount = 0
  const port = createApplicationCaseInsertPresetEditorApplyPort({
    batchReactUpdates: (apply) => apply(),
    setProjectJewelCase: () => applyCount += 1,
  })

  for (const status of ['stale', 'no-op'] as const) {
    assert.equal(port.commitLifecycleAndApply(() => ({
      status,
      snapshot: { generation: 0, state },
    })).status, status)
  }
  assert.equal(applyCount, 0)
})

test('a committed non-Case session fails closed instead of replacing the Case editor', () => {
  const state = createNewProjectSession({
    sessionId: 'disc-not-case-preset-editor-apply',
    project: createBlankDiscSavedProject(),
  })
  let applyCount = 0
  const port = createApplicationCaseInsertPresetEditorApplyPort({
    batchReactUpdates: (apply) => apply(),
    setProjectJewelCase: () => applyCount += 1,
  })

  assert.throws(() => port.commitLifecycleAndApply(() => ({
    status: 'committed',
    snapshot: { generation: 1, state },
  })), /did not produce a Case session/)
  assert.equal(applyCount, 0)
})

test('the editor adapter rejects an asynchronous batch implementation', () => {
  const port = createApplicationCaseInsertPresetEditorApplyPort({
    batchReactUpdates: () => {},
    setProjectJewelCase: () => {},
  })

  assert.throws(
    () => port.commitLifecycleAndApply(() => {
      throw new Error('must not run')
    }),
    /did not run synchronously/,
  )
})
