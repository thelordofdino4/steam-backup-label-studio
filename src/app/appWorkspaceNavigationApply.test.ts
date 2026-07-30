import assert from 'node:assert/strict'
import test from 'node:test'
import {
  prepareApplicationWorkspaceNavigationApply,
} from './appWorkspaceNavigationApply.ts'

test('workspace apply restores the exact Case surface and focuses only after commit', () => {
  const calls: string[] = []
  const prepared = prepareApplicationWorkspaceNavigationApply({
    batchReactUpdates(apply) {
      calls.push('batch')
      apply()
    },
    cancelActivePointerGestures() {
      calls.push('cancel-gestures')
    },
    setActiveWorkspace(workspace) {
      calls.push(`workspace:${workspace}`)
    },
    restoreCaseInsertRoute(pane, surface) {
      calls.push(`route:${pane}:${surface}`)
    },
    requestFocus(destination) {
      calls.push(`focus:${destination.workspace}`)
    },
  }, { workspace: 'caseInsert', surface: 'spine' })

  const committed = prepared.commitLifecycleAndApply(() => ({
    status: 'committed',
    snapshot: {
      generation: 1,
      state: { activeSession: null, visibleWorkspace: 'home' },
    },
  }))
  assert.equal(committed.status, 'committed')
  assert.deepEqual(calls, [
    'batch',
    'cancel-gestures',
    'route:tray:spine',
    'workspace:caseInsert',
    'focus:caseInsert',
  ])
})

test('workspace apply performs no React or focus mutation after stale commit', () => {
  const calls: string[] = []
  const prepared = prepareApplicationWorkspaceNavigationApply({
    batchReactUpdates: (apply) => apply(),
    cancelActivePointerGestures: () => calls.push('cancel-gestures'),
    setActiveWorkspace: () => calls.push('workspace'),
    restoreCaseInsertRoute: () => calls.push('route'),
    requestFocus: () => calls.push('focus'),
  }, { workspace: 'home' })

  const result = prepared.commitLifecycleAndApply(() => ({
    status: 'stale',
    snapshot: {
      generation: 2,
      state: { activeSession: null, visibleWorkspace: 'home' },
    },
  }))
  assert.equal(result.status, 'stale')
  assert.deepEqual(calls, [])
})
