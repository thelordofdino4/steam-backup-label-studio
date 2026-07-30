import assert from 'node:assert/strict'
import test from 'node:test'
import type { EditorProjectType } from '../editor/editorTypes.ts'
import { commandSucceeded } from '../lifecycle/applicationCommandTypes.ts'
import {
  createApplicationLifecycleCompositionRoot,
} from '../lifecycle/applicationLifecycleCompositionRoot.ts'
import {
  createLoadedProjectSession,
  createNewProjectSession,
  replaceActiveProjectContent,
  selectIsActiveProjectDirty,
  type ApplicationLifecycleState,
} from '../lifecycle/projectSession.ts'
import { createBlankDiscSavedProject } from '../project/blankDiscProject.ts'
import {
  createBlankJewelCaseSavedProject,
} from '../project/caseInsertProjectAdapters.ts'
import type { SavedProject } from '../project/projectTypes.ts'
import {
  createApplicationProjectNewCommandOwners,
} from './appProjectNewCommand.ts'
import {
  createProjectReplacementGuard,
  type ProjectReplacementDecision,
  type ProjectReplacementGuard,
} from './appProjectReplacementGuard.ts'

function blank(kind: EditorProjectType): SavedProject {
  return kind === 'disc'
    ? createBlankDiscSavedProject()
    : createBlankJewelCaseSavedProject()
}

function createHarness(options: Readonly<{
  initialState?: ApplicationLifecycleState
  decisions?: ProjectReplacementDecision[]
  guard?: ProjectReplacementGuard
}>) {
  const decisions = [...(options.decisions ?? [])]
  const applied: EditorProjectType[] = []
  let promptCount = 0
  let sessionIdCount = 0
  const replacementGuard = options.guard ?? createProjectReplacementGuard(
    () => ({
      promptForReplacementDecision: async () => {
        promptCount += 1
        return decisions.shift() ?? 'cancel'
      },
    }),
    async () => {
      throw new Error('Save is not expected in this New command harness.')
    },
  )
  const owners = createApplicationProjectNewCommandOwners(
    () => ({
      createBlankProject: blank,
      prepareEditorApply: (kind) => ({
        commitLifecycleAndApply(commitLifecycle) {
          const result = commitLifecycle()
          if (result.status === 'committed') applied.push(kind)
          return result
        },
      }),
    }),
    replacementGuard,
  )
  const root = createApplicationLifecycleCompositionRoot({
    ...(options.initialState ? { initialState: options.initialState } : {}),
    ports: { newDisc: owners.newDisc, newCase: owners.newCase },
    createSessionId: () => {
      sessionIdCount += 1
      return `new-session-${sessionIdCount}`
    },
  })

  return {
    root,
    applied,
    getPromptCount: () => promptCount,
    getSessionIdCount: () => sessionIdCount,
  }
}

for (const kind of ['disc', 'caseInsert'] as const) {
  const commandId = kind === 'disc' ? 'project.new-disc' : 'project.new-case'
  test(`Home ${commandId} creates one pathless dirty revision-zero session`, async () => {
    const harness = createHarness({})
    const result = await harness.root.dispatch(commandId)

    assert.equal(result.disposition, 'executed')
    if (result.disposition === 'executed') {
      assert.equal(result.result.status, 'success')
    }
    const session = harness.root.getLifecycleState().activeSession
    assert.ok(session)
    assert.equal(session.kind, kind)
    assert.equal(session.currentPath, null)
    assert.equal(session.persistenceFormat, null)
    assert.equal(session.cleanBaseline, null)
    assert.equal(session.revision, 0)
    assert.equal(selectIsActiveProjectDirty(harness.root.getLifecycleState()), true)
    assert.equal(harness.getPromptCount(), 0)
    assert.equal(harness.getSessionIdCount(), 1)
    assert.deepEqual(harness.applied, [kind])
  })
}

for (const sourceKind of ['disc', 'caseInsert'] as const) {
  for (const targetKind of ['disc', 'caseInsert'] as const) {
    const commandId = targetKind === 'disc'
      ? 'project.new-disc'
      : 'project.new-case'
    test(`clean ${sourceKind} to ${targetKind} replacement needs no prompt`, async () => {
      const harness = createHarness({
        initialState: createLoadedProjectSession({
          sessionId: 'clean-source',
          project: blank(sourceKind),
          currentPath: 'clean.sbls',
          persistenceFormat: 'sbls-package-v1',
        }),
      })
      const result = await harness.root.dispatch(commandId)

      assert.equal(result.disposition, 'executed')
      assert.equal(harness.getPromptCount(), 0)
      assert.notEqual(
        harness.root.getLifecycleState().activeSession?.id,
        'clean-source',
      )
      assert.equal(
        harness.root.getLifecycleState().activeSession?.kind,
        targetKind,
      )
    })
  }
}

test('dirty same-kind and cross-kind New share Cancel and Discard policy', async () => {
  for (const targetKind of ['disc', 'caseInsert'] as const) {
    for (const decision of ['cancel', 'discard'] as const) {
      const initial = createNewProjectSession({
        sessionId: 'dirty-source',
        project: createBlankDiscSavedProject(),
      })
      const harness = createHarness({ initialState: initial, decisions: [decision] })
      const result = await harness.root.dispatch(
        targetKind === 'disc' ? 'project.new-disc' : 'project.new-case',
      )

      assert.equal(harness.getPromptCount(), 1)
      assert.equal(result.disposition, 'executed')
      if (decision === 'cancel') {
        assert.equal(harness.root.getLifecycleState().activeSession?.id, 'dirty-source')
        assert.deepEqual(harness.applied, [])
      } else {
        assert.notEqual(harness.root.getLifecycleState().activeSession?.id, 'dirty-source')
        assert.deepEqual(harness.applied, [targetKind])
      }
    }
  }
})

test('stale final authorization applies no New candidate', async () => {
  const initial = createNewProjectSession({
    sessionId: 'stale-source',
    project: createBlankDiscSavedProject(),
  })
  const staleGuard: ProjectReplacementGuard = async (context) => {
    const captured = context.getCurrentStateSnapshot()
    const session = captured.state.activeSession!
    context.commitState(captured.generation, (state) =>
      replaceActiveProjectContent(state, {
        ...createBlankDiscSavedProject(),
        title: 'Newer edit',
        game: { manualTitle: 'Newer edit', selectedSteamGame: null },
      }))
    return commandSucceeded({
      sessionId: session.id,
      revision: session.revision,
    })
  }
  const harness = createHarness({ initialState: initial, guard: staleGuard })

  const result = await harness.root.dispatch('project.new-case')

  assert.equal(result.disposition, 'executed')
  if (result.disposition === 'executed') {
    assert.equal(result.result.status, 'failure')
  }
  assert.equal(harness.root.getLifecycleState().activeSession?.id, 'stale-source')
  assert.equal(harness.root.getLifecycleState().activeSession?.project.title, 'Newer edit')
  assert.deepEqual(harness.applied, [])
  assert.equal(harness.getSessionIdCount(), 0)
})

test('repeated busy New activation opens one guard and creates one session', async () => {
  let releasePrompt!: () => void
  const gate = new Promise<void>((resolve) => {
    releasePrompt = resolve
  })
  let promptCount = 0
  const initial = createNewProjectSession({
    sessionId: 'busy-source',
    project: createBlankDiscSavedProject(),
  })
  const guard = createProjectReplacementGuard(
    () => ({
      promptForReplacementDecision: async () => {
        promptCount += 1
        await gate
        return 'discard'
      },
    }),
    async () => commandSucceeded(undefined),
  )
  const harness = createHarness({ initialState: initial, guard })

  const first = harness.root.dispatch('project.new-disc')
  const repeated = await harness.root.dispatch('project.new-disc')
  assert.equal(repeated.disposition, 'not-executed')
  assert.equal(promptCount, 1)
  releasePrompt()
  await first
  assert.equal(harness.getSessionIdCount(), 1)
  assert.deepEqual(harness.root.getBusyState().occupiedScopes, [])
})
