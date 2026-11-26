import assert from 'node:assert/strict'
import test from 'node:test'
import { createBrandingSources } from '../caseInsert/brandingMarkTargetSourcesFixtures.ts'
import type { EditorProjectType } from '../editor/editorTypes.ts'
import { commandSucceeded } from '../lifecycle/applicationCommandTypes.ts'
import { createApplicationLifecycleCompositionRoot } from '../lifecycle/applicationLifecycleCompositionRoot.ts'
import {
  createEmptyApplicationLifecycleState,
  createLoadedProjectSession,
  createNewProjectSession,
  replaceActiveProjectContent,
  returnProjectSessionHome,
  selectIsActiveProjectDirty,
  type ApplicationLifecycleState,
} from '../lifecycle/projectSession.ts'
import { createBlankDiscSavedProject } from '../project/blankDiscProject.ts'
import { createBlankJewelCaseSavedProject } from '../project/caseInsertProjectAdapters.ts'
import type { SavedProject } from '../project/projectTypes.ts'
import { createProjectFileCommandFailure } from '../tauri/projectFileFailure.ts'
import { selectApplicationCommandFeedback } from './appApplicationCommandFeedback.ts'
import { selectHomeResumeProjectSummary } from './appHomeResume.ts'
import { stageAppProjectOpen } from './appProjectLoad.ts'
import { prepareNewProjectEditorApply } from './appProjectNewEditorApply.ts'
import type { ProjectReplacementDecision } from './appProjectReplacementGuard.ts'
import { createApplicationLifecycleRuntime } from './applicationLifecycleRuntime.ts'

const kinds = ['disc', 'caseInsert'] as const
const workspaces = ['editor', 'home'] as const
const formats = ['legacy-json', 'sbls-package-v1'] as const
const replacementCommands = ['project.new-disc', 'project.new-case', 'project.open'] as const
type SourceFormat = 'pathless' | typeof formats[number]
type SaveOutcome = 'success' | 'cancel' | 'failure'
type OpenOutcome = 'valid' | 'cancel' | 'invalid' | 'read-failure'

function project(kind: EditorProjectType, title: string): SavedProject {
  const blank = kind === 'disc'
    ? createBlankDiscSavedProject()
    : createBlankJewelCaseSavedProject(title)
  return {
    ...blank,
    title,
    game: { ...blank.game, manualTitle: title },
    metadata: { ...blank.metadata!, title },
  }
}

function sourceState(
  kind: EditorProjectType,
  workspace: typeof workspaces[number],
  format: SourceFormat = 'sbls-package-v1',
  dirty = true,
): ApplicationLifecycleState {
  const original = project(kind, 'Original saved project')
  const lastEditorRoute = kind === 'disc'
    ? { workspace: 'disc' as const }
    : { workspace: 'caseInsert' as const, surface: 'spine' as const }
  let state = format === 'pathless'
    ? createNewProjectSession({ sessionId: 'source', project: original, lastEditorRoute })
    : createLoadedProjectSession({
        sessionId: 'source',
        project: original,
        currentPath: format === 'legacy-json' ? 'C:\\projects\\source.json' : 'C:\\projects\\source.sbls',
        persistenceFormat: format,
        lastEditorRoute,
      })
  if (dirty) state = replaceActiveProjectContent(state, project(kind, 'Current unsaved project'))
  return workspace === 'home' ? returnProjectSessionHome(state) : state
}

/** Real runtime/command/guard/staging/Save owners; only native and editor ports are doubles. */
function harness(initialState: ApplicationLifecycleState, targetKind: EditorProjectType = 'disc') {
  const events: string[] = []
  const decisions: ProjectReplacementDecision[] = []
  const observedStates: ApplicationLifecycleState[] = []
  const writes: { destinationPath: string; legacySourcePath: string | null; title: string }[] = []
  const options = {
    openFormat: 'sbls-package-v1' as typeof formats[number],
    openOutcome: 'valid' as OpenOutcome,
    saveOutcome: 'success' as SaveOutcome,
    onPrompt: () => {},
    onWrite: () => {},
  }
  let createdSessions = 0
  const runtime = createApplicationLifecycleRuntime({
    createRoot: (ports) => createApplicationLifecycleCompositionRoot({
      ...ports,
      initialState,
      createSessionId: () => `replacement-${++createdSessions}`,
    }),
  })
  const root = runtime.root
  const unsubscribe = root.subscribe((snapshot) => observedStates.push(snapshot.lifecycle))
  runtime.updateProjectReplacementDependencies({
    promptForReplacementDecision: async () => {
      events.push('guard')
      options.onPrompt()
      assert.ok(decisions.length > 0, 'Unexpected additional replacement prompt')
      return decisions.shift()!
    },
  })
  runtime.updateProjectNewDependencies({
    createBlankProject: (kind) => project(kind, 'New blank project'),
    prepareEditorApply: (kind, blank) => {
      events.push('prepare-new')
      return prepareNewProjectEditorApply({
        batchReactUpdates: (apply) => apply(),
        resetDiscProject: () => events.push('reset-disc'),
        resetCaseProject: () => events.push('reset-caseInsert'),
        setActiveWorkspace: (workspace) => events.push(`workspace-${workspace}`),
        setHomeStatusMessage: () => events.push('clear-home-status'),
      }, kind, blank)
    },
  })
  runtime.updateProjectOpenDependencies({
    stageCandidate: async () => {
      const contents = options.openOutcome === 'invalid'
        ? '{invalid JSON'
        : JSON.stringify(project(targetKind, 'Opened candidate'))
      return stageAppProjectOpen({
        openDialog: async () => {
          events.push('open-dialog')
          return options.openOutcome === 'cancel' ? null : 'C:\\projects\\candidate.sbls'
        },
        recognizeProjectFileFormatCommand: async () => {
          events.push('recognize')
          if (options.openOutcome === 'read-failure') {
            throw createProjectFileCommandFailure('project.read-failed')
          }
          return options.openFormat
        },
        readProjectFileCommand: async () => {
          events.push('read-legacy')
          return contents
        },
        decodeProjectPackageFileCommand: async () => {
          events.push('decode-package')
          return new TextEncoder().encode(contents)
        },
        caseInsertBrandingSources: createBrandingSources(),
      })
    },
    prepareEditorAggregateApply: (candidate) => {
      events.push('prepare-open')
      assert.ok(Object.isFrozen(candidate.restoredProject))
      return commandSucceeded({
        commitLifecycleAndApply(commitLifecycle) {
          events.push('apply-start')
          const result = commitLifecycle()
          if (result.status === 'committed') events.push(`apply-${candidate.projectType}`)
          return result
        },
      })
    },
  })
  runtime.updateProjectSaveDependencies({
    saveDialog: async () => {
      events.push('save-dialog')
      return options.saveOutcome === 'cancel' ? null : 'C:\\projects\\saved.sbls'
    },
    packageWrite: {
      encodeAndWrite: async (input) => {
        events.push('write')
        writes.push({
          destinationPath: input.destinationPath,
          legacySourcePath: input.legacySourcePath,
          title: input.normalizedProject.title,
        })
        options.onWrite()
        if (options.saveOutcome === 'failure') {
          throw createProjectFileCommandFailure('project.write-failed')
        }
        return Object.freeze({ status: 'success' as const })
      },
    },
  })
  return {
    root, events, decisions, observedStates, writes, options,
    createdSessions: () => createdSessions,
    mutationEvents: () => events.filter((event) => /^(reset-|apply-|workspace-|clear-home)/.test(event)),
    dispose() { unsubscribe(); runtime.dispose() },
  }
}

for (const sourceKind of kinds) {
  for (const workspace of workspaces) {
    for (const targetKind of kinds) {
      for (const decision of ['cancel', 'discard'] as const) {
        test(`dirty ${sourceKind} ${workspace}: New ${targetKind} ${decision} protects the complete session`, async () => {
          const h = harness(sourceState(sourceKind, workspace))
          h.decisions.push(decision)
          const before = h.root.getStateSnapshot()
          const resumeBefore = selectHomeResumeProjectSummary(before.state)
          const result = await h.root.dispatch(targetKind === 'disc' ? 'project.new-disc' : 'project.new-case')
          assert.equal(result.disposition, 'executed')
          if (result.disposition !== 'executed') return assert.fail('New was not executed')
          assert.equal(result.result.status, decision === 'cancel' ? 'declined' : 'success')
          assert.equal(h.events.filter((event) => event === 'guard').length, 1)
          if (decision === 'cancel') {
            assert.equal(h.root.getStateSnapshot(), before)
            assert.deepEqual(h.mutationEvents(), [])
            assert.equal(h.createdSessions(), 0)
            assert.deepEqual(selectHomeResumeProjectSummary(h.root.getLifecycleState()), resumeBefore)
            assert.match(selectApplicationCommandFeedback(result)!.message, /current project was kept/)
          } else {
            assert.equal(h.createdSessions(), 1)
            assert.equal(h.root.getLifecycleState().activeSession?.kind, targetKind)
            assert.equal(h.root.getLifecycleState().activeSession?.currentPath, null)
            assert.equal(selectIsActiveProjectDirty(h.root.getLifecycleState()), true)
            assert.deepEqual(h.mutationEvents(), [`reset-${targetKind}`, `workspace-${targetKind}`, 'clear-home-status'])
          }
          h.dispose()
        })
      }
      test(`clean ${sourceKind} ${workspace}: New ${targetKind} needs no prompt`, async () => {
        const h = harness(sourceState(sourceKind, workspace, 'sbls-package-v1', false))
        const result = await h.root.dispatch(targetKind === 'disc' ? 'project.new-disc' : 'project.new-case')
        assert.equal(result.disposition, 'executed')
        if (result.disposition === 'executed') assert.equal(result.result.status, 'success')
        assert.equal(h.events.includes('guard'), false)
        assert.equal(h.createdSessions(), 1)
        h.dispose()
      })
      for (const format of formats) {
        for (const outcome of ['clean', 'cancel', 'discard'] as const) {
          test(`${sourceKind} ${workspace}: ${outcome} Open ${targetKind} ${format} stages before guarding`, async () => {
            const h = harness(sourceState(sourceKind, workspace, 'sbls-package-v1', outcome !== 'clean'), targetKind)
            h.options.openFormat = format
            if (outcome !== 'clean') h.decisions.push(outcome)
            const before = h.root.getStateSnapshot()
            const resumeBefore = selectHomeResumeProjectSummary(before.state)
            const result = await h.root.dispatch('project.open')
            assert.equal(result.disposition, 'executed')
            if (result.disposition !== 'executed') return assert.fail('Open was not executed')
            assert.equal(result.result.status, outcome === 'cancel' ? 'declined' : 'success')
            const staging = ['open-dialog', 'recognize', format === 'legacy-json' ? 'read-legacy' : 'decode-package', 'prepare-open']
            assert.deepEqual(h.events.slice(0, 4), staging)
            assert.equal(h.events.filter((event) => event === 'guard').length, outcome === 'clean' ? 0 : 1)
            if (outcome === 'cancel') {
              assert.deepEqual(h.events, [...staging, 'guard'])
              assert.equal(h.root.getStateSnapshot(), before)
              assert.equal(h.createdSessions(), 0)
              assert.deepEqual(selectHomeResumeProjectSummary(h.root.getLifecycleState()), resumeBefore)
              assert.match(selectApplicationCommandFeedback(result)!.message, /current project was kept/)
            } else {
              const session = h.root.getLifecycleState().activeSession!
              assert.equal(session.kind, targetKind)
              assert.equal(session.persistenceFormat, format)
              assert.equal(session.currentPath, 'C:\\projects\\candidate.sbls')
              assert.equal(session.revision, 0)
              assert.equal(selectIsActiveProjectDirty(h.root.getLifecycleState()), false)
              assert.equal(h.createdSessions(), 1)
              assert.deepEqual(h.mutationEvents(), ['apply-start', `apply-${targetKind}`])
            }
            h.dispose()
          })
        }
      }
    }
    for (const outcome of ['cancel', 'invalid', 'read-failure'] as const) {
      test(`dirty ${sourceKind} ${workspace}: Open ${outcome} never reaches guard or apply`, async () => {
        const h = harness(sourceState(sourceKind, workspace))
        h.options.openOutcome = outcome
        const before = h.root.getStateSnapshot()
        const result = await h.root.dispatch('project.open')
        assert.equal(result.disposition, 'executed')
        if (result.disposition !== 'executed') return assert.fail('Open was not executed')
        assert.equal(result.result.status, outcome === 'cancel' ? 'cancelled' : 'failure')
        assert.equal(h.root.getStateSnapshot(), before)
        assert.equal(h.events.includes('guard'), false)
        assert.equal(h.events.includes('prepare-open'), false)
        assert.deepEqual(h.mutationEvents(), [])
        assert.equal(h.createdSessions(), 0)
        assert.ok(selectApplicationCommandFeedback(result)?.message)
        assert.deepEqual(h.root.getBusyState().occupiedScopes, [])
        h.dispose()
      })
    }
  }
  for (const command of replacementCommands) {
    for (const sourceFormat of ['pathless', ...formats] as const) {
      const saveOutcomes = sourceFormat === 'sbls-package-v1'
        ? ['success', 'failure'] as const
        : ['success', 'cancel', 'failure'] as const
      for (const outcome of saveOutcomes) {
        test(`${sourceKind} ${sourceFormat}: guard Save ${outcome} composes with ${command}`, async () => {
          const h = harness(sourceState(sourceKind, 'home', sourceFormat), sourceKind)
          h.options.saveOutcome = outcome
          h.decisions.push('save')
          const before = h.root.getStateSnapshot()
          const result = await h.root.dispatch(command)
          assert.equal(result.disposition, 'executed')
          if (result.disposition !== 'executed') return assert.fail('Replacement was not executed')
          assert.equal(result.result.status, outcome === 'cancel' ? 'cancelled' : outcome)
          assert.equal(h.events.filter((event) => event === 'guard').length, 1)
          assert.equal(h.events.filter((event) => event === 'save-dialog').length, sourceFormat === 'sbls-package-v1' ? 0 : 1)
          assert.equal(h.writes.length, outcome === 'cancel' ? 0 : 1)
          if (outcome === 'success') {
            const saved = h.observedStates.find((state) => state.activeSession?.id === 'source' && !selectIsActiveProjectDirty(state))
            assert.ok(saved, 'The exact source must be saved clean before replacement')
            assert.equal(saved.activeSession!.cleanBaseline!.exactSnapshot.title, 'Current unsaved project')
            assert.equal(h.writes[0].title, 'Current unsaved project')
            assert.equal(h.writes[0].legacySourcePath, sourceFormat === 'legacy-json' ? 'C:\\projects\\source.json' : null)
            assert.equal(h.writes[0].destinationPath, sourceFormat === 'sbls-package-v1' ? 'C:\\projects\\source.sbls' : 'C:\\projects\\saved.sbls')
            assert.equal(h.createdSessions(), 1)
            assert.ok(h.events.indexOf('write') < h.events.findIndex((event) => /^(reset-|apply-)/.test(event)))
          } else {
            assert.equal(h.root.getStateSnapshot(), before)
            assert.deepEqual(h.mutationEvents(), [])
            assert.equal(h.createdSessions(), 0)
            assert.ok(selectApplicationCommandFeedback(result)?.message)
          }
          assert.deepEqual(h.root.getBusyState().occupiedScopes, [])
          h.dispose()
        })
      }
    }
    test(`${sourceKind}: stale Discard permission re-prompts and Cancel preserves the newer edit for ${command}`, async () => {
      const h = harness(sourceState(sourceKind, 'home'), sourceKind)
      h.decisions.push('discard', 'cancel')
      let promptCount = 0
      h.options.onPrompt = () => {
        if (++promptCount !== 1) return
        assert.equal(h.root.synchronizeCurrentProject({
          sessionId: 'source', kind: sourceKind, project: project(sourceKind, 'Newer edit'),
        }), 'synchronized')
      }
      const baseline = h.root.getLifecycleState().activeSession!.cleanBaseline
      const result = await h.root.dispatch(command)
      assert.equal(result.disposition, 'executed')
      if (result.disposition === 'executed') assert.equal(result.result.status, 'declined')
      assert.equal(promptCount, 2)
      assert.equal(h.createdSessions(), 0)
      assert.deepEqual(h.mutationEvents(), [])
      const state = h.root.getLifecycleState()
      assert.equal(state.visibleWorkspace, 'home')
      assert.equal(state.activeSession!.project.title, 'Newer edit')
      assert.deepEqual(state.activeSession!.cleanBaseline, baseline)
      assert.equal(selectIsActiveProjectDirty(state), true)
      h.dispose()
    })
    test(`${sourceKind}: a real nested Save of R cannot discard R+1 through ${command}`, async () => {
      const h = harness(sourceState(sourceKind, 'home'), sourceKind)
      h.decisions.push('save', 'cancel')
      h.options.onWrite = () => {
        assert.equal(h.root.synchronizeCurrentProject({
          sessionId: 'source', kind: sourceKind, project: project(sourceKind, 'Newer edit during write'),
        }), 'synchronized')
      }
      const result = await h.root.dispatch(command)
      assert.equal(result.disposition, 'executed')
      if (result.disposition === 'executed') assert.equal(result.result.status, 'declined')
      assert.equal(h.events.filter((event) => event === 'guard').length, 2)
      assert.equal(h.writes.length, 1)
      assert.equal(h.createdSessions(), 0)
      assert.deepEqual(h.mutationEvents(), [])
      const session = h.root.getLifecycleState().activeSession!
      assert.equal(session.id, 'source')
      assert.equal(session.project.title, 'Newer edit during write')
      assert.equal(session.cleanBaseline!.exactSnapshot.title, 'Current unsaved project')
      assert.equal(selectIsActiveProjectDirty(h.root.getLifecycleState()), true)
      h.dispose()
    })
  }
}

for (const targetKind of kinds) {
  for (const format of formats) {
    test(`initial Home Open ${targetKind} ${format} has no replacement prompt`, async () => {
      const h = harness(createEmptyApplicationLifecycleState(), targetKind)
      h.options.openFormat = format
      const result = await h.root.dispatch('project.open')
      assert.equal(result.disposition, 'executed')
      if (result.disposition === 'executed') assert.equal(result.result.status, 'success')
      assert.equal(h.events.includes('guard'), false)
      assert.equal(h.createdSessions(), 1)
      assert.equal(h.root.getLifecycleState().activeSession!.kind, targetKind)
      h.dispose()
    })
  }
}
