import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createBrandingSources,
} from '../caseInsert/brandingMarkTargetSourcesFixtures.ts'
import {
  createApplicationLifecycleCompositionRoot,
} from '../lifecycle/applicationLifecycleCompositionRoot.ts'
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
): Promise<StagedProjectOpenCandidate> {
  const result = await stageAppProjectOpen({
    openDialog: async () => path,
    readProjectFileCommand: async () => contents,
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
  }))
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
    }))
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
  }))
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

test('an authoritative active session returns the stable missing-guard result', async () => {
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
  }))
  const root = createApplicationLifecycleCompositionRoot({
    ports: { openProject: owner },
  })
  await root.dispatch('project.open')
  nextCandidate = second
  const before = root.getStateSnapshot()

  const result = await root.dispatch('project.open')

  assert.equal(result.disposition, 'executed')
  if (result.disposition === 'executed') {
    assert.equal(result.result.status, 'failure')
    if (result.result.status === 'failure') {
      assert.equal(
        result.result.error.code,
        'project.open-replacement-guard-unimplemented',
      )
    }
  }
  assert.equal(root.getStateSnapshot(), before)
  assert.equal(applyCount, 1)
})
