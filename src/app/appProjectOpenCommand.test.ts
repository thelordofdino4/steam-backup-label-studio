import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createBrandingSources,
} from '../caseInsert/brandingMarkTargetSourcesFixtures.ts'
import {
  createApplicationLifecycleCompositionRoot,
} from '../lifecycle/applicationLifecycleCompositionRoot.ts'
import {
  canSaveProjectSessionDirectly,
  createNewProjectSession,
} from '../lifecycle/projectSession.ts'
import {
  commandFailed,
  commandSucceeded,
} from '../lifecycle/applicationCommandTypes.ts'
import type {
  ApplicationLifecycleCommandContext,
} from '../lifecycle/applicationLifecycleCommandPorts.ts'
import {
  createBlankJewelCaseSavedProject,
} from '../project/caseInsertProjectAdapters.ts'
import { CURRENT_PROJECT_SCHEMA_VERSION } from '../project/projectSchema.ts'
import {
  stageAppProjectOpen,
  type StagedProjectOpenCandidate,
} from './appProjectLoad.ts'
import {
  createApplicationProjectOpenCommandOwner,
  type ApplicationProjectOpenRuntimeDependencies,
} from './appProjectOpenCommand.ts'
import { createApplicationProjectSaveCommandOwners } from './appProjectSaveCommand.ts'
import {
  createProjectReplacementGuard,
  type ProjectReplacementGuard,
} from './appProjectReplacementGuard.ts'
import { createBlankDiscSavedProject } from '../project/blankDiscProject.ts'

function discContents(): string {
  return JSON.stringify({
    schemaVersion: CURRENT_PROJECT_SCHEMA_VERSION,
    projectType: 'disc',
    title: 'Lifecycle Disc',
    savedAt: '2026-06-03T12:00:00.000Z',
    game: { manualTitle: 'Lifecycle Disc', selectedSteamGame: null },
    template: {
      type: 'disc',
      variant: 'standardPrintableDisc',
      customDimensions: null,
    },
    steamBackupLogo: { placement: 'top' },
    background: {
      scale: 1,
      offset: { x: 0, y: 0 },
      imageDataUrl: null,
      note: 'lifecycle Open fixture',
    },
  })
}

async function candidateFor(
  contents: string,
  path: string,
  persistenceFormat: 'legacy-json' | 'sbls-package-v1' = 'legacy-json',
): Promise<StagedProjectOpenCandidate> {
  const result = await stageAppProjectOpen({
    openDialog: async () => path,
    readProjectFileCommand: async () => contents,
    recognizeProjectFileFormatCommand: async () => persistenceFormat,
    decodeProjectPackageFileCommand: async () => new TextEncoder().encode(contents),
    caseInsertBrandingSources: createBrandingSources(),
  })
  assert.equal(result.status, 'success')
  if (result.status !== 'success') throw new Error('Candidate did not stage.')
  return result.value
}

function dependenciesFor(
  candidate: StagedProjectOpenCandidate,
  applied: StagedProjectOpenCandidate[],
): ApplicationProjectOpenRuntimeDependencies {
  return {
    stageCandidate: async () => commandSucceeded(candidate),
    prepareEditorAggregateApply: (preparedCandidate) => commandSucceeded({
      commitLifecycleAndApply(commitLifecycle) {
        const commit = commitLifecycle()
        if (commit.status === 'committed') applied.push(preparedCandidate)
        return commit
      },
    }),
  }
}

const authorizeCurrentReplacement: ProjectReplacementGuard = async (context) => {
  const session = context.getCurrentStateSnapshot().state.activeSession
  return commandSucceeded(session
    ? { sessionId: session.id, revision: session.revision }
    : { sessionId: null, revision: null })
}

for (const projectType of ['disc', 'caseInsert'] as const) {
  test(`successful ${projectType} Open creates one exact clean path-bearing session`, async () => {
    const path = `C:\\projects\\${projectType}.sbls.json`
    const contents = projectType === 'disc'
      ? discContents()
      : JSON.stringify(createBlankJewelCaseSavedProject('Lifecycle Case'))
    const candidate = await candidateFor(contents, path)
    const applied: StagedProjectOpenCandidate[] = []
    const owner = createApplicationProjectOpenCommandOwner(
      () => dependenciesFor(candidate, applied),
      authorizeCurrentReplacement,
    )
    const root = createApplicationLifecycleCompositionRoot({
      ports: { openProject: owner },
      createSessionId: () => `session-${projectType}`,
    })

    const result = await root.dispatch('project.open')
    assert.equal(result.disposition, 'executed')
    if (result.disposition === 'executed') {
      assert.equal(result.result.status, 'success')
    }
    const session = root.getLifecycleState().activeSession
    assert.ok(session)
    assert.equal(session.id, `session-${projectType}`)
    assert.equal(session.kind, projectType)
    assert.equal(session.currentPath, path)
    assert.equal(session.persistenceFormat, 'legacy-json')
    assert.equal(session.revision, 0)
    assert.deepEqual(session.lastEditorRoute, candidate.editorRoute)
    assert.deepEqual(session.project, candidate.normalizedProject)
    assert.deepEqual(
      session.cleanBaseline?.exactSnapshot,
      candidate.normalizedProject,
    )
    assert.equal(root.getStateSnapshot().generation, 1)
    assert.deepEqual(applied, [candidate])
  })
}

for (const [openedPath, expectedDialogCount] of [
  ['C:\\projects\\direct.sbls', 0],
  ['C:\\projects\\wrong.json', 1],
] as const) {
  test(`ordinary Save immediately after package Open routes correctly for ${openedPath}`, async () => {
    const candidate = await candidateFor(
      discContents(),
      openedPath,
      'sbls-package-v1',
    )
    const writtenPaths: string[] = []
    let dialogCount = 0
    const saveOwners = createApplicationProjectSaveCommandOwners(() => ({
      saveDialog: async () => {
        dialogCount += 1
        return 'C:\\projects\\rerouted.sbls'
      },
      packageWrite: {
        encodeAndWrite: async (input) => {
          writtenPaths.push(input.destinationPath)
          return Object.freeze({ status: 'success' as const })
        },
      },
    }))
    const root = createApplicationLifecycleCompositionRoot({
      ports: {
        openProject: createApplicationProjectOpenCommandOwner(
          () => dependenciesFor(candidate, []),
          authorizeCurrentReplacement,
        ),
        saveProject: saveOwners.saveProject,
        saveProjectAs: saveOwners.saveProjectAs,
      },
    })

    await root.dispatch('project.open')
    const result = await root.dispatch('project.save')

    assert.equal(result.disposition, 'executed')
    if (result.disposition === 'executed') {
      assert.equal(
        result.result.status,
        'success',
        JSON.stringify(result.result),
      )
    }
    assert.equal(dialogCount, expectedDialogCount)
    assert.deepEqual(writtenPaths, [
      expectedDialogCount === 0
        ? openedPath
        : 'C:\\projects\\rerouted.sbls',
    ])
  })
}

test('failed package Open preserves an existing destination and clean baseline', async () => {
  const candidate = await candidateFor(
    discContents(),
    'C:\\projects\\existing.sbls',
    'sbls-package-v1',
  )
  let nextStage = commandSucceeded(candidate)
  let applyCount = 0
  const owner = createApplicationProjectOpenCommandOwner(() => ({
    stageCandidate: async () => nextStage,
    prepareEditorAggregateApply: () => commandSucceeded({
      commitLifecycleAndApply(commitLifecycle) {
        const result = commitLifecycle()
        if (result.status === 'committed') applyCount += 1
        return result
      },
    }),
  }), authorizeCurrentReplacement)
  const root = createApplicationLifecycleCompositionRoot({
    ports: { openProject: owner },
  })
  await root.dispatch('project.open')
  const before = root.getStateSnapshot()
  nextStage = commandFailed({
    code: 'project.package.archive-invalid',
    userMessage: 'The project package archive is invalid.',
    recoverable: true,
  })

  const result = await root.dispatch('project.open')

  assert.equal(result.disposition, 'executed')
  if (result.disposition === 'executed') {
    assert.equal(result.result.status, 'failure')
  }
  assert.deepEqual(root.getStateSnapshot(), before)
  assert.equal(
    root.getLifecycleState().activeSession?.currentPath,
    'C:\\projects\\existing.sbls',
  )
  assert.deepEqual(
    root.getLifecycleState().activeSession?.cleanBaseline?.exactSnapshot,
    candidate.normalizedProject,
  )
  assert.equal(applyCount, 1)
})

for (const projectType of ['disc', 'caseInsert'] as const) {
  for (const [suffix, directSaveEligible] of [
    ['sbls', true],
    ['json', false],
  ] as const) {
    test(`package ${projectType} Open from .${suffix} commits exact package identity and direct-Save eligibility`, async () => {
      const path = `C:\\projects\\${projectType}.${suffix}`
      const contents = projectType === 'disc'
        ? discContents()
        : JSON.stringify(createBlankJewelCaseSavedProject('Package Case'))
      const candidate = await candidateFor(
        contents,
        path,
        'sbls-package-v1',
      )
      const applied: StagedProjectOpenCandidate[] = []
      let sessionIdCount = 0
      const root = createApplicationLifecycleCompositionRoot({
        ports: {
          openProject: createApplicationProjectOpenCommandOwner(
            () => dependenciesFor(candidate, applied),
            authorizeCurrentReplacement,
          ),
        },
        createSessionId: () => {
          sessionIdCount += 1
          return `package-${projectType}`
        },
      })

      const before = root.getStateSnapshot()
      const result = await root.dispatch('project.open')
      assert.equal(result.disposition, 'executed')
      if (result.disposition === 'executed') {
        assert.equal(result.result.status, 'success')
      }
      const after = root.getStateSnapshot()
      const session = after.state.activeSession
      assert.ok(session)
      assert.equal(before.generation, 0)
      assert.equal(after.generation, 1)
      assert.equal(sessionIdCount, 1)
      assert.equal(session.kind, projectType)
      assert.equal(session.currentPath, path)
      assert.equal(session.persistenceFormat, 'sbls-package-v1')
      assert.equal(session.revision, 0)
      assert.deepEqual(session.project, candidate.normalizedProject)
      assert.deepEqual(
        session.cleanBaseline?.exactSnapshot,
        candidate.normalizedProject,
      )
      assert.deepEqual(session.lastEditorRoute, candidate.editorRoute)
      assert.equal(canSaveProjectSessionDirectly(session), directSaveEligible)
      assert.deepEqual(applied, [candidate])
    })
  }
}

test('stale lifecycle CAS does not apply the staged editor candidate', async () => {
  const candidate = await candidateFor(discContents(), 'stale.json')
  let applyCount = 0
  const owner = createApplicationProjectOpenCommandOwner(() => ({
    stageCandidate: async () => commandSucceeded(candidate),
    prepareEditorAggregateApply: () => commandSucceeded({
      commitLifecycleAndApply(commitLifecycle) {
        const result = commitLifecycle()
        if (result.status === 'committed') applyCount += 1
        return result
      },
    }),
  }), authorizeCurrentReplacement)
  assert.equal(owner.availability, 'implemented')
  if (owner.availability !== 'implemented') return
  let commitCount = 0
  const emptyState = {
    activeSession: null,
    visibleWorkspace: 'home' as const,
  }
  const context: ApplicationLifecycleCommandContext = {
    commandId: 'project.open',
    stateSnapshot: { generation: 0, state: emptyState },
    getCurrentStateSnapshot: () => ({ generation: 1, state: emptyState }),
    commitState: () => {
      commitCount += 1
      return {
        status: 'stale',
        snapshot: { generation: 2, state: emptyState },
      }
    },
    createSessionId: () => 'unused-session',
  }

  const result = await owner.executeOpenProject(
    context,
    undefined,
    {
      id: 'operation-open',
      commandId: 'project.open',
      rootScopes: [],
      ownsScope: () => false,
      withScopes: async (_scopes, operation) => operation(),
    },
  )
  assert.equal(result.status, 'failure')
  if (result.status === 'failure') {
    assert.equal(result.error.code, 'project.open-stale-state')
  }
  assert.equal(commitCount, 1)
  assert.equal(applyCount, 0)
})

test('cancelled and failed staging preserve lifecycle and editor state', async () => {
  for (const staged of [
    { status: 'cancelled' as const, reason: 'file-dialog-dismissed' },
    commandFailed({
      code: 'project.read-failed',
      userMessage: 'The project could not be read.',
      recoverable: true,
    }),
  ]) {
    let prepareCount = 0
    let applyCount = 0
    const owner = createApplicationProjectOpenCommandOwner(() => ({
      stageCandidate: async () => staged,
      prepareEditorAggregateApply: () => {
        prepareCount += 1
        return commandSucceeded({
          commitLifecycleAndApply(commitLifecycle) {
            applyCount += 1
            return commitLifecycle()
          },
        })
      },
    }), authorizeCurrentReplacement)
    const root = createApplicationLifecycleCompositionRoot({
      ports: { openProject: owner },
    })
    const before = root.getStateSnapshot()

    await root.dispatch('project.open')

    assert.equal(root.getStateSnapshot(), before)
    assert.equal(prepareCount, 0)
    assert.equal(applyCount, 0)
    assert.deepEqual(root.getBusyState().occupiedScopes, [])
  }
})

test('editor apply precondition failure preserves lifecycle and editor state', async () => {
  const candidate = await candidateFor(discContents(), 'precondition.json')
  let commitCount = 0
  const owner = createApplicationProjectOpenCommandOwner(() => ({
    stageCandidate: async () => commandSucceeded(candidate),
    prepareEditorAggregateApply: () => commandFailed({
      code: 'project.open-editor-apply-precondition-failed',
      userMessage: 'The opened project could not be applied to the editor.',
      recoverable: true,
    }),
  }), authorizeCurrentReplacement)
  const root = createApplicationLifecycleCompositionRoot({
    ports: { openProject: owner },
  })
  root.subscribe(() => commitCount += 1)
  const before = root.getStateSnapshot()

  const result = await root.dispatch('project.open')

  assert.equal(result.disposition, 'executed')
  if (result.disposition === 'executed') {
    assert.equal(result.result.status, 'failure')
    if (result.result.status === 'failure') {
      assert.equal(
        result.result.error.code,
        'project.open-editor-apply-precondition-failed',
      )
    }
  }
  assert.equal(root.getStateSnapshot(), before)
  assert.ok(commitCount > 0, 'busy notifications still occur')
  assert.equal(root.getStateSnapshot().generation, 0)
})

test('an authorized active session is replaced atomically by Open', async () => {
  const first = await candidateFor(discContents(), 'first.json')
  const second = await candidateFor(discContents(), 'second.json')
  let nextCandidate = first
  let applyCount = 0
  const owner = createApplicationProjectOpenCommandOwner(() => ({
    ...dependenciesFor(nextCandidate, []),
    prepareEditorAggregateApply: (candidate) => commandSucceeded({
      commitLifecycleAndApply(commitLifecycle) {
        const result = commitLifecycle()
        if (result.status === 'committed') applyCount += 1
        assert.deepEqual(candidate.normalizedProject, nextCandidate.normalizedProject)
        return result
      },
    }),
  }), authorizeCurrentReplacement)
  const root = createApplicationLifecycleCompositionRoot({
    ports: { openProject: owner },
  })
  await root.dispatch('project.open')
  nextCandidate = second
  const beforeSessionId = root.getLifecycleState().activeSession?.id

  const result = await root.dispatch('project.open')

  assert.equal(result.disposition, 'executed')
  if (result.disposition === 'executed') {
    assert.equal(result.result.status, 'success')
  }
  assert.notEqual(root.getLifecycleState().activeSession?.id, beforeSessionId)
  assert.equal(root.getLifecycleState().activeSession?.currentPath, 'second.json')
  assert.equal(applyCount, 2)
})

test('dirty Open stages and prepares before one shared guard, and Cancel changes nothing', async () => {
  const candidate = await candidateFor(discContents(), 'candidate.json')
  const initial = createNewProjectSession({
    sessionId: 'dirty-open',
    project: createBlankDiscSavedProject(),
  })
  const order: string[] = []
  let applyCount = 0
  const guard = createProjectReplacementGuard(
    () => ({
      promptForReplacementDecision: async () => {
        order.push('guard')
        return 'cancel'
      },
    }),
    async () => {
      throw new Error('Save was not selected.')
    },
  )
  const owner = createApplicationProjectOpenCommandOwner(() => ({
    stageCandidate: async () => {
      order.push('stage')
      return commandSucceeded(candidate)
    },
    prepareEditorAggregateApply: () => {
      order.push('prepare')
      return commandSucceeded({
        commitLifecycleAndApply(commitLifecycle) {
          applyCount += 1
          return commitLifecycle()
        },
      })
    },
  }), guard)
  const root = createApplicationLifecycleCompositionRoot({
    initialState: initial,
    ports: { openProject: owner },
  })
  const before = root.getStateSnapshot()

  const result = await root.dispatch('project.open')

  assert.equal(result.disposition, 'executed')
  if (result.disposition === 'executed') {
    assert.equal(result.result.status, 'declined')
  }
  assert.deepEqual(order, ['stage', 'prepare', 'guard'])
  assert.equal(root.getStateSnapshot(), before)
  assert.equal(applyCount, 0)
})

for (const persistenceFormat of ['legacy-json', 'sbls-package-v1'] as const) {
  test(`dirty Open Discard atomically commits truthful ${persistenceFormat} identity`, async () => {
    const path = persistenceFormat === 'legacy-json'
      ? 'replacement.json'
      : 'replacement.sbls'
    const candidate = await candidateFor(
      discContents(),
      path,
      persistenceFormat,
    )
    const initial = createNewProjectSession({
      sessionId: 'discard-open',
      project: createBlankDiscSavedProject(),
    })
    let promptCount = 0
    let applyCount = 0
    let sessionIdCount = 0
    const guard = createProjectReplacementGuard(
      () => ({
        promptForReplacementDecision: async () => {
          promptCount += 1
          return 'discard'
        },
      }),
      async () => commandSucceeded(undefined),
    )
    const owner = createApplicationProjectOpenCommandOwner(() => ({
      stageCandidate: async () => commandSucceeded(candidate),
      prepareEditorAggregateApply: () => commandSucceeded({
        commitLifecycleAndApply(commitLifecycle) {
          const commit = commitLifecycle()
          if (commit.status === 'committed') applyCount += 1
          return commit
        },
      }),
    }), guard)
    const root = createApplicationLifecycleCompositionRoot({
      initialState: initial,
      ports: { openProject: owner },
      createSessionId: () => {
        sessionIdCount += 1
        return 'opened-replacement'
      },
    })

    const result = await root.dispatch('project.open')

    assert.equal(result.disposition, 'executed')
    assert.equal(promptCount, 1)
    assert.equal(applyCount, 1)
    assert.equal(sessionIdCount, 1)
    const session = root.getLifecycleState().activeSession
    assert.equal(session?.id, 'opened-replacement')
    assert.equal(session?.currentPath, path)
    assert.equal(session?.persistenceFormat, persistenceFormat)
    assert.equal(session?.revision, 0)
    assert.deepEqual(session?.cleanBaseline?.exactSnapshot, session?.project)
  })
}
