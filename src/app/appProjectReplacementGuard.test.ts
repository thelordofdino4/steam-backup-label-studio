import assert from 'node:assert/strict'
import test from 'node:test'
import {
  commandFailed,
  commandSucceeded,
  type ApplicationCommandOperationToken,
  type ApplicationCommandResult,
} from '../lifecycle/applicationCommandTypes.ts'
import type {
  ApplicationLifecycleCommandContext,
} from '../lifecycle/applicationLifecycleCommandPorts.ts'
import {
  adoptSavedProjectBaseline,
  createEmptyApplicationLifecycleState,
  createLoadedProjectSession,
  createNewProjectSession,
  replaceActiveProjectContent,
  type ApplicationLifecycleState,
} from '../lifecycle/projectSession.ts'
import { createBlankDiscSavedProject } from '../project/blankDiscProject.ts'
import type { SavedDiscProject } from '../project/projectTypes.ts'
import {
  createProjectReplacementGuard,
  isProjectReplacementAuthorizationCurrent,
  type ProjectReplacementDecision,
} from './appProjectReplacementGuard.ts'

function project(title: string): SavedDiscProject {
  const blank = createBlankDiscSavedProject()
  return {
    ...blank,
    title,
    game: { ...blank.game, manualTitle: title },
    metadata: { ...blank.metadata!, title },
  }
}

function createHarness(initialState: ApplicationLifecycleState) {
  let state = initialState
  let generation = 0
  const acquiredScopes: string[][] = []
  const context: ApplicationLifecycleCommandContext = {
    commandId: 'project.new-disc',
    stateSnapshot: { generation, state },
    getCurrentStateSnapshot: () => ({ generation, state }),
    commitState: (expectedGeneration, transition) => {
      if (expectedGeneration !== generation) {
        return { status: 'stale', snapshot: { generation, state } }
      }
      const next = transition(state)
      if (next === state) {
        return { status: 'no-op', snapshot: { generation, state } }
      }
      state = next
      generation += 1
      return { status: 'committed', snapshot: { generation, state } }
    },
    createSessionId: () => 'unused-session',
  }
  const operation: ApplicationCommandOperationToken = {
    id: 'replacement-test',
    commandId: 'project.new-disc',
    rootScopes: ['lifecycle.transition'],
    ownsScope: (scope) => scope === 'lifecycle.transition',
    async withScopes(scopes, run) {
      acquiredScopes.push([...scopes])
      return run()
    },
  }

  return {
    context,
    operation,
    acquiredScopes,
    getState: () => state,
    setState(next: ApplicationLifecycleState) {
      state = next
      generation += 1
    },
  }
}

test('no session and clean session authorize without a replacement prompt', async () => {
  for (const state of [
    createEmptyApplicationLifecycleState(),
    createLoadedProjectSession({
      sessionId: 'clean',
      project: project('Clean'),
      currentPath: 'clean.sbls',
      persistenceFormat: 'sbls-package-v1',
    }),
  ]) {
    const harness = createHarness(state)
    let promptCount = 0
    const guard = createProjectReplacementGuard(
      () => ({
        promptForReplacementDecision: async () => {
          promptCount += 1
          return 'cancel'
        },
      }),
      async () => commandSucceeded(undefined),
    )

    const result = await guard(harness.context, harness.operation)
    assert.equal(result.status, 'success')
    assert.equal(promptCount, 0)
    assert.deepEqual(harness.acquiredScopes, [])
    if (result.status === 'success') {
      assert.equal(
        isProjectReplacementAuthorizationCurrent(
          harness.getState(),
          result.value,
        ),
        true,
      )
    }
  }
})

test('dirty Cancel mutates nothing and Discard authorizes one exact revision', async () => {
  for (const decision of ['cancel', 'discard'] as const) {
    const initial = createNewProjectSession({
      sessionId: 'dirty',
      project: project('Dirty'),
    })
    const harness = createHarness(initial)
    const guard = createProjectReplacementGuard(
      () => ({ promptForReplacementDecision: async () => decision }),
      async () => commandSucceeded(undefined),
    )

    const result = await guard(harness.context, harness.operation)
    assert.equal(result.status, decision === 'cancel' ? 'declined' : 'success')
    assert.equal(harness.getState(), initial)
    assert.deepEqual(harness.acquiredScopes, [['dialog.project-replacement']])

    if (result.status === 'success') {
      assert.equal(
        isProjectReplacementAuthorizationCurrent(initial, result.value),
        true,
      )
      harness.setState(replaceActiveProjectContent(
        initial,
        project('Newer edit'),
      ))
      assert.equal(
        isProjectReplacementAuthorizationCurrent(
          harness.getState(),
          result.value,
        ),
        false,
      )
    }
  }
})

test('Save permits replacement only when the latest session becomes clean', async () => {
  const initial = createNewProjectSession({
    sessionId: 'save-dirty',
    project: project('Revision R'),
  })
  const harness = createHarness(initial)
  let promptCount = 0
  let saveCount = 0
  const guard = createProjectReplacementGuard(
    () => ({
      promptForReplacementDecision: async () => {
        promptCount += 1
        return 'save'
      },
    }),
    async () => {
      saveCount += 1
      const current = harness.getState()
      harness.setState(adoptSavedProjectBaseline(current, {
        acceptedSnapshot: current.activeSession!.project as SavedDiscProject,
        currentPath: 'saved.sbls',
        persistenceFormat: 'sbls-package-v1',
      }))
      return commandSucceeded(undefined)
    },
  )

  const result = await guard(harness.context, harness.operation)
  assert.equal(result.status, 'success')
  assert.equal(promptCount, 1)
  assert.equal(saveCount, 1)
  if (result.status === 'success') {
    assert.equal(
      isProjectReplacementAuthorizationCurrent(harness.getState(), result.value),
      true,
    )
  }
})

test('Save of R re-evaluates when authoritative content advances to R+1', async () => {
  const initial = createNewProjectSession({
    sessionId: 'save-advanced',
    project: project('Revision R'),
  })
  const harness = createHarness(initial)
  const decisions: ProjectReplacementDecision[] = ['save', 'discard']
  let saveCount = 0
  const guard = createProjectReplacementGuard(
    () => ({
      promptForReplacementDecision: async () => decisions.shift() ?? 'cancel',
    }),
    async () => {
      saveCount += 1
      const accepted = harness.getState().activeSession!.project as SavedDiscProject
      const advanced = replaceActiveProjectContent(
        harness.getState(),
        project('Revision R+1'),
      )
      harness.setState(adoptSavedProjectBaseline(advanced, {
        acceptedSnapshot: accepted,
        currentPath: 'saved.sbls',
        persistenceFormat: 'sbls-package-v1',
      }))
      return commandSucceeded(undefined)
    },
  )

  const result = await guard(harness.context, harness.operation)
  assert.equal(result.status, 'success')
  assert.equal(saveCount, 1)
  assert.equal(harness.getState().activeSession?.project.title, 'Revision R+1')
  assert.equal(
    harness.getState().activeSession?.cleanBaseline?.exactSnapshot.title,
    'Revision R',
  )
  assert.deepEqual(decisions, [])
})

test('Save cancellation and failure abort replacement unchanged', async () => {
  for (const saveResult of [
    { status: 'cancelled', reason: 'file-dialog-dismissed' } as const,
    commandFailed({
      code: 'project.write-failed',
      userMessage: 'Write failed.',
      recoverable: true,
    }),
  ] satisfies ApplicationCommandResult<void>[]) {
    const initial = createNewProjectSession({
      sessionId: 'save-abort',
      project: project('Keep me'),
    })
    const harness = createHarness(initial)
    const guard = createProjectReplacementGuard(
      () => ({ promptForReplacementDecision: async () => 'save' }),
      async () => saveResult,
    )

    const result = await guard(harness.context, harness.operation)
    assert.equal(result.status, saveResult.status)
    assert.equal(harness.getState(), initial)
  }
})
